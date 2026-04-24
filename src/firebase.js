import { initializeApp } from "firebase/app";
import { getDatabase } from "firebase/database";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDYNqiGgcRLkneV7sJvCjNaLRyYoU12Uw8",
  authDomain: "todo-app-fad5d.firebaseapp.com",
  databaseURL: "https://todo-app-fad5d-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "todo-app-fad5d",
  storageBucket: "todo-app-fad5d.firebasestorage.app",
  messagingSenderId: "186655580356",
  appId: "1:186655580356:web:e6bc08c90fc7253184a991"
};

const app = initializeApp(firebaseConfig);
export const db = getDatabase(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.addScope("https://www.googleapis.com/auth/calendar.readonly");
