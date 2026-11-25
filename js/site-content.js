export const SITE_FIELDS = {
  businessName: [120, 'Business name', 'Nombre del negocio'],
  headline: [160, 'Headline', 'Encabezado'],
  description: [2000, 'Description', 'Descripción'],
  services: [2000, 'Services and prices', 'Servicios y precios'],
  hours: [500, 'Business hours', 'Horario'],
  contact: [500, 'Contact information', 'Información de contacto'],
  logoUrl: [2048, 'Logo URL', 'URL del logotipo'],
  imageUrl: [2048, 'Main image URL', 'URL de la imagen principal']
};

export function siteImageUrl(input) {
  try {
    const url = new URL(input);
    return url.protocol === 'https:' && !url.username && !url.password ? url.href : '';
  } catch {
    return '';
  }
}

const TEXT_TAGS = new Set(['ADDRESS', 'BLOCKQUOTE', 'DD', 'DIV', 'H1', 'H2', 'H3', 'H4',
  'H5', 'H6', 'LI', 'P', 'SPAN', 'STRONG', 'TD']);

export function applySiteContent(root, content) {
  for (const element of root.querySelectorAll('[data-bam-field]')) {
    const key = element.dataset.bamField;
    if (!Object.hasOwn(SITE_FIELDS, key) || !Object.hasOwn(content, key)) continue;
    if (key.endsWith('Url')) {
      if (element.tagName !== 'IMG') continue;
      const url = siteImageUrl(content[key]);
      if (url) element.src = url;
      else element.removeAttribute('src');
      element.hidden = !url;
    } else if (TEXT_TAGS.has(element.tagName)) {
      element.textContent = content[key];
    }
  }
}
