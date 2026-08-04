import React from 'react';
import type { ModelCatalogItem, TStartupConfig } from 'nashm-data-provider';

export interface Endpoint {
  value: string;
  label: string;
  hasModels: boolean;
  models?: Array<{
    name: string;
    label?: string;
    isGlobal?: boolean;
    available?: boolean;
    requiredPlans?: ModelCatalogItem['requiredPlans'];
    capabilities?: ModelCatalogItem['capabilities'];
  }>;
  icon: React.ReactNode;
  agentNames?: Record<string, string>;
  assistantNames?: Record<string, string>;
  modelIcons?: Record<string, string | undefined>;
  showMarketplace?: boolean;
  searchAliases?: string[];
}

export interface SelectedValues {
  endpoint: string | null;
  model: string | null;
  modelSpec: string | null;
}

export interface ModelSelectorProps {
  startupConfig: TStartupConfig | undefined;
}
