(() => {
  const dialog = document.getElementById('bam-opening');
  const navigation = performance.getEntriesByType('navigation')[0];
  if (!dialog || typeof dialog.showModal !== 'function' || location.hash || navigation?.type === 'back_forward') return;

  const motion = window.matchMedia('(prefers-reduced-motion: reduce)');
  if (motion.matches) return;

  const seenKey = 'bam-scottie-opening-seen';
  try {
    if (sessionStorage.getItem(seenKey)) return;
  } catch {
    // The intro can still run when storage is disabled.
  }

  document.documentElement.setAttribute('data-opening-preview', '');
  const stage = dialog.querySelector('.bam-opening-frame');
  const image = dialog.querySelector('img');
  const skip = dialog.querySelector('.bam-opening-skip');
  let releaseTimer;
  let hardStop;

  function close() {
    window.clearTimeout(hardStop);
    window.clearTimeout(releaseTimer);
    if (dialog.open) dialog.close();
  }

  function release() {
    if (!dialog.open || dialog.classList.contains('is-releasing')) return;
    dialog.classList.add('is-releasing');
    releaseTimer = window.setTimeout(close, 250);
  }

  skip.addEventListener('click', close);
  dialog.addEventListener('cancel', close);
  dialog.addEventListener('close', close);
  motion.addEventListener('change', event => {
    if (event.matches) close();
  });
  stage.addEventListener('animationend', event => {
    if (event.target === stage && event.animationName === 'bam-opening-flip') release();
  });

  const ready = new Promise(resolve => {
    if (image.complete) resolve(image.naturalWidth > 0);
    else {
      image.addEventListener('load', () => resolve(true), { once: true });
      image.addEventListener('error', () => resolve(false), { once: true });
    }
  });

  const deadline = new Promise(resolve => window.setTimeout(() => resolve(false), 650));
  Promise.race([ready, deadline]).then(loaded => {
    if (!loaded || motion.matches || window.scrollY || document.activeElement !== document.body) return;
    dialog.showModal();
    hardStop = window.setTimeout(close, 3800);
    try {
      sessionStorage.setItem(seenKey, 'true');
    } catch {
      // Navigation stays available even when storage is disabled.
    }
  });
})();
