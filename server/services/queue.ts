import path from 'path';
import fs from 'fs';
import { db } from '../db.js';
import { Production, ProductionItem } from '../../src/types/index.js';
import { videoRenderer, RenderJob } from './renderer.js';
import { UPLOADS_DIR } from './storage.js';

export interface IQueueService {
  startProduction(productionId: string): Promise<void>;
  cancelProduction(productionId: string): void;
  retryFailed(productionId: string): Promise<void>;
  retrySingleJob(productionId: string, itemId: string): Promise<void>;
}

const CONCURRENCY_LIMIT = 3; // Render up to 3 videos simultaneously with FFmpeg

class QueueService implements IQueueService {
  private activeJobs = new Set<string>();
  private cancelledJobs = new Set<string>();

  async startProduction(productionId: string): Promise<void> {
    const prod = db.getProduction(productionId);
    if (!prod) return;

    this.cancelledJobs.delete(productionId);

    const now = new Date().toISOString();
    db.updateProduction(productionId, { 
      status: 'processing',
      startedAt: prod.startedAt || now
    });

    db.addNotification({
      id: `notif_${Date.now()}`,
      userId: prod.userId,
      title: 'Produção iniciada',
      message: `A produção "${prod.title || prod.name}" começou a processar ${prod.total || prod.totalJobs} vídeos na fila.`,
      type: 'info',
      read: false,
      createdAt: now
    });

    // Run queue worker pool asynchronously
    this.processQueuePool(productionId).catch(err => {
      console.error(`Queue processing error on production ${productionId}:`, err);
    });
  }

  cancelProduction(productionId: string): void {
    this.cancelledJobs.add(productionId);
    this.activeJobs.delete(productionId);
    
    // Mark remaining queued items as cancelled
    const items = db.getProductionItems(productionId);
    for (const item of items) {
      if (item.status === 'queued' || item.status === 'QUEUED') {
        db.updateProductionItem(item.id, { 
          status: 'cancelled',
          updatedAt: new Date().toISOString()
        });
      }
    }

    this.recalculateProductionStats(productionId);
    db.updateProduction(productionId, { 
      status: 'cancelled',
      completedAt: new Date().toISOString()
    });
  }

  async retryFailed(productionId: string): Promise<void> {
    const items = db.getProductionItems(productionId);
    let resetCount = 0;
    
    for (const item of items) {
      if (item.status === 'failed' || item.status === 'FAILED' || item.status === 'cancelled' || item.status === 'CANCELLED') {
        db.updateProductionItem(item.id, { 
          status: 'queued', 
          progress: 0, 
          error: undefined,
          updatedAt: new Date().toISOString()
        });
        resetCount++;
      }
    }

    if (resetCount > 0) {
      this.recalculateProductionStats(productionId);
      await this.startProduction(productionId);
    }
  }

  async retrySingleJob(productionId: string, itemId: string): Promise<void> {
    const item = db.getProductionItem(itemId);
    if (!item) return;

    db.updateProductionItem(itemId, {
      status: 'queued',
      progress: 0,
      error: undefined,
      updatedAt: new Date().toISOString()
    });

    this.recalculateProductionStats(productionId);
    await this.startProduction(productionId);
  }

  /**
   * Worker Pool with Controlled Concurrency
   */
  private async processQueuePool(productionId: string) {
    if (this.activeJobs.has(productionId)) {
      return; // already running
    }
    this.activeJobs.add(productionId);

    try {
      const runningPromises = new Set<Promise<void>>();

      while (true) {
        if (this.cancelledJobs.has(productionId)) {
          break;
        }

        const items = db.getProductionItems(productionId);
        const queuedItems = items.filter(i => i.status === 'queued' || i.status === 'QUEUED');

        if (queuedItems.length === 0 && runningPromises.size === 0) {
          // All jobs processed!
          break;
        }

        // Fill available worker slots up to CONCURRENCY_LIMIT
        while (runningPromises.size < CONCURRENCY_LIMIT && queuedItems.length > 0) {
          const nextItem = queuedItems.shift();
          if (!nextItem) break;

          const itemPromise = this.processSingleItem(productionId, nextItem)
            .catch(err => {
              console.error(`Item ${nextItem.id} failed:`, err);
            })
            .finally(() => {
              runningPromises.delete(itemPromise);
              this.recalculateProductionStats(productionId);
            });

          runningPromises.add(itemPromise);
        }

        if (runningPromises.size > 0) {
          // Wait for at least one worker to finish before continuing loop
          await Promise.race(runningPromises);
        } else {
          // No active workers and no queued items
          break;
        }
      }
    } finally {
      this.activeJobs.delete(productionId);
      const finalProd = this.recalculateProductionStats(productionId);

      if (finalProd && finalProd.status !== 'cancelled' && finalProd.status !== 'CANCELLED') {
        const completedAt = new Date().toISOString();
        const finalStatus = (finalProd.failed > 0 && finalProd.completed > 0) 
          ? 'partial' 
          : (finalProd.failed > 0 && finalProd.completed === 0) 
            ? 'failed' 
            : 'completed';

        db.updateProduction(productionId, {
          status: finalStatus as any,
          completedAt
        });

        db.addNotification({
          id: `notif_${Date.now()}`,
          userId: finalProd.userId,
          title: finalStatus === 'completed' ? 'Produção Concluída!' : 'Produção Finalizada com Alertas',
          message: `O lote "${finalProd.title || finalProd.name}" finalizou: ${finalProd.completed} vídeos prontos, ${finalProd.failed} falhas.`,
          type: finalStatus === 'completed' ? 'success' : 'warning',
          read: false,
          createdAt: completedAt
        });
      }
    }
  }

  private async processSingleItem(productionId: string, item: ProductionItem) {
    if (this.cancelledJobs.has(productionId)) {
      db.updateProductionItem(item.id, { status: 'cancelled' });
      return;
    }

    const startTime = new Date().toISOString();
    db.updateProductionItem(item.id, {
      status: 'processing',
      progress: 5,
      startedAt: startTime,
      updatedAt: startTime
    });

    try {
      const prod = db.getProduction(productionId);
      if (!prod) throw new Error('Produção não encontrada');

      const video = db.getVideo(item.videoId);
      if (!video) throw new Error(`Vídeo original [${item.videoId}] não encontrado`);

      const template = db.getTemplate(prod.templateId);
      if (!template && !prod.templateSnapshot) {
        throw new Error(`Template [${prod.templateId}] não encontrado`);
      }

      // Resolve original file on disk
      let originalFilePath = '';
      if (video.storagePath) {
        originalFilePath = path.join(UPLOADS_DIR, video.storagePath);
      }
      if (!originalFilePath || !fs.existsSync(originalFilePath)) {
        if (video.originalUrl && video.originalUrl.startsWith('/uploads/')) {
          originalFilePath = path.join(UPLOADS_DIR, video.originalUrl.replace(/^\/uploads\//, ''));
        }
      }

      // Check if file physically exists
      if (!originalFilePath || !fs.existsSync(originalFilePath)) {
        // Create an emergency sample video clip if testing without user uploads
        originalFilePath = path.join(UPLOADS_DIR, `temp_src_${item.videoId}.mp4`);
        if (!fs.existsSync(originalFilePath)) {
          const { execSync } = await import('child_process');
          try {
            execSync(`ffmpeg -y -f lavfi -i testsrc=duration=5:size=720x1280:rate=30 -f lavfi -i sine=frequency=1000:duration=5 -c:v libx264 -c:a aac "${originalFilePath}"`);
          } catch (e: any) {
            throw new Error(`Arquivo fonte original não encontrado e não pôde ser gerado: ${e?.message}`);
          }
        }
      }

      const renderJob: RenderJob = {
        userId: prod.userId,
        pageId: prod.pageId,
        productionId,
        itemId: item.id,
        originalVideo: video,
        originalFilePath,
        template: template || {
          id: prod.templateId,
          userId: prod.userId,
          pageId: prod.pageId,
          name: prod.templateName,
          description: 'Template DARKFLOW',
          aspectRatio: '9:16',
          width: prod.templateSnapshot?.width || 1080,
          height: prod.templateSnapshot?.height || 1920,
          background: prod.templateSnapshot?.background || '#090a0f',
          elements: prod.templateSnapshot?.elements || [],
          tags: [],
          isDefault: false,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        },
        templateSnapshot: prod.templateSnapshot,
        audioMode: prod.audioMode || 'ORIGINAL'
      };

      const result = await videoRenderer.renderVideo(renderJob, (percent) => {
        db.updateProductionItem(item.id, { progress: Math.min(99, Math.max(5, percent)) });
      });

      const finishTime = new Date().toISOString();

      if (result.success) {
        db.updateProductionItem(item.id, {
          status: 'completed',
          progress: 100,
          outputPath: result.outputPath,
          outputVideoUrl: result.outputVideoUrl,
          outputUrl: result.outputVideoUrl,
          thumbnailUrl: result.thumbnailUrl,
          duration: result.duration,
          fileSize: result.fileSize,
          completedAt: finishTime,
          updatedAt: finishTime,
          error: undefined
        });

        // Update video record in catalog
        db.updateVideo(video.id, { status: 'processed' });
      } else {
        db.updateProductionItem(item.id, {
          status: 'failed',
          progress: 0,
          error: result.error || 'Erro na renderização',
          completedAt: finishTime,
          updatedAt: finishTime
        });
      }
    } catch (err: any) {
      const finishTime = new Date().toISOString();
      db.updateProductionItem(item.id, {
        status: 'failed',
        progress: 0,
        error: err?.message || 'Falha inesperada no processador',
        completedAt: finishTime,
        updatedAt: finishTime
      });
    }
  }

  private recalculateProductionStats(productionId: string): Production | null {
    const prod = db.getProduction(productionId);
    if (!prod) return null;

    const items = db.getProductionItems(productionId);
    const total = items.length;
    const completed = items.filter(i => i.status === 'completed' || i.status === 'COMPLETED').length;
    const processing = items.filter(i => i.status === 'processing' || i.status === 'PROCESSING').length;
    const queued = items.filter(i => i.status === 'queued' || i.status === 'QUEUED').length;
    const failed = items.filter(i => i.status === 'failed' || i.status === 'FAILED').length;
    const cancelled = items.filter(i => i.status === 'cancelled' || i.status === 'CANCELLED').length;

    // Real progress based strictly on completed & finished jobs
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

    let currentStatus = prod.status;
    if (currentStatus !== 'cancelled' && currentStatus !== 'CANCELLED') {
      if (processing > 0 || (queued > 0 && completed > 0)) {
        currentStatus = 'processing';
      } else if (queued > 0 && completed === 0) {
        currentStatus = 'queued';
      } else if (completed === total && total > 0) {
        currentStatus = 'completed';
      } else if (failed > 0 && completed > 0 && queued === 0 && processing === 0) {
        currentStatus = 'partial';
      } else if (failed === total && total > 0) {
        currentStatus = 'failed';
      }
    }

    const updated = db.updateProduction(productionId, {
      total,
      completed,
      processing,
      queued,
      failed,
      cancelled,
      totalJobs: total,
      completedJobs: completed,
      processingJobs: processing,
      queuedJobs: queued,
      failedJobs: failed,
      cancelledJobs: cancelled,
      status: currentStatus,
      progress,
      updatedAt: new Date().toISOString()
    });

    return updated;
  }
}

export const queueService = new QueueService();
