// Navigation decisions for sanitized, personalized template documents.
const pagePath = path => path.replace(/\/index\.html$/, '/').replace(/\.html$/, '').replace(/\/$/, '') || '/';
export function sourceWebsite(value) {
  try {
    const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(value.trim()) ? value.trim() : `https://${value.trim()}`);
    return ['http:', 'https:'].includes(url.protocol) && !url.username && !url.password && url.hostname.includes('.') ? url.href : '';
  } catch { return ''; }
}
export function previewDestination(href, page, home, details = {}) {
  let url;
  try { url = new URL(href, page); } catch { return { kind: 'unavailable' }; }
  if (url.protocol === 'mailto:') return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(details.email || '') ? { kind: 'external', href: `mailto:${details.email}` } : { kind: 'unavailable' };
  if (url.protocol === 'tel:') return /^\+?[\d\s().-]{7,50}$/.test(details.phone || '') ? { kind: 'external', href: `tel:${details.phone.replace(/[\s().-]/g, '')}` } : { kind: 'unavailable' };
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return { kind: 'unavailable' };
  const current = new URL(page), root = new URL(home);
  if (url.origin === current.origin && pagePath(url.pathname) === pagePath(current.pathname)) return { kind: 'section', hash: url.hash };
  const rootFolder = root.pathname.endsWith('/') ? root.pathname : root.pathname.slice(0, root.pathname.lastIndexOf('/') + 1);
  if (url.origin === root.origin && rootFolder !== '/' && url.pathname.startsWith(rootFolder) && !/\.(?:pdf|zip|jpe?g|png|svg|webp)$/i.test(url.pathname)) return { kind: 'page', href: url.href };
  if (url.origin === root.origin) return { kind: 'quote' };
  const website = sourceWebsite(details.website || '');
  if (website) return { kind: 'external', href: url.origin === new URL(website).origin ? url.href : website };
  return { kind: 'unavailable' };
}
