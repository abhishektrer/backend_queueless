import { sendQueueReminderEmail } from './email.service.js';
import { sendQueueReminderPush } from './pushNotification.service.js';
import { emitQueueReminder } from '../socket/socketServer.js';
import NotificationLog from '../models/NotificationLog.js';
import User from '../models/User.js';
import Appointment from '../models/Appointment.js';

/**
 * Send Queue Reminder Notification via All Channels
 * @param {Object} params - Notification parameters
 * @param {string} params.userId - MongoDB User ID
 * @param {string} params.appointmentId - Appointment ID
 * @param {number} params.currentToken - Current token being served
 * @param {number} params.userToken - User's token number
 * @param {number} params.patientsAhead - Number of patients ahead
 * @param {string} params.category - Category (Hospital/Bank/Salon)
 * @param {string} params.entityName - Hospital/Bank/Salon name
 */
export const sendQueueReminder = async ({
  userId,
  appointmentId,
  currentToken,
  userToken,
  patientsAhead,
  category,
  entityName,
}) => {
  try {
    // Fetch user details
    const user = await User.findById(userId);
    if (!user) {
      throw new Error('User not found');
    }

    const notificationData = {
      title: '🔔 Your turn is approaching',
      message: `Your turn is approaching at ${entityName}. Please arrive in 10 minutes.\n\nCurrent Token: #${currentToken}\nYour Token: #${userToken}`,
      currentToken,
      userToken,
      patientsAhead,
      category,
      entityName,
    };

    const results = {
      website: { sent: false, error: null },
      email: { sent: false, error: null },
      push: { sent: false, error: null },
    };

    // 1. WEBSITE NOTIFICATION (Socket.IO) - Always try first
    if (user.notificationSettings?.website !== false) {
      try {
        emitQueueReminder(userId.toString(), {
          title: notificationData.title,
          message: notificationData.message,
          currentToken,
          userToken,
          category,
          entityName,
          appointmentId,
        });
        
        results.website.sent = true;
        
        // Log website notification
        await NotificationLog.create({
          userId,
          appointmentId,
          type: 'website',
          title: notificationData.title,
          message: notificationData.message,
          status: 'sent',
          metadata: { currentToken, userToken, patientsAhead, category },
        });
        
        console.log('✅ Website notification sent to user:', user.email);
      } catch (error) {
        console.error('❌ Website notification error:', error.message);
        results.website.error = error.message;
      }
    }

    // 2. EMAIL NOTIFICATION - Independent of website
    if (user.notificationSettings?.email !== false && user.email) {
      try {
        await sendQueueReminderEmail({
          to: user.email,
          userName: user.name,
          currentToken,
          userToken,
          category,
          entityName,
        });
        
        results.email.sent = true;
        
        // Log email notification
        await NotificationLog.create({
          userId,
          appointmentId,
          type: 'email',
          title: notificationData.title,
          message: notificationData.message,
          status: 'sent',
          metadata: { currentToken, userToken, patientsAhead, category },
        });
        
        console.log('✅ Email notification sent to:', user.email);
      } catch (error) {
        console.error('❌ Email notification error:', error.message);
        results.email.error = error.message;
        
        // Log failed email
        await NotificationLog.create({
          userId,
          appointmentId,
          type: 'email',
          title: notificationData.title,
          message: notificationData.message,
          status: 'failed',
          errorMessage: error.message,
          metadata: { currentToken, userToken, patientsAhead, category },
        });
      }
    }

    // 3. PUSH NOTIFICATION - Independent of website and email
    if (user.notificationSettings?.push !== false && user.oneSignalPlayerId) {
      try {
        await sendQueueReminderPush({
          playerId: user.oneSignalPlayerId,
          currentToken,
          userToken,
          category,
          entityName,
        });
        
        results.push.sent = true;
        
        // Log push notification
        await NotificationLog.create({
          userId,
          appointmentId,
          type: 'push',
          title: notificationData.title,
          message: notificationData.message,
          status: 'sent',
          metadata: { currentToken, userToken, patientsAhead, category },
        });
        
        console.log('✅ Push notification sent to user:', user.email);
      } catch (error) {
        console.error('❌ Push notification error:', error.message);
        results.push.error = error.message;
        
        // Log failed push
        await NotificationLog.create({
          userId,
          appointmentId,
          type: 'push',
          title: notificationData.title,
          message: notificationData.message,
          status: 'failed',
          errorMessage: error.message,
          metadata: { currentToken, userToken, patientsAhead, category },
        });
      }
    }

    // Summary
    const successCount = Object.values(results).filter(r => r.sent).length;
    console.log(`📊 Notification Summary for ${user.email}:`, {
      website: results.website.sent ? '✅' : '❌',
      email: results.email.sent ? '✅' : '❌',
      push: results.push.sent ? '✅' : '❌',
      total: `${successCount}/3 channels`,
    });

    return {
      success: successCount > 0,
      results,
      message: `${successCount} notification(s) sent successfully`,
    };
  } catch (error) {
    console.error('❌ Notification Service Error:', error);
    throw error;
  }
};

/**
 * Check and Trigger Notifications for Waiting Appointments
 * Called when queue is updated (e.g., when admin calls next token)
 * @param {string} category - Category to check (Hospital/Bank/Salon)
 */
export const checkAndNotifyWaitingUsers = async (category) => {
  try {
    // Get current serving token
    const servingAppointment = await Appointment.findOne({
      category,
      status: 'serving',
    }).sort({ tokenNumber: 1 });

    if (!servingAppointment) {
      console.log('No appointments currently being served');
      return;
    }

    const currentToken = servingAppointment.tokenNumber;

    // Find waiting appointments
    const waitingAppointments = await Appointment.find({
      category,
      status: 'waiting',
    }).sort({ tokenNumber: 1 });

    console.log(`🔍 Checking notifications for ${waitingAppointments.length} waiting appointments`);

    // Check each waiting appointment
    for (const appointment of waitingAppointments) {
      const patientsAhead = appointment.tokenNumber - currentToken - 1;

      // Trigger notification when 2 or fewer people ahead
      if (patientsAhead <= 2 && patientsAhead >= 0) {
        // Check if notification already sent recently (prevent duplicates)
        const recentNotification = await NotificationLog.findOne({
          appointmentId: appointment._id,
          sentAt: { $gte: new Date(Date.now() - 10 * 60 * 1000) }, // Last 10 minutes
        });

        if (recentNotification) {
          console.log(`⏭️ Skipping duplicate notification for token #${appointment.tokenNumber}`);
          continue;
        }

        console.log(`📢 Sending notification: Token #${appointment.tokenNumber} (${patientsAhead} ahead)`);

        // Send notification via all channels
        await sendQueueReminder({
          userId: appointment.userId,
          appointmentId: appointment._id,
          currentToken,
          userToken: appointment.tokenNumber,
          patientsAhead,
          category: appointment.category,
          entityName: appointment.entityName,
        });
      }
    }
  } catch (error) {
    console.error('❌ Check and Notify Error:', error);
  }
};
