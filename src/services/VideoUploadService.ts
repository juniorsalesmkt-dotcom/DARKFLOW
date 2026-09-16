import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage, auth } from '../lib/firebase';
import { Video, PlatformType } from '../types';
import { VideoService } from './VideoService';
import { VideoMetadataService } from './VideoMetadataService';
import { LocalMediaStorage } from './LocalMediaStorage';

export interface FileValidationResult {
  valid: boolean;
  reason?: string;
}

export interface UploadProgressCallback {
  (
    progressPercent: number,
    stage: 'waiting' | 'uploading' | 'processing' | 'completed' | 'failed' | 'cancelled',
    bytesTransferred?: number,
    totalBytes?: number
  ): void;
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
   * Validate video file before starting upload
   */
  static validateFile(file: File): FileValidationResult {
    // [UPLOAD 01] arquivo selecionado
    console.log('[UPLOAD 01] arquivo selecionado:', file.name, `(Tamanho: ${(file.size / (1024 * 1024)).toFixed(2)} MB, ${file.size} bytes)`);

    if (!file.name || file.name.trim() === '') {
      const res = { valid: false, reason: 'Nome de arquivo inválido ou vazio.' };
      console.warn('[UPLOAD 01] validação: FALHA -', res.reason);
      return res;
    }

    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();

    const isExtAllowed = this.ALLOWED_EXTENSIONS.includes(ext);
    const isMimeAllowed = this.ALLOWED_MIMES.includes(mime) || mime.startsWith('video/');

    if (!isExtAllowed && !isMimeAllowed) {
      const res = {
        valid: false,
        reason: `Formato de arquivo não suportado (${ext || 'desconhecido'}). Formatos aceitos: MP4, MOV, WEBM, M4V`
      };
      console.warn('[UPLOAD 01] validação: FALHA -', res.reason);
      return res;
    }

    if (file.size > this.MAX_FILE_SIZE) {
      const res = {
        valid: false,
        reason: 'O arquivo excede o limite máximo permitido de 1GB por vídeo.'
      };
      console.warn('[UPLOAD 01] validação: FALHA -', res.reason);
      return res;
    }

    console.log('[UPLOAD 01] validação de arquivo aprovada:', file.name);
    return { valid: true };
  }

  /**
   * Clean filename to avoid path injection or URI issues
   */
  static sanitizeFilename(originalName: string): string {
    const parts = originalName.split('.');
    const ext = parts.length > 1 ? '.' + parts.pop()!.toLowerCase() : '.mp4';
    const base = parts.join('_').replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 80);
    return `${base || 'video'}${ext}`;
  }

  /**
   * Canonical storage path structure:
   * users/{userId}/pages/{pageId}/originals/{uniqueVideoId}_{safeFilename}
   */
  static buildStoragePath(userId: string, pageId: string, uniqueVideoId: string, safeFilename: string): string {
    return `users/${userId}/pages/${pageId}/originals/${uniqueVideoId}_${safeFilename}`;
  }

  /**
   * Maps Firebase Storage error codes to user-friendly messages
   */
  private static getStorageFriendlyError(error: any): string {
    const code = error?.code || '';
    console.error('[STORAGE ERROR DETAIL]', { code, message: error?.message, error });

    switch (code) {
      case 'storage/unauthorized':
        return 'Permissão negada (storage/unauthorized). Verifique se suas regras de segurança do Firebase Storage permitem o envio.';
      case 'storage/unauthenticated':
        return 'Usuário não autenticado (storage/unauthenticated). Faça login para enviar vídeos.';
      case 'storage/canceled':
        return 'Upload cancelado pelo usuário (storage/canceled).';
      case 'storage/quota-exceeded':
        return 'Cota de armazenamento excedida no Firebase Storage (storage/quota-exceeded).';
      case 'storage/retry-limit-exceeded':
        return 'Limite de tentativas excedido (storage/retry-limit-exceeded). Conexão de rede instável.';
      case 'storage/invalid-checksum':
        return 'Falha de integridade do arquivo durante o envio (storage/invalid-checksum).';
      case 'storage/server-file-wrong-size':
        return 'Tamanho do arquivo gravado no servidor difere do arquivo local (storage/server-file-wrong-size).';
      case 'storage/unknown':
        return `Erro no Firebase Storage (storage/unknown): ${error?.message || 'Tente novamente.'}`;
      default:
        if (error?.message?.includes('network') || error?.message?.includes('failed to fetch')) {
          return 'Erro de rede ou conexão durante o upload no Firebase Storage.';
        }
        return error?.message || 'Erro inesperado durante o upload.';
    }
  }

  /**
   * Main upload function executing the full 13-step diagnostic pipeline:
   * [UPLOAD 01] arquivo selecionado
   * [UPLOAD 02] usuário autenticado
   * [UPLOAD 03] pageId encontrado
   * [UPLOAD 04] Firebase inicializado
   * [UPLOAD 05] Storage inicializado
   * [UPLOAD 06] referência do Storage criada
   * [UPLOAD 07] upload iniciado
   * [UPLOAD 08] progresso recebido
   * [UPLOAD 09] upload concluído
   * [UPLOAD 10] URL obtida
   * [UPLOAD 11] Firestore iniciado
   * [UPLOAD 12] documento criado
   * [UPLOAD 13] upload finalizado
   */
  static async uploadFile(options: UploadFileOptions): Promise<Video> {
    const { file, userId, pageId, pagePlatform, onProgress, onCancelTrigger } = options;

    // [DARKFLOW UPLOAD] Validação inicial
    const validation = this.validateFile(file);
    if (!validation.valid) {
      console.error('[DARKFLOW UPLOAD] Validação falhou:', validation.reason);
      throw new Error(validation.reason);
    }

    // [DARKFLOW UPLOAD] Usuário autenticado
    const user = auth.currentUser;
    const effectiveUid = user?.uid || userId;
    if (!effectiveUid || effectiveUid.trim() === '') {
      console.error('[DARKFLOW UPLOAD] ERRO: Nenhum usuário autenticado!');
      throw new Error('ERRO: auth.currentUser === null. Nenhum usuário autenticado no Firebase Auth.');
    }
    console.log(`[DARKFLOW UPLOAD] Usuário autenticado: UID ${effectiveUid} (${user?.email || 'sessão'})`);

    // [DARKFLOW UPLOAD] PageId
    if (!pageId || pageId.trim() === '') {
      console.error('[DARKFLOW UPLOAD] ERRO: pageId não informado!');
      throw new Error('ERRO: Página de destino (pageId) não informada ou inválida.');
    }
    console.log(`[DARKFLOW UPLOAD] Page ID: ${pageId}`);

    // [DARKFLOW UPLOAD] Identificador e caminho
    const uniqueVideoId = `vid_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const safeFilename = this.sanitizeFilename(file.name);
    const storagePath = this.buildStoragePath(effectiveUid, pageId, uniqueVideoId, safeFilename);

    console.log(`[DARKFLOW UPLOAD] Upload iniciado: ${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB, ${file.size} bytes)`);
    if (onProgress) {
      onProgress(0, 'uploading', 0, file.size);
    }

    // Extrair metadados e thumbnail do vídeo antecipadamente
    let meta = {
      duration: 10,
      width: 1080,
      height: 1920,
      thumbnailUrl: ''
    };

    try {
      const extracted = await VideoMetadataService.extractMetadata(file);
      meta = {
        duration: extracted.duration || 10,
        width: extracted.width || 1080,
        height: extracted.height || 1920,
        thumbnailUrl: extracted.thumbnailDataUrl || ''
      };
    } catch (metaErr) {
      console.warn('[DARKFLOW UPLOAD] Extração de metadados no cliente:', metaErr);
    }

    let downloadUrl = '';
    let uploadedStoragePath = storagePath;
    let serverResult: any = null;

    try {
      console.log('[DARKFLOW UPLOAD] Tentando envio via Servidor DARKFLOW (/api/storage/upload)...');
      serverResult = await this.uploadViaServerProxy(
        file,
        effectiveUid,
        pageId,
        uniqueVideoId,
        (percent, loaded, total) => {
          if (onProgress) {
            onProgress(percent, 'uploading', loaded, total);
          }
        },
        onCancelTrigger
      );

      downloadUrl = serverResult.downloadUrl || serverResult.publicUrl || `/uploads/${storagePath}`;
      uploadedStoragePath = serverResult.storagePath || storagePath;
      console.log('[DARKFLOW UPLOAD] Upload concluído no Servidor:', downloadUrl);

      // Salva em cache no IndexedDB para reprodução instantânea
      try {
        await LocalMediaStorage.saveVideo(uniqueVideoId, file);
      } catch (cacheErr) {
        console.warn('[DARKFLOW UPLOAD] Cache IndexedDB opcional:', cacheErr);
      }
    } catch (uploadErr: any) {
      if (uploadErr.message?.includes('cancelado')) {
        if (onProgress) onProgress(0, 'cancelled');
        throw new Error('Upload cancelado pelo usuário.');
      }

      console.warn(`[DARKFLOW UPLOAD] Servidor indisponível (${uploadErr.message}). Ativando Motor Local de Mídia IndexedDB com persistência no Firestore...`);
      
      // Simulação suave de progresso caso o servidor falhe rapidamente
      if (onProgress) {
        onProgress(50, 'uploading', Math.round(file.size / 2), file.size);
      }

      try {
        // Grava no IndexedDB de alta capacidade
        const localBlobUrl = await LocalMediaStorage.saveVideo(uniqueVideoId, file);
        downloadUrl = localBlobUrl;
        uploadedStoragePath = `local://indexeddb/${uniqueVideoId}`;
        console.log('[DARKFLOW UPLOAD] Vídeo armazenado com sucesso no LocalMediaStorage:', uniqueVideoId);
      } catch (idbErr: any) {
        console.error('[DARKFLOW UPLOAD] Falha no LocalMediaStorage:', idbErr);
        if (onProgress) onProgress(0, 'failed');
        throw new Error(`Falha no armazenamento local: ${idbErr.message || 'Erro IndexedDB'}`);
      }
    }

    // [UPLOAD 11] Firestore iniciado
    console.log('[UPLOAD 11] Firestore iniciado para criar documento do vídeo:', uniqueVideoId);
    if (onProgress) {
      onProgress(100, 'processing', file.size, file.size);
    }

    if (serverResult) {
      meta.duration = serverResult.duration || meta.duration;
      meta.width = serverResult.width || meta.width;
      meta.height = serverResult.height || meta.height;
      meta.thumbnailUrl = serverResult.thumbnailUrl || meta.thumbnailUrl;
    }

    const cleanTitle = file.name.replace(/\.[^/.]+$/, '');
    const videoRecord: Video = {
      id: uniqueVideoId,
      userId: effectiveUid,
      pageId,
      name: cleanTitle,
      originalFilename: file.name,
      storagePath: uploadedStoragePath,
      downloadUrl,
      originalUrl: downloadUrl,
      mimeType: file.type || 'video/mp4',
      fileSize: file.size,
      duration: meta.duration || 10,
      width: meta.width || 1080,
      height: meta.height || 1920,
      thumbnailPath: serverResult?.thumbnailPath || null,
      thumbnailUrl: meta.thumbnailUrl,
      status: 'READY',
      platform: pagePlatform || 'instagram',
      source: 'upload_direto',
      tags: [],
      sizeBytes: file.size,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    // [UPLOAD 12] documento criado no Firestore
    try {
      await VideoService.createVideo(videoRecord);
      console.log('[UPLOAD 12] Documento criado com sucesso no Firestore:', uniqueVideoId);
    } catch (docErr: any) {
      console.error('[UPLOAD ERROR] Falha ao registrar documento no Firestore:', docErr);
      if (onProgress) onProgress(100, 'failed', file.size, file.size);
      throw new Error(`O arquivo foi armazenado, mas ocorreu um erro ao registrar no banco de dados: ${docErr?.message || 'Erro no Firestore'}`);
    }

    // [UPLOAD 13] upload finalizado
    console.log('[UPLOAD 13] Upload finalizado com sucesso:', videoRecord.name, videoRecord.id);
    if (onProgress) {
      onProgress(100, 'completed', file.size, file.size);
    }

    return videoRecord;
  }

  /**
   * Robust upload via backend proxy with real byte progress tracking
   */
  private static uploadViaServerProxy(
    file: File,
    userId: string,
    pageId: string,
    videoId: string,
    onProgress: (percent: number, loaded: number, total: number) => void,
    onCancelTrigger?: (cancelFn: () => void) => void
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('pageId', pageId);
      formData.append('videoId', videoId);
      formData.append('video', file);

      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/storage/upload');
      xhr.setRequestHeader('x-user-id', userId);
      xhr.setRequestHeader('x-page-id', pageId);
      xhr.setRequestHeader('x-video-id', videoId);

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
            onProgress(percent, event.loaded, event.total);
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
        reject(new Error('Upload cancelado pelo usuário.'));
      };

      xhr.send(formData);
    });
  }
}
