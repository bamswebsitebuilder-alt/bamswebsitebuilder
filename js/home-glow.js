/* Start the homepage atmosphere automatically; visitors can pause at any time. */
(() => {
  const hero = document.querySelector('.hero-gold-motion');
  const button = hero?.querySelector('.hero-motion-toggle');
  if (!button) return;
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
  let paused = false;
  const syncMotion = () => {
    hero.dataset.motionPaused = String(paused);
    button.hidden = false;
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = spanish
      ? (paused ? 'Reanudar animación' : 'Pausar animación')
      : (paused ? 'Resume animation' : 'Pause animation');
  };
  syncMotion();
  button.addEventListener('click', () => {
    paused = !paused;
    syncMotion();
  });
})();
