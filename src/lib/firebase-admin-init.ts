
import * as admin from 'firebase-admin';
import serviceAccount from '../../../firebase-service-account.json';

export function initializeAdminApp() {
  // Se o app 'admin' já estiver inicializado, retorne-o
  const existingApp = admin.apps.find(app => app?.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  // As credenciais são importadas do arquivo JSON
  const credential = admin.credential.cert(serviceAccount);

  try {
    // Inicializa o app com as credenciais do arquivo importado
    return admin.initializeApp({
      credential,
      storageBucket: 'venda-fcil-pdv.appspot.com',
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
