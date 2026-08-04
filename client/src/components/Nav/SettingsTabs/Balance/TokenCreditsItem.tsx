import React from 'react';
import { Label } from '@nashm/client';
import { useLocalize } from '~/hooks';

interface TokenCreditsItemProps {
  plan?: string;
  usage?: {
    consumed: number;
    remaining: number;
  };
}

const TokenCreditsItem: React.FC<TokenCreditsItemProps> = ({ plan, usage }) => {
  const localize = useLocalize();
  const formatAmount = (amount: number): string =>
    new Intl.NumberFormat().format(Math.round(amount));

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="font-light">{localize('com_nav_subscription')}</Label>
        <span
          className="text-sm font-medium capitalize text-gray-800 dark:text-gray-200"
          role="note"
        >
          {plan ?? '-'}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{localize('com_subscription_usage_consumed')}</span>
        <span className="font-medium text-text-primary" role="note">
          {usage ? formatAmount(usage.consumed) : '-'}
        </span>
      </div>
      <div className="flex items-center justify-between text-sm">
        <span className="text-text-secondary">{localize('com_subscription_usage_remaining')}</span>
        <span className="font-medium text-text-primary" role="note">
          {usage ? formatAmount(usage.remaining) : '-'}
        </span>
      </div>
    </div>
  );
};

export default TokenCreditsItem;
