const { logger } = require('@nashm/data-schemas');
const {
  filterModelsBySubscription,
  getDefaultAllowedPlans,
  getEffectiveSubscription,
} = require('@nashm/api');
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

async function modelCatalogController(req, res) {
  try {
    const [modelsConfig, effective, rules] = await Promise.all([
      loadModels(req),
      getEffectiveSubscription(req.user, { Subscription, FamilyPlan }),
      ModelAccess.find({}).lean(),
    ]);
    const rulesByModel = new Map(
      rules.map((rule) => [`${rule.endpoint}\u0000${rule.model}`, rule]),
    );
    const isAdmin = req.user?.role === 'ADMIN';
    const catalogEntries = Object.entries(modelsConfig).map(([endpoint, models]) => {
      const endpointRule = rulesByModel.get(`${endpoint}\u0000*`);
      const items = models
        .map((model, index) => {
          const modelRule = rulesByModel.get(`${endpoint}\u0000${model}`);
          const requiredPlans =
            modelRule != null ? modelRule.allowedPlans : getDefaultAllowedPlans(model);
          return {
            index,
            model,
            label: modelRule?.label,
            sortOrder:
              typeof modelRule?.sortOrder === 'number' && Number.isFinite(modelRule.sortOrder)
                ? modelRule.sortOrder
                : index,
            isDefault: modelRule?.isDefault === true,
            showInChat: modelRule?.showInChat !== false,
            capabilities: modelRule?.capabilities ?? [],
            available:
              modelRule?.enabled !== false && (isAdmin || requiredPlans.includes(effective.plan)),
            requiredPlans,
          };
        })
        .filter((item) => endpointRule?.enabled !== false)
        .filter((item) => rulesByModel.get(`${endpoint}\u0000${item.model}`)?.enabled !== false)
        .filter((item) => item.showInChat)
        .filter((item) => isAdmin || item.requiredPlans.length > 0)
        .sort((left, right) => left.sortOrder - right.sortOrder || left.index - right.index)
        .map(({ index, showInChat, ...item }) => item);
      return [endpoint, items];
    });

    const defaultModel = catalogEntries
      .flatMap(([endpoint, items]) =>
        items.map((item) => ({
          endpoint,
          model: item.model,
          available: item.available,
          isDefault: item.isDefault,
        })),
      )
      .find((item) => item.available && item.isDefault);

    return res.status(200).json({
      models: Object.fromEntries(catalogEntries),
      currentPlan: effective.plan,
      defaultModel: defaultModel ? { endpoint: defaultModel.endpoint, model: defaultModel.model } : null,
    });
  } catch (error) {
    logger.error('Error fetching model catalog:', error);
    return res.status(500).json({ error: 'Models are temporarily unavailable. Please try again.' });
  }
}

async function modelController(req, res) {
  try {
    const filteredConfig = await getModelsConfig(req);
    res.send(filteredConfig);
  } catch (error) {
    logger.error('Error fetching models:', error);
    res.status(500).send({ error: 'Models are temporarily unavailable. Please try again.' });
  }
}

module.exports = { modelCatalogController, modelController, loadModels, getModelsConfig };
// trigger restart
