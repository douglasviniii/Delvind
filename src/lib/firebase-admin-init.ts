
import * as admin from 'firebase-admin';

let app: admin.app.App;

function initializeAdminApp() {
  if (admin.apps.length > 0) {
    app = admin.app();
    return;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);
    app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e: any) {
    console.error('Falha ao analisar FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    throw new Error('Falha ao analisar FIREBASE_SERVICE_ACCOUNT_KEY. Certifique-se de que é uma string JSON válida.');
  }
}

// Garante que a inicialização aconteça apenas uma vez.
if (!admin.apps.length) {
    initializeAdminApp();
}

export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
