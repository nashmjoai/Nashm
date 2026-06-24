import { Types } from 'mongoose';
import { SystemRoles } from 'librechat-data-provider';
import type { Model } from 'mongoose';
import type { TModelsConfig } from 'librechat-data-provider';
import type {
  IFamilyPlan,
  IModelAccess,
  ISubscription,
  SubscriptionPlan,
} from '@librechat/data-schemas';

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

function defaultAllowsPlan(plan: SubscriptionPlan, model: string): boolean {
  if (plan === 'developer') {
    return true;
  }
  if (plan === 'individual' || plan === 'family') {
    return !isDeveloperModel(model);
  }
  return isFreeModel(model);
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
  const subscription = await deps.Subscription.findOne({
    user: userObjectId,
    status: { $in: ACTIVE_STATUSES },
  }).lean<ISubscription | null>();

  if (subscription?.plan && subscription.plan !== 'free' && isActiveExpiry(subscription.expiresAt)) {
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
  if (user?.role === SystemRoles.ADMIN) {
    return modelsConfig;
  }

  const effective = await getEffectiveSubscription(user, deps);
  const rules = await deps.ModelAccess.find({}).lean<IModelAccess[]>();
  const rulesByModel = new Map(rules.map((rule) => [getRuleKey(rule.endpoint, rule.model), rule]));
  const filtered: TModelsConfig = {};

  for (const [endpoint, models] of Object.entries(modelsConfig)) {
    const allowed = models.filter((model) => {
      const rule = rulesByModel.get(getRuleKey(endpoint, model));
      if (rule?.enabled === false) {
        return false;
      }
      if (rule && rule.allowedPlans.length > 0) {
        return rule.allowedPlans.includes(effective.plan);
      }
      return defaultAllowsPlan(effective.plan, model);
    });

    if (allowed.length > 0) {
      filtered[endpoint] = allowed;
    }
  }

  return filtered;
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
