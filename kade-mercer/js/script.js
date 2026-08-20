document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-button");
    const navigation = document.querySelector(".main-nav");
    const closeButton = document.querySelector(".menu-close");
    const overlay = document.querySelector(".menu-overlay");
    const navigationLinks = document.querySelectorAll(".main-nav a");

    if (!menuButton || !navigation) return;

    const isSpanish = document.documentElement.lang.toLowerCase().startsWith("es");

    const openMenu = () => {
        navigation.classList.add("open");
        overlay?.classList.add("open");
        menuButton.classList.add("active");
        document.body.classList.add("menu-open");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", isSpanish ? "Cerrar navegación" : "Close navigation");
    };

    const closeMenu = () => {
        navigation.classList.remove("open");
        overlay?.classList.remove("open");
        menuButton.classList.remove("active");
        document.body.classList.remove("menu-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", isSpanish ? "Abrir navegación" : "Open navigation");
    };

    menuButton.addEventListener("click", () => {
        navigation.classList.contains("open") ? closeMenu() : openMenu();
    });

    closeButton?.addEventListener("click", closeMenu);
    overlay?.addEventListener("click", closeMenu);

    navigationLinks.forEach((link) => {
        if (link.getAttribute("href")?.startsWith("#")) {
            link.addEventListener("click", closeMenu);
        }
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 780) closeMenu();
    });
});
