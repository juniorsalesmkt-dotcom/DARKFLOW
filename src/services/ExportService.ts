import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  deleteDoc, 
  query, 
  where 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { ExportBatch } from '../types';

export class ExportService {
  private static collectionName = 'exports';

  /**
   * Get exports
   */
  static async getExports(userId: string): Promise<ExportBatch[]> {
    try {
      // In firestore rules: match /exports/{exportId} { allow read, write: if isSignedIn(); }
      const q = query(collection(db, this.collectionName));
      const snapshot = await getDocs(q);
      const exportsList: ExportBatch[] = [];
      snapshot.forEach(snap => {
        exportsList.push({ ...snap.data(), id: snap.id } as ExportBatch);
      });
      return exportsList.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Create export
   */
  static async createExport(exp: ExportBatch): Promise<ExportBatch> {
    try {
      await setDoc(doc(db, this.collectionName, exp.id), {
        ...exp,
        createdAt: exp.createdAt || new Date().toISOString()
      });
      return exp;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${this.collectionName}/${exp.id}`);
    }
  }

  /**
   * Request ZIP generation
   */
  static async generateZip(userId: string, productionId: string): Promise<ExportBatch> {
    const newExport: ExportBatch = {
      id: `exp_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      productionId,
      productionTitle: `Exportação Lote #${productionId.slice(-4)}`,
      totalVideos: 1,
      downloadUrl: `/api/productions/${productionId}/export-zip`,
      status: 'ready',
      createdAt: new Date().toISOString()
    };
    return this.createExport(newExport);
  }

  /**
   * Delete export
   */
  static async deleteExport(exportId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, exportId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${exportId}`);
    }
  }
}
