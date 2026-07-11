import React from 'react';
import { useTranslation } from 'react-i18next';
import { Award, Shield, Users, Sparkles } from 'lucide-react';

interface SubscriptionBadgeProps {
  plan: string;
}

export const SubscriptionBadge: React.FC<SubscriptionBadgeProps> = ({ plan }) => {
  const { i18n } = useTranslation();
  const lowerPlan = plan.toLowerCase();

  let badgeStyles = 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
  let Icon = Award;
  let label = 'Free';

  if (lowerPlan === 'individual') {
    badgeStyles = 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-500/20';
    Icon = Sparkles;
    label = 'Individual';
  } else if (lowerPlan === 'family') {
    badgeStyles = 'bg-blue-100 text-blue-700 dark:bg-blue-950/40 dark:text-blue-400 border border-blue-500/20';
    Icon = Users;
    label = 'Family';
  } else if (lowerPlan === 'developer') {
    badgeStyles = 'bg-purple-100 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-500/20';
    Icon = Shield;
    label = 'Developer';
  }

  // Support Arabic translation
  const isArabic = i18n.language?.startsWith('ar');
  const displayName = isArabic ? (
    lowerPlan === 'free' ? 'الخطة المجانية' :
    lowerPlan === 'individual' ? 'الخطة الفردية' :
    lowerPlan === 'family' ? 'الخطة العائلية' :
    lowerPlan === 'developer' ? 'خطة المطورين' : label
  ) : label;

  return (
    <div className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold select-none ${badgeStyles}`}>
      <Icon className="size-3.5" />
      <span>{displayName}</span>
    </div>
  );
};
export default SubscriptionBadge;
