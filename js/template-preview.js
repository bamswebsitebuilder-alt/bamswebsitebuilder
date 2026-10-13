/* Optional, temporary personalization of the existing demo layouts. */
(() => {
  'use strict';
  const es = document.documentElement.lang.startsWith('es');
  const t = (en, spanish) => es ? spanish : en;
  // The public domain uses GitHub Pages; server functions run on the linked Vercel project.
  const importEndpoint = ['www.bamswebsitebuilder.com', 'bamswebsitebuilder.com', 'bamswebsitebuilder-alt.github.io'].includes(location.hostname)
    ? 'https://bamswebsitebuilder.vercel.app/api/template-preview' : '/api/template-preview';
  const cards = [...document.querySelectorAll('.template-card')];
  const designs = cards.map(card => ({
    name: card.querySelector('h2')?.textContent.trim(),
    demo: card.querySelector('.template-demo')?.href,
    quote: card.querySelector('.template-select')?.href,
  })).filter(design => design.name && design.demo && new URL(design.demo).origin === location.origin);
  if (!designs.length) return;

  const section = document.createElement('section');
  section.className = 'personal-preview-intro';
  section.innerHTML = `<h2>${t('See your business in a new design', 'Ve tu negocio con un nuevo diseño')}</h2>
    <p>${t('Enter your current website to import your business name, description, website image, and brand color when available. Edit the details and compare designs.', 'Introduce tu sitio actual para importar el nombre, la descripción, una imagen y el color de tu negocio cuando estén disponibles. Edita los datos y compara diseños.')}</p>
    <form><label for="preview-website">${t('Your website URL', 'URL de tu sitio web')}</label>
    <div class="preview-url-row"><input id="preview-website" name="website" type="text" inputmode="url" autocomplete="url" placeholder="www.yourbusiness.com" required maxlength="2048">
    <button type="submit">${t('Preview my site', 'Ver mi sitio')}</button></div></form>`;
  const main = document.querySelector('main');
  const hero = main.querySelector('section');
  hero ? hero.after(section) : main.prepend(section);

  const dialog = document.createElement('dialog');
  dialog.className = 'personal-preview-dialog';
  dialog.setAttribute('aria-labelledby', 'personal-preview-title');
  dialog.innerHTML = `<div class="preview-dialog-heading"><h2 id="personal-preview-title">${t('Your business, in a new design', 'Tu negocio, con un nuevo diseño')}</h2>
    <button type="button" class="preview-close" aria-label="${t('Close preview', 'Cerrar vista previa')}">×</button></div>
    <p class="preview-note">${t('Concept preview using your website details. Other photos, services, and content remain template examples. Preview buttons and forms are inactive.', 'Vista conceptual con los datos de tu sitio. Las demás fotos, servicios y contenidos son ejemplos del diseño. Los botones y formularios de la vista previa están desactivados.')}</p>
    <div class="preview-editor"><form class="preview-import"><label for="preview-import-url">${t('Your website URL', 'URL de tu sitio web')}</label>
      <div class="preview-url-row"><input id="preview-import-url" type="text" inputmode="url" autocomplete="url" required maxlength="2048"><button type="submit">${t('Import details', 'Importar datos')}</button></div></form>
      <label for="preview-design">${t('Template', 'Diseño')}</label><select id="preview-design"></select>
      <label for="preview-name">${t('Business name', 'Nombre del negocio')}</label><input id="preview-name" maxlength="100">
      <label for="preview-description">${t('Business description', 'Descripción del negocio')}</label><textarea id="preview-description" maxlength="300" rows="2"></textarea>
      <label for="preview-image">${t('Main image URL (optional)', 'URL de la imagen principal (opcional)')}</label><input id="preview-image" type="url" maxlength="2048" placeholder="https://…">
      <label for="preview-color">${t('Brand color', 'Color de la marca')}</label><input id="preview-color" type="color" value="#d6ad50">
      <p class="preview-note">${t('Changes appear automatically. Try another template without importing again.', 'Los cambios aparecen automáticamente. Prueba otro diseño sin volver a importar.')}</p>
      <div class="preview-controls"><button class="preview-update" type="button">${t('Update preview', 'Actualizar vista previa')}</button>
      <button class="preview-mobile" type="button" aria-pressed="false">${t('Mobile view', 'Vista móvil')}</button>
      <a class="preview-quote">${t('Choose this design', 'Elegir este diseño')}</a></div></div>
    <p class="preview-status" role="status" aria-live="polite"></p>
    <div class="preview-frame-wrap" hidden><iframe title="${t('Personalized template preview', 'Vista previa personalizada')}" sandbox="" referrerpolicy="no-referrer"></iframe></div>`;
  document.body.append(dialog);
  const select = dialog.querySelector('select');
  designs.forEach((design, index) => select.add(new Option(design.name, String(index))));
  const urlInput = dialog.querySelector('#preview-import-url');
  const nameInput = dialog.querySelector('#preview-name');
  const descriptionInput = dialog.querySelector('textarea');
  const imageInput = dialog.querySelector('#preview-image');
  const colorInput = dialog.querySelector('#preview-color');
  const safeImage = value => {
    try {
      const url = new URL(value);
      return ['https:', 'http:'].includes(url.protocol) && !url.username && !url.password ? url.href : '';
    } catch { return ''; }
  };
  const templates = new Map();
  let updateTimer;
  const status = dialog.querySelector('.preview-status');
  const wrap = dialog.querySelector('.preview-frame-wrap');
  const frame = dialog.querySelector('iframe');
  const quote = dialog.querySelector('.preview-quote');
  const importButton = dialog.querySelector('.preview-import button');
  let revision = 0;
  let importer;
  let lastFocus;
  const setQuote = () => {
    const target = new URL(designs[Number(select.value)].quote);
    if (urlInput.value.trim()) target.searchParams.set('website', urlInput.value.trim());
    quote.href = target.href;
  };

  async function renderPreview() {
    const current = ++revision;
    wrap.hidden = true;
    setQuote();
    if (!nameInput.value.trim()) {
      status.textContent = t('Enter your business name to see the preview.', 'Introduce el nombre de tu negocio para ver la vista previa.');
      return;
    }
    status.textContent = t('Preparing your preview…', 'Preparando tu vista previa…');
    const design = designs[Number(select.value)];
    try {
      if (!templates.has(design.demo)) {
        const response = await fetch(design.demo);
        if (!response.ok) throw new Error('Template unavailable');
        templates.set(design.demo, await response.text());
      }
      const doc = new DOMParser().parseFromString(templates.get(design.demo), 'text/html');
      if (current !== revision || !dialog.open) return;
      doc.querySelectorAll('script, iframe, object, embed, base, meta[http-equiv], noscript').forEach(node => node.remove());
      doc.querySelectorAll('*').forEach(node => {
        [...node.attributes].forEach(attr => {
          if (/^on/i.test(attr.name) || attr.name === 'srcdoc') node.removeAttribute(attr.name);
        });
      });
      const base = doc.createElement('base');
      base.href = design.demo;
      doc.head.prepend(base);
      const heading = doc.querySelector('main h1, h1');
      if (!heading) throw new Error('No heading');
      heading.textContent = nameInput.value.trim();
      const hero = heading.closest('section, .hero, .hero-copy') || heading.parentElement;
      const description = [...hero.querySelectorAll('p')].find(p => !p.matches('.eyebrow, .kicker, .subtitle, .hero-eyebrow'));
      if (description && descriptionInput.value.trim()) description.textContent = descriptionInput.value.trim();
      const image = safeImage(imageInput.value.trim());
      if (image) {
        const heroSection = heading.closest('section') || hero;
        const heroImage = heroSection.querySelector('img:not([class*=logo])');
        if (heroImage) {
          heroImage.closest('picture')?.querySelectorAll('source').forEach(source => source.remove());
          heroImage.removeAttribute('srcset');
          heroImage.removeAttribute('sizes');
          heroImage.src = image;
          heroImage.alt = nameInput.value.trim();
        } else {
          const visual = heroSection.querySelector('.hero-image, .hero-media, .hero-art, .hero-visual') || heroSection;
          visual.style.backgroundImage = `linear-gradient(90deg,rgba(0,0,0,.7),rgba(0,0,0,.2)),url("${image.replaceAll('"', '%22')}")`;
          visual.style.backgroundSize = 'cover';
          visual.style.backgroundPosition = 'center';
        }
      }
      doc.querySelectorAll('header .brand, header .wordmark, header .logo, header .site-brand, header .navbar-brand, header .logo-text').forEach(node => {
        node.textContent = nameInput.value.trim();
      });
      const style = doc.createElement('style');
      style.textContent = 'a,button,input,select,textarea{pointer-events:none!important}body{overflow-x:hidden}.reveal,[data-reveal],.fade-in{opacity:1!important;transform:none!important}header .brand,header .wordmark,header .logo,header .site-brand{font-weight:800;overflow-wrap:anywhere;max-width:320px}';
      if (/^#[0-9a-f]{6}$/i.test(colorInput.value)) {
        const rgb = colorInput.value.slice(1).match(/../g).map(hex => parseInt(hex, 16) / 255).map(c => c <= .04045 ? c / 12.92 : ((c + .055) / 1.055) ** 2.4);
        const luminance = .2126 * rgb[0] + .7152 * rgb[1] + .0722 * rgb[2];
        const buttonText = luminance > .179 ? '#000' : '#fff';
        style.textContent += `:root{--accent:${colorInput.value}!important;--gold:${colorInput.value}!important;--brand:${colorInput.value}!important;--primary:${colorInput.value}!important}.btn.primary,.btn:not(.outline),.button-primary{background:${colorInput.value}!important;border-color:${colorInput.value}!important;color:${buttonText}!important}`;
      }
      doc.head.append(style);
      doc.querySelectorAll('a,button,input,select,textarea').forEach(node => node.setAttribute('tabindex', '-1'));
      frame.srcdoc = '<!doctype html>' + doc.documentElement.outerHTML;
      wrap.hidden = false;
      status.textContent = t('Preview ready. You can change your details or try another template.', 'Vista previa lista. Puedes cambiar los datos o probar otro diseño.');
    } catch {
      if (current === revision && dialog.open) status.textContent = t('This preview could not load. Try another template.', 'No se pudo cargar esta vista previa. Prueba otro diseño.');
    }
  }

  async function importDetails() {
    importer?.abort();
    const controller = new AbortController();
    importer = controller;
    ++revision;
    wrap.hidden = true;
    importButton.disabled = true;
    nameInput.value = '';
    descriptionInput.value = '';
    imageInput.value = '';
    colorInput.value = '#d6ad50';
    status.textContent = t('Reading your business details…', 'Leyendo los datos de tu negocio…');
    try {
      const response = await fetch(importEndpoint, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: urlInput.value.trim() }), signal: controller.signal,
      });
      if (!response.ok) throw new Error('Import unavailable');
      const details = await response.json();
      if (controller.signal.aborted || !dialog.open) return;
      nameInput.value = details.name || '';
      descriptionInput.value = details.description || '';
      imageInput.value = safeImage(details.image);
      colorInput.value = /^#[0-9a-f]{6}$/i.test(details.color || '') ? details.color : '#d6ad50';
      await renderPreview();
    } catch {
      if (!controller.signal.aborted && dialog.open) {
        status.textContent = t('We could not read this website. Enter your business name and description, then choose Update preview.', 'No pudimos leer este sitio. Introduce el nombre y la descripción de tu negocio y pulsa Actualizar vista previa.');
        nameInput.focus();
      }
    } finally {
      if (importer === controller) importButton.disabled = false;
    }
  }

  function open(index) {
    lastFocus = document.activeElement;
    select.value = String(index);
    urlInput.value = section.querySelector('input').value;
    dialog.showModal();
    setQuote();
    if (urlInput.value.trim()) importDetails();
    else { status.textContent = t('Enter a website URL, or type your business details below.', 'Introduce una URL o escribe los datos de tu negocio abajo.'); wrap.hidden = true; }
  }
  section.querySelector('form').addEventListener('submit', event => { event.preventDefault(); open(0); });
  cards.forEach(card => {
    const index = designs.findIndex(design => design.demo === card.querySelector('.template-demo')?.href && design.name === card.querySelector('h2')?.textContent.trim());
    if (index < 0) return;
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'template-personal-preview';
    button.textContent = t('Business Preview', 'Vista de mi negocio');
    button.setAttribute('aria-label', t(`Preview ${designs[index].name} with my business`, `Ver ${designs[index].name} con mi negocio`));
    button.addEventListener('click', () => open(index));
    card.querySelector('.template-actions').append(button);
  });
  dialog.querySelector('.preview-close').addEventListener('click', () => dialog.close());
  dialog.addEventListener('close', () => {
    ++revision;
    importer?.abort();
    clearTimeout(updateTimer);
    frame.removeAttribute('srcdoc');
    section.querySelector('input').value = urlInput.value;
    lastFocus?.focus();
  });
  dialog.querySelector('.preview-import').addEventListener('submit', event => { event.preventDefault(); importDetails(); });
  dialog.querySelector('.preview-update').addEventListener('click', renderPreview);
  select.addEventListener('change', renderPreview);
  [nameInput, descriptionInput, imageInput, colorInput].forEach(input => input.addEventListener('input', () => {
    clearTimeout(updateTimer);
    updateTimer = setTimeout(renderPreview, 350);
  }));
  urlInput.addEventListener('input', setQuote);
  dialog.querySelector('.preview-mobile').addEventListener('click', event => {
    const mobile = wrap.classList.toggle('is-mobile');
    event.currentTarget.setAttribute('aria-pressed', String(mobile));
  });
})();
