
import * as admin from 'firebase-admin';

export function initializeAdminApp() {
  // Se o app 'admin' já estiver inicializado, retorne-o
  const existingApp = admin.apps.find(app => app?.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  // Verifica se as variáveis de ambiente necessárias estão definidas
  if (!process.env.FIREBASE_PROJECT_ID || !process.env.FIREBASE_CLIENT_EMAIL || !process.env.FIREBASE_PRIVATE_KEY) {
    throw new Error('As variáveis de ambiente do Firebase Admin não estão definidas corretamente.');
  }

  try {
    // Inicializa o app com as credenciais das variáveis de ambiente
    return admin.initializeApp({
      credential: admin.credential.cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        // Substitui os literais '\n' por quebras de linha reais na chave privada
        privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
      }),
      storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
    }, 'admin'); // Nomeia a instância para evitar conflitos

  } catch (e: any) {
    console.error('Falha ao inicializar o Firebase Admin:', e.message);
    throw new Error('Não foi possível inicializar o Firebase Admin. Verifique as credenciais.');
  }
}

// Para manter compatibilidade com o webhook do Stripe
export function getAdminApp() {
    return { db: admin.firestore(initializeAdminApp()) };
}
