// Progressive enhancement: all client sections remain visible without JavaScript.
document.addEventListener('DOMContentLoaded', () => {
  const sidebar = document.querySelector('.client-portal-page .portal-sidebar');
  const nav = sidebar?.querySelector('.portal-nav');
  if (!nav) return;

  const spanish = document.documentElement.lang.startsWith('es');
  const mobile = window.matchMedia('(max-width: 900px)');
  const toggle = document.createElement('button');
  toggle.type = 'button';
  toggle.className = 'workspace-menu-toggle';
  nav.id = 'workspace-client-navigation';
  toggle.setAttribute('aria-controls', nav.id);
  toggle.setAttribute('aria-expanded', 'false');

  const updateLabel = () => {
    const active = nav.querySelector('.active');
    // Exclude the unread badge from the section name.
    const label = active ? [...active.childNodes].filter(node => node.nodeType === 3).map(node => node.textContent).join('').trim() : '';
    toggle.textContent = `${spanish ? 'Menú' : 'Menu'} · ${label || (spanish ? 'Mi espacio' : 'My workspace')}`;
  };
  const close = (restoreFocus = false) => {
    sidebar.classList.remove('workspace-menu-open');
    toggle.setAttribute('aria-expanded', 'false');
    if (restoreFocus && mobile.matches) toggle.focus();
    updateLabel();
  };
  toggle.addEventListener('click', () => {
    const open = sidebar.classList.toggle('workspace-menu-open');
    toggle.setAttribute('aria-expanded', String(open));
  });
  nav.addEventListener('click', event => {
    if (event.target.closest('button[data-panel]')) close(true);
  });
  sidebar.addEventListener('keydown', event => {
    if (event.key === 'Escape') close(true);
  });
  window.addEventListener('hashchange', () => close());
  mobile.addEventListener('change', () => close());
  sidebar.prepend(toggle);
  sidebar.classList.add('workspace-menu-ready');
  updateLabel();
});
