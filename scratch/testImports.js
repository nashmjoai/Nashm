const fs = require('fs');
const path = require('path');

const logPath = 'C:\\Users\\abdel\\.gemini\\antigravity-ide\\brain\\0a303532-9344-4172-ab65-7fa2b6a0d1aa\\.system_generated\\logs\\transcript.jsonl';
if (!fs.existsSync(logPath)) {
  console.log('Log file does not exist:', logPath);
  process.exit(1);
}

const lines = fs.readFileSync(logPath, 'utf8').split('\n');
console.log('Total lines in log:', lines.length);

for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.toLowerCase().includes('entity too large') || line.toLowerCase().includes('payloadtoo')) {
    console.log(`Line ${i}:`, line.substring(0, 500));
  }
}
process.exit(0);
