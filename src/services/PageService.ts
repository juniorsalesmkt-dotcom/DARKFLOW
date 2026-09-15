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
import { Page, PageStatus, PlatformType } from '../types';

export class PageService {
  private static collectionName = 'pages';

  /**
   * List all pages belonging to the authenticated user
   */
  static async getPages(userId: string, includeArchived = false): Promise<Page[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const querySnapshot = await getDocs(q);
      const pages: Page[] = [];

      querySnapshot.forEach((snap) => {
        const data = snap.data() as Page;
        if (includeArchived || (data.status !== 'ARCHIVED')) {
          pages.push({
            ...data,
            id: snap.id,
            status: data.status || 'ACTIVE'
          });
        }
      });

      // Sort in memory by createdAt descending
      return pages.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Get single page by ID
   */
  static async getPage(pageId: string): Promise<Page | null> {
    try {
      const docRef = doc(db, this.collectionName, pageId);
      const snap = await getDoc(docRef);
      if (!snap.exists()) return null;
      return { ...snap.data(), id: snap.id } as Page;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${this.collectionName}/${pageId}`);
    }
  }

  /**
   * Create new page
   */
  static async createPage(
    userId: string,
    data: {
      name: string;
      username: string;
      platform: PlatformType;
      avatarUrl?: string;
      description?: string;
    }
  ): Promise<Page> {
    try {
      const pageId = `page_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
      const cleanUsername = data.username.startsWith('@') ? data.username : `@${data.username}`;
      const defaultAvatar = data.avatarUrl?.trim() || `https://api.dicebear.com/7.x/identicon/svg?seed=${encodeURIComponent(data.name)}`;

      const newPage: Page = {
        id: pageId,
        userId,
        name: data.name.trim(),
        username: cleanUsername.trim(),
        platform: data.platform || 'instagram',
        avatarUrl: defaultAvatar,
        description: data.description?.trim() || '',
        status: 'ACTIVE',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
        videosCount: 0,
        templatesCount: 0,
        productionsCount: 0
      };

      await setDoc(doc(db, this.collectionName, pageId), newPage);
      return newPage;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, this.collectionName);
    }
  }

  /**
   * Update page metadata
   */
  static async updatePage(
    pageId: string,
    data: Partial<Omit<Page, 'id' | 'userId' | 'createdAt'>>
  ): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, pageId);
      const updates = {
        ...data,
        updatedAt: new Date().toISOString()
      };
      if (data.username && !data.username.startsWith('@')) {
        updates.username = `@${data.username}`;
      }
      await updateDoc(docRef, updates);
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${pageId}`);
    }
  }

  /**
   * Safe Archive page
   */
  static async setPageStatus(pageId: string, status: PageStatus): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, pageId);
      await updateDoc(docRef, {
        status,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${pageId}`);
    }
  }

  /**
   * Safe Archive page
   */
  static async archivePage(pageId: string, archive: boolean): Promise<void> {
    return this.setPageStatus(pageId, archive ? 'ARCHIVED' : 'ACTIVE');
  }

  /**
   * Permanent Delete page
   */
  static async deletePage(pageId: string): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, pageId);
      await deleteDoc(docRef);
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${pageId}`);
    }
  }

  /**
   * Duplicate page
   */
  static async duplicatePage(arg1: string, arg2?: Page): Promise<Page> {
    if (arg2) {
      return this.createPage(arg1, {
        name: `${arg2.name} (Cópia)`,
        username: `${arg2.username}_copia`,
        platform: arg2.platform,
        avatarUrl: arg2.avatarUrl,
        description: arg2.description
      });
    }

    const page = await this.getPage(arg1);
    if (!page) throw new Error('Página não encontrada para duplicar.');
    return this.createPage(page.userId, {
      name: `${page.name} (Cópia)`,
      username: `${page.username}_copia`,
      platform: page.platform,
      avatarUrl: page.avatarUrl,
      description: page.description
    });
  }
}
