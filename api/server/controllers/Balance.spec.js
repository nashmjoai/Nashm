jest.mock('~/models', () => ({
  findBalanceByUser: jest.fn(),
  createAutoRefillTransaction: jest.fn(),
}));

jest.mock('~/db/models', () => ({
  Subscription: {},
  FamilyPlan: { findOne: jest.fn() },
  PlanConfig: { findOne: jest.fn() },
}));

jest.mock('@nashm/api', () => ({
  getEffectiveSubscription: jest.fn(),
}));

const { findBalanceByUser, createAutoRefillTransaction } = require('~/models');
const { PlanConfig } = require('~/db/models');
const { getEffectiveSubscription } = require('@nashm/api');
const balanceController = require('./Balance');

describe('balanceController', () => {
  const createResponse = () => ({
    locals: {},
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    sendStatus: jest.fn().mockReturnThis(),
  });

  beforeEach(() => {
    jest.clearAllMocks();
    getEffectiveSubscription.mockResolvedValue({ plan: 'free' });
    PlanConfig.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(null) });
  });

  it('returns no content without reading balance when balance config is disabled', async () => {
    const req = {
      user: { id: 'user-1' },
    };
    const res = createResponse();
    res.locals.balanceConfigEnabled = false;

    await balanceController(req, res);

    expect(findBalanceByUser).not.toHaveBeenCalled();
    expect(res.sendStatus).toHaveBeenCalledWith(204);
    expect(res.status).not.toHaveBeenCalled();
  });

  it('uses balance data attached by middleware without a second read', async () => {
    const periodStartedAt = new Date();
    const renewsAt = new Date(periodStartedAt);
    renewsAt.setMonth(renewsAt.getMonth() + 1);
    const req = {
      user: { id: 'user-1' },
    };
    const res = createResponse();
    res.locals.balanceConfigEnabled = true;
    res.locals.balanceData = {
      _id: 'balance-1',
      user: 'user-1',
      tokenCredits: 100,
      autoRefillEnabled: true,
      refillAmount: 50000,
      refillIntervalUnit: 'months',
      refillIntervalValue: 1,
      renewalMode: 'reset',
      lastRefill: periodStartedAt,
    };

    await balanceController(req, res);

    expect(findBalanceByUser).not.toHaveBeenCalled();
    expect(res.status).toHaveBeenCalledWith(200);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'user-1',
        tokenCredits: 100,
        plan: 'free',
        quota: 50000,
        consumed: 49900,
        subscriptionUsage: {
          consumed: 49900,
          remaining: 100,
          periodStartedAt,
          renewsAt,
        },
      }),
    );
  });

  it('returns the refreshed subscription period after an expired allowance renews', async () => {
    const req = { user: { id: 'user-1' } };
    const res = createResponse();
    res.locals.balanceConfigEnabled = true;
    res.locals.balanceData = {
      user: 'user-1',
      tokenCredits: 100,
      autoRefillEnabled: true,
      refillAmount: 50000,
      refillIntervalUnit: 'days',
      refillIntervalValue: 1,
      renewalMode: 'reset',
      lastRefill: new Date('2000-01-01T00:00:00.000Z'),
    };
    createAutoRefillTransaction.mockResolvedValue({ balance: 50000 });
    PlanConfig.findOne.mockReturnValue({
      lean: jest.fn().mockResolvedValue({ tokenQuota: 50000, renewalPeriod: 'daily' }),
    });
    const renewedAt = new Date('2026-08-04T00:00:00.000Z');
    findBalanceByUser.mockResolvedValue({
      ...res.locals.balanceData,
      tokenCredits: 50000,
      lastRefill: renewedAt,
    });

    await balanceController(req, res);

    expect(createAutoRefillTransaction).toHaveBeenCalledWith({
      user: 'user-1',
      tokenType: 'credits',
      rawAmount: 50000,
      resetBalance: true,
      renewalDueAt: new Date('2000-01-02T00:00:00.000Z'),
    });
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        consumed: 0,
        subscriptionUsage: {
          consumed: 0,
          remaining: 50000,
          periodStartedAt: renewedAt,
          renewsAt: new Date('2026-08-05T00:00:00.000Z'),
        },
      }),
    );
  });

  it('returns not found when balance is enabled and no record exists', async () => {
    findBalanceByUser.mockResolvedValue(null);
    const req = {
      user: { id: 'user-1' },
    };
    const res = createResponse();
    res.locals.balanceConfigEnabled = true;

    await balanceController(req, res);

    expect(findBalanceByUser).toHaveBeenCalledWith('user-1');
    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith({ error: 'Balance not found' });
  });
});
