/* Keep decorative motion optional without depending on browser storage. */
(() => {
  const hero = document.querySelector('.hero-gold-motion');
  const button = hero?.querySelector('.hero-motion-toggle');
  if (!button) return;
  const spanish = document.documentElement.lang === 'es';
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  const syncVisibility = () => { button.hidden = reducedMotion.matches; };
  syncVisibility();
  reducedMotion.addEventListener('change', syncVisibility);
  button.addEventListener('click', () => {
    const paused = button.getAttribute('aria-pressed') !== 'true';
    hero.dataset.motionPaused = String(paused);
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = spanish
      ? (paused ? 'Reanudar animación' : 'Pausar animación')
      : (paused ? 'Resume animation' : 'Pause animation');
  });
})();
