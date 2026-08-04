import { useState } from 'react';
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
import { useQueryClient } from '@tanstack/react-query';
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import type { TranslationKeys } from '~/hooks';
import { useGetPublicPlansQuery } from '~/data-provider';

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  onUpgradeSuccess: () => void;
};

export function UpgradeModal({
  open,
  onOpenChange,
  currentPlan,
  onUpgradeSuccess,
}: UpgradeModalProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const queryClient = useQueryClient();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { data: publicPlansData } = useGetPublicPlansQuery();
  const renewalLabels: Record<string, TranslationKeys> = {
    daily: 'com_subscription_plan_renewal_daily',
    weekly: 'com_subscription_plan_renewal_weekly',
    monthly: 'com_subscription_plan_renewal_monthly',
    yearly: 'com_subscription_plan_renewal_yearly',
  };

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      nameAr: 'الخطة المجانية',
      price: '$0',
      priceDetail: 'Forever free',
      priceDetailAr: 'مجانية للأبد',
      context: '100k',
      quota: '50,000',
      renewalPeriod: 'monthly',
      features: ['100k Context Window limit', 'Usage renews monthly', 'Standard response speed'],
      featuresAr: ['حد نافذة سياق 100k توكن', 'يتجدد الاستخدام شهرياً', 'سرعة استجابة عادية'],
    },
    {
      id: 'individual',
      name: 'Individual Plan',
      nameAr: 'الخطة الفردية',
      price: '$10',
      priceDetail: 'per user / month',
      priceDetailAr: 'لكل مستخدم / شهرياً',
      context: '500k',
      quota: '500,000',
      renewalPeriod: 'monthly',
      features: [
        '500k Context Window limit',
        'Usage renews monthly',
        'Faster response times',
        'Priority support',
      ],
      featuresAr: [
        'حد نافذة سياق 500k توكن',
        'يتجدد الاستخدام شهرياً',
        'سرعة استجابة فائقة',
        'دعم فني ذو أولوية',
      ],
    },
    {
      id: 'family',
      name: 'Family Plan',
      nameAr: 'الخطة العائلية',
      price: '$20',
      priceDetail: 'per family / month',
      priceDetailAr: 'للعائلة / شهرياً',
      context: '1M',
      quota: '1,000,000',
      renewalPeriod: 'monthly',
      features: [
        '1M Context Window limit',
        'Usage renews monthly',
        'Up to 5 family members',
        'Shared family dashboard',
      ],
      featuresAr: [
        'حد نافذة سياق 1M توكن',
        'يتجدد الاستخدام شهرياً',
        'حتى 5 أفراد من العائلة',
        'لوحة تحكم عائلية مشتركة',
      ],
    },
    {
      id: 'developer',
      name: 'Developer Plan',
      nameAr: 'خطة المطورين',
      price: '$40',
      priceDetail: 'per developer / month',
      priceDetailAr: 'للمطور / شهرياً',
      context: '2M',
      quota: '2,000,000',
      renewalPeriod: 'monthly',
      features: [
        '2M Context Window limit',
        'Usage renews monthly',
        'API & SDK Access',
        'Dedicated server processing',
      ],
      featuresAr: [
        'حد نافذة سياق 2M توكن',
        'يتجدد الاستخدام شهرياً',
        'وصول لواجهة برمجية التطبيقات API',
        'معالجة سيرفر خاصة وفائقة السرعة',
      ],
    },
  ];

  const backendPlans = publicPlansData?.plans || [];
  const dynamicPlans =
    backendPlans.length > 0
      ? backendPlans.map((bp: any) => {
          const basePlan =
            plans.find((p) => p.id.toLowerCase() === bp.plan.toLowerCase()) || plans[0];
          return {
            id: bp.plan,
            name: bp.displayName || basePlan.name,
            nameAr: bp.displayName || basePlan.nameAr,
            price: bp.priceText || basePlan.price,
            priceDetail: bp.priceText ? '' : basePlan.priceDetail,
            priceDetailAr: bp.priceText ? '' : basePlan.priceDetailAr,
            context: basePlan.context,
            quota:
              bp.tokenQuota !== undefined && bp.tokenQuota !== null
                ? bp.tokenQuota.toLocaleString()
                : basePlan.quota,
            renewalPeriod: bp.renewalPeriod ?? basePlan.renewalPeriod,
            features: bp.features && bp.features.length > 0 ? bp.features : basePlan.features,
            featuresAr: bp.features && bp.features.length > 0 ? bp.features : basePlan.featuresAr,
          };
        })
      : plans;

  const handleUpgrade = async (planId: string) => {
    if (planId === currentPlan) return;
    setIsLoading(planId);
    try {
      const response = await fetch('/api/balance/upgrade', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ plan: planId }),
      });

      if (!response.ok) {
        throw new Error('Upgrade failed');
      }

      showToast({
        message: `Plan successfully changed to ${planId}!`,
        severity: NotificationSeverity.SUCCESS,
        showIcon: true,
      });

      // Invalidate all subscription-related cache to reflect new plan benefits immediately
      await Promise.all([
        queryClient.invalidateQueries(['balance']),
        queryClient.invalidateQueries(['familyPlan']),
        queryClient.invalidateQueries(['familyPlanActivity']),
        queryClient.invalidateQueries(['user']),
      ]);

      onUpgradeSuccess();
      onOpenChange(false);
    } catch (err) {
      console.error(err);
      showToast({
        message: 'Failed to upgrade plan. Please try again.',
        severity: NotificationSeverity.ERROR,
        showIcon: true,
      });
    } finally {
      setIsLoading(null);
    }
  };

  const isArabic = localize('com_nav_subscription' as any) === undefined; // Check if Arabic or default
  const getPlanAction = (planId: string, isCurrent: boolean) => {
    if (isLoading === planId) {
      return <Spinner />;
    }
    if (isCurrent) {
      return isArabic ? 'نشط حالياً' : 'Currently Active';
    }
    return isArabic ? 'ترقية الآن' : 'Upgrade Now';
  };

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="max-h-[90vh] w-11/12 max-w-5xl overflow-y-auto border-border-light bg-surface-primary p-6 text-text-primary">
        <OGDialogHeader className="mb-6 text-center">
          <OGDialogTitle className="w-full text-center text-2xl font-bold">
            {isArabic ? 'ترقية الاشتراك الحالي' : 'Upgrade Subscription'}
          </OGDialogTitle>
          <p className="mt-2 text-sm text-text-secondary">
            {isArabic
              ? 'اختر الخطة الأنسب لاحتياجاتك.'
              : 'Choose the plan that best fits your needs.'}
          </p>
        </OGDialogHeader>

        <div className="my-4 grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
          {dynamicPlans.map((plan) => {
            const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between rounded-2xl border p-5 transition-all duration-300 ${
                  isCurrent
                    ? 'scale-[1.02] border-green-500 bg-green-500/5 shadow-lg dark:bg-green-500/10'
                    : 'border-border-light bg-surface-secondary hover:border-border-medium hover:shadow-md'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-green-500 px-3 py-1 text-[10px] font-bold uppercase text-white">
                    {isArabic ? 'الخطة الحالية' : 'Current Plan'}
                  </span>
                )}

                <div>
                  <h3 className="text-lg font-bold text-text-primary">
                    {isArabic ? plan.nameAr : plan.name}
                  </h3>
                  <div className="mt-4 flex items-baseline">
                    <span className="text-3xl font-extrabold tracking-tight text-text-primary">
                      {plan.price}
                    </span>
                    <span className="ml-1 text-xs text-text-secondary">
                      {isArabic ? plan.priceDetailAr : plan.priceDetail}
                    </span>
                  </div>

                  <div className="border-border-light/50 mt-4 border-t pt-3 text-xs text-text-secondary">
                    <div className="flex justify-between py-1">
                      <span>{isArabic ? 'نافذة السياق:' : 'Context Window:'}</span>
                      <span className="font-bold text-text-primary">{plan.context}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>{localize('com_subscription_plan_renewal')}:</span>
                      <span className="font-bold text-text-primary">
                        {localize(renewalLabels[plan.renewalPeriod] ?? renewalLabels.monthly)}
                      </span>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-text-secondary">
                    {(isArabic ? plan.featuresAr : plan.features).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full bg-green-500" />
                        <span>{feat}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <div className="mt-8">
                  <Button
                    onClick={() => handleUpgrade(plan.id)}
                    className="w-full rounded-xl py-2.5 text-xs font-semibold"
                    variant={isCurrent ? 'outline' : 'submit'}
                    disabled={isCurrent || isLoading !== null}
                  >
                    {getPlanAction(plan.id, isCurrent)}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-3 border-t border-border-light pt-6">
          <OGDialogClose asChild>
            <Button type="button" variant="outline" disabled={isLoading !== null}>
              {isArabic ? 'إغلاق' : 'Close'}
            </Button>
          </OGDialogClose>
        </div>
      </OGDialogContent>
    </OGDialog>
  );
}
