
// Importa os módulos necessários do Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuração do Firebase (copiada do console)
const firebaseConfig = {
  "projectId": "delvind",
  "appId": "1:476982958943:web:c45febb71dc4e1822df4ea",
  "storageBucket": "delvind.firebasestorage.app",
  "apiKey": "AIzaSyBg-y_MHWIR6TpSWlOUv02Au99M2DvMpvQ",
  "authDomain": "delvind.firebaseapp.com",
  "measurementId": "",
  "messagingSenderId": "476982958943"
};

// Inicializa o Firebase (garante que só inicializa uma vez)
const app = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Firestore com cache ilimitado
const db = initializeFirestore(app, {
  cacheSizeBytes: CACHE_SIZE_UNLIMITED,
});

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
