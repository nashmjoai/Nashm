const express = require('express');
const { logger } = require('@nashm/data-schemas');
const dbModels = require('~/db/models');

const router = express.Router();

router.get('/', async (req, res) => {
  try {
    const existing = await dbModels.PlanConfig.find({}).lean();
    const existingByPlan = new Map(existing.map((p) => [p.plan, p]));

    const defaultConfigs = [
      { plan: 'free', tokenQuota: 50000, renewalPeriod: 'monthly' },
      { plan: 'individual', tokenQuota: 500000, renewalPeriod: 'monthly' },
      { plan: 'family', tokenQuota: 1000000, renewalPeriod: 'monthly' },
      { plan: 'developer', tokenQuota: 2000000, renewalPeriod: 'monthly' },
    ];

    const plans = defaultConfigs.map(({ plan, tokenQuota, renewalPeriod }) => {
      const config = existingByPlan.get(plan);
      return config
        ? {
            plan: config.plan,
            displayName: config.displayName,
            description: config.description,
            priceText: config.priceText,
            features: config.features,
            tokenQuota: config.tokenQuota,
            renewalPeriod: config.renewalPeriod,
          }
        : { plan, tokenQuota, renewalPeriod, features: [] };
    });

    return res.status(200).json({ plans });
  } catch (error) {
    logger.error('[public plans] get error:', error);
    return res.status(500).json({ error: 'Failed to load plans' });
  }
});

module.exports = router;
