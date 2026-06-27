const { verifyFamilyAccess } = require('@nashm/api');
const db = require('~/models');

/**
 * Express middleware: verifies the authenticated user belongs to an active
 * family plan before allowing them to send a message.
 *
 * Usage — apply AFTER requireJwtAuth on any gated route:
 *   router.post('/', requireJwtAuth, requireFamilyPlan, messageController);
 *
 * If your billing model uses a different gate (e.g., individual subscription +
 * family plan is an add-on), adjust the verifyFamilyAccess logic instead of
 * changing this middleware.
 */
async function requireFamilyPlan(req, res, next) {
  try {
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const hasAccess = await verifyFamilyAccess(userId, {
      FamilyPlan: db.FamilyPlan,
    });

    if (!hasAccess) {
      return res.status(403).json({
        error: 'Active family plan subscription required',
        code: 'FAMILY_PLAN_REQUIRED',
      });
    }

    return next();
  } catch (err) {
    return res.status(500).json({ error: 'Failed to verify subscription status' });
  }
}

module.exports = { requireFamilyPlan };
