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

  const portfolioAdditions = [
    {name:'G3 Blend Lab',type:spanish?'Sitio web para barbería':'Barber Website',image:'/images/g3-blend-lab-logo.png',href:'/blend-lab/',features:spanish?['Servicios y precios','Galería de cortes','Reservas en línea']:['Services and pricing','Haircut gallery','Online booking']},
    {name:'Kade Mercer',type:spanish?'Sitio web para autor':'Author Website',image:'/images/book1.png',href:'/kade-mercer/',features:spanish?['Exhibición de libros','Biografía del autor','Recursos para lectores']:['Book showcase','Author biography','Reader resources']},
    {name:'Velocity Drive Rentals',type:spanish?'Alquiler de automóviles':'Car Rental Website',image:'/images/velocity-drive-rentals.jpg',href:'/velocity-drive-rentals/',features:spanish?['Catálogo de vehículos','Reservas y precios','Herramientas para clientes']:['Vehicle catalog','Booking and pricing','Customer tools']},
    {name:'Summit Roofing Co.',type:spanish?'Empresa de techado':'Roofing Company',image:'https://images.unsplash.com/photo-1632759145351-1d592919f522?auto=format&fit=crop&w=1200&q=82',href:'/roofing-starter/',features:spanish?['Reparación de techos','Daños por tormentas','Inspecciones gratuitas']:['Roof repair','Storm damage','Free inspections']},
    {name:'IronPeak Roofing',type:spanish?'Empresa de techado premium':'Premium Roofing Company',image:'https://images.unsplash.com/photo-1600585154340-be6161a56a0c?auto=format&fit=crop&w=1200&q=82',href:'/roofing-premium/',features:spanish?['Techos metálicos','Sistemas comerciales','Impermeabilización']:['Metal roofing','Commercial systems','Waterproofing']},
    {name:'Coastal Air Comfort',type:spanish?'Empresa de climatización':'HVAC Company',image:'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=1200&q=82',href:'/hvac-starter/',features:spanish?['Reparación de aire','Instalación de sistemas','Calidad del aire']:['AC repair','System installation','Indoor air quality']},
    {name:'Precision Climate',type:spanish?'Climatización premium':'Premium HVAC Company',image:'https://images.unsplash.com/photo-1581092918056-0c4c3acd3789?auto=format&fit=crop&w=1200&q=82',href:'/hvac-premium/',features:spanish?['Termostatos inteligentes','Sistemas comerciales','Mantenimiento preventivo']:['Smart thermostats','Commercial HVAC','Preventive maintenance']},
    {name:'Harbor Health Clinic',type:spanish?'Consultorio médico':'Medical Office',image:'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?auto=format&fit=crop&w=1200&q=82',href:'/medical-office-starter/',features:spanish?['Atención primaria','Visitas el mismo día','Recursos para pacientes']:['Primary care','Same-day visits','Patient resources']},
    {name:'Everwell Medical',type:spanish?'Consultorio médico premium':'Premium Medical Office',image:'https://images.unsplash.com/photo-1538108149393-fbbd81895907?auto=format&fit=crop&w=1200&q=82',href:'/medical-office-premium/',features:spanish?['Medicina preventiva','Atención especializada','Portal del paciente']:['Preventive medicine','Specialty care','Patient portal']},
    {name:'BrightBay Dental',type:spanish?'Consultorio dental':'Dental Office',image:'https://images.unsplash.com/photo-1606811971618-4486d14f3f99?auto=format&fit=crop&w=1200&q=82',href:'/dentist-office-starter/',features:spanish?['Exámenes dentales','Atención familiar','Citas de emergencia']:['Dental exams','Family care','Emergency appointments']},
    {name:'Pearl & Pine Dentistry',type:spanish?'Odontología premium':'Premium Dentistry',image:'https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?auto=format&fit=crop&w=1200&q=82',href:'/dentist-office-premium/',features:spanish?['Odontología cosmética','Implantes','Diseño de sonrisa']:['Cosmetic dentistry','Implants','Smile design']},
    {name:'StoneLine Construction',type:spanish?'Empresa de construcción':'Construction Company',image:'https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1200&q=82',href:'/construction-starter/',features:spanish?['Construcción nueva','Renovaciones','Planificación']:['New construction','Renovations','Project planning']},
    {name:'Forge & Frame Builders',type:spanish?'Constructora premium':'Premium Construction Company',image:'https://images.unsplash.com/photo-1600566753190-17f0baa2a6c3?auto=format&fit=crop&w=1200&q=82',href:'/construction-premium/',features:spanish?['Casas personalizadas','Renovaciones de lujo','Gestión de proyectos']:['Custom homes','Luxury renovations','Project management']},
    {name:'CoreRise Fitness',type:spanish?'Gimnasio':'Fitness Center',image:'https://images.unsplash.com/photo-1534438327276-14e5300c3a48?auto=format&fit=crop&w=1200&q=82',href:'/fitness-starter/',features:spanish?['Entrenamiento de fuerza','Clases grupales','Programas para miembros']:['Strength training','Group classes','Member programs']},
    {name:'Forge Athletics Club',type:spanish?'Club de rendimiento':'Performance Fitness Club',image:'https://images.unsplash.com/photo-1571019613454-1cb2f99b2d8b?auto=format&fit=crop&w=1200&q=82',href:'/fitness-premium/',features:spanish?['Entrenamiento deportivo','Recuperación','Apoyo nutricional']:['Athlete coaching','Recovery programs','Nutrition support']},
    {name:'Ember Cup Coffee',type:spanish?'Cafetería':'Coffee Shop',image:'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1200&q=82',href:'/coffee-shop-starter/',features:spanish?['Menú de café','Pedidos móviles','Catering']:['Coffee menu','Mobile ordering','Catering']},
    {name:'Juniper & Roast',type:spanish?'Cafetería premium':'Premium Coffee Shop',image:'https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?auto=format&fit=crop&w=1200&q=82',href:'/coffee-shop-premium/',features:spanish?['Café de especialidad','Menú de temporada','Eventos comunitarios']:['Specialty coffee','Seasonal menu','Community events']},
    {name:'Bayline Auto Care',type:spanish?'Taller mecánico':'Auto Repair Shop',image:'https://images.unsplash.com/photo-1487754180451-c456f719a1fc?auto=format&fit=crop&w=1200&q=82',href:'/auto-repair-starter/',features:spanish?['Diagnóstico','Servicio de frenos','Mantenimiento']:['Diagnostics','Brake service','Scheduled maintenance']},
    {name:'TorqueWorks Garage',type:spanish?'Taller mecánico premium':'Premium Auto Garage',image:'https://images.unsplash.com/photo-1503376780353-7e6692767b70?auto=format&fit=crop&w=1200&q=82',href:'/auto-repair-premium/',features:spanish?['Servicio de rendimiento','Reparación de motor','Inspecciones digitales']:['Performance service','Engine repair','Digital inspections']}
  ];

  const templateGrid = document.querySelector('.template-grid');

  if (templateGrid && !document.querySelector('.template-plan-showcase')) {
    const plans = document.createElement('section');
    plans.className = 'template-plan-showcase';
    plans.innerHTML = `<div class="template-plan-heading"><p class="templates-eyebrow">${spanish?'Planes mensuales':'Monthly Website Plans'}</p><h2>${spanish?'Lanza tu sitio con pagos mensuales más pequeños.':'Launch your website with smaller monthly payments.'}</h2><p>${spanish?'Elige un plan de pago de 12 meses. Los paquetes de pago único continúan disponibles.':'Choose a 12-month website payment plan. One-time packages are still available.'}</p></div><div class="template-plan-grid"><article><span>${spanish?'Inicial':'Starter'}</span><strong>$20.83<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 3 páginas y configuración básica.':'Up to 3 pages and essential setup.'}</p></article><article class="featured"><span>${spanish?'Más popular · Business':'Most Popular · Business'}</span><strong>$41.67<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 6 páginas y diseño profesional personalizado.':'Up to 6 pages with custom professional design.'}</p></article><article><span>Premium</span><strong>$70.83<small>/${spanish?'mes':'month'}</small></strong><p>${spanish?'Hasta 10 páginas, formularios avanzados y SEO.':'Up to 10 pages, advanced forms, and SEO.'}</p></article></div><a class="template-plan-button" href="${spanish?'/es/subscriptions':'/subscriptions'}">${spanish?'Ver todos los planes web':'View All Website Plans'}</a>`;
    templateGrid.insertAdjacentElement('afterend', plans);
  }

  const portfolioGrid = document.querySelector('.portfolio-grid');
  if (portfolioGrid) {
    [...demos, ...portfolioAdditions].forEach((demo) => {
      const exists = [...portfolioGrid.querySelectorAll('h2')].some((heading) => heading.textContent.trim() === demo.name);
      if (exists) return;
      const card = document.createElement('article');
      card.className = 'portfolio-card';
      card.dataset.bamNewDemo = 'true';
      card.innerHTML = `<div class="portfolio-image-wrapper"><img class="portfolio-project-image" alt="${demo.name}" loading="lazy" src="${demo.image}"></div><div class="portfolio-card-content"><span class="project-status-label">${spanish?'Concepto de demostración':'Demo Concept'}</span><span class="portfolio-category">${demo.type}</span><h2>${demo.name}</h2><p>${spanish?'Un concepto profesional y adaptable creado para demostrar una experiencia clara y enfocada en generar consultas.':'A polished, responsive concept created to demonstrate a clear, inquiry-focused customer experience.'}</p><ul class="portfolio-features">${demo.features.map((feature)=>`<li>${feature}</li>`).join('')}</ul><a class="portfolio-button" href="${demo.href}" rel="noopener" target="_blank">${spanish?'Ver demo':'Visit Demo'}</a></div>`;
      portfolioGrid.append(card);
    });
  }

  const homePortfolioGrid = document.querySelector('.portfolio-preview');
  if (homePortfolioGrid) {
    const homeDemos = [
      {name:'Titan Athletics',type:spanish?'Deportes Escolares':'School Athletics',image:'https://images.unsplash.com/photo-1566577739112-5180d4bf9390?auto=format&fit=crop&w=1200&q=82',href:'/titan-athletics/'},
      ...demos
    ];
    homeDemos.forEach((demo) => {
      const exists = [...homePortfolioGrid.querySelectorAll('h3')].some((heading) => heading.textContent.trim() === demo.name);
      if (exists) return;
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
