import { useState } from 'react';
import {
  useGetAdminConsoleTicketsQuery,
  useUpdateAdminConsoleTicketMutation,
} from '~/data-provider';
import {
  Search,
  ChevronLeft,
  ChevronRight,
  Ticket,
  Mail,
  AlertTriangle,
  CheckCircle,
  Eye,
} from 'lucide-react';
import {
  OGDialog,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  OGDialogClose,
  Button,
  Spinner,
  useToastContext,
} from '@nashm/client';
import { NotificationSeverity } from '~/common';

const STATUS_FILTERS = ['all', 'open', 'reviewed', 'resolved'] as const;

export default function AdminConsoleTickets() {
  const { showToast } = useToastContext();
  const [selectedStatusFilter, setSelectedStatusFilter] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 10;
  const offset = (page - 1) * limit;

  // Modal / Detail state
  const [viewingTicket, setViewingTicket] = useState<any>(null);

  // Query tickets
  const queryParams: Record<string, any> = {
    limit,
    offset,
  };
  if (selectedStatusFilter !== 'all') {
    queryParams.status = selectedStatusFilter;
  }

  const { data, isLoading, error, refetch } = useGetAdminConsoleTicketsQuery(queryParams);

  const updateTicketMutation = useUpdateAdminConsoleTicketMutation({
    onSuccess: () => {
      showToast({
        message: 'Ticket status updated successfully!',
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });
      refetch();
    },
    onError: (err: any) => {
      showToast({
        message: err?.response?.data?.error || 'Failed to update ticket status.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    },
  });

  const handleStatusChange = (ticketId: string, newStatus: string) => {
    updateTicketMutation.mutate({ id: ticketId, status: newStatus });
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
        Failed to load support tickets. Please check connection and try again.
      </div>
    );
  }

  const { tickets = [], total = 0 } = data || {};
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex flex-col gap-6">
      {/* Header and Filter Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 bg-surface-primary border border-border-light p-4 rounded-xl shadow-sm">
        <div className="flex flex-wrap items-center gap-1.5">
          {STATUS_FILTERS.map((filter) => (
            <button
              key={filter}
              onClick={() => {
                setSelectedStatusFilter(filter);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-all duration-200 ${
                selectedStatusFilter === filter
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-text-secondary hover:bg-surface-secondary hover:text-text-primary'
              }`}
            >
              {filter}
            </button>
          ))}
        </div>
        <div className="text-xs text-text-secondary font-medium">
          Total: {total} Tickets
        </div>
      </div>

      {/* Tickets Table */}
      <div className="border border-border-light rounded-2xl bg-surface-primary shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm border-collapse">
            <thead>
              <tr className="border-b border-border-light bg-surface-secondary/50 text-text-secondary font-semibold">
                <th className="p-4">User</th>
                <th className="p-4">Subject</th>
                <th className="p-4">Date</th>
                <th className="p-4">Email Status</th>
                <th className="p-4">Ticket Status</th>
                <th className="p-4 text-center">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border-light">
              {tickets.length === 0 ? (
                <tr>
                  <td colSpan={6} className="p-8 text-center text-text-secondary italic">
                    No tickets found matching the selected filters.
                  </td>
                </tr>
              ) : (
                tickets.map((ticket: any) => (
                  <tr key={ticket.id} className="hover:bg-surface-secondary/30 transition-colors">
                    {/* User info */}
                    <td className="p-4">
                      <div className="flex flex-col">
                        <span className="font-semibold text-text-primary leading-snug">
                          {ticket.name || 'Anonymous User'}
                        </span>
                        <span className="text-xs text-text-secondary font-mono">{ticket.email}</span>
                      </div>
                    </td>

                    {/* Subject */}
                    <td className="p-4 max-w-xs">
                      <div className="flex flex-col gap-0.5">
                        <span className="font-medium text-text-primary truncate">{ticket.subject}</span>
                        <p className="text-xs text-text-secondary line-clamp-1">{ticket.message}</p>
                      </div>
                    </td>

                    {/* Date */}
                    <td className="p-4 text-xs text-text-secondary font-medium">
                      {ticket.createdAt ? new Date(ticket.createdAt).toLocaleString() : 'N/A'}
                    </td>

                    {/* Email Status */}
                    <td className="p-4">
                      <div className="flex items-center gap-1.5">
                        {ticket.emailStatus === 'sent' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1">
                            <CheckCircle className="size-3" />
                            Sent
                          </span>
                        )}
                        {ticket.emailStatus === 'failed' && (
                          <span
                            className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-red-500/10 text-red-500 border-red-500/20 flex items-center gap-1 cursor-pointer"
                            title={ticket.emailError || 'Email delivery failed'}
                          >
                            <AlertTriangle className="size-3" />
                            Failed
                          </span>
                        )}
                        {ticket.emailStatus === 'skipped' && (
                          <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-surface-tertiary text-text-secondary border-border-light flex items-center gap-1">
                            <Mail className="size-3" />
                            Skipped
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Ticket Status Selector */}
                    <td className="p-4">
                      <select
                        value={ticket.status}
                        onChange={(e) => handleStatusChange(ticket.id, e.target.value)}
                        className={`rounded-lg border border-border-light bg-transparent px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring-primary transition-all duration-200 cursor-pointer ${
                          ticket.status === 'open'
                            ? 'text-red-500 bg-red-500/10 border-red-500/20'
                            : ticket.status === 'reviewed'
                            ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                            : 'text-green-500 bg-green-500/10 border-green-500/20'
                        }`}
                      >
                        <option value="open">Open</option>
                        <option value="reviewed">Reviewed</option>
                        <option value="resolved">Resolved</option>
                      </select>
                    </td>

                    {/* Action buttons */}
                    <td className="p-4 text-center">
                      <button
                        onClick={() => setViewingTicket(ticket)}
                        className="p-1.5 rounded-lg text-text-secondary hover:text-blue-500 hover:bg-blue-500/10 transition-colors inline-flex items-center gap-1.5 text-xs font-medium border border-border-light hover:border-blue-500/30"
                      >
                        <Eye className="size-3.5" />
                        View Ticket
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
              Showing {offset + 1} to {Math.min(offset + limit, total)} of {total} tickets
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

      {/* Ticket Detail Modal */}
      {viewingTicket && (
        <OGDialog open={!!viewingTicket} onOpenChange={() => setViewingTicket(null)}>
          <OGDialogContent className="w-11/12 max-w-2xl border-border-light bg-surface-primary text-text-primary p-6">
            <OGDialogHeader>
              <OGDialogTitle className="flex items-center gap-2 text-lg">
                <Ticket className="size-5 text-blue-500" />
                Support Ticket Details
              </OGDialogTitle>
            </OGDialogHeader>

            <div className="flex flex-col gap-4 mt-6">
              {/* Metadata row */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-4 rounded-xl border border-border-light bg-surface-secondary/50">
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase">Submitted By</span>
                  <span className="text-sm font-medium truncate">{viewingTicket.name || 'Anonymous'}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase">Email</span>
                  <span className="text-sm font-mono truncate">{viewingTicket.email}</span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase">Submitted On</span>
                  <span className="text-sm font-medium">
                    {viewingTicket.createdAt ? new Date(viewingTicket.createdAt).toLocaleDateString() : 'N/A'}
                  </span>
                </div>
                <div className="flex flex-col gap-0.5">
                  <span className="text-[10px] text-text-secondary font-semibold uppercase">User ID</span>
                  <span className="text-xs font-mono truncate" title={viewingTicket.userId}>{viewingTicket.userId}</span>
                </div>
              </div>

              {/* Status and email delivery details */}
              <div className="flex flex-wrap gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-semibold uppercase">Ticket Status:</span>
                  <select
                    value={viewingTicket.status}
                    onChange={(e) => {
                      handleStatusChange(viewingTicket.id, e.target.value);
                      setViewingTicket((prev: any) => ({ ...prev, status: e.target.value }));
                    }}
                    className={`rounded-lg border border-border-light bg-transparent px-2.5 py-1 text-xs font-semibold focus:outline-none focus:ring-1 focus:ring-ring-primary transition-all duration-200 cursor-pointer ${
                      viewingTicket.status === 'open'
                        ? 'text-red-500 bg-red-500/10 border-red-500/20'
                        : viewingTicket.status === 'reviewed'
                        ? 'text-amber-500 bg-amber-500/10 border-amber-500/20'
                        : 'text-green-500 bg-green-500/10 border-green-500/20'
                    }`}
                  >
                    <option value="open">Open</option>
                    <option value="reviewed">Reviewed</option>
                    <option value="resolved">Resolved</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-text-secondary font-semibold uppercase">Email Delivery:</span>
                  <span className="flex items-center gap-1">
                    {viewingTicket.emailStatus === 'sent' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-green-500/10 text-green-500 border-green-500/20 flex items-center gap-1">
                        <CheckCircle className="size-3" />
                        Sent
                      </span>
                    )}
                    {viewingTicket.emailStatus === 'failed' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-red-500/10 text-red-500 border-red-500/20 flex items-center gap-1">
                        <AlertTriangle className="size-3" />
                        Failed
                      </span>
                    )}
                    {viewingTicket.emailStatus === 'skipped' && (
                      <span className="text-xs px-2 py-0.5 rounded-full font-semibold border bg-surface-tertiary text-text-secondary border-border-light flex items-center gap-1">
                        <Mail className="size-3" />
                        Skipped
                      </span>
                    )}
                  </span>
                </div>
              </div>

              {viewingTicket.emailError && (
                <div className="p-3 border border-red-500/20 bg-red-500/5 text-xs text-red-500 rounded-lg font-mono">
                  <strong>Email Error:</strong> {viewingTicket.emailError}
                </div>
              )}

              {/* Subject */}
              <div className="flex flex-col gap-1 mt-2">
                <span className="text-xs font-semibold text-text-secondary uppercase">Subject</span>
                <div className="p-3 border border-border-light bg-surface-secondary/30 rounded-lg font-semibold text-text-primary text-sm">
                  {viewingTicket.subject}
                </div>
              </div>

              {/* Message */}
              <div className="flex flex-col gap-1">
                <span className="text-xs font-semibold text-text-secondary uppercase">Message</span>
                <div className="p-4 border border-border-light bg-surface-secondary/30 rounded-lg text-text-primary text-sm whitespace-pre-wrap leading-relaxed max-h-64 overflow-y-auto">
                  {viewingTicket.message}
                </div>
              </div>

              {/* Close footer */}
              <div className="flex justify-end gap-3 pt-4 border-t border-border-light mt-2">
                <OGDialogClose asChild>
                  <Button variant="outline">Close Details</Button>
                </OGDialogClose>
              </div>
            </div>
          </OGDialogContent>
        </OGDialog>
      )}
    </div>
  );
}
