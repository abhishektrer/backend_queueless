import { Server } from 'socket.io';

let io;

// Initialize Socket.IO server
export const initializeSocket = (server) => {
  io = new Server(server, {
    cors: {
      origin: process.env.FRONTEND_URL || 'http://localhost:5173',
      methods: ['GET', 'POST'],
      credentials: true,
    },
  });

  io.on('connection', (socket) => {
    console.log(`✅ User connected: ${socket.id}`);

    // Join user's personal room for notifications
    socket.on('joinUser', (userId) => {
      socket.join(`user_${userId}`);
      console.log(`👤 User ${userId} joined personal room`);
    });

    // Join a specific category room
    socket.on('joinCategory', (category) => {
      socket.join(category);
      console.log(`👥 User ${socket.id} joined ${category} room`);
    });

    // Leave a category room
    socket.on('leaveCategory', (category) => {
      socket.leave(category);
      console.log(`👋 User ${socket.id} left ${category} room`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`❌ User disconnected: ${socket.id}`);
    });
  });

  console.log('🔌 Socket.IO initialized successfully');
  return io;
};

// Get Socket.IO instance
export const getIO = () => {
  if (!io) {
    throw new Error('Socket.IO not initialized');
  }
  return io;
};

// Emit queue updated event to a specific category
export const emitQueueUpdated = (category) => {
  if (io) {
    io.to(category).emit('queueUpdated', { category });
    console.log(`📡 Emitted queueUpdated to ${category}`);
  }
};

// Emit token called event
export const emitTokenCalled = (category, tokenNumber) => {
  if (io) {
    io.to(category).emit('tokenCalled', { category, tokenNumber });
    console.log(`📢 Emitted tokenCalled: Token ${tokenNumber} in ${category}`);
  }
};

// Emit appointment completed event
export const emitAppointmentCompleted = (category, tokenNumber) => {
  if (io) {
    io.to(category).emit('appointmentCompleted', { category, tokenNumber });
    console.log(`✅ Emitted appointmentCompleted: Token ${tokenNumber} in ${category}`);
  }
};

// Emit new appointment booked event
export const emitAppointmentBooked = (category, appointment) => {
  if (io) {
    io.to(category).emit('appointmentBooked', { 
      category, 
      tokenNumber: appointment.tokenNumber,
      serviceType: appointment.serviceType,
      priority: appointment.priority,
    });
    console.log(`🎫 Emitted appointmentBooked: Token ${appointment.tokenNumber} in ${category}`);
  }
};

// Emit appointment cancelled event
export const emitAppointmentCancelled = (category, tokenNumber) => {
  if (io) {
    io.to(category).emit('appointmentCancelled', { category, tokenNumber });
    console.log(`❌ Emitted appointmentCancelled: Token ${tokenNumber} in ${category}`);
  }
};

// Emit queue reminder notification to specific user
export const emitQueueReminder = (userId, notificationData) => {
  if (io) {
    io.to(`user_${userId}`).emit('queueReminder', notificationData);
    console.log(`🔔 Emitted queueReminder to user ${userId}:`, {
      userToken: notificationData.userToken,
      currentToken: notificationData.currentToken,
    });
  }
};

