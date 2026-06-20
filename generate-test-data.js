import mongoose from 'mongoose';
import dotenv from 'dotenv';
import User from './src/models/User.js';
import Hospital from './src/models/Hospital.js';
import Bank from './src/models/Bank.js';
import Salon from './src/models/Salon.js';
import Appointment from './src/models/Appointment.js';

dotenv.config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('✅ MongoDB Connected'))
  .catch(err => {
    console.error('❌ MongoDB Connection Error:', err);
    process.exit(1);
  });

async function generateTestData() {
  console.log('\n🚀 Generating Test Data for AI Features...\n');

  try {
    // Create test user
    console.log('1️⃣ Creating test user...');
    let testUser = await User.findOne({ email: 'testuser@example.com' });
    if (!testUser) {
      testUser = await User.create({
        uid: 'test-user-' + Date.now(),
        name: 'Test User',
        email: 'testuser@example.com',
        phoneNumber: '+1234567890',
        role: 'customer',
      });
      console.log('   ✅ Test user created');
    } else {
      console.log('   ℹ️ Test user already exists');
    }

    // Create test hospital
    console.log('\n2️⃣ Creating test hospital...');
    let testHospital = await Hospital.findOne({ name: 'Apollo Hospital' });
    if (!testHospital) {
      testHospital = await Hospital.create({
        name: 'Apollo Hospital',
        location: 'Chennai',
        address: '123 Medical Street, Chennai',
        departments: ['Cardiology', 'Neurology', 'Pediatrics', 'Dentistry'],
        doctors: [
          { name: 'Dr. Kumar', specialization: 'Cardiology', maxAppointmentsPerDay: 20 },
          { name: 'Dr. Sharma', specialization: 'Neurology', maxAppointmentsPerDay: 15 },
          { name: 'Dr. Patel', specialization: 'Pediatrics', maxAppointmentsPerDay: 25 },
        ],
      });
      console.log('   ✅ Test hospital created');
    } else {
      console.log('   ℹ️ Test hospital already exists');
    }

    // Create test bank
    console.log('\n3️⃣ Creating test bank...');
    let testBank = await Bank.findOne({ name: 'State Bank' });
    if (!testBank) {
      testBank = await Bank.create({
        name: 'State Bank',
        location: 'Mumbai',
        address: '456 Finance Avenue, Mumbai',
        services: ['Account Opening', 'Loan Services', 'Fixed Deposits', 'Credit Cards'],
        counters: [
          { counterNumber: 1, serviceType: 'General Banking', operatorName: 'Operator A', maxAppointmentsPerDay: 30 },
          { counterNumber: 2, serviceType: 'Loan Services', operatorName: 'Operator B', maxAppointmentsPerDay: 30 },
          { counterNumber: 3, serviceType: 'Account Opening', operatorName: 'Operator C', maxAppointmentsPerDay: 25 },
        ],
      });
      console.log('   ✅ Test bank created');
    } else {
      console.log('   ℹ️ Test bank already exists');
    }

    // Create test salon
    console.log('\n4️⃣ Creating test salon...');
    let testSalon = await Salon.findOne({ name: 'Luxury Salon' });
    if (!testSalon) {
      testSalon = await Salon.create({
        name: 'Luxury Salon',
        location: 'Bangalore',
        address: '789 Style Street, Bangalore',
        services: ['Haircut', 'Hair Color', 'Facial', 'Manicure', 'Pedicure'],
        stylists: [
          { name: 'Stylist A', specialization: 'Haircut', maxAppointmentsPerDay: 15 },
          { name: 'Stylist B', specialization: 'Hair Color', maxAppointmentsPerDay: 10 },
        ],
      });
      console.log('   ✅ Test salon created');
    } else {
      console.log('   ℹ️ Test salon already exists');
    }

    // Generate appointments for testing AI features
    console.log('\n5️⃣ Generating test appointments...');
    
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // Get current token number
    const lastAppointment = await Appointment.findOne().sort({ tokenNumber: -1 });
    let tokenNumber = lastAppointment ? lastAppointment.tokenNumber + 1 : 100;

    const testAppointments = [];

    // Generate 30 appointments across categories
    const categories = [
      { name: 'Hospital', entity: testHospital, provider: 'Dr. Kumar', service: 'Cardiology' },
      { name: 'Bank', entity: testBank, provider: 'Counter 1', service: 'Account Opening' },
      { name: 'Salon', entity: testSalon, provider: 'Stylist A', service: 'Haircut' },
    ];

    const statuses = ['waiting', 'serving', 'completed', 'cancelled', 'no-show'];
    const priorities = ['normal', 'senior', 'emergency'];

    for (let i = 0; i < 30; i++) {
      const category = categories[i % categories.length];
      const status = i < 5 ? 'waiting' : i < 8 ? 'serving' : statuses[Math.floor(Math.random() * statuses.length)];
      const priority = priorities[Math.floor(Math.random() * priorities.length)];
      
      const appointment = {
        userId: testUser._id,
        category: category.name,
        entityId: category.entity._id,
        entityName: category.entity.name,
        serviceType: category.service,
        serviceProvider: category.provider,
        slotTime: `${9 + Math.floor(i / 3)}:00`,
        appointmentDate: i < 10 ? today : tomorrow,
        tokenNumber: tokenNumber++,
        bookingTime: new Date(now.getTime() - Math.random() * 24 * 60 * 60 * 1000),
        status,
        priority,
        estimatedWaitTime: Math.floor(Math.random() * 60) + 10,
        actualWaitTime: status === 'completed' ? Math.floor(Math.random() * 45) + 5 : 0,
      };

      testAppointments.push(appointment);
    }

    await Appointment.insertMany(testAppointments);
    console.log(`   ✅ Created ${testAppointments.length} test appointments`);

    // Summary
    console.log('\n📊 TEST DATA SUMMARY:');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`✅ Users: 1`);
    console.log(`✅ Hospitals: 1 (${testHospital.doctors.length} doctors)`);
    console.log(`✅ Banks: 1 (${testBank.counters.length} counters)`);
    console.log(`✅ Salons: 1 (${testSalon.stylists.length} stylists)`);
    console.log(`✅ Appointments: ${testAppointments.length}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    
    const appointmentsByStatus = {
      waiting: testAppointments.filter(a => a.status === 'waiting').length,
      serving: testAppointments.filter(a => a.status === 'serving').length,
      completed: testAppointments.filter(a => a.status === 'completed').length,
      cancelled: testAppointments.filter(a => a.status === 'cancelled').length,
      noShow: testAppointments.filter(a => a.status === 'no-show').length,
    };

    console.log('\n📈 Appointment Breakdown:');
    console.log(`   Waiting: ${appointmentsByStatus.waiting}`);
    console.log(`   Serving: ${appointmentsByStatus.serving}`);
    console.log(`   Completed: ${appointmentsByStatus.completed}`);
    console.log(`   Cancelled: ${appointmentsByStatus.cancelled}`);
    console.log(`   No-Show: ${appointmentsByStatus.noShow}`);

    console.log('\n🎯 NOW YOU CAN TEST AI FEATURES:');
    console.log('   1. Feature 1: Smart Wait Time Prediction ✅');
    console.log('   2. Feature 2: AI Crowd Forecast ✅');
    console.log('   3. Feature 3: Best Visit Time Recommendation ✅');
    console.log('   4. Feature 4: Queue Health Score ✅');
    console.log('   5. Feature 5: AI Queue Optimizer ✅');
    console.log('   6. Feature 6: AI Capacity Planner ✅');
    
    console.log('\n✨ Go to Admin → AI Insights to see them in action!');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

  } catch (error) {
    console.error('❌ Error generating test data:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from MongoDB\n');
    process.exit(0);
  }
}

generateTestData();
