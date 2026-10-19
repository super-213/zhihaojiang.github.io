/* Bernoulli percolation on finite square grids with free boundaries. */
(function (root) {
  'use strict';
  function rng(seed) {
    let state = seed >>> 0;
    return () => {
      state = (state + 0x6D2B79F5) >>> 0;
      let t = Math.imul(state ^ (state >>> 15), state | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }
  function edges(n) {
    const out = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      const a = r * n + c;
      if (c + 1 < n) out.push([a, a + 1]);
      if (r + 1 < n) out.push([a, a + n]);
    }
    return out;
  }
  function field(n, seed, model = 'site') {
    const random = rng(seed);
    const count = model === 'site' ? n * n : 2 * n * (n - 1);
    // Strictly interior values keep p=0 and p=1 deterministic.
    return Float64Array.from({ length: count }, () => (random() * 4294967296 + 0.5) / 4294967296);
  }
  function maskAt(values, p) {
    return Uint8Array.from(values, value => value <= p ? 1 : 0);
  }
  function neighbors(index, n) {
    const r = Math.floor(index / n), c = index % n, out = [];
    if (r) out.push(index - n);
    if (c) out.push(index - 1);
    if (c + 1 < n) out.push(index + 1);
    if (r + 1 < n) out.push(index + n);
    return out;
  }
  function analyze(n, mask, model = 'site') {
    if (!Number.isInteger(n) || n < 1) throw new RangeError('Invalid grid side');
    const links = edges(n), total = model === 'site' ? n * n : links.length;
    if (mask.length !== total) throw new RangeError('Incorrect mask length');
    const active = model === 'site' ? mask : new Uint8Array(n * n).fill(1);
    const adjacency = Array.from({ length: n * n }, () => []);
    links.forEach(([a, b], edge) => {
      if ((model === 'site' && active[a] && active[b]) || (model === 'bond' && mask[edge])) {
        adjacency[a].push([b, edge]); adjacency[b].push([a, edge]);
      }
    });
    const ids = new Int32Array(n * n).fill(-1), sizes = [];
    for (let start = 0; start < active.length; start++) {
      if (!active[start] || ids[start] !== -1) continue;
      const id = sizes.length, queue = [start]; ids[start] = id;
      for (let head = 0; head < queue.length; head++) for (const [next] of adjacency[queue[head]]) {
        if (ids[next] === -1) { ids[next] = id; queue.push(next); }
      }
      sizes.push(queue.length);
    }
    const wet = new Uint8Array(n * n), parent = new Int32Array(n * n).fill(-1);
    const parentEdge = new Int32Array(n * n).fill(-1), queue = [];
    for (let i = 0; i < n; i++) if (active[i]) { wet[i] = 1; parent[i] = i; queue.push(i); }
    for (let head = 0; head < queue.length; head++) for (const [next, edge] of adjacency[queue[head]]) {
      if (!wet[next]) { wet[next] = 1; parent[next] = queue[head]; parentEdge[next] = edge; queue.push(next); }
    }
    const end = Array.from({ length: n }, (_, i) => n * (n - 1) + i).find(i => wet[i]);
    const path = [], pathEdges = [];
    if (end !== undefined) {
      let i = end;
      while (parent[i] !== i) { path.push(i); pathEdges.push(parentEdge[i]); i = parent[i]; }
      path.push(i); path.reverse(); pathEdges.reverse();
    }
    return { n, mask, model, links, ids, sizes, wet, path, pathEdges,
      spans: end !== undefined, openCount: mask.reduce((a, b) => a + b, 0), total,
      wetCount: wet.reduce((a, b) => a + b, 0), largest: sizes.length ? Math.max(...sizes) : 0 };
  }
  // Increasing coupling: first p at which this particular uniform field spans.
  function firstThreshold(n, values, model = 'site') {
    if (model === 'bond' && n === 1) return 0;
    const links = edges(n), active = new Uint8Array(n * n);
    const parent = Int32Array.from({ length: n * n }, (_, i) => i);
    const size = new Int32Array(n * n).fill(1), flags = new Uint8Array(n * n);
    const find = x => { while (x !== parent[x]) { parent[x] = parent[parent[x]]; x = parent[x]; } return x; };
    const join = (a, b) => {
      a = find(a); b = find(b); if (a === b) return a;
      if (size[a] < size[b]) [a, b] = [b, a];
      parent[b] = a; size[a] += size[b]; flags[a] |= flags[b]; return a;
    };
    for (let i = 0; i < n * n; i++) {
      flags[i] = (i < n ? 1 : 0) | (i >= n * (n - 1) ? 2 : 0);
      if (model === 'bond') active[i] = 1;
    }
    const order = Array.from(values, (_, i) => i).sort((a, b) => values[a] - values[b]);
    for (const index of order) {
      let root;
      if (model === 'site') {
        active[index] = 1; root = index;
        for (const next of neighbors(index, n)) if (active[next]) root = join(root, next);
      } else root = join(...links[index]);
      if (flags[find(root)] === 3) return values[index];
    }
    return 1;
  }
  function presets(kind) {
    return Uint8Array.from({ length: 64 }, (_, i) => {
      if (kind === 'neck') return Math.floor(i / 8) !== 3 || i % 8 === 3 ? 1 : 0;
      return (kind === 'columns' ? i % 8 < 3 : Math.floor(i / 8) < 3) ? 1 : 0;
    });
  }
  function fraction(thresholds, p) {
    return thresholds.length ? thresholds.filter(t => t <= p).length / thresholds.length : 0;
  }
  const api = { rng, edges, field, maskAt, neighbors, analyze, firstThreshold, presets, fraction };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  root.Percolation = api;
})(typeof window === 'undefined' ? globalThis : window);
