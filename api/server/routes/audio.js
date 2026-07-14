const express = require('express');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const mongoose = require('mongoose');
const multer = require('multer');
const { enqueueAudioJob, handleTranscriptionWebhook, getAudioJobStatus } = require('@nashm/api');
const { requireJwtAuth } = require('~/server/middleware');

// 1. Configure Multer for Audio Uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    const appConfig = req.config || { paths: { uploads: path.resolve(process.cwd(), 'uploads') } };
    const tempDir = path.join(appConfig.paths.uploads, 'temp', req.user.id);
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }
    cb(null, tempDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname).toLowerCase();
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `audio-${uniqueSuffix}${ext}`);
  }
});

const audioFilter = (req, file, cb) => {
  const allowedExtensions = ['.mp3', '.wav', '.m4a', '.ogg', '.mp4'];
  const ext = path.extname(file.originalname).toLowerCase();
  if (allowedExtensions.includes(ext)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid audio file type. Allowed formats: mp3, wav, m4a, ogg, mp4'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: audioFilter,
  limits: {
    fileSize: 200 * 1024 * 1024, // 200MB size limit
  }
});

const router = express.Router();

// 2. PUBLIC Webhook handler (does not require requireJwtAuth)
router.post('/webhook/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const { status, transcript_id, error } = req.body;

    // [SIGN-OFF LOG] Capture raw incoming webhook payload for evidence
    console.log('[Audio Webhook] ===== INCOMING WEBHOOK =====');
    console.log('[Audio Webhook] jobId:', jobId);
    console.log('[Audio Webhook] Headers:', JSON.stringify({
      'content-type': req.headers['content-type'],
      'x-webhook-secret': req.headers['x-webhook-secret'] ? '[PRESENT]' : '[MISSING]',
      'user-agent': req.headers['user-agent'],
      host: req.headers['host'],
    }, null, 2));
    console.log('[Audio Webhook] Body:', JSON.stringify(req.body, null, 2));
    console.log('[Audio Webhook] =============================');

    const AudioJobModel = mongoose.model('AudioJob');
    const job = await AudioJobModel.findOne({ jobId });
    if (!job) {
      // Silent rejection to prevent jobId discovery
      return res.status(200).send();
    }

    if (job.status !== 'transcribing') {
      // Silent rejection if the job is not in transcribing state
      return res.status(200).send();
    }

    const webhookSecretHeader = req.headers['x-webhook-secret'];
    if (!webhookSecretHeader || !job.webhookSecret) {
      return res.status(200).send();
    }

    const secretBuf = Buffer.from(webhookSecretHeader, 'utf-8');
    const jobBuf = Buffer.from(job.webhookSecret, 'utf-8');

    // timingSafeEqual requires buffers to have the same length
    if (secretBuf.length !== jobBuf.length) {
      return res.status(200).send();
    }

    const match = crypto.timingSafeEqual(secretBuf, jobBuf);
    if (!match) {
      return res.status(200).send();
    }

    if (typeof transcript_id !== 'string' || typeof status !== 'string') {
      return res.status(200).send();
    }

    res.status(200).send();

    setImmediate(() => {
      handleTranscriptionWebhook(jobId, transcript_id, status, error).catch((err) => {
        console.error(`[Audio Webhook] Failed to process transcription for ${jobId}:`, err);
      });
    });
    return;
  } catch (err) {
    console.error('[Audio Webhook] Error in webhook handler:', err);
    return res.status(200).send();
  }
});

// Enforce authentication on all subsequent endpoints
router.use(requireJwtAuth);

// 3. PROTECTED Transcription Upload endpoint
router.post('/transcribe', (req, res, next) => {
  upload.single('file')(req, res, (err) => {
    if (err) {
      return res.status(400).json({ error: err.message });
    }
    next();
  });
}, async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No audio file uploaded.' });
    }

    const { language_code, endpoint, model } = req.body;
    const uploadsDir = path.resolve(process.cwd(), 'uploads');

    const jobId = await enqueueAudioJob(
      req.user.id,
      req.file,
      language_code,
      endpoint,
      model,
      req.user.tenantId,
      uploadsDir
    );

    return res.status(200).json({ jobId });
  } catch (error) {
    if (error.message === 'MAX_CONCURRENT_JOBS_EXCEEDED') {
      return res.status(429).json({
        error: 'Too Many Requests',
        message: 'You have reached the maximum limit of 2 concurrent audio transcription jobs. Please wait for your existing jobs to complete.'
      });
    }
    console.error('[Audio Route] Transcribe error:', error);
    return res.status(500).json({ error: 'Failed to enqueue transcription: ' + error.message });
  }
});

// 4. PROTECTED Status endpoint
router.get('/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getAudioJobStatus(jobId, req.user.id);
    if (!job) {
      return res.status(404).json({ error: 'Job not found or access denied.' });
    }
    return res.status(200).json(job);
  } catch (error) {
    console.error('[Audio Route] Status error:', error);
    return res.status(500).json({ error: 'Failed to fetch job status.' });
  }
});

module.exports = router;
