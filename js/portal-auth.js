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

/* =========================================================
   INVOICE ELEMENTS
========================================================= */

const invoicesPanel = document.getElementById("invoices");

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
let stopInvoiceListener = null;

/* =========================================================
   ACCOUNT STATUS
========================================================= */

const showAccountStatus = (message, success = false) => {
  if (!accountAlert) return;

  accountAlert.hidden = false;
  accountAlert.textContent = message;
  accountAlert.classList.toggle("success-alert", success);
};

/* =========================================================
   FILE UPLOAD STATUS
========================================================= */

const showUploadStatus = (message, success = false) => {
  if (!uploadStatus) return;

  uploadStatus.hidden = false;
  uploadStatus.textContent = message;
  uploadStatus.classList.toggle("success-alert", success);
};

const clearUploadStatus = () => {
  if (!uploadStatus) return;

  uploadStatus.hidden = true;
  uploadStatus.textContent = "";
  uploadStatus.classList.remove("success-alert");
};

/* =========================================================
   HELPERS
========================================================= */

const getFileExtension = (fileName) => {
  const parts = fileName.toLowerCase().split(".");
  return parts.length < 2 ? "" : parts.pop();
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

  return `${size.toFixed(unitIndex === 0 ? 0 : 1)} ${
    units[unitIndex]
  }`;
};

const formatUploadDate = (dateValue) => {
  if (!dateValue) return "";

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

const formatCurrency = (amount, currency = "USD") => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency || "USD"
  }).format(Number(amount) || 0);
};

const formatInvoiceDate = (value) => {
  if (!value) return "";

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "long",
    day: "numeric"
  });
};

const isSafePaymentLink = (value) => {
  if (!value) return false;

  try {
    const parsedUrl = new URL(value);

    return (
      parsedUrl.protocol === "https:" ||
      parsedUrl.protocol === "http:"
    );
  } catch {
    return false;
  }
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

  if (avatar) {
    avatar.textContent =
      displayName.charAt(0).toUpperCase();
  }

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
   INVOICE DISPLAY
========================================================= */

const createInvoiceEmptyState = (
  title = "No invoices available",
  message = "Invoices assigned to your account will appear here."
) => {
  if (!invoicesPanel) return;

  invoicesPanel.replaceChildren();

  const card = document.createElement("article");
  card.className =
    "portal-card portal-empty-state";

  const kicker = document.createElement("p");
  kicker.className = "card-kicker";
  kicker.textContent = "BILLING";

  const heading = document.createElement("h2");
  heading.textContent = title;

  const paragraph = document.createElement("p");
  paragraph.textContent = message;

  card.append(
    kicker,
    heading,
    paragraph
  );

  invoicesPanel.appendChild(card);
};

const createInvoiceBadge = (status) => {
  const normalizedStatus =
    String(status || "unpaid").toLowerCase();

  const badge = document.createElement("span");

  badge.className =
    normalizedStatus === "paid"
      ? "portal-invoice-status paid"
      : "portal-invoice-status unpaid";

  badge.textContent =
    normalizedStatus === "paid"
      ? "Paid"
      : "Payment Due";

  return badge;
};

const createInvoiceCard = (invoice) => {
  const status =
    String(invoice.status || "unpaid").toLowerCase();

  const isPaid = status === "paid";

  const card = document.createElement("article");
  card.className =
    "portal-card portal-invoice-card";

  const headingSection =
    document.createElement("div");

  headingSection.className =
    "card-heading";

  const headingInformation =
    document.createElement("div");

  const kicker =
    document.createElement("p");

  kicker.className = "card-kicker";
  kicker.textContent = "PAYPAL INVOICE";

  const title =
    document.createElement("h2");

  title.textContent =
    invoice.invoiceNumber ||
    "Invoice";

  headingInformation.append(
    kicker,
    title
  );

  const statusBadge =
    createInvoiceBadge(status);

  headingSection.append(
    headingInformation,
    statusBadge
  );

  const details =
    document.createElement("div");

  details.className =
    "portal-invoice-details";

  const amountBlock =
    document.createElement("div");

  amountBlock.className =
    "portal-invoice-detail";

  const amountLabel =
    document.createElement("span");

  amountLabel.textContent =
    isPaid
      ? "Amount Paid"
      : "Amount Due";

  const amountValue =
    document.createElement("strong");

  amountValue.textContent =
    formatCurrency(
      invoice.amount,
      invoice.currency
    );

  amountBlock.append(
    amountLabel,
    amountValue
  );

  const dueDateBlock =
    document.createElement("div");

  dueDateBlock.className =
    "portal-invoice-detail";

  const dueDateLabel =
    document.createElement("span");

  dueDateLabel.textContent =
    "Due Date";

  const dueDateValue =
    document.createElement("strong");

  dueDateValue.textContent =
    formatInvoiceDate(invoice.dueDate) ||
    "No due date";

  dueDateBlock.append(
    dueDateLabel,
    dueDateValue
  );

  details.append(
    amountBlock,
    dueDateBlock
  );

  card.append(
    headingSection,
    details
  );

  if (invoice.description) {
    const description =
      document.createElement("p");

    description.className =
      "portal-invoice-description";

    description.textContent =
      invoice.description;

    card.appendChild(description);
  }

  const actions =
    document.createElement("div");

  actions.className =
    "portal-actions";

  if (
    invoice.pdfUrl &&
    isSafePaymentLink(invoice.pdfUrl)
  ) {
    const paymentLink =
      document.createElement("a");

    paymentLink.className =
      isPaid
        ? "portal-secondary-button"
        : "portal-primary-button";

    paymentLink.href =
      invoice.pdfUrl;

    paymentLink.target =
      "_blank";

    paymentLink.rel =
      "noopener noreferrer";

    paymentLink.textContent =
      isPaid
        ? "View PayPal Invoice"
        : "View & Pay with PayPal";

    actions.appendChild(paymentLink);
  } else if (!isPaid) {
    const unavailableMessage =
      document.createElement("p");

    unavailableMessage.className =
      "portal-file-status";

    unavailableMessage.textContent =
      "A payment link has not been added to this invoice yet.";

    actions.appendChild(
      unavailableMessage
    );
  }

  if (isPaid) {
    const paidMessage =
      document.createElement("p");

    paidMessage.className =
      "portal-file-status";

    paidMessage.textContent =
      "This invoice has been marked as paid.";

    actions.appendChild(paidMessage);
  }

  card.appendChild(actions);

  return card;
};

const renderInvoices = (invoiceRecords) => {
  if (!invoicesPanel) return;

  if (!invoiceRecords.length) {
    createInvoiceEmptyState();
    return;
  }

  invoicesPanel.replaceChildren();

  const summaryCard =
    document.createElement("article");

  summaryCard.className =
    "portal-card";

  const summaryKicker =
    document.createElement("p");

  summaryKicker.className =
    "card-kicker";

  summaryKicker.textContent =
    "BILLING";

  const summaryTitle =
    document.createElement("h2");

  summaryTitle.textContent =
    "Your Invoices";

  const unpaidInvoices =
    invoiceRecords.filter(
      (invoice) =>
        String(
          invoice.status || "unpaid"
        ).toLowerCase() !== "paid"
    );

  const outstandingBalance =
    unpaidInvoices.reduce(
      (total, invoice) =>
        total +
        (Number(invoice.amount) || 0),
      0
    );

  const summaryParagraph =
    document.createElement("p");

  summaryParagraph.textContent =
    unpaidInvoices.length > 0
      ? `${unpaidInvoices.length} unpaid invoice${
          unpaidInvoices.length === 1
            ? ""
            : "s"
        } with an outstanding balance of ${formatCurrency(
          outstandingBalance
        )}.`
      : "All invoices are currently paid.";

  summaryCard.append(
    summaryKicker,
    summaryTitle,
    summaryParagraph
  );

  invoicesPanel.appendChild(
    summaryCard
  );

  invoiceRecords.forEach((invoice) => {
    invoicesPanel.appendChild(
      createInvoiceCard(invoice)
    );
  });
};

const watchClientInvoices = (user) => {
  if (!invoicesPanel) return;

  if (
    typeof stopInvoiceListener ===
    "function"
  ) {
    stopInvoiceListener();
  }

  createInvoiceEmptyState(
    "Loading invoices...",
    "Please wait while your billing information is loaded."
  );

  const invoicesReference =
    collection(
      db,
      "users",
      user.uid,
      "invoices"
    );

  const invoicesQuery =
    query(
      invoicesReference,
      orderBy("createdAt", "desc")
    );

  stopInvoiceListener =
    onSnapshot(
      invoicesQuery,

      (snapshot) => {
        const invoiceRecords =
          snapshot.docs.map(
            (invoiceDocument) => ({
              id: invoiceDocument.id,
              ...invoiceDocument.data()
            })
          );

        renderInvoices(
          invoiceRecords
        );
      },

      (error) => {
        console.error(
          "Unable to load client invoices:",
          error
        );

        createInvoiceEmptyState(
          "Invoices could not be loaded",
          "Please refresh the page or contact BAM's Website Builder for assistance."
        );
      }
    );
};

/* =========================================================
   FILE LIST
========================================================= */

const showFileListMessage = (message) => {
  if (!clientFileList) return;

  clientFileList.replaceChildren();

  const paragraph =
    document.createElement("p");

  paragraph.className =
    "portal-file-status";

  paragraph.textContent =
    message;

  clientFileList.appendChild(
    paragraph
  );
};

const createFileItem = ({
  name,
  url,
  size,
  uploadedDate
}) => {
  const item =
    document.createElement("div");

  item.className =
    "portal-file-item";

  const information =
    document.createElement("div");

  information.className =
    "portal-file-info";

  const fileName =
    document.createElement("strong");

  fileName.className =
    "portal-file-name";

  fileName.textContent =
    name;

  const details =
    document.createElement("span");

  details.className =
    "portal-file-details";

  const detailParts = [];

  if (size) {
    detailParts.push(size);
  }

  if (uploadedDate) {
    detailParts.push(uploadedDate);
  }

  details.textContent =
    detailParts.join(" • ");

  const downloadLink =
    document.createElement("a");

  downloadLink.className =
    "portal-secondary-button";

  downloadLink.href =
    url;

  downloadLink.target =
    "_blank";

  downloadLink.rel =
    "noopener noreferrer";

  downloadLink.textContent =
    "View File";

  information.appendChild(
    fileName
  );

  if (details.textContent) {
    information.appendChild(
      details
    );
  }

  item.append(
    information,
    downloadLink
  );

  return item;
};

const loadClientFiles = async (user) => {
  if (!clientFileList) return;

  showFileListMessage(
    "Checking for uploaded files..."
  );

  try {
    const uploadsFolder =
      ref(
        storage,
        `users/${user.uid}/uploads`
      );

    const result =
      await listAll(
        uploadsFolder
      );

    if (
      result.items.length === 0
    ) {
      showFileListMessage(
        "You have not uploaded any files yet."
      );

      return;
    }

    const fileRecords =
      await Promise.all(
        result.items.map(
          async (fileReference) => {
            try {
              const [url, metadata] =
                await Promise.all([
                  getDownloadURL(
                    fileReference
                  ),

                  getMetadata(
                    fileReference
                  )
                ]);

              return {
                name:
                  metadata
                    .customMetadata
                    ?.originalName ||
                  metadata.name ||
                  fileReference.name,

                url,

                size:
                  formatFileSize(
                    metadata.size
                  ),

                uploadedDate:
                  formatUploadDate(
                    metadata.timeCreated
                  ),

                timestamp:
                  new Date(
                    metadata.timeCreated
                  ).getTime() || 0
              };
            } catch (error) {
              console.error(
                "Unable to load file:",
                fileReference.fullPath,
                error
              );

              return null;
            }
          }
        )
      );

    const validFiles =
      fileRecords
        .filter(Boolean)
        .sort(
          (
            firstFile,
            secondFile
          ) => {
            return (
              secondFile.timestamp -
              firstFile.timestamp
            );
          }
        );

    if (
      validFiles.length === 0
    ) {
      showFileListMessage(
        "Your uploaded files could not be displayed."
      );

      return;
    }

    clientFileList.replaceChildren();

    validFiles.forEach(
      (fileRecord) => {
        clientFileList.appendChild(
          createFileItem(
            fileRecord
          )
        );
      }
    );
  } catch (error) {
    console.error(
      "Unable to list client files:",
      error
    );

    if (
      error.code ===
      "storage/unauthorized"
    ) {
      showFileListMessage(
        "You do not have permission to view these files."
      );
    } else if (
      error.code ===
      "storage/object-not-found"
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
   FILE SELECTION
========================================================= */

fileInput?.addEventListener(
  "change",
  () => {
    clearUploadStatus();

    selectedFile =
      fileInput.files?.[0] ||
      null;

    if (!selectedFile) {
      if (selectedFileName) {
        selectedFileName.textContent =
          "Choose File";
      }

      if (uploadButton) {
        uploadButton.disabled =
          true;
      }

      return;
    }

    const validation =
      validateFile(
        selectedFile
      );

    if (!validation.valid) {
      showUploadStatus(
        validation.message
      );

      if (selectedFileName) {
        selectedFileName.textContent =
          "Choose File";
      }

      if (uploadButton) {
        uploadButton.disabled =
          true;
      }

      fileInput.value = "";
      selectedFile = null;

      return;
    }

    if (selectedFileName) {
      selectedFileName.textContent =
        selectedFile.name;
    }

    if (uploadButton) {
      uploadButton.disabled =
        false;
    }
  }
);

/* =========================================================
   FILE UPLOAD
========================================================= */

uploadButton?.addEventListener(
  "click",
  () => {
    if (!currentUser) {
      showUploadStatus(
        "You must be signed in before uploading a file."
      );

      return;
    }

    const validation =
      validateFile(
        selectedFile
      );

    if (!validation.valid) {
      showUploadStatus(
        validation.message
      );

      return;
    }

    clearUploadStatus();

    uploadButton.disabled =
      true;

    uploadButton.textContent =
      "Uploading...";

    if (uploadProgress) {
      uploadProgress.hidden =
        false;

      uploadProgress.value =
        0;
    }

    const cleanFileName =
      sanitizeFileName(
        selectedFile.name
      ) || "client-file";

    const storageFileName =
      `${Date.now()}-${cleanFileName}`;

    const fileReference =
      ref(
        storage,
        `users/${currentUser.uid}/uploads/${storageFileName}`
      );

    const metadata = {
      contentType:
        selectedFile.type ||
        "application/octet-stream",

      customMetadata: {
        originalName:
          selectedFile.name,

        uploadedBy:
          currentUser.uid
      }
    };

    const uploadTask =
      uploadBytesResumable(
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
                (
                  snapshot.bytesTransferred /
                  snapshot.totalBytes
                ) * 100
              )
            : 0;

        if (uploadProgress) {
          uploadProgress.value =
            percentage;
        }

        showUploadStatus(
          `Uploading file: ${percentage}%`
        );
      },

      (error) => {
        console.error(
          "File upload failed:",
          error
        );

        if (
          error.code ===
          "storage/unauthorized"
        ) {
          showUploadStatus(
            "You do not have permission to upload this file."
          );
        } else if (
          error.code ===
          "storage/canceled"
        ) {
          showUploadStatus(
            "The file upload was canceled."
          );
        } else if (
          error.code ===
          "storage/retry-limit-exceeded"
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
          uploadButton.disabled =
            false;

          uploadButton.textContent =
            "Upload File";
        }

        if (uploadProgress) {
          uploadProgress.hidden =
            true;

          uploadProgress.value =
            0;
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
            fileInput.value =
              "";
          }

          if (selectedFileName) {
            selectedFileName.textContent =
              "Choose File";
          }

          selectedFile = null;

          await loadClientFiles(
            currentUser
          );
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
            uploadButton.disabled =
              true;

            uploadButton.textContent =
              "Upload File";
          }

          if (uploadProgress) {
            uploadProgress.hidden =
              true;

            uploadProgress.value =
              0;
          }
        }
      }
    );
  }
);

/* =========================================================
   AUTHENTICATION STATE
========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      if (
        typeof stopInvoiceListener ===
        "function"
      ) {
        stopInvoiceListener();
        stopInvoiceListener = null;
      }

      const next =
        encodeURIComponent(
          "client-portal.html"
        );

      window.location.replace(
        `login.html?next=${next}`
      );

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
          `Welcome back, ${
            fallbackName.split(" ")[0]
          }`;
      }

      if (userName) {
        userName.textContent =
          fallbackName;
      }

      if (userEmail) {
        userEmail.textContent =
          user.email || "";
      }

      if (avatar) {
        avatar.textContent =
          fallbackName
            .charAt(0)
            .toUpperCase();
      }
    }

    watchClientInvoices(user);

    await loadClientFiles(user);
  }
);

/* =========================================================
   LOGOUT
========================================================= */

logout?.addEventListener(
  "click",
  async (event) => {
    event.preventDefault();

    try {
      if (
        typeof stopInvoiceListener ===
        "function"
      ) {
        stopInvoiceListener();
        stopInvoiceListener =
          null;
      }

      await signOut(auth);

      window.location.replace(
        "login.html"
      );
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );
    }
  }
);

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
      accountName?.value.trim() ||
      "";

    const businessName =
      accountBusiness?.value.trim() ||
      "";

    const phone =
      accountPhone?.value.trim() ||
      "";

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
      submitButton.disabled =
        true;

      submitButton.textContent =
        "Saving...";
    }

    if (accountAlert) {
      accountAlert.hidden =
        true;
    }

    try {
      await updateProfile(
        currentUser,
        {
          displayName:
            fullName
        }
      );

      const nameParts =
        fullName.split(/\s+/);

      const firstName =
        nameParts.shift() ||
        "";

      const lastName =
        nameParts.join(" ");

      await setDoc(
        doc(
          db,
          "users",
          currentUser.uid
        ),
        {
          uid:
            currentUser.uid,

          firstName,

          lastName,

          fullName,

          businessName,

          phone,

          email:
            currentUser.email ||
            "",

          role:
            "client",

          updatedAt:
            serverTimestamp()
        },
        {
          merge: true
        }
      );

      if (userName) {
        userName.textContent =
          fullName;
      }

      if (welcome) {
        welcome.textContent =
          `Welcome back, ${
            firstName ||
            "Client"
          }`;
      }

      if (avatar) {
        avatar.textContent =
          fullName
            .charAt(0)
            .toUpperCase();
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
        submitButton.disabled =
          false;

        submitButton.textContent =
          "Save Changes";
      }
    }
  }
);