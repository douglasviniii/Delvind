
// Importa os módulos necessários do Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuração do Firebase lida a partir das variáveis de ambiente
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
  measurementId: process.env.NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID
};


// Inicializa o Firebase (garante que só inicializa uma vez)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore com cache ilimitado
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

// Habilita a persistência offline para web
if (typeof window !== 'undefined') {
    enableIndexedDbPersistence(db)
      .catch((err) => {
          if (err.code == 'failed-precondition') {
              // Múltiplas abas abertas, isso pode acontecer.
              // A persistência funcionará em uma das abas.
              console.warn('Falha ao habilitar persistência: múltiplas abas abertas.');
          } else if (err.code == 'unimplemented') {
              // O navegador não suporta a persistência.
              console.warn('Seu navegador não suporta persistência offline do Firestore.');
          }
      });
}


// Autenticação
const auth = getAuth(app);

// Storage
const storage = getStorage(app);

// Analytics (só no client-side, evita erro no SSR do Next.js)
let analytics = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported) {
      analytics = getAnalytics(app);
    }
  });
}

// Exporta todos os serviços prontos para importar em qualquer lugar
export { app, auth, db, storage, analytics };
