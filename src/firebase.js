import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCJ9sIb-43tya74J3ECnkiDo5cpiOlrYWI",
  authDomain: "mafia-x-imposter.firebaseapp.com",
  databaseURL: "https://mafia-x-imposter-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "mafia-x-imposter",
  storageBucket: "mafia-x-imposter.firebasestorage.app",
  messagingSenderId: "723796352447",
  appId: "1:723796352447:web:cb0fec0eaed4206a4b550a",
  measurementId: "G-CNQ07D6YE7"
};

export const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const database = getDatabase(app);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();
