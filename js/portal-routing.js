const clientPaths = new Set(['/client-portal', '/client-portal.html', '/es/client-portal', '/es/client-portal.html']);

export function portalLoginUrl(location) {
  const next = `${location.pathname}${location.search}${location.hash}`;
  const login = location.pathname.startsWith('/es/') ? '/es/login' : '/login';
  return `${login}?next=${encodeURIComponent(next)}`;
}

export function loginDestination({ origin, requestedPage, role, spanish }) {
  if (requestedPage) {
    try {
      const requested = new URL(requestedPage, origin);
      if (requested.origin === origin && clientPaths.has(requested.pathname)) {
        return `${requested.pathname}${requested.search}${requested.hash}`;
      }
    } catch {}
  }
  return `${spanish ? '/es' : ''}/${role === 'admin' ? 'admin-dashboard' : 'client-portal'}`;
}
