import admin from 'firebase-admin';
import dotenv from 'dotenv';

dotenv.config();

// Initialize Firebase Admin SDK
const initializeFirebase = () => {
  try {
    // Check if Firebase environment variables exist
    if (!process.env.FIREBASE_PROJECT_ID) {
      console.warn('⚠️ FIREBASE_PROJECT_ID not set - Google Auth will not work');
      return;
    }
    
    if (!process.env.FIREBASE_PRIVATE_KEY) {
      console.warn('⚠️ FIREBASE_PRIVATE_KEY not set - Google Auth will not work');
      return;
    }
    
    if (!process.env.FIREBASE_CLIENT_EMAIL) {
      console.warn('⚠️ FIREBASE_CLIENT_EMAIL not set - Google Auth will not work');
      return;
    }

    admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      }),
    });
    console.log('✅ Firebase Admin initialized successfully');
  } catch (error) {
    console.error('❌ Firebase Admin initialization error:', error.message);
    console.warn('⚠️ Server will continue but Google Auth will not work');
  }
};

export { admin, initializeFirebase };
