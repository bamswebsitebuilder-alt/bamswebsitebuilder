(() => {
  'use strict';
  const spanish = document.documentElement.lang.startsWith('es');
  const feeds = [
    ['facebook', 'Facebook', 'facebook-page-posts/iframe/25722530'],
    ['instagram', 'Instagram', 'instagram-feed/iframe/25722532']
  ];
  feeds.forEach(([id, name, path]) => {
    const host = document.getElementById('bam-' + id + '-frame');
    const placeholder = document.getElementById('bam-' + id + '-placeholder');
    if (!host || !placeholder) return;
    let frame;
    function sync() {
      const allowed = Boolean(window.BAMCookieConsent?.marketing);
      placeholder.hidden = allowed;
      if (!allowed) {
        if (frame) frame.remove();
        frame = null;
        return;
      }
      if (frame) return;
      frame = document.createElement('iframe');
      frame.title = spanish ? 'Publicaciones de BAM’s Website Builder en ' + name : 'Latest ' + name + ' posts from BAM’s Website Builder';
      frame.src = 'https://widgets.sociablekit.com/' + path;
      frame.width = '100%';
      frame.height = '1000';
      frame.loading = 'lazy';
      host.appendChild(frame);
    }
    placeholder.querySelector('button').addEventListener('click', () => window.BAMOpenCookieSettings?.());
    window.addEventListener('bam:consent-changed', sync);
    sync();
  });
  // X profile timelines may be rate-limited for logged-out visitors. Keep a
  // visible, functional first-party fallback instead of rendering a blank iframe.
  const twitterHost = document.getElementById('bam-twitter-frame');
  const twitterPlaceholder = document.getElementById('bam-twitter-placeholder');
  if (twitterHost && twitterPlaceholder) {
    const profileUrl = 'https://x.com/bamswebsite';
    twitterPlaceholder.remove();
    twitterHost.replaceChildren();

    const card = document.createElement('div');
    card.className = 'bam-x-profile-card';
    const heading = document.createElement('div');
    heading.className = 'bam-x-profile-heading';
    const mark = document.createElement('span');
    mark.className = 'bam-x-mark';
    mark.textContent = '𝕏';
    mark.setAttribute('aria-hidden', 'true');
    const headingCopy = document.createElement('div');
    const title = document.createElement('strong');
    title.textContent = 'BAM’s Website Builder';
    const handle = document.createElement('span');
    handle.textContent = '@bamswebsite';
    headingCopy.append(title, handle);
    heading.append(mark, headingCopy);
    const explanation = document.createElement('p');
    explanation.textContent = spanish
      ? 'Nuestras novedades y publicaciones más recientes están disponibles en X. Puedes abrir el perfil o intentar cargar las publicaciones aquí.'
      : 'Find our newest website launches, tips, and business updates on X. Open our profile or try loading the live timeline here.';
    const actions = document.createElement('div');
    actions.className = 'bam-x-actions';
    const visit = document.createElement('a');
    visit.className = 'updates-button primary';
    visit.href = profileUrl;
    visit.target = '_blank';
    visit.rel = 'noopener noreferrer';
    visit.textContent = spanish ? 'Ver publicaciones en X ↗' : 'View latest posts on X ↗';
    const load = document.createElement('button');
    load.className = 'updates-button';
    load.type = 'button';
    load.textContent = spanish ? 'Mostrar publicaciones aquí' : 'Show live feed here';
    const message = document.createElement('p');
    message.className = 'bam-x-status';
    message.setAttribute('role', 'status');
    message.textContent = spanish
      ? 'La vista integrada depende de X y puede no estar disponible.'
      : 'The embedded timeline is provided by X and may be unavailable.';
    actions.append(visit, load);
    card.append(heading, explanation, actions, message);
    twitterHost.append(card);

    let embedContainer = null;
    const resetEmbed = () => {
      if (embedContainer) embedContainer.remove();
      embedContainer = null;
      load.disabled = false;
      load.textContent = spanish ? 'Mostrar publicaciones aquí' : 'Show live feed here';
    };
    const loadFeed = async () => {
      if (!window.BAMCookieConsent?.marketing) {
        message.textContent = spanish
          ? 'Activa las cookies de marketing en las preferencias de privacidad para cargar X aquí.'
          : 'Enable marketing cookies in Privacy Choices to load the X feed here.';
        window.BAMOpenCookieSettings?.();
        return;
      }
      if (embedContainer) resetEmbed();
      embedContainer = document.createElement('div');
      embedContainer.className = 'bam-x-embed';
      twitterHost.append(embedContainer);
      const fallback = document.createElement('a');
      fallback.className = 'twitter-timeline';
      fallback.href = profileUrl;
      fallback.textContent = spanish ? 'Abrir BAM en X' : 'Open BAM on X';
      fallback.setAttribute('data-height', '480');
      fallback.setAttribute('data-dnt', 'true');
      fallback.setAttribute('data-theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      embedContainer.append(fallback);
      load.disabled = true;
      message.textContent = spanish ? 'Cargando publicaciones de X…' : 'Loading posts from X…';
      try {
        if (!window.twttr?.widgets?.load) {
          await new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.async = true;
            script.src = 'https://platform.twitter.com/widgets.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.append(script);
          });
        }
        if (!window.twttr?.widgets?.load) throw new Error('X widgets unavailable');
        window.twttr.widgets.load(embedContainer);
        message.textContent = spanish
          ? 'Si X no muestra las publicaciones, usa «Ver publicaciones en X».'
          : 'If X does not display posts, use “View latest posts on X”.';
        load.textContent = spanish ? 'Recargar vista de X' : 'Reload X embed';
      } catch (_) {
        resetEmbed();
        message.textContent = spanish
          ? 'X no permitió cargar la vista aquí. Puedes ver las publicaciones directamente en X.'
          : 'X could not load its timeline here. You can still view every public post on X.';
      } finally {
        load.disabled = false;
      }
    };
    load.addEventListener('click', loadFeed);
    window.addEventListener('bam:consent-changed', () => {
      if (!window.BAMCookieConsent?.marketing) resetEmbed();
    });
  }
})();
