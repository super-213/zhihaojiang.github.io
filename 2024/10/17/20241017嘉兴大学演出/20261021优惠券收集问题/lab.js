(() => {
  'use strict';
  const M = window.Coupons, root = document.getElementById('lab');
  const $ = id => document.getElementById(id);
  const pct = x => `${(100 * x).toFixed(1)}%`;
  const fmt = x => x.toFixed(2).replace(/\.00$/, '');
  const frame = window.frameElement;
  function syncTheme() {
    let dark = matchMedia('(prefers-color-scheme: dark)').matches;
    try { if (parent !== window) dark = parent.document.body.classList.contains('dark-mode'); } catch (_) {}
    document.documentElement.classList.toggle('dark', dark);
  }
  syncTheme();
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', syncTheme);
  let themeObserver;
  try {
    if (parent !== window) {
      themeObserver = new MutationObserver(syncTheme);
      themeObserver.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] });
    }
  } catch (_) {}
  const resizeObserver = new ResizeObserver(() => {
    if (frame) frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 2}px`;
  });
  resizeObserver.observe(root);
  window.addEventListener('pagehide', () => {
    themeObserver?.disconnect(); resizeObserver.disconnect();
    media.removeEventListener('change', syncTheme);
  }, { once: true });
  function header(num, title, intro) {
    return `<p class="eyebrow">实验 ${num} / 优惠券收集</p><h1>${title}</h1><p class="intro">${intro}</p>`;
  }
  function stats(labels, ids) {
    return `<div class="stats">${labels.map((label, i) => `<div><p class="stat-label">${label}</p><p class="stat-value${i === 0 ? ' accent' : ''}" id="${ids[i]}"></p></div>`).join('')}</div>`;
  }
  const svg = (id, label) => `<svg id="${id}" class="chart" viewBox="0 0 600 240" role="img" aria-label="${label}"></svg>`;
  function chartWidth(el) {
    const width = Math.max(240, el.clientWidth);
    el.setAttribute('viewBox', `0 0 ${width} 240`);
    return width;
  }
  function collect() {
    root.innerHTML = header('01', '重复的券，仍然占一次抽取', '每次独立抽一张，各种券等概率。先抽几次，再留意接近集齐时的变化。') +
      `<div class="toolbar"><label for="types">券的种数<select id="types"><option>3</option><option selected>6</option><option>12</option></select></label><button id="draw" class="primary">抽 1 次</button><button id="ten">再抽至多 10 次</button></div>` +
      `<div id="album" class="album" aria-label="各类券的收集情况"></div>` +
      stats(['已收集种数', '已抽次数', '重复次数'], ['distinct', 'draws', 'duplicates']) +
      `<div class="progress" aria-hidden="true"><span id="progress"></span></div><p id="status" class="status" role="status"></p><p class="note">最近 18 次抽取 · “新”表示首次得到这一种券。</p><div id="tape" class="tape"></div><div class="toolbar"><button id="reset">重看本局</button><button id="another">换一局</button><span id="seed" class="note"></span></div><p class="note">每局使用固定种子，方便复现；“重看本局”回到第 0 次。集齐后本局停止。</p>`;
    let n = 6, seed = 20261021, random, counts, sequence, distinct;
    const name = i => String.fromCharCode(65 + i);
    function render() {
      $('album').innerHTML = Array.from(counts, (count, i) => `<div class="coupon${count ? ' owned' : ''}"><strong>${name(i)}</strong><span>${count ? `已有 ${count} 张` : '尚未抽到'}</span></div>`).join('');
      $('distinct').textContent = `${distinct} / ${n}`;
      $('draws').textContent = sequence.length;
      $('duplicates').textContent = sequence.length - distinct;
      $('progress').style.width = `${100 * distinct / n}%`;
      $('status').textContent = distinct === n ? `本局在第 ${sequence.length} 次集齐。这只是一次结果；理论平均为 ${fmt(M.mean(n))} 次。` : `还缺 ${n - distinct} 种。下一次抽到新券的概率为 ${n - distinct}/${n} = ${pct((n - distinct) / n)}。`;
      $('draw').disabled = $('ten').disabled = distinct === n;
      $('tape').innerHTML = sequence.slice(-18).map((item, i) => `<span class="ticket${item.fresh ? ' fresh' : ''}" title="第 ${Math.max(0, sequence.length - 18) + i + 1} 次">${name(item.type)} · ${item.fresh ? '新' : '重复'}</span>`).join('') || '<span class="note">尚未抽取</span>';
      $('seed').textContent = `本局种子 ${seed}`;
    }
    function draw(times) {
      for (let i = 0; i < times && distinct < n; i++) {
        const type = Math.floor(random() * n), fresh = counts[type] === 0;
        if (fresh) distinct++;
        counts[type]++; sequence.push({ type, fresh });
      }
      render();
    }
    function reset(initial = 0) {
      random = M.rng(seed); counts = new Uint32Array(n); sequence = []; distinct = 0;
      draw(initial);
    }
    $('draw').onclick = () => draw(1);
    $('ten').onclick = () => draw(10);
    $('reset').onclick = () => reset();
    $('another').onclick = () => { seed++; reset(); };
    $('types').onchange = () => { n = +$('types').value; reset(); };
    reset(6);
  }
  function stages() {
    root.innerHTML = header('02', '把集齐过程拆成一段段等待', '横轴是已经收集的种数，柱高是等到下一种新券平均还要抽几次。拖动第二个滑块，查看具体阶段。') +
      `<label class="field" for="n">总共有 <output id="n-value">6</output> 种券<input id="n" type="range" min="1" max="60" value="6"></label>` +
      svg('bars', '各阶段等待下一种新券的理论平均抽取次数') +
      `<label class="field" for="k">已经收集 <output id="k-value">5</output> 种<input id="k" type="range" min="0" max="5" value="5"></label>` +
      stats(['下一种平均等待', '下一次出新券', '从零集齐的平均'], ['wait', 'chance', 'total']) +
      `<p id="stage-note" class="status" role="status"></p><p class="note">柱高表示许多次重复实验的平均等待，单局并不按柱高固定前进。等待次数包括抽中新券的那一次。</p>`;
    function render() {
      const n = +$('n').value, k = +$('k').value;
      $('n-value').textContent = n; $('k-value').textContent = k;
      $('wait').textContent = `${fmt(n / (n - k))} 次`;
      $('chance').textContent = `${n - k}/${n}`;
      $('total').textContent = `${fmt(M.mean(n))} 次`;
      $('stage-note').textContent = `还缺 ${n - k} 种，每次成功概率 ${pct((n - k) / n)}。这个阶段的平均等待 = ${n} ÷ ${n - k}；把所有柱高相加，得到 ${fmt(M.mean(n))} 次。`;
      const left = 40, right = chartWidth($('bars')) - 10, top = 26, bottom = 200;
      const w = (right - left) / n, y = v => bottom - v / n * (bottom - top);
      let html = `<line class="axis" x1="${left}" x2="${right}" y1="${bottom}" y2="${bottom}"/><text x="${left}" y="14">平均等待（次）</text><text x="12" y="${top + 4}">${n}</text><text x="22" y="${bottom + 4}">0</text>`;
      for (let j = 0; j < n; j++) {
        const v = n / (n - j);
        html += `<rect class="bar${j === k ? ' active' : ''}" x="${left + w * j + w * .1}" y="${y(v)}" width="${w * .8}" height="${bottom - y(v)}"><title>已有 ${j} 种：平均等待 ${fmt(v)} 次</title></rect>`;
        if (n <= 12 || j === 0 || j === n - 1 || j === k) html += `<text text-anchor="middle" x="${left + w * (j + .5)}" y="217">${j}</text>`;
      }
      html += `<text text-anchor="end" x="${right}" y="236">已收集种数</text>`;
      $('bars').innerHTML = html;
    }
    $('n').oninput = () => {
      const wasLast = +$('k').value === +$('k').max;
      $('k').max = +$('n').value - 1;
      $('k').value = wasLast ? $('k').max : Math.min(+$('k').value, +$('k').max);
      render();
    };
    $('k').oninput = render;
    window.addEventListener('resize', render);
    render();
  }
  function budget() {
    root.innerHTML = header('03', '抽到多少次，才有九成把握', '实线给出有限种数下的理论概率。改变抽取次数读数，再增加独立模拟局数作比较。') +
      `<div class="toolbar"><label for="types">券的种数<select id="types">${[2, 3, 6, 10, 20, 50].map(n => `<option${n === 6 ? ' selected' : ''}>${n}</option>`).join('')}</select></label><button id="add" class="primary">增加 2,000 局模拟</button><button id="clear">清空模拟</button></div>` +
      svg('cdf', '横轴为抽取次数，纵轴为在这些次数以内集齐的概率') +
      `<div class="legend"><span>理论概率</span><span class="sample-key">模拟中已集齐的比例</span></div><label class="field" for="m">最多抽 <output id="m-value">15</output> 次<input id="m" type="range" min="0" max="47" value="15"></label>` +
      stats(['在此次数内集齐', '90% 所需最少次数', '理论平均次数'], ['prob', 'q90', 'mean']) +
      `<p id="budget-note" class="status" role="status"></p><div id="quantiles" class="comparison"></div><p id="simulation" class="note"></p><p class="note">每局都从零抽到集齐，独立使用同一模型。“增加”保留已有样本；拖动次数只重新统计这批样本。更换种数会清空样本。固定种子为 20261021 + 种数。</p>`;
    let n, max, cdf, random, samples = [];
    function setup() {
      n = +$('types').value; max = Math.ceil(n * (Math.log(n) + 6));
      cdf = M.distribution(n, max); random = M.rng(20261021 + n); samples = [];
      $('m').max = max; $('m').value = Math.round(M.mean(n));
      render();
    }
    function render() {
      const m = +$('m').value, prob = cdf[m];
      $('m-value').textContent = m;
      $('prob').textContent = pct(prob);
      $('q90').textContent = `${M.quantile(cdf, .9)} 次`;
      $('mean').textContent = `${fmt(M.mean(n))} 次`;
      $('budget-note').textContent = `抽 ${m} 次后，平均还缺 ${fmt(M.missing(n, m))} 种；完全没缺券的概率是 ${pct(prob)}。这是两个不同的量。`;
      $('quantiles').innerHTML = [.5, .9, .95, .99].map(p => `<span>${100 * p}% 把握：<strong>${M.quantile(cdf, p)} 次</strong></span>`).join('');
      const hist = new Uint32Array(max + 1);
      let success = 0;
      for (const t of samples) { if (t <= max) hist[t]++; if (t <= m) success++; }
      const ecdf = new Float64Array(max + 1);
      let cumulative = 0;
      for (let t = 0; t <= max; t++) { cumulative += hist[t]; ecdf[t] = samples.length ? cumulative / samples.length : 0; }
      $('simulation').textContent = samples.length ? `模拟共 ${samples.length.toLocaleString('zh-CN')} 局；${success.toLocaleString('zh-CN')} 局在 ${m} 次以内集齐，占 ${pct(success / samples.length)}；模拟平均 ${fmt(samples.reduce((a, b) => a + b, 0) / samples.length)} 次。理论曲线不随模拟改变。` : '尚未模拟；当前曲线完全由模型计算，保留了所有可能结果。';
      $('clear').disabled = !samples.length;
      $('add').disabled = samples.length >= 20000;
      const left = 40, right = chartWidth($('cdf')) - 10, top = 27, bottom = 201;
      const x = t => left + t / max * (right - left), y = p => bottom - p * (bottom - top);
      let html = `<text x="${left}" y="14">已集齐的概率</text>`;
      for (const p of [0, .5, 1]) html += `<line class="axis" x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}"/><text text-anchor="end" x="39" y="${y(p) + 4}">${p * 100}%</text>`;
      for (const t of [0, Math.round(max / 2), max]) html += `<text x="${x(t)}" y="219" text-anchor="${t === 0 ? 'start' : t === max ? 'end' : 'middle'}">${t}</text>`;
      html += `<text x="${right}" y="236" text-anchor="end">抽取次数（次）</text>`;
      function path(values) { return Array.from(values, (v, t) => `${t ? 'L' : 'M'}${x(t)},${y(v)}`).join(''); }
      html += `<path class="curve" d="${path(cdf)}"/>`;
      if (samples.length) html += `<path class="sample" d="${path(ecdf)}"/>`;
      html += `<line class="cursor" x1="${x(m)}" x2="${x(m)}" y1="${top}" y2="${bottom}"/><circle class="dot" cx="${x(m)}" cy="${y(prob)}" r="4"/>`;
      $('cdf').innerHTML = html;
    }
    $('types').onchange = setup;
    $('m').oninput = render;
    $('add').onclick = () => { for (let i = 0; i < 2000; i++) samples.push(M.sample(n, random)); render(); };
    $('clear').onclick = () => { samples = []; random = M.rng(20261021 + n); render(); };
    window.addEventListener('resize', render);
    setup();
  }
  const mode = new URLSearchParams(location.search).get('mode') || 'collect';
  ({ collect, stages, budget }[mode] || collect)();
})();
