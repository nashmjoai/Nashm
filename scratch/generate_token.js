const path = require('path');
const jwt = require('jsonwebtoken');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const { ensureTestUser, signTestToken } = require('./test-account');

async function run() {
  const user = await ensureTestUser();
  const token = signTestToken(user);
  console.log('--- GENERATED_TOKEN_START ---');
  console.log(token);
  console.log('--- GENERATED_TOKEN_END ---');
  process.exit(0);
}
run().catch(err => {
  console.error(err);
  process.exit(1);
});
