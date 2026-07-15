import { useEffect, useState } from 'react';
import {
  Presentation,
  FileText,
  Table2,
  SearchCheck,
  Settings,
  Save,
} from 'lucide-react';
import {
  useGetAdminConsoleFeaturesQuery,
  useUpdateAdminConsoleFeaturesMutation,
} from '~/data-provider';
import {
  Button,
  Spinner,
  useToastContext,
} from '@nashm/client';
import { NotificationSeverity } from '~/common';

interface FeatureConfig {
  id: 'slides' | 'audio' | 'document' | 'spreadsheet' | 'research';
  name: string;
  description: string;
  icon: React.ComponentType<any>;
}

const featuresList: FeatureConfig[] = [
  {
    id: 'slides',
    name: 'Slides Preview (العروض التقديمية)',
    description: 'Allows users to quickly request and preview professional slide decks generated as JSON artifacts.',
    icon: Presentation,
  },
  {
    id: 'document',
    name: 'Document Preview (المستندات)',
    description: 'Allows users to request and render formatted written documents like proposals, reports, and letters.',
    icon: FileText,
  },
  {
    id: 'spreadsheet',
    name: 'Excel Preview (جداول البيانات)',
    description: 'Allows users to request and display professional grid workbooks/spreadsheets.',
    icon: Table2,
  },
  {
    id: 'research',
    name: 'Deep Research (البحث العميق)',
    description: 'Runs an agentic workflow that performs search queries, compares sources, and generates detailed Markdown reports.',
    icon: SearchCheck,
  },
];

export default function AdminConsoleFeatures() {
  const { showToast } = useToastContext();
  const { data, isLoading, error, refetch } = useGetAdminConsoleFeaturesQuery();

  const [featuresState, setFeaturesState] = useState<Record<string, boolean>>({
    slides: true,
    audio: true,
    document: true,
    spreadsheet: true,
    research: true,
  });

  useEffect(() => {
    if (data) {
      setFeaturesState({
        slides: data.slides !== false,
        audio: data.audio !== false,
        document: data.document !== false,
        spreadsheet: data.spreadsheet !== false,
        research: data.research !== false,
      });
    }
  }, [data]);

  const updateMutation = useUpdateAdminConsoleFeaturesMutation({
    onSuccess: () => {
      showToast({
        message: 'Features configuration saved successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      refetch();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to save features configuration.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const handleToggle = (id: string) => {
    setFeaturesState((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    updateMutation.mutate(featuresState);
  };

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-500">
        Failed to load features configuration. Please check connection and try again.
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 max-w-4xl mx-auto">
      <div className="flex flex-col gap-1.5 border-b border-border-light pb-4">
        <h3 className="text-lg font-bold flex items-center gap-2">
          <Settings className="size-5 text-blue-500" />
          Interactive Features Management
        </h3>
        <p className="text-sm text-text-secondary">
          Enable or disable prompt assistant quick action features. Disabled features will be hidden from the user interface prompt bar.
        </p>
      </div>

      <form onSubmit={handleSave} className="flex flex-col gap-6">
        <div className="flex flex-col gap-4">
          {featuresList.map((feature) => {
            const isEnabled = featuresState[feature.id];
            const Icon = feature.icon;
            return (
              <div
                key={feature.id}
                onClick={() => handleToggle(feature.id)}
                className={`p-5 rounded-2xl border bg-surface-primary flex items-center justify-between gap-6 cursor-pointer select-none transition-all duration-200 hover:shadow-md ${
                  isEnabled
                    ? 'border-border-light hover:border-emerald-500/30'
                    : 'border-border-light opacity-65 bg-surface-secondary/20'
                }`}
              >
                <div className="flex items-start gap-4">
                  <div
                    className={`p-3 rounded-xl border transition-all duration-200 ${
                      isEnabled
                        ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500'
                        : 'bg-surface-tertiary border-border-light text-text-secondary'
                    }`}
                  >
                    <Icon className="size-6" />
                  </div>
                  <div className="flex flex-col gap-1">
                    <span className="font-bold text-text-primary text-base">
                      {feature.name}
                    </span>
                    <span className="text-xs text-text-secondary leading-relaxed max-w-xl">
                      {feature.description}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <span
                    className={`text-xs font-bold uppercase tracking-wider px-2.5 py-0.5 rounded-full border transition-all ${
                      isEnabled
                        ? 'text-emerald-600 bg-emerald-500/10 border-emerald-500/20'
                        : 'text-text-secondary bg-surface-tertiary border-border-light'
                    }`}
                  >
                    {isEnabled ? 'Active' : 'Inactive'}
                  </span>
                  
                  {/* Custom Toggle Switch */}
                  <div
                    className={`w-11 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 ${
                      isEnabled ? 'bg-emerald-500' : 'bg-surface-tertiary border border-border-light'
                    }`}
                  >
                    <div
                      className={`bg-white size-5 rounded-full shadow-md transform transition-transform duration-200 ${
                        isEnabled ? 'translate-x-5' : 'translate-x-0'
                      }`}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end pt-4 border-t border-border-light">
          <Button
            type="submit"
            disabled={updateMutation.isLoading}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-6 py-2.5 rounded-xl shadow-lg hover:shadow-xl transition-all duration-150 active:scale-95 disabled:opacity-50"
          >
            {updateMutation.isLoading ? (
              <Spinner className="size-4 text-white" />
            ) : (
              <Save className="size-4" />
            )}
            Save Configuration
          </Button>
        </div>
      </form>
    </div>
  );
}
