export const spanish = document.documentElement.lang.startsWith('es');
export const t = (english, translated) => spanish ? translated : english;

export function el(tag, content, className) {
  const element = document.createElement(tag);
  if (content) element.textContent = content;
  if (className) element.className = className;
  return element;
}

export function button(label, click, primary = false) {
  const element = el('button', label, primary ? 'hosting-button' : 'bam-secondary');
  element.type = 'button';
  element.addEventListener('click', click);
  return element;
}

export async function portalRequest(user, action, fields = {}) {
  const result = await fetch('/api/portal-services', {
    method: 'POST',
    headers: { Authorization: 'Bearer ' + await user.getIdToken(), 'Content-Type': 'application/json' },
    body: JSON.stringify({ action, ...fields })
  });
  const data = await result.json().catch(() => ({}));
  if (!result.ok) throw new Error(data.error || t('Portal services are unavailable.', 'El servicio no está disponible.'));
  return data;
}
