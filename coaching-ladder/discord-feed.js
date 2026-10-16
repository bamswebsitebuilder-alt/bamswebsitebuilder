// Independent of Firebase so Discord updates remain available during outages.
const feeds = new Map();
const PAGE_SIZE = 3;
function link(url, label) {
  const a = document.createElement('a');
  try { if (!['https:', 'http:'].includes(new URL(url).protocol)) return document.createTextNode(label); }
  catch { return document.createTextNode(label); }
  a.href = url; a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function display(feed, focus = false) {
  const {list, posts, pager} = feed;
  const pages = Math.max(1, Math.ceil(posts.length / PAGE_SIZE));
  feed.page = Math.min(feed.page, pages - 1);
  list.replaceChildren();
  posts.slice(feed.page * PAGE_SIZE, (feed.page + 1) * PAGE_SIZE).forEach(post => {
    const li = document.createElement('li');
    const details = document.createElement('details');
    const summary = document.createElement('summary');
    const excerpt = document.createElement('span'); excerpt.className = 'post-excerpt';
    const text = [post.text, ...(post.embeds || []).map(e => [e.title, e.description].filter(Boolean).join('\n'))].filter(Boolean).join('\n\n');
    // Keep the original content in the expanded view; tidy Discord syntax in the preview.
    excerpt.textContent = text.replace(/<@&?\d+>/g, '@member').replace(/<a?:(\w+):\d+>/g, '$1').replace(/\*\*|^#+\s/gm, '') || 'Shared media update';
    const hint = document.createElement('span'); hint.className = 'post-open'; hint.textContent = 'Read post';
    summary.append(excerpt, hint); details.append(summary);
    const body = document.createElement('div'); body.className = 'post-body';
    const full = document.createElement('p'); full.textContent = text; body.append(full);
    (post.embeds || []).forEach(e => { if (e.url) body.append(link(e.url, 'Open shared link ↗')); });
    (post.attachments || []).forEach(file => {
      const a = link(file.url, file.name || 'Attachment');
      if (file.image && a.nodeType === 1) {
        const img = document.createElement('img'); img.src = a.href; img.alt = file.name || 'Post attachment';
        img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; a.replaceChildren(img);
      }
      body.append(a);
    });
    details.append(body); li.append(details);
    const meta = document.createElement('small');
    const date = new Date(post.date);
    if (!Number.isNaN(date.getTime())) {
      const time = document.createElement('time'); time.dateTime = date.toISOString();
      time.textContent = date.toLocaleDateString('en-US', {month: 'short', day: 'numeric', year: 'numeric'});
      meta.append(time);
    }
    meta.append(link(post.url, 'Discord ↗'));
    li.append(meta); list.append(li);
  });
  pager.hidden = pages <= 1;
  feed.previous.disabled = feed.page === 0;
  feed.next.disabled = feed.page === pages - 1;
  feed.status.textContent = `${feed.page + 1} / ${pages}`;
  if (focus) { list.focus({preventScroll: true}); }
}
function remove(section) {
  const feed = feeds.get(section);
  if (!feed) return;
  feed.list.remove(); feed.pager.remove(); feeds.delete(section);
  document.getElementById(section)?.classList.remove('has-discord-posts');
}
function render(section, posts) {
  const target = document.getElementById(section);
  if (!target || !Array.isArray(posts)) return;
  if (!posts.length) { remove(section); return; }
  let feed = feeds.get(section);
  if (!feed) {
    const title = target.closest('.card')?.querySelector('h3')?.textContent || section;
    const list = document.createElement('ul'); list.className = 'entries discord-posts';
    list.id = `${section}-discord`; list.tabIndex = -1; list.setAttribute('aria-label', `${title} Discord posts`);
    const pager = document.createElement('nav'); pager.className = 'post-pagination'; pager.setAttribute('aria-label', `${title} post pages`);
    const previous = document.createElement('button'); previous.type = 'button'; previous.textContent = '← Newer';
    const next = document.createElement('button'); next.type = 'button'; next.textContent = 'Older →';
    [previous, next].forEach(b => b.setAttribute('aria-controls', list.id));
    const status = document.createElement('span'); status.setAttribute('aria-live', 'polite'); status.setAttribute('aria-atomic', 'true');
    pager.append(previous, status, next); target.after(list); list.after(pager);
    feed = {list, pager, previous, next, status, posts, page: 0, signature: ''};
    previous.addEventListener('click', () => { feed.page--; display(feed, true); });
    next.addEventListener('click', () => { feed.page++; display(feed, true); });
    feeds.set(section, feed);
  }
  const signature = JSON.stringify(posts);
  if (signature !== feed.signature) {
    feed.signature = signature; feed.posts = posts; display(feed);
  }
  target.classList.add('has-discord-posts');
}
let busy = false;
async function refresh() {
  if (busy || document.hidden) return;
  busy = true;
  try {
    const response = await fetch('https://bamswebsitebuilder.vercel.app/api/coaching-ladder-discord', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) return;
    const data = await response.json();
    if (!data.configured) { [...feeds.keys()].forEach(remove); return; }
    if (!data.sections || typeof data.sections !== 'object') return;
    if (!data.partial) [...feeds.keys()].forEach(key => { if (!(key in data.sections)) remove(key); });
    Object.entries(data.sections).forEach(([section, posts]) => render(section, posts));
  } catch { /* Preserve the last successful display during temporary outages. */ }
  finally { busy = false; }
}
refresh();
setInterval(refresh, 60000);
document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
