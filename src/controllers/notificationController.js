import User from '../models/User.js';
import NotificationLog from '../models/NotificationLog.js';
import { sendTestEmail } from '../services/email.service.js';
import { sendTestPush } from '../services/pushNotification.service.js';

// @desc    Get User Notification Settings
// @route   GET /api/users/notifications/settings
// @access  Private
export const getNotificationSettings = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      settings: user.notificationSettings || {
        email: true,
        push: true,
        website: true,
      },
      oneSignalPlayerId: user.oneSignalPlayerId || null,
    });
  } catch (error) {
    console.error('Get Notification Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Update User Notification Settings
// @route   PUT /api/users/notifications/settings
// @access  Private
export const updateNotificationSettings = async (req, res) => {
  try {
    const { email, push, website } = req.body;

    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Update settings
    user.notificationSettings = {
      email: email !== undefined ? email : user.notificationSettings?.email ?? true,
      push: push !== undefined ? push : user.notificationSettings?.push ?? true,
      website: website !== undefined ? website : user.notificationSettings?.website ?? true,
    };

    await user.save();

    res.status(200).json({
      success: true,
      message: 'Notification settings updated',
      settings: user.notificationSettings,
    });
  } catch (error) {
    console.error('Update Notification Settings Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Register OneSignal Player ID
// @route   POST /api/users/notifications/register-device
// @access  Private
export const registerOneSignalDevice = async (req, res) => {
  try {
    const { playerId } = req.body;

    if (!playerId) {
      return res.status(400).json({
        success: false,
        message: 'Player ID is required',
      });
    }

    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    user.oneSignalPlayerId = playerId;
    await user.save();

    console.log(`✅ OneSignal device registered for ${user.email}: ${playerId}`);

    res.status(200).json({
      success: true,
      message: 'Device registered successfully',
      playerId,
    });
  } catch (error) {
    console.error('Register Device Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get Notification History
// @route   GET /api/users/notifications/history
// @access  Private
export const getNotificationHistory = async (req, res) => {
  try {
    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const notifications = await NotificationLog.find({
      userId: user._id,
    })
      .sort({ sentAt: -1 })
      .limit(50)
      .populate('appointmentId', 'tokenNumber category entityName');

    res.status(200).json({
      success: true,
      count: notifications.length,
      notifications,
    });
  } catch (error) {
    console.error('Get Notification History Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Send Test Notification
// @route   POST /api/users/notifications/test
// @access  Private
export const sendTestNotification = async (req, res) => {
  try {
    const { type } = req.body; // 'email' or 'push'

    const user = await User.findOne({ uid: req.user.uid });
    
    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const results = {};

    if (type === 'email' || type === 'all') {
      try {
        await sendTestEmail(user.email);
        results.email = { success: true, message: 'Test email sent' };
      } catch (error) {
        results.email = { success: false, message: error.message };
      }
    }

    if (type === 'push' || type === 'all') {
      if (user.oneSignalPlayerId) {
        try {
          await sendTestPush(user.oneSignalPlayerId);
          results.push = { success: true, message: 'Test push sent' };
        } catch (error) {
          results.push = { success: false, message: error.message };
        }
      } else {
        results.push = { success: false, message: 'Push notifications not enabled' };
      }
    }

    res.status(200).json({
      success: true,
      message: 'Test notification(s) sent',
      results,
    });
  } catch (error) {
    console.error('Send Test Notification Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
