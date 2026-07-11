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
    const { Subscription, Balance, PlanConfig, FamilyPlan } = require('~/models');
    
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
      { new: true, upsert: true }
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
        { $set: { status: 'inactive' } }
      ).catch(() => {}); // Silently ignore if no plan exists
    }

    // 4. Determine default token quota for the plan
    const planConfig = await PlanConfig.findOne({ plan }).lean();
    const quota = planConfig?.tokenQuota ?? (
      plan === 'free' ? 50000 :
      plan === 'individual' ? 500000 :
      plan === 'family' ? 1000000 :
      plan === 'developer' ? 2000000 : 50000
    );

    // 5. Update user balance with the new plan quota
    await Balance.findOneAndUpdate(
      { user: req.user.id },
      { $set: { tokenCredits: quota } },
      { new: true, upsert: true }
    );

    return res.status(200).json({ success: true, plan, quota });
  } catch (error) {
    console.error('Error upgrading plan:', error);
    return res.status(500).json({ error: 'Failed to upgrade plan' });
  }
});

module.exports = router;
