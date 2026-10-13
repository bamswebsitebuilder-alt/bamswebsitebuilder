/* Reveal the page as soon as its markup is ready; never wait for chat or images. */
(() => {
  const loader = document.getElementById('bam-loader');
  if (!loader) return;
  let dismissed = false;
  const hide = () => {
    if (dismissed) return;
    dismissed = true;
    loader.classList.add('is-hidden');
    loader.setAttribute('aria-hidden', 'true');
    setTimeout(() => loader.remove(), 180);
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', hide, { once: true });
  else hide();
  setTimeout(hide, 700);
})();
