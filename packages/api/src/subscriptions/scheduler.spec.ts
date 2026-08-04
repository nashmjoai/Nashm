import { __resetShutdownStateForTests } from '~/app/shutdown';
import { startSubscriptionRenewalScheduler } from './scheduler';

async function flushPromises(): Promise<void> {
  await Promise.resolve();
  await Promise.resolve();
  await Promise.resolve();
}

describe('startSubscriptionRenewalScheduler', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    __resetShutdownStateForTests();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
    __resetShutdownStateForTests();
  });

  it('renews on startup and continues on the configured interval', async () => {
    const renewDueBalances = jest.fn(async () => 1);
    const scheduler = startSubscriptionRenewalScheduler({
      renewDueBalances,
      intervalMs: 5_000,
    });

    await flushPromises();
    expect(renewDueBalances).toHaveBeenCalledTimes(1);

    await jest.advanceTimersByTimeAsync(5_000);
    await flushPromises();
    expect(renewDueBalances).toHaveBeenCalledTimes(2);

    scheduler.stop();
  });

  it('does not schedule another renewal after it is stopped', async () => {
    const renewDueBalances = jest.fn(async () => 0);
    const scheduler = startSubscriptionRenewalScheduler({
      renewDueBalances,
      intervalMs: 5_000,
    });

    await flushPromises();
    scheduler.stop();
    await jest.advanceTimersByTimeAsync(10_000);

    expect(renewDueBalances).toHaveBeenCalledTimes(1);
  });
});
