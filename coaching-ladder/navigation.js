// Real directory routes also work on hosts without HTML rewrite rules.
(() => {
  const url = new URL(window.location.href);
  const cleanPath = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
  if (cleanPath !== url.pathname) {
    window.location.replace(cleanPath + url.search + url.hash);
    return;
  }
  // Keep navigation independent of Firebase and its CDN.
  const menu = document.getElementById('menu');
  const links = document.getElementById('links');
  const header = document.querySelector('.top');
  function updateOffset() {
    if (header) document.documentElement.style.setProperty('--header-offset', (header.getBoundingClientRect().height + 16) + 'px');
  }
  function setOpen(open) {
    links?.classList.toggle('open', open);
    menu?.setAttribute('aria-expanded', String(open));
    updateOffset();
  }
  menu?.addEventListener('click', () => setOpen(menu.getAttribute('aria-expanded') !== 'true'));
  links?.querySelectorAll('a').forEach(link => link.addEventListener('click', () => setOpen(false)));
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && menu?.getAttribute('aria-expanded') === 'true') {
      setOpen(false);
      menu.focus();
    }
  });
  updateOffset();
  if (header && typeof ResizeObserver !== 'undefined') new ResizeObserver(updateOffset).observe(header);
  // Native anchors preserve section URLs, bookmarks and Back/Forward navigation.
})();
