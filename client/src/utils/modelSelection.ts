import { LocalStorageKeys } from 'nashm-data-provider';
import type { ModelCatalogResponse } from 'nashm-data-provider';

export type ModelSelection = {
  endpoint: string;
  model: string;
};

function isModelSelection(
  value: { endpoint?: string | null; model?: string | null } | null | undefined,
): value is ModelSelection {
  return Boolean(value?.endpoint?.trim() && value.model?.trim());
}

function parseModelSelection(value: string | null): ModelSelection | undefined {
  if (!value) {
    return;
  }

  try {
    const selection = JSON.parse(value) as Partial<ModelSelection>;
    return isModelSelection(selection) ? selection : undefined;
  } catch {
    return;
  }
}

function isAvailableSelection(
  selection: ModelSelection,
  catalog: ModelCatalogResponse,
): boolean {
  return catalog.models[selection.endpoint]?.some(
    (item) => item.model === selection.model && item.available,
  ) === true;
}

function getUserSelectionKey(userId: string): string {
  return `${LocalStorageKeys.LAST_USER_MODEL_SELECTION}:${userId}`;
}

export function getUserModelSelection(userId?: string): ModelSelection | undefined {
  return userId ? parseModelSelection(localStorage.getItem(getUserSelectionKey(userId))) : undefined;
}

export function saveUserModelSelection(selection: ModelSelection, userId?: string): void {
  if (!userId) {
    return;
  }
  localStorage.setItem(getUserSelectionKey(userId), JSON.stringify(selection));
}

function getFirstAvailableModelSelection(
  catalog: ModelCatalogResponse,
  endpointOrder: string[],
): ModelSelection | undefined {
  const orderedEndpoints = [
    ...endpointOrder.filter((endpoint) => catalog.models[endpoint] != null),
    ...Object.keys(catalog.models).filter((endpoint) => !endpointOrder.includes(endpoint)),
  ];

  for (const endpoint of orderedEndpoints) {
    const model = catalog.models[endpoint]?.find((item) => item.available);
    if (model) {
      return { endpoint, model: model.model };
    }
  }
}

export function getPreferredModelSelection(
  catalog?: ModelCatalogResponse,
  endpointOrder: string[] = [],
  userId?: string,
): ModelSelection | undefined {
  const userSelection = getUserModelSelection(userId);
  if (userSelection && (!catalog || isAvailableSelection(userSelection, catalog))) {
    return userSelection;
  }

  if (!catalog) {
    return;
  }

  if (catalog.defaultModel && isAvailableSelection(catalog.defaultModel, catalog)) {
    return catalog.defaultModel;
  }

  return getFirstAvailableModelSelection(catalog, endpointOrder);
}
