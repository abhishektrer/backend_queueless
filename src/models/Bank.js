import mongoose from 'mongoose';

const counterSchema = new mongoose.Schema({
  counterNumber: {
    type: Number,
    required: true,
  },
  serviceType: {
    type: String,
    required: true,
  },
  operatorName: {
    type: String,
    default: '',
  },
  status: {
    type: String,
    enum: ['available', 'busy', 'offline'],
    default: 'available',
  },
});

const bankSchema = new mongoose.Schema(
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
    counters: [counterSchema],
    maxAppointmentsPerDay: {
      type: Number,
      default: 50,
    },
    operatingHours: {
      opening: {
        type: String,
        default: '10:00',
      },
      closing: {
        type: String,
        default: '16:00',
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

const Bank = mongoose.model('Bank', bankSchema);

export default Bank;
