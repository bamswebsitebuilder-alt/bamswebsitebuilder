// Only explicitly configured public publishing channels are exposed. Never accept channel IDs from a request.
const sections = new Set(['announcements','breaking','advancement','scores','champions','format','available','taken','recruiting','rules','tips','playbooks','creators','highlights']);
const snowflake = value => typeof value === 'string' && /^\d{17,20}$/.test(value);
const safeUrl = value => {
  try { const url = new URL(value); return url.protocol === 'https:' ? url.href : null; }
  catch { return null; }
};

async function discord(path, token, allowMissing = false) {
  const response = await fetch('https://discord.com/api/v10' + path, {
    headers: {Authorization: 'Bot ' + token}, signal: AbortSignal.timeout(8000)
  });
  if (allowMissing && response.status === 404) return null;
  if (!response.ok) {
    console.error('Coaching Discord API request failed', {status:response.status});
    throw new Error('discord_unavailable');
  }
  return response.json();
}

// Forums store each post as a public thread. Read only the starter post, not its discussion replies.
async function forumMessages(channelId, guild, token, activeThreads) {
  const [active, archived] = await Promise.all([
    activeThreads(), discord('/channels/' + channelId + '/threads/archived/public?limit=40', token)
  ]);
  if (!Array.isArray(active.threads) || !Array.isArray(archived.threads)) throw Error('invalid_threads');
  const selected = [...new Map([...active.threads,...archived.threads]
    .filter(t=>snowflake(t.id) && t.parent_id === channelId && (!t.guild_id || t.guild_id === guild) && t.type === 11)
    .map(t=>[t.id,t])).values()]
    .sort((a,b)=>BigInt(a.id)>BigInt(b.id)?-1:1).slice(0,20);
  const messages = new Array(selected.length);
  let index = 0;
  // Bound concurrent API requests; never join, unarchive or modify a Discord thread.
  await Promise.all(Array.from({length:Math.min(4,selected.length)},async()=>{
    while (index < selected.length) {
      const i = index++, thread = selected[i];
      const message = await discord('/channels/' + thread.id + '/messages/' + thread.id,token,true);
      if (!message) continue; // Deleted starter posts must disappear from the public feed.
      if (message.id !== thread.id || message.channel_id !== thread.id) throw Error('invalid_starter');
      messages[i] = {...message, forumTitle:typeof thread.name === 'string'?thread.name.slice(0,100):'', sourceChannel:thread.id};
    }
  }));
  console.info('Coaching forum sync counts', JSON.stringify({active:active.threads.length,archived:archived.threads.length,matchingParents:[...active.threads,...archived.threads].filter(t=>t.parent_id===channelId).length,types:[...new Set([...active.threads,...archived.threads].filter(t=>t.parent_id===channelId).map(t=>t.type))],selected:selected.length,starters:messages.filter(Boolean).length,messageTypes:[...new Set(messages.filter(Boolean).map(m=>m.type))]}));
  return messages.filter(Boolean);
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 'no-store');
  // These are deliberately public posts, also consumed by the GitHub Pages custom domain.
  res.setHeader('Access-Control-Allow-Origin', '*');
  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET');
    return res.status(405).json({error:'method_not_allowed'});
  }
  const token = process.env.COACHING_DISCORD_BOT_TOKEN;
  const guild = process.env.COACHING_DISCORD_GUILD_ID;
  if (!token || !snowflake(guild) || !process.env.COACHING_DISCORD_CHANNELS) {
    return res.status(200).json({configured:false, sections:{}});
  }
  let mapping;
  try {
    mapping = JSON.parse(process.env.COACHING_DISCORD_CHANNELS);
    if (!mapping || Array.isArray(mapping) || typeof mapping !== 'object' ||
        !Object.keys(mapping).length || Object.entries(mapping).some(([key,id])=>!sections.has(key)||!snowflake(id))) throw Error();
  } catch { return res.status(503).json({error:'configuration_unavailable'}); }

  let active;
  const activeThreads = ()=>active ||= discord('/guilds/' + guild + '/threads/active',token);
  const results = await Promise.allSettled(Object.entries(mapping).map(async ([section, channelId])=>{
    const channel = await discord('/channels/' + channelId, token);
    // Reject DMs, other servers, private threads and unsupported channel types.
    if (channel.guild_id !== guild || ![0,5,11,15,16].includes(channel.type)) throw Error('invalid_channel');
    const messages = [15,16].includes(channel.type)
      ? await forumMessages(channelId,guild,token,activeThreads)
      : await discord('/channels/' + channelId + '/messages?limit=40', token);
    if (!Array.isArray(messages)) throw Error('invalid_messages');
    const posts = messages.filter(m=>snowflake(m.id) && [0,19].includes(m.type)).map(m=>({
      id:m.id,
      text: [m.forumTitle, typeof m.content === 'string'?m.content.slice(0,4000):''].filter(Boolean).join('\n\n'),
      date: typeof m.timestamp === 'string' ? m.timestamp : '',
      url:'https://discord.com/channels/' + guild + '/' + (m.sourceChannel || channelId) + '/' + m.id,
      attachments:(Array.isArray(m.attachments)?m.attachments:[]).slice(0,10).map(a=>({
        name:typeof a.filename === 'string'?a.filename.slice(0,200):'Attachment',
        url:safeUrl(a.url), image:typeof a.content_type === 'string' && a.content_type.startsWith('image/')
      })).filter(a=>a.url),
      embeds:(Array.isArray(m.embeds)?m.embeds:[]).slice(0,5).map(e=>({
        title:typeof e.title==='string'?e.title.slice(0,256):'',
        description:typeof e.description==='string'?e.description.slice(0,2000):'',
        url:safeUrl(e.url)
      }))
    })).filter(m=>m.text || m.attachments.length || m.embeds.some(e=>e.title||e.description||e.url));
    if (messages.length && !posts.length) throw Error('message_content_unavailable');
    return [section,posts];
  }));
  const data = Object.fromEntries(results.filter(r=>r.status==='fulfilled').map(r=>r.value));
  const partial = results.some(r=>r.status==='rejected');
  if (partial) console.error('Coaching Discord feed: one or more configured channels unavailable');
  if (!Object.keys(data).length) return res.status(503).json({error:'feed_unavailable'});
  // CDN cache is shared across visitors; failure responses never replace a successful cached feed.
  if (!partial) res.setHeader('Cache-Control','public, max-age=0, s-maxage=60');
  return res.status(200).json({configured:true, sections:data, partial});
}
