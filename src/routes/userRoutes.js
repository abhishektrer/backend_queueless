import express from 'express';
import {
  authUser,
  getUserProfile,
  updateUserProfile,
} from '../controllers/userController.js';
import { protect } from '../middleware/authMiddleware.js';
import { aiChatAssistant } from '../controllers/aiChatController.js';
import {
  getNotificationSettings,
  updateNotificationSettings,
  registerOneSignalDevice,
  getNotificationHistory,
  sendTestNotification,
} from '../controllers/notificationController.js';

const router = express.Router();

// Public routes
router.post('/auth', authUser);

// Protected routes
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);

// AI Chat Assistant - Available to all authenticated users
router.post('/ai/chat', protect, aiChatAssistant);

// Notification routes
router.get('/notifications/settings', protect, getNotificationSettings);
router.put('/notifications/settings', protect, updateNotificationSettings);
router.post('/notifications/register-device', protect, registerOneSignalDevice);
router.get('/notifications/history', protect, getNotificationHistory);
router.post('/notifications/test', protect, sendTestNotification);

export default router;
