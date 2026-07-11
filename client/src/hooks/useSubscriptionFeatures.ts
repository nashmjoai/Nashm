import { useGetUserBalance, useGetStartupConfig } from '~/data-provider';
import { useAuthContext } from '~/hooks/AuthContext';

export function useSubscriptionFeatures() {
  const { isAuthenticated } = useAuthContext();
  const { data: startupConfig } = useGetStartupConfig();
  const { data: balanceData } = useGetUserBalance({
    enabled: !!isAuthenticated && startupConfig?.balance?.enabled,
  });

  const plan = (balanceData?.plan || 'free').toLowerCase();

  return {
    plan,
    isFree: plan === 'free',
    isIndividual: plan === 'individual',
    isFamily: plan === 'family',
    isDeveloper: plan === 'developer',
    hasFamilyPlan: plan === 'family',
    hasDeveloperPlan: plan === 'developer',
    // Custom feature flags
    canUseAdvancedModels: plan !== 'free',
    maxFamilyMembers: plan === 'family' ? 4 : 0,
    canAccessAPI: plan === 'developer',
    contextLimitText: plan === 'free' ? '100k' : plan === 'individual' ? '500k' : plan === 'family' ? '1M' : '2M',
    quotaLimitText: plan === 'free' ? '50k' : plan === 'individual' ? '500k' : plan === 'family' ? '1M' : '2M',
  };
}
export default useSubscriptionFeatures;
