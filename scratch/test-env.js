const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

console.log('BAN_VIOLATIONS =', process.env.BAN_VIOLATIONS);
console.log('BAN_INTERVAL =', process.env.BAN_INTERVAL);
console.log('DOMAIN_SERVER =', process.env.DOMAIN_SERVER);
console.log('DOMAIN_CLIENT =', process.env.DOMAIN_CLIENT);
console.log('NODE_ENV =', process.env.NODE_ENV);
