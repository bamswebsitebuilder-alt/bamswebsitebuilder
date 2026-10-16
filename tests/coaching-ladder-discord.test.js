import test from 'node:test';
import assert from 'node:assert/strict';
import handler from '../api/coaching-ladder-discord.js';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';
const guild='1499838103056027678', channel='1499838116255633512';
const originalFetch=globalThis.fetch;
const envKeys=['COACHING_DISCORD_BOT_TOKEN','COACHING_DISCORD_GUILD_ID','COACHING_DISCORD_CHANNELS'];
const originalEnv=Object.fromEntries(envKeys.map(k=>[k,process.env[k]]));
function response(){return {headers:{},code:200,setHeader(k,v){this.headers[k]=v},status(n){this.code=n;return this},json(data){this.data=data;return this}}}
function configure(mapping={announcements:channel}){process.env.COACHING_DISCORD_BOT_TOKEN='test-secret';process.env.COACHING_DISCORD_GUILD_ID=guild;process.env.COACHING_DISCORD_CHANNELS=JSON.stringify(mapping)}
test.after(()=>{globalThis.fetch=originalFetch;for(const k of envKeys){if(originalEnv[k]===undefined)delete process.env[k];else process.env[k]=originalEnv[k]}});
test('unconfigured feed makes no Discord requests and does not expose credentials',async()=>{
  delete process.env.COACHING_DISCORD_BOT_TOKEN;
  globalThis.fetch=()=>{throw Error('must not fetch')};const res=response();await handler({method:'GET'},res);
  assert.deepEqual(res.data,{configured:false,sections:{}});
  assert.equal(res.headers['Access-Control-Allow-Origin'],'*');
});
test('explicit channel selection strips credentials and unsafe links; edits and deletes refresh',async()=>{
  configure();let messages=[{id:'1499838116255633513',type:0,content:'Original',timestamp:'2026-10-16T02:00:00Z',attachments:[{filename:'bad',url:'javascript:alert(1)'}],embeds:[{title:'Example',url:'javascript:alert(1)'}]}];
  const calls=[];
  globalThis.fetch=async(url,options)=>{calls.push(url);assert.equal(options.headers.Authorization,'Bot test-secret');return {ok:true,json:async()=>url.includes('/messages?')?messages:{guild_id:guild,type:0}}};
  async function read(){const res=response();await handler({method:'GET',query:{channel:'99999999999999999'}},res);return res}
  let res=await read();assert.equal(res.data.sections.announcements[0].text,'Original');assert.equal(res.data.sections.announcements[0].attachments.length,0);assert.equal(res.data.sections.announcements[0].embeds[0].url,null);
  assert(!JSON.stringify(res.data).includes('test-secret'));assert(calls.every(url=>url.includes(channel)));
  messages[0].content='Edited';res=await read();assert.equal(res.data.sections.announcements[0].text,'Edited');
  messages=[];res=await read();assert.deepEqual(res.data.sections.announcements,[]);assert.match(res.headers['Cache-Control'],/s-maxage=60/);
});
test('invalid mappings, methods and channels outside selected server are rejected',async()=>{
  configure({unknown:channel});let res=response();await handler({method:'GET'},res);assert.equal(res.code,503);
  configure();res=response();await handler({method:'POST'},res);assert.equal(res.code,405);
  let messagesFetched=false;globalThis.fetch=async url=>{if(url.includes('/messages'))messagesFetched=true;return {ok:true,json:async()=>({guild_id:'99999999999999999',type:0})}};
  res=response();await handler({method:'GET'},res);assert.equal(res.code,503);assert.equal(messagesFetched,false);assert.equal(res.headers['Cache-Control'],'no-store');
});
test('partial failure does not clear a healthy channel or expose upstream errors',async()=>{
  configure({announcements:channel,scores:'1499838116255633514'});
  globalThis.fetch=async url=>({ok:!url.includes('1499838116255633514'),json:async()=>url.includes('/messages?')?[]:{guild_id:guild,type:0}});
  const res=response();await handler({method:'GET'},res);assert.equal(res.code,200);assert.equal(res.data.partial,true);assert.deepEqual(res.data.sections,{announcements:[]});assert.equal(res.headers['Cache-Control'],'no-store');
});
test('website safely renders Discord text and clears deleted posts',async()=>{
  const elements=new Map();function node(){return {children:[],classList:{toggle(){}},setAttribute(){},append(...items){this.children.push(...items)},replaceChildren(...items){this.children=items},after(n){this.next=n},remove(){this.removed=true}}}
  elements.set('announcements',node());let payload={configured:true,partial:false,sections:{announcements:[{text:'<img onerror=alert(1)>',date:'2026-10-16',url:'https://discord.com/channels/1/2/3',attachments:[],embeds:[]}]}};
  let tick;const document={hidden:false,getElementById:id=>elements.get(id),createElement:node,createTextNode:t=>({textContent:t}),addEventListener(){}};
  vm.runInNewContext(readFileSync(new URL('../coaching-ladder/discord-feed.js',import.meta.url),'utf8'),{document,Date,Map,AbortSignal,fetch:async()=>({ok:true,json:async()=>payload}),setInterval:fn=>tick=fn});
  await new Promise(resolve=>setImmediate(resolve));
  const list=elements.get('announcements').next;assert.equal(list.children[0].children[0].textContent,'<img onerror=alert(1)>');
  payload.sections.announcements=[];await tick();assert.equal(list.children.length,0);
  payload={configured:true,partial:false,sections:{}};await tick();assert.equal(list.removed,true);
});

test('forum feed includes active and archived starters, titles and links; excludes private/unselected threads and replies',async()=>{
  const forum='1514117624861167776', first='1514117624861167780', second='1514117624861167781', deleted='1514117624861167782';
  configure({breaking:forum});
  const thread=(id,extra={})=>({id,parent_id:forum,guild_id:guild,type:11,name:id===first?'ESPN':'Upset Alert',...extra});
  let text='Mississippi State update';let removed=false;const calls=[];
  globalThis.fetch=async url=>{
    calls.push(url);let value;
    if(url.endsWith('/channels/'+forum)) value={guild_id:guild,type:15};
    else if(url.endsWith('/threads/active')) value={threads:removed?[]:[thread(first),thread(first),thread('1514117624861167783',{type:12}),thread('1514117624861167784',{parent_id:channel})]};
    else if(url.includes('/threads/archived/public')) value={threads:[thread(second,{guild_id:undefined}),thread(deleted,{guild_id:undefined})]};
    else {
      const id=url.split('/').at(-1);
      if(id===deleted)return {ok:false,status:404};
      assert([first,second].includes(id));
      value={id,channel_id:id,type:0,content:text,timestamp:'2026-10-16T03:00:00Z',attachments:[],embeds:[]};
    }
    return {ok:true,json:async()=>value};
  };
  async function read(){const res=response();await handler({method:'GET'},res);return res}
  let res=await read();assert.equal(res.code,200);assert.equal(res.data.partial,false);
  assert.deepEqual(res.data.sections.breaking.map(p=>p.id),[deleted,second,first]);
  assert.equal(res.data.sections.breaking[2].text,'ESPN\n\nMississippi State update');
  assert.equal(res.data.sections.breaking[2].url,`https://discord.com/channels/${guild}/${first}/${first}`);
  assert.equal(calls.filter(u=>u.endsWith('/messages/'+first)).length,1);
  assert(!calls.some(u=>u.includes('/channels/'+forum+'/messages')));
  text='Edited original post';res=await read();assert.match(res.data.sections.breaking[1].text,/Edited original post/);
  removed=true;res=await read();assert.deepEqual(res.data.sections.breaking.map(p=>p.id),[deleted,second]);
  assert.match(res.data.sections.breaking[0].text,/Original post unavailable/);
});

test('forum starter permission failure keeps the failed section out of the partial response',async()=>{
  const forum='1514117624861167776',thread='1514117624861167780';configure({announcements:channel,breaking:forum});
  globalThis.fetch=async url=>{
    if(url.endsWith('/messages/'+thread))return {ok:false,status:403};
    let value;
    if(url.endsWith('/channels/'+forum))value={guild_id:guild,type:15};
    else if(url.endsWith('/channels/'+channel))value={guild_id:guild,type:0};
    else if(url.endsWith('/threads/active'))value={threads:[{id:thread,parent_id:forum,guild_id:guild,type:11,name:'Post'}]};
    else if(url.includes('/threads/archived/public'))value={threads:[]};
    else value=[];
    return {ok:true,json:async()=>value};
  };
  const res=response();await handler({method:'GET'},res);assert.equal(res.data.partial,true);assert.deepEqual(res.data.sections,{announcements:[]});
});
