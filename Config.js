import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import Constants from "expo-constants";

const extra = Constants.expoConfig?.extra ?? {};
// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: extra.FIREBASE_API_KEY,
  authDomain: extra.FIREBASE_AUTH_DOMAIN,
  projectId: extra.FIREBASE_PROJECT_ID,
  storageBucket: extra.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: extra.FIREBASE_MESSAGING_SENDER_ID,
  appId: extra.FIREBASE_APP_ID,
  measurementId: extra.FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const authentication = getAuth(app);

export { app };