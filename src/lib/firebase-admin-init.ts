
import * as admin from 'firebase-admin';

let app: admin.app.App;
let auth: admin.auth.Auth;
let db: admin.firestore.Firestore;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    app = admin.app();
  } else {
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

    if (!serviceAccountString) {
      throw new Error('The FIREBASE_SERVICE_ACCOUNT_KEY environment variable is not set.');
    }

    try {
      const serviceAccount = JSON.parse(serviceAccountString);
      app = admin.initializeApp({
        credential: admin.credential.cert(serviceAccount),
      });
    } catch (e: any) {
      console.error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
      throw new Error('Failed to parse FIREBASE_SERVICE_ACCOUNT_KEY. Make sure it is a valid JSON string.');
    }
  }

  auth = admin.auth(app);
  db = admin.firestore(app);
}

export function getAdminApp() {
  if (!app) {
    initializeAdminApp();
  }
  return { app, auth, db };
}
