import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/database";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzmDCIT6I7W1PsxcJQ00XHH5tuL6NvxUQ",
  authDomain: "animalcombat-38b66.firebaseapp.com",
  databaseURL: "https://animalcombat-38b66-default-rtdb.europe-west1.firebasedatabase.app/", // <--- THIS IS REQUIRED!
  projectId: "animalcombat-38b66",
  storageBucket: "animalcombat-38b66.firebasestorage.app",
  messagingSenderId: "578786594403",
  appId: "1:578786594403:web:ff9a08c5ea6e8cfe12f256",
  measurementId: "G-GZ6BYGYJCS"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const app = initializeApp(firebaseConfig);
const authentication = getAuth(app);

export const database = getDatabase(app);
export const firestore = getFirestore(app);
export { firebase, authentication };