import { auth, db } from "./firebase-config.js";

import {
  addDoc,
  collection,
  doc,
  getDoc,
  increment,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  writeBatch
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-firestore.js";

import {
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/12.11.0/firebase-auth.js";

const messagePanel = document.getElementById("messages");
const messageThread = document.getElementById("portal-message-thread");
const messageForm = document.getElementById("portal-message-form");
const messageText = document.getElementById("portal-message-text");
const messageSendButton = document.getElementById("portal-message-send");
const messageStatus = document.getElementById("portal-message-status");
const messageBadge = document.getElementById("portal-message-count");

let currentUser = null;
let clientName = "Client";
let stopMessages = null;
let stopProfile = null;

const escapeHtml = (value = "") => String(value)
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&#039;");

const formatTime = (value) => {
  if (!value) return "Sending...";

  const date = typeof value?.toDate === "function"
    ? value.toDate()
    : new Date(value);

  if (Number.isNaN(date.getTime())) return "";

  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit"
  }).format(date);
};

const showStatus = (message, type = "") => {
  if (!messageStatus) return;
  messageStatus.hidden = false;
  messageStatus.textContent = message;
  messageStatus.dataset.type = type;
};

const clearStatus = () => {
  if (!messageStatus) return;
  messageStatus.hidden = true;
  messageStatus.textContent = "";
  delete messageStatus.dataset.type;
};

const setComposerEnabled = (enabled) => {
  if (messageText) messageText.disabled = !enabled;
  if (messageSendButton) messageSendButton.disabled = !enabled;
};

const scrollToBottom = () => {
  if (!messageThread) return;
  requestAnimationFrame(() => {
    messageThread.scrollTop = messageThread.scrollHeight;
  });
};

const markAdminMessagesSeen = async (snapshot) => {
  if (!currentUser) return;

  const unseenAdminMessages = snapshot.docs.filter((messageDocument) => {
    const message = messageDocument.data();
    return message.sender === "admin" && message.seen !== true;
  });

  if (unseenAdminMessages.length > 0) {
    const batch = writeBatch(db);
    unseenAdminMessages.forEach((messageDocument) => {
      batch.update(messageDocument.ref, { seen: true });
    });

    try {
      await batch.commit();
    } catch (error) {
      console.warn("Unable to mark messages as seen:", error);
    }
  }

  updateDoc(doc(db, "users", currentUser.uid), {
    unreadByClient: 0
  }).catch((error) => {
    console.warn("Unable to clear client unread count:", error);
  });
};

const renderMessages = (snapshot) => {
  if (!messageThread) return;

  if (snapshot.empty) {
    messageThread.innerHTML = `
      <div class="portal-message-empty">
        <h3>No messages yet</h3>
        <p>Send a message to BAM's Website Builder to start the conversation.</p>
      </div>
    `;
    return;
  }

  messageThread.replaceChildren();

  snapshot.forEach((messageDocument) => {
    const message = messageDocument.data();
    const fromClient = message.sender === "client";

    const row = document.createElement("article");
    row.className = `portal-message-row ${fromClient ? "from-client" : "from-admin"}`;

    row.innerHTML = `
      <div class="portal-message-bubble">
        <p>${escapeHtml(message.text || "")}</p>
        <div class="portal-message-meta">
          <span>${fromClient ? "You" : "BAM's Website Builder"}</span>
          <time>${escapeHtml(formatTime(message.timestamp || message.createdAt))}</time>
          ${fromClient ? `<span>${message.seen ? "Seen" : "Sent"}</span>` : ""}
        </div>
      </div>
    `;

    messageThread.appendChild(row);
  });

  scrollToBottom();
  markAdminMessagesSeen(snapshot);
};

const watchMessages = (user) => {
  if (stopMessages) stopMessages();

  const messagesQuery = query(
    collection(db, "users", user.uid, "messages"),
    orderBy("timestamp", "asc")
  );

  stopMessages = onSnapshot(
    messagesQuery,
    renderMessages,
    (error) => {
      console.error("Unable to load messages:", error);
      if (messageThread) {
        messageThread.innerHTML = `
          <div class="portal-message-empty">
            <h3>Messages could not be loaded</h3>
            <p>Please refresh the page or contact support.</p>
          </div>
        `;
      }
    }
  );
};

const watchMessageSummary = (user) => {
  if (stopProfile) stopProfile();

  stopProfile = onSnapshot(
    doc(db, "users", user.uid),
    (snapshot) => {
      if (!snapshot.exists()) return;

      const profile = snapshot.data();
      clientName = profile.fullName || user.displayName || user.email || "Client";

      const unread = Number(profile.unreadByClient || 0);
      if (messageBadge) {
        messageBadge.textContent = String(unread);
        messageBadge.hidden = unread < 1;
      }
    },
    (error) => {
      console.warn("Unable to load message summary:", error);
    }
  );
};

messageForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!currentUser) {
    showStatus("You must be signed in to send a message.", "error");
    return;
  }

  const text = messageText?.value.trim() || "";
  if (!text) return;

  clearStatus();
  setComposerEnabled(false);

  try {
    await addDoc(collection(db, "users", currentUser.uid, "messages"), {
      sender: "client",
      senderId: currentUser.uid,
      recipientId: "admin",
      text,
      seen: false,
      createdAt: serverTimestamp(),
      timestamp: serverTimestamp()
    });

    updateDoc(doc(db, "users", currentUser.uid), {
      lastMessage: text,
      lastMessageAt: serverTimestamp(),
      unreadByAdmin: increment(1)
    }).catch((error) => {
      console.warn("Message sent, but conversation summary was not updated:", error);
    });

    messageText.value = "";
    messageText.focus();
    showStatus("Message sent.", "success");
    window.setTimeout(clearStatus, 1800);
  } catch (error) {
    console.error("Unable to send message:", error);

    if (error?.code === "permission-denied") {
      showStatus("Firebase blocked the message. Update your Firestore rules.", "error");
    } else {
      showStatus("Your message could not be sent. Please try again.", "error");
    }
  } finally {
    setComposerEnabled(true);
  }
});

messageText?.addEventListener("keydown", (event) => {
  if (event.key === "Enter" && !event.shiftKey) {
    event.preventDefault();
    messageForm?.requestSubmit();
  }
});

document.querySelector('.portal-nav-link[data-panel="messages"]')
  ?.addEventListener("click", () => {
    if (!currentUser) return;
    updateDoc(doc(db, "users", currentUser.uid), {
      unreadByClient: 0
    }).catch(console.warn);
  });

onAuthStateChanged(auth, async (user) => {
  currentUser = user;

  if (!user) {
    setComposerEnabled(false);
    return;
  }

  try {
    const profileSnapshot = await getDoc(doc(db, "users", user.uid));
    const role = String(profileSnapshot.data()?.role || "").trim().toLowerCase();

    if (!profileSnapshot.exists() || role !== "client") {
      setComposerEnabled(false);
      return;
    }

    clientName = profileSnapshot.data().fullName || user.displayName || user.email || "Client";
    setComposerEnabled(true);
    watchMessageSummary(user);
    watchMessages(user);
  } catch (error) {
    console.error("Client message verification failed:", error);
    setComposerEnabled(false);
  }
});

window.addEventListener("beforeunload", () => {
  if (stopMessages) stopMessages();
  if (stopProfile) stopProfile();
});
