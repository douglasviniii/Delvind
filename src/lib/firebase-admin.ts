
import * as admin from 'firebase-admin';

// Check if the app is already initialized
if (!admin.apps.length) {
  try {
     // When deployed to App Hosting, the SDK automatically discovers the credentials.
    // No need to pass them in initializeApp(). For local development,
    // you would use a service account file.
    admin.initializeApp();
  } catch (error) {
    console.error('Firebase admin initialization error', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
