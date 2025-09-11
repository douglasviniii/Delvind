
import * as admin from 'firebase-admin';

export function initializeAdminApp() {
  const existingApp = admin.apps.find(app => app?.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('As variáveis de ambiente do Firebase Admin não estão definidas corretamente no arquivo .env.');
  }

  return admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
    storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  }, 'admin');
}
