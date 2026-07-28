import { auth, db } from "./firebase-config.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const clientList = document.getElementById("message-client-list");
const clientSearch = document.getElementById("message-client-search");
const chatName = document.getElementById("message-chat-name");
const chatEmail = document.getElementById("message-chat-email");
const thread = document.getElementById("message-thread");
const form = document.getElementById("message-form");
const textInput = document.getElementById("message-text");
const sendButton = document.getElementById("message-send-button");
const statusText = document.getElementById("message-status");
const messageCount = document.getElementById("message-count");

let currentAdmin = null;
let selectedClient = null;
let clients = [];
let stopMessages = null;
let stopClients = null;

function showStatus(message, isError = false) {
  if (!statusText) return;
  statusText.hidden = false;
  statusText.textContent = message;
  statusText.dataset.type = isError ? "error" : "success";
}

function clearStatus() {
  if (!statusText) return;
  statusText.hidden = true;
  statusText.textContent = "";
  delete statusText.dataset.type;
}

function formatTime(value) {
  if (!value) return "";
  const date = typeof value.toDate === "function" ? value.toDate() : new Date(value);
  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
}

function getClientName(client) {
  return client.name || client.fullName || client.displayName || client.email || "Client";
}

function setComposerEnabled(enabled) {
  if (textInput) textInput.disabled = !enabled;
  if (sendButton) sendButton.disabled = !enabled;
}

function scrollThreadToBottom() {
  if (!thread) return;
  requestAnimationFrame(() => {
    thread.scrollTop = thread.scrollHeight;
  });
}

function renderClients(items) {
  if (!clientList) return;

  if (!items.length) {
    clientList.innerHTML = '<p class="admin-status">No clients found.</p>';
    return;
  }

  clientList.innerHTML = "";

  items.forEach((client) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "message-client-button";
    button.dataset.clientId = client.id;

    if (selectedClient?.id === client.id) {
      button.classList.add("active");
    }

    const initials = getClientName(client)
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || "")
      .join("");

    button.innerHTML = `
      <span class="message-client-avatar" aria-hidden="true">${initials || "C"}</span>
      <span class="message-client-copy">
        <strong>${escapeHtml(getClientName(client))}</strong>
        <small>${escapeHtml(client.email || "No email")}</small>
      </span>
      ${client.unreadByAdmin > 0
        ? `<span class="message-unread-badge">${client.unreadByAdmin}</span>`
        : ""}
    `;

    button.addEventListener("click", () => selectClient(client));
    clientList.appendChild(button);
  });
}

function escapeHtml(value = "") {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderMessages(snapshot) {
  if (!thread) return;

  if (snapshot.empty) {
    thread.innerHTML = `
      <div class="message-empty-state">
        <h3>No messages yet</h3>
        <p>Send the first message to this client.</p>
      </div>
    `;
    return;
  }

  thread.innerHTML = "";

  snapshot.forEach((messageDoc) => {
    const message = messageDoc.data();
    const isAdmin = message.sender === "admin";

    const wrapper = document.createElement("article");
    wrapper.className = `message-bubble-row ${isAdmin ? "message-from-admin" : "message-from-client"}`;

    wrapper.innerHTML = `
      <div class="message-bubble">
        <p>${escapeHtml(message.text || "")}</p>
        <div class="message-meta">
          <span>${isAdmin ? "You" : escapeHtml(getClientName(selectedClient || {}))}</span>
          <time>${escapeHtml(formatTime(message.timestamp))}</time>
          ${isAdmin ? `<span>${message.seen ? "Seen" : "Sent"}</span>` : ""}
        </div>
      </div>
    `;

    thread.appendChild(wrapper);

    if (!isAdmin && message.seen !== true) {
      updateDoc(messageDoc.ref, { seen: true }).catch(console.error);
    }
  });

  scrollThreadToBottom();
}

async function selectClient(client) {
  selectedClient = client;
  clearStatus();
  renderClients(filterClients());

  if (chatName) chatName.textContent = getClientName(client);
  if (chatEmail) chatEmail.textContent = client.email || "No email address";
  setComposerEnabled(true);

  if (stopMessages) stopMessages();

  const messagesRef = collection(db, "users", client.id, "messages");
  const messagesQuery = query(messagesRef, orderBy("timestamp", "asc"));

  stopMessages = onSnapshot(
    messagesQuery,
    renderMessages,
    (error) => {
      console.error("Message listener error:", error);
      if (thread) {
        thread.innerHTML = '<p class="admin-status">Unable to load messages.</p>';
      }
    }
  );

  if (client.unreadByAdmin > 0) {
    updateDoc(doc(db, "users", client.id), {
      unreadByAdmin: 0
    }).catch(console.error);
  }
}

function filterClients() {
  const term = clientSearch?.value.trim().toLowerCase() || "";

  if (!term) return clients;

  return clients.filter((client) => {
    const haystack = [
      getClientName(client),
      client.email,
      client.businessName,
      client.business
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();

    return haystack.includes(term);
  });
}

function watchClients() {
  if (stopClients) stopClients();

  stopClients = onSnapshot(
    collection(db, "users"),
    (snapshot) => {
      clients = snapshot.docs
        .map((userDoc) => ({ id: userDoc.id, ...userDoc.data() }))
        .filter((user) => user.role === "client")
        .sort((a, b) => getClientName(a).localeCompare(getClientName(b)));

      renderClients(filterClients());

      const unread = clients.reduce(
        (total, client) => total + Number(client.unreadByAdmin || 0),
        0
      );

      if (messageCount) {
        messageCount.textContent = String(unread);
        messageCount.hidden = unread < 1;
      }
    },
    (error) => {
      console.error("Client listener error:", error);
      if (clientList) {
        clientList.innerHTML = '<p class="admin-status">Unable to load clients.</p>';
      }
    }
  );
}

form?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentAdmin || !selectedClient) {
    showStatus("Choose a client first.", true);
    return;
  }

  const text = textInput?.value.trim();
  if (!text) return;

  clearStatus();
  sendButton.disabled = true;

  try {
    await addDoc(collection(db, "users", selectedClient.id, "messages"), {
      sender: "admin",
      senderId: currentAdmin.uid,
      text,
      seen: false,
      timestamp: serverTimestamp()
    });

    await updateDoc(doc(db, "users", selectedClient.id), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      unreadByClient: Number(selectedClient.unreadByClient || 0) + 1
    }).catch(console.error);

    textInput.value = "";
    textInput.focus();
    showStatus("Message sent.");
    setTimeout(clearStatus, 1800);
  } catch (error) {
    console.error("Send message error:", error);
    showStatus("The message could not be sent.", true);
  } finally {
    sendButton.disabled = false;
  }
});

textInput?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    form?.requestSubmit();
  }
});

clientSearch?.addEventListener("input", () => {
  renderClients(filterClients());
});

onAuthStateChanged(auth, async (user) => {
  currentAdmin = user;

  if (!user) {
    setComposerEnabled(false);
    return;
  }

  try {
    const adminSnapshot = await getDoc(doc(db, "users", user.uid));
    if (!adminSnapshot.exists() || adminSnapshot.data().role !== "admin") {
      setComposerEnabled(false);
      return;
    }

    watchClients();
  } catch (error) {
    console.error("Admin verification error:", error);
    setComposerEnabled(false);
  }
});

window.addEventListener("beforeunload", () => {
  if (stopMessages) stopMessages();
  if (stopClients) stopClients();
});
