(function(root){
'use strict';
function poisson(lambda,k){
 if(!Number.isFinite(lambda)||lambda<0||!Number.isInteger(k))throw Error('参数无效');
 if(k<0)return 0;
 if(lambda===0)return k===0?1:0;
 let p=Math.exp(-lambda);for(let i=1;i<=k;i++)p*=lambda/i;return p;
}
function binomial(n,p,k){
 if(k<0||k>n)return 0;if(p===1)return k===n?1:0;if(p===0)return k===0?1:0;
 let v=(1-p)**n;for(let i=1;i<=k;i++)v*=((n-i+1)/i)*p/(1-p);return v;
}
function tail(lambda,k){let s=0;for(let i=0;i<k;i++)s+=poisson(lambda,i);return Math.max(0,1-s);}
function rng(seed){let s=seed>>>0;return()=>{s=(Math.imul(1664525,s)+1013904223)>>>0;return(s+.5)/4294967296;};}
function arrivals(rate,duration,random){const a=[];let t=0;while((t+=-Math.log1p(-random())/rate)<=duration)a.push(t);return a;}
function sample(lambda,random){const stop=Math.exp(-lambda);let p=1,k=0;do{p*=random();k++;}while(p>stop);return k-1;}
function mixture(lambda,delta,k){return .5*(poisson(lambda-delta,k)+poisson(lambda+delta,k));}
const api={poisson,binomial,tail,rng,arrivals,sample,mixture};
if(typeof module==='object'&&module.exports)module.exports=api;else root.PoissonLab=api;
})(typeof window==='object'?window:globalThis);
