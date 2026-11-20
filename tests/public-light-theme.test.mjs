import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css=readFileSync(new URL('../css/light-theme.css',import.meta.url),'utf8');
const color=(name)=>css.match(new RegExp('--bam-'+name+':\\s*(#[0-9a-f]{6})','i'))?.[1];
const luminance=(hex)=>{
  const linear=hex.slice(1).match(/../g).map((part)=>{
    const x=Number.parseInt(part,16)/255;
    return x<=.04045 ? x/12.92 : ((x+.055)/1.055)**2.4;
  });
  return .2126*linear[0]+.7152*linear[1]+.0722*linear[2];
};
const contrast=(one,two)=>{
  const [bright,dark]=[luminance(one),luminance(two)].sort((a,b)=>b-a);
  return (bright+.05)/(dark+.05);
};
test('light drawer text and icons have readable contrast across cream states',()=>{
  for(const back of ['#fff8e8','#f3e7cc',color('panel')]) {
    assert.ok(contrast(color('text'),back)>=4.5);
    assert.ok(contrast(color('gold'),back)>=4.5);
  }
  assert.match(css,/html\[data-theme="light"\] body \.mobile-navigation a:hover:not\(\.active\):not\(\[aria-current\]\) \{\s*color: var\(--bam-text\) !important/);
  assert.match(css,/html\[data-theme="light"\] body \.mobile-menu \.mobile-navigation a \.mobile-link-icon \{\s*color: var\(--bam-gold\) !important/);
});
test('homepage comparison table uses an accessible light gold accent',()=>{
  assert.ok(contrast(color('gold'),color('bg'))>=4.5);
  assert.match(css,/html\[data-theme="light"\] body \.bam-growth-table th \{ color: var\(--bam-gold\) !important/);
});
