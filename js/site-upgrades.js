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

  if (templateGrid && !document.querySelector('.template-plan-showcase')) {
    const plans = document.createElement('section');
    plans.className = 'template-plan-showcase';
    plans.innerHTML = `<div class="template-plan-heading"><p class="templates-eyebrow">${spanish?'Planes mensuales':'Monthly Website Plans'}</p><h2>${spanish?'Lanza tu sitio con pagos mensuales más pequeños.':'Launch your website with smaller monthly payments.'}</h2><p>${spanish?'Elige un plan de pago de 12 meses. Los paquetes de pago único continúan disponibles.':'Choose a 12-month website payment plan. One-time packages are still available.'}</p></div><div class="template-plan-grid"><article><span>${spanish?'Inicial':'Starter'}</span><strong>$20.83<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 3 páginas y configuración básica.':'Up to 3 pages and essential setup.'}</p></article><article class="featured"><span>${spanish?'Más popular · Business':'Most Popular · Business'}</span><strong>$41.67<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 6 páginas y diseño profesional personalizado.':'Up to 6 pages with custom professional design.'}</p></article><article><span>Premium</span><strong>$70.83<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 10 páginas, formularios avanzados y SEO.':'Up to 10 pages, advanced forms, and SEO.'}</p></article></div><a class="template-plan-button" href="${spanish?'/es/subscriptions':'/subscriptions'}">${spanish?'Ver todos los planes web':'View All Website Plans'}</a>`;
    templateGrid.insertAdjacentElement('afterend', plans);
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
