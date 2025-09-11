import * as admin from 'firebase-admin';

// Importa a chave de serviço diretamente do arquivo JSON.
// Isso é mais robusto em diferentes ambientes do que depender de variáveis de ambiente que podem não ser carregadas corretamente.
import serviceAccount from '../../../firebase-service-account.json';

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
    // Converte o objeto importado para o tipo esperado pelo SDK Admin.
    const credential = admin.credential.cert(serviceAccount as admin.ServiceAccount);

    admin.initializeApp({
      credential,
    });

  } catch (error: any) {
    console.error('Falha na inicialização do Firebase Admin SDK.', error);
    throw new Error('Could not initialize Firebase Admin SDK: ' + error.message);
  }

  return {
    db: admin.firestore(),
    auth: admin.auth(),
    storage: admin.storage(),
  };
}
