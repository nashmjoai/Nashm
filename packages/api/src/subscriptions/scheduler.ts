import { logger } from '@nashm/data-schemas';
import { registerShutdownTask } from '~/app/shutdown';

const RENEWAL_CHECK_INTERVAL_MS = 60_000;

export type SubscriptionRenewalScheduler = {
  stop: () => void;
};

export function startSubscriptionRenewalScheduler(params: {
  renewDueBalances: () => Promise<number>;
  intervalMs?: number;
}): SubscriptionRenewalScheduler {
  const intervalMs = Math.max(1_000, params.intervalMs ?? RENEWAL_CHECK_INTERVAL_MS);
  let stopped = false;
  let timer: NodeJS.Timeout | undefined;

  const scheduleNext = () => {
    if (stopped) {
      return;
    }
    timer = setTimeout(tick, intervalMs);
    timer.unref?.();
  };

  async function tick() {
    if (stopped) {
      return;
    }
    try {
      const renewedCount = await params.renewDueBalances();
      if (renewedCount > 0) {
        logger.info(`[SubscriptionRenewal] Renewed ${renewedCount} subscription balance(s).`);
      }
    } catch (error) {
      logger.error('[SubscriptionRenewal] Scheduled renewal failed:', error);
    }
    scheduleNext();
  }

  const scheduler = {
    stop: () => {
      stopped = true;
      if (timer) {
        clearTimeout(timer);
        timer = undefined;
      }
    },
  };

  void tick();
  registerShutdownTask('subscription renewal scheduler', scheduler.stop);

  return scheduler;
}
