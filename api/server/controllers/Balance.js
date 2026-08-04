const { findBalanceByUser, createAutoRefillTransaction } = require('~/models');
const { Subscription, FamilyPlan, PlanConfig } = require('~/db/models');
const { getEffectiveSubscription } = require('@nashm/api');
const { getRefillEligibilityDate } = require('nashm-data-provider');

async function balanceController(req, res) {
  const balanceLocals = res.locals || {};

  if (balanceLocals.balanceConfigEnabled === false) {
    return res.sendStatus(204);
  }

  let balanceData = balanceLocals.balanceData ?? (await findBalanceByUser(req.user.id));

  if (!balanceData) {
    return res.status(404).json({ error: 'Balance not found' });
  }

  let plan = 'free';
  let quota = 50000;
  let renewalUnit = 'months';
  let renewalValue = 1;

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

      const renewalPeriod =
        plan === 'family' && planConfig?.familyMemberRenewalPeriod
          ? planConfig.familyMemberRenewalPeriod
          : (planConfig?.renewalPeriod ?? 'monthly');
      if (renewalPeriod === 'weekly') renewalUnit = 'weeks';
      if (renewalPeriod === 'daily') renewalUnit = 'days';
      if (renewalPeriod === 'yearly') renewalUnit = 'years';
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

  // Auto-sync balance to the subscription quota if it's out of sync
  if (
    balanceData.refillAmount !== quota ||
    balanceData.refillIntervalUnit !== renewalUnit ||
    balanceData.refillIntervalValue !== renewalValue ||
    balanceData.renewalMode !== 'reset' ||
    !balanceData.autoRefillEnabled ||
    !balanceData.lastRefill
  ) {
    try {
      const mongoose = require('mongoose');
      const Balance = mongoose.models.Balance;

      const setPayload = {
        autoRefillEnabled: true,
        refillAmount: quota,
        refillIntervalUnit: renewalUnit,
        refillIntervalValue: renewalValue,
        renewalMode: 'reset',
      };

      // Only reset tokenCredits if the quota actually changed or if it was never initialized
      if (balanceData.refillAmount !== quota || balanceData.tokenCredits == null) {
        setPayload.tokenCredits = quota;
      }

      const updatedBalance = await Balance.findOneAndUpdate(
        { user: req.user.id },
        {
          $set: setPayload,
          $setOnInsert: { lastRefill: new Date(), tokenCredits: quota },
        },
        { new: true, upsert: true },
      ).lean();

      if (updatedBalance) {
        balanceData = updatedBalance;
      }
    } catch (err) {
      console.error('[balanceController] Failed to auto-sync balance to subscription quota:', err);
    }
  }

  if (balanceData.autoRefillEnabled && balanceData.refillAmount > 0 && balanceData.lastRefill) {
    const refillEligibilityDate = getRefillEligibilityDate(
      balanceData.lastRefill,
      balanceData.refillIntervalValue,
      balanceData.refillIntervalUnit,
    );
    const now = new Date();
    if (now >= refillEligibilityDate) {
      try {
        const result = await createAutoRefillTransaction({
          user: req.user.id,
          tokenType: 'credits',
          rawAmount: balanceData.refillAmount,
          resetBalance: true,
          renewalDueAt: refillEligibilityDate,
        });
        if (result) {
          const renewedBalance = await findBalanceByUser(req.user.id);
          if (renewedBalance) {
            balanceData = renewedBalance;
          }
        }
      } catch (error) {
        console.error('[balanceController] Auto-refill failed:', error);
      }
    }
  }

  const result = balanceData.toObject != null ? balanceData.toObject() : balanceData;
  delete result._id;
  delete result.__v;

  if (!result.lastRefill) {
    result.lastRefill = result.createdAt || new Date();
  }
  result.autoRefillEnabled = true;
  result.refillIntervalUnit = result.refillIntervalUnit || renewalUnit;
  result.refillIntervalValue = result.refillIntervalValue || renewalValue;

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

  const nextRefillDate = getRefillEligibilityDate(
    result.lastRefill,
    result.refillIntervalValue,
    result.refillIntervalUnit,
  );
  const subscriptionUsage = {
    consumed,
    remaining,
    periodStartedAt: result.lastRefill,
    renewsAt: nextRefillDate,
  };

  res.status(200).json({
    ...result,
    plan,
    quota,
    consumed,
    isFamilyOwner,
    nextRefillDate,
    subscriptionUsage,
  });
}

module.exports = balanceController;
