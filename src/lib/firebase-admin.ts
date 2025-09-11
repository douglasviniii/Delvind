
import * as admin from 'firebase-admin';

// Check if the app is already initialized to prevent errors in hot-reloading environments
if (!admin.apps.length) {
  try {
     // When deployed to App Hosting, the SDK automatically discovers credentials.
    // For local development, you would set up GOOGLE_APPLICATION_CREDENTIALS.
    admin.initializeApp();
  } catch (error: any) {
    console.error('Firebase admin initialization error', error.stack);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
