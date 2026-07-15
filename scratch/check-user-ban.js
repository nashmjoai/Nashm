const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('module-alias')({ base: path.resolve(__dirname, '../api') });
const mongoose = require('mongoose');
const { connectDb } = require('../api/db');

const TARGET_EMAIL = 'aabuzaid.work@gmail.com';

(async () => {
  await connectDb();
  const db = mongoose.connection.db;

  const User = mongoose.model('User');
  const user = await User.findOne({ email: TARGET_EMAIL });
  if (!user) {
    console.log(`User ${TARGET_EMAIL} not found in database.`);
    process.exit(0);
  }

  const TARGET_USER_ID = user._id.toString();
  console.log(`Found user: ${user.email} with ID: ${TARGET_USER_ID}`);

  console.log('--- ban records for this user ---');
  const banRecords = await db.collection('logs').find({
    $or: [
      { key: `${TARGET_USER_ID}` },
      { key: `BANS:${TARGET_USER_ID}` },
      { key: `ban:${TARGET_USER_ID}` },
    ],
  }).toArray();
  for (const r of banRecords) {
    console.log(`  ${r.key} = ${JSON.stringify(r.value)}`);
  }

  console.log('--- violation counters for this user ---');
  const violations = await db.collection('logs').find({
    $or: [
      { key: { $regex: `^(non_browser|logins|concurrent|message_limit|file_upload_limit|stt_limit|tts_limit|tool_call_limit|illegal_model_request|convo_access|token_balance|reset_password_limit|verify_email_limit|registrations|general):${TARGET_USER_ID}$` } },
    ],
  }).toArray();
  for (const r of violations) {
    console.log(`  ${r.key} = ${JSON.stringify(r.value)}`);
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
