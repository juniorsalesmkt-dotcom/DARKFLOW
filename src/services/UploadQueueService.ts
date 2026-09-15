import { UploadProgressItem, Video, PlatformType } from '../types';
import { VideoUploadService } from './VideoUploadService';
import { NotificationService } from './NotificationService';

type QueueListener = (items: UploadProgressItem[]) => void;
type VideoCreatedListener = (video: Video) => void;
type QueueCompletedListener = (videos: Video[]) => void;

class UploadQueueServiceImpl {
  private items: UploadProgressItem[] = [];
  private concurrencyLimit = 5;
  private activeWorkers = 0;
  private isProcessing = false;
  private listeners: Set<QueueListener> = new Set();
  private videoCreatedListeners: Set<VideoCreatedListener> = new Set();
  private queueCompletedListeners: Set<QueueCompletedListener> = new Set();
  private sessionCreatedVideos: Video[] = [];

  /**
   * Subscribe to queue state updates
   */
  subscribe(listener: QueueListener): () => void {
    this.listeners.add(listener);
    listener([...this.items]);
    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Subscribe to single video created events
   */
  onVideoCreated(listener: VideoCreatedListener): () => void {
    this.videoCreatedListeners.add(listener);
    return () => {
      this.videoCreatedListeners.delete(listener);
    };
  }

  /**
   * Subscribe to entire batch completed events
   */
  onQueueCompleted(listener: QueueCompletedListener): () => void {
    this.queueCompletedListeners.add(listener);
    return () => {
      this.queueCompletedListeners.delete(listener);
    };
  }

  private notify() {
    const current = [...this.items];
    this.listeners.forEach((listener) => {
      try {
        listener(current);
      } catch (err) {
        console.error('Error in queue listener:', err);
      }
    });
  }

  getItems(): UploadProgressItem[] {
    return [...this.items];
  }

  getIsProcessing(): boolean {
    return this.isProcessing;
  }

  /**
   * Add files to the queue
   */
  addFiles(files: File[], userId: string, pageId: string, pagePlatform?: PlatformType): { added: number; rejected: string[] } {
    const rejected: string[] = [];
    let addedCount = 0;

    for (const file of files) {
      const validation = VideoUploadService.validateFile(file);
      if (!validation.valid) {
        rejected.push(`${file.name}: ${validation.reason}`);
        continue;
      }

      // Check if file is already queued with same name and size
      const exists = this.items.some(
        item => item.name === file.name && item.size === file.size && item.status !== 'completed' && item.status !== 'failed' && item.status !== 'cancelled'
      );
      if (exists) {
        continue;
      }

      const item: UploadProgressItem = {
        id: `upload_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
        file,
        name: file.name,
        size: file.size,
        pageId,
        progress: 0,
        bytesTransferred: 0,
        status: 'waiting'
      };

      this.items.push(item);
      addedCount++;
    }

    this.notify();
    return { added: addedCount, rejected };
  }

  /**
   * Calculate real aggregate progress considering bytes actually transferred
   */
  getAggregateProgress(): { totalBytes: number; uploadedBytes: number; overallProgress: number } {
    const totalBytes = this.items.reduce((sum, item) => sum + (item.size || 0), 0);
    const uploadedBytes = this.items.reduce((sum, item) => {
      if (item.status === 'completed') {
        return sum + (item.size || 0);
      }
      if (item.status === 'uploading' || item.status === 'processing') {
        return sum + (item.bytesTransferred || Math.round(((item.progress || 0) / 100) * (item.size || 0)));
      }
      return sum;
    }, 0);

    const overallProgress = totalBytes > 0 ? Math.min(100, Math.round((uploadedBytes / totalBytes) * 100)) : 0;
    return { totalBytes, uploadedBytes, overallProgress };
  }

  /**
   * Start or resume processing queue
   */
  start(userId: string, pagePlatform?: PlatformType) {
    if (this.isProcessing && this.activeWorkers >= this.concurrencyLimit) return;
    this.isProcessing = true;
    this.sessionCreatedVideos = [];
    this.processNext(userId, pagePlatform);
  }

  private async processNext(userId: string, pagePlatform?: PlatformType) {
    const waitingItems = this.items.filter(i => i.status === 'waiting');

    if (waitingItems.length === 0 && this.activeWorkers === 0) {
      this.isProcessing = false;
      this.notify();

      if (this.sessionCreatedVideos.length > 0) {
        const completedBatch = [...this.sessionCreatedVideos];
        this.sessionCreatedVideos = [];
        this.queueCompletedListeners.forEach(listener => {
          try {
            listener(completedBatch);
          } catch (e) {
            console.error('Queue completed listener error:', e);
          }
        });

        // Trigger notification
        NotificationService.notify(
          userId,
          'Upload Concluído',
          `${completedBatch.length} vídeo(s) importado(s) com sucesso na biblioteca.`,
          'success'
        );
      }
      return;
    }

    while (this.activeWorkers < this.concurrencyLimit) {
      const nextItem = this.items.find(i => i.status === 'waiting');
      if (!nextItem) break;

      this.activeWorkers++;
      this.updateItem(nextItem.id, { status: 'uploading', progress: 0, bytesTransferred: 0, error: undefined });

      (async (item: UploadProgressItem) => {
        try {
          const videoDoc = await VideoUploadService.uploadFile({
            file: item.file,
            userId,
            pageId: item.pageId,
            pagePlatform,
            onProgress: (pct, stage, bytesTransferred) => {
              this.updateItem(item.id, {
                progress: pct,
                status: stage,
                bytesTransferred: bytesTransferred || Math.round((pct / 100) * item.size)
              });
            },
            onCancelTrigger: (cancelFn) => {
              this.updateItem(item.id, { cancelFn });
            }
          });

          this.updateItem(item.id, {
            status: 'completed',
            progress: 100,
            bytesTransferred: item.size,
            videoRecord: videoDoc,
            downloadUrl: videoDoc.downloadUrl
          });

          this.sessionCreatedVideos.push(videoDoc);

          // Notify single video created
          this.videoCreatedListeners.forEach(listener => {
            try {
              listener(videoDoc);
            } catch (e) {
              console.error('Error in video created listener:', e);
            }
          });
        } catch (err: any) {
          console.error(`[UPLOAD ERROR] ${item.name}:`, err);
          const isCancel = err?.message?.includes('cancelado') || err?.code === 'storage/canceled';
          this.updateItem(item.id, {
            status: isCancel ? 'cancelled' : 'failed',
            error: isCancel ? 'Upload cancelado pelo usuário' : (err?.message || 'Falha no upload'),
            progress: isCancel ? 0 : item.progress
          });
        } finally {
          this.activeWorkers--;
          this.processNext(userId, pagePlatform);
        }
      })(nextItem);
    }
  }

  /**
   * Cancel specific item
   */
  cancelItem(id: string) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      if (item.cancelFn) {
        try {
          item.cancelFn();
        } catch (e) {
          console.warn('Error invoking cancelFn:', e);
        }
      }
      this.updateItem(id, { status: 'cancelled', error: 'Upload cancelado pelo usuário' });
    }
  }

  /**
   * Retry failed item
   */
  retryItem(id: string, userId: string, pagePlatform?: PlatformType) {
    const item = this.items.find(i => i.id === id);
    if (item && (item.status === 'failed' || item.status === 'cancelled')) {
      this.updateItem(id, { status: 'waiting', progress: 0, bytesTransferred: 0, error: undefined });
      this.start(userId, pagePlatform);
    }
  }

  /**
   * Retry all failed items
   */
  retryAllFailed(userId: string, pagePlatform?: PlatformType) {
    this.items.forEach(item => {
      if (item.status === 'failed' || item.status === 'cancelled') {
        item.status = 'waiting';
        item.progress = 0;
        item.bytesTransferred = 0;
        item.error = undefined;
      }
    });
    this.notify();
    this.start(userId, pagePlatform);
  }

  /**
   * Remove item from list
   */
  removeItem(id: string) {
    const idx = this.items.findIndex(i => i.id === id);
    if (idx !== -1) {
      const item = this.items[idx];
      if (item.status === 'uploading' && item.cancelFn) {
        try {
          item.cancelFn();
        } catch (e) {
          console.warn('Error cancelling on remove:', e);
        }
      }
      this.items.splice(idx, 1);
      this.notify();
    }
  }

  /**
   * Clear all completed and cancelled items
   */
  clearCompleted() {
    this.items = this.items.filter(i => i.status !== 'completed' && i.status !== 'cancelled');
    this.notify();
  }

  /**
   * Clear all items in queue
   */
  clearAll() {
    this.items.forEach(item => {
      if (item.status === 'uploading' && item.cancelFn) {
        try {
          item.cancelFn();
        } catch (e) {
          console.warn('Error cancelling on clearAll:', e);
        }
      }
    });
    this.items = [];
    this.activeWorkers = 0;
    this.isProcessing = false;
    this.sessionCreatedVideos = [];
    this.notify();
  }

  private updateItem(id: string, partial: Partial<UploadProgressItem>) {
    const item = this.items.find(i => i.id === id);
    if (item) {
      Object.assign(item, partial);
      this.notify();
    }
  }
}

export const UploadQueueService = new UploadQueueServiceImpl();
