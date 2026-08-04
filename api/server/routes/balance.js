const express = require('express');
const { createSetBalanceConfig } = require('@nashm/api');
const router = express.Router();
const controller = require('../controllers/Balance');
const { requireJwtAuth } = require('../middleware/');
const { findBalanceByUser, upsertBalanceFields } = require('~/models');
const { getAppConfig } = require('~/server/services/Config');

const setBalanceConfig = createSetBalanceConfig({
  getAppConfig,
  findBalanceByUser,
  upsertBalanceFields,
});

router.get('/', requireJwtAuth, setBalanceConfig, controller);

router.post('/upgrade', requireJwtAuth, async (req, res) => {
  const { plan } = req.body;
  const validPlans = ['free', 'individual', 'family', 'developer'];
  if (!validPlans.includes(plan)) {
    return res.status(400).json({ error: 'Invalid plan' });
  }

  try {
    const { Subscription, Balance, PlanConfig, FamilyPlan } = require('~/db/models');

    // 1. Update subscription in database
    await Subscription.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          user: req.user.id,
          plan: plan,
          status: 'active',
          source: 'manual',
        },
        $setOnInsert: { startsAt: new Date() },
      },
      { new: true, upsert: true },
    );

    // 2. If upgrading to family plan, create a FamilyPlan record
    if (plan === 'family') {
      const existingPlan = await FamilyPlan.findOne({
        owner: req.user.id,
        status: 'active',
      });

      if (!existingPlan) {
        await FamilyPlan.create({
          owner: req.user.id,
          status: 'active',
          members: [
            {
              user: req.user.id,
              email: req.user.email,
              role: 'owner',
              addedAt: new Date(),
            },
          ],
        });
      }
    }

    // 3. If downgrading FROM family plan, deactivate the family plan
    if (plan !== 'family') {
      await FamilyPlan.findOneAndUpdate(
        { owner: req.user.id, status: 'active' },
        { $set: { status: 'inactive' } },
      ).catch(() => {}); // Silently ignore if no plan exists
    }

    // 4. Determine default token quota and renewal period for the plan
    const planConfig = await PlanConfig.findOne({ plan }).lean();
    const planLimits = {
      free: 50000,
      individual: 500000,
      family: 1000000,
      developer: 2000000,
    };
    const defaultQuota = planConfig?.tokenQuota ?? planLimits[plan] ?? 50000;
    const quota =
      plan === 'family' && typeof planConfig?.familyMemberTokenQuota === 'number'
        ? planConfig.familyMemberTokenQuota
        : defaultQuota;

    const renewalPeriod =
      plan === 'family' && planConfig?.familyMemberRenewalPeriod
        ? planConfig.familyMemberRenewalPeriod
        : (planConfig?.renewalPeriod ?? 'monthly');
    let renewalUnit = 'months';
    let renewalValue = 1;
    if (renewalPeriod === 'weekly') renewalUnit = 'weeks';
    if (renewalPeriod === 'daily') renewalUnit = 'days';
    if (renewalPeriod === 'yearly') renewalUnit = 'years';

    // 5. Update user balance with the new plan quota and auto-refill settings
    await Balance.findOneAndUpdate(
      { user: req.user.id },
      {
        $set: {
          tokenCredits: quota,
          autoRefillEnabled: true,
          refillAmount: quota,
          refillIntervalUnit: renewalUnit,
          refillIntervalValue: renewalValue,
          renewalMode: 'reset',
          lastRefill: new Date(),
        },
      },
      { new: true, upsert: true },
    );

    return res.status(200).json({ success: true, plan, quota });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

module.exports = router;
