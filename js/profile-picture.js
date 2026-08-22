import { auth, db } from "./firebase-config.js";

import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  doc,
  getDoc,
  serverTimestamp,
  setDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

const input = document.getElementById("profile-photo-input");
const button = document.getElementById("profile-photo-button");
const status = document.getElementById("profile-photo-status");
const targets = [
  document.getElementById("portal-avatar"),
  document.getElementById("profile-photo-preview"),
  document.getElementById("admin-profile-photo")
].filter(Boolean);

const MAX_SIZE = 20 * 1024 * 1024;
const OUTPUT_SIZE = 512;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
const spanish = document.documentElement.lang?.toLowerCase().startsWith("es");
let currentUser = null;

const copy = {
  choose: spanish ? "Cambiar foto" : "Change Photo",
  uploading: spanish ? "Preparando foto…" : "Preparing photo…",
  success: spanish ? "Tu foto de perfil se actualizó." : "Your profile picture was updated.",
  invalidType: spanish ? "Elige una imagen JPG, PNG o WebP." : "Choose a JPG, PNG, or WebP image.",
  tooLarge: spanish ? "La imagen debe tener 20 MB o menos." : "The image must be 20 MB or smaller.",
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

  renderPhoto(
    profile.photoDataUrl || profile.photoURL || user.photoURL || "",
    profile.fullName || user.displayName || ""
  );
};

const loadImage = (file) => {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);

    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };

    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error("The selected image could not be read."));
    };

    image.src = objectUrl;
  });
};

const optimizePhoto = async (file) => {
  const image = await loadImage(file);
  const sourceSize = Math.min(image.naturalWidth, image.naturalHeight);
  const sourceX = Math.max(0, (image.naturalWidth - sourceSize) / 2);
  const sourceY = Math.max(0, (image.naturalHeight - sourceSize) / 2);
  const canvas = document.createElement("canvas");
  canvas.width = OUTPUT_SIZE;
  canvas.height = OUTPUT_SIZE;

  const context = canvas.getContext("2d", { alpha: false });
  if (!context) throw new Error("Image processing is unavailable.");

  context.fillStyle = "#ffffff";
  context.fillRect(0, 0, OUTPUT_SIZE, OUTPUT_SIZE);
  context.drawImage(
    image,
    sourceX,
    sourceY,
    sourceSize,
    sourceSize,
    0,
    0,
    OUTPUT_SIZE,
    OUTPUT_SIZE
  );

  return canvas.toDataURL("image/jpeg", 0.84);
};

const resetButton = () => {
  if (!button) return;
  button.disabled = false;
  button.textContent = copy.choose;
};

button?.addEventListener("click", () => input?.click());

input?.addEventListener("change", async () => {
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

  try {
    const photoDataUrl = await optimizePhoto(file);

    await setDoc(doc(db, "users", currentUser.uid), {
      photoDataUrl,
      photoUpdatedAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });

    renderPhoto(photoDataUrl, currentUser.displayName || "");
    showStatus(copy.success, true);
  } catch (error) {
    console.error("Profile picture save failed:", error);
    showStatus(copy.failed);
  } finally {
    input.value = "";
    resetButton();
  }
});

onAuthStateChanged(auth, (user) => {
  currentUser = user;
  if (user) loadPhoto(user);
});
