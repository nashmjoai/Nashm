const { getModelAccessDecision } = require('@nashm/api');
const { logger } = require('@nashm/data-schemas');
const { getRefillEligibilityDate } = require('nashm-data-provider');
const { Types } = require('mongoose');
const { createAutoRefillTransaction } = require('~/models');
const {
  Subscription,
  FamilyPlan,
  ModelAccess,
  PlanConfig,
  Balance,
  Transaction,
} = require('~/db/models');

const planLabels = {
  free: 'Free',
  individual: 'Individual',
  family: 'Family',
  developer: 'Developer',
};

function getRequestedEndpoint(req) {
  const endpoint = req.body?.endpoint ?? req.body?.endpointOption?.endpoint;
  return typeof endpoint === 'string' && endpoint.trim().length > 0 ? endpoint.trim() : null;
}

function getRequestedModel(req) {
  const model = req.body?.model ?? req.body?.endpointOption?.model;
  return typeof model === 'string' && model.trim().length > 0 ? model.trim() : null;
}

function subscriptionRequiredMessage(model, plans) {
  const planNames = plans.map((plan) => planLabels[plan] ?? plan).join(', ');
  return `${model} requires a ${planNames} subscription. Upgrade your plan to use this model.`;
}

function getUserId(req) {
  const id = req.user?.id ?? req.user?._id?.toString();
  return typeof id === 'string' && Types.ObjectId.isValid(id) ? id : null;
}

async function hasRemainingModelAllowance(req, decision, endpoint, model) {
  if (req.user?.role === 'ADMIN') {
    return { allowed: true };
  }
  const userId = getUserId(req);
  if (!userId) {
    return { allowed: true };
  }

  const planConfig = await PlanConfig.findOne({ plan: decision.effective.plan }).lean();
  const limit = planConfig?.modelTokenLimits?.find(
    (entry) => entry.endpoint === endpoint && entry.model === model && entry.tokensPerPeriod > 0,
  );
  if (!limit) {
    return { allowed: true };
  }

  const balance = await Balance.findOne({ user: userId })
    .select(
      'lastRefill autoRefillEnabled refillAmount refillIntervalValue refillIntervalUnit renewalMode',
    )
    .lean();
  let periodStart = balance?.lastRefill instanceof Date ? balance.lastRefill : new Date(0);
  const renewalDate =
    balance?.autoRefillEnabled &&
    balance.refillAmount > 0 &&
    balance.renewalMode === 'reset' &&
    balance.lastRefill instanceof Date
      ? getRefillEligibilityDate(
          balance.lastRefill,
          balance.refillIntervalValue ?? 1,
          balance.refillIntervalUnit ?? 'months',
        )
      : null;

  if (renewalDate && new Date() >= renewalDate) {
    try {
      const result = await createAutoRefillTransaction({
        user: userId,
        rawAmount: balance.refillAmount,
        resetBalance: true,
      });
      if (result) {
        periodStart = new Date();
      }
    } catch (error) {
      logger.error('[modelSubscription] Failed to renew subscription allowance:', error);
    }
  }
  const [usage] = await Transaction.aggregate([
    {
      $match: {
        user: new Types.ObjectId(userId),
        model,
        createdAt: { $gte: periodStart },
      },
    },
    {
      $group: {
        _id: null,
        tokensUsed: { $sum: { $abs: { $ifNull: ['$rawAmount', 0] } } },
      },
    },
  ]);
  const tokensUsed = usage?.tokensUsed ?? 0;
  return {
    allowed: tokensUsed < limit.tokensPerPeriod,
    tokensUsed,
    tokenLimit: limit.tokensPerPeriod,
  };
}

async function enforceModelSubscription(req, res, next) {
  const endpoint = getRequestedEndpoint(req);
  const model = getRequestedModel(req);
  if (!endpoint || !model) {
    return next();
  }

  try {
    const decision = await getModelAccessDecision({
      user: req.user,
      endpoint,
      model,
      deps: { Subscription, FamilyPlan, ModelAccess },
    });
    if (decision.reason === 'subscription_required') {
      const message = subscriptionRequiredMessage(model, decision.allowedPlans);
      req.recordUserError?.({
        code: 'SUBSCRIPTION_REQUIRED',
        title: 'Model access requires a subscription',
        message,
        statusCode: 403,
        severity: 'warning',
        details: {
          endpoint,
          model,
          currentPlan: decision.effective.plan,
          requiredPlans: decision.allowedPlans,
        },
      });
      return res.status(403).json({
        code: 'SUBSCRIPTION_REQUIRED',
        error: message,
        upgrade: {
          currentPlan: decision.effective.plan,
          requiredPlans: decision.allowedPlans,
        },
      });
    }

    if (decision.reason === 'disabled') {
      const message = 'This model is not available at the moment. Please choose another model.';
      req.recordUserError?.({
        code: 'MODEL_UNAVAILABLE',
        title: 'Model is unavailable',
        message,
        statusCode: 404,
        severity: 'warning',
        details: { endpoint, model, currentPlan: decision.effective.plan },
      });
      return res.status(404).json({ code: 'MODEL_UNAVAILABLE', error: message });
    }

    const allowance = await hasRemainingModelAllowance(req, decision, endpoint, model);
    if (!allowance.allowed) {
      const message =
        "You have reached this model's token allowance for the current renewal period. It will be available again after your next renewal.";
      req.recordUserError?.({
        code: 'MODEL_TOKEN_LIMIT_REACHED',
        title: 'Model token allowance reached',
        message,
        statusCode: 429,
        severity: 'warning',
        details: {
          endpoint,
          model,
          currentPlan: decision.effective.plan,
          tokensUsed: allowance.tokensUsed,
          tokenLimit: allowance.tokenLimit,
        },
      });
      return res.status(429).json({
        code: 'MODEL_TOKEN_LIMIT_REACHED',
        error: message,
        usage: { tokensUsed: allowance.tokensUsed, tokenLimit: allowance.tokenLimit },
      });
    }
    return next();
  } catch (error) {
    logger.error('[modelSubscription] Failed to verify model access:', error);
    return res.status(503).json({
      code: 'MODEL_ACCESS_CHECK_UNAVAILABLE',
      error: 'We could not verify model access right now. Please try again shortly.',
    });
  }
}

module.exports = enforceModelSubscription;
