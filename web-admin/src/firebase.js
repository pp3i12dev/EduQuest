import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth"; // Opcional, por si usas autenticación
import { getFirestore } from "firebase/firestore"; // Opcional, por si usas Firestore

const firebaseConfig = {
  apiKey: "AIzaSyBabxDi243MydFnguqmjLoxj4FiPDvsAwE",
  authDomain: "eduquest-alerta-temprana.firebaseapp.com",
  projectId: "eduquest-alerta-temprana",
  storageBucket: "eduquest-alerta-temprana.firebasestorage.app",
  messagingSenderId: "168638303360",
  appId: "1:168638303360:web:c23d9ffa1ddf4383f2ea65" // El ID web que generaste con FlutterFire
};

// Evita inicializaciones duplicadas durante el desarrollo (Fast Refresh)
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const db = getFirestore(app);
export default app;
