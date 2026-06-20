import mongoose from 'mongoose';

const doctorSchema = new mongoose.Schema({
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
    default: 10,
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

const hospitalSchema = new mongoose.Schema(
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
    departments: [{
      type: String,
      required: true,
    }],
    doctors: [doctorSchema],
    operatingHours: {
      opening: {
        type: String,
        default: '09:00',
      },
      closing: {
        type: String,
        default: '18:00',
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

const Hospital = mongoose.model('Hospital', hospitalSchema);

export default Hospital;
