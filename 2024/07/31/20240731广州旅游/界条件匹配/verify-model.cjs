'use strict';
const assert = require('node:assert/strict');
const M = require('./20261022打靶法与边界条件匹配/model.js');
const near = (a, b, eps = 1e-12) => assert(Math.abs(a-b) <= eps, `${a} vs ${b}`);
for (const beta of [-.5,0,1]) {
  const p = M.parabola(beta+1,beta); near(p.residual,0); near(p.points[0][1],0); near(p.points.at(-1)[1],beta);
}
// RK4 reproduces the constant-acceleration polynomial at arbitrary nodes.
for (const n of [1,4,17]) {
  const p = M.integrate(() => -2,0,1,n);
  for (const [x,y] of p.points) near(y,x-x*x);
}
// Independently check the IVP against sinh, and its observed fourth order.
const errors = [8,16,32].map(n => Math.abs(M.hyperbolic(1,n).end-Math.sinh(1)));
for (let i=1;i<errors.length;i++) assert(errors[i-1]/errors[i]>14 && errors[i-1]/errors[i]<17);
let previous = Infinity;
for (const n of [4,8,16,32]) {
  const r = M.solveHyperbolic(n,0,2); assert.equal(r.status,'residual');
  for (const [i,t] of r.states.entries()) {
    assert(t.s>=t.lo && t.s<=t.hi);
    const fn=s=>M.hyperbolic(s,n).end-1;
    assert(fn(t.lo)*fn(t.hi)<=0);
    if (Math.abs(t.r)>1e-10) near(t.nextHi-t.nextLo,(t.hi-t.lo)/2);
    if (i) { near(t.lo,r.states[i-1].nextLo); near(t.hi,r.states[i-1].nextHi); }
  }
  const s=r.states.at(-1).s, v=M.metrics(s,n);
  assert(Math.abs(v.numericalResidual)<=1e-10); assert(v.gridError<previous); previous=v.gridError;
  assert(Math.abs(v.exactResidual)>Math.abs(v.numericalResidual)*100);
  near(v.slopeError,Math.abs(s-2/(Math.E-1/Math.E)));
}
assert.equal(M.solveHyperbolic(8,1,2).status,'unbracketed');
assert.equal(M.bisect(x=>x,0,1).status,'residual');
assert.equal(M.bisect(x=>x*x-2,0,2,1e-30,1).status,'limit');
assert.equal(M.bisect(()=>NaN,0,2).status,'nonfinite');
assert.throws(()=>M.integrate(()=>0,0,0,0),RangeError);
assert.equal(M.integrate(()=>Infinity,0,0,4).status,'nonfinite');
const pi0=M.oscillator('pi',2,0), pi1=M.oscillator('pi',2,1), almost=M.oscillator('3.14',1,0);
assert.equal(pi0.kind,'family'); assert.equal(pi0.end,0); assert.equal(pi1.kind,'none'); near(pi1.residual,-1);
assert.equal(almost.kind,'unique'); assert(Math.abs(almost.residual)<.001); assert(almost.points[60][1]>.31);
for (const preset of ['2','3.14','3.15']) {
  const o=M.oscillator(preset,0,1); near(M.oscillator(preset,o.matchedSlope,1).residual,0);
}
for (const lambda of [1,8,20,30]) {
  const u=M.unstable(lambda,1e-8); near(u.reference[0][1],1); near(u.reference.at(-1)[1],0);
  assert(u.reference.every(p=>p[1]>=0 && p[1]<=1));
  near(u.points.at(-1)[1],1e-8*Math.sinh(lambda)/lambda,1e-10);
  const k=lambda, sum=x=>(Math.sinh(k*(1-x))+Math.sinh(k*x))/Math.sinh(k);
  for (let i=0;i<=20;i++) assert(sum(i/20)<=1+1e-14);
}
console.log('PASS: analytic trajectories, RK4 order, bracket invariants, stopping and failure states, grid errors, exact π degeneracy, near-π conditioning, perturbation amplification and stable BVP reference.');
