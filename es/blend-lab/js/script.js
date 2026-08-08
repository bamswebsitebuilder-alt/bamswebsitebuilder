document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const header = document.querySelector(".site-header");
    const menuButton = document.querySelector(".menu-button");
    const navigation = document.querySelector(".main-nav");
    const closeButton = document.querySelector(".drawer-close");
    const overlay = document.querySelector(".nav-overlay");
    const navLinks = [...document.querySelectorAll(".main-nav .nav-links a[href^='#']")];
    const isSpanish = document.documentElement.lang.toLowerCase().startsWith("es");

    const setMenu = (open) => {
        if (!menuButton || !navigation) return;

        navigation.classList.toggle("open", open);
        menuButton.classList.toggle("active", open);
        overlay?.classList.toggle("open", open);
        body.classList.toggle("menu-open", open);

        menuButton.setAttribute("aria-expanded", String(open));
        menuButton.setAttribute(
            "aria-label",
            open
                ? (isSpanish ? "Cerrar navegación" : "Close navigation")
                : (isSpanish ? "Abrir navegación" : "Open navigation")
        );
        overlay?.setAttribute("aria-hidden", String(!open));

        if (open) {
            window.setTimeout(() => closeButton?.focus(), 50);
        }
    };

    menuButton?.addEventListener("click", () => {
        setMenu(!navigation?.classList.contains("open"));
    });

    closeButton?.addEventListener("click", () => setMenu(false));
    overlay?.addEventListener("click", () => setMenu(false));

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            setMenu(false);
            closeLightbox();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 820) setMenu(false);
    });

    navLinks.forEach((link) => {
        link.addEventListener("click", () => setMenu(false));
    });

    const updateHeader = () => {
        header?.classList.toggle("scrolled", window.scrollY > 20);
    };

    updateHeader();
    window.addEventListener("scroll", updateHeader, { passive: true });

    const sections = navLinks
        .map((link) => document.querySelector(link.getAttribute("href")))
        .filter(Boolean);

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            (entries) => {
                const visible = entries
                    .filter((entry) => entry.isIntersecting)
                    .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];

                if (!visible) return;

                navLinks.forEach((link) => {
                    const active = link.getAttribute("href") === `#${visible.target.id}`;
                    link.classList.toggle("active", active);

                    if (active) {
                        link.setAttribute("aria-current", "page");
                    } else {
                        link.removeAttribute("aria-current");
                    }
                });
            },
            {
                rootMargin: "-30% 0px -58% 0px",
                threshold: [0, 0.2, 0.5]
            }
        );

        sections.forEach((section) => observer.observe(section));
    }

    const serviceSelect = document.querySelector("#service");

    document.querySelectorAll("[data-service]").forEach((button) => {
        button.addEventListener("click", () => {
            if (!serviceSelect) return;
            serviceSelect.value = button.dataset.service || "";
            window.setTimeout(() => serviceSelect.focus({ preventScroll: true }), 450);
        });
    });

    const dateInput = document.querySelector("#date");

    if (dateInput) {
        const now = new Date();
        const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
            .toISOString()
            .split("T")[0];

        dateInput.min = localDate;
    }

    document.querySelectorAll("[data-current-year]").forEach((element) => {
        element.textContent = new Date().getFullYear();
    });

    let lightbox = document.querySelector(".lightbox");

    if (!lightbox) {
        lightbox = document.createElement("div");
        lightbox.className = "lightbox";
        lightbox.setAttribute("aria-hidden", "true");
        lightbox.innerHTML = `
            <button class="lightbox-close" type="button" aria-label="${isSpanish ? "Cerrar imagen" : "Close image"}">×</button>
            <img alt="">
        `;
        body.appendChild(lightbox);
    }

    const lightboxImage = lightbox.querySelector("img");

    function closeLightbox() {
        if (!lightbox) return;
        lightbox.classList.remove("open");
        lightbox.setAttribute("aria-hidden", "true");
        body.classList.remove("menu-open");
    }

    document.querySelectorAll(".gallery-item img, .gallery-grid > img").forEach((image) => {
        image.addEventListener("click", () => {
            if (!lightboxImage) return;
            lightboxImage.src = image.currentSrc || image.src;
            lightboxImage.alt = image.alt || "";
            lightbox.classList.add("open");
            lightbox.setAttribute("aria-hidden", "false");
            body.classList.add("menu-open");
            lightbox.querySelector(".lightbox-close")?.focus();
        });
    });

    lightbox.addEventListener("click", (event) => {
        if (event.target === lightbox || event.target.closest(".lightbox-close")) {
            closeLightbox();
        }
    });
});
