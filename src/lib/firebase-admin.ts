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
    // A inicialização buscará as credenciais automaticamente no ambiente do App Hosting
    // ou através da variável de ambiente GOOGLE_APPLICATION_CREDENTIALS no desenvolvimento local.
    admin.initializeApp();
    console.log('Firebase Admin SDK initialized successfully.');
  } catch (error) {
    console.error('Falha na inicialização do Firebase Admin SDK.', error);
    // Lançar o erro pode ser útil para depuração, pois impede que a aplicação continue com uma configuração inválida.
    throw new Error('Could not initialize Firebase Admin SDK.');
  }

  return {
    db: admin.firestore(),
    auth: admin.auth(),
    storage: admin.storage(),
  };
}
