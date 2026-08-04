import React, { useMemo, useState } from 'react';
import {
  Button,
  OGDialog,
  OGDialogClose,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  TooltipAnchor,
} from '@nashm/client';
import { getConfigDefaults, QueryKeys } from 'nashm-data-provider';
import { ShieldCheck } from 'lucide-react';
import { useQueryClient } from '@tanstack/react-query';
import type { ModelSelectorProps } from '~/common';
import {
  renderModelSpecs,
  renderEndpoints,
  renderSearchResults,
  renderCustomGroups,
} from './components';
import { ModelSelectorProvider, useModelSelectorContext } from './ModelSelectorContext';
import { ModelSelectorChatProvider } from './ModelSelectorChatContext';
import { getSelectedIcon, getDisplayValue } from './utils';
import { CustomMenu as Menu } from './CustomMenu';
import DialogManager from './DialogManager';
import { useLocalize } from '~/hooks';
import { useGetUserBalance } from '~/data-provider';
import { UpgradeModal } from '~/components/Nav/UpgradeModal';

const defaultInterface = getConfigDefaults().interface;

function ModelSelectorContent() {
  const localize = useLocalize();
  const queryClient = useQueryClient();
  const [showPlans, setShowPlans] = useState(false);
  const balanceQuery = useGetUserBalance();

  const {
    // Nashm
    agentsMap,
    modelSpecs,
    mappedEndpoints,
    endpointsConfig,
    // State
    searchValue,
    searchResults,
    selectedValues,
    // Functions
    setSearchValue,
    setSelectedValues,
    // Dialog
    keyDialogOpen,
    onOpenChange,
    keyDialogEndpoint,
    subscriptionRequirement,
    dismissSubscriptionRequirement,
  } = useModelSelectorContext();
  const requiredPlanNames = subscriptionRequirement?.requiredPlans
    .map((plan) => localize(`com_subscription_plan_${plan}` as any))
    .join(', ');
  const currentPlan = balanceQuery.data?.plan ?? 'free';

  const handleUpgradeSuccess = () => {
    queryClient.invalidateQueries([QueryKeys.balance]);
    queryClient.invalidateQueries([QueryKeys.models]);
    queryClient.invalidateQueries([QueryKeys.modelCatalog]);
    dismissSubscriptionRequirement();
  };

  const selectedIcon = useMemo(
    () =>
      getSelectedIcon({
        mappedEndpoints: mappedEndpoints ?? [],
        selectedValues,
        modelSpecs,
        endpointsConfig,
      }),
    [mappedEndpoints, selectedValues, modelSpecs, endpointsConfig],
  );
  const selectedDisplayValue = useMemo(
    () =>
      getDisplayValue({
        localize,
        agentsMap,
        modelSpecs,
        selectedValues,
        mappedEndpoints,
      }),
    [localize, agentsMap, modelSpecs, selectedValues, mappedEndpoints],
  );

  const trigger = (
    <TooltipAnchor
      aria-label={localize('com_ui_select_model')}
      description={localize('com_ui_select_model')}
      render={
        <button
          className="my-1 flex h-9 w-full max-w-[70vw] items-center justify-center gap-2 rounded-xl border border-border-light bg-presentation px-3 py-2 text-sm text-text-primary hover:bg-surface-active-alt"
          aria-label={localize('com_ui_select_model')}
        >
          {selectedIcon && React.isValidElement(selectedIcon) && (
            <div className="flex flex-shrink-0 items-center justify-center overflow-hidden">
              {selectedIcon}
            </div>
          )}
          <span className="flex-grow truncate text-left">{selectedDisplayValue}</span>
        </button>
      }
    />
  );

  return (
    <div className="relative flex w-full max-w-md flex-col items-center gap-2">
      <Menu
        values={selectedValues}
        onValuesChange={(values: Record<string, any>) => {
          setSelectedValues({
            endpoint: values.endpoint || '',
            model: values.model || '',
            modelSpec: values.modelSpec || '',
          });
        }}
        onSearch={(value) => setSearchValue(value)}
        combobox={<input id="model-search" placeholder=" " />}
        comboboxLabel={localize('com_endpoint_search_models')}
        trigger={trigger}
      >
        {searchResults ? (
          renderSearchResults(searchResults, localize, searchValue)
        ) : (
          <>
            {/* Render ungrouped modelSpecs (no group field) */}
            {renderModelSpecs(
              modelSpecs?.filter((spec) => !spec.group) || [],
              selectedValues.modelSpec || '',
            )}
            {/* Render endpoints (will include grouped specs matching endpoint names) */}
            {renderEndpoints(mappedEndpoints ?? [])}
            {/* Render custom groups (specs with group field not matching any endpoint) */}
            {renderCustomGroups(modelSpecs || [], mappedEndpoints ?? [])}
          </>
        )}
      </Menu>
      <DialogManager
        keyDialogOpen={keyDialogOpen}
        onOpenChange={onOpenChange}
        endpointsConfig={endpointsConfig || {}}
        keyDialogEndpoint={keyDialogEndpoint || undefined}
      />
      <OGDialog
        open={subscriptionRequirement != null}
        onOpenChange={(open) => !open && dismissSubscriptionRequirement()}
      >
        <OGDialogContent className="w-11/12 max-w-md border-border-light bg-surface-primary p-6 text-text-primary">
          <OGDialogHeader>
            <OGDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="size-5 text-primary" />
              {subscriptionRequirement?.unavailable
                ? localize('com_model_unavailable_title' as any)
                : localize('com_subscription_required_title' as any)}
            </OGDialogTitle>
          </OGDialogHeader>
          <p className="mt-4 text-sm leading-6 text-text-secondary">
            {subscriptionRequirement?.unavailable
              ? localize('com_model_unavailable_body' as any, {
                  0: subscriptionRequirement.model,
                })
              : localize('com_subscription_required_body' as any, {
                  0: subscriptionRequirement?.model ?? '',
                  1: requiredPlanNames ?? '',
                })}
          </p>
          <div className="mt-6 flex justify-end gap-3 border-t border-border-light pt-4">
            <OGDialogClose asChild>
              <Button type="button" variant="outline">
                {localize('com_ui_cancel')}
              </Button>
            </OGDialogClose>
            {!subscriptionRequirement?.unavailable && (
              <Button
                type="button"
                variant="submit"
                onClick={() => {
                  dismissSubscriptionRequirement();
                  setShowPlans(true);
                }}
              >
                {localize('com_subscription_view_plans' as any)}
              </Button>
            )}
          </div>
        </OGDialogContent>
      </OGDialog>
      <UpgradeModal
        currentPlan={currentPlan}
        onOpenChange={setShowPlans}
        onUpgradeSuccess={handleUpgradeSuccess}
        open={showPlans}
      />
    </div>
  );
}

export default function ModelSelector({ startupConfig }: ModelSelectorProps) {
  const interfaceConfig = startupConfig?.interface ?? defaultInterface;
  const modelSpecs = startupConfig?.modelSpecs?.list ?? [];

  // Hide the selector when modelSelect is false and there are no model specs to show
  if (interfaceConfig.modelSelect === false && modelSpecs.length === 0) {
    return null;
  }

  return (
    <ModelSelectorChatProvider>
      <ModelSelectorProvider startupConfig={startupConfig}>
        <ModelSelectorContent />
      </ModelSelectorProvider>
    </ModelSelectorChatProvider>
  );
}
