const path = require('path');
const fs = require('fs');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('module-alias')({ base: path.resolve(__dirname, '../api') });
const mongoose = require('mongoose');
const { connectDb } = require('../api/db');

const TARGET_IDS = ['6a4988c3121c649060c8bd0f', '6a49948a731c34c28605baec'];

(async () => {
  await connectDb();
  const db = mongoose.connection.db;

  const User = mongoose.model('User');
  for (const id of TARGET_IDS) {
    const user = await User.findById(id);
    if (user) {
      console.log(`Found user: ID=${id}, Email=${user.email}, Provider=${user.provider}`);
    } else {
      console.log(`User ID ${id} not found in database.`);
    }
  }

  // 1. Delete from MongoDB logs collection (for both user IDs)
  console.log('\n--- Clearing MongoDB logs collection ---');
  for (const id of TARGET_IDS) {
    const res = await db.collection('logs').deleteMany({
      $or: [
        { key: id },
        { key: `BANS:${id}` },
        { key: `ban:${id}` },
        { key: { $regex: `:${id}$` } },
        { key: { $regex: `:${id}:` } }
      ]
    });
    console.log(`Deleted ${res.deletedCount} MongoDB log records for ID: ${id}`);
  }

  // 2. Clear from data/violations.json
  const violationsPath = path.resolve(__dirname, '../data/violations.json');
  if (fs.existsSync(violationsPath)) {
    console.log('\n--- Clearing data/violations.json ---');
    try {
      const data = JSON.parse(fs.readFileSync(violationsPath, 'utf8'));
      if (data && Array.isArray(data.cache)) {
        const originalCount = data.cache.length;
        data.cache = data.cache.filter(([key]) => {
          return !TARGET_IDS.some(id => key.includes(id));
        });
        fs.writeFileSync(violationsPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`violations.json updated. Cleared ${originalCount - data.cache.length} entries.`);
      }
    } catch (e) {
      console.error('Error updating violations.json:', e);
    }
  }

  // 3. Clear from data/logs.json
  const logsPath = path.resolve(__dirname, '../data/logs.json');
  if (fs.existsSync(logsPath)) {
    console.log('\n--- Clearing data/logs.json ---');
    try {
      const data = JSON.parse(fs.readFileSync(logsPath, 'utf8'));
      if (data && Array.isArray(data.cache)) {
        const originalCount = data.cache.length;
        data.cache = data.cache.filter(([key]) => {
          return !TARGET_IDS.some(id => key.includes(id));
        });
        fs.writeFileSync(logsPath, JSON.stringify(data, null, 2), 'utf8');
        console.log(`logs.json updated. Cleared ${originalCount - data.cache.length} entries.`);
      }
    } catch (e) {
      console.error('Error updating logs.json:', e);
    }
  }

  console.log('\nBan lift script completed.');
  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
