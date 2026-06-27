const express = require('express');
const { createSupportHandlers } = require('@nashm/api');
const { requireJwtAuth } = require('~/server/middleware');
const dbModels = require('~/db/models');
const sendEmail = require('~/server/utils/sendEmail');

const router = express.Router();

const sendSupportEmail = async (payload) => {
  try {
    await sendEmail({
      email: payload.to,
      subject: `[Support Ticket] ${payload.subject}`,
      payload: {
        appName: process.env.APP_TITLE || 'Nashm',
        name: 'Admin',
        userEmail: payload.fromEmail,
        userName: payload.fromName || payload.fromEmail,
        userId: payload.userId,
        subject: payload.subject,
        message: payload.message,
        year: new Date().getFullYear(),
      },
      template: 'supportTicket.handlebars',
    });
    return { status: 'sent' };
  } catch (error) {
    console.error('[sendSupportEmail] error:', error);
    return { status: 'failed', error: error.message };
  }
};

const handlers = createSupportHandlers({
  SupportTicket: dbModels.SupportTicket,
  sendSupportEmail,
});

router.use(requireJwtAuth);

router.post('/', handlers.createTicket);

module.exports = router;
