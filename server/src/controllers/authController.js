import crypto from 'crypto';
import User from '../models/User.js';
import Business from '../models/Business.js';
import { generateToken } from '../utils/token.js';

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
 * @access  Public
 */
export const register = async (req, res, next) => {
  try {
    const { businessName, adminName, email, password, industry } = req.body;

    // Field presence validation
    if (!businessName || !adminName || !email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide all required fields: businessName, adminName, email, password.',
      });
    }

    // Password strength check
    if (password.length < 6) {
      return res.status(400).json({
        status: 'error',
        message: 'Password must be at least 6 characters long.',
      });
    }

    const normalizedEmail = email.toLowerCase().trim();

    // Check duplicate email
    const existingUser = await User.findOne({ email: normalizedEmail });
    if (existingUser) {
      return res.status(400).json({
        status: 'error',
        message: 'An account with this email address already exists. Please sign in.',
      });
    }

    // Generate unique business identifier
    const businessId = await generateUniqueBusinessId(businessName);

    // Validate industry against allowed enum
    const validIndustries = ['healthcare', 'restaurant', 'retail', 'banking', 'government', 'other'];
    const chosenIndustry = industry && validIndustries.includes(industry.toLowerCase())
      ? industry.toLowerCase()
      : 'other';

    // 1. Create Business document
    const business = await Business.create({
      name: businessName.trim(),
      businessId,
      industry: chosenIndustry,
    });

    // 2. Create User document with admin role linked to business
    const user = await User.create({
      name: adminName.trim(),
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
 * @access  Public
 */
export const login = async (req, res, next) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        status: 'error',
        message: 'Please provide both email and password.',
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

    // If client requested a specific portal (e.g. admin vs staff), ensure permission compatibility
    if (role && role === 'admin' && user.role !== 'admin') {
      return res.status(403).json({
        status: 'error',
        message: 'Access denied: You do not have administrator permissions.',
      });
    }

    // Generate JWT token
    const token = generateToken(user);

    return res.status(200).json({
      status: 'success',
      message: 'Authentication successful.',
      token,
      user: user.toJSON(),
    });
  } catch (error) {
    next(error);
  }
};

/**
 * @desc    Get Current Authenticated User Session
 * @route   GET /api/auth/me
 * @access  Private (JWT Authenticated)
 */
export const getMe = async (req, res) => {
  return res.status(200).json({
    status: 'success',
    user: req.user.toJSON(),
  });
};
