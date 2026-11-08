import assert from 'assert';
import http from 'http';
import { spawnSync } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
  console.log('🛡️ Running Phase 5: Production Security & Regression Verification');
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
    logPass('Security Headers: nosniff, DENY, XSS protection, and referrer policy enforced');

    // -------------------------------------------------------------
    // Test 2: Safe Health Status Reporting
    // -------------------------------------------------------------
    assert.strictEqual(health.data.status, 'ok', 'Health status is ok');
    assert(health.data.database, 'Health contains database status');
    assert.strictEqual(health.data.database.status, 'connected', 'Database status is connected');
    logPass('Health: Service and database status reporting correctly without secret leakage');

    // -------------------------------------------------------------
    // Test 3: CORS Strict Exact Origin & Wildcard Removal
    // -------------------------------------------------------------
    const { getAllowedOrigins, corsOptions, io } = await import('./src/index.js');

    // A. Express and Socket.IO use the identical CORS policy
    assert.strictEqual(
      io.opts.cors,
      corsOptions,
      'Express app and Socket.IO server use the identical corsOptions object'
    );

    // B. Allowed local client origin in development mode
    const corsRes = await request(`${BASE_URL}/api/health`, {
      headers: {
        Origin: 'http://localhost:5173',
      },
    });
    assert.strictEqual(
      corsRes.headers['access-control-allow-origin'],
      'http://localhost:5173',
      'CORS allows registered local client origin in development mode'
    );
    assert.strictEqual(corsRes.headers['access-control-allow-credentials'], 'true', 'CORS credentials allowed for valid origin');

    // C. Requests without Origin (server-to-server, cURL, health checks) are allowed
    const noOriginRes = await request(`${BASE_URL}/api/health`);
    assert.strictEqual(noOriginRes.status, 200, 'Requests without Origin header are allowed');

    // D. Blanket *.vercel.app rejection (prevents malicious vercel preview apps)
    const vercelSpoofRes = await request(`${BASE_URL}/api/health`, {
      headers: {
        Origin: 'https://malicious-attacker.vercel.app',
      },
    });
    assert.notStrictEqual(
      vercelSpoofRes.headers['access-control-allow-origin'],
      'https://malicious-attacker.vercel.app',
      'CORS strictly blocks unwhitelisted *.vercel.app origins'
    );

    // E. Arbitrary foreign origin rejection
    const evilRes = await request(`${BASE_URL}/api/health`, {
      headers: {
        Origin: 'https://evil-phishing-domain.com',
      },
    });
    assert.notStrictEqual(
      evilRes.headers['access-control-allow-origin'],
      'https://evil-phishing-domain.com',
      'CORS strictly blocks unknown external domains'
    );

    // F. Regression Verification: Localhost blocked in production vs allowed in development
    const savedNodeEnvCors = process.env.NODE_ENV;
    const savedClientUrl = process.env.CLIENT_URL;
    try {
      // 1. Production Mode: Only exact CLIENT_URL allowed; localhost is STRICTLY BLOCKED
      process.env.NODE_ENV = 'production';
      process.env.CLIENT_URL = 'https://queue-less-nine.vercel.app';

      const prodOrigins = getAllowedOrigins();
      assert.deepStrictEqual(
        prodOrigins,
        ['https://queue-less-nine.vercel.app'],
        'In production, allowed origins contains ONLY exact configured CLIENT_URL'
      );
      assert(!prodOrigins.includes('http://localhost:5173'), 'Localhost 5173 is NOT in allowed origins in production');
      assert(!prodOrigins.includes('http://127.0.0.1:5173'), '127.0.0.1 5173 is NOT in allowed origins in production');

      // Test corsOptions.origin callback in production:
      // Localhost MUST be blocked in production
      let localhostBlockedInProd = false;
      corsOptions.origin('http://localhost:5173', (err) => {
        if (err && err.message.includes('CORS policy blocked access')) localhostBlockedInProd = true;
      });
      assert(localhostBlockedInProd, 'CORS policy strictly blocks http://localhost:5173 in production');

      let loopbackBlockedInProd = false;
      corsOptions.origin('http://127.0.0.1:5173', (err) => {
        if (err && err.message.includes('CORS policy blocked access')) loopbackBlockedInProd = true;
      });
      assert(loopbackBlockedInProd, 'CORS policy strictly blocks http://127.0.0.1:5173 in production');

      // Production CLIENT_URL MUST be allowed
      let prodAllowed = false;
      corsOptions.origin('https://queue-less-nine.vercel.app', (err, allow) => {
        if (!err && allow) prodAllowed = true;
      });
      assert(prodAllowed, 'CORS policy allows exact production CLIENT_URL');

      // Missing origin MUST be allowed (server-to-server / health checks)
      let missingAllowed = false;
      corsOptions.origin(undefined, (err, allow) => {
        if (!err && allow) missingAllowed = true;
      });
      assert(missingAllowed, 'CORS policy allows requests without Origin');

      // Untrusted Vercel subdomain MUST be blocked
      let untrustedVercelBlocked = false;
      corsOptions.origin('https://random-preview.vercel.app', (err) => {
        if (err && err.message.includes('CORS policy blocked access')) untrustedVercelBlocked = true;
      });
      assert(untrustedVercelBlocked, 'CORS policy blocks untrusted *.vercel.app domain');

      // 2. Development Mode: Localhost MUST be allowed
      process.env.NODE_ENV = 'development';
      delete process.env.CLIENT_URL;

      const devOrigins = getAllowedOrigins();
      assert(devOrigins.includes('http://localhost:5173'), 'Localhost 5173 is present in dev allowed origins');
      assert(devOrigins.includes('http://127.0.0.1:5173'), '127.0.0.1 5173 is present in dev allowed origins');

      let localhostAllowedInDev = false;
      corsOptions.origin('http://localhost:5173', (err, allow) => {
        if (!err && allow) localhostAllowedInDev = true;
      });
      assert(localhostAllowedInDev, 'CORS policy allows http://localhost:5173 in development mode');

      let evilBlockedInDev = false;
      corsOptions.origin('https://evil-hacker.com', (err) => {
        if (err && err.message.includes('CORS policy blocked access')) evilBlockedInDev = true;
      });
      assert(evilBlockedInDev, 'CORS policy still blocks unknown external domains in development mode');
    } finally {
      process.env.NODE_ENV = savedNodeEnvCors;
      if (savedClientUrl !== undefined) {
        process.env.CLIENT_URL = savedClientUrl;
      } else {
        delete process.env.CLIENT_URL;
      }
    }

    logPass('CORS: Verified Express & Socket.IO parity; localhost strictly blocked in production and allowed in development');

    // -------------------------------------------------------------
    // Test 4: JWT Secret Security & Production Guard
    // -------------------------------------------------------------
    const { validateJwtSecret, DEV_FALLBACK_SECRET } = await import('./src/utils/token.js');

    // Save current environment state
    const savedNodeEnv = process.env.NODE_ENV;
    const savedSecret = process.env.JWT_SECRET;

    try {
      // In development / test mode: falls back safely to dev secret if unset
      process.env.NODE_ENV = 'development';
      delete process.env.JWT_SECRET;
      const devResolved = validateJwtSecret();
      assert.strictEqual(devResolved, DEV_FALLBACK_SECRET, 'Dev mode safely falls back to default dev secret');

      // In production mode: strictly requires JWT_SECRET
      process.env.NODE_ENV = 'production';
      delete process.env.JWT_SECRET;
      assert.throws(
        () => validateJwtSecret(),
        /JWT_SECRET environment variable is missing/,
        'Production mode throws if JWT_SECRET is missing'
      );

      // In production mode: rejects weak secret (< 32 chars)
      process.env.JWT_SECRET = 'short_weak_secret_123';
      assert.throws(
        () => validateJwtSecret(),
        /too weak/,
        'Production mode throws if JWT_SECRET is shorter than 32 characters'
      );

      // In production mode: rejects known development placeholders
      process.env.JWT_SECRET = 'your_strong_production_jwt_secret_key_change_me';
      assert.throws(
        () => validateJwtSecret(),
        /known development placeholder/,
        'Production mode throws if JWT_SECRET contains dev placeholder'
      );

      // In production mode: accepts strong 32+ character secret
      const strongProductionSecret = 'c7e8f1a2b3d4e5f60718293a4b5c6d7e8f90a1b2c3d4e5f60718293a4b5c6d7e';
      process.env.JWT_SECRET = strongProductionSecret;
      const prodResolved = validateJwtSecret();
      assert.strictEqual(prodResolved, strongProductionSecret, 'Production mode accepts cryptographically strong secret');
    } finally {
      // Restore environment state
      process.env.NODE_ENV = savedNodeEnv;
      if (savedSecret !== undefined) {
        process.env.JWT_SECRET = savedSecret;
      } else {
        delete process.env.JWT_SECRET;
      }
    }
    logPass('JWT: Hardcoded fallback removed in production; strong 32+ char key strictly required');

    // -------------------------------------------------------------
    // Test 5: Registration Input Validation & Bcrypt 72-Byte Limit
    // -------------------------------------------------------------
    // A. Password too short (< 8 characters)
    const shortPassRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Valid Clinic',
        adminName: 'Dr. Valid',
        email: `shortpass_${Date.now()}@test.org`,
        password: 'pass123', // 7 chars (< 8)
      }),
    });
    assert.strictEqual(shortPassRes.status, 400, 'Registration rejects password < 8 characters with HTTP 400');
    assert(
      shortPassRes.data?.message?.includes('at least 8 characters'),
      'Informative error message states password must be at least 8 characters'
    );

    // B. Invalid input types (NoSQL / type injection defense)
    const badTypeRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 12345, // Invalid number instead of string
        adminName: 'Dr. Valid',
        email: `badtype_${Date.now()}@test.org`,
        password: 'ValidPassword123!',
      }),
    });
    assert.strictEqual(badTypeRes.status, 400, 'Registration rejects non-string input types with HTTP 400');
    assert(
      badTypeRes.data?.message?.includes('must all be strings'),
      'Rejects invalid non-string input with type error'
    );

    // C. Business name too short (< 2 characters)
    const shortNameRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'A',
        adminName: 'Dr. Valid',
        email: `shortname_${Date.now()}@test.org`,
        password: 'ValidPassword123!',
      }),
    });
    assert.strictEqual(shortNameRes.status, 400, 'Registration rejects business name < 2 characters');

    // D. Bcrypt 72-byte Limit: Rejection of 73-character ASCII password (byteLength = 73 > 72)
    const over72AsciiRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Byte Guard Clinic',
        adminName: 'Dr. Byte',
        email: `ascii73_${Date.now()}@test.org`,
        password: 'A'.repeat(73), // 73 ASCII bytes
      }),
    });
    assert.strictEqual(over72AsciiRes.status, 400, 'Registration rejects 73-byte ASCII password with HTTP 400');
    assert(
      over72AsciiRes.data?.message?.includes('cannot exceed 72 bytes'),
      'Error message clarifies 72-byte bcrypt limit'
    );

    // E. Bcrypt 72-byte Limit: Multibyte UTF-8 password where string.length < 72 but byteLength > 72
    // '🔐' is 2 JS chars (surrogate pair) but 4 UTF-8 bytes. 19 emojis = 38 chars, but 76 bytes!
    const multibyteOver72Password = '🔐'.repeat(19);
    assert(multibyteOver72Password.length <= 72, 'String length is 38 (under 72 chars)');
    assert(Buffer.byteLength(multibyteOver72Password, 'utf8') > 72, 'UTF-8 byte length is 76 (exceeds 72 bytes)');

    const over72MultibyteRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: 'Multibyte Clinic',
        adminName: 'Dr. Emoji',
        email: `multibyte_${Date.now()}@test.org`,
        password: multibyteOver72Password,
      }),
    });
    assert.strictEqual(over72MultibyteRes.status, 400, 'Registration rejects multibyte password exceeding 72 UTF-8 bytes');
    assert(
      over72MultibyteRes.data?.message?.includes('cannot exceed 72 bytes'),
      'Multibyte error mentions byte length limitation'
    );

    // F. Bcrypt 72-byte Limit: Exact 72-byte Multibyte UTF-8 password (18 emojis * 4 bytes = 72 bytes) succeeds
    const exact72MultibytePassword = '🔐'.repeat(18);
    assert.strictEqual(Buffer.byteLength(exact72MultibytePassword, 'utf8'), 72, 'Exact 72 UTF-8 bytes');

    const exact72MultibyteRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: `Exact 72 Emoji Clinic ${Date.now()}`,
        adminName: 'Dr. Exact',
        email: `exact72emoji_${Date.now()}@test.org`,
        password: exact72MultibytePassword,
      }),
    });
    assert.strictEqual(exact72MultibyteRes.status, 201, 'Exact 72-byte multibyte password registers successfully');
    assert(exact72MultibyteRes.data?.token, 'Returns valid token for 72-byte multibyte password');

    // G. Bcrypt 72-byte Limit: Exact 72-byte ASCII password succeeds
    const exact72AsciiPassword = 'A'.repeat(72);
    const exact72AsciiRes = await request(`${BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        businessName: `Exact 72 Ascii Clinic ${Date.now()}`,
        adminName: 'Dr. ExactAscii',
        email: `exact72ascii_${Date.now()}@test.org`,
        password: exact72AsciiPassword,
      }),
    });
    assert.strictEqual(exact72AsciiRes.status, 201, 'Exact 72-byte ASCII password registers successfully');

    // H. Login Input-Size Validation: Passwords > 1024 bytes rejected with HTTP 400 (DoS prevention)
    const hugeLoginPassword = 'A'.repeat(1025);
    const hugeLoginRes = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: `exact72ascii_${Date.now()}@test.org`,
        password: hugeLoginPassword,
      }),
    });
    assert.strictEqual(hugeLoginRes.status, 400, 'Login rejects password > 1024 bytes with HTTP 400');
    assert(hugeLoginRes.data?.message?.includes('exceeds maximum allowed size'), 'Login returns size limit error');

    // I. Login Input-Size Validation: Passwords up to 1024 bytes pass size validation (returns 401 for bad credentials, not 400)
    const longLoginRes = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'nonexistent@test.org',
        password: 'A'.repeat(500),
      }),
    });
    assert.strictEqual(longLoginRes.status, 401, 'Login with 500 bytes passes size validation and returns 401 for wrong credentials');

    // J. User Mongoose Schema Validation
    const User = (await import('./src/models/User.js')).default;
    const Business = (await import('./src/models/Business.js')).default;
    const bcrypt = (await import('bcryptjs')).default;

    const testUser = new User({
      name: 'Schema Tester',
      email: 'schematest@test.org',
      password: 'A'.repeat(73),
      business: '507f1f77bcf86cd799439011',
    });
    let validationError = null;
    try {
      await testUser.validate();
    } catch (err) {
      validationError = err;
    }
    assert(validationError?.errors?.password, 'Mongoose User schema validator rejects password > 72 bytes');

    // K. Legacy Account Backward Compatibility Test:
    // Existing accounts created under previous versions could have passwords > 72 bytes (e.g. 100 characters).
    // Bcrypt hashed the first 72 bytes upon registration.
    // Verify that the user can still log in with their full 100-character password without being locked out or requiring a reset.
    const legacyPassword = 'LegacySecurePassWord123!' + 'Z'.repeat(76); // 100 characters (> 72 bytes)
    assert.strictEqual(legacyPassword.length, 100, 'Legacy password is 100 characters long');
    assert(Buffer.byteLength(legacyPassword, 'utf8') > 72, 'Legacy password exceeds 72 UTF-8 bytes');

    // Create legacy business & user document directly with bcrypt hash
    const mongoose = (await import('mongoose')).default;
    if (mongoose.connection.readyState === 0) {
      await mongoose.connect('mongodb://127.0.0.1:27017/queueless', { serverSelectionTimeoutMS: 3000 });
    }

    const legacySalt = await bcrypt.genSalt(10);
    const legacyHash = await bcrypt.hash(legacyPassword, legacySalt);
    const legacyBusiness = await Business.create({
      name: `Legacy Health ${Date.now()}`,
      businessId: `QL-LEGACY-${Date.now().toString(16).toUpperCase()}`,
      industry: 'healthcare',
    });
    const legacyEmail = `legacy_user_${Date.now()}@test.org`;
    await User.collection.insertOne({
      name: 'Legacy Admin',
      email: legacyEmail,
      password: legacyHash,
      role: 'admin',
      business: legacyBusiness._id,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    // Authenticate legacy user with full 100-character password
    const legacyLoginRes = await request(`${BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: legacyEmail,
        password: legacyPassword,
      }),
    });
    assert.strictEqual(legacyLoginRes.status, 200, 'Legacy user with 100-char password logs in with HTTP 200 OK');
    assert(legacyLoginRes.data?.token, 'Legacy user receives valid JWT token without requiring password reset');

    await mongoose.disconnect();

    logPass('Password Security: Bcrypt 72-byte limit enforced; legacy accounts with >72 byte passwords fully preserved');

    // -------------------------------------------------------------
    // Test 6: Registration Rate Limiter Unit Behavior
    // -------------------------------------------------------------
    const { registerLimiter, createRateLimiter } = await import('./src/middleware/rateLimiter.js');
    assert(registerLimiter, 'registerLimiter is defined and exported');

    // Create a dedicated test instance to verify throttling logic
    const testRegLimiter = createRateLimiter({
      windowMs: 5000,
      max: 2,
      message: 'Too many registrations test',
    });

    const mockReq = { ip: '10.0.0.99', headers: {}, socket: {} };
    let statusCaptured = 200;
    let payloadCaptured = null;
    let retryAfterHeader = null;

    const mockRes = {
      setHeader: (name, val) => {
        if (name.toLowerCase() === 'retry-after') retryAfterHeader = val;
      },
      status: (code) => {
        statusCaptured = code;
        return {
          json: (data) => {
            payloadCaptured = data;
          },
        };
      },
    };

    let callCount = 0;
    testRegLimiter(mockReq, mockRes, () => callCount++);
    testRegLimiter(mockReq, mockRes, () => callCount++);
    assert.strictEqual(callCount, 2, 'First 2 registration requests pass within threshold');

    // 3rd request from same IP must be throttled with HTTP 429
    let thirdPassed = false;
    testRegLimiter(mockReq, mockRes, () => {
      thirdPassed = true;
    });
    assert.strictEqual(thirdPassed, false, '3rd registration request does not pass');
    assert.strictEqual(statusCaptured, 429, '3rd registration rejected with HTTP 429');
    assert(retryAfterHeader > 0, 'Retry-After header present on rate-limited response');
    logPass('Rate Limiter: Registration rate limiter active with sliding-window throttling');

    // -------------------------------------------------------------
    // Test 7: Production DB Mode Guard (Genuine Assertion via Subprocess)
    // -------------------------------------------------------------
    // Execute a separate node process in production mode with missing MONGODB_URI
    const dbGuardScript = `
      import('./src/config/db.js')
        .then(m => m.connectDB())
        .catch(err => {
          console.error(err.message);
          process.exit(1);
        });
    `;

    const subproc = spawnSync(process.execPath, ['--input-type=module', '-e', dbGuardScript], {
      cwd: path.resolve(__dirname),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        MONGODB_URI: '', // empty to test production safeguard
      },
      encoding: 'utf8',
    });

    // Must exit with code 1 and log fatal message
    assert.strictEqual(subproc.status, 1, 'Production mode without MONGODB_URI exits with code 1');
    assert(
      subproc.stderr.includes('MONGODB_URI environment variable is required in production mode') ||
      subproc.stdout.includes('MONGODB_URI environment variable is required in production mode'),
      'Subprocess logs fatal error when MONGODB_URI is missing in production'
    );
    logPass('DB Guard: Production mode strictly refuses local fallback (verified via subprocess)');

    // -------------------------------------------------------------
    // Test 8: Root Service Discovery Endpoint
    // -------------------------------------------------------------
    const rootRes = await request(`${BASE_URL}/`);
    assert.strictEqual(rootRes.status, 200, 'Root endpoint returns 200 OK');
    assert.strictEqual(rootRes.data.name, 'QueueLess API Server', 'Root metadata identifies service');
    assert.strictEqual(rootRes.data.status, 'running', 'Root indicates running state');
    logPass('Root: Discoverable service metadata operational');

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
