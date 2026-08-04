import { Types } from 'mongoose';
import { SystemRoles } from 'nashm-data-provider';
import type { Model } from 'mongoose';
import type { TModelsConfig } from 'nashm-data-provider';
import type {
  IFamilyPlan,
  IModelAccess,
  ISubscription,
  SubscriptionPlan,
} from '@nashm/data-schemas';

const ACTIVE_STATUSES = ['active', 'trialing'] as const;
const FREE_MODEL_RE = /(?:^|[-_./\s])(kimi|gemini|gimini)(?:$|[-_./\s0-9])/i;
const DEVELOPER_MODEL_RE = /gpt[-_ ]?5[.-]?5(?:[-_ ]?pro)?/i;

export type SubscriptionUser = {
  id?: string;
  _id?: Types.ObjectId | string;
  role?: string | null;
};

export type SubscriptionAccessDeps = {
  Subscription: Model<ISubscription>;
  FamilyPlan: Model<IFamilyPlan>;
  ModelAccess: Model<IModelAccess>;
};

export type EffectiveSubscription = {
  plan: SubscriptionPlan;
  source: 'direct' | 'family' | 'none';
  subscriptionId?: string;
  familyPlanId?: string;
  ownerId?: string;
  expiresAt?: string;
};

export type ModelAccessDecision = {
  allowed: boolean;
  reason: 'allowed' | 'disabled' | 'subscription_required';
  effective: EffectiveSubscription;
  allowedPlans: SubscriptionPlan[];
};

function getUserId(user: SubscriptionUser | null | undefined): string | null {
  const id = user?.id ?? user?._id;
  if (!id) {
    return null;
  }
  return typeof id === 'string' ? id : id.toString();
}

function isActiveExpiry(expiresAt?: Date | null): boolean {
  return !expiresAt || expiresAt.getTime() > Date.now();
}

function getRuleKey(endpoint: string, model: string): string {
  return `${endpoint}\u0000${model}`;
}

function isFreeModel(model: string): boolean {
  return FREE_MODEL_RE.test(model);
}

function isDeveloperModel(model: string): boolean {
  return DEVELOPER_MODEL_RE.test(model);
}

function allowedPlansForRule(rule: IModelAccess | undefined, model: string): SubscriptionPlan[] {
  return rule != null ? rule.allowedPlans : getDefaultAllowedPlans(model);
}

function getSortOrder(rule: IModelAccess | undefined, fallback: number): number {
  return typeof rule?.sortOrder === 'number' && Number.isFinite(rule.sortOrder)
    ? rule.sortOrder
    : fallback;
}

export async function getEffectiveSubscription(
  user: SubscriptionUser | string | null | undefined,
  deps: Pick<SubscriptionAccessDeps, 'Subscription' | 'FamilyPlan'>,
): Promise<EffectiveSubscription> {
  const userId = typeof user === 'string' ? user : getUserId(user);
  if (!userId || !Types.ObjectId.isValid(userId)) {
    return { plan: 'free', source: 'none' };
  }

  const userObjectId = new Types.ObjectId(userId);
  if (!deps.Subscription) {
    return { plan: 'free', source: 'none' };
  }
  const subscription = await deps.Subscription.findOne({
    user: userObjectId,
    status: { $in: ACTIVE_STATUSES },
  }).lean<ISubscription | null>();

  if (
    subscription?.plan &&
    subscription.plan !== 'free' &&
    isActiveExpiry(subscription.expiresAt)
  ) {
    // If the admin set plan=family directly on the subscription, honour it immediately
    // without requiring a separate FamilyPlan document.
    if (subscription.plan === 'family') {
      return {
        plan: 'family',
        source: 'direct',
        subscriptionId: subscription._id.toString(),
        expiresAt: subscription.expiresAt?.toISOString(),
      };
    }
    return {
      plan: subscription.plan,
      source: 'direct',
      subscriptionId: subscription._id.toString(),
      expiresAt: subscription.expiresAt?.toISOString(),
    };
  }

  const familyPlan = await deps.FamilyPlan.findOne({
    status: { $in: ACTIVE_STATUSES },
    $or: [{ owner: userObjectId }, { 'members.user': userObjectId }],
  }).lean<IFamilyPlan | null>();

  if (familyPlan && isActiveExpiry(familyPlan.currentPeriodEnd)) {
    return {
      plan: 'family',
      source: 'family',
      familyPlanId: familyPlan._id.toString(),
      ownerId: familyPlan.owner.toString(),
      expiresAt: familyPlan.currentPeriodEnd?.toISOString(),
    };
  }

  return { plan: 'free', source: 'none' };
}

export async function filterModelsBySubscription({
  user,
  modelsConfig,
  deps,
}: {
  user: SubscriptionUser | null | undefined;
  modelsConfig: TModelsConfig;
  deps: SubscriptionAccessDeps;
}): Promise<TModelsConfig> {
  const rules = await deps.ModelAccess.find({}).lean<IModelAccess[]>();
  const rulesByModel = new Map(rules.map((rule) => [getRuleKey(rule.endpoint, rule.model), rule]));
  const filtered: TModelsConfig = {};

  const isAdmin = user?.role === SystemRoles.ADMIN;
  const effective = isAdmin ? null : await getEffectiveSubscription(user, deps);

  for (const [endpoint, models] of Object.entries(modelsConfig)) {
    const endpointRule = rulesByModel.get(getRuleKey(endpoint, '*'));
    if (endpointRule?.enabled === false) {
      continue;
    }
    const allowed = models
      .map((model, index) => ({
        model,
        index,
        rule: rulesByModel.get(getRuleKey(endpoint, model)),
      }))
      .filter(({ model, rule }) => {
        if (rule?.enabled === false) {
          return false;
        }
        if (isAdmin) {
          return true;
        }
        return allowedPlansForRule(rule, model).includes(effective?.plan ?? 'free');
      })
      .sort(
        (left, right) =>
          getSortOrder(left.rule, left.index) - getSortOrder(right.rule, right.index) ||
          left.index - right.index,
      )
      .map(({ model }) => model);

    if (allowed.length > 0) {
      filtered[endpoint] = allowed;
    }
  }

  return filtered;
}

export async function getModelAccessDecision({
  user,
  endpoint,
  model,
  deps,
}: {
  user: SubscriptionUser | null | undefined;
  endpoint: string;
  model: string;
  deps: SubscriptionAccessDeps;
}): Promise<ModelAccessDecision> {
  const [endpointRule, modelRule] = await Promise.all([
    deps.ModelAccess.findOne({ endpoint, model: '*' }).lean<IModelAccess | null>(),
    deps.ModelAccess.findOne({ endpoint, model }).lean<IModelAccess | null>(),
  ]);
  const effective = await getEffectiveSubscription(user, deps);

  if (endpointRule?.enabled === false || modelRule?.enabled === false) {
    return {
      allowed: false,
      reason: 'disabled',
      effective,
      allowedPlans: [],
    };
  }

  const allowedPlans = allowedPlansForRule(modelRule ?? undefined, model);
  const isAdmin = user?.role === SystemRoles.ADMIN;
  if (!isAdmin && allowedPlans.length === 0) {
    return {
      allowed: false,
      reason: 'disabled',
      effective,
      allowedPlans,
    };
  }
  if (isAdmin || allowedPlans.includes(effective.plan)) {
    return {
      allowed: true,
      reason: 'allowed',
      effective,
      allowedPlans,
    };
  }

  return {
    allowed: false,
    reason: 'subscription_required',
    effective,
    allowedPlans,
  };
}

export function getDefaultAllowedPlans(model: string): SubscriptionPlan[] {
  if (isDeveloperModel(model)) {
    return ['developer'];
  }
  if (isFreeModel(model)) {
    return ['free', 'individual', 'family', 'developer'];
  }
  return ['individual', 'family', 'developer'];
}
