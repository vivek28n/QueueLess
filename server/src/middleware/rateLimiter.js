/**
 * Lightweight in-memory sliding-window rate limiter
 * Protects authentication and public queue join endpoints from brute force and token spam
 */

export const createRateLimiter = ({
  windowMs = 15 * 60 * 1000,
  max = 50,
  message = 'Too many requests. Please try again later.',
} = {}) => {
  const records = new Map();

  // Periodic cleanup every window cycle to prevent memory leaks
  const interval = setInterval(() => {
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
  if (interval.unref) {
    interval.unref();
  }

  return (req, res, next) => {
    // In test environment, bypass to avoid interfering with automated test assertions
    if (process.env.NODE_ENV === 'test') {
      return next();
    }

    const ip =
      req.ip ||
      (req.headers['x-forwarded-for'] ? req.headers['x-forwarded-for'].split(',')[0].trim() : null) ||
      req.socket.remoteAddress ||
      'unknown-ip';

    // In local development, allow loopback requests without throttling so rapid test suites can run
    if (
      process.env.NODE_ENV !== 'production' &&
      (ip === '127.0.0.1' || ip === '::1' || ip === '::ffff:127.0.0.1' || ip.includes('127.0.0.1'))
    ) {
      return next();
    }

    const now = Date.now();
    const timestamps = records.get(ip) || [];

    // Filter to active window
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
    records.set(ip, activeTimestamps);
    next();
  };
};

/**
 * Login rate limiter: max 20 login attempts per 15 minutes per IP
 */
export const loginLimiter = createRateLimiter({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: 'Too many login attempts from this IP address. Please wait 15 minutes before trying again.',
});

/**
 * Public join rate limiter: max 30 ticket requests per 5 minutes per IP
 */
export const publicJoinLimiter = createRateLimiter({
  windowMs: 5 * 60 * 1000,
  max: 30,
  message: 'Too many queue join requests from this IP address. Please wait 5 minutes before joining again.',
});
