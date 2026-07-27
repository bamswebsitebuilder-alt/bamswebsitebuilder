import { auth, db, storage } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  addDoc,
  collection,
  collectionGroup,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  Timestamp
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

const adminEmail = document.getElementById("admin-email");
const logoutButton = document.getElementById("admin-logout");

const navButtons = [...document.querySelectorAll(".admin-nav-button")];
const panels = [...document.querySelectorAll(".admin-panel")];
const quickButtons = [...document.querySelectorAll("[data-open-panel]")];

const clientForm = document.getElementById("client-form");
const clientFormStatus = document.getElementById("client-form-status");
const clientList = document.getElementById("client-list");

const invoiceForm = document.getElementById("invoice-form");
const invoiceFormStatus = document.getElementById("invoice-form-status");
const invoiceList = document.getElementById("invoice-list");

const adminFileForm = document.getElementById("admin-file-form");
const fileFormStatus = document.getElementById("file-form-status");
const uploadProgress = document.getElementById("admin-upload-progress");

const invoiceClientSelect = document.getElementById("invoice-client");
const fileClientSelect = document.getElementById("file-client");

const statClients = document.getElementById("stat-clients");
const statUnpaid = document.getElementById("stat-unpaid");
const statPaid = document.getElementById("stat-paid");
const statBalance = document.getElementById("stat-balance");

let currentAdmin = null;
let clientRecords = [];
let invoiceRecords = [];

const showStatus = (element, message, type = "") => {
  if (!element) return;
  element.hidden = false;
  element.textContent = message;
  element.className = `admin-status ${type}`.trim();
};

const hideStatus = (element) => {
  if (!element) return;
  element.hidden = true;
  element.textContent = "";
  element.className = "admin-status";
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(amount) || 0);
};

const formatDate = (value) => {
  if (!value) return "";

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const setActivePanel = (panelId) => {
  panels.forEach((panel) => {
    panel.classList.toggle("active", panel.id === panelId);
  });

  navButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.panel === panelId
    );
  });
};

navButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePanel(button.dataset.panel);
  });
});

quickButtons.forEach((button) => {
  button.addEventListener("click", () => {
    setActivePanel(button.dataset.openPanel);
  });
});

const buildClientOptions = () => {
  const options = [
    '<option value="">Choose a client</option>',
    ...clientRecords.map((client) => {
      const label =
        client.fullName ||
        client.email ||
        client.id;

      return `<option value="${client.id}">${label}</option>`;
    })
  ].join("");

  invoiceClientSelect.innerHTML = options;
  fileClientSelect.innerHTML = options;
};

const renderClients = () => {
  clientList.replaceChildren();

  if (clientRecords.length === 0) {
    clientList.innerHTML =
      '<p class="admin-status">No clients have been added yet.</p>';
    return;
  }

  clientRecords.forEach((client) => {
    const item = document.createElement("div");
    item.className = "admin-list-item";

    const info = document.createElement("div");
    info.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent =
      client.fullName ||
      client.email ||
      "Client";

    const meta = document.createElement("div");
    meta.className = "admin-list-meta";
    meta.textContent = [
      client.email,
      client.businessName,
      `UID: ${client.id}`
    ].filter(Boolean).join(" • ");

    info.append(title, meta);

    const badge = document.createElement("span");
    badge.className = "admin-badge";
    badge.textContent = client.role || "client";

    item.append(info, badge);
    clientList.appendChild(item);
  });
};

const renderInvoices = () => {
  invoiceList.replaceChildren();

  if (invoiceRecords.length === 0) {
    invoiceList.innerHTML =
      '<p class="admin-status">No invoices have been created yet.</p>';
    return;
  }

  invoiceRecords.forEach((invoice) => {
    const item = document.createElement("div");
    item.className = "admin-list-item";

    const info = document.createElement("div");
    info.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent =
      `${invoice.invoiceNumber || "Invoice"} — ${formatCurrency(invoice.amount)}`;

    const client = clientRecords.find(
      (record) => record.id === invoice.userId
    );

    const meta = document.createElement("div");
    meta.className = "admin-list-meta";
    meta.textContent = [
      client?.fullName || client?.email || invoice.userId,
      invoice.description,
      invoice.dueDate ? `Due ${formatDate(invoice.dueDate)}` : ""
    ].filter(Boolean).join(" • ");

    info.append(title, meta);

    const badge = document.createElement("span");
    badge.className =
      `admin-badge ${invoice.status === "paid" ? "paid" : ""}`;
    badge.textContent = invoice.status || "unpaid";

    item.append(info, badge);
    invoiceList.appendChild(item);
  });
};

const updateStats = () => {
  const unpaid = invoiceRecords.filter(
    (invoice) => invoice.status !== "paid"
  );

  const paid = invoiceRecords.filter(
    (invoice) => invoice.status === "paid"
  );

  const outstanding = unpaid.reduce(
    (total, invoice) => total + (Number(invoice.amount) || 0),
    0
  );

  statClients.textContent = String(clientRecords.length);
  statUnpaid.textContent = String(unpaid.length);
  statPaid.textContent = String(paid.length);
  statBalance.textContent = formatCurrency(outstanding);
};

const watchClients = () => {
  const clientsQuery = query(
    collection(db, "users"),
    orderBy("fullName")
  );

  return onSnapshot(
    clientsQuery,
    (snapshot) => {
      clientRecords = snapshot.docs
        .map((item) => ({
          id: item.id,
          ...item.data()
        }))
        .filter((record) => record.role !== "admin");

      renderClients();
      buildClientOptions();
      renderInvoices();
      updateStats();
    },
    (error) => {
      console.error("Unable to load clients:", error);
      clientList.innerHTML =
        '<p class="admin-status error">Clients could not be loaded.</p>';
    }
  );
};

const watchInvoices = () => {
  const invoicesQuery = query(
    collectionGroup(db, "invoices"),
    orderBy("createdAt", "desc")
  );

  return onSnapshot(
    invoicesQuery,
    (snapshot) => {
      invoiceRecords = snapshot.docs.map((item) => {
        const userId = item.ref.parent.parent?.id || "";

        return {
          id: item.id,
          userId,
          ...item.data()
        };
      });

      renderInvoices();
      updateStats();
    },
    (error) => {
      console.error("Unable to load invoices:", error);
      invoiceList.innerHTML =
        '<p class="admin-status error">Invoices could not be loaded.</p>';
    }
  );
};

clientForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus(clientFormStatus);

  const uid = document.getElementById("client-uid").value.trim();
  const fullName = document.getElementById("client-name").value.trim();
  const email = document.getElementById("client-email").value.trim();
  const businessName = document.getElementById("client-business").value.trim();
  const phone = document.getElementById("client-phone").value.trim();

  try {
    await setDoc(
      doc(db, "users", uid),
      {
        uid,
        fullName,
        email,
        businessName,
        phone,
        role: "client",
        updatedAt: serverTimestamp(),
        createdAt: serverTimestamp()
      },
      { merge: true }
    );

    clientForm.reset();
    showStatus(
      clientFormStatus,
      "Client profile saved successfully.",
      "success"
    );
  } catch (error) {
    console.error("Client save failed:", error);
    showStatus(
      clientFormStatus,
      "The client could not be saved.",
      "error"
    );
  }
});

invoiceForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus(invoiceFormStatus);

  const userId = invoiceClientSelect.value;
  const invoiceNumber =
    document.getElementById("invoice-number").value.trim();

  const amount =
    Number(document.getElementById("invoice-amount").value);

  const dueDateValue =
    document.getElementById("invoice-due-date").value;

  const description =
    document.getElementById("invoice-description").value.trim();

  const pdfUrl =
    document.getElementById("invoice-pdf-url").value.trim();

  try {
    await addDoc(
      collection(db, "users", userId, "invoices"),
      {
        invoiceNumber,
        amount,
        currency: "USD",
        dueDate: Timestamp.fromDate(
          new Date(`${dueDateValue}T12:00:00`)
        ),
        description,
        pdfUrl,
        status: "unpaid",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        createdBy: currentAdmin.uid
      }
    );

    invoiceForm.reset();
    showStatus(
      invoiceFormStatus,
      "Invoice created successfully.",
      "success"
    );
  } catch (error) {
    console.error("Invoice creation failed:", error);
    showStatus(
      invoiceFormStatus,
      "The invoice could not be created.",
      "error"
    );
  }
});

adminFileForm?.addEventListener("submit", (event) => {
  event.preventDefault();
  hideStatus(fileFormStatus);

  const userId = fileClientSelect.value;
  const fileInput = document.getElementById("admin-file-input");
  const file = fileInput.files?.[0];

  if (!userId || !file) {
    showStatus(
      fileFormStatus,
      "Choose a client and a file.",
      "error"
    );
    return;
  }

  if (file.size > 15 * 1024 * 1024) {
    showStatus(
      fileFormStatus,
      "The file must be 15 MB or smaller.",
      "error"
    );
    return;
  }

  const cleanName = file.name
    .trim()
    .replace(/\s+/g, "-")
    .replace(/[^a-zA-Z0-9._-]/g, "");

  const storageRef = ref(
    storage,
    `users/${userId}/uploads/${Date.now()}-${cleanName}`
  );

  const uploadTask = uploadBytesResumable(
    storageRef,
    file,
    {
      contentType: file.type || "application/octet-stream",
      customMetadata: {
        originalName: file.name,
        uploadedBy: currentAdmin.uid,
        uploadedFor: userId
      }
    }
  );

  uploadProgress.hidden = false;
  uploadProgress.value = 0;

  uploadTask.on(
    "state_changed",
    (snapshot) => {
      uploadProgress.value = Math.round(
        (snapshot.bytesTransferred / snapshot.totalBytes) * 100
      );
    },
    (error) => {
      console.error("Admin upload failed:", error);
      uploadProgress.hidden = true;
      showStatus(
        fileFormStatus,
        "The file could not be uploaded.",
        "error"
      );
    },
    () => {
      adminFileForm.reset();
      uploadProgress.hidden = true;
      showStatus(
        fileFormStatus,
        "File uploaded to the client's portal.",
        "success"
      );
    }
  );
});

logoutButton?.addEventListener("click", async () => {
  await signOut(auth);
  window.location.replace("login.html");
});

onAuthStateChanged(auth, async (user) => {
  if (!user) {
    window.location.replace(
      `login.html?next=${encodeURIComponent("admin-dashboard.html")}`
    );
    return;
  }

  try {
    const snapshot = await getDoc(doc(db, "users", user.uid));
    const profile = snapshot.exists() ? snapshot.data() : {};

    if (profile.role !== "admin") {
      window.location.replace("client-portal.html");
      return;
    }

    currentAdmin = user;
    adminEmail.textContent = user.email || "Administrator";

    watchClients();
    watchInvoices();
  } catch (error) {
    console.error("Admin verification failed:", error);
    window.location.replace("client-portal.html");
  }
});
