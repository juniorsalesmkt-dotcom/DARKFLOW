import fs from 'fs';
import path from 'path';
import { db } from '../db.js';
import { StorageService } from './storage.js';
import { ContentSourceService } from './adapters.js';
import { 
  ImportBatch, 
  ImportJob, 
  ImportJobStatus, 
  Video, 
  PlatformType 
} from '../../src/types/index.js';

export class ImportQueueService {
  private concurrencyLimit = 3;
  private maxRetries = 3;
  private isProcessing = false;
  private activeJobs = 0;
  private abortControllers = new Map<string, AbortController>(); // jobId -> AbortController

  constructor() {
    // Resume any lingering queued or interrupted jobs on startup
    setTimeout(() => {
      this.resumePendingBatches();
    }, 1500);
  }

  private async resumePendingBatches() {
    const batches = db.getImportBatches();
    const active = batches.filter(b => b.status === 'PROCESSING' || b.status === 'QUEUED');
    for (const b of active) {
      this.processQueue();
    }
  }

  /**
   * Enqueue a new import batch
   */
  async createBatch(params: {
    userId: string;
    pageId: string;
    source: string;
    items: Array<{
      sourceContentId: string;
      sourceUrl: string;
      title: string;
      thumbnailUrl?: string;
      duration?: number;
    }>;
    tags?: string[];
    authorizationConfirmed: boolean;
  }): Promise<ImportBatch> {
    if (!params.authorizationConfirmed) {
      throw new Error('A autorização e conformidade para reutilização de conteúdo deve ser confirmada.');
    }

    if (!params.items || params.items.length === 0) {
      throw new Error('Nenhum item selecionado para importação.');
    }

    const batchId = `imp_batch_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const now = new Date().toISOString();
    const tags = params.tags && params.tags.length > 0 ? params.tags : ['IMPORTADO', params.source.toUpperCase()];

    const jobs: ImportJob[] = params.items.map((item, idx) => ({
      id: `imp_job_${Date.now()}_${idx}_${Math.random().toString(36).substring(2, 6)}`,
      batchId,
      userId: params.userId,
      pageId: params.pageId,
      source: params.source,
      sourceContentId: item.sourceContentId,
      sourceUrl: item.sourceUrl,
      title: item.title || `Vídeo Importado ${idx + 1}`,
      thumbnailUrl: item.thumbnailUrl || 'https://images.unsplash.com/photo-1536240478700-b869070f9279?w=600&auto=format&fit=crop&q=80',
      duration: item.duration || 15,
      tags,
      status: 'QUEUED',
      progress: 0,
      currentStage: 'Aguardando na fila...',
      retryCount: 0,
      createdAt: now,
      updatedAt: now
    }));

    const batch: ImportBatch = {
      id: batchId,
      userId: params.userId,
      pageId: params.pageId,
      source: params.source,
      title: `Importação em Massa (${params.items.length} vídeos de ${params.source})`,
      total: jobs.length,
      completed: 0,
      processing: 0,
      queued: jobs.length,
      failed: 0,
      cancelled: 0,
      status: 'QUEUED',
      progress: 0,
      tags,
      authorizationConfirmed: true,
      createdAt: now,
      updatedAt: now
    };

    db.createImportBatch(batch, jobs);

    // Trigger queue worker loop
    this.processQueue();

    return { ...batch, items: jobs };
  }

  /**
   * Main Queue Worker Loop with Concurrency Semaphore
   */
  private async processQueue() {
    if (this.isProcessing) return;
    this.isProcessing = true;

    try {
      while (this.activeJobs < this.concurrencyLimit) {
        // Find next queued job across all active batches
        const batches = db.getImportBatches().filter(b => b.status === 'QUEUED' || b.status === 'PROCESSING');
        if (batches.length === 0) break;

        let nextJob: ImportJob | null = null;
        let targetBatch: ImportBatch | null = null;

        for (const b of batches) {
          const jobs = db.getImportJobs(b.id);
          const queued = jobs.find(j => j.status === 'QUEUED');
          if (queued) {
            nextJob = queued;
            targetBatch = b;
            break;
          }
        }

        if (!nextJob || !targetBatch) break;

        // Transition batch to PROCESSING if QUEUED
        if (targetBatch.status === 'QUEUED') {
          db.updateImportBatch(targetBatch.id, { status: 'PROCESSING' });
        }

        // Spawn job execution
        this.activeJobs++;
        this.executeJob(nextJob)
          .finally(() => {
            this.activeJobs--;
            this.processQueue();
          });
      }
    } finally {
      this.isProcessing = false;
    }
  }

  /**
   * Execute single import job with real progress, storage save, and metadata extraction
   */
  private async executeJob(job: ImportJob): Promise<void> {
    const controller = new AbortController();
    this.abortControllers.set(job.id, controller);

    try {
      // 1. Mark as DOWNLOADING
      db.updateImportJob(job.id, {
        status: 'DOWNLOADING',
        progress: 5,
        currentStage: 'Conectando à fonte e iniciando download...'
      });
      this.recalculateBatch(job.batchId);

      // 2. Check for duplicate first
      const existing = db.findExistingVideoBySource(job.userId, job.pageId, job.source, job.sourceContentId);
      if (existing) {
        // Already in library! Link existing video record
        db.updateImportJob(job.id, {
          status: 'COMPLETED',
          progress: 100,
          currentStage: 'Conteúdo já existente na biblioteca.',
          videoRecord: existing,
          completedAt: new Date().toISOString()
        });
        this.recalculateBatch(job.batchId);
        return;
      }

      // 3. Resolve downloadable asset URL
      let downloadUrl = job.sourceUrl;
      const adapter = ContentSourceService.getAdapter(job.source);

      if (adapter) {
        const asset = await adapter.getDownloadableAsset(job.sourceContentId || job.sourceUrl);
        if (asset && asset.downloadUrl) {
          downloadUrl = asset.downloadUrl;
        }
      }

      // 4. Download and save asset with byte progress
      db.updateImportJob(job.id, {
        progress: 15,
        currentStage: 'Baixando fluxo de vídeo...'
      });

      const uniqueId = `imp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const safeHint = `${job.title.substring(0, 30)}.mp4`;

      const savedAsset = await StorageService.downloadAndSaveImportedAsset(
        job.userId,
        job.pageId,
        downloadUrl,
        uniqueId,
        safeHint,
        (pct) => {
          // Real byte-stream download progress scaled between 15% and 75%
          const overallProgress = 15 + Math.round((pct / 100) * 60);
          db.updateImportJob(job.id, {
            progress: overallProgress,
            currentStage: `Baixando arquivo (${pct}%)...`
          });
        }
      );

      // 5. Processing stage: metadata probed and thumbnail validated
      db.updateImportJob(job.id, {
        status: 'PROCESSING',
        progress: 85,
        currentStage: 'Processando metadados e gerando thumbnail...'
      });

      // 6. Create Video document in Database
      const videoRecord: Video = {
        id: `vid_${Date.now()}_${Math.round(Math.random() * 1e4)}`,
        userId: job.userId,
        pageId: job.pageId,
        name: job.title || 'Vídeo Importado',
        originalFilename: path.basename(savedAsset.storagePath),
        storagePath: savedAsset.storagePath,
        originalUrl: savedAsset.publicUrl,
        downloadUrl: savedAsset.publicUrl,
        thumbnailUrl: savedAsset.thumbnailUrl,
        thumbnailPath: null,
        duration: savedAsset.duration || job.duration || 15,
        width: savedAsset.width || 1080,
        height: savedAsset.height || 1920,
        platform: (job.source as PlatformType) || 'generic',
        source: job.source,
        sourceContentId: job.sourceContentId,
        sourceUrl: job.sourceUrl,
        status: 'original',
        tags: job.tags,
        sizeBytes: savedAsset.fileSize,
        importedAt: new Date().toISOString(),
        authorizationConfirmed: true,
        createdAt: new Date().toISOString()
      };

      db.createVideo(videoRecord);

      // 7. Mark job as COMPLETED
      db.updateImportJob(job.id, {
        status: 'COMPLETED',
        progress: 100,
        currentStage: 'Importação concluída com sucesso!',
        videoRecord,
        completedAt: new Date().toISOString()
      });

      this.recalculateBatch(job.batchId);
    } catch (err: any) {
      if (controller.signal.aborted) {
        db.updateImportJob(job.id, {
          status: 'CANCELLED',
          currentStage: 'Importação cancelada pelo usuário.'
        });
        this.recalculateBatch(job.batchId);
        return;
      }

      console.error(`[ImportJob Error] Job ${job.id}:`, err);

      // Check retry capability with backoff
      if (job.retryCount < this.maxRetries) {
        const nextRetry = job.retryCount + 1;
        db.updateImportJob(job.id, {
          retryCount: nextRetry,
          status: 'QUEUED',
          currentStage: `Falha temporária (${err.message || 'Erro de rede'}). Tentativa ${nextRetry}/${this.maxRetries}...`,
          progress: 0
        });
        // Backoff delay before next retry
        await new Promise(res => setTimeout(res, 2000 * nextRetry));
      } else {
        db.updateImportJob(job.id, {
          status: 'FAILED',
          error: err.message || 'Falha ao baixar e processar arquivo de mídia.',
          currentStage: `Erro fatal: ${err.message || 'Falha no download'}`
        });
      }

      this.recalculateBatch(job.batchId);
    } finally {
      this.abortControllers.delete(job.id);
    }
  }

  /**
   * Recalculate summary stats for a batch and trigger notifications if finished
   */
  private recalculateBatch(batchId: string) {
    const batch = db.getImportBatch(batchId);
    if (!batch) return;

    const jobs = db.getImportJobs(batchId);
    const total = jobs.length;
    const completed = jobs.filter(j => j.status === 'COMPLETED').length;
    const failed = jobs.filter(j => j.status === 'FAILED').length;
    const cancelled = jobs.filter(j => j.status === 'CANCELLED').length;
    const processing = jobs.filter(j => j.status === 'DOWNLOADING' || j.status === 'PROCESSING').length;
    const queued = jobs.filter(j => j.status === 'QUEUED').length;

    let overallStatus: ImportBatch['status'] = 'PROCESSING';
    if (completed + failed + cancelled === total) {
      if (failed === 0 && cancelled === 0) {
        overallStatus = 'COMPLETED';
      } else if (completed > 0) {
        overallStatus = 'PARTIAL';
      } else if (cancelled === total) {
        overallStatus = 'CANCELLED';
      } else {
        overallStatus = 'FAILED';
      }
    } else if (queued === total) {
      overallStatus = 'QUEUED';
    }

    const progress = total > 0 ? Math.round(((completed + failed + cancelled) / total) * 100) : 0;

    const updated = db.updateImportBatch(batchId, {
      total,
      completed,
      failed,
      cancelled,
      processing,
      queued,
      status: overallStatus,
      progress
    });

    // Notify user on completion
    if (overallStatus === 'COMPLETED' || overallStatus === 'PARTIAL') {
      db.addNotification({
        id: `notif_imp_${Date.now()}`,
        userId: batch.userId,
        title: 'Importação em massa concluída',
        message: `${completed} de ${total} vídeos foram importados com sucesso para sua biblioteca.`,
        type: overallStatus === 'COMPLETED' ? 'success' : 'warning',
        read: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  /**
   * Cancel an entire batch: queued items become CANCELLED, downloading items are aborted
   */
  cancelBatch(batchId: string): void {
    const jobs = db.getImportJobs(batchId);
    for (const job of jobs) {
      if (job.status === 'QUEUED') {
        db.updateImportJob(job.id, {
          status: 'CANCELLED',
          currentStage: 'Cancelado pelo usuário.'
        });
      } else if (job.status === 'DOWNLOADING' || job.status === 'PROCESSING') {
        const controller = this.abortControllers.get(job.id);
        if (controller) {
          controller.abort();
        }
        db.updateImportJob(job.id, {
          status: 'CANCELLED',
          currentStage: 'Cancelado pelo usuário.'
        });
      }
    }
    this.recalculateBatch(batchId);
  }

  /**
   * Retry all failed items of a batch
   */
  async retryFailed(batchId: string): Promise<void> {
    const jobs = db.getImportJobs(batchId);
    const failedJobs = jobs.filter(j => j.status === 'FAILED');

    for (const job of failedJobs) {
      db.updateImportJob(job.id, {
        status: 'QUEUED',
        progress: 0,
        error: undefined,
        currentStage: 'Reinserido na fila para nova tentativa...',
        retryCount: 0
      });
    }

    db.updateImportBatch(batchId, { status: 'QUEUED' });
    this.recalculateBatch(batchId);
    this.processQueue();
  }

  /**
   * Retry a single job
   */
  async retryJob(batchId: string, jobId: string): Promise<void> {
    const job = db.getImportJob(jobId);
    if (!job) return;

    db.updateImportJob(jobId, {
      status: 'QUEUED',
      progress: 0,
      error: undefined,
      currentStage: 'Reinserido na fila para nova tentativa...',
      retryCount: 0
    });

    db.updateImportBatch(batchId, { status: 'QUEUED' });
    this.recalculateBatch(batchId);
    this.processQueue();
  }
}

export const importQueueService = new ImportQueueService();
