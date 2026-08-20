import type { ParsedServerConfig } from './types';

export function filterDisabledMCPServers(
  servers: Record<string, ParsedServerConfig>,
  disabledServerNames?: readonly string[],
): Record<string, ParsedServerConfig> {
  if (!disabledServerNames?.length) {
    return servers;
  }

  const disabled = new Set(disabledServerNames);
  return Object.fromEntries(Object.entries(servers).filter(([serverName]) => !disabled.has(serverName)));
}
