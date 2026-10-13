/* Public-page measurement. Never include query strings, field values, or account data. */
(() => {
  'use strict';
  const id = window.BAM_ANALYTICS_ID;
  const configured = typeof id === 'string' && /^G-[A-Z0-9]+$/.test(id);
  const es = document.documentElement.lang.startsWith('es');
  const pathname = location.pathname.replace(/\.html$/, '').replace(/\/$/, '') || '/';
  if (/\/(?:admin-dashboard|client-portal|login|register|forgot-password)(?:\/|$)/.test(pathname)) return;
  const cleanLocation = location.origin + pathname;
  const consent = () => !!window.BAMCookieConsent?.decided && !!window.BAMCookieConsent?.analytics && !navigator.globalPrivacyControl;
  let loaded = false;
  function tag() { window.dataLayer = window.dataLayer || []; window.dataLayer.push(arguments); }
  const start = () => {
    if (!configured || !consent()) return;
    window['ga-disable-' + id] = false;
    if (loaded) { tag('consent', 'update', { analytics_storage: 'granted' }); return; }
    loaded = true;
    tag('consent', 'default', { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    tag('consent', 'update', { analytics_storage: 'granted' });
    tag('js', new Date());
    tag('config', id, { send_page_view: false, page_location: cleanLocation, page_referrer: '', allow_google_signals: false, allow_ad_personalization_signals: false });
    const script = document.createElement('script');
    script.async = true;
    script.src = 'https://www.googletagmanager.com/gtag/js?id=' + id;
    document.head.append(script);
    track('page_view');
  };
  const track = (event, extra = {}) => {
    if (!configured || !consent() || !loaded) return;
    tag('event', event, { page_location: cleanLocation, page_referrer: '', language: es ? 'es' : 'en', ...extra });
  };
  start();
  window.addEventListener('bam:consent-changed', () => {
    if (consent()) start();
    else if (configured) { window['ga-disable-' + id] = true; if (loaded) tag('consent', 'update', { analytics_storage: 'denied' }); }
  });
  document.addEventListener('click', event => {
    const link = event.target.closest('a');
    if (!link) return;
    const url = new URL(link.href, location.href);
    if (link.classList.contains('template-select')) track('template_select');
    else if (link.classList.contains('template-demo')) track('template_demo_click');
    else if (url.hostname === 'calendar.app.google') track('booking_calendar_open');
    else if (url.protocol === 'tel:') track('phone_click');
    else if (url.protocol === 'mailto:') track('email_click');
    else if (/\/(?:es\/)?contact(?:\.html)?$/.test(url.pathname)) track('quote_click');
  });
  document.addEventListener('submit', event => {
    const form = event.target;
    if (event.defaultPrevented || !form.matches('form[action^="https://formsubmit.co/"]') || !form.checkValidity()) return;
    const kind = form.classList.contains('growth-review-form') ? 'website_review' : 'quote';
    track('inquiry_submit', { inquiry_type: kind });
    if (configured && consent()) {
      try { sessionStorage.setItem('bam-inquiry-pending', JSON.stringify({ kind, time: Date.now() })); } catch {}
    }
  });
  window.addEventListener('bam:newsletter-submit', () => track('newsletter_submit_attempt'));
  // A native provider return is a delivery signal, not proof of inbox delivery or a booking.
  if (/\/(?:es\/)?(?:thank-you|review-thank-you)$/.test(pathname)) {
    try {
      const pending = JSON.parse(sessionStorage.getItem('bam-inquiry-pending'));
      sessionStorage.removeItem('bam-inquiry-pending');
      const kind = pathname.endsWith('/review-thank-you') ? 'website_review' : 'quote';
      if (pending?.kind === kind && Date.now() - pending.time >= 0 && Date.now() - pending.time < 600000) track('inquiry_provider_return', { inquiry_type: kind });
    } catch {}
  }
})();
