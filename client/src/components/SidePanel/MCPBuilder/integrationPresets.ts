/**
 * Integration Presets — Pre-configured MCP server definitions for popular services.
 *
 * Each preset contains all the information needed to create an MCP server connection
 * with a single click. The user just presses "Connect" and the system handles:
 * - Creating the MCP server entry
 * - Initiating the OAuth flow (if applicable)
 * - Storing tokens securely per-user
 *
 * Auth types:
 * - 'oauth': Uses OAuth 2.0/2.1 flow. The MCP server itself handles OAuth discovery
 *   (RFC 9728) so we just need the URL and Nashm's built-in OAuth engine does the rest.
 * - 'api_key': User provides their own API key via the customUserVars mechanism.
 */

export type IntegrationCategory =
  | 'productivity'
  | 'development'
  | 'communication'
  | 'search'
  | 'storage';

export interface IntegrationPreset {
  /** Unique identifier: 'notion', 'github', etc. */
  id: string;
  /** Display name shown on card */
  name: string;
  /** Short description shown on card */
  description: string;
  /** Category for filtering */
  category: IntegrationCategory;
  /** Authentication method */
  authType: 'oauth' | 'api_key';

  /** Values requested before a connection can be created. */
  credentials?: {
    fields: Array<{
      id: string;
      labelKey: string;
      descriptionKey?: string;
      sensitive?: boolean;
    }>;
  };

  /** OAuth scopes — read+write by default for full integration */
  oauthScopes?: {
    read: string[];
    write: string[];
  };

  /** OAuth configuration details */
  oauthConfig?: {
    /** 'auto_discovery' means Nashm detects OAuth endpoints via RFC 9728 */
    type: 'auto_discovery' | 'manual';
    authorizationUrl?: string;
    tokenUrl?: string;
    revokeUrl?: string;
  };

  /** Default MCP server configuration — pre-filled when user clicks Connect */
  defaultServerConfig: {
    /** Server name (used as unique key in Nashm) */
    name: string;
    /** MCP server URL */
    url: string;
    /** Transport type */
    type: 'streamable-http' | 'sse';
    /** Whether OAuth is required */
    requiresOAuth: boolean;
    /** Pre-configured OAuth settings (only for manual OAuth) */
    oauth?: {
      client_id?: string;
      client_secret?: string;
      authorization_url?: string;
      token_url?: string;
      scope?: string;
    };
  };

  /** Whether the service supports remote token revocation */
  supportsRemoteRevoke: boolean;

  /** Color theme for the card gradient accent */
  accentColor: string;
  /** Dark mode accent color */
  accentColorDark: string;
}

// ─────────────────────────────────────────────────────────────────────────────
// Integration Presets Registry
// ─────────────────────────────────────────────────────────────────────────────

export const INTEGRATION_PRESETS: IntegrationPreset[] = [
  // ── Notion ──────────────────────────────────────────────────────────────
  {
    id: 'notion',
    name: 'Notion',
    description: 'Search, read, and edit your Notion workspace',
    category: 'productivity',
    authType: 'oauth',
    oauthScopes: {
      read: ['read_content', 'read_user_without_email'],
      write: ['read_content', 'update_content', 'insert_content', 'read_user_without_email'],
    },
    oauthConfig: {
      type: 'auto_discovery',
    },
    defaultServerConfig: {
      name: 'Notion',
      url: 'https://mcp.notion.com/mcp',
      type: 'streamable-http',
      requiresOAuth: true,
    },
    supportsRemoteRevoke: true,
    accentColor: '#000000',
    accentColorDark: '#FFFFFF',
  },

  // ── GitHub ──────────────────────────────────────────────────────────────
  {
    id: 'github',
    name: 'GitHub',
    description: 'Manage repos, issues, PRs, and code search',
    category: 'development',
    authType: 'oauth',
    oauthScopes: {
      read: ['repo:read', 'user:read'],
      write: ['repo', 'user', 'workflow', 'read:org'],
    },
    oauthConfig: {
      type: 'auto_discovery',
    },
    defaultServerConfig: {
      name: 'GitHub',
      url: 'https://api.githubcopilot.com/mcp/',
      type: 'streamable-http',
      requiresOAuth: true,
    },
    supportsRemoteRevoke: true,
    accentColor: '#24292e',
    accentColorDark: '#f0f6fc',
  },

  // ── Google Drive ────────────────────────────────────────────────────────
  {
    id: 'google_drive',
    name: 'Google Drive',
    description: 'Access, search, and manage your Drive files',
    category: 'storage',
    authType: 'oauth',
    oauthScopes: {
      read: ['https://www.googleapis.com/auth/drive'],
      write: ['https://www.googleapis.com/auth/drive'],
    },
    oauthConfig: {
      type: 'manual',
      authorizationUrl: 'https://accounts.google.com/o/oauth2/v2/auth',
      tokenUrl: 'https://oauth2.googleapis.com/token',
      revokeUrl: 'https://oauth2.googleapis.com/revoke',
    },
    defaultServerConfig: {
      name: 'Google Drive',
      url: 'https://drivemcp.googleapis.com/mcp/v1',
      type: 'streamable-http',
      requiresOAuth: true,
      oauth: {
        authorization_url: 'https://accounts.google.com/o/oauth2/v2/auth',
        token_url: 'https://oauth2.googleapis.com/token',
        scope: 'https://www.googleapis.com/auth/drive',
      },
    },
    supportsRemoteRevoke: true,
    accentColor: '#4285F4',
    accentColorDark: '#8AB4F8',
  },

  // ── Slack ───────────────────────────────────────────────────────────────
  {
    id: 'slack',
    name: 'Slack',
    description: 'Read messages, send updates, and manage channels',
    category: 'communication',
    authType: 'oauth',
    credentials: {
      fields: [
        {
          id: 'client_id',
          labelKey: 'com_ui_mcp_oauth_client_id',
          sensitive: false,
        },
        {
          id: 'client_secret',
          labelKey: 'com_ui_mcp_oauth_client_secret',
          descriptionKey: 'com_ui_mcp_slack_credentials_help',
        },
      ],
    },
    oauthScopes: {
      read: ['channels:read', 'channels:history', 'users:read'],
      write: ['channels:read', 'channels:history', 'chat:write', 'users:read'],
    },
    oauthConfig: {
      type: 'manual',
      authorizationUrl: 'https://slack.com/oauth/v2_user/authorize',
      tokenUrl: 'https://slack.com/api/oauth.v2.user.access',
    },
    defaultServerConfig: {
      name: 'Slack',
      url: 'https://mcp.slack.com/mcp',
      type: 'streamable-http',
      requiresOAuth: true,
      oauth: {
        authorization_url: 'https://slack.com/oauth/v2_user/authorize',
        token_url: 'https://slack.com/api/oauth.v2.user.access',
        scope:
          'channels:read channels:history chat:write users:read search:read.public search:read.private search:read.mpim search:read.im',
      },
    },
    supportsRemoteRevoke: true,
    accentColor: '#4A154B',
    accentColorDark: '#E01E5A',
  },

  // ── Linear ─────────────────────────────────────────────────────────────
  {
    id: 'linear',
    name: 'Linear',
    description: 'Manage issues, projects, and development cycles',
    category: 'development',
    authType: 'oauth',
    oauthScopes: {
      read: ['read'],
      write: ['read', 'write', 'issues:create', 'comments:create'],
    },
    oauthConfig: {
      type: 'auto_discovery',
    },
    defaultServerConfig: {
      name: 'Linear',
      url: 'https://mcp.linear.app/mcp',
      type: 'streamable-http',
      requiresOAuth: true,
    },
    supportsRemoteRevoke: true,
    accentColor: '#5E6AD2',
    accentColorDark: '#8B93E6',
  },
];

/**
 * Lookup a preset by its id.
 */
export function getPresetById(id: string): IntegrationPreset | undefined {
  return INTEGRATION_PRESETS.find((p) => p.id === id);
}

/**
 * Get presets filtered by category.
 */
export function getPresetsByCategory(category: IntegrationCategory): IntegrationPreset[] {
  return INTEGRATION_PRESETS.filter((p) => p.category === category);
}

/**
 * Get all unique categories present in the presets.
 */
export function getAvailableCategories(): IntegrationCategory[] {
  return [...new Set(INTEGRATION_PRESETS.map((p) => p.category))];
}
