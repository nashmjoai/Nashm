import { useCachedFile } from './useCachedFile';

interface UseCachedImageOptions {
  fileId?: string;
  url?: string;
  imageBase64?: string;
  filename?: string;
  mimeType?: string;
  userId?: string;
}

/**
 * Image caching hook (delegates to universal useCachedFile).
 */
export function useCachedImage({
  fileId,
  url,
  imageBase64,
  filename,
  mimeType,
  userId,
}: UseCachedImageOptions): string {
  const activeUrl = imageBase64 ?? url;
  const { displayUrl } = useCachedFile({
    fileId,
    url: activeUrl,
    filename,
    mimeType,
    userId,
  });
  return displayUrl;
}

export default useCachedImage;
