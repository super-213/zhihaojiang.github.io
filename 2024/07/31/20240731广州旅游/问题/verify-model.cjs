'use strict';
const assert = require('node:assert/strict');
const M = require('./20261021优惠券收集问题/model.js');
const close = (actual, expected, tolerance = 1e-11) => assert(Math.abs(actual - expected) < tolerance, `${actual} != ${expected}`);
// Independent enumeration of every equally likely draw sequence, including m=0.
for (let n = 1; n <= 4; n++) {
  const cdf = M.distribution(n, 8);
  for (let m = 0; m <= 8; m++) {
    let complete = 0, missing = 0;
    for (let code = 0; code < n ** m; code++) {
      const seen = new Set();
      let value = code;
      for (let j = 0; j < m; j++) { seen.add(value % n); value = Math.floor(value / n); }
      if (seen.size === n) complete++;
      missing += n - seen.size;
    }
    close(cdf[m], complete / n ** m);
    close(M.missing(n, m), missing / n ** m);
  }
}
// Inclusion-exclusion is independent of the recurrence used by the UI.
function inclusion(n, m) {
  if (!m) return 0;
  let total = 0, choose = 1;
  for (let j = 0; j <= n; j++) {
    total += (-1) ** j * choose * (1 - j / n) ** m;
    choose *= (n - j) / (j + 1);
  }
  return total;
}
for (const n of [1, 2, 3, 6, 10, 20, 50, 60, 100]) {
  const max = Math.ceil(n * (Math.log(n) + 30)), cdf = M.distribution(n, max);
  let tailMean = 0;
  for (let m = 0; m <= max; m++) {
    assert(cdf[m] >= -1e-12 && cdf[m] <= 1 + 1e-12);
    if (m) assert(cdf[m] + 1e-14 >= cdf[m - 1]);
    if (m < n) close(cdf[m], 0);
    if (n <= 10 && m <= 80) close(cdf[m], inclusion(n, m));
    if (m > 0) assert(1 - cdf[m] <= M.missing(n, m) + 1e-11);
    tailMean += 1 - cdf[m];
  }
  close(tailMean, M.mean(n), 1e-8);
  for (const p of [.5, .9, .95, .99]) {
    const q = M.quantile(cdf, p);
    assert(q >= n); assert(cdf[q] >= p); assert(cdf[q - 1] < p);
  }
  assert(M.harmonic(n) >= Math.log(n + 1));
  assert(M.harmonic(n) <= 1 + Math.log(n) + 1e-13);
}
const c6 = M.distribution(6, 40);
close(M.mean(6), 14.7); close(c6[6], 720 / 46656);
close(c6[15], .6442127385951004);
assert.deepEqual([.9, .95, .99].map(p => M.quantile(c6, p)), [23, 27, 36]);
const rng1 = M.rng(20261021), rng2 = M.rng(20261021);
for (let i = 0; i < 10000; i++) { const x = rng1(); close(x, rng2()); assert(x >= 0 && x < 1); }
const random = M.rng(20261027);
let sum = 0, completedBy15 = 0;
const games = 50000;
for (let i = 0; i < games; i++) {
  const t = M.sample(6, random); assert(t >= 6 && Number.isInteger(t));
  sum += t; if (t <= 15) completedBy15++;
}
close(sum / games, M.mean(6), .2);
close(completedBy15 / games, c6[15], .01);
console.log(`PASS: exhaustive sequences n=1..4, m=0..8; inclusion-exclusion; CDF boundaries and monotonicity; missing-count and tail bounds; mean from CDF tail sums; minimal quantiles; reproducible RNG; 50,000 complete simulations (mean ${(sum / games).toFixed(4)}).`);
