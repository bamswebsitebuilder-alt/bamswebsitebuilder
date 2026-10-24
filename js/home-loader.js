/* Show the logo briefly once ready, without waiting for chat or other page assets. */
(() => {
  const loader = document.getElementById('bam-loader');
  if (!loader) return;
  const logo = loader.querySelector('.bam-loader-logo-image');
  let dismissed = false;
  let scheduled = false;
  const hide = () => {
    if (dismissed) return;
    dismissed = true;
    loader.classList.add('is-hidden');
    loader.setAttribute('aria-hidden', 'true');
    setTimeout(() => loader.remove(), 600);
  };
  // Always release the page if the logo is slow or unavailable.
  const fallback = setTimeout(hide, 3500);
  const revealAfterLogo = () => {
    if (scheduled || dismissed) return;
    scheduled = true;
    const ready = () => {
      if (dismissed) return;
      setTimeout(() => {
        clearTimeout(fallback);
        hide();
      }, 1200);
    };
    if (logo && typeof logo.decode === 'function') {
      logo.decode().then(ready, ready);
    } else {
      ready();
    }
  };
  if (!logo || logo.complete) revealAfterLogo();
  else {
    logo.addEventListener('load', revealAfterLogo, { once: true });
    logo.addEventListener('error', revealAfterLogo, { once: true });
  }
})();
