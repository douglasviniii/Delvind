// Importa os módulos necessários do Firebase
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { initializeFirestore, CACHE_SIZE_UNLIMITED } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuração do Firebase fornecida pelo usuário
const firebaseConfig = {
  apiKey: "AIzaSyB0GTV_m5oit8ddZeCmQ3hW7Jhh-LKiKG0",
  authDomain: "venda-fcil-pdv.firebaseapp.com",
  projectId: "venda-fcil-pdv",
  storageBucket: "venda-fcil-pdv.firebasestorage.app",
  messagingSenderId: "114570788878",
  appId: "1:114570788878:web:5dd9f658d2b62fe762fc5f",
  measurementId: "G-H5JL1WQTGK"
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
