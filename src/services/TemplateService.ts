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
import { Template } from '../types';

export class TemplateService {
  private static collectionName = 'templates';

  /**
   * Get templates for user
   */
  static async getTemplates(userId: string, pageId?: string): Promise<Template[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', 'in', [userId, 'global'])
      );

      const snapshot = await getDocs(q);
      const templates: Template[] = [];

      snapshot.forEach(snap => {
        const data = snap.data() as Template;
        if (!pageId || !data.pageId || data.pageId === pageId) {
          templates.push({ ...data, id: snap.id });
        }
      });

      return templates.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Get single template
   */
  static async getTemplate(templateId: string): Promise<Template | null> {
    try {
      const snap = await getDoc(doc(db, this.collectionName, templateId));
      if (!snap.exists()) return null;
      return { ...snap.data(), id: snap.id } as Template;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${this.collectionName}/${templateId}`);
    }
  }

  /**
   * Create template
   */
  static async createTemplate(arg1: string | Template, arg2?: Partial<Template>): Promise<Template> {
    try {
      let template: Template;
      if (typeof arg1 === 'string' && arg2) {
        const tplId = arg2.id || `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
        template = {
          id: tplId,
          userId: arg1,
          pageId: arg2.pageId || '',
          name: arg2.name || 'Novo Template',
          description: arg2.description || '',
          width: arg2.width || 1080,
          height: arg2.height || 1920,
          aspectRatio: arg2.aspectRatio || '9:16',
          background: arg2.background || '#090a0f',
          thumbnailUrl: arg2.thumbnailUrl || '',
          elements: arg2.elements || [],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
      } else {
        template = arg1 as Template;
      }

      await setDoc(doc(db, this.collectionName, template.id), {
        ...template,
        createdAt: template.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return template;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, this.collectionName);
    }
  }

  /**
   * Duplicate template
   */
  static async duplicateTemplate(templateId: string): Promise<Template> {
    const orig = await this.getTemplate(templateId);
    if (!orig) throw new Error('Template original não encontrado para duplicar.');

    const newId = `tpl_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
    const duplicated: Template = {
      ...orig,
      id: newId,
      name: `${orig.name} (Cópia)`,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    return this.createTemplate(duplicated);
  }

  /**
   * Update template
   */
  static async updateTemplate(templateId: string, data: Partial<Template>): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, templateId), {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${templateId}`);
    }
  }

  /**
   * Delete template
   */
  static async deleteTemplate(templateId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, templateId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${templateId}`);
    }
  }
}
