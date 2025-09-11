import * as admin from 'firebase-admin';
import serviceAccount from '../../firebase-service-account.json';

// Esta função garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);
  return admin.initializeApp({ credential });
}
