/* BAM'S WEBSITE BUILDER — TEMPLATES PAGE FILTERS */

'use strict';

/* Split the AFTERHOURS clothing demo into a base option and a premium option. */
const spanishTemplates = document.documentElement.lang.toLowerCase().startsWith('es');
const designLabel = spanishTemplates ? 'Elegir diseño' : 'Choose Design';
const quotePath = spanishTemplates ? '/es/contact' : '/contact';
const localizeTemplateMarkup = markup => Object.entries({"New Demo": "Nueva demostración", "Clothing Brand / Streetwear": "Marca de ropa / Streetwear", "Mobile-friendly clothing brand layout": "Diseño de ropa adaptable a móviles", "Collection showcase": "Presentación de colección", "Product detail previews": "Vista previa de productos", "Brand story section": "Historia de la marca", "Base Template": "Diseño inicial", "starting price": "precio inicial", "Live Demo": "Ver demostración", "Clothing Brand / Premium Store": "Marca de ropa / Tienda premium", "Up to 10 website pages": "Hasta 10 páginas web", "Full online store experience": "Experiencia de tienda en línea", "Product pages and shopping cart": "Páginas de productos y carrito", "Advanced contact forms": "Formularios avanzados de contacto", "Booking integration": "Integración de reservas", "Search engine optimization": "Optimización para buscadores", "Premium Template": "Diseño premium"}).reduce((text, [en, es]) => text.replaceAll(en, es), markup);
const afterhoursCard = document.querySelector('#afterhours-template');
if (afterhoursCard) {
  afterhoursCard.innerHTML = `
    <span class="template-badge">${spanishTemplates ? 'Nueva demostración' : 'New Demo'}</span>
    <div class="template-preview industry-photo-preview">
      <img src="/afterhours/campaign.png" alt="AFTERHOURS streetwear campaign" loading="lazy" class="industry-project-photo">
    </div>
    <div class="template-card-body">
      <p class="template-category">${spanishTemplates ? 'Marca de ropa / Streetwear' : 'Clothing Brand / Streetwear'}</p>
      <h2>AFTERHOURS Starter</h2>
      <ul>
        <li>${spanishTemplates ? 'Diseño de ropa adaptable a móviles' : 'Mobile-friendly clothing brand layout'}</li>
        <li>${spanishTemplates ? 'Presentación de colección' : 'Collection showcase'}</li>
        <li>${spanishTemplates ? 'Vista previa de productos' : 'Product detail previews'}</li>
        <li>${spanishTemplates ? 'Historia de la marca' : 'Brand story section'}</li>
      </ul>
      <p class="template-price">
        <span>${spanishTemplates ? 'Diseño inicial' : 'Base Template'}</span>
        <strong>$250</strong>
        <small>${spanishTemplates ? 'precio inicial' : 'starting price'}</small>
      </p>
      <div class="template-actions">
        <a class="template-demo" href="/afterhours/" target="_blank" rel="noopener">${spanishTemplates ? 'Ver demo' : 'View Demo'}</a>
        <a class="template-select" data-package="starter" data-template="AFTERHOURS Starter" href="${quotePath}?template=AFTERHOURS%20Starter&amp;package=starter">${designLabel}</a>
      </div>
    </div>`;

  if (spanishTemplates) afterhoursCard.innerHTML = localizeTemplateMarkup(afterhoursCard.innerHTML);
  const premiumCard = afterhoursCard.cloneNode(true);
  premiumCard.id = 'afterhours-premium-template';
  premiumCard.innerHTML = `
    <span class="template-badge">Premium</span>
    <div class="template-preview industry-photo-preview">
      <img src="/afterhours/campaign.png" alt="AFTERHOURS premium streetwear ecommerce website" loading="lazy" class="industry-project-photo">
    </div>
    <div class="template-card-body">
      <p class="template-category">${spanishTemplates ? 'Marca de ropa / Tienda premium' : 'Clothing Brand / Premium Store'}</p>
      <h2>AFTERHOURS Premium</h2>
      <ul>
        <li>${spanishTemplates ? 'Hasta 10 páginas web' : 'Up to 10 website pages'}</li>
        <li>${spanishTemplates ? 'Experiencia de tienda en línea' : 'Full online store experience'}</li>
        <li>${spanishTemplates ? 'Páginas de productos y carrito' : 'Product pages and shopping cart'}</li>
        <li>${spanishTemplates ? 'Formularios avanzados de contacto' : 'Advanced contact forms'}</li>
        <li>${spanishTemplates ? 'Integración de reservas' : 'Booking integration'}</li>
        <li>${spanishTemplates ? 'Optimización para buscadores' : 'Search engine optimization'}</li>
      </ul>
      <p class="template-price">
        <span>${spanishTemplates ? 'Diseño premium' : 'Premium Template'}</span>
        <strong>$850</strong>
        <small>${spanishTemplates ? 'precio inicial' : 'starting price'}</small>
      </p>
      <div class="template-actions">
        <a class="template-demo" href="/afterhours-premium/" target="_blank" rel="noopener">${spanishTemplates ? 'Ver demo' : 'View Demo'}</a>
        <a class="template-select" data-package="premium" data-template="AFTERHOURS Premium" href="${quotePath}?template=AFTERHOURS%20Premium&amp;package=premium">${designLabel}</a>
      </div>
    </div>`;
  if (spanishTemplates) premiumCard.innerHTML = localizeTemplateMarkup(premiumCard.innerHTML);
  afterhoursCard.insertAdjacentElement('afterend', premiumCard);
  // Keep the two pricing variations together rather than repeating the same photo.
  const collection = document.createElement('details');
  collection.className = 'template-demo-collection';
  collection.dataset.category = 'fashion';
  const summary = document.createElement('summary');
  summary.innerHTML = '<span class="template-collection-name"></span><span class="template-collection-count"></span>';
  summary.querySelector('.template-collection-name').textContent = 'AFTERHOURS';
  summary.querySelector('.template-collection-count').textContent = spanishTemplates ? '2 diseños · Ver opciones' : '2 designs · View options';
  const inner = document.createElement('div');
  inner.className = 'template-collection-grid';
  afterhoursCard.before(collection);
  inner.append(afterhoursCard, premiumCard);
  collection.append(summary, inner);
}

document.querySelectorAll('.template-card').forEach((card) => {
  const name = card.querySelector('h2')?.textContent.trim() || '';
  const demo = card.querySelector('.template-demo');
  const choose = card.querySelector('.template-select');
  if (demo) {
    demo.textContent = spanishTemplates ? 'Ver demo' : 'View Demo';
    demo.setAttribute('aria-label', spanishTemplates ? `Ver demo de ${name} (nueva pestaña)` : `View ${name} demo (new tab)`);
  }
  if (choose) {
    choose.textContent = designLabel;
    choose.setAttribute('aria-label', spanishTemplates ? `Elegir diseño ${name}` : `Choose ${name} design`);
  }
});

/* Pair related demo variations in expandable industry collections. */
const demoCollections = [
  { label: 'Roofing', es: 'Techos', names: ['Summit Roofing Co.', 'IronPeak Roofing'] },
  { label: 'Heating & Air Conditioning', es: 'Climatización', names: ['Coastal Air Comfort', 'Precision Climate'] },
  { label: 'Medical Clinics', es: 'Clínicas médicas', names: ['Harbor Health Clinic', 'Everwell Medical'] },
  { label: 'Dental Practices', es: 'Clínicas dentales', names: ['BrightBay Dental', 'Pearl & Pine Dentistry'] },
  { label: 'Construction', es: 'Construcción', names: ['StoneLine Construction', 'Forge & Frame Builders'] },
  { label: 'Fitness & Gyms', es: 'Gimnasios', names: ['CoreRise Fitness', 'Forge Athletics Club'] },
  { label: 'Coffee Shops', es: 'Cafeterías', names: ['Ember Cup Coffee', 'Juniper & Roast'] },
  { label: 'Auto Repair', es: 'Talleres de autos', names: ['Bayline Auto Care', 'TorqueWorks Garage'] }
];
const catalogGrid = document.querySelector('.templates-page .template-grid');
if (catalogGrid) {
  const byTitle = new Map([...catalogGrid.querySelectorAll('.template-card')].map(card => [
    card.querySelector('h2')?.textContent.trim(), card
  ]));
  demoCollections.forEach(collection => {
    const cards = collection.names.map(name => byTitle.get(name));
    if (cards.some(card => !card)) return;
    if (cards.every(card => card.closest('.template-demo-collection'))) return;
    const details = document.createElement('details');
    details.className = 'template-demo-collection';
    details.dataset.category = cards[0].dataset.category;
    const summary = document.createElement('summary');
    const name = document.createElement('span');
    name.className = 'template-collection-name';
    name.textContent = spanishTemplates ? collection.es : collection.label;
    const count = document.createElement('span');
    count.className = 'template-collection-count';
    count.textContent = spanishTemplates ? '2 diseños · Ver opciones' : '2 designs · View options';
    summary.append(name, count);
    const inner = document.createElement('div');
    inner.className = 'template-collection-grid';
    cards[0].before(details);
    cards.forEach(card => inner.append(card));
    details.append(summary, inner);
  });
}

// Use each collection's actual demo screenshot as its cover, never a blank box.
document.querySelectorAll('.template-demo-collection').forEach(group => {
  const cover = group.querySelector('.template-card .template-preview img');
  const src = cover?.getAttribute('src');
  if (src) {
    try {
      const url = new URL(src, location.href);
      if (['http:', 'https:'].includes(url.protocol)) {
        group.querySelector('summary')?.style.setProperty('--collection-cover', 'url("' + url.href.replace(/["\\]/g, '') + '")');
      }
    } catch {}
  }
});

const filterButtons = [...document.querySelectorAll('.template-filter')];
const templateCards = [...document.querySelectorAll('.template-card')];
const filterSummary = document.createElement('p');
filterSummary.className = 'template-filter-summary';
filterSummary.setAttribute('role', 'status');
filterSummary.setAttribute('aria-live', 'polite');
document.querySelector('.template-filters')?.after(filterSummary);

function applyTemplateFilter(button) {
  const selectedFilter = button.dataset.filter;
  filterButtons.forEach((item) => {
    const selected = item === button;
    item.classList.toggle('active', selected);
    item.setAttribute('aria-pressed', String(selected));
  });
  let visible = 0;
  templateCards.forEach((card) => {
    card.hidden = selectedFilter !== 'all' && card.dataset.category !== selectedFilter;
    if (!card.hidden) visible += 1;
  });
  document.querySelectorAll('.template-demo-collection').forEach(group => {
    const available = [...group.querySelectorAll('.template-card')].some(card => !card.hidden);
    group.hidden = !available;
  });
  filterSummary.textContent = spanishTemplates
    ? `${visible} ${visible === 1 ? 'diseño disponible' : 'diseños disponibles'}`
    : `${visible} ${visible === 1 ? 'design available' : 'designs available'}`;
}
filterButtons.forEach((button) => {
  button.addEventListener('click', () => applyTemplateFilter(button));
});
const initialFilter = filterButtons.find(button => button.classList.contains('active')) || filterButtons[0];
if (initialFilter) applyTemplateFilter(initialFilter);

/* Accessible feedback while the contact page opens. */
document.querySelectorAll('.template-select').forEach((link) => {
  link.addEventListener('click', () => {
    link.classList.add('is-loading');
    link.setAttribute('aria-busy', 'true');
  }, { once: true });
});


/* Single, accessible category dropdown — no duplicate sidebar controls. */
const galleryGrid = document.querySelector('.templates-page .template-grid');
const galleryFilters = document.querySelector('.templates-page .template-filters');
if (galleryGrid && galleryFilters) {
  const toolbar = document.createElement('div');
  toolbar.className = 'template-catalog-search-row';
  const label = document.createElement('label');
  label.className = 'template-catalog-label';
  label.textContent = spanishTemplates ? 'Filtrar por categoría' : 'Browse by category';
  const categorySelect = document.createElement('select');
  categorySelect.className = 'template-catalog-search';
  categorySelect.id = 'template-category-select';
  filterButtons.forEach(button => {
    const option = document.createElement('option');
    option.value = button.dataset.filter;
    option.textContent = button.textContent.trim();
    categorySelect.append(option);
  });
  label.htmlFor = categorySelect.id;
  toolbar.append(label, categorySelect);
  galleryGrid.before(toolbar);
  galleryFilters.hidden = true;
  galleryFilters.setAttribute('aria-hidden', 'true');
  galleryFilters.querySelectorAll('button').forEach(button => button.tabIndex = -1);
  categorySelect.value = filterButtons.find(button => button.classList.contains('active'))?.dataset.filter || 'all';
  categorySelect.addEventListener('change', () => {
    const button = filterButtons.find(item => item.dataset.filter === categorySelect.value);
    if (button) applyTemplateFilter(button);
  });
}
