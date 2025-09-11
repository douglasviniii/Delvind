import * as admin from 'firebase-admin';

// Esta função garante que o SDK do Firebase Admin seja inicializado apenas uma vez.
export function getAdminApp() {
  if (admin.apps.length > 0) {
    return {
      db: admin.firestore(),
      auth: admin.auth(),
      storage: admin.storage(),
    };
  }

  try {
    // A forma mais segura de carregar as credenciais em diferentes ambientes.
    const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT_KEY;
    if (!serviceAccountString) {
        throw new Error('A variável de ambiente FIREBASE_SERVICE_ACCOUNT_KEY não está definida.');
    }
    const serviceAccount = JSON.parse(serviceAccountString);
    
    admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });

  } catch (error: any) {
    console.error('Falha na inicialização do Firebase Admin SDK.', error);
    // Lançar o erro pode ser útil para depuração, pois impede que a aplicação continue com uma configuração inválida.
    throw new Error('Could not initialize Firebase Admin SDK: ' + error.message);
  }

  return {
    db: admin.firestore(),
    auth: admin.auth(),
    storage: admin.storage(),
  };
}
