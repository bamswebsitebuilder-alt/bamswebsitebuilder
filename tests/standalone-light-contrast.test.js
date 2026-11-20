import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import { runInNewContext } from 'node:vm';
const read = path => readFileSync(new URL('../' + path, import.meta.url), 'utf8');
function luminance(hex) {
  return [0.2126,0.7152,0.0722].reduce((l,w,i) => {
    const s = parseInt(hex.slice(2*i,2*i+2),16) / 255;
    return l + w * (s <= .04045 ? s / 12.92 : ((s + .055) / 1.055) ** 2.4);
  },0);
}
function contrast(a,b) {
  const pair = [luminance(a),luminance(b)].sort((x,y) => y-x);
  return (pair[0]+.05)/(pair[1]+.05);
}
test('standalone pages honor light preference without overriding dark or default appearance', () => {
  for (const path of ['package-quiz.html','websites-for-barbers-clearwater.html','websites-for-contractors-tampa.html']) {
    const html = read(path);
    const setup = html.match(/<script>([^<]+bam-theme[^<]+)<\/script>/);
    assert.ok(setup,path);
    assert.match(html,/href="\/css\/light-standalone\.css\?/);
    for (const theme of [null,'dark','light']) {
      const dataset = {};
      runInNewContext(setup[1],{document:{documentElement:{dataset}},localStorage:{getItem:()=>theme}});
      assert.equal(dataset.theme,theme === 'light' ? 'light' : undefined);
    }
  }
});
test('light palette text and domain badge labels meet 4.5:1', () => {
  const css = read('css/light-standalone.css');
  const palette = Object.fromEntries([...css.matchAll(/--bam-([\w-]+): #(\w{6});/g)].map(([,k,v])=>[k,v]));
  for (const [fg,bg] of [[palette.text,palette.bg],[palette.text,palette.panel],[palette.gold,palette.bg],[palette.gold,'ffffff'],[palette.border,palette.panel]]) {
    assert.ok(contrast(fg,bg) >= (fg === palette.border ? 3 : 4.5),fg+' / '+bg);
  }
  const icons = read('domains.html').match(/html\[data-theme="light"\] \.domain-page-main :is\(\.domain-feature-icon,\.domain-steps-grid b\)\{color:#fff;background:#([\da-f]{6})\}/);
  assert.ok(icons);
  assert.ok(contrast('ffffff',icons[1])>=4.5);
});
