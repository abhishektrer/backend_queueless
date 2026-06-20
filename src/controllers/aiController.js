import Appointment from '../models/Appointment.js';
import {
  predictWaitTime,
  forecastCrowdByTimeSlots,
  recommendBestVisitTime,
  optimizeQueueWithAI,
} from '../services/aiService.js';

export const getPredictedWaitTime = async (req, res) => {
  try {
    const { category, serviceProvider, priority } = req.body;
    
    const patientsAhead = await Appointment.countDocuments({
      category,
      status: 'waiting',
    });
    
    const now = new Date();
    const data = {
      patientsAhead,
      serviceProvider,
      priority: priority || 'normal',
      timeOfDay: `${now.getHours()}:${now.getMinutes()}`,
      dayOfWeek: now.toLocaleDateString('en-US', { weekday: 'long' }),
      avgServiceTime: category === 'Hospital' ? 15 : category === 'Salon' ? 30 : 10,
    };
    
    const predictedTime = await predictWaitTime(data);
    
    res.status(200).json({
      success: true,
      predictedWaitTime: predictedTime,
      patientsAhead,
    });
  } catch (error) {
    console.error('Predict Wait Time Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getCrowdForecast = async (req, res) => {
  try {
    const { category } = req.params;
    
    const currentWaiting = await Appointment.countDocuments({
      category,
      status: 'waiting',
    });
    
    const avgDaily = await Appointment.countDocuments({ category });
    
    const now = new Date();
    const data = {
      currentWaiting,
      day: now.toLocaleDateString('en-US', { weekday: 'long' }),
      category,
      avgDaily,
    };
    
    const forecast = await forecastCrowdByTimeSlots(data);
    
    res.status(200).json({
      success: true,
      forecast,
      currentWaiting,
    });
  } catch (error) {
    console.error('Crowd Forecast Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getBestTimeRecommendation = async (req, res) => {
  try {
    const { category } = req.body;
    
    const currentQueue = await Appointment.countDocuments({
      category,
      status: 'waiting',
    });
    
    const data = {
      currentQueue,
      category,
      operatingHours: '9:00 AM - 6:00 PM',
      userPriority: 'normal',
    };
    
    const recommendation = await recommendBestVisitTime(data);
    
    res.status(200).json({
      success: true,
      recommendation,
    });
  } catch (error) {
    console.error('Best Time Recommendation Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};

export const getQueueOptimization = async (req, res) => {
  try {
    const { category } = req.params;
    
    const appointments = await Appointment.find({
      category,
      status: 'waiting',
    })
      .sort({ tokenNumber: 1 })
      .limit(10);
    
    const queueData = { appointments };
    const optimization = await optimizeQueueWithAI(queueData);
    
    res.status(200).json({
      success: true,
      optimization,
      currentQueue: appointments.length,
    });
  } catch (error) {
    console.error('Queue Optimization Error:', error);
    res.status(500).json({ success: false, message: 'Server error' });
  }
};
