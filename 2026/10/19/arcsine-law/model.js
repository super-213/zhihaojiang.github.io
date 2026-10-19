/* Shared by the browser experiments and the exhaustive model checks. */
(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Arcsine = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function summarize(steps) {
    let score = 0, heads = 0, positive = 0, lastZero = 0;
    const path = [0], headCounts = [0], positiveCounts = [0], zeros = [0];
    steps.forEach((step, i) => {
      const before = score;
      score += step;
      if (step === 1) heads++;
      // Unit steps cannot cross zero in their interior. A segment touching
      // zero belongs to the side of its nonzero endpoint (not to a tie bin).
      if (before + score > 0) positive++;
      if (score === 0) lastZero = i + 1;
      path.push(score); headCounts.push(heads);
      positiveCounts.push(positive); zeros.push(lastZero);
    });
    const n = steps.length;
    return { steps, path, headCounts, positiveCounts, zeros,
      heads, positive, lastZero, n, lead: n ? positive / n : 0,
      head: n ? heads / n : 0 };
  }
  function sample(n, rng = Math.random) {
    return summarize(Array.from({ length: n }, () => rng() < 0.5 ? 1 : -1));
  }
  function occupationPMF(steps) {
    if (steps < 2 || steps % 2) throw new Error('Use a positive even number of steps.');
    const n = steps / 2, q = [1];
    for (let k = 1; k <= n; k++) q[k] = q[k - 1] * (2 * k - 1) / (2 * k);
    return q.map((v, k) => ({ x: k / n, p: v * q[n - k] }));
  }
  function headsPMF(n) {
    // Start at the mode: starting at 2^-n underflows for larger n.
    const m = Math.floor(n / 2), p = Array(n + 1).fill(0);
    p[m] = 1;
    for (let k = m; k > 0; k--) p[k - 1] = p[k] * k / (n - k + 1);
    for (let k = m; k < n; k++) p[k + 1] = p[k] * (n - k) / (k + 1);
    const total = p.reduce((a, b) => a + b, 0);
    return p.map((v, k) => ({ x: k / n, p: v / total }));
  }
  function binIndex(x, count = 20) { return Math.min(count - 1, Math.floor(x * count + 1e-10)); }
  function binnedPMF(pmf, count = 20) {
    const bins = Array(count).fill(0);
    pmf.forEach(({ x, p }) => { bins[binIndex(x, count)] += p; });
    return bins;
  }
  function cdf(x) { return 2 / Math.PI * Math.asin(Math.sqrt(Math.max(0, Math.min(1, x)))); }
  function discreteCDF(pmf, u) {
    return pmf.reduce((sum, point) => sum + (point.x <= u + 1e-12 ? point.p : 0), 0);
  }
  function enumerate(n, bridge = false) {
    if (n < 2 || n > 12 || n % 2) throw new Error('Enumerate even lengths from 2 through 12.');
    const games = [];
    for (let bits = 0; bits < 2 ** n; bits++) {
      const steps = Array.from({ length: n }, (_, i) => bits & (1 << i) ? 1 : -1);
      if (bridge && steps.reduce((a, b) => a + b, 0) !== 0) continue;
      games.push(summarize(steps));
    }
    return games;
  }
  return { summarize, sample, occupationPMF, headsPMF, binIndex, binnedPMF, cdf, discreteCDF, enumerate };
});
