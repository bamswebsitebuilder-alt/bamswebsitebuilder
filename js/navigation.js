(() => {
  'use strict';

  const THEME_KEY = 'bam-theme';
  const iconMarkup = (name) => `<span aria-hidden="true" class="mobile-link-icon"><svg viewBox="0 0 24 24"><use href="/images/bam-icons.svg#${name}"></use></svg></span>`;
  const themeEnhancementStyles = `
    .mobile-theme-section{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:18px 0 26px;padding:18px 20px;border:1px solid rgba(212,166,55,.28);border-radius:16px;background:rgba(212,166,55,.07)}
    .mobile-theme-text{display:grid;gap:4px;min-width:0}.mobile-theme-text strong{font-size:.92rem;letter-spacing:.08em;text-transform:uppercase}.mobile-theme-status{color:#bcb6aa;font-size:.82rem;font-weight:650}
    .mobile-theme-toggle{display:inline-flex!important;flex:0 0 58px!important;width:58px!important;height:32px!important;margin:0!important;padding:3px!important;border-radius:999px!important;background:#262626!important;box-shadow:none!important}
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
      const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
      if (button.classList.contains('mobile-theme-toggle')) {
        button.innerHTML = '<span class="theme-switch-track" aria-hidden="true"><span class="theme-switch-thumb"></span></span>';
        const status = button.closest('.mobile-theme-section')?.querySelector('.mobile-theme-status');
        if (status) status.textContent = light
          ? (spanish ? 'Modo claro' : 'Light mode')
          : (spanish ? 'Modo oscuro' : 'Dark mode');
      } else {
        button.innerHTML = light
          ? '<span aria-hidden="true">☾</span>'
          : '<span aria-hidden="true">☀</span>';
      }
      const nextThemeLabel = light
        ? (spanish ? 'Cambiar a modo oscuro' : 'Switch to dark mode')
        : (spanish ? 'Cambiar a modo claro' : 'Switch to light mode');
      button.setAttribute('aria-label', nextThemeLabel);
      button.setAttribute('title', nextThemeLabel);
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
    // The homepage has an authored desktop Pricing link. Keep its matching
    // Services entry from displaying the same destination twice.
    const desktopNav = document.querySelector('.desktop-navigation');
    const directPricing = desktopNav?.querySelector(':scope > a[data-page="prices"]');
    if (directPricing) {
      desktopNav.querySelectorAll('.nav-more-links a[data-page="prices"]').forEach(link => {
        if (link.href === directPricing.href) link.remove();
      });
    }
    // Initialize the mobile drawer before optional navigation enhancements.
    // If a later enhancement fails, the hamburger must still work.
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('menu-overlay');
    const closeButton = document.getElementById('mobile-menu-close');
    const header = document.getElementById('site-header');

    if (!toggle || !menu || !overlay) return;

    const menuStyles = document.createElement('link');
    menuStyles.rel = 'stylesheet';
    menuStyles.href = '/css/mobile-navigation.css?v=3';
    document.head.append(menuStyles);

    menu.inert = true;
    menu.setAttribute('role', 'dialog');
    menu.setAttribute('aria-modal', 'true');
    // Ensure drawer visibility is not overridden by legacy responsive rules.
    if (!document.getElementById('bam-mobile-menu-reliability-style')) {
      const style = document.createElement('style');
      style.id = 'bam-mobile-menu-reliability-style';
      style.textContent = `@media (max-width:1100px){
        body .menu-overlay.active,body .menu-overlay.open{display:block!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
        body .mobile-menu.active,body .mobile-menu.open{display:flex!important;visibility:visible!important;opacity:1!important;transform:translate3d(0,0,0)!important;pointer-events:auto!important;z-index:6000!important}
        body .header-container>.menu-toggle{pointer-events:auto!important;cursor:pointer!important}
      }
      @media (hover:none) and (pointer:coarse){
        body .mobile-navigation a:hover:not(.active):not([aria-current]){color:#fff!important;background:transparent!important;border-bottom-color:rgba(255,255,255,.09)!important}
        body .mobile-navigation a:hover:not(.active):not([aria-current]) .mobile-link-icon{background:transparent!important;border-color:rgba(212,166,55,.55)!important}
      }`;
      document.head.append(style);
    }

    const setOpen = (open) => {
      if (open === (menu.classList.contains('active') || menu.classList.contains('open'))) return;
      toggle.classList.toggle('active', open);
      menu.classList.toggle('active', open);
      menu.classList.toggle('open', open);
      overlay.classList.toggle('active', open);
      overlay.classList.toggle('open', open);
      document.body.classList.toggle('menu-open', open);

      toggle.setAttribute('aria-expanded', String(open));
      menu.setAttribute('aria-hidden', String(!open));
      menu.inert = !open;

      if (open) {
        menu.scrollTop = 0;
        const firstControl = closeButton || menu.querySelector('a, button');
        firstControl?.focus({ preventScroll: true });
        // A newly visible drawer can still be in its previous hit-testing state.
        window.setTimeout?.(() => {
          if (menu.classList.contains('open') && !menu.contains(document.activeElement)) {
            firstControl?.focus({ preventScroll: true });
          }
        }, 120);
      } else {
        toggle.focus({ preventScroll: true });
      }
    };

    const isOpen = () => menu.classList.contains('active') || menu.classList.contains('open');
    const openMenu = () => setOpen(true);
    const closeMenu = () => setOpen(false);

    // Keep the drawer state consistent when navigating within the same
    // document, including fragment links and browser back/forward.
    window.addEventListener('pageshow', () => {
      if (isOpen()) closeMenu();
    });

    // A single capture-phase handler keeps other page scripts from
    // intercepting the mobile toggle or leaving the drawer out of sync.
    toggle.addEventListener('click', (event) => {
      event.preventDefault();
      event.stopPropagation();
      isOpen() ? closeMenu() : openMenu();
    }, true);

    closeButton?.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    // Delegate to the drawer so links added after initialization (blog,
    // checkout, and future navigation entries) also close the menu.
    menu.addEventListener('click', (event) => {
      if (event.target.closest('a[href]')) closeMenu();
    });

    document.addEventListener('keydown', (event) => {
      if (!isOpen()) return;
      if (event.key === 'Escape') { closeMenu(); return; }
      if (event.key !== 'Tab') return;
      const focusable = Array.from(menu.querySelectorAll('a[href], button:not([disabled]), summary, input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'))
        .filter(element => element.getClientRects().length && !element.hidden);
      const first = focusable[0], last = focusable[focusable.length - 1];
      if (!first) return;
      if (event.shiftKey && (document.activeElement === first || !menu.contains(document.activeElement))) {
        event.preventDefault(); last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !menu.contains(document.activeElement))) {
        event.preventDefault(); first.focus();
      }
    });

    window.addEventListener('resize', () => {
      if (getComputedStyle(toggle).display === 'none' && isOpen()) closeMenu();
    });

    const updateHeader = () => {
      if (!header) return;
      const scrolled = window.scrollY > 12;
      header.classList.toggle('header-scrolled', scrolled);
      header.classList.toggle('scrolled', scrolled);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

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
    // Keep Domain Services in the Services group on every shared navigation.
    document.querySelectorAll('.desktop-navigation, .mobile-navigation, .booking-mobile-links').forEach((nav) => {
      if (nav.querySelector('[data-page="domains"]')) return;
      const anchor = nav.querySelector('[data-page="subscriptions"]') || nav.querySelector('[data-page="prices"]') || nav.querySelector('[data-page="services"]');
      if (!anchor) return;
      const link = document.createElement('a');
      link.dataset.page = 'domains';
      link.href = '/domains';
      const label = spanish ? 'Servicios de dominio' : 'Domain Services';
      if (nav.classList.contains('desktop-navigation')) link.textContent = label;
      else link.innerHTML = `${iconMarkup('services')}<span>${label}</span>`;
      if (['/domains', '/domains/', '/domains.html'].includes(location.pathname)) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
      anchor.insertAdjacentElement('afterend', link);
    });

    // Keep the Updates resource consistent across the shared desktop and mobile menus.
    const updatesHref = spanish ? '/es/updates' : '/updates';
    const updatesLabel = spanish ? 'Últimas novedades' : 'Latest Updates';
    const updatesCurrent = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '') === updatesHref;
    document.querySelectorAll('.desktop-navigation, .mobile-navigation, .booking-mobile-links').forEach((nav) => {
      if (nav.querySelector('[data-page="updates"]')) return;
      const tips = nav.querySelector('[data-page="website-tips"]');
      if (!tips) return;
      const link = document.createElement('a');
      link.dataset.page = 'updates';
      link.href = updatesHref;
      if (nav.classList.contains('desktop-navigation')) link.textContent = updatesLabel;
      else link.innerHTML = `${iconMarkup('services')}<span>${updatesLabel}</span>`;
      if (updatesCurrent) {
        link.classList.add('active');
        link.setAttribute('aria-current', 'page');
      }
      tips.insertAdjacentElement('afterend', link);
    });

    document.querySelectorAll('a[href="/booking.html"], a[href="/es/booking.html"]').forEach((link) => {
      link.href = spanish ? '/es/booking' : '/booking';
    });

    // Booking lives in the header and mobile drawer.
    document.querySelectorAll('.floating-booking-button').forEach(button => button.remove());

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
      const iconNames = {home:'home',about:'about',services:'services',prices:'prices',subscriptions:'plans',templates:'templates',portfolio:'portfolio',reviews:'reviews',contact:'contact',login:'login','website-tips':'services','website-review':'contact','project-stories':'portfolio',faq:'about',booking:'clock','email-updates':'contact'};
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


    /* BAM site-wide purchase path */
    const publicPath = location.pathname.replace(/\/+$/, '').replace(/\.html$/, '') || '/';
    const localPath = publicPath.replace(/^\/es(?=\/|$)/, '') || '/';
    const skipPurchasePath = ['/', '/contact', '/booking', '/login', '/register', '/forgot-password', '/client-portal', '/admin-dashboard'];
    const publicPages = ['/services','/prices','/subscriptions','/portfolio','/templates','/reviews','/about','/website-tips','/project-stories'];
    if (publicPages.includes(localPath) && !skipPurchasePath.includes(localPath) && !document.querySelector('.bam-next-step')) {
      const spanishPage = document.documentElement.lang.toLowerCase().startsWith('es') || publicPath.startsWith('/es/');
      const band = document.createElement('section');
      band.className = 'bam-next-step';
      band.setAttribute('aria-label', spanishPage ? 'Siguiente paso' : 'Next step');
      band.innerHTML = spanishPage ? `
        <div class="bam-next-step-inner">
          <div><span>¿LISTO PARA EMPEZAR?</span><h2>Elige el siguiente paso que mejor te convenga.</h2></div>
          <div class="bam-next-step-actions">
            <a class="bam-next-primary" href="/es/contact">Solicitar cotización web</a>
            <a href="/es/subscriptions">Planes mensuales</a>
            <a href="/es/prices">Precios de pago único</a>
          </div>
        </div>`
      : `
        <div class="bam-next-step-inner">
          <div><span>READY TO GET STARTED?</span><h2>Choose the next step that fits your business.</h2></div>
          <div class="bam-next-step-actions">
            <a class="bam-next-primary" href="/contact">Request a Website Quote</a>
            <a href="/prices#compare">Website payment plans</a>
            <a href="/prices">One-Time Pricing</a>
          </div>
        </div>`;
      const footer = document.querySelector('footer');
      footer?.insertAdjacentElement('beforebegin', band);
    }

    document.querySelectorAll('.nav-more').forEach((details) => {
      const summary = details.querySelector('summary');
      details.addEventListener('keydown', (event) => {
        if (event.key === 'Escape' && details.open) {
          details.open = false;
          summary?.focus();
        }
      });
      document.addEventListener('click', (event) => {
        if (!details.contains(event.target)) details.open = false;
      });
    });


  });

  // Standardize public quote links and expose the blog in navigation.
  document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.querySelector('.desktop-navigation');
    if (desktop && !desktop.querySelector('a[href="/blog"]')) {
      const a=document.createElement('a'); a.href='/blog'; a.textContent='Blog'; a.dataset.page='blog';
      desktop.insertBefore(a,desktop.querySelector('a[href="/contact"]') || null);
    }
    const mobile = document.querySelector('.mobile-navigation');
    if (mobile) {
      let a = mobile.querySelector('a[href="/blog"]');
      if (!a) {
        a = document.createElement('a');
        a.href = '/blog';
        const group = mobile.querySelector('.mobile-nav-group[aria-labelledby="mobile-group-resources"]')
          || mobile.querySelector('.mobile-nav-group:last-of-type');
        (group || mobile).appendChild(a);
      }
      a.dataset.page = 'blog';
      if (!a.querySelector('.mobile-link-icon')) {
        a.innerHTML = '<span class="mobile-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M5 3.5h11l3 3v14H5zM16 3.5v4h3M8 11h8M8 15h8M8 18h5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"></path></svg></span><span>Blog</span>';
      }
    }
    document.querySelectorAll('a[href]').forEach(a => {
      const url=new URL(a.href, location.href);
      if (url.origin!==location.origin || url.pathname.replace(/\/$/,'')!=='/contact') return;
      const current=a.textContent.trim().replace(/\s+/g,' ');
      if (/^(get a quote|request a website quote|request a quote|discuss your website)$/i.test(current)) a.textContent='Get a Free Quote';
    });
  });
  // Ensure payment options are discoverable from every page's shared navigation.
  document.addEventListener('DOMContentLoaded', () => {
    const desktop = document.querySelector('.desktop-navigation [data-menu-group="services"] .nav-more-links');
    if (desktop && !desktop.querySelector('a[href="/checkout"]')) {
      const a = document.createElement('a');
      a.href = '/checkout'; a.dataset.page = 'checkout'; a.textContent = 'Website checkout';
      desktop.appendChild(a);
    }
    const mobile = document.querySelector('.mobile-navigation');
    if (mobile) {
      let a = mobile.querySelector('a[href="/checkout"]');
      if (!a) {
        a = document.createElement('a');
        a.href = '/checkout';
        const services = mobile.querySelector('.mobile-nav-group[aria-labelledby="mobile-group-services"]');
        (services || mobile).append(a);
      }
      a.dataset.page = 'checkout';
      if (!a.querySelector('.mobile-link-icon')) {
        a.innerHTML = '<span class="mobile-link-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="2.5" y="5" width="19" height="14" rx="2.5" fill="none" stroke="currentColor" stroke-width="1.8"></rect><path d="M2.5 10h19M6.5 15h5M17 15h1" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"></path></svg></span><span>Website checkout</span>';
      }
    }
  });
  // Reconcile highlights after all dynamically created links have been inserted.
  // Section links such as /#email-updates must not highlight on every homepage visit.
  const syncMenuCurrentPage = () => {
    const normalize = path => path.replace(/\.html$/, '').replace(/\/+$/, '') || '/';
    const here = normalize(location.pathname);
    const currentHash = decodeURIComponent(location.hash || '');
    document.querySelectorAll('.desktop-navigation a[data-page], .mobile-navigation a[data-page], .booking-mobile-links a[data-page]').forEach(link => {
      const url = new URL(link.getAttribute('href') || '', location.href);
      const samePage = url.origin === location.origin && normalize(url.pathname) === here;
      const isSection = Boolean(url.hash);
      const active = samePage && (isSection
        ? url.hash === currentHash
        : !(here === '/' && currentHash === '#email-updates' && normalize(url.pathname) === '/'));
      link.classList.toggle('active', active);
      if (active) link.setAttribute('aria-current', isSection ? 'location' : 'page');
      else link.removeAttribute('aria-current');
    });
  };
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', syncMenuCurrentPage);
  } else {
    syncMenuCurrentPage();
  }
  window.addEventListener('hashchange', syncMenuCurrentPage);

  // Enhance the existing links after the shared navigation has populated them.
  ready(() => {
    const menu = document.getElementById('mobile-menu');
    const nav = menu?.querySelector('.mobile-navigation');
    if (!nav) return;

    const quote = menu.querySelector('.mobile-menu-cta');
    const booking = nav.querySelector('a[data-page="booking"]');
    if (quote) {
      nav.before(quote);
      if (booking) quote.append(booking);
    }

    const order = [
      ':scope > a[data-page="home"]',
      'a[data-page="prices"]:not([href*="#"])',
      'a[data-page="portfolio"]',
      '[aria-labelledby="mobile-group-services"]',
      '[aria-labelledby="mobile-group-work"]',
      'a[data-page="contact"]',
      'a[data-page="login"]',
      '[aria-labelledby="mobile-group-resources"]'
    ];
    // Move the existing links so keyboard order follows the visible drawer.
    nav.prepend(...order.map(selector => nav.querySelector(selector)).filter(Boolean));

    const groupIcons = {
      'mobile-group-services': 'services',
      'mobile-group-work': 'portfolio',
      'mobile-group-resources': 'blog'
    };
    nav.querySelectorAll('.mobile-nav-group').forEach(group => {
      const heading = group.querySelector('.mobile-nav-group-title');
      if (!heading) return;

      const section = document.createElement('details');
      section.setAttribute('name', 'mobile-navigation');
      const summary = document.createElement('summary');
      const label = document.createElement('span');
      label.textContent = heading.textContent;
      const icon = groupIcons[heading.id];
      if (icon) summary.insertAdjacentHTML('afterbegin', iconMarkup(icon));
      summary.append(label);
      heading.replaceWith(section);
      group.removeAttribute('aria-labelledby');
      section.append(summary);
      group.querySelectorAll(':scope > a').forEach(link => section.append(link));
    });
    menu.classList.add('bam-mobile-drawer');
  });

  // Consolidate legacy pricing links across existing site headers, footers, and page content.
  const syncPricingLinks = () => {
    document.querySelectorAll('a[href="/subscriptions"],a[href="/subscriptions.html"]').forEach(link => {
      link.setAttribute('href', '/prices#compare');
      if (link.dataset.page === 'subscriptions') link.dataset.page = 'prices';
    });
  };
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', syncPricingLinks);
  else syncPricingLinks();

  // Keep the public footer's policy and learning links consistent across pages.
  document.addEventListener('DOMContentLoaded', () => {
    document.querySelectorAll('footer.home-footer').forEach(footer => {
      const legal = footer.querySelector('.client-resource-links');
      const resources = footer.querySelector('.footer-grid .footer-links') ||
        footer.querySelector('.footer-grid nav[aria-label="Resources"]');
      const add = (parent, href, label) => {
        if (!parent || parent.querySelector('a[href="' + href + '"]')) return;
        const link = document.createElement('a');
        link.href = href;
        link.textContent = label;
        parent.appendChild(link);
      };
      add(legal, '/cookie-policy', 'Cookie policy');
      add(legal, '/accessibility', 'Accessibility');
      // Add the blog to existing resource navigation, without duplicating it.
      if (resources && !footer.querySelector('a[href="/blog"]')) add(resources, '/blog', 'Business blog');
    });
  });
})();
