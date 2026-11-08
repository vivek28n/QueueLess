import jwt from 'jsonwebtoken';

export const DEV_FALLBACK_SECRET = 'queueless_super_secret_jwt_key_dev_2026';

/**
 * Validates and retrieves the JWT secret with strict production guarantees.
 * - In production mode: strictly requires a strong, non-placeholder JWT_SECRET (>= 32 chars).
 *   Fails safe with descriptive error if missing or weak.
 * - In development / test mode: safely falls back to a default dev secret if not set.
 */
export const validateJwtSecret = () => {
  const isProduction = process.env.NODE_ENV === 'production';
  const secret = process.env.JWT_SECRET;

  if (isProduction) {
    if (!secret || typeof secret !== 'string' || !secret.trim()) {
      throw new Error(
        '[Security Fatal] JWT_SECRET environment variable is missing in production mode. ' +
        'A secure, 256-bit (>= 32 characters) secret key is mandatory to sign and verify production JWT tokens.'
      );
    }

    const trimmedSecret = secret.trim();

    // Check for common dev placeholders
    if (
      trimmedSecret === DEV_FALLBACK_SECRET ||
      trimmedSecret.includes('change_me') ||
      trimmedSecret.includes('your_jwt_secret') ||
      trimmedSecret.includes('secret_key_here')
    ) {
      throw new Error(
        '[Security Fatal] JWT_SECRET in production cannot be a known development placeholder. ' +
        'Please generate a cryptographically strong secret (e.g., using `crypto.randomBytes(32).toString("hex")`).'
      );
    }

    // Require minimum 32 characters for HMAC-SHA256 production security
    if (trimmedSecret.length < 32) {
      throw new Error(
        `[Security Fatal] JWT_SECRET in production is too weak (length: ${trimmedSecret.length}). ` +
        'It must be at least 32 characters long to guarantee cryptographic integrity.'
      );
    }

    return trimmedSecret;
  }

  // Non-production fallback (development & test)
  if (!secret || typeof secret !== 'string' || !secret.trim()) {
    return DEV_FALLBACK_SECRET;
  }

  return secret.trim();
};

export const getJwtSecret = () => validateJwtSecret();

export const generateToken = (user) => {
  const secret = getJwtSecret();
  const businessId = user.business?._id ? user.business._id.toString() : user.business?.toString();

  return jwt.sign(
    {
      id: user._id.toString(),
      role: user.role,
      businessId,
    },
    secret,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || '7d',
    }
  );
};

export const verifyToken = (token) => {
  const secret = getJwtSecret();
  return jwt.verify(token, secret);
};
