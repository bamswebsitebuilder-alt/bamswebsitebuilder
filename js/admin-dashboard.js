document.documentElement.style.visibility = "hidden";

/* =========================================================
   FIREBASE IMPORTS
========================================================= */

import { auth, db, storage } from "./firebase-config.js";

import {
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
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

const menuButton = document.getElementById("admin-menu-toggle");
const sidebar = document.getElementById("admin-sidebar");
const sidebarOverlay = document.getElementById(
  "admin-sidebar-overlay"
);

const navigationButtons = [
  ...document.querySelectorAll(".admin-nav-button")
];

const panels = [
  ...document.querySelectorAll(".admin-panel")
];

const quickActionButtons = [
  ...document.querySelectorAll("[data-open-panel]")
];

const clientForm = document.getElementById("client-form");
const clientFormStatus =
  document.getElementById("client-form-status");
const clientList = document.getElementById("client-list");

const projectForm = document.getElementById("project-form");
const projectFormStatus =
  document.getElementById("project-form-status");
const projectList = document.getElementById("project-list");

const projectClientSelect =
  document.getElementById("project-client");

const projectProgress =
  document.getElementById("project-progress");

const projectProgressValue =
  document.getElementById("project-progress-value");

const invoiceForm = document.getElementById("invoice-form");
const invoiceFormStatus =
  document.getElementById("invoice-form-status");
const invoiceList = document.getElementById("invoice-list");

const invoiceClientSelect =
  document.getElementById("invoice-client");

const fileForm = document.getElementById("admin-file-form");
const fileFormStatus =
  document.getElementById("file-form-status");

const fileClientSelect =
  document.getElementById("file-client");

const fileUploadProgress =
  document.getElementById("admin-upload-progress");

const notificationList =
  document.getElementById("notification-list");

const notificationCount =
  document.getElementById("notification-count");

const notificationStatus =
  document.getElementById("notification-status");

const enableNotificationsButton =
  document.getElementById("enable-browser-notifications");

const statClients = document.getElementById("stat-clients");
const statUnpaid = document.getElementById("stat-unpaid");
const statPaid = document.getElementById("stat-paid");
const statBalance = document.getElementById("stat-balance");


/* =========================================================
   DASHBOARD STATE
========================================================= */

let currentAdmin = null;

let clientRecords = [];
let projectRecords = [];
let invoiceRecords = [];

let projectListeners = [];
let invoiceListeners = [];

const projectsByClient = new Map();
const invoicesByClient = new Map();

let firstClientSnapshotLoaded = false;


/* =========================================================
   GENERAL HELPERS
========================================================= */

const showStatus = (element, message, type = "") => {
  if (!element) {
    return;
  }

  element.hidden = false;
  element.textContent = message;
  element.className = `admin-status ${type}`.trim();
};

const hideStatus = (element) => {
  if (!element) {
    return;
  }

  element.hidden = true;
  element.textContent = "";
  element.className = "admin-status";
};

const escapeHtml = (value) => {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
};

const formatCurrency = (amount) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD"
  }).format(Number(amount) || 0);
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

  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric"
  });
};

const toDateInputValue = (value) => {
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

  return date.toISOString().slice(0, 10);
};

const linesToArray = (value) => {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
};

const getTimestampNumber = (value) => {
  if (typeof value?.toMillis === "function") {
    return value.toMillis();
  }

  const date = new Date(value || 0);
  return Number.isNaN(date.getTime()) ? 0 : date.getTime();
};

const getClientLabel = (client) => {
  return (
    client?.fullName ||
    client?.email ||
    client?.businessName ||
    client?.id ||
    "Client"
  );
};


/* =========================================================
   MOBILE HAMBURGER MENU
========================================================= */

const isMobileScreen = () => {
  return window.innerWidth <= 760;
};

const openMobileMenu = () => {
  if (!menuButton || !sidebar || !sidebarOverlay) {
    return;
  }

  if (!isMobileScreen()) {
    return;
  }

  sidebar.classList.add("open");
  sidebar.setAttribute("aria-hidden", "false");

  sidebarOverlay.hidden = false;

  menuButton.setAttribute("aria-expanded", "true");
  menuButton.setAttribute("aria-label", "Close admin menu");

  document.body.classList.add("admin-menu-open");
};

const closeMobileMenu = () => {
  if (!menuButton || !sidebar || !sidebarOverlay) {
    return;
  }

  sidebar.classList.remove("open");

  sidebar.setAttribute(
    "aria-hidden",
    isMobileScreen() ? "true" : "false"
  );

  sidebarOverlay.hidden = true;

  menuButton.setAttribute("aria-expanded", "false");
  menuButton.setAttribute("aria-label", "Open admin menu");

  document.body.classList.remove("admin-menu-open");
};

const toggleMobileMenu = (event) => {
  event.preventDefault();
  event.stopPropagation();

  if (sidebar?.classList.contains("open")) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
};

menuButton?.addEventListener("click", toggleMobileMenu);

sidebarOverlay?.addEventListener("click", closeMobileMenu);

document.addEventListener("keydown", (event) => {
  if (
    event.key === "Escape" &&
    sidebar?.classList.contains("open")
  ) {
    closeMobileMenu();
  }
});

window.addEventListener("resize", () => {
  if (!sidebar || !sidebarOverlay || !menuButton) {
    return;
  }

  if (isMobileScreen()) {
    if (!sidebar.classList.contains("open")) {
      sidebar.setAttribute("aria-hidden", "true");
      sidebarOverlay.hidden = true;
    }
  } else {
    sidebar.classList.remove("open");
    sidebar.setAttribute("aria-hidden", "false");

    sidebarOverlay.hidden = true;

    menuButton.setAttribute("aria-expanded", "false");
    document.body.classList.remove("admin-menu-open");
  }
});

if (sidebarOverlay) {
  sidebarOverlay.hidden = true;
}

if (sidebar) {
  sidebar.setAttribute(
    "aria-hidden",
    isMobileScreen() ? "true" : "false"
  );
}


/* =========================================================
   PANEL NAVIGATION
========================================================= */

const setActivePanel = (panelId) => {
  panels.forEach((panel) => {
    panel.classList.toggle(
      "active",
      panel.id === panelId
    );
  });

  navigationButtons.forEach((button) => {
    button.classList.toggle(
      "active",
      button.dataset.panel === panelId
    );
  });

  if (panelId === "notifications") {
    markNotificationsSeen();
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
};

navigationButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panelId = button.dataset.panel;

    if (panelId) {
      setActivePanel(panelId);
    }

    if (isMobileScreen()) {
      closeMobileMenu();
    }
  });
});

quickActionButtons.forEach((button) => {
  button.addEventListener("click", () => {
    const panelId = button.dataset.openPanel;

    if (panelId) {
      setActivePanel(panelId);
    }
  });
});


/* =========================================================
   CLIENT DROPDOWN OPTIONS
========================================================= */

const buildClientOptions = () => {
  const options = [
    '<option value="">Choose a client</option>',
    ...clientRecords.map((client) => {
      return `
        <option value="${escapeHtml(client.id)}">
          ${escapeHtml(getClientLabel(client))}
        </option>
      `;
    })
  ].join("");

  if (projectClientSelect) {
    projectClientSelect.innerHTML = options;
  }

  if (invoiceClientSelect) {
    invoiceClientSelect.innerHTML = options;
  }

  if (fileClientSelect) {
    fileClientSelect.innerHTML = options;
  }
};


/* =========================================================
   CLIENT LIST
========================================================= */

const renderClients = () => {
  if (!clientList) {
    return;
  }

  clientList.replaceChildren();

  if (clientRecords.length === 0) {
    clientList.innerHTML = `
      <p class="admin-status">
        No client accounts were found.
      </p>
    `;

    return;
  }

  clientRecords.forEach((client) => {
    const item = document.createElement("div");
    item.className = "admin-list-item";

    const information = document.createElement("div");
    information.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent = getClientLabel(client);

    const details = document.createElement("div");
    details.className = "admin-list-meta";

    details.textContent = [
      client.email,
      client.businessName,
      client.phone,
      `UID: ${client.id}`
    ]
      .filter(Boolean)
      .join(" • ");

    const badge = document.createElement("span");
    badge.className = "admin-badge";
    badge.textContent = "client";

    information.append(title, details);
    item.append(information, badge);

    clientList.appendChild(item);
  });
};


/* =========================================================
   PROJECT LIST
========================================================= */

const renderProjects = () => {
  if (!projectList) {
    return;
  }

  projectList.replaceChildren();

  if (projectRecords.length === 0) {
    projectList.innerHTML = `
      <p class="admin-status">
        No projects have been assigned yet.
      </p>
    `;

    return;
  }

  projectRecords.forEach((project) => {
    const client = clientRecords.find(
      (record) => record.id === project.userId
    );

    const progress = Math.max(
      0,
      Math.min(100, Number(project.progress) || 0)
    );

    const item = document.createElement("div");
    item.className = "admin-list-item";

    const information = document.createElement("div");
    information.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent =
      project.title || "Website Project";

    const details = document.createElement("div");
    details.className = "admin-list-meta";

    details.textContent = [
      getClientLabel(client),
      project.stage,
      project.status
    ]
      .filter(Boolean)
      .join(" • ");

    const date = document.createElement("div");
    date.className = "admin-project-date";

    date.textContent = project.estimatedCompletion
      ? `Estimated completion: ${
          formatDate(project.estimatedCompletion)
        }`
      : "No estimated completion date";

    information.append(title, details, date);

    const actions = document.createElement("div");
    actions.className =
      "admin-list-actions admin-project-progress";

    const percentage = document.createElement("strong");
    percentage.textContent = `${progress}%`;

    const progressTrack = document.createElement("div");
    progressTrack.className = "admin-progress-track";

    const progressFill = document.createElement("div");
    progressFill.className = "admin-progress-fill";
    progressFill.style.width = `${progress}%`;

    progressTrack.appendChild(progressFill);

    const editButton = document.createElement("button");
    editButton.type = "button";
    editButton.className = "admin-small-button";
    editButton.textContent = "Edit Project";

    editButton.addEventListener("click", () => {
      setActivePanel("projects");

      projectClientSelect.value = project.userId || "";

      document.getElementById("project-title").value =
        project.title || "";

      document.getElementById("project-stage").value =
        project.stage || "Planning";

      document.getElementById("project-status").value =
        project.status || "In Progress";

      projectProgress.value = progress;
      projectProgressValue.textContent = `${progress}%`;

      document.getElementById("project-start-date").value =
        toDateInputValue(project.startDate);

      document.getElementById("project-due-date").value =
        toDateInputValue(project.estimatedCompletion);

      document.getElementById("project-update").value =
        project.currentUpdate || "";

      document.getElementById("project-completed").value =
        Array.isArray(project.completedTasks)
          ? project.completedTasks.join("\n")
          : "";

      document.getElementById("project-upcoming").value =
        Array.isArray(project.upcomingTasks)
          ? project.upcomingTasks.join("\n")
          : "";

      document.getElementById("project-live-url").value =
        project.liveUrl || "";
    });

    actions.append(
      percentage,
      progressTrack,
      editButton
    );

    item.append(information, actions);
    projectList.appendChild(item);
  });
};


/* =========================================================
   INVOICE LIST
========================================================= */

const renderInvoices = () => {
  if (!invoiceList) {
    return;
  }

  invoiceList.replaceChildren();

  if (invoiceRecords.length === 0) {
    invoiceList.innerHTML = `
      <p class="admin-status">
        No invoices have been created yet.
      </p>
    `;

    return;
  }

  invoiceRecords.forEach((invoice) => {
    const client = clientRecords.find(
      (record) => record.id === invoice.userId
    );

    const item = document.createElement("div");
    item.className = "admin-list-item";

    const information = document.createElement("div");
    information.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent =
      invoice.invoiceNumber || "Invoice";

    const details = document.createElement("div");
    details.className = "admin-list-meta";

    details.textContent = [
      getClientLabel(client),
      formatCurrency(invoice.amount),
      invoice.dueDate
        ? `Due ${formatDate(invoice.dueDate)}`
        : ""
    ]
      .filter(Boolean)
      .join(" • ");

    information.append(title, details);

    const actions = document.createElement("div");
    actions.className = "admin-list-actions";

    const statusBadge = document.createElement("span");
    statusBadge.className =
      `admin-badge ${
        invoice.status === "paid" ? "paid" : ""
      }`;

    statusBadge.textContent =
      invoice.status || "unpaid";

    const statusButton = document.createElement("button");
    statusButton.type = "button";
    statusButton.className = "admin-small-button";

    statusButton.textContent =
      invoice.status === "paid"
        ? "Mark Unpaid"
        : "Mark Paid";

    statusButton.addEventListener("click", async () => {
      try {
        const nextStatus =
          invoice.status === "paid"
            ? "unpaid"
            : "paid";

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
            updatedAt: serverTimestamp()
          }
        );
      } catch (error) {
        console.error(
          "Unable to update invoice:",
          error
        );
      }
    });

    actions.append(statusBadge, statusButton);

    item.append(information, actions);
    invoiceList.appendChild(item);
  });
};


/* =========================================================
   STAT CARDS
========================================================= */

const updateStats = () => {
  const unpaidInvoices = invoiceRecords.filter(
    (invoice) => invoice.status !== "paid"
  );

  const paidInvoices = invoiceRecords.filter(
    (invoice) => invoice.status === "paid"
  );

  const outstandingBalance = unpaidInvoices.reduce(
    (total, invoice) => {
      return total + (Number(invoice.amount) || 0);
    },
    0
  );

  if (statClients) {
    statClients.textContent = String(clientRecords.length);
  }

  if (statUnpaid) {
    statUnpaid.textContent = String(unpaidInvoices.length);
  }

  if (statPaid) {
    statPaid.textContent = String(paidInvoices.length);
  }

  if (statBalance) {
    statBalance.textContent =
      formatCurrency(outstandingBalance);
  }
};


/* =========================================================
   NOTIFICATIONS
========================================================= */

const getLastNotificationSeenTime = () => {
  return Number(
    localStorage.getItem(
      "bamAdminNotificationsSeenAt"
    )
  ) || 0;
};

const buildActivityRecords = () => {
  const activities = [];

  clientRecords.forEach((client) => {
    activities.push({
      title: "Client account",
      detail: `${getClientLabel(client)} is registered.`,
      createdAt: client.createdAt,
      time: getTimestampNumber(client.createdAt)
    });
  });

  projectRecords.forEach((project) => {
    const client = clientRecords.find(
      (record) => record.id === project.userId
    );

    activities.push({
      title: "Project update",
      detail:
        `${project.title || "Website Project"} for ` +
        `${getClientLabel(client)} is ${project.progress || 0}% complete.`,
      createdAt: project.updatedAt || project.createdAt,
      time: getTimestampNumber(
        project.updatedAt || project.createdAt
      )
    });
  });

  invoiceRecords.forEach((invoice) => {
    const client = clientRecords.find(
      (record) => record.id === invoice.userId
    );

    activities.push({
      title:
        invoice.status === "paid"
          ? "Invoice paid"
          : "Invoice created",
      detail:
        `${invoice.invoiceNumber || "Invoice"} for ` +
        `${getClientLabel(client)} — ` +
        `${formatCurrency(invoice.amount)}.`,
      createdAt: invoice.updatedAt || invoice.createdAt,
      time: getTimestampNumber(
        invoice.updatedAt || invoice.createdAt
      )
    });
  });

  return activities.sort(
    (first, second) => second.time - first.time
  );
};

const renderNotifications = () => {
  if (!notificationList) {
    return;
  }

  const activities = buildActivityRecords();
  const lastSeen = getLastNotificationSeenTime();

  const unreadCount = activities.filter(
    (activity) => activity.time > lastSeen
  ).length;

  if (notificationCount) {
    notificationCount.textContent =
      String(unreadCount);

    notificationCount.hidden =
      unreadCount === 0;
  }

  notificationList.replaceChildren();

  if (activities.length === 0) {
    notificationList.innerHTML = `
      <p class="admin-status">
        There is no recent activity.
      </p>
    `;

    return;
  }

  activities.forEach((activity) => {
    const item = document.createElement("div");

    item.className =
      `admin-list-item admin-notification-item ${
        activity.time > lastSeen ? "unread" : ""
      }`;

    const information = document.createElement("div");
    information.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent = activity.title;

    const details = document.createElement("div");
    details.className = "admin-list-meta";
    details.textContent = activity.detail;

    const date = document.createElement("div");
    date.className = "admin-notification-time";

    date.textContent = activity.createdAt
      ? formatDate(activity.createdAt)
      : "Recent activity";

    information.append(title, details, date);
    item.appendChild(information);

    notificationList.appendChild(item);
  });
};

const markNotificationsSeen = () => {
  localStorage.setItem(
    "bamAdminNotificationsSeenAt",
    String(Date.now())
  );

  renderNotifications();
};

const sendDeviceNotification = (
  title,
  message
) => {
  if (
    !("Notification" in window) ||
    Notification.permission !== "granted"
  ) {
    return;
  }

  new Notification(title, {
    body: message,
    icon: "images/icon-dark.jpg"
  });
};

enableNotificationsButton?.addEventListener(
  "click",
  async () => {
    if (!("Notification" in window)) {
      if (notificationStatus) {
        notificationStatus.textContent =
          "This browser does not support notifications.";
      }

      return;
    }

    try {
      const permission =
        await Notification.requestPermission();

      if (notificationStatus) {
        notificationStatus.textContent =
          permission === "granted"
            ? "Browser notifications are enabled."
            : "Notification permission was not granted.";
      }
    } catch (error) {
      console.error(
        "Notification permission failed:",
        error
      );
    }
  }
);


/* =========================================================
   PROJECT FIRESTORE LISTENERS
========================================================= */

const stopProjectListeners = () => {
  projectListeners.forEach((unsubscribe) => {
    unsubscribe();
  });

  projectListeners = [];
  projectsByClient.clear();
};

const publishProjects = () => {
  projectRecords = [
    ...projectsByClient.values()
  ]
    .filter(Boolean)
    .sort((first, second) => {
      return (
        getTimestampNumber(second.updatedAt) -
        getTimestampNumber(first.updatedAt)
      );
    });

  renderProjects();
  renderNotifications();
};

const watchProjects = () => {
  stopProjectListeners();

  if (clientRecords.length === 0) {
    projectRecords = [];
    publishProjects();
    return;
  }

  clientRecords.forEach((client) => {
    const projectReference = doc(
      db,
      "users",
      client.id,
      "projects",
      "current"
    );

    const unsubscribe = onSnapshot(
      projectReference,
      (snapshot) => {
        if (snapshot.exists()) {
          projectsByClient.set(client.id, {
            id: snapshot.id,
            userId: client.id,
            ...snapshot.data()
          });
        } else {
          projectsByClient.delete(client.id);
        }

        publishProjects();
      },
      (error) => {
        console.error(
          `Unable to load project for ${client.id}:`,
          error
        );

        projectsByClient.delete(client.id);
        publishProjects();
      }
    );

    projectListeners.push(unsubscribe);
  });
};


/* =========================================================
   INVOICE FIRESTORE LISTENERS
========================================================= */

const stopInvoiceListeners = () => {
  invoiceListeners.forEach((unsubscribe) => {
    unsubscribe();
  });

  invoiceListeners = [];
  invoicesByClient.clear();
};

const publishInvoices = () => {
  invoiceRecords = [
    ...invoicesByClient.values()
  ]
    .flat()
    .sort((first, second) => {
      return (
        getTimestampNumber(second.createdAt) -
        getTimestampNumber(first.createdAt)
      );
    });

  renderInvoices();
  updateStats();
  renderNotifications();
};

const watchInvoices = () => {
  stopInvoiceListeners();

  if (clientRecords.length === 0) {
    invoiceRecords = [];
    publishInvoices();
    return;
  }

  clientRecords.forEach((client) => {
    const invoiceCollection = collection(
      db,
      "users",
      client.id,
      "invoices"
    );

    const unsubscribe = onSnapshot(
      invoiceCollection,
      (snapshot) => {
        const records = snapshot.docs.map(
          (invoiceDocument) => ({
            id: invoiceDocument.id,
            userId: client.id,
            ...invoiceDocument.data()
          })
        );

        invoicesByClient.set(client.id, records);
        publishInvoices();
      },
      (error) => {
        console.error(
          `Unable to load invoices for ${client.id}:`,
          error
        );

        invoicesByClient.set(client.id, []);
        publishInvoices();
      }
    );

    invoiceListeners.push(unsubscribe);
  });
};


/* =========================================================
   CLIENT FIRESTORE LISTENER
========================================================= */

const watchClients = () => {
  const clientsCollection =
    collection(db, "users");

  return onSnapshot(
    clientsCollection,

    (snapshot) => {
      const previousClientIds =
        new Set(clientRecords.map((client) => client.id));

      clientRecords = snapshot.docs
        .map((clientDocument) => ({
          id: clientDocument.id,
          ...clientDocument.data()
        }))
        .filter((record) => {
          return (
            String(record.role || "")
              .trim()
              .toLowerCase() === "client"
          );
        })
        .sort((firstClient, secondClient) => {
          return getClientLabel(firstClient)
            .localeCompare(
              getClientLabel(secondClient)
            );
        });

      renderClients();
      buildClientOptions();
      updateStats();

      watchProjects();
      watchInvoices();

      if (firstClientSnapshotLoaded) {
        clientRecords.forEach((client) => {
          if (!previousClientIds.has(client.id)) {
            sendDeviceNotification(
              "New client registered",
              `${getClientLabel(client)} joined your portal.`
            );
          }
        });
      }

      firstClientSnapshotLoaded = true;

      renderNotifications();
    },

    (error) => {
      console.error(
        "Unable to load clients:",
        error
      );

      if (clientList) {
        clientList.innerHTML = `
          <p class="admin-status error">
            Clients could not be loaded.
            <br><br>
            ${escapeHtml(error.message)}
          </p>
        `;
      }
    }
  );
};


/* =========================================================
   PROJECT PROGRESS SLIDER
========================================================= */

projectProgress?.addEventListener("input", () => {
  if (projectProgressValue) {
    projectProgressValue.textContent =
      `${projectProgress.value}%`;
  }
});


/* =========================================================
   SAVE CLIENT
========================================================= */

clientForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    hideStatus(clientFormStatus);

    const uid =
      document.getElementById("client-uid")
        .value.trim();

    const fullName =
      document.getElementById("client-name")
        .value.trim();

    const email =
      document.getElementById("client-email")
        .value.trim();

    const businessName =
      document.getElementById("client-business")
        .value.trim();

    const phone =
      document.getElementById("client-phone")
        .value.trim();

    if (!uid || !fullName || !email) {
      showStatus(
        clientFormStatus,
        "Enter the Firebase UID, name, and email.",
        "error"
      );

      return;
    }

    try {
      const existingProfile = await getDoc(
        doc(db, "users", uid)
      );

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
          ...(
            existingProfile.exists()
              ? {}
              : { createdAt: serverTimestamp() }
          )
        },
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
        error.message ||
          "The client could not be saved.",
        "error"
      );
    }
  }
);


/* =========================================================
   SAVE PROJECT
========================================================= */

projectForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    hideStatus(projectFormStatus);

    const userId = projectClientSelect.value;

    const title =
      document.getElementById("project-title")
        .value.trim();

    const stage =
      document.getElementById("project-stage")
        .value;

    const status =
      document.getElementById("project-status")
        .value;

    const progress =
      Math.max(
        0,
        Math.min(
          100,
          Number(projectProgress.value) || 0
        )
      );

    const startDateValue =
      document.getElementById("project-start-date")
        .value;

    const dueDateValue =
      document.getElementById("project-due-date")
        .value;

    const currentUpdate =
      document.getElementById("project-update")
        .value.trim();

    const completedTasks =
      linesToArray(
        document.getElementById("project-completed")
          .value
      );

    const upcomingTasks =
      linesToArray(
        document.getElementById("project-upcoming")
          .value
      );

    const liveUrl =
      document.getElementById("project-live-url")
        .value.trim();

    if (!userId || !title) {
      showStatus(
        projectFormStatus,
        "Choose a client and enter the project name.",
        "error"
      );

      return;
    }

    const projectReference = doc(
      db,
      "users",
      userId,
      "projects",
      "current"
    );

    try {
      const existingProject =
        await getDoc(projectReference);

      const projectData = {
        title,
        stage,
        status,
        progress,
        currentUpdate,
        completedTasks,
        upcomingTasks,
        liveUrl,
        updatedAt: serverTimestamp(),
        updatedBy: currentAdmin.uid
      };

      if (startDateValue) {
        projectData.startDate =
          Timestamp.fromDate(
            new Date(`${startDateValue}T12:00:00`)
          );
      }

      if (dueDateValue) {
        projectData.estimatedCompletion =
          Timestamp.fromDate(
            new Date(`${dueDateValue}T12:00:00`)
          );
      }

      if (!existingProject.exists()) {
        projectData.createdAt =
          serverTimestamp();
      }

      await setDoc(
        projectReference,
        projectData,
        {
          merge: true
        }
      );

      showStatus(
        projectFormStatus,
        "Project update saved successfully.",
        "success"
      );

      sendDeviceNotification(
        "Project updated",
        `${title} is now ${progress}% complete.`
      );
    } catch (error) {
      console.error(
        "Project update failed:",
        error
      );

      showStatus(
        projectFormStatus,
        error.message ||
          "The project could not be saved.",
        "error"
      );
    }
  }
);


/* =========================================================
   CREATE INVOICE
========================================================= */

invoiceForm?.addEventListener(
  "submit",
  async (event) => {
    event.preventDefault();
    hideStatus(invoiceFormStatus);

    const userId = invoiceClientSelect.value;

    const invoiceNumber =
      document.getElementById("invoice-number")
        .value.trim();

    const amount =
      Number(
        document.getElementById("invoice-amount")
          .value
      );

    const dueDateValue =
      document.getElementById("invoice-due-date")
        .value;

    const description =
      document.getElementById("invoice-description")
        .value.trim();

    const pdfUrl =
      document.getElementById("invoice-pdf-url")
        .value.trim();

    if (
      !userId ||
      !invoiceNumber ||
      !amount ||
      !dueDateValue
    ) {
      showStatus(
        invoiceFormStatus,
        "Complete all required invoice fields.",
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

      sendDeviceNotification(
        "Invoice created",
        `${invoiceNumber} was created for ${formatCurrency(amount)}.`
      );
    } catch (error) {
      console.error(
        "Invoice creation failed:",
        error
      );

      showStatus(
        invoiceFormStatus,
        error.message ||
          "The invoice could not be created.",
        "error"
      );
    }
  }
);


/* =========================================================
   UPLOAD CLIENT FILE
========================================================= */

fileForm?.addEventListener(
  "submit",
  (event) => {
    event.preventDefault();
    hideStatus(fileFormStatus);

    const userId = fileClientSelect.value;

    const fileInput =
      document.getElementById("admin-file-input");

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

    const cleanFileName = file.name
      .trim()
      .replace(/\s+/g, "-")
      .replace(/[^a-zA-Z0-9._-]/g, "");

    const storageReference = ref(
      storage,
      `users/${userId}/uploads/` +
      `${Date.now()}-${cleanFileName}`
    );

    const uploadTask = uploadBytesResumable(
      storageReference,
      file,
      {
        contentType:
          file.type ||
          "application/octet-stream",

        customMetadata: {
          originalName: file.name,
          uploadedBy: currentAdmin.uid,
          uploadedFor: userId
        }
      }
    );

    if (fileUploadProgress) {
      fileUploadProgress.hidden = false;
      fileUploadProgress.value = 0;
    }

    uploadTask.on(
      "state_changed",

      (snapshot) => {
        const percentage = Math.round(
          (
            snapshot.bytesTransferred /
            snapshot.totalBytes
          ) * 100
        );

        if (fileUploadProgress) {
          fileUploadProgress.value = percentage;
        }

        showStatus(
          fileFormStatus,
          `Uploading file: ${percentage}%`
        );
      },

      (error) => {
        console.error(
          "File upload failed:",
          error
        );

        if (fileUploadProgress) {
          fileUploadProgress.hidden = true;
        }

        showStatus(
          fileFormStatus,
          error.message ||
            "The file could not be uploaded.",
          "error"
        );
      },

      () => {
        fileForm.reset();

        if (fileUploadProgress) {
          fileUploadProgress.hidden = true;
          fileUploadProgress.value = 0;
        }

        showStatus(
          fileFormStatus,
          "File uploaded to the client portal.",
          "success"
        );

        sendDeviceNotification(
          "Client file uploaded",
          `${file.name} was uploaded successfully.`
        );
      }
    );
  }
);


/* =========================================================
   LOGOUT
========================================================= */

logoutButton?.addEventListener(
  "click",
  async () => {
    try {
      await signOut(auth);
      window.location.replace("login.html");
    } catch (error) {
      console.error("Logout failed:", error);
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

    if (!user.emailVerified) {
      await signOut(auth);
      window.location.replace("login.html?verify=1");
      return;
    }

    try {
      const profileSnapshot = await getDoc(
        doc(db, "users", user.uid)
      );

      const profile = profileSnapshot.exists()
        ? profileSnapshot.data()
        : {};

      const role = String(profile.role || "")
        .trim()
        .toLowerCase();

      if (role !== "admin") {
        window.location.replace(
          "client-portal.html"
        );

        return;
      }

      currentAdmin = user;

      if (adminEmail) {
        adminEmail.textContent =
          user.email || "Administrator";
      }

      document.documentElement.style.visibility =
        "visible";

      watchClients();
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
