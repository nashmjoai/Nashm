/**
 * E2EE API Routes
 *
 * واجهة برمجية لإدارة إعدادات التشفير طرف-لطرف ومزامنة Nextcloud.
 *
 * المسارات:
 *  POST /api/e2ee/setup          - تفعيل E2EE وحفظ Salt + Public Key
 *  GET  /api/e2ee/status         - جلب حالة E2EE للمستخدم الحالي
 *  GET  /api/e2ee/salt           - جلب Salt للمستخدم لاشتقاق المفتاح الرئيسي
 *  POST /api/e2ee/nextcloud/verify - التحقق من سيرفر Nextcloud
 *  POST /api/e2ee/nextcloud/connect - حفظ إعدادات ربط Nextcloud
 *  DELETE /api/e2ee/nextcloud    - إلغاء ربط Nextcloud
 *  POST /api/e2ee/nextcloud/sync - تسجيل آخر وقت مزامنة ناجح
 *  DELETE /api/e2ee/disable      - تعطيل E2EE (حذف المفاتيح وإعادة النصوص plaintext)
 */

const express = require('express');
const crypto = require('crypto');
const { requireJwtAuth } = require('~/server/middleware');
const { updateUser } = require('~/models');
const { deleteConvoSharedLinksWithCleanup } = require('@nashm/api');
const { logger } = require('@nashm/data-schemas');
const db = require('~/models');
const { authorizeEncryptedInvite, SECRET_HASH_PATTERN } = require('~/server/utils/encryptedInvite');

const router = express.Router();

const MAX_ENCRYPTED_PAYLOAD_BYTES = 10 * 1024 * 1024;
const MAX_ENCRYPTED_SNAPSHOT_MESSAGES = 1000;
const BASE64_PATTERN = /^[A-Za-z0-9+/]+={0,2}$/;

function isEncryptedPayload(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const { v, ct, iv } = value;
  return (
    v === 'zk-v1' &&
    typeof ct === 'string' &&
    typeof iv === 'string' &&
    ct.length > 0 &&
    ct.length <= MAX_ENCRYPTED_PAYLOAD_BYTES &&
    iv.length === 16 &&
    BASE64_PATTERN.test(ct) &&
    BASE64_PATTERN.test(iv)
  );
}

function isWrappedConversationKey(value) {
  return (
    typeof value === 'string' &&
    value.length >= 80 &&
    value.length <= 512 &&
    BASE64_PATTERN.test(value)
  );
}

function optionalString(value, maxLength = 512) {
  return typeof value === 'string' && value.length <= maxLength ? value : undefined;
}

function validInviteRole(value) {
  return value === 'read' || value === 'write';
}

/** Keep only non-sensitive message metadata needed to render a conversation tree. */
function publicMessageMetadata(message) {
  const data = message.message ?? {};
  return {
    parentMessageId: optionalString(data.parentMessageId, 128),
    isCreatedByUser: data.isCreatedByUser,
    sender: optionalString(data.sender, 128),
    model: optionalString(data.model, 512),
    endpoint: optionalString(data.endpoint, 128),
    tokenCount: Number.isSafeInteger(data.tokenCount) && data.tokenCount >= 0 ? data.tokenCount : undefined,
    iconURL: optionalString(data.iconURL, 2048),
    finish_reason: optionalString(data.finish_reason, 128),
    error: typeof data.error === 'boolean' ? data.error : undefined,
    unfinished: typeof data.unfinished === 'boolean' ? data.unfinished : undefined,
    thread_id: optionalString(data.thread_id, 512),
  };
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * جلب إعدادات E2EE للمستخدم مع select للحقول الحساسة
 */
async function getUserE2EESettings(userId) {
  const { User } = require('@nashm/data-schemas');
  return User.findById(userId)
    .select('+keySalt nextcloudSync e2eeEnabled publicKey')
    .lean();
}

// ─── Routes ──────────────────────────────────────────────────────────────────

/**
 * GET /api/e2ee/status
 * جلب حالة E2EE للمستخدم الحالي
 */
router.get('/status', requireJwtAuth, async (req, res) => {
  try {
    const user = await getUserE2EESettings(req.user.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    return res.json({
      enabled: user.e2eeEnabled ?? false,
      hasSalt: !!user.keySalt,
      hasPublicKey: !!user.publicKey,
      nextcloudSync: user.nextcloudSync
        ? {
            enabled: user.nextcloudSync.enabled,
            serverUrl: user.nextcloudSync.serverUrl,
            ncUsername: user.nextcloudSync.ncUsername,
            syncFolder: user.nextcloudSync.syncFolder,
            lastSyncAt: user.nextcloudSync.lastSyncAt,
            // لا نرسل encryptedToken أبداً
          }
        : null,
    });
  } catch (err) {
    logger.error('[E2EE] Failed to get status:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * GET /api/e2ee/salt
 * جلب Salt المستخدم لاشتقاق المفتاح الرئيسي (آمن للإرسال)
 */
router.get('/salt', requireJwtAuth, async (req, res) => {
  try {
    const { User } = require('@nashm/data-schemas');
    const user = await User.findById(req.user.id)
      .select('+keySalt +wrappedKeyRecovery +wrappedKeyPassphrase')
      .lean();

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    if (!user.keySalt) {
      return res.status(404).json({ message: 'E2EE not set up for this account' });
    }

    return res.json({
      salt: user.keySalt,
      wrappedKeyRecovery: user.wrappedKeyRecovery,
      wrappedKeyPassphrase: user.wrappedKeyPassphrase,
    });
  } catch (err) {
    logger.error('[E2EE] Failed to get salt & wrapped keys:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/e2ee/setup
 * تفعيل E2EE للمستخدم - يُستدعى مرة واحدة فقط
 *
 * Body: { salt: string, publicKey?: string }
 *  - salt: Salt عشوائي 16 بايت (Base64) لاشتقاق المفتاح الرئيسي
 *  - publicKey: المفتاح العام للمستخدم (اختياري)
 */
router.post('/setup', requireJwtAuth, async (req, res) => {
  try {
    const { salt, wrappedKeyRecovery, wrappedKeyPassphrase, publicKey } = req.body;

    if (!salt || typeof salt !== 'string' || salt.length !== 24 || !BASE64_PATTERN.test(salt)) {
      return res.status(400).json({ message: 'Salt is required' });
    }

    if (!isEncryptedPayload(wrappedKeyRecovery) || !isEncryptedPayload(wrappedKeyPassphrase)) {
      return res.status(400).json({ message: 'wrappedKeyRecovery and wrappedKeyPassphrase are required' });
    }

    const existingUser = await getUserE2EESettings(req.user.id);
    if (existingUser?.e2eeEnabled && existingUser?.keySalt) {
      return res.status(409).json({
        message: 'E2EE is already enabled for this account',
        alreadyEnabled: true,
      });
    }

    const updateData = {
      e2eeEnabled: true,
      keySalt: salt,
      wrappedKeyRecovery,
      wrappedKeyPassphrase,
    };

    if (publicKey && typeof publicKey === 'string') {
      updateData.publicKey = publicKey;
    }

    await updateUser(req.user.id, updateData);

    logger.info(`[E2EE] Enabled for user: ${req.user.id}`);

    return res.status(201).json({ success: true, message: 'E2EE enabled successfully' });
  } catch (err) {
    logger.error('[E2EE] Setup failed:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/** Stores a client-wrapped per-conversation key. The server never receives the key material. */
router.put('/conversations/:conversationId/key', requireJwtAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { wrappedKey } = req.body ?? {};
    if (conversationId.length > 128 || !isWrappedConversationKey(wrappedKey)) {
      return res.status(400).json({ message: 'Invalid wrapped conversation key' });
    }

    const conversation = await db.getConvo(req.user.id, conversationId);
    if (!conversation) {
      return res.status(404).json({ message: 'Conversation not found' });
    }

    await db.saveConvo(
      { userId: req.user.id },
      { conversationId, isEncrypted: true, encryptedKeyRef: wrappedKey },
      { context: 'PUT /api/e2ee/conversations/:conversationId/key' },
    );
    return res.status(204).end();
  } catch (err) {
    logger.error('[E2EE] Failed to save wrapped conversation key:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/** Retrieves a wrapped key only for the authenticated conversation owner. */
router.get('/conversations/:conversationId/key', requireJwtAuth, async (req, res) => {
  try {
    const conversation = await db.getConvo(req.user.id, req.params.conversationId);
    if (!conversation?.isEncrypted || !isWrappedConversationKey(conversation.encryptedKeyRef)) {
      return res.status(404).json({ message: 'Encrypted conversation key not found' });
    }

    return res.json({ wrappedKey: conversation.encryptedKeyRef });
  } catch (err) {
    logger.error('[E2EE] Failed to retrieve wrapped conversation key:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

router.post('/conversations/:conversationId/invitations', requireJwtAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { role, recipientEmail, secretHash, encryptedConversationKey } = req.body ?? {};
    if (
      conversationId.length > 128 ||
      !validInviteRole(role) ||
      !isEncryptedPayload(encryptedConversationKey) ||
      typeof secretHash !== 'string' ||
      !SECRET_HASH_PATTERN.test(secretHash) ||
      (recipientEmail !== undefined &&
        (typeof recipientEmail !== 'string' || recipientEmail.length > 320 || !/^\S+@\S+\.\S+$/.test(recipientEmail)))
    ) {
      return res.status(400).json({ message: 'Invalid encrypted invitation' });
    }

    const conversation = await db.getConvo(req.user.id, conversationId);
    if (!conversation?.isEncrypted) {
      return res.status(404).json({ message: 'Encrypted conversation not found' });
    }

    const Invite = mongoose.models.EncryptedConversationInvite;
    const inviteId = crypto.randomUUID();
    await Invite.create({
      inviteId,
      conversationId,
      ownerUserId: req.user.id,
      recipientEmail: recipientEmail?.trim().toLowerCase() || undefined,
      role,
      secretHash,
      encryptedConversationKey,
      tenantId: req.user.tenantId,
      active: true,
    });
    return res.status(201).json({ inviteId });
  } catch (err) {
    logger.error('[E2EE] Failed to create encrypted invitation:', err);
    return res.status(500).json({ message: 'Failed to create encrypted invitation' });
  }
});

router.get('/invitations/:inviteId', requireJwtAuth, async (req, res) => {
  try {
    const { inviteId } = req.params;
    const Invite = mongoose.models.EncryptedConversationInvite;
    const candidate = await Invite.findOne({ inviteId, active: true }, 'conversationId').lean();
    if (!candidate) {
      return res.status(404).json({ message: 'Invitation not found' });
    }
    const invite = await authorizeEncryptedInvite(req, candidate.conversationId);
    if (!invite) {
      return res.status(403).json({ message: 'Invitation access denied' });
    }
    return res.json({
      conversationId: invite.conversationId,
      role: invite.role,
      encryptedConversationKey: invite.encryptedConversationKey,
    });
  } catch (err) {
    logger.error('[E2EE] Failed to open encrypted invitation:', err);
    return res.status(500).json({ message: 'Failed to open encrypted invitation' });
  }
});

/**
 * Replaces persisted plaintext message bodies with browser-encrypted payloads.
 * Only cryptographic envelopes are accepted; the server cannot decrypt them.
 */
router.post('/conversations/:conversationId/snapshot', requireJwtAuth, async (req, res) => {
  try {
    const { conversationId } = req.params;
    const { wrappedKey, messages, conversation: conversationData } = req.body ?? {};
    const invite = await authorizeEncryptedInvite(req, conversationId, 'write');
    if (req.body?.encryptedInvite && !invite) {
      return res.status(403).json({ message: 'Invitation write access denied' });
    }
    const ownerUserId = invite?.ownerUserId ?? req.user.id;
    if (
      conversationId.length > 128 ||
      (!invite && !isWrappedConversationKey(wrappedKey)) ||
      !Array.isArray(messages) ||
      messages.length === 0
    ) {
      return res.status(400).json({ message: 'Invalid encrypted conversation snapshot' });
    }
    if (messages.length > MAX_ENCRYPTED_SNAPSHOT_MESSAGES || messages.some((message) =>
      !message ||
      typeof message.messageId !== 'string' ||
      !isEncryptedPayload(message.encryptedData) ||
      !message.message ||
      typeof message.message.isCreatedByUser !== 'boolean',
    )) {
      return res.status(400).json({ message: 'Invalid encrypted message payload' });
    }

    const messageIds = messages.map((message) => message.messageId);
    if (new Set(messageIds).size !== messageIds.length || messageIds.some((id) => id.length > 128)) {
      return res.status(400).json({ message: 'Invalid encrypted message identifiers' });
    }
    const storedMessages = await db.getMessages({
      conversationId,
      user: ownerUserId,
      messageId: { $in: messageIds },
    });
    const storedMessageIds = new Set(storedMessages.map((message) => message.messageId));
    await Promise.all(
      messages.map((message) => {
        if (storedMessageIds.has(message.messageId)) {
          return db.updateMessage(ownerUserId, {
            messageId: message.messageId,
            text: '',
            summary: '',
            content: [],
            quotes: [],
            encryptedData: message.encryptedData,
            isEncrypted: true,
          });
        }

        return db.saveMessage(
          { userId: ownerUserId },
          {
            ...publicMessageMetadata(message),
            messageId: message.messageId,
            conversationId,
            text: '',
            summary: '',
            content: [],
            quotes: [],
            encryptedData: message.encryptedData,
            isEncrypted: true,
          },
          { context: 'POST /api/e2ee/conversations/:conversationId/snapshot' },
        );
      }),
    );
    await db.saveConvo(
      { userId: ownerUserId },
      {
        conversationId,
        title: 'Encrypted conversation',
        endpoint: optionalString(conversationData?.endpoint, 128),
        endpointType: optionalString(conversationData?.endpointType, 128),
        model: optionalString(conversationData?.model, 512),
        agent_id: optionalString(conversationData?.agent_id, 512),
        assistant_id: optionalString(conversationData?.assistant_id, 512),
        chatProjectId: optionalString(conversationData?.chatProjectId, 128),
        isTemporary: conversationData?.isTemporary === true,
        isEncrypted: true,
        encryptedKeyRef: invite ? undefined : wrappedKey,
      },
      { context: 'POST /api/e2ee/conversations/:conversationId/snapshot' },
    );
    await deleteConvoSharedLinksWithCleanup(ownerUserId, conversationId);

    return res.status(204).end();
  } catch (err) {
    logger.error('[E2EE] Failed to save encrypted conversation snapshot:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/e2ee/nextcloud/verify
 * التحقق من صحة سيرفر Nextcloud قبل حفظ الإعدادات
 *
 * Body: { serverUrl: string }
 */
/**
 * TODO: Phase 2 - Nextcloud Sync Routes (Deferred to Phase 2)
 */
router.use('/nextcloud', (req, res) => {
  return res.status(501).json({ message: 'Nextcloud Sync is deferred to Phase 2' });
});

/*
router.post('/nextcloud/verify', requireJwtAuth, async (req, res) => {

  try {
    const { serverUrl } = req.body;

    if (!serverUrl || typeof serverUrl !== 'string') {
      return res.status(400).json({ message: 'serverUrl is required' });
    }

    // التحقق من صيغة URL
    let parsedUrl;
    try {
      parsedUrl = new URL(serverUrl);
    } catch {
      return res.status(400).json({ message: 'Invalid URL format' });
    }

    if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
      return res.status(400).json({ message: 'Only http and https are supported' });
    }

    // فحص السيرفر عبر /status.php
    const statusUrl = serverUrl.replace(/\/$/, '') + '/status.php';
    const response = await fetch(statusUrl, {
      method: 'GET',
      signal: AbortSignal.timeout(10000), // 10 ثوان timeout
    });

    if (!response.ok) {
      return res.status(400).json({
        success: false,
        message: `Server returned HTTP ${response.status}`,
      });
    }

    const status = await response.json();

    if (!status.installed) {
      return res.status(400).json({
        success: false,
        message: 'Nextcloud is not installed on this server',
      });
    }

    return res.json({
      success: true,
      version: status.versionstring || status.version,
      productname: status.productname,
      maintenance: status.maintenance,
    });
  } catch (err) {
    if (err.name === 'TimeoutError' || err.name === 'AbortError') {
      return res.status(408).json({ success: false, message: 'Connection timed out' });
    }
    logger.error('[E2EE] Nextcloud verify failed:', err);
    return res.status(500).json({ success: false, message: 'Failed to connect to server' });
  }
});

/**
 * POST /api/e2ee/nextcloud/connect
 * حفظ إعدادات ربط سيرفر Nextcloud
 *
 * Body: {
 *   serverUrl: string,
 *   ncUsername: string,
 *   encryptedToken: string,  // App Token مشفر بمفتاح المستخدم (يشفره الـ Client)
 *   syncFolder?: string,
 * }
 */
router.post('/nextcloud/connect', requireJwtAuth, async (req, res) => {
  try {
    const { serverUrl, ncUsername, encryptedToken, syncFolder } = req.body;

    if (!serverUrl || !ncUsername || !encryptedToken) {
      return res.status(400).json({
        message: 'serverUrl, ncUsername, and encryptedToken are required',
      });
    }

    // التحقق أن E2EE مفعل
    const user = await getUserE2EESettings(req.user.id);
    if (!user?.e2eeEnabled) {
      return res.status(403).json({
        message: 'E2EE must be enabled before connecting Nextcloud',
      });
    }

    await updateUser(req.user.id, {
      nextcloudSync: {
        enabled: true,
        serverUrl: serverUrl.replace(/\/$/, ''),
        ncUsername,
        encryptedToken,
        syncFolder: syncFolder || '/Nashm-E2EE',
        lastSyncAt: null,
      },
    });

    logger.info(`[E2EE] Nextcloud connected for user: ${req.user.id}`);

    return res.json({ success: true, message: 'Nextcloud connected successfully' });
  } catch (err) {
    logger.error('[E2EE] Nextcloud connect failed:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * POST /api/e2ee/nextcloud/sync
 * تحديث وقت آخر مزامنة ناجحة
 */
router.post('/nextcloud/sync', requireJwtAuth, async (req, res) => {
  try {
    const { User } = require('@nashm/data-schemas');
    await User.findByIdAndUpdate(req.user.id, {
      'nextcloudSync.lastSyncAt': new Date(),
    });

    return res.json({ success: true, syncedAt: new Date().toISOString() });
  } catch (err) {
    logger.error('[E2EE] Failed to update sync time:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

/**
 * DELETE /api/e2ee/nextcloud
 * إلغاء ربط Nextcloud
 */
router.delete('/nextcloud', requireJwtAuth, async (req, res) => {
  try {
    await updateUser(req.user.id, {
      nextcloudSync: undefined,
    });

    logger.info(`[E2EE] Nextcloud disconnected for user: ${req.user.id}`);

    return res.json({ success: true, message: 'Nextcloud disconnected' });
  } catch (err) {
    logger.error('[E2EE] Nextcloud disconnect failed:', err);
    return res.status(500).json({ message: 'Internal server error' });
  }
});

module.exports = router;
