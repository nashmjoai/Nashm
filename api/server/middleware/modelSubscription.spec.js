jest.mock('@nashm/api', () => ({
  getModelAccessDecision: jest.fn(),
}));

jest.mock('@nashm/data-schemas', () => ({
  logger: { error: jest.fn() },
}));

jest.mock('~/db/models', () => ({
  Subscription: {},
  FamilyPlan: {},
  ModelAccess: {},
  PlanConfig: { findOne: jest.fn() },
  Balance: { findOne: jest.fn() },
  Transaction: { aggregate: jest.fn() },
}));

jest.mock('~/models', () => ({
  createAutoRefillTransaction: jest.fn(),
}));

const { getModelAccessDecision } = require('@nashm/api');
const { PlanConfig, Balance, Transaction } = require('~/db/models');
const { createAutoRefillTransaction } = require('~/models');
const enforceModelSubscription = require('./modelSubscription');

const userId = '64b64c0d7bb1f0e6d0d2c123';

function createResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    json: jest.fn(),
  };
}

function createRequest() {
  return {
    user: { id: userId, role: 'USER' },
    body: { endpoint: 'google', model: 'gemini-3.5-flash' },
    recordUserError: jest.fn(),
  };
}

function mockPlanConfig(planConfig) {
  PlanConfig.findOne.mockReturnValue({ lean: jest.fn().mockResolvedValue(planConfig) });
}

describe('enforceModelSubscription', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('explains when a model requires a higher subscription', async () => {
    getModelAccessDecision.mockResolvedValue({
      allowed: false,
      reason: 'subscription_required',
      effective: { plan: 'free' },
      allowedPlans: ['individual', 'developer'],
    });
    const req = createRequest();
    const res = createResponse();

    await enforceModelSubscription(req, res, jest.fn());

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SUBSCRIPTION_REQUIRED',
        error: expect.stringContaining('Individual, Developer'),
      }),
    );
    expect(req.recordUserError).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'SUBSCRIPTION_REQUIRED',
        details: expect.objectContaining({ currentPlan: 'free' }),
      }),
    );
  });

  it('allows an accessible model when no per-model limit is configured', async () => {
    getModelAccessDecision.mockResolvedValue({
      allowed: true,
      reason: 'allowed',
      effective: { plan: 'individual' },
      allowedPlans: ['individual'],
    });
    mockPlanConfig({ modelTokenLimits: [] });
    const next = jest.fn();

    await enforceModelSubscription(createRequest(), createResponse(), next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(Transaction.aggregate).not.toHaveBeenCalled();
  });

  it('blocks a model whose allowance has been consumed in the current period', async () => {
    getModelAccessDecision.mockResolvedValue({
      allowed: true,
      reason: 'allowed',
      effective: { plan: 'individual' },
      allowedPlans: ['individual'],
    });
    mockPlanConfig({
      modelTokenLimits: [{ endpoint: 'google', model: 'gemini-3.5-flash', tokensPerPeriod: 100 }],
    });
    Balance.findOne.mockReturnValue({
      select: jest
        .fn()
        .mockReturnValue({ lean: jest.fn().mockResolvedValue({ lastRefill: new Date() }) }),
    });
    Transaction.aggregate.mockResolvedValue([{ tokensUsed: 100 }]);
    const req = createRequest();
    const res = createResponse();
    const next = jest.fn();

    await enforceModelSubscription(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        code: 'MODEL_TOKEN_LIMIT_REACHED',
        usage: { tokensUsed: 100, tokenLimit: 100 },
      }),
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('renews an expired subscription period before checking the model allowance', async () => {
    getModelAccessDecision.mockResolvedValue({
      allowed: true,
      reason: 'allowed',
      effective: { plan: 'developer' },
      allowedPlans: ['developer'],
    });
    mockPlanConfig({
      modelTokenLimits: [{ endpoint: 'google', model: 'gemini-3.5-flash', tokensPerPeriod: 100 }],
    });
    Balance.findOne.mockReturnValue({
      select: jest.fn().mockReturnValue({
        lean: jest.fn().mockResolvedValue({
          lastRefill: new Date('2000-01-01T00:00:00.000Z'),
          autoRefillEnabled: true,
          refillAmount: 1000,
          refillIntervalValue: 1,
          refillIntervalUnit: 'weeks',
          renewalMode: 'reset',
        }),
      }),
    });
    createAutoRefillTransaction.mockResolvedValue({ balance: 1000 });
    Transaction.aggregate.mockResolvedValue([{ tokensUsed: 0 }]);
    const next = jest.fn();

    await enforceModelSubscription(createRequest(), createResponse(), next);

    expect(createAutoRefillTransaction).toHaveBeenCalledWith({
      user: userId,
      rawAmount: 1000,
      resetBalance: true,
    });
    expect(next).toHaveBeenCalledTimes(1);
  });
});
