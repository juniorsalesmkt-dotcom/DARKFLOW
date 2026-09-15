import { VideoMetadataService } from './VideoMetadataService';

export interface UploadResult {
  videoId: string;
  storagePath: string;
  thumbnailPath: string;
  thumbnailUrl: string;
  originalFilename: string;
  fileSize: number;
  duration: number;
  width: number;
  height: number;
  mimeType: string;
}

export class StorageService {
  private static readonly ALLOWED_EXTENSIONS = ['.mp4', '.mov', '.webm', '.m4v'];
  private static readonly ALLOWED_MIME_TYPES = [
    'video/mp4', 
    'video/quicktime', 
    'video/webm', 
    'video/x-m4v',
    'video/m4v'
  ];

  /**
   * Validate if a file is a valid video format
   */
  static isValidVideoFile(file: File): { valid: boolean; reason?: string } {
    const ext = '.' + (file.name.split('.').pop() || '').toLowerCase();
    const mime = (file.type || '').toLowerCase();

    const extMatches = this.ALLOWED_EXTENSIONS.includes(ext);
    const mimeMatches = this.ALLOWED_MIME_TYPES.includes(mime) || mime.startsWith('video/');

    if (!extMatches && !mimeMatches) {
      return {
        valid: false,
        reason: `Formato inválido (${ext || 'desconhecido'}). Permitidos: MP4, MOV, WEBM, M4V`
      };
    }

    if (file.size > 1024 * 1024 * 1024) { // 1GB limit
      return {
        valid: false,
        reason: 'O arquivo excede o limite máximo de 1GB por vídeo.'
      };
    }

    return { valid: true };
  }

  /**
   * Upload single video file with real-time percentage progress
   */
  static async uploadVideoFile(
    file: File,
    userId: string,
    pageId: string,
    videoId: string,
    onProgress?: (progressPercent: number) => void
  ): Promise<UploadResult> {
    // 1. Extract metadata & client thumbnail in parallel with upload preparation
    const metadata = await VideoMetadataService.extractMetadata(file);

    // 2. Prepare FormData
    const formData = new FormData();
    formData.append('video', file);
    formData.append('userId', userId);
    formData.append('pageId', pageId);
    formData.append('videoId', videoId);
    formData.append('duration', String(metadata.duration));
    formData.append('width', String(metadata.width));
    formData.append('height', String(metadata.height));

    if (metadata.thumbnailBlob) {
      formData.append('thumbnail', metadata.thumbnailBlob, `${videoId}.jpg`);
    }

    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      xhr.open('POST', '/api/storage/upload');

      xhr.setRequestHeader('x-user-id', userId);

      if (xhr.upload && onProgress) {
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
            const response = JSON.parse(xhr.responseText);
            resolve({
              videoId,
              storagePath: response.storagePath || `users/${userId}/pages/${pageId}/originals/${videoId}/${file.name}`,
              thumbnailPath: response.thumbnailPath || `users/${userId}/pages/${pageId}/thumbnails/${videoId}.jpg`,
              thumbnailUrl: response.thumbnailUrl || metadata.thumbnailDataUrl || '',
              originalFilename: file.name,
              fileSize: file.size,
              duration: metadata.duration || response.duration || 0,
              width: metadata.width || response.width || 1080,
              height: metadata.height || response.height || 1920,
              mimeType: file.type || 'video/mp4'
            });
          } catch (e) {
            reject(new Error('Resposta inválida do servidor de storage.'));
          }
        } else {
          try {
            const errRes = JSON.parse(xhr.responseText);
            reject(new Error(errRes.error || `Falha no upload: HTTP ${xhr.status}`));
          } catch {
            reject(new Error(`Falha no upload: HTTP ${xhr.status}`));
          }
        }
      };

      xhr.onerror = () => {
        reject(new Error('Erro de conexão durante o upload do vídeo.'));
      };

      xhr.send(formData);
    });
  }
}
