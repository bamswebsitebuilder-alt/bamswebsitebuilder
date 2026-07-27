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
  Timestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  ref,
  uploadBytesResumable
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-storage.js";

/* =========================================================
   PAGE ELEMENTS
========================================================= */

const adminEmail = document.getElementById("admin-email");
const logoutButton = document.getElementById("admin-logout");

const navButtons = [
  ...document.querySelectorAll(".admin-nav-button")
];

const panels = [
  ...document.querySelectorAll(".admin-panel")
];

const quickButtons = [
  ...document.querySelectorAll("[data-open-panel]")
];

const clientForm = document.getElementById("client-form");
const clientFormStatus = document.getElementById(
  "client-form-status"
);
const clientList = document.getElementById("client-list");

const invoiceForm = document.getElementById("invoice-form");
const invoiceFormStatus = document.getElementById(
  "invoice-form-status"
);
const invoiceList = document.getElementById("invoice-list");

const adminFileForm = document.getElementById(
  "admin-file-form"
);
const fileFormStatus = document.getElementById(
  "file-form-status"
);
const uploadProgress = document.getElementById(
  "admin-upload-progress"
);

const invoiceClientSelect = document.getElementById(
  "invoice-client"
);

const fileClientSelect = document.getElementById(
  "file-client"
);

const statClients = document.getElementById("stat-clients");
const statUnpaid = document.getElementById("stat-unpaid");
const statPaid = document.getElementById("stat-paid");
const statBalance = document.getElementById("stat-balance");

const menuToggle = document.getElementById(
  "admin-menu-toggle"
);

const adminSidebar = document.getElementById(
  "admin-sidebar"
);

const sidebarOverlay = document.getElementById(
  "admin-sidebar-overlay"
);

const notificationList = document.getElementById(
  "notification-list"
);

const notificationCount = document.getElementById(
  "notification-count"
);

const notificationStatus = document.getElementById(
  "notification-status"
);

const enableBrowserNotificationsButton =
  document.getElementById(
    "enable-browser-notifications"
  );

/* =========================================================
   INITIAL PAGE STATE
========================================================= */

if (sidebarOverlay) {
  sidebarOverlay.hidden = true;
}

if (
  adminSidebar &&
  window.innerWidth <= 760
) {
  adminSidebar.classList.remove("open");
  adminSidebar.setAttribute(
    "aria-hidden",
    "true"
  );
}

let currentAdmin = null;

let clientRecords = [];
let invoiceRecords = [];
let activityRecords = [];

let firstClientSnapshotLoaded = false;
let firstInvoiceSnapshotLoaded = false;

/* =========================================================
   HELPER FUNCTIONS
========================================================= */

const showStatus = (
  element,
  message,
  type = ""
) => {
  if (!element) {
    return;
  }

  element.hidden = false;
  element.textContent = message;
  element.className =
    `admin-status ${type}`.trim();
};

const hideStatus = (element) => {
  if (!element) {
    return;
  }

  element.hidden = true;
  element.textContent = "";
  element.className = "admin-status";
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat(
    "en-US",
    {
      style: "currency",
      currency: "USD"
    }
  ).format(Number(amount) || 0);
};

const formatDate = (value) => {
  if (!value) {
    return "";
  }

  const date =
    typeof value?.toDate === "function"
      ? value.toDate()
      : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return date.toLocaleDateString(
    "en-US",
    {
      year: "numeric",
      month: "short",
      day: "numeric"
    }
  );
};

const timestampToMillis = (value) => {
  if (!value) {
    return 0;
  }

  if (
    typeof value?.toMillis === "function"
  ) {
    return value.toMillis();
  }

  const parsed =
    new Date(value).getTime();

  return Number.isNaN(parsed)
    ? 0
    : parsed;
};

const isValidWebAddress = (value) => {
  if (!value) {
    return true;
  }

  try {
    const parsedUrl = new URL(value);

    return [
      "http:",
      "https:"
    ].includes(parsedUrl.protocol);
  } catch {
    return false;
  }
};

/* =========================================================
   MOBILE ADMIN MENU
========================================================= */

const closeMobileMenu = () => {
  if (
    !adminSidebar ||
    !sidebarOverlay ||
    !menuToggle
  ) {
    return;
  }

  adminSidebar.classList.remove("open");

  adminSidebar.setAttribute(
    "aria-hidden",
    "true"
  );

  sidebarOverlay.hidden = true;

  menuToggle.setAttribute(
    "aria-expanded",
    "false"
  );
};

const openMobileMenu = () => {
  if (
    !adminSidebar ||
    !sidebarOverlay ||
    !menuToggle
  ) {
    return;
  }

  adminSidebar.classList.add("open");

  adminSidebar.setAttribute(
    "aria-hidden",
    "false"
  );

  sidebarOverlay.hidden = false;

  menuToggle.setAttribute(
    "aria-expanded",
    "true"
  );
};

menuToggle?.addEventListener(
  "click",
  () => {
    if (
      adminSidebar?.classList.contains(
        "open"
      )
    ) {
      closeMobileMenu();
    } else {
      openMobileMenu();
    }
  }
);

sidebarOverlay?.addEventListener(
  "click",
  closeMobileMenu
);

window.addEventListener(
  "resize",
  () => {
    if (window.innerWidth > 760) {
      adminSidebar?.classList.remove(
        "open"
      );

      adminSidebar?.setAttribute(
        "aria-hidden",
        "false"
      );

      if (sidebarOverlay) {
        sidebarOverlay.hidden = true;
      }

      menuToggle?.setAttribute(
        "aria-expanded",
        "false"
      );
    } else {
      adminSidebar?.setAttribute(
        "aria-hidden",
        "true"
      );
    }
  }
);

/* =========================================================
   DASHBOARD PANELS
========================================================= */

const setActivePanel = (panelId) => {
  panels.forEach((panel) => {
    panel.classList.toggle(
      "active",
      panel.id === panelId
    );
  });

  navButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.panel === panelId
    );
  });
};

navButtons.forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      const panelId =
        button.dataset.panel;

      setActivePanel(panelId);

      if (
        panelId === "notifications"
      ) {
        markNotificationsSeen();
      }

      if (
        window.innerWidth <= 760
      ) {
        closeMobileMenu();
      }
    }
  );
});

quickButtons.forEach((button) => {
  button.addEventListener(
    "click",
    () => {
      setActivePanel(
        button.dataset.openPanel
      );
    }
  );
});

/* =========================================================
   CLIENT OPTIONS
========================================================= */

const buildClientOptions = () => {
  if (
    !invoiceClientSelect ||
    !fileClientSelect
  ) {
    return;
  }

  const options = [
    '<option value="">Choose a client</option>',

    ...clientRecords.map((client) => {
      const label =
        client.fullName ||
        client.email ||
        client.id;

      return `
        <option value="${client.id}">
          ${label}
        </option>
      `;
    })
  ].join("");

  invoiceClientSelect.innerHTML =
    options;

  fileClientSelect.innerHTML =
    options;
};

/* =========================================================
   RENDER CLIENTS
========================================================= */

const renderClients = () => {
  if (!clientList) {
    return;
  }

  clientList.replaceChildren();

  if (clientRecords.length === 0) {
    clientList.innerHTML =
      '<p class="admin-status">No clients have been added yet.</p>';

    return;
  }

  clientRecords.forEach((client) => {
    const item =
      document.createElement("div");

    item.className =
      "admin-list-item";

    const info =
      document.createElement("div");

    info.className =
      "admin-list-info";

    const title =
      document.createElement("strong");

    title.textContent =
      client.fullName ||
      client.email ||
      "Client";

    const meta =
      document.createElement("div");

    meta.className =
      "admin-list-meta";

    meta.textContent = [
      client.email,
      client.businessName,
      `UID: ${client.id}`
    ]
      .filter(Boolean)
      .join(" • ");

    info.append(
      title,
      meta
    );

    const badge =
      document.createElement("span");

    badge.className =
      "admin-badge";

    badge.textContent =
      client.role || "client";

    item.append(
      info,
      badge
    );

    clientList.appendChild(item);
  });
};

/* =========================================================
   RENDER INVOICES
========================================================= */

const renderInvoices = () => {
  if (!invoiceList) {
    return;
  }

  invoiceList.replaceChildren();

  if (invoiceRecords.length === 0) {
    invoiceList.innerHTML =
      '<p class="admin-status">No invoices have been created yet.</p>';

    return;
  }

  invoiceRecords.forEach((invoice) => {
    const item =
      document.createElement("div");

    item.className =
      "admin-list-item";

    const info =
      document.createElement("div");

    info.className =
      "admin-list-info";

    const title =
      document.createElement("strong");

    title.textContent =
      `${invoice.invoiceNumber || "Invoice"} — ` +
      formatCurrency(invoice.amount);

    const client =
      clientRecords.find(
        (record) =>
          record.id === invoice.userId
      );

    const meta =
      document.createElement("div");

    meta.className =
      "admin-list-meta";

    meta.textContent = [
      client?.fullName ||
        client?.email ||
        invoice.userId,

      invoice.description,

      invoice.dueDate
        ? `Due ${formatDate(
            invoice.dueDate
          )}`
        : ""
    ]
      .filter(Boolean)
      .join(" • ");

    info.append(
      title,
      meta
    );

    const actions =
      document.createElement("div");

    actions.className =
      "admin-list-actions";

    const badge =
      document.createElement("span");

    badge.className =
      `admin-badge ${
        invoice.status === "paid"
          ? "paid"
          : ""
      }`;

    badge.textContent =
      invoice.status === "paid"
        ? "paid"
        : "unpaid";

    const toggleButton =
      document.createElement("button");

    toggleButton.type = "button";

    toggleButton.className =
      `admin-small-button ${
        invoice.status === "paid"
          ? ""
          : "success"
      }`;

    toggleButton.textContent =
      invoice.status === "paid"
        ? "Mark Unpaid"
        : "Mark Paid";

    toggleButton.addEventListener(
      "click",
      async () => {
        const nextStatus =
          invoice.status === "paid"
            ? "unpaid"
            : "paid";

        toggleButton.disabled = true;

        toggleButton.textContent =
          "Updating...";

        try {
          await updateDoc(
            doc(
              db,
              "users",
              invoice.userId,
              "invoices",
              invoice.id
            ),
            {
              status: nextStatus,

              updatedAt:
                serverTimestamp(),

              paidAt:
                nextStatus === "paid"
                  ? serverTimestamp()
                  : null,

              updatedBy:
                currentAdmin?.uid || ""
            }
          );
        } catch (error) {
          console.error(
            "Invoice status update failed:",
            error
          );

          alert(
            "The invoice status could not be updated."
          );
        } finally {
          toggleButton.disabled =
            false;
        }
      }
    );

    actions.append(
      badge,
      toggleButton
    );

    if (
      invoice.pdfUrl &&
      isValidWebAddress(invoice.pdfUrl)
    ) {
      const paypalButton =
        document.createElement("a");

      paypalButton.href =
        invoice.pdfUrl;

      paypalButton.target =
        "_blank";

      paypalButton.rel =
        "noopener noreferrer";

      paypalButton.className =
        "admin-small-button";

      paypalButton.textContent =
        "Open PayPal Invoice";

      actions.appendChild(
        paypalButton
      );
    }

    item.append(
      info,
      actions
    );

    invoiceList.appendChild(item);
  });
};

/* =========================================================
   DASHBOARD STATISTICS
========================================================= */

const updateStats = () => {
  const unpaid =
    invoiceRecords.filter(
      (invoice) =>
        invoice.status !== "paid"
    );

  const paid =
    invoiceRecords.filter(
      (invoice) =>
        invoice.status === "paid"
    );

  const outstanding =
    unpaid.reduce(
      (total, invoice) =>
        total +
        (Number(invoice.amount) || 0),
      0
    );

  if (statClients) {
    statClients.textContent =
      String(clientRecords.length);
  }

  if (statUnpaid) {
    statUnpaid.textContent =
      String(unpaid.length);
  }

  if (statPaid) {
    statPaid.textContent =
      String(paid.length);
  }

  if (statBalance) {
    statBalance.textContent =
      formatCurrency(outstanding);
  }
};

/* =========================================================
   NOTIFICATIONS
========================================================= */

const notifyDevice = (
  title,
  body
) => {
  if (
    "Notification" in window &&
    Notification.permission ===
      "granted" &&
    document.visibilityState !==
      "visible"
  ) {
    new Notification(
      title,
      { body }
    );
  }
};

const rebuildActivity = () => {
  const clientActivity =
    clientRecords.map((client) => ({
      id: `client-${client.id}`,

      type: "client",

      title: "New client account",

      detail:
        client.fullName ||
        client.email ||
        "A client account was created.",

      createdAt:
        client.createdAt,

      time:
        timestampToMillis(
          client.createdAt
        )
    }));

  const invoiceActivity =
    invoiceRecords.map((invoice) => ({
      id:
        `invoice-${invoice.userId}-` +
        `${invoice.id}-${invoice.status}`,

      type: "invoice",

      title:
        invoice.status === "paid"
          ? "Invoice marked paid"
          : "PayPal invoice added",

      detail:
        `${invoice.invoiceNumber || "Invoice"} — ` +
        formatCurrency(invoice.amount),

      createdAt:
        invoice.updatedAt ||
        invoice.createdAt,

      time:
        timestampToMillis(
          invoice.updatedAt ||
          invoice.createdAt
        )
    }));

  activityRecords = [
    ...clientActivity,
    ...invoiceActivity
  ]
    .sort(
      (first, second) =>
        second.time - first.time
    )
    .slice(0, 30);

  renderActivity();
};

const renderActivity = () => {
  if (!notificationList) {
    return;
  }

  notificationList.replaceChildren();

  if (activityRecords.length === 0) {
    notificationList.innerHTML =
      '<p class="admin-status">No recent activity yet.</p>';

    if (notificationCount) {
      notificationCount.hidden =
        true;
    }

    return;
  }

  const lastSeen =
    Number(
      localStorage.getItem(
        "bamAdminNotificationsSeenAt"
      )
    ) || 0;

  const unread =
    activityRecords.filter(
      (activity) =>
        activity.time > lastSeen
    ).length;

  if (notificationCount) {
    notificationCount.textContent =
      String(unread);

    notificationCount.hidden =
      unread === 0;
  }

  activityRecords.forEach((activity) => {
    const item =
      document.createElement("div");

    item.className =
      `admin-list-item admin-notification-item ${
        activity.time > lastSeen
          ? "unread"
          : ""
      }`;

    const info =
      document.createElement("div");

    info.className =
      "admin-list-info";

    const title =
      document.createElement("strong");

    title.textContent =
      activity.title;

    const detail =
      document.createElement("div");

    detail.className =
      "admin-list-meta";

    detail.textContent =
      activity.detail;

    const time =
      document.createElement("div");

    time.className =
      "admin-notification-time";

    time.textContent =
      activity.createdAt
        ? formatDate(
            activity.createdAt
          )
        : "Recent activity";

    info.append(
      title,
      detail,
      time
    );

    item.append(info);

    notificationList.appendChild(
      item
    );
  });
};

const markNotificationsSeen = () => {
  localStorage.setItem(
    "bamAdminNotificationsSeenAt",
    String(Date.now())
  );

  renderActivity();
};

enableBrowserNotificationsButton?.addEventListener(
  "click",
  async () => {
    if (!notificationStatus) {
      return;
    }

    if (
      !("Notification" in window)
    ) {
      notificationStatus.textContent =
        "This browser does not support device notifications.";

      return;
    }

    const permission =
      await Notification.requestPermission();

    notificationStatus.textContent =
      permission === "granted"
        ? "Phone/browser notifications are enabled while this dashboard is open."
        : "Notification permission was not granted.";
  }
);

/* =========================================================
   WATCH CLIENT RECORDS
========================================================= */

const watchClients = () => {
  const clientsQuery =
    query(
      collection(db, "users"),
      orderBy("fullName")
    );

  return onSnapshot(
    clientsQuery,

    (snapshot) => {
      clientRecords =
        snapshot.docs
          .map((item) => ({
            id: item.id,
            ...item.data()
          }))
          .filter(
            (record) =>
              record.role !== "admin"
          );

      renderClients();
      buildClientOptions();
      renderInvoices();
      updateStats();
      rebuildActivity();

      if (
        firstClientSnapshotLoaded
      ) {
        snapshot
          .docChanges()
          .forEach((change) => {
            if (
              change.type !== "added"
            ) {
              return;
            }

            const data =
              change.doc.data();

            if (
              data.role === "admin"
            ) {
              return;
            }

            notifyDevice(
              "New client registered",

              data.fullName ||
                data.email ||
                "A new client joined."
            );
          });
      }

      firstClientSnapshotLoaded =
        true;
    },

    (error) => {
      console.error(
        "Unable to load clients:",
        error
      );

      if (clientList) {
        clientList.innerHTML =
          `<p class="admin-status error">
            Clients could not be loaded: ${
              error.message ||
              "Unknown Firestore error"
            }
          </p>`;
      }
    }
  );
};

/* =========================================================
   WATCH INVOICE RECORDS
========================================================= */

const watchInvoices = () => {
  /*
    Read all invoice documents from:

    users/{clientUID}/invoices/{invoiceID}

    The records are sorted in JavaScript instead of
    using orderBy inside the collection-group query.
    This prevents a missing Firestore index from keeping
    saved invoices from appearing in the admin list.
  */

  const invoicesQuery =
    collectionGroup(
      db,
      "invoices"
    );

  return onSnapshot(
    invoicesQuery,

    (snapshot) => {
      invoiceRecords =
        snapshot.docs
          .map(
            (invoiceDocument) => {
              const userDocument =
                invoiceDocument.ref
                  .parent
                  .parent;

              return {
                id:
                  invoiceDocument.id,

                userId:
                  userDocument?.id || "",

                ...invoiceDocument.data()
              };
            }
          )
          .sort(
            (
              firstInvoice,
              secondInvoice
            ) => {
              const firstCreatedTime =
                timestampToMillis(
                  firstInvoice.createdAt
                );

              const secondCreatedTime =
                timestampToMillis(
                  secondInvoice.createdAt
                );

              return (
                secondCreatedTime -
                firstCreatedTime
              );
            }
          );

      renderInvoices();
      updateStats();
      rebuildActivity();

      if (
        firstInvoiceSnapshotLoaded
      ) {
        snapshot
          .docChanges()
          .forEach((change) => {
            if (
              change.type !==
              "modified"
            ) {
              return;
            }

            const data =
              change.doc.data();

            if (
              data.status === "paid"
            ) {
              notifyDevice(
                "Invoice paid",

                `${
                  data.invoiceNumber ||
                  "Invoice"
                } was marked paid.`
              );
            }
          });
      }

      firstInvoiceSnapshotLoaded =
        true;
    },

    (error) => {
      console.error(
        "Unable to load invoices:",
        error
      );

      if (invoiceList) {
        invoiceList.innerHTML =
          `<p class="admin-status error">
            Invoices could not be loaded: ${
              error.message ||
              "Unknown Firestore error"
            }
          </p>`;
      }
    }
  );
};

/* =========================================================
   SAVE CLIENT
========================================================= */

clientForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    hideStatus(
      clientFormStatus
    );

    const uid =
      document
        .getElementById(
          "client-uid"
        )
        ?.value.trim() || "";

    const fullName =
      document
        .getElementById(
          "client-name"
        )
        ?.value.trim() || "";

    const email =
      document
        .getElementById(
          "client-email"
        )
        ?.value.trim() || "";

    const businessName =
      document
        .getElementById(
          "client-business"
        )
        ?.value.trim() || "";

    const phone =
      document
        .getElementById(
          "client-phone"
        )
        ?.value.trim() || "";

    if (
      !uid ||
      !fullName ||
      !email
    ) {
      showStatus(
        clientFormStatus,

        "Enter the client's Firebase UID, name, and email.",

        "error"
      );

      return;
    }

    try {
      const clientReference =
        doc(
          db,
          "users",
          uid
        );

      const existingClient =
        await getDoc(
          clientReference
        );

      const clientData = {
        uid,
        fullName,
        email,
        businessName,
        phone,
        role: "client",
        updatedAt:
          serverTimestamp()
      };

      if (
        !existingClient.exists()
      ) {
        clientData.createdAt =
          serverTimestamp();
      }

      await setDoc(
        clientReference,
        clientData,
        {
          merge: true
        }
      );

      clientForm.reset();

      showStatus(
        clientFormStatus,

        "Client profile saved successfully.",

        "success"
      );
    } catch (error) {
      console.error(
        "Client save failed:",
        error
      );

      showStatus(
        clientFormStatus,

        "The client could not be saved.",

        "error"
      );
    }
  }
);

/* =========================================================
   ADD PAYPAL INVOICE
========================================================= */

invoiceForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();

    hideStatus(
      invoiceFormStatus
    );

    const userId =
      invoiceClientSelect?.value || "";

    const invoiceNumber =
      document
        .getElementById(
          "invoice-number"
        )
        ?.value.trim() || "";

    const amount =
      Number(
        document
          .getElementById(
            "invoice-amount"
          )
          ?.value
      );

    const dueDateValue =
      document
        .getElementById(
          "invoice-due-date"
        )
        ?.value || "";

    const description =
      document
        .getElementById(
          "invoice-description"
        )
        ?.value.trim() || "";

    /*
      This remains invoice-pdf-url so it matches
      the current admin-dashboard.html.

      The value stored as pdfUrl is the PayPal
      invoice link.
    */
    const pdfUrl =
      document
        .getElementById(
          "invoice-pdf-url"
        )
        ?.value.trim() || "";

    if (!userId) {
      showStatus(
        invoiceFormStatus,
        "Please choose a client.",
        "error"
      );

      return;
    }

    if (!invoiceNumber) {
      showStatus(
        invoiceFormStatus,
        "Please enter an invoice number.",
        "error"
      );

      return;
    }

    if (
      !Number.isFinite(amount) ||
      amount <= 0
    ) {
      showStatus(
        invoiceFormStatus,
        "Please enter a valid invoice amount.",
        "error"
      );

      return;
    }

    if (!dueDateValue) {
      showStatus(
        invoiceFormStatus,
        "Please choose an invoice due date.",
        "error"
      );

      return;
    }

    if (!description) {
      showStatus(
        invoiceFormStatus,
        "Please enter an invoice description.",
        "error"
      );

      return;
    }

    if (
      pdfUrl &&
      !isValidWebAddress(pdfUrl)
    ) {
      showStatus(
        invoiceFormStatus,
        "Please enter a valid PayPal invoice link.",
        "error"
      );

      return;
    }

    try {
      await addDoc(
        collection(
          db,
          "users",
          userId,
          "invoices"
        ),
        {
          invoiceNumber,

          amount,

          currency: "USD",

          dueDate:
            Timestamp.fromDate(
              new Date(
                `${dueDateValue}T12:00:00`
              )
            ),

          description,

          /*
            pdfUrl stores the PayPal invoice
            or payment link.
          */
          pdfUrl,

          status: "unpaid",

          createdAt:
            serverTimestamp(),

          updatedAt:
            serverTimestamp(),

          createdBy:
            currentAdmin?.uid || ""
        }
      );

      invoiceForm.reset();

      showStatus(
        invoiceFormStatus,

        "PayPal invoice added to the client's portal successfully.",

        "success"
      );
    } catch (error) {
      console.error(
        "Invoice creation failed:",
        error
      );

      showStatus(
        invoiceFormStatus,

        `The PayPal invoice could not be added: ${
          error.message ||
          "Unknown Firestore error"
        }`,

        "error"
      );
    }
  }
);

/* =========================================================
   UPLOAD CLIENT FILE
========================================================= */

adminFileForm?.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();

    hideStatus(
      fileFormStatus
    );

    const userId =
      fileClientSelect?.value || "";

    const fileInput =
      document.getElementById(
        "admin-file-input"
      );

    const file =
      fileInput?.files?.[0];

    if (
      !userId ||
      !file
    ) {
      showStatus(
        fileFormStatus,

        "Choose a client and a file.",

        "error"
      );

      return;
    }

    if (
      file.size >
      15 * 1024 * 1024
    ) {
      showStatus(
        fileFormStatus,

        "The file must be 15 MB or smaller.",

        "error"
      );

      return;
    }

    const cleanName =
      file.name
        .trim()
        .replace(
          /\s+/g,
          "-"
        )
        .replace(
          /[^a-zA-Z0-9._-]/g,
          ""
        );

    const storageReference =
      ref(
        storage,

        `users/${userId}/uploads/` +
          `${Date.now()}-${cleanName}`
      );

    const uploadTask =
      uploadBytesResumable(
        storageReference,
        file,
        {
          contentType:
            file.type ||
            "application/octet-stream",

          customMetadata: {
            originalName:
              file.name,

            uploadedBy:
              currentAdmin?.uid || "",

            uploadedFor:
              userId
          }
        }
      );

    if (uploadProgress) {
      uploadProgress.hidden =
        false;

      uploadProgress.value =
        0;
    }

    uploadTask.on(
      "state_changed",

      (snapshot) => {
        if (!uploadProgress) {
          return;
        }

        uploadProgress.value =
          Math.round(
            (
              snapshot.bytesTransferred /
              snapshot.totalBytes
            ) * 100
          );
      },

      (error) => {
        console.error(
          "Admin upload failed:",
          error
        );

        if (uploadProgress) {
          uploadProgress.hidden =
            true;
        }

        showStatus(
          fileFormStatus,

          "The file could not be uploaded.",

          "error"
        );
      },

      () => {
        adminFileForm.reset();

        if (uploadProgress) {
          uploadProgress.hidden =
            true;

          uploadProgress.value =
            0;
        }

        showStatus(
          fileFormStatus,

          "File uploaded to the client's portal.",

          "success"
        );
      }
    );
  }
);

/* =========================================================
   LOG OUT
========================================================= */

logoutButton?.addEventListener(
  "click",
  async () => {
    try {
      await signOut(auth);

      window.location.replace(
        "login.html"
      );
    } catch (error) {
      console.error(
        "Logout failed:",
        error
      );

      alert(
        "You could not be logged out. Please try again."
      );
    }
  }
);

/* =========================================================
   ADMIN AUTHENTICATION
========================================================= */

onAuthStateChanged(
  auth,
  async (user) => {
    if (!user) {
      window.location.replace(
        `login.html?next=${encodeURIComponent(
          "admin-dashboard.html"
        )}`
      );

      return;
    }

    try {
      const snapshot =
        await getDoc(
          doc(
            db,
            "users",
            user.uid
          )
        );

      const profile =
        snapshot.exists()
          ? snapshot.data()
          : {};

      if (
        profile.role !== "admin"
      ) {
        window.location.replace(
          "client-portal.html"
        );

        return;
      }

      currentAdmin = user;

      if (adminEmail) {
        adminEmail.textContent =
          user.email ||
          "Administrator";
      }

      watchClients();
      watchInvoices();
    } catch (error) {
      console.error(
        "Admin verification failed:",
        error
      );

      window.location.replace(
        "client-portal.html"
      );
    }
  }
);