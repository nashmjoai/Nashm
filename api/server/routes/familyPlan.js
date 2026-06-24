const express = require('express');
const {
  isParentUser,
  addFamilyMember,
  removeFamilyMember,
  getActiveFamilyPlan,
} = require('@librechat/api');
const { requireJwtAuth } = require('../middleware/');
const { getUserByEmail } = require('~/models');
const db = require('~/models');

const router = express.Router();

/** Lazily initialise deps so the model is resolved at request time (after DB connect). */
const getDeps = () => ({ FamilyPlan: db.FamilyPlan });

/**
 * GET /api/family
 * Returns the active family plan for the authenticated user (as owner or member).
 */
router.get('/', requireJwtAuth, async (req, res) => {
  try {
    const plan = await getActiveFamilyPlan(req.user.id, getDeps());
    if (!plan) {
      return res.status(404).json({ error: 'No active family plan found' });
    }
    return res.json(plan);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * POST /api/family/members
 * Body: { email: string }
 * Parent adds a child member by their registered email.
 */
router.post('/members', requireJwtAuth, async (req, res) => {
  try {
    const isParent = await isParentUser(req.user.id, getDeps());
    if (!isParent) {
      return res.status(403).json({ error: 'Only the plan owner can manage members' });
    }

    const { email } = req.body;
    if (!email || typeof email !== 'string') {
      return res.status(400).json({ error: 'A valid email address is required' });
    }

    const childUser = await getUserByEmail(email.toLowerCase().trim());
    if (!childUser) {
      return res.status(404).json({ error: 'No registered user found with that email address' });
    }

    const plan = await addFamilyMember(
      req.user.id,
      childUser._id.toString(),
      email.toLowerCase().trim(),
      getDeps(),
    );
    return res.json(plan);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/family/members/:userId
 * Parent removes a child member by their user ID.
 */
router.delete('/members/:userId', requireJwtAuth, async (req, res) => {
  try {
    const isParent = await isParentUser(req.user.id, getDeps());
    if (!isParent) {
      return res.status(403).json({ error: 'Only the plan owner can manage members' });
    }

    const plan = await removeFamilyMember(req.user.id, req.params.userId, getDeps());
    return res.json(plan);
  } catch (err) {
    return res.status(400).json({ error: err.message });
  }
});

module.exports = router;
