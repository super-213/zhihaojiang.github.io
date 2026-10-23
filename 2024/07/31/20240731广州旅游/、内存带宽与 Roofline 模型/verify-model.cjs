'use strict';
const assert = require('node:assert/strict');
const M = require('./20261023算法复杂度、内存带宽与 Roofline 模型/model.js');
// Independently enumerate element-level work and transfers, including empty input.
for (const n of [0, 1, 2, 8, 97]) for (const bytes of [4, 8]) for (const fused of [false, true]) {
  let ops = 0, transferred = 0;
  if (fused) for (let i = 0; i < n; i++) { ops += 3; transferred += bytes; transferred += bytes; }
  else {
    for (let i = 0; i < n; i++) { ops += 2; transferred += bytes; transferred += bytes; }
    for (let i = 0; i < n; i++) { ops++; transferred += bytes; transferred += bytes; }
  }
  const r = M.affine(n, bytes, fused);
  assert.equal(r.work, ops); assert.equal(r.traffic, transferred);
  assert.equal(r.stages.reduce((q, s) => q + s.bytes, 0), transferred);
  assert.equal(r.intensity, n ? ops / transferred : null);
}
const split = M.affine(1e6, 8, false), fused = M.affine(1e6, 8, true);
assert.equal(split.traffic, 32e6); assert.equal(fused.traffic, 16e6);
assert.equal(split.work, fused.work); assert.equal(split.intensity, .09375); assert.equal(fused.intensity, .1875);
for (const i of [.0625, .09375, .1875, 1, 4, 10, 16, 64]) for (const p of [50, 1000, 2000]) for (const b of [10, 100, 400]) {
  const r = M.roofline(i, p, b);
  assert(r.ceiling <= p); assert(r.ceiling <= i * b);
  assert(Math.abs(r.lowerMs - Math.max(r.computeMs, r.memoryMs)) < 1e-12);
  assert(M.roofline(i, p * 2, b).ceiling >= r.ceiling);
  assert(M.roofline(i, p, b * 2).ceiling >= r.ceiling);
}
const r = M.roofline(.1875, 1000, 100);
assert.equal(r.ceiling, 18.75); assert.equal(r.ridge, 10); assert.equal(r.computeMs, .003); assert.equal(r.lowerMs, .16);
assert.equal(M.roofline(.1875, 2000, 100).ceiling, 18.75);
assert.equal(M.roofline(16, 1000, 100).regime, 'compute');
assert.equal(M.roofline(10, 1000, 100).regime, 'ridge');
for (const bad of [-1, 0, Infinity, NaN]) assert.throws(() => M.roofline(bad, 1000, 100), RangeError);
assert.throws(() => M.affine(1.5)); assert.throws(() => M.affine(1, 16));
console.log('PASS: independent work/transfer counts, zero input, precision, roof inequalities, units, monotonicity and ridge boundary.');
