import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import firebaseConfigLocal from "../../firebase-applet-config.json";

// Use environment variables if present (standard for Vercel/Production)
// Fallback to the local JSON file if env vars are missing or empty
const getEnv = (key: string) => {
  const val = (import.meta as any).env?.[key];
  return (val && val !== "MY_APP_URL" && val !== "") ? val : null;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || firebaseConfigLocal.apiKey,
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || firebaseConfigLocal.authDomain,
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || firebaseConfigLocal.projectId,
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || firebaseConfigLocal.storageBucket,
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || firebaseConfigLocal.messagingSenderId,
  appId: getEnv("VITE_FIREBASE_APP_ID") || firebaseConfigLocal.appId,
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, getEnv("VITE_FIREBASE_DATABASE_ID") || firebaseConfigLocal.firestoreDatabaseId);
