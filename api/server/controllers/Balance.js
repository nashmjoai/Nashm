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
      
      const renewalPeriod = planConfig?.renewalPeriod ?? 'monthly';
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

  // Auto-sync balance to the subscription quota if it's out of sync (e.g. new plan or uninitialized)
  if (balanceData.refillAmount !== quota) {
    try {
      const mongoose = require('mongoose');
      const Balance = mongoose.models.Balance;
      const updatedBalance = await Balance.findOneAndUpdate(
        { user: req.user.id },
        { 
          $set: { 
            tokenCredits: quota,
            autoRefillEnabled: true,
            refillAmount: quota,
            refillIntervalUnit: renewalUnit,
            refillIntervalValue: renewalValue,
          },
          $setOnInsert: { lastRefill: new Date() }
        },
        { new: true, upsert: true }
      ).lean();
      
      if (updatedBalance) {
        balanceData = updatedBalance;
      }
    } catch (err) {
      console.error('[balanceController] Failed to auto-sync balance to subscription quota:', err);
    }
  }

  if (balanceData.autoRefillEnabled && balanceData.refillAmount > 0) {
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
          tokenAmount: balanceData.refillAmount,
        });
        if (result && result.balance) {
          balanceData = result.balance;
        }
      } catch (error) {
        console.error('[balanceController] Auto-refill failed:', error);
      }
    }
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
