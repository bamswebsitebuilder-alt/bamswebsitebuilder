/* BAM homepage loader: lightweight Matrix-style digital rain. */
(() => {
  const loader = document.getElementById('bam-loader');
  if (!loader || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const canvas = document.createElement('canvas');
  canvas.className = 'bam-matrix-rain';
  canvas.setAttribute('aria-hidden', 'true');
  loader.insertBefore(canvas, loader.firstChild);
  loader.classList.add('has-matrix-rain');
  const ctx = canvas.getContext('2d', { alpha: false });
  if (!ctx) { canvas.remove(); loader.classList.remove('has-matrix-rain'); return; }
  const glyphs = '01アイウエオカキクケコサシスセソ<>/{}';
  const fontSize = 16;
  let width = 0, height = 0, columns = [], raf = 0, last = 0;
  function resize() {
    const rect = loader.getBoundingClientRect();
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    width = Math.max(1, Math.ceil(rect.width));
    height = Math.max(1, Math.ceil(rect.height));
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    canvas.style.width = width + 'px';
    canvas.style.height = height + 'px';
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.fillStyle = '#020604';
    ctx.fillRect(0, 0, width, height);
    columns = Array.from({length: Math.ceil(width / fontSize)}, () => ({
      y: -Math.random() * height / fontSize,
      speed: 0.45 + Math.random() * 0.75
    }));
  }
  function frame(t) {
    if (!loader.isConnected || loader.classList.contains('is-hidden')) {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      return;
    }
    raf = requestAnimationFrame(frame);
    if (t - last < 48) return; // ~20fps keeps the loading effect efficient.
    last = t;
    ctx.fillStyle = 'rgba(2, 6, 4, 0.12)';
    ctx.fillRect(0, 0, width, height);
    ctx.font = '14px ui-monospace, SFMono-Regular, Consolas, monospace';
    for (let i = 0; i < columns.length; i++) {
      const col = columns[i], y = col.y * fontSize;
      const c = glyphs[Math.floor(Math.random() * glyphs.length)];
      ctx.fillStyle = Math.random() > 0.975 ? '#e4be67' : (Math.random() > 0.89 ? '#c3ffe0' : '#19a45c');
      ctx.fillText(c, i * fontSize, y);
      col.y += col.speed;
      if (y > height + 20 && Math.random() > 0.93) col.y = -Math.random() * 24;
    }
  }
  resize();
  window.addEventListener('resize', resize, { passive: true });
  raf = requestAnimationFrame(frame);
})();
