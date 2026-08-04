import { useState } from 'react';
import type { SystemErrorLogItem } from 'nashm-data-provider';
import { AlertTriangle, ChevronLeft, ChevronRight, Eye, ShieldAlert } from 'lucide-react';
import {
  Button,
  OGDialog,
  OGDialogClose,
  OGDialogContent,
  OGDialogHeader,
  OGDialogTitle,
  Spinner,
} from '@nashm/client';
import { useGetAdminConsoleErrorsQuery } from '~/data-provider';

const pageSize = 20;

function severityClass(severity: SystemErrorLogItem['severity']) {
  if (severity === 'critical') {
    return 'border-red-500/25 bg-red-500/10 text-red-500';
  }
  if (severity === 'error') {
    return 'border-orange-500/25 bg-orange-500/10 text-orange-500';
  }
  return 'border-amber-500/25 bg-amber-500/10 text-amber-500';
}

function formatPlans(plans?: string[]) {
  return plans?.map((plan) => plan.charAt(0).toUpperCase() + plan.slice(1)).join(', ') || '—';
}

export default function AdminConsoleErrors() {
  const [page, setPage] = useState(1);
  const [codeFilter, setCodeFilter] = useState('');
  const [selectedError, setSelectedError] = useState<SystemErrorLogItem | null>(null);
  const offset = (page - 1) * pageSize;
  const code = codeFilter.trim().toUpperCase();
  const { data, isLoading, error } = useGetAdminConsoleErrorsQuery({
    limit: pageSize,
    offset,
    ...(code ? { code } : {}),
  });

  const errors = data?.errors ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-3 rounded-xl border border-border-light bg-surface-primary p-4 shadow-sm sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="flex items-center gap-2 font-semibold text-text-primary">
            <ShieldAlert className="size-5 text-amber-500" />
            User-facing error activity
          </h3>
          <p className="mt-1 text-xs text-text-secondary">
            Safe request context for troubleshooting. Passwords, prompts, and technical stack
            details are never recorded here.
          </p>
        </div>
        <input
          value={codeFilter}
          onChange={(event) => {
            setCodeFilter(event.target.value);
            setPage(1);
          }}
          placeholder="Filter by error code"
          className="w-full rounded-lg border border-border-light bg-transparent px-3 py-2 text-sm text-text-primary outline-none transition focus:ring-2 focus:ring-ring-primary sm:w-52"
          aria-label="Filter error activity by error code"
        />
      </div>

      {isLoading && page === 1 ? (
        <div className="flex h-64 items-center justify-center">
          <Spinner className="size-8" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-6 text-center text-red-500">
          Error activity could not be loaded. Please try again.
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border-light bg-surface-primary shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[850px] border-collapse text-left text-sm">
              <thead>
                <tr className="bg-surface-secondary/50 border-b border-border-light text-text-secondary">
                  <th className="p-4 font-semibold">When</th>
                  <th className="p-4 font-semibold">Event</th>
                  <th className="p-4 font-semibold">User</th>
                  <th className="p-4 font-semibold">Request</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 text-center font-semibold">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {errors.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-10 text-center text-text-secondary">
                      No user-facing errors match this filter.
                    </td>
                  </tr>
                ) : (
                  errors.map((entry) => (
                    <tr key={entry.id} className="hover:bg-surface-secondary/30 transition-colors">
                      <td className="p-4 text-xs text-text-secondary">
                        {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : 'Unknown'}
                      </td>
                      <td className="p-4">
                        <div className="flex flex-col gap-1">
                          <span className="font-medium text-text-primary">{entry.title}</span>
                          <span className="font-mono text-xs text-text-secondary">
                            {entry.code}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 text-xs text-text-secondary">
                        {entry.userEmail ?? 'Guest or unavailable'}
                      </td>
                      <td className="p-4 font-mono text-xs text-text-secondary">
                        {entry.method} {entry.route}
                      </td>
                      <td className="p-4">
                        <span
                          className={`inline-flex rounded-full border px-2 py-0.5 text-xs font-semibold ${severityClass(entry.severity)}`}
                        >
                          {entry.statusCode} · {entry.severity}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => setSelectedError(entry)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-border-light px-2.5 py-1.5 text-xs font-medium text-text-secondary transition-colors hover:border-blue-500/30 hover:bg-blue-500/10 hover:text-blue-500"
                        >
                          <Eye className="size-3.5" />
                          View
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {total > pageSize && (
            <div className="bg-surface-secondary/50 flex items-center justify-between border-t border-border-light p-4">
              <span className="text-xs text-text-secondary">
                Showing {offset + 1}–{Math.min(offset + pageSize, total)} of {total} events
              </span>
              <div className="flex items-center gap-2">
                <button
                  disabled={page === 1}
                  onClick={() => setPage((value) => value - 1)}
                  className="rounded-lg border border-border-light p-2 text-text-secondary transition hover:bg-surface-primary disabled:opacity-50"
                  aria-label="Previous error activity page"
                >
                  <ChevronLeft className="size-4" />
                </button>
                <span className="text-xs font-medium text-text-primary">
                  Page {page} of {totalPages}
                </span>
                <button
                  disabled={page === totalPages}
                  onClick={() => setPage((value) => value + 1)}
                  className="rounded-lg border border-border-light p-2 text-text-secondary transition hover:bg-surface-primary disabled:opacity-50"
                  aria-label="Next error activity page"
                >
                  <ChevronRight className="size-4" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <OGDialog open={selectedError !== null} onOpenChange={() => setSelectedError(null)}>
        <OGDialogContent className="w-11/12 max-w-xl border-border-light bg-surface-primary p-6 text-text-primary">
          <OGDialogHeader>
            <OGDialogTitle className="flex items-center gap-2">
              <AlertTriangle className="size-5 text-amber-500" />
              Error activity details
            </OGDialogTitle>
          </OGDialogHeader>
          {selectedError && (
            <div className="mt-4 grid gap-4 text-sm">
              <p className="rounded-lg bg-surface-secondary p-3 text-text-secondary">
                {selectedError.message}
              </p>
              <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2 text-sm">
                <dt className="text-text-secondary">Reference</dt>
                <dd className="font-mono text-xs">{selectedError.reference}</dd>
                <dt className="text-text-secondary">Code</dt>
                <dd>{selectedError.code}</dd>
                <dt className="text-text-secondary">Request</dt>
                <dd className="font-mono text-xs">
                  {selectedError.method} {selectedError.route}
                </dd>
                <dt className="text-text-secondary">User</dt>
                <dd>{selectedError.userEmail ?? 'Guest or unavailable'}</dd>
                <dt className="text-text-secondary">Model</dt>
                <dd>{selectedError.details?.model ?? '—'}</dd>
                <dt className="text-text-secondary">Current plan</dt>
                <dd className="capitalize">{selectedError.details?.currentPlan ?? '—'}</dd>
                <dt className="text-text-secondary">Required plans</dt>
                <dd>{formatPlans(selectedError.details?.requiredPlans)}</dd>
                <dt className="text-text-secondary">Model usage</dt>
                <dd>
                  {selectedError.details?.tokenLimit !== undefined
                    ? `${selectedError.details.tokensUsed ?? 0} / ${selectedError.details.tokenLimit} tokens`
                    : '—'}
                </dd>
              </dl>
            </div>
          )}
          <div className="mt-6 flex justify-end">
            <OGDialogClose asChild>
              <Button variant="outline">Close</Button>
            </OGDialogClose>
          </div>
        </OGDialogContent>
      </OGDialog>
    </div>
  );
}
