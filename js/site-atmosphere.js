/* One theme-aware backdrop for all BAM pages; keep client demos independent. */
(() => {
  const mount = () => {
    if (document.querySelector('.bam-site-atmosphere')) return;
    const css = document.createElement('link');
    css.rel = 'stylesheet';
    css.href = '/css/site-atmosphere.css?v=20261106-2';
    document.head.append(css);
    document.body.classList.add('bam-motion-site');
    // Retire the homepage-only layer so the same effect continues down every page.
    document.querySelectorAll('.hero-atmosphere, .hero-motion-toggle').forEach(el => el.remove());
    const atmosphere = document.createElement('div');
    atmosphere.className = 'bam-site-atmosphere';
    atmosphere.setAttribute('aria-hidden', 'true');
    const glow = document.createElement('div');
    glow.className = 'bam-site-glow';
    const particles = document.createElement('div');
    particles.className = 'bam-site-particles';
    [[8,82],[21,74],[36,88],[49,71],[61,62],[71,35],[79,20],[88,48],[94,15],[57,91],[84,79],[96,65]].forEach(([x,y],i) => {
      const dot = document.createElement('span');
      dot.style.setProperty('--x', `${x}%`);
      dot.style.setProperty('--y', `${y}%`);
      dot.style.setProperty('--delay', `${(-i*1.7).toFixed(1)}s`);
      particles.append(dot);
    });
    atmosphere.append(glow, particles);
    document.body.prepend(atmosphere);
    const preferences = document.createElement('div');
    preferences.className = 'bam-motion-preferences';
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'bam-site-motion-toggle';
    preferences.append(button);
    (document.querySelector('.home-footer') || document.body).append(preferences);
    const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
    const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    let paused = false;
    try { paused = localStorage.getItem('bam-background-paused') === 'true'; } catch {}
    const sync = () => {
      document.body.dataset.backgroundPaused = String(paused || document.hidden);
      button.setAttribute('aria-pressed', String(paused));
      button.textContent = spanish
        ? (paused ? 'Reanudar animación de fondo' : 'Pausar animación de fondo')
        : (paused ? 'Resume background animation' : 'Pause background animation');
      preferences.hidden = motionQuery.matches;
    };
    button.addEventListener('click', () => {
      paused = !paused;
      try { localStorage.setItem('bam-background-paused', String(paused)); } catch {}
      sync();
    });
    document.addEventListener('visibilitychange', sync);
    motionQuery.addEventListener('change', sync);
    sync();
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', mount, {once:true});
  else mount();
})();
