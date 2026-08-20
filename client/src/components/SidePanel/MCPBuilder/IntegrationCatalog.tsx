import { useState, useCallback, useMemo } from 'react';
import { ChevronDown, ChevronUp, Sparkles } from 'lucide-react';
import { useToastContext } from '@nashm/client';
import { INTEGRATION_PRESETS } from './integrationPresets';
import type { IntegrationPreset } from './integrationPresets';
import type { MCPServerDefinition } from '~/hooks';
import {
  useCreateMCPServerMutation,
  useDeleteMCPServerMutation,
  useUpdateMCPServerMutation,
} from '~/data-provider/MCP';
import IntegrationCard from './IntegrationCard';
import CredentialsDialog from './CredentialsDialog';
import { useLocalize } from '~/hooks';
import type { ConnectionStatusMap } from '~/components/MCP/mcpServerUtils';

/** Maximum cards to show before "Show More" */
const INITIAL_VISIBLE_COUNT = 4;

interface IntegrationCatalogProps {
  /** Currently connected MCP servers (to detect which presets are already connected) */
  connectedServers: MCPServerDefinition[];
  connectionStatus?: ConnectionStatusMap;
  /** Starts initialization immediately after the server definition is created. */
  onInitializeServer: (serverName: string, oauthWindow: Window | null) => Promise<unknown>;
}

/**
 * Integration Marketplace Catalog — displays a grid of pre-configured service cards.
 *
 * Features:
 * - Shows popular integrations as branded cards
 * - Detects already-connected services and marks them
 * - "Connect" creates the MCP server with pre-filled config
 * - "Disconnect" removes the MCP server
 * - Collapsible with "Show More / Less"
 * - Smooth animations
 */
export default function IntegrationCatalog({
  connectedServers,
  connectionStatus,
  onInitializeServer,
}: IntegrationCatalogProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isExpanded, setIsExpanded] = useState(false);
  const [connectingIds, setConnectingIds] = useState<Set<string>>(new Set());
  const [credentialPreset, setCredentialPreset] = useState<IntegrationPreset | null>(null);

  const createMutation = useCreateMCPServerMutation();
  const deleteMutation = useDeleteMCPServerMutation();
  const updateMutation = useUpdateMCPServerMutation();

  /**
   * Build a set of preset IDs that are already connected.
   * We match by comparing the MCP server URL against known preset URLs,
   * and also by matching server name patterns.
   */
  const presetServers = useMemo(() => {
    const servers = new Map<string, MCPServerDefinition>();
    for (const preset of INTEGRATION_PRESETS) {
      const server = connectedServers.find((candidate) => {
        const serverUrl = 'url' in candidate.config ? candidate.config.url : '';
        const serverName = candidate.config?.title || candidate.serverName;
        return (
          serverUrl === preset.defaultServerConfig.url ||
          serverName.toLowerCase() === preset.name.toLowerCase() ||
          candidate.serverName.toLowerCase().includes(preset.id.replace('_', ''))
        );
      });
      if (server) {
        servers.set(preset.id, server);
      }
    }
    return servers;
  }, [connectedServers]);

  const connectedPresetIds = useMemo(
    () =>
      new Set(
        [...presetServers].flatMap(([presetId, server]) =>
          connectionStatus?.[server.serverName]?.connectionState === 'connected' ? [presetId] : [],
        ),
      ),
    [connectionStatus, presetServers],
  );

  /**
   * Handle Connect — creates an MCP server with the preset's configuration.
   * Nashm's built-in OAuth engine handles the rest (auto-discovery, token exchange, etc.)
   */
  const connectIntegration = useCallback(
    async (preset: IntegrationPreset, credentials: Record<string, string> = {}) => {
      setConnectingIds((prev) => new Set(prev).add(preset.id));
      const oauthWindow = preset.authType === 'oauth' ? window.open('about:blank', '_blank') : null;

      if (oauthWindow) {
        oauthWindow.opener = null;
      }

      try {
        const config: Record<string, unknown> = {
          type: preset.defaultServerConfig.type,
          url: preset.defaultServerConfig.url,
          title: preset.defaultServerConfig.name,
          description: preset.description,
        };

        // Add OAuth config for services that need manual endpoint specification
        if (preset.defaultServerConfig.oauth) {
          config.oauth = {
            ...preset.defaultServerConfig.oauth,
            ...(credentials.client_id && { client_id: credentials.client_id }),
            ...(credentials.client_secret && { client_secret: credentials.client_secret }),
          };
        }

        const existingServer = presetServers.get(preset.id);
        if (existingServer) {
          if (existingServer.dbId) {
            await updateMutation.mutateAsync({
              serverName: existingServer.serverName,
              data: { config },
            });
          }
          await onInitializeServer(existingServer.serverName, oauthWindow);
          return;
        }

        const server = await createMutation.mutateAsync({ config });
        await onInitializeServer(server.serverName, oauthWindow);
      } catch (error: unknown) {
        oauthWindow?.close();
        let errorMessage = `Failed to connect ${preset.name}`;
        if (error && typeof error === 'object' && 'response' in error) {
          const axiosError = error as { response?: { data?: { error?: string } } };
          if (axiosError.response?.data?.error) {
            errorMessage = axiosError.response.data.error;
          }
        }

        showToast({
          message: errorMessage,
          status: 'error',
        });
      } finally {
        setConnectingIds((prev) => {
          const next = new Set(prev);
          next.delete(preset.id);
          return next;
        });
      }
    },
    [createMutation, onInitializeServer, presetServers, showToast, updateMutation],
  );

  const handleConnect = useCallback(
    (preset: IntegrationPreset) => {
      if (preset.credentials) {
        setCredentialPreset(preset);
        return;
      }
      void connectIntegration(preset);
    },
    [connectIntegration],
  );

  const handleCredentialsSubmit = useCallback(
    (credentials: Record<string, string>) => {
      if (!credentialPreset) {
        return;
      }
      const preset = credentialPreset;
      setCredentialPreset(null);
      void connectIntegration(preset, credentials);
    },
    [connectIntegration, credentialPreset],
  );

  /**
   * Handle Disconnect — finds and deletes the MCP server matching the preset.
   */
  const handleDisconnect = useCallback(
    async (preset: IntegrationPreset) => {
      const matchingServer = presetServers.get(preset.id);

      if (!matchingServer) return;

      setConnectingIds((prev) => new Set(prev).add(preset.id));

      try {
        await deleteMutation.mutateAsync(matchingServer.serverName);

        showToast({
          message: `${preset.name} disconnected`,
          status: 'success',
        });
      } catch {
        showToast({
          message: `Failed to disconnect ${preset.name}`,
          status: 'error',
        });
      } finally {
        setConnectingIds((prev) => {
          const next = new Set(prev);
          next.delete(preset.id);
          return next;
        });
      }
    },
    [deleteMutation, presetServers, showToast],
  );

  const visiblePresets = isExpanded
    ? INTEGRATION_PRESETS
    : INTEGRATION_PRESETS.slice(0, INITIAL_VISIBLE_COUNT);

  const hasMore = INTEGRATION_PRESETS.length > INITIAL_VISIBLE_COUNT;
  const hiddenCount = INTEGRATION_PRESETS.length - INITIAL_VISIBLE_COUNT;
  const connectedCount = connectedPresetIds.size;

  const t = localize as (key: string) => string;

  return (
    <div className="space-y-2">
      {/* Section Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <Sparkles className="size-3.5 text-text-secondary" aria-hidden="true" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            {t('com_ui_quick_connect') || 'Quick Connect'}
          </h3>
          {connectedCount > 0 && (
            <span className="inline-flex items-center justify-center rounded-full bg-green-100 px-1.5 py-0.5 text-[10px] font-medium text-green-700 dark:bg-green-900/40 dark:text-green-400">
              {connectedCount}
            </span>
          )}
        </div>
      </div>

      {/* Cards Grid */}
      <div className="grid grid-cols-2 gap-2">
        {visiblePresets.map((preset) => (
          <IntegrationCard
            key={preset.id}
            preset={preset}
            isConnected={connectedPresetIds.has(preset.id)}
            isConnecting={
              connectingIds.has(preset.id) ||
              connectionStatus?.[presetServers.get(preset.id)?.serverName ?? '']
                ?.connectionState === 'connecting'
            }
            onConnect={handleConnect}
            onDisconnect={handleDisconnect}
          />
        ))}
      </div>

      {/* Show More / Less */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex w-full items-center justify-center gap-1 rounded-lg py-1.5 text-xs font-medium text-text-secondary transition-colors hover:bg-surface-hover hover:text-text-primary"
          aria-expanded={isExpanded}
        >
          {isExpanded ? (
            <>
              {localize('com_ui_show_less') || 'Show Less'}
              <ChevronUp className="size-3.5" />
            </>
          ) : (
            <>
              {localize('com_ui_show_more') || `Show ${hiddenCount} More`}
              <ChevronDown className="size-3.5" />
            </>
          )}
        </button>
      )}
      <CredentialsDialog
        preset={credentialPreset}
        isSubmitting={credentialPreset ? connectingIds.has(credentialPreset.id) : false}
        onOpenChange={(open) => !open && setCredentialPreset(null)}
        onSubmit={handleCredentialsSubmit}
      />
    </div>
  );
}
