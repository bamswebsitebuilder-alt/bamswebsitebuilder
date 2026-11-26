const $ = id => document.getElementById(id);
const reveal = $('scroll-reveal');
const revealVisual = reveal.querySelector('.reveal-visual');
const revealSteps = [...reveal.querySelectorAll('.reveal-steps li')];
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const narrowScreen = matchMedia('(max-width: 760px)');
let revealFrame = 0;

function updateReveal() {
  revealFrame = 0;
  if (motion.matches) {
    delete reveal.dataset.animated;
    return;
  }

  if (!reveal.dataset.animated) reveal.dataset.animated = 'true';
  const first = revealSteps[0].getBoundingClientRect();
  const last = revealSteps.at(-1).getBoundingClientRect();
  let marker = innerHeight * .56;
  if (narrowScreen.matches) {
    const visualBottom = revealVisual.getBoundingClientRect().height + 12;
    marker = Math.min(innerHeight * .82, visualBottom + (innerHeight - visualBottom) * .38);
  }
  const start = first.top + first.height * .42;
  const end = last.top + last.height * .42;
  const progress = Math.min(1, Math.max(0, (marker - start) / Math.max(1, end - start)));
  const stage = progress < .25 ? 0 : progress < .76 ? 1 : 2;

  reveal.style.setProperty('--reveal-progress', progress.toFixed(3));
  reveal.style.setProperty('--wireframe-opacity', Math.max(0, 1 - progress * 1.9).toFixed(3));
  reveal.style.setProperty('--preview-saturation', Math.min(1, Math.max(0, (progress - .28) / .56)).toFixed(3));
  reveal.style.setProperty('--preview-scale', (1.075 - progress * .075).toFixed(3));
  revealSteps.forEach((step, index) => step.classList.toggle('is-current', index === stage));
}

function scheduleReveal() {
  if (!revealFrame) revealFrame = requestAnimationFrame(updateReveal);
}

addEventListener('scroll', scheduleReveal, { passive: true });
addEventListener('resize', scheduleReveal);
motion.addEventListener('change', scheduleReveal);
scheduleReveal();

const storageKey = 'bam-studio-drafts-v1';
const defaultImage = new URL('/images/luxury-real-estate-hero.webp', location.origin).href;

const showcases = {
  kade: ['Kade Mercer', 'Client website', '/images/kade-mercer-desktop.webp', 'Kade Mercer author website', '/kade-mercer/'],
  scottie: ['Scottie Bonding Agency', 'Client website', '/images/scottie-bonding-home.webp', 'Scottie Bonding Agency website', 'https://scottiebondingagency.org'],
  titan: ['Titan Athletics', 'Demo concept', '/images/titan-athletics-site-preview.webp', 'Titan Athletics sports website demo', '/titan-athletics/'],
};

$('showcase-options').addEventListener('click', event => {
  const choice = event.target.closest('button[data-showcase]');
  const selected = showcases[choice?.dataset.showcase];
  if (!selected) return;
  const [name, type, image, alt, url] = selected;
  $('showcase-name').textContent = name;
  $('showcase-type').textContent = type;
  $('showcase-image').src = image;
  $('showcase-image').alt = alt;
  $('showcase-link').href = url;
  $('showcase-options').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === choice)));
});

const palettes = {
  ivory: ['#fbf7ed', '#1f1c16', '#584e3f', '#765416', '#fffaf0', '#ece2ce'],
  midnight: ['#191817', '#f7eedf', '#dfd5c4', '#efd187', '#241f18', '#544735'],
  sage: ['#f3f4ec', '#19251d', '#42544a', '#33624a', '#fcfef8', '#c8d4c8'],
};

function newProject(id) {
  return {
    id,
    name: 'Untitled project',
    business: '',
    heading: '',
    description: '',
    action: '',
    link: '',
    image: '',
    alt: '',
    seoTitle: '',
    seoDescription: '',
    layout: 'split',
    palette: 'ivory',
    ready: false,
    services: [],
  };
}

function starterProject() {
  return {
    ...newProject('sample'),
    name: 'Sample • Oakline Interiors',
    business: 'Oakline Interiors',
    heading: 'Room for the way you live.',
    description: 'Thoughtful materials, warm textures, and spaces that feel at home from the first day.',
    action: 'See our services',
    image: defaultImage,
    alt: 'Interior design inspiration in warm, neutral colors',
    services: [
      { title: 'Design consultation', description: 'Get a clear direction for your space, budget, and next steps.' },
      { title: 'Room refresh', description: 'Make the most of your layout with carefully chosen fabrics, lighting, and finishes.' },
    ],
  };
}

function readWorkspace() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved?.projects?.length && saved.projects.some(project => project.id === saved.active)) return saved;
  } catch {
    // Start with the sample if browser storage is unavailable.
  }
  return { active: 'sample', projects: [starterProject()] };
}

const workspace = readWorkspace();
const fields = [...document.querySelectorAll('[data-field]')];
let project;
let previewTimer;

function save() {
  let didSave = true;
  try {
    localStorage.setItem(storageKey, JSON.stringify(workspace));
  } catch {
    didSave = false;
  }
  const status = didSave
    ? (project.ready ? 'Ready for review · Saved on this device' : 'Draft · Saved on this device')
    : 'Storage unavailable · Download to keep a copy';
  if ($('project-state').textContent !== status) $('project-state').textContent = status;
  $('review-project').textContent = project.ready ? 'Return to draft' : 'Mark ready for review';
  $('copy-review').hidden = !project.ready;
  $('review-help').hidden = !project.ready;
}

const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, match => entities[match]);

function safeUrl(value, allowed) {
  try {
    const url = new URL(value);
    return allowed.includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function websiteHtml(draft, preview = false) {
  const [page, ink, muted, accent, panel, line] = palettes[draft.palette] || palettes.ivory;
  const text = (key, fallback = '') => escapeHtml(draft[key]?.trim() || fallback);
  const name = text('business', 'Your business');
  const heading = text('heading', 'Your website headline');
  const description = text('description');
  const image = escapeHtml(safeUrl(draft.image, ['https:']));
  const items = draft.services.filter(item => item.title.trim() || item.description.trim());
  const target = escapeHtml(safeUrl(draft.link, ['https:', 'mailto:', 'tel:'])) || (items.length ? '#services' : '');
  const button = draft.action.trim() && target
    ? (preview && !target.startsWith('#') ? `<span class="action">${text('action')}</span>` : `<a class="action" href="${target}">${text('action')}</a>`)
    : '';
  const services = items.map(item => `<article><h3>${escapeHtml(item.title || 'Service')}</h3><p>${escapeHtml(item.description)}</p></article>`).join('');
  const security = preview
    ? '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https:; style-src \'unsafe-inline\'; base-uri \'none\'; form-action \'none\'">'
    : '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${text('seoTitle', draft.business || draft.name || 'Website draft')}</title>
<meta name="description" content="${text('seoDescription', draft.description)}">
${security}
<style>
*{box-sizing:border-box}
body{margin:0;background:${page};color:${ink};font:16px/1.55 system-ui,sans-serif}
.wrap{width:min(1100px,calc(100% - 40px));margin:auto}
header,footer{border-block:1px solid ${line};padding:14px 0}
section{padding-block:clamp(28px,7vw,68px)}
.hero{display:grid;grid-template-columns:1fr;align-items:center;gap:clamp(16px,4vw,44px)}
.hero.split.with-image{grid-template-columns:minmax(0,1fr) minmax(0,1fr)}
.hero.stacked{text-align:center}
.hero.stacked img{max-height:450px}
h1,h2,h3,p{overflow-wrap:anywhere}
h1,h2{font-family:Georgia,serif;font-weight:500;line-height:1.05}
h1{font-size:clamp(2.35rem,7vw,5rem);margin:0 0 14px}
h2{font-size:clamp(1.8rem,4vw,2.8rem);margin:0 0 14px}
p{color:${muted};margin:0}
img{display:block;width:100%;aspect-ratio:4/3;object-fit:cover;border-radius:10px}
.action{display:inline-flex;align-items:center;min-height:44px;margin-top:16px;padding:8px 12px;border:1px solid ${accent};border-radius:6px;color:${accent};font-weight:700}
.services{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(200px,100%),1fr));gap:12px}
article{padding:16px;border:1px solid ${line};border-radius:8px;background:${panel}}
h3{margin:0 0 6px}
@media(max-width:640px){.hero.split.with-image{grid-template-columns:1fr}.wrap{width:calc(100% - 30px)}}
</style>
</head>
<body>
<header><div class="wrap"><strong>${name}</strong></div></header>
<main class="wrap">
<section class="hero ${draft.layout === 'stacked' ? 'stacked' : 'split'}${image ? ' with-image' : ''}">
<div><h1>${heading}</h1><p>${description}</p>${button}</div>
${image ? `<img referrerpolicy="no-referrer" src="${image}" alt="${text('alt')}">` : ''}
</section>
${services ? `<section id="services"><h2>Services</h2><div class="services">${services}</div></section>` : ''}
</main>
<footer><div class="wrap">${name}</div></footer>
</body>
</html>`;
}

function showPreview() {
  clearTimeout(previewTimer);
  $('draft-preview').srcdoc = websiteHtml(project, true);
}

function changed() {
  project.ready = false;
  save();
  clearTimeout(previewTimer);
  previewTimer = setTimeout(showPreview, 180);
}

function serviceField(labelText, key, index, value) {
  const label = document.createElement('label');
  const control = document.createElement(key === 'description' ? 'textarea' : 'input');
  control.id = `service-${index}-${key}`;
  label.htmlFor = control.id;
  label.textContent = labelText;
  control.value = value;
  control.maxLength = key === 'description' ? 200 : 70;
  control.addEventListener('input', () => {
    project.services[index][key] = control.value;
    changed();
  });
  return [label, control];
}

function showCollection() {
  const list = $('collection-list');
  list.replaceChildren();
  project.services.forEach((item, index) => {
    const group = document.createElement('fieldset');
    group.className = 'collection-item';
    const title = document.createElement('legend');
    title.textContent = `Service ${index + 1}`;
    const remove = document.createElement('button');
    remove.type = 'button';
    remove.className = 'button button-subtle';
    remove.textContent = 'Remove';
    remove.setAttribute('aria-label', `Remove service ${index + 1}`);
    remove.addEventListener('click', () => {
      project.services.splice(index, 1);
      showCollection();
      ($(`service-${Math.min(index, project.services.length - 1)}-title`) || $('add-item')).focus();
      changed();
    });
    group.append(title, ...serviceField('Name', 'title', index, item.title), ...serviceField('Description', 'description', index, item.description), remove);
    list.append(group);
  });
}

function selectProject(id) {
  project = workspace.projects.find(item => item.id === id);
  workspace.active = project.id;
  $('review-feedback').textContent = '';
  const select = $('project-select');
  select.replaceChildren(...workspace.projects.map(item => new Option(item.name || 'Untitled project', item.id)));
  select.value = id;
  fields.forEach(field => { field.value = project[field.dataset.field]; });
  showCollection();
  showPreview();
  save();
}

const tabs = [...document.querySelectorAll('[role="tab"]')];
function selectTab(selected) {
  tabs.forEach(tab => {
    const isSelected = tab === selected;
    tab.setAttribute('aria-selected', String(isSelected));
    tab.tabIndex = isSelected ? 0 : -1;
    $(tab.getAttribute('aria-controls')).hidden = !isSelected;
  });
}

for (const [index, tab] of tabs.entries()) {
  tab.addEventListener('click', () => selectTab(tab));
  tab.addEventListener('keydown', event => {
    const moves = { ArrowLeft: (index + tabs.length - 1) % tabs.length, ArrowRight: (index + 1) % tabs.length, Home: 0, End: tabs.length - 1 };
    if (!Object.hasOwn(moves, event.key)) return;
    event.preventDefault();
    const next = tabs[moves[event.key]];
    selectTab(next);
    next.focus();
  });
}

fields.forEach(field => field.addEventListener('input', () => {
  const key = field.dataset.field;
  project[key] = field.value;
  if (key === 'name') $('project-select').selectedOptions[0].textContent = field.value.trim() || 'Untitled project';
  changed();
}));

$('project-select').addEventListener('change', event => selectProject(event.target.value));

$('new-project').addEventListener('click', () => {
  const draft = newProject(crypto.randomUUID());
  workspace.projects.push(draft);
  selectProject(draft.id);
  selectTab($('tab-content'));
  $('project-name').focus();
  $('project-name').select();
});

$('add-item').addEventListener('click', () => {
  project.services.push({ title: '', description: '' });
  showCollection();
  $(`service-${project.services.length - 1}-title`).focus();
  changed();
});

$('review-project').addEventListener('click', () => {
  project.ready = !project.ready;
  $('review-feedback').textContent = '';
  save();
});

$('copy-review').addEventListener('click', async () => {
  const { name, business, heading, description, services } = project;
  const notes = [
    'Website draft review',
    'Project: ' + name,
    business && 'Business: ' + business,
    heading && 'Headline: ' + heading,
    description,
    ...services.map(service => [service.title, service.description].filter(Boolean).join(' — ')),
  ].filter(Boolean).join('\n');
  try {
    await navigator.clipboard.writeText(notes.length > 1800 ? notes.slice(0, 1776) + '\n[Notes shortened]' : notes);
    $('review-feedback').textContent = 'Notes copied.';
  } catch {
    $('review-feedback').textContent = 'Clipboard is unavailable. You can still download the complete draft.';
  }
});

$('device-options').addEventListener('click', event => {
  const selected = event.target.closest('button[data-device]');
  if (!selected) return;
  $('draft-preview').parentElement.dataset.device = selected.dataset.device;
  $('device-options').querySelectorAll('button').forEach(button => button.setAttribute('aria-pressed', String(button === selected)));
});

$('download-project').addEventListener('click', () => {
  const file = new Blob([websiteHtml(project)], { type: 'text/html' });
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = (project.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'website-draft') + '.html';
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 30000);
});

selectProject(workspace.active);
$('studio-workspace').hidden = false;
