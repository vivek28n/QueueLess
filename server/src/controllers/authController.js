import crypto from 'crypto';
import User from '../models/User.js';
import Business from '../models/Business.js';
import { generateToken } from '../utils/token.js';

// Safe email validation regex conforming to RFC 5322 standard subsets
const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// Helper to generate human-readable unique businessId
const generateUniqueBusinessId = async (businessName) => {
  const cleanPrefix = businessName
    .replace(/[^a-zA-Z0-9]/g, '')
    .substring(0, 5)
    .toUpperCase() || 'QUEUE';

  let unique = false;
  let candidateId = '';

  while (!unique) {
    const randomSuffix = crypto.randomBytes(3).toString('hex').toUpperCase();
    candidateId = `QL-${cleanPrefix}-${randomSuffix}`;
    const existing = await Business.findOne({ businessId: candidateId });
    if (!existing) {
      unique = true;
    }
  }

  return candidateId;
};

/**
 * @desc    Register a new Business and its primary Administrator
 * @route   POST /api/auth/register
 * @access  Public (Protected by registerLimiter)
 */
export const register = async (req, res, next) => {
  try {
    const { businessName, adminName, email, password, industry } = req.body;

    // Strict input type validation (defend against non-string / NoSQL injection inputs)
    if (
      typeof businessName !== 'string' ||
      typeof adminName !== 'string' ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid input types. businessName, adminName, email, and password must all be strings.',
      });
    }

    const trimmedBusiness = businessName.trim();
    const trimmedAdmin = adminName.trim();
    const normalizedEmail = email.toLowerCase().trim();

    // Field presence validation
    if (!trimmedBusiness || !trimmedAdmin || !normalizedEmail || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: businessName, adminName, email, password.',
      });
    }

    // Length constraints
    if (trimmedBusiness.length < 2 || trimmedBusiness.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Business name must be between 2 and 100 characters long.',
      });
    }

    if (trimmedAdmin.length < 2 || trimmedAdmin.length > 100) {
      return res.status(400).json({
        status: 'error',
        message: 'Administrator name must be between 2 and 100 characters long.',
      });
    }

    if (normalizedEmail.length > 255 || !EMAIL_REGEX.test(normalizedEmail)) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide a valid email address.',
      });
    }

    // Password strength & length constraints
    // Bcrypt truncates after 72 bytes; enforce minimum 8 characters and strict 72 UTF-8 bytes limit
    if (password.length < 8) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 8 characters long.',
      });
    }

    if (Buffer.byteLength(password, 'utf8') > 72) {
      return res.status(400).json({
        status: 'error',
        message: 'Password cannot exceed 72 bytes. Note that multibyte characters (such as emojis or accented characters) occupy more than 1 byte each.',
      });
    }

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // Generate unique business identifier
    const businessId = await generateUniqueBusinessId(trimmedBusiness);

    // Validate industry against allowed enum
    const validIndustries = ['healthcare', 'restaurant', 'retail', 'banking', 'government', 'other'];
    const chosenIndustry =
      industry && typeof industry === 'string' && validIndustries.includes(industry.toLowerCase().trim())
        ? industry.toLowerCase().trim()
        : 'other';

    // 1. Create Business document
    const business = await Business.create({
      name: trimmedBusiness,
      businessId,
      industry: chosenIndustry,
    });

    // 2. Create User document with admin role linked to business
    const user = await User.create({
      name: trimmedAdmin,
      email: normalizedEmail,
      password,
      role: 'admin',
      business: business._id,
    });

    // Generate JWT token
    const token = generateToken(user);

    // Prepare response data
    const userJson = user.toJSON();
    userJson.business = business.toJSON();

    return res.status(201).json({
      status: 'success',
      message: 'Business and administrator account registered successfully.',
      token,
      user: userJson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Authenticate User & Issue JWT
 * @route   POST /api/auth/login
 * @access  Public (Protected by loginLimiter)
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (
      !email ||
      !password ||
      typeof email !== 'string' ||
      typeof password !== 'string'
    ) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password as valid strings.',
      });
    }

    // Input-size validation on login to prevent bcrypt CPU exhaustion DoS attacks,
    // while fully preserving backward compatibility for existing accounts created under
    // previous implementations (which allowed up to 128 characters / 384+ UTF-8 bytes,
    // or unconstrained lengths where bcrypt truncated at 72 bytes).
    if (Buffer.byteLength(password, 'utf8') > 1024) {
      return res.status(400).json({
        status: 'error',
        message: 'Password exceeds maximum allowed size.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Find user including hashed password and populated business
    const user = await User.findOne({ email: normalizedEmail })
      .select('+password')
      .populate('business');

    if (!user) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Verify password match
    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        status: 'error',
        message: 'Invalid email or password.',
      });
    }

    // Optional role check if client specified a role
    if (role && typeof role === 'string' && user.role !== role) {
      return res.status(403).json({
        status: 'error',
        message: `Unauthorized. User account does not hold the required ${role} role.`,
      });
    }

    // Generate fresh JWT token
    const token = generateToken(user);

    const userJson = user.toJSON();

    return res.status(200).json({
      status: 'success',
      message: 'Authentication successful.',
      token,
      user: userJson,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Retrieve Current Authenticated Session & Business Profile
 * @route   GET /api/auth/me
 * @access  Private (Requires Bearer JWT)
 */
export const getMe = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id)
      .populate('business')
      .select('-__v');

    if (!user) {
      return res.status(404).json({
        status: 'error',
        message: 'User session not found.',
      });
    }

    return res.status(200).json({
      status: 'success',
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};
