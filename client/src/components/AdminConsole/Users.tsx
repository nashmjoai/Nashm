import { useState } from 'react';
import type { FormEvent } from 'react';
import type { SubscriptionPlan } from 'nashm-data-provider';
import {
  useGetAdminConsoleUsersQuery,
  useUpsertAdminSubscriptionMutation,
  useGetAdminConsolePlansQuery,
} from '~/data-provider';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  CreditCard,
  Edit2,
  Calendar,
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

type SubscriptionStatus = 'active' | 'trialing' | 'past_due' | 'cancelled';

type AdminSubscription = {
  plan: SubscriptionPlan;
  status: SubscriptionStatus;
  notes?: string;
  expiresAt?: string;
};

type AdminUser = {
  id: string;
  name?: string;
  username?: string;
  email?: string;
  avatar?: string;
  role?: string;
  provider?: string;
  activeSessions?: number;
  tokenUsage?: { totalTokens?: number };
  tokenBalance?: number;
  subscription?: AdminSubscription;
};

type PlanSummary = { plan: SubscriptionPlan; tokenQuota?: number };
type PlanResponse = { plans?: PlanSummary[] };

const planOptions: SubscriptionPlan[] = ['free', 'individual', 'family', 'developer'];
const statusOptions: SubscriptionStatus[] = ['active', 'trialing', 'past_due', 'cancelled'];

function isPlan(value: string): value is SubscriptionPlan {
  return planOptions.includes(value as SubscriptionPlan);
}

function isStatus(value: string): value is SubscriptionStatus {
  return statusOptions.includes(value as SubscriptionStatus);
}

function getSafeErrorMessage(error: unknown, fallback: string) {
  if (error == null || typeof error !== 'object') {
    return fallback;
  }
  const response = 'response' in error ? error.response : undefined;
  if (response == null || typeof response !== 'object' || !('data' in response)) {
    return fallback;
  }
  const data = response.data;
  if (
    data != null &&
    typeof data === 'object' &&
    'error' in data &&
    typeof data.error === 'string'
  ) {
    return data.error;
  }
  return fallback;
}

export default function AdminConsoleUsers() {
  const { showToast } = useToastContext();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  // Query users
  const { data, isLoading, error, refetch } = useGetAdminConsoleUsersQuery({
    search,
    limit,
    offset,
  });

  // Modal / Editor state
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('free');
  const [selectedStatus, setSelectedStatus] = useState<SubscriptionStatus>('active');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');
  const [formError, setFormError] = useState<string | null>(null);

  // Query plans for default quotas
  const { data: plansData } = useGetAdminConsolePlansQuery();

  const plans = (plansData as PlanResponse | undefined)?.plans ?? [];

  const handlePlanChange = (newPlan: SubscriptionPlan) => {
    setSelectedPlan(newPlan);
    setFormError(null);

    // Find the default quota for this plan
    const fallbackQuota =
      newPlan === 'free'
        ? 50000
        : newPlan === 'individual'
          ? 500000
          : newPlan === 'family'
            ? 1000000
            : newPlan === 'developer'
              ? 2000000
              : 50000;

    const planConfig = plans.find((plan) => plan.plan === newPlan);
    const quota = planConfig?.tokenQuota ?? fallbackQuota;

    setTokenBalance(String(quota));
  };

  const upsertSubscriptionMutation = useUpsertAdminSubscriptionMutation({
    onSuccess: () => {
      showToast({
        message: 'Subscription updated successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      setEditingUser(null);
      refetch();
    },
    onError: (error: unknown) => {
      showToast({
        message: getSafeErrorMessage(error, 'Failed to update subscription. Please try again.'),
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const getDefaultQuota = (plan: SubscriptionPlan) => {
    const fallbackQuota =
      plan === 'free'
        ? 50000
        : plan === 'individual'
          ? 500000
          : plan === 'family'
            ? 1000000
            : plan === 'developer'
              ? 2000000
              : 50000;
    const planConfig = plans.find((item) => item.plan === plan);
    return planConfig?.tokenQuota ?? fallbackQuota;
  };

  const handleEditClick = (user: AdminUser) => {
    setEditingUser(user);
    const plan = user.subscription?.plan ?? 'free';
    setSelectedPlan(plan);
    setSelectedStatus(user.subscription?.status ?? 'active');
    setNotes(user.subscription?.notes ?? '');
    setFormError(null);
    // If user balance is 0 and plan is not free, pre-fill with plan's default quota
    const currentBalance = user.tokenBalance ?? 0;
    if (currentBalance === 0 && plan !== 'free') {
      setTokenBalance(String(getDefaultQuota(plan)));
    } else {
      setTokenBalance(String(currentBalance));
    }
    if (user.subscription?.expiresAt) {
      // Format ISO string to yyyy-MM-dd
      setExpiresAt(new Date(user.subscription.expiresAt).toISOString().split('T')[0]);
    } else {
      setExpiresAt('');
    }
  };

  const closeEditor = () => {
    if (!upsertSubscriptionMutation.isLoading) {
      setEditingUser(null);
      setFormError(null);
    }
  };

  const handleSaveSubscription = (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) {
      return;
    }
    const parsedBalance = Number(tokenBalance);
    if (!Number.isInteger(parsedBalance) || parsedBalance < 0) {
      setFormError('Token balance must be a whole number equal to or greater than zero.');
      return;
    }
    if (expiresAt && Number.isNaN(new Date(expiresAt).getTime())) {
      setFormError('Please enter a valid expiration date.');
      return;
    }
    setFormError(null);

    upsertSubscriptionMutation.mutate({
      userId: editingUser.id,
      plan: selectedPlan,
      status: selectedStatus,
      expiresAt: expiresAt || null,
      notes,
      tokenBalance: parsedBalance,
    });
  };

  if (isLoading && page === 1) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Spinner className="size-8" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-500">
        Failed to load users list. Please check connection and try again.
      </div>
    );
  }

  const { users = [], total = 0 } = data || {};
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6">
      {/* Search Bar */}
      <div className="flex items-center gap-4 rounded-xl border border-border-light bg-surface-primary px-4 py-2 shadow-sm">
        <Search className="size-5 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email, or username..."
          className="flex-1 border-none bg-transparent text-sm text-text-primary placeholder:text-text-secondary focus:outline-none"
        />
      </div>

      {/* Users Table */}
      <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-primary shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full border-collapse text-left text-sm">
            <thead>
              <tr className="bg-surface-secondary/50 border-b border-border-light font-semibold text-text-secondary">
                <th className="p-4">User</th>
                <th className="p-4">Role</th>
                <th className="p-4">Provider</th>
                <th className="p-4">Active Sessions</th>
                <th className="p-4">Subscription</th>
                <th className="p-4">Tokens Used</th>
                <th className="p-4">Tokens Balance</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>

            <tbody className="divide-y divide-border-light">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-8 text-center italic text-text-secondary">
                    No users found matching search criteria.
                  </td>
                </tr>
              ) : (
                (users as AdminUser[]).map((user) => (
                  <tr key={user.id} className="hover:bg-surface-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.avatar && (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            referrerPolicy="no-referrer"
                            className="size-9 rounded-full border border-border-light object-cover"
                            onError={(e) => {
                              e.currentTarget.style.display = 'none';
                              const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                              if (fallback) fallback.style.display = 'flex';
                            }}
                          />
                        )}
                        <div
                          className="size-9 items-center justify-center rounded-full border border-blue-500/20 bg-blue-500/10 font-bold uppercase text-blue-500"
                          style={{ display: user.avatar ? 'none' : 'flex' }}
                        >
                          {user.name?.charAt(0) || user.email?.charAt(0)}
                        </div>
                        <div className="flex flex-col">
                          <span className="font-semibold leading-snug text-text-primary">
                            {user.name || user.username}
                          </span>
                          <span className="font-mono text-xs text-text-secondary">
                            {user.email}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`rounded-full border px-2 py-0.5 text-xs font-semibold ${
                          user.role === 'ADMIN'
                            ? 'border-red-500/20 bg-red-500/10 text-red-500'
                            : 'border-border-light bg-surface-tertiary text-text-secondary'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 text-xs capitalize text-text-secondary">{user.provider}</td>
                    <td className="p-4 text-center font-mono font-medium">{user.activeSessions}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`flex items-center gap-1.5 text-xs font-semibold capitalize ${
                            user.subscription?.plan !== 'free'
                              ? 'text-purple-500'
                              : 'text-text-secondary'
                          }`}
                        >
                          <CreditCard className="size-3.5" />
                          {user.subscription?.plan}
                        </span>
                        {user.subscription?.expiresAt && (
                          <span className="flex items-center gap-1 text-[10px] text-text-secondary">
                            <Calendar className="size-3" />
                            Expires: {new Date(user.subscription.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono text-xs font-medium text-text-secondary">
                      {user.tokenUsage?.totalTokens?.toLocaleString() || 0}
                    </td>
                    <td className="p-4 font-mono text-xs font-medium text-text-secondary">
                      {user.tokenBalance?.toLocaleString() || 0}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="inline-flex items-center gap-1.5 rounded-lg border border-border-light p-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-500"
                      >
                        <Edit2 className="size-3.5" />
                        Edit Subscription
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Footer */}
        {totalPages > 1 && (
          <div className="bg-surface-secondary/50 flex items-center justify-between border-t border-border-light p-4">
            <span className="text-xs text-text-secondary">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} users
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="rounded-lg border border-border-light p-2 text-text-secondary transition-colors hover:bg-surface-primary hover:text-text-primary disabled:opacity-50"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-medium text-text-primary">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="rounded-lg border border-border-light p-2 text-text-secondary transition-colors hover:bg-surface-primary hover:text-text-primary disabled:opacity-50"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Editor Modal */}
      {editingUser && (
        <OGDialog open={!!editingUser} onOpenChange={closeEditor}>
          <OGDialogContent className="w-11/12 max-w-lg border-border-light bg-surface-primary p-6 text-text-primary">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-blue-500" />
                Edit Subscription: {editingUser.name || editingUser.username}
              </OGDialogTitle>
            </OGDialogHeader>
            <form onSubmit={handleSaveSubscription} className="mt-4 flex flex-col gap-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Plan Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase text-text-secondary">
                    Plan
                  </label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => {
                      if (isPlan(e.target.value)) {
                        handlePlanChange(e.target.value);
                      }
                    }}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                    disabled={upsertSubscriptionMutation.isLoading}
                  >
                    <option value="free">Free</option>
                    <option value="individual">Individual</option>
                    <option value="family">Family</option>
                    <option value="developer">Developer</option>
                  </select>
                </div>

                {/* Status Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold uppercase text-text-secondary">
                    Status
                  </label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => {
                      if (isStatus(e.target.value)) {
                        setSelectedStatus(e.target.value);
                        setFormError(null);
                      }
                    }}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                    disabled={upsertSubscriptionMutation.isLoading}
                  >
                    <option value="active">Active</option>
                    <option value="trialing">Trialing</option>
                    <option value="past_due">Past Due</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              {/* Token Balance */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-text-secondary">
                  Token Balance
                </label>
                <Input
                  type="number"
                  value={tokenBalance}
                  onChange={(e) => setTokenBalance(e.target.value)}
                  min={0}
                  className="w-full"
                  disabled={upsertSubscriptionMutation.isLoading}
                />
              </div>

              {/* Expiration Date */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-text-secondary">
                  Expiration Date
                </label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                  disabled={upsertSubscriptionMutation.isLoading}
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold uppercase text-text-secondary">
                  Admin Notes
                </label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter custom administrative notes regarding this subscription..."
                  rows={4}
                  className="w-full resize-none rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                  disabled={upsertSubscriptionMutation.isLoading}
                />
              </div>

              {formError && (
                <p
                  role="alert"
                  className="rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-600"
                >
                  {formError}
                </p>
              )}

              <div className="flex justify-end gap-3 border-t border-border-light pt-4">
                <OGDialogClose asChild>
                  <Button
                    type="button"
                    variant="outline"
                    disabled={upsertSubscriptionMutation.isLoading}
                  >
                    Cancel
                  </Button>
                </OGDialogClose>
                <Button
                  type="submit"
                  variant="submit"
                  disabled={upsertSubscriptionMutation.isLoading}
                >
                  {upsertSubscriptionMutation.isLoading ? <Spinner /> : 'Save Subscription'}
                </Button>
              </div>
            </form>
          </OGDialogContent>
        </OGDialog>
      )}
    </div>
  );
}
