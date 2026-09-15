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
import { Tag } from '../types';

export class TagService {
  private static collectionName = 'tags';

  /**
   * Get all tags for current user
   */
  static async getTags(userId: string): Promise<Tag[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const tags: Tag[] = [];
      snapshot.forEach(snap => {
        tags.push({ ...snap.data(), id: snap.id } as Tag);
      });
      return tags.sort((a, b) => a.name.localeCompare(b.name));
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Create new tag
   */
  static async createTag(userId: string, name: string, color = '#6366f1'): Promise<Tag> {
    try {
      const tagId = `tag_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const cleanName = name.trim().toLowerCase();
      const newTag: Tag = {
        id: tagId,
        userId,
        name: cleanName,
        color,
        createdAt: new Date().toISOString()
      };
      await setDoc(doc(db, this.collectionName, tagId), newTag);
      return newTag;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, this.collectionName);
    }
  }

  /**
   * Delete tag
   */
  static async deleteTag(tagId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, tagId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${tagId}`);
    }
  }
}
