const menuButton = document.querySelector(".menu-button");
const navigation = document.querySelector(".main-nav");
const navigationLinks = document.querySelectorAll(".main-nav a");

menuButton.addEventListener("click", () => {
    const menuIsOpen = navigation.classList.toggle("active");

    menuButton.classList.toggle("active");
    document.body.classList.toggle("menu-open");

    menuButton.setAttribute(
        "aria-expanded",
        menuIsOpen
    );
});

navigationLinks.forEach((link) => {
    link.addEventListener("click", () => {
        navigation.classList.remove("active");
        menuButton.classList.remove("active");
        document.body.classList.remove("menu-open");

        menuButton.setAttribute(
            "aria-expanded",
            "false"
        );
    });
});