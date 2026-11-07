import jwt from 'jsonwebtoken';

export const generateToken = (user) => {
  const secret = process.env.JWT_SECRET || 'queueless_super_secret_jwt_key_dev_2026';
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
  const secret = process.env.JWT_SECRET || 'queueless_super_secret_jwt_key_dev_2026';
  return jwt.verify(token, secret);
};
