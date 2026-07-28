import type { TokenUsageView } from '~/hooks/Chat/useTokenUsage';
import type { CurrencyConfig } from '~/utils';
import { groupToolTokens, formatTokens, formatCost } from '~/utils';
import { useLocalize, useAuthContext } from '~/hooks';
import { useGetStartupConfig, useGetUserBalance } from '~/data-provider';


interface RowProps {
  label: string;
  value: number;
  max?: number;
}

function Row({ label, value, max }: RowProps) {
  const percent = max != null && max > 0 ? Math.min((value / max) * 100, 100) : null;
  return (
    <div className="flex items-center justify-between gap-4 text-sm">
      <span className="text-text-secondary">{label}</span>
      <span className="font-medium text-text-primary">
        {formatTokens(value)}
        {percent != null && (
          <span className="ml-1 text-xs text-text-secondary" aria-hidden="true">
            ({Math.round(percent)}%)
          </span>
        )}
      </span>
    </div>
  );
}

interface BreakdownProps {
  view: TokenUsageView;
  showCost: boolean;
  currency?: CurrencyConfig;
}

export default function Breakdown({ view, showCost, currency }: BreakdownProps) {
  const localize = useLocalize();
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const balanceQuery = useGetUserBalance({
    enabled: !!isAuthenticated && !!startupConfig?.balance?.enabled,
  });
  const balanceData = balanceQuery.data;

  const { usedTokens, maxTokens, percent, snapshot, snapshotActive, branchUsage, hasUsage } = view;


  /** Show the all-branches total only when it (a) exceeds the active branch —
   *  epsilon guards against float summation order surfacing a spurious row in an
   *  unbranched conversation — and (b) has COMPLETE cost coverage, so a sibling
   *  branch saved without cost can't render an under-reported total. */
  const showTotal = view.totalUsage.costKnown && view.totalCost - view.branchCost > 1e-9;

  const breakdown = snapshotActive ? snapshot?.breakdown : undefined;
  const instructionTokens =
    snapshot?.effectiveInstructionTokens ?? breakdown?.instructionTokens ?? 0;
  const systemTokens =
    (breakdown?.systemMessageTokens ?? 0) + (breakdown?.dynamicInstructionTokens ?? 0);
  /** Summary has its own row, so exclude it (it's part of `usedTokens`) to avoid
   *  double-counting it inside the Messages row on a summarized turn. */
  const messageTokens = Math.max(
    0,
    usedTokens - instructionTokens - (breakdown?.summaryTokens ?? 0),
  );
  const freeTokens = maxTokens != null ? Math.max(0, maxTokens - usedTokens) : null;

  const groups =
    breakdown?.toolTokenCounts != null
      ? groupToolTokens(breakdown.toolTokenCounts, breakdown.deferredToolNames)
      : null;
  const toolRows =
    groups == null
      ? null
      : ([
          [localize('com_ui_context_tools_system'), groups.system],
          [localize('com_ui_context_tools_mcp'), groups.mcp],
          [localize('com_ui_skills'), groups.skills],
          [localize('com_ui_context_subagents'), groups.subagents],
          [localize('com_ui_context_tools_system_deferred'), groups.systemDeferred],
          [localize('com_ui_context_tools_mcp_deferred'), groups.mcpDeferred],
        ] as const);

  return (
    <div className="w-64 space-y-3" role="region" aria-label={localize('com_ui_context_usage')}>
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-primary">
          {localize('com_ui_context_window')}
        </span>
        <span className="text-xs font-medium text-text-secondary">
          {maxTokens != null
            ? `${formatTokens(usedTokens)} / ${formatTokens(maxTokens)} (${Math.round(percent)}%)`
            : formatTokens(usedTokens)}
        </span>
      </div>

      <div
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={maxTokens != null ? Math.round(percent) : undefined}
        aria-label={localize('com_ui_context_usage')}
        className="h-2 w-full overflow-hidden rounded-full bg-surface-tertiary"
      >
        {percent > 0 && (
          <div
            className="h-full rounded-full bg-text-primary transition-all duration-300"
            style={{ width: `${Math.min(percent, 100)}%` }}
          />
        )}
      </div>

      <div
        className="space-y-1.5"
        data-testid={breakdown ? 'context-breakdown' : 'context-estimate'}
      >
        {breakdown ? (
          <>
            <Row
              label={localize('com_ui_context_messages')}
              value={messageTokens}
              max={maxTokens}
            />
            {systemTokens > 0 && (
              <Row label={localize('com_ui_context_system')} value={systemTokens} max={maxTokens} />
            )}
            {toolRows != null ? (
              toolRows.map(
                ([label, value]) =>
                  value > 0 && <Row key={label} label={label} value={value} max={maxTokens} />,
              )
            ) : (
              <Row
                label={localize('com_ui_context_tools')}
                value={breakdown.toolSchemaTokens}
                max={maxTokens}
              />
            )}
            {breakdown.summaryTokens > 0 && (
              <Row
                label={localize('com_ui_context_summary')}
                value={breakdown.summaryTokens}
                max={maxTokens}
              />
            )}
            {freeTokens != null && (
              <Row label={localize('com_ui_context_free')} value={freeTokens} max={maxTokens} />
            )}
          </>
        ) : (
          <>
            {view.branchTotals.summaryBaseline > 0 && (
              <Row
                label={localize('com_ui_context_summary')}
                value={view.branchTotals.summaryBaseline}
                max={maxTokens}
              />
            )}
            <Row label={localize('com_ui_input')} value={view.branchTotals.input} />
            <Row
              label={localize('com_ui_output')}
              value={view.branchTotals.output + view.liveTokens}
            />
            {maxTokens == null && (
              <p className="text-xs text-text-secondary">{localize('com_ui_context_unknown')}</p>
            )}
            <p className="text-xs italic text-text-secondary">{localize('com_ui_estimated')}</p>
          </>
        )}
      </div>

      {hasUsage && (
        <>
          <div className="border-t border-border-light" role="separator" />
          <div className="space-y-1.5" data-testid="token-usage-totals">
            <Row label={localize('com_ui_input')} value={branchUsage.input} />
            <Row label={localize('com_ui_output')} value={branchUsage.output} />
            {branchUsage.cacheRead > 0 && (
              <Row label={localize('com_ui_cache_read')} value={branchUsage.cacheRead} />
            )}
            {branchUsage.cacheWrite > 0 && (
              <Row label={localize('com_ui_cache_write')} value={branchUsage.cacheWrite} />
            )}
          </div>
        </>
      )}

      {showCost && hasUsage && branchUsage.costKnown && (
        <>
          <div className="border-t border-border-light" role="separator" />
          <div className="space-y-1.5" data-testid="token-usage-cost">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-secondary">
                {showTotal
                  ? localize('com_ui_context_cost_branch')
                  : localize('com_ui_context_cost')}
              </span>
              <span className="font-medium text-text-primary">
                {formatCost(view.branchCost, currency)}
              </span>
            </div>
            {showTotal && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-secondary">{localize('com_ui_context_cost_total')}</span>
                <span className="text-text-secondary">{formatCost(view.totalCost, currency)}</span>
              </div>
            )}
          </div>
        </>
      )}

      {/* Subscription Quota Section */}
      {balanceData && (
        <>
          <div className="border-t border-border-light" role="separator" />
          <div className="space-y-1.5 text-xs text-text-secondary">
            <div className="flex justify-between items-center text-sm font-semibold text-text-primary">
              <span className="capitalize">{balanceData.plan} Plan</span>
              <span className="text-[10px] text-blue-500 uppercase font-semibold">Active</span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span>Consumed Quota:</span>
              <span className="font-mono font-medium text-text-primary">
                {formatTokens(balanceData.consumed || 0)} / {formatTokens(balanceData.quota || 0)}
              </span>
            </div>
            
            <div className="flex justify-between items-center text-xs">
              <span>Remaining Quota:</span>
              <span className="font-mono font-bold text-green-500">
                {formatTokens(balanceData.tokenCredits || 0)}
              </span>
            </div>
            
            {/* Progress bar for plan quota */}
            <div className="h-1.5 w-full bg-surface-tertiary rounded-full overflow-hidden mt-1">
              <div 
                className="h-full bg-green-500 rounded-full transition-all duration-300"
                style={{
                  width: `${Math.min(
                    ((balanceData.tokenCredits || 0) / (balanceData.quota || 1)) * 100,
                    100
                  )}%`
                }}
              />
            </div>
            
            {/* Display usage start date and next renewal time */}
            {(() => {
              const lastRefill = balanceData.lastRefill;
              const nextRefill = balanceData.nextRefillDate;
              
              if (!lastRefill && !nextRefill) return null;
              
              let nextTimeString = '';
              if (nextRefill) {
                const next = new Date(nextRefill);
                const now = new Date();
                const diffMs = next.getTime() - now.getTime();
                if (diffMs > 0) {
                  const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
                  const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                  const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
                  
                  if (days > 0) nextTimeString += `${days} ${localize('com_ui_days')} `;
                  if (hours > 0) nextTimeString += `${hours} ${localize('com_ui_hours')} `;
                  if (minutes > 0) nextTimeString += `${minutes} ${localize('com_ui_minutes')}`;
                  if (!nextTimeString) nextTimeString = localize('com_ui_less_than_minute');
                }
              }

              return (
                <div className="mt-2 space-y-1 pt-2 border-t border-border-light/50">
                  {lastRefill && (
                    <div className="flex justify-between items-center text-xs">
                      <span>{localize('com_ui_consumption_started')}:</span>
                      <span className="text-text-primary">
                        {new Date(lastRefill).toLocaleDateString()}
                      </span>
                    </div>
                  )}
                  {nextTimeString && (
                    <div className="flex justify-between items-center text-xs">
                      <span>{localize('com_ui_next_renewal')}:</span>
                      <span className="text-text-primary">
                        {nextTimeString.trim()}
                      </span>
                    </div>
                  )}
                </div>
              );
            })()}
          </div>
        </>
      )}
    </div>
  );
}

