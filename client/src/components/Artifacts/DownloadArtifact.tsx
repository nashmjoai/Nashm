import React, { useState } from 'react';
import { Download, CircleCheckBig } from 'lucide-react';
import type { Artifact } from '~/common';
import { Button } from '@nashm/client';
import useArtifactProps from '~/hooks/Artifacts/useArtifactProps';
import { useCodeState } from '~/Providers/EditorContext';
import { useLocalize } from '~/hooks';
import { isPreviewOnlyArtifact } from '~/utils/artifacts';
import { useAttachmentLink } from '~/components/Chat/Messages/Content/Parts/LogLink';

const DownloadArtifact = ({ artifact }: { artifact: Artifact }) => {
  const localize = useLocalize();
  const { currentCode } = useCodeState();
  const [isDownloaded, setIsDownloaded] = useState(false);
  const { fileKey: fileName } = useArtifactProps({ artifact });
  const originalFilename = artifact.title || fileName;
  const shouldDownloadOriginal =
    Boolean(artifact.filepath) && isPreviewOnlyArtifact(artifact.type);
  const { handleDownload: handleOriginalDownload } = useAttachmentLink({
    href: artifact.filepath ?? '',
    filename: originalFilename,
    file_id: artifact.file_id,
    user: artifact.user,
    source: artifact.source,
  });

  const handleDownload = async (event: React.MouseEvent<HTMLButtonElement>) => {
    try {
      if (shouldDownloadOriginal) {
        await handleOriginalDownload(event);
        setIsDownloaded(true);
        setTimeout(() => setIsDownloaded(false), 3000);
        return;
      }

      const content = currentCode ?? artifact.content ?? '';
      if (!content) {
        return;
      }
      const blob = new Blob([content], { type: artifact.type || 'text/plain' });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      setIsDownloaded(true);
      setTimeout(() => setIsDownloaded(false), 3000);
    } catch (error) {
      console.error('Download failed:', error);
    }
  };

  return (
    <Button
      size="icon"
      variant="ghost"
      className="h-9 w-9"
      onClick={handleDownload}
      aria-label={localize('com_ui_download_artifact')}
    >
      {isDownloaded ? (
        <CircleCheckBig size={16} aria-hidden="true" />
      ) : (
        <Download size={16} aria-hidden="true" />
      )}
    </Button>
  );
};

export default DownloadArtifact;
