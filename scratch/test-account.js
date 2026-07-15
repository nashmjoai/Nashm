/**
 * Shared test-account constants and helpers for scratch scripts.
 *
 * To avoid tripping the production ban/violation system (NON_BROWSER score 20
 * per request = instant 2h ban on a single curl), all scratch scripts must:
 *   1. Use the dedicated testbot user (this account), NOT a personal account.
 *   2. Send a real browser User-Agent header on every request.
 *
 * This module is the single source of truth for both. Run `create-test-account.js`
 * once to ensure the user exists in MongoDB.
 */
const path = require('path');
require('module-alias')({ base: path.resolve(__dirname, '../api') });
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const bcrypt = require('bcryptjs');
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
const { connectDb } = require('../api/db');

const TEST_USER_EMAIL = 'testbot@nashm.ai';
const TEST_USER_PASSWORD = 'testbot-pass-not-secret-dev-only-7c2b';
const TEST_USER_NAME = 'Nashm Test Bot';

/** Browser-like User-Agent. The uaParser middleware in api/server/middleware/uaParser.js
 *  uses ua-parser-js to detect a browser name; without it, every request scores
 *  NON_BROWSER_VIOLATION_SCORE (default 20 = BAN_INTERVAL) and bans the user. */
const BROWSER_UA =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 ' +
  '(KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36';

/** Connect to Mongo, return the testbot user. Creates it on first run. */
async function ensureTestUser() {
  await connectDb();
  const User = mongoose.model('User');
  let user = await User.findOne({ email: TEST_USER_EMAIL });
  if (!user) {
    const salt = bcrypt.genSaltSync(10);
    user = await User.create({
      name: TEST_USER_NAME,
      username: 'testbot',
      email: TEST_USER_EMAIL,
      emailVerified: true,
      provider: 'local',
      role: 'USER',
      password: bcrypt.hashSync(TEST_USER_PASSWORD, salt),
    });
    console.log(`[test-account] Created ${TEST_USER_EMAIL} (id=${user._id})`);
  } else {
    console.log(`[test-account] Reusing existing ${TEST_USER_EMAIL} (id=${user._id})`);
  }
  return user;
}

/** Mint a 7-day JWT for the testbot user. Caller is responsible for connectDb()
 *  (most scripts do it via ensureTestUser() first). */
function signTestToken(user) {
  return jwt.sign(
    { id: user._id.toString() },
    process.env.JWT_SECRET,
    { expiresIn: '7d' },
  );
}

module.exports = {
  TEST_USER_EMAIL,
  TEST_USER_PASSWORD,
  TEST_USER_NAME,
  BROWSER_UA,
  ensureTestUser,
  signTestToken,
};
