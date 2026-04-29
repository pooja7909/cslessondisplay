import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";
import firebaseConfigLocal from "../../firebase-applet-config.json";

// Use environment variables if present (standard for Vercel/Production)
// Fallback to the local JSON file if env vars are missing or empty
const getEnv = (key: string): string | null => {
  const val = (import.meta as any).env[key];
  if (!val || val === "MY_APP_URL" || val === "" || val.includes("REPLACE_ME")) {
    return null;
  }
  // Detect if App ID was accidentally put into API Key field
  if (key === "VITE_FIREBASE_API_KEY" && val.includes(":web:")) {
    return null;
  }
  return val;
};

const firebaseConfig = {
  apiKey: getEnv("VITE_FIREBASE_API_KEY") || firebaseConfigLocal.apiKey,
  authDomain: getEnv("VITE_FIREBASE_AUTH_DOMAIN") || firebaseConfigLocal.authDomain,
  projectId: getEnv("VITE_FIREBASE_PROJECT_ID") || firebaseConfigLocal.projectId,
  storageBucket: getEnv("VITE_FIREBASE_STORAGE_BUCKET") || firebaseConfigLocal.storageBucket,
  messagingSenderId: getEnv("VITE_FIREBASE_MESSAGING_SENDER_ID") || firebaseConfigLocal.messagingSenderId,
  appId: getEnv("VITE_FIREBASE_APP_ID") || firebaseConfigLocal.appId,
};

// Validate API Key before initialization to provide better error context
if (!firebaseConfig.apiKey || firebaseConfig.apiKey === "undefined") {
  console.error("Firebase API Key is missing or invalid in configuration.");
}

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, getEnv("VITE_FIREBASE_DATABASE_ID") || firebaseConfigLocal.firestoreDatabaseId);
export const auth = getAuth(app);
