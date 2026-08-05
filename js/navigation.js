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
