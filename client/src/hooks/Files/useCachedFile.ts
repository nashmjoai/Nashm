import { useState, useEffect, useRef } from 'react';
import { cacheFileUrl, getCachedFile, CachedFileRecord } from '~/utils/fileDB';

interface UseCachedFileOptions {
  fileId?: string;
  url?: string;
  filename?: string;
  mimeType?: string;
}

interface UseCachedFileResult {
  displayUrl: string;
  cachedRecord: CachedFileRecord | null;
  isCached: boolean;
}

/**
 * Universal hook to retrieve and manage any cached file (PDF, TXT, DOCX, Image, Video, etc.) from IndexedDB.
 * Automatically caches remote file URLs and restores local Blob URLs when remote URLs are offline or absent.
 */
export function useCachedFile({
  fileId,
  url,
  filename,
  mimeType,
}: UseCachedFileOptions): UseCachedFileResult {
  const [displayUrl, setDisplayUrl] = useState<string>(url ?? '');
  const [cachedRecord, setCachedRecord] = useState<CachedFileRecord | null>(null);
  const objectUrlRef = useRef<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function processCachingAndFallback() {
      const cacheKey = fileId || (url && !url.startsWith('blob:') ? url : undefined);

      if (url) {
        if (isMounted) {
          setDisplayUrl(url);
        }
        if (cacheKey && !url.startsWith('blob:') && !url.startsWith('data:')) {
          cacheFileUrl(cacheKey, url, { filename, mimeType }).catch(() => {
            // Background caching
          });
        }
        return;
      }

      // Fallback check if URL is missing or empty
      if (fileId) {
        const record = await getCachedFile(fileId);
        if (isMounted && record?.blob) {
          if (objectUrlRef.current) {
            URL.revokeObjectURL(objectUrlRef.current);
          }
          const blobUrl = URL.createObjectURL(record.blob);
          objectUrlRef.current = blobUrl;
          setDisplayUrl(blobUrl);
          setCachedRecord(record);
        }
      }
    }

    processCachingAndFallback();

    return () => {
      isMounted = false;
    };
  }, [fileId, url, filename, mimeType]);

  useEffect(() => {
    return () => {
      if (objectUrlRef.current) {
        URL.revokeObjectURL(objectUrlRef.current);
        objectUrlRef.current = null;
      }
    };
  }, []);

  return {
    displayUrl,
    cachedRecord,
    isCached: !!cachedRecord || (displayUrl !== '' && displayUrl.startsWith('blob:')),
  };
}

export default useCachedFile;
