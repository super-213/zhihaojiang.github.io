(function (scope) {
  'use strict';
  function positive(x, name) { if (!Number.isFinite(x) || x <= 0) throw new RangeError(name); }
  function affine(n, bytes = 8, fused = true) {
    if (!Number.isSafeInteger(n) || n < 0 || n > 1e9) throw new RangeError('n');
    if (![4, 8].includes(bytes)) throw new RangeError('bytes');
    const stages = fused ? [
      { text: '读取 x → 处理器侧', direction: 'read', array: 'x' },
      { text: '写出 y → 主存', direction: 'write', array: 'y' }
    ] : [
      { text: '第一遍：读取 x → 处理器侧', direction: 'read', array: 'x' },
      { text: '第一遍：写出临时 z → 主存', direction: 'write', array: 'z' },
      { text: '第二遍：重新读取 z → 处理器侧', direction: 'read', array: 'z' },
      { text: '第二遍：写出 y → 主存', direction: 'write', array: 'y' }
    ];
    stages.forEach(s => { s.bytes = n * bytes; });
    const work = 3 * n, traffic = stages.reduce((q, s) => q + s.bytes, 0);
    return { n, bytes, fused, work, traffic, iterations: (fused ? 1 : 2) * n,
      auxiliary: fused ? 0 : n * bytes, intensity: traffic ? work / traffic : null, stages };
  }
  // P in GFLOP/s and B in GB/s; 10^9 cancels when forming the intensity threshold.
  function roofline(intensity, peak, bandwidth, work = 3e6) {
    positive(intensity, 'intensity'); positive(peak, 'peak'); positive(bandwidth, 'bandwidth'); positive(work, 'work');
    const memoryRoof = intensity * bandwidth, ceiling = Math.min(peak, memoryRoof);
    return { intensity, peak, bandwidth, ceiling, ridge: peak / bandwidth,
      regime: memoryRoof === peak ? 'ridge' : memoryRoof < peak ? 'bandwidth' : 'compute',
      computeMs: work / (peak * 1e6), memoryMs: work / (intensity * bandwidth * 1e6),
      lowerMs: work / (ceiling * 1e6) };
  }
  const api = { affine, roofline };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else scope.RooflineLab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
