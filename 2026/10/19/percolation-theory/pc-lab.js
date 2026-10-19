(() => {
  'use strict';
  const M = window.Percolation, root = document.getElementById('lab');
  const $ = id => document.getElementById(id), pct = (n, d = 1) => `${(100 * n).toFixed(d)}%`;
  function syncTheme() {
    let dark = matchMedia('(prefers-color-scheme: dark)').matches;
    try { if (parent !== window) dark = parent.document.documentElement.classList.contains('dark') || parent.document.body?.classList.contains('dark-mode'); } catch (_) {}
    document.documentElement.classList.toggle('dark', !!dark);
  }
  syncTheme();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
  try {
    if (parent !== window) {
      const observer = new MutationObserver(syncTheme);
      observer.observe(parent.document.documentElement, { attributes: true, attributeFilter: ['class'] });
      if (parent.document.body) observer.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] });
    }
  } catch (_) {}
  new ResizeObserver(() => {
    try { if (window.frameElement) window.frameElement.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 3}px`; } catch (_) {}
  }).observe(root);
  const header = (n, title, intro) => `<p class="eyebrow">EXPERIMENT ${n} / PERCOLATION</p><h1>${title}</h1><p class="intro">${intro}</p>`;
  const slider = (id, name, min, max, step, value) => `<div class="slider"><label for="${id}">${name}</label><input id="${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}"><output for="${id}" id="${id}-value"></output></div>`;
  const legend = () => '<div class="legend"><span><i class="swatch"></i>× 关闭</span><span><i class="swatch open"></i>○ 开放但未接通顶端</span><span><i class="swatch wet"></i>● 接通顶端</span><span><i class="swatch route"></i>一条贯通路径</span></div>';
  const stats = () => '<div class="stats"><div><p class="label">从顶端到底端</p><p id="spanning" class="value"></p></div><div><p class="label">实际开放格数 / 总格数</p><p id="occupation" class="value"></p></div></div>';
  let nextSeed = 20261019;
  const freshSeed = () => ++nextSeed;
  function boardSvg(result, clusterView = false) {
    const { n, model, mask, wet, links, ids, sizes, path, pathEdges } = result;
    const size = 360, pad = 10, step = (size - 2 * pad) / n;
    const route = new Set(path), routeEdges = new Set(pathEdges), largestId = sizes.indexOf(result.largest);
    const xy = i => [pad + (i % n + .5) * step, pad + (Math.floor(i / n) + .5) * step];
    const fill = i => !clusterView ? (wet[i] ? 'var(--wet)' : 'var(--open)') : `hsl(${(ids[i] * 137.508 + 190) % 360} 48% 49%)`;
    let parts = '';
    if (model === 'bond') {
      links.forEach(([a, b], edge) => {
        const [x1, y1] = xy(a), [x2, y2] = xy(b);
        parts += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${mask[edge] ? wet[a] ? 'var(--wet)' : 'var(--open)' : 'var(--closed)'}" stroke-width="${mask[edge] ? 2.6 : .7}" ${mask[edge] ? '' : 'stroke-dasharray="2 3"'}/>`;
        if (routeEdges.has(edge)) parts += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="var(--route)" stroke-width="1.6"/>`;
      });
      for (let i = 0; i < n * n; i++) { const [x, y] = xy(i); parts += `<circle cx="${x}" cy="${y}" r="${Math.max(1.7, step * .16)}" fill="${fill(i)}"/>`; }
    } else {
      for (let i = 0; i < n * n; i++) {
        const [x, y] = xy(i), gap = n > 24 ? .65 : 1.2;
        parts += `<rect x="${x - step / 2 + gap}" y="${y - step / 2 + gap}" width="${step - 2 * gap}" height="${step - 2 * gap}" rx=".8" fill="${mask[i] ? fill(i) : 'var(--closed)'}"${clusterView && ids[i] === largestId && mask[i] ? ' stroke="var(--ink)" stroke-width=".7"' : ''}><title>第 ${Math.floor(i / n) + 1} 行、第 ${i % n + 1} 列：${mask[i] ? `开放；所属簇 ${sizes[ids[i]]} 格；${wet[i] ? '可接通顶端' : '未接通顶端'}` : '关闭'}</title></rect>`;
      }
      if (path.length) parts += `<polyline points="${path.map(i => xy(i).join(',')).join(' ')}" fill="none" stroke="var(--route)" stroke-width="${Math.max(1.4, step * .18)}" stroke-linecap="round" stroke-linejoin="round"/>`;
    }
    return `<svg class="figure" viewBox="0 0 ${size} ${size}" role="img" aria-label="${n} 乘 ${n} ${model === 'site' ? '格点' : '节点'}图，${result.spans ? '已贯通' : '未贯通'}。${result.openCount} 个${model === 'site' ? '格点' : '连接'}开放；最大连通簇有 ${result.largest} 个${model === 'site' ? '开放格点' : '节点'}。">${parts}</svg>`;
  }
  function manual() {
    let mask = M.presets('columns'), focus = 0;
    root.innerHTML = header('01', '同样开放 24 格，两种连通结果', '点击格子改变开闭状态。只允许上下左右相连；水从所有开放的顶行格子进入。') + '<div class="toolbar"><button id="columns" class="primary">三列开放</button><button id="rows">三行开放</button><button id="neck">一个瓶颈</button><button id="clear">全部关闭</button></div><p class="board-label">顶端入口 ↓</p><div id="board" class="board" role="group" aria-label="可编辑的 8 乘 8 格点"></div><p class="board-label">↓ 底端出口</p>' + legend() + stats() + '<p class="status" id="manual-status" role="status" aria-live="polite"></p><p class="note">键盘：Tab 进入格点，方向键移动，空格或 Enter 切换。路线表示连通关系，不模拟水流速度。</p>';
    $('board').innerHTML = Array.from({ length: 64 }, (_, i) => `<button class="cell" data-cell="${i}" tabindex="${i ? -1 : 0}"></button>`).join('');
    const cells = [...$('board').children];
    function render() {
      const result = M.analyze(8, mask), route = new Set(result.path);
      cells.forEach((cell, i) => {
        cell.className = `cell${mask[i] ? ' open' : ''}${result.wet[i] ? ' wet' : ''}${route.has(i) ? ' route' : ''}`;
        cell.textContent = mask[i] ? result.wet[i] ? '●' : '○' : '×';
        cell.setAttribute('aria-label', `第 ${Math.floor(i / 8) + 1} 行第 ${i % 8 + 1} 列，${mask[i] ? '开放' : '关闭'}${result.wet[i] ? '，接通顶端' : ''}`);
        cell.setAttribute('aria-pressed', String(!!mask[i]));
      });
      $('spanning').textContent = result.spans ? '已贯通' : '未贯通'; $('spanning').classList.toggle('yes', result.spans);
      $('occupation').textContent = `${result.openCount} / 64`;
      $('manual-status').textContent = `实际开放 ${pct(result.openCount / 64)}；接通顶端 ${result.wetCount} 格；开放格点分成 ${result.sizes.length} 个连通簇。`;
    }
    $('board').addEventListener('click', event => { const cell = event.target.closest('[data-cell]'); if (!cell) return; const i = +cell.dataset.cell; mask[i] ^= 1; cells[focus].tabIndex = -1; focus = i; cell.tabIndex = 0; render(); });
    $('board').addEventListener('keydown', event => {
      const moves = { ArrowUp: -8, ArrowDown: 8, ArrowLeft: -1, ArrowRight: 1 };
      if (!(event.key in moves)) return;
      event.preventDefault(); const next = focus + moves[event.key];
      if (next < 0 || next >= 64 || (Math.abs(moves[event.key]) === 1 && Math.floor(next / 8) !== Math.floor(focus / 8))) return;
      cells[focus].tabIndex = -1; focus = next; cells[focus].tabIndex = 0; cells[focus].focus();
    });
    $('columns').onclick = () => { mask = M.presets('columns'); render(); };
    $('rows').onclick = () => { mask = M.presets('rows'); render(); };
    $('neck').onclick = () => { mask = M.presets('neck'); render(); };
    $('clear').onclick = () => { mask.fill(0); render(); }; render();
  }
  function coupling() {
    const n = 32; let seed = 108, values = M.field(n, seed), clusterView = false;
    root.innerHTML = header('02', '逐格开放，寻找这张图的第一条通路', '拖动 p 时保持同一组随机数：提高 p 只会新增开放格点。重新抽样才会换一张图。') + slider('p', '开放概率 p', 0, 1, .001, .55) + '<div class="toolbar"><button id="first">定位本图首次贯通</button><button id="resample">重新抽样</button><button id="clusters" aria-pressed="false">按连通簇着色</button></div><div id="grid"></div>' + legend() + stats() + '<p class="status" id="coupling-status" role="status" aria-live="polite"></p><p class="note" id="cluster-note"></p>';
    function render() {
      const p = +$('p').value, result = M.analyze(n, M.maskAt(values, p));
      $('p-value').textContent = p.toFixed(3); $('grid').innerHTML = boardSvg(result, clusterView);
      $('spanning').textContent = result.spans ? '已贯通' : '未贯通'; $('spanning').classList.toggle('yes', result.spans);
      $('occupation').textContent = `${result.openCount} / ${n * n}`;
      $('coupling-status').textContent = `种子 ${seed}；实际开放 ${pct(result.openCount / n ** 2)}；最大簇 ${result.largest} 格，共 ${result.sizes.length} 个簇。`;
      $('cluster-note').textContent = clusterView ? '不同颜色表示不同的开放连通簇，最大簇用细线描边。显示的路线仍是一条顶底贯通路径；这些颜色不是不同的开放概率。' : 'p 是每格开放的概率，实际开放比例会有波动。本图首次贯通位置随样本改变，不是无限格点的临界值；定位按钮按滑块 0.001 的精度向上取整。';
    }
    $('p').oninput = render;
    $('first').onclick = () => { $('p').value = Math.ceil(M.firstThreshold(n, values) * 1000) / 1000; render(); };
    $('resample').onclick = () => { seed = freshSeed(); values = M.field(n, seed); render(); };
    $('clusters').onclick = () => { clusterView = !clusterView; $('clusters').setAttribute('aria-pressed', String(clusterView)); render(); }; render();
  }
  function axes(lines, reference = false) {
    const x = p => 48 + 556 * p, y = q => 256 - 220 * q;
    let svg = '<svg class="chart" viewBox="0 0 640 310" role="img" aria-label="横轴开放概率 p，纵轴顶底贯通概率，范围均为 0 到 1">';
    for (let j = 0; j <= 5; j++) {
      const t = j / 5;
      svg += `<line class="axis" x1="48" y1="${y(t)}" x2="604" y2="${y(t)}"/><text x="38" y="${y(t) + 4}" text-anchor="end">${t.toFixed(1)}</text><text x="${x(t)}" y="278" text-anchor="middle">${t.toFixed(1)}</text>`;
    }
    svg += '<text x="48" y="18">贯通概率</text><text x="604" y="302" text-anchor="end">开放概率 p</text>';
    if (reference) svg += `<line class="ref" x1="${x(.592746)}" y1="30" x2="${x(.592746)}" y2="256"/><text x="${x(.592746) + 5}" y="26">p꜀ ≈ 0.592746</text>`;
    for (const line of lines) svg += `<polyline points="${line.points.map(([p, q]) => `${x(p)},${y(q)}`).join(' ')}" fill="none" stroke="${line.color}" stroke-width="2.2"${line.dash ? ` stroke-dasharray="${line.dash}"` : ''}/>`;
    return { svg, x, y };
  }
  function monteCarlo() {
    const sides = [8, 16, 32], colors = ['var(--blue)', 'var(--orange)', 'var(--violet)'], dashes = ['', '7 3', '2 3'];
    const samples = sides.map(() => []); let baseSeed = 7331, running = false, generation = 0;
    root.innerHTML = header('03', '同一个 p，重复很多张图', '每种尺寸各自独立抽样。曲线给出顶底贯通的经验频率；滑块只读取同一批样本，不重新抽样。') + slider('read-p', '读取概率 p', 0, 1, .01, .59) + '<div class="toolbar"><button id="add" class="primary">每种尺寸再模拟 100 张</button><button id="stop" disabled>暂停计算</button><button id="reset">换一批样本</button></div><div class="legend"><span><i class="line-key"></i>L = 8</span><span><i class="line-key key16"></i>L = 16</span><span><i class="line-key key32"></i>L = 32</span></div><div id="plot"></div><div class="table-wrap"><table><thead><tr><th>边长 L</th><th>贯通 / 样本</th><th>贯通频率</th><th>抽样标准差上界</th></tr></thead><tbody id="sample-table"></tbody></table></div><p class="status" id="mc-status" role="status" aria-live="polite"></p><p class="note">竖虚线是文献中的无限方格位渗流阈值，不是由本次小规模模拟精确测出的结果。标准差上界 1/(2√M) 只描述抽样波动，不包含有限尺寸偏差；M 是每种尺寸的样本数。</p>';
    function render() {
      const p = +$('read-p').value; $('read-p-value').textContent = p.toFixed(2);
      const lines = samples.map((set, i) => {
        const sorted = [...set].sort((a, b) => a - b), points = [[0, 0]];
        sorted.forEach((t, j) => { points.push([t, j / sorted.length], [t, (j + 1) / sorted.length]); }); points.push([1, set.length ? 1 : 0]);
        return { points, color: colors[i], dash: dashes[i] };
      });
      const chart = axes(lines, true); let svg = chart.svg + `<line class="ref" x1="${chart.x(p)}" x2="${chart.x(p)}" y1="35" y2="256"/>`;
      samples.forEach((set, i) => { svg += `<circle cx="${chart.x(p)}" cy="${chart.y(M.fraction(set, p))}" r="4" fill="${colors[i]}"/>`; });
      $('plot').innerHTML = svg + '</svg>';
      $('sample-table').innerHTML = samples.map((set, i) => `<tr><td>${sides[i]} × ${sides[i]}</td><td>${set.filter(t => t <= p).length} / ${set.length}</td><td>${set.length ? pct(M.fraction(set, p)) : '—'}</td><td>${set.length ? pct(1 / (2 * Math.sqrt(set.length))) : '—'}</td></tr>`).join('');
      $('mc-status').textContent = `${running ? '正在计算；可以暂停。' : '计算已就绪。'}种子 ${baseSeed}；每种尺寸 ${samples[0].length} 张。`;
    }
    async function run(count) {
      if (running) return; running = true; const token = generation;
      $('add').disabled = true; $('stop').disabled = false;
      for (let k = 0; k < count && running && token === generation; k++) {
        const index = samples[0].length;
        sides.forEach((n, i) => {
          const values = M.field(n, (baseSeed + Math.imul(index + 1, 2654435761) + n * 100003) >>> 0);
          samples[i].push(M.firstThreshold(n, values));
        });
        if (k % 8 === 0) { render(); await new Promise(resolve => setTimeout(resolve, 0)); }
      }
      if (token !== generation) return;
      running = false; $('add').disabled = false; $('stop').disabled = true; render();
    }
    $('read-p').oninput = render; $('add').onclick = () => run(100);
    $('stop').onclick = () => { running = false; };
    $('reset').onclick = () => { generation++; running = false; baseSeed = freshSeed(); samples.forEach(set => set.length = 0); run(60); };
    render(); run(60);
  }
  function compare() {
    const n = 18; let seed = 4096, site = M.field(n, seed), bond = M.field(n, seed + 100000, 'bond');
    root.innerHTML = header('04', '随机的是格点，还是连接？', '左边逐格开放；右边所有节点都存在，只随机开放相邻节点之间的连接。两边使用独立样本。') + slider('compare-p', '共同的开放概率 p', 0, 1, .01, .55) + '<div class="toolbar"><button id="compare-sample">两边重新抽样</button></div><div class="pair"><section><h2>位渗流 · 开放格点</h2><div id="site-grid"></div><div class="stats"><p class="label">无限方格阈值 ≈ 0.592746（数值估计）</p><p class="value" id="site-state"></p><p class="note" id="site-count"></p></div></section><section><h2>键渗流 · 开放连接</h2><div id="bond-grid"></div><div class="stats"><p class="label">无限方格阈值 = 1/2（精确结果）</p><p class="value" id="bond-state"></p><p class="note" id="bond-count"></p></div></section></div>' + legend() + '<p class="status" id="compare-status" role="status" aria-live="polite"></p><p class="note">右图虚线为关闭的连接；橙线为一条贯通路径。不要根据一对 18 × 18 的图判断无限系统阈值的大小。</p>';
    function render() {
      const p = +$('compare-p').value; $('compare-p-value').textContent = p.toFixed(2);
      for (const [type, values] of [['site', site], ['bond', bond]]) {
        const result = M.analyze(n, M.maskAt(values, p), type);
        $(type + '-grid').innerHTML = boardSvg(result);
        $(type + '-state').textContent = result.spans ? '本图已贯通' : '本图未贯通'; $(type + '-state').classList.toggle('yes', result.spans);
        $(type + '-count').textContent = `${result.openCount} / ${result.total} 个${type === 'site' ? '格点' : '连接'}开放（${pct(result.openCount / result.total)}）`;
      }
      $('compare-status').textContent = `种子 ${seed}。阈值表述只适用于独立开放、最近邻相连的无限方格；图中边界不环绕。`;
    }
    $('compare-p').oninput = render; $('compare-sample').onclick = () => { seed = freshSeed(); site = M.field(n, seed); bond = M.field(n, seed + 100000, 'bond'); render(); }; render();
  }
  function chain() {
    let seed = 313, values = M.field(10, seed);
    root.innerHTML = header('05', '只能沿一条链前进', '编号 1 到 n 依次串联，分行只是为了排版，没有额外的上下连接。任意一格关闭都会阻断整条链。') + slider('chain-p', '每格开放概率 p', 0, 1, .001, .99) + slider('chain-n', '链长 n（格）', 1, 100, 1, 100) + '<div class="toolbar"><button id="chain-sample">重新抽样这条链</button></div><p class="label">整条链开放的精确概率 pⁿ</p><p class="big-result" id="chain-prob"></p><p class="note" id="chain-formula"></p><div class="chain" id="chain" role="img"></div><p class="status" id="chain-status" role="status" aria-live="polite"></p><p class="note">蓝色表示从第 1 格能到达的位置；描边标出第一个关闭格。样本是否贯通是一次结果，上方概率是对所有随机链计算的理论值。</p>';
    function render() {
      const p = +$('chain-p').value, n = +$('chain-n').value, mask = M.maskAt(values.slice(0, n), p);
      const first = mask.findIndex(value => !value), probability = p ** n;
      $('chain-p-value').textContent = p.toFixed(3); $('chain-n-value').textContent = n;
      $('chain-prob').textContent = probability && probability < .00001 ? probability.toExponential(3) : pct(probability, 3);
      $('chain-formula').textContent = `${p.toFixed(3)} 的 ${n} 次方 = ${probability.toPrecision(5)}。提高 p 不会重抽样；改变 n 使用当前序列的前 n 格。`;
      $('chain').innerHTML = Array.from(mask, (value, i) => `<span class="${value ? 'open' : ''} ${value && (first < 0 || i < first) ? 'wet' : ''} ${i === first ? 'break' : ''}">${i + 1}</span>`).join('');
      $('chain').setAttribute('aria-label', `${n} 格串联链，${first < 0 ? '全部开放，已贯通' : `第 ${first + 1} 格首次关闭，未贯通`}`);
      $('chain-status').textContent = `种子 ${seed}；本次${first < 0 ? '已贯通' : `未贯通，第 ${first + 1} 格首先阻断` }。`;
    }
    $('chain-p').oninput = render; $('chain-n').oninput = render;
    $('chain-sample').onclick = () => { seed = freshSeed(); values = M.field(10, seed); render(); }; render();
  }
  const modes = { manual, coupling, ensemble: monteCarlo, compare, chain };
  const mode = new URLSearchParams(location.search).get('mode') || 'manual';
  (modes[mode] || manual)();
})();
