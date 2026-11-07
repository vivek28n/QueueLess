import http from 'http';

const testEndpoint = (urlStr, method = 'GET', data = null, token = null) => {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
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

const runComprehensiveTests = async () => {
  console.log('========================================================');
  console.log('🧪 Running Phase 2 Authentication & Verification Suite');
  console.log('========================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      failed++;
    }
  };

  const testUser = {
    businessName: 'Apex Health Systems',
    adminName: 'Chief Officer Vance',
    email: `vance_${Date.now()}@apexhealth.org`,
    password: 'ApexSecurePassword2026!',
    industry: 'healthcare',
  };

  let token = null;

  // Test 1: Successful business registration (via direct API :5000)
  try {
    const res = await testEndpoint('http://localhost:5000/api/auth/register', 'POST', testUser);
    assert(res.status === 201, '1. Business & Admin registration returns 201 Created');
    assert(res.data?.token, '1. Returns valid JWT token');
    assert(res.data?.user?.business?.businessId?.startsWith('QL-'), '1. Generated QL-* business slug');
    assert(res.data?.user?.role === 'admin', '1. User assigned admin role');
    assert(!res.data?.user?.password, '1. Password hash is excluded from response');
    token = res.data?.token;
  } catch (e) {
    console.error('Test 1 failed:', e.message);
    failed++;
  }

  // Test 2: Duplicate email registration rejection
  try {
    const res = await testEndpoint('http://localhost:5000/api/auth/register', 'POST', {
      businessName: 'Copycat Clinic',
      adminName: 'Imposter Vance',
      email: testUser.email,
      password: 'AnotherPassword123!',
      industry: 'healthcare',
    });
    assert(res.status === 400, '2. Duplicate email rejected with 400 Bad Request');
    assert(res.data?.message?.includes('already exists'), '2. Returns informative duplicate error message');
  } catch (e) {
    console.error('Test 2 failed:', e.message);
    failed++;
  }

  // Test 3: Successful login with correct credentials
  try {
    const res = await testEndpoint('http://localhost:5000/api/auth/login', 'POST', {
      email: testUser.email,
      password: testUser.password,
    });
    assert(res.status === 200, '3. Login returns 200 OK');
    assert(res.data?.token, '3. Returns fresh JWT token');
    assert(res.data?.user?.email === testUser.email, '3. User email matched in session');
    assert(res.data?.user?.business?.name === 'Apex Health Systems', '3. Populates business document');
  } catch (e) {
    console.error('Test 3 failed:', e.message);
    failed++;
  }

  // Test 4: Incorrect password rejection
  try {
    const res = await testEndpoint('http://localhost:5000/api/auth/login', 'POST', {
      email: testUser.email,
      password: 'IncorrectPassword!',
    });
    assert(res.status === 401, '4. Incorrect password returns 401 Unauthorized');
    assert(res.data?.message === 'Invalid email or password.', '4. Generic error does not leak password existence');
  } catch (e) {
    console.error('Test 4 failed:', e.message);
    failed++;
  }

  // Test 5: Invalid JWT rejection
  try {
    const res = await testEndpoint('http://localhost:5000/api/auth/me', 'GET', null, 'malformed.fake.jwt');
    assert(res.status === 401, '5. Tampered/Invalid JWT rejected with 401 Unauthorized');
  } catch (e) {
    console.error('Test 5 failed:', e.message);
    failed++;
  }

  // Test 6: Protected admin route session verification (/api/auth/me)
  try {
    const res = await testEndpoint('http://localhost:5000/api/auth/me', 'GET', null, token);
    assert(res.status === 200, '6. Protected route (/api/auth/me) returns 200 OK with valid JWT');
    assert(res.data?.user?.email === testUser.email, '6. Resolves current authenticated user');
    assert(res.data?.user?.business?._id, '6. Attaches verified business object');
  } catch (e) {
    console.error('Test 6 failed:', e.message);
    failed++;
  }

  // Test 7: Vite proxy verification (Frontend -> Backend communication through :5173/api/auth/me)
  try {
    const res = await testEndpoint('http://localhost:5173/api/auth/me', 'GET', null, token);
    assert(res.status === 200, '7. Frontend Vite Proxy successfully forwards authenticated request');
    assert(res.data?.user?.role === 'admin', '7. Client proxy receives identical authenticated payload');
  } catch (e) {
    console.error('Test 7 failed:', e.message);
    failed++;
  }

  // Test 8: Missing token rejection
  try {
    const res = await testEndpoint('http://localhost:5173/api/auth/me', 'GET');
    assert(res.status === 401, '8. Request without Bearer token rejected with 401 Unauthorized');
  } catch (e) {
    console.error('Test 8 failed:', e.message);
    failed++;
  }

  console.log('========================================================');
  console.log(`Results: ${passed} Passed, ${failed} Failed`);
  console.log('========================================================');

  if (failed > 0) {
    process.exit(1);
  }
};

runComprehensiveTests();
