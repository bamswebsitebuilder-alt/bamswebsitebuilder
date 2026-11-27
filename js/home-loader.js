(() => {
  const dialog = document.getElementById('bam-opening');
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!dialog || typeof dialog.showModal !== 'function' || location.hash ||
      navigation?.type === 'back_forward' || window.scrollY ||
      document.activeElement !== document.body) return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;

  const seenKey = 'bam-braion-opening-seen';
  try {
    if (sessionStorage.getItem(seenKey)) return;
  } catch {
    // The title can still play when storage is unavailable.
  }

  function close() {
    if (dialog.open) dialog.close();
  }

  function skipForReducedMotion(event) {
    if (event.matches) close();
  }

  dialog.showModal();
  const timeout = window.setTimeout(close, 1700);
  dialog.querySelector('.bam-opening-skip').addEventListener('click', close);
  dialog.addEventListener('animationend', (event) => {
    if (event.target === dialog && event.animationName === 'bam-opening-release') close();
  });
  dialog.addEventListener('close', () => {
    window.clearTimeout(timeout);
    motion.removeEventListener('change', skipForReducedMotion);
  }, { once: true });
  motion.addEventListener('change', skipForReducedMotion);

  try {
    sessionStorage.setItem(seenKey, 'true');
  } catch {
    // Navigation stays available even when storage is disabled.
  }
})();
