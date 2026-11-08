/**
 * In-Memory Sliding-Window Rate Limiter
 *
 * ============================================================================
 * ARCHITECTURAL NOTES & LIMITATIONS:
 * ============================================================================
 * 1. Reverse Proxy & Render IP Resolution:
 *    - In Render / cloud PaaS environments, the platform's load balancer terminates
 *      SSL and forwards the client's real public IP in the `X-Forwarded-For` header.
 *    - With Express configured with `app.set('trust proxy', 1)` in `server/src/index.js`,
 *      `req.ip` is automatically populated with the true client IP (the leftmost IP
 *      in the proxy chain).
 *    - As a defense-in-depth fallback, this limiter inspects `req.ip`, the first item
 *      in `req.headers['x-forwarded-for']`, and `req.socket.remoteAddress`.
 *    - IPv6-mapped IPv4 representations (e.g. `::ffff:192.168.1.1`) are normalized.
 *
 * 2. In-Memory & Single-Instance Limitation:
 *    - Rate limits are stored in a local Node.js process `Map` in memory.
 *    - If the backend is horizontally scaled to multiple container replicas or
 *      clustered across worker processes, each instance maintains an isolated rate limit
 *      counter. Requests distributed across instances will not share state.
 *    - For distributed, multi-instance horizontal scaling, an external shared key-value
 *      datastore (e.g., Redis / Dragonfly) is recommended.
 *    - This implementation avoids adding external paid dependencies or infrastructure
 *      costs while offering zero-latency, CPU-efficient throttling for single-instance
 *      deployments.
 *
 * 3. Ephemeral State:
 *    - In-memory rate counters reset when the server restarts or deploys.
 *    - An automatic cleanup sweep runs every `windowMs` to purge expired timestamps,
 *      preventing unbounded memory growth under high IP churn.
 * ============================================================================
 */

/**
 * Normalizes an IP string (stripping IPv6-mapped IPv4 prefix)
 */
const normalizeIp = (rawIp) => {
  if (!rawIp || typeof rawIp !== 'string') return 'unknown-ip';
  const clean = rawIp.trim();
  if (clean.startsWith('::ffff:')) {
    return clean.replace('::ffff:', '');
  }
  return clean;
};

/**
 * Creates a sliding-window rate limiter middleware
 * @param {Object} options
 * @param {number} options.windowMs - Window time in milliseconds
 * @param {number} options.max - Maximum requests allowed per window
 * @param {string} options.message - Error message returned on HTTP 429
 */
export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 50,
  message = 'Too many requests. Please try again later.',
} = {}) => {
  const records = new Map();

  // Periodic cleanup sweep to prevent memory leaks over time
  const sweepInterval = setInterval(() => {
    const now = Date.now();
    for (const [ip, timestamps] of records.entries()) {
      const active = timestamps.filter((time) => now - time < windowMs);
      if (active.length === 0) {
        records.delete(ip);
      } else {
        records.set(ip, active);
      }
    }
  }, windowMs);

  // Unref timer so node process can terminate smoothly
  if (sweepInterval.unref) {
    sweepInterval.unref();
  }

  return (req, res, next) => {
    // In test environment, bypass to avoid interfering with automated test assertions
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    // Resolve client IP (respecting Render's trust-proxy setting)
    const rawIp =
      req.ip ||
      (req.headers['x-forwarded-for']
        ? req.headers['x-forwarded-for'].split(',')[0].trim()
        : null) ||
      req.socket?.remoteAddress ||
      'unknown-ip';

    const clientIp = normalizeIp(rawIp);

    // In local development, allow loopback requests without throttling so rapid tests can run
    if (
      process.env.NODE_ENV !== 'production' &&
      (clientIp === '127.0.0.1' || clientIp === '::1' || clientIp.includes('127.0.0.1'))
    ) {
      return next();
    }

    const now = Date.now();
    const timestamps = records.get(clientIp) || [];

    // Filter to timestamps strictly within active sliding window
    const activeTimestamps = timestamps.filter((time) => now - time < windowMs);

    if (activeTimestamps.length >= max) {
      const retryAfterSeconds = Math.ceil((activeTimestamps[0] + windowMs - now) / 1000);
      res.setHeader('Retry-After', retryAfterSeconds);
      return res.status(429).json({
        status: 'error',
        message,
        retryAfterSeconds,
      });
    }

    activeTimestamps.push(now);
    records.set(clientIp, activeTimestamps);
    next();
  };
};

/**
 * Registration rate limiter: max 10 account creations per hour per IP
 * Protects against automated account spamming and bot registration floods.
 */
export const registerLimiter = createRateLimiter({
  windowMs: 60 * 60 * 1000, // 1 hour
  max: 10,
  message: 'Too many account registrations from this IP address. Please wait an hour before attempting registration again.',
});

/**
 * Login rate limiter: max 20 login attempts per 15 minutes per IP
 * Protects against credential stuffing and brute-force password guessing.
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20,
  message: 'Too many login attempts from this IP address. Please wait 15 minutes before trying again.',
});

/**
 * Public join rate limiter: max 30 ticket requests per 5 minutes per IP
 * Protects public queue endpoints against token flooding and denial of service.
 */
export const publicJoinLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000, // 5 minutes
  max: 30,
  message: 'Too many queue join requests from this IP address. Please wait 5 minutes before joining again.',
});
