'use strict';
const assert = require('node:assert/strict');
const M = require('./20261019渗流理论/pc-model.js');
// Independent flood-fill oracle, not the model's adjacency or union-find code.
function oracle(n, bits, model = 'site') {
  const seen = new Set(), queue = [];
  const edges = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) {
    if (x < n - 1) edges.push([y * n + x, y * n + x + 1]);
    if (y < n - 1) edges.push([y * n + x, (y + 1) * n + x]);
  }
  for (let x = 0; x < n; x++) if (model === 'bond' || bits[x]) { queue.push(x); seen.add(x); }
  for (let head = 0; head < queue.length; head++) {
    const here = queue[head];
    for (let j = 0; j < edges.length; j++) {
      const [a, b] = edges[j];
      if (a !== here && b !== here) continue;
      const next = a === here ? b : a;
      const connected = model === 'bond' ? bits[j] : bits[here] && bits[next];
      if (connected && !seen.has(next)) { seen.add(next); queue.push(next); }
    }
  }
  return { seen, spans: [...seen].some(i => i >= n * (n - 1)) };
}
function check(n, bits, model) {
  const result = M.analyze(n, bits, model), expected = oracle(n, bits, model);
  assert.equal(result.spans, expected.spans);
  assert.deepEqual([...result.wet].map((v, i) => v ? i : -1).filter(i => i >= 0), [...expected.seen].sort((a, b) => a - b));
  assert.equal(result.sizes.reduce((a, b) => a + b, 0), model === 'bond' ? n * n : result.openCount);
  if (result.spans) {
    assert(result.path[0] < n); assert(result.path.at(-1) >= n * (n - 1));
    assert.equal(result.path.length, result.pathEdges.length + 1);
    for (let i = 1; i < result.path.length; i++) {
      const a = result.path[i - 1], b = result.path[i];
      assert.equal(Math.abs(a % n - b % n) + Math.abs(Math.floor(a / n) - Math.floor(b / n)), 1);
      if (model === 'bond') assert(bits[result.pathEdges[i - 1]]);
      else assert(bits[a] && bits[b]);
    }
  }
  return result;
}
for (const model of ['site', 'bond']) for (const n of [1, 2, 3]) {
  const total = model === 'site' ? n * n : 2 * n * (n - 1);
  for (let code = 0; code < 2 ** total; code++) {
    const bits = Uint8Array.from({ length: total }, (_, i) => (code >> i) & 1);
    check(n, bits, model);
  }
  for (let seed = 1; seed <= 12; seed++) {
    const values = M.field(n, seed * 7919, model), threshold = M.firstThreshold(n, values, model);
    if (threshold > 0) assert.equal(M.analyze(n, M.maskAt(values, threshold - 1e-10), model).spans, false);
    assert.equal(M.analyze(n, M.maskAt(values, threshold), model).spans, true);
  }
}
const counts = [0, 0, 0, 0, 0];
for (let code = 0; code < 16; code++) {
  const mask = Uint8Array.from({ length: 4 }, (_, i) => (code >> i) & 1);
  const result = M.analyze(2, mask); if (result.spans) counts[result.openCount]++;
}
assert.deepEqual(counts, [0, 0, 2, 4, 1]);
for (const p of [0, .1, .5, .592746, .9, 1]) {
  const exact = counts.reduce((sum, count, k) => sum + count * p ** k * (1 - p) ** (4 - k), 0);
  assert(Math.abs(exact - (2 * p ** 2 - p ** 4)) < 1e-12);
}
assert.equal(M.analyze(2, Uint8Array.from([1, 0, 0, 1])).spans, false);
const columns = M.analyze(8, M.presets('columns')), rows = M.analyze(8, M.presets('rows'));
assert.equal(columns.openCount, 24); assert.equal(rows.openCount, 24);
assert(columns.spans); assert(!rows.spans);
const neck = M.presets('neck'); assert.equal(M.analyze(8, neck).openCount, 57);
assert(M.analyze(8, neck).spans); neck[3 * 8 + 3] = 0;
assert.equal(M.analyze(8, neck).openCount, 56); assert(!M.analyze(8, neck).spans);
for (const model of ['site', 'bond']) for (const seed of [10, 91, 7331]) {
  const n = 8, values = M.field(n, seed, model); let previous = false;
  assert.deepEqual(values, M.field(n, seed, model));
  for (let j = 0; j <= 100; j++) {
    const state = check(n, M.maskAt(values, j / 100), model);
    if (previous) assert(state.spans); previous = state.spans;
    if (!j) assert.equal(state.spans, false); if (j === 100) assert(state.spans);
  }
}
assert(Math.abs(.99 ** 100 - .3660323412732292) < 1e-12);
assert.equal(M.fraction([.2, .4, .6, .8], .5), .5);
console.log('PASS: exhaustive site/bond grids through 3×3; independent flood-fill; cluster sizes; valid paths; no diagonals/backwash; first-threshold union-find; monotonicity; endpoints; reproducibility; article presets and exact formulas.');
