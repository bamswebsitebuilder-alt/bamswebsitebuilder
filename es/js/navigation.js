/* BAM'S Website Builder - shared responsive navigation */
(() => {
  'use strict';

  const initNavigation = () => {
    const header = document.getElementById('site-header');
    const toggle = document.getElementById('menu-toggle');
    const menu = document.getElementById('mobile-menu');
    const closeButton = document.getElementById('mobile-menu-close');
    const overlay = document.getElementById('menu-overlay');

    if (!toggle || !menu || !overlay) return;

    const focusableSelector =
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

    let lastFocusedElement = null;

    const setOpenState = (isOpen) => {
      toggle.classList.toggle('active', isOpen);
      menu.classList.toggle('active', isOpen);
      overlay.classList.toggle('active', isOpen);
      document.body.classList.toggle('menu-open', isOpen);

      toggle.setAttribute('aria-expanded', String(isOpen));
      menu.setAttribute('aria-hidden', String(!isOpen));

      if (isOpen) {
        lastFocusedElement = document.activeElement;
        const firstFocusable = menu.querySelector(focusableSelector);
        window.setTimeout(() => firstFocusable?.focus(), 50);
      } else if (lastFocusedElement instanceof HTMLElement) {
        lastFocusedElement.focus({ preventScroll: true });
      }
    };

    const openMenu = () => setOpenState(true);
    const closeMenu = () => setOpenState(false);

    toggle.addEventListener('click', () => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      setOpenState(!isOpen);
    });

    closeButton?.addEventListener('click', closeMenu);
    overlay.addEventListener('click', closeMenu);

    menu.querySelectorAll('a[href]').forEach((link) => {
      link.addEventListener('click', closeMenu);
    });

    document.addEventListener('keydown', (event) => {
      const isOpen = toggle.getAttribute('aria-expanded') === 'true';
      if (!isOpen) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeMenu();
        return;
      }

      if (event.key === 'Tab') {
        const focusable = [...menu.querySelectorAll(focusableSelector)].filter(
          (element) => element.offsetParent !== null
        );
        if (!focusable.length) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey && document.activeElement === first) {
          event.preventDefault();
          last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
          event.preventDefault();
          first.focus();
        }
      }
    });

    window.addEventListener('resize', () => {
      if (window.innerWidth > 900) closeMenu();
    });

    const updateHeader = () => {
      header?.classList.toggle('header-scrolled', window.scrollY > 12);
    };
    updateHeader();
    window.addEventListener('scroll', updateHeader, { passive: true });
  };

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initNavigation, { once: true });
  } else {
    initNavigation();
  }
})();
