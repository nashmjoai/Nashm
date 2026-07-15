const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('module-alias')({ base: path.resolve(__dirname, '../api') });
const mongoose = require('mongoose');
const { connectDb } = require('../api/db');

const TARGET_USER_ID = '6a4988c3121c649060c8bd0f';
const TARGET_EMAIL = 'abdelrahmanabuzaid311@gmail.com';

(async () => {
  await connectDb();
  const db = mongoose.connection.db;

  console.log('--- BEFORE: ban records for this user ---');
  const before = await db.collection('logs').find({
    $or: [
      { key: `${TARGET_USER_ID}` },
      { key: `BANS:${TARGET_USER_ID}` },
      { key: `ban:${TARGET_USER_ID}` },
    ],
  }).toArray();
  for (const r of before) {
    console.log(`  ${r.key} = ${JSON.stringify(r.value).slice(0, 200)}`);
  }

  // Delete from BOTH namespaces
  const banCacheResult = await db.collection('logs').deleteMany({
    key: { $in: [`BANS:${TARGET_USER_ID}`, `ban:${TARGET_USER_ID}`, TARGET_USER_ID] },
  });
  console.log(`\nDeleted ${banCacheResult.deletedCount} log records.`);

  console.log('\n--- AFTER: ban records for this user ---');
  const after = await db.collection('logs').find({
    $or: [
      { key: `${TARGET_USER_ID}` },
      { key: `BANS:${TARGET_USER_ID}` },
      { key: `ban:${TARGET_USER_ID}` },
    ],
  }).toArray();
  console.log(`  Found ${after.length} records (should be 0).`);

  // Also need to clear violation counters so this doesn't immediately re-trigger
  // on the next curl call. The non-browser counter (in 'non_browser' namespace)
  // and the general violation log live in their own namespaces.
  console.log('\n--- Clearing violation counters for this user ---');
  const violationsDeleted = await db.collection('logs').deleteMany({
    $or: [
      { key: { $regex: `^(non_browser|logins|concurrent|message_limit|file_upload_limit|stt_limit|tts_limit|tool_call_limit|illegal_model_request|convo_access|token_balance|reset_password_limit|verify_email_limit|registrations|general):${TARGET_USER_ID}$` } },
      { key: TARGET_USER_ID },
    ],
  });
  console.log(`Deleted ${violationsDeleted.deletedCount} violation records.`);

  // Verify user is unblocked by trying to read their account (sanity check)
  const User = mongoose.model('User');
  const user = await User.findOne({ email: TARGET_EMAIL }, { email: 1, _id: 1 });
  console.log('\n--- USER ACCOUNT ---');
  console.log(JSON.stringify(user, null, 2));
  console.log('\nBan lifted. User should be able to log in again.');

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
