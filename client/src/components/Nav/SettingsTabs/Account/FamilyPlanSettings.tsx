import { useState } from 'react';
import { useGetFamilyPlanQuery, useAddFamilyMemberMutation, useRemoveFamilyMemberMutation, useGetFamilyPlanActivityQuery } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { Button, Spinner, Input, useToastContext } from '@nashm/client';
import { NotificationSeverity } from '~/common';
import { Trash2 } from 'lucide-react';

export default function FamilyPlanSettings() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [email, setEmail] = useState('');

  const { data: plan, isLoading, error } = useGetFamilyPlanQuery();
  const { data: activityData, refetch: refetchActivity } = useGetFamilyPlanActivityQuery({
    enabled: !!plan,
  });

  const addMemberMutation = useAddFamilyMemberMutation({
    onSuccess: () => {
      showToast({
        message: 'Member added successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      setEmail('');
      refetchActivity();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to add member.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const removeMemberMutation = useRemoveFamilyMemberMutation({
    onSuccess: () => {
      showToast({
        message: 'Member removed successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      refetchActivity();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to remove member.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  if (isLoading) {
    return (
      <div className="flex h-16 items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error || !plan) {
    // If they don't have family subscription, don't show the controls.
    return null;
  }

  const members = plan.members || [];
  const children = members.filter((m: any) => m.role === 'child');

  const getMemberActivity = (email: string) => {
    if (!activityData?.members) return null;
    return activityData.members.find((m: any) => m.email.toLowerCase() === email.toLowerCase());
  };

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) {
      return;
    }
    if (children.length >= 4) {
      showToast({
        message: 'Family plan cannot exceed 4 child members.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
      return;
    }
    addMemberMutation.mutate(email.trim());
  };

  const handleRemoveMember = (userId: string) => {
    if (confirm('Are you sure you want to remove this family member?')) {
      removeMemberMutation.mutate(userId);
    }
  };

  return (
    <div className="flex flex-col gap-4 border-t border-border-light pt-4 mt-4">
      <div className="flex flex-col gap-1">
        <h4 className="font-semibold text-text-primary text-sm">Family Subscription Members</h4>
        <p className="text-xs text-text-secondary">
          As a family plan owner, you can add up to 4 child members by their registered email address.
        </p>
      </div>

      {/* Add Member Form */}
      <form onSubmit={handleAddMember} className="flex gap-2">
        <Input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="family-member@example.com"
          className="flex-grow rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
          disabled={addMemberMutation.isLoading}
        />
        <Button
          type="submit"
          variant="submit"
          disabled={addMemberMutation.isLoading || !email.trim() || children.length >= 4}
        >
          {addMemberMutation.isLoading ? <Spinner /> : 'Add Member'}
        </Button>
      </form>

      {/* Members List */}
      <div className="flex flex-col gap-2 bg-surface-secondary/50 p-4 rounded-xl border border-border-light">
        <h5 className="text-xs font-semibold text-text-secondary uppercase tracking-wider">
          Active Members ({children.length} / 4 children)
        </h5>
        {children.length === 0 ? (
          <p className="text-xs text-text-secondary italic">No child members added yet.</p>
        ) : (
          <div className="flex flex-col divide-y divide-border-light">
            {children.map((member: any) => {
              const activity = getMemberActivity(member.email);
              const lastActiveDate = activity?.lastActivity ? new Date(activity.lastActivity) : null;
              
              // Check if they were active in the last 1 hour
              const isOnline = lastActiveDate ? (Date.now() - lastActiveDate.getTime() < 60 * 60 * 1000) : false;

              return (
                <div key={member.user} className="flex items-center justify-between py-3 text-sm">
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-text-primary">{member.email}</span>
                      {lastActiveDate && (
                        <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[10px] font-semibold ${
                          isOnline ? 'bg-green-100 text-green-700 dark:bg-green-950/40 dark:text-green-450' : 'bg-gray-100 text-gray-500 dark:bg-gray-800 dark:text-gray-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${isOnline ? 'bg-green-500' : 'bg-gray-400 dark:bg-gray-500'}`} />
                          {isOnline ? 'Active' : 'Offline'}
                        </span>
                      )}
                    </div>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-secondary">
                      <span>Added: {new Date(member.addedAt).toLocaleDateString()}</span>
                      {activity && (
                        <>
                          <span>•</span>
                          <span>Convos: <strong>{activity.conversationCount}</strong></span>
                          {activity.lastConversationTitle && (
                            <>
                              <span>•</span>
                              <span className="truncate max-w-[200px]" title={activity.lastConversationTitle}>
                                Last chat: "{activity.lastConversationTitle}"
                              </span>
                            </>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveMember(member.user)}
                    className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors"
                    title="Remove Member"
                    disabled={removeMemberMutation.isLoading}
                  >
                    <Trash2 className="size-4" />
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
