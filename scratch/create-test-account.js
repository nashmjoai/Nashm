/**
 * One-shot: create the testbot@nashm.ai user if it doesn't already exist.
 * Idempotent — safe to re-run. Prints the userId so other scripts can use it.
 */
const { ensureTestUser } = require('./test-account');

(async () => {
  const user = await ensureTestUser();
  console.log('USER_ID=' + user._id.toString());
  console.log('EMAIL=' + user.email);
  process.exit(0);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
