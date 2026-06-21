import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email'],
    },
    password: {
      type: String,
      minlength: [6, 'Password must be at least 6 characters'],
      select: false, // Don't return password by default
    },
    phoneNumber: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer',
    },
    provider: {
      type: String,
      enum: ['local', 'google', 'facebook'],
      default: 'local',
    },
    firebaseUid: {
      type: String,
      sparse: true, // Only for OAuth users
    },
    photoURL: {
      type: String,
      default: '',
    },
    isEmailVerified: {
      type: Boolean,
      default: false,
    },
    notificationSettings: {
      email: {
        type: Boolean,
        default: true,
      },
      push: {
        type: Boolean,
        default: true,
      },
      website: {
        type: Boolean,
        default: true,
      },
    },
    oneSignalPlayerId: {
      type: String,
      default: '',
    },
  },
  {
    timestamps: true,
  }
);

// Hash password before saving (only for local auth)
userSchema.pre('save', async function (next) {
  // Only hash password if it's modified and user is local provider
  if (!this.isModified('password')) {
    return next();
  }

  // Skip hashing if no password (OAuth users)
  if (!this.password) {
    return next();
  }

  // Skip hashing if provider is not local
  if (this.provider !== 'local') {
    return next();
  }

  try {
    const salt = await bcrypt.genSalt(10);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    console.error('❌ Password hashing error:', error);
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function (candidatePassword) {
  try {
    // If no password stored (OAuth user), return false
    if (!this.password) {
      console.log('❌ No password stored for user');
      return false;
    }
    
    const isMatch = await bcrypt.compare(candidatePassword, this.password);
    console.log('🔍 Password comparison result:', isMatch);
    return isMatch;
  } catch (error) {
    console.error('❌ Password comparison error:', error);
    return false;
  }
};

// Method to get user data without sensitive info
userSchema.methods.toJSON = function () {
  const user = this.toObject();
  delete user.password;
  delete user.firebaseUid;
  delete user.__v;
  return user;
};

const User = mongoose.model('User', userSchema);

export default User;
