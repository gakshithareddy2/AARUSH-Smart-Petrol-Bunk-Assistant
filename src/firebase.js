import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCn4prKXoxRKYkRuwHDFSq0bl43hdUIgkA",
  authDomain:"aarush-fuel-station.firebaseapp.com",
  projectId: "aarush-fuel-station",
  storageBucket: "aarush-fuel-station.firebasestorage.app",
  messagingSenderId: "16559748732",
  appId: "1:16559748732:web:4e9b17869f5b5dd8447bf9",
  measurementId: "G-HXPKGCMBWN"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Authentication
export const auth = getAuth(app);

// Initialize Cloud Firestore
export const db = getFirestore(app);

// Export Firebase App
export default app;