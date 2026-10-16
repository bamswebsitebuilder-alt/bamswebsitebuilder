import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const keys=['announcements','breaking','advancement','scores','champions','format','available','taken','recruiting','rules','tips','playbooks','creators','highlights'];
function fixture(view='dashboard', {role='commissioner',active=true,exists=true,readFails=false}={}) {
  const elements=new Map();
  function element(id){
    if(!elements.has(id)){
      const classes=new Set();
      elements.set(id,{value:'',textContent:'',hidden:false,disabled:false,children:[],handlers:{},
        classList:{add:n=>classes.add(n),remove:n=>classes.delete(n),contains:n=>classes.has(n),toggle(n,on){on?classes.add(n):classes.delete(n)}},
        addEventListener(type,fn){this.handlers[type]=fn},setAttribute(){},replaceChildren(){this.children=[]},append(child){this.children.push(child)}});
    }
    return elements.get(id);
  }
  const state={user:{uid:'commissioner-uid',email:'commissioner@example.test'},staff:{role,active},exists,writes:[],redirect:null};
  const snapshot=()=>({exists:()=>state.exists,data:()=>state.staff});
  const auth={get currentUser(){return state.user}};
  const context={auth,db:{},Date,document:{body:{dataset:{adminView:view},classList:element('body').classList},getElementById:element,querySelectorAll:()=>[],createElement:()=>({textContent:''})},
    location:{assign:url=>state.redirect=url,replace:url=>state.redirect=url},
    doc:(_db,...path)=>path.join('/'),
    getDoc:async path=>{
      if(path.startsWith('coachingLadderStaff/'))return snapshot();
      if(readFails)throw Error('permission-denied');
      return {exists:()=>true,data:()=>Object.fromEntries(keys.map(k=>[k,['Existing '+k]]))};
    },
    setDoc:async(path,data)=>state.writes.push({path,data}),serverTimestamp:()=> 'SERVER_TIMESTAMP',
    onAuthStateChanged:(_auth,fn)=>state.authChanged=fn,
    onSnapshot:(_path,fn,error)=>{state.snapshot=fn;state.snapshotError=error;return ()=>{}},
    signInWithEmailAndPassword:async()=>({user:state.user}),sendPasswordResetEmail:async()=>{},signOut:async()=>{state.user=null}
  };
  const run=file=>vm.runInNewContext(readFileSync(new URL('../coaching-ladder/'+file,import.meta.url),'utf8').replace(/import\s*\{[^}]+\}\s*from\s*"[^"]+";/g,''),context);
  return {state,element,context,run,snapshot,submit:id=>element(id).handlers.submit({preventDefault(){}})};
}

test('commissioner loads published content and publishes all sections with attribution',async()=>{
  const f=fixture();f.run('admin.js');await f.state.authChanged(f.state.user);
  assert.equal(f.element('body').classList.contains('authorized'),true);
  assert.equal(f.element('announcements').value,'Existing announcements');
  f.element('announcements').value=' New announcement \n\n Next announcement ';
  await f.submit('editor');
  assert.equal(f.state.writes.length,1);
  const {path,data}=f.state.writes[0];
  assert.equal(path,'coachingLadder/public/site/content');
  assert.deepEqual(Array.from(data.announcements),['New announcement','Next announcement']);
  assert.equal(data.updatedBy,'commissioner-uid');
  assert.equal(data.updatedAt,'SERVER_TIMESTAMP');
  assert.equal(f.element('save').disabled,false);
});

test('signed-out, inactive, missing and BAM-admin-only accounts cannot open editor',async()=>{
  for(const options of [{role:'admin'},{role:'client'},{active:false},{exists:false}]){
    const f=fixture('dashboard',options);f.run('admin.js');await f.state.authChanged(f.state.user);
    assert.equal(f.element('body').classList.contains('authorized'),false);
    await f.submit('editor');assert.equal(f.state.writes.length,0);
  }
  const f=fixture();f.state.user=null;f.run('admin.js');await f.state.authChanged(null);
  assert.equal(f.state.redirect,'/coaching-ladder/admin-login/');
});

test('failed content load keeps Publish disabled and cannot overwrite the website',async()=>{
  const f=fixture('dashboard',{readFails:true});f.run('admin.js');await f.state.authChanged(f.state.user);
  assert.equal(f.element('body').classList.contains('authorized'),false);
  assert.equal(f.element('save').disabled,true);
  await f.submit('editor');assert.equal(f.state.writes.length,0);
});

test('staff revocation hides and clears the editor and prevents subsequent publishing',async()=>{
  const f=fixture();f.run('admin.js');await f.state.authChanged(f.state.user);
  f.state.staff.active=false;f.state.snapshot(f.snapshot());
  assert.equal(f.element('body').classList.contains('authorized'),false);
  assert.equal(f.element('announcements').value,'');
  assert.equal(f.element('save').disabled,true);
  await f.submit('editor');assert.equal(f.state.writes.length,0);
});

test('Publish rechecks staff role even before a revocation snapshot arrives',async()=>{
  const f=fixture();f.run('admin.js');await f.state.authChanged(f.state.user);
  f.state.staff.active=false;await f.submit('editor');
  assert.equal(f.state.writes.length,0);
  assert.equal(f.element('body').classList.contains('authorized'),false);
});

test('login admits a commissioner and rejects a user with no staff record',async()=>{
  for(const exists of [true,false]){
    const f=fixture('login',{exists});f.run('admin.js');f.element('password').value='test-only-placeholder';
    await f.submit('login-form');
    assert.equal(f.state.redirect,exists?'/coaching-ladder/admin-dashboard/':null);
    assert.equal(f.element('password').value,'');
    if(!exists)assert.equal(f.state.user,null);
  }
});

test('public updates use literal text and clearing a section removes stale content',()=>{
  const f=fixture();f.run('public.js');
  const update=items=>f.state.snapshot({exists:()=>true,data:()=>({announcements:items})});
  update(['<img src=x onerror=alert(1)>']);
  assert.equal(f.element('announcements').children[0].textContent,'<img src=x onerror=alert(1)>');
  update([]);
  assert.equal(f.element('announcements').children.length,1);
  assert.equal(f.element('announcements').children[0].textContent,'No updates published yet.');
});


test('clean and legacy login pages load fresh redirect code from the same module', async()=>{
  const base=new URL('../coaching-ladder/',import.meta.url);
  for(const path of ['admin-login.html','admin-login/index.html','admin-dashboard.html','admin-dashboard/index.html']){
    const html=readFileSync(new URL(path,base),'utf8');
    const src=html.match(/<script type="module" src="([^"]+)"/)[1];
    const moduleURL=new URL(src,'https://www.bamswebsitebuilder.com/coaching-ladder/'+path.replace('index.html',''));
    assert.equal(moduleURL.pathname,'/coaching-ladder/admin.js');
    assert.ok(moduleURL.searchParams.get('v'),'cached modules must be invalidated after changing redirect paths');
  }
  const f=fixture('login');f.run('admin.js');await f.submit('login-form');
  const destination=new URL(f.state.redirect,'https://www.bamswebsitebuilder.com/coaching-ladder/admin-login/');
  assert.equal(destination.pathname,'/coaching-ladder/admin-dashboard/');
});
