import { useCachedFile } from './useCachedFile';

interface UseCachedImageOptions {
  fileId?: string;
  url?: string;
  imageBase64?: string;
}

/**
 * Image caching hook (delegates to universal useCachedFile).
 */
export function useCachedImage({ fileId, url, imageBase64 }: UseCachedImageOptions): string {
  const activeUrl = imageBase64 ?? url;
  const { displayUrl } = useCachedFile({ fileId, url: activeUrl });
  return displayUrl;
}

export default useCachedImage;
