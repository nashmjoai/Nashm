const http = require('http');
const { execSync } = require('child_process');
const { ensureTestUser, signTestToken, BROWSER_UA } = require('./test-account');

async function makeRequest(method, requestPath, body, token) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3080,
      path: requestPath,
      method: method,
      headers: {
        'Authorization': `Bearer ${token}`,
        'User-Agent': BROWSER_UA,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        resolve({
          status: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', (e) => {
      reject(e);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

function getPID() {
  try {
    const output = execSync('netstat -ano | findstr 3080').toString();
    const lines = output.replace(/\r/g, '').trim().split('\n');
    for (const line of lines) {
      if (line.includes('LISTENING')) {
        const parts = line.trim().split(/\s+/);
        const pid = parts[parts.length - 1];
        return pid;
      }
    }
  } catch (err) {
    // Ignore
  }
  return null;
}

function wait(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

async function pollServer(token) {
  console.log('Polling server until it becomes responsive...');
  for (let i = 0; i < 30; i++) {
    try {
      const res = await makeRequest('GET', '/api/config', null, token);
      if (res.status === 200) {
        console.log('Server is back online and fully responsive.');
        return true;
      }
    } catch (err) {
      // Ignore
    }
    await wait(1000);
  }
  throw new Error('Server did not become responsive after restart');
}

async function run() {
  const user = await ensureTestUser();
  const token = signTestToken(user);

  console.log('Waiting 15 seconds for nodemon/server startup to complete...');
  await wait(15000);

  console.log('--- TEST 2: Sending Malformed Payload ---');
  try {
    const malformedPayload = {
      artifactData: {
        kind: 'slides',
        garbage: true
      }
    };
    const response = await makeRequest('POST', '/api/artifacts/export', malformedPayload, token);
    console.log('Response Status:', response.status);
    console.log('Response Body:', response.body);
  } catch (err) {
    console.error('Test 2 failed:', err);
  }

  console.log('\n--- TEST 3: Export, Kill, Restart, Check Durability ---');
  try {
    const pid = getPID();
    if (!pid) {
      throw new Error('Could not find running process listening on port 3080');
    }
    console.log(`Current server process PID: ${pid}`);

    const validPayload = {
      artifactData: {
        schemaVersion: 'office-artifact.v1',
        kind: 'slides',
        title: 'عرض تقديمي عربي للدمج',
        locale: 'ar',
        direction: 'rtl',
        templateId: 'nashm-arabic-lux',
        content: {
          slides: [
            {
              title: 'مرحبا بك في نشمي',
              eyebrow: 'مقدمة',
              layout: 'cover',
              content: ['هذا هو النظام الأول لتوليد مستندات الأوفيس باللغة العربية'],
              notes: 'ملاحظات المتحدث هنا'
            }
          ]
        }
      }
    };

    console.log('1. Submitting valid export job...');
    const submitRes = await makeRequest('POST', '/api/artifacts/export', validPayload, token);
    console.log('Submit Response Status:', submitRes.status);
    console.log('Submit Response Body:', submitRes.body);

    const parsedSubmit = JSON.parse(submitRes.body);
    const jobId = parsedSubmit.jobId;
    if (!jobId) {
      throw new Error('No jobId returned from export endpoint');
    }

    console.log('2. Checking status BEFORE restart...');
    const statusBefore = await makeRequest('GET', `/api/artifacts/export/status/${jobId}`, null, token);
    console.log('Status Response Status:', statusBefore.status);
    console.log('Status Response Body:', statusBefore.body);

    const pidToKill = getPID();
    if (pidToKill) {
      console.log(`3. Killing server process ${pidToKill}...`);
      try {
        execSync(`powershell -Command "Stop-Process -Id ${pidToKill} -Force"`);
        console.log('Server process killed.');
      } catch (killErr) {
        console.log(`Stop-Process failed (process might have already restarted): ${killErr.message}`);
      }
    } else {
      console.log('3. Server process not found (already restarted by nodemon).');
    }

    // Wait for server to restart
    await wait(2000);
    await pollServer(token);

    console.log('4. Checking status AFTER restart...');
    const statusAfter = await makeRequest('GET', `/api/artifacts/export/status/${jobId}`, null, token);
    console.log('Status Response Status:', statusAfter.status);
    console.log('Status Response Body:', statusAfter.body);

  } catch (err) {
    console.error('Test 3 failed:', err);
  }
}

run();
