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
  // X's official timeline is only requested after optional marketing consent.
  // Keep the direct profile link available if the embed is blocked or rate-limited.
  const twitterHost = document.getElementById('bam-twitter-frame');
  const twitterPlaceholder = document.getElementById('bam-twitter-placeholder');
  if (twitterHost && twitterPlaceholder) {
    let timelineLink = null;
    let widgetScript = null;
    const syncTwitter = () => {
      const allowed = Boolean(window.BAMCookieConsent?.marketing);
      twitterPlaceholder.hidden = allowed;
      if (!allowed) {
        timelineLink?.remove();
        timelineLink = null;
        widgetScript?.remove();
        widgetScript = null;
        return;
      }
      if (timelineLink) return;
      timelineLink = document.createElement('a');
      timelineLink.className = 'twitter-timeline';
      timelineLink.href = 'https://x.com/bamswebsite';
      timelineLink.textContent = spanish ? 'Publicaciones de BAM en X' : 'Posts by BAM on X';
      timelineLink.setAttribute('data-height', '700');
      timelineLink.setAttribute('data-dnt', 'true');
      timelineLink.setAttribute('data-theme', document.documentElement.dataset.theme === 'light' ? 'light' : 'dark');
      twitterHost.appendChild(timelineLink);
      // Loading the script after consent avoids third-party requests beforehand.
      widgetScript = document.createElement('script');
      widgetScript.async = true;
      widgetScript.src = 'https://platform.x.com/widgets.js';
      widgetScript.onerror = () => {
        // The visible profile link is the reliable fallback.
        if (timelineLink) timelineLink.textContent = spanish ? 'Ver publicaciones en X' : 'View posts on X';
      };
      twitterHost.appendChild(widgetScript);
    };
    twitterPlaceholder.querySelector('button')?.addEventListener('click', () => window.BAMOpenCookieSettings?.());
    window.addEventListener('bam:consent-changed', syncTwitter);
    syncTwitter();
  }
})();
