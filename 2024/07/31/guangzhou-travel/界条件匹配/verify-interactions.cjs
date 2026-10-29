'use strict';
const assert=require('node:assert/strict'), fs=require('node:fs'), path=require('node:path');
const {JSDOM}=require('jsdom');
function setup(mode) {
  const dom=new JSDOM('<!doctype html><html><body><main id="lab"></main></body></html>',{url:`https://example.test/lab.html?mode=${mode}`,runScripts:'outside-only'}),w=dom.window;
  w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
  w.ResizeObserver=class{observe(){} disconnect(){}};
  let interval=null;
  w.setInterval=fn=>{interval=fn;return 1;}; w.clearInterval=()=>{interval=null;};
  for(const f of ['model.js','lab.js'])w.eval(fs.readFileSync(path.join(__dirname,'20261022打靶法与边界条件匹配',f),'utf8'));
  const $=id=>w.document.getElementById(id);
  return {dom,$,set(id,value,type='input'){$(id).value=value;$(id).dispatchEvent(new w.Event(type,{bubbles:true}));},tick(){interval?.();},playing(){return !!interval;}};
}
const a=setup('aim');a.$('save').click();a.set('slope','1');assert.match(a.$('feedback').textContent,/命中/);assert.match(a.$('saved').textContent,/s=0.5/);assert.equal(a.$('chart').querySelectorAll('.comparison').length,1);
a.set('target','1','change');assert.match(a.$('saved').textContent,/目标已改变/);assert.equal(a.$('residual').textContent,'-1');a.$('reset').click();assert.match(a.$('saved').textContent,/尚未/);a.dom.window.close();
const b=setup('match');assert.match(b.$('phase').textContent,/第 1 轮/);b.$('next').click();assert.match(b.$('phase').textContent,/第 2 轮/);b.$('prev').click();assert.match(b.$('phase').textContent,/第 1 轮/);
b.$('play').click();assert(b.playing());b.tick();assert.match(b.$('phase').textContent,/第 2 轮/);b.$('play').click();assert(!b.playing());
b.$('finish').click();assert.match(b.$('phase').textContent,/满足数值残差/);assert(Math.abs(+b.$('nr').textContent)<1e-10);assert(+b.$('ge').textContent>1e-8);
b.set('steps','16','change');assert.match(b.$('previous').textContent,/N=8/);assert.match(b.$('phase').textContent,/第 1 轮/);assert(!b.playing());b.$('finish').click();assert(+b.$('ge').textContent<2e-8);
b.set('bracket','1,2','change');assert.match(b.$('phase').textContent,/未包根/);assert(b.$('next').disabled);assert(b.$('play').disabled);assert.equal(b.$('nr').textContent,'—');b.set('bracket','0,2','change');b.$('play').click();b.dom.window.dispatchEvent(new b.dom.window.Event('pagehide'));assert(!b.playing());b.dom.window.close();
const c=setup('boundary');assert.match(c.$('diagnosis').textContent,/中点/);c.$('inspect').click();assert.match(c.$('diagnosis').textContent,/唯一/);c.set('k','pi','change');assert.doesNotMatch(c.$('diagnosis').textContent,/无穷多/);c.$('inspect').click();assert.match(c.$('diagnosis').textContent,/无穷多/);c.set('beta','1','change');c.$('inspect').click();assert.match(c.$('diagnosis').textContent,/无解/);c.set('k','3.14','change');c.$('inspect').click();assert.match(c.$('diagnosis').textContent,/1971/);c.$('reset').click();assert.equal(c.$('beta').value,'0');c.dom.window.close();
const d=setup('sensitivity');const initial=+d.$('error').textContent;d.set('lambda','30');assert(+d.$('error').textContent>1700);assert(+d.$('error').textContent>initial);assert.match(d.$('chart').getAttribute('aria-label'),/解析/);d.dom.window.close();
console.log('PASS: preserved trials, changed targets, playback/pause/back/reset, setting synchronization, failure recovery, stopping diagnostics, π and near-π choices, amplification controls, timer cleanup.');
