import { cpSync, existsSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const source = dirname(fileURLToPath(import.meta.url));
const output = join(source, 'dist');
const origin = 'https://scottiebondingagency.org';
rmSync(output, { recursive: true, force: true });
mkdirSync(output, { recursive: true });

// Keep the BAM portfolio copy intact; only the standalone build uses root paths.
for (const entry of readdirSync(source, { withFileTypes: true })) {
  if (entry.isDirectory() && ['assets', 'forms'].includes(entry.name)) {
    cpSync(join(source, entry.name), join(output, entry.name), { recursive: true });
  } else if (entry.isFile() && /\.(html|xml)$/.test(entry.name)) {
    let content = readFileSync(join(source, entry.name), 'utf8')
      .replaceAll('https://www.bamswebsitebuilder.com/scottie-bail-bonds/', `${origin}/`)
      .replaceAll('/scottie-bail-bonds/', '/');
    if (entry.name.endsWith('.html')) {
      const page = entry.name === 'index.html' ? '/' : `/${entry.name.slice(0, -5)}`;
      content = content.replace('</head>', `<link rel="canonical" href="${origin}${page}"></head>`);
    }
    writeFileSync(join(output, entry.name), content);
  }
}
writeFileSync(join(output, 'robots.txt'), `User-agent: *\nAllow: /\nSitemap: ${origin}/sitemap.xml\n`);

// Fail the deployment if a page links to a missing local page, image, or form.
let pages = 0;
for (const name of readdirSync(output).filter(name => name.endsWith('.html'))) {
  pages++;
  const html = readFileSync(join(output, name), 'utf8');
  for (const [, path] of html.matchAll(/(?:href|src)="(\/[^"?#]*)/g)) {
    if (path.startsWith('//')) continue;
    const target = join(output, path.slice(1) || 'index.html');
    if (!existsSync(target) && !existsSync(`${target}.html`)) {
      throw new Error(`${name} references missing file: ${path}`);
    }
  }
}
console.log(`Built and checked ${pages} Scottie pages for ${origin}`);
