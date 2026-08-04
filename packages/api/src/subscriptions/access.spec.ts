import { Types } from 'mongoose';
import type { IFamilyPlan, IModelAccess, ISubscription } from '@nashm/data-schemas';
import { filterModelsBySubscription, getModelAccessDecision } from './access';

const userId = new Types.ObjectId().toString();

function queryResult<T>(value: T) {
  return { lean: jest.fn().mockResolvedValue(value) };
}

function createDeps(rules: IModelAccess[]) {
  const ModelAccess = {
    find: jest.fn().mockReturnValue(queryResult(rules)),
    findOne: jest.fn((filter: { endpoint: string; model: string }) =>
      queryResult(
        rules.find((rule) => rule.endpoint === filter.endpoint && rule.model === filter.model) ??
          null,
      ),
    ),
  };
  const Subscription = {
    findOne: jest.fn().mockReturnValue(queryResult<ISubscription | null>(null)),
  };
  const FamilyPlan = {
    findOne: jest.fn().mockReturnValue(queryResult<IFamilyPlan | null>(null)),
  };

  return { ModelAccess, Subscription, FamilyPlan } as never;
}

function modelRule(overrides: Partial<IModelAccess>): IModelAccess {
  return {
    _id: new Types.ObjectId(),
    endpoint: 'google',
    model: 'gemini-3.5-flash',
    enabled: true,
    sortOrder: 0,
    allowedPlans: ['individual'],
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
  } as IModelAccess;
}

describe('subscription model access', () => {
  it('filters a model that is restricted to a higher subscription tier', async () => {
    const models = await filterModelsBySubscription({
      user: { id: userId, role: 'USER' },
      modelsConfig: { google: ['gemini-3.5-flash'] },
      deps: createDeps([modelRule({})]),
    });

    expect(models).toEqual({});
  });

  it('treats an explicit empty tier list as unavailable to regular users', async () => {
    const decision = await getModelAccessDecision({
      user: { id: userId, role: 'USER' },
      endpoint: 'google',
      model: 'gemini-3.5-flash',
      deps: createDeps([modelRule({ allowedPlans: [] })]),
    });

    expect(decision).toMatchObject({ allowed: false, reason: 'disabled', allowedPlans: [] });
  });

  it('returns enabled models in the dashboard display order', async () => {
    const models = await filterModelsBySubscription({
      user: { id: userId, role: 'USER' },
      modelsConfig: { google: ['gemini-3.5-flash', 'kimi-agent'] },
      deps: createDeps([
        modelRule({ model: 'gemini-3.5-flash', allowedPlans: ['free'], sortOrder: 10 }),
        modelRule({ model: 'kimi-agent', allowedPlans: ['free'], sortOrder: 1 }),
      ]),
    });

    expect(models).toEqual({ google: ['kimi-agent', 'gemini-3.5-flash'] });
  });
});
