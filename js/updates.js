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
})();
