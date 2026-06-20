import Appointment from '../models/Appointment.js';
import Hospital from '../models/Hospital.js';
import Bank from '../models/Bank.js';
import Salon from '../models/Salon.js';
import User from '../models/User.js';
import { calculateQueueHealthScore, planCapacityWithAI } from '../services/aiService.js';

// @desc    Get Admin Dashboard Statistics
// @route   GET /api/admin/analytics/dashboard
// @access  Admin
export const getDashboardStats = async (req, res) => {
  try {
    // Total counts
    const totalAppointments = await Appointment.countDocuments();
    const totalUsers = await User.countDocuments({ role: 'user' });
    const totalHospitals = await Hospital.countDocuments({ status: 'active' });
    const totalBanks = await Bank.countDocuments({ status: 'active' });
    const totalSalons = await Salon.countDocuments({ status: 'active' });
    
    // Status breakdown
    const waiting = await Appointment.countDocuments({ status: 'waiting' });
    const serving = await Appointment.countDocuments({ status: 'serving' });
    const completed = await Appointment.countDocuments({ status: 'completed' });
    const cancelled = await Appointment.countDocuments({ status: 'cancelled' });
    const noShows = await Appointment.countDocuments({ status: 'no-show' });
    
    // Today's statistics
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    
    const todayAppointments = await Appointment.countDocuments({
      createdAt: { $gte: today, $lt: tomorrow },
    });
    
    const todayCompleted = await Appointment.countDocuments({
      status: 'completed',
      completedAt: { $gte: today, $lt: tomorrow },
    });
    
    // Category breakdown
    const hospitalAppointments = await Appointment.countDocuments({ category: 'Hospital' });
    const bankAppointments = await Appointment.countDocuments({ category: 'Bank' });
    const salonAppointments = await Appointment.countDocuments({ category: 'Salon' });
    
    // Average wait times
    const completedAppointments = await Appointment.find({
      status: 'completed',
      actualWaitTime: { $exists: true, $gt: 0 },
    }).select('actualWaitTime');
    
    const avgWaitTime = completedAppointments.length > 0
      ? Math.round(completedAppointments.reduce((sum, apt) => sum + apt.actualWaitTime, 0) / completedAppointments.length)
      : 0;
    
    // Queue Health Score (handle division by zero)
    const noShowRate = totalAppointments > 0 ? noShows / totalAppointments : 0;
    const completionRate = totalAppointments > 0 ? completed / totalAppointments : 0;
    const cancellationRate = totalAppointments > 0 ? cancelled / totalAppointments : 0;
    
    const queueHealth = calculateQueueHealthScore({
      avgWaitTime: avgWaitTime || 15,
      noShowRate,
      completionRate,
      currentWaiting: waiting,
      targetWaitTime: 15,
      cancellationRate,
    });
    
    // Weekly trend (last 7 days)
    const weeklyData = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      date.setHours(0, 0, 0, 0);
      const nextDate = new Date(date);
      nextDate.setDate(date.getDate() + 1);
      
      const count = await Appointment.countDocuments({
        createdAt: { $gte: date, $lt: nextDate },
      });
      
      weeklyData.push({
        date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        appointments: count,
      });
    }
    
    // Peak hours analysis
    const allAppointments = await Appointment.find({
      createdAt: { $gte: today, $lt: tomorrow },
    }).select('createdAt');
    
    const hourlyDistribution = new Array(24).fill(0);
    allAppointments.forEach(apt => {
      const hour = new Date(apt.createdAt).getHours();
      hourlyDistribution[hour]++;
    });
    
    const peakHour = hourlyDistribution.indexOf(Math.max(...hourlyDistribution));
    
    res.status(200).json({
      success: true,
      stats: {
        overview: {
          totalAppointments,
          totalUsers,
          totalHospitals,
          totalBanks,
          totalSalons,
          todayAppointments,
          todayCompleted,
        },
        statusBreakdown: {
          waiting,
          serving,
          completed,
          cancelled,
          noShows,
        },
        categoryBreakdown: {
          hospital: hospitalAppointments,
          bank: bankAppointments,
          salon: salonAppointments,
        },
        performance: {
          avgWaitTime,
          queueHealth: queueHealth.score,
          queueHealthBreakdown: queueHealth.breakdown,
          completionRate: Math.round(completionRate * 100),
          noShowRate: Math.round(noShowRate * 100),
          cancellationRate: Math.round(cancellationRate * 100),
        },
        trends: {
          weeklyData,
          peakHour: `${peakHour}:00`,
        },
      },
    });
  } catch (error) {
    console.error('Dashboard Stats Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
      error: error.message,
    });
  }
};

// @desc    Get Category-Specific Analytics
// @route   GET /api/admin/analytics/category/:category
// @access  Admin
export const getCategoryAnalytics = async (req, res) => {
  try {
    const { category } = req.params;
    
    if (!['Hospital', 'Bank', 'Salon'].includes(category)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid category',
      });
    }
    
    // Get total and current stats
    const total = await Appointment.countDocuments({ category });
    const waiting = await Appointment.countDocuments({ category, status: 'waiting' });
    const completed = await Appointment.countDocuments({ category, status: 'completed' });
    const cancelled = await Appointment.countDocuments({ category, status: 'cancelled' });
    
    // Get entity count
    let entityCount = 0;
    if (category === 'Hospital') entityCount = await Hospital.countDocuments({ status: 'active' });
    if (category === 'Bank') entityCount = await Bank.countDocuments({ status: 'active' });
    if (category === 'Salon') entityCount = await Salon.countDocuments({ status: 'active' });
    
    // Average wait time for this category
    const completedAppointments = await Appointment.find({
      category,
      status: 'completed',
      actualWaitTime: { $exists: true, $gt: 0 },
    }).select('actualWaitTime');
    
    const avgWaitTime = completedAppointments.length > 0
      ? Math.round(completedAppointments.reduce((sum, apt) => sum + apt.actualWaitTime, 0) / completedAppointments.length)
      : 0;
    
    // Monthly trend
    const monthlyData = [];
    for (let i = 5; i >= 0; i--) {
      const date = new Date();
      date.setMonth(date.getMonth() - i);
      date.setDate(1);
      date.setHours(0, 0, 0, 0);
      const nextMonth = new Date(date);
      nextMonth.setMonth(date.getMonth() + 1);
      
      const count = await Appointment.countDocuments({
        category,
        createdAt: { $gte: date, $lt: nextMonth },
      });
      
      monthlyData.push({
        month: date.toLocaleDateString('en-US', { month: 'short' }),
        appointments: count,
      });
    }
    
    res.status(200).json({
      success: true,
      analytics: {
        category,
        total,
        waiting,
        completed,
        cancelled,
        entityCount,
        avgWaitTime,
        completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        monthlyData,
      },
    });
  } catch (error) {
    console.error('Category Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get Capacity Planning Data
// @route   GET /api/admin/analytics/capacity/:category
// @access  Admin
export const getCapacityPlanning = async (req, res) => {
  try {
    const { category } = req.params;
    
    // Get tomorrow's appointments
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    const dayAfter = new Date(tomorrow);
    dayAfter.setDate(tomorrow.getDate() + 1);
    
    const tomorrowAppointments = await Appointment.countDocuments({
      category,
      appointmentDate: { $gte: tomorrow, $lt: dayAfter },
    });
    
    // Average service time by category
    const avgServiceTime = category === 'Hospital' ? 15 : category === 'Salon' ? 30 : 10;
    const operatingHours = 8;
    
    // Get current staff count
    let currentStaff = 5;
    if (category === 'Hospital') {
      const hospitals = await Hospital.find({ status: 'active' });
      currentStaff = hospitals.reduce((sum, h) => sum + (h.doctors?.length || 0), 0) || 5;
    } else if (category === 'Salon') {
      const salons = await Salon.find({ status: 'active' });
      currentStaff = salons.reduce((sum, s) => sum + (s.stylists?.length || 0), 0) || 5;
    }
    
    const capacityData = await planCapacityWithAI({
      totalAppointments: tomorrowAppointments,
      avgServiceTime,
      operatingHours,
      currentStaff,
    });
    
    res.status(200).json({
      success: true,
      capacity: capacityData,
    });
  } catch (error) {
    console.error('Capacity Planning Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get Real-Time Queue Status
// @route   GET /api/admin/analytics/queue-status
// @access  Admin
export const getQueueStatus = async (req, res) => {
  try {
    const categories = ['Hospital', 'Bank', 'Salon'];
    const queueStatus = [];
    
    for (const category of categories) {
      const waiting = await Appointment.countDocuments({ category, status: 'waiting' });
      const serving = await Appointment.countDocuments({ category, status: 'serving' });
      
      // Get latest waiting appointments
      const latestAppointments = await Appointment.find({ category, status: 'waiting' })
        .sort({ tokenNumber: 1 })
        .limit(5)
        .populate('userId', 'name email')
        .select('tokenNumber priority estimatedWaitTime serviceType entityName');
      
      queueStatus.push({
        category,
        waiting,
        serving,
        latestQueue: latestAppointments,
      });
    }
    
    res.status(200).json({
      success: true,
      queueStatus,
    });
  } catch (error) {
    console.error('Queue Status Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};

// @desc    Get User Activity Analytics
// @route   GET /api/admin/analytics/users
// @access  Admin
export const getUserAnalytics = async (req, res) => {
  try {
    const totalUsers = await User.countDocuments({ role: { $in: ['customer', 'user'] } });
    const totalAdmins = await User.countDocuments({ role: 'admin' });
    
    // Active users (users who have appointments)
    const activeUsers = await Appointment.distinct('userId');
    
    // New users this week
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const newUsersThisWeek = await User.countDocuments({
      role: { $in: ['customer', 'user'] },
      createdAt: { $gte: weekAgo },
    });
    
    // Top users by appointment count
    const topUsers = await Appointment.aggregate([
      { $match: { status: { $ne: 'cancelled' } } },
      { $group: { _id: '$userId', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 5 },
      {
        $lookup: {
          from: 'users',
          localField: '_id',
          foreignField: '_id',
          as: 'user',
        },
      },
      { $unwind: '$user' },
      {
        $project: {
          name: '$user.name',
          email: '$user.email',
          appointments: '$count',
        },
      },
    ]);
    
    res.status(200).json({
      success: true,
      userAnalytics: {
        totalUsers,
        totalAdmins,
        activeUsers: activeUsers.length,
        newUsersThisWeek,
        topUsers,
      },
    });
  } catch (error) {
    console.error('User Analytics Error:', error);
    res.status(500).json({
      success: false,
      message: 'Server error',
    });
  }
};
