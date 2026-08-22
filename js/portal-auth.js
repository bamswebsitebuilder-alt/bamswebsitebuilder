import { auth, db, storage } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut,
  updateProfile
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
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
const uploadStatus = document.getElementById("upload-status");
const clientFileList = document.getElementById("client-file-list");
const clientInvoiceList = document.getElementById("client-invoice-list");
const portalDashboardProject = document.getElementById("portal-dashboard-project");
const portalProjectDetails = document.getElementById("portal-project-details");

/* =========================================================
   SETTINGS
========================================================= */

const MAX_FILE_SIZE = 15 * 1024 * 1024;

const allowedExtensions = [
  "jpg",
  "jpeg",
  "png",
  "webp",
  "gif",
  "pdf",
  "doc",
  "docx",
  "txt",
  "zip"
];

let currentUser = null;
let selectedFile = null;

/* =========================================================
   ACCOUNT STATUS
========================================================= */

const showAccountStatus = (message, success = false) => {
  if (!accountAlert) {
    return;
  }

  accountAlert.hidden = false;
  accountAlert.textContent = message;
  accountAlert.classList.toggle("success-alert", success);
};

/* =========================================================
   FILE UPLOAD STATUS
========================================================= */

const showUploadStatus = (message, success = false) => {
  if (!uploadStatus) {
    return;
  }

  uploadStatus.hidden = false;
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle("success-alert", success);
};

const clearUploadStatus = () => {
  if (!uploadStatus) {
    return;
  }

  uploadStatus.hidden = true;
  uploadStatus.textContent = "";
  uploadStatus.classList.remove("success-alert");
};

/* =========================================================
   HELPERS
========================================================= */

const getFileExtension = (fileName) => {
  const parts = fileName.toLowerCase().split(".");

  if (parts.length < 2) {
    return "";
  }

  return parts.pop();
};

const sanitizeFileName = (fileName) => {
  return fileName
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "")
    .replace(/-+/g, "-");
};

const formatFileSize = (bytes) => {
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return "Unknown size";
  }

  const units = ["B", "KB", "MB", "GB"];
  const unitIndex = Math.min(
    Math.floor(Math.log(bytes) / Math.log(1024)),
    units.length - 1
  );

  const size = bytes / Math.pow(1024, unitIndex);

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${units[unitIndex]}`;
};

const formatUploadDate = (dateValue) => {
  if (!dateValue) {
    return "";
  }

  const date = new Date(dateValue);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const validateFile = (file) => {
  if (!file) {
    return {
      valid: false,
      message: "Please choose a file."
    };
  }

  if (file.size > MAX_FILE_SIZE) {
    return {
      valid: false,
      message: "This file is larger than the 15 MB limit."
    };
  }

  const extension = getFileExtension(file.name);

  if (!allowedExtensions.includes(extension)) {
    return {
      valid: false,
      message:
        "This file type is not allowed. Please upload an image, PDF, Word document, text file, or ZIP file."
    };
  }

  return {
    valid: true,
    message: ""
  };
};

const renderAvatar = (photoURL, displayName) => {
  if (!avatar) return;
  avatar.replaceChildren();
  avatar.classList.toggle("has-photo", Boolean(photoURL));

  if (photoURL) {
    const image = document.createElement("img");
    image.src = photoURL;
    image.alt = "";
    image.referrerPolicy = "no-referrer";
    avatar.appendChild(image);
  } else {
    avatar.textContent = (displayName || "Client").charAt(0).toUpperCase();
  }
};

/* =========================================================
   PROFILE LOADING
========================================================= */

const loadProfile = async (user) => {
  const fallbackName =
    user.displayName ||
    user.email?.split("@")[0] ||
    "Client";

  let profile = {};

  try {
    const userDocument = doc(db, "users", user.uid);
    const snapshot = await getDoc(userDocument);

    if (snapshot.exists()) {
      profile = snapshot.data();
    }
  } catch (error) {
    console.error("Unable to load profile:", error);
  }

  const displayName =
    profile.fullName ||
    fallbackName;

  const email =
    profile.email ||
    user.email ||
    "";

  if (welcome) {
    welcome.textContent =
      `Welcome back, ${displayName.split(" ")[0]}`;
  }

  if (userName) {
    userName.textContent = displayName;
  }

  if (userEmail) {
    userEmail.textContent = email;
  }

  renderAvatar(profile.photoDataUrl || profile.photoURL || user.photoURL || "", displayName);

  if (accountName) {
    accountName.value = displayName;
  }

  if (accountEmail) {
    accountEmail.value = email;
  }

  if (accountBusiness) {
    accountBusiness.value =
      profile.businessName || "";
  }

  if (accountPhone) {
    accountPhone.value =
      profile.phone || "";
  }

  const params =
    new URLSearchParams(window.location.search);

  if (params.get("registered") === "1") {
    showAccountStatus(
      "Your account was created. Check your email for the verification link.",
      true
    );

    window.history.replaceState(
      {},
      "",
      "client-portal.html"
    );
  }
};

/* =========================================================
   FILE LIST
========================================================= */

const showFileListMessage = (message) => {
  if (!clientFileList) {
    return;
  }

  clientFileList.replaceChildren();

  const paragraph = document.createElement("p");
  paragraph.className = "portal-file-status";
  paragraph.textContent = message;

  clientFileList.appendChild(paragraph);
};

const createFileItem = ({
  name,
  url,
  size,
  uploadedDate
}) => {
  const item = document.createElement("div");
  item.className = "portal-file-item";

  const information = document.createElement("div");
  information.className = "portal-file-info";

  const fileName = document.createElement("strong");
  fileName.className = "portal-file-name";
  fileName.textContent = name;

  const details = document.createElement("span");
  details.className = "portal-file-details";

  const detailParts = [];

  if (size) {
    detailParts.push(size);
  }

  if (uploadedDate) {
    detailParts.push(uploadedDate);
  }

  details.textContent = detailParts.join(" • ");

  const downloadLink = document.createElement("a");
  downloadLink.className = "portal-secondary-button";
  downloadLink.href = url;
  downloadLink.target = "_blank";
  downloadLink.rel = "noopener noreferrer";
  downloadLink.textContent = "View File";

  information.appendChild(fileName);

  if (details.textContent) {
    information.appendChild(details);
  }

  item.appendChild(information);
  item.appendChild(downloadLink);

  return item;
};

const loadClientFiles = async (user) => {
  if (!clientFileList) {
    return;
  }

  showFileListMessage("Checking for uploaded files...");

  try {
    const uploadsFolder = ref(
      storage,
      `users/${user.uid}/uploads`
    );

    const result = await listAll(uploadsFolder);

    if (result.items.length === 0) {
      showFileListMessage(
        "You have not uploaded any files yet."
      );

      return;
    }

    const fileRecords = await Promise.all(
      result.items.map(async (fileReference) => {
        try {
          const [url, metadata] = await Promise.all([
            getDownloadURL(fileReference),
            getMetadata(fileReference)
          ]);

          if (metadata.customMetadata?.purpose === "profile-picture") {
            return null;
          }

          return {
            name:
              metadata.customMetadata?.originalName ||
              metadata.name ||
              fileReference.name,
            url,
            size: formatFileSize(metadata.size),
            uploadedDate: formatUploadDate(
              metadata.timeCreated
            ),
            timestamp:
              new Date(metadata.timeCreated).getTime() || 0
          };
        } catch (error) {
          console.error(
            "Unable to load file:",
            fileReference.fullPath,
            error
          );

          return null;
        }
      })
    );

    const validFiles = fileRecords
      .filter(Boolean)
      .sort((firstFile, secondFile) => {
        return secondFile.timestamp - firstFile.timestamp;
      });

    if (validFiles.length === 0) {
      showFileListMessage(
        "You have not uploaded any project files yet."
      );

      return;
    }

    clientFileList.replaceChildren();

    validFiles.forEach((fileRecord) => {
      clientFileList.appendChild(
        createFileItem(fileRecord)
      );
    });
  } catch (error) {
    console.error("Unable to list client files:", error);

    if (error.code === "storage/unauthorized") {
      showFileListMessage(
        "You do not have permission to view these files."
      );
    } else if (
      error.code === "storage/object-not-found"
    ) {
      showFileListMessage(
        "You have not uploaded any files yet."
      );
    } else {
      showFileListMessage(
        "Your files could not be loaded. Please refresh the page."
      );
    }
  }
};


/* =========================================================
   CLIENT INVOICES
========================================================= */

const formatInvoiceCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  }).format(Number(amount) || 0);
};

const formatInvoiceDate = (value) => {
  if (!value) return "";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "short", day: "numeric" });
};

const renderClientInvoices = (records) => {
  if (!clientInvoiceList) return;
  clientInvoiceList.replaceChildren();

  if (!records.length) {
    const empty = document.createElement("p");
    empty.className = "portal-file-status";
    empty.textContent = "No invoices have been assigned to your account yet.";
    clientInvoiceList.appendChild(empty);
    return;
  }

  records.forEach((invoice) => {
    const item = document.createElement("div");
    item.className = "portal-file-item";

    const info = document.createElement("div");
    info.className = "portal-file-info";

    const title = document.createElement("strong");
    title.className = "portal-file-name";
    title.textContent = `${invoice.invoiceNumber || "Invoice"} — ${formatInvoiceCurrency(invoice.amount, invoice.currency)}`;

    const details = document.createElement("span");
    details.className = "portal-file-details";
    details.textContent = [
      invoice.description || "",
      invoice.dueDate ? `Due ${formatInvoiceDate(invoice.dueDate)}` : "",
      `Status: ${String(invoice.status || "unpaid").toUpperCase()}`
    ].filter(Boolean).join(" • ");

    info.append(title, details);
    item.appendChild(info);

    if (invoice.pdfUrl) {
      const link = document.createElement("a");
      link.className = "portal-secondary-button";
      link.href = invoice.pdfUrl;
      link.target = "_blank";
      link.rel = "noopener noreferrer";
      link.textContent = "View Invoice";
      item.appendChild(link);
    }

    clientInvoiceList.appendChild(item);
  });
};

const watchClientInvoices = (user) => {
  if (!clientInvoiceList) return () => {};

  const invoicesQuery = query(
    collection(db, "users", user.uid, "invoices"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    invoicesQuery,
    (snapshot) => {
      renderClientInvoices(snapshot.docs.map((item) => ({ id: item.id, ...item.data() })));
    },
    (error) => {
      console.error("Unable to load client invoices:", error);
      clientInvoiceList.innerHTML = '<p class="portal-file-status">Invoices could not be loaded. Please refresh the page.</p>';
    }
  );
};


/* =========================================================
   LIVE PROJECT TRACKER
========================================================= */
const PROJECT_STAGES = ["Planning", "Design", "Development", "Review", "Launch", "Maintenance", "Completed"];

const escapeText = (value) => String(value ?? "");

const projectDate = (value) => {
  if (!value) return "Not set";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "Not set";
  return date.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
};

const makeTaskList = (tasks, emptyMessage) => {
  const list = document.createElement("ul");
  list.className = "checklist";
  const clean = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  if (!clean.length) {
    const item = document.createElement("li");
    item.textContent = emptyMessage;
    list.appendChild(item);
    return list;
  }
  clean.forEach((task) => {
    const item = document.createElement("li");
    item.className = "complete";
    item.textContent = escapeText(task);
    list.appendChild(item);
  });
  return list;
};

const makeUpcomingList = (tasks) => {
  const list = document.createElement("ul");
  list.className = "checklist";
  const clean = Array.isArray(tasks) ? tasks.filter(Boolean) : [];
  if (!clean.length) {
    const item = document.createElement("li");
    item.textContent = "No upcoming tasks have been added.";
    list.appendChild(item);
    return list;
  }
  clean.forEach((task, index) => {
    const item = document.createElement("li");
    if (index === 0) item.className = "current";
    item.textContent = escapeText(task);
    list.appendChild(item);
  });
  return list;
};

const renderNoProject = () => {
  const html = '<article class="portal-card portal-empty-state"><p class="card-kicker">MY PROJECT</p><h2>No project assigned</h2><p>Your project details and timeline will appear here after BAM\'s Website Builder assigns a project.</p></article>';
  if (portalDashboardProject) portalDashboardProject.innerHTML = html;
  if (portalProjectDetails) portalProjectDetails.innerHTML = html;
};

const buildProjectCard = (project, compact = false) => {
  const card = document.createElement("article");
  card.className = "portal-card portal-project-summary";
  const top = document.createElement("div");
  top.className = "portal-project-title-row";
  const heading = document.createElement("div");
  const kicker = document.createElement("p"); kicker.className = "card-kicker"; kicker.textContent = compact ? "WEBSITE PROGRESS" : "MY WEBSITE PROJECT";
  const title = document.createElement("h2"); title.textContent = project.title || "Website Project";
  const meta = document.createElement("p"); meta.className = "portal-project-meta"; meta.textContent = `${project.status || "In Progress"} • Current stage: ${project.stage || "Planning"}`;
  heading.append(kicker, title, meta);
  const percent = document.createElement("div"); percent.className = "portal-progress-number"; percent.textContent = `${Math.max(0, Math.min(100, Number(project.progress) || 0))}%`;
  top.append(heading, percent);
  const track = document.createElement("div"); track.className = "progress-track";
  const fill = document.createElement("span"); fill.style.width = `${Math.max(0, Math.min(100, Number(project.progress) || 0))}%`; track.appendChild(fill);
  card.append(top, track);
  const labels = document.createElement("div"); labels.className = "progress-labels";
  const left = document.createElement("span"); left.textContent = project.stage || "Planning";
  const right = document.createElement("strong"); right.textContent = `Estimated completion: ${projectDate(project.estimatedCompletion)}`;
  labels.append(left, right); card.appendChild(labels);
  if (compact) {
    const update = document.createElement("div"); update.className = "portal-project-update"; update.textContent = project.currentUpdate || "Your project is active. More details will be added soon."; card.appendChild(update);
    const actions = document.createElement("div"); actions.className = "portal-actions";
    const button = document.createElement("button"); button.type = "button"; button.className = "portal-primary-button"; button.textContent = "View Full Project";
    button.addEventListener("click", () => document.querySelector('.portal-nav-link[data-panel="project"]')?.click()); actions.appendChild(button); card.appendChild(actions);
    return card;
  }
  const stageGrid = document.createElement("div"); stageGrid.className = "portal-stage-grid";
  const currentIndex = Math.max(0, PROJECT_STAGES.indexOf(project.stage));
  PROJECT_STAGES.forEach((stage, index) => { const node = document.createElement("div"); node.className = "portal-stage"; if (index < currentIndex) node.classList.add("complete"); if (index === currentIndex) node.classList.add("current"); node.textContent = stage; stageGrid.appendChild(node); });
  card.appendChild(stageGrid);
  const update = document.createElement("div"); update.className = "portal-project-update"; update.textContent = project.currentUpdate || "No current update has been posted."; card.appendChild(update);
  const columns = document.createElement("div"); columns.className = "portal-project-columns";
  const completed = document.createElement("section"); completed.className = "portal-project-box"; const ch = document.createElement("h3"); ch.textContent = "Completed"; completed.append(ch, makeTaskList(project.completedTasks, "No completed tasks have been added."));
  const upcoming = document.createElement("section"); upcoming.className = "portal-project-box"; const uh = document.createElement("h3"); uh.textContent = "Coming Next"; upcoming.append(uh, makeUpcomingList(project.upcomingTasks));
  columns.append(completed, upcoming); card.appendChild(columns);
  const dates = document.createElement("p"); dates.className = "portal-project-meta"; dates.textContent = `Start date: ${projectDate(project.startDate)} • Last updated: ${projectDate(project.updatedAt)}`; card.appendChild(dates);
  if (project.liveUrl) { const a = document.createElement("a"); a.className = "portal-primary-button portal-project-link"; a.href = project.liveUrl; a.target = "_blank"; a.rel = "noopener noreferrer"; a.textContent = project.status === "Completed" ? "Visit Your Live Website" : "View Website Preview"; card.appendChild(a); }
  return card;
};

const watchClientProject = (user) => onSnapshot(
  doc(db, "users", user.uid, "projects", "current"),
  (snapshot) => {
    if (!snapshot.exists()) { renderNoProject(); return; }
    const project = { id: snapshot.id, ...snapshot.data() };
    if (portalDashboardProject) { portalDashboardProject.replaceChildren(buildProjectCard(project, true)); }
    if (portalProjectDetails) { portalProjectDetails.replaceChildren(buildProjectCard(project, false)); }
  },
  (error) => {
    console.error("Unable to load project:", error);
    const message = '<article class="portal-card portal-empty-state"><p class="card-kicker">MY PROJECT</p><h2>Project could not be loaded</h2><p>Please refresh the page or contact support.</p></article>';
    if (portalDashboardProject) portalDashboardProject.innerHTML = message;
    if (portalProjectDetails) portalProjectDetails.innerHTML = message;
  }
);

/* =========================================================
   FILE SELECTION
========================================================= */

fileInput?.addEventListener("change", () => {
  clearUploadStatus();

  selectedFile = fileInput.files?.[0] || null;

  if (!selectedFile) {
    if (selectedFileName) {
      selectedFileName.textContent = "Choose File";
    }

    if (uploadButton) {
      uploadButton.disabled = true;
    }

    return;
  }

  const validation = validateFile(selectedFile);

  if (!validation.valid) {
    showUploadStatus(validation.message);

    if (selectedFileName) {
      selectedFileName.textContent = "Choose File";
    }

    if (uploadButton) {
      uploadButton.disabled = true;
    }

    fileInput.value = "";
    selectedFile = null;

    return;
  }

  if (selectedFileName) {
    selectedFileName.textContent = selectedFile.name;
  }

  if (uploadButton) {
    uploadButton.disabled = false;
  }
});

/* =========================================================
   FILE UPLOAD
========================================================= */

uploadButton?.addEventListener("click", () => {
  if (!currentUser) {
    showUploadStatus(
      "You must be signed in before uploading a file."
    );

    return;
  }

  const validation = validateFile(selectedFile);

  if (!validation.valid) {
    showUploadStatus(validation.message);
    return;
  }

  clearUploadStatus();

  uploadButton.disabled = true;
  uploadButton.textContent = "Uploading...";

  if (uploadProgress) {
    uploadProgress.hidden = false;
    uploadProgress.value = 0;
  }

  const cleanFileName =
    sanitizeFileName(selectedFile.name) || "client-file";

  const storageFileName =
    `${Date.now()}-${cleanFileName}`;

  const fileReference = ref(
    storage,
    `users/${currentUser.uid}/uploads/${storageFileName}`
  );

  const metadata = {
    contentType:
      selectedFile.type ||
      "application/octet-stream",

    customMetadata: {
      originalName: selectedFile.name,
      uploadedBy: currentUser.uid
    }
  };

  const uploadTask = uploadBytesResumable(
    fileReference,
    selectedFile,
    metadata
  );

  uploadTask.on(
    "state_changed",

    (snapshot) => {
      const percentage =
        snapshot.totalBytes > 0
          ? Math.round(
              (snapshot.bytesTransferred /
                snapshot.totalBytes) *
                100
            )
          : 0;

      if (uploadProgress) {
        uploadProgress.value = percentage;
      }

      showUploadStatus(
        `Uploading file: ${percentage}%`
      );
    },

    (error) => {
      console.error("File upload failed:", error);

      if (error.code === "storage/unauthorized") {
        showUploadStatus(
          "You do not have permission to upload this file."
        );
      } else if (
        error.code === "storage/canceled"
      ) {
        showUploadStatus(
          "The file upload was canceled."
        );
      } else if (
        error.code === "storage/retry-limit-exceeded"
      ) {
        showUploadStatus(
          "The upload took too long. Please check your internet connection and try again."
        );
      } else {
        showUploadStatus(
          "Your file could not be uploaded. Please try again."
        );
      }

      if (uploadButton) {
        uploadButton.disabled = false;
        uploadButton.textContent = "Upload File";
      }

      if (uploadProgress) {
        uploadProgress.hidden = true;
        uploadProgress.value = 0;
      }
    },

    async () => {
      try {
        await getDownloadURL(
          uploadTask.snapshot.ref
        );

        showUploadStatus(
          "Your file was uploaded successfully.",
          true
        );

        if (fileInput) {
          fileInput.value = "";
        }

        if (selectedFileName) {
          selectedFileName.textContent = "Choose File";
        }

        selectedFile = null;

        await loadClientFiles(currentUser);
      } catch (error) {
        console.error(
          "Unable to finish file upload:",
          error
        );

        showUploadStatus(
          "The file uploaded, but it could not be added to the file list. Refresh the page."
        );
      } finally {
        if (uploadButton) {
          uploadButton.disabled = true;
          uploadButton.textContent = "Upload File";
        }

        if (uploadProgress) {
          uploadProgress.hidden = true;
          uploadProgress.value = 0;
        }
      }
    }
  );
});

/* =========================================================
   AUTHENTICATION STATE
========================================================= */

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    const next = encodeURIComponent(
      "client-portal.html"
    );

    window.location.replace(
      `login.html?next=${next}`
    );

    return;
  }

  if (!user.emailVerified) {
    await signOut(auth);
    window.location.replace("login.html?verify=1");
    return;
  }

  currentUser = user;

  try {
    await loadProfile(user);
  } catch (error) {
    console.error(
      "Portal account loading failed:",
      error
    );

    const fallbackName =
      user.displayName ||
      user.email?.split("@")[0] ||
      "Client";

    if (welcome) {
      welcome.textContent =
        `Welcome back, ${fallbackName.split(" ")[0]}`;
    }

    if (userName) {
      userName.textContent = fallbackName;
    }

    if (userEmail) {
      userEmail.textContent =
        user.email || "";
    }

    if (avatar && !avatar.classList.contains("has-photo")) {
      avatar.textContent =
        fallbackName.charAt(0).toUpperCase();
    }
  }

  await loadClientFiles(user);
  watchClientInvoices(user);
  watchClientProject(user);
});

/* =========================================================
   LOGOUT
========================================================= */

logout?.addEventListener("click", async (event) => {
  event.preventDefault();

  try {
    await signOut(auth);
    window.location.replace("login.html");
  } catch (error) {
    console.error("Logout failed:", error);
  }
});

/* =========================================================
   ACCOUNT PROFILE UPDATE
========================================================= */

accountForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    if (!currentUser) {
      showAccountStatus(
        "You must be signed in to update your profile."
      );

      return;
    }

    const fullName =
      accountName?.value.trim() || "";

    const businessName =
      accountBusiness?.value.trim() || "";

    const phone =
      accountPhone?.value.trim() || "";

    const submitButton =
      accountForm.querySelector(
        'button[type="submit"]'
      );

    if (!fullName) {
      showAccountStatus(
        "Please enter your full name."
      );

      accountName?.focus();
      return;
    }

    if (submitButton) {
      submitButton.disabled = true;
      submitButton.textContent = "Saving...";
    }

    if (accountAlert) {
      accountAlert.hidden = true;
    }

    try {
      await updateProfile(currentUser, {
        displayName: fullName
      });

      const nameParts =
        fullName.split(/\s+/);

      const firstName =
        nameParts.shift() || "";

      const lastName =
        nameParts.join(" ");

      await setDoc(
        doc(db, "users", currentUser.uid),
        {
          uid: currentUser.uid,
          firstName,
          lastName,
          fullName,
          businessName,
          phone,
          email: currentUser.email || "",
          role: "client",
          updatedAt: serverTimestamp()
        },
        {
          merge: true
        }
      );

      if (userName) {
        userName.textContent = fullName;
      }

      if (welcome) {
        welcome.textContent =
          `Welcome back, ${firstName || "Client"}`;
      }

      if (avatar && !avatar.classList.contains("has-photo")) {
        avatar.textContent =
          fullName.charAt(0).toUpperCase();
      }

      showAccountStatus(
        "Your profile was updated.",
        true
      );
    } catch (error) {
      console.error(
        "Profile update failed:",
        error
      );

      showAccountStatus(
        "Your profile could not be updated. Please try again."
      );
    } finally {
      if (submitButton) {
        submitButton.disabled = false;
        submitButton.textContent =
          "Save Changes";
      }
    }
  }
);
