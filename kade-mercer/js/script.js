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
        requestAnimationFrame(() => closeButton?.focus());
    };

    const closeMenu = (restoreFocus = false) => {
        navigation.classList.remove("open");
        overlay?.classList.remove("open");
        menuButton.classList.remove("active");
        document.body.classList.remove("menu-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", isSpanish ? "Abrir navegación" : "Open navigation");
        if (restoreFocus) menuButton.focus();
    };

    menuButton.addEventListener("click", () => {
        navigation.classList.contains("open") ? closeMenu() : openMenu();
    });

    closeButton?.addEventListener("click", () => closeMenu(true));
    overlay?.addEventListener("click", () => closeMenu(true));

    navigationLinks.forEach((link) => {
        if (link.getAttribute("href")?.startsWith("#")) {
            link.addEventListener("click", () => closeMenu());
        }
    });

    document.addEventListener("keydown", (event) => {
        if (!navigation.classList.contains("open")) return;
        if (event.key === "Escape") closeMenu(true);
        if (event.key === "Tab") {
            const focusable = [...navigation.querySelectorAll('a[href], button')].filter(element => element.getClientRects().length);
            const first = focusable[0];
            const last = focusable[focusable.length - 1];
            if (event.shiftKey && document.activeElement === first) {
                event.preventDefault(); last?.focus();
            } else if (!event.shiftKey && document.activeElement === last) {
                event.preventDefault(); first?.focus();
            }
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 780) closeMenu();
    });
});
