/* Brevo reCAPTCHA v3: obtain a fresh token for each native form submission. */
(() => {
  'use strict';
  const siteKey = '6LdMWewtAAAAALhvTMsECRl5Tn3pyITZ2nsrv_JD';
  let captchaLoad;
  function loadCaptcha(language) {
    if (captchaLoad) return captchaLoad;
    captchaLoad = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      const timeout = setTimeout(() => { script.remove(); reject(new Error('CAPTCHA timeout')); }, 15000);
      script.src = 'https://www.google.com/recaptcha/api.js?render=' + siteKey + '&hl=' + language;
      script.async = true;
      script.onload = () => {
        clearTimeout(timeout);
        if (!window.grecaptcha) { reject(new Error('CAPTCHA unavailable')); return; }
        window.grecaptcha.ready(resolve);
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
    const status = document.createElement('p');
    status.setAttribute('role', 'status');
    status.setAttribute('aria-live', 'polite');
    status.hidden = true;
    form.appendChild(status);
    form.addEventListener('submit', async event => {
      event.preventDefault();
      if (form.dataset.captchaPending === 'true' || !form.reportValidity()) return;
      form.dataset.captchaPending = 'true';
      button.disabled = true;
      button.textContent = spanish ? 'Verificando…' : 'Verifying…';
      status.hidden = true;
      let tokenTimeout;
      try {
        await loadCaptcha(spanish ? 'es' : 'en');
        const token = await Promise.race([
          window.grecaptcha.execute(siteKey, { action: 'submit' }),
          new Promise((resolve, reject) => { tokenTimeout = setTimeout(() => reject(new Error('Token timeout')), 15000); })
        ]);
        clearTimeout(tokenTimeout);
        if (!token) throw new Error('Missing CAPTCHA token');
        let input = form.querySelector('input[name="g-recaptcha-response"]');
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
        status.textContent = spanish
          ? 'No se pudo completar la verificación. Inténtalo de nuevo o permite reCAPTCHA en tu navegador.'
          : 'Verification could not be completed. Please try again or allow reCAPTCHA in your browser.';
        status.hidden = false;
        button.disabled = false;
        button.textContent = originalText;
        delete form.dataset.captchaPending;
      }
    });
  });
})();
