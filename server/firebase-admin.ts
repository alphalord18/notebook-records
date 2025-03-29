/**
 * Firebase Admin configuration
 * This file sets up all Firebase services for use throughout the application
 */
import { initializeApp, cert } from 'firebase-admin/app';
import { getFirestore, Timestamp as FirestoreTimestamp, FieldValue } from 'firebase-admin/firestore';
import { getAuth } from 'firebase-admin/auth';
import { getStorage } from 'firebase-admin/storage';

// Make sure we have Firebase credentials
if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
  console.warn('Firebase credentials not found in environment variables.');
  console.warn('The application will use Firebase but it might not work properly.');
}

// Initialize Firebase Admin with credentials from environment variables
const firebaseApp = initializeApp({
  credential: cert({
    projectId: process.env.FIREBASE_PROJECT_ID || '',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || '',
    // Fixes the line break issue in environment variables
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  }),
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET || `${process.env.FIREBASE_PROJECT_ID}.appspot.com`
});

// Get database reference
const firestore = getFirestore(firebaseApp);

// Configure Firestore settings
firestore.settings({
  ignoreUndefinedProperties: true,
});

// Set up exports
const app = firebaseApp;
const db = firestore;
const auth = getAuth(app);
const storage = getStorage(app).bucket();

// Export our own Timestamp class to ensure we use consistent timestamps
export class Timestamp extends FirestoreTimestamp {
  // Already inherits all the functionality
  static override now(): FirestoreTimestamp {
    return FirestoreTimestamp.now();
  }
  
  static override fromDate(date: Date): FirestoreTimestamp {
    return FirestoreTimestamp.fromDate(date);
  }
}

// Export Firebase services
export { db, auth, storage, app, FieldValue };
export default app;