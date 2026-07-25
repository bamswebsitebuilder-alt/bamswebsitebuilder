document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-button");
    const navigation = document.querySelector(".main-nav");
    const closeButton = document.querySelector(".drawer-close");
    const overlay = document.querySelector(".nav-overlay");
    const navigationLinks = document.querySelectorAll(".main-nav a");

    if (!menuButton || !navigation) return;

    const isSpanish = document.documentElement.lang.toLowerCase().startsWith("es");

    const openMenu = () => {
        navigation.classList.add("open");
        menuButton.classList.add("active");
        overlay?.classList.add("open");
        document.body.classList.add("menu-open");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", isSpanish ? "Cerrar navegación" : "Close navigation");
    };

    const closeMenu = () => {
        navigation.classList.remove("open");
        menuButton.classList.remove("active");
        overlay?.classList.remove("open");
        document.body.classList.remove("menu-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", isSpanish ? "Abrir navegación" : "Open navigation");
    };

    menuButton.addEventListener("click", () => navigation.classList.contains("open") ? closeMenu() : openMenu());
    closeButton?.addEventListener("click", closeMenu);
    overlay?.addEventListener("click", closeMenu);
    navigationLinks.forEach(link => link.addEventListener("click", closeMenu));
    document.addEventListener("keydown", event => { if (event.key === "Escape") closeMenu(); });
    window.addEventListener("resize", () => { if (window.innerWidth > 820) closeMenu(); });
});
