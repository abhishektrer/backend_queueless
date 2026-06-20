import mongoose from 'mongoose';

const notificationLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  appointmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Appointment',
  },
  type: {
    type: String,
    enum: ['email', 'push', 'website'],
    required: true,
  },
  title: {
    type: String,
    required: true,
  },
  message: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['sent', 'failed'],
    default: 'sent',
  },
  errorMessage: {
    type: String,
  },
  metadata: {
    currentToken: Number,
    userToken: Number,
    patientsAhead: Number,
    category: String,
  },
  sentAt: {
    type: Date,
    default: Date.now,
  },
}, {
  timestamps: true,
});

// Index for querying user's notification history
notificationLogSchema.index({ userId: 1, sentAt: -1 });
notificationLogSchema.index({ appointmentId: 1 });

const NotificationLog = mongoose.model('NotificationLog', notificationLogSchema);

export default NotificationLog;
