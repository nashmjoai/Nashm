const express = require('express');
const path = require('path');
const { enqueueExportJob, getJobStatus } = require('@nashm/api');
const { validateOfficeArtifact } = require('nashm-data-provider');
const { requireJwtAuth } = require('~/server/middleware');

const router = express.Router();

// Enforce JWT Auth on all routes
router.use(requireJwtAuth);

router.post('/export', async (req, res) => {
  try {
    const { artifactData, format } = req.body;
    if (!artifactData) {
      return res.status(400).json({ error: 'artifactData is required' });
    }

    if (!validateOfficeArtifact(artifactData)) {
      return res.status(400).json({ error: 'Invalid office artifact schema payload' });
    }

    const uploadsDir = path.resolve(process.cwd(), 'uploads');
    const jobId = await enqueueExportJob(req.user.id, artifactData, format, uploadsDir);
    
    return res.status(200).json({ jobId });
  } catch (error) {
    console.error('[Artifacts Route] Export error:', error);
    return res.status(500).json({ error: 'Failed to enqueue export job: ' + error.message });
  }
});

router.get('/export/status/:jobId', async (req, res) => {
  try {
    const { jobId } = req.params;
    const job = await getJobStatus(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }
    return res.status(200).json(job);
  } catch (error) {
    console.error('[Artifacts Route] Status error:', error);
    return res.status(500).json({ error: 'Failed to check job status' });
  }
});

module.exports = router;
