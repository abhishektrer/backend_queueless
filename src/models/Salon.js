import mongoose from 'mongoose';

const stylistSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
  },
  specialization: {
    type: String,
    required: true,
  },
  maxAppointmentsPerDay: {
    type: Number,
    default: 8,
  },
  availability: [{
    day: {
      type: String,
      enum: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'],
    },
    slots: [{
      time: String,
      available: {
        type: Boolean,
        default: true,
      },
    }],
  }],
});

const salonSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
    },
    location: {
      type: String,
      required: true,
    },
    address: {
      type: String,
      default: '',
    },
    phone: {
      type: String,
      default: '',
    },
    services: [{
      type: String,
      required: true,
    }],
    stylists: [stylistSchema],
    operatingHours: {
      opening: {
        type: String,
        default: '09:00',
      },
      closing: {
        type: String,
        default: '20:00',
      },
    },
    status: {
      type: String,
      enum: ['active', 'inactive'],
      default: 'active',
    },
  },
  {
    timestamps: true,
  }
);

const Salon = mongoose.model('Salon', salonSchema);

export default Salon;
