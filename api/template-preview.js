import { resolve4 } from 'node:dns/promises';
import { isIP } from 'node:net';
import http from 'node:http';
import https from 'node:https';

export const maxDuration = 30;

export function publicIPv4(address) {
  if (isIP(address) !== 4) return false;
  const [a, b] = address.split('.').map(Number);
  return !(a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) || (a === 192 && [0, 168].includes(b)) ||
    (a === 198 && [18, 19, 51].includes(b)) || (a === 203 && b === 0));
}

export function websiteURL(input) {
  if (typeof input !== 'string' || input.length > 2048) throw new Error('Invalid URL');
  const url = new URL(/^[a-z][a-z\d+.-]*:/i.test(input.trim()) ? input.trim() : `https://${input.trim()}`);
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password || url.port ||
      !url.hostname.includes('.') || (isIP(url.hostname) && !publicIPv4(url.hostname))) {
    throw new Error('Use a public website URL');
  }
  url.hash = '';
  return url;
}

export async function readWebsite(url, redirects = 0, contentType = 'html', returnURL = false) {
  // Resolve and pin a public address for every request, including redirects.
  const addresses = isIP(url.hostname) ? [url.hostname] : await resolve4(url.hostname);
  if (!addresses.length || !addresses.every(publicIPv4)) throw new Error('Private address');
  const result = await new Promise((resolve, reject) => {
    const transport = url.protocol === 'https:' ? https : http;
    const request = transport.get(url, {
      agent: false,
      lookup: (_host, options, callback) => options.all
        ? callback(null, [{ address: addresses[0], family: 4 }])
        : callback(null, addresses[0], 4),
      headers: { 'User-Agent': 'BAM-Template-Preview/1.0', Accept: 'text/html' },
    }, response => {
      if ([301, 302, 303, 307, 308].includes(response.statusCode)) {
        response.resume();
        resolve({ redirect: response.headers.location });
        return;
      }
      if (response.statusCode !== 200 || !(contentType === 'css' ? /text\/css/i : /text\/html/i).test(response.headers['content-type'] || '')) {
        response.resume();
        reject(new Error('Website unavailable'));
        return;
      }
      let size = 0;
      const chunks = [];
      response.on('data', chunk => {
        size += chunk.length;
        if (size > 400_000) { response.destroy(); reject(new Error('Page too large')); }
        else chunks.push(chunk);
      });
      response.on('error', reject);
      response.on('end', () => resolve({ html: Buffer.concat(chunks).toString('utf8') }));
    });
    const deadline = setTimeout(() => request.destroy(new Error('Website timed out')), 6000);
    request.on('close', () => clearTimeout(deadline));
    request.on('error', reject);
  });
  if ('redirect' in result) {
    if (!result.redirect || redirects >= 3) throw new Error('Too many redirects');
    return readWebsite(websiteURL(new URL(result.redirect, url).href), redirects + 1, contentType, returnURL);
  }
  return returnURL ? { html: result.html, url: url.href } : result.html;
}

function plain(value, limit) {
  return (value || '').replace(/<[^>]*>/g, '').replace(/&(?:amp|quot|apos|lt|gt|#39);/g,
    entity => ({ '&amp;': '&', '&quot;': '"', '&apos;': "'", '&lt;': '<', '&gt;': '>', '&#39;': "'" })[entity])
    .replace(/\s+/g, ' ').trim().slice(0, limit);
}

function attributes(tag) {
  const attrs = {};
  for (const match of tag.matchAll(/([\w:-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)) attrs[match[1].toLowerCase()] = match[2] ?? match[3];
  return attrs;
}

export function extractDetails(html, sourceURL, css = '') {
  const metadata = {};
  for (const tag of html.match(/<meta\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || []) {
    const attrs = attributes(tag);
    const key = (attrs.property || attrs.name || '').toLowerCase();
    if (attrs.content) metadata[key] = attrs.content;
  }
  const clean = html.replace(/<(script|style|nav|noscript)\b[^>]*>[\s\S]*?<\/\1>/gi, '');
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const details = {
    name: plain(metadata['og:site_name'] || metadata['og:title'] || title, 100),
    description: plain(metadata['og:description'] || metadata.description, 300),
  };
  if (!sourceURL) return details;
  const asset = value => {
    if (!value) return '';
    try { return websiteURL(new URL(value.replaceAll('&amp;', '&'), sourceURL).href).href; } catch { return ''; }
  };
  const imgs = (clean.match(/<img\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || []).map(attributes);
  const logo = imgs.find(img => /logo|brand/i.test(`${img.alt || ''} ${img.class || ''} ${img.id || ''} ${img.src || ''}`));
  if (logo) {
    const src = asset(logo.src || logo['data-src']);
    if (src) details.logo = src;
    const brand = plain((logo.alt || '').replace(/\blogo\b/gi, ''), 100);
    if (!metadata['og:site_name'] && brand && !/^(brand|company|site|website)$/i.test(brand)) details.name = brand;
  }
  const image = asset(metadata['og:image'] || metadata['twitter:image']);
  const photos = [...new Set(imgs.filter(img => !/logo|icon|badge|avatar|payment/i.test(`${img.alt || ''} ${img.class || ''} ${img.src || ''}`)).map(img => asset(img.src || img['data-src'])).filter(Boolean))].slice(0, 8);
  if (image && image !== details.logo && !/logo|favicon/i.test(new URL(image).pathname)) photos.unshift(image);
  details.images = [...new Set(photos)].slice(0, 8);
  if (details.images.length) details.image = details.images[0];
  const styles = css + (html.match(/<style\b[^>]*>[\s\S]*?<\/style>/gi) || []).join(' ');
  const accent = styles.match(/--(?:accent|brand|primary|gold)(?:-color)?\s*:\s*(#[0-9a-f]{6}|#[0-9a-f]{3})\b/i)?.[1];
  const counts = new Map();
  for (const match of styles.matchAll(/#[0-9a-f]{6}\b|#[0-9a-f]{3}\b/gi)) {
    const hex = match[0].length === 4 ? '#' + [...match[0].slice(1)].map(c => c + c).join('') : match[0];
    const channels = hex.slice(1).match(/../g).map(c => parseInt(c, 16));
    if (Math.max(...channels) - Math.min(...channels) < 45) continue;
    counts.set(hex.toLowerCase(), (counts.get(hex.toLowerCase()) || 0) + 1);
  }
  const paletteColor = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
  const color = accent || paletteColor || metadata['theme-color'] || '';
  if (/^#[0-9a-f]{3}$/i.test(color)) details.color = '#' + [...color.slice(1)].map(c => c + c).join('');
  else if (/^#[0-9a-f]{6}$/i.test(color)) details.color = color;
  const serviceSection = clean.match(/<section\b[^>]*(?:id|class)=["'][^"']*services?[^"']*["'][^>]*>([\s\S]*?)<\/section>/i)?.[1];
  const services = [...(serviceSection || '').matchAll(/<h[23]\b[^>]*>([\s\S]*?)<\/h[23]>/gi)].map(match => plain(match[1], 100)).filter(text => text && !/^(our |all |nuestros |todos )?services?$/i.test(text));
  details.services = [...new Set(services)].slice(0, 8);
  const email = clean.match(/href=["']mailto:([^?"']+)/i)?.[1];
  const phone = clean.match(/href=["']tel:([^"']+)/i)?.[1];
  if (email) details.email = plain(email, 100);
  if (phone) details.phone = plain(phone, 50);
  return details;
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Vary', 'Origin');
  const origin = req.headers?.origin;
  if (origin) {
    if (!['https://www.bamswebsitebuilder.com', 'https://bamswebsitebuilder.com',
      'https://bamswebsitebuilder-alt.github.io', 'https://bamswebsitebuilder.vercel.app'].includes(origin)) {
      return res.status(403).json({ error: 'Origin not allowed' });
    }
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  }
  if (req.method === 'OPTIONS') return res.status(204).end();
  if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return res.status(405).json({ error: 'POST required' }); }
  try {
    const body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    const url = websiteURL(body?.url);
    const page = await readWebsite(url, 0, 'html', true);
    let css = '';
    const sheet = (page.html.match(/<link\b(?:[^>"']|"[^"]*"|'[^']*')*>/gi) || []).map(attributes).find(link => {
      if (!/stylesheet/i.test(link.rel || '') || !link.href) return false;
      try { return websiteURL(new URL(link.href.replaceAll('&amp;', '&'), page.url).href).origin === new URL(page.url).origin; } catch { return false; }
    });
    if (sheet) {
      try {
        const cssURL = websiteURL(new URL(sheet.href.replaceAll('&amp;', '&'), page.url).href);
        if (cssURL.origin === new URL(page.url).origin) css = await readWebsite(cssURL, 0, 'css');
      } catch {}
    }
    const details = extractDetails(page.html, page.url, css);
    if (!details.name) throw new Error('No business details found');
    return res.status(200).json(details);
  } catch {
    return res.status(422).json({ error: 'We could not read this website. You can enter your business details below instead.' });
  }
}
