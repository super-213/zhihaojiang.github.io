// Run from any directory: node /path/to/this/verify-model.cjs
const assert = require('node:assert/strict');
const M = require('./20261019反正弦定律/model.js');

for (const n of [2, 4, 6, 8, 10, 12]) {
  const lead = Array(n + 1).fill(0), last = Array(n + 1).fill(0), heads = Array(n + 1).fill(0);
  for (let bits = 0; bits < 2 ** n; bits++) {
    const g = M.summarize(Array.from({ length: n }, (_, i) => bits & (1 << i) ? 1 : -1));
    lead[g.positive]++; last[g.lastZero]++; heads[g.heads]++;
    const reflected = M.summarize(g.steps.map(s => -s));
    assert.equal(g.positive + reflected.positive, n);
  }
  for (const { x, p } of M.occupationPMF(n)) {
    assert.ok(Math.abs(lead[Math.round(x * n)] / 2 ** n - p) < 1e-12);
    assert.ok(Math.abs(last[Math.round(x * n)] / 2 ** n - p) < 1e-12);
  }
  M.headsPMF(n).forEach(({ x, p }) => assert.ok(Math.abs(heads[Math.round(x * n)] / 2 ** n - p) < 1e-12));
  const all = M.enumerate(n), bridges = M.enumerate(n, true);
  assert.equal(all.length, 2 ** n);
  assert.equal(bridges.length, last[n]);
  assert.ok(bridges.every(g => g.lastZero === n && g.path[n] === 0));
  const bridgeCounts = Array(n / 2 + 1).fill(0);
  bridges.forEach(g => { bridgeCounts[g.positive / 2]++; });
  assert.ok(bridgeCounts.every(count => count === bridges.length / (n / 2 + 1)));
}
for (const n of [50, 200, 1000, 2000]) {
  for (const pmf of [M.occupationPMF(n), M.headsPMF(n)]) {
    assert.ok(Math.abs(pmf.reduce((s, a) => s + a.p, 0) - 1) < 1e-12);
    assert.ok(Math.abs(M.binnedPMF(pmf).reduce((s, p) => s + p, 0) - 1) < 1e-12);
  }
  const pmf = M.occupationPMF(n);
  assert.ok(Math.abs(M.discreteCDF(pmf, 0) - pmf[0].p) < 1e-12);
  assert.ok(Math.abs(M.discreteCDF(pmf, 1) - 1) < 1e-12);
  assert.ok(Math.abs(pmf.reduce((s, point) => s + point.x * point.p, 0) - .5) < 1e-12);
  assert.ok(Math.abs(pmf.reduce((s, point) => s + (point.x - .5) ** 2 * point.p, 0) - (n + 2) / (8 * n)) < 1e-12);
}
assert.deepEqual([0, 2, 4, 6].map(t => M.enumerate(6).filter(g => g.positive === t).length), [20, 12, 12, 20]);
assert.throws(() => M.enumerate(13));
assert.throws(() => M.enumerate(3));
assert.equal(M.summarize([1, 1, 1, -1, -1, -1]).lead, 1);
assert.equal(M.summarize([1, -1, -1, 1, 1, -1]).lead, 2 / 3);
assert.equal(M.binIndex(1), 19);
assert.equal(M.binIndex(.1), 2);
assert.equal(M.cdf(1) - M.cdf(0), 1);
assert.ok(Math.abs(M.cdf(.1) - 0.20483276469913345) < 1e-12);
assert.ok(Math.abs(M.cdf(.6) - M.cdf(.4) - 0.12818843369794986) < 1e-12);
console.log('PASS: exhaustive paths, conditional bridge counts, last returns, finite moments, CDF endpoints, both PMFs, article examples and interval probabilities.');
