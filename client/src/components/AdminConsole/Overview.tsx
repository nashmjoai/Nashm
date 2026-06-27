import {
  useGetAdminConsoleOverviewQuery,
} from '~/data-provider';
import {
  Users,
  Hourglass,
  Sparkles,
  Calculator,
  MessageSquare,
  Activity,
  CheckCircle2,
  XCircle,
} from 'lucide-react';
import { Spinner } from '@nashm/client';

export default function AdminConsoleOverview() {
  const { data, isLoading, error } = useGetAdminConsoleOverviewQuery();

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
        Failed to load overview data. Please check connection and try again.
      </div>
    );
  }

  const { totals = {}, topModels = [], topMessages = [], endpointHealth = [] } = data;

  const statCards = [
    {
      title: 'Total Users',
      value: totals.users ?? 0,
      icon: Users,
      color: 'text-blue-500 bg-blue-500/10 border-blue-500/20',
    },
    {
      title: 'Active Sessions',
      value: totals.activeSessions ?? 0,
      icon: Hourglass,
      color: 'text-green-500 bg-green-500/10 border-green-500/20',
    },
    {
      title: 'Total Subscribers',
      value: totals.subscribers ?? 0,
      icon: Sparkles,
      color: 'text-purple-500 bg-purple-500/10 border-purple-500/20',
    },
    {
      title: 'Tokens Used',
      value: (totals.tokens ?? 0).toLocaleString(),
      icon: Calculator,
      color: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    },
  ];

  return (
    <div className="flex flex-col gap-8">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        {statCards.map((card, idx) => {
          const Icon = card.icon;
          return (
            <div
              key={idx}
              className="p-6 rounded-2xl border border-border-light bg-surface-primary flex items-center justify-between shadow-sm"
            >
              <div className="flex flex-col gap-1">
                <span className="text-sm text-text-secondary font-medium">{card.title}</span>
                <span className="text-2xl font-bold tracking-tight">{card.value}</span>
              </div>
              <div className={`p-3 rounded-xl border ${card.color}`}>
                <Icon className="size-6" />
              </div>
            </div>
          );
        })}
      </div>

      {/* Top Models and Top Queries */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Top Models */}
        <div className="p-6 rounded-2xl border border-border-light bg-surface-primary shadow-sm flex flex-col gap-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <Calculator className="size-5 text-blue-500" />
            Top Models by Tokens Consumed
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-light text-text-secondary font-semibold">
                  <th className="pb-3">Model Name</th>
                  <th className="pb-3 text-right">Tokens Used</th>
                  <th className="pb-3 text-right">Requests</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {topModels.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="py-4 text-center text-text-secondary">
                      No model activity recorded yet.
                    </td>
                  </tr>
                ) : (
                  topModels.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="py-3 font-mono text-xs text-text-primary">{item.model}</td>
                      <td className="py-3 text-right font-medium">{item.totalTokens.toLocaleString()}</td>
                      <td className="py-3 text-right text-text-secondary">{item.requests.toLocaleString()}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Top User Message Queries */}
        <div className="p-6 rounded-2xl border border-border-light bg-surface-primary shadow-sm flex flex-col gap-4">
          <h3 className="text-base font-bold flex items-center gap-2">
            <MessageSquare className="size-5 text-purple-500" />
            Top Message Prompts
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="border-b border-border-light text-text-secondary font-semibold">
                  <th className="pb-3">Prompt Excerpt</th>
                  <th className="pb-3 text-right w-24">Usage Count</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light">
                {topMessages.length === 0 ? (
                  <tr>
                    <td colSpan={2} className="py-4 text-center text-text-secondary">
                      No messages recorded yet.
                    </td>
                  </tr>
                ) : (
                  topMessages.map((item: any, idx: number) => (
                    <tr key={idx} className="hover:bg-surface-secondary/50 transition-colors">
                      <td className="py-3 text-text-primary max-w-xs truncate">{item.text}</td>
                      <td className="py-3 text-right font-semibold text-text-secondary">{item.count}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Endpoint Connection Health Checklist */}
      <div className="p-6 rounded-2xl border border-border-light bg-surface-primary shadow-sm flex flex-col gap-4">
        <h3 className="text-base font-bold flex items-center gap-2">
          <Activity className="size-5 text-green-500" />
          API Endpoint Connection Status
        </h3>
        <p className="text-sm text-text-secondary -mt-2">
          Verifies that models are loaded and available for each active API provider endpoint.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-2">
          {endpointHealth.map((health: any, idx: number) => {
            const isOk = health.status === 'available';
            return (
              <div
                key={idx}
                className={`p-5 rounded-xl border flex items-center justify-between ${
                  isOk
                    ? 'border-green-500/20 bg-green-500/5'
                    : 'border-red-500/20 bg-red-500/5'
                }`}
              >
                <div className="flex flex-col gap-1">
                  <span className="font-semibold text-sm capitalize">{health.endpoint}</span>
                  <span className="text-xs text-text-secondary">{health.modelCount} active models</span>
                </div>
                <div>
                  {isOk ? (
                    <div className="flex items-center gap-1.5 text-green-500 font-semibold text-sm">
                      <CheckCircle2 className="size-5" />
                      Active
                    </div>
                  ) : (
                    <div className="flex items-center gap-1.5 text-red-500 font-semibold text-sm">
                      <XCircle className="size-5" />
                      Offline
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
