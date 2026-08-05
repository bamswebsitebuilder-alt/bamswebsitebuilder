"use strict";

(() => {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  const revealSelectors = [
    "main > section",
    "main section > .container",
    ".home-card",
    ".service-card",
    ".price-card",
    ".portfolio-card",
    ".template-card",
    ".review-card",
    ".review-summary-card",
    ".contact-card",
    ".contact-form",
    ".portal-card",
    ".admin-card",
    ".admin-stat-card",
    ".feature-card",
    ".process-step",
    ".faq-item"
  ].join(",");

  const revealDirections = ["up", "up", "left", "right"];

  function prepareReveals() {
    const elements = [...document.querySelectorAll(revealSelectors)];

    elements.forEach((element, index) => {
      if (element.closest("header, nav, .mobile-navigation")) return;
      if (!element.hasAttribute("data-reveal")) {
        element.setAttribute("data-reveal", revealDirections[index % revealDirections.length]);
      }
      if (!element.hasAttribute("data-reveal-delay")) {
        element.setAttribute("data-reveal-delay", String(index % 4));
      }
    });

    return elements.filter((element) => !element.closest("header, nav, .mobile-navigation"));
  }

  function revealOnScroll(elements) {
    if (reducedMotion || !("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        observer.unobserve(entry.target);
      });
    }, {
      threshold: 0.12,
      rootMargin: "0px 0px -8% 0px"
    });

    elements.forEach((element) => observer.observe(element));
  }

  function prepareHero() {
    const hero = document.querySelector("main .hero, .hero-section, .home-hero, body > .hero");
    if (!hero) return;

    hero.classList.add("motion-hero");
    const children = hero.querySelectorAll("h1, h2, p, .hero-buttons, .hero-actions, .btn, .secondary-button, img");
    children.forEach((child, index) => {
      child.style.setProperty("--hero-delay", `${Math.min(index, 6) * 90}ms`);
      child.classList.add("motion-hero-item");
    });
    requestAnimationFrame(() => hero.classList.add("is-ready"));
  }

  function prepareImages() {
    document.querySelectorAll(".portfolio-card img, .template-card img, .home-card img, .service-card img").forEach((image) => {
      image.classList.add("motion-image");
    });
  }

  function addPointerGlow() {
    if (reducedMotion || !window.matchMedia("(hover: hover)").matches) return;
    document.querySelectorAll(".home-card, .service-card, .price-card, .portfolio-card, .template-card, .review-card").forEach((card) => {
      card.addEventListener("pointermove", (event) => {
        const rect = card.getBoundingClientRect();
        card.style.setProperty("--pointer-x", `${event.clientX - rect.left}px`);
        card.style.setProperty("--pointer-y", `${event.clientY - rect.top}px`);
      }, { passive: true });
    });
  }

  document.addEventListener("DOMContentLoaded", () => {
    document.documentElement.classList.add("motion-enabled");
    const revealElements = prepareReveals();
    prepareHero();
    prepareImages();
    addPointerGlow();
    revealOnScroll(revealElements);
  });
})();
