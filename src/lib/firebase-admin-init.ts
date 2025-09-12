
import * as admin from 'firebase-admin';
import serviceAccount from '../../../firebase-service-account.json';

// Converte o objeto de conta de serviço para o tipo esperado pelo Firebase Admin SDK
const typedServiceAccount = {
  projectId: serviceAccount.project_id,
  clientEmail: serviceAccount.client_email,
  privateKey: serviceAccount.private_key,
};

export function initializeAdminApp() {
  // Se o app 'admin' já estiver inicializado, retorne-o
  const existingApp = admin.apps.find(app => app?.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  try {
    // Inicializa o app com as credenciais do arquivo importado
    return admin.initializeApp({
      credential: admin.credential.cert(typedServiceAccount),
      storageBucket: 'venda-fcil-pdv.appspot.com',
    }, 'admin'); // Nomeia a instância para evitar conflitos

  } catch (e: any) {
    console.error('Falha ao inicializar o Firebase Admin:', e.message);
    throw new Error('Não foi possível inicializar o Firebase Admin. Verifique as credenciais.');
  }
}

// Para manter compatibilidade, caso outra parte do sistema use esta função
export function getAdminApp() {
    return { db: admin.firestore(initializeAdminApp()) };
}
