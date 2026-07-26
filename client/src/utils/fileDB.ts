/**
 * Universal IndexedDB storage for persisting all file types (PDF, TXT, DOCX, Images, Audio, Video, etc.)
 * locally on the client device.
 */

const DB_NAME = 'NashmFileCache';
const STORE_NAME = 'files';
const DB_VERSION = 1;

export interface CachedFileRecord {
  fileId: string;
  blob: Blob;
  filename?: string;
  mimeType?: string;
  cachedAt: number;
}

let dbPromise: Promise<IDBDatabase> | null = null;

function isIndexedDBSupported(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && window.indexedDB !== undefined;
}

function getDB(): Promise<IDBDatabase> {
  if (!isIndexedDBSupported()) {
    return Promise.reject(new Error('IndexedDB is not supported in this environment.'));
  }

  if (dbPromise) {
    return dbPromise;
  }

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);

    request.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };

    request.onsuccess = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      resolve(db);
    };

    request.onerror = (event) => {
      dbPromise = null;
      reject((event.target as IDBOpenDBRequest).error);
    };
  });

  return dbPromise;
}

/**
 * Store any file Blob into IndexedDB by file key (file_id or filepath).
 */
export async function cacheFileBlob(
  key: string,
  blob: Blob,
  meta?: { filename?: string; mimeType?: string },
): Promise<void> {
  if (!key || !blob) return;
  try {
    const db = await getDB();
    const record: CachedFileRecord = {
      fileId: key,
      blob,
      filename: meta?.filename,
      mimeType: meta?.mimeType || blob.type,
      cachedAt: Date.now(),
    };
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const request = store.put(record, key);
      request.onsuccess = () => resolve();
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[fileDB] Failed to cache file blob:', error);
  }
}

/**
 * Fetch a file from a URL, convert to Blob, and store in IndexedDB.
 */
export async function cacheFileUrl(
  key: string,
  url: string,
  meta?: { filename?: string; mimeType?: string },
): Promise<void> {
  if (!key || !url || url.startsWith('blob:') || url.startsWith('data:')) return;
  try {
    const response = await fetch(url, { credentials: 'same-origin' });
    if (!response.ok) return;
    const blob = await response.blob();
    await cacheFileBlob(key, blob, meta);
  } catch (error) {
    console.warn('[fileDB] Failed to fetch and cache file URL:', error);
  }
}

/**
 * Retrieve a cached file record (Blob + Metadata) from IndexedDB by key.
 */
export async function getCachedFile(key: string): Promise<CachedFileRecord | null> {
  if (!key) return null;
  try {
    const db = await getDB();
    return await new Promise<CachedFileRecord | null>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(key);
      request.onsuccess = () => {
        const result = request.result;
        if (result && result.blob instanceof Blob) {
          resolve(result as CachedFileRecord);
        } else if (result instanceof Blob) {
          // Backward compatibility for legacy blob entries
          resolve({ fileId: key, blob: result, cachedAt: Date.now() });
        } else {
          resolve(null);
        }
      };
      request.onerror = () => reject(request.error);
    });
  } catch (error) {
    console.warn('[fileDB] Failed to retrieve cached file:', error);
    return null;
  }
}

/**
 * Retrieve a cached file as a local Blob Object URL (`blob:...`).
 */
export async function getCachedFileUrl(key: string): Promise<string | null> {
  const record = await getCachedFile(key);
  if (!record || !record.blob) return null;
  return URL.createObjectURL(record.blob);
}
