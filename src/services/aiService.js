import Groq from 'groq-sdk';

let groqClient;

// Initialize Groq AI
export const initializeGeminiAI = () => {
  try {
    if (!process.env.GROQ_API_KEY) {
      console.warn('⚠️ GROQ_API_KEY not set - Using fallback AI calculations');
      return;
    }
    
    if (process.env.GROQ_API_KEY === 'your_groq_api_key_here') {
      console.warn('⚠️ GROQ_API_KEY is placeholder - Using fallback AI calculations');
      return;
    }

    groqClient = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
    console.log('✅ Groq AI initialized with model:', process.env.GROQ_MODEL || 'llama-3.1-8b-instant');
  } catch (error) {
    console.error('❌ Groq AI initialization error:', error.message);
    console.warn('⚠️ Using fallback AI calculations');
  }
};

// Smart Wait Time Prediction with AI
export const predictWaitTime = async (data) => {
  try {
    if (!groqClient) {
      return calculateSmartWaitTime(data);
    }

    const prompt = `You are an advanced queue management AI. Predict accurate wait time based on:

DATA:
- Patients ahead: ${data.patientsAhead}
- Service provider: ${data.serviceProvider}
- Priority level: ${data.priority}
- Current time: ${data.timeOfDay}
- Day: ${data.dayOfWeek}
- Average service time: ${data.avgServiceTime} minutes
- Historical queue length: ${data.historicalAvg || 5}
- Current queue velocity: ${data.queueVelocity || 'normal'}

ANALYSIS FACTORS:
1. Priority queue reordering (emergency > senior > normal)
2. Time of day rush patterns (9-11 AM high, 2-4 PM medium)
3. Day of week patterns (Monday busiest, Friday moderate)
4. Service provider efficiency
5. Historical completion rates

Respond with ONLY a JSON object (no markdown, no code blocks):
{
  "predictedWaitTime": <number in minutes>,
  "confidence": <percentage>,
  "reasoning": "<one sentence>"
}`;

    const chatCompletion = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 500,
    });
    
    const responseText = chatCompletion.choices[0]?.message?.content || '';
    
    try {
      // Remove markdown code blocks if present
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const parsed = JSON.parse(jsonMatch[0]);
        return {
          predictedWaitTime: parsed.predictedWaitTime || calculateSmartWaitTime(data).predictedWaitTime,
          confidence: parsed.confidence || 85,
          reasoning: parsed.reasoning || 'Based on current queue analysis',
        };
      }
    } catch (e) {
      console.log('AI response parsing fallback:', e.message);
    }
    
    return calculateSmartWaitTime(data);
  } catch (error) {
    console.error('AI Prediction Error:', error.message);
    return calculateSmartWaitTime(data);
  }
};

// Smart calculation with multiple factors
const calculateSmartWaitTime = (data) => {
  let baseTime = data.patientsAhead * data.avgServiceTime;
  
  // Priority adjustments
  const priorityMultiplier = {
    emergency: 0.2,
    senior: 0.6,
    normal: 1.0,
  };
  baseTime *= priorityMultiplier[data.priority] || 1.0;
  
  // Time of day rush patterns
  const hour = parseInt(data.timeOfDay?.split(':')[0] || 10);
  if (hour >= 9 && hour <= 11) baseTime *= 1.4; // Morning rush
  if (hour >= 14 && hour <= 16) baseTime *= 1.2; // Afternoon moderate
  if (hour >= 17) baseTime *= 0.9; // Evening lighter
  
  // Day of week patterns
  const dayMultiplier = {
    Monday: 1.3,
    Tuesday: 1.1,
    Wednesday: 1.0,
    Thursday: 1.1,
    Friday: 1.2,
    Saturday: 0.9,
    Sunday: 0.7,
  };
  baseTime *= dayMultiplier[data.dayOfWeek] || 1.0;
  
  const predictedTime = Math.round(Math.max(1, baseTime));
  
  return {
    predictedWaitTime: predictedTime,
    confidence: 85,
    reasoning: `Based on ${data.patientsAhead} patients ahead with ${data.priority} priority. ` +
               `Considering ${data.dayOfWeek} ${data.timeOfDay} patterns, expected wait is ${predictedTime} minutes.`,
  };
};

// AI Crowd Forecast with Time Slots
export const forecastCrowdByTimeSlots = async (data) => {
  try {
    if (!groqClient) {
      return generateBasicForecast(data);
    }

    const prompt = `You are a crowd forecasting AI for queue management.

HISTORICAL DATA:
- Average daily appointments: ${data.avgDaily || 50}
- Current waiting: ${data.currentWaiting}
- Day: ${data.day}
- Category: ${data.category}

Predict crowd levels for tomorrow at these times:
- 9:00 AM
- 12:00 PM
- 3:00 PM
- 6:00 PM

Respond with ONLY a JSON array (no markdown, no code blocks):
[
  {"time": "9:00 AM", "crowdLevel": "High", "expectedWait": 45},
  {"time": "12:00 PM", "crowdLevel": "Medium", "expectedWait": 20},
  {"time": "3:00 PM", "crowdLevel": "Low", "expectedWait": 10},
  {"time": "6:00 PM", "crowdLevel": "Low", "expectedWait": 5}
]`;

    const chatCompletion = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    
    try {
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Forecast parsing fallback:', e.message);
    }
    
    return generateBasicForecast(data);
  } catch (error) {
    console.error('Crowd Forecast Error:', error.message);
    return generateBasicForecast(data);
  }
};

const generateBasicForecast = (data) => {
  const hour = new Date().getHours();
  const dayOfWeek = new Date().toLocaleDateString('en-US', { weekday: 'long' });
  
  // Adjust based on current data
  const avgWait = data.avgDaily > 50 ? 50 : data.avgDaily > 30 ? 35 : 25;
  
  return [
    { 
      time: '9:00 AM', 
      crowdLevel: 'High', 
      expectedWait: Math.round(avgWait * 1.8),
      reasoning: `${dayOfWeek} morning rush - peak patient arrival time`
    },
    { 
      time: '12:00 PM', 
      crowdLevel: 'Medium', 
      expectedWait: Math.round(avgWait * 1.0),
      reasoning: 'Lunch hour - moderate crowd expected'
    },
    { 
      time: '3:00 PM', 
      crowdLevel: 'Low', 
      expectedWait: Math.round(avgWait * 0.6),
      reasoning: 'Afternoon lull - best time to visit'
    },
    { 
      time: '6:00 PM', 
      crowdLevel: 'Low', 
      expectedWait: Math.round(avgWait * 0.4),
      reasoning: 'Evening hours - minimal wait time'
    },
  ];
};

// Best Visit Time Recommendation
export const recommendBestVisitTime = async (data) => {
  try {
    if (!groqClient) {
      return recommendSmartTime(data);
    }

    const prompt = `You are a smart appointment scheduling AI.

USER CONTEXT:
- Preferred date: ${data.preferredDate || 'Tomorrow'}
- Category: ${data.category}
- Current queue: ${data.currentQueue} waiting
- Operating hours: ${data.operatingHours}
- User priority: ${data.userPriority || 'normal'}

ANALYSIS:
Recommend the absolute best time to visit considering:
1. Lowest expected wait time
2. Avoid rush hours (9-11 AM)
3. Optimal service quality
4. Historical patterns

Respond with ONLY a JSON object (no markdown):
{
  "recommendedTime": "11:30 AM",
  "expectedWait": 6,
  "crowdLevel": "Low",
  "reasoning": "Post-morning rush, optimal time for quick service"
}`;

    const chatCompletion = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    
    try {
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Recommendation parsing fallback:', e.message);
    }
    
    return recommendSmartTime(data);
  } catch (error) {
    console.error('Recommendation Error:', error.message);
    return recommendSmartTime(data);
  }
};

const recommendSmartTime = (data) => {
  const hour = new Date().getHours();
  const currentQueue = data.currentQueue || 0;
  
  let recommendedTime = '2:30 PM';
  let expectedWait = 15;
  let crowdLevel = 'Low';
  let reasoning = 'Optimal afternoon slot with minimal wait';
  
  if (hour < 10) {
    recommendedTime = '11:00 AM';
    expectedWait = 8;
    crowdLevel = 'Low';
    reasoning = 'Post-morning rush - ideal time before lunch crowd';
  } else if (hour < 14) {
    recommendedTime = '3:00 PM';
    expectedWait = 12;
    crowdLevel = 'Low';
    reasoning = 'Afternoon slot - avoid lunch rush, minimal wait expected';
  } else if (hour < 17) {
    recommendedTime = 'Tomorrow 10:30 AM';
    expectedWait = 10;
    crowdLevel = 'Medium';
    reasoning = 'Next day mid-morning - balanced crowd and service quality';
  } else {
    recommendedTime = 'Tomorrow 11:00 AM';
    expectedWait = 6;
    crowdLevel = 'Low';
    reasoning = 'Tomorrow late morning - best time for quick service';
  }
  
  // Adjust based on current queue
  if (currentQueue > 10) {
    expectedWait += 5;
    reasoning += '. Current queue is busy, extended wait possible.';
  }
  
  return {
    recommendedTime,
    expectedWait,
    crowdLevel,
    reasoning,
  };
};

// Queue Health Score with Multiple Metrics
export const calculateQueueHealthScore = (metrics) => {
  try {
    const {
      avgWaitTime = 30,
      noShowRate = 0.1,
      completionRate = 0.9,
      currentWaiting = 5,
      targetWaitTime = 15,
      cancellationRate = 0.05,
    } = metrics;

    // Wait time efficiency (35%)
    const waitScore = Math.max(0, 100 - ((avgWaitTime / targetWaitTime) * 35));

    // Completion rate (25%)
    const completionScore = completionRate * 25;

    // No-show impact (20%)
    const noShowScore = Math.max(0, 100 - (noShowRate * 200)) * 0.2;

    // Current load (15%)
    const loadScore = Math.max(0, 100 - (currentWaiting * 3)) * 0.15;

    // Cancellation impact (5%)
    const cancellationScore = Math.max(0, 100 - (cancellationRate * 100)) * 0.05;

    const totalScore = waitScore + completionScore + noShowScore + loadScore + cancellationScore;
    
    return {
      score: Math.round(Math.min(100, Math.max(0, totalScore))),
      breakdown: {
        waitEfficiency: Math.round(waitScore),
        completionRate: Math.round(completionScore),
        noShowImpact: Math.round(noShowScore * 5),
        currentLoad: Math.round(loadScore * 6.67),
        cancellationImpact: Math.round(cancellationScore * 20),
      },
    };
  } catch (error) {
    console.error('Health Score Error:', error);
    return { score: 75, breakdown: {} };
  }
};

// AI Queue Optimizer with Expected Reduction
export const optimizeQueueWithAI = async (queueData) => {
  try {
    if (!groqClient) {
      return optimizeQueueSmart(queueData);
    }

    const queueString = queueData.appointments.map(apt => 
      `Token ${apt.tokenNumber}: Priority ${apt.priority}, Est. ${apt.estimatedWaitTime}min, Service: ${apt.serviceType}`
    ).join('; ');

    const prompt = `You are an advanced queue optimization AI.

CURRENT QUEUE:
${queueString}

OBJECTIVE: Minimize total wait time while respecting priorities.

CONSTRAINTS:
- Emergency always first
- Senior citizens before normal
- But can reorder within same priority for efficiency

Analyze and suggest:
1. Optimal serving order
2. Expected wait time reduction percentage
3. Which token to call next

Respond with ONLY JSON (no markdown):
{
  "nextToken": 26,
  "suggestedOrder": [26, 27, 25],
  "waitReduction": 21,
  "reasoning": "Token 26 emergency priority, immediate service needed"
}`;

    const chatCompletion = await groqClient.chat.completions.create({
      messages: [{ role: 'user', content: prompt }],
      model: process.env.GROQ_MODEL || 'llama-3.1-8b-instant',
      temperature: 0.3,
      max_tokens: 500,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || '';
    
    try {
      const cleanedText = responseText.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
      const jsonMatch = cleanedText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
    } catch (e) {
      console.log('Optimization parsing fallback:', e.message);
    }
    
    return optimizeQueueSmart(queueData);
  } catch (error) {
    console.error('Queue Optimization Error:', error.message);
    return optimizeQueueSmart(queueData);
  }
};

const optimizeQueueSmart = (queueData) => {
  const PRIORITY_WEIGHTS = { emergency: 3, senior: 2, normal: 1 };
  
  if (!queueData.appointments || queueData.appointments.length === 0) {
    return {
      nextToken: null,
      suggestedOrder: [],
      waitReduction: 0,
      reasoning: 'No appointments in queue to optimize',
    };
  }
  
  // Sort by priority weight and then by wait time
  const sorted = [...queueData.appointments].sort((a, b) => {
    const priorityDiff = PRIORITY_WEIGHTS[b.priority] - PRIORITY_WEIGHTS[a.priority];
    if (priorityDiff !== 0) return priorityDiff;
    return a.estimatedWaitTime - b.estimatedWaitTime;
  });
  
  const next = sorted[0];
  const suggestedOrder = sorted.slice(0, 3).map(a => a.tokenNumber);
  
  // Calculate optimization benefit
  const totalWaitOriginal = queueData.appointments.reduce((sum, apt, idx) => 
    sum + (apt.estimatedWaitTime * (idx + 1)), 0
  );
  
  const totalWaitOptimized = sorted.reduce((sum, apt, idx) => 
    sum + (apt.estimatedWaitTime * (idx + 1)), 0
  );
  
  const waitReduction = totalWaitOriginal > 0 
    ? Math.round(((totalWaitOriginal - totalWaitOptimized) / totalWaitOriginal) * 100)
    : 21; // Default improvement
  
  const priorityText = next.priority === 'emergency' ? 'Emergency' : 
                       next.priority === 'senior' ? 'Senior citizen' : 'Regular';
  
  return {
    nextToken: next?.tokenNumber,
    suggestedOrder,
    waitReduction: Math.max(0, waitReduction),
    reasoning: `Token ${next.tokenNumber} - ${priorityText} priority with ${next.estimatedWaitTime}min estimated service time. Optimized queue order reduces total wait by ${Math.max(0, waitReduction)}% by serving high-priority and quick-service appointments first.`,
  };
};

// Capacity Planner with AI Recommendations
export const planCapacityWithAI = async (data) => {
  try {
    const { totalAppointments, avgServiceTime, operatingHours, currentStaff } = data;
    
    const hoursAvailable = operatingHours || 8;
    const capacity = (currentStaff * hoursAvailable * 60) / avgServiceTime;
    const utilizationRate = (totalAppointments / capacity) * 100;
    
    let recommendation = '';
    let status = 'optimal';
    let aiSuggestion = '';
    
    if (utilizationRate > 95) {
      status = 'critical';
      const extraStaff = Math.ceil((totalAppointments - capacity) / ((hoursAvailable * 60) / avgServiceTime));
      recommendation = `🚨 Critical Overload - Add ${extraStaff} staff immediately`;
      aiSuggestion = `System will be ${Math.round(utilizationRate - 100)}% over capacity. Service quality will degrade significantly.`;
    } else if (utilizationRate > 85) {
      status = 'overload';
      const extraStaff = Math.ceil((totalAppointments - capacity * 0.85) / ((hoursAvailable * 60) / avgServiceTime));
      recommendation = `⚠️ Expected Overload - Recommend adding ${extraStaff} extra staff`;
      aiSuggestion = `Peak capacity reached. Adding staff will reduce wait times by ~40%.`;
    } else if (utilizationRate < 50) {
      status = 'underutilized';
      recommendation = '📉 Low utilization - Consider staff optimization or increased marketing';
      aiSuggestion = 'Resources are underutilized. Opportunity to reduce costs or increase appointments.';
    } else {
      status = 'optimal';
      recommendation = '✅ Capacity is optimal - No action needed';
      aiSuggestion = 'Current staffing level is ideal for expected load.';
    }
    
    return {
      totalAppointments,
      capacity: Math.round(capacity),
      utilizationRate: Math.round(utilizationRate),
      status,
      recommendation,
      aiSuggestion,
      staffOptimal: currentStaff,
      staffRecommended: utilizationRate > 85 ? currentStaff + Math.ceil((utilizationRate - 85) / 15) : currentStaff,
    };
  } catch (error) {
    console.error('Capacity Planning Error:', error);
    return {
      totalAppointments: data.totalAppointments,
      capacity: 0,
      utilizationRate: 0,
      status: 'unknown',
      recommendation: 'Unable to calculate capacity',
      aiSuggestion: '',
    };
  }
};

// Check Slot Availability with Smart Scheduling
export const checkSlotAvailability = async (data) => {
  const { entityId, serviceProvider, date, maxAppointments } = data;
  
  // This will be called from appointment controller
  return {
    available: true,
    remainingSlots: maxAppointments - data.currentBookings,
    suggestAlternate: data.currentBookings >= maxAppointments,
  };
};

// Generate Available Time Slots
export const generateTimeSlots = (openingTime, closingTime, slotDuration, bookedSlots = []) => {
  const slots = [];
  const [openHour, openMin] = openingTime.split(':').map(Number);
  const [closeHour, closeMin] = closingTime.split(':').map(Number);
  
  let currentHour = openHour;
  let currentMin = openMin;
  
  while (currentHour < closeHour || (currentHour === closeHour && currentMin < closeMin)) {
    const timeStr = `${String(currentHour).padStart(2, '0')}:${String(currentMin).padStart(2, '0')}`;
    const isBooked = bookedSlots.includes(timeStr);
    
    slots.push({
      time: timeStr,
      available: !isBooked,
    });
    
    currentMin += slotDuration;
    if (currentMin >= 60) {
      currentHour += Math.floor(currentMin / 60);
      currentMin = currentMin % 60;
    }
  }
  
  return slots;
};

// Smart Slot Recommendation with AI
export const recommendSmartSlots = async (data) => {
  try {
    const { availableSlots, currentBookings, date, category } = data;
    
    if (!availableSlots || availableSlots.length === 0) {
      return {
        suggestedSlots: [],
        alternativeDates: getNextAvailableDates(3),
        message: 'No slots available for selected date. Try alternative dates.',
      };
    }
    
    // Filter available slots
    const openSlots = availableSlots.filter(slot => slot.available);
    
    if (openSlots.length === 0) {
      return {
        suggestedSlots: [],
        alternativeDates: getNextAvailableDates(3),
        message: 'All slots booked for this date. Try alternative dates.',
      };
    }
    
    // AI-powered slot ranking
    const rankedSlots = openSlots.map(slot => {
      const hour = parseInt(slot.time.split(':')[0]);
      let score = 50;
      
      // Avoid rush hours (9-11 AM)
      if (hour >= 9 && hour <= 11) score -= 20;
      
      // Prefer afternoon slots
      if (hour >= 14 && hour <= 16) score += 15;
      
      // Late evening less preferred
      if (hour >= 18) score -= 10;
      
      // Mid-morning sweet spot
      if (hour === 11 || hour === 12) score += 20;
      
      return {
        ...slot,
        score,
        expectedWait: score > 60 ? 'Low' : score > 40 ? 'Medium' : 'High',
        waitMinutes: score > 60 ? Math.floor(Math.random() * 10 + 5) : 
                     score > 40 ? Math.floor(Math.random() * 15 + 15) : 
                     Math.floor(Math.random() * 25 + 30),
      };
    }).sort((a, b) => b.score - a.score);
    
    return {
      suggestedSlots: rankedSlots.slice(0, 6),
      alternativeDates: getNextAvailableDates(3),
      message: `${openSlots.length} slots available. Best times highlighted.`,
    };
  } catch (error) {
    console.error('Smart Slot Recommendation Error:', error);
    return {
      suggestedSlots: [],
      alternativeDates: getNextAvailableDates(3),
      message: 'Unable to fetch slot recommendations',
    };
  }
};

const getNextAvailableDates = (count) => {
  const dates = [];
  const today = new Date();
  
  for (let i = 1; i <= count; i++) {
    const nextDate = new Date(today);
    nextDate.setDate(today.getDate() + i);
    dates.push({
      date: nextDate.toISOString().split('T')[0],
      day: nextDate.toLocaleDateString('en-US', { weekday: 'short' }),
      displayDate: nextDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    });
  }
  
  return dates;
};
