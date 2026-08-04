import { useState } from 'react';
import type { ModelCapability } from 'nashm-data-provider';
import { useGetAdminConsoleModelsQuery, useUpdateAdminConsoleModelMutation } from '~/data-provider';
import {
  Sliders,
  CheckCircle,
  XCircle,
  Edit,
  Cpu,
  Badge,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
  Button,
  Spinner,
  Input,
  useToastContext,
} from '@nashm/client';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import type { TranslationKeys } from '~/hooks';

const modelCapabilityOptions: Array<{ value: ModelCapability; labelKey: TranslationKeys }> = [
  { value: 'vision', labelKey: 'com_admin_model_capability_vision' },
  { value: 'file_upload', labelKey: 'com_admin_model_capability_file_upload' },
  { value: 'web_search', labelKey: 'com_admin_model_capability_web_search' },
  { value: 'code_execution', labelKey: 'com_admin_model_capability_code_execution' },
  { value: 'artifacts', labelKey: 'com_admin_model_capability_artifacts' },
  { value: 'image_generation', labelKey: 'com_admin_model_capability_image_generation' },
  { value: 'tools', labelKey: 'com_admin_model_capability_tools' },
];

export default function AdminConsoleModels() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const { data, isLoading, error, refetch } = useGetAdminConsoleModelsQuery();

  // Model editor state
  const [editingModel, setEditingModel] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [sortOrder, setSortOrder] = useState('0');
  const [enabled, setEnabled] = useState(true);
  const [showInChat, setShowInChat] = useState(true);
  const [isDefault, setIsDefault] = useState(false);
  const [capabilities, setCapabilities] = useState<ModelCapability[]>([]);
  const [allowedPlans, setAllowedPlans] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

  // Accordion state for endpoints/providers
  const [expandedEndpoints, setExpandedEndpoints] = useState<Record<string, boolean>>({});

  const toggleEndpoint = (endpoint: string) => {
    setExpandedEndpoints((prev) => ({
      ...prev,
      [endpoint]: !prev[endpoint],
    }));
  };

  const getProviderName = (endpoint: string) => {
    const normalized = endpoint.toLowerCase();
    if (normalized === 'openai') return 'OpenAI';
    if (normalized === 'google') return 'Google Gemini';
    if (normalized === 'anthropic') return 'Anthropic';
    if (normalized === 'azureopenai') return 'Azure OpenAI';
    if (normalized === 'bedrock') return 'AWS Bedrock';
    return endpoint.charAt(0).toUpperCase() + endpoint.slice(1);
  };

  const updateModelMutation = useUpdateAdminConsoleModelMutation({
    onSuccess: () => {
      showToast({
        message: 'Model access configuration saved!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      setEditingModel(null);
      refetch();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to save configuration.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const handleEditClick = (model: any) => {
    setEditingModel(model);
    setLabel(model.label || '');
    setSortOrder(String(model.sortOrder ?? 0));
    setEnabled(model.enabled);
    setShowInChat(model.showInChat !== false);
    setIsDefault(model.isDefault === true);
    setCapabilities(model.capabilities ?? []);
    setAllowedPlans(model.allowedPlans || []);
    setNotes(model.notes || '');
  };

  const handlePlanToggle = (plan: string) => {
    setAllowedPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan],
    );
  };

  const handleCapabilityToggle = (capability: ModelCapability) => {
    setCapabilities((previous) =>
      previous.includes(capability)
        ? previous.filter((item) => item !== capability)
        : [...previous, capability],
    );
  };

  const handleToggleProvider = (endpoint: string, shouldEnable: boolean) => {
    updateModelMutation.mutate({
      endpoint,
      model: '*',
      enabled: shouldEnable,
    });
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;
    const parsedSortOrder = Number(sortOrder);
    if (!Number.isInteger(parsedSortOrder) || parsedSortOrder < 0) {
      showToast({
        message: 'Display order must be a whole number equal to or greater than zero.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
      return;
    }

    updateModelMutation.mutate({
      endpoint: editingModel.endpoint,
      model: editingModel.model,
      label: label.trim() || null,
      sortOrder: parsedSortOrder,
      enabled,
      showInChat,
      isDefault,
      capabilities,
      allowedPlans,
      notes: notes.trim() || null,
    });
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-500">
        Failed to load models configuration. Please check connection and try again.
      </div>
    );
  }

  const { models = [], providers = {} } = data || {};

  // Group models by endpoint/provider
  const groupedModels = models.reduce(
    (acc: Record<string, any[]>, item: any) => {
      const endpoint = item.endpoint || 'other';
      if (!acc[endpoint]) {
        acc[endpoint] = [];
      }
      acc[endpoint].push(item);
      return acc;
    },
    {} as Record<string, any[]>,
  );

  const planOptions = ['free', 'individual', 'family', 'developer'];

  return (
    <div className="flex flex-col gap-6">
      {/* Grouped Models Accordion */}
      <div className="flex flex-col gap-4">
        {(Object.entries(groupedModels) as [string, any[]][]).map(([endpoint, items]) => {
          const isExpanded = !!expandedEndpoints[endpoint];
          const enabledCount = items.filter((item: any) => item.enabled !== false).length;
          const totalCount = items.length;
          const providerName = getProviderName(endpoint);
          const isProviderEnabled = providers[endpoint]?.enabled !== false;

          return (
            <div
              key={endpoint}
              className={`overflow-hidden rounded-2xl border bg-surface-primary shadow-sm transition-all duration-200 ${
                isProviderEnabled
                  ? 'border-border-light'
                  : 'border-red-500/20 bg-red-500/[0.01] opacity-70'
              }`}
            >
              <button
                onClick={() => toggleEndpoint(endpoint)}
                className="hover:bg-surface-secondary/30 flex w-full items-center justify-between p-5 text-left transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div
                    className={`rounded-xl border p-2.5 ${isProviderEnabled ? 'border-blue-500/20 bg-blue-500/10 text-blue-500' : 'border-red-500/20 bg-red-500/10 text-red-500'}`}
                  >
                    <Cpu className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="text-base font-bold text-text-primary">{providerName}</span>
                    <span className="mt-0.5 text-xs text-text-secondary">
                      {totalCount} {totalCount === 1 ? 'Model' : 'Models'} available •{' '}
                      {enabledCount} {enabledCount === 1 ? 'enabled' : 'enabled'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleToggleProvider(endpoint, !isProviderEnabled);
                    }}
                    className={`flex items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-semibold transition-colors ${
                      isProviderEnabled
                        ? 'border-red-500/20 text-red-500 hover:border-red-500/30 hover:bg-red-500/10'
                        : 'border-green-500/20 text-green-500 hover:border-green-500/30 hover:bg-green-500/10'
                    }`}
                  >
                    {isProviderEnabled ? 'Hide Provider' : 'Show Provider'}
                  </button>
                  <span
                    className={`rounded-full border px-2.5 py-1 text-xs font-semibold ${
                      !isProviderEnabled
                        ? 'border-red-500/20 bg-red-500/10 text-red-500'
                        : enabledCount === totalCount
                          ? 'border-green-500/20 bg-green-500/10 text-green-500'
                          : enabledCount === 0
                            ? 'border-red-500/20 bg-red-500/10 text-red-500'
                            : 'border-yellow-500/20 bg-yellow-500/10 text-yellow-500'
                    }`}
                  >
                    {!isProviderEnabled
                      ? 'Hidden for Users'
                      : `${enabledCount}/${totalCount} Enabled`}
                  </span>
                  {isExpanded ? (
                    <ChevronUp className="size-5 text-text-secondary" />
                  ) : (
                    <ChevronDown className="size-5 text-text-secondary" />
                  )}
                </div>
              </button>

              {isExpanded && (
                <div className="bg-surface-secondary/20 border-t border-border-light p-5">
                  <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                    {items.map((item: any, idx: number) => {
                      const isEnabled = item.enabled !== false;
                      return (
                        <div
                          key={idx}
                          className={`flex flex-col gap-4 rounded-2xl border bg-surface-primary p-6 shadow-sm transition-all duration-200 ${
                            isEnabled
                              ? 'border-border-light'
                              : 'border-red-500/20 bg-red-500/[0.01] opacity-70'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex items-start gap-3">
                              <div
                                className={`rounded-xl border p-2.5 ${
                                  isEnabled
                                    ? 'border-blue-500/20 bg-blue-500/10 text-blue-500'
                                    : 'border-red-500/20 bg-red-500/10 text-red-500'
                                }`}
                              >
                                <Cpu className="size-5" />
                              </div>
                              <div className="flex flex-col">
                                <span className="text-sm font-bold text-text-primary">
                                  {item.label || item.model}
                                </span>
                                <span className="font-mono text-xs text-text-secondary">
                                  {item.model}
                                </span>
                                <span className="mt-0.5 text-[10px] font-semibold uppercase tracking-wider text-blue-500">
                                  {item.endpoint}
                                </span>
                              </div>
                            </div>
                            <div className="flex flex-shrink-0 items-center gap-2">
                              {item.isDefault === true && (
                                <span className="flex items-center gap-1 rounded-full border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-xs font-semibold text-blue-500">
                                  <Badge className="size-3.5" />
                                  {localize('com_admin_model_default')}
                                </span>
                              )}
                              {isEnabled ? (
                                <span className="flex items-center gap-1 rounded-full border border-green-500/20 bg-green-500/10 px-2 py-0.5 text-xs font-semibold text-green-500">
                                  <CheckCircle className="size-3.5" /> Enabled
                                </span>
                              ) : (
                                <span className="flex items-center gap-1 rounded-full border border-red-500/20 bg-red-500/10 px-2 py-0.5 text-xs font-semibold text-red-500">
                                  <XCircle className="size-3.5" /> Disabled
                                </span>
                              )}
                            </div>
                          </div>

                          {/* Stats & Metadata */}
                          <div className="bg-surface-secondary/50 grid grid-cols-2 gap-4 rounded-xl border border-border-light p-4 text-xs">
                            <div className="flex flex-col">
                              <span className="text-text-secondary">Requests</span>
                              <span className="mt-0.5 font-mono font-semibold text-text-primary">
                                {item.requests?.toLocaleString() || 0}
                              </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="text-text-secondary">Tokens Consumed</span>
                              <span className="mt-0.5 font-mono font-semibold text-text-primary">
                                {item.totalTokens?.toLocaleString() || 0}
                              </span>
                            </div>
                          </div>

                          {/* Allowed Tiers */}
                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Allowed Subscription Tiers:
                            </span>
                            <div className="flex flex-wrap gap-1.5">
                              {item.allowedPlans?.map((plan: string, pIdx: number) => (
                                <span
                                  key={pIdx}
                                  className="rounded border border-purple-500/20 bg-purple-500/10 px-2 py-0.5 text-[10px] font-semibold uppercase text-purple-500"
                                >
                                  {plan}
                                </span>
                              ))}
                              {(!item.allowedPlans || item.allowedPlans.length === 0) && (
                                <span className="text-[10px] italic text-text-secondary">
                                  No plans allowed
                                </span>
                              )}
                            </div>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              Display Order
                            </span>
                            <span className="text-xs font-medium text-text-primary">
                              {item.sortOrder ?? 0}
                            </span>
                          </div>

                          <div className="flex flex-col gap-1.5">
                            <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                              {localize('com_admin_model_selector_visibility')}
                            </span>
                            <span className="text-xs font-medium text-text-primary">
                              {item.showInChat !== false
                                ? localize('com_admin_model_visible_in_chat')
                                : localize('com_admin_model_agent_builder_only')}
                            </span>
                          </div>

                          {item.capabilities?.length > 0 && (
                            <div className="flex flex-col gap-1.5">
                              <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
                                {localize('com_admin_model_capabilities')}
                              </span>
                              <div className="flex flex-wrap gap-1.5">
                                {item.capabilities.map((capability: ModelCapability) => (
                                  <span
                                    key={capability}
                                    className="rounded border border-blue-500/20 bg-blue-500/10 px-2 py-0.5 text-[10px] font-semibold text-blue-500"
                                  >
                                    {localize(
                                      `com_admin_model_capability_${capability}` as TranslationKeys,
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {item.notes && (
                            <p className="bg-surface-secondary/30 border-border-light/50 rounded-lg border p-2.5 text-xs italic text-text-secondary">
                              Notes: {item.notes}
                            </p>
                          )}

                          {/* Action Button */}
                          <div className="flex justify-end border-t border-border-light pt-2">
                            <button
                              onClick={() => handleEditClick(item)}
                              className="flex items-center gap-1.5 rounded-lg border border-border-light px-3 py-1.5 text-xs font-semibold text-text-secondary transition-all duration-150 hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-500"
                            >
                              <Edit className="size-3.5" />
                              Configure Access
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Model Access Editor Modal */}
      {editingModel && (
        <OGDialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
          <OGDialogContent className="w-11/12 max-w-lg border-border-light bg-surface-primary p-6 text-text-primary">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2">
                <Sliders className="size-5 text-blue-500" />
                Configure Access: {editingModel.model}
              </OGDialogTitle>
            </OGDialogHeader>
            <form onSubmit={handleSaveModel} className="mt-4 flex flex-col gap-4">
              {/* Friendly Label */}
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_9rem]">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase text-text-secondary">
                    Display Label
                  </label>
                  <Input
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder={editingModel.model}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none"
                    disabled={updateModelMutation.isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase text-text-secondary">
                    Display Order
                  </label>
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none"
                    disabled={updateModelMutation.isLoading}
                  />
                </div>
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between border-y border-border-light py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Enable Model Access</span>
                  <span className="text-xs text-text-secondary">
                    Turn off to completely disable this model for all users.
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => {
                    setEnabled(e.target.checked);
                    if (!e.target.checked) {
                      setIsDefault(false);
                    }
                  }}
                  className="size-5 cursor-pointer rounded border-border-light text-blue-600 focus:ring-blue-500"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              <div className="flex items-center justify-between border-b border-border-light pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    {localize('com_admin_model_show_in_chat')}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {localize('com_admin_model_show_in_chat_help')}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={showInChat}
                  onChange={(event) => {
                    setShowInChat(event.target.checked);
                    if (!event.target.checked) {
                      setIsDefault(false);
                    }
                  }}
                  className="size-5 cursor-pointer rounded border-border-light text-blue-600 focus:ring-blue-500"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              <div className="flex items-center justify-between border-b border-border-light pb-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">
                    {localize('com_admin_model_default')}
                  </span>
                  <span className="text-xs text-text-secondary">
                    {localize('com_admin_model_default_help')}
                  </span>
                </div>
                <input
                  type="checkbox"
                  checked={isDefault}
                  onChange={(event) => {
                    const nextIsDefault = event.target.checked;
                    setIsDefault(nextIsDefault);
                    if (nextIsDefault) {
                      setEnabled(true);
                      setShowInChat(true);
                    }
                  }}
                  className="size-5 cursor-pointer rounded border-border-light text-blue-600 focus:ring-blue-500"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              {/* Allowed Tiers Checklist */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-text-secondary">
                  Allowed Subscription Tiers
                </span>
                <div className="grid grid-cols-2 gap-3">
                  {planOptions.map((plan) => {
                    const isChecked = allowedPlans.includes(plan);
                    return (
                      <label
                        key={plan}
                        className={`flex cursor-pointer items-center justify-between rounded-xl border p-3 transition-all duration-150 ${
                          isChecked
                            ? 'border-purple-500/30 bg-purple-500/5 text-purple-500'
                            : 'hover:bg-surface-secondary/50 border-border-light bg-transparent text-text-primary'
                        }`}
                      >
                        <span className="text-sm font-medium capitalize">{plan}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handlePlanToggle(plan)}
                          className="sr-only"
                          disabled={updateModelMutation.isLoading}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold uppercase text-text-secondary">
                  {localize('com_admin_model_capabilities')}
                </span>
                <p className="text-xs text-text-secondary">
                  {localize('com_admin_model_capabilities_help')}
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {modelCapabilityOptions.map(({ value, labelKey }) => {
                    const isChecked = capabilities.includes(value);
                    return (
                      <label
                        key={value}
                        className={`flex cursor-pointer items-center justify-between rounded-lg border px-3 py-2 text-xs transition-all duration-150 ${
                          isChecked
                            ? 'border-blue-500/30 bg-blue-500/5 text-blue-500'
                            : 'hover:bg-surface-secondary/50 border-border-light bg-transparent text-text-primary'
                        }`}
                      >
                        <span className="font-medium">{localize(labelKey)}</span>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => handleCapabilityToggle(value)}
                          className="sr-only"
                          disabled={updateModelMutation.isLoading}
                        />
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Administrative Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-text-secondary">
                  Configuration Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes regarding pricing, providers, rate-limiting or target plans..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              <div className="flex justify-end gap-3 border-t border-border-light pt-4">
                <OGDialogClose asChild>
                  <Button type="button" variant="outline" disabled={updateModelMutation.isLoading}>
                    Cancel
                  </Button>
                </OGDialogClose>
                <Button type="submit" variant="submit" disabled={updateModelMutation.isLoading}>
                  {updateModelMutation.isLoading ? <Spinner /> : 'Save Configuration'}
                </Button>
              </div>
            </form>
          </OGDialogContent>
        </OGDialog>
      )}
    </div>
  );
}
