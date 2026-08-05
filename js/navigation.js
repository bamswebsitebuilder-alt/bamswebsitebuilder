(() => {
  'use strict';

  const ready = (callback) => {
    if (document.readyState === 'loading') {
      document.addEventListener('DOMContentLoaded', callback, { once: true });
    } else {
      callback();
    }
  };

  ready(() => {
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const overlay = document.getElementById('menu-overlay');
    const closeButton = document.getElementById('mobile-menu-close');
    const header = document.getElementById('site-header');

    const updateHeader = () => {
      if (!header) return;
      const scrolled = window.scrollY > 12;
      header.classList.toggle('header-scrolled', scrolled);
      header.classList.toggle('scrolled', scrolled);
    };

    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });

    if (!toggle || !menu || !overlay) return;

    let lastFocusedElement = null;
    let lockedScrollY = 0;

    const isOpen = () => menu.classList.contains('open');

    const lockPage = () => {
      lockedScrollY = window.scrollY;
      document.body.style.position = 'fixed';
      document.body.style.top = `-${lockedScrollY}px`;
      document.body.style.right = '0';
      document.body.style.left = '0';
      document.body.style.width = '100%';
    };

    const unlockPage = () => {
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.right = '';
      document.body.style.left = '';
      document.body.style.width = '';
      window.scrollTo(0, lockedScrollY);
    };

    const setOpen = (open) => {
      if (open === isOpen()) return;

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
        lockPage();
        requestAnimationFrame(() => {
          const firstControl = menu.querySelector('a, button');
          firstControl?.focus({ preventScroll: true });
        });
      } else {
        unlockPage();
        lastFocusedElement?.focus?.({ preventScroll: true });
        lastFocusedElement = null;
      }
    };

    const closeMenu = () => setOpen(false);

    toggle.addEventListener('click', () => setOpen(!isOpen()));
    closeButton?.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    menu.querySelectorAll('a').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && isOpen()) closeMenu();
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900 && isOpen()) closeMenu();
    });

    window.addEventListener('pageshow', () => {
      if (isOpen()) closeMenu();
      updateHeader();
    });
  });
})();
