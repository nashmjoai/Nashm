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
import { NotificationSeverity } from '~/common';
import { useLocalize } from '~/hooks';
import { useGetPublicPlansQuery } from '~/data-provider';

type UpgradeModalProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPlan: string;
  onUpgradeSuccess: () => void;
};

export function UpgradeModal({ open, onOpenChange, currentPlan, onUpgradeSuccess }: UpgradeModalProps) {
  const localize = useLocalize();
  const { showToast } = useToastContext();
  const [isLoading, setIsLoading] = useState<string | null>(null);
  const { data: publicPlansData } = useGetPublicPlansQuery();

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
      features: [
        '100k Context Window limit',
        '50k monthly tokens quota',
        'Standard response speed',
      ],
      featuresAr: [
        'حد نافذة سياق 100k توكن',
        'رصيد شهري 50k توكن',
        'سرعة استجابة عادية',
      ],
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
      features: [
        '500k Context Window limit',
        '500k monthly tokens quota',
        'Faster response times',
        'Priority support',
      ],
      featuresAr: [
        'حد نافذة سياق 500k توكن',
        'رصيد شهري 500k توكن',
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
      features: [
        '1M Context Window limit',
        '1,000,000 monthly tokens quota',
        'Up to 5 family members',
        'Shared family dashboard',
      ],
      featuresAr: [
        'حد نافذة سياق 1M توكن',
        'رصيد شهري 1,000,000 توكن',
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
      features: [
        '2M Context Window limit',
        '2,000,000 monthly tokens quota',
        'API & SDK Access',
        'Dedicated server processing',
      ],
      featuresAr: [
        'حد نافذة سياق 2M توكن',
        'رصيد شهري 2,000,000 توكن',
        'وصول لواجهة برمجية التطبيقات API',
        'معالجة سيرفر خاصة وفائقة السرعة',
      ],
    },
  ];

  const backendPlans = publicPlansData?.plans || [];
  const dynamicPlans = backendPlans.length > 0
    ? backendPlans.map((bp: any) => {
        const basePlan = plans.find((p) => p.id.toLowerCase() === bp.plan.toLowerCase()) || plans[0];
        return {
          id: bp.plan,
          name: bp.displayName || basePlan.name,
          nameAr: bp.displayName || basePlan.nameAr,
          price: bp.priceText || basePlan.price,
          priceDetail: bp.priceText ? '' : basePlan.priceDetail,
          priceDetailAr: bp.priceText ? '' : basePlan.priceDetailAr,
          context: basePlan.context,
          quota: bp.tokenQuota !== undefined && bp.tokenQuota !== null ? bp.tokenQuota.toLocaleString() : basePlan.quota,
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

  return (
    <OGDialog open={open} onOpenChange={onOpenChange}>
      <OGDialogContent className="w-11/12 max-w-5xl border-border-light bg-surface-primary text-text-primary p-6 max-h-[90vh] overflow-y-auto">
        <OGDialogHeader className="text-center mb-6">
          <OGDialogTitle className="text-2xl font-bold text-center w-full">
            {isArabic ? 'ترقية الاشتراك الحالي' : 'Upgrade Subscription'}
          </OGDialogTitle>
          <p className="text-sm text-text-secondary mt-2">
            {isArabic
              ? 'اختر الخطة المناسبة لاحتياجاتك لتوسيع سعة ذاكرة المحادثة ورصيد الرموز.'
              : 'Choose the best plan for your needs to expand memory capacity and token quota.'}
          </p>
        </OGDialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 my-4">
          {dynamicPlans.map((plan) => {
            const isCurrent = currentPlan.toLowerCase() === plan.id.toLowerCase();
            return (
              <div
                key={plan.id}
                className={`relative flex flex-col justify-between p-5 rounded-2xl border transition-all duration-300 ${
                  isCurrent
                    ? 'border-green-500 bg-green-500/5 dark:bg-green-500/10 shadow-lg scale-[1.02]'
                    : 'border-border-light bg-surface-secondary hover:border-border-medium hover:shadow-md'
                }`}
              >
                {isCurrent && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-500 text-white text-[10px] uppercase font-bold px-3 py-1 rounded-full">
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
                  
                  <div className="mt-4 text-xs text-text-secondary border-t border-border-light/50 pt-3">
                    <div className="flex justify-between py-1">
                      <span>{isArabic ? 'نافذة السياق:' : 'Context Window:'}</span>
                      <span className="font-bold text-text-primary">{plan.context}</span>
                    </div>
                    <div className="flex justify-between py-1">
                      <span>{isArabic ? 'الرصيد الشهري:' : 'Monthly Quota:'}</span>
                      <span className="font-bold text-text-primary">{plan.quota}</span>
                    </div>
                  </div>

                  <ul className="mt-6 space-y-2.5 text-xs text-text-secondary">
                    {(isArabic ? plan.featuresAr : plan.features).map((feat, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <span className="h-1.5 w-1.5 rounded-full bg-green-500 flex-shrink-0" />
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
                    {isLoading === plan.id ? (
                      <Spinner />
                    ) : isCurrent ? (
                      isArabic ? 'نشط حالياً' : 'Currently Active'
                    ) : (
                      isArabic ? 'ترقية الآن' : 'Upgrade Now'
                    )}
                  </Button>
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex justify-end gap-3 pt-6 border-t border-border-light mt-6">
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
