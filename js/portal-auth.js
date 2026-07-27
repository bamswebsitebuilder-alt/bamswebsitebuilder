import { auth, db, storage } from "./firebase-config.js";

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

import {
  getDownloadURL,
  getMetadata,
  listAll,
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

/* =========================================================
   PORTAL ACCOUNT ELEMENTS
========================================================= */

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

/* =========================================================
   FILE UPLOAD ELEMENTS
========================================================= */

const fileInput = document.getElementById("portal-file-input");
const selectedFileName = document.getElementById("selected-file-name");
const uploadButton = document.getElementById("upload-file-button");
const uploadProgress = document.getElementById("upload-progress");