import jwt from 'jsonwebtoken';

/**
 * Generate JWT Token
 * @param {string} userId - User's MongoDB _id
 * @param {string} email - User's email
 * @param {string} role - User's role (customer/admin)
 * @returns {string} JWT token
 */
export const generateToken = (userId, email, role) => {
  const payload = {
    userId,
    email,
    role,
  };

  const token = jwt.sign(payload, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '7d',
  });

  return token;
};

/**
 * Verify JWT Token
 * @param {string} token - JWT token to verify
 * @returns {object} Decoded token payload
 */
export const verifyToken = (token) => {
  try {
    return jwt.verify(token, process.env.JWT_SECRET);
  } catch (error) {
    throw new Error('Invalid or expired token');
  }
};

/**
 * Set JWT as HTTP-only cookie
 * @param {object} res - Express response object
 * @param {string} token - JWT token
 */
export const setTokenCookie = (res, token) => {
  const cookieOptions = {
    httpOnly: true, // Prevent XSS attacks
    secure: process.env.NODE_ENV === 'production', // HTTPS only in production
    sameSite: 'strict', // CSRF protection
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  };

  res.cookie('token', token, cookieOptions);
};

/**
 * Clear JWT cookie
 * @param {object} res - Express response object
 */
export const clearTokenCookie = (res) => {
  res.cookie('token', '', {
    httpOnly: true,
    expires: new Date(0),
  });
};
