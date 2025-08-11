// Firebase initialization
// Using Web SDK v10 modular API
import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBTnFlpy0iLWJfVV-_8b08lLI5Tsm6Ibxs",
  authDomain: "nj-terminal-51065.firebaseapp.com",
  projectId: "nj-terminal-51065",
  storageBucket: "nj-terminal-51065.firebasestorage.app",
  messagingSenderId: "429594632274",
  appId: "1:429594632274:web:640b9e01218408607f7f8b",
};

// Initialize Firebase app (Next.js is ESM; initializeApp is idempotent if same config)
export const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
