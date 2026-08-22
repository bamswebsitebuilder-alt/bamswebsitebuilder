import { auth, db, storage } from "./firebase-config.js";

import {
  onAuthStateChanged,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  getDownloadURL,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

const input = document.getElementById("profile-photo-input");
const button = document.getElementById("profile-photo-button");
const status = document.getElementById("profile-photo-status");
const targets = [
  document.getElementById("portal-avatar"),
  document.getElementById("profile-photo-preview"),
  document.getElementById("admin-profile-photo")
].filter(Boolean);

const MAX_SIZE = 5 * 1024 * 1024;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const spanish = document.documentElement.lang?.toLowerCase().startsWith("es");
let currentUser = null;

const copy = {
  choose: spanish ? "Cambiar foto" : "Change Photo",
  uploading: spanish ? "Subiendo…" : "Uploading…",
  success: spanish ? "Tu foto de perfil se actualizó." : "Your profile picture was updated.",
  invalidType: spanish ? "Elige una imagen JPG, PNG o WebP." : "Choose a JPG, PNG, or WebP image.",
  tooLarge: spanish ? "La imagen debe tener 5 MB o menos." : "The image must be 5 MB or smaller.",
  signedOut: spanish ? "Inicia sesión para cambiar tu foto." : "Sign in to change your picture.",
  failed: spanish ? "No se pudo actualizar la foto. Inténtalo de nuevo." : "The picture could not be updated. Please try again."
};

const showStatus = (message, success = false) => {
  if (!status) return;
  status.hidden = false;
  status.textContent = message;
  status.classList.toggle("success-alert", success);
  status.classList.toggle("error", !success);
};

const renderPhoto = (photoURL, displayName = "") => {
  const initial = (displayName || currentUser?.email || "A").trim().charAt(0).toUpperCase();

  targets.forEach((target) => {
    target.replaceChildren();
    target.classList.toggle("has-photo", Boolean(photoURL));

    if (photoURL) {
      const image = document.createElement("img");
      image.src = photoURL;
      image.alt = "";
      image.referrerPolicy = "no-referrer";
      target.appendChild(image);
    } else {
      target.textContent = initial;
    }
  });
};

const loadPhoto = async (user) => {
  let profile = {};

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    if (snapshot.exists()) profile = snapshot.data();
  } catch (error) {
    console.error("Unable to load profile picture:", error);
  }

  renderPhoto(profile.photoURL || user.photoURL || "", profile.fullName || user.displayName || "");
};

const resetButton = () => {
  if (!button) return;
  button.disabled = false;
  button.textContent = copy.choose;
};

button?.addEventListener("click", () => input?.click());

input?.addEventListener("change", () => {
  const file = input.files?.[0];
  if (!file) return;

  if (!currentUser) {
    showStatus(copy.signedOut);
    input.value = "";
    return;
  }

  if (!ALLOWED_TYPES.has(file.type)) {
    showStatus(copy.invalidType);
    input.value = "";
    return;
  }

  if (file.size > MAX_SIZE) {
    showStatus(copy.tooLarge);
    input.value = "";
    return;
  }

  button.disabled = true;
  button.textContent = copy.uploading;
  showStatus(copy.uploading);

  const extension = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const photoReference = ref(storage, `users/${currentUser.uid}/profile/avatar.${extension}`);
  const upload = uploadBytesResumable(photoReference, file, {
    contentType: file.type,
    cacheControl: "public,max-age=3600",
    customMetadata: { uploadedBy: currentUser.uid, purpose: "profile-picture" }
  });

  upload.on(
    "state_changed",
    (snapshot) => {
      const percent = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
      showStatus(`${copy.uploading.replace("…", "")} ${percent}%`);
    },
    (error) => {
      console.error("Profile picture upload failed:", error);
      showStatus(copy.failed);
      input.value = "";
      resetButton();
    },
    async () => {
      try {
        const photoURL = await getDownloadURL(upload.snapshot.ref);
        await Promise.all([
          updateProfile(currentUser, { photoURL }),
          setDoc(doc(db, "users", currentUser.uid), {
            photoURL,
            photoUpdatedAt: serverTimestamp(),
            updatedAt: serverTimestamp()
          }, { merge: true })
        ]);

        renderPhoto(photoURL, currentUser.displayName || "");
        showStatus(copy.success, true);
      } catch (error) {
        console.error("Profile picture save failed:", error);
        showStatus(copy.failed);
      } finally {
        input.value = "";
        resetButton();
      }
    }
  );
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) loadPhoto(user);
});
