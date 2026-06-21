import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

dotenv.config();

const createDemoAccounts = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Demo accounts
    const demoAccounts = [
      {
        name: 'Demo Admin',
        email: 'admin@demo.com',
        password: 'admin123',
        phoneNumber: '+91 9999999999',
        role: 'admin',
        provider: 'local',
        isEmailVerified: true,
      },
      {
        name: 'Demo User',
        email: 'user@demo.com',
        password: 'user123',
        phoneNumber: '+91 8888888888',
        role: 'customer',
        provider: 'local',
        isEmailVerified: true,
      },
    ];

    for (const account of demoAccounts) {
      // Check if account already exists
      const existing = await usersCollection.findOne({ email: account.email });
      
      if (existing) {
        console.log(`\n⏭️  ${account.email} already exists - updating password...`);
        
        // Hash new password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(account.password, salt);
        
        // Update existing account
        await usersCollection.updateOne(
          { email: account.email },
          {
            $set: {
              password: hashedPassword,
              role: account.role,
              provider: 'local',
              isEmailVerified: true,
            },
          }
        );
        console.log(`✅ Updated ${account.email}`);
      } else {
        console.log(`\n✨ Creating ${account.email}...`);
        
        // Hash password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(account.password, salt);
        
        // Create new account
        await usersCollection.insertOne({
          ...account,
          password: hashedPassword,
          photoURL: '',
          notificationSettings: {
            email: true,
            push: true,
            website: true,
          },
          oneSignalPlayerId: '',
          createdAt: new Date(),
          updatedAt: new Date(),
        });
        console.log(`✅ Created ${account.email}`);
      }
    }

    console.log('\n========================================');
    console.log('   DEMO ACCOUNTS READY!');
    console.log('========================================');
    console.log('\n🎯 USER ACCOUNT:');
    console.log('   Email: user@demo.com');
    console.log('   Password: user123');
    console.log('   Role: customer');
    console.log('\n🎯 ADMIN ACCOUNT:');
    console.log('   Email: admin@demo.com');
    console.log('   Password: admin123');
    console.log('   Role: admin');
    console.log('\n========================================\n');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

createDemoAccounts();
