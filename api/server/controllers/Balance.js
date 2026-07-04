const { findBalanceByUser, PlanConfig, Subscription, FamilyPlan } = require('~/models');
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
      quota = planConfig?.tokenQuota ?? (
        plan === 'free' ? 50000 :
        plan === 'individual' ? 500000 :
        plan === 'family' ? 1000000 :
        plan === 'developer' ? 2000000 : 50000
      );
      if (plan === 'family' && planConfig?.familyMemberTokenQuota) {
        quota = planConfig.familyMemberTokenQuota;
      }
    }
  } catch (error) {
    // Fallback to default
  }

  const remaining = Math.max(0, result.tokenCredits || 0);
  const consumed = Math.max(0, quota - remaining);

  res.status(200).json({
    ...result,
    plan,
    quota,
    consumed,
  });
}

module.exports = balanceController;
