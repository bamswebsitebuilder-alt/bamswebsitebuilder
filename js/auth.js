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
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const setAlert = (element, message, isSuccess = false) => {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
  element.classList.toggle("success-alert", isSuccess);
};

const clearAlert = (element) => {
  if (!element) return;
  element.hidden = true;
  element.textContent = "";
  element.classList.remove("success-alert");
};

const setBusy = (button, busy, busyText) => {
  if (!button) return;
  if (!button.dataset.originalText) {
    button.dataset.originalText = button.textContent.trim();
  }
  button.disabled = busy;
  button.textContent = busy ? busyText : button.dataset.originalText;
};

const friendlyAuthError = (error) => {
  const code = error?.code || "";

  const messages = {
    "auth/email-already-in-use": "An account already exists with that email address.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/invalid-credential": "The email address or password is incorrect.",
    "auth/missing-password": "Enter your password.",
    "auth/weak-password": "Use a stronger password with at least 8 characters.",
    "auth/too-many-requests": "Too many attempts were made. Please wait and try again.",
    "auth/network-request-failed": "A network error occurred. Check your connection and try again.",
    "auth/operation-not-allowed": "Email/password sign-in has not been enabled in Firebase yet."
  };

  return messages[code] || "Something went wrong. Please try again.";
};

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
        rememberInput?.checked ? browserLocalPersistence : browserSessionPersistence
      );

      await signInWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );

      window.location.replace("client-portal.html");
    } catch (error) {
      setAlert(alert, friendlyAuthError(error));
      setBusy(submit, false, "");
    }
  });
}

const registerForm = document.getElementById("register-form");

if (registerForm) {
  const alert = document.getElementById("register-alert");
  const submit = document.getElementById("register-submit");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(alert);

    if (!registerForm.checkValidity()) {
      registerForm.reportValidity();
      return;
    }

    const firstName = document.getElementById("first-name").value.trim();
    const lastName = document.getElementById("last-name").value.trim();
    const businessName = document.getElementById("business-name").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const email = document.getElementById("register-email").value.trim();
    const password = document.getElementById("register-password").value;
    const confirmPassword = document.getElementById("confirm-password").value;

    if (password !== confirmPassword) {
      setAlert(alert, "The passwords do not match.");
      document.getElementById("confirm-password").focus();
      return;
    }

    setBusy(submit, true, "Creating Account...");

    try {
      await setPersistence(auth, browserLocalPersistence);

      const credential = await createUserWithEmailAndPassword(auth, email, password);
      const fullName = `${firstName} ${lastName}`.trim();

      await updateProfile(credential.user, { displayName: fullName });

      await setDoc(doc(db, "users", credential.user.uid), {
        uid: credential.user.uid,
        firstName,
        lastName,
        fullName,
        businessName,
        phone,
        email,
        role: "client",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp()
      });

      await sendEmailVerification(credential.user);
      window.location.replace("client-portal.html?registered=1");
    } catch (error) {
      setAlert(alert, friendlyAuthError(error));
      setBusy(submit, false, "");
    }
  });
}

const forgotForm = document.getElementById("forgot-form");

if (forgotForm) {
  const emailInput = document.getElementById("reset-email");
  const message = document.getElementById("reset-message");
  const submit = document.getElementById("reset-submit");

  forgotForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(message);

    if (!forgotForm.checkValidity()) {
      forgotForm.reportValidity();
      return;
    }

    setBusy(submit, true, "Sending...");

    try {
      await sendPasswordResetEmail(auth, emailInput.value.trim());
      setAlert(
        message,
        "Password reset email sent. Check your inbox and spam folder.",
        true
      );
      forgotForm.reset();
    } catch (error) {
      setAlert(message, friendlyAuthError(error));
    } finally {
      setBusy(submit, false, "");
    }
  });
}
