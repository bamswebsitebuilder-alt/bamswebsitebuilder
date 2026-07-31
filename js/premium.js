(() => {
  const targets = document.querySelectorAll('.home-card, .portfolio-card, .price-card, .review-summary-card, .service-row, .review-panel, .review-cta, .contact-form');
  targets.forEach((el) => el.classList.add('reveal-premium'));

  if (!('IntersectionObserver' in window)) {
    targets.forEach((el) => el.classList.add('is-visible'));
    return;
  }

  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.12, rootMargin: '0px 0px -40px 0px' });

  targets.forEach((el) => observer.observe(el));
})();
