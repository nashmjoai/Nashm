import { memo, useCallback, useMemo } from 'react';
import { FileText, Presentation, SearchCheck, Table2, X, Headphones } from 'lucide-react';
import { useRecoilState, useSetRecoilState } from 'recoil';
import type { LucideIcon } from 'lucide-react';
import type { TranslationKeys } from '~/hooks';
import type { QuickArtifactActionType } from '~/utils/quickActions';
import { useLocalize } from '~/hooks';
import { useGetStartupConfig } from '~/data-provider';
import { cn } from '~/utils';
import store from '~/store';

interface QuickActionConfig {
  type: QuickArtifactActionType;
  icon: LucideIcon;
  labelKey: TranslationKeys;
  descriptionKey: TranslationKeys;
}

const quickActions: ReadonlyArray<QuickActionConfig> = [
  {
    type: 'slides',
    icon: Presentation,
    labelKey: 'com_ui_quick_artifact_slides',
    descriptionKey: 'com_ui_quick_artifact_slides_desc',
  },
  {
    type: 'audio',
    icon: Headphones,
    labelKey: 'com_ui_quick_artifact_audio',
    descriptionKey: 'com_ui_quick_artifact_audio_desc',
  },
  {
    type: 'document',
    icon: FileText,
    labelKey: 'com_ui_quick_artifact_document',
    descriptionKey: 'com_ui_quick_artifact_document_desc',
  },
  {
    type: 'spreadsheet',
    icon: Table2,
    labelKey: 'com_ui_quick_artifact_excel',
    descriptionKey: 'com_ui_quick_artifact_excel_desc',
  },
  {
    type: 'research',
    icon: SearchCheck,
    labelKey: 'com_ui_quick_artifact_research',
    descriptionKey: 'com_ui_quick_artifact_research_desc',
  },
];

interface QuickActionsRowProps {
  conversationId: string;
  disabled?: boolean;
  isRTL?: boolean;
}

function QuickActionsRow({ conversationId, disabled, isRTL }: QuickActionsRowProps) {
  const localize = useLocalize();
  const { data: startupConfig } = useGetStartupConfig();
  const interfaceConfig = useMemo(() => startupConfig?.interface ?? {}, [startupConfig]);

  const [actionState, setActionState] = useRecoilState(
    store.quickArtifactActionByConvoId(conversationId),
  );

  const activeQuickActions = useMemo(() => {
    return quickActions.filter((action) => {
      // If the setting is explicitly false, hide it. Otherwise default to true (visible).
      return interfaceConfig[action.type] !== false;
    });
  }, [interfaceConfig]);

  const selectedAction = useMemo(
    () => activeQuickActions.find((action) => action.type === actionState.type),
    [actionState.type, activeQuickActions],
  );

  const selectAction = useCallback(
    (type: QuickArtifactActionType) => {
      setActionState({ status: 'selected', type });
    },
    [setActionState],
  );

  const clearAction = useCallback(() => {
    setActionState({ status: 'idle' });
  }, [setActionState]);

  if (actionState.status === 'consumed') {
    return null;
  }

  if (actionState.status === 'selected' && selectedAction) {
    const SelectedIcon = selectedAction.icon;
    return (
      <div className={cn('mb-2 flex w-full px-1', isRTL ? 'justify-end' : 'justify-start')}>
        <div
          className={cn(
            'inline-flex max-w-full items-center gap-2 rounded-full border border-amber-500/30',
            'bg-amber-500/10 px-3 py-1.5 text-sm text-text-primary shadow-sm',
            isRTL && 'flex-row-reverse',
          )}
        >
          <SelectedIcon className="h-4 w-4 shrink-0 text-amber-600" aria-hidden="true" />
          <span className="truncate font-medium">{localize(selectedAction.labelKey)}</span>
          <button
            type="button"
            onClick={clearAction}
            disabled={disabled}
            aria-label={localize('com_ui_quick_artifact_clear')}
            title={localize('com_ui_quick_artifact_clear')}
            className={cn(
              'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full',
              'text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary',
              'disabled:pointer-events-none disabled:opacity-50',
            )}
          >
            <X className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      </div>
    );
  }

  if (activeQuickActions.length === 0) {
    return null;
  }

  return (
    <div
      className={cn(
        'mb-2 flex w-full flex-wrap gap-2 px-1',
        isRTL ? 'justify-end' : 'justify-start',
      )}
      aria-label={localize('com_ui_quick_artifact_actions')}
    >
      {activeQuickActions.map((action) => {
        const Icon = action.icon;
        const label = localize(action.labelKey);
        return (
          <button
            key={action.type}
            type="button"
            disabled={disabled}
            onClick={() => selectAction(action.type)}
            aria-label={label}
            title={localize(action.descriptionKey)}
            className={cn(
              'inline-flex h-9 items-center gap-2 rounded-full border border-border-light',
              'bg-surface-chat px-3 text-sm font-medium text-text-secondary shadow-sm',
              'transition-colors hover:bg-surface-hover hover:text-text-primary',
              'disabled:pointer-events-none disabled:opacity-50',
              isRTL && 'flex-row-reverse',
            )}
          >
            <Icon className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>{label}</span>
          </button>
        );
      })}
    </div>
  );
}

export default memo(QuickActionsRow);
