import { useState } from 'react';
import {
  useGetAdminConsoleModelsQuery,
  useUpdateAdminConsoleModelMutation,
} from '~/data-provider';
import {
  Sliders,
  CheckCircle,
  XCircle,
  Edit,
  Cpu,
  Badge,
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
} from '@librechat/client';
import { NotificationSeverity } from '~/common';

export default function AdminConsoleModels() {
  const { showToast } = useToastContext();
  const { data, isLoading, error, refetch } = useGetAdminConsoleModelsQuery();

  // Model editor state
  const [editingModel, setEditingModel] = useState<any>(null);
  const [label, setLabel] = useState('');
  const [enabled, setEnabled] = useState(true);
  const [allowedPlans, setAllowedPlans] = useState<string[]>([]);
  const [notes, setNotes] = useState('');

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
    setEnabled(model.enabled);
    setAllowedPlans(model.allowedPlans || []);
    setNotes(model.notes || '');
  };

  const handlePlanToggle = (plan: string) => {
    setAllowedPlans((prev) =>
      prev.includes(plan) ? prev.filter((p) => p !== plan) : [...prev, plan],
    );
  };

  const handleSaveModel = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingModel) return;

    updateModelMutation.mutate({
      endpoint: editingModel.endpoint,
      model: editingModel.model,
      label: label.trim() || null,
      enabled,
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

  const { models = [] } = data;

  const planOptions = ['free', 'individual', 'family', 'developer'];

  return (
    <div className="flex flex-col gap-6">
      {/* Models Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {models.map((item: any, idx: number) => {
          const isEnabled = item.enabled !== false;
          return (
            <div
              key={idx}
              className={`p-6 rounded-2xl border bg-surface-primary flex flex-col gap-4 shadow-sm transition-all duration-200 ${
                isEnabled ? 'border-border-light' : 'border-red-500/20 opacity-70 bg-red-500/[0.01]'
              }`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-3">
                  <div className={`p-2.5 rounded-xl border ${isEnabled ? 'bg-blue-500/10 border-blue-500/20 text-blue-500' : 'bg-red-500/10 border-red-500/20 text-red-500'}`}>
                    <Cpu className="size-5" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-bold text-text-primary text-sm">
                      {item.label || item.model}
                    </span>
                    <span className="text-xs font-mono text-text-secondary">{item.model}</span>
                    <span className="text-[10px] uppercase font-semibold text-blue-500 mt-0.5 tracking-wider">
                      {item.endpoint}
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {isEnabled ? (
                    <span className="flex items-center gap-1 text-xs text-green-500 font-semibold bg-green-500/10 px-2 py-0.5 rounded-full border border-green-500/20">
                      <CheckCircle className="size-3.5" /> Enabled
                    </span>
                  ) : (
                    <span className="flex items-center gap-1 text-xs text-red-500 font-semibold bg-red-500/10 px-2 py-0.5 rounded-full border border-red-500/20">
                      <XCircle className="size-3.5" /> Disabled
                    </span>
                  )}
                </div>
              </div>

              {/* Stats & Metadata */}
              <div className="grid grid-cols-2 gap-4 bg-surface-secondary/50 p-4 rounded-xl border border-border-light text-xs">
                <div className="flex flex-col">
                  <span className="text-text-secondary">Requests</span>
                  <span className="font-semibold text-text-primary font-mono mt-0.5">
                    {item.requests?.toLocaleString() || 0}
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-text-secondary">Tokens Consumed</span>
                  <span className="font-semibold text-text-primary font-mono mt-0.5">
                    {item.totalTokens?.toLocaleString() || 0}
                  </span>
                </div>
              </div>

              {/* Allowed Tiers */}
              <div className="flex flex-col gap-1.5">
                <span className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
                  Allowed Subscription Tiers:
                </span>
                <div className="flex flex-wrap gap-1.5">
                  {item.allowedPlans?.map((plan: string, pIdx: number) => (
                    <span
                      key={pIdx}
                      className="text-[10px] font-semibold uppercase px-2 py-0.5 rounded bg-purple-500/10 text-purple-500 border border-purple-500/20"
                    >
                      {plan}
                    </span>
                  ))}
                  {(!item.allowedPlans || item.allowedPlans.length === 0) && (
                    <span className="text-[10px] text-text-secondary italic">All plans allowed</span>
                  )}
                </div>
              </div>

              {item.notes && (
                <p className="text-xs text-text-secondary bg-surface-secondary/30 p-2.5 rounded-lg border border-border-light/50 italic">
                  Notes: {item.notes}
                </p>
              )}

              {/* Action Button */}
              <div className="pt-2 border-t border-border-light flex justify-end">
                <button
                  onClick={() => handleEditClick(item)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 border border-border-light hover:border-blue-500/30 transition-all duration-150 flex items-center gap-1.5"
                >
                  <Edit className="size-3.5" />
                  Configure Access
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Model Access Editor Modal */}
      {editingModel && (
        <OGDialog open={!!editingModel} onOpenChange={() => setEditingModel(null)}>
          <OGDialogContent className="w-11/12 max-w-lg border-border-light bg-surface-primary text-text-primary p-6">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2">
                <Sliders className="size-5 text-blue-500" />
                Configure Access: {editingModel.model}
              </OGDialogTitle>
            </OGDialogHeader>
            <form onSubmit={handleSaveModel} className="flex flex-col gap-4 mt-4">
              {/* Friendly Label */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary uppercase">Display Label</label>
                <Input
                  value={label}
                  onChange={(e) => setLabel(e.target.value)}
                  placeholder={editingModel.model}
                  className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              {/* Status Toggle */}
              <div className="flex items-center justify-between border-y border-border-light py-3">
                <div className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">Enable Model Access</span>
                  <span className="text-xs text-text-secondary">Turn off to completely disable this model for all users.</span>
                </div>
                <input
                  type="checkbox"
                  checked={enabled}
                  onChange={(e) => setEnabled(e.target.checked)}
                  className="size-5 rounded text-blue-600 focus:ring-blue-500 border-border-light cursor-pointer"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              {/* Allowed Tiers Checklist */}
              <div className="flex flex-col gap-2">
                <span className="text-xs font-semibold text-text-secondary uppercase">Allowed Subscription Tiers</span>
                <div className="grid grid-cols-2 gap-3">
                  {planOptions.map((plan) => {
                    const isChecked = allowedPlans.includes(plan);
                    return (
                      <label
                        key={plan}
                        className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all duration-150 ${
                          isChecked
                            ? 'border-purple-500/30 bg-purple-500/5 text-purple-500'
                            : 'border-border-light bg-transparent text-text-primary hover:bg-surface-secondary/50'
                        }`}
                      >
                        <span className="capitalize text-sm font-medium">{plan}</span>
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

              {/* Administrative Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary uppercase">Configuration Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Notes regarding pricing, providers, rate-limiting or target plans..."
                  rows={4}
                  className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary resize-none"
                  disabled={updateModelMutation.isLoading}
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <OGDialogClose asChild>
                  <Button type="button" variant="outline" disabled={updateModelMutation.isLoading}>
                    Cancel
                  </Button>
                </OGDialogClose>
                <Button
                  type="submit"
                  variant="submit"
                  disabled={updateModelMutation.isLoading}
                >
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
