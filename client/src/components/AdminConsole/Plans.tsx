import { useState } from 'react';
import {
  useGetAdminConsolePlansQuery,
  useUpdateAdminConsolePlanMutation,
  useGetAdminConsoleModelsQuery,
} from '~/data-provider';
import {
  CreditCard,
  RefreshCw,
  Edit2,
  Users,
  Zap,
  ChevronDown,
  ChevronRight,
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

const PLAN_COLORS: Record<string, string> = {
  free: 'text-gray-500 bg-gray-500/10 border-gray-500/20',
  individual: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
  family: 'text-green-500 bg-green-500/10 border-green-500/20',
  developer: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
};

const RENEWAL_LABELS: Record<string, string> = {
  daily: 'Daily',
  weekly: 'Weekly',
  monthly: 'Monthly',
  yearly: 'Yearly',
};

export default function AdminConsolePlans() {
  const { showToast } = useToastContext();
  const { data, isLoading, error, refetch } = useGetAdminConsolePlansQuery();
  const { data: modelsData } = useGetAdminConsoleModelsQuery();

  const [editingPlan, setEditingPlan] = useState<any>(null);
  const [displayName, setDisplayName] = useState('');
  const [priceText, setPriceText] = useState('');
  const [features, setFeatures] = useState<string[]>([]);
  const [tokenQuota, setTokenQuota] = useState('');
  const [renewalPeriod, setRenewalPeriod] = useState('monthly');
  const [familyMinMembers, setFamilyMinMembers] = useState('2');
  const [familyMemberTokenQuota, setFamilyMemberTokenQuota] = useState('');
  const [familyMemberRenewalPeriod, setFamilyMemberRenewalPeriod] = useState('monthly');
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);
  const [modelLimits, setModelLimits] = useState<Record<string, number>>({});

  const updatePlanMutation = useUpdateAdminConsolePlanMutation({
    onSuccess: () => {
      showToast({ message: 'Plan updated successfully!', severity: NotificationSeverity.SUCCESS, showIcon: true });
      setEditingPlan(null);
      refetch();
    },
    onError: (err: any) => {
      showToast({ message: err?.response?.data?.error || 'Failed to update plan.', severity: NotificationSeverity.ERROR, showIcon: true });
    },
  });

  const handleEditClick = (plan: any) => {
    setEditingPlan(plan);
    setDisplayName(plan.displayName || '');
    setPriceText(plan.priceText || '');
    setFeatures(plan.features || []);
    setTokenQuota(String(plan.tokenQuota ?? 0));
    setRenewalPeriod(plan.renewalPeriod ?? 'monthly');
    setFamilyMinMembers(String(plan.familyMinMembers ?? 2));
    setFamilyMemberTokenQuota(String(plan.familyMemberTokenQuota ?? 0));
    setFamilyMemberRenewalPeriod(plan.familyMemberRenewalPeriod ?? 'monthly');
    const limits: Record<string, number> = {};
    for (const ml of plan.modelTokenLimits ?? []) {
      limits[`${ml.endpoint}:${ml.model}`] = ml.tokensPerPeriod;
    }
    setModelLimits(limits);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingPlan) return;

    const modelTokenLimits = (modelsData?.models ?? []).map((m: any) => ({
      endpoint: m.endpoint,
      model: m.model,
      tokensPerPeriod: modelLimits[`${m.endpoint}:${m.model}`] ?? 0,
    }));

    updatePlanMutation.mutate({
      plan: editingPlan.plan,
      payload: {
        displayName,
        priceText,
        features: features.filter(f => f.trim() !== ''),
        tokenQuota: Number(tokenQuota) || 0,
        renewalPeriod,
        ...(editingPlan.plan === 'family' && {
          familyMinMembers: Number(familyMinMembers) || 2,
          familyMemberTokenQuota: Number(familyMemberTokenQuota) || 0,
          familyMemberRenewalPeriod,
        }),
        modelTokenLimits,
      },
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
        Failed to load plans configuration. Please check connection and try again.
      </div>
    );
  }

  const { plans = [] } = data;
  const allModels: any[] = (modelsData?.models ?? []).filter((m: any) => m.enabled !== false);


  return (
    <div className="flex flex-col gap-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {plans.map((plan: any) => {
          const colorClass = PLAN_COLORS[plan.plan] ?? PLAN_COLORS.free;
          const isExpanded = expandedPlan === plan.plan;
          return (
            <div
              key={plan.plan}
              className="rounded-2xl border border-border-light bg-surface-primary shadow-sm flex flex-col gap-0 overflow-hidden"
            >
              {/* Card Header */}
              <div className="p-6 flex flex-col gap-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className={`p-2.5 rounded-xl border ${colorClass}`}>
                      <CreditCard className="size-5" />
                    </div>
                    <div className="flex flex-col">
                      <span className="font-bold text-text-primary capitalize text-base">{plan.plan}</span>
                      <span className="text-xs text-text-secondary">Subscription plan</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleEditClick(plan)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 border border-border-light hover:border-blue-500/30 transition-all flex items-center gap-1.5"
                  >
                    <Edit2 className="size-3.5" />
                    Edit
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-surface-secondary/50 p-4 rounded-xl border border-border-light text-xs">
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-secondary flex items-center gap-1"><Zap className="size-3" /> Token Quota</span>
                    <span className="font-bold text-text-primary font-mono mt-0.5">
                      {(plan.tokenQuota ?? 0).toLocaleString()}
                    </span>
                  </div>
                  <div className="flex flex-col gap-0.5">
                    <span className="text-text-secondary flex items-center gap-1"><RefreshCw className="size-3" /> Renewal</span>
                    <span className="font-semibold text-text-primary capitalize mt-0.5">
                      {RENEWAL_LABELS[plan.renewalPeriod] ?? plan.renewalPeriod}
                    </span>
                  </div>
                  {plan.plan === 'family' && (
                    <>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-secondary flex items-center gap-1"><Users className="size-3" /> Min Members</span>
                        <span className="font-bold text-text-primary mt-0.5">{plan.familyMinMembers ?? 2}</span>
                      </div>
                      <div className="flex flex-col gap-0.5">
                        <span className="text-text-secondary">Per Member Tokens</span>
                        <span className="font-bold text-text-primary font-mono mt-0.5">
                          {(plan.familyMemberTokenQuota ?? 0).toLocaleString()}
                        </span>
                      </div>
                    </>
                  )}
                </div>

                {/* Expand Models Button */}
                <button
                  onClick={() => setExpandedPlan(isExpanded ? null : plan.plan)}
                  className="flex items-center gap-2 text-xs font-medium text-text-secondary hover:text-text-primary transition-colors"
                >
                  {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
                  {isExpanded ? 'Hide' : 'Show'} AI Models & Token Limits
                </button>
              </div>

              {/* Expanded Models Section */}
              {isExpanded && (
                <div className="border-t border-border-light bg-surface-secondary/30 p-4">
                  {allModels.length === 0 ? (
                    <p className="text-xs text-text-secondary italic text-center py-2">No models configured yet.</p>
                  ) : (
                    <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-1">
                      {allModels.map((m: any, idx: number) => {
                        const key = `${m.endpoint}:${m.model}`;
                        const planLimit = plan.modelTokenLimits?.find(
                          (ml: any) => ml.endpoint === m.endpoint && ml.model === m.model,
                        );
                        return (
                          <div key={idx} className="flex items-center justify-between gap-3 py-2 border-b border-border-light/50 last:border-0">
                            <div className="flex flex-col min-w-0">
                              <span className="text-xs font-semibold text-text-primary truncate">{m.label || m.model}</span>
                              <span className="text-[10px] text-text-secondary font-mono truncate">{m.endpoint}</span>
                            </div>
                            <span className="text-xs font-mono text-text-secondary flex-shrink-0">
                              {planLimit ? planLimit.tokensPerPeriod.toLocaleString() : <span className="italic">unlimited</span>}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Edit Plan Modal */}
      {editingPlan && (
        <OGDialog open={!!editingPlan} onOpenChange={() => setEditingPlan(null)}>
          <OGDialogContent className="w-11/12 max-w-2xl border-border-light bg-surface-primary text-text-primary p-6 max-h-[90vh] overflow-y-auto">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2 capitalize">
                <CreditCard className="size-5 text-blue-500" />
                Edit Plan: {editingPlan.plan}
              </OGDialogTitle>
            </OGDialogHeader>
            <form onSubmit={handleSave} className="flex flex-col gap-5 mt-4">
              {/* Dynamic Info */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Display Name</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="e.g. Pro Developer"
                    className="w-full"
                    disabled={updatePlanMutation.isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Price Text</label>
                  <Input
                    value={priceText}
                    onChange={(e) => setPriceText(e.target.value)}
                    placeholder="e.g. $10/mo"
                    className="w-full"
                    disabled={updatePlanMutation.isLoading}
                  />
                </div>
              </div>

              {/* Features List */}
              <div className="flex flex-col gap-2">
                <label className="text-xs font-semibold text-text-secondary uppercase">Features</label>
                {features.map((feature, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <Input
                      value={feature}
                      onChange={(e) => {
                        const newFeatures = [...features];
                        newFeatures[idx] = e.target.value;
                        setFeatures(newFeatures);
                      }}
                      className="w-full"
                      disabled={updatePlanMutation.isLoading}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      className="text-red-500 hover:bg-red-500/10 border-red-500/20"
                      onClick={() => setFeatures(features.filter((_, i) => i !== idx))}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setFeatures([...features, ''])}
                  className="w-full mt-2"
                >
                  + Add Feature
                </Button>
              </div>

              {/* Base Settings */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Token Quota</label>
                  <Input
                    type="number"
                    value={tokenQuota}
                    onChange={(e) => setTokenQuota(e.target.value)}
                    min={0}
                    className="w-full"
                    disabled={updatePlanMutation.isLoading}
                  />
                </div>
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Renewal Period</label>
                  <select
                    value={renewalPeriod}
                    onChange={(e) => setRenewalPeriod(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                    disabled={updatePlanMutation.isLoading}
                  >
                    {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                      <option key={p} value={p} className="capitalize">{RENEWAL_LABELS[p]}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Family Plan Extra Settings */}
              {editingPlan.plan === 'family' && (
                <div className="p-4 rounded-xl border border-green-500/20 bg-green-500/5 flex flex-col gap-4">
                  <h3 className="text-sm font-bold text-green-500 flex items-center gap-2">
                    <Users className="size-4" /> Family Plan Settings
                  </h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-text-secondary uppercase">Min Members</label>
                      <Input
                        type="number"
                        value={familyMinMembers}
                        onChange={(e) => setFamilyMinMembers(e.target.value)}
                        min={2}
                        className="w-full"
                        disabled={updatePlanMutation.isLoading}
                      />
                    </div>
                    <div className="flex flex-col gap-1">
                      <label className="text-xs font-semibold text-text-secondary uppercase">Per Member Tokens</label>
                      <Input
                        type="number"
                        value={familyMemberTokenQuota}
                        onChange={(e) => setFamilyMemberTokenQuota(e.target.value)}
                        min={0}
                        className="w-full"
                        disabled={updatePlanMutation.isLoading}
                      />
                    </div>
                    <div className="flex flex-col gap-1 col-span-2">
                      <label className="text-xs font-semibold text-text-secondary uppercase">Member Renewal Period</label>
                      <select
                        value={familyMemberRenewalPeriod}
                        onChange={(e) => setFamilyMemberRenewalPeriod(e.target.value)}
                        className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                        disabled={updatePlanMutation.isLoading}
                      >
                        {['daily', 'weekly', 'monthly', 'yearly'].map((p) => (
                          <option key={p} value={p}>{RENEWAL_LABELS[p]}</option>
                        ))}
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* Per-Model Token Limits */}
              {allModels.length > 0 && (
                <div className="flex flex-col gap-3">
                  <h3 className="text-xs font-semibold text-text-secondary uppercase">AI Model Token Limits (per period)</h3>
                  <p className="text-[11px] text-text-secondary -mt-2">Set 0 for unlimited access within plan quota.</p>
                  <div className="flex flex-col gap-2 max-h-64 overflow-y-auto pr-1 border border-border-light rounded-xl p-3">
                    {allModels.map((m: any, idx: number) => {
                      const key = `${m.endpoint}:${m.model}`;
                      return (
                        <div key={idx} className="flex items-center gap-3 py-2 border-b border-border-light/50 last:border-0">
                          <div className="flex flex-col flex-1 min-w-0">
                            <span className="text-xs font-semibold text-text-primary truncate">{m.label || m.model}</span>
                            <span className="text-[10px] text-blue-500 font-semibold uppercase tracking-wider">{m.endpoint}</span>
                          </div>
                          <input
                            type="number"
                            min={0}
                            value={modelLimits[key] ?? 0}
                            onChange={(e) => setModelLimits((prev) => ({ ...prev, [key]: Number(e.target.value) || 0 }))}
                            className="w-32 rounded-lg border border-border-light bg-transparent px-3 py-1.5 text-xs font-mono focus:outline-none focus:ring-2 focus:ring-ring-primary text-right"
                            disabled={updatePlanMutation.isLoading}
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <OGDialogClose asChild>
                  <Button type="button" variant="outline" disabled={updatePlanMutation.isLoading}>Cancel</Button>
                </OGDialogClose>
                <Button type="submit" variant="submit" disabled={updatePlanMutation.isLoading}>
                  {updatePlanMutation.isLoading ? <Spinner /> : 'Save Plan'}
                </Button>
              </div>
            </form>
          </OGDialogContent>
        </OGDialog>
      )}
    </div>
  );
}
