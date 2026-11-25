import { SITE_FIELDS, applySiteContent } from './site-content.js';
import { button, el, portalRequest, t } from './portal-services.js';

const stageNames = {
  draft: ['Draft', 'Borrador'],
  'in-review': ['Awaiting BAM review', 'En revisión por BAM'],
  approved: ['Approved for publication', 'Aprobado para publicar'],
  'changes-requested': ['Changes requested', 'Cambios solicitados'],
  published: ['Published', 'Publicado']
};

function preview(content, readContent) {
  const box = el('section', '', 'bam-site-preview');
  const toolbar = el('div', '', 'hosting-actions');
  const frame = el('iframe');
  frame.title = t('Website content preview', 'Vista previa del contenido');
  frame.setAttribute('sandbox', '');
  frame.referrerPolicy = 'no-referrer';

  function paint() {
    // Serialize a DOM assembled from fixed markup and validated text or image attributes.
    const layout = document.implementation.createHTMLDocument('');
    const page = layout.createElement('main');
    const fields = [
      ['img', 'logoUrl'], ['p', 'businessName'], ['h1', 'headline'], ['p', 'description'], ['img', 'imageUrl'],
      ['h2', null, t('Services and prices', 'Servicios y precios')], ['p', 'services'],
      ['h2', null, t('Hours', 'Horario')], ['p', 'hours'], ['h2', null, t('Contact', 'Contacto')], ['p', 'contact']
    ];
    const values = { ...content, ...readContent() };
    for (const [tag, field, text] of fields) {
      if (field && !values[field]) {
        if (page.lastElementChild?.tagName === 'H2') page.lastElementChild.remove();
        continue;
      }
      const element = layout.createElement(tag);
      if (field) element.dataset.bamField = field;
      if (tag === 'img') {
        element.alt = field === 'logoUrl' ? t('Business logo', 'Logotipo del negocio') : t('Website image', 'Imagen del sitio');
        element.referrerPolicy = 'no-referrer';
      }
      if (text) element.textContent = text;
      page.append(element);
    }
    applySiteContent(page, values);
    frame.srcdoc = '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width">' +
      '<meta http-equiv="Content-Security-Policy" content="default-src \'none\'; img-src https:; style-src \'unsafe-inline\'">' +
      '<style>body{background:#111;color:#fff;font:16px system-ui;margin:0}main{max-width:760px;margin:auto;padding:clamp(1rem,5vw,3rem);overflow-wrap:anywhere}h1{font-size:clamp(1.6rem,5vw,3rem)}h2{color:#e9bf67}p{white-space:pre-wrap;line-height:1.6}img{display:block;max-width:100%;max-height:240px;object-fit:contain}img[hidden]{display:none}img[data-bam-field=logoUrl]{max-width:140px;max-height:80px}</style></head><body>' +
      page.outerHTML + '</body></html>';
  }

  const devices = [[t('Desktop', 'Escritorio'), '100%'], ['Tablet', '768px'], [t('Mobile', 'Móvil'), '390px']];
  for (const [label, width] of devices) {
    const control = button(label, () => {
      frame.style.width = width;
      for (const item of toolbar.querySelectorAll('[aria-pressed]')) item.setAttribute('aria-pressed', String(item === control));
    });
    control.setAttribute('aria-pressed', String(width === '100%'));
    toolbar.append(control);
  }
  toolbar.append(button(t('Update preview', 'Actualizar vista previa'), paint));
  box.append(el('h3', t('Content preview', 'Vista previa del contenido')),
    el('p', t('Preview your content in a sample layout. The live site uses its own design.',
      'Previsualiza el contenido en un diseño de muestra. El sitio publicado usa su propio diseño.')),
    toolbar, frame);
  paint();
  return box;
}

export function createSiteEditor(host, getUser, admin = false) {
  if (!host) return null;
  const title = el('h2', admin ? t('Client website editor', 'Editor de sitios de clientes') : t('Edit my website', 'Editar mi sitio web'));
  const selector = admin ? el('select') : null;
  const screen = el('div');
  const status = el('p');
  status.setAttribute('role', 'status');
  const label = el('label', t('Client website', 'Sitio web del cliente'), 'bam-control');
  if (selector) {
    label.append(selector);
    selector.addEventListener('change', load);
  }
  host.replaceChildren(title);
  if (selector) host.append(label);
  host.append(status, screen);
  let request = 0;

  async function load() {
    const generation = ++request;
    const user = getUser();
    const uid = selector?.value;
    screen.replaceChildren();
    status.textContent = '';
    if (!user || (admin && !uid)) return;
    status.textContent = t('Loading website…', 'Cargando sitio…');
    const context = admin ? { uid } : {};
    const current = () => request === generation && getUser()?.uid === user.uid;
    try {
      const { editor, history } = await portalRequest(user, 'editor-read', context);
      if (!current()) return;
      status.textContent = '';
      render(editor, history, context, current, user);
    } catch (error) {
      if (current()) {
        status.textContent = error.message;
        screen.append(button(t('Retry', 'Reintentar'), load));
      }
    }
  }

  function render(editor, history, context, current, user) {
    if (!admin && !editor) {
      screen.append(el('p', t('BAM will enable editing when your website is ready.', 'BAM habilitará la edición cuando tu sitio esté listo.')));
      return;
    }
    const draft = editor?.draft || {};
    const fields = editor?.fields || [];
    const form = el('form', '', 'bam-editor-fields');
    form.addEventListener('submit', event => event.preventDefault());
    const controls = new Map();
    const permissions = new Map();
    const config = admin ? el('details') : null;
    if (config) config.append(el('summary', t('Set editable fields and starting content', 'Configurar campos editables y contenido inicial')));
    for (const [key, [max, en, es]] of Object.entries(SITE_FIELDS)) {
      if (!admin && !fields.includes(key)) continue;
      const item = el('div', '', 'bam-editor-field');
      const field = el('label', t(en, es), 'bam-control');
      const input = el(max >= 500 && !key.endsWith('Url') ? 'textarea' : 'input');
      if (input.tagName === 'TEXTAREA') input.rows = 3;
      else input.type = key.endsWith('Url') ? 'url' : 'text';
      input.maxLength = max;
      input.value = draft[key] || '';
      field.append(input);
      controls.set(key, input);
      item.append(field);
      if (admin) {
        const checkbox = el('input');
        checkbox.type = 'checkbox';
        checkbox.checked = fields.includes(key);
        permissions.set(key, checkbox);
        const setting = el('label', '', 'bam-check');
        setting.append(checkbox, document.createTextNode(t('Client can edit', 'El cliente puede editar')));
        item.append(setting);
      }
      form.append(item);
    }
    const getContent = () => Object.fromEntries([...controls].map(([key, input]) => [key, input.value]));
    let busy = false;
    const act = (action, extra = {}) => async () => {
      if (busy || !current()) return;
      if (extra.content && !form.reportValidity()) return;
      busy = true;
      for (const control of screen.querySelectorAll('button')) control.disabled = true;
      if (selector) selector.disabled = true;
      status.textContent = t('Saving…', 'Guardando…');
      try {
        await portalRequest(user, action, { ...context, rev: editor?.revision || 0, ...extra });
        if (current()) await load();
      } catch (error) {
        if (current()) status.textContent = error.message;
      } finally {
        if (selector) selector.disabled = false;
        if (current()) for (const control of screen.querySelectorAll('button')) control.disabled = false;
        busy = false;
      }
    };
    if (editor) screen.append(el('p', t(...stageNames[editor.stage]), 'hosting-badge'));
    const actions = el('div', '', 'hosting-actions');
    actions.append(button(t('Reload saved content', 'Recargar contenido guardado'), load));
    if (admin) {
      config.append(form, button(t('Save editor settings', 'Guardar configuración del editor'), () =>
        act('editor-config', { fields: [...permissions].filter(([, input]) => input.checked).map(([key]) => key),
          content: Object.fromEntries(Object.entries(getContent()).filter(([key, value]) =>
            value || Object.hasOwn(draft, key) || permissions.get(key).checked)) })(), true));
      screen.append(config);
      if (editor) {
        const url = el('code', location.origin + '/api/portal-services?site=' + editor.publicId);
        const endpoint = el('p', t('Published content URL ', 'URL de contenido publicado '), 'bam-published-url');
        endpoint.append(url);
        screen.append(endpoint);
      }
      if (editor?.stage === 'in-review') actions.append(
        button(t('Approve version', 'Aprobar versión'), act('editor-approve'), true),
        button(t('Request changes', 'Solicitar cambios'), act('editor-return')));
      if (editor?.stage === 'approved') actions.append(button(t('Publish approved version', 'Publicar versión aprobada'), act('editor-publish'), true));
    } else if (fields.length) {
      const locked = ['in-review', 'approved'].includes(editor.stage);
      if (locked) for (const input of controls.values()) input.readOnly = true;
      screen.append(form);
      if (!locked) actions.append(
        button(t('Save draft', 'Guardar borrador'), () => act('editor-save', { content: getContent() })()),
        button(t('Send to BAM for approval', 'Enviar a BAM para aprobación'), () => act('editor-submit', { content: getContent() })(), true));
    } else {
      screen.append(el('p', t('BAM has paused editing for this website.', 'BAM ha pausado la edición de este sitio.')));
    }
    if (editor) screen.append(preview(draft, admin ? () => ({}) : getContent));
    screen.append(actions);
    if (history.length) {
      const list = el('ul', '', 'bam-versions');
      for (const version of history) {
        const item = el('li');
        const date = new Date(version.submittedAt).toLocaleString(document.documentElement.lang);
        const isLive = editor.publishedRevision === version.revision;
        item.append(el('span', t('Version ', 'Versión ') + version.revision + ' · ' + date +
          (isLive ? t(' · Live', ' · Publicada') : version.publishedAt ? t(' · Previously published', ' · Publicada anteriormente') : '')));
        if (admin) item.append(button(t('Restore for review', 'Restaurar para revisión'), act('editor-restore', { version: version.revision })));
        list.append(item);
      }
      screen.append(el('h3', t('Version history', 'Historial de versiones')), list);
    }
  }

  return {
    load,
    setClients(clients) {
      if (!selector) return;
      const selected = selector.value;
      selector.replaceChildren(el('option', t('Select a client', 'Selecciona un cliente')));
      selector.firstChild.value = '';
      for (const client of clients) {
        const option = el('option', client.businessName || client.fullName || client.email || client.id);
        option.value = client.id;
        selector.append(option);
      }
      selector.value = clients.some(client => client.id === selected) ? selected : '';
      if (selected && !selector.value) load();
    },
    reset() {
      if (selector) selector.replaceChildren();
      request++;
      screen.replaceChildren();
      status.textContent = '';
    }
  };
}
