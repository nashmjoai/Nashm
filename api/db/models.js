const mongoose = require('mongoose');
const { createModels } = require('@nashm/data-schemas');
const models = createModels(mongoose);

module.exports = { ...models };
