import mongoose from 'mongoose';

const appointmentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    category: {
      type: String,
      enum: ['Hospital', 'Bank', 'Salon'],
      required: true,
    },
    entityId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'category',
    },
    entityName: {
      type: String,
      default: '',
    },
    serviceType: {
      type: String,
      required: true,
    },
    serviceProvider: {
      type: String,
      default: '',
    },
    slotTime: {
      type: String,
      default: '',
    },
    appointmentDate: {
      type: Date,
      default: Date.now,
    },
    tokenNumber: {
      type: Number,
      required: true,
    },
    bookingTime: {
      type: Date,
      default: Date.now,
    },
    status: {
      type: String,
      enum: ['waiting', 'serving', 'completed', 'cancelled', 'no-show'],
      default: 'waiting',
    },
    priority: {
      type: String,
      enum: ['normal', 'senior', 'emergency'],
      default: 'normal',
    },
    estimatedWaitTime: {
      type: Number,
      default: 0,
    },
    actualWaitTime: {
      type: Number,
      default: 0,
    },
    // For tracking who called the token (admin)
    calledBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    calledAt: {
      type: Date,
    },
    completedAt: {
      type: Date,
    },
    aiPredictions: {
      predictedWaitTime: Number,
      crowdLevel: String,
      recommendedTime: String,
    },
    likelyNoShow: {
      type: Boolean,
      default: false,
    },
    noShowProbability: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

// Index for faster queries
appointmentSchema.index({ userId: 1, status: 1 });
appointmentSchema.index({ category: 1, status: 1 });
appointmentSchema.index({ tokenNumber: 1 });

const Appointment = mongoose.model('Appointment', appointmentSchema);

export default Appointment;
