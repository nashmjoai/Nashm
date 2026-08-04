const { startSubscriptionRenewalScheduler } = require('@nashm/api');
const { runAsSystem } = require('@nashm/data-schemas');
const { renewDueBalances } = require('~/models');

function initializeSubscriptionRenewals() {
  return startSubscriptionRenewalScheduler({
    renewDueBalances: () => runAsSystem(() => renewDueBalances()),
  });
}

module.exports = { initializeSubscriptionRenewals };
