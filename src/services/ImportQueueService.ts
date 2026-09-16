import { ImportBatch, ImportJob, Video } from '../types/index.js';

const API_BASE = '/api/miner';

export class ImportQueueService {
  /**
   * Enqueue a new mass import batch
   */
  static async createBatch(params: {
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
    const res = await fetch(`${API_BASE}/batches`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao criar lote de importação');
    }

    return res.json();
  }

  /**
   * Fetch all user import batches (Import history log)
   */
  static async getBatches(userId?: string, pageId?: string): Promise<ImportBatch[]> {
    const query = new URLSearchParams();
    if (userId) query.append('userId', userId);
    if (pageId && pageId !== 'all') query.append('pageId', pageId);

    const res = await fetch(`${API_BASE}/batches?${query.toString()}`);
    if (!res.ok) return [];
    return res.json();
  }

  /**
   * Get single batch with live jobs and real-time progress
   */
  static async getBatch(batchId: string): Promise<ImportBatch | null> {
    const res = await fetch(`${API_BASE}/batches/${batchId}`);
    if (!res.ok) return null;
    return res.json();
  }

  /**
   * Cancel ongoing import batch
   */
  static async cancelBatch(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/cancel`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao cancelar importação');
    }
  }

  /**
   * Retry all failed jobs in a batch
   */
  static async retryFailed(batchId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/retry`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao reiniciar itens com falha');
    }
  }

  /**
   * Retry a single job
   */
  static async retryJob(batchId: string, jobId: string): Promise<void> {
    const res = await fetch(`${API_BASE}/batches/${batchId}/jobs/${jobId}/retry`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Erro ao reiniciar job');
    }
  }

  /**
   * Direct instant URL import
   */
  static async importDirectUrl(params: {
    url: string;
    pageId: string;
    name?: string;
    tags?: string[];
  }): Promise<Video> {
    const res = await fetch(`/api/minerador/import-url`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params)
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || 'Falha ao importar vídeo por URL');
    }

    return res.json();
  }
}
