import Appointment from '../models/Appointment.js';
import { emitTokenCalled, emitAppointmentCompleted, emitQueueUpdated } from '../socket/socketServer.js';
import { checkAndNotifyWaitingUsers } from '../services/notification.service.js';

export const getAllAppointments = async (req, res) => {
  try {
    const { category, status } = req.query;
    const filter = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    
    const appointments = await Appointment.find(filter)
      .populate('userId', 'name email phoneNumber')
      .sort({ createdAt: -1 })
      .limit(100);
    
    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Get All Appointments Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const callNextToken = async (req, res) => {
  try {
    const { category } = req.body;
    
    const waitingAppointments = await Appointment.find({
      category,
      status: 'waiting',
    }).sort({ tokenNumber: 1 });
    
    if (waitingAppointments.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No appointments waiting',
      });
    }
    
    const PRIORITY_WEIGHTS = { emergency: 3, senior: 2, normal: 1 };
    const sorted = waitingAppointments.sort((a, b) => {
      const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
      if (priorityDiff !== 0) return priorityDiff;
      return a.tokenNumber - b.tokenNumber;
    });
    
    const nextAppointment = sorted[0];
    nextAppointment.status = 'serving';
    nextAppointment.calledAt = new Date();
    nextAppointment.calledBy = req.user._id;
    await nextAppointment.save();
    
    emitTokenCalled(category, nextAppointment.tokenNumber);
    emitQueueUpdated(category);
    
    // Check and notify users who are next in line (2 or fewer people ahead)
    await checkAndNotifyWaitingUsers(category);
    
    res.status(200).json({
      success: true,
      message: `Token ${nextAppointment.tokenNumber} called`,
      appointment: nextAppointment,
    });
  } catch (error) {
    console.error('Call Next Token Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const completeAppointment = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    appointment.status = 'completed';
    appointment.completedAt = new Date();
    
    if (appointment.calledAt) {
      const waitTime = Math.round((appointment.completedAt - appointment.calledAt) / 60000);
      appointment.actualWaitTime = waitTime;
    }
    
    await appointment.save();
    
    emitAppointmentCompleted(appointment.category, appointment.tokenNumber);
    emitQueueUpdated(appointment.category);
    
    res.status(200).json({
      success: true,
      message: 'Appointment completed',
      appointment,
    });
  } catch (error) {
    console.error('Complete Appointment Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const markNoShow = async (req, res) => {
  try {
    const { id } = req.params;
    
    const appointment = await Appointment.findById(id);
    if (!appointment) {
      return res.status(404).json({ success: false, message: 'Appointment not found' });
    }
    
    appointment.status = 'no-show';
    await appointment.save();
    
    emitQueueUpdated(appointment.category);
    
    res.status(200).json({
      success: true,
      message: 'Marked as no-show',
      appointment,
    });
  } catch (error) {
    console.error('Mark No Show Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
