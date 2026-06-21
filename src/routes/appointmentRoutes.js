import express from 'express';
import {
  createAppointment,
  getMyAppointments,
  getCurrentQueue,
  getAppointmentById,
  cancelAppointment,
  getServiceTypes,
  getEntitiesByCategory,
  getAvailableSlots,
} from '../controllers/appointmentController.js';
import { protect } from '../middleware/auth.middleware.js';

const router = express.Router();

// Public routes
router.get('/services/:category', getServiceTypes);
router.get('/queue/:category', getCurrentQueue);
router.get('/entities/:category', getEntitiesByCategory);
router.get('/slots', getAvailableSlots);

// Protected routes
router.post('/', protect, createAppointment);
router.get('/my', protect, getMyAppointments);
router.get('/:id', protect, getAppointmentById);
router.put('/:id/cancel', protect, cancelAppointment);

export default router;
