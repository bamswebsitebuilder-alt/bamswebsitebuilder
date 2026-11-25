import { applySiteContent } from './site-content.js';

for (const script of document.querySelectorAll('script[data-bam-published-site]')) {
  const id = script.dataset.bamPublishedSite;
  if (!/^[a-f0-9-]{36}$/.test(id || '')) continue;
  const endpoint = new URL('../api/portal-services', import.meta.url);
  endpoint.searchParams.set('site', id);
  // Keep the static site usable while the first publication or a service outage is pending.
  fetch(endpoint, { credentials: 'omit' })
    .then(response => response.ok ? response.json() : null)
    .then(content => { if (content) applySiteContent(document, content); })
    .catch(() => {});
}
