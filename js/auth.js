import { auth, db } from "./firebase-config.js";
import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

// ...leave all of your existing helper functions exactly as they are...

const loginForm = document.getElementById("login-form");

if (loginForm) {
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const rememberInput = loginForm.querySelector('input[name="remember"]');
  const alert = document.getElementById("login-alert");
  const submit = document.getElementById("login-submit");

  loginForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(alert);

    if (!loginForm.checkValidity()) {
      loginForm.reportValidity();
      return;
    }

    setBusy(submit, true, "Signing In...");

    try {
      await setPersistence(
        auth,
        rememberInput?.checked
          ? browserLocalPersistence
          : browserSessionPersistence
      );

      const credential = await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );

   const userDoc = await getDoc(doc(db, "users", credential.user.uid));

const role = userDoc.exists()
  ? String(userDoc.data()?.role || "").trim().toLowerCase()
  : "client";

if (role === "admin") {
  window.location.replace("admin-dashboard.html");
} else {
  window.location.replace("client-portal.html");
}

    } catch (error) {
      setAlert(alert, friendlyAuthError(error));
      setBusy(submit, false, "");
    }
  });
}