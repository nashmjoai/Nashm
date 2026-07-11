import { useState } from 'react';
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
  const [editingUser, setEditingUser] = useState<any>(null);
  const [selectedPlan, setSelectedPlan] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [expiresAt, setExpiresAt] = useState('');
  const [notes, setNotes] = useState('');
  const [tokenBalance, setTokenBalance] = useState('');

  // Query plans for default quotas
  const { data: plansData } = useGetAdminConsolePlansQuery();

  const handlePlanChange = (newPlan: string) => {
    setSelectedPlan(newPlan);

    // Find the default quota for this plan
    const fallbackQuota =
      newPlan === 'free' ? 50000 :
      newPlan === 'individual' ? 500000 :
      newPlan === 'family' ? 1000000 :
      newPlan === 'developer' ? 2000000 : 50000;

    const planConfig = plansData?.plans?.find((p: any) => p.plan === newPlan);
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
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to update subscription.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const getDefaultQuota = (plan: string) => {
    const fallbackQuota =
      plan === 'free' ? 50000 :
      plan === 'individual' ? 500000 :
      plan === 'family' ? 1000000 :
      plan === 'developer' ? 2000000 : 50000;
    const planConfig = plansData?.plans?.find((p: any) => p.plan === plan);
    return planConfig?.tokenQuota ?? fallbackQuota;
  };

  const handleEditClick = (user: any) => {
    setEditingUser(user);
    const plan = user.subscription?.plan || 'free';
    setSelectedPlan(plan);
    setSelectedStatus(user.subscription?.status || 'active');
    setNotes(user.subscription?.notes || '');
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


  const handleSaveSubscription = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    upsertSubscriptionMutation.mutate({
      userId: editingUser.id,
      plan: selectedPlan,
      status: selectedStatus,
      expiresAt: expiresAt || null,
      notes,
      tokenBalance: Number(tokenBalance) || 0,
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
      <div className="flex items-center gap-4 bg-surface-primary border border-border-light px-4 py-2 rounded-xl shadow-sm">
        <Search className="size-5 text-text-secondary" />
        <input
          type="text"
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(1);
          }}
          placeholder="Search by name, email, or username..."
          className="flex-1 bg-transparent text-sm border-none focus:outline-none text-text-primary placeholder:text-text-secondary"
        />
      </div>

      {/* Users Table */}
      <div className="border border-border-light rounded-2xl bg-surface-primary shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-light bg-surface-secondary/50 text-text-secondary font-semibold">
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
                  <td colSpan={8} className="p-8 text-center text-text-secondary italic">
                    No users found matching search criteria.
                  </td>

                </tr>
              ) : (
                users.map((user: any) => (
                  <tr key={user.id} className="hover:bg-surface-secondary/30 transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        {user.avatar ? (
                          <img
                            src={user.avatar}
                            alt={user.name}
                            className="size-9 rounded-full object-cover border border-border-light"
                          />
                        ) : (
                          <div className="size-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold flex items-center justify-center uppercase">
                            {user.name?.charAt(0) || user.email?.charAt(0)}
                          </div>
                        )}
                        <div className="flex flex-col">
                          <span className="font-semibold text-text-primary leading-snug">
                            {user.name || user.username}
                          </span>
                          <span className="text-xs text-text-secondary font-mono">{user.email}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-4">
                      <span
                        className={`text-xs px-2 py-0.5 rounded-full font-semibold border ${
                          user.role === 'ADMIN'
                            ? 'bg-red-500/10 text-red-500 border-red-500/20'
                            : 'bg-surface-tertiary text-text-secondary border-border-light'
                        }`}
                      >
                        {user.role}
                      </span>
                    </td>
                    <td className="p-4 capitalize text-text-secondary text-xs">{user.provider}</td>
                    <td className="p-4 text-center font-mono font-medium">{user.activeSessions}</td>
                    <td className="p-4">
                      <div className="flex flex-col gap-0.5">
                        <span
                          className={`text-xs font-semibold capitalize flex items-center gap-1.5 ${
                            user.subscription?.plan !== 'free' ? 'text-purple-500' : 'text-text-secondary'
                          }`}
                        >
                          <CreditCard className="size-3.5" />
                          {user.subscription?.plan}
                        </span>
                        {user.subscription?.expiresAt && (
                          <span className="text-[10px] text-text-secondary flex items-center gap-1">
                            <Calendar className="size-3" />
                            Expires: {new Date(user.subscription.expiresAt).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="p-4 font-mono font-medium text-text-secondary text-xs">
                      {user.tokenUsage?.totalTokens?.toLocaleString() || 0}
                    </td>
                    <td className="p-4 font-mono font-medium text-text-secondary text-xs">
                      {user.tokenBalance?.toLocaleString() || 0}
                    </td>

                    <td className="p-4 text-center">
                      <button
                        onClick={() => handleEditClick(user)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 transition-colors inline-flex items-center gap-1.5 text-xs font-medium border border-border-light hover:border-blue-500/30"
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
          <div className="p-4 border-t border-border-light bg-surface-secondary/50 flex items-center justify-between">
            <span className="text-xs text-text-secondary">
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} users
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page === 1}
                onClick={() => setPage((p) => p - 1)}
                className="p-2 border border-border-light rounded-lg text-text-secondary disabled:opacity-50 hover:bg-surface-primary hover:text-text-primary transition-colors"
              >
                <ChevronLeft className="size-4" />
              </button>
              <span className="text-xs font-medium text-text-primary">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page === totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="p-2 border border-border-light rounded-lg text-text-secondary disabled:opacity-50 hover:bg-surface-primary hover:text-text-primary transition-colors"
              >
                <ChevronRight className="size-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Subscription Editor Modal */}
      {editingUser && (
        <OGDialog open={!!editingUser} onOpenChange={() => setEditingUser(null)}>
          <OGDialogContent className="w-11/12 max-w-lg border-border-light bg-surface-primary text-text-primary p-6">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2">
                <Shield className="size-5 text-blue-500" />
                Edit Subscription: {editingUser.name || editingUser.username}
              </OGDialogTitle>
            </OGDialogHeader>
            <form onSubmit={handleSaveSubscription} className="flex flex-col gap-4 mt-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Plan Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Plan</label>
                  <select
                    value={selectedPlan}
                    onChange={(e) => handlePlanChange(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                  >
                    <option value="free">Free</option>
                    <option value="individual">Individual</option>
                    <option value="family">Family</option>
                    <option value="developer">Developer</option>
                  </select>
                </div>

                {/* Status Selection */}
                <div className="flex flex-col gap-1">
                  <label className="text-xs font-semibold text-text-secondary uppercase">Status</label>
                  <select
                    value={selectedStatus}
                    onChange={(e) => setSelectedStatus(e.target.value)}
                    className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
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
                <label className="text-xs font-semibold text-text-secondary uppercase">Token Balance</label>
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
                <label className="text-xs font-semibold text-text-secondary uppercase">Expiration Date</label>
                <input
                  type="date"
                  value={expiresAt}
                  onChange={(e) => setExpiresAt(e.target.value)}
                  className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
                />
              </div>

              {/* Notes */}
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary uppercase">Admin Notes</label>
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Enter custom administrative notes regarding this subscription..."
                  rows={4}
                  className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary resize-none"
                />
              </div>

              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <OGDialogClose asChild>
                  <Button type="button" variant="outline" disabled={upsertSubscriptionMutation.isLoading}>
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
