import Appointment from '../models/Appointment.js';
import User from '../models/User.js';
import Hospital from '../models/Hospital.js';
import Bank from '../models/Bank.js';
import Salon from '../models/Salon.js';
import {
  emitQueueUpdated,
  emitAppointmentBooked,
  emitAppointmentCancelled,
} from '../socket/socketServer.js';
import { generateTimeSlots, recommendSmartSlots, predictWaitTime } from '../services/aiService.js';

// Service types for each category
const SERVICE_TYPES = {
  Hospital: ['General Physician', 'Dentist', 'Pediatrician', 'Eye Specialist'],
  Bank: ['Account Opening', 'Loan Application', 'Cash Deposit', 'General Inquiry'],
  Salon: ['Haircut', 'Hair Color', 'Facial', 'Massage'],
};

// Priority weights for sorting
const PRIORITY_WEIGHTS = {
  emergency: 3,
  senior: 2,
  normal: 1,
};

// Average service time (in minutes) per category
const AVG_SERVICE_TIME = {
  Hospital: 15,
  Bank: 10,
  Salon: 30,
};

// @desc    Create new appointment and generate token
// @route   POST /api/appointments
// @access  Private
export const createAppointment = async (req, res) => {
  try {
    const { category, serviceType, priority, entityId, entityName, serviceProvider, slotTime, appointmentDate } = req.body;

    // Validate category
    if (!SERVICE_TYPES[category]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    // Validate service type
    if (!SERVICE_TYPES[category].includes(serviceType)) {
      return res.status(400).json({
        success: false,
        message: `Invalid service type for ${category}`,
      });
    }

    // Check slot availability if entityId and serviceProvider are provided
    if (entityId && serviceProvider && slotTime && appointmentDate) {
      const selectedDate = new Date(appointmentDate);
      const dayStart = new Date(selectedDate);
      dayStart.setHours(0, 0, 0, 0);
      const dayEnd = new Date(selectedDate);
      dayEnd.setHours(23, 59, 59, 999);

      // Count appointments for this provider on this date and time
      const existingAppointments = await Appointment.countDocuments({
        entityId,
        serviceProvider,
        slotTime,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['waiting', 'serving'] },
      });

      // Get max appointments based on entity
      let maxAppointments = 1; // Default 1 per slot
      if (category === 'Hospital') {
        const hospital = await Hospital.findById(entityId);
        const doctor = hospital?.doctors?.find(d => d.name === serviceProvider);
        maxAppointments = doctor?.maxAppointmentsPerDay || 10;
      } else if (category === 'Salon') {
        const salon = await Salon.findById(entityId);
        const stylist = salon?.stylists?.find(s => s.name === serviceProvider);
        maxAppointments = stylist?.maxAppointmentsPerDay || 8;
      }

      // Check if slot is full
      const totalBookingsForDay = await Appointment.countDocuments({
        entityId,
        serviceProvider,
        appointmentDate: { $gte: dayStart, $lte: dayEnd },
        status: { $in: ['waiting', 'serving'] },
      });

      if (totalBookingsForDay >= maxAppointments) {
        return res.status(400).json({
          success: false,
          message: 'This provider is fully booked for the selected date. Please choose another date.',
        });
      }

      if (existingAppointments >= 1) {
        return res.status(400).json({
          success: false,
          message: 'This time slot is already booked. Please choose another slot.',
        });
      }
    }

    // Find the latest token number for this category
    const latestAppointment = await Appointment.findOne({ category })
      .sort({ tokenNumber: -1 })
      .limit(1);

    // Generate new token number
    const newTokenNumber = latestAppointment ? latestAppointment.tokenNumber + 1 : 1;

    // Count people ahead in queue with priority logic
    const waitingAppointments = await Appointment.find({
      category,
      status: 'waiting',
    }).sort({ tokenNumber: 1 });

    // Calculate estimated wait time with AI
    const now = new Date();
    const aiWaitPrediction = await predictWaitTime({
      patientsAhead: waitingAppointments.length,
      serviceProvider: serviceProvider || 'General',
      priority: priority || 'normal',
      timeOfDay: `${now.getHours()}:${String(now.getMinutes()).padStart(2, '0')}`,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      avgServiceTime: AVG_SERVICE_TIME[category],
    });

    // Create appointment
    const appointment = await Appointment.create({
      userId: req.user._id,
      category,
      entityId: entityId || undefined,
      entityName: entityName || '',
      serviceType,
      serviceProvider: serviceProvider || '',
      slotTime: slotTime || '',
      appointmentDate: appointmentDate || new Date(),
      tokenNumber: newTokenNumber,
      status: 'waiting',
      priority: priority || 'normal',
      estimatedWaitTime: aiWaitPrediction.predictedWaitTime,
      aiPredictions: {
        predictedWaitTime: aiWaitPrediction.predictedWaitTime,
        crowdLevel: aiWaitPrediction.reasoning,
      },
    });

    // Populate user details
    await appointment.populate('userId', 'name email phoneNumber');

    // Emit socket event for real-time update
    emitAppointmentBooked(category, appointment);
    emitQueueUpdated(category);

    res.status(201).json({
      success: true,
      message: 'Appointment booked successfully',
      appointment: {
        _id: appointment._id,
        tokenNumber: appointment.tokenNumber,
        category: appointment.category,
        entityName: appointment.entityName,
        serviceProvider: appointment.serviceProvider,
        serviceType: appointment.serviceType,
        slotTime: appointment.slotTime,
        appointmentDate: appointment.appointmentDate,
        status: appointment.status,
        priority: appointment.priority,
        estimatedWaitTime: appointment.estimatedWaitTime,
        bookingTime: appointment.bookingTime,
        aiPredictions: appointment.aiPredictions,
      },
    });
  } catch (error) {
    console.error('Create Appointment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error while booking appointment',
    });
  }
};

// @desc    Get user's appointments
// @route   GET /api/appointments/my
// @access  Private
export const getMyAppointments = async (req, res) => {
  try {
    const appointments = await Appointment.find({ userId: req.user._id })
      .sort({ createdAt: -1 })
      .limit(20);

    res.status(200).json({
      success: true,
      count: appointments.length,
      appointments,
    });
  } catch (error) {
    console.error('Get My Appointments Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get current queue status for a category
// @route   GET /api/queue/current/:category
// @access  Public
export const getCurrentQueue = async (req, res) => {
  try {
    const { category } = req.params;

    // Find currently serving token
    const servingAppointment = await Appointment.findOne({
      category,
      status: 'serving',
    }).sort({ tokenNumber: 1 });

    // Count waiting appointments
    const waitingCount = await Appointment.countDocuments({
      category,
      status: 'waiting',
    });

    // Get all waiting appointments with priority sorting
    const waitingAppointments = await Appointment.find({
      category,
      status: 'waiting',
    }).sort({ priority: -1, tokenNumber: 1 });

    // Determine next token based on priority
    let nextToken = null;
    if (waitingAppointments.length > 0) {
      // Sort by priority weight
      const sorted = waitingAppointments.sort((a, b) => {
        const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
        if (priorityDiff !== 0) return priorityDiff;
        return a.tokenNumber - b.tokenNumber;
      });
      nextToken = sorted[0].tokenNumber;
    }

    res.status(200).json({
      success: true,
      queue: {
        category,
        currentServing: servingAppointment ? servingAppointment.tokenNumber : null,
        waitingCount,
        nextToken,
        avgWaitTime: AVG_SERVICE_TIME[category],
      },
    });
  } catch (error) {
    console.error('Get Current Queue Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get specific appointment by ID
// @route   GET /api/appointments/:id
// @access  Private
export const getAppointmentById = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id).populate(
      'userId',
      'name email phoneNumber'
    );

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Check if user owns this appointment or is admin
    if (
      appointment.userId._id.toString() !== req.user._id.toString() &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this appointment',
      });
    }

    res.status(200).json({
      success: true,
      appointment,
    });
  } catch (error) {
    console.error('Get Appointment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Cancel appointment
// @route   PUT /api/appointments/:id/cancel
// @access  Private
export const cancelAppointment = async (req, res) => {
  try {
    const appointment = await Appointment.findById(req.params.id);

    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Check if user owns this appointment
    if (appointment.userId.toString() !== req.user._id.toString()) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this appointment',
      });
    }

    // Can only cancel waiting appointments
    if (appointment.status !== 'waiting') {
      return res.status(400).json({
        success: false,
        message: `Cannot cancel appointment with status: ${appointment.status}`,
      });
    }

    appointment.status = 'cancelled';
    await appointment.save();

    // Emit socket event for real-time update
    emitAppointmentCancelled(appointment.category, appointment.tokenNumber);
    emitQueueUpdated(appointment.category);

    res.status(200).json({
      success: true,
      message: 'Appointment cancelled successfully',
      appointment,
    });
  } catch (error) {
    console.error('Cancel Appointment Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get service types for a category
// @route   GET /api/appointments/services/:category
// @access  Public
export const getServiceTypes = async (req, res) => {
  try {
    const { category } = req.params;

    if (!SERVICE_TYPES[category]) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    res.status(200).json({
      success: true,
      category,
      services: SERVICE_TYPES[category],
    });
  } catch (error) {
    console.error('Get Service Types Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};


// @desc    Get all entities by category (Hospitals/Banks/Salons)
// @route   GET /api/appointments/entities/:category
// @access  Public
export const getEntitiesByCategory = async (req, res) => {
  try {
    const { category } = req.params;

    let entities = [];
    if (category === 'Hospital') {
      entities = await Hospital.find({ status: 'active' }).select('name location address phone departments doctors');
    } else if (category === 'Bank') {
      entities = await Bank.find({ status: 'active' }).select('name location address phone services counters');
    } else if (category === 'Salon') {
      entities = await Salon.find({ status: 'active' }).select('name location address phone services stylists');
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    res.status(200).json({
      success: true,
      category,
      count: entities.length,
      entities,
    });
  } catch (error) {
    console.error('Get Entities Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get available slots for a service provider
// @route   GET /api/appointments/slots
// @access  Public
export const getAvailableSlots = async (req, res) => {
  try {
    const { entityId, serviceProvider, date, category } = req.query;

    if (!entityId || !serviceProvider || !date || !category) {
      return res.status(400).json({
        success: false,
        message: 'Missing required parameters',
      });
    }

    // Get entity and provider details
    let entity, providerData, maxAppointments;
    if (category === 'Hospital') {
      entity = await Hospital.findById(entityId);
      providerData = entity?.doctors?.find(d => d.name === serviceProvider);
      maxAppointments = providerData?.maxAppointmentsPerDay || 10;
    } else if (category === 'Salon') {
      entity = await Salon.findById(entityId);
      providerData = entity?.stylists?.find(s => s.name === serviceProvider);
      maxAppointments = providerData?.maxAppointmentsPerDay || 8;
    } else if (category === 'Bank') {
      entity = await Bank.findById(entityId);
      maxAppointments = 20; // Banks can handle more
    } else {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }

    if (!entity) {
      return res.status(404).json({
        success: false,
        message: 'Entity not found',
      });
    }

    // Check total bookings for the day
    const selectedDate = new Date(date);
    const dayStart = new Date(selectedDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = new Date(selectedDate);
    dayEnd.setHours(23, 59, 59, 999);

    const totalBookings = await Appointment.countDocuments({
      entityId,
      serviceProvider,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['waiting', 'serving'] },
    });

    // If fully booked, return alternative dates
    if (totalBookings >= maxAppointments) {
      const alternativeDates = [];
      for (let i = 1; i <= 3; i++) {
        const nextDate = new Date(selectedDate);
        nextDate.setDate(selectedDate.getDate() + i);
        alternativeDates.push({
          date: nextDate.toISOString().split('T')[0],
          day: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
          displayDate: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        });
      }

      return res.status(200).json({
        success: false,
        message: 'Provider is fully booked for this date',
        fullyBooked: true,
        totalBookings,
        maxAppointments,
        alternativeDates,
      });
    }

    // Get booked slots for this provider on this date
    const bookedAppointments = await Appointment.find({
      entityId,
      serviceProvider,
      appointmentDate: { $gte: dayStart, $lte: dayEnd },
      status: { $in: ['waiting', 'serving'] },
    }).select('slotTime');

    const bookedSlots = bookedAppointments.map(apt => apt.slotTime);

    // Generate time slots based on operating hours
    const openingTime = entity.operatingHours?.opening || '09:00';
    const closingTime = entity.operatingHours?.closing || '18:00';
    const slotDuration = category === 'Hospital' ? 15 : category === 'Salon' ? 30 : 15;

    const timeSlots = generateTimeSlots(openingTime, closingTime, slotDuration, bookedSlots);

    // Get AI recommendations for best slots
    const smartSlots = await recommendSmartSlots({
      availableSlots: timeSlots,
      currentBookings: totalBookings,
      date: selectedDate,
      category,
    });

    res.status(200).json({
      success: true,
      entity: {
        name: entity.name,
        location: entity.location,
      },
      serviceProvider,
      date: selectedDate.toISOString().split('T')[0],
      totalBookings,
      maxAppointments,
      remainingSlots: maxAppointments - totalBookings,
      slots: timeSlots,
      smartRecommendations: smartSlots,
    });
  } catch (error) {
    console.error('Get Available Slots Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
