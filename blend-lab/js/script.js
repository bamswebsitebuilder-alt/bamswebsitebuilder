document.addEventListener("DOMContentLoaded", () => {
  const body = document.body;
  const header = document.querySelector(".site-header");
  const menuButton = document.querySelector(".menu-button");
  const navigation = document.querySelector(".main-nav");
  const closeButton = document.querySelector(".drawer-close");
  const overlay = document.querySelector(".nav-overlay");
  const navLinks = [...document.querySelectorAll(".nav-links a[href^='#']")];
  const isSpanish = document.documentElement.lang.toLowerCase().startsWith("es");

  const setMenu = (open) => {
    if (!menuButton || !navigation) return;
    navigation.classList.toggle("open", open);
    menuButton.classList.toggle("active", open);
    overlay?.classList.toggle("open", open);
    body.classList.toggle("menu-open", open);
    menuButton.setAttribute("aria-expanded", String(open));
    menuButton.setAttribute("aria-label", open ? (isSpanish ? "Cerrar navegación" : "Close navigation") : (isSpanish ? "Abrir navegación" : "Open navigation"));
    overlay?.setAttribute("aria-hidden", String(!open));
    if (open) closeButton?.focus();
  };

  menuButton?.addEventListener("click", () => setMenu(!navigation?.classList.contains("open")));
  closeButton?.addEventListener("click", () => setMenu(false));
  overlay?.addEventListener("click", () => setMenu(false));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });
  window.addEventListener("resize", () => { if (window.innerWidth > 820) setMenu(false); });

  navLinks.forEach(link => link.addEventListener("click", () => setMenu(false)));

  const updateHeader = () => header?.classList.toggle("scrolled", window.scrollY > 20);
  updateHeader();
  window.addEventListener("scroll", updateHeader, { passive: true });

  // Highlight the section currently in view.
  const sections = navLinks.map(link => document.querySelector(link.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const observer = new IntersectionObserver(entries => {
      const visible = entries.filter(e => e.isIntersecting).sort((a,b) => b.intersectionRatio-a.intersectionRatio)[0];
      if (!visible) return;
      navLinks.forEach(link => {
        const active = link.getAttribute("href") === `#${visible.target.id}`;
        link.classList.toggle("active", active);
        if (active) link.setAttribute("aria-current", "page"); else link.removeAttribute("aria-current");
      });
    }, { rootMargin: "-35% 0px -55% 0px", threshold: [0,.2,.5] });
    sections.forEach(section => observer.observe(section));
  }

  // Preselect a service when a service card button is used.
  const serviceSelect = document.querySelector("#service");
  document.querySelectorAll("[data-service]").forEach(button => button.addEventListener("click", () => {
    if (serviceSelect) {
      serviceSelect.value = button.dataset.service || "";
      window.setTimeout(() => serviceSelect.focus({ preventScroll: true }), 450);
    }
  }));

  // Prevent selecting past dates.
  const dateInput = document.querySelector("#date");
  if (dateInput) {
    const today = new Date();
    const local = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().split("T")[0];
    dateInput.min = local;
  }

  document.querySelectorAll("[data-current-year]").forEach(el => el.textContent = new Date().getFullYear());

  // Lightweight gallery lightbox.
  const galleryImages = document.querySelectorAll(".gallery-grid img");
  if (galleryImages.length) {
    const lightbox = document.createElement("div");
    lightbox.className = "lightbox";
    lightbox.setAttribute("aria-hidden", "true");
    lightbox.innerHTML = '<button class="lightbox-close" type="button" aria-label="Close image">×</button><img alt="">';
    body.appendChild(lightbox);
    const lightboxImage = lightbox.querySelector("img");
    const closeLightbox = () => { lightbox.classList.remove("open"); lightbox.setAttribute("aria-hidden", "true"); body.classList.remove("menu-open"); };
    galleryImages.forEach(img => img.addEventListener("click", () => {
      lightboxImage.src = img.currentSrc || img.src;
      lightboxImage.alt = img.alt;
      lightbox.classList.add("open");
      lightbox.setAttribute("aria-hidden", "false");
      body.classList.add("menu-open");
      lightbox.querySelector("button")?.focus();
    }));
    lightbox.addEventListener("click", e => { if (e.target === lightbox || e.target.closest(".lightbox-close")) closeLightbox(); });
    document.addEventListener("keydown", e => { if (e.key === "Escape") closeLightbox(); });
  }
});
