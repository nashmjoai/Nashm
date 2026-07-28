const express = require('express');
const { createAdminConsoleHandlers } = require('@nashm/api');
const { SystemCapabilities } = require('@nashm/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const { loadModels } = require('~/server/controllers/ModelController');
const { invalidateConfigCaches } = require('~/server/services/Config');
const dbModels = require('~/db/models');

const router = express.Router();

const requireAdminAccess = requireCapability(SystemCapabilities.ACCESS_ADMIN);

const handlers = createAdminConsoleHandlers({
  User: dbModels.User,
  Session: dbModels.Session,
  Transaction: dbModels.Transaction,
  Message: dbModels.Message,
  Subscription: dbModels.Subscription,
  FamilyPlan: dbModels.FamilyPlan,
  ModelAccess: dbModels.ModelAccess,
  PlanConfig: dbModels.PlanConfig,
  Balance: dbModels.Balance,
  SupportTicket: dbModels.SupportTicket,
  Config: dbModels.Config,
  invalidateConfigCaches,
  loadModels,
});

router.use(requireJwtAuth, requireAdminAccess);

const upsertSubscriptionWithBalanceSync = async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = async function (data) {
    if (res.statusCode === 200 && req.body && req.body.userId) {
      try {
        const userId = req.body.userId;
        const plan = req.body.plan;
        const planConfig = await dbModels.PlanConfig.findOne({ plan }).lean();
        const renewalPeriod = planConfig?.renewalPeriod ?? 'monthly';
        let renewalUnit = 'months';
        let renewalValue = 1;
        if (renewalPeriod === 'weekly') renewalUnit = 'weeks';
        if (renewalPeriod === 'daily') renewalUnit = 'days';
        if (renewalPeriod === 'yearly') renewalUnit = 'years';

        const quota = planConfig?.tokenQuota ?? (
          plan === 'free' ? 50000 :
          plan === 'individual' ? 500000 :
          plan === 'family' ? 1000000 :
          plan === 'developer' ? 2000000 : 50000
        );

        let tokenCredits = typeof req.body.tokenBalance === 'number' && req.body.tokenBalance > 0
          ? req.body.tokenBalance
          : quota;

        await dbModels.Balance.findOneAndUpdate(
          { user: userId },
          {
            $set: {
              tokenCredits,
              autoRefillEnabled: true,
              refillAmount: quota,
              refillIntervalUnit: renewalUnit,
              refillIntervalValue: renewalValue,
            },
            $setOnInsert: { lastRefill: new Date() },
          },
          { new: true, upsert: true }
        );
      } catch (err) {
        console.error('[upsertSubscriptionWithBalanceSync] Error syncing balance:', err);
      }
    }
    return originalJson(data);
  };
  return handlers.upsertSubscription(req, res);
};

router.get('/overview', handlers.overview);
router.get('/users', handlers.users);
router.post('/subscription', upsertSubscriptionWithBalanceSync);
router.get('/models', handlers.models);
router.post('/model', handlers.updateModel);
router.get('/tickets', handlers.supportTickets);
router.post('/tickets/:id', handlers.updateSupportTicket);

// Plans management
const updatePlanWithBalanceSync = async (req, res) => {
  const originalJson = res.json.bind(res);
  res.json = async function (data) {
    if (res.statusCode === 200 && data && data.plan) {
      try {
        const plan = req.params.plan;
        const planConfig = data.plan;
        const targetRenewalPeriod = (plan === 'family' && planConfig.familyMemberRenewalPeriod)
          ? planConfig.familyMemberRenewalPeriod
          : (planConfig.renewalPeriod ?? 'monthly');

        let renewalUnit = 'months';
        if (targetRenewalPeriod === 'weekly') renewalUnit = 'weeks';
        if (targetRenewalPeriod === 'daily') renewalUnit = 'days';
        if (targetRenewalPeriod === 'yearly') renewalUnit = 'years';

        const quota = plan === 'family' && typeof planConfig.familyMemberTokenQuota === 'number'
          ? planConfig.familyMemberTokenQuota
          : planConfig.tokenQuota;

        const balanceUpdate = {
          refillIntervalUnit: renewalUnit,
          refillIntervalValue: 1,
        };
        if (typeof quota === 'number') {
          balanceUpdate.tokenCredits = quota;
          balanceUpdate.refillAmount = quota;
        }

        if (plan === 'free') {
          const nonFreeDirectUsers = await dbModels.Subscription.find({
            plan: { $in: ['individual', 'family', 'developer'] },
            status: 'active',
          }).distinct('user');

          const activeFamilyPlans = await dbModels.FamilyPlan.find({ status: 'active' }).lean();
          const familyUserIds = new Set();
          for (const fp of activeFamilyPlans) {
            if (fp.owner) familyUserIds.add(fp.owner.toString());
            if (fp.members) {
              for (const m of fp.members) {
                if (m.user) familyUserIds.add(m.user.toString());
              }
            }
          }

          const excludedUserIds = Array.from(
            new Set([
              ...nonFreeDirectUsers.map((id) => id.toString()),
              ...Array.from(familyUserIds),
            ])
          );

          await dbModels.Balance.updateMany(
            { user: { $nin: excludedUserIds } },
            { $set: balanceUpdate },
          );
        } else if (plan === 'family') {
          const directUserIds = await dbModels.Subscription.find({
            plan: 'family',
            status: 'active',
          }).distinct('user');

          const activeFamilyPlans = await dbModels.FamilyPlan.find({ status: 'active' }).lean();
          const familyUserIds = new Set();
          for (const fp of activeFamilyPlans) {
            if (fp.owner) familyUserIds.add(fp.owner.toString());
            if (fp.members) {
              for (const m of fp.members) {
                if (m.user) familyUserIds.add(m.user.toString());
              }
            }
          }

          const allFamilyUsers = Array.from(
            new Set([
              ...directUserIds.map((id) => id.toString()),
              ...Array.from(familyUserIds),
            ])
          );

          await dbModels.Balance.updateMany(
            { user: { $in: allFamilyUsers } },
            { $set: balanceUpdate },
          );
        } else {
          const activeSubscribedUsers = await dbModels.Subscription.find({
            plan,
            status: 'active',
          }).distinct('user');

          await dbModels.Balance.updateMany(
            { user: { $in: activeSubscribedUsers } },
            { $set: balanceUpdate },
          );
        }
      } catch (err) {
        console.error('[updatePlanWithBalanceSync] Error syncing balances:', err);
      }
    }
    return originalJson(data);
  };

  return handlers.updatePlan(req, res);
};

router.get('/plans', handlers.getPlans);
router.put('/plans/:plan', updatePlanWithBalanceSync);

// Admin users management
router.get('/admins', handlers.getAdmins);
router.post('/admins', handlers.addAdmin);
router.put('/admins/:userId', handlers.updateAdmin);
router.delete('/admins/:userId', handlers.removeAdmin);

// Features toggle endpoints
router.get('/features', handlers.getFeatures);
router.post('/features', handlers.updateFeatures);

module.exports = router;
