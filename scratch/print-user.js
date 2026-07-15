const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('module-alias')({ base: path.resolve(__dirname, '../api') });
const mongoose = require('mongoose');
const { connectDb } = require('../api/db');

const TARGET_EMAIL = 'aabuzaid.work@gmail.com';

(async () => {
  await connectDb();
  const User = mongoose.model('User');
  const user = await User.findOne({ email: TARGET_EMAIL }).lean();
  console.log('--- USER DETAILS ---');
  console.log(JSON.stringify(user, null, 2));
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
