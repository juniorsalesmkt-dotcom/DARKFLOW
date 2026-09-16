import { 
  collection, 
  doc, 
  getDocs, 
  getDoc, 
  setDoc, 
  updateDoc, 
  deleteDoc, 
  query, 
  where,
  writeBatch
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from '../lib/firebase';
import { Video, VideoStatus, PlatformType } from '../types';

export interface VideoFilterOptions {
  pageId?: string;
  status?: VideoStatus | 'all';
  platform?: PlatformType | 'all';
  searchQuery?: string;
  tag?: string;
  durationFilter?: 'any' | 'short' | 'medium' | 'long'; // <30s, 30-60s, >60s
  sortBy?: 'recent' | 'oldest' | 'name_asc' | 'name_desc' | 'duration_desc' | 'duration_asc';
}

export class VideoService {
  private static collectionName = 'videos';

  /**
   * Fetch user videos with flexible in-memory and query filtering
   */
  static async getVideos(userId: string, options?: VideoFilterOptions): Promise<Video[]> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId)
      );

      const snapshot = await getDocs(q);
      let videos: Video[] = [];

      snapshot.forEach((snap) => {
        const data = snap.data() as Video;
        videos.push({
          ...data,
          id: snap.id,
          tags: Array.isArray(data.tags) ? data.tags : []
        });
      });

      // Filter by page
      if (options?.pageId && options.pageId !== 'all') {
        videos = videos.filter(v => v.pageId === options.pageId);
      }

      // Filter by status
      if (options?.status && options.status !== 'all') {
        videos = videos.filter(v => v.status === options.status);
      } else {
        // Exclude archived by default unless specifically asked
        videos = videos.filter(v => v.status !== 'ARCHIVED');
      }

      // Filter by platform
      if (options?.platform && options.platform !== 'all') {
        videos = videos.filter(v => v.platform === options.platform);
      }

      // Filter by tag
      if (options?.tag && options.tag !== 'all') {
        videos = videos.filter(v => v.tags?.includes(options.tag!));
      }

      // Filter by duration
      if (options?.durationFilter && options.durationFilter !== 'any') {
        videos = videos.filter(v => {
          const d = v.duration || 0;
          if (options.durationFilter === 'short') return d < 30;
          if (options.durationFilter === 'medium') return d >= 30 && d <= 60;
          if (options.durationFilter === 'long') return d > 60;
          return true;
        });
      }

      // Filter by search query (case-insensitive substring match)
      if (options?.searchQuery?.trim()) {
        const queryClean = options.searchQuery.trim().toLowerCase();
        videos = videos.filter(v => 
          (v.name || '').toLowerCase().includes(queryClean) ||
          (v.originalFilename || '').toLowerCase().includes(queryClean) ||
          (v.tags || []).some(t => t.toLowerCase().includes(queryClean))
        );
      }

      // Sorting
      const sortBy = options?.sortBy || 'recent';
      videos.sort((a, b) => {
        if (sortBy === 'recent') {
          return new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime();
        }
        if (sortBy === 'oldest') {
          return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
        }
        if (sortBy === 'name_asc') {
          return (a.name || '').localeCompare(b.name || '');
        }
        if (sortBy === 'name_desc') {
          return (b.name || '').localeCompare(a.name || '');
        }
        if (sortBy === 'duration_desc') {
          return (b.duration || 0) - (a.duration || 0);
        }
        if (sortBy === 'duration_asc') {
          return (a.duration || 0) - (b.duration || 0);
        }
        return 0;
      });

      return videos;
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, this.collectionName);
    }
  }

  /**
   * Get single video
   */
  static async getVideo(videoId: string): Promise<Video | null> {
    try {
      const snap = await getDoc(doc(db, this.collectionName, videoId));
      if (!snap.exists()) return null;
      return { ...snap.data(), id: snap.id } as Video;
    } catch (err) {
      handleFirestoreError(err, OperationType.GET, `${this.collectionName}/${videoId}`);
    }
  }

  /**
   * Create video metadata record
   */
  static async createVideo(video: Video): Promise<Video> {
    try {
      const videoDocRef = doc(db, this.collectionName, video.id);
      await setDoc(videoDocRef, {
        ...video,
        createdAt: video.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });
      return video;
    } catch (err) {
      handleFirestoreError(err, OperationType.CREATE, `${this.collectionName}/${video.id}`);
    }
  }

  /**
   * Update video metadata
   */
  static async updateVideo(videoId: string, data: Partial<Video>): Promise<void> {
    try {
      const docRef = doc(db, this.collectionName, videoId);
      await updateDoc(docRef, {
        ...data,
        updatedAt: new Date().toISOString()
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `${this.collectionName}/${videoId}`);
    }
  }

  /**
   * Delete video
   */
  static async deleteVideo(videoId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, this.collectionName, videoId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `${this.collectionName}/${videoId}`);
    }
  }

  /**
   * Batch Delete videos
   */
  static async batchDelete(videoIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      for (const id of videoIds) {
        batch.delete(doc(db, this.collectionName, id));
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.collectionName);
    }
  }

  /**
   * Batch Move videos to another page
   */
  static async batchMove(videoIds: string[], targetPageId: string): Promise<void> {
    try {
      const batch = writeBatch(db);
      const updatedAt = new Date().toISOString();
      for (const id of videoIds) {
        batch.update(doc(db, this.collectionName, id), {
          pageId: targetPageId,
          updatedAt
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.collectionName);
    }
  }

  /**
   * Batch Archive videos
   */
  static async batchArchive(videoIds: string[]): Promise<void> {
    try {
      const batch = writeBatch(db);
      const updatedAt = new Date().toISOString();
      for (const id of videoIds) {
        batch.update(doc(db, this.collectionName, id), {
          status: 'ARCHIVED',
          updatedAt
        });
      }
      await batch.commit();
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.collectionName);
    }
  }

  /**
   * Batch Add Tag to videos
   */
  static async batchAddTag(videoIds: string[], tagToAdd: string): Promise<void> {
    try {
      for (const id of videoIds) {
        const videoRef = doc(db, this.collectionName, id);
        const snap = await getDoc(videoRef);
        if (snap.exists()) {
          const currentTags = (snap.data().tags || []) as string[];
          if (!currentTags.includes(tagToAdd)) {
            await updateDoc(videoRef, {
              tags: [...currentTags, tagToAdd],
              updatedAt: new Date().toISOString()
            });
          }
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.collectionName);
    }
  }

  static async batchTagVideos(videoIds: string[], tagsToAdd: string[]): Promise<void> {
    try {
      for (const id of videoIds) {
        const videoRef = doc(db, this.collectionName, id);
        const snap = await getDoc(videoRef);
        if (snap.exists()) {
          const currentTags = (snap.data().tags || []) as string[];
          const mergedTags = Array.from(new Set([...currentTags, ...tagsToAdd]));
          await updateDoc(videoRef, {
            tags: mergedTags,
            updatedAt: new Date().toISOString()
          });
        }
      }
    } catch (err) {
      handleFirestoreError(err, OperationType.WRITE, this.collectionName);
    }
  }

  static async batchDeleteVideos(videoIds: string[]): Promise<void> {
    return this.batchDelete(videoIds);
  }

  static async batchMoveVideos(videoIds: string[], targetPageId: string): Promise<void> {
    return this.batchMove(videoIds, targetPageId);
  }

  static async batchArchiveVideos(videoIds: string[]): Promise<void> {
    return this.batchArchive(videoIds);
  }

  /**
   * Check if a content from an external source already exists for this page/user
   */
  static async checkDuplicate(userId: string, pageId: string, source: string, sourceContentId: string): Promise<Video | null> {
    try {
      const q = query(
        collection(db, this.collectionName),
        where('userId', '==', userId),
        where('pageId', '==', pageId),
        where('source', '==', source),
        where('sourceContentId', '==', sourceContentId)
      );
      const snapshot = await getDocs(q);
      if (!snapshot.empty) {
        return { id: snapshot.docs[0].id, ...snapshot.docs[0].data() } as Video;
      }
    } catch {
      // Fallback via server API
      try {
        const res = await fetch('/api/miner/check-duplicate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ userId, pageId, source, sourceContentId })
        });
        const data = await res.json();
        return data.video || null;
      } catch {
        return null;
      }
    }
    return null;
  }
}
