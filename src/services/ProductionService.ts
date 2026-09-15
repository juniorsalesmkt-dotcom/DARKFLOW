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
import { Production, ProductionItem } from '../types';

export class ProductionService {
  private static collectionName = 'productions';

  /**
   * Get user productions
   */
  static async getProductions(userId: string, pageId?: string): Promise<Production[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      const productions: Production[] = [];

      snapshot.forEach(snap => {
        const data = snap.data() as Production;
        if (!pageId || data.pageId === pageId) {
          productions.push({ ...data, id: snap.id });
        }
      });

      return productions.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Create production
   */
  static async createProduction(
    arg1: string | Production,
    arg2?: { pageId: string; templateId: string; videoIds: string[]; title?: string }
  ): Promise<Production> {
    try {
      let prod: Production;
      if (typeof arg1 === 'string' && arg2) {
        const prodId = `prod_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        prod = {
          id: prodId,
          userId: arg1,
          pageId: arg2.pageId,
          templateId: arg2.templateId,
          templateName: 'Template Ativo',
          title: arg2.title || `Lote de Produção #${Date.now().toString().slice(-4)}`,
          total: arg2.videoIds.length,
          completed: 0,
          processing: 0,
          queued: arg2.videoIds.length,
          failed: 0,
          status: 'queued',
          progress: 0,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        prod = arg1 as Production;
      }

      await setDoc(doc(db, this.collectionName, prod.id), {
        ...prod,
        createdAt: prod.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return prod;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, this.collectionName);
    }
  }

  /**
   * Cancel active production
   */
  static async cancelProduction(productionId: string): Promise<void> {
    return this.updateProduction(productionId, { status: 'cancelled' });
  }

  /**
   * Retry failed production
   */
  static async retryProduction(productionId: string): Promise<void> {
    return this.updateProduction(productionId, { status: 'queued', progress: 0, failed: 0 });
  }

  /**
   * Update production status or progress
   */
  static async updateProduction(productionId: string, data: Partial<Production>): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, productionId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${productionId}`);
    }
  }

  /**
   * Delete production
   */
  static async deleteProduction(productionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, productionId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${productionId}`);
    }
  }

  /**
   * Get production items
   */
  static async getProductionItems(productionId: string): Promise<ProductionItem[]> {
    try {
      const itemsCollection = collection(db, `${this.collectionName}/${productionId}/items`);
      const snapshot = await getDocs(itemsCollection);
      const items: ProductionItem[] = [];
      snapshot.forEach(snap => {
        items.push({ ...snap.data(), id: snap.id } as ProductionItem);
      });
      return items;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, `${this.collectionName}/${productionId}/items`);
    }
  }
}
