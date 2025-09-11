import * as admin from 'firebase-admin';

// Parse the service account key from the environment variable
const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

if (!serviceAccountString) {
  throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
}

let serviceAccount: admin.ServiceAccount;
try {
  serviceAccount = JSON.parse(serviceAccountString);
} catch (e) {
  throw new Error('Não foi possível analisar a chave da conta de serviço do Firebase. Verifique se está formatada corretamente.');
}


// Esta função garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // Inicializa o Firebase Admin SDK
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
