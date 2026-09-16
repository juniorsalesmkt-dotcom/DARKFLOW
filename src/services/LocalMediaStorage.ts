/**
 * DARKFLOW Local Media Storage Engine (IndexedDB)
 * 
 * Provides bulletproof client-side video persistence capable of storing
 * gigabytes of raw video files and Blobs directly in browser storage.
 * Works even when backend servers or external Cloud Storage buckets
 * return HTTP 404, are unreachable, or lack cloud IAM permissions.
 */

const DB_NAME = 'darkflow_media_store_v1';
const STORE_NAME = 'videos';
const DB_VERSION = 1;

interface StoredVideoRecord {
  videoId: string;
  blob: Blob;
  mimeType: string;
  filename: string;
  size: number;
  createdAt: number;
}

class LocalMediaStorageService {
  private dbPromise: Promise<IDBDatabase> | null = null;
  private objectUrlCache: Map<string, string> = new Map();

  private getDB(): Promise<IDBDatabase> {
    if (this.dbPromise) return this.dbPromise;

    this.dbPromise = new Promise((resolve, reject) => {
      if (typeof window === 'undefined' || !window.indexedDB) {
        reject(new Error('IndexedDB não suportado neste navegador.'));
        return;
      }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME, { keyPath: 'videoId' });
        }
      };

      request.onsuccess = (event) => {
        const db = (event.target as IDBOpenDBRequest).result;
        resolve(db);
      };

      request.onerror = (event) => {
        console.error('[LOCAL MEDIA STORAGE] Erro ao abrir IndexedDB:', (event.target as IDBOpenDBRequest).error);
        reject((event.target as IDBOpenDBRequest).error);
      };
    });

    return this.dbPromise;
  }

  /**
   * Save raw video Blob/File in IndexedDB
   */
  async saveVideo(videoId: string, blobOrFile: Blob | File, filename?: string): Promise<string> {
    const db = await this.getDB();
    const name = filename || (blobOrFile instanceof File ? blobOrFile.name : `${videoId}.mp4`);

    const record: StoredVideoRecord = {
      videoId,
      blob: blobOrFile,
      mimeType: blobOrFile.type || 'video/mp4',
      filename: name,
      size: blobOrFile.size,
      createdAt: Date.now()
    };

    return new Promise((resolve, reject) => {
      const transaction = db.transaction([STORE_NAME], 'readwrite');
      const store = transaction.objectStore(STORE_NAME);
      const putRequest = store.put(record);

      putRequest.onsuccess = () => {
        // Cache object URL
        const objectUrl = URL.createObjectURL(blobOrFile);
        this.objectUrlCache.set(videoId, objectUrl);
        console.log(`[LOCAL MEDIA STORAGE] Vídeo ${videoId} salvo com sucesso no IndexedDB (${(blobOrFile.size / (1024 * 1024)).toFixed(2)} MB)`);
        resolve(objectUrl);
      };

      putRequest.onerror = (event) => {
        console.error('[LOCAL MEDIA STORAGE] Falha ao gravar no IndexedDB:', (event.target as IDBRequest).error);
        reject((event.target as IDBRequest).error);
      };
    });
  }

  /**
   * Retrieve video Blob
   */
  async getVideoBlob(videoId: string): Promise<Blob | null> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const getRequest = store.get(videoId);

        getRequest.onsuccess = () => {
          const result = getRequest.result as StoredVideoRecord | undefined;
          resolve(result ? result.blob : null);
        };

        getRequest.onerror = () => {
          resolve(null);
        };
      });
    } catch {
      return null;
    }
  }

  /**
   * Get an executable streaming URL (Blob URL) for video player
   */
  async getVideoUrl(videoId: string): Promise<string | null> {
    if (this.objectUrlCache.has(videoId)) {
      return this.objectUrlCache.get(videoId)!;
    }

    const blob = await this.getVideoBlob(videoId);
    if (!blob) return null;

    const url = URL.createObjectURL(blob);
    this.objectUrlCache.set(videoId, url);
    return url;
  }

  /**
   * Check if video exists in IndexedDB
   */
  async hasVideo(videoId: string): Promise<boolean> {
    try {
      const db = await this.getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readonly');
        const store = transaction.objectStore(STORE_NAME);
        const countRequest = store.count(videoId);

        countRequest.onsuccess = () => {
          resolve(countRequest.result > 0);
        };

        countRequest.onerror = () => {
          resolve(false);
        };
      });
    } catch {
      return false;
    }
  }

  /**
   * Delete video from IndexedDB
   */
  async deleteVideo(videoId: string): Promise<void> {
    try {
      if (this.objectUrlCache.has(videoId)) {
        URL.revokeObjectURL(this.objectUrlCache.get(videoId)!);
        this.objectUrlCache.delete(videoId);
      }
      const db = await this.getDB();
      return new Promise((resolve) => {
        const transaction = db.transaction([STORE_NAME], 'readwrite');
        const store = transaction.objectStore(STORE_NAME);
        store.delete(videoId);
        transaction.oncomplete = () => resolve();
        transaction.onerror = () => resolve();
      });
    } catch {
      // Ignore
    }
  }
}

export const LocalMediaStorage = new LocalMediaStorageService();
