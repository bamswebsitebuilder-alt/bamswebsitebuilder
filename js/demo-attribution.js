(() => {
  'use strict';
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es') || location.pathname.includes('/es/');
  const contactUrl = spanish ? 'https://www.bamswebsitebuilder.com/es/contact' : 'https://www.bamswebsitebuilder.com/contact';
  const quotePattern = /quote|estimate|consultation|free quote|request service|cotizaci[oó]n|presupuesto|estimado|consulta|solicitar servicio/i;
  document.querySelectorAll('a').forEach((link) => {
    const text = `${link.textContent} ${link.getAttribute('aria-label') || ''}`.trim();
    if (quotePattern.test(text)) link.href = contactUrl;
  });
  document.querySelectorAll('footer, .footer').forEach((footer) => {
    footer.querySelectorAll('*').forEach((node) => {
      if (node.children.length === 0 && /powered by|demo by|created by/i.test(node.textContent || '')) {
        node.textContent = node.textContent.replace(/powered by.*|demo by.*|created by.*/i, 'Website created by BAM\'s Website Builder');
      }
    });
  });
  if (!document.querySelector('.bam-demo-credit')) {
    const credit = document.createElement('div');
    credit.className = 'bam-demo-credit';
    credit.innerHTML = `<span>${spanish ? 'Sitio de demostración ficticio' : 'Fictional demo website'}</span><a href="https://www.bamswebsitebuilder.com/">${spanish ? 'Sitio creado por' : 'Website created by'} BAM's Website Builder</a><a href="${contactUrl}">${spanish ? 'Solicita una cotización' : 'Request a website like this'}</a>`;
    document.body.append(credit);
  }
  const style = document.createElement('style');
  style.textContent = '.bam-demo-credit{display:flex;flex-wrap:wrap;align-items:center;justify-content:center;gap:10px 18px;padding:16px 20px;background:#0b0b0a;color:#f7f4ec;border-top:1px solid rgba(216,169,40,.35);font:600 13px/1.4 Arial,sans-serif;text-align:center}.bam-demo-credit a{color:#f0c75e!important;text-decoration:none!important;font-weight:800}.bam-demo-credit a:hover{text-decoration:underline!important}';
  document.head.append(style);
})();
