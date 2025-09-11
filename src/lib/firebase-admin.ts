
import * as admin from 'firebase-admin';
import serviceAccount from '../../../firebase-service-account.json';

// Esta função garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
export function initializeAdminApp() {
  if (admin.apps.length > 0) {
    return;
  }

  try {
    const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
    admin.initializeApp({ credential });
  } catch (error: any) {
    console.error('Falha na inicialização do Firebase Admin SDK.', error);
    throw new Error('Could not initialize Firebase Admin SDK: ' + error.message);
  }
}
