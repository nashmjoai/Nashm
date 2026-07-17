const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/librechat';

async function run() {
  await mongoose.connect(mongoURI);
  const Agent = mongoose.model('Agent', new mongoose.Schema({}, { strict: false }));
  const agent = await Agent.findOne({ name: /Kimi/i });
  console.log('Agent:', agent ? JSON.stringify(agent.toObject(), null, 2) : 'not found');
  await mongoose.disconnect();
}

run().catch(console.error);
