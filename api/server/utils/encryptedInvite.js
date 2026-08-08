const crypto = require('crypto');
const mongoose = require('mongoose');

const SECRET_HASH_PATTERN = /^[A-Za-z0-9_-]{43}$/;

const getHeader = (headers, name) => {
  const value = headers[name];
  return Array.isArray(value) ? value[0] : value;
};

const hashSecret = (secret) =>
  crypto.createHash('sha256').update(secret).digest('base64url');

const matchingSecret = (expected, actual) => {
  if (!SECRET_HASH_PATTERN.test(expected) || !SECRET_HASH_PATTERN.test(actual)) {
    return false;
  }
  return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(actual));
};

const invitationCredentials = (req) => {
  const supplied = req.body?.encryptedInvite;
  return {
    inviteId:
      typeof supplied?.inviteId === 'string'
        ? supplied.inviteId
        : getHeader(req.headers, 'x-nashm-encrypted-invite-id'),
    secret:
      typeof supplied?.secret === 'string'
        ? supplied.secret
        : getHeader(req.headers, 'x-nashm-encrypted-invite-secret'),
  };
};

async function authorizeEncryptedInvite(req, conversationId, requiredRole = 'read') {
  const { inviteId, secret } = invitationCredentials(req);
  if (!inviteId || !secret || inviteId.length > 128 || secret.length > 256) {
    return null;
  }

  const Invite = mongoose.models.EncryptedConversationInvite;
  if (!Invite) {
    return null;
  }

  const invite = await Invite.findOne({ inviteId, conversationId, active: true })
    .select('+secretHash')
    .lean();
  if (!invite || !matchingSecret(invite.secretHash, hashSecret(secret))) {
    return null;
  }
  if (requiredRole === 'write' && invite.role !== 'write') {
    return null;
  }
  if (!invite.recipientEmail) {
    return invite;
  }

  const User = mongoose.models.User;
  const recipient = await User.findById(req.user.id, 'email').lean();
  if (recipient?.email?.toLowerCase() !== invite.recipientEmail.toLowerCase()) {
    return null;
  }
  return invite;
}

module.exports = { authorizeEncryptedInvite, hashSecret, SECRET_HASH_PATTERN };
