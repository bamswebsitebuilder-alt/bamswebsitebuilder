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
    const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
    const aboutHref = spanish ? '/es/about' : '/about';
    const aboutLabel = spanish ? 'Nosotros' : 'About';
    const iconMarkup = (name) => `<span aria-hidden="true" class="mobile-link-icon"><svg viewBox="0 0 24 24"><use href="/images/bam-icons.svg#${name}"></use></svg></span>`;

    document.querySelectorAll('a[href="/booking.html"], a[href="/es/booking.html"]').forEach((link) => {
      link.href = spanish ? '/es/booking' : '/booking';
    });

    const bookingLink = document.querySelector('.desktop-navigation a[data-page="booking"]');
    if (bookingLink && !document.querySelector('.floating-booking-button')) {
      const floatingBooking = bookingLink.cloneNode(true);
      floatingBooking.className = 'floating-booking-button';
      floatingBooking.removeAttribute('aria-current');
      document.body.append(floatingBooking);
    }

    document.querySelectorAll('link[rel="icon"], link[rel="shortcut icon"]').forEach((link) => {
      link.href = '/images/icon-dark.jpg?v=20260814';
      link.type = 'image/jpeg';
    });

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
