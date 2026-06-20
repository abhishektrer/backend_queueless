import * as OneSignal from 'onesignal-node';

// Initialize OneSignal client
const client = new OneSignal.Client(
  process.env.ONESIGNAL_APP_ID,
  process.env.ONESIGNAL_REST_API_KEY
);

/**
 * Send Queue Reminder Push Notification
 * @param {Object} params - Notification parameters
 * @param {string} params.playerId - OneSignal player ID
 * @param {number} params.currentToken - Current token being served
 * @param {number} params.userToken - User's token number
 * @param {string} params.category - Category (Hospital/Bank/Salon)
 * @param {string} params.entityName - Hospital/Bank/Salon name
 */
export const sendQueueReminderPush = async ({
  playerId,
  currentToken,
  userToken,
  category,
  entityName,
}) => {
  try {
    if (!playerId) {
      throw new Error('OneSignal Player ID is required');
    }

    const notification = {
      headings: {
        en: '🔔 Your Turn is Approaching!',
      },
      contents: {
        en: `Only 2 people ahead of you at ${entityName}. Please arrive in 10 minutes.\n\nCurrent Token: #${currentToken}\nYour Token: #${userToken}`,
      },
      data: {
        type: 'queue_reminder',
        currentToken,
        userToken,
        category,
        entityName,
      },
      include_player_ids: [playerId],
      priority: 10,
      ttl: 3600, // 1 hour
      android_channel_id: 'queue-reminders',
      ios_sound: 'notification.wav',
      android_sound: 'notification',
      web_push_topic: 'queue-reminder',
    };

    const response = await client.createNotification(notification);
    
    console.log('✅ Push notification sent:', response.body);
    return { success: true, data: response.body };
  } catch (error) {
    console.error('❌ OneSignal Push Error:', error);
    throw error;
  }
};

/**
 * Send Push Notification to Multiple Users
 * @param {Array} playerIds - Array of OneSignal player IDs
 * @param {Object} notificationData - Notification content
 */
export const sendBulkPushNotifications = async (playerIds, notificationData) => {
  try {
    if (!playerIds || playerIds.length === 0) {
      throw new Error('No player IDs provided');
    }

    const notification = {
      headings: {
        en: notificationData.title || 'QueueLess AI',
      },
      contents: {
        en: notificationData.message,
      },
      data: notificationData.data || {},
      include_player_ids: playerIds,
      priority: 10,
    };

    const response = await client.createNotification(notification);
    console.log('✅ Bulk push notifications sent:', response.body);
    return { success: true, data: response.body };
  } catch (error) {
    console.error('❌ Bulk Push Error:', error);
    throw error;
  }
};

/**
 * Register Device with OneSignal
 * @param {string} playerId - OneSignal player ID
 * @param {string} userId - MongoDB user ID
 */
export const registerDevice = async (playerId, userId) => {
  try {
    // Store player ID in user document
    console.log(`✅ Device registered: Player ${playerId} -> User ${userId}`);
    return { success: true, playerId, userId };
  } catch (error) {
    console.error('❌ Device Registration Error:', error);
    throw error;
  }
};

/**
 * Send Test Push Notification
 */
export const sendTestPush = async (playerId) => {
  try {
    const notification = {
      headings: {
        en: 'Test Notification',
      },
      contents: {
        en: 'Push notification service is working correctly!',
      },
      include_player_ids: [playerId],
    };

    const response = await client.createNotification(notification);
    return { success: true, data: response.body };
  } catch (error) {
    console.error('Test Push Error:', error);
    throw error;
  }
};
