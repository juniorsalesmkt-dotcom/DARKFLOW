import { 
  collection, 
  doc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch 
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { AppNotification } from '../types';

export class NotificationService {
  private static collectionName = 'notifications';

  /**
   * Fetch all notifications for user
   */
  static async getNotifications(userId: string): Promise<AppNotification[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );
      const snapshot = await getDocs(q);
      const notifications: AppNotification[] = [];
      snapshot.forEach(snap => {
        notifications.push({ ...snap.data(), id: snap.id } as AppNotification);
      });
      return notifications.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Create a notification
   */
  static async notify(
    userId: string,
    title: string,
    message: string,
    type: 'info' | 'success' | 'warning' | 'error' = 'info',
    link?: string
  ): Promise<AppNotification> {
    try {
      const id = `notif_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;
      const notif: AppNotification = {
        id,
        userId,
        title,
        message,
        type,
        read: false,
        createdAt: new Date().toISOString(),
        link
      };
      await setDoc(doc(db, this.collectionName, id), notif);
      return notif;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, this.collectionName);
    }
  }

  /**
   * Mark single notification as read
   */
  static async markAsRead(id: string): Promise<void> {
    try {
      await updateDoc(doc(db, this.collectionName, id), { read: true });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${id}`);
    }
  }

  /**
   * Mark all notifications as read
   */
  static async markAllAsRead(userId: string): Promise<void> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('read', '==', false)
      );
      const snapshot = await getDocs(q);
      const batch = writeBatch(db);
      snapshot.forEach(snap => {
        batch.update(doc(db, this.collectionName, snap.id), { read: true });
      });
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.collectionName);
    }
  }

  /**
   * Delete notification
   */
  static async deleteNotification(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, id));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${id}`);
    }
  }
}
