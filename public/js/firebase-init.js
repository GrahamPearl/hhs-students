/**
 * firebase-init.js
 * Initializes the Firebase app + Firestore instance used by data-service.js.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import {
  getFirestore,
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

const app = initializeApp(window.APP_CONFIG.FIREBASE_CONFIG);
export const db = getFirestore(app);
export const auth = getAuth(app);
export {
  collection,
  getDocs,
  doc,
  getDoc,
  writeBatch,
  signInWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
};
