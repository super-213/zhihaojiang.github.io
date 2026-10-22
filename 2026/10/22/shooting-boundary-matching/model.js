(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.Shooting = factory();
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  function parabola(s, beta) {
    return { points: Array.from({ length: 81 }, (_, i) => { const x = i / 80; return [x, s * x - x * x]; }), end: s - 1, residual: s - 1 - beta };
  }
  // Classical RK4, two states (y,v), on [0,1]. No drawing or rounded values.
  function integrate(f, alpha, s, n) {
    if (!Number.isInteger(n) || n < 1 || n > 4096 || ![alpha, s].every(Number.isFinite)) throw new RangeError('Invalid initial state or step count');
    const h = 1 / n, points = [[0, alpha]];
    let y = alpha, v = s;
    for (let i = 0; i < n; i++) {
      const x = i * h;
      const a = [v, f(x, y, v)];
      const b = [v + h * a[1] / 2, f(x + h / 2, y + h * a[0] / 2, v + h * a[1] / 2)];
      const c = [v + h * b[1] / 2, f(x + h / 2, y + h * b[0] / 2, v + h * b[1] / 2)];
      const d = [v + h * c[1], f(x + h, y + h * c[0], v + h * c[1])];
      y += h * (a[0] + 2 * b[0] + 2 * c[0] + d[0]) / 6;
      v += h * (a[1] + 2 * b[1] + 2 * c[1] + d[1]) / 6;
      if (![y, v].every(Number.isFinite)) return { status: 'nonfinite', points, end: null, v: null };
      points.push([(i + 1) / n, y]);
    }
    return { status: 'ok', points, end: y, v };
  }
  const hyperbolic = (s, n) => integrate((x, y) => y, 0, s, n);
  function bisect(fn, left, right, tolerance = 1e-10, limit = 40) {
    if (![left, right, tolerance].every(Number.isFinite) || left >= right || tolerance <= 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) throw new RangeError('Invalid bracket or stopping rule');
    let lo = left, hi = right, flo = fn(lo), fhi = fn(hi);
    const states = [];
    if (![flo, fhi].every(Number.isFinite)) return { status: 'nonfinite', states };
    if (Math.abs(flo) <= tolerance) return { status: 'residual', states: [{ lo, hi, s: lo, r: flo, nextLo: lo, nextHi: lo, decision: '左端已满足残差容差' }] };
    if (Math.abs(fhi) <= tolerance) return { status: 'residual', states: [{ lo, hi, s: hi, r: fhi, nextLo: hi, nextHi: hi, decision: '右端已满足残差容差' }] };
    if (Math.sign(flo) === Math.sign(fhi)) return { status: 'unbracketed', states, flo, fhi };
    for (let k = 0; k < limit; k++) {
      const s = lo + (hi - lo) / 2, r = fn(s);
      if (!Number.isFinite(r)) return { status: 'nonfinite', states };
      let nextLo = lo, nextHi = hi, decision;
      if (Math.abs(r) <= tolerance) decision = '达到数值端点残差容差，停止';
      else if (Math.sign(r) === Math.sign(flo)) { nextLo = s; decision = '与左端同号，排除左半段'; }
      else { nextHi = s; decision = '与右端同号，排除右半段'; }
      states.push({ lo, hi, s, r, nextLo, nextHi, decision });
      if (Math.abs(r) <= tolerance) return { status: 'residual', states };
      if (s === lo || s === hi) return { status: 'stagnated', states };
      lo = nextLo; hi = nextHi;
      if (lo === s) flo = r; else fhi = r;
    }
    return { status: 'limit', states };
  }
  function solveHyperbolic(n, left, right) {
    const result = bisect(s => hyperbolic(s, n).end - 1, left, right);
    result.n = n;
    return result;
  }
  function metrics(s, n) {
    const shot = hyperbolic(s, n);
    return { shot, numericalResidual: shot.end - 1, exactResidual: s * Math.sinh(1) - 1,
      gridError: Math.max(...shot.points.map(([x, y]) => Math.abs(y - Math.sinh(x) / Math.sinh(1)))),
      slopeError: Math.abs(s - 1 / Math.sinh(1)) };
  }
  // 'pi' denotes an exact symbolic model; never infer singularity from a tiny float.
  function oscillator(preset, s, beta) {
    const k = preset === 'pi' ? Math.PI : Number(preset);
    if (!(k > 0) || ![s, beta].every(Number.isFinite)) throw new RangeError('Invalid oscillator inputs');
    const coefficient = preset === 'pi' ? 0 : Math.sin(k) / k;
    const end = s * coefficient;
    return { k, coefficient, end, residual: end - beta,
      kind: preset === 'pi' ? beta === 0 ? 'family' : 'none' : 'unique',
      matchedSlope: preset === 'pi' ? null : beta / coefficient,
      points: Array.from({ length: 121 }, (_, i) => { const x = i / 120; return [x, i === 120 ? end : s * Math.sin(k * x) / k]; }) };
  }
  // Stable closed form for the BVP y''=lambda^2*y, y(0)=1, y(1)=0.
  function unstable(lambda, delta) {
    const slope = -lambda / Math.tanh(lambda);
    const reference = x => Math.exp(-lambda * x) * (-Math.expm1(-2 * lambda * (1 - x))) / (-Math.expm1(-2 * lambda));
    const gain = Math.sinh(lambda) / lambda;
    return { slope, gain, endError: delta * gain,
      points: Array.from({ length: 121 }, (_, i) => { const x = i / 120; return [x, reference(x) + delta * Math.sinh(lambda * x) / lambda]; }),
      reference: Array.from({ length: 121 }, (_, i) => [i / 120, reference(i / 120)]) };
  }
  return { parabola, integrate, hyperbolic, bisect, solveHyperbolic, metrics, oscillator, unstable };
});
