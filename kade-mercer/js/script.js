"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const body = document.body;
    const menuButton = document.querySelector(".menu-button");
    const navigation = document.querySelector(".main-nav");
    const closeButton = document.querySelector(".menu-close");
    const overlay = document.querySelector(".menu-overlay");
    const navigationLinks = document.querySelectorAll(".main-nav a");
    const newsletterForm = document.querySelector(".newsletter-form");

    if (!menuButton || !navigation || !overlay) {
        return;
    }

    const isSpanish = document.documentElement.lang.toLowerCase().startsWith("es");

    const setMenuState = (isOpen) => {
        navigation.classList.toggle("open", isOpen);
        overlay.classList.toggle("open", isOpen);
        menuButton.classList.toggle("active", isOpen);
        body.classList.toggle("menu-open", isOpen);

        menuButton.setAttribute("aria-expanded", String(isOpen));
        menuButton.setAttribute(
            "aria-label",
            isOpen
                ? (isSpanish ? "Cerrar navegación" : "Close navigation")
                : (isSpanish ? "Abrir navegación" : "Open navigation")
        );

        overlay.setAttribute("aria-hidden", String(!isOpen));
        navigation.setAttribute("aria-hidden", String(!isOpen && window.innerWidth <= 760));

        if (isOpen) {
            closeButton?.focus();
        }
    };

    const openMenu = () => setMenuState(true);
    const closeMenu = () => setMenuState(false);

    menuButton.addEventListener("click", () => {
        navigation.classList.contains("open") ? closeMenu() : openMenu();
    });

    closeButton?.addEventListener("click", closeMenu);
    overlay.addEventListener("click", closeMenu);

    navigationLinks.forEach((link) => {
        link.addEventListener("click", () => {
            if (window.innerWidth <= 760) closeMenu();
        });
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape" && navigation.classList.contains("open")) {
            closeMenu();
            menuButton.focus();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 760) {
            closeMenu();
            navigation.removeAttribute("aria-hidden");
        } else if (!navigation.classList.contains("open")) {
            navigation.setAttribute("aria-hidden", "true");
        }
    });

    if (window.innerWidth <= 760) {
        navigation.setAttribute("aria-hidden", "true");
    }

    newsletterForm?.addEventListener("submit", (event) => {
        event.preventDefault();
        const email = newsletterForm.querySelector('input[type="email"]');
        if (!email?.value.trim()) {
            email?.focus();
            return;
        }
        alert(isSpanish
            ? "Gracias. La lista de lectores estará disponible próximamente."
            : "Thank you. The reader list will be available soon.");
        newsletterForm.reset();
    });
});
