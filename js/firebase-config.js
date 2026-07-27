import { initializeApp } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/12.16.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyB68Oh9_mBiWOXAJjF1R77-4eALwahkbXA",
  authDomain: "bam-client-portal.firebaseapp.com",
  projectId: "bam-client-portal",
  storageBucket: "bam-client-portal.firebasestorage.app",
  messagingSenderId: "185476076163",
  appId: "1:185476076163:web:29a1003fa165f6c7e781b6"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

export { app, auth, db };
