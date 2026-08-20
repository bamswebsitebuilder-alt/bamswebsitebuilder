(() => {
  'use strict';
  const spanish = document.documentElement.lang.toLowerCase().startsWith('es');
  const page = (location.pathname.replace(/\/$/, '').split('/').pop() || 'home').replace(/\.html$/, '');

  document.querySelectorAll('.desktop-navigation a, .mobile-navigation a').forEach((link) => {
    const isAbout = page === 'about' && link.dataset.page === 'about';
    if (isAbout) {
      link.classList.add('active');
      link.setAttribute('aria-current', 'page');
    }
  });

  const addLabel = (card, className, text) => {
    if (card.querySelector(`.${className}`)) return;
    const label = document.createElement('span');
    label.className = className;
    label.textContent = text;
    const body = card.querySelector('.template-card-body, .portfolio-card-content') || card;
    body.prepend(label);
  };

  document.querySelectorAll('.template-card').forEach((card) => {
    addLabel(card, 'project-status-label', spanish ? 'Plantilla personalizable' : 'Customizable Template');
  });
  document.querySelectorAll('.portfolio-card').forEach((card) => {
    addLabel(card, 'project-status-label', spanish ? 'Concepto de demostración' : 'Demo Concept');
  });

  const demos = [
    {name:'Maris & Coast Realty',type:spanish?'Bienes raíces de lujo':'Luxury Real Estate',image:'/images/luxury-real-estate-hero.png',href:'/luxury-coastal-realty/',tier:'Premium',price:'$1,100',category:'professional',features:spanish?['Galería de propiedades','Solicitudes de consulta','Diseño premium adaptable']:['Property gallery','Consultation requests','Premium responsive design']},
    {name:'Hometown Keys Realty',type:spanish?'Agente residencial':'Residential Realtor',image:'/images/local-realtor-hero.png',href:'/hometown-realty/',tier:'Starter',price:'$400',category:'professional',features:spanish?['Servicios para compradores y vendedores','Perfil de Negocio de Google','Diseño adaptable']:['Buyer and seller services','Google Business setup','Responsive design']},
    {name:'Sterling Counsel',type:spanish?'Bufete corporativo':'Corporate Law Firm',image:'/images/corporate-law-hero.png',href:'/sterling-counsel/',tier:'Premium',price:'$890 + $50/mo',category:'professional',features:spanish?['Áreas de práctica','Formularios de consulta','Correo empresarial y mantenimiento']:['Practice areas','Consultation forms','Business email and maintenance']},
    {name:'Harbor Family Law',type:spanish?'Derecho familiar':'Family Law Office',image:'/images/family-law-hero.png',href:'/harbor-family-law/',tier:'Business',price:'$750',category:'professional',features:spanish?['Servicios legales claros','Integración de citas','Optimización SEO']:['Clear service presentation','Booking integration','SEO optimization']}
  ];

  const templateGrid = document.querySelector('.template-grid');
  if (templateGrid && !templateGrid.querySelector('[data-bam-new-demo]')) {
    demos.forEach((demo) => {
      const card = document.createElement('article');
      card.className = 'template-card';
      card.dataset.category = demo.category;
      card.dataset.bamNewDemo = 'true';
      card.innerHTML = `<span class="template-badge">${spanish?'Nuevo':'New'}</span><div class="template-preview"><img alt="${demo.name}" loading="lazy" src="${demo.image}"></div><div class="template-card-body"><span class="project-status-label">${spanish?'Plantilla personalizable':'Customizable Template'}</span><p class="template-category">${demo.type}</p><h2>${demo.name}</h2><ul>${demo.features.map((feature)=>`<li>${feature}</li>`).join('')}</ul><p class="template-price"><span>${demo.tier} ${spanish?'Template':'Template'}</span><strong>${demo.price}</strong><small>${spanish?'precio inicial de ejemplo':'example starting price'}</small></p><div class="template-actions"><a class="template-demo" href="${demo.href}" rel="noopener" target="_blank">${spanish?'Ver demo':'Live Demo'}</a><a class="template-select" href="${spanish?'/es/contact':'/contact'}?template=${encodeURIComponent(demo.name)}">${spanish?'Usar esta plantilla':'Use This Template'}</a></div></div>`;
      templateGrid.append(card);
    });
  }

  if (templateGrid && !document.querySelector('.template-plan-showcase')) {
    const plans = document.createElement('section');
    plans.className = 'template-plan-showcase';
    plans.innerHTML = `<div class="template-plan-heading"><p class="templates-eyebrow">${spanish?'Planes mensuales':'Monthly Website Plans'}</p><h2>${spanish?'Lanza tu sitio con pagos mensuales más pequeños.':'Launch your website with smaller monthly payments.'}</h2><p>${spanish?'Elige un plan de pago de 12 meses. Los paquetes de pago único continúan disponibles.':'Choose a 12-month website payment plan. One-time packages are still available.'}</p></div><div class="template-plan-grid"><article><span>${spanish?'Inicial':'Starter'}</span><strong>$20.83<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 3 páginas y configuración básica.':'Up to 3 pages and essential setup.'}</p></article><article class="featured"><span>${spanish?'Más popular · Business':'Most Popular · Business'}</span><strong>$41.67<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 6 páginas y diseño profesional personalizado.':'Up to 6 pages with custom professional design.'}</p></article><article><span>Premium</span><strong>$70.83<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 10 páginas, formularios avanzados y SEO.':'Up to 10 pages, advanced forms, and SEO.'}</p></article></div><a class="template-plan-button" href="${spanish?'/es/subscriptions':'/subscriptions'}">${spanish?'Ver todos los planes web':'View All Website Plans'}</a>`;
    templateGrid.insertAdjacentElement('afterend', plans);
  }

  const portfolioGrid = document.querySelector('.portfolio-grid');
  if (portfolioGrid && !portfolioGrid.querySelector('[data-bam-new-demo]')) {
    demos.forEach((demo) => {
      const card = document.createElement('article');
      card.className = 'portfolio-card';
      card.dataset.bamNewDemo = 'true';
      card.innerHTML = `<div class="portfolio-image-wrapper"><img class="portfolio-project-image" alt="${demo.name}" loading="lazy" src="${demo.image}"></div><div class="portfolio-card-content"><span class="project-status-label">${spanish?'Concepto de demostración':'Demo Concept'}</span><span class="portfolio-category">${demo.type}</span><h2>${demo.name}</h2><p>${spanish?'Un concepto profesional y adaptable creado para demostrar una experiencia clara y enfocada en generar consultas.':'A polished, responsive concept created to demonstrate a clear, inquiry-focused customer experience.'}</p><ul class="portfolio-features">${demo.features.map((feature)=>`<li>${feature}</li>`).join('')}</ul><a class="portfolio-button" href="${demo.href}" rel="noopener" target="_blank">${spanish?'Ver demo':'Visit Demo'}</a></div>`;
      portfolioGrid.append(card);
    });
  }

  const homePortfolioGrid = document.querySelector('.portfolio-preview');
  if (homePortfolioGrid && !homePortfolioGrid.querySelector('[data-bam-new-demo]')) {
    demos.forEach((demo) => {
      const card = document.createElement('article');
      card.className = 'home-card portfolio-home-card';
      card.dataset.bamNewDemo = 'true';
      card.innerHTML = `<div class="portfolio-home-visual"><img alt="${demo.name} ${spanish?'vista previa':'website preview'}" loading="lazy" src="${demo.image}"></div><div class="portfolio-home-content"><span class="project-status-label">${spanish?'Concepto de demostración':'Demo Concept'}</span><span class="portfolio-type">${demo.type}</span><h3>${demo.name}</h3><p>${spanish?'Un concepto profesional y adaptable diseñado para presentar servicios claramente y generar consultas.':'A polished, responsive concept designed to present services clearly and generate inquiries.'}</p><a class="home-link" href="${demo.href}" rel="noopener noreferrer" target="_blank">${spanish?'Ver demo':'View Demo'} →</a></div>`;
      homePortfolioGrid.append(card);
    });
  }

  const homePath = (location.pathname.replace(/\/$/, '') || '/').replace(/\.html$/, '');
  if ((homePath === '/' || homePath.endsWith('/home') || homePath === '/es') && !document.querySelector('.founder-preview')) {
    const hero = document.querySelector('.hero');
    if (hero) {
      const section = document.createElement('section');
      section.className = 'founder-preview';
      section.innerHTML = `<div class="founder-preview-inner"><img src="/images/braion-moreland.jpg" alt="Braion Moreland"><div><p class="founder-preview-kicker">${spanish?'La persona detrás de BAM\'s':'THE PERSON BEHIND BAM\'S'}</p><h2>${spanish?'Conoce a Braion Moreland':'Meet Braion Moreland'}</h2><p>${spanish?'Fundador y diseñador web dedicado a crear sitios profesionales y a construir un futuro significativo para su familia.':'Founder and web designer dedicated to creating professional websites and building something meaningful for his family\'s future.'}</p><a href="${spanish?'/es/about':'/about'}">${spanish?'Conoce mi historia':'Read My Story'} →</a></div></div>`;
      hero.insertAdjacentElement('afterend', section);
    }
  }

  const main = document.querySelector('main') || document.querySelector('section');
  if (main && !main.id) main.id = 'main-content';
  if (main && !document.querySelector('.skip-link')) {
    const skip = document.createElement('a');
    skip.className = 'skip-link';
    skip.href = '#main-content';
    skip.textContent = spanish ? 'Saltar al contenido principal' : 'Skip to main content';
    document.body.prepend(skip);
  }
  document.querySelectorAll('img:not([loading])').forEach((img, i) => {
    if (i > 0) img.loading = 'lazy';
    img.decoding = 'async';
  });
  document.querySelectorAll('.bam-social-links').forEach((socialLinks) => {
    if (socialLinks.querySelector('a[href="https://x.com/bamswebsite"]')) return;
    const xLink = document.createElement('a');
    xLink.href = 'https://x.com/bamswebsite';
    xLink.target = '_blank';
    xLink.rel = 'noopener noreferrer';
    xLink.setAttribute('aria-label', "BAM's Website Builder on X");
    xLink.textContent = 'X';
    socialLinks.append(xLink);
  });
  document.querySelectorAll('[data-current-year], .current-year').forEach(el => el.textContent = new Date().getFullYear());
})();
