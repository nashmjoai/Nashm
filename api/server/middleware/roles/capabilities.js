const { generateCapabilityCheck, capabilityContextMiddleware } = require('@nashm/api');
const { getUserPrincipals, hasCapabilityForPrincipals } = require('~/models');

const { hasCapability, requireCapability, hasConfigCapability } = generateCapabilityCheck({
  getUserPrincipals,
  hasCapabilityForPrincipals,
});

module.exports = {
  hasCapability,
  requireCapability,
  hasConfigCapability,
  capabilityContextMiddleware,
};
