const express = require('express');
const { createAdminConsoleHandlers } = require('@nashm/api');
const { SystemCapabilities } = require('@nashm/data-schemas');
const { requireCapability } = require('~/server/middleware/roles/capabilities');
const { requireJwtAuth } = require('~/server/middleware');
const { loadModels } = require('~/server/controllers/ModelController');
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
  SupportTicket: dbModels.SupportTicket,
  loadModels,
});

router.use(requireJwtAuth, requireAdminAccess);

router.get('/overview', handlers.overview);
router.get('/users', handlers.users);
router.post('/subscription', handlers.upsertSubscription);
router.get('/models', handlers.models);
router.post('/model', handlers.updateModel);
router.get('/tickets', handlers.supportTickets);
router.post('/tickets/:id', handlers.updateSupportTicket);

module.exports = router;
