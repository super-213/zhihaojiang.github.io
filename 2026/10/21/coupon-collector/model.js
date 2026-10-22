/* Shared by the embedded experiments and the independent model checks. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Coupons = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function harmonic(n) {
    let sum = 0;
    for (let r = 1; r <= n; r++) sum += 1 / r;
    return sum;
  }
  const mean = n => n * harmonic(n);
  const missing = (n, m) => n * (1 - 1 / n) ** m;
  function rng(seed) {
    let state = seed >>> 0;
    return () => {
      state += 0x6D2B79F5;
      let t = state;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  // q[k] = probability of exactly k distinct types, including absorbing k=n.
  // Positive additions avoid the cancellation in inclusion-exclusion at large n.
  function distribution(n, maxDraws) {
    let q = new Float64Array(n + 1);
    q[0] = 1;
    const cdf = new Float64Array(maxDraws + 1);
    for (let m = 1; m <= maxDraws; m++) {
      const next = new Float64Array(n + 1);
      for (let k = 0; k <= n; k++) {
        next[k] = q[k] * k / n;
        if (k) next[k] += q[k - 1] * (n - k + 1) / n;
      }
      q = next;
      cdf[m] = q[n];
    }
    return cdf;
  }
  function quantile(cdf, probability) {
    return cdf.findIndex(value => value >= probability);
  }
  // One complete game, with replacement; no truncation or forced rare coupon.
  function sample(n, random) {
    const seen = new Uint8Array(n);
    let count = 0, draws = 0;
    while (count < n) {
      const type = Math.floor(random() * n);
      draws++;
      if (!seen[type]) { seen[type] = 1; count++; }
    }
    return draws;
  }
  return { harmonic, mean, missing, rng, distribution, quantile, sample };
});
