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

// Initialize Firebase Admin (still needed for admin operations)
initializeFirebase();

// Initialize Gemini AI
initializeGeminiAI();

// Connect to MongoDB
connectDB();

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
app.use('/api/auth', authRoutes); // NEW: Authentication routes
app.use('/api/users', userRoutes);
app.use('/api/appointments', appointmentRoutes);
app.use('/api/admin', adminRoutes);

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
