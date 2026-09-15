export interface ExtractedVideoMetadata {
  duration: number;
  width: number;
  height: number;
  fileSize: number;
  mimeType: string;
  thumbnailBlob: Blob | null;
  thumbnailDataUrl: string;
}

export class VideoMetadataService {
  /**
   * Extract real metadata and capture thumbnail directly from a video file in browser
   */
  static async extractMetadata(file: File): Promise<ExtractedVideoMetadata> {
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const video = document.createElement('video');
      video.preload = 'metadata';
      video.muted = true;
      video.playsInline = true;
      video.src = url;

      let resolved = false;

      const cleanup = () => {
        URL.revokeObjectURL(url);
        video.remove();
      };

      const handleSuccess = async () => {
        if (resolved) return;
        resolved = true;

        const duration = isFinite(video.duration) ? Math.round(video.duration * 10) / 10 : 0;
        const width = video.videoWidth || 1080;
        const height = video.videoHeight || 1920;

        // Capture frame at 1 second or half duration
        const targetTime = Math.min(1.0, duration > 0 ? duration / 2 : 0.5);

        video.currentTime = targetTime;

        video.onseeked = () => {
          try {
            const canvas = document.createElement('canvas');
            // Scale thumbnail to max 640px width preserving aspect ratio
            const scale = Math.min(1, 640 / (width || 640));
            canvas.width = Math.round(width * scale);
            canvas.height = Math.round(height * scale);

            const ctx = canvas.getContext('2d');
            if (ctx) {
              ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
              const thumbnailDataUrl = canvas.toDataURL('image/jpeg', 0.85);

              canvas.toBlob((blob) => {
                cleanup();
                resolve({
                  duration,
                  width,
                  height,
                  fileSize: file.size,
                  mimeType: file.type || 'video/mp4',
                  thumbnailBlob: blob,
                  thumbnailDataUrl
                });
              }, 'image/jpeg', 0.85);
              return;
            }
          } catch (e) {
            console.warn('Canvas thumbnail capture error:', e);
          }

          cleanup();
          resolve({
            duration,
            width,
            height,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4',
            thumbnailBlob: null,
            thumbnailDataUrl: ''
          });
        };
      };

      video.onloadedmetadata = () => {
        // Trigger frame capture
        handleSuccess();
      };

      video.onerror = () => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            duration: 0,
            width: 1080,
            height: 1920,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4',
            thumbnailBlob: null,
            thumbnailDataUrl: ''
          });
        }
      };

      // Safety timeout in case video loading hangs
      setTimeout(() => {
        if (!resolved) {
          resolved = true;
          cleanup();
          resolve({
            duration: 0,
            width: 1080,
            height: 1920,
            fileSize: file.size,
            mimeType: file.type || 'video/mp4',
            thumbnailBlob: null,
            thumbnailDataUrl: ''
          });
        }
      }, 5000);
    });
  }

  /**
   * Format seconds to mm:ss or hh:mm:ss
   */
  static formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '00:00';
    const totalSecs = Math.floor(seconds);
    const hrs = Math.floor(totalSecs / 3600);
    const mins = Math.floor((totalSecs % 3600) / 60);
    const secs = totalSecs % 60;

    const pad = (n: number) => n.toString().padStart(2, '0');
    if (hrs > 0) {
      return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
    }
    return `${pad(mins)}:${pad(secs)}`;
  }

  /**
   * Format bytes to readable string (e.g. 14.2 MB)
   */
  static formatFileSize(bytes: number): string {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  }
}
