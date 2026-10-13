/* Brevo reCAPTCHA v3: display an inline badge and obtain fresh submission tokens. */
(() => {
  'use strict';
  const siteKey = '6LdMWewtAAAAALhvTMsECRl5Tn3pyITZ2nsrv_JD';
  let captchaLoad;
  function loadCaptcha(language) {
    if (captchaLoad) return captchaLoad;
    captchaLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => { script.remove(); reject(new Error('CAPTCHA timeout')); }, 15000);
      script.src = 'https://www.google.com/recaptcha/api.js?render=explicit&hl=' + language;
      script.async = true;
      script.onload = () => {
        if (!window.grecaptcha) { clearTimeout(timeout); reject(new Error('CAPTCHA unavailable')); return; }
        window.grecaptcha.ready(() => { clearTimeout(timeout); resolve(); });
      };
      script.onerror = () => { clearTimeout(timeout); script.remove(); reject(new Error('CAPTCHA unavailable')); };
      document.head.appendChild(script);
    }).catch(error => { captchaLoad = undefined; throw error; });
    return captchaLoad;
  }
  document.querySelectorAll('.bam-email-updates-form').forEach(form => {
    const spanish = document.documentElement.lang === 'es';
    const button = form.querySelector('button[type="submit"]');
    const originalText = button.textContent;
    const badge = document.createElement('div');
    badge.className = 'bam-newsletter-captcha';
    form.querySelector('.bam-newsletter-captcha-notice').before(badge);
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    form.appendChild(status);
    let widgetId;
    let widgetLoad;
    function showCaptcha() {
      if (widgetLoad) return widgetLoad;
      widgetLoad = loadCaptcha(spanish ? 'es' : 'en').then(() => {
        if (widgetId === undefined) {
          widgetId = window.grecaptcha.render(badge, {
            sitekey: siteKey,
            size: 'invisible',
            badge: 'inline'
          });
        }
        return widgetId;
      }).catch(error => { widgetLoad = undefined; throw error; });
      return widgetLoad;
    }
    function showError() {
      status.textContent = spanish
        ? 'No se pudo cargar la verificación. Inténtalo de nuevo o permite reCAPTCHA en tu navegador.'
        : 'Verification could not load. Please try again or allow reCAPTCHA in your browser.';
      status.hidden = false;
    }
    // Load the badge before submission; generate the short-lived token only on submit.
    showCaptcha().catch(showError);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.captchaPending === 'true' || !form.reportValidity()) return;
      form.dataset.captchaPending = 'true';
      button.disabled = true;
      button.textContent = spanish ? 'Verificando…' : 'Verifying…';
      status.hidden = true;
      let tokenTimeout;
      try {
        const clientId = await showCaptcha();
        async function freshToken(action) {
          const value = await Promise.race([
            window.grecaptcha.execute(clientId, { action }),
            new Promise((resolve, reject) => { tokenTimeout = setTimeout(() => reject(new Error('Token timeout')), 15000); })
          ]);
          clearTimeout(tokenTimeout);
          if (!value) throw new Error('Missing CAPTCHA token');
          return value;
        }
        // Enable this attribute only after the server configuration is verified.
        const endpoint = form.dataset.subscriptionCheck;
        if (endpoint) {
          const checkToken = await freshToken('newsletter_status');
          const controller = new AbortController();
          const checkTimeout = setTimeout(() => controller.abort(), 25000);
          let response;
          try {
            response = await fetch(endpoint, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ email: form.querySelector('[name="EMAIL"]').value.trim(), token: checkToken }),
              signal: controller.signal
            });
          } finally { clearTimeout(checkTimeout); }
          if (!response.ok) throw new Error('Subscription check unavailable');
          const result = await response.json();
          if (typeof result.subscribed !== 'boolean') throw new Error('Invalid subscription status');
          if (result.subscribed) {
            status.textContent = spanish
              ? 'Este correo ya está suscrito a nuestras novedades y promociones.'
              : 'This email is already subscribed to our updates and promotions.';
            status.hidden = false;
            button.disabled = false;
            button.textContent = originalText;
            delete form.dataset.captchaPending;
            return;
          }
        }
        // Google tokens are single-use: obtain a separate token for Brevo.
        const token = await freshToken('submit');
        let input = form.querySelector('[name="g-recaptcha-response"]');
        if (!input) {
          input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'g-recaptcha-response';
          form.appendChild(input);
        }
        input.value = token;
        HTMLFormElement.prototype.submit.call(form);
      } catch (error) {
        clearTimeout(tokenTimeout);
        showError();
        button.disabled = false;
        button.textContent = originalText;
        delete form.dataset.captchaPending;
      }
    });
  });
})();
