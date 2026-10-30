(()=>{
'use strict';
const M=window.PoissonLab,root=document.getElementById('lab'),$=id=>document.getElementById(id),pct=x=>(x*100).toFixed(2)+'%';
let timer=null,themeObserver;const media=matchMedia('(prefers-color-scheme: dark)');
function stop(){if(timer!==null)clearInterval(timer);timer=null;if($('play'))$('play').textContent='播放';}
function theme(){let dark=media.matches;try{if(parent!==window)dark=parent.document.body.classList.contains('dark-mode');}catch{}document.documentElement.classList.toggle('dark',dark);}
theme();media.addEventListener('change',theme);
try{if(parent!==window){themeObserver=new MutationObserver(theme);themeObserver.observe(parent.document.body,{attributes:true,attributeFilter:['class']});}}catch{}
function height(){try{if(window.frameElement)window.frameElement.style.height=Math.ceil(root.getBoundingClientRect().height+2)+'px';}catch{}}
const resize=new ResizeObserver(()=>{draw();height();});resize.observe(root);
addEventListener('pagehide',()=>{stop();resize.disconnect();themeObserver?.disconnect();media.removeEventListener('change',theme);},{once:true});
document.addEventListener('visibilitychange',()=>{if(document.hidden)stop();});
let draw=()=>{};
const svg='<svg id="chart" class="chart" role="img"></svg>';
function chart(a,b,caption){
 const el=$('chart'),w=Math.max(280,el.clientWidth||600),h=200,left=42,right=10,top=24,bottom=32,N=a.length,max=Math.max(...a,...b,.01)*1.12,bw=(w-left-right)/N;
 el.setAttribute('viewBox',`0 0 ${w} ${h}`);el.setAttribute('aria-label',caption);
 let out=`<title>${caption}</title>`;
 for(let i=0;i<=2;i++){let v=max*i/2,y=h-bottom-v/max*(h-top-bottom);out+=`<path class="grid" d="M${left} ${y}H${w-right}"/><text x="${left-5}" y="${y+4}" text-anchor="end">${(100*v).toFixed(0)}%</text>`;}
 a.forEach((v,k)=>{let x=left+k*bw,y=h-bottom-v/max*(h-top-bottom);out+=`<rect class="bar" x="${x+bw*.12}" y="${y}" width="${bw*.34}" height="${h-bottom-y}"><title>${k} 次：${pct(v)}</title></rect>`;
 if(b.length){let yy=h-bottom-b[k]/max*(h-top-bottom);out+=`<rect class="second" x="${x+bw*.5}" y="${yy}" width="${bw*.34}" height="${h-bottom-yy}"><title>${k} 次：${pct(b[k])}</title></rect>`;}
 if(k%(w<420?2:1)===0)out+=`<text x="${x+bw/2}" y="${h-14}" text-anchor="middle">${k}</text>`;});
 el.innerHTML=out+`<text x="${w-right}" y="12" text-anchor="end">${caption}</text>`;
}
function hints(a,b){return `<details><summary>提示：先比较哪里</summary><p>${a}</p><details><summary>查看解释</summary><p>${b}</p></details></details>`;}
function counts(){
 root.classList.add('counts');
 root.innerHTML=`<div class="toolbar"><label>窗口<select id="duration"><option value="5">5 分钟</option><option value="10" selected>10 分钟</option><option value="20">20 分钟</option></select></label><button id="add">增加100窗</button></div><svg id="timeline" class="chart timeline" role="img" aria-label="首个窗口的到达时间线"></svg><div class="toolbar"><button id="prev">回看</button><button id="next">单步</button><button id="play">播放</button><button id="reset">重置</button><span id="stage"></span></div>${svg}<p class="legend"><span class="accent">左柱：理论概率</span> · <span class="other">右柱：模拟频率</span>；横轴为每窗口人数</p><p id="result" class="result" role="status"></p>${hints('比较 0 人和 6 人以上的频率；增加窗口后再比较。','理论柱是长期概率，模拟柱的分母是当前窗口总数。短期起伏会保留，增加样本不保证每根柱都更接近理论。')}`;
 let duration=10,total=100,stage=0,events=[],counts=[];
 function generate(){const r=M.rng(20261030);counts=[];for(let i=0;i<total;i++){const a=M.arrivals(.3,duration,r);if(i===0)events=a;counts.push(a.length);}}
 function render(){
 const lambda=.3*duration,N=Math.max(13,Math.ceil(lambda+4*Math.sqrt(lambda)+1)),a=Array.from({length:N},(_,k)=>M.poisson(lambda,k)),b=a.map((_,k)=>counts.filter(x=>x===k).length/total);chart(a,b,'每窗口人数（右尾未全画）');
 const el=$('timeline'),w=Math.max(280,el.clientWidth||600),x=t=>30+t/duration*(w-60);el.setAttribute('viewBox',`0 0 ${w} 76`);
 el.innerHTML=`<path class="grid" d="M30 36H${w-30}"/><text x="30" y="67">0 分</text><text x="${w-30}" y="67" text-anchor="end">${duration} 分</text>`+events.map((t,i)=>`<circle cx="${x(t)}" cy="36" r="${i<stage?5:3}" fill="${i<stage?'var(--accent)':'var(--line)'}"><title>第 ${i+1} 位：${t.toFixed(2)} 分钟</title></circle>`).join('');
 $('stage').textContent=`首窗口：已回放 ${stage} / ${events.length} 人`;$('prev').disabled=stage===0;$('next').disabled=stage===events.length;$('play').disabled=events.length===0;
 $('result').textContent=`${total} 个窗口 · 平均 ${(counts.reduce((s,x)=>s+x,0)/total).toFixed(2)} 人 · 空窗 ${pct(counts.filter(x=>x===0).length/total)} · 理论空窗 ${pct(Math.exp(-lambda))}`;
 $('add').disabled=total>=5000;
 }
 generate();draw=render;render();
 $('duration').onchange=()=>{stop();duration=+$('duration').value;total=100;stage=0;generate();render();};
 $('add').onclick=()=>{total+=100;generate();render();};
 $('prev').onclick=()=>{stop();stage=Math.max(0,stage-1);render();};
 $('next').onclick=()=>{stop();stage=Math.min(events.length,stage+1);render();};
 $('reset').onclick=()=>{stop();stage=0;total=100;generate();render();};
 $('play').onclick=()=>{if(timer!==null){stop();return;}if(stage===events.length)stage=0;$('play').textContent='暂停';timer=setInterval(()=>{stage++;if(stage>=events.length)stop();render();},700);};
}
function limit(){
 root.innerHTML=`<div class="toolbar"><label>小格数 n<select id="n"><option>3</option><option selected>6</option><option>12</option><option>30</option><option>100</option><option>1000</option></select></label><span id="params"></span></div>${svg}<p class="legend"><span class="accent">左柱：泊松 λ=3</span> · <span class="other">右柱：二项 (n, 3/n)</span>；横轴为次数</p><p id="result" class="result" role="status"></p>${hints('先选 n=3，看看 3 次以上能不能发生，再增加 n。','二项模型每格最多一次，方差为 3(1−3/n)。增大 n 时，这个人为上限的影响逐渐减弱；两者的均值始终为 3。')}`;
 draw=()=>{let n=+$('n').value,p=3/n,a=Array.from({length:13},(_,k)=>M.poisson(3,k)),b=a.map((_,k)=>M.binomial(n,p,k));chart(a,b,'每 10 分钟次数');$('params').textContent=`每格概率 p=${p.toFixed(3)} · np=3`;$('result').textContent=`空窗：泊松 ${pct(a[0])} / 二项 ${pct(b[0])}；方差：3 / ${(3*(1-p)).toFixed(3)}`;};$('n').onchange=draw;draw();
}
function boundary(){
 root.innerHTML=`<div class="toolbar"><label for="delta">窗口间差异 d<input id="delta" type="range" min="0" max="3" step="0.25" value="2"><output id="value" for="delta">2</output></label></div><p id="params" class="note"></p>${svg}<p class="legend"><span class="accent">左柱：固定 λ=3</span> · <span class="other">右柱：两类窗口各占一半</span>；横轴为人数</p><p id="result" class="result" role="status"></p>${hints('将 d 从 0 调到 3；总均值始终为 3，比较空窗与右尾。','一半窗口较冷清，一半较繁忙。把不同均值混起来会增加波动；d=0 时两类才完全相同。图中都是模型的解析概率，不是随机模拟。')}`;
 draw=()=>{const d=+$('delta').value,a=Array.from({length:17},(_,k)=>M.poisson(3,k)),b=a.map((_,k)=>M.mixture(3,d,k));$('value').textContent=d;$('params').textContent=`一半窗口 λ=${3-d}，另一半 λ=${3+d}；两类均值的平均数为 3。`;chart(a,b,'每 10 分钟人数（右尾未全画）');$('result').textContent=`混合模型：方差 ${(3+d*d).toFixed(2)} · 空窗 ${pct(b[0])} · 至少 6 人 ${pct(.5*(M.tail(3-d,6)+M.tail(3+d,6)))}`;};$('delta').oninput=draw;draw();
}
const mode=new URLSearchParams(location.search).get('mode');if(mode==='limit')limit();else if(mode==='boundary')boundary();else counts();height();
})();
