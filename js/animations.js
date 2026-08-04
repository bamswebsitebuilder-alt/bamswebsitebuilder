"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const candidates = document.querySelectorAll(
        ".home-card, " +
        ".service-card, " +
        ".price-card, " +
        ".portfolio-card, " +
        ".review-summary-card, " +
        ".portal-card, " +
        ".admin-card, " +
        ".admin-stat-card"
    );

    candidates.forEach((element, index) => {
        if (!element.hasAttribute("data-reveal")) {
            element.setAttribute("data-reveal", "");
            element.setAttribute("data-reveal-delay", String(index % 4));
        }
    });

    if ("IntersectionObserver" in window) {
        const observer = new IntersectionObserver(
            entries => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            {
                threshold: 0.01,
                rootMargin: "0px 0px 100px 0px"
            }
        );

        candidates.forEach(element => observer.observe(element));
    } else {
        candidates.forEach(element => {
            element.classList.add("is-visible");
        });
    }

    // Phone safety fallback
    window.setTimeout(() => {
        candidates.forEach(element => {
            element.classList.add("is-visible");
        });
    }, 1000);
});