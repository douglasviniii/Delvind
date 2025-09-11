
import * as admin from 'firebase-admin';

// Garante que o SDK do Firebase Admin não seja inicializado mais de uma vez.
if (!admin.apps.length) {
  try {
    // A inicialização buscará as credenciais automaticamente no ambiente do App Hosting.
    // Para desenvolvimento local, você precisaria configurar a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS.
    admin.initializeApp();
  } catch (error) {
    console.error('Falha na inicialização do Firebase Admin SDK.', error);
  }
}

export const db = admin.firestore();
export const auth = admin.auth();
export const storage = admin.storage();
