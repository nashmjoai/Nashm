import React, { useState, useRef, useMemo, useEffect, useCallback } from 'react';
import { Skeleton } from '@nashm/client';
import { apiBaseUrl } from 'nashm-data-provider';
import DialogImage from './DialogImage';
import { cn } from '~/utils';
import { useCachedImage } from '~/hooks/Files/useCachedImage';
import { getCachedFile } from '~/utils/fileDB';

/** Max display height for chat images (Tailwind JIT class) */
export const IMAGE_MAX_H = 'max-h-[45vh]' as const;
/** Matches the `max-w-lg` Tailwind class on the wrapper button (32rem = 512px at 16px base) */
const IMAGE_MAX_W_PX = 512;

/** Caches image dimensions by src so remounts can reserve space */
const dimensionCache = new Map<string, { width: number; height: number }>();
/** Tracks URLs that have been fully painted — skip skeleton on remount */
const paintedUrls = new Set<string>();

/** Test-only: resets module-level caches */
export function _resetImageCaches(): void {
  dimensionCache.clear();
  paintedUrls.clear();
}

function computeHeightStyle(w: number, h: number): React.CSSProperties {
  return { height: `min(45vh, ${(h / w) * 100}vw, ${(h / w) * IMAGE_MAX_W_PX}px)` };
}

const Image = ({
  imagePath,
  altText,
  className,
  args,
  width,
  height,
  fileId,
  filename,
  mimeType,
  userId,
}: {
  imagePath: string;
  altText: string;
  className?: string;
  args?: {
    prompt?: string;
    quality?: 'low' | 'medium' | 'high';
    size?: string;
    style?: string;
    [key: string]: unknown;
  };
  width?: number;
  height?: number;
  fileId?: string;
  filename?: string;
  mimeType?: string;
  userId?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const absoluteImageUrl = useMemo(() => {
    if (!imagePath) return imagePath;

    if (imagePath.startsWith('http') || imagePath.startsWith('data:')) {
      return imagePath;
    }

    // Root-relative server paths (`/images/...` static, `/api/share/...` share
    // routes) are resolved against the API base so they load under a subpath.
    if (
      imagePath.startsWith('/images/') ||
      imagePath.startsWith('/uploads/') ||
      imagePath.startsWith('/api/')
    ) {
      return `${apiBaseUrl()}${imagePath}`;
    }

    return imagePath;
  }, [imagePath]);

  const displayUrl = useCachedImage({
    fileId,
    url: absoluteImageUrl,
    filename,
    mimeType,
    userId,
  });

  const downloadImage = async () => {
    try {
      const downloadSrc = displayUrl || absoluteImageUrl;
      const response = await fetch(downloadSrc);
      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);

      const link = document.createElement('a');
      link.href = url;
      link.download = altText || 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Download failed:', error);
      const downloadSrc = displayUrl || absoluteImageUrl;
      const link = document.createElement('a');
      link.href = downloadSrc;
      link.download = altText || 'image.png';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };

  useEffect(() => {
    if (width && height && absoluteImageUrl) {
      dimensionCache.set(absoluteImageUrl, { width, height });
    }
  }, [absoluteImageUrl, width, height]);

  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);

  useEffect(() => {
    setFallbackUrl(null);
  }, [displayUrl, absoluteImageUrl]);

  const handleError = useCallback(async () => {
    if (fileId && !fallbackUrl) {
      try {
        const cached = await getCachedFile(fileId);
        if (cached?.blob) {
          const blobUrl = URL.createObjectURL(cached.blob);
          setFallbackUrl(blobUrl);
        }
      } catch (e) {
        console.warn('[Image] Fallback to cached file failed:', e);
      }
    }
  }, [fileId, fallbackUrl]);

  const activeSrc = fallbackUrl || displayUrl || absoluteImageUrl;

  const dims = width && height ? { width, height } : dimensionCache.get(displayUrl);
  const hasDimensions = !!(dims?.width && dims?.height);
  const heightStyle = hasDimensions ? computeHeightStyle(dims.width, dims.height) : undefined;
  const showSkeleton = hasDimensions && !paintedUrls.has(displayUrl) && !fallbackUrl;

  return (
    <div>
      <button
        ref={triggerRef}
        type="button"
        aria-label={`View ${altText} in dialog`}
        aria-haspopup="dialog"
        onClick={() => setIsOpen(true)}
        className={cn(
          'relative mt-1 w-full max-w-lg cursor-pointer overflow-hidden rounded-lg border border-border-light text-text-secondary-alt shadow-md transition-shadow',
          'focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-surface-primary',
          className,
        )}
        style={heightStyle}
      >
        {showSkeleton && <Skeleton className="absolute inset-0" aria-hidden="true" />}
        <img
          alt={altText}
          src={activeSrc}
          onLoad={() => paintedUrls.add(displayUrl)}
          onError={handleError}
          className={cn(
            'relative block text-transparent',
            hasDimensions
              ? 'size-full object-contain'
              : cn('h-auto w-auto max-w-full', IMAGE_MAX_H),
          )}
        />
      </button>
      <DialogImage
        isOpen={isOpen}
        onOpenChange={setIsOpen}
        src={activeSrc}
        downloadImage={downloadImage}
        args={args}
        triggerRef={triggerRef}
      />
    </div>
  );
};

export default Image;
