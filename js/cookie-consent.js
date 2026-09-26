(() => {
  'use strict';

  const STORAGE_KEY = 'bam-cookie-consent-v1';
  const STYLE_ID = 'bam-cookie-consent-styles';
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');

  const copy = spanish ? {
    message: 'Al seleccionar “Aceptar”, aceptas el uso de cookies y tecnologías similares para mejorar la navegación del sitio, recordar preferencias y, cuando estén habilitadas, ayudar con análisis y marketing.',
    privacy: 'Ver nuestra Política de Privacidad',
    accept: 'Aceptar',
    decline: 'Rechazar todo',
    settings: 'Configuración',
    title: 'Preferencias de privacidad',
    necessary: 'Necesarias',
    necessaryDesc: 'Requeridas para funciones básicas del sitio y para recordar tus preferencias de privacidad.',
    functional: 'Funcionales',
    functionalDesc: 'Permiten funciones opcionales como el chat en vivo.',
    analytics: 'Analíticas',
    analyticsDesc: 'Ayudan a entender cómo se usa el sitio.',
    marketing: 'Marketing',
    marketingDesc: 'Pueden usarse para medir campañas y personalizar marketing.',
    save: 'Guardar preferencias',
    cancel: 'Cancelar',
    close: 'Cerrar preferencias de cookies'
  } : {
    message: 'By clicking “Accept”, you agree to the use of cookies and similar technologies to improve site navigation, remember preferences, and, when enabled, support analytics and marketing.',
    privacy: 'View our Privacy Policy',
    accept: 'Accept',
    decline: 'Decline All',
    settings: 'Settings',
    title: 'Privacy Preferences',
    necessary: 'Necessary',
    necessaryDesc: 'Required for basic site functions and to remember your privacy choices.',
    functional: 'Functional',
    functionalDesc: 'Enables optional features such as live chat.',
    analytics: 'Analytics',
    analyticsDesc: 'Helps us understand how the website is used.',
    marketing: 'Marketing',
    marketingDesc: 'May be used to measure campaigns and personalize marketing.',
    save: 'Save Preferences',
    cancel: 'Cancel',
    close: 'Close cookie preferences'
  };

  const defaultConsent = {
    necessary: true,
    functional: false,
    analytics: false,
    marketing: false,
    decided: false
  };

  const readConsent = () => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
      return saved && typeof saved === 'object'
        ? { ...defaultConsent, ...saved, necessary: true }
        : { ...defaultConsent };
    } catch {
      return { ...defaultConsent };
    }
  };

  const writeConsent = (consent) => {
    const normalized = { ...defaultConsent, ...consent, necessary: true, decided: true };
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(normalized));
    } catch {}
    window.BAMCookieConsent = normalized;
    window.dispatchEvent(new CustomEvent('bam:consent-changed', { detail: normalized }));
    return normalized;
  };

  window.BAMCookieConsent = readConsent();

  if (!document.getElementById(STYLE_ID)) {
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = `
      .bam-consent-backdrop{position:fixed;inset:0;background:rgba(0,0,0,.38);z-index:2147483000;opacity:0;pointer-events:none;transition:opacity .2s ease}
      .bam-consent-backdrop.is-open{opacity:1;pointer-events:auto}
      .bam-consent-panel{position:fixed;left:50%;bottom:0;transform:translate(-50%,105%);width:min(100%,760px);max-height:min(88vh,760px);overflow:auto;background:#050505;color:#fff;border:1px solid rgba(255,255,255,.13);box-shadow:0 -18px 60px rgba(0,0,0,.55);z-index:2147483001;padding:34px 34px calc(34px + env(safe-area-inset-bottom));transition:transform .28s ease;border-radius:22px 22px 0 0;font-family:inherit}
      .bam-consent-panel.is-open{transform:translate(-50%,0)}
      .bam-consent-close{position:absolute;right:22px;top:18px;width:42px;height:42px;border:0;background:transparent;color:#fff;font-size:38px;line-height:1;cursor:pointer}
      .bam-consent-message{font-size:clamp(1rem,2.4vw,1.22rem);line-height:1.55;margin:0 46px 18px 0;color:#f4f4f4}
      .bam-consent-privacy{display:inline-block;color:#fff;text-decoration:underline;text-underline-offset:4px;margin-bottom:26px}
      .bam-consent-actions{display:grid;gap:14px}
      .bam-consent-btn{width:100%;min-height:58px;border:2px solid #fff;background:transparent;color:#fff;font:inherit;font-weight:700;font-size:1rem;cursor:pointer;transition:transform .15s ease,background .15s ease,color .15s ease}
      .bam-consent-btn:hover{transform:translateY(-1px)}
      .bam-consent-btn.primary{background:#fff;color:#090909}
      .bam-consent-settings-link{border:0;background:transparent;color:#fff;text-decoration:underline;text-underline-offset:4px;font:inherit;font-weight:700;font-size:1rem;cursor:pointer;padding:8px}
      .bam-consent-settings{display:none;margin-top:8px}
      .bam-consent-settings.is-open{display:block}
      .bam-consent-title{font-size:1.45rem;margin:0 48px 20px 0}
      .bam-consent-option{display:flex;gap:16px;align-items:flex-start;padding:18px 0;border-top:1px solid rgba(255,255,255,.16)}
      .bam-consent-option-copy{flex:1}
      .bam-consent-option strong{display:block;margin-bottom:4px}
      .bam-consent-option p{margin:0;color:#cfcfcf;font-size:.93rem;line-height:1.45}
      .bam-consent-toggle{position:relative;flex:0 0 52px;width:52px;height:30px;border:0;border-radius:999px;background:#4d4d4d;cursor:pointer;padding:0}
      .bam-consent-toggle::after{content:'';position:absolute;width:22px;height:22px;left:4px;top:4px;border-radius:50%;background:#fff;transition:transform .18s ease}
      .bam-consent-toggle[aria-pressed="true"]{background:#d4a637}
      .bam-consent-toggle[aria-pressed="true"]::after{transform:translateX(22px)}
      .bam-consent-toggle[disabled]{opacity:.75;cursor:not-allowed}
      .bam-consent-settings-actions{display:grid;gap:12px;margin-top:18px}
      body.bam-consent-open{overflow:hidden}
      @media(min-width:900px){
        .bam-consent-backdrop{background:rgba(0,0,0,.25)}
        .bam-consent-panel{left:auto;right:26px;bottom:26px;transform:translateY(120%);width:min(470px,calc(100% - 52px));border-radius:18px;padding:30px}
        .bam-consent-panel.is-open{transform:translateY(0)}
      }
      @media(max-width:520px){
        .bam-consent-panel{padding:28px 22px calc(24px + env(safe-area-inset-bottom));border-radius:0;max-height:92vh}
        .bam-consent-message{font-size:1.03rem;margin-right:38px}
        .bam-consent-close{right:12px;top:14px}
      }
    `;
    document.head.appendChild(style);
  }

  const build = () => {
    if (document.getElementById('bam-cookie-consent')) return;

    const backdrop = document.createElement('div');
    backdrop.className = 'bam-consent-backdrop';
    backdrop.id = 'bam-consent-backdrop';

    const panel = document.createElement('section');
    panel.className = 'bam-consent-panel';
    panel.id = 'bam-cookie-consent';
    panel.setAttribute('role', 'dialog');
    panel.setAttribute('aria-modal', 'true');
    panel.setAttribute('aria-label', copy.title);

    panel.innerHTML = `
      <button class="bam-consent-close" type="button" aria-label="${copy.close}">×</button>
      <div class="bam-consent-main">
        <p class="bam-consent-message">${copy.message}</p>
        <a class="bam-consent-privacy" href="/privacy-policy">${copy.privacy}</a>
        <div class="bam-consent-actions">
          <button class="bam-consent-btn primary" type="button" data-consent-action="accept">${copy.accept}</button>
          <button class="bam-consent-btn" type="button" data-consent-action="decline">${copy.decline}</button>
          <button class="bam-consent-settings-link" type="button" data-consent-action="settings">${copy.settings}</button>
        </div>
      </div>
      <div class="bam-consent-settings" aria-hidden="true">
        <h2 class="bam-consent-title">${copy.title}</h2>
        <div class="bam-consent-option">
          <div class="bam-consent-option-copy"><strong>${copy.necessary}</strong><p>${copy.necessaryDesc}</p></div>
          <button class="bam-consent-toggle" type="button" aria-pressed="true" disabled aria-label="${copy.necessary}"></button>
        </div>
        <div class="bam-consent-option">
          <div class="bam-consent-option-copy"><strong>${copy.functional}</strong><p>${copy.functionalDesc}</p></div>
          <button class="bam-consent-toggle" type="button" data-consent-toggle="functional" aria-pressed="false" aria-label="${copy.functional}"></button>
        </div>
        <div class="bam-consent-option">
          <div class="bam-consent-option-copy"><strong>${copy.analytics}</strong><p>${copy.analyticsDesc}</p></div>
          <button class="bam-consent-toggle" type="button" data-consent-toggle="analytics" aria-pressed="false" aria-label="${copy.analytics}"></button>
        </div>
        <div class="bam-consent-option">
          <div class="bam-consent-option-copy"><strong>${copy.marketing}</strong><p>${copy.marketingDesc}</p></div>
          <button class="bam-consent-toggle" type="button" data-consent-toggle="marketing" aria-pressed="false" aria-label="${copy.marketing}"></button>
        </div>
        <div class="bam-consent-settings-actions">
          <button class="bam-consent-btn primary" type="button" data-consent-action="save">${copy.save}</button>
          <button class="bam-consent-btn" type="button" data-consent-action="cancel">${copy.cancel}</button>
        </div>
      </div>
    `;

    document.body.append(backdrop, panel);

    const main = panel.querySelector('.bam-consent-main');
    const settings = panel.querySelector('.bam-consent-settings');
    const close = panel.querySelector('.bam-consent-close');

    const openPanel = () => {
      backdrop.classList.add('is-open');
      panel.classList.add('is-open');
      document.body.classList.add('bam-consent-open');
      setTimeout(() => panel.querySelector('button, a')?.focus({ preventScroll: true }), 50);
    };

    const closePanel = () => {
      backdrop.classList.remove('is-open');
      panel.classList.remove('is-open');
      document.body.classList.remove('bam-consent-open');
    };

    const showMain = () => {
      main.style.display = '';
      settings.classList.remove('is-open');
      settings.setAttribute('aria-hidden', 'true');
    };

    const showSettings = () => {
      const current = readConsent();
      panel.querySelectorAll('[data-consent-toggle]').forEach((button) => {
        const key = button.dataset.consentToggle;
        button.setAttribute('aria-pressed', String(Boolean(current[key])));
      });
      main.style.display = 'none';
      settings.classList.add('is-open');
      settings.setAttribute('aria-hidden', 'false');
    };

    panel.addEventListener('click', (event) => {
      const action = event.target.closest('[data-consent-action]')?.dataset.consentAction;
      const toggle = event.target.closest('[data-consent-toggle]');

      if (toggle) {
        toggle.setAttribute('aria-pressed', toggle.getAttribute('aria-pressed') === 'true' ? 'false' : 'true');
        return;
      }

      if (!action) return;

      if (action === 'accept') {
        writeConsent({ functional: true, analytics: true, marketing: true });
        closePanel();
      } else if (action === 'decline') {
        writeConsent({ functional: false, analytics: false, marketing: false });
        closePanel();
      } else if (action === 'settings') {
        showSettings();
      } else if (action === 'cancel') {
        showMain();
      } else if (action === 'save') {
        const chosen = {};
        panel.querySelectorAll('[data-consent-toggle]').forEach((button) => {
          chosen[button.dataset.consentToggle] = button.getAttribute('aria-pressed') === 'true';
        });
        writeConsent(chosen);
        closePanel();
      }
    });

    close.addEventListener('click', () => {
      if (!readConsent().decided) writeConsent({ functional: false, analytics: false, marketing: false });
      closePanel();
    });

    backdrop.addEventListener('click', () => {
      if (!readConsent().decided) writeConsent({ functional: false, analytics: false, marketing: false });
      closePanel();
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && panel.classList.contains('is-open')) {
        if (settings.classList.contains('is-open')) showMain();
        else {
          if (!readConsent().decided) writeConsent({ functional: false, analytics: false, marketing: false });
          closePanel();
        }
      }
    });

    window.BAMOpenCookieSettings = () => {
      showMain();
      showSettings();
      openPanel();
    };

    if (!readConsent().decided) openPanel();
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build, { once: true });
  } else {
    build();
  }
})();