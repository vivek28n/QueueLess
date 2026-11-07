import http from 'http';
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

const runQueueTests = async () => {
  console.log('================================================================');
  console.log('🧪 Running Phase 3: Core Queue Management Verification Suite');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc, errorDetail = null) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      if (errorDetail) console.error('   Details:', errorDetail);
      failed++;
    }
  };

  try {
    // -------------------------------------------------------------
    // Setup Business A & Business B for isolation testing
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const userAData = {
      businessName: 'Metro Health Medical',
      adminName: 'Dr. Sarah Connor',
      email: `sarah_${timestamp}@metrohealth.org`,
      password: 'SecureHealthPassword2026!',
      industry: 'healthcare',
    };

    const userBData = {
      businessName: 'Apex Electronics Retail',
      adminName: 'Marcus Wright',
      email: `marcus_${timestamp}@apexretail.com`,
      password: 'SecureRetailPassword2026!',
      industry: 'retail',
    };

    const regARes = await request('/api/auth/register', 'POST', userAData);
    assert(regARes.status === 201, 'Setup: Business A registered');
    const tokenA = regARes.data?.token;

    const regBRes = await request('/api/auth/register', 'POST', userBData);
    assert(regBRes.status === 201, 'Setup: Business B registered');
    const tokenB = regBRes.data?.token;

    // -------------------------------------------------------------
    // Test: Unauthorized access attempts
    // -------------------------------------------------------------
    const unauthCreate = await request('/api/queues', 'POST', { name: 'Unauthorized Queue' });
    assert(unauthCreate.status === 401, 'Security: Unauthenticated queue creation rejected with 401');

    const unauthList = await request('/api/queues', 'GET');
    assert(unauthList.status === 401, 'Security: Unauthenticated queue listing rejected with 401');

    // -------------------------------------------------------------
    // Test: Queue creation with validation
    // -------------------------------------------------------------
    const queueEmptyName = await request('/api/queues', 'POST', { name: '   ' }, tokenA);
    assert(queueEmptyName.status === 400, 'Validation: Empty queue name rejected with 400');

    const queueInvalidServiceTime = await request('/api/queues', 'POST', { name: 'Q1', averageServiceTime: 0 }, tokenA);
    assert(queueInvalidServiceTime.status === 400, 'Validation: Zero averageServiceTime rejected with 400');

    // Business A creates Queue 1 (auto code)
    const createQ1Res = await request('/api/queues', 'POST', {
      name: 'General Consultation',
      description: 'Walk-in outpatient medical consultations',
      averageServiceTime: 10,
    }, tokenA);
    assert(createQ1Res.status === 201, 'Queue Creation: Business A created Queue 1 with 201');
    const queue1 = createQ1Res.data?.data?.queue;
    assert(queue1 && queue1.queueCode.startsWith('QL-'), 'Queue Code: Auto-generated format starts with QL-');
    assert(queue1.status === 'active', 'Queue Status: Defaults to active');
    assert(queue1.currentTokenNumber === 0, 'Queue Tokens: currentTokenNumber initialized to 0');
    assert(queue1.currentlyServing === 0, 'Queue Tokens: currentlyServing initialized to 0');

    // Business A creates Queue 2 (custom code)
    const customCode = `TRIAGE-${timestamp.toString().slice(-4)}`;
    const createQ2Res = await request('/api/queues', 'POST', {
      name: 'Urgent Care Triage',
      queueCode: customCode,
      averageServiceTime: 5,
    }, tokenA);
    assert(createQ2Res.status === 201, 'Queue Creation: Business A created Queue 2 with custom code');
    const queue2 = createQ2Res.data?.data?.queue;
    assert(queue2.queueCode === customCode, 'Queue Code: Preserved custom queue code');

    // Duplicate queue code rejection
    const dupCodeRes = await request('/api/queues', 'POST', {
      name: 'Duplicate Queue Code Test',
      queueCode: customCode,
    }, tokenA);
    assert(dupCodeRes.status === 400, 'Validation: Duplicate queue code rejected with 400');

    // Business B creates a Queue
    const createQBRes = await request('/api/queues', 'POST', {
      name: 'Customer Support Desk',
      averageServiceTime: 8,
    }, tokenB);
    assert(createQBRes.status === 201, 'Queue Creation: Business B created Queue B');
    const queueB = createQBRes.data?.data?.queue;

    // -------------------------------------------------------------
    // Test: Queue listing & Multi-tenant business isolation
    // -------------------------------------------------------------
    const listARes = await request('/api/queues', 'GET', null, tokenA);
    assert(listARes.status === 200, 'Queue Listing: Business A retrieved queues successfully');
    assert(listARes.data?.data?.queues?.length === 2, 'Isolation: Business A sees exactly its 2 queues');
    const queueAIds = listARes.data?.data?.queues.map((q) => q._id);
    assert(queueAIds.includes(queue1._id) && queueAIds.includes(queue2._id), 'Isolation: Contains Queue 1 and Queue 2');
    assert(!queueAIds.includes(queueB._id), 'Isolation: Business A does not see Business B queue');

    const listBRes = await request('/api/queues', 'GET', null, tokenB);
    assert(listBRes.data?.data?.queues?.length === 1, 'Isolation: Business B sees only its 1 queue');
    assert(listBRes.data?.data?.queues[0]._id === queueB._id, 'Isolation: Business B queue is strictly isolated');

    // Cross-business access attempts
    const crossGet = await request(`/api/queues/${queue1._id}`, 'GET', null, tokenB);
    assert(crossGet.status === 404, 'Security: Business B cannot GET Business A queue (returns 404)');

    const crossPatch = await request(`/api/queues/${queue1._id}`, 'PATCH', { name: 'Hacked' }, tokenB);
    assert(crossPatch.status === 404, 'Security: Business B cannot PATCH Business A queue (returns 404)');

    const crossNext = await request(`/api/queues/${queue1._id}/next`, 'POST', null, tokenB);
    assert(crossNext.status === 404, 'Security: Business B cannot call next on Business A queue (returns 404)');

    // -------------------------------------------------------------
    // Test: Public Queue Information
    // -------------------------------------------------------------
    const publicQ1 = await request(`/api/public/queues/${queue1.queueCode}`, 'GET');
    assert(publicQ1.status === 200, 'Public API: GET /api/public/queues/:code returns 200');
    assert(publicQ1.data?.data?.queue?.name === queue1.name, 'Public API: Correct queue name returned');
    assert(publicQ1.data?.data?.queue?.business?.name === userAData.businessName, 'Public API: Returns business name');
    assert(publicQ1.data?.data?.stats?.waitingCount === 0, 'Public API: Initial waiting count is 0');

    // Invalid queue code
    const invalidQ = await request('/api/public/queues/DOES_NOT_EXIST_XYZ', 'GET');
    assert(invalidQ.status === 404, 'Public API: Non-existent queue code returns 404');

    // -------------------------------------------------------------
    // Test: Customer Joining & Sequential Token Generation
    // -------------------------------------------------------------
    const join1 = await request(`/api/public/queues/${queue1.queueCode}/join`, 'POST', {
      customerName: 'Alice Smith',
      customerContact: '555-0101',
    });
    assert(join1.status === 201, 'Customer Join: Alice joined with 201 Created');
    assert(join1.data?.data?.ticket?.tokenNumber === 1, 'Token Generation: First customer received Token #1');
    assert(join1.data?.data?.position === 1, 'Position Calc: Alice is position 1');
    assert(join1.data?.data?.peopleAhead === 0, 'Position Calc: Alice has 0 people ahead');
    assert(join1.data?.data?.estimatedWaitTimeMinutes === 0, 'Wait Time: 0 mins wait for front of line');
    const ticket1Id = join1.data?.data?.ticket?.id;

    const join2 = await request(`/api/public/queues/${queue1.queueCode}/join`, 'POST', {
      customerName: 'Bob Jones',
      customerContact: '555-0102',
    });
    assert(join2.status === 201, 'Customer Join: Bob joined with 201 Created');
    assert(join2.data?.data?.ticket?.tokenNumber === 2, 'Token Generation: Second customer received Token #2');
    assert(join2.data?.data?.position === 2, 'Position Calc: Bob is position 2');
    assert(join2.data?.data?.peopleAhead === 1, 'Position Calc: Bob has 1 person ahead');
    assert(join2.data?.data?.estimatedWaitTimeMinutes === 10, 'Wait Time: Bob estimated wait time is 10 mins (1 * 10min)');
    const ticket2Id = join2.data?.data?.ticket?.id;

    const join3 = await request(`/api/public/queues/${queue1.queueCode}/join`, 'POST', {
      customerName: 'Charlie Brown',
    });
    assert(join3.data?.data?.ticket?.tokenNumber === 3, 'Token Generation: Charlie received Token #3');
    assert(join3.data?.data?.peopleAhead === 2, 'Position Calc: Charlie has 2 people ahead');
    assert(join3.data?.data?.estimatedWaitTimeMinutes === 20, 'Wait Time: Charlie estimated wait time is 20 mins (2 * 10min)');
    const ticket3Id = join3.data?.data?.ticket?.id;

    // -------------------------------------------------------------
    // Test: Concurrency-Safe Token Generation (10 Simultaneous Joins)
    // -------------------------------------------------------------
    console.log('Testing atomic concurrency with 10 simultaneous customer join requests...');
    const concurrentJoinPromises = [];
    for (let i = 4; i <= 13; i++) {
      concurrentJoinPromises.push(
        request(`/api/public/queues/${queue1.queueCode}/join`, 'POST', {
          customerName: `Concurrent Guest ${i}`,
          customerContact: `555-00${i}`,
        })
      );
    }

    const concurrentResults = await Promise.all(concurrentJoinPromises);
    const concurrentTokens = concurrentResults.map((r) => r.data?.data?.ticket?.tokenNumber);
    const uniqueTokens = new Set(concurrentTokens);

    assert(concurrentResults.every((r) => r.status === 201), 'Concurrency: All 10 simultaneous join requests succeeded (201)');
    assert(uniqueTokens.size === 10, `Concurrency: Exactly 10 unique tokens generated (Tokens: ${concurrentTokens.join(', ')})`);
    assert(
      Math.min(...concurrentTokens) === 4 && Math.max(...concurrentTokens) === 13,
      'Concurrency: Tokens strictly ranged sequentially from 4 to 13 without collision'
    );

    // -------------------------------------------------------------
    // Test: Public Ticket Status & Live Position Calculation
    // -------------------------------------------------------------
    const ticket2Status = await request(`/api/public/tickets/${ticket2Id}`, 'GET');
    assert(ticket2Status.status === 200, 'Ticket Status: GET /api/public/tickets/:id returns 200');
    assert(ticket2Status.data?.data?.ticket?.tokenNumber === 2, 'Ticket Status: Correct token number');
    assert(ticket2Status.data?.data?.position === 2, 'Ticket Status: Bob is currently position 2');
    assert(ticket2Status.data?.data?.peopleAhead === 1, 'Ticket Status: 1 person ahead of Bob');
    assert(!ticket2Status.data?.data?.ticket?.customerContact, 'Privacy: Customer contact is not exposed in public ticket endpoint');

    // Invalid ticket ID check
    const invalidTicketFormat = await request('/api/public/tickets/invalid-id-format', 'GET');
    assert(invalidTicketFormat.status === 400, 'Validation: Malformed ticket ObjectId rejected with 400');

    const nonExistentTicket = await request('/api/public/tickets/507f1f77bcf86cd799439011', 'GET');
    assert(nonExistentTicket.status === 404, 'Validation: Non-existent ticket returns 404');

    // -------------------------------------------------------------
    // Test: Paused and Closed Queues (Customer Join Rejection)
    // -------------------------------------------------------------
    // Pause queue 2
    const pauseQ2 = await request(`/api/queues/${queue2._id}`, 'PATCH', { status: 'paused' }, tokenA);
    assert(pauseQ2.status === 200 && pauseQ2.data?.data?.queue?.status === 'paused', 'Queue Management: Queue 2 set to paused');

    const joinPaused = await request(`/api/public/queues/${queue2.queueCode}/join`, 'POST', {
      customerName: 'Eager Customer',
    });
    assert(joinPaused.status === 400, 'Business Rule: Joining paused queue rejected with 400');
    assert(joinPaused.data?.message?.includes('paused'), 'Business Rule: Informs user that queue is paused');

    // Close queue 2
    const closeQ2 = await request(`/api/queues/${queue2._id}`, 'PATCH', { status: 'closed' }, tokenA);
    assert(closeQ2.status === 200 && closeQ2.data?.data?.queue?.status === 'closed', 'Queue Management: Queue 2 set to closed');

    const joinClosed = await request(`/api/public/queues/${queue2.queueCode}/join`, 'POST', {
      customerName: 'Late Customer',
    });
    assert(joinClosed.status === 400, 'Business Rule: Joining closed queue rejected with 400');
    assert(joinClosed.data?.message?.includes('closed'), 'Business Rule: Informs user that queue is closed');

    // -------------------------------------------------------------
    // Test: Admin Call Next Customer
    // -------------------------------------------------------------
    const callNext1 = await request(`/api/queues/${queue1._id}/next`, 'POST', null, tokenA);
    assert(callNext1.status === 200, 'Call Next: Calling next returns 200');
    assert(callNext1.data?.data?.ticket?.tokenNumber === 1, 'Call Next: Alice (Token #1) called to counter');
    assert(callNext1.data?.data?.ticket?.status === 'called', 'Call Next: Ticket status updated to "called"');
    assert(callNext1.data?.data?.queue?.currentlyServing === 1, 'Call Next: Queue currentlyServing updated to 1');

    // Verify Bob's position after Alice is called:
    const bobStatusAfterNext = await request(`/api/public/tickets/${ticket2Id}`, 'GET');
    assert(bobStatusAfterNext.data?.data?.position === 1, 'Live Position: Bob moved up to position 1');
    assert(bobStatusAfterNext.data?.data?.peopleAhead === 0, 'Live Position: 0 people ahead of Bob in waiting line');

    // Call Next again -> Should auto-complete Alice (#1) and call Bob (#2)
    const callNext2 = await request(`/api/queues/${queue1._id}/next`, 'POST', null, tokenA);
    assert(callNext2.status === 200, 'Call Next: Second call next returns 200');
    assert(callNext2.data?.data?.ticket?.tokenNumber === 2, 'Call Next: Bob (Token #2) called to counter');
    assert(callNext2.data?.data?.queue?.currentlyServing === 2, 'Call Next: Queue currentlyServing updated to 2');

    // Verify Alice was auto-completed
    const aliceFinal = await request(`/api/public/tickets/${ticket1Id}`, 'GET');
    assert(aliceFinal.data?.data?.ticket?.status === 'completed', 'Lifecycle: Previous called customer automatically marked completed');

    // -------------------------------------------------------------
    // Test: Complete and Skip Ticket Actions
    // -------------------------------------------------------------
    // Complete Bob (#2)
    const completeBob = await request(`/api/tickets/${ticket2Id}/complete`, 'PATCH', null, tokenA);
    assert(completeBob.status === 200, 'Complete Action: PATCH /api/tickets/:id/complete returns 200');
    assert(completeBob.data?.data?.ticket?.status === 'completed', 'Complete Action: Bob marked completed');

    // Call next -> Charlie (#3)
    const callNext3 = await request(`/api/queues/${queue1._id}/next`, 'POST', null, tokenA);
    assert(callNext3.data?.data?.ticket?.tokenNumber === 3, 'Call Next: Charlie (Token #3) called');

    // Skip Charlie (#3)
    const skipCharlie = await request(`/api/tickets/${ticket3Id}/skip`, 'PATCH', null, tokenA);
    assert(skipCharlie.status === 200, 'Skip Action: PATCH /api/tickets/:id/skip returns 200');
    assert(skipCharlie.data?.data?.ticket?.status === 'skipped', 'Skip Action: Charlie marked skipped');

    // -------------------------------------------------------------
    // Test: Invalid Status Transitions
    // -------------------------------------------------------------
    const reCompleteBob = await request(`/api/tickets/${ticket2Id}/complete`, 'PATCH', null, tokenA);
    assert(reCompleteBob.status === 400, 'Status Transition: Re-completing completed ticket rejected with 400');

    const reSkipCharlie = await request(`/api/tickets/${ticket3Id}/skip`, 'PATCH', null, tokenA);
    assert(reSkipCharlie.status === 400, 'Status Transition: Re-skipping skipped ticket rejected with 400');

    // Cross-business ticket modification attempt
    const crossSkip = await request(`/api/tickets/${ticket3Id}/skip`, 'PATCH', null, tokenB);
    assert(crossSkip.status === 404, 'Security: Business B cannot skip Business A ticket (returns 404)');

    // -------------------------------------------------------------
    // Test: Empty Queue / No Waiting Tickets
    // -------------------------------------------------------------
    const emptyQRes = await request('/api/queues', 'POST', { name: 'Empty Test Queue' }, tokenA);
    const emptyQId = emptyQRes.data?.data?.queue?._id;
    const callEmptyNext = await request(`/api/queues/${emptyQId}/next`, 'POST', null, tokenA);
    assert(callEmptyNext.status === 400, 'Empty Queue: Calling next on queue with no waiting tickets returns 400');
    assert(callEmptyNext.data?.message?.includes('No waiting customers'), 'Empty Queue: Informative error message');

    // -------------------------------------------------------------
    // Summary
    // -------------------------------------------------------------
    console.log('================================================================');
    console.log(`Results: ${passed} PASSED | ${failed} FAILED`);
    console.log('================================================================');

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error('Fatal test runner error:', err);
    process.exit(1);
  }
};

runQueueTests();
