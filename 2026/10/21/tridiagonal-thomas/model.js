/* Shared by the article experiments and the independent verification script. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.Tridiagonal = api;
})(typeof globalThis === 'object' ? globalThis : this, function () {
  'use strict';
  function validate(a, b, c, d) {
    const n = b.length;
    if (!n || [a, c, d].some(v => v.length !== n)) throw new Error('四个数组必须等长且非空。');
    if (![a, b, c, d].every(v => Array.from(v).every(Number.isFinite))) throw new Error('系数必须是有限数。');
    if (a[0] !== 0 || c[n - 1] !== 0) throw new Error('边界约定要求 a[0]=0、c[n-1]=0。');
  }
  // a[i] x[i-1] + b[i] x[i] + c[i] x[i+1] = d[i], zero-based arrays.
  function solve(a, b, c, d, trace = false) {
    validate(a, b, c, d);
    const n = b.length, u = Array.from(b), r = Array.from(d), lower = Array.from(a), x = Array(n).fill(null), states = [];
    const save = (phase, row, note) => { if (trace) states.push({ phase, row, note, u: [...u], r: [...r], lower: [...lower], x: [...x] }); };
    const check = i => { if (!Number.isFinite(u[i]) || u[i] === 0) throw new Error(`第 ${i + 1} 个主元为零或非有限数，停止追赶法。`); };
    save('初始', -1, '尚未消元。每行只涉及自己和相邻未知数。');
    check(0);
    for (let i = 1; i < n; i++) {
      const m = a[i] / u[i - 1];
      u[i] -= m * c[i - 1]; r[i] -= m * r[i - 1]; lower[i] = 0;
      check(i);
      if (!Number.isFinite(r[i])) throw new Error('右端计算上溢。');
      save('向前消元', i, { m, previous: i - 1 });
    }
    for (let i = n - 1; i >= 0; i--) {
      x[i] = (r[i] - (i === n - 1 ? 0 : c[i] * x[i + 1])) / u[i];
      if (!Number.isFinite(x[i])) throw new Error('回代出现非有限数。');
      save('向后回代', i, { value: x[i] });
    }
    return { x, u, r, states };
  }
  function heat(n, left = 0, right = 100) {
    if (!Number.isInteger(n) || n < 1) throw new Error('内部节点数必须是正整数。');
    const a = Array(n).fill(-1), b = Array(n).fill(2), c = Array(n).fill(-1), d = Array(n).fill(0);
    a[0] = 0; c[n - 1] = 0; d[0] += left; d[n - 1] += right;
    return { a, b, c, d, exact: Array.from({ length: n }, (_, i) => left + (right - left) * (i + 1) / (n + 1)) };
  }
  function heatBalance(values, left = 0, right = 100) {
    if (!values.length || ![...values, left, right].every(Number.isFinite)) throw new Error('试算温度与边界必须是有限数。');
    const difference = values.map((v, i) => v - ((i ? values[i - 1] : left) + (i + 1 < values.length ? values[i + 1] : right)) / 2);
    const maxDifference = Math.max(...difference.map(Math.abs));
    return { difference, maxDifference };
  }
  function residual(a, b, c, d, x) {
    return Math.max(...b.map((v, i) => Math.abs(v * x[i] + (i ? a[i] * x[i - 1] : 0) + (i + 1 < b.length ? c[i] * x[i + 1] : 0) - d[i])));
  }
  function pivotExample(epsilon) {
    const a = [0, 1], b = [epsilon, 1], c = [1, 0], d = [1, 2];
    const exact = [1 / (1 - epsilon), (1 - 2 * epsilon) / (1 - epsilon)];
    let plain, error;
    try { plain = solve(a, b, c, d).x; } catch (e) { error = e.message; }
    // Exchange the two equations: first pivot 1, second pivot 1-epsilon.
    const y = (1 - 2 * epsilon) / (1 - epsilon), pivoted = [2 - y, y];
    const metrics = x => ({ error: Math.max(...x.map((v, i) => Math.abs(v - exact[i]))), residual: residual(a, b, c, d, x) });
    return { exact, plain, error, pivoted, plainMetrics: plain && metrics(plain), pivotedMetrics: metrics(pivoted), multiplier: epsilon ? 1 / epsilon : null };
  }
  function counts(n) { return { operations: 8 * n - 7, band: 3 * n - 2, dense: n * n }; }
  return { solve, heat, heatBalance, residual, pivotExample, counts };
});
