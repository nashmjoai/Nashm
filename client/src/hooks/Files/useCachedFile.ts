import { useState, useEffect, useRef } from 'react';
import { cacheFileUrl, getCachedFile, CachedFileRecord, cacheFileBlob } from '~/utils/fileDB';
import useE2EE from '~/hooks/useE2EE';

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
  const { isEnabled, isUnlocked, decryptFile, decryptFileInfo } = useE2EE();

  useEffect(() => {
    let isMounted = true;

    async function processCachingAndFallback() {
      const cacheKey = fileId || (url && !url.startsWith('blob:') ? url : undefined);

      if (url) {
        if (isMounted) {
          setDisplayUrl(url);
        }
        if (cacheKey && !url.startsWith('blob:') && !url.startsWith('data:')) {
          const isEncrypted = filename?.endsWith('.enc') || url.includes('.enc');

          if (isEncrypted && isEnabled && isUnlocked) {
            // Background caching with decryption
            fetch(url, { credentials: 'same-origin' })
              .then((res) => {
                if (!res.ok) throw new Error('Fetch failed');
                return res.text();
              })
              .then((text) => JSON.parse(text))
              .then(async (chunks) => {
                const [decryptedBuffer, encryptedInfo] = await Promise.all([
                  decryptFile(chunks),
                  decryptFileInfo(chunks),
                ]);
                return { decryptedBuffer, encryptedInfo };
              })
              .then(({ decryptedBuffer, encryptedInfo }) => {
                if (decryptedBuffer) {
                  let inferredMime = encryptedInfo?.mimeType || mimeType;
                  if (!inferredMime) {
                    const nameToCheck = filename || url.split('?')[0];
                    if (nameToCheck.includes('.png')) inferredMime = 'image/png';
                    else if (nameToCheck.includes('.jpg') || nameToCheck.includes('.jpeg')) inferredMime = 'image/jpeg';
                    else if (nameToCheck.includes('.gif')) inferredMime = 'image/gif';
                    else if (nameToCheck.includes('.webp')) inferredMime = 'image/webp';
                    else if (nameToCheck.includes('.svg')) inferredMime = 'image/svg+xml';
                    else if (nameToCheck.includes('.pdf')) inferredMime = 'application/pdf';
                    else inferredMime = 'application/octet-stream';
                  }

                  const newBlob = new Blob([decryptedBuffer], { type: inferredMime });
                  cacheFileBlob(cacheKey, newBlob, {
                    filename: encryptedInfo?.filename ?? filename?.replace('.enc', ''),
                    mimeType: inferredMime,
                  });
                  if (isMounted) {
                    const blobUrl = URL.createObjectURL(newBlob);
                    objectUrlRef.current = blobUrl;
                    setDisplayUrl(blobUrl);
                    setCachedRecord({ fileId: cacheKey, blob: newBlob, cachedAt: Date.now() });
                  }
                }
              })
              .catch((err) => {
                console.warn('[E2EE] Failed to decrypt and cache file in background:', err);
              });
          } else if (!isEncrypted) {
            // Normal background caching
            cacheFileUrl(cacheKey, url, { filename, mimeType }).catch(() => {});
          }
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
  }, [decryptFile, decryptFileInfo, fileId, filename, isEnabled, isUnlocked, mimeType, url]);

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
