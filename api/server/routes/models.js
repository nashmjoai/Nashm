const express = require('express');
const { modelCatalogController, modelController } = require('~/server/controllers/ModelController');
const { requireJwtAuth } = require('~/server/middleware/');

const router = express.Router();
router.get('/catalog', requireJwtAuth, modelCatalogController);
router.get('/', requireJwtAuth, modelController);

module.exports = router;
