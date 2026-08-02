(() => {
  'use strict';
  const main = document.querySelector('main') || document.querySelector('section');
  if (main && !main.id) main.id = 'main-content';
  if (main && !document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main-content';
    skip.textContent = 'Skip to main content';
    document.body.prepend(skip);
  }
  document.querySelectorAll('img:not([loading])').forEach((img, i) => {
    if (i > 0) img.loading = 'lazy';
    img.decoding = 'async';
  });
  document.querySelectorAll('[data-current-year], .current-year').forEach(el => el.textContent = new Date().getFullYear());
  if (!document.querySelector('.back-to-top')) {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'back-to-top';
    button.setAttribute('aria-label', 'Back to top');
    button.textContent = '↑';
    button.addEventListener('click', () => window.scrollTo({top: 0, behavior: 'smooth'}));
    document.body.append(button);
    const update = () => button.classList.toggle('is-visible', window.scrollY > 600);
    update(); window.addEventListener('scroll', update, {passive:true});
  }
})();
