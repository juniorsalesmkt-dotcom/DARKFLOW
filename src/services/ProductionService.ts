import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Production, ProductionItem, TemplateSnapshot } from '../types';
import { TemplateService } from './TemplateService';
import { VideoService } from './VideoService';

export class ProductionService {
  private static collectionName = 'productions';

  /**
   * Get user productions (syncs with backend worker API for real status)
   */
  static async getProductions(userId: string, pageId?: string): Promise<Production[]> {
    try {
      // First try to fetch latest live status from backend API
      let apiProductions: Production[] = [];
      try {
        const res = await fetch(`/api/productions?userId=${encodeURIComponent(userId)}${pageId ? `&pageId=${encodeURIComponent(pageId)}` : ''}`);
        if (res.ok) {
          apiProductions = await res.json();
        }
      } catch (apiErr) {
        console.warn('Backend API productions not reachable, falling back to Firestore:', apiErr);
      }

      // Then fetch from Firestore
      let firestoreProductions: Production[] = [];
      try {
        const q = query(
          collection(db, this.collectionName),
          where('userId', '==', userId)
        );
        const snapshot = await getDocs(q);
        snapshot.forEach(snap => {
          const data = snap.data() as Production;
          if (!pageId || data.pageId === pageId) {
            firestoreProductions.push({ ...data, id: snap.id });
          }
        });
      } catch (fsErr) {
        console.warn('Firestore productions error:', fsErr);
      }

      // Merge: backend has latest processing/real-time stats, Firestore has persisted records
      const mergedMap = new Map<string, Production>();
      
      for (const p of firestoreProductions) {
        mergedMap.set(p.id, p);
      }
      for (const p of apiProductions) {
        mergedMap.set(p.id, { ...(mergedMap.get(p.id) || {}), ...p });
      }

      const list = Array.from(mergedMap.values());
      return list.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      console.error('Error in getProductions:', err);
      return [];
    }
  }

  /**
   * Get single production details with individual items/jobs
   */
  static async getProduction(productionId: string): Promise<Production | null> {
    try {
      // Try backend API first for real-time items progress
      try {
        const res = await fetch(`/api/productions/${productionId}`);
        if (res.ok) {
          const data = await res.json();
          return data;
        }
      } catch {}

      // Fallback to Firestore
      const snap = await getDoc(doc(db, this.collectionName, productionId));
      if (snap.exists()) {
        const prod = { ...(snap.data() as Production), id: snap.id };
        
        // Also fetch subcollection items if any
        try {
          const itemsSnap = await getDocs(collection(db, `${this.collectionName}/${productionId}/items`));
          if (!itemsSnap.empty) {
            prod.items = itemsSnap.docs.map(d => ({ ...(d.data() as ProductionItem), id: d.id }));
          }
        } catch {}

        return prod;
      }
      return null;
    } catch (err) {
      console.error('Error fetching production:', err);
      return null;
    }
  }

  /**
   * Create a new Mass Production run
   */
  static async createProduction(
    userId: string,
    data: { 
      pageId: string; 
      templateId: string; 
      videoIds: string[]; 
      title?: string;
      audioMode?: 'ORIGINAL' | 'MUTE';
    }
  ): Promise<Production> {
    const prodId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    
    // 1. Fetch template to take an immutable snapshot
    let templateName = 'Template';
    let templateSnapshot: TemplateSnapshot | undefined = undefined;

    try {
      const template = await TemplateService.getTemplate(data.templateId);
      if (template) {
        templateName = template.name;
        templateSnapshot = {
          width: template.width || 1080,
          height: template.height || 1920,
          background: template.background || '#090a0f',
          elements: template.elements || []
        };
      }
    } catch (tErr) {
      console.warn('Could not fetch template for snapshot:', tErr);
    }

    const prodTitle = data.title || `Produção #${Date.now().toString().slice(-4)}`;
    const now = new Date().toISOString();

    const prod: Production = {
      id: prodId,
      userId,
      pageId: data.pageId,
      templateId: data.templateId,
      templateName,
      templateSnapshot,
      title: prodTitle,
      name: prodTitle,
      audioMode: data.audioMode || 'ORIGINAL',
      total: data.videoIds.length,
      completed: 0,
      processing: 0,
      queued: data.videoIds.length,
      failed: 0,
      cancelled: 0,
      totalJobs: data.videoIds.length,
      completedJobs: 0,
      processingJobs: 0,
      queuedJobs: data.videoIds.length,
      failedJobs: 0,
      cancelledJobs: 0,
      status: 'queued',
      progress: 0,
      startedAt: now,
      createdAt: now,
      updatedAt: now
    };

    // 2. Save snapshot to Firestore
    try {
      await setDoc(doc(db, this.collectionName, prodId), prod);
    } catch (fsErr) {
      console.warn('Firestore write warning:', fsErr);
    }

    // 3. Trigger backend queue worker via API
    try {
      const apiRes = await fetch('/api/productions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          productionId: prodId,
          userId,
          pageId: data.pageId,
          templateId: data.templateId,
          templateSnapshot,
          videoIds: data.videoIds,
          title: prodTitle,
          name: prodTitle,
          audioMode: data.audioMode || 'ORIGINAL'
        })
      });

      if (apiRes.ok) {
        const apiData = await apiRes.json();
        return apiData.production || prod;
      }
    } catch (apiErr) {
      console.warn('Backend API queue start warning:', apiErr);
    }

    return prod;
  }

  /**
   * Cancel active production
   */
  static async cancelProduction(productionId: string): Promise<void> {
    try {
      await fetch(`/api/productions/${productionId}/cancel`, { method: 'POST' });
    } catch {}

    try {
      await updateDoc(doc(db, this.collectionName, productionId), { 
        status: 'cancelled',
        updatedAt: new Date().toISOString() 
      });
    } catch {}
  }

  /**
   * Retry failed jobs in a production
   */
  static async retryProduction(productionId: string): Promise<void> {
    try {
      await fetch(`/api/productions/${productionId}/retry`, { method: 'POST' });
    } catch {}

    try {
      await updateDoc(doc(db, this.collectionName, productionId), { 
        status: 'queued', 
        failed: 0,
        updatedAt: new Date().toISOString() 
      });
    } catch {}
  }

  /**
   * Retry a specific individual job
   */
  static async retryJob(productionId: string, jobId: string): Promise<void> {
    try {
      await fetch(`/api/productions/${productionId}/jobs/${jobId}/retry`, { method: 'POST' });
    } catch (err) {
      console.error('Error retrying job:', err);
    }
  }

  /**
   * Generate / Download ZIP package of completed videos
   */
  static async generateZip(productionId: string): Promise<any> {
    const res = await fetch(`/api/exports/zip/${productionId}`, { method: 'POST' });
    if (!res.ok) {
      const err = await res.json();
      throw new Error(err?.error || 'Falha ao gerar arquivo ZIP');
    }
    return res.json();
  }

  /**
   * Update production status or progress in Firestore
   */
  static async updateProduction(productionId: string, data: Partial<Production>): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, productionId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      console.warn('updateProduction firestore err:', err);
    }
  }

  /**
   * Delete production
   */
  static async deleteProduction(productionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, productionId));
    } catch (err) {
      console.warn('deleteProduction firestore err:', err);
    }
  }
}
