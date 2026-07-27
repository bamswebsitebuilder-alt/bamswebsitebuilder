import { auth, db } from "./firebase-config.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  doc,
  getDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const adminLinks = document.querySelectorAll("[data-admin-link]");

const hideAdminLinks = () => {
  adminLinks.forEach((link) => {
    link.hidden = true;
  });
};

const showAdminLinks = () => {
  adminLinks.forEach((link) => {
    link.hidden = false;
  });
};

hideAdminLinks();

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    hideAdminLinks();
    return;
  }

  try {
    const userSnapshot = await getDoc(
      doc(db, "users", user.uid)
    );

    const profile = userSnapshot.exists()
      ? userSnapshot.data()
      : {};

    if (profile.role === "admin") {
      showAdminLinks();
    } else {
      hideAdminLinks();
    }
  } catch (error) {
    console.error("Unable to verify administrator access:", error);
    hideAdminLinks();
  }
});
