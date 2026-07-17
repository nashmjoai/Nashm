const mongoose = require('mongoose');
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

const mongoURI = process.env.MONGO_URI || 'mongodb://127.0.0.1:27017/librechat';

async function run() {
  console.log('Connecting to:', mongoURI);
  await mongoose.connect(mongoURI);
  console.log('Connected!');
  
  const File = mongoose.model('File', new mongoose.Schema({}, { strict: false }));
  // Find without sort, limit to 20
  const files = await File.find({ filename: /WhatsApp_Video/i }).limit(20);
  console.log(`Found ${files.length} matching files:`);
  for (const f of files) {
    console.log({
      file_id: f.get('file_id'),
      filename: f.get('filename'),
      source: f.get('source'),
      type: f.get('type'),
      textLength: f.get('text') ? f.get('text').length : 0,
      textPreview: f.get('text') ? f.get('text').substring(0, 200) : 'none',
      createdAt: f.get('createdAt')
    });
  }
  await mongoose.disconnect();
}

run().catch(console.error);
