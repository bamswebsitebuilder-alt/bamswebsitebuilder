import { auth, db } from "./firebase-config.js";
import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";
import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const welcome = document.getElementById("portal-welcome");
const userName = document.getElementById("portal-user-name");
const userEmail = document.getElementById("portal-user-email");
const avatar = document.getElementById("portal-avatar");
const logout = document.getElementById("portal-logout");

const accountForm = document.getElementById("account-form");
const accountName = document.getElementById("account-name");
const accountEmail = document.getElementById("account-email");
const accountBusiness = document.getElementById("account-business");
const accountPhone = document.getElementById("account-phone");
const accountAlert = document.getElementById("account-alert");

let currentUser = null;

const showAccountStatus = (message, success = false) => {
  if (!accountAlert) return;
  accountAlert.hidden = false;
  accountAlert.textContent = message;
  accountAlert.classList.toggle("success-alert", success);
};

const loadProfile = async (user) => {
  const fallbackName = user.displayName || user.email?.split("@")[0] || "Client";
  let profile = {};

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (snapshot.exists()) {
      profile = snapshot.data();
    }
  } catch (error) {
    console.error("Unable to load profile:", error);
  }

  const displayName = profile.fullName || fallbackName;
  const email = profile.email || user.email || "";

  welcome.textContent = `Welcome back, ${displayName.split(" ")[0]}`;
  userName.textContent = displayName;
  userEmail.textContent = email;
  avatar.textContent = displayName.charAt(0).toUpperCase();

  accountName.value = displayName;
  accountEmail.value = email;
  accountBusiness.value = profile.businessName || "";
  accountPhone.value = profile.phone || "";

  const params = new URLSearchParams(window.location.search);
  if (params.get("registered") === "1") {
    showAccountStatus(
      "Your account was created. Check your email for the verification link.",
      true
    );
    window.history.replaceState({}, "", "client-portal.html");
  }
};

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const next = encodeURIComponent("client-portal.html");
    window.location.replace(`login.html?next=${next}`);
    return;
  }

  currentUser = user;

  try {
    await loadProfile(user);
  } catch (error) {
    console.error("Portal account loading failed:", error);

    const fallbackName =
      user.displayName ||
      user.email?.split("@")[0] ||
      "Client";

    welcome.textContent = `Welcome back, ${fallbackName.split(" ")[0]}`;
    userName.textContent = fallbackName;
    userEmail.textContent = user.email || "";
    avatar.textContent = fallbackName.charAt(0).toUpperCase();
  }
});

logout?.addEventListener("click", async (event) => {
  event.preventDefault();

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout failed:", error);
  }
});

accountForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) return;

  const fullName = accountName.value.trim();
  const businessName = accountBusiness.value.trim();
  const phone = accountPhone.value.trim();
  const submit = accountForm.querySelector('button[type="submit"]');

  submit.disabled = true;
  submit.textContent = "Saving...";
  accountAlert.hidden = true;

  try {
    await updateProfile(currentUser, { displayName: fullName });

    const nameParts = fullName.split(/\s+/);
    const firstName = nameParts.shift() || "";
    const lastName = nameParts.join(" ");

    await setDoc(
      doc(db, "users", currentUser.uid),
      {
        uid: currentUser.uid,
        firstName,
        lastName,
        fullName,
        businessName,
        phone,
        email: currentUser.email,
        role: "client",
        updatedAt: serverTimestamp()
      },
      { merge: true }
    );

    userName.textContent = fullName || "Client";
    welcome.textContent = `Welcome back, ${(fullName || "Client").split(" ")[0]}`;
    avatar.textContent = (fullName || "Client").charAt(0).toUpperCase();

    showAccountStatus("Your profile was updated.", true);
  } catch (error) {
    console.error("Profile update failed:", error);
    showAccountStatus("Your profile could not be updated. Please try again.");
  } finally {
    submit.disabled = false;
    submit.textContent = "Save Changes";
  }
});
