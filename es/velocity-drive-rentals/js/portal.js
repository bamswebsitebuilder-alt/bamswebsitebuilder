"use strict";

document.addEventListener("DOMContentLoaded", () => {
  const showToast = (message) => {
    let toast = document.querySelector(".portal-toast");

    if (!toast) {
      toast = document.createElement("div");
      toast.className = "portal-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }

    toast.textContent = message;
    toast.classList.add("show");

    window.clearTimeout(showToast.timeout);
    showToast.timeout = window.setTimeout(() => {
      toast.classList.remove("show");
    }, 3200);
  };

  document.querySelectorAll("[data-password-toggle]").forEach((button) => {
    button.addEventListener("click", () => {
      const input = document.getElementById(button.dataset.passwordToggle);
      if (!input) return;

      const showing = input.type === "text";
      input.type = showing ? "password" : "text";
      button.textContent = showing ? "Show" : "Hide";
      button.setAttribute("aria-label", showing ? "Show password" : "Hide password");
    });
  });

  const portalButtons = document.querySelectorAll(".portal-nav-link[data-panel]");
  const portalPanels = document.querySelectorAll(".portal-panel");

  const openPanel = (panelId) => {
    const targetPanel = document.getElementById(panelId);
    if (!targetPanel) return;

    portalButtons.forEach((button) => {
      const active = button.dataset.panel === panelId;
      button.classList.toggle("active", active);
      button.setAttribute("aria-selected", active ? "true" : "false");
    });

    portalPanels.forEach((panel) => {
      panel.classList.toggle("active", panel.id === panelId);
    });

    history.replaceState(null, "", `#${panelId}`);
  };

  portalButtons.forEach((button) => {
    button.setAttribute("role", "tab");
    button.addEventListener("click", () => openPanel(button.dataset.panel));
  });

  if (portalButtons.length && portalPanels.length) {
    const requestedPanel = location.hash.slice(1);
    if (document.getElementById(requestedPanel)?.classList.contains("portal-panel")) {
      openPanel(requestedPanel);
    }
  }

  const uploadTrigger = document.getElementById("upload-trigger");
  const fileInput = document.getElementById("portal-file-input");

  if (uploadTrigger && fileInput) {
    uploadTrigger.addEventListener("click", () => fileInput.click());
    fileInput.addEventListener("change", () => {
      const file = fileInput.files?.[0];
      if (!file) return;
      showToast("Firebase Storage is the next step for real file uploads.");
      fileInput.value = "";
    });
  }

  document.querySelectorAll(".file-row button").forEach((button) => {
    button.addEventListener("click", () => {
      showToast("This download needs a Firebase Storage file URL.");
    });
  });

  document.querySelectorAll("[data-demo-form]").forEach((form) => {
    form.addEventListener("submit", (event) => {
      event.preventDefault();
      showToast("This feature will be connected to Firestore next.");
    });
  });

  document.querySelectorAll("[data-pay-invoice]").forEach((button) => {
    button.addEventListener("click", () => {
      showToast("Connect Stripe, Square, or PayPal to accept invoice payments.");
    });
  });
});
