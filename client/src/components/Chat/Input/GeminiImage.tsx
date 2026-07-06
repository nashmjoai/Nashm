import React, { memo, useMemo } from 'react';
import { ImageIcon } from 'lucide-react';
import { CheckboxButton } from '@nashm/client';
import { EModelEndpoint } from 'nashm-data-provider';
import { useAvailableToolsQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { useBadgeRowContext } from '~/Providers';

function GeminiImage() {
  const localize = useLocalize();
  const context = useBadgeRowContext();
  const { data: availableTools } = useAvailableToolsQuery(EModelEndpoint.agents);
  const { toggleState: imageGen, debouncedChange, isPinned } = context?.geminiImage ?? {};

  const hasGeminiImageTool = useMemo(() => {
    return availableTools?.some((tool) => tool.pluginKey === 'gemini_image_gen') ?? false;
  }, [availableTools]);

  if (!hasGeminiImageTool) {
    return null;
  }

  return (
    (imageGen || isPinned) && (
      <CheckboxButton
        className="max-w-fit"
        checked={imageGen}
        setValue={debouncedChange}
        label={localize('com_ui_generate_image')}
        isCheckedClassName="border-emerald-600/40 bg-emerald-500/10 hover:bg-emerald-700/10"
        icon={<ImageIcon className="icon-md" aria-hidden="true" />}
      />
    )
  );
}

export default memo(GeminiImage);
