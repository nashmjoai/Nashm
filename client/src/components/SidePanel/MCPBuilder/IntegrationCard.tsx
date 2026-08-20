import { useCallback } from 'react';
import { PlugZap, Unplug, Loader2, Key } from 'lucide-react';
import { Button } from '@nashm/client';
import type { IntegrationPreset } from './integrationPresets';
import { INTEGRATION_ICONS } from './IntegrationIcons';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface IntegrationCardProps {
  preset: IntegrationPreset;
  /** Whether this service is already connected (server exists in user's MCP list) */
  isConnected: boolean;
  /** Whether connection is currently in progress */
  isConnecting: boolean;
  /** Called when user clicks Connect — parent handles MCP server creation */
  onConnect: (preset: IntegrationPreset) => void;
  /** Called when user clicks Disconnect — parent handles MCP server removal */
  onDisconnect: (preset: IntegrationPreset) => void;
}

/**
 * A single integration card in the marketplace.
 *
 * Design principles:
 * - Clean, modern card with subtle gradient accent
 * - Brand icon + name + short description
 * - Single CTA button: Connect / Disconnect
 * - Status indicators through button state
 * - Smooth hover animations
 */
export default function IntegrationCard({
  preset,
  isConnected,
  isConnecting,
  onConnect,
  onDisconnect,
}: IntegrationCardProps) {
  const localize = useLocalize();
  const IconComponent = INTEGRATION_ICONS[preset.id];

  const handleClick = useCallback(() => {
    if (isConnecting) return;
    if (isConnected) {
      onDisconnect(preset);
    } else {
      onConnect(preset);
    }
  }, [isConnected, isConnecting, preset, onConnect, onDisconnect]);

  const t = localize as (key: string) => string;

  let buttonLabel = t('com_ui_connect') || 'Connect';
  let ButtonIcon = PlugZap;

  if (isConnecting) {
    buttonLabel = t('com_ui_connecting') || 'Connecting...';
    ButtonIcon = Loader2;
  } else if (isConnected) {
    buttonLabel = t('com_ui_disconnect') || 'Disconnect';
    ButtonIcon = Unplug;
  }

  const authBadge =
    preset.authType === 'api_key' ? (
      <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-1.5 py-0.5 text-[10px] font-medium text-amber-700 dark:bg-amber-900/40 dark:text-amber-400">
        <Key className="size-2.5" />
        {t('com_ui_api_key') || 'API Key'}
      </span>
    ) : null;

  return (
    <div
      className={cn(
        'group relative flex flex-col rounded-xl border p-3',
        'transition-all duration-200 ease-out',
        isConnected
          ? 'border-green-200 bg-green-50/50 dark:border-green-800/50 dark:bg-green-950/20'
          : 'border-border-light bg-surface-primary hover:border-border-medium hover:shadow-sm',
      )}
    >
      {/* Top accent line */}
      <div
        className={cn(
          'absolute inset-x-0 top-0 h-[2px] rounded-t-xl opacity-0 transition-opacity duration-200',
          !isConnected && 'group-hover:opacity-100',
        )}
        style={{
          background: `linear-gradient(90deg, ${preset.accentColor}40, ${preset.accentColor}80, ${preset.accentColor}40)`,
        }}
      />

      {/* Header: Icon + Name + Badge */}
      <div className="flex items-start gap-2.5">
        {/* Service Icon */}
        <div
          className={cn(
            'flex size-9 shrink-0 items-center justify-center rounded-lg',
            'transition-transform duration-200 group-hover:scale-105',
          )}
          style={{
            backgroundColor: `${preset.accentColor}12`,
          }}
        >
          {IconComponent ? (
            <IconComponent className="size-5" />
          ) : (
            <PlugZap className="size-5 text-text-secondary" />
          )}
        </div>

        {/* Name + Description */}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-1.5">
            <span className="truncate text-sm font-semibold text-text-primary">{preset.name}</span>
            {authBadge}
          </div>
          <p className="mt-0.5 line-clamp-2 text-xs leading-relaxed text-text-secondary">
            {preset.description}
          </p>
        </div>

        {/* Connected indicator */}
        {isConnected && (
          <div className="mt-0.5 flex size-5 shrink-0 items-center justify-center rounded-full bg-green-500">
            <svg className="size-3 text-white" viewBox="0 0 12 12" fill="none">
              <path
                d="M2 6l3 3 5-5"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </div>
        )}
      </div>

      {/* Action Button */}
      <div className="mt-2.5">
        <Button
          variant={isConnected ? 'outline' : 'default'}
          size="sm"
          className={cn(
            'w-full text-xs font-medium transition-all duration-200',
            !isConnected &&
              !isConnecting && [
                'bg-surface-tertiary text-text-primary',
                'hover:bg-surface-hover',
                'dark:bg-surface-tertiary dark:hover:bg-surface-hover',
              ],
            isConnected && [
              'border-red-200 text-red-600 hover:border-red-300 hover:bg-red-50',
              'dark:border-red-800/50 dark:text-red-400 dark:hover:bg-red-950/30',
            ],
            isConnecting && 'pointer-events-none opacity-70',
          )}
          onClick={handleClick}
          disabled={isConnecting}
          aria-label={`${buttonLabel} ${preset.name}`}
        >
          <ButtonIcon className={cn('mr-1.5 size-3', isConnecting && 'animate-spin')} />
          {buttonLabel}
        </Button>
      </div>
    </div>
  );
}
