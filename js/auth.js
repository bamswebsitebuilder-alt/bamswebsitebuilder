import { auth, db } from "./firebase-config.js";

import {
  browserLocalPersistence,
  browserSessionPersistence,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  setPersistence,
  signOut,
  signInWithEmailAndPassword,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const setAlert = (element, message, success = false) => {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
  element.classList.toggle("success-alert", success);
};

const clearAlert = (element) => {
  if (!element) return;
  element.hidden = true;
  element.textContent = "";
  element.classList.remove("success-alert");
};

const setBusy = (button, busy, busyText = "Please wait...") => {
  if (!button) return;

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = busy;
  button.textContent = busy
    ? busyText
    : button.dataset.defaultText;
};

const friendlyAuthError = (error) => {
  const messages = {
    "auth/invalid-credential": "The email or password is incorrect.",
    "auth/invalid-email": "Enter a valid email address.",
    "auth/missing-password": "Enter your password.",
    "auth/user-disabled": "This account has been disabled.",
    "auth/too-many-requests": "Too many attempts. Wait a little while and try again.",
    "auth/network-request-failed": "A network error occurred. Check your connection and try again.",
    "auth/email-already-in-use": "An account already exists for this email address.",
    "auth/weak-password": "Use a stronger password with at least 6 characters.",
    "auth/operation-not-allowed": "Email/password sign-in is not enabled in Firebase Authentication."
  };

  console.error("Firebase authentication error:", error);
  return messages[error?.code] || "We could not complete that request. Please try again.";
};

const getUserRole = async (user) => {
  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));

    if (!snapshot.exists()) {
      await setDoc(
        doc(db, "users", user.uid),
        {
          email: user.email || "",
          fullName: user.displayName || "",
          role: "client",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );
      return "client";
    }

    return String(snapshot.data()?.role || "client")
      .trim()
      .toLowerCase();
  } catch (error) {
    console.error("Unable to read account role:", error);
    return "client";
  }
};

const redirectAfterLogin = async (user) => {
  const role = await getUserRole(user);
  const requestedPage = new URLSearchParams(window.location.search).get("next");

  if (role === "admin") {
    window.location.replace("admin-dashboard.html");
    return;
  }

  const safeClientDestination =
    requestedPage === "client-portal.html"
      ? requestedPage
      : "client-portal.html";

  window.location.replace(safeClientDestination);
};

const loginForm = document.getElementById("login-form");

if (loginForm) {
  const emailInput = document.getElementById("login-email");
  const passwordInput = document.getElementById("login-password");
  const rememberInput = loginForm.querySelector('input[name="remember"]');
  const alert = document.getElementById("login-alert");
  const submit = document.getElementById("login-submit");
  const pageParams = new URLSearchParams(window.location.search);

  if (pageParams.get("verify") === "1") {
    setAlert(
      alert,
      "Check your email and verify your account before signing in.",
      true
    );
  }

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

      if (!credential.user.emailVerified) {
        await sendEmailVerification(credential.user).catch(() => {});
        await signOut(auth);
        setAlert(
          alert,
          "Please verify your email before continuing. We sent you a new verification link."
        );
        setBusy(submit, false);
        return;
      }

      await redirectAfterLogin(credential.user);
    } catch (error) {
      setAlert(alert, friendlyAuthError(error));
      setBusy(submit, false);
    }
  });
}

const registerForm = document.getElementById("register-form");

if (registerForm) {
  const firstNameInput = document.getElementById("first-name");
  const lastNameInput = document.getElementById("last-name");
  const businessNameInput = document.getElementById("business-name");
  const phoneInput = document.getElementById("phone");
  const confirmPasswordInput = document.getElementById("confirm-password");
  const emailInput = document.getElementById("register-email");
  const passwordInput = document.getElementById("register-password");
  const alert = document.getElementById("register-alert");
  const submit = document.getElementById("register-submit");

  registerForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(alert);

    if (!registerForm.checkValidity()) {
      registerForm.reportValidity();
      return;
    }

    if (passwordInput.value !== confirmPasswordInput?.value) {
      setAlert(alert, "The passwords do not match.");
      return;
    }

    setBusy(submit, true, "Creating Account...");

    try {
      const credential = await createUserWithEmailAndPassword(
        auth,
        emailInput.value.trim(),
        passwordInput.value
      );

      const firstName = firstNameInput?.value.trim() || "";
      const lastName = lastNameInput?.value.trim() || "";
      const fullName = `${firstName} ${lastName}`.trim();
      const businessName = businessNameInput?.value.trim() || "";
      const phone = phoneInput?.value.trim() || "";

      if (fullName) {
        await updateProfile(credential.user, { displayName: fullName });
      }

      await setDoc(
        doc(db, "users", credential.user.uid),
        {
          firstName,
          lastName,
          fullName,
          businessName,
          phone,
          email: credential.user.email || emailInput.value.trim(),
          role: "client",
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp()
        },
        { merge: true }
      );

      await sendEmailVerification(credential.user);
      await signOut(auth);

      const loginPath = document.documentElement.lang
        .toLowerCase()
        .startsWith("es")
          ? "/es/login?verify=1"
          : "/login?verify=1";

      window.location.replace(loginPath);
    } catch (error) {
      setAlert(alert, friendlyAuthError(error));
      setBusy(submit, false);
    }
  });
}

const resetForm =
  document.getElementById("forgot-form") ||
  document.getElementById("forgot-password-form") ||
  document.getElementById("reset-form");

if (resetForm) {
  const emailInput =
    document.getElementById("forgot-email") ||
    document.getElementById("reset-email");
  const alert =
    document.getElementById("reset-message") ||
    document.getElementById("forgot-alert") ||
    document.getElementById("reset-alert");
  const submit =
    document.getElementById("forgot-submit") ||
    document.getElementById("reset-submit");

  resetForm.addEventListener("submit", async (event) => {
    event.preventDefault();
    clearAlert(alert);

    if (!resetForm.checkValidity()) {
      resetForm.reportValidity();
      return;
    }

    setBusy(submit, true, "Sending Link...");

    try {
      await sendPasswordResetEmail(auth, emailInput.value.trim());
      setAlert(alert, "Password reset instructions were sent to your email.", true);
      resetForm.reset();
    } catch (error) {
      setAlert(alert, friendlyAuthError(error));
    } finally {
      setBusy(submit, false);
    }
  });
}
