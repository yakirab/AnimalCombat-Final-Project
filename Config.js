import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, setPersistence, browserLocalPersistence } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import Constants from "expo-constants";

// Get Firebase config from environment variables
const extra = Constants?.expoConfig?.extra ?? {};

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY,
  authDomain: extra.FIREBASE_AUTH_DOMAIN,
  databaseURL: extra.FIREBASE_DATABASE_URL,
  projectId: extra.FIREBASE_PROJECT_ID,
  storageBucket: extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.FIREBASE_APP_ID,
  measurementId: extra.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase (modular SDK only)
const app = initializeApp(firebaseConfig);
const authentication = getAuth(app);

// Persist auth between sessions (web)
if (typeof window !== 'undefined') {
  setPersistence(authentication, browserLocalPersistence).catch(() => { });
}

export const database = getDatabase(app);
export const firestore = getFirestore(app);
export { authentication };
