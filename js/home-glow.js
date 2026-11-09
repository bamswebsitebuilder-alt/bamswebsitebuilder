/* Keep decorative motion optional without depending on browser storage. */
(() => {
  const hero = document.querySelector('.hero-gold-motion');
  const button = hero?.querySelector('.hero-motion-toggle');
  if (!button) return;
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  let userPaused = null;
  const syncMotion = () => {
    const paused = userPaused ?? reducedMotion.matches;
    hero.dataset.motionPaused = String(paused);
    button.hidden = false;
    button.setAttribute('aria-pressed', String(paused));
    button.textContent = spanish
      ? (paused ? 'Reanudar animación' : 'Pausar animación')
      : (paused ? 'Resume animation' : 'Pause animation');
  };
  syncMotion();
  if (reducedMotion.addEventListener) reducedMotion.addEventListener('change', syncMotion);
  else if (reducedMotion.addListener) reducedMotion.addListener(syncMotion);
  button.addEventListener('click', () => {
    userPaused = hero.dataset.motionPaused !== 'true';
    syncMotion();
  });
})();
