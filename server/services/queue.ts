import path from 'path';
import { db } from '../db.js';
import { Production, ProductionItem } from '../../src/types/index.js';
import { videoRenderer, RenderJob } from './renderer.js';
import { UPLOADS_DIR } from './storage.js';

export interface IQueueService {
  startProduction(productionId: string): Promise<void>;
  cancelProduction(productionId: string): void;
  retryFailed(productionId: string): Promise<void>;
}

class QueueService implements IQueueService {
  private activeJobs = new Set<string>();
  private cancelledJobs = new Set<string>();

  async startProduction(productionId: string): Promise<void> {
    if (this.activeJobs.has(productionId)) {
      return;
    }

    const prod = db.getProduction(productionId);
    if (!prod) return;

    this.activeJobs.add(productionId);
    this.cancelledJobs.delete(productionId);

    db.updateProduction(productionId, { status: 'processing' });
    db.addNotification({
      id: `notif_${Date.now()}`,
      userId: prod.userId,
      title: 'Produção iniciada',
      message: `A produção "${prod.title}" começou a processar ${prod.total} vídeos.`,
      type: 'info',
      read: false,
      createdAt: new Date().toISOString()
    });

    // Run asynchronously without blocking the caller
    this.processQueue(productionId).catch(err => {
      console.error(`Queue processing error on production ${productionId}:`, err);
    });
  }

  cancelProduction(productionId: string): void {
    this.cancelledJobs.add(productionId);
    this.activeJobs.delete(productionId);
    
    db.updateProduction(productionId, { status: 'cancelled' });
    
    // Mark remaining queued items as cancelled
    const items = db.getProductionItems(productionId);
    for (const item of items) {
      if (item.status === 'queued' || item.status === 'processing') {
        db.updateProductionItem(item.id, { status: 'cancelled' });
      }
    }
  }

  async retryFailed(productionId: string): Promise<void> {
    const items = db.getProductionItems(productionId);
    let resetCount = 0;
    
    for (const item of items) {
      if (item.status === 'failed' || item.status === 'cancelled') {
        db.updateProductionItem(item.id, { status: 'queued', progress: 0, error: undefined });
        resetCount++;
      }
    }

    if (resetCount > 0) {
      this.recalculateProductionStats(productionId);
      await this.startProduction(productionId);
    }
  }

  private async processQueue(productionId: string) {
    try {
      while (true) {
        if (this.cancelledJobs.has(productionId)) {
          break;
        }

        const items = db.getProductionItems(productionId);
        const nextItem = items.find(i => i.status === 'queued');

        if (!nextItem) {
          // All done!
          break;
        }

        await this.processSingleItem(productionId, nextItem);
        this.recalculateProductionStats(productionId);
      }
    } finally {
      this.activeJobs.delete(productionId);
      const finalProd = this.recalculateProductionStats(productionId);

      if (finalProd && finalProd.status !== 'cancelled') {
        const isComplete = finalProd.completed + finalProd.failed === finalProd.total;
        if (isComplete) {
          const finalStatus = finalProd.failed === finalProd.total ? 'failed' : 'completed';
          db.updateProduction(productionId, { status: finalStatus });

          db.addNotification({
            id: `notif_${Date.now()}`,
            userId: finalProd.userId,
            title: finalStatus === 'completed' ? 'Produção concluída!' : 'Produção finalizada com erros',
            message: `Produção "${finalProd.title}": ${finalProd.completed}/${finalProd.total} vídeos renderizados com sucesso.`,
            type: finalStatus === 'completed' ? 'success' : 'error',
            read: false,
            createdAt: new Date().toISOString()
          });
        }
      }
    }
  }

  private async processSingleItem(productionId: string, item: ProductionItem) {
    const prod = db.getProduction(productionId);
    if (!prod) return;

    const template = db.getTemplate(item.templateId);
    const video = db.getVideo(item.videoId);

    if (!template || !video) {
      db.updateProductionItem(item.id, {
        status: 'failed',
        error: 'Vídeo original ou Template não encontrado.',
        progress: 0
      });
      return;
    }

    // Set status to processing
    db.updateProductionItem(item.id, {
      status: 'processing',
      progress: 15,
      startedAt: new Date().toISOString()
    });
    this.recalculateProductionStats(productionId);

    // Resolve original file on disk
    let originalFilePath = path.join(UPLOADS_DIR, 'users', video.userId, 'pages', video.pageId, 'originals', path.basename(video.originalUrl));
    
    // Check if original file exists, or if demo video, or fallback
    if (!require('fs').existsSync(originalFilePath)) {
      // If originalUrl starts with /uploads, try resolving from UPLOADS_DIR
      if (video.originalUrl.startsWith('/uploads/')) {
        originalFilePath = path.join(process.cwd(), video.originalUrl);
      }
    }

    const job: RenderJob = {
      userId: prod.userId,
      pageId: prod.pageId,
      productionId,
      itemId: item.id,
      originalVideo: video,
      originalFilePath,
      template,
      templateElements: template.elements
    };

    try {
      const result = await videoRenderer.renderVideo(job, (percent) => {
        db.updateProductionItem(item.id, { progress: percent });
      });

      if (result.success) {
        db.updateProductionItem(item.id, {
          status: 'completed',
          progress: 100,
          outputPath: result.outputPath,
          outputVideoUrl: result.outputVideoUrl,
          thumbnailUrl: result.thumbnailUrl,
          completedAt: new Date().toISOString()
        });

        // Also update video status in catalog to processed
        db.updateVideo(video.id, { status: 'processed' });
      } else {
        db.updateProductionItem(item.id, {
          status: 'failed',
          progress: 0,
          error: result.error || 'Erro na renderização'
        });
      }
    } catch (err: any) {
      db.updateProductionItem(item.id, {
        status: 'failed',
        progress: 0,
        error: err?.message || 'Falha inesperada no processador'
      });
    }
  }

  private recalculateProductionStats(productionId: string): Production | null {
    const prod = db.getProduction(productionId);
    if (!prod) return null;

    const items = db.getProductionItems(productionId);
    const total = items.length;
    const completed = items.filter(i => i.status === 'completed').length;
    const processing = items.filter(i => i.status === 'processing').length;
    const queued = items.filter(i => i.status === 'queued').length;
    const failed = items.filter(i => i.status === 'failed').length;

    const progress = total > 0 ? Math.round(((completed + (failed * 0.5)) / total) * 100) : 0;

    const updated = db.updateProduction(productionId, {
      total,
      completed,
      processing,
      queued,
      failed,
      progress
    });

    return updated;
  }
}

export const queueService = new QueueService();
