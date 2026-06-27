const mongoose = require('mongoose');
const { createSharedLinkAccessMiddleware } = require('@nashm/api');

const canAccessSharedLink = createSharedLinkAccessMiddleware({ mongoose });

module.exports = canAccessSharedLink;
