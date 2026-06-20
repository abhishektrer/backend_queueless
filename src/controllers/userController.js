import User from '../models/User.js';
import { admin } from '../config/firebase.js';

// @desc    Register or login user
// @route   POST /api/users/auth
// @access  Public
export const authUser = async (req, res) => {
  try {
    const { uid, name, email, phoneNumber, photoURL, role } = req.body;

    // Check if user exists
    let user = await User.findOne({ uid });

    if (user) {
      // User exists, return user data
      return res.status(200).json({
        success: true,
        message: 'Login successful',
        user: {
          _id: user._id,
          uid: user.uid,
          name: user.name,
          email: user.email,
          phoneNumber: user.phoneNumber,
          role: user.role,
          photoURL: user.photoURL,
        },
      });
    }

    // Create new user with specified role (admin or user)
    user = await User.create({
      uid,
      name,
      email,
      phoneNumber: phoneNumber || '',
      photoURL: photoURL || '',
      role: role || 'user', // Support admin role during registration
    });

    res.status(201).json({
      success: true,
      message: 'User registered successfully',
      user: {
        _id: user._id,
        uid: user.uid,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('Auth User Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error during authentication',
    });
  }
};

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
export const getUserProfile = async (req, res) => {
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
        uid: user.uid,
        name: user.name,
        email: user.email,
        phoneNumber: user.phoneNumber,
        role: user.role,
        photoURL: user.photoURL,
      },
    });
  } catch (error) {
    console.error('Get Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
export const updateUserProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user._id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.name = req.body.name || user.name;
    user.phoneNumber = req.body.phoneNumber || user.phoneNumber;
    user.photoURL = req.body.photoURL || user.photoURL;

    const updatedUser = await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: updatedUser._id,
        uid: updatedUser.uid,
        name: updatedUser.name,
        email: updatedUser.email,
        phoneNumber: updatedUser.phoneNumber,
        role: updatedUser.role,
        photoURL: updatedUser.photoURL,
      },
    });
  } catch (error) {
    console.error('Update Profile Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
