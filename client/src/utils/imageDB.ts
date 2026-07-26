/**
 * Image caching utilities (delegated to universal fileDB for unified storage).
 */
import {
  cacheFileBlob,
  cacheFileUrl,
  getCachedFile,
  getCachedFileUrl,
} from './fileDB';

export async function cacheImageBlob(key: string, blob: Blob): Promise<void> {
  return cacheFileBlob(key, blob);
}

export async function cacheImageUrl(key: string, url: string): Promise<void> {
  return cacheFileUrl(key, url);
}

export async function getCachedImageBlob(key: string): Promise<Blob | null> {
  const record = await getCachedFile(key);
  return record?.blob ?? null;
}

export async function getCachedImageUrl(key: string): Promise<string | null> {
  return getCachedFileUrl(key);
}
