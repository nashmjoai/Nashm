const { logger } = require('@nashm/data-schemas');
const { filterModelsBySubscription } = require('@nashm/api');
const { Subscription, FamilyPlan, ModelAccess } = require('~/db/models');
const { loadDefaultModels, loadConfigModels } = require('~/server/services/Config');

async function loadModels(req) {
  const defaultModelsConfig = await loadDefaultModels(req);
  const customModelsConfig = await loadConfigModels(req);
  return { ...defaultModelsConfig, ...customModelsConfig };
}

async function getModelsConfig(req) {
  const modelsConfig = await loadModels(req);
  return await filterModelsBySubscription({
    user: req.user,
    modelsConfig,
    deps: { Subscription, FamilyPlan, ModelAccess },
  });
}

async function modelController(req, res) {
  try {
    const filteredConfig = await getModelsConfig(req);
    res.send(filteredConfig);
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).send({ error: error.message });
  }
}

module.exports = { modelController, loadModels, getModelsConfig };
// trigger restart
