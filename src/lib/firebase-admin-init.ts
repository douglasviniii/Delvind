
import * as admin from 'firebase-admin';

// Esta função garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
export function initializeAdminApp() {
  // Se já estiver inicializado, retorna o app existente.
  if (admin.apps.length > 0) {
    return admin.app();
  }

  // A chave de serviço agora é lida da variável de ambiente.
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  try {
    // Analisa a string JSON para obter o objeto da chave de serviço.
    const serviceAccount = JSON.parse(serviceAccountString);

    // Inicializa o app com as credenciais.
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (e: any) {
    console.error('Falha ao analisar a FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido.');
  }
}

// Inicializa o app globalmente para que outras partes do código possam usar
initializeAdminApp();

// Exporta as instâncias de auth e db prontas para uso.
export const adminAuth = admin.auth();
export const adminDb = admin.firestore();
