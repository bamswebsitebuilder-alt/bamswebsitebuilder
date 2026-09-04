import { auth } from "../js/firebase-config.js";
import {
  onAuthStateChanged,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const requestedRole = document.body.dataset.portalRole;
const isDashboard = document.body.dataset.portalView === "dashboard";
const form = document.getElementById("staff-login-form");
const alertBox = document.getElementById("staff-alert");
const logoutButton = document.getElementById("staff-logout");
const resetButton = document.getElementById("reset-password");
const roleEmails = {
  coach: new Set(["braionmoreland@gmail.com"]),
  admin: new Set(["braionmoreland@gmail.com"])
};

const roleDestination = role => role === "admin" ? "admin-dashboard" : "coach-dashboard";

function showAlert(message, type = "error") {
  if (!alertBox) return;
  alertBox.textContent = message;
  alertBox.className = `form-alert ${type}`;
  alertBox.hidden = false;
}

async function verifyRole(user) {
  const email = String(user.email || "").trim().toLowerCase();
  if (!roleEmails[requestedRole]?.has(email)) {
    await signOut(auth);
    throw new Error(`This account does not have ${requestedRole} access.`);
  }
  return requestedRole;
}

if (form) {
  form.addEventListener("submit", async event => {
    event.preventDefault();
    const submitButton = form.querySelector("button[type='submit']");
    submitButton.disabled = true;
    alertBox.hidden = true;
    try {
      const email = form.email.value.trim();
      const credential = await signInWithEmailAndPassword(auth, email, form.password.value);
      const role = await verifyRole(credential.user);
      window.location.assign(roleDestination(role));
    } catch (error) {
      const message = error.code === "auth/invalid-credential"
        ? "The email or password is incorrect."
        : error.code === "auth/too-many-requests"
          ? "Too many attempts. Please wait a few minutes and try again."
          : error.message || "Unable to sign in right now.";
      showAlert(message);
      submitButton.disabled = false;
    }
  });
}

if (resetButton) {
  resetButton.addEventListener("click", async () => {
    const email = form.email.value.trim();
    if (!email) return showAlert("Enter your email address first.");
    try {
      await sendPasswordResetEmail(auth, email);
      showAlert("Password reset instructions have been sent.", "success");
    } catch {
      showAlert("Unable to send a reset email. Check the address and try again.");
    }
  });
}

if (logoutButton) {
  logoutButton.addEventListener("click", async () => {
    await signOut(auth);
    window.location.assign(`${requestedRole}-login`);
  });
}

if (isDashboard) {
  onAuthStateChanged(auth, async user => {
    if (!user) return window.location.replace(`${requestedRole}-login`);
    try {
      await verifyRole(user);
      const accountLabel = document.getElementById("staff-account");
      if (accountLabel) accountLabel.textContent = user.email || `${requestedRole} account`;
      document.body.classList.add("authorized");
    } catch {
      window.location.replace(`${requestedRole}-login`);
    }
  });
}
