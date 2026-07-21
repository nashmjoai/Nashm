const { findBalanceByUser } = require('~/models');
const { Subscription, FamilyPlan, PlanConfig } = require('~/db/models');
const { getEffectiveSubscription } = require('@nashm/api');

async function balanceController(req, res) {
  const balanceLocals = res.locals || {};

  if (balanceLocals.balanceConfigEnabled === false) {
    return res.sendStatus(204);
  }

  const balanceData = balanceLocals.balanceData ?? (await findBalanceByUser(req.user.id));

  if (!balanceData) {
    return res.status(404).json({ error: 'Balance not found' });
  }

  const result = balanceData.toObject != null ? balanceData.toObject() : balanceData;
  delete result._id;
  delete result.__v;

  if (!result.autoRefillEnabled) {
    delete result.refillIntervalValue;
    delete result.refillIntervalUnit;
    delete result.lastRefill;
    delete result.refillAmount;
  }

  let plan = 'free';
  let quota = 50000;

  try {
    const effective = await getEffectiveSubscription(req.user.id, {
      Subscription,
      FamilyPlan,
    });
    if (effective && effective.plan) {
      plan = effective.plan;
      const planConfig = await PlanConfig.findOne({ plan }).lean();
      const planLimits = {
        free: 50000,
        individual: 500000,
        family: 1000000,
        developer: 2000000,
      };
      quota = planConfig?.tokenQuota ?? planLimits[plan] ?? 50000;
      if (plan === 'family' && planConfig?.familyMemberTokenQuota) {
        quota = planConfig.familyMemberTokenQuota;
      }
    }
  } catch (error) {
    console.error(
      '[balanceController] getEffectiveSubscription error:',
      error?.message,
      '| Subscription:',
      !!Subscription,
      '| FamilyPlan:',
      !!FamilyPlan,
    );
    // Fallback to default
  }

  let isFamilyOwner = false;
  if (plan === 'family') {
    try {
      const familyPlan = await FamilyPlan.findOne({
        owner: req.user.id,
        status: { $in: ['active', 'trialing'] },
      }).lean();
      isFamilyOwner = !!familyPlan;
    } catch (_) {
      // ignore
    }
  }

  const remaining = Math.max(0, result.tokenCredits || 0);
  const consumed = Math.max(0, quota - remaining);

  res.status(200).json({
    ...result,
    plan,
    quota,
    consumed,
    isFamilyOwner,
  });
}

module.exports = balanceController;
