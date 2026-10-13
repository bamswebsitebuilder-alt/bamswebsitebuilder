import test from 'node:test';
import assert from 'node:assert/strict';
import { portalLoginUrl, loginDestination } from '../js/portal-routing.js';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const origin = 'https://www.bamswebsitebuilder.com';
test('agreement links survive login in both languages and for either role', () => {
  for (const prefix of ['', '/es']) {
    const source = new URL(`${origin}${prefix}/client-portal?registered=1#agreements`);
    const login = new URL(portalLoginUrl(source), origin);
    assert.equal(login.pathname, `${prefix}/login`);
    for (const role of ['client', 'admin']) {
      assert.equal(loginDestination({origin, requestedPage:login.searchParams.get('next'), role, spanish:!!prefix}), `${prefix}/client-portal?registered=1#agreements`);
    }
  }
});
test('ordinary login defaults and unsafe next URLs stay within the proper portal', () => {
  for (const role of ['client', 'admin']) {
    for (const requestedPage of [null, 'https://evil.example/client-portal#agreements', '//evil.example/client-portal', '/contact']) {
      assert.equal(loginDestination({origin, requestedPage, role, spanish:true}), `/es/${role === 'admin' ? 'admin-dashboard' : 'client-portal'}`);
    }
  }
});

test('admin return links preserve language and panel only for administrator accounts', () => {
  for (const prefix of ['', '/es']) {
    for (const suffix of ['', '.html']) {
      const requestedPage = `${prefix}/admin-dashboard${suffix}?view=clients#projects`;
      assert.equal(loginDestination({origin, requestedPage, role:'admin', spanish:!!prefix}), requestedPage);
      assert.equal(loginDestination({origin, requestedPage, role:'client', spanish:!!prefix}), `${prefix}/client-portal`);
    }
    const location = new URL(`${origin}${prefix}/admin-dashboard#projects`);
    const login = new URL(portalLoginUrl(location), origin);
    assert.equal(login.pathname, `${prefix}/login`);
    assert.equal(login.searchParams.get('next'), `${prefix}/admin-dashboard#projects`);
  }
  for (const requestedPage of ['https://evil.example/admin-dashboard', '//evil.example/admin-dashboard', '/contact', '/admin-dashboard/other']) {
    assert.equal(loginDestination({origin, requestedPage, role:'admin', spanish:false}), '/admin-dashboard');
  }
});

test('initial agreement links and later hash changes select the matching panel', () => {
  const handlers = {};
  const element = (id, panel) => ({id, dataset:{panel:id}, active:false,
    classList:{contains:name => panel && name === 'portal-panel', toggle(name,value){ if(name === 'active') this.active=value; }},
    setAttribute(){}, addEventListener(){}
  });
  const panels = ['dashboard','agreements'].map(id=>element(id,true));
  const buttons = ['dashboard','agreements'].map(id=>element(id,false));
  const location = {hash:'#agreements'};
  const context = {location, history:{replaceState(_a,_b,hash){location.hash=hash;}},
    window:{addEventListener(type,fn){handlers[type]=fn;}},
    document:{addEventListener(_type,fn){handlers.ready=fn;},
      getElementById(id){return panels.find(p=>p.id===id)||null;},
      querySelectorAll(selector){return selector === '.portal-panel' ? panels : selector === '.portal-nav-link[data-panel]' ? buttons : [];}
    }
  };
  vm.runInNewContext(readFileSync(new URL('../js/portal.js',import.meta.url),'utf8'),context);
  handlers.ready();
  assert.equal(panels[1].classList.active,true);
  location.hash='#dashboard'; handlers.hashchange();
  assert.equal(panels[0].classList.active,true);
  assert.equal(panels[1].classList.active,false);
  location.hash='#not-a-panel'; handlers.hashchange();
  assert.equal(panels[0].classList.active,true);
});
