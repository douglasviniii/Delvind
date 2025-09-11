import * as admin from 'firebase-admin';

export function initializeAdminApp() {
  // Se o app 'admin' já estiver inicializado, retorne-o
  const existingApp = admin.apps.find(app => app?.name === 'admin');
  if (existingApp) {
    return existingApp;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;

  if (!serviceAccountString) {
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
  }

  try {
    // Analisa a string JSON para obter o objeto da chave de serviço.
    const serviceAccount = JSON.parse(serviceAccountString);

    // Inicializa o app com as credenciais e um nome único
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    }, 'admin'); // Nomeia a instância para evitar conflitos

  } catch (e: any) {
    console.error('Falha ao analisar a FIREBASE_SERVICE_ACCOUNT_KEY:', e.message);
    throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não é um JSON válido.');
  }
}
