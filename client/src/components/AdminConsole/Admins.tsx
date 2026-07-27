import { useState } from 'react';
import {
  useGetAdminConsoleAdminsQuery,
  useAddAdminConsoleAdminMutation,
  useUpdateAdminConsoleAdminMutation,
  useRemoveAdminConsoleAdminMutation,
} from '~/data-provider';
import {
  ShieldCheck,
  ShieldPlus,
  Edit2,
  Trash2,
  UserCheck,
  Crown,
  Pencil,
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
import { useAuthContext } from '~/hooks';

const ROLE_CONFIG: Record<string, { label: string; color: string; icon: React.ElementType }> = {
  ADMIN: { label: 'Admin', color: 'text-red-500 bg-red-500/10 border-red-500/20', icon: Crown },
  EDITOR: { label: 'Editor', color: 'text-amber-500 bg-amber-500/10 border-amber-500/20', icon: Pencil },
};

export default function AdminConsoleAdmins() {
  const { user: currentUser } = useAuthContext();
  const { showToast } = useToastContext();
  const { data, isLoading, error, refetch } = useGetAdminConsoleAdminsQuery();

  const [newEmail, setNewEmail] = useState('');
  const [newRole, setNewRole] = useState('ADMIN');
  const [editingAdmin, setEditingAdmin] = useState<any>(null);
  const [editRole, setEditRole] = useState('ADMIN');

  const addAdminMutation = useAddAdminConsoleAdminMutation({
    onSuccess: () => {
      showToast({ message: 'Admin user added successfully!', severity: NotificationSeverity.SUCCESS, showIcon: true });
      setNewEmail('');
      setNewRole('ADMIN');
      refetch();
    },
    onError: (err: any) => {
      showToast({ message: err?.response?.data?.error || 'Failed to add admin.', severity: NotificationSeverity.ERROR, showIcon: true });
    },
  });

  const updateAdminMutation = useUpdateAdminConsoleAdminMutation({
    onSuccess: () => {
      showToast({ message: 'Admin role updated!', severity: NotificationSeverity.SUCCESS, showIcon: true });
      setEditingAdmin(null);
      refetch();
    },
    onError: (err: any) => {
      showToast({ message: err?.response?.data?.error || 'Failed to update role.', severity: NotificationSeverity.ERROR, showIcon: true });
    },
  });

  const removeAdminMutation = useRemoveAdminConsoleAdminMutation({
    onSuccess: () => {
      showToast({ message: 'Admin role removed!', severity: NotificationSeverity.SUCCESS, showIcon: true });
      refetch();
    },
    onError: (err: any) => {
      showToast({ message: err?.response?.data?.error || 'Failed to remove admin.', severity: NotificationSeverity.ERROR, showIcon: true });
    },
  });

  const handleAddAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newEmail.trim();
    if (!trimmed) return;
    addAdminMutation.mutate({ email: trimmed, role: newRole });
  };

  const handleEditAdmin = (admin: any) => {
    setEditingAdmin(admin);
    setEditRole(admin.role);
  };

  const handleUpdateAdmin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingAdmin) return;
    updateAdminMutation.mutate({ userId: editingAdmin.id, role: editRole });
  };

  const handleRemoveAdmin = (admin: any) => {
    if (!window.confirm(`Remove admin role from ${admin.name || admin.email}?`)) return;
    removeAdminMutation.mutate(admin.id);
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
        Failed to load admin users. Please check connection and try again.
      </div>
    );
  }

  const { admins = [] } = data || {};

  return (
    <div className="flex flex-col gap-6">
      {/* Add Admin Form */}
      <div className="p-6 rounded-2xl border border-border-light bg-surface-primary shadow-sm">
        <h2 className="text-base font-bold flex items-center gap-2 mb-4">
          <ShieldPlus className="size-5 text-blue-500" />
          Add Admin User
        </h2>
        <form onSubmit={handleAddAdmin} className="flex items-center gap-3 flex-wrap">
          <div className="flex-1 min-w-52">
            <Input
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
              placeholder="Enter user email address..."
              className="w-full"
              disabled={addAdminMutation.isLoading}
              id="admin-email-input"
            />
          </div>
          <select
            value={newRole}
            onChange={(e) => setNewRole(e.target.value)}
            className="rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring-primary"
            disabled={addAdminMutation.isLoading}
            id="admin-role-select"
          >
            <option value="ADMIN">Admin</option>
            <option value="EDITOR">Editor</option>
          </select>
          <Button
            type="submit"
            variant="submit"
            disabled={addAdminMutation.isLoading || !newEmail.trim()}
            id="add-admin-button"
          >
            {addAdminMutation.isLoading ? <Spinner /> : (
              <span className="flex items-center gap-2"><ShieldPlus className="size-4" />Add</span>
            )}
          </Button>
        </form>

        {/* Role Legend */}
        <div className="mt-4 flex flex-wrap gap-3">
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Crown className="size-3.5 text-red-500" />
            <span><strong className="text-red-500">Admin</strong> — Full system access, can manage users and settings</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-text-secondary">
            <Pencil className="size-3.5 text-amber-500" />
            <span><strong className="text-amber-500">Editor</strong> — View and limited edit access to the console</span>
          </div>
        </div>
      </div>

      {/* Admins Table */}
      <div className="border border-border-light rounded-2xl bg-surface-primary shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-light flex items-center gap-2">
          <ShieldCheck className="size-5 text-text-secondary" />
          <h3 className="font-bold text-sm">Current Admin Users ({admins.length})</h3>
        </div>
        {admins.length === 0 ? (
          <div className="p-10 text-center text-text-secondary italic">
            No admin users found. Add one above.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-light bg-surface-secondary/50 text-text-secondary font-semibold text-xs uppercase tracking-wider">
                  <th className="p-4">User</th>
                  <th className="p-4">Role</th>
                  <th className="p-4">Provider</th>
                  <th className="p-4">Joined</th>
                  <th className="p-4 text-center">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {admins.map((admin: any) => {
                  const roleConf = ROLE_CONFIG[admin.role];
                  const RoleIcon = roleConf?.icon ?? UserCheck;
                  const isSelf = (currentUser as any)?.id === admin.id || (currentUser as any)?._id?.toString() === admin.id;
                  return (
                    <tr key={admin.id} className="hover:bg-surface-secondary/30 transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          {admin.avatar && (
                              <img
                                src={admin.avatar}
                                alt={admin.name}
                                referrerPolicy="no-referrer"
                                className="size-9 rounded-full object-cover border border-border-light"
                              onError={(e) => {
                                e.currentTarget.style.display = 'none';
                                const fallback = e.currentTarget.nextElementSibling as HTMLElement;
                                if (fallback) fallback.style.display = 'flex';
                              }}
                            />
                          )}
                          <div
                            className="size-9 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-500 font-bold items-center justify-center uppercase text-sm"
                            style={{ display: admin.avatar ? 'none' : 'flex' }}
                          >
                            {(admin.name || admin.email)?.charAt(0)}
                          </div>
                          <div className="flex flex-col">
                            <span className="font-semibold text-text-primary leading-snug">
                              {admin.name || admin.username}
                              {isSelf && <span className="ml-1.5 text-[10px] font-semibold uppercase tracking-wider text-blue-500 bg-blue-500/10 px-1.5 py-0.5 rounded">You</span>}
                            </span>
                            <span className="text-xs text-text-secondary font-mono">{admin.email}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-4">
                        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold border flex items-center gap-1 w-fit ${roleConf?.color ?? 'bg-surface-tertiary text-text-secondary border-border-light'}`}>
                          <RoleIcon className="size-3" />
                          {roleConf?.label ?? admin.role}
                        </span>
                      </td>
                      <td className="p-4 capitalize text-text-secondary text-xs">{admin.provider ?? 'local'}</td>
                      <td className="p-4 text-text-secondary text-xs">
                        {admin.createdAt ? new Date(admin.createdAt).toLocaleDateString() : '—'}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => handleEditAdmin(admin)}
                            disabled={isSelf}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 transition-colors border border-border-light hover:border-blue-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Change role"
                          >
                            <Edit2 className="size-3.5" />
                          </button>
                          <button
                            onClick={() => handleRemoveAdmin(admin)}
                            disabled={isSelf || removeAdminMutation.isLoading}
                            className="p-1.5 rounded-lg text-text-secondary hover:text-red-500 hover:bg-red-500/10 transition-colors border border-border-light hover:border-red-500/30 disabled:opacity-40 disabled:cursor-not-allowed"
                            title="Remove admin role"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Edit Role Modal */}
      {editingAdmin && (
        <OGDialog open={!!editingAdmin} onOpenChange={() => setEditingAdmin(null)}>
          <OGDialogContent className="w-11/12 max-w-md border-border-light bg-surface-primary text-text-primary p-6">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2">
                <Edit2 className="size-5 text-blue-500" />
                Change Role: {editingAdmin.name || editingAdmin.email}
              </OGDialogTitle>
            </OGDialogHeader>
            <form onSubmit={handleUpdateAdmin} className="flex flex-col gap-4 mt-4">
              <div className="flex flex-col gap-1">
                <label className="text-xs font-semibold text-text-secondary uppercase">New Role</label>
                <div className="grid grid-cols-2 gap-3">
                  {['ADMIN', 'EDITOR'].map((role) => {
                    const conf = ROLE_CONFIG[role];
                    const Icon = conf.icon;
                    const isSelected = editRole === role;
                    return (
                      <label
                        key={role}
                        className={`p-4 rounded-xl border flex flex-col gap-2 cursor-pointer transition-all duration-150 ${
                          isSelected ? `${conf.color} border-current` : 'border-border-light hover:bg-surface-secondary/50'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`size-4 ${isSelected ? '' : 'text-text-secondary'}`} />
                          <span className={`font-bold text-sm ${isSelected ? '' : 'text-text-secondary'}`}>{conf.label}</span>
                        </div>
                        <span className="text-[10px] text-text-secondary leading-relaxed">
                          {role === 'ADMIN' ? 'Full access to all admin features' : 'View-only with limited edits'}
                        </span>
                        <input type="radio" name="role" value={role} checked={isSelected} onChange={() => setEditRole(role)} className="sr-only" />
                      </label>
                    );
                  })}
                </div>
              </div>
              <div className="flex justify-end gap-3 pt-4 border-t border-border-light">
                <OGDialogClose asChild>
                  <Button type="button" variant="outline" disabled={updateAdminMutation.isLoading}>Cancel</Button>
                </OGDialogClose>
                <Button type="submit" variant="submit" disabled={updateAdminMutation.isLoading}>
                  {updateAdminMutation.isLoading ? <Spinner /> : 'Save Role'}
                </Button>
              </div>
            </form>
          </OGDialogContent>
        </OGDialog>
      )}
    </div>
  );
}
