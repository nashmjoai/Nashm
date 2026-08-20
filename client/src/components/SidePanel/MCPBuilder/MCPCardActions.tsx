import React from 'react';
import { Pencil, PlugZap, SlidersHorizontal, RefreshCw, X, Trash2 } from 'lucide-react';
import { Spinner, TooltipAnchor } from '@nashm/client';
import type { MCPServerStatus } from 'nashm-data-provider';
import { useLocalize } from '~/hooks';
import { cn } from '~/utils';

interface MCPCardActionsProps {
  serverName: string;
  serverStatus?: MCPServerStatus;
  isInitializing: boolean;
  canCancel: boolean;
  hasCustomUserVars: boolean;
  canEdit: boolean;
  editButtonRef?: React.RefObject<HTMLDivElement>;
  onEditClick: (e: React.MouseEvent) => void;
  onConfigClick: (e: React.MouseEvent) => void;
  onInitialize: () => void;
  onCancel: (e: React.MouseEvent) => void;
  onDelete?: () => void;
  onRevoke?: () => void;
}

/**
 * Standardized action buttons for MCP server cards.
 *
 * Unified icon system (each icon has ONE meaning):
 * - Pencil: Edit server definition (Settings panel only)
 * - PlugZap: Connect/Authenticate (for disconnected/error servers)
 * - SlidersHorizontal: Configure custom variables (for connected servers with vars)
 * - Trash2: Delete a user-managed MCP, or remove a system-managed connection for the current user
 * - RefreshCw: Reconnect/Refresh (for connected servers)
 * - Spinner: Loading state (with X on hover for cancel)
 */
export default function MCPCardActions({
  serverName,
  serverStatus,
  isInitializing,
  canCancel,
  hasCustomUserVars,
  canEdit,
  editButtonRef,
  onEditClick,
  onConfigClick,
  onInitialize,
  onCancel,
  onDelete,
  onRevoke,
}: MCPCardActionsProps) {
  const localize = useLocalize();

  const connectionState = serverStatus?.connectionState;
  const isConnected = connectionState === 'connected';
  const isConnecting = connectionState === 'connecting';
  const isDisconnected = connectionState === 'disconnected';
  const isError = connectionState === 'error';

  const buttonBaseClass = cn(
    'flex size-7 items-center justify-center rounded-md',
    'transition-colors duration-150',
    'text-text-secondary hover:text-text-primary',
    'hover:bg-surface-tertiary',
    'focus:outline-none focus-visible:ring-2 focus-visible:ring-border-heavy',
  );

  // Loading state - show spinner (with cancel option)
  if (isInitializing || isConnecting) {
    return (
      <div className="flex items-center gap-0.5">
        {/* Edit button stays visible during loading */}
        {canEdit && (
          <TooltipAnchor
            ref={editButtonRef}
            description={localize('com_ui_edit')}
            side="top"
            className={buttonBaseClass}
            aria-label={localize('com_ui_edit')}
            role="button"
            onClick={onEditClick}
          >
            <Pencil className="size-3.5" aria-hidden="true" />
          </TooltipAnchor>
        )}

        {/* Spinner with cancel on hover */}
        {canCancel ? (
          <TooltipAnchor
            description={localize('com_ui_cancel')}
            side="top"
            className={cn(buttonBaseClass, 'group')}
            aria-label={localize('com_ui_cancel')}
            role="button"
            onClick={onCancel}
          >
            <div className="relative size-4">
              <Spinner className="size-4 group-hover:opacity-0" />
              <X className="absolute inset-0 size-4 text-red-500 opacity-0 group-hover:opacity-100" />
            </div>
          </TooltipAnchor>
        ) : (
          <div className={cn(buttonBaseClass, 'cursor-default hover:bg-transparent')}>
            <Spinner
              className="size-4"
              aria-label={localize('com_nav_mcp_status_connecting', { 0: serverName })}
            />
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="flex items-center gap-0.5">
      {/* Edit button - opens MCPServerDialog to edit server definition */}
      {canEdit && (
        <TooltipAnchor
          ref={editButtonRef}
          description={localize('com_ui_edit')}
          side="top"
          className={buttonBaseClass}
          aria-label={localize('com_ui_edit')}
          role="button"
          onClick={onEditClick}
        >
          <Pencil className="size-3.5" aria-hidden="true" />
        </TooltipAnchor>
      )}

      {/* Connect button - for disconnected or error states */}
      {(isDisconnected || isError) && (
        <TooltipAnchor
          description={localize('com_nav_mcp_connect')}
          side="top"
          className={buttonBaseClass}
          aria-label={localize('com_nav_mcp_connect')}
          role="button"
          onClick={() => onInitialize()}
        >
          <PlugZap className="size-4" aria-hidden="true" />
        </TooltipAnchor>
      )}

      {/* Configure button - for connected servers with custom vars */}
      {isConnected && hasCustomUserVars && (
        <TooltipAnchor
          description={localize('com_ui_configure')}
          side="top"
          className={buttonBaseClass}
          aria-label={localize('com_ui_configure')}
          role="button"
          onClick={onConfigClick}
        >
          <SlidersHorizontal className="size-3.5" aria-hidden="true" />
        </TooltipAnchor>
      )}

      {/* Refresh button - for connected servers (allows reconnection) */}
      {isConnected && (
        <TooltipAnchor
          description={localize('com_nav_mcp_reconnect')}
          side="top"
          className={buttonBaseClass}
          aria-label={localize('com_nav_mcp_reconnect')}
          role="button"
          onClick={() => onInitialize()}
        >
          <RefreshCw className="size-3.5" aria-hidden="true" />
        </TooltipAnchor>
      )}

      {/* Delete user-managed servers; system-managed connections are removed only for this user. */}
      {(onDelete || (serverStatus?.requiresOAuth && onRevoke)) && (
        <TooltipAnchor
          description={localize('com_ui_delete')}
          side="top"
          className={cn(buttonBaseClass, 'text-red-500 hover:text-red-600')}
          aria-label={localize('com_ui_delete')}
          role="button"
          onClick={onDelete ?? onRevoke}
        >
          <Trash2 className="size-3.5" aria-hidden="true" />
        </TooltipAnchor>
      )}
    </div>
  );
}
