
// Importa os módulos necessários do Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED, enableIndexedDbPersistence } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuração do Firebase lida a partir das variáveis de ambiente
const firebaseConfig = {
  apiKey: "YOUR_API_KEY",
  authDomain: "venda-fcil-pdv.firebaseapp.com",
  projectId: "venda-fcil-pdv",
  storageBucket: "venda-fcil-pdv.appspot.com",
  messagingSenderId: "331828036239",
  appId: "1:331828036239:web:9c211516e885443269d519",
  measurementId: "G-Z11J7323E4"
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
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  });
}

// Exporta todos os serviços prontos para importar em qualquer lugar
export { app, auth, db, storage, analytics };
