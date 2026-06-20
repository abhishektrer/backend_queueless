import { Resend } from 'resend';

// Lazy initialization - only create Resend instance when needed
let resend = null;
const getResendInstance = () => {
  if (!resend) {
    if (!process.env.RESEND_API_KEY) {
      throw new Error('RESEND_API_KEY is not set in environment variables');
    }
    resend = new Resend(process.env.RESEND_API_KEY);
  }
  return resend;
};

/**
 * Send Queue Reminder Email
 * @param {Object} params - Email parameters
 * @param {string} params.to - Recipient email
 * @param {string} params.userName - User's name
 * @param {number} params.currentToken - Current token being served
 * @param {number} params.userToken - User's token number
 * @param {string} params.category - Category (Hospital/Bank/Salon)
 * @param {string} params.entityName - Hospital/Bank/Salon name
 */
export const sendQueueReminderEmail = async ({
  to,
  userName,
  currentToken,
  userToken,
  category,
  entityName,
}) => {
  try {
    const resendClient = getResendInstance();
    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9f9f9; padding: 30px; border-radius: 0 0 10px 10px; }
          .token-box { background: white; border-left: 4px solid #667eea; padding: 20px; margin: 20px 0; border-radius: 5px; }
          .token-number { font-size: 48px; font-weight: bold; color: #667eea; margin: 10px 0; }
          .info-row { display: flex; justify-content: space-between; padding: 10px 0; border-bottom: 1px solid #eee; }
          .cta-button { background: #667eea; color: white; padding: 15px 30px; text-decoration: none; border-radius: 5px; display: inline-block; margin-top: 20px; }
          .footer { text-align: center; color: #999; font-size: 12px; margin-top: 30px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🔔 Your Turn is Approaching!</h1>
          </div>
          <div class="content">
            <p>Hi <strong>${userName}</strong>,</p>
            <p>Great news! Your turn at <strong>${entityName}</strong> is approaching.</p>
            
            <div class="token-box">
              <div style="text-align: center;">
                <div style="color: #666; font-size: 14px;">Current Token</div>
                <div class="token-number">#${currentToken}</div>
              </div>
              <div style="text-align: center; margin-top: 20px;">
                <div style="color: #666; font-size: 14px;">Your Token</div>
                <div class="token-number" style="color: #764ba2;">#${userToken}</div>
              </div>
            </div>

            <div style="background: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0; border-radius: 5px;">
              <strong>⏰ Please arrive in 10 minutes</strong>
              <p style="margin: 5px 0 0 0;">Only 2 people ahead of you!</p>
            </div>

            <div style="background: white; padding: 20px; border-radius: 5px; margin-top: 20px;">
              <div class="info-row">
                <span><strong>Category:</strong></span>
                <span>${category}</span>
              </div>
              <div class="info-row">
                <span><strong>Location:</strong></span>
                <span>${entityName}</span>
              </div>
              <div class="info-row" style="border-bottom: none;">
                <span><strong>People Ahead:</strong></span>
                <span style="color: #28a745; font-weight: bold;">2 or less</span>
              </div>
            </div>

            <div style="text-align: center;">
              <a href="${process.env.FRONTEND_URL || 'http://localhost:5173'}/track-queue" class="cta-button">
                Track Queue Live
              </a>
            </div>

            <p style="margin-top: 30px; font-size: 14px; color: #666;">
              💡 <strong>Tip:</strong> Make sure you're ready to go when your token is called!
            </p>
          </div>
          
          <div class="footer">
            <p>This is an automated notification from QueueLess AI</p>
            <p>&copy; ${new Date().getFullYear()} QueueLess AI. All rights reserved.</p>
          </div>
        </div>
      </body>
      </html>
    `;

    const { data, error } = await resendClient.emails.send({
      from: 'QueueLess AI <onboarding@resend.dev>',
      to: [to],
      subject: '🔔 Your turn is approaching - QueueLess AI',
      html: htmlContent,
    });

    if (error) {
      console.error('❌ Resend Email Error:', error);
      throw new Error(error.message || 'Failed to send email');
    }

    console.log('✅ Email sent successfully:', data);
    return { success: true, data };
  } catch (error) {
    console.error('❌ Email Service Error:', error);
    throw error;
  }
};

/**
 * Send Test Email
 */
export const sendTestEmail = async (to) => {
  try {
    const resendClient = getResendInstance();
    const { data, error } = await resendClient.emails.send({
      from: 'QueueLess AI <onboarding@resend.dev>',
      to: [to],
      subject: 'Test Email from QueueLess AI',
      html: '<h1>Email Service Working!</h1><p>Your Resend integration is configured correctly.</p>',
    });

    if (error) throw new Error(error.message);
    return { success: true, data };
  } catch (error) {
    console.error('Test Email Error:', error);
    throw error;
  }
};
