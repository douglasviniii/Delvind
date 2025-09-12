
// Importa os módulos necessários do Firebase
import { initializeApp, getApps, getApp, FirebaseApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAnalytics, isSupported } from "firebase/analytics";

// Configuração do Firebase para o lado do cliente.
// Estas são chaves públicas e seguras para serem usadas no navegador.
const firebaseConfig = {
  apiKey: "AIzaSyB0GTV_m5oit8ddZeCmQ3hW7Jhh-LKiKG0",
  authDomain: "venda-fcil-pdv.firebaseapp.com",
  projectId: "venda-fcil-pdv",
  storageBucket: "venda-fcil-pdv.appspot.com",
  messagingSenderId: "114570788878",
  appId: "1:114570788878:web:1e3fa51754f3ae6862fc5f",
  measurementId: "G-792KHTQP7R"
};

// Inicializa o Firebase (garante que só inicializa uma vez)
const app: FirebaseApp = !getApps().length ? initializeApp(firebaseConfig) : getApp();

// Obtém as instâncias dos serviços a partir do app inicializado
const db = getFirestore(app);
const auth = getAuth(app);
const storage = getStorage(app);

// Analytics (só no client-side, evita erro no SSR do Next.js)
let analytics: any = null;
if (typeof window !== "undefined") {
  isSupported().then((supported) => {
    if (supported && firebaseConfig.measurementId) {
      analytics = getAnalytics(app);
    }
  });
}

// Exporta todos os serviços prontos para importar em qualquer lugar
export { app, auth, db, storage, analytics };
