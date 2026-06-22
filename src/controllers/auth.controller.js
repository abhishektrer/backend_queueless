import User from '../models/User.js';
import {
  generateToken,
  setTokenCookie,
  clearTokenCookie,
} from '../utils/generateToken.js';

/**
 * @desc    Register new user (Email/Password)
 * @route   POST /api/auth/register
 * @access  Public
 */
export const register = async (req, res) => {
  try {
    const { name, email, password, phoneNumber, role, adminCode } = req.body;

    console.log('📝 Register Request:', { name, email, role, hasPassword: !!password });

    // Validation
    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide name, email, and password',
      });
    }

    // Password length validation
    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'Password must be at least 6 characters',
      });
    }

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'User with this email already exists',
      });
    }

    // Validate admin registration code
    if (role === 'admin') {
      const adminCode = req.body.adminCode;
      const requiredCode = process.env.ADMIN_REGISTRATION_CODE || 'ADMIN2024';
      console.log('🔐 Admin code check:', { provided: adminCode, required: requiredCode });
      
      if (adminCode !== requiredCode) {
        return res.status(403).json({
          success: false,
          message: 'Invalid admin registration code',
        });
      }
    }

    console.log('✅ Creating user in database...');

    // Create user
    const user = await User.create({
      name,
      email,
      password,
      phoneNumber: phoneNumber || '',
      role: role === 'admin' ? 'admin' : 'customer',
      provider: 'local',
      isEmailVerified: false,
    });

    console.log('✅ User created:', user._id);

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Set token as HTTP-only cookie
    setTokenCookie(res, token);

    console.log('✅ Registration successful');

    res.status(201).json({
      success: true,
      message: 'Registration successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('❌ Registration Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during registration',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Login user (Email/Password)
 * @route   POST /api/auth/login
 * @access  Public
 */
export const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    console.log('🔐 Login Request:', { email });

    // Validation
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide email and password',
      });
    }

    // Find user and include password field
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      console.log('❌ User not found:', email);
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ User found:', { id: user._id, provider: user.provider });

    // Check if user is local provider (not OAuth)
    if (user.provider !== 'local') {
      console.log('❌ User is OAuth provider:', user.provider);
      return res.status(400).json({
        success: false,
        message: `This account uses ${user.provider} sign-in. Please use ${user.provider} to login.`,
      });
    }

    // Check if password exists (should exist for local users)
    if (!user.password) {
      console.log('❌ No password found for user');
      return res.status(500).json({
        success: false,
        message: 'Account configuration error. Please contact support.',
      });
    }

    console.log('🔍 Comparing passwords...');

    // Check password
    const isPasswordCorrect = await user.comparePassword(password);

    if (!isPasswordCorrect) {
      console.log('❌ Password mismatch');
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    console.log('✅ Password correct');

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Set token as HTTP-only cookie
    setTokenCookie(res, token);

    console.log('✅ Login successful');

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('❌ Login Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during login',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Google OAuth authentication
 * @route   POST /api/auth/google
 * @access  Public
 */
export const googleAuth = async (req, res) => {
  try {
    const { firebaseUid, name, email: reqEmail, photoURL } = req.body;

    console.log('🔐 Google Auth Request:', { firebaseUid, reqEmail, name });

    // Validation - firebaseUid is required
    if (!firebaseUid) {
      return res.status(400).json({
        success: false,
        message: 'Missing Firebase user ID',
      });
    }

    // Email handling - use placeholder if genuinely missing
    const email = reqEmail || `${firebaseUid}@google-noemail.com`;
    
    if (!reqEmail) {
      console.warn('⚠️ No email provided, using placeholder:', email);
    }

    // Check if user exists by email
    let user = await User.findOne({ email });

    if (user) {
      console.log('✅ Existing user found:', { 
        id: user._id, 
        provider: user.provider,
        hasPassword: !!user.password 
      });
      
      // MIGRATION LOGIC: If user was created with Firebase email/password before,
      // allow them to link their Google account
      if (user.provider === 'local' && !user.firebaseUid) {
        console.log('🔄 Migrating local user to support Google login...');
        
        // Update user to support both local and Google login
        user.firebaseUid = firebaseUid;
        user.photoURL = user.photoURL || photoURL || '';
        await user.save();
        
        console.log('✅ User migrated - can now use both email/password and Google');
      }
      // If user already has Google linked, just update Firebase UID if changed
      else if (user.firebaseUid && user.firebaseUid !== firebaseUid) {
        user.firebaseUid = firebaseUid;
        await user.save();
        console.log('✅ Firebase UID updated');
      }
      
      // Update name and photo if they're empty
      if (!user.name || user.name === 'Google User') {
        user.name = name || user.name;
      }
      if (!user.photoURL && photoURL) {
        user.photoURL = photoURL;
      }
      await user.save();
    } else {
      console.log('✅ Creating new Google user...');
      
      // Create new user with Google provider
      user = await User.create({
        name: name || 'Google User',
        email,
        firebaseUid,
        photoURL: photoURL || '',
        provider: 'google',
        role: 'customer',
        isEmailVerified: true, // Google emails are pre-verified
      });
      
      console.log('✅ New user created:', user._id);
    }

    // Generate JWT token
    const token = generateToken(user._id, user.email, user.role);

    // Set token as HTTP-only cookie
    setTokenCookie(res, token);

    console.log('✅ Google auth successful');

    res.status(200).json({
      success: true,
      message: 'Google sign-in successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('❌ Google Auth Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during Google authentication',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

/**
 * @desc    Logout user
 * @route   POST /api/auth/logout
 * @access  Private
 */
export const logout = async (req, res) => {
  try {
    // Clear token cookie
    clearTokenCookie(res);

    res.status(200).json({
      success: true,
      message: 'Logout successful',
    });
  } catch (error) {
    console.error('❌ Logout Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during logout',
    });
  }
};

/**
 * @desc    Get current logged-in user
 * @route   GET /api/auth/me
 * @access  Private
 */
export const getMe = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
        provider: user.provider,
        isEmailVerified: user.isEmailVerified,
        notificationSettings: user.notificationSettings,
        createdAt: user.createdAt,
      },
    });
  } catch (error) {
    console.error('❌ Get Me Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

/**
 * @desc    Update user profile
 * @route   PUT /api/auth/profile
 * @access  Private
 */
export const updateProfile = async (req, res) => {
  try {
    const { name, phoneNumber, photoURL } = req.body;

    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update fields
    if (name) user.name = name;
    if (phoneNumber !== undefined) user.phoneNumber = phoneNumber;
    if (photoURL !== undefined) user.photoURL = photoURL;

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('❌ Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during profile update',
    });
  }
};
