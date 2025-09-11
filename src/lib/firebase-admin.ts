// This file is deprecated and will be removed. Please use firebase-admin-init.ts
import * as admin from 'firebase-admin';

// This function is kept for backward compatibility but should not be used in new code.
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
  }
  
  try {
      const serviceAccount = JSON.parse(serviceAccountString);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
  } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.');
  }
}
