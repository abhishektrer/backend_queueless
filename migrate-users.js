import mongoose from 'mongoose';
import dotenv from 'dotenv';

dotenv.config();

const migrateUsers = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    const db = mongoose.connection.db;
    const usersCollection = db.collection('users');

    // Get all users
    const users = await usersCollection.find({}).toArray();
    console.log(`\n📊 Found ${users.length} users in database`);

    let migrated = 0;
    let skipped = 0;

    for (const user of users) {
      console.log(`\n👤 User: ${user.email}`);
      console.log(`   - Has uid: ${!!user.uid}`);
      console.log(`   - Has firebaseUid: ${!!user.firebaseUid}`);
      console.log(`   - Has password: ${!!user.password}`);
      console.log(`   - Provider: ${user.provider || 'not set'}`);

      const updates = {};
      let needsUpdate = false;

      // If user has uid but no firebaseUid, migrate it
      if (user.uid && !user.firebaseUid) {
        updates.firebaseUid = user.uid;
        updates.$unset = { uid: '' };
        needsUpdate = true;
        console.log(`   ✅ Will migrate uid → firebaseUid`);
      }

      // If user has no provider set, set it based on whether they have firebaseUid
      if (!user.provider) {
        if (user.uid || user.firebaseUid) {
          updates.provider = 'google';
          console.log(`   ✅ Will set provider → google`);
        } else {
          updates.provider = 'local';
          console.log(`   ✅ Will set provider → local`);
        }
        needsUpdate = true;
      }

      // Remove old uid field if it exists
      if (user.uid) {
        if (!updates.$unset) {
          updates.$unset = {};
        }
        updates.$unset.uid = '';
        needsUpdate = true;
        console.log(`   ✅ Will remove uid field`);
      }

      if (needsUpdate) {
        const { $unset, ...setUpdates } = updates;
        const updateQuery = {};
        
        if (Object.keys(setUpdates).length > 0) {
          updateQuery.$set = setUpdates;
        }
        
        if ($unset) {
          updateQuery.$unset = $unset;
        }

        await usersCollection.updateOne(
          { _id: user._id },
          updateQuery
        );
        migrated++;
        console.log(`   ✅ UPDATED`);
      } else {
        skipped++;
        console.log(`   ⏭️  No changes needed`);
      }
    }

    console.log(`\n📊 Migration Summary:`);
    console.log(`   - Total users: ${users.length}`);
    console.log(`   - Migrated: ${migrated}`);
    console.log(`   - Skipped: ${skipped}`);

    // Drop uid index if it still exists
    try {
      await usersCollection.dropIndex('uid_1');
      console.log(`\n✅ Dropped uid_1 index`);
    } catch (error) {
      if (error.code === 27) {
        console.log(`\n✅ uid_1 index already dropped`);
      }
    }

    console.log('\n✅ Migration complete!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
};

migrateUsers();
