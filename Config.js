import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import firebase from "firebase/compat/app";
import "firebase/compat/auth";
import "firebase/compat/firestore";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyAzmDCIT6I7W1PsxcJQ00XHH5tuL6NvxUQ",
  authDomain: "animalcombat-38b66.firebaseapp.com",
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

export { firebase, authentication };