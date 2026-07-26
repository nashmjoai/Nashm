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
const { requireJwtAuth } = require('~/server/middleware');
const { updateUser, getUserById } = require('~/models');
const { logger } = require('@nashm/data-schemas');

const router = express.Router();

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
      e2eeEnabled: user.e2eeEnabled ?? false,
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

    if (!salt || typeof salt !== 'string') {
      return res.status(400).json({ message: 'Salt is required' });
    }

    if (!wrappedKeyRecovery || !wrappedKeyPassphrase) {
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

/**
 * POST /api/e2ee/nextcloud/verify
 * التحقق من صحة سيرفر Nextcloud قبل حفظ الإعدادات
 *
 * Body: { serverUrl: string }
 */
/**
 * TODO: Phase 2 - Nextcloud Sync Routes (Deferred to Phase 2)
 */
router.all('/nextcloud/*', (req, res) => {
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
