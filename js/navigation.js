(() => {
  'use strict';

  const THEME_KEY = 'bam-theme';
  const themeEnhancementStyles = `
    .mobile-theme-section{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:18px 0 26px;padding:18px 20px;border:1px solid rgba(212,166,55,.28);border-radius:16px;background:rgba(212,166,55,.07)}
    .mobile-theme-text{display:grid;gap:4px;min-width:0}.mobile-theme-text strong{font-size:.92rem;letter-spacing:.08em;text-transform:uppercase}.mobile-theme-status{color:#bcb6aa;font-size:.82rem;font-weight:650}
    .mobile-theme-toggle{display:inline-flex!important;width:58px!important;height:32px!important;margin:0!important;padding:3px!important;border-radius:999px!important;background:#262626!important;box-shadow:none!important}
    .theme-switch-track{position:relative;display:block;width:100%;height:100%}.theme-switch-thumb{position:absolute;top:0;left:0;width:24px;height:24px;border-radius:50%;background:#f1c75b;box-shadow:0 2px 8px rgba(0,0,0,.32);transition:transform .22s ease,background .22s ease}
    html[data-theme="light"] .mobile-theme-section{background:#f5e7c6;border-color:rgba(138,98,0,.25)}html[data-theme="light"] .mobile-theme-status{color:#66563d}html[data-theme="light"] .mobile-theme-toggle{background:#d9be7a!important}html[data-theme="light"] .theme-switch-thumb{transform:translateX(26px);background:#765300}
    html[data-theme="light"] .final-cta{background:radial-gradient(circle at center,rgba(212,166,55,.16),transparent 60%),#f3ead8!important;color:#20201d!important;border-top:1px solid rgba(138,98,0,.24)!important}
    html[data-theme="light"] .final-cta .home-eyebrow{color:#765300!important}html[data-theme="light"] .final-cta .home-title{color:#20201d!important;text-shadow:none!important}html[data-theme="light"] .final-cta p{color:#514d44!important}
    html[data-theme="light"] .final-cta .home-button{background:#8a6200!important;border-color:#8a6200!important;color:#fff!important}html[data-theme="light"] .final-cta .home-button-secondary{background:#fffdf8!important;border-color:#8a6200!important;color:#654700!important}
    @media(max-width:1100px){.desktop-theme-toggle{display:none!important}}
  `;
  if (!document.getElementById('bam-theme-enhancements')) {
    const style = document.createElement('style');
    style.id = 'bam-theme-enhancements';
    style.textContent = themeEnhancementStyles;
    document.head.append(style);
  }
  const getSavedTheme = () => {
    try {
      return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
    } catch {
      return 'dark';
    }
  };
  const applyTheme = (theme) => {
    document.documentElement.dataset.theme = theme;
    document.documentElement.style.colorScheme = theme;

    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((link) => {
      link.href = theme === 'light'
        ? '/images/icon-light.jpg?v=20260901'
        : '/images/icon-dark.jpg?v=20260901';
      link.type = 'image/jpeg';
    });

    document.querySelectorAll('.hero-logo-bg').forEach((logo) => {
      logo.src = theme === 'light' ? '/images/logo-light.jpg' : '/images/logo-dark.jpg';
    });

    document.querySelectorAll('.theme-toggle').forEach((button) => {
      const light = theme === 'light';
      if (button.classList.contains('mobile-theme-toggle')) {
        button.innerHTML = '<span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-thumb"></span></span>';
        const status = button.closest('.mobile-theme-section')?.querySelector('.mobile-theme-status');
        const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
        if (status) status.textContent = light
          ? (spanish ? 'Modo claro' : 'Light mode')
          : (spanish ? 'Modo oscuro' : 'Dark mode');
      } else {
        button.innerHTML = light
          ? '<span aria-hidden="true">☾</span>'
          : '<span aria-hidden="true">☀</span>';
      }
      button.setAttribute('aria-label', light ? 'Switch to dark mode' : 'Switch to light mode');
      button.setAttribute('title', light ? 'Dark mode' : 'Light mode');
      button.setAttribute('aria-pressed', String(light));
    });
  };

  applyTheme(getSavedTheme());

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('/service-worker.js').catch(() => {});
    }, { once: true });
  }

  ready(() => {
    document.querySelectorAll('.header-container > .theme-toggle').forEach((button) => button.remove());

    const mobileMenu = document.querySelector('.mobile-menu');
    if (mobileMenu && !mobileMenu.querySelector('.mobile-theme-section')) {
      const themeSection = document.createElement('div');
      themeSection.className = 'mobile-theme-section';

      const spanishTheme = document.documentElement.lang.toLowerCase().startsWith('es');
      const themeText = document.createElement('span');
      themeText.className = 'mobile-theme-text';

      const themeLabel = document.createElement('strong');
      themeLabel.textContent = spanishTheme ? 'Apariencia' : 'Appearance';

      const themeStatus = document.createElement('span');
      themeStatus.className = 'mobile-theme-status';
      themeStatus.textContent = document.documentElement.dataset.theme === 'light'
        ? (spanishTheme ? 'Modo claro' : 'Light mode')
        : (spanishTheme ? 'Modo oscuro' : 'Dark mode');

      themeText.append(themeLabel, themeStatus);

      const themeToggle = document.createElement('button');
      themeToggle.className = 'theme-toggle mobile-theme-toggle';
      themeToggle.type = 'button';
      themeToggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        try {
          localStorage.setItem(THEME_KEY, nextTheme);
        } catch {}
        applyTheme(nextTheme);
      });

      themeSection.append(themeText, themeToggle);
      const languageSection = mobileMenu.querySelector('.mobile-language-section');
      mobileMenu.insertBefore(themeSection, languageSection || mobileMenu.querySelector('.mobile-menu-cta'));
    }
    const headerContainer = document.querySelector('.header-container');
    if (headerContainer && !headerContainer.querySelector('.desktop-theme-toggle')) {
      const desktopThemeToggle = document.createElement('button');
      desktopThemeToggle.className = 'theme-toggle desktop-theme-toggle';
      desktopThemeToggle.type = 'button';
      desktopThemeToggle.addEventListener('click', () => {
        const nextTheme = document.documentElement.dataset.theme === 'light' ? 'dark' : 'light';
        try {
          localStorage.setItem(THEME_KEY, nextTheme);
        } catch {}
        applyTheme(nextTheme);
      });
      const menuButton = headerContainer.querySelector('.menu-toggle');
      headerContainer.insertBefore(desktopThemeToggle, menuButton || null);
    }
    applyTheme(getSavedTheme());

    const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
    const aboutHref = spanish ? '/es/about' : '/about';
    const aboutLabel = spanish ? 'Nosotros' : 'About';
    const iconMarkup = (name) => `<span aria-hidden="true" class="mobile-link-icon"><svg viewBox="0 0 24 24"><use href="/images/bam-icons.svg#${name}"></use></svg></span>`;

    document.querySelectorAll('a[href="/booking.html"], a[href="/es/booking.html"]').forEach((link) => {
      link.href = spanish ? '/es/booking' : '/booking';
    });

    const bookingLink = document.querySelector('.desktop-navigation a[data-page="booking"]');
    const desktopBookingLayout = window.matchMedia('(min-width: 1281px)');
    const syncFloatingBooking = () => {
      const currentButton = document.querySelector('.floating-booking-button');
      if (!desktopBookingLayout.matches) {
        currentButton?.remove();
        return;
      }
      if (bookingLink && !currentButton) {
        const floatingBooking = bookingLink.cloneNode(true);
        floatingBooking.className = 'floating-booking-button';
        floatingBooking.removeAttribute('aria-current');
        document.body.append(floatingBooking);
      }
    };
    syncFloatingBooking();
    desktopBookingLayout.addEventListener('change', syncFloatingBooking);

    applyTheme(getSavedTheme());

    document.querySelectorAll('.desktop-navigation').forEach((nav) => {
      if (nav.querySelector('[data-page="about"]')) return;
      const home = nav.querySelector('[data-page="home"]');
      const link = document.createElement('a');
      link.dataset.page = 'about';
      link.href = aboutHref;
      link.textContent = aboutLabel;
      home?.insertAdjacentElement('afterend', link);
    });

    document.querySelectorAll('.mobile-navigation').forEach((nav) => {
      if (!nav.querySelector('[data-page="about"]')) {
        const home = nav.querySelector('[data-page="home"]');
        const link = document.createElement('a');
        link.dataset.page = 'about';
        link.href = aboutHref;
        link.innerHTML = `${iconMarkup('about')}<span>${aboutLabel}</span>`;
        home?.insertAdjacentElement('afterend', link);
      }
      const iconNames = {home:'home',about:'about',services:'services',prices:'prices',subscriptions:'plans',templates:'templates',portfolio:'portfolio',reviews:'reviews',contact:'contact',login:'login'};
      Object.entries(iconNames).forEach(([page, icon]) => {
        const link = nav.querySelector(`[data-page="${page}"]`);
        const current = link?.querySelector('.mobile-link-icon');
        if (current) current.outerHTML = iconMarkup(icon);
        else if (link) link.insertAdjacentHTML('afterbegin', iconMarkup(icon));
      });
    });

    document.querySelectorAll('.footer-links').forEach((links) => {
      if (!links.querySelector(`a[href="${aboutHref}"]`) && links.querySelector('a[href$="services"], a[href="/services"]')) {
        const link = document.createElement('a');
        link.href = aboutHref;
        link.textContent = aboutLabel;
        links.prepend(link);
      }
    });

    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('menu-overlay');
    const closeButton = document.getElementById('mobile-menu-close');
    const header = document.getElementById('site-header');

    if (!toggle || !menu || !overlay) return;

    let lastFocusedElement = null;

    const setOpen = (open) => {
      toggle.classList.toggle('active', open);
      menu.classList.toggle('active', open);
      menu.classList.toggle('open', open);
      overlay.classList.toggle('active', open);
      overlay.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);

      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));

      if (open) {
        lastFocusedElement = document.activeElement;
        window.requestAnimationFrame(() => {
          const firstLink = menu.querySelector('a, button');
          if (firstLink) firstLink.focus({ preventScroll: true });
        });
      } else if (lastFocusedElement && typeof lastFocusedElement.focus === 'function') {
        lastFocusedElement.focus({ preventScroll: true });
        lastFocusedElement = null;
      }
    };

    const isOpen = () => menu.classList.contains('active') || menu.classList.contains('open');
    const openMenu = () => setOpen(true);
    const closeMenu = () => setOpen(false);

    toggle.addEventListener('click', () => {
      isOpen() ? closeMenu() : openMenu();
    });

    closeButton?.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 1100 && isOpen()) closeMenu();
    });

    const updateHeader = () => {
      if (!header) return;
      const scrolled = window.scrollY > 12;
      header.classList.toggle('header-scrolled', scrolled);
      header.classList.toggle('scrolled', scrolled);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  });
})();
