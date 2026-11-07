/**
 * Production Security Headers Middleware
 * Sets protective HTTP headers to guard against common web vulnerabilities
 */
export const securityHeaders = (req, res, next) => {
  // Prevent MIME-sniffing
  res.setHeader('X-Content-Type-Options', 'nosniff');

  // Prevent framing to mitigate clickjacking attacks
  res.setHeader('X-Frame-Options', 'DENY');

  // Basic XSS protection for older browsers
  res.setHeader('X-XSS-Protection', '1; mode=block');

  // Referrer Policy to avoid leaking internal URLs
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');

  // HTTP Strict Transport Security in production (enforce HTTPS)
  if (process.env.NODE_ENV === 'production') {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains');
  }

  // Remove Express identification header
  res.removeHeader('X-Powered-By');

  next();
};

export default securityHeaders;
