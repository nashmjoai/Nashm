const express = require('express');
const {
  isParentUser,
  addFamilyMember,
  removeFamilyMember,
  getActiveFamilyPlan,
} = require('@nashm/api');
const { requireJwtAuth } = require('../middleware/');
const { findUser } = require('~/models');
const { Conversation, Message, FamilyPlan } = require('~/db/models');
const { logger } = require('@nashm/data-schemas');

const router = express.Router();

/** Lazily initialise deps so the model is resolved at request time (after DB connect). */
const getDeps = () => ({ FamilyPlan });

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

    let childUser = await findUser({ email: email.toLowerCase().trim() });
    let tempPassword = null;

    if (!childUser) {
      // Auto-create user for unregistered email addresses
      const { registerUser } = require('~/server/services/AuthService');
      const crypto = require('crypto');

      // Generate standard random password (16 chars with mixed characters)
      tempPassword = crypto.randomBytes(8).toString('hex') + 'aA1!';
      const username =
        email.split('@')[0].replace(/[^a-zA-Z0-9]/g, '') +
        '_' +
        crypto.randomBytes(3).toString('hex');

      const regResult = await registerUser(
        {
          name: email.split('@')[0],
          email: email.toLowerCase().trim(),
          password: tempPassword,
          confirm_password: tempPassword,
          username,
        },
        {
          emailVerified: true, // Automatically verify so they can log in immediately
        },
      );

      if (regResult.status !== 200) {
        return res.status(regResult.status).json({ error: regResult.message });
      }

      childUser = await findUser({ email: email.toLowerCase().trim() });
    }

    const plan = await addFamilyMember(
      req.user.id,
      childUser._id.toString(),
      email.toLowerCase().trim(),
      getDeps(),
    );

    // Apply the family plan token quota to the new member's balance
    try {
      const { upsertBalanceFields } = require('~/models');
      const { PlanConfig } = require('~/db/models');
      const planConfig = await PlanConfig.findOne({ plan: 'family' }).lean();
      const memberQuota = planConfig?.familyMemberTokenQuota ?? planConfig?.tokenQuota ?? 1000000;
      await upsertBalanceFields(childUser._id.toString(), { tokenCredits: memberQuota });
    } catch (balanceErr) {
      logger.error('[familyPlan] Failed to set member balance:', balanceErr);
    }

    // Send invitation email to the added member
    const { sendEmail } = require('~/server/utils');
    const { checkEmailConfig } = require('@nashm/api');
    if (checkEmailConfig()) {
      const clientDomain = process.env.DOMAIN_CLIENT || 'http://localhost:3080';
      const resolvedClientDomain =
        process.env.NODE_ENV === 'development' &&
        (clientDomain === 'http://localhost:3080' || clientDomain.includes(':3080'))
          ? 'http://localhost:3090'
          : clientDomain;

      sendEmail({
        email: childUser.email,
        subject: `You've been added to a Family Plan on ${process.env.APP_TITLE || 'Nashm'}`,
        payload: {
          appName: process.env.APP_TITLE || 'Nashm',
          memberName: childUser.name || childUser.username || childUser.email,
          ownerName: req.user.name || req.user.username || req.user.email,
          loginLink: `${resolvedClientDomain}/login`,
          email: childUser.email,
          tempPassword,
          year: new Date().getFullYear(),
        },
        template: 'familyInvite.handlebars',
      }).catch((err) => logger.error('[familyPlan] Invite email failed:', err));
    }

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

/**
 * GET /api/family/members/activity
 * Returns activity data for all family members.
 */
router.get('/members/activity', requireJwtAuth, async (req, res) => {
  try {
    const isParent = await isParentUser(req.user.id, getDeps());
    if (!isParent) {
      return res.status(403).json({ error: 'Only the plan owner can view activity' });
    }

    const plan = await getActiveFamilyPlan(req.user.id, getDeps());
    if (!plan) {
      return res.status(404).json({ error: 'No active family plan' });
    }

    const childMembers = plan.members.filter((m) => m.role === 'child');
    const childUserIds = childMembers.map((m) => m.user.toString());

    // Get conversation counts and last activity for each member
    const activityData = await Promise.all(
      childUserIds.map(async (userId) => {
        const [convCount, lastConv] = await Promise.all([
          Conversation.countDocuments({ user: userId }),
          Conversation.findOne({ user: userId }).sort({ updatedAt: -1 }).lean(),
        ]);
        const member = childMembers.find((m) => m.user.toString() === userId);
        return {
          userId,
          email: member?.email,
          conversationCount: convCount,
          lastActivity: lastConv?.updatedAt || null,
          lastConversationTitle: lastConv?.title || null,
        };
      }),
    );

    return res.json({ members: activityData });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/family/members/:userId/conversations
 * Returns the list of conversations for a family member.
 * Accessible only to the plan owner.
 */
router.get('/members/:userId/conversations', requireJwtAuth, async (req, res) => {
  try {
    const plan = await getActiveFamilyPlan(req.user.id, getDeps());
    if (!plan || plan.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the plan owner can view member conversations' });
    }

    const isMember = plan.members.some(
      (m) => m.user.toString() === req.params.userId && m.role === 'child',
    );
    if (!isMember) {
      return res.status(403).json({ error: 'Requested user is not a member of your family plan' });
    }

    const conversations = await Conversation.find({ user: req.params.userId })
      .sort({ updatedAt: -1 })
      .lean();

    return res.json(conversations);
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/family/members/:userId/conversations/:conversationId
 * Returns the list of messages in a conversation for a family member.
 * Accessible only to the plan owner.
 */
router.get('/members/:userId/conversations/:conversationId', requireJwtAuth, async (req, res) => {
  try {
    const plan = await getActiveFamilyPlan(req.user.id, getDeps());
    if (!plan || plan.owner.toString() !== req.user.id) {
      return res.status(403).json({ error: 'Only the plan owner can view member messages' });
    }

    const isMember = plan.members.some(
      (m) => m.user.toString() === req.params.userId && m.role === 'child',
    );
    if (!isMember) {
      return res.status(403).json({ error: 'Requested user is not a member of your family plan' });
    }

    const [conversation, messages] = await Promise.all([
      Conversation.findOne({
        conversationId: req.params.conversationId,
        user: req.params.userId,
      }).lean(),
      Message.find({ conversationId: req.params.conversationId, user: req.params.userId })
        .sort({ createdAt: 1 })
        .lean(),
    ]);

    if (!conversation) {
      return res.status(404).json({ error: 'Conversation not found' });
    }

    return res.json({ conversation, messages });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

module.exports = router;
