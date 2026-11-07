import { verifyToken } from '../utils/token.js';
import User from '../models/User.js';

/**
 * Authentication Middleware
 * Validates JWT in Authorization: Bearer <token> header and attaches authenticated user
 */
export const authenticate = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required. No token provided.',
      });
    }

    const token = authHeader.split(' ')[1];
    if (!token) {
      return res.status(401).json({
        status: 'error',
        message: 'Malformed authorization token.',
      });
    }

    let decoded;
    try {
      decoded = verifyToken(token);
    } catch (err) {
      if (err.name === 'TokenExpiredError') {
        return res.status(401).json({
          status: 'error',
          message: 'Token expired. Please sign in again.',
        });
      }
      return res.status(401).json({
        status: 'error',
        message: 'Invalid authorization token.',
      });
    }

    // Load active user from database with business details
    const user = await User.findById(decoded.id).populate('business');
    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'The account associated with this token no longer exists.',
      });
    }

    // Attach user and verified business context to request object
    req.user = user;
    req.business = user.business;

    next();
  } catch (error) {
    next(error);
  }
};

/**
 * Role-Based Authorization Middleware
 * @param  {...string} roles - Allowed roles (e.g. 'admin', 'staff')
 */
export const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication required prior to role verification.',
      });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({
        status: 'error',
        message: `Forbidden: Access restricted to [${roles.join(', ')}] roles. Your role is ${req.user.role}.`,
      });
    }

    next();
  };
};

/**
 * Business Ownership Verification Middleware
 * Guarantees that any action referencing a business belongs strictly to the authenticated user's business.
 * Never trusts business IDs supplied by the frontend without checking authorization.
 */
export const verifyBusinessOwnership = (req, res, next) => {
  if (!req.user || !req.user.business) {
    return res.status(401).json({
      status: 'error',
      message: 'Authentication and business context required.',
    });
  }

  const authenticatedBusinessId = req.user.business._id.toString();
  const authenticatedBusinessSlug = req.user.business.businessId;

  // Check target business ID from params or body if specified
  const requestedBusinessId =
    req.params.businessId || req.body.businessId || req.query.businessId;

  if (requestedBusinessId) {
    const isMatch =
      requestedBusinessId === authenticatedBusinessId ||
      requestedBusinessId.toUpperCase() === authenticatedBusinessSlug.toUpperCase();

    if (!isMatch) {
      return res.status(403).json({
        status: 'error',
        message: 'Forbidden: You do not have permission to access or modify data for another business.',
      });
    }
  }

  next();
};
