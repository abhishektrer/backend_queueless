import Groq from 'groq-sdk';
import Appointment from '../models/Appointment.js';
import Hospital from '../models/Hospital.js';
import Bank from '../models/Bank.js';
import Salon from '../models/Salon.js';
import User from '../models/User.js';

// Initialize Groq AI
const groqClient = process.env.GROQ_API_KEY ? new Groq({ apiKey: process.env.GROQ_API_KEY }) : null;

// @desc    AI Chat Assistant
// @route   POST /api/ai/chat
// @access  Private
export const aiChatAssistant = async (req, res) => {
  try {
    const { question, category, userId } = req.body;

    console.log('📥 AI Chat Request:', { question, category, userId });

    if (!question) {
      return res.status(400).json({
        success: false,
        message: 'Question is required',
      });
    }

    // Get context data
    const context = await getContextData(category, userId);
    console.log('📊 Context Data:', context);

    // Generate AI response
    let aiResponse;
    if (groqClient) {
      console.log('🤖 Using Groq AI...');
      aiResponse = await generateAIResponse(question, context);
    } else {
      console.log('⚠️ Using fallback response (no Groq client)');
      aiResponse = generateFallbackResponse(question, context);
    }

    console.log('✅ AI Response:', aiResponse);

    res.status(200).json({
      success: true,
      response: aiResponse,
      context: {
        currentWaiting: context.waiting,
        avgWaitTime: context.avgWaitTime,
      },
    });
  } catch (error) {
    console.error('❌ AI Chat Error:', error);
    console.error('Error details:', error.message);
    console.error('Stack trace:', error.stack);
    res.status(500).json({
      success: false,
      message: 'Error processing chat request',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined,
    });
  }
};

// Get context data for AI
async function getContextData(category, firebaseUid) {
  const waiting = category ? await Appointment.countDocuments({ category, status: 'waiting' }) : 0;
  const serving = category ? await Appointment.countDocuments({ category, status: 'serving' }) : 0;
  
  // Get average wait time
  const completedToday = await Appointment.find({
    category,
    status: 'completed',
    actualWaitTime: { $exists: true, $gt: 0 },
  }).select('actualWaitTime').limit(10);
  
  const avgWaitTime = completedToday.length > 0
    ? Math.round(completedToday.reduce((sum, apt) => sum + apt.actualWaitTime, 0) / completedToday.length)
    : 15;

  // Get user's appointments - FIXED: Convert Firebase UID to MongoDB ObjectId
  let userAppointments = [];
  if (firebaseUid) {
    try {
      // First, find the user by Firebase UID to get their MongoDB _id
      const user = await User.findOne({ uid: firebaseUid });
      
      if (user) {
        // Now query appointments using the MongoDB _id
        userAppointments = await Appointment.find({ 
          userId: user._id 
        }).sort({ createdAt: -1 }).limit(1);
      }
    } catch (error) {
      console.log('⚠️ Could not fetch user appointments:', error.message);
      // Continue without user appointments - not critical for chat
    }
  }

  // Get current hour
  const currentHour = new Date().getHours();
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });

  return {
    waiting,
    serving,
    avgWaitTime,
    userAppointments,
    currentHour,
    dayOfWeek,
    category,
  };
}

// Generate AI response using Groq
async function generateAIResponse(question, context) {
  const prompt = `You are QueueLess AI, a helpful and friendly queue management assistant. You help users with appointment scheduling, wait times, and queue information.

CURRENT CONTEXT:
- Category: ${context.category || 'General'}
- People Currently Waiting: ${context.waiting}
- People Being Served: ${context.serving}
- Average Wait Time: ${context.avgWaitTime} minutes
- Current Time: ${context.currentHour}:00
- Day: ${context.dayOfWeek}

USER QUESTION: "${question}"

Instructions:
1. Provide a helpful, friendly, and conversational response
2. Use the context data when relevant
3. Be specific with numbers and recommendations
4. Keep your response concise (2-4 sentences)
5. Use a warm, professional tone like a helpful receptionist

Your response:`;

  try {
    console.log('🚀 Calling Groq API...');
    
    const chatCompletion = await groqClient.chat.completions.create({
      messages: [
        {
          role: 'system',
          content: 'You are QueueLess AI, a helpful queue management assistant. Be friendly, concise, and use data from context when available.'
        },
        {
          role: 'user',
          content: prompt
        }
      ],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.7,
      max_tokens: 250,
      top_p: 1,
      stream: false,
    });

    const responseText = chatCompletion.choices[0]?.message?.content;
    
    if (!responseText) {
      console.log('⚠️ No response from Groq, using fallback');
      return generateFallbackResponse(question, context);
    }

    console.log('✅ Groq response received:', responseText.substring(0, 100) + '...');
    return responseText.trim();

  } catch (error) {
    console.error('❌ Groq AI Error:', error.message);
    if (error.error) {
      console.error('Error details:', JSON.stringify(error.error, null, 2));
    }
    console.log('🔄 Falling back to algorithmic response');
    return generateFallbackResponse(question, context);
  }
}

// Fallback response without AI
function generateFallbackResponse(question, context) {
  const lowerQuestion = question.toLowerCase();

  if (lowerQuestion.includes('when') && (lowerQuestion.includes('come') || lowerQuestion.includes('visit'))) {
    const rushHour = context.currentHour >= 9 && context.currentHour <= 11;
    if (rushHour) {
      return `Based on current patterns, I recommend visiting after 2:00 PM today. Current wait time is approximately ${context.avgWaitTime} minutes with ${context.waiting} people waiting. Afternoon slots typically have 40% less wait time.`;
    } else {
      return `Good timing! Current wait time is approximately ${context.avgWaitTime} minutes with ${context.waiting} people waiting. This is a great time to visit.`;
    }
  }

  if (lowerQuestion.includes('how many') && lowerQuestion.includes('waiting')) {
    return `There are currently ${context.waiting} people waiting in the queue. ${context.serving} are being served right now. Estimated wait time is ${context.avgWaitTime} minutes.`;
  }

  if (lowerQuestion.includes('reschedule')) {
    const bestTime = context.currentHour < 14 ? '2:30 PM today' : '10:30 AM tomorrow';
    return `Yes, you can reschedule! I recommend ${bestTime} for minimal wait time. Would you like me to help you book that slot?`;
  }

  if (lowerQuestion.includes('wait time') || lowerQuestion.includes('how long')) {
    return `Current estimated wait time is ${context.avgWaitTime} minutes. There are ${context.waiting} people ahead in the queue. This estimate factors in priority levels and current service speed.`;
  }

  if (lowerQuestion.includes('best time')) {
    const bestTimes = context.dayOfWeek === 'Monday' ? '2-4 PM' : '11 AM - 1 PM or 3-5 PM';
    return `Based on historical data, the best times to visit on ${context.dayOfWeek} are ${bestTimes}. These slots typically have 30-50% lower wait times.`;
  }

  // Default response
  return `I can help you with:
  • Current wait times (${context.avgWaitTime} min average)
  • Queue status (${context.waiting} waiting)
  • Best visit times
  • Rescheduling appointments
  
  What would you like to know?`;
}

// @desc    No-show Prediction
// @route   POST /api/ai/predict-noshow
// @access  Admin
export const predictNoShow = async (req, res) => {
  try {
    const { appointmentId } = req.body;

    const appointment = await Appointment.findById(appointmentId).populate('userId');
    if (!appointment) {
      return res.status(404).json({
        success: false,
        message: 'Appointment not found',
      });
    }

    // Calculate no-show probability
    const prediction = await calculateNoShowProbability(appointment);

    // Update appointment if high probability
    if (prediction.probability > 80) {
      appointment.likelyNoShow = true;
      await appointment.save();
    }

    res.status(200).json({
      success: true,
      prediction,
    });
  } catch (error) {
    console.error('No-show Prediction Error:', error);
    res.status(500).json({
      success: false,
      message: 'Error predicting no-show',
    });
  }
};

// Calculate no-show probability
async function calculateNoShowProbability(appointment) {
  let probability = 0;
  const factors = [];

  // Factor 1: User history (40%)
  const userAppointments = await Appointment.find({ userId: appointment.userId });
  const userNoShows = userAppointments.filter(apt => apt.status === 'no-show').length;
  const noShowRate = userAppointments.length > 0 ? (userNoShows / userAppointments.length) * 100 : 0;
  
  if (noShowRate > 50) {
    probability += 40;
    factors.push('User has high no-show history');
  } else if (noShowRate > 20) {
    probability += 20;
    factors.push('User has some no-show history');
  }

  // Factor 2: Booking time (20%)
  const bookingTime = new Date(appointment.bookingTime);
  const appointmentTime = new Date(appointment.appointmentDate);
  const hoursDifference = (appointmentTime - bookingTime) / (1000 * 60 * 60);
  
  if (hoursDifference < 2) {
    probability += 20;
    factors.push('Last-minute booking');
  } else if (hoursDifference < 24) {
    probability += 10;
    factors.push('Short notice booking');
  }

  // Factor 3: Time of day (20%)
  const hour = appointmentTime.getHours();
  if (hour < 8 || hour > 18) {
    probability += 20;
    factors.push('Off-peak hours appointment');
  }

  // Factor 4: Priority (20%)
  if (appointment.priority === 'emergency') {
    probability -= 20; // Less likely to no-show
    factors.push('Emergency priority (less likely)');
  } else if (appointment.priority === 'normal') {
    probability += 10;
    factors.push('Normal priority');
  }

  // Normalize probability
  probability = Math.max(0, Math.min(100, probability));

  return {
    probability: Math.round(probability),
    likelyNoShow: probability > 80,
    factors,
    recommendation: probability > 80 
      ? 'High risk - Consider confirmation call'
      : probability > 50
      ? 'Medium risk - Send reminder'
      : 'Low risk - Normal procedure',
  };
}

export default {
  aiChatAssistant,
  predictNoShow,
};
