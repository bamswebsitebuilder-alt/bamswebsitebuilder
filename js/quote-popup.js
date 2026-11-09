(() => {
  'use strict';
  const path = location.pathname.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
  const page = path.replace(/^\/es(?=\/|$)/, '').replace(/\/index$/, '') || '/';
  const pages = new Set(['/', '/home', '/about', '/services', '/prices', '/portfolio', '/templates', '/reviews', '/hosting', '/domains', '/subscriptions', '/faq', '/website-tips', '/project-stories', '/project-checklist', '/tips-compare-quotes', '/tips-prepare-content', '/tips-website-essentials', '/updates']);
  if (!pages.has(page) || window.__bamQuotePopupLoaded) return;
  window.__bamQuotePopupLoaded = true;

  const key = 'bam-quote-popup-seen-v1';
  const seen = () => {
    try { return sessionStorage.getItem(key) === '1'; } catch { return false; }
  };
  if (seen()) return;

  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
  const stylesheet = document.createElement('link');
  stylesheet.rel = 'stylesheet';
  stylesheet.href = '/css/quote-popup.css?v=20261108-2';
  document.head.append(stylesheet);

  let popup;
  let timer;
  const close = () => {
    if (!popup) return;
    const focused = popup.contains(document.activeElement);
    popup.remove();
    popup = null;
    document.removeEventListener('keydown', onKey);
    if (focused) {
      const main = document.querySelector('main');
      if (main) {
        const tabindex = main.getAttribute('tabindex');
        main.setAttribute('tabindex', '-1');
        main.focus({ preventScroll: true });
        if (tabindex === null) main.removeAttribute('tabindex');
        else main.setAttribute('tabindex', tabindex);
      }
    }
  };
  const onKey = (event) => {
    if (event.key === 'Escape' && !event.defaultPrevented) close();
  };
  const show = () => {
    if (seen()) return;
    // Wait until the visitor has finished with menus, consent, and form inputs.
    if (document.hidden || document.body.classList.contains('menu-open') ||
        document.querySelector('.bam-consent-panel.is-open, dialog[open], [aria-modal="true"]:not(.bam-consent-panel):not([hidden]):not([aria-hidden="true"])') ||
        document.activeElement?.matches('input, textarea, select, [contenteditable="true"]')) {
      timer = window.setTimeout(show, 5000);
      return;
    }
    popup = document.createElement('aside');
    popup.className = 'bam-quote-popup';
    popup.setAttribute('aria-labelledby', 'bam-quote-title');
    popup.innerHTML = `
      <button class="bam-quote-close" type="button" aria-label="${spanish ? 'Cerrar invitación' : 'Close quote invitation'}">&times;</button>
      <img class="bam-quote-logo" src="/images/logo-header.jpg" alt="BAM’s Website Builder" width="960" height="426" decoding="async">
      <h2 id="bam-quote-title">${spanish ? '¿Necesitas un sitio web?' : 'Need a website?'}</h2>
      <p class="bam-quote-copy">${spanish ? 'Cuéntanos tu idea. Te ayudaremos a dar el siguiente paso con una cotización gratis y sin compromiso.' : 'Tell us what you have in mind. Let’s find your next step with a free, no-obligation quote.'}</p>
      <a class="bam-quote-cta" href="${spanish ? '/es/contact' : '/contact'}">${spanish ? 'Solicitar cotización gratis' : 'Get a free quote'} <span aria-hidden="true">↗</span></a>
      <button class="bam-quote-later" type="button">${spanish ? 'Ahora no' : 'Maybe later'}</button>`;
    popup.querySelector('.bam-quote-close').addEventListener('click', close);
    popup.querySelector('.bam-quote-later').addEventListener('click', close);
    document.body.append(popup);
    // Mark it when shown, so navigating or using Back never repeats the prompt.
    try { sessionStorage.setItem(key, '1'); } catch {}
    document.addEventListener('keydown', onKey);
  };
  timer = window.setTimeout(show, 25000);
  window.addEventListener('pagehide', () => {
    window.clearTimeout(timer);
    close();
  });
  window.addEventListener('pageshow', (event) => {
    if (event.persisted && !popup && !seen()) timer = window.setTimeout(show, 25000);
  });
})();
