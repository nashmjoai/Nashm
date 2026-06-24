import { useState } from 'react';
import { useGetFamilyPlanQuery, useAddFamilyMemberMutation, useRemoveFamilyMemberMutation } from '~/data-provider';
import { useLocalize } from '~/hooks';
import { Button, Spinner, Input, useToastContext } from '@librechat/client';
import { NotificationSeverity } from '~/common';
import { Trash2 } from 'lucide-react';

export default function FamilyPlanSettings() {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [email, setEmail] = useState('');

  const { data: plan, isLoading, error } = useGetFamilyPlanQuery();
  const addMemberMutation = useAddFamilyMemberMutation({
    onSuccess: () => {
      showToast({
        message: 'Member added successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      setEmail('');
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
            {children.map((member: any) => (
              <div key={member.user} className="flex items-center justify-between py-2 text-sm">
                <div className="flex flex-col">
                  <span className="font-medium text-text-primary">{member.email}</span>
                  <span className="text-xs text-text-secondary">Added on {new Date(member.addedAt).toLocaleDateString()}</span>
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
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
