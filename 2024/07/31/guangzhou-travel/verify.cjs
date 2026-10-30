'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {JSDOM}=require('jsdom'),assets=path.join(__dirname,'20261030泊松分布'),M=require(path.join(assets,'model.js'));
const near=(a,b,e=1e-11)=>assert(Math.abs(a-b)<e,`${a} != ${b}`);
// Independent direct factorial formula, normalization and moments, including the zero-rate boundary.
for(const l of [0,.5,1,3,6]){
 let sum=0,mean=0,sq=0;for(let k=0;k<100;k++){const p=M.poisson(l,k);sum+=p;mean+=k*p;sq+=k*k*p;let f=1;for(let j=1;j<=k;j++)f*=j;near(p,Math.exp(-l)*l**k/f);}
 near(sum,1);near(mean,l);near(sq-mean*mean,l);
}
near(M.tail(3,6),.08391794203130343);near(M.mixture(3,2,0),.1873086940852639);
// Exhaustive enumeration of all 6 independent Bernoulli slots.
const bins=Array(7).fill(0);for(let bits=0;bits<64;bits++)bins[bits.toString(2).replace(/0/g,'').length]++;
for(let k=0;k<=6;k++)near(M.binomial(6,.5,k),bins[k]/64);
near(M.binomial(3,1,3),1);near(M.binomial(3,1,0),0);near(M.binomial(1000,.003,0),(1-.003)**1000);
for(const d of [0,1,2,3]){let s=0,e=0,e2=0;for(let k=0;k<100;k++){let p=M.mixture(3,d,k);s+=p;e+=k*p;e2+=k*k*p;}near(s,1);near(e,3);near(e2-9,3+d*d);}
const r=M.rng(3);let s=0,sq=0,N=100000;for(let i=0;i<N;i++){const x=M.arrivals(.3,10,r).length;s+=x;sq+=x*x;}near(s/N,3,.03);near(sq/N-(s/N)**2,3,.06);
function setup(mode){const d=new JSDOM('<main id="lab"></main>',{url:`https://example.test/lab.html?mode=${mode}`,runScripts:'outside-only'}),w=d.window;let timer=null;
 w.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});w.ResizeObserver=class{observe(){}disconnect(){}};
 w.setInterval=fn=>(timer=fn,1);w.clearInterval=()=>timer=null;
 for(const f of ['model.js','lab.js'])w.eval(fs.readFileSync(path.join(assets,f),'utf8'));
 return{w,d,$:id=>w.document.getElementById(id),change(id,v,event='change'){const el=this.$(id);el.value=v;el.dispatchEvent(new w.Event(event));},tick(){timer?.();},playing:()=>!!timer};}
const a=setup('counts');const initial=a.$('result').textContent;assert.match(initial,/100 个窗口/);
a.$('add').click();assert.match(a.$('result').textContent,/200 个窗口/);
a.$('next').click();const step=a.$('timeline').innerHTML;assert(!a.$('prev').disabled);a.$('prev').click();a.$('next').click();assert.equal(a.$('timeline').innerHTML,step);
a.$('play').click();assert(a.playing());a.$('play').click();assert(!a.playing());a.$('play').click();a.tick();a.$('reset').click();assert.equal(a.$('result').textContent,initial);
a.change('duration',5);assert.match(a.$('result').textContent,/22.31%/);a.$('play').click();a.w.dispatchEvent(new a.w.Event('pagehide'));assert(!a.playing());a.d.window.close();
const b=setup('limit');b.change('n',3);assert.match(b.$('result').textContent,/0.00%/);b.change('n',1000);assert.match(b.$('params').textContent,/np=3/);assert.match(b.$('result').textContent,/2.991/);b.d.window.close();
const c=setup('boundary');c.change('delta',0,'input');assert.match(c.$('result').textContent,/方差 3.00/);c.change('delta',3,'input');assert.match(c.$('result').textContent,/方差 12.00/);assert.match(c.$('params').textContent,/λ=0/);c.d.window.close();
console.log('PASS: exact probabilities, normalization/moments, Bernoulli enumeration, mixture boundaries, 100000 simulated windows and three DOM interaction flows.');
