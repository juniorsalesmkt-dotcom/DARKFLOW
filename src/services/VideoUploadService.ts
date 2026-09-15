import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth, db } from '../lib/firebase';
import { Video, PlatformType } from '../types';
import { VideoService } from './VideoService';
import { VideoMetadataService } from './VideoMetadataService';

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
}

export interface UploadProgressCallback {
  (progressPercent: number, stage: 'waiting' | 'uploading' | 'processing' | 'completed' | 'failed'): void;
}

export interface UploadFileOptions {
  file: File;
  userId: string;
  pageId: string;
  pagePlatform?: PlatformType;
  onProgress?: UploadProgressCallback;
  onCancelTrigger?: (cancelFn: () => void) => void;
}

export class VideoUploadService {
  private static readonly ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];
  private static readonly ALLOWED_MIMES = [
    'video/mp4',
    'video/quicktime',
    'video/webm',
    'video/x-m4v',
    'video/m4v'
  ];
  private static readonly MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1GB

  /**
   * Validate video file before upload
   */
  static validateFile(file: File): FileValidationResult {
    console.log('[UPLOAD] arquivo selecionado:', file.name, `(${file.size} bytes)`);

    if (!file.name || file.name.trim() === '') {
      const res = { valid: false, reason: 'Nome de arquivo inválido ou vazio.' };
      console.warn('[UPLOAD] validação: FALHA -', res.reason);
      return res;
    }

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();

    const isExtAllowed = this.ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = this.ALLOWED_MIMES.includes(mime) || mime.startsWith('video/');

    if (!isExtAllowed && !isMimeAllowed) {
      const res = {
        valid: false,
        reason: `Formato não suportado (${ext || 'desconhecido'}). Permitidos: MP4, MOV, WEBM, M4V`
      };
      console.warn('[UPLOAD] validação: FALHA -', res.reason);
      return res;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      const res = {
        valid: false,
        reason: 'O arquivo excede o limite máximo permitido de 1GB por vídeo.'
      };
      console.warn('[UPLOAD] validação: FALHA -', res.reason);
      return res;
    }

    console.log('[UPLOAD] validação: APROVADO -', file.name);
    return { valid: true };
  }

  /**
   * Clean filename to avoid path injection and special character bugs
   */
  static sanitizeFilename(originalName: string): string {
    const parts = originalName.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : '.mp4';
    const base = parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    return `${base || 'video'}${ext}`;
  }

  /**
   * Generate canonical storage path
   * users/{userId}/pages/{pageId}/originals/{uniqueVideoId}_{safeFilename}
   */
  static buildStoragePath(userId: string, pageId: string, uniqueVideoId: string, safeFilename: string): string {
    return `users/${userId}/pages/${pageId}/originals/${uniqueVideoId}_${safeFilename}`;
  }

  /**
   * Upload video file:
   * 1. Extract metadata and canvas thumbnail in browser
   * 2. Upload to Firebase Storage or backend storage with real progress
   * 3. Obtain real downloadUrl
   * 4. Create Firestore video document
   */
  static async uploadFile(options: UploadFileOptions): Promise<Video> {
    const { file, userId, pageId, pagePlatform, onProgress, onCancelTrigger } = options;

    // 1. Verify Authentication
    const currentUid = auth.currentUser?.uid || userId;
    if (!currentUid) {
      throw new Error('Usuário não autenticado. Faça login para enviar vídeos.');
    }

    if (!pageId) {
      throw new Error('Página de destino não informada.');
    }

    // 2. Validation
    const validation = this.validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.reason);
    }

    const uniqueVideoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeFilename = this.sanitizeFilename(file.name);
    const storagePath = this.buildStoragePath(currentUid, pageId, uniqueVideoId, safeFilename);

    console.log('[UPLOAD] iniciando:', file.name, '-> ID:', uniqueVideoId);
    if (onProgress) onProgress(0, 'uploading');

    let isCancelled = false;
    let cancelLocal = () => {
      isCancelled = true;
    };

    if (onCancelTrigger) {
      onCancelTrigger(cancelLocal);
    }

    // 3. Extract metadata in background / client
    let extractedMeta = {
      duration: 0,
      width: 1080,
      height: 1920,
      thumbnailDataUrl: '',
      thumbnailBlob: null as Blob | null
    };

    try {
      extractedMeta = await VideoMetadataService.extractMetadata(file);
    } catch (metaErr) {
      console.warn('Metadata extraction non-blocking error:', metaErr);
    }

    if (isCancelled) {
      throw new Error('Upload cancelado pelo usuário.');
    }

    let downloadUrl = '';
    let uploadedStoragePath = storagePath;
    let finalThumbnailPath: string | null = null;
    let finalThumbnailUrl = extractedMeta.thumbnailDataUrl || '';

    // 4. Try Firebase Storage directly
    let directUploadSucceeded = false;
    try {
      if (storage && storage.app) {
        const storageRef = ref(storage, storagePath);
        const metadata = {
          contentType: file.type || 'video/mp4',
          customMetadata: {
            userId: currentUid,
            pageId,
            videoId: uniqueVideoId,
            originalName: file.name
          }
        };

        const uploadTask = uploadBytesResumable(storageRef, file, metadata);

        if (onCancelTrigger) {
          onCancelTrigger(() => {
            isCancelled = true;
            uploadTask.cancel();
          });
        }

        await new Promise<void>((resolve, reject) => {
          uploadTask.on(
            'state_changed',
            (snapshot) => {
              if (snapshot.totalBytes > 0) {
                const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
                console.log(`[UPLOAD] progresso: ${percent}% - ${file.name}`);
                if (onProgress) onProgress(percent, percent >= 100 ? 'processing' : 'uploading');
              }
            },
            (err) => {
              console.warn('Firebase Storage direct upload error (will attempt fallback):', err.message);
              reject(err);
            },
            async () => {
              try {
                downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
                uploadedStoragePath = uploadTask.snapshot.ref.fullPath;
                directUploadSucceeded = true;
                resolve();
              } catch (urlErr) {
                reject(urlErr);
              }
            }
          );
        });
      }
    } catch (directErr) {
      console.warn('Direct Firebase Storage upload not available or errored, attempting backend storage...', directErr);
    }

    // 5. Fallback to /api/storage/upload if direct storage was not used or failed
    if (!directUploadSucceeded) {
      if (isCancelled) {
        throw new Error('Upload cancelado pelo usuário.');
      }

      console.log('[UPLOAD] utilizando backend proxy de storage...');
      const serverResult = await this.uploadViaServerProxy(
        file,
        currentUid,
        pageId,
        uniqueVideoId,
        extractedMeta,
        (pct) => {
          console.log(`[UPLOAD] progresso: ${pct}% - ${file.name}`);
          if (onProgress) onProgress(pct, pct >= 100 ? 'processing' : 'uploading');
        },
        onCancelTrigger
      );

      downloadUrl = serverResult.downloadUrl || serverResult.publicUrl;
      uploadedStoragePath = serverResult.storagePath || storagePath;
      finalThumbnailPath = serverResult.thumbnailPath || null;
      if (serverResult.thumbnailUrl) {
        finalThumbnailUrl = serverResult.thumbnailUrl;
      }
      if (serverResult.duration) extractedMeta.duration = serverResult.duration;
      if (serverResult.width) extractedMeta.width = serverResult.width;
      if (serverResult.height) extractedMeta.height = serverResult.height;
    }

    if (onProgress) onProgress(100, 'processing');
    console.log('[UPLOAD] concluído:', file.name);
    console.log('[UPLOAD] storage path:', uploadedStoragePath);

    // 6. Create Firestore Document
    console.log('[UPLOAD] criando documento:', uniqueVideoId);

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    const videoRecord: Video = {
      id: uniqueVideoId,
      userId: currentUid,
      pageId,
      name: cleanTitle,
      originalFilename: file.name,
      storagePath: uploadedStoragePath,
      downloadUrl,
      originalUrl: downloadUrl,
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
      duration: extractedMeta.duration || 0,
      width: extractedMeta.width || 1080,
      height: extractedMeta.height || 1920,
      thumbnailPath: finalThumbnailPath,
      thumbnailUrl: finalThumbnailUrl,
      status: 'READY',
      platform: pagePlatform || 'instagram',
      source: 'upload_direto',
      tags: [],
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      await VideoService.createVideo(videoRecord);
      console.log('[UPLOAD] documento criado:', uniqueVideoId, videoRecord.name);
      if (onProgress) onProgress(100, 'completed');
      return videoRecord;
    } catch (docErr: any) {
      console.error('[UPLOAD] erro ao criar documento Firestore:', docErr);
      if (onProgress) onProgress(100, 'failed');
      throw new Error(`Falha ao registrar vídeo no banco de dados: ${docErr.message || 'Erro desconhecido'}`);
    }
  }

  /**
   * Upload via server proxy (/api/storage/upload) with XMLHttpRequest tracking
   */
  private static async uploadViaServerProxy(
    file: File,
    userId: string,
    pageId: string,
    videoId: string,
    metadata: { duration: number; width: number; height: number; thumbnailBlob: Blob | null },
    onProgress: (percent: number) => void,
    onCancelTrigger?: (cancelFn: () => void) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('video', file);
      formData.append('userId', userId);
      formData.append('pageId', pageId);
      formData.append('videoId', videoId);
      formData.append('duration', String(metadata.duration || 0));
      formData.append('width', String(metadata.width || 1080));
      formData.append('height', String(metadata.height || 1920));

      if (metadata.thumbnailBlob) {
        formData.append('thumbnail', metadata.thumbnailBlob, `${videoId}.jpg`);
      }

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/storage/upload');
      xhr.setRequestHeader('x-user-id', userId);

      if (onCancelTrigger) {
        onCancelTrigger(() => {
          xhr.abort();
          reject(new Error('Upload cancelado pelo usuário.'));
        });
      }

      if (xhr.upload) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percent = Math.round((event.loaded / event.total) * 100);
            onProgress(percent);
          }
        };
      }

      xhr.onload = () => {
        if (xhr.status >= 200 && xhr.status < 300) {
          try {
            const res = JSON.parse(xhr.responseText);
            resolve(res);
          } catch (e) {
            reject(new Error('Resposta inválida do servidor de storage'));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error || `Erro HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`Falha no upload: HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Falha de conexão com o servidor'));
      };

      xhr.onabort = () => {
        reject(new Error('Upload cancelado'));
      };

      xhr.send(formData);
    });
  }

  /**
   * Create video metadata record directly in Firestore
   */
  static async createVideoRecord(video: Video): Promise<Video> {
    return VideoService.createVideo(video);
  }
}
