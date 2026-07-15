const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
require('module-alias')({ base: path.resolve(__dirname, '../api') });
const mongoose = require('mongoose');
const { connectDb } = require('../api/db');

(async () => {
  await connectDb();
  const db = mongoose.connection.db;

  console.log('--- ALL LOGS COLLECTION ENTRIES ---');
  const logs = await db.collection('logs').find({}).toArray();
  console.log(`Total log records: ${logs.length}`);
  for (const r of logs) {
    console.log(`  _id: ${r._id}, key: ${r.key}, value: ${JSON.stringify(r.value).slice(0, 150)}`);
  }

  process.exit(0);
})().catch((e) => { console.error(e); process.exit(1); });
