// Real directory routes also work on hosts without HTML rewrite rules.
(() => {
  const url = new URL(window.location.href);
  const cleanPath = url.pathname.replace(/\/index\.html$/, '/').replace(/\.html$/, '/');
  if (cleanPath !== url.pathname) {
    window.location.replace(cleanPath + url.search + url.hash);
    return;
  }

  function scrollToSection(hash) {
    if (!hash || hash === '#') return false;
    let id;
    try { id = decodeURIComponent(hash.slice(1)); } catch { return false; }
    const target = document.getElementById(id);
    if (!target) return false;
    target.scrollIntoView({ block: 'start' });
    target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  }

  // Honor existing section links before removing the fragment from the address.
  if (url.hash) {
    scrollToSection(url.hash);
    history.replaceState(history.state, '', url.pathname + url.search);
  }

  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest('a[href]');
    if (!link || link.hasAttribute('download') || (link.target && link.target !== '_self')) return;
    const destination = new URL(link.href, window.location.href);
    if (destination.origin !== url.origin || destination.pathname !== url.pathname || destination.search !== url.search || !destination.hash) return;
    if (scrollToSection(destination.hash)) event.preventDefault();
  });
})();
