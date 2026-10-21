'use strict';
const assert = require('node:assert/strict');
const M = require('./20261021三对角方程组与追赶法/model.js');
const close = (v, w, tol = 1e-10) => assert(Math.abs(v - w) < tol, `${v} != ${w}`);
// Independent reference: dense Gaussian elimination with partial pivoting.
function denseSolve(a, b, c, d) {
  const n = b.length, A = b.map((v, i) => b.map((_, j) => i === j ? v : j === i - 1 ? a[i] : j === i + 1 ? c[i] : 0).concat(d[i]));
  for (let k = 0; k < n; k++) {
    let pivot = k;
    for (let i = k + 1; i < n; i++) if (Math.abs(A[i][k]) > Math.abs(A[pivot][k])) pivot = i;
    assert(A[pivot][k] !== 0);
    [A[k], A[pivot]] = [A[pivot], A[k]];
    for (let i = k + 1; i < n; i++) {
      const m = A[i][k] / A[k][k];
      for (let j = k; j <= n; j++) A[i][j] -= m * A[k][j];
    }
  }
  const x = Array(n).fill(0);
  for (let i = n - 1; i >= 0; i--) {
    let s = A[i][n];
    for (let j = i + 1; j < n; j++) s -= A[i][j] * x[j];
    x[i] = s / A[i][i];
  }
  return x;
}
function verify(input, target) {
  const { a, b, c, d } = input, before = JSON.stringify(input), result = M.solve(a, b, c, d, true);
  assert.equal(JSON.stringify(input), before, 'must preserve original inputs');
  const ref = denseSolve(a, b, c, d);
  result.x.forEach((v, i) => { close(v, ref[i]); if (target) close(v, target[i], 1e-9); });
  assert(M.residual(a, b, c, d, result.x) < 1e-9);
  assert.equal(result.states.length, 2 * b.length);
  for (const s of result.states) {
    // Every displayed transformed equation still holds for the reference solution.
    for (let i = 0; i < b.length; i++) {
      close(s.u[i] * ref[i] + (i ? s.lower[i] * ref[i - 1] : 0) + (i + 1 < b.length ? c[i] * ref[i + 1] : 0), s.r[i], 1e-9);
      if (s.x[i] !== null) close(s.x[i], ref[i]);
    }
    if (s.phase === '向前消元') for (let i = 1; i <= s.row; i++) assert.equal(s.lower[i], 0);
  }
  assert.deepEqual(result.states.at(-1).x, result.x);
  return result;
}
for (const n of [1, 2, 3, 4, 6, 16, 64]) {
  for (const [left, right] of [[0, 100], [20, 20], [-15, 80], [0, 0]]) {
    const h = M.heat(n, left, right), s = verify(h, h.exact);
    s.u.forEach((v, i) => close(v, (i + 2) / (i + 1)));
  }
}
const hand = verify(M.heat(4), [20, 40, 60, 80]);
[2, 1.5, 4 / 3, 1.25].forEach((v, i) => close(hand.u[i], v));
verify({ a: [0, -1, 2, -2], b: [4, 5, 6, 5], c: [1, -1, 2, 0], d: [6, 6, 30, 14] }, [1, 2, 3, 4]);
let seed = 20261021;
const rng = () => { seed = (Math.imul(1664525, seed) + 1013904223) >>> 0; return seed / 2 ** 32; };
for (let trial = 0; trial < 250; trial++) {
  const n = 1 + Math.floor(20 * rng()), a = Array(n).fill(0), c = Array(n).fill(0), b = [], d = [];
  for (let i = 0; i < n; i++) { if (i) a[i] = 4 * rng() - 2; if (i + 1 < n) c[i] = 4 * rng() - 2; b[i] = Math.abs(a[i]) + Math.abs(c[i]) + .2 + rng(); d[i] = 20 * rng() - 10; }
  verify({ a, b, c, d });
}
// Symmetric positive definite but not necessarily strictly diagonally dominant: A = L D L^T.
for (let trial = 0; trial < 100; trial++) {
  const n = 2 + Math.floor(16 * rng()), pivots = Array.from({ length: n }, () => .5 + rng()), multipliers = Array.from({ length: n }, (_, i) => i ? 3 * rng() - 1.5 : 0);
  const a = Array(n).fill(0), b = [...pivots], c = Array(n).fill(0), d = Array.from({ length: n }, () => rng());
  for (let i = 1; i < n; i++) { a[i] = multipliers[i] * pivots[i - 1]; c[i - 1] = a[i]; b[i] += multipliers[i] ** 2 * pivots[i - 1]; }
  const r = verify({ a, b, c, d }); r.u.forEach((v, i) => close(v, pivots[i]));
}
assert.throws(() => M.solve([0, 1], [0, 1], [1, 0], [1, 2]), /主元/);
assert.throws(() => M.solve([0, 1], [1, 1], [1, 0], [1, 2]), /主元/);
assert.throws(() => M.solve([], [], [], []), /非空/);
assert.throws(() => M.solve([0], [Infinity], [0], [1]), /有限数/);
assert.throws(() => M.solve([1], [2], [0], [1]), /边界/);
assert.throws(() => M.solve([0], [2, 3], [0], [1]), /等长/);
for (const eps of [0, 1e-2, 1e-8, 1e-12, 1e-16, 1e-18]) {
  const p = M.pivotExample(eps), ref = denseSolve([0, 1], [eps, 1], [1, 0], [1, 2]);
  p.pivoted.forEach((v, i) => close(v, ref[i], 1e-14));
  assert(p.pivotedMetrics.error < 1e-14); assert(p.pivotedMetrics.residual < 1e-14);
  if (!eps) assert(p.error && !p.plain);
}
assert(M.pivotExample(1e-18).plainMetrics.error > .9);
assert.deepEqual(M.counts(10000), { operations: 79993, band: 29998, dense: 100000000 });
console.log('PASS: hand calculation; 28 thermal systems; 250 seeded nonsymmetric strictly dominant systems; 100 SPD systems; independent dense pivoting reference; every replay state and final solution; input preservation; n=1 and invalid/zero-pivot cases; 6 pivot comparisons; storage and operation counts.');

// The exploratory task measures deviation from the local average, not algebraic residual.
assert.deepEqual(M.heatBalance([50, 50, 50, 50]).difference, [25, 0, 0, -25]);
assert.equal(M.heatBalance([20, 40, 60, 80]).maxDifference, 0);
assert.equal(M.heatBalance([20, 40, 60, 80], 0, 50).maxDifference, 25);
for (const n of [1, 3, 4, 6]) {
  const h = M.heat(n, -10, 80);
  assert(M.heatBalance(h.exact, -10, 80).maxDifference < 1e-12);
  const trial = Array.from({length:n}, (_, i) => 3*i*i);
  close(2*M.heatBalance(trial, -10, 80).maxDifference, M.residual(h.a,h.b,h.c,h.d,trial));
}
assert.throws(() => M.heatBalance([]), /有限数/);
assert.throws(() => M.heatBalance([NaN]), /有限数/);
const source = M.heat(4); source.d[1] = 10;
verify(source, [26, 52, 68, 84]);
console.log('PASS: exploratory local-balance measurements, average/residual relation, invalid temperatures, changed-source transfer task.');
