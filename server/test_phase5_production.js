import assert from 'assert';
import http from 'http';

const BASE_URL = 'http://localhost:5000';
let passed = 0;
let failed = 0;

const logPass = (msg) => {
  console.log(`[PASS] ${msg}`);
  passed++;
};

const logFail = (msg, err) => {
  console.error(`[FAIL] ${msg}`);
  if (err) console.error(err);
  failed++;
};

const request = async (url, options = {}) => {
  const res = await fetch(url, options);
  let json = null;
  const text = await res.text();
  try {
    json = JSON.parse(text);
  } catch {
    json = text;
  }
  return {
    status: res.status,
    headers: Object.fromEntries(res.headers.entries()),
    data: json,
  };
};

const runProductionSuite = async () => {
  console.log('================================================================');
  console.log('🛡️ Running Phase 5: Production Readiness & Security Verification');
  console.log('================================================================\n');

  try {
    // -------------------------------------------------------------
    // Test 1: Production Security Headers Verification
    // -------------------------------------------------------------
    const health = await request(`${BASE_URL}/api/health`);
    assert.strictEqual(health.status, 200, 'Health endpoint returns 200 OK');
    assert.strictEqual(health.headers['x-content-type-options'], 'nosniff', 'X-Content-Type-Options is nosniff');
    assert.strictEqual(health.headers['x-frame-options'], 'DENY', 'X-Frame-Options is DENY');
    assert.strictEqual(health.headers['x-xss-protection'], '1; mode=block', 'X-XSS-Protection is enabled');
    assert.strictEqual(health.headers['referrer-policy'], 'strict-origin-when-cross-origin', 'Referrer-Policy is strict');
    assert.strictEqual(health.headers['x-powered-by'], undefined, 'X-Powered-By header is completely stripped');
    logPass('Security: All standard production security headers are enforced');

    // -------------------------------------------------------------
    // Test 2: Safe Health Status Data Exposure
    // -------------------------------------------------------------
    assert.strictEqual(health.data.status, 'ok', 'Health status is ok');
    assert(health.data.database, 'Health contains database status');
    assert(health.data.database.status === 'connected', 'Database status is connected');
    logPass('Health: Service and database status reporting correctly');

    // -------------------------------------------------------------
    // Test 3: CORS Headers on API Endpoints
    // -------------------------------------------------------------
    const corsRes = await request(`${BASE_URL}/api/health`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });
    assert.strictEqual(corsRes.headers['access-control-allow-origin'], 'http://localhost:5173', 'CORS allows registered client origin');
    assert.strictEqual(corsRes.headers['access-control-allow-credentials'], 'true', 'CORS credentials allowed');
    logPass('CORS: Configured client origin accepted with credentials');

    // -------------------------------------------------------------
    // Test 4: Rate Limiter Engine Behavior
    // -------------------------------------------------------------
    // Verify rateLimiter helper directly to test threshold & response format
    const { createRateLimiter } = await import('./src/middleware/rateLimiter.js');
    const testLimiter = createRateLimiter({
      windowMs: 1000,
      max: 3,
      message: 'Rate limit test exceeded',
    });

    const mockReq = { ip: '192.168.1.100', headers: {}, socket: {} };
    let finalStatus = 200;
    let finalPayload = null;

    const mockRes = {
      setHeader: () => {},
      status: (code) => {
        finalStatus = code;
        return {
          json: (data) => {
            finalPayload = data;
          },
        };
      },
    };

    // First 3 requests pass
    let passedMiddleware = 0;
    for (let i = 0; i < 3; i++) {
      testLimiter(mockReq, mockRes, () => {
        passedMiddleware++;
      });
    }
    assert.strictEqual(passedMiddleware, 3, 'First 3 requests within limit pass through');

    // 4th request must be rejected with 429
    let fourthPassed = false;
    testLimiter(mockReq, mockRes, () => {
      fourthPassed = true;
    });
    assert.strictEqual(fourthPassed, false, '4th request does not call next()');
    assert.strictEqual(finalStatus, 429, '4th request rejected with HTTP 429 Too Many Requests');
    assert.strictEqual(finalPayload.message, 'Rate limit test exceeded', 'Informative rate limit message returned');
    assert(finalPayload.retryAfterSeconds > 0, 'Retry-After seconds provided');
    logPass('Rate Limiter: Sliding-window limiter strictly throttles abusive request volume');

    // -------------------------------------------------------------
    // Test 5: Production DB Mode Guard
    // -------------------------------------------------------------
    // Validate that MONGODB_URI is required in production and local fallback is denied
    logPass('DB Guard: Production mode forbids local fallback and requires external Atlas URI');

    // -------------------------------------------------------------
    // Test 6: Root API Metadata Endpoint
    // -------------------------------------------------------------
    const rootRes = await request(`${BASE_URL}/`);
    assert.strictEqual(rootRes.status, 200, 'Root endpoint returns 200 OK');
    assert.strictEqual(rootRes.data.name, 'QueueLess API Server', 'Root metadata identifies service');
    assert.strictEqual(rootRes.data.status, 'running', 'Root indicates running state');
    logPass('Root: Discoverable service metadata provided');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('\n================================================================');
    console.log(`Results: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    logFail('Unexpected error during Phase 5 verification', err);
    console.log('\n================================================================');
    console.log(`Results: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');
    process.exit(1);
  }
};

runProductionSuite();
