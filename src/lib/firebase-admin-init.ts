
import * as admin from 'firebase-admin';

// Função para inicializar o Admin SDK a partir de variáveis de ambiente
export function initializeAdminApp() {
  // Se o app 'admin' já estiver inicializado, retorne-o
  const existingApp = admin.apps.find(app => app?.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  // Tenta obter as credenciais da variável de ambiente
  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida. O deploy falhará.');
  }

  try {
    const serviceAccount = JSON.parse(serviceAccountString);

    // Inicializa o app com as credenciais da variável de ambiente
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
      storageBucket: 'venda-fcil-pdv.appspot.com',
    }, 'admin'); // Nomeia a instância para evitar conflitos

  } catch (e: any) {
    console.error('Falha ao analisar a FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    throw new Error('Não foi possível inicializar o Firebase Admin. Verifique o formato da variável de ambiente.');
  }
}
