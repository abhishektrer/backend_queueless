import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const dropOldIndex = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Get the users collection
    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // List all indexes
    console.log('\n📋 Current indexes:');
    const indexes = await usersCollection.indexes();
    indexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    // Drop the old uid index if it exists
    try {
      await usersCollection.dropIndex('uid_1');
      console.log('\n✅ Dropped old "uid_1" index successfully!');
    } catch (error) {
      if (error.code === 27) {
        console.log('\n⚠️  Index "uid_1" does not exist (already dropped)');
      } else {
        throw error;
      }
    }

    // List indexes after dropping
    console.log('\n📋 Indexes after cleanup:');
    const newIndexes = await usersCollection.indexes();
    newIndexes.forEach(index => {
      console.log(`  - ${index.name}:`, index.key);
    });

    console.log('\n✅ Database cleanup complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

dropOldIndex();
