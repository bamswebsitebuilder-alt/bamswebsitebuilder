document.addEventListener("DOMContentLoaded", () => {
    const menuButton = document.querySelector(".menu-button");
    const navigation = document.querySelector(".main-nav");
    const navigationLinks = document.querySelectorAll(".main-nav a");

    if (!menuButton || !navigation) {
        return;
    }

    const openMenu = () => {
        navigation.classList.add("open");
        menuButton.classList.add("active");
        document.body.classList.add("menu-open");
        menuButton.setAttribute("aria-expanded", "true");
        menuButton.setAttribute("aria-label", "Close navigation");
    };

    const closeMenu = () => {
        navigation.classList.remove("open");
        menuButton.classList.remove("active");
        document.body.classList.remove("menu-open");
        menuButton.setAttribute("aria-expanded", "false");
        menuButton.setAttribute("aria-label", "Open navigation");
    };

    menuButton.addEventListener("click", () => {
        if (navigation.classList.contains("open")) {
            closeMenu();
        } else {
            openMenu();
        }
    });

    navigationLinks.forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") {
            closeMenu();
        }
    });

    document.addEventListener("click", (event) => {
        if (
            navigation.classList.contains("open") &&
            !navigation.contains(event.target) &&
            !menuButton.contains(event.target)
        ) {
            closeMenu();
        }
    });

    window.addEventListener("resize", () => {
        if (window.innerWidth > 820) {
            closeMenu();
        }
    });
});
