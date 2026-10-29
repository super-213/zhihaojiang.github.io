'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom');
const assets=path.join(__dirname,'20261029生成式界面与个人界面代理');
const M=require(path.join(assets,'model.js'));
for(const style of ['soft','plain','bold']) for(const layout of ['devices','photos']) for(const task of ['browse','leave','energy']) {
  const s=M.compose(style,layout,task);
  assert.equal(new Set(s.order).size,s.order.length);
  assert(s.order.every(k=>M.panels[k]));
  assert.deepEqual(s.order,M.compose('soft',layout,task).order,'style must not alter content');
}
assert.deepEqual(M.compose('plain','photos','browse').order,['photos','calendar','devices','energy']);
assert.deepEqual(M.compose('bold','photos','leave').order,['devices','calendar']);
for(const role of ['member','guest']) for(const device of ['light','fridge']) for(const action of ['lights.setPower','devices.repair','devices.read']) for(const online of [true,false]) {
  const result=M.request(role,device,action,online);
  assert.equal(result.ok,role==='member'&&device==='light'&&action==='lights.setPower'&&online);
}
assert.equal(M.flow('invalid').length,3);
assert.match(M.flow('offline').at(-1)[1],/离线/);
function setup(mode) {
 const d=new JSDOM('<!doctype html><main id="lab"></main>',{url:`https://example.test/lab.html?mode=${mode}`,runScripts:'outside-only'}),w=d.window;
 let interval=null;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
 w.ResizeObserver=class{observe(){}disconnect(){}};
 w.setInterval=fn=>{interval=fn;return 1;};w.clearInterval=()=>{interval=null;};
 for(const file of ['model.js','lab.js'])w.eval(fs.readFileSync(path.join(assets,file),'utf8'));
 return {d,w,$:id=>w.document.getElementById(id),change(id,val){const el=w.document.getElementById(id);el.value=val;el.dispatchEvent(new w.Event('change'));},tick(){interval?.();},playing:()=>!!interval};
}
const a=setup('compose');
a.change('layout','photos');assert.equal(a.$('current').querySelector('section').dataset.panel,'photos');
a.$('save').click();a.change('task','leave');
assert.equal(a.$('baseline').querySelector('section').dataset.panel,'photos');assert.equal(a.$('current').querySelectorAll('section').length,2);
a.$('current').querySelector('button').click();assert.match(a.$('current').textContent,/确认客厅灯已关闭/);
assert.match(a.$('baseline').textContent,/客厅灯 · 关闭/);a.change('style','bold');assert.match(a.$('current').textContent,/客厅灯 · 关闭/);assert(a.$('current').querySelector('.bold'));
a.$('reset').click();assert.equal(a.$('current').querySelector('section').dataset.panel,'devices');a.d.window.close();
const b=setup('contract');b.$('send').click();assert.match(b.$('result').textContent,/成功/);
b.change('role','guest');assert.match(b.$('result').textContent,/尚未请求/);b.$('send').click();assert.equal(b.$('stage').textContent,'权限检查');
b.change('role','member');b.change('device','fridge');b.$('send').click();assert.equal(b.$('stage').textContent,'业务检查');
b.change('action','devices.repair');b.$('send').click();assert.equal(b.$('stage').textContent,'能力校验');
b.$('reset').click();b.change('online','no');b.$('send').click();assert.match(b.$('result').textContent,/未确认关闭/);b.d.window.close();
const c=setup('flow');assert(c.$('prev').disabled);
c.$('next').click();c.$('prev').click();assert.match(c.$('progress').textContent,/1 \/ 6/);
c.$('play').click();assert(c.playing());c.tick();c.$('play').click();assert(!c.playing());
c.change('scenario','invalid');c.$('next').click();c.$('next').click();assert(c.$('next').disabled);assert.match(c.$('explanation').textContent,/继续使用 v1/);
c.change('scenario','offline');c.$('play').click();for(let i=0;i<5;i++)c.tick();assert(!c.playing());assert.match(c.$('explanation').textContent,/设备离线/);
c.$('reset').click();assert.match(c.$('progress').textContent,/1 \/ 6/);
c.$('play').click();c.w.dispatchEvent(new c.w.Event('pagehide'));assert(!c.playing());c.d.window.close();
console.log('PASS: 18 composition cases, 24 authorization/execution cases, and all 3 interactive flows including failure, reset and timer cleanup.');
