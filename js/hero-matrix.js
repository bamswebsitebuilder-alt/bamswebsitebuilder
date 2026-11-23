/* BAM homepage hero: ambient falling digital code behind real content. */
(() => {
  function init() {
    const hero = document.querySelector('body.polished-home .hero.hero-conversion');
    if (!hero || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const canvas = document.createElement('canvas');
    canvas.className = 'bam-hero-matrix';
    canvas.setAttribute('aria-hidden', 'true');
    hero.prepend(canvas);
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) { canvas.remove(); return; }
    const glyphs = '01<>[]{}アイウエオカキクケコ';
    const font = 17;
    let w = 0, h = 0, cols = [], running = false, raf = 0, last = 0;
    function size() {
      const rect = hero.getBoundingClientRect();
      w = Math.max(1, Math.ceil(rect.width));
      h = Math.max(1, Math.ceil(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.ceil(w * dpr);
      canvas.height = Math.ceil(h * dpr);
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      cols = Array.from({ length: Math.ceil(w / font) }, () => ({ y: Math.random() * h / font, speed: .28 + Math.random() * .50 }));
    }
    function draw(time) {
      if (!running || !canvas.isConnected) return;
      raf = requestAnimationFrame(draw);
      if (time - last < 55) return;
      last = time;
      ctx.fillStyle = 'rgba(5, 6, 6, .17)';
      ctx.fillRect(0, 0, w, h);
      ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
      for (let i = 0; i < cols.length; i++) {
        const c = cols[i], y = c.y * font;
        ctx.fillStyle = Math.random() > .95 ? 'rgba(218,174,77,.85)' : 'rgba(56,210,111,.72)';
        ctx.fillText(glyphs[Math.floor(Math.random() * glyphs.length)], i * font, y);
        c.y += c.speed;
        if (y > h + 25) c.y = -(Math.random() * 30);
      }
    }
    function start() { if (running) return; running = true; raf = requestAnimationFrame(draw); }
    function stop() { running = false; cancelAnimationFrame(raf); }
    size();
    window.addEventListener('resize', size, { passive: true });
    if ('IntersectionObserver' in window) {
      const observer = new IntersectionObserver(entries => entries[0].isIntersecting ? start() : stop(), { threshold: 0 });
      observer.observe(hero);
    } else start();
    document.addEventListener('visibilitychange', () => document.hidden ? stop() : start());
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
