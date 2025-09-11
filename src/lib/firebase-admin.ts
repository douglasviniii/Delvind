
import * as admin from 'firebase-admin';

// Esta função garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
export function getAdminApp() {
  // Se o app já foi inicializado, retorna a instância existente.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // A chave da conta de serviço é fornecida como uma string JSON via variável de ambiente.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  // Analisa a string JSON para obter o objeto da conta de serviço.
  const serviceAccount = JSON.parse(serviceAccountString);

  // Inicializa o Firebase Admin SDK com as credenciais.
  return admin.initializeApp({
    credential: admin.credential.cert(serviceAccount),
  });
}
