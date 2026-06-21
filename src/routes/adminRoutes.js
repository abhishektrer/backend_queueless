import express from 'express';
import { protect, adminOnly } from '../middleware/auth.middleware.js'; // NEW JWT middleware

import {
  getAllHospitals,
  getHospital,
  createHospital,
  updateHospital,
  deleteHospital,
} from '../controllers/hospitalController.js';

import {
  getAllBanks,
  getBank,
  createBank,
  updateBank,
  deleteBank,
} from '../controllers/bankController.js';

import {
  getAllSalons,
  getSalon,
  createSalon,
  updateSalon,
  deleteSalon,
} from '../controllers/salonController.js';

import {
  getDashboardStats,
  getCategoryAnalytics,
  getCapacityPlanning,
  getQueueStatus,
  getUserAnalytics,
} from '../controllers/analyticsController.js';

import {
  getAllAppointments,
  callNextToken,
  completeAppointment,
  markNoShow,
} from '../controllers/adminQueueController.js';

import {
  getPredictedWaitTime,
  getCrowdForecast,
  getBestTimeRecommendation,
  getQueueOptimization,
} from '../controllers/aiController.js';

import {
  aiChatAssistant,
  predictNoShow,
} from '../controllers/aiChatController.js';

const router = express.Router();

// All admin routes require authentication and admin role
router.use(protect);
router.use(adminOnly);

// Hospital routes
router.get('/hospitals', getAllHospitals);
router.get('/hospitals/:id', getHospital);
router.post('/hospitals', createHospital);
router.put('/hospitals/:id', updateHospital);
router.delete('/hospitals/:id', deleteHospital);

// Bank routes
router.get('/banks', getAllBanks);
router.get('/banks/:id', getBank);
router.post('/banks', createBank);
router.put('/banks/:id', updateBank);
router.delete('/banks/:id', deleteBank);

// Salon routes
router.get('/salons', getAllSalons);
router.get('/salons/:id', getSalon);
router.post('/salons', createSalon);
router.put('/salons/:id', updateSalon);
router.delete('/salons/:id', deleteSalon);

// Analytics routes
router.get('/analytics/dashboard', getDashboardStats);
router.get('/analytics/category/:category', getCategoryAnalytics);
router.get('/analytics/capacity/:category', getCapacityPlanning);
router.get('/analytics/queue-status', getQueueStatus);
router.get('/analytics/users', getUserAnalytics);

// Queue management routes
router.get('/queue/appointments', getAllAppointments);
router.post('/queue/call-next', callNextToken);
router.put('/queue/complete/:id', completeAppointment);
router.put('/queue/no-show/:id', markNoShow);

// AI routes
router.post('/ai/predict-wait', getPredictedWaitTime);
router.get('/ai/crowd-forecast/:category', getCrowdForecast);
router.post('/ai/best-time', getBestTimeRecommendation);
router.get('/ai/optimize-queue/:category', getQueueOptimization);
router.post('/ai/chat', aiChatAssistant);
router.post('/ai/predict-noshow', predictNoShow);

export default router;
