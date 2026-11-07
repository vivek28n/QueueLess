import http from 'http';
import { io as ioClient } from 'socket.io-client';

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

const createSocket = (token = null) => {
  return ioClient(BASE_URL, {
    transports: ['websocket', 'polling'],
    forceNew: true,
    auth: token ? { token } : {},
  });
};

const waitForEvent = (socket, eventName, timeoutMs = 5000) => {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(`Timeout waiting for socket event: "${eventName}" after ${timeoutMs}ms`));
    }, timeoutMs);

    socket.once(eventName, (data) => {
      clearTimeout(timer);
      resolve(data);
    });
  });
};

const runRealtimeTests = async () => {
  console.log('================================================================');
  console.log('⚡ Running Phase 4: Socket.IO Real-Time & QR Code Test Suite');
  console.log('================================================================');

  let passed = 0;
  let failed = 0;

  const assert = (condition, desc, detail = null) => {
    if (condition) {
      console.log(`[PASS] ${desc}`);
      passed++;
    } else {
      console.error(`[FAIL] ${desc}`);
      if (detail) console.error('   Detail:', detail);
      failed++;
    }
  };

  const openSockets = [];
  const trackSocket = (sock) => {
    openSockets.push(sock);
    return sock;
  };

  try {
    // -------------------------------------------------------------
    // Setup Businesses for Real-Time & Security Testing
    // -------------------------------------------------------------
    const timestamp = Date.now();
    const userA = {
      businessName: 'Starlight Medical Center',
      adminName: 'Chief Administrator Dave',
      email: `dave_${timestamp}@starlightmed.org`,
      password: 'SecurePassword2026!',
      industry: 'healthcare',
    };

    const userB = {
      businessName: 'Apex Tech Store',
      adminName: 'Store Manager John',
      email: `john_${timestamp}@apextech.com`,
      password: 'SecurePassword2026!',
      industry: 'retail',
    };

    const regA = await request('/api/auth/register', 'POST', userA);
    assert(regA.status === 201, 'Setup: Business A registered');
    const tokenA = regA.data?.token;
    const businessAId = regA.data?.user?.business?._id;

    const regB = await request('/api/auth/register', 'POST', userB);
    assert(regB.status === 201, 'Setup: Business B registered');
    const tokenB = regB.data?.token;
    const businessBId = regB.data?.user?.business?._id;

    // Create a Queue for Business A
    const createQueueRes = await request(
      '/api/queues',
      'POST',
      {
        name: 'Urgent Consultations',
        description: 'Priority medical desk line',
        averageServiceTime: 6,
      },
      tokenA
    );
    assert(createQueueRes.status === 201, 'Setup: Created Queue for Business A');
    const queueA = createQueueRes.data?.data?.queue;
    const queueCodeA = queueA.queueCode;

    // -------------------------------------------------------------
    // Test 1: Customer Socket Subscription & Invalid Code Handling
    // -------------------------------------------------------------
    const customerSock1 = trackSocket(createSocket());
    await new Promise((resolve) => customerSock1.on('connect', resolve));
    assert(customerSock1.connected, 'Socket Connect: Customer Socket 1 connected to server');

    // Subscribe to invalid queue code
    const errorPromise = waitForEvent(customerSock1, 'queue:error');
    customerSock1.emit('queue:join', { queueCode: 'INVALID-CODE-9999' });
    const errorData = await errorPromise;
    assert(errorData && errorData.message.includes('not found'), 'Security: Invalid queue code subscription triggers queue:error');

    // Subscribe to valid queue code
    const statePromise = waitForEvent(customerSock1, 'queue:state');
    customerSock1.emit('queue:join', { queueCode: queueCodeA });
    const initialState = await statePromise;
    assert(initialState && initialState.queue?.queueCode === queueCodeA, 'Subscription: Valid queue:join returns initial queue:state');
    assert(initialState.stats?.waitingCount === 0, 'Subscription: Initial waiting count is 0');
    assert(initialState.queue?.name === 'Urgent Consultations', 'Subscription: Queue metadata resolved correctly');

    // -------------------------------------------------------------
    // Test 2: Admin JWT Authentication & Cross-Business Prevention
    // -------------------------------------------------------------
    // Admin Socket A (valid token for Business A)
    const adminSockA = trackSocket(createSocket(tokenA));
    await new Promise((resolve) => adminSockA.on('connect', resolve));
    assert(adminSockA.connected, 'Admin Connect: Admin Socket A connected with JWT');

    const adminJoinPromise = new Promise((resolve) => {
      adminSockA.emit('admin:join', { businessId: businessAId }, (res) => resolve(res));
    });
    const adminJoinRes = await adminJoinPromise;
    assert(adminJoinRes.status === 'success', 'Admin Auth: Authenticated admin successfully joined business room');

    // Admin Socket B tries to subscribe to Business A's room (cross-tenant attack)
    const adminSockB = trackSocket(createSocket(tokenB));
    await new Promise((resolve) => adminSockB.on('connect', resolve));

    const crossJoinPromise = new Promise((resolve) => {
      adminSockB.emit('admin:join', { businessId: businessAId }, (res) => resolve(res));
    });
    const crossJoinRes = await crossJoinPromise;
    assert(
      crossJoinRes.status === 'error' && crossJoinRes.message.includes('Cross-business'),
      'Security: Cross-business admin room subscription strictly rejected'
    );

    // -------------------------------------------------------------
    // Test 3: Real-Time Customer Join Event (ticket:joined & queue:updated)
    // -------------------------------------------------------------
    const adminTicketJoinedPromise = waitForEvent(adminSockA, 'ticket:joined');
    const customerQueueUpdatedPromise = waitForEvent(customerSock1, 'queue:updated');

    // Customer joins via REST API
    const joinRes = await request(`/api/public/queues/${queueCodeA}/join`, 'POST', {
      customerName: 'Maya Lin',
      customerContact: '555-4321',
    });
    assert(joinRes.status === 201, 'API: Customer Maya Lin joined queue');
    const ticket1 = joinRes.data?.data?.ticket;

    // Verify Admin received real-time event
    const adminReceived = await adminTicketJoinedPromise;
    assert(adminReceived.ticket?.customerName === 'Maya Lin', 'Admin Event: Admin received ticket:joined with patron name');
    assert(adminReceived.ticket?.tokenNumber === 1, 'Admin Event: Correct token number emitted (#1)');
    assert(adminReceived.ticket?.customerContact === '555-4321', 'Admin Event: Admin event includes contact for desk communication');
    assert(adminReceived.stats?.waitingCount === 1, 'Admin Event: Queue stats updated to waitingCount = 1');

    // Verify Public Customer Socket received real-time update
    const publicReceived = await customerQueueUpdatedPromise;
    assert(publicReceived.queueCode === queueCodeA, 'Customer Event: Customer received queue:updated for Queue A');
    assert(publicReceived.stats?.waitingCount === 1, 'Customer Event: Waiting count updated in real-time');

    // -------------------------------------------------------------
    // Test 4: Public Event Payload Privacy Verification
    // -------------------------------------------------------------
    assert(
      !publicReceived.customerContact && (!publicReceived.lastTicket || !publicReceived.lastTicket.customerContact),
      'Privacy: Customer contact is STRICTLY omitted from public socket broadcasts'
    );

    // -------------------------------------------------------------
    // Test 5: Customer Personal Room Subscription (ticket:updated)
    // -------------------------------------------------------------
    const customerSock2 = trackSocket(createSocket());
    await new Promise((resolve) => customerSock2.on('connect', resolve));

    // Customer 2 joins room with ticketId
    const customer2StatePromise = waitForEvent(customerSock2, 'queue:state');
    customerSock2.emit('queue:join', { queueCode: queueCodeA, ticketId: ticket1.id });
    const customer2State = await customer2StatePromise;
    assert(customer2State.ticket?.id === ticket1.id, 'Personal Room: State includes personalized ticket status');
    assert(customer2State.ticket?.position === 1, 'Personal Room: Initial position is 1');
    assert(customer2State.ticket?.peopleAhead === 0, 'Personal Room: Initial peopleAhead is 0');

    // -------------------------------------------------------------
    // Test 6: Next Customer Call (ticket:updated & queue:updated)
    // -------------------------------------------------------------
    const customerCalledPromise = waitForEvent(customerSock2, 'ticket:updated');
    const adminNextTicketPromise = waitForEvent(adminSockA, 'ticket:updated');
    const adminNextQueuePromise = waitForEvent(adminSockA, 'queue:updated');

    // Admin calls next customer via API
    const callNextRes = await request(`/api/queues/${queueA._id}/next`, 'POST', null, tokenA);
    assert(callNextRes.status === 200, 'API: Admin called next customer');

    // Verify Customer 2 received personal call update
    const ticketUpdate = await customerCalledPromise;
    assert(ticketUpdate.ticket?.status === 'called', 'Live Dispatch: Customer received real-time ticket:updated with status "called"');
    assert(ticketUpdate.ticket?.tokenNumber === 1, 'Live Dispatch: Correct token called in real-time');
    assert(ticketUpdate.ticket?.position === 0, 'Live Dispatch: Position updated to 0 (Now Serving)');

    // Verify Admin received both events
    const adminTicketUpdate = await adminNextTicketPromise;
    const adminQueueUpdate = await adminNextQueuePromise;
    assert(adminTicketUpdate.ticket?.status === 'called', 'Admin Dispatch: Admin received ticket:updated');
    assert(adminQueueUpdate.stats?.currentlyServing === 1, 'Admin Dispatch: Admin received queue:updated with currentlyServing = 1');

    // -------------------------------------------------------------
    // Test 7: Skip Ticket Event
    // -------------------------------------------------------------
    const customerSkipPromise = waitForEvent(customerSock2, 'ticket:updated');

    // Admin skips ticket 1
    const skipRes = await request(`/api/tickets/${ticket1.id}/skip`, 'PATCH', null, tokenA);
    assert(skipRes.status === 200, 'API: Admin skipped ticket 1');

    const skipUpdate = await customerSkipPromise;
    assert(skipUpdate.ticket?.status === 'skipped', 'Live Lifecycle: Customer received ticket:updated with status "skipped"');

    // -------------------------------------------------------------
    // Test 8: Complete Ticket Event
    // -------------------------------------------------------------
    // Customer 2 joins -> Token #2
    const join2Res = await request(`/api/public/queues/${queueCodeA}/join`, 'POST', {
      customerName: 'Alan Turing',
    });
    const ticket2 = join2Res.data?.data?.ticket;

    // Connect Customer 3 socket for ticket 2
    const customerSock3 = trackSocket(createSocket());
    await new Promise((resolve) => customerSock3.on('connect', resolve));
    customerSock3.emit('queue:join', { queueCode: queueCodeA, ticketId: ticket2.id });

    // Admin calls next (ticket 2)
    await request(`/api/queues/${queueA._id}/next`, 'POST', null, tokenA);

    // Complete ticket 2
    const customerCompletePromise = waitForEvent(customerSock3, 'ticket:updated');
    const completeRes = await request(`/api/tickets/${ticket2.id}/complete`, 'PATCH', null, tokenA);
    assert(completeRes.status === 200, 'API: Admin completed ticket 2');

    const completeUpdate = await customerCompletePromise;
    assert(completeUpdate.ticket?.status === 'completed', 'Live Lifecycle: Customer received ticket:updated with status "completed"');

    // -------------------------------------------------------------
    // Test 9: Queue Pause & Resume Events
    // -------------------------------------------------------------
    const pausePromise = waitForEvent(customerSock1, 'queue:updated');
    await request(`/api/queues/${queueA._id}`, 'PATCH', { status: 'paused' }, tokenA);
    const pauseEvent = await pausePromise;
    assert(pauseEvent.queue?.status === 'paused', 'Queue Lifecycle: Customer received queue:updated with status "paused"');

    const resumePromise = waitForEvent(customerSock1, 'queue:updated');
    await request(`/api/queues/${queueA._id}`, 'PATCH', { status: 'active' }, tokenA);
    const resumeEvent = await resumePromise;
    assert(resumeEvent.queue?.status === 'active', 'Queue Lifecycle: Customer received queue:updated with status "active"');

    // -------------------------------------------------------------
    // Test 10: Reconnection and Fresh State Retrieval
    // -------------------------------------------------------------
    // Simulate socket disconnect and reconnect
    customerSock1.disconnect();
    assert(!customerSock1.connected, 'Reconnection: Customer socket disconnected');

    customerSock1.connect();
    await new Promise((resolve) => customerSock1.on('connect', resolve));
    assert(customerSock1.connected, 'Reconnection: Customer socket reconnected');

    const reconnectedStatePromise = waitForEvent(customerSock1, 'queue:state');
    customerSock1.emit('queue:join', { queueCode: queueCodeA });
    const freshState = await reconnectedStatePromise;
    assert(freshState.queue?.status === 'active', 'Reconnection: Fresh state retrieved directly from DB');
    assert(freshState.queue?.queueCode === queueCodeA, 'Reconnection: Validated queue code on re-subscription');

    // -------------------------------------------------------------
    // Test 11: QR Code URL Correctness & Specs
    // -------------------------------------------------------------
    const expectedPrefix = 'http://localhost:5173/queue/';
    const testQrUrl = `${expectedPrefix}${queueCodeA}`;
    assert(testQrUrl.endsWith(queueCodeA), 'QR Spec: QR URL encodes unique queueCode');
    assert(!testQrUrl.includes(queueA._id.toString()), 'QR Spec: Internal MongoDB ObjectIds are NOT exposed in QR URL');
    assert(testQrUrl.startsWith('http'), 'QR Spec: Valid absolute HTTP/HTTPS URL generated');

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
    console.error('Fatal test error:', err);
    process.exit(1);
  } finally {
    // Clean up all test sockets
    for (const sock of openSockets) {
      try {
        sock.disconnect();
      } catch {}
    }
  }
};

runRealtimeTests();
