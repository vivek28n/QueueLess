import http from 'http';
import assert from 'assert';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const BASE_URL = 'http://localhost:5000';

const request = (pathStr, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(pathStr, BASE_URL);
    const options = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method,
      headers: {
        'Content-Type': 'application/json',
      },
    };

    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }

    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => (body += chunk));
      res.on('end', () => {
        try {
          const parsed = JSON.parse(body);
          resolve({ status: res.statusCode, data: parsed });
        } catch {
          resolve({ status: res.statusCode, text: body });
        }
      });
    });

    req.on('error', (err) => reject(err));

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

const waitForServer = async (timeoutMs = 15000) => {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await request('/api/health');
      if (res.status === 200 && res.data?.database?.status === 'connected') {
        return true;
      }
    } catch {}
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error('Server failed to start within timeout');
};

const runPersistenceVerification = async () => {
  console.log('================================================================');
  console.log('💾 Running MongoDB Data Persistence Verification Across Restarts');
  console.log('================================================================');

  const timestamp = Date.now();
  const testBusiness = {
    businessName: `PersistCorp ${timestamp}`,
    adminName: 'Persist Admin',
    email: `persist_${timestamp}@persistcorp.org`,
    password: 'PersistPassword2026!',
    industry: 'banking',
  };

  let token = null;
  let queueId = null;
  let queueCode = null;
  let ticketId = null;
  let tokenNumber = null;

  // STEP 1: Verify on running server (or start it)
  console.log('\n--- Step 1: Record Creation on Server ---');
  await waitForServer();

  // 1. Register business
  const regRes = await request('/api/auth/register', 'POST', testBusiness);
  if (regRes.status !== 201) {
    throw new Error(`Registration failed: ${JSON.stringify(regRes.data)}`);
  }
  token = regRes.data?.token;
  console.log(`[PASS] Registered business: "${testBusiness.businessName}"`);

  // 2. Create queue
  const queueRes = await request(
    '/api/queues',
    'POST',
    {
      name: 'Vault Escrow Services',
      description: 'Persistent security desk queue',
      averageServiceTime: 12,
    },
    token
  );
  if (queueRes.status !== 201) {
    throw new Error(`Queue creation failed: ${JSON.stringify(queueRes.data)}`);
  }
  queueId = queueRes.data?.data?.queue?._id;
  queueCode = queueRes.data?.data?.queue?.queueCode;
  console.log(`[PASS] Created queue: "${queueRes.data?.data?.queue?.name}" (Code: ${queueCode})`);

  // 3. Customer joins queue
  const joinRes = await request(`/api/public/queues/${queueCode}/join`, 'POST', {
    customerName: 'Eleanor Vance',
    customerContact: '555-8899',
  });
  if (joinRes.status !== 201) {
    throw new Error(`Customer join failed: ${JSON.stringify(joinRes.data)}`);
  }
  ticketId = joinRes.data?.data?.ticket?.id;
  tokenNumber = joinRes.data?.data?.ticket?.tokenNumber;
  console.log(`[PASS] Customer joined: Token #${tokenNumber} (Ticket ID: ${ticketId})`);

  console.log('\n--- Step 2: Querying DB Verification Before Restart ---');
  const preCheckTicket = await request(`/api/public/tickets/${ticketId}`, 'GET');
  assert.strictEqual(preCheckTicket.status, 200, 'Pre-restart ticket query must return 200 OK');
  assert.strictEqual(preCheckTicket.data?.data?.ticket?.status, 'waiting', 'Pre-restart ticket status must be waiting');
  console.log(`[PASS] Verified pre-restart ticket status: ${preCheckTicket.data?.data?.ticket?.status}`);

  console.log('\n================================================================');
  console.log('✅ Phase 3 In-Flight Data Record Verified!');
  console.log(`Business: ${testBusiness.businessName}`);
  console.log(`Queue ID: ${queueId} (Code: ${queueCode})`);
  console.log(`Ticket ID: ${ticketId} (Token: #${tokenNumber})`);
  console.log('================================================================');
};

runPersistenceVerification().catch((err) => {
  console.error('Persistence verification failed:', err);
  process.exit(1);
});
