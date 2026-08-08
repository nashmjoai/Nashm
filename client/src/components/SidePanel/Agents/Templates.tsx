import { useCallback, useMemo, useState } from 'react';
import {
  BriefcaseBusiness,
  Check,
  ChevronDown,
  Code2,
  FileBox,
  Globe2,
  PackageOpen,
  Search,
} from 'lucide-react';
import { Switch } from '@nashm/client';
import { AgentCapabilities, ArtifactModes } from 'nashm-data-provider';
import { useFormContext, useWatch } from 'react-hook-form';
import type { LucideIcon } from 'lucide-react';
import type { AgentForm } from '~/common';
import { businessAgentTemplates, getBusinessAgentDraft } from '~/constants/business/agents';
import type { BusinessAgentCapability } from '~/constants/business/agents';
import { useLocalize } from '~/hooks';
import useAgentCapabilities from '~/hooks/Agents/useAgentCapabilities';
import { useAgentPanelContext } from '~/Providers/AgentPanelContext';

type CapabilityDefinition = {
  Icon: LucideIcon;
  labelKey:
    | 'com_ui_web_search'
    | 'com_agents_enable_file_search'
    | 'com_ui_run_code'
    | 'com_ui_artifacts';
  descriptionKey:
    | 'com_agents_business_capability_web_search_description'
    | 'com_agents_business_capability_file_search_description'
    | 'com_agents_business_capability_execute_code_description'
    | 'com_agents_business_capability_artifacts_description';
};

const capabilityDefinitions: Record<BusinessAgentCapability, CapabilityDefinition> = {
  [AgentCapabilities.web_search]: {
    Icon: Globe2,
    labelKey: 'com_ui_web_search',
    descriptionKey: 'com_agents_business_capability_web_search_description',
  },
  [AgentCapabilities.file_search]: {
    Icon: FileBox,
    labelKey: 'com_agents_enable_file_search',
    descriptionKey: 'com_agents_business_capability_file_search_description',
  },
  [AgentCapabilities.execute_code]: {
    Icon: Code2,
    labelKey: 'com_ui_run_code',
    descriptionKey: 'com_agents_business_capability_execute_code_description',
  },
  [AgentCapabilities.artifacts]: {
    Icon: PackageOpen,
    labelKey: 'com_ui_artifacts',
    descriptionKey: 'com_agents_business_capability_artifacts_description',
  },
};

const businessCapabilities: BusinessAgentCapability[] = [
  AgentCapabilities.web_search,
  AgentCapabilities.file_search,
  AgentCapabilities.execute_code,
  AgentCapabilities.artifacts,
];

export default function Templates() {
  const localize = useLocalize();
  const { agentsConfig } = useAgentPanelContext();
  const { control, setValue } = useFormContext<AgentForm>();
  const [selectedTemplateId, setSelectedTemplateId] = useState(businessAgentTemplates[0].id);
  const [isOpen, setIsOpen] = useState(false);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const webSearch = useWatch({ control, name: AgentCapabilities.web_search });
  const fileSearch = useWatch({ control, name: AgentCapabilities.file_search });
  const executeCode = useWatch({ control, name: AgentCapabilities.execute_code });
  const artifacts = useWatch({ control, name: AgentCapabilities.artifacts });
  const { artifactsEnabled, codeEnabled, fileSearchEnabled, webSearchEnabled } =
    useAgentCapabilities(agentsConfig?.capabilities);

  const selectedTemplate =
    businessAgentTemplates.find((template) => template.id === selectedTemplateId) ??
    businessAgentTemplates[0];

  const visibleTemplates = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLocaleLowerCase();

    return businessAgentTemplates.filter((template) => {
      if (!normalizedSearch) {
        return showAllRoles || template.featured;
      }

      const name = localize(template.nameKey).toLocaleLowerCase();
      const description = localize(template.descriptionKey).toLocaleLowerCase();
      return name.includes(normalizedSearch) || description.includes(normalizedSearch);
    });
  }, [localize, searchTerm, showAllRoles]);

  const availability = useMemo<Record<BusinessAgentCapability, boolean>>(
    () => ({
      [AgentCapabilities.web_search]: webSearchEnabled,
      [AgentCapabilities.file_search]: fileSearchEnabled,
      [AgentCapabilities.execute_code]: codeEnabled,
      [AgentCapabilities.artifacts]: artifactsEnabled,
    }),
    [artifactsEnabled, codeEnabled, fileSearchEnabled, webSearchEnabled],
  );

  const isCapabilityEnabled = (capability: BusinessAgentCapability): boolean => {
    switch (capability) {
      case AgentCapabilities.web_search:
        return webSearch === true;
      case AgentCapabilities.file_search:
        return fileSearch === true;
      case AgentCapabilities.execute_code:
        return executeCode === true;
      case AgentCapabilities.artifacts:
        return Boolean(artifacts);
    }
  };

  const setCapability = useCallback(
    (capability: BusinessAgentCapability, enabled: boolean): void => {
      switch (capability) {
        case AgentCapabilities.web_search:
          setValue(AgentCapabilities.web_search, enabled, { shouldDirty: true });
          return;
        case AgentCapabilities.file_search:
          setValue(AgentCapabilities.file_search, enabled, { shouldDirty: true });
          return;
        case AgentCapabilities.execute_code:
          setValue(AgentCapabilities.execute_code, enabled, { shouldDirty: true });
          return;
        case AgentCapabilities.artifacts:
          setValue(AgentCapabilities.artifacts, enabled ? ArtifactModes.DEFAULT : '', {
            shouldDirty: true,
          });
          return;
      }
    },
    [setValue],
  );

  const applyTemplate = useCallback(() => {
    const draft = getBusinessAgentDraft(selectedTemplate, localize);

    setValue('name', draft.name, { shouldDirty: true });
    setValue('description', draft.description, { shouldDirty: true });
    setValue('instructions', draft.instructions, { shouldDirty: true });
    setValue('category', draft.category, { shouldDirty: true });
    selectedTemplate.capabilities.forEach((capability) => {
      if (availability[capability]) {
        setCapability(capability, true);
      }
    });
  }, [availability, localize, selectedTemplate, setCapability, setValue]);

  return (
    <section
      className="mb-5 overflow-hidden rounded-lg border border-border-light bg-surface-primary"
      aria-labelledby="business-agent-templates-title"
    >
      <button
        type="button"
        onClick={() => setIsOpen((current) => !current)}
        aria-expanded={isOpen}
        aria-controls="business-agent-templates-content"
        className="group flex w-full items-center gap-3 px-3 py-3 text-left transition-colors hover:bg-surface-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring-primary"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-border-light bg-surface-secondary text-text-primary">
          <BriefcaseBusiness className="h-4 w-4" aria-hidden="true" />
        </span>
        <span className="min-w-0 flex-1">
          <span
            id="business-agent-templates-title"
            className="block text-sm font-semibold text-text-primary"
          >
            {localize('com_agents_business_templates')}
          </span>
          <span className="mt-0.5 block truncate text-xs text-text-secondary">
            {localize('com_agents_business_templates_description')}
          </span>
        </span>
        <span className="hidden rounded-md border border-border-light bg-surface-secondary px-2 py-1 text-[11px] font-medium text-text-secondary sm:inline-flex">
          {localize('com_agents_business_templates_count', {
            count: businessAgentTemplates.length,
          })}
        </span>
        <ChevronDown
          className={`h-4 w-4 shrink-0 text-text-secondary transition-transform duration-200 ${
            isOpen ? 'rotate-180' : ''
          }`}
          aria-hidden="true"
        />
      </button>

      {isOpen && (
        <div id="business-agent-templates-content" className="border-t border-border-light p-3">
          <label className="relative mb-3 block">
            <Search
              className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-text-secondary"
              aria-hidden="true"
            />
            <input
              type="search"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder={localize('com_agents_business_templates_search_placeholder')}
              aria-label={localize('com_agents_business_templates_search_label')}
              className="h-9 w-full rounded-lg border border-border-light bg-surface-primary py-2 pl-8 pr-3 text-sm text-text-primary placeholder:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary"
            />
          </label>

          <ul className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {visibleTemplates.map((template) => {
              const isSelected = template.id === selectedTemplate.id;

              return (
                <li key={template.id}>
                  <button
                    type="button"
                    aria-pressed={isSelected}
                    onClick={() => setSelectedTemplateId(template.id)}
                    className={`w-full rounded-lg border p-2.5 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary ${
                      isSelected
                        ? 'border-border-heavy bg-surface-secondary shadow-sm'
                        : 'border-border-light bg-surface-primary hover:border-border-medium hover:bg-surface-secondary'
                    }`}
                  >
                    <span className="flex items-start gap-2">
                      <span className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-surface-tertiary text-text-primary">
                        <template.Icon className="h-3.5 w-3.5" aria-hidden="true" />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1 text-sm font-medium text-text-primary">
                          {localize(template.nameKey)}
                          {isSelected && (
                            <Check className="h-3.5 w-3.5 text-text-primary" aria-hidden="true" />
                          )}
                        </span>
                        <span className="mt-0.5 block text-xs leading-4 text-text-secondary">
                          {localize(template.descriptionKey)}
                        </span>
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>

          {visibleTemplates.length === 0 && (
            <p className="rounded-lg bg-surface-primary p-3 text-center text-xs text-text-secondary">
              {localize('com_agents_business_templates_empty')}
            </p>
          )}

          {searchTerm.length === 0 && (
            <button
              type="button"
              className="mt-3 inline-flex h-8 items-center rounded-md border border-border-light bg-surface-primary px-2.5 text-xs font-medium text-text-primary transition-colors hover:bg-surface-secondary"
              onClick={() => setShowAllRoles((current) => !current)}
            >
              {localize(
                showAllRoles
                  ? 'com_agents_business_templates_show_less'
                  : 'com_agents_business_templates_show_more',
              )}
            </button>
          )}

          <div className="mt-3 rounded-lg border border-border-light bg-surface-secondary p-3">
            <div className="mb-2">
              <p className="text-xs font-medium text-text-primary">
                {localize('com_agents_business_template_capabilities')}
              </p>
              <p className="mt-0.5 text-xs leading-4 text-text-secondary">
                {localize('com_agents_business_template_capabilities_description')}
              </p>
            </div>
            <div className="space-y-2">
              {businessCapabilities.map((capability) => {
                const definition = capabilityDefinitions[capability];
                const isRecommended = selectedTemplate.capabilities.includes(capability);
                const isAvailable = availability[capability];
                const isEnabled = isCapabilityEnabled(capability);

                return (
                  <div
                    key={capability}
                    className={`flex items-center gap-2 rounded-md border p-2 ${
                      isRecommended
                        ? 'border-border-medium bg-surface-primary'
                        : 'border-border-light bg-surface-primary'
                    } ${isAvailable ? '' : 'opacity-60'}`}
                  >
                    <definition.Icon
                      className="h-4 w-4 shrink-0 text-text-secondary"
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-text-primary">
                        {localize(definition.labelKey)}
                        {isRecommended && (
                          <span className="ml-1.5 inline-flex rounded-full border border-border-light bg-surface-secondary px-1.5 py-0.5 align-middle text-[10px] font-medium uppercase tracking-[0.08em] text-text-secondary">
                            {localize('com_agents_business_template_recommended')}
                          </span>
                        )}
                      </p>
                      <p className="text-xs leading-4 text-text-secondary">
                        {localize(
                          isAvailable
                            ? definition.descriptionKey
                            : 'com_agents_business_template_capability_unavailable',
                        )}
                      </p>
                    </div>
                    <Switch
                      checked={isEnabled}
                      onCheckedChange={(enabled: boolean) => setCapability(capability, enabled)}
                      disabled={!isAvailable}
                      aria-label={localize(definition.labelKey)}
                    />
                  </div>
                );
              })}
            </div>
            <button
              type="button"
              onClick={applyTemplate}
              className="mt-3 flex h-9 w-full items-center justify-center gap-2 rounded-md bg-text-primary px-3 text-sm font-medium text-surface-primary transition-opacity hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring-primary focus-visible:ring-offset-2"
            >
              <Check className="h-4 w-4" aria-hidden="true" />
              {localize('com_agents_business_template_apply')}
            </button>
            <p className="mt-2 text-xs leading-4 text-text-secondary">
              {localize('com_agents_business_template_apply_hint')}
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
