// Loaded independently so a Firebase outage cannot prevent Discord updates.
const lists = new Map();
function link(url, label) {
  const a = document.createElement('a');
  a.href = url; a.textContent = label; a.target = '_blank'; a.rel = 'noopener noreferrer';
  return a;
}
function render(section, posts) {
  const target = document.getElementById(section);
  if (!target || !Array.isArray(posts)) return;
  let list = lists.get(section);
  if (!list) {
    list = document.createElement('ul'); list.className = 'entries discord-posts';
    list.setAttribute('aria-label', 'Discord updates');
    target.after(list); lists.set(section, list);
  }
  list.replaceChildren();
  posts.forEach(post=>{
    const li = document.createElement('li');
    const text = document.createElement('p'); text.textContent = post.text; li.append(text);
    post.embeds.forEach(embed=>{
      const text = document.createElement('p');
      text.textContent = [embed.title,embed.description].filter(Boolean).join('\n'); li.append(text);
      if (embed.url) li.append(link(embed.url,'Open shared link ↗'));
    });
    post.attachments.forEach(file=>{
      const a = link(file.url,file.name);
      if (file.image) {
        const img = document.createElement('img'); img.src = file.url; img.alt = file.name;
        img.loading = 'lazy'; img.referrerPolicy = 'no-referrer'; a.replaceChildren(img);
      }
      li.append(a);
    });
    const meta = document.createElement('small');
    const date = new Date(post.date);
    meta.append(link(post.url,'View on Discord ↗'));
    if (!Number.isNaN(date.getTime())) meta.append(document.createTextNode(' · '+date.toLocaleDateString()));
    li.append(meta); list.append(li);
  });
  // Keep placeholders out of the way, while preserving real staff-published updates.
  target.classList.toggle('has-discord-posts', posts.length > 0);
}
let busy = false;
async function refresh() {
  if (busy || document.hidden) return;
  busy = true;
  try {
    const response = await fetch('/api/coaching-ladder-discord', {signal:AbortSignal.timeout(15000)});
    if (!response.ok) return;
    const data = await response.json();
    if (!data.configured) {
      lists.forEach((list,key)=>{list.remove();document.getElementById(key)?.classList.remove('has-discord-posts')});
      lists.clear(); return;
    }
    // A failed channel preserves its last successful result; removed mappings are cleared on complete responses.
    if (!data.partial) lists.forEach((list,key)=>{
      if (!(key in data.sections)) {list.remove();lists.delete(key);document.getElementById(key)?.classList.remove('has-discord-posts')}
    });
    Object.entries(data.sections).forEach(([section,posts])=>render(section,posts));
  } catch { /* Preserve the latest successful display during temporary outages. */ }
  finally { busy = false; }
}
refresh();
setInterval(refresh,60000);
document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh()});
