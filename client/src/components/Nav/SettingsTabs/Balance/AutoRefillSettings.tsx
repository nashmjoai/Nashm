import React from 'react';
import { Label, InfoHoverCard, ESide } from '@nashm/client';

import type { TBalanceResponse } from 'nashm-data-provider';

import { useLocalize } from '~/hooks';

interface AutoRefillSettingsProps {
  lastRefill: NonNullable<TBalanceResponse['lastRefill']>;
  renewsAt: NonNullable<TBalanceResponse['subscriptionUsage']>['renewsAt'];
}

const AutoRefillSettings: React.FC<AutoRefillSettingsProps> = ({ lastRefill, renewsAt }) => {
  const localize = useLocalize();

  const lastRefillDate = lastRefill ? new Date(lastRefill) : null;
  const renewalDate = renewsAt ? new Date(renewsAt) : null;

  return (
    <div className="space-y-4">
      <h3 className="text-lg font-medium">{localize('com_subscription_usage_period')}</h3>
      <div className="mb-1 flex justify-between text-sm">
        <span>{localize('com_ui_consumption_started')}</span>
        <span>{lastRefillDate ? lastRefillDate.toLocaleString() : '-'}</span>
      </div>
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-2">
          <Label className="font-light">{localize('com_subscription_usage_renews_at')}</Label>
          <InfoHoverCard
            side={ESide.Bottom}
            text={localize('com_subscription_usage_renewal_info')}
          />
        </div>

        <span className="text-sm font-medium text-gray-800 dark:text-gray-200" role="note">
          {renewalDate ? renewalDate.toLocaleString() : '-'}
        </span>
      </div>
    </div>
  );
};

export default AutoRefillSettings;
