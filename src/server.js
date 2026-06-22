import express from 'express';
import { createServer } from 'http';
import dotenv from 'dotenv';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import connectDB from './config/database.js';
import { initializeFirebase } from './config/firebase.js';
import { initializeSocket } from './socket/socketServer.js';
import { initializeGeminiAI } from './services/aiService.js';
import authRoutes from './routes/auth.routes.js';
import userRoutes from './routes/userRoutes.js';
import appointmentRoutes from './routes/appointmentRoutes.js';
import adminRoutes from './routes/adminRoutes.js';

// Load environment variables
dotenv.config();

console.log('🔧 Starting QueueLess AI Backend...');
console.log('📍 Node Environment:', process.env.NODE_ENV || 'development');
console.log('🔑 Checking required environment variables...');

// Check critical environment variables
const requiredVars = ['MONGODB_URI', 'JWT_SECRET', 'FRONTEND_URL'];
const missingVars = requiredVars.filter(varName => !process.env[varName]);

if (missingVars.length > 0) {
  console.error('❌ Missing required environment variables:', missingVars.join(', '));
  console.error('⚠️ Server may not function correctly!');
} else {
  console.log('✅ All critical environment variables present');
}

// Initialize Firebase Admin (still needed for admin operations)
console.log('🔥 Initializing Firebase Admin SDK...');
try {
  initializeFirebase();
} catch (error) {
  console.error('❌ Firebase initialization failed:', error.message);
  console.warn('⚠️ Server will continue but Google Auth will not work');
}

// Initialize Groq AI
console.log('🤖 Initializing Groq AI...');
try {
  initializeGeminiAI();
} catch (error) {
  console.error('❌ Groq AI initialization failed:', error.message);
  console.warn('⚠️ Server will continue with fallback AI calculations');
}

// Connect to MongoDB
console.log('🗄️ Connecting to MongoDB...');
connectDB().catch(err => {
  console.error('❌ Fatal: MongoDB connection failed:', err.message);
  process.exit(1);
});

const app = express();
const server = createServer(app);

// Middleware
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true, // Allow cookies
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); // Parse cookies

// Routes
app.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'QueueLess AI Backend is running! 🚀',
    version: '2.0.0 - JWT Authentication',
  });
});

// Mount routes
console.log('🛣️ Mounting API routes...');
app.use('/api/auth', authRoutes); // NEW: Authentication routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);
console.log('✅ Routes mounted successfully:');
console.log('   - /api/auth (register, login, google, logout, me, profile)');
console.log('   - /api/users');
console.log('   - /api/appointments');
console.log('   - /api/admin');

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

const PORT = process.env.PORT || 5000;

// Initialize Socket.IO
initializeSocket(server);

server.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🌍 Environment: ${process.env.NODE_ENV}`);
});
