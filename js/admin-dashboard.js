document.documentElement.style.visibility = "hidden";

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

const adminEmail = document.getElementById("admin-email");
const logoutButton = document.getElementById("admin-logout");

const navButtons = [...document.querySelectorAll(".admin-nav-button")];
const panels = [...document.querySelectorAll(".admin-panel")];
const quickButtons = [...document.querySelectorAll("[data-open-panel]")];

const clientForm = document.getElementById("client-form");
const clientFormStatus = document.getElementById("client-form-status");
const clientList = document.getElementById("client-list");

const projectForm = document.getElementById("project-form");
const projectFormStatus = document.getElementById("project-form-status");
const projectList = document.getElementById("project-list");
const projectClientSelect = document.getElementById("project-client");
const projectProgress = document.getElementById("project-progress");
const projectProgressValue = document.getElementById("project-progress-value");

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

const menuToggle = document.getElementById("admin-menu-toggle");
const adminSidebar = document.getElementById("admin-sidebar");
const sidebarOverlay = document.getElementById("admin-sidebar-overlay");

const notificationList = document.getElementById("notification-list");
const notificationCount = document.getElementById("notification-count");
const notificationStatus = document.getElementById("notification-status");
const enableBrowserNotificationsButton =
  document.getElementById("enable-browser-notifications");

if (sidebarOverlay) {
  sidebarOverlay.hidden = true;
}

if (adminSidebar && window.innerWidth <= 760) {
  adminSidebar.classList.remove("open");
  adminSidebar.setAttribute("aria-hidden", "true");
}


let currentAdmin = null;
let clientRecords = [];
let invoiceRecords = [];
let projectRecords = [];
let projectUnsubscribers = [];
const projectsByClient = new Map();
let activityRecords = [];
let firstClientSnapshotLoaded = false;
let firstInvoiceSnapshotLoaded = false;
let invoiceUnsubscribers = [];
const invoicesByClient = new Map();

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


const closeMobileMenu = () => {
  if (!adminSidebar || !sidebarOverlay || !menuToggle) return;
  adminSidebar.classList.remove("open");
  adminSidebar.setAttribute("aria-hidden", "true");
  sidebarOverlay.hidden = true;
  menuToggle.setAttribute("aria-expanded", "false");
};

const openMobileMenu = () => {
  if (!adminSidebar || !sidebarOverlay || !menuToggle) return;
  adminSidebar.classList.add("open");
  adminSidebar.setAttribute("aria-hidden", "false");
  sidebarOverlay.hidden = false;
  menuToggle.setAttribute("aria-expanded", "true");
};

menuToggle?.addEventListener("click", () => {
  if (adminSidebar?.classList.contains("open")) {
    closeMobileMenu();
  } else {
    openMobileMenu();
  }
});

sidebarOverlay?.addEventListener("click", closeMobileMenu);

window.addEventListener("resize", () => {
  if (window.innerWidth > 760) {
    adminSidebar?.classList.remove("open");
    adminSidebar?.setAttribute("aria-hidden", "false");
    if (sidebarOverlay) sidebarOverlay.hidden = true;
    menuToggle?.setAttribute("aria-expanded", "false");
  }
});

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

    if (button.dataset.panel === "notifications") {
      markNotificationsSeen();
    }

    if (window.innerWidth <= 760) closeMobileMenu();
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
  if (projectClientSelect) projectClientSelect.innerHTML = options;
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


const linesToArray = (value) => String(value || "")
  .split(/\r?\n/)
  .map((item) => item.trim())
  .filter(Boolean);

const dateInputValue = (value) => {
  if (!value) return "";
  const date = typeof value?.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toISOString().slice(0, 10);
};

const renderProjects = () => {
  if (!projectList) return;
  projectList.replaceChildren();
  if (!projectRecords.length) {
    projectList.innerHTML = '<p class="admin-status">No projects have been assigned yet.</p>';
    return;
  }
  projectRecords.forEach((project) => {
    const client = clientRecords.find((item) => item.id === project.userId);
    const item = document.createElement("div");
    item.className = "admin-list-item";
    const info = document.createElement("div");
    info.className = "admin-list-info";
    const title = document.createElement("strong");
    title.textContent = project.title || "Website Project";
    const meta = document.createElement("div");
    meta.className = "admin-list-meta";
    meta.textContent = [client?.fullName || client?.email || project.userId, project.stage, project.status].filter(Boolean).join(" • ");
    const date = document.createElement("div");
    date.className = "admin-project-date";
    date.textContent = project.estimatedCompletion ? `Estimated completion: ${formatDate(project.estimatedCompletion)}` : "No completion date set";
    info.append(title, meta, date);
    const actions = document.createElement("div");
    actions.className = "admin-list-actions admin-project-progress";
    const percent = document.createElement("strong");
    percent.textContent = `${Math.max(0, Math.min(100, Number(project.progress) || 0))}%`;
    const track = document.createElement("div");
    track.className = "admin-progress-track";
    const fill = document.createElement("div");
    fill.className = "admin-progress-fill";
    fill.style.width = `${Math.max(0, Math.min(100, Number(project.progress) || 0))}%`;
    track.appendChild(fill);
    const edit = document.createElement("button");
    edit.type = "button";
    edit.className = "admin-small-button";
    edit.textContent = "Edit Project";
    edit.addEventListener("click", () => {
      setActivePanel("projects");
      projectClientSelect.value = project.userId;
      document.getElementById("project-title").value = project.title || "";
      document.getElementById("project-stage").value = project.stage || "Planning";
      document.getElementById("project-status").value = project.status || "In Progress";
      projectProgress.value = String(Number(project.progress) || 0);
      projectProgressValue.textContent = `${projectProgress.value}%`;
      document.getElementById("project-start-date").value = dateInputValue(project.startDate);
      document.getElementById("project-due-date").value = dateInputValue(project.estimatedCompletion);
      document.getElementById("project-update").value = project.currentUpdate || "";
      document.getElementById("project-completed").value = (project.completedTasks || []).join("\n");
      document.getElementById("project-upcoming").value = (project.upcomingTasks || []).join("\n");
      document.getElementById("project-live-url").value = project.liveUrl || "";
      projectForm.scrollIntoView({behavior:"smooth", block:"start"});
    });
    actions.append(percent, track, edit);
    item.append(info, actions);
    projectList.appendChild(item);
  });
};

const stopProjectWatchers = () => {
  projectUnsubscribers.forEach((unsubscribe) => unsubscribe());
  projectUnsubscribers = [];
  projectsByClient.clear();
};

const publishProjects = () => {
  projectRecords = [...projectsByClient.values()].filter(Boolean).sort((a,b) => timestampToMillis(b.updatedAt) - timestampToMillis(a.updatedAt));
  renderProjects();
};

const watchProjects = () => {
  stopProjectWatchers();
  if (!clientRecords.length) { projectRecords = []; renderProjects(); return; }
  clientRecords.forEach((client) => {
    const unsubscribe = onSnapshot(
      doc(db, "users", client.id, "projects", "website"),
      (snapshot) => {
        projectsByClient.set(client.id, snapshot.exists() ? { id: snapshot.id, userId: client.id, ...snapshot.data() } : null);
        publishProjects();
      },
      (error) => {
        console.error(`Unable to load project for ${client.id}:`, error);
        projectsByClient.set(client.id, null);
        publishProjects();
      }
    );
    projectUnsubscribers.push(unsubscribe);
  });
};

projectProgress?.addEventListener("input", () => {
  if (projectProgressValue) projectProgressValue.textContent = `${projectProgress.value}%`;
});

projectClientSelect?.addEventListener("change", () => {
  const project = projectRecords.find((item) => item.userId === projectClientSelect.value);
  if (!project) return;
  document.getElementById("project-title").value = project.title || "";
  document.getElementById("project-stage").value = project.stage || "Planning";
  document.getElementById("project-status").value = project.status || "In Progress";
  projectProgress.value = String(Number(project.progress) || 0);
  projectProgressValue.textContent = `${projectProgress.value}%`;
  document.getElementById("project-start-date").value = dateInputValue(project.startDate);
  document.getElementById("project-due-date").value = dateInputValue(project.estimatedCompletion);
  document.getElementById("project-update").value = project.currentUpdate || "";
  document.getElementById("project-completed").value = (project.completedTasks || []).join("\n");
  document.getElementById("project-upcoming").value = (project.upcomingTasks || []).join("\n");
  document.getElementById("project-live-url").value = project.liveUrl || "";
});

projectForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  hideStatus(projectFormStatus);
  const userId = projectClientSelect.value;
  if (!userId || !currentAdmin) return;
  const start = document.getElementById("project-start-date").value;
  const due = document.getElementById("project-due-date").value;
  const submit = projectForm.querySelector('button[type="submit"]');
  submit.disabled = true;
  submit.textContent = "Saving...";
  try {
    await setDoc(doc(db, "users", userId, "projects", "website"), {
      title: document.getElementById("project-title").value.trim(),
      stage: document.getElementById("project-stage").value,
      status: document.getElementById("project-status").value,
      progress: Math.max(0, Math.min(100, Number(projectProgress.value) || 0)),
      startDate: start ? Timestamp.fromDate(new Date(`${start}T12:00:00`)) : null,
      estimatedCompletion: due ? Timestamp.fromDate(new Date(`${due}T12:00:00`)) : null,
      currentUpdate: document.getElementById("project-update").value.trim(),
      completedTasks: linesToArray(document.getElementById("project-completed").value),
      upcomingTasks: linesToArray(document.getElementById("project-upcoming").value),
      liveUrl: document.getElementById("project-live-url").value.trim(),
      updatedAt: serverTimestamp(),
      updatedBy: currentAdmin.uid,
      createdAt: projectsByClient.get(userId)?.createdAt || serverTimestamp()
    }, { merge: true });
    showStatus(projectFormStatus, "Project update published to the client's portal.", "success");
  } catch (error) {
    console.error("Project save failed:", error);
    showStatus(projectFormStatus, "The project could not be saved. Check your Firestore rules.", "error");
  } finally {
    submit.disabled = false;
    submit.textContent = "Save Project Update";
  }
});

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

    const actions = document.createElement("div");
    actions.className = "admin-list-actions";

    const badge = document.createElement("span");
    badge.className =
      `admin-badge ${invoice.status === "paid" ? "paid" : ""}`;
    badge.textContent = invoice.status || "unpaid";

    const toggleButton = document.createElement("button");
    toggleButton.type = "button";
    toggleButton.className =
      `admin-small-button ${invoice.status === "paid" ? "" : "success"}`;
    toggleButton.textContent =
      invoice.status === "paid" ? "Mark Unpaid" : "Mark Paid";

    toggleButton.addEventListener("click", async () => {
      const nextStatus =
        invoice.status === "paid" ? "unpaid" : "paid";

      toggleButton.disabled = true;
      toggleButton.textContent = "Updating...";

      try {
        await updateDoc(
          doc(db, "users", invoice.userId, "invoices", invoice.id),
          {
            status: nextStatus,
            updatedAt: serverTimestamp(),
            paidAt:
              nextStatus === "paid"
                ? serverTimestamp()
                : null,
            updatedBy: currentAdmin.uid
          }
        );
      } catch (error) {
        console.error("Invoice status update failed:", error);
        alert("The invoice status could not be updated.");
      } finally {
        toggleButton.disabled = false;
      }
    });

    actions.append(badge, toggleButton);
    item.append(info, actions);
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


const timestampToMillis = (value) => {
  if (!value) return 0;
  if (typeof value?.toMillis === "function") return value.toMillis();
  const parsed = new Date(value).getTime();
  return Number.isNaN(parsed) ? 0 : parsed;
};

const notifyDevice = (title, body) => {
  if (
    "Notification" in window &&
    Notification.permission === "granted" &&
    document.visibilityState !== "visible"
  ) {
    new Notification(title, { body });
  }
};

const rebuildActivity = () => {
  const clientActivity = clientRecords.map((client) => ({
    id: `client-${client.id}`,
    type: "client",
    title: "New client account",
    detail:
      client.fullName ||
      client.email ||
      "A client account was created.",
    createdAt: client.createdAt,
    time: timestampToMillis(client.createdAt)
  }));

  const invoiceActivity = invoiceRecords.map((invoice) => ({
    id: `invoice-${invoice.userId}-${invoice.id}-${invoice.status}`,
    type: "invoice",
    title:
      invoice.status === "paid"
        ? "Invoice marked paid"
        : "Invoice created",
    detail:
      `${invoice.invoiceNumber || "Invoice"} — ${formatCurrency(invoice.amount)}`,
    createdAt: invoice.updatedAt || invoice.createdAt,
    time: timestampToMillis(invoice.updatedAt || invoice.createdAt)
  }));

  activityRecords = [...clientActivity, ...invoiceActivity]
    .sort((a, b) => b.time - a.time)
    .slice(0, 30);

  renderActivity();
};

const renderActivity = () => {
  if (!notificationList) return;

  notificationList.replaceChildren();

  if (activityRecords.length === 0) {
    notificationList.innerHTML =
      '<p class="admin-status">No recent activity yet.</p>';
    if (notificationCount) notificationCount.hidden = true;
    return;
  }

  const lastSeen =
    Number(localStorage.getItem("bamAdminNotificationsSeenAt")) || 0;

  const unread = activityRecords.filter(
    (activity) => activity.time > lastSeen
  ).length;

  if (notificationCount) {
    notificationCount.textContent = String(unread);
    notificationCount.hidden = unread === 0;
  }

  activityRecords.forEach((activity) => {
    const item = document.createElement("div");
    item.className =
      `admin-list-item admin-notification-item ${
        activity.time > lastSeen ? "unread" : ""
      }`;

    const info = document.createElement("div");
    info.className = "admin-list-info";

    const title = document.createElement("strong");
    title.textContent = activity.title;

    const detail = document.createElement("div");
    detail.className = "admin-list-meta";
    detail.textContent = activity.detail;

    const time = document.createElement("div");
    time.className = "admin-notification-time";
    time.textContent =
      activity.createdAt
        ? formatDate(activity.createdAt)
        : "Recent activity";

    info.append(title, detail, time);
    item.append(info);
    notificationList.appendChild(item);
  });
};

const markNotificationsSeen = () => {
  localStorage.setItem(
    "bamAdminNotificationsSeenAt",
    String(Date.now())
  );

  renderActivity();
};

enableBrowserNotificationsButton?.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    notificationStatus.textContent =
      "This browser does not support device notifications.";
    return;
  }

  const permission = await Notification.requestPermission();

  notificationStatus.textContent =
    permission === "granted"
      ? "Phone/browser notifications are enabled while this dashboard is open."
      : "Notification permission was not granted.";
});

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
      watchInvoices();
      watchProjects();
      renderInvoices();
      updateStats();
      rebuildActivity();

      if (firstInvoiceSnapshotLoaded) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "modified") {
            const data = change.doc.data();
            if (data.status === "paid") {
              notifyDevice(
                "Invoice paid",
                `${data.invoiceNumber || "Invoice"} was marked paid.`
              );
            }
          }
        });
      }

      firstInvoiceSnapshotLoaded = true;
      rebuildActivity();

      if (firstClientSnapshotLoaded) {
        snapshot.docChanges().forEach((change) => {
          if (change.type === "added") {
            const data = change.doc.data();
            if (data.role !== "admin") {
              notifyDevice(
                "New client registered",
                data.fullName || data.email || "A new client joined."
              );
            }
          }
        });
      }

      firstClientSnapshotLoaded = true;
    },
    (error) => {
      console.error("Unable to load clients:", error);
      clientList.innerHTML =
        '<p class="admin-status error">Clients could not be loaded.</p>';
    }
  );
};

const stopInvoiceWatchers = () => {
  invoiceUnsubscribers.forEach((unsubscribe) => unsubscribe());
  invoiceUnsubscribers = [];
  invoicesByClient.clear();
};

const publishInvoices = () => {
  invoiceRecords = [...invoicesByClient.values()]
    .flat()
    .sort((a, b) => {
      const aTime = typeof a.createdAt?.toMillis === "function" ? a.createdAt.toMillis() : 0;
      const bTime = typeof b.createdAt?.toMillis === "function" ? b.createdAt.toMillis() : 0;
      return bTime - aTime;
    });

  renderInvoices();
  updateStats();
  rebuildActivity();
};

const watchInvoices = () => {
  stopInvoiceWatchers();

  if (clientRecords.length === 0) {
    invoiceRecords = [];
    publishInvoices();
    return;
  }

  clientRecords.forEach((client) => {
    const invoicesQuery = query(
      collection(db, "users", client.id, "invoices"),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(
      invoicesQuery,
      (snapshot) => {
        invoicesByClient.set(
          client.id,
          snapshot.docs.map((item) => ({
            id: item.id,
            userId: client.id,
            ...item.data()
          }))
        );
        publishInvoices();
      },
      (error) => {
        console.error(`Unable to load invoices for ${client.id}:`, error);
        invoicesByClient.set(client.id, []);
        publishInvoices();
      }
    );

    invoiceUnsubscribers.push(unsubscribe);
  });
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

    if (String(profile.role || "").trim().toLowerCase() !== "admin") {
      window.location.replace("client-portal.html");
      return;
    }

    currentAdmin = user;
    document.documentElement.style.visibility = "visible";
    adminEmail.textContent = user.email || "Administrator";

    watchClients();
  } catch (error) {
    console.error("Admin verification failed:", error);
    window.location.replace("client-portal.html");
  }
});
