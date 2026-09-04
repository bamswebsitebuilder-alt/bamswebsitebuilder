(() => {
  'use strict';
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es') || location.pathname.includes('/es/');
  const contactUrl = spanish ? 'https://www.bamswebsitebuilder.com/es/contact' : 'https://www.bamswebsitebuilder.com/contact';
  const canonicalUrl = `https://www.bamswebsitebuilder.com${location.pathname.endsWith('/') ? location.pathname : `${location.pathname}/`}`;

  if (!document.querySelector('link[rel="canonical"]')) {
    const canonical = document.createElement('link');
    canonical.rel = 'canonical';
    canonical.href = canonicalUrl;
    document.head.append(canonical);
  }
  if (!document.querySelector('meta[property="og:title"]')) {
    const socialMeta = [
      ['og:title', document.title],
      ['og:description', document.querySelector('meta[name="description"]')?.content || 'Professional demo website created by BAM\'s Website Builder.'],
      ['og:url', canonicalUrl],
      ['og:type', 'website']
    ];
    socialMeta.forEach(([property, content]) => {
      const meta = document.createElement('meta');
      meta.setAttribute('property', property);
      meta.content = content;
      document.head.append(meta);
    });
  }

  document.querySelectorAll('form input, form select, form textarea').forEach((field, index) => {
    if (field.type === 'hidden' || field.type === 'submit' || field.closest('label')) return;
    const text = field.placeholder || field.name || `${spanish ? 'Campo' : 'Field'} ${index + 1}`;
    field.setAttribute('aria-label', field.getAttribute('aria-label') || text);
  });

  document.querySelectorAll('.contact-form').forEach((form) => {
    form.action = contactUrl;
    form.method = 'get';
  });
  const quotePattern = /quote|estimate|consultation|free quote|request service|cotizaci[oó]n|presupuesto|estimado|consulta|solicitar servicio/i;
  document.querySelectorAll('a').forEach((link) => {
    const text = `${link.textContent} ${link.getAttribute('aria-label') || ''}`.trim();
    if (quotePattern.test(text)) link.href = contactUrl;
  });
  document.querySelectorAll('footer, .footer').forEach((footer) => {
    footer.querySelectorAll('*').forEach((node) => {
      if (node.children.length !== 0 || node.closest('a') || !/BAM(?:'|’)?s Website Builder/i.test(node.textContent || '')) return;
      const creditPattern = /(?:portfolio demonstration created by|demo website designed by|demo website by|fictional demo created by|demo concept by|website powered by|website created by|powered by|demo by|sitio web desarrollado por|desarrollado por)\s+BAM(?:'|’)?s Website Builder(?:™)?\.?/i;
      const match = (node.textContent || '').match(creditPattern);
      if (!match) return;
      const prefix = node.textContent.slice(0, match.index);
      const link = document.createElement('a');
      link.className = 'bam-credit-link';
      link.href = 'https://www.bamswebsitebuilder.com/';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = spanish ? 'Sitio web creado por BAM\'s Website Builder' : 'Website created by BAM\'s Website Builder';
      node.textContent = prefix;
      node.append(link);
    });
  });
  if (!document.querySelector('.bam-demo-credit')) {
    const credit = document.createElement('div');
    credit.className = 'bam-demo-credit';
    credit.innerHTML = `<span>${spanish ? 'Sitio de demostración ficticio' : 'Fictional demo website'}</span><a href="https://www.bamswebsitebuilder.com/">${spanish ? 'Sitio creado por' : 'Website created by'} BAM's Website Builder</a><a href="${contactUrl}">${spanish ? 'Solicita una cotización' : 'Request a website like this'}</a>`;
    document.body.append(credit);
  }
  const style = document.createElement('style');
  style.textContent = '.bam-credit-link,.bam-demo-credit a{color:inherit;text-decoration:underline;text-underline-offset:3px;font-weight:800}.bam-credit-link:hover,.bam-demo-credit a:hover{color:#f0c75e!important}.bam-demo-credit{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 18px;padding:16px 20px;background:#0b0b0a;color:#f7f4ec;border-top:1px solid rgba(216,169,40,.35);font:600 13px/1.4 Arial,sans-serif;text-align:center}.bam-demo-credit a{color:#f0c75e!important;text-decoration:none!important}.bam-demo-credit a:hover{text-decoration:underline!important}@media(max-width:600px){.bam-demo-credit{align-items:stretch;flex-direction:column;padding:18px 16px}.bam-demo-credit a{display:block;padding:10px 12px;border:1px solid rgba(240,199,94,.35);border-radius:8px}}';
  document.head.append(style);
})();
