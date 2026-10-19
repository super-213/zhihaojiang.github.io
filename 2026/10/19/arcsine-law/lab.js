/* No libraries or remote requests: all experiments run locally in this frame. */
(() => {
  'use strict';
  const M = window.Arcsine, root = document.getElementById('lab');
  const $ = id => document.getElementById(id);
  const pct = (x, digits = 1) => `${(x * 100).toFixed(digits)}%`;
  const number = n => n.toLocaleString('zh-CN');
  const reduced = matchMedia('(prefers-reduced-motion: reduce)');
  // Follow the blog's own theme, including theme switches after loading.
  function syncTheme() {
    let dark = matchMedia('(prefers-color-scheme: dark)').matches;
    try {
      if (parent !== window) dark = parent.document.body.classList.contains('dark-mode');
    } catch (_) { /* Standalone hosting falls back to the system preference. */ }
    document.documentElement.classList.toggle('dark', dark);
  }
  syncTheme();
  // Size each embedded figure to its actual content, including mobile wrapping.
  // CSS heights in the article are only a fallback while the frame is loading.
  if (parent !== window) {
    new ResizeObserver(() => {
      try {
        if (window.frameElement) window.frameElement.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 2}px`;
      } catch (_) { /* Cross-origin embeds retain the article's fallback height. */ }
    }).observe(root);
  }
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', syncTheme);
  try {
    if (parent !== window) new MutationObserver(syncTheme).observe(parent.document.body, { attributes: true, attributeFilter: ['class'] });
  } catch (_) { /* The experiments also work outside a same-origin frame. */ }

  function header(no, title, intro) {
    return `<p class="eyebrow">EXPERIMENT ${no} / ARCSINE LAW</p><h1>${title}</h1><p class="intro">${intro}</p>`;
  }
  function svg(id, label, small = false) {
    return `<svg id="${id}" class="chart${small ? ' small-chart' : ''}" role="${id === 'histogram' ? 'group' : 'img'}" aria-label="${label}"></svg>`;
  }
  function customizeSelect(select) {
    const field = document.createElement('div');
    field.className = 'select-field';
    const label = select.closest('label');
    const caption = document.createElement('span');
    caption.id = `${select.id}-label`;
    caption.textContent = label.firstChild.textContent.trim();
    label.before(field); field.append(caption, select); label.remove();
    select.hidden = true;
    const control = document.createElement('div');
    control.className = 'custom-select';
    const options = Array.from(select.options);
    control.innerHTML = `<button type="button" id="${select.id}-trigger" class="select-trigger" role="combobox" aria-haspopup="listbox" aria-expanded="false" aria-controls="${select.id}-list" aria-labelledby="${caption.id} ${select.id}-value"><span id="${select.id}-value"></span><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m4 6 4 4 4-4"/></svg></button><div id="${select.id}-list" class="select-menu" role="listbox" aria-labelledby="${caption.id}" hidden>${options.map((option, i) => `<div id="${select.id}-option-${i}" class="select-option" role="option" data-option="${i}" aria-selected="false"><span>${option.textContent}</span><svg viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="m3 8 3 3 7-7"/></svg></div>`).join('')}</div>`;
    field.append(control);
    const trigger = control.querySelector('.select-trigger'), menu = control.querySelector('.select-menu');
    const items = Array.from(menu.children);
    let open = false, active = select.selectedIndex;
    function highlight(index) {
      active = index;
      items.forEach((item, i) => item.classList.toggle('is-active', open && i === active));
      if (open) trigger.setAttribute('aria-activedescendant', items[active].id);
      else trigger.removeAttribute('aria-activedescendant');
    }
    function setOpen(value) {
      open = value; menu.hidden = !open;
      trigger.setAttribute('aria-expanded', String(open));
      highlight(select.selectedIndex);
    }
    function sync() {
      $(`${select.id}-value`).textContent = options[select.selectedIndex].textContent;
      items.forEach((item, i) => item.setAttribute('aria-selected', String(i === select.selectedIndex)));
    }
    function choose(index) {
      const changed = select.selectedIndex !== index;
      select.selectedIndex = index; sync(); setOpen(false); trigger.focus();
      if (changed) select.dispatchEvent(new Event('change', { bubbles: true }));
    }
    trigger.addEventListener('click', () => setOpen(!open));
    trigger.addEventListener('keydown', e => {
      if (e.key === 'Tab') { setOpen(false); return; }
      if (e.key === 'Escape') { if (open) { e.preventDefault(); setOpen(false); } return; }
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); if (open) choose(active); else setOpen(true); return; }
      if (['ArrowDown', 'ArrowUp', 'Home', 'End'].includes(e.key)) {
        e.preventDefault();
        const wasOpen = open;
        if (!open) setOpen(true);
        if (e.key === 'Home') highlight(0);
        else if (e.key === 'End') highlight(items.length - 1);
        else if (wasOpen) highlight((active + (e.key === 'ArrowDown' ? 1 : -1) + items.length) % items.length);
      }
    });
    menu.addEventListener('pointermove', e => { const item = e.target.closest('[data-option]'); if (item) highlight(+item.dataset.option); });
    menu.addEventListener('click', e => { const item = e.target.closest('[data-option]'); if (item) choose(+item.dataset.option); });
    document.addEventListener('pointerdown', e => { if (!control.contains(e.target)) setOpen(false); });
    window.addEventListener('blur', () => setOpen(false));
    select.addEventListener('change', sync);
    sync();
  }
  function dimensions(el, height = 230) {
    const w = Math.max(240, el.clientWidth), h = height;
    el.setAttribute('viewBox', `0 0 ${w} ${h}`);
    return { w, h, left: 38, right: w - 12, top: 22, bottom: h - 30 };
  }
  function pathChart(el, game, until = game.n, small = false) {
    const d = dimensions(el, small ? 104 : 230), { left, right, top, bottom } = d;
    const max = Math.max(3, ...game.path.map(Math.abs));
    const x = i => left + i / game.n * (right - left);
    const y = v => (top + bottom) / 2 - v / max * (bottom - top) / 2;
    let html = `<line class="zero" x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}"/>`;
    if (!small) html += `<text x="4" y="${top + 4}">+${max}</text><text x="17" y="${y(0) + 4}">0</text><text x="4" y="${bottom + 3}">−${max}</text><text x="${left}" y="12">分差</text>`;
    // Group complete excursions into a few paths instead of thousands of DOM nodes.
    let start = 0;
    for (let i = 1; i <= until; i++) {
      if (game.path[i] !== 0 && i !== until) continue;
      const positive = game.path[start] + game.path[start + 1] > 0;
      let line = `M${x(start)},${y(game.path[start])}`;
      for (let j = start + 1; j <= i; j++) line += `L${x(j)},${y(game.path[j])}`;
      html += `<path class="fill-${positive ? 'positive' : 'negative'}" d="${line}L${x(i)},${y(0)}L${x(start)},${y(0)}Z"/>`;
      html += `<path class="${positive ? 'positive' : 'negative'}" d="${line}"/>`;
      start = i;
    }
    if (!small) {
      const zero = game.zeros[until];
      html += `<circle class="marker" cx="${x(until)}" cy="${y(game.path[until])}" r="3.5"/>`;
      html += `<circle cx="${x(zero)}" cy="${y(0)}" r="3" fill="var(--ink)"><title>目前最后平局：第 ${zero} 轮</title></circle>`;
    }
    html += `<text x="${left}" y="${d.h - 7}">0</text><text text-anchor="middle" x="${x(game.n / 2)}" y="${d.h - 7}">${game.n / 2}</text><text text-anchor="end" x="${right}" y="${d.h - 7}">${game.n} 轮</text>`;
    el.innerHTML = html;
  }

  function walk() {
    root.innerHTML = header('02', '逐步计算一条随机路径', '拖动时间滑块，核对累计和、正面次数与上方时间的定义。') +
      `<div class="toolbar"><button class="primary" id="new-game">重新抛一局</button><button id="play">回放这一局</button><span class="spacer"></span><label for="steps">每局轮数 <select id="steps"><option>50</option><option selected>200</option><option>1000</option></select></label></div>` +
      svg('walk-chart', '本局累计分差随时间的变化，红色代表甲领先，灰色代表乙领先') +
      `<div class="legend"><span class="key">甲领先</span><span class="key other">乙领先</span><span>黑点：目前最后一次平局</span></div><div class="scrubber"><label for="time">观察到第 <output id="time-value">200</output> 轮</label><input id="time" type="range" min="0" max="200" value="200" step="1"></div>` +
      `<div class="stats"><div><p class="stat-label">正面占比 · 单次结果</p><p class="stat-value" id="heads-value"></p><div class="meter"><span id="head-meter"></span></div><p class="note" id="heads-count"></p></div><div><p class="stat-label">甲领先时间占比 · 累计状态</p><p class="stat-value accent" id="lead-value"></p><div class="meter red"><span id="lead-meter"></span></div><p class="note" id="lead-count"></p></div></div><p class="note" id="walk-note" aria-live="polite"></p>`;
    let game, frame = 0, playing = false, startTime = null;
    function stop() {
      cancelAnimationFrame(frame); playing = false; startTime = null;
      $('play').textContent = '回放这一局';
    }
    function render() {
      const t = Number($('time').value), h = game.headCounts[t], lead = game.positiveCounts[t];
      $('time-value').value = t;
      $('heads-value').textContent = t ? pct(h / t) : '—';
      $('lead-value').textContent = t ? pct(lead / t) : '—';
      $('head-meter').style.width = pct(t ? h / t : 0);
      $('lead-meter').style.width = pct(t ? lead / t : 0);
      $('heads-count').textContent = `正面 ${h} 次 / 已抛 ${t} 次`;
      $('lead-count').textContent = `上方 ${lead} 段 / 已走 ${t} 段`;
      $('walk-note').textContent = t ? `第 ${t} 轮分差：${game.path[t] > 0 ? '+' : ''}${game.path[t]}。目前最后平局在第 ${game.zeros[t]} 轮。比例的分母是已观察的 ${t} 轮。` : '比赛还没开始。用方向键或拖动滑块，逐步观察。';
      pathChart($('walk-chart'), game, t);
    }
    function fresh() {
      stop(); game = M.sample(Number($('steps').value));
      $('time').max = game.n; $('time').value = game.n; render();
    }
    $('new-game').addEventListener('click', fresh);
    $('steps').addEventListener('change', fresh);
    $('time').addEventListener('input', () => { stop(); render(); });
    $('play').addEventListener('click', () => {
      if (playing) { stop(); return; }
      if (reduced.matches) { $('time').value = game.n; render(); $('walk-note').textContent += ' 已启用减少动态效果，请用时间滑块逐步查看。'; return; }
      $('time').value = 0; playing = true; $('play').textContent = '暂停回放';
      function tick(now) {
        if (startTime === null) startTime = now;
        const t = Math.min(game.n, Math.floor((now - startTime) / 4000 * game.n));
        $('time').value = t; render();
        if (t < game.n) frame = requestAnimationFrame(tick); else stop();
      }
      frame = requestAnimationFrame(tick);
    });
    document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
    window.addEventListener('pagehide', stop);
    new ResizeObserver(render).observe($('walk-chart'));
    fresh();
  }

  function ensemble() {
    root.innerHTML = header('03', '比较三个统计量的分布', '对同一批独立随机路径，分别统计正面比例、上方时间和最后返回时刻。') +
      `<div class="toolbar"><button class="primary add" data-count="1000">增加 1,000 局</button><button class="add" data-count="100">增加 100 局</button><button id="reset">清空</button><label for="steps">每局轮数 <select id="steps"><option>50</option><option selected>200</option><option>1000</option><option>2000</option></select></label></div><p class="status" id="progress" role="status">尚未模拟。选择轮数后增加样本。</p><div class="tabs" role="group" aria-label="选择统计对象"><button id="tab-lead" aria-pressed="true">上方时间</button><button id="tab-head" aria-pressed="false">正面次数</button><button id="tab-zero" aria-pressed="false">最后返回</button></div><p class="plot-caption" id="plot-caption">纵轴：每个区间的局数占比 · 横轴：上方时间占比</p>` +
      svg('histogram', '模拟比例的直方图与相同分组的有限步数精确理论概率，每根柱子可点击或按回车查看样本') +
      `<div class="legend"><span class="key">实际模拟</span><span class="key theory">有限步数的精确理论值</span></div><p class="summary" id="summary"></p><div class="sample"><p class="sample-title" id="sample-title">模拟后，点击任意柱子查看对应的一局。</p>${svg('sample-chart', '所选比例区间内随机抽取的一局比赛路径', true)}</div><p class="note">每格宽 5 个百分点，左闭右开；最后一格包含 100%。改变轮数会清空旧样本。虚线和柱子都表示每格的概率，不是密度。</p>`;
    let n = 200, games = [], active = 'lead', selected = -1, preview = null, job = 0;
    let theory = {};
    function updateTheory() {
      theory.lead = M.binnedPMF(M.occupationPMF(n));
      theory.head = M.binnedPMF(M.headsPMF(n));
      theory.zero = theory.lead;
    }
    function busy(value) {
      document.querySelectorAll('.add').forEach(b => { b.disabled = value; });
      $('steps').disabled = value;
    }
    function choose(i) {
      selected = i;
      const candidates = games.filter(g => M.binIndex(g[active]) === i);
      const g = candidates.length ? candidates[Math.floor(Math.random() * candidates.length)] : null;
      preview = g ? M.summarize(Array.from(g.steps)) : null;
      draw();
    }
    function draw() {
      const el = $('histogram'), d = dimensions(el), { left, right, top, bottom } = d;
      const bins = Array(20).fill(0);
      games.forEach(g => bins[M.binIndex(g[active])]++);
      const actual = bins.map(c => games.length ? c / games.length : 0);
      const expected = theory[active];
      const ceiling = Math.ceil(Math.max(...actual, ...expected, .1) * 1.16 / .05) * .05;
      const x = u => left + u * (right - left), y = p => bottom - p / ceiling * (bottom - top);
      let html = '';
      for (let i = 0; i <= 2; i++) {
        const p = ceiling * i / 2;
        html += `<line class="grid" x1="${left}" x2="${right}" y1="${y(p)}" y2="${y(p)}"/><text text-anchor="end" x="${left - 6}" y="${y(p) + 4}">${pct(p, 0)}</text>`;
      }
      let line = '';
      for (let i = 0; i < 20; i++) {
        const bx = x(i / 20), bw = (right - left) / 20;
        const range = `${i * 5}%～${(i + 1) * 5}%${i === 19 ? '（含右端点）' : '（不含右端点）'}`;
        html += `<g class="bin" role="button" tabindex="0" data-bin="${i}" aria-label="${range}，${bins[i]} 局。查看样本"><title>${range}：模拟 ${pct(actual[i])}，理论 ${pct(expected[i])}</title><rect class="bar${selected === i ? ' selected' : ''}" x="${bx + 1}" width="${Math.max(1, bw - 2)}" y="${y(actual[i])}" height="${bottom - y(actual[i])}"/><rect class="bin-hit" x="${bx}" y="${top}" width="${bw}" height="${bottom - top}"/></g>`;
        line += `${i ? 'L' : 'M'}${x((i + .5) / 20)},${y(expected[i])}`;
      }
      html += `<path class="theory" style="pointer-events:none" d="${line}"/>`;
      [0, .25, .5, .75, 1].forEach(u => { html += `<text text-anchor="${u === 0 ? 'start' : u === 1 ? 'end' : 'middle'}" x="${x(u)}" y="${d.h - 7}">${pct(u, 0)}</text>`; });
      el.innerHTML = html;
      const mean = games.length ? games.reduce((a, g) => a + g[active], 0) / games.length : 0;
      const edge = games.filter(g => g[active] <= .1 + 1e-10 || g[active] >= .9 - 1e-10).length;
      const center = games.filter(g => g[active] >= .4 - 1e-10 && g[active] <= .6 + 1e-10).length;
      $('summary').innerHTML = games.length ? `两端（≤10% 或 ≥90%）：<strong>${pct(edge / games.length)}</strong>　中间（40%～60%）：<strong>${pct(center / games.length)}</strong><br>这批样本的平均比例：${pct(mean)} · 共 ${number(games.length)} 局` : '虚线已经给出理论预测。点击上方按钮，看看随机实验是否支持它。';
      if (preview) {
        $('sample-title').textContent = `所选区间的样本：正面 ${pct(preview.head)}，上方时间 ${pct(preview.lead)}，最后返回 ${pct(preview.lastZero / n)}。`;
        pathChart($('sample-chart'), preview, n, true);
      } else {
        $('sample-title').textContent = selected < 0 ? '模拟后，点击任意柱子查看对应的一局。' : '这个区间目前没有样本。可以继续增加局数。';
        $('sample-chart').innerHTML = '';
      }
    }
    $('histogram').addEventListener('click', e => {
      const bin = e.target.closest('[data-bin]'); if (bin) choose(Number(bin.dataset.bin));
    });
    $('histogram').addEventListener('keydown', e => {
      const bin = e.target.closest('[data-bin]');
      if (bin && (e.key === 'Enter' || e.key === ' ')) { e.preventDefault(); choose(Number(bin.dataset.bin)); }
    });
    async function add(count) {
      const token = ++job, target = games.length + count;
      busy(true); selected = -1; preview = null;
      while (games.length < target && token === job) {
        const end = Math.min(target, games.length + 100);
        while (games.length < end) {
          // Store compact increments; detailed arrays are reconstructed only
          // for a selected sample, keeping long sessions inexpensive.
          const g = M.sample(n);
          games.push({ steps: Int8Array.from(g.steps), lead: g.lead, head: g.head, zero: g.lastZero / n, n });
        }
        $('progress').textContent = `已模拟 ${number(games.length)} / ${number(target)} 局 · 每局 ${number(n)} 轮`;
        draw();
        await new Promise(resolve => setTimeout(resolve, 0));
      }
      if (token === job) {
        busy(false);
        $('progress').textContent = `已模拟 ${number(games.length)} 局 · 每局 ${number(n)} 轮 · 可继续累积`;
      }
    }
    function reset() {
      job++; busy(false); games = []; selected = -1; preview = null;
      n = Number($('steps').value); updateTheory();
      $('progress').textContent = '尚未模拟。选择轮数后增加样本。'; draw();
    }
    document.querySelectorAll('.add').forEach(b => b.addEventListener('click', () => add(Number(b.dataset.count))));
    $('reset').addEventListener('click', reset); $('steps').addEventListener('change', reset);
    ['lead', 'head', 'zero'].forEach(key => $( `tab-${key}`).addEventListener('click', () => {
      active = key; selected = -1; preview = null;
      ['lead', 'head', 'zero'].forEach(k => $(`tab-${k}`).setAttribute('aria-pressed', String(k === key)));
      $('plot-caption').textContent = `纵轴：每个区间的局数占比 · 横轴：${({lead:'上方时间比例',head:'正面次数比例',zero:'最后返回时刻 / 总轮数'})[key]}`; draw();
    }));
    window.addEventListener('pagehide', () => { job++; });
    new ResizeObserver(draw).observe($('histogram'));
    reset();
  }

  function probability() {
    root.innerHTML = header('05', '计算区间概率', '此处使用连续极限分布，概率按完整的累积分布函数计算。') +
      `<div class="toolbar"><button class="preset" data-a="0" data-b="10">不超过 10%</button><button class="preset" data-a="40" data-b="60">40%～60%</button><button class="preset" data-a="90" data-b="100">至少 90%</button><button class="preset" data-a="0" data-b="100">全部区间</button></div>` +
      svg('density', '反正弦概率密度曲线，所选区间下面的面积以红色标出') +
      `<div class="range-grid"><div><label for="lower">左端点 a <output id="lower-value">40%</output></label><input id="lower" type="range" min="0" max="100" value="40" step="1"></div><div><label for="upper">右端点 b <output id="upper-value">60%</output></label><input id="upper" type="range" min="0" max="100" value="60" step="1"></div></div><div class="result" role="status"><strong id="probability"></strong><span id="interval"></span></div><p class="equation">P(a ≤ U ≤ b) = F(b) − F(a)</p><p class="note">F(u) = (2/π) arcsin √u。两端的密度趋于无穷，绘图在高度 4 处截断；上面的概率按完整公式计算，包含未画出的面积。</p>`;
    function render() {
      const a = Number($('lower').value) / 100, b = Number($('upper').value) / 100;
      $('lower-value').value = pct(a, 0); $('upper-value').value = pct(b, 0);
      $('probability').textContent = pct(M.cdf(b) - M.cdf(a), 2);
      $('interval').textContent = `领先时间在 ${pct(a, 0)}～${pct(b, 0)} 之间 · 区间宽 ${pct(b - a, 0)}`;
      const el = $('density'), d = dimensions(el), { left, right, top, bottom } = d;
      const x = u => left + u * (right - left), y = p => bottom - p / 4 * (bottom - top);
      const density = u => u <= 0 || u >= 1 ? 4 : Math.min(4, 1 / (Math.PI * Math.sqrt(u * (1 - u))));
      let html = '';
      [0, 1, 2, 3, 4].forEach(v => { html += `<line class="grid" x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}"/><text text-anchor="end" x="${left - 8}" y="${y(v) + 4}">${v}</text>`; });
      html += `<text x="${left}" y="12">概率密度（高度）</text>`;
      let curve = '';
      for (let i = 0; i <= 600; i++) curve += `${i ? 'L' : 'M'}${x(i / 600)},${y(density(i / 600))}`;
      let area = `M${x(a)},${bottom}`;
      for (let i = 0; i <= 400; i++) {
        const u = a + (b - a) * i / 400; area += `L${x(u)},${y(density(u))}`;
      }
      area += `L${x(b)},${bottom}Z`;
      html += `<path class="fill-positive" style="fill:var(--accent);opacity:.2" d="${area}"/><path class="positive" d="${curve}"/>`;
      [a, b].forEach(u => { html += `<line stroke="var(--accent)" stroke-dasharray="3 3" x1="${x(u)}" x2="${x(u)}" y1="${bottom}" y2="${y(density(u))}"/>`; });
      [0, .25, .5, .75, 1].forEach(u => { html += `<text text-anchor="${u === 0 ? 'start' : u === 1 ? 'end' : 'middle'}" x="${x(u)}" y="${d.h - 7}">${pct(u, 0)}</text>`; });
      el.innerHTML = html;
      document.querySelectorAll('.preset').forEach(bn => bn.setAttribute('aria-pressed', String(Number(bn.dataset.a) === a * 100 && Number(bn.dataset.b) === b * 100)));
    }
    $('lower').addEventListener('input', () => {
      if (+$('lower').value > +$('upper').value) $('upper').value = $('lower').value; render();
    });
    $('upper').addEventListener('input', () => {
      if (+$('upper').value < +$('lower').value) $('lower').value = $('upper').value; render();
    });
    document.querySelectorAll('.preset').forEach(b => b.addEventListener('click', () => { $('lower').value = b.dataset.a; $('upper').value = b.dataset.b; render(); }));
    new ResizeObserver(render).observe($('density')); render();
  }
  function order() {
    root.innerHTML = header('01', '固定次数，只改变顺序', '正反面各三次。依次点击两枚硬币交换位置，观察上方时间如何改变。') +
      `<div class="toolbar"><button id="cluster">先正后反</button><button id="alternate">正反交替</button><button id="reverse">翻转正反面</button><button id="shuffle">随机重排</button></div><div class="coins" id="coins" role="group" aria-label="点击两枚硬币交换位置"></div><p class="status" id="swap-status" role="status">选择第一枚硬币。</p>` +
      svg('order-chart', '由上方六枚硬币确定的累计分差路径') +
      `<div class="step-grid" id="step-grid" aria-label="逐步累计和与线段归属"></div><div class="stats"><div><p class="stat-label">正面比例 H / 6</p><p class="stat-value" id="order-head"></p></div><div><p class="stat-label">上方时间比例 T₊ / 6</p><p class="stat-value accent" id="order-lead"></p></div></div><p class="note">每一段占一个时间单位。1 → 0 计入上方；−1 → 0 计入下方。此处固定正反面次数用于比较排列，并非独立抛掷样本。</p>`;
    let steps = [1, 1, 1, -1, -1, -1], selected = -1, game;
    function render() {
      game = M.summarize(steps);
      $('coins').innerHTML = steps.map((s, i) => `<button data-coin="${i}" class="coin ${s > 0 ? 'up' : 'down'}" aria-pressed="${selected === i}" aria-label="第 ${i + 1} 枚，${s > 0 ? '正面' : '反面'}${selected === i ? '，已选中' : ''}"><small>${i + 1}</small>${s > 0 ? '正' : '反'}</button>`).join('');
      $('step-grid').innerHTML = `<div class="step-row"><span>轮数 i</span>${steps.map((_, i) => `<span>${i + 1}</span>`).join('')}</div><div class="step-row"><span>累计 Sᵢ</span>${game.path.slice(1).map(v => `<span>${v}</span>`).join('')}</div><div class="step-row"><span>线段归属</span>${steps.map((_, i) => `<span class="${game.path[i] + game.path[i + 1] > 0 ? 'up-text' : ''}">${game.path[i] + game.path[i + 1] > 0 ? '上' : '下'}</span>`).join('')}</div>`;
      $('order-head').textContent = `${game.heads}/6 = ${pct(game.head)}`;
      $('order-lead').textContent = `${game.positive}/6 = ${pct(game.lead)}`;
      pathChart($('order-chart'), game);
    }
    $('coins').addEventListener('click', e => {
      const coin = e.target.closest('[data-coin]'); if (!coin) return;
      const i = Number(coin.dataset.coin);
      if (selected < 0) { selected = i; $('swap-status').textContent = `已选第 ${i + 1} 枚。再选一枚交换；重复点击取消。`; }
      else {
        [steps[selected], steps[i]] = [steps[i], steps[selected]];
        $('swap-status').textContent = selected === i ? '已取消选择。' : `已交换第 ${selected + 1} 枚与第 ${i + 1} 枚。正面次数仍为三次。`;
        selected = -1;
      }
      render(); $('coins').querySelector(`[data-coin="${i}"]`).focus();
    });
    function preset(next) { steps = next; selected = -1; $('swap-status').textContent = '排列已更新，可以继续交换。'; render(); }
    $('cluster').addEventListener('click', () => preset([1, 1, 1, -1, -1, -1]));
    $('alternate').addEventListener('click', () => preset([1, -1, 1, -1, 1, -1]));
    $('reverse').addEventListener('click', () => preset(steps.map(s => -s)));
    $('shuffle').addEventListener('click', () => {
      const next = steps.slice();
      for (let i = next.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [next[i], next[j]] = [next[j], next[i]]; }
      preset(next);
    });
    new ResizeObserver(() => pathChart($('order-chart'), game)).observe($('order-chart')); render();
  }

  function enumeration() {
    root.innerHTML = header('04', '枚举全部路径，检查精确概率', '选择步数和样本条件，再点击一个时间值，查看该组的具体路径。') +
      `<div class="toolbar"><label for="enum-n">总步数 N <select id="enum-n"><option>4</option><option selected>6</option><option>8</option><option>10</option><option>12</option></select></label><label for="condition">样本条件 <select id="condition"><option value="all">全部路径</option><option value="bridge">只保留最终平局</option></select></label></div><div class="tabs" role="group" aria-label="枚举的统计量"><button id="enum-positive" aria-pressed="true">上方时间 T₊</button><button id="enum-lastZero" aria-pressed="false">最后返回 L</button></div><p class="status" id="enum-total" role="status"></p><div class="exact-bins" id="exact-bins" role="group" aria-label="按时间分组的精确路径数"></div><p class="equation" id="enum-formula"></p><p class="note" id="enum-factors"></p><p class="note" id="enum-explanation"></p><div class="path-list" id="path-list" role="group" aria-label="当前分组的路径"></div><div class="toolbar pager"><button id="previous">上一页</button><span id="page-count" class="status"></span><button id="next">下一页</button></div>` +
      svg('enum-chart', '当前选中的具体路径，分差随轮数变化', true) + `<p class="summary" id="enum-sample"></p>`;
    let n = 6, games = [], field = 'positive', bucket = 1, page = 0, sample = null, group = [];
    function showSample() {
      if (!sample) return;
      pathChart($('enum-chart'), sample, n, true);
      $('enum-sample').textContent = `此路径：T₊ = ${sample.positive}，L = ${sample.lastZero}，最终分差 = ${sample.path[n]}。`;
    }
    function render() {
      const bridge = $('condition').value === 'bridge', counts = Array(n / 2 + 1).fill(0);
      games.forEach(g => counts[g[field] / 2]++);
      bucket = Math.min(bucket, n / 2); group = games.filter(g => g[field] === bucket * 2);
      const max = Math.max(...counts), label = field === 'positive' ? 'T₊' : 'L';
      $('enum-total').textContent = `全部 2^${n} = ${2 ** n} 条等概率路径${bridge ? `，保留最终平局的 ${games.length} 条` : `，每条概率为 1/${2 ** n}`}。`;
      $('exact-bins').innerHTML = counts.map((count, k) => `<button class="exact-bin" data-k="${k}" aria-pressed="${k === bucket}" aria-label="${label} 等于 ${k * 2}，${count} 条路径，占 ${pct(count / games.length)}"><span>${k * 2}</span><span class="exact-bar"><i style="height:${count / max * 100}%"></i></span><strong>${count} 条</strong><small>${pct(count / games.length)}</small></button>`).join('');
      $('enum-formula').textContent = `P( ${label} = ${bucket * 2}${bridge ? ' | S_N = 0' : ''} ) = ${group.length}/${games.length} = ${pct(group.length / games.length, 2)}`;
      const q = m => m ? M.occupationPMF(m * 2)[0].p : 1;
      $('enum-factors').textContent = bridge ? '当前已加入终点条件，应使用条件概率重新计数。' : `公式核对：n = ${n / 2}，k = ${bucket}；q_${bucket} × q_${n / 2 - bucket} = ${q(bucket).toFixed(4)} × ${q(n / 2 - bucket).toFixed(4)} = ${pct(q(bucket) * q(n / 2 - bucket), 2)}。`;
      $('enum-explanation').textContent = bridge ? (field === 'positive' ? '最终平局改变了样本空间。当前枚举中，上方时间的各个可能值等概率。' : '最终平局意味着最后返回就在终点，因此 L 必定等于 N。') : '这里列出了全部可能结果，不存在蒙特卡洛抽样误差。上方时间和最后返回的分组总数相同，组内路径通常不同。';
      const pages = Math.max(1, Math.ceil(group.length / 8)); page = Math.min(page, pages - 1);
      $('path-list').innerHTML = group.slice(page * 8, page * 8 + 8).map((g, i) => `<button class="path-option" data-path="${page * 8 + i}" aria-label="查看路径 ${g.steps.map(s => s > 0 ? '正' : '反').join('、')}">${g.steps.map(s => `<span class="${s > 0 ? 'up-text' : ''}">${s > 0 ? '+' : '−'}</span>`).join('')}</button>`).join('') || '<p class="status">当前值没有路径。</p>';
      $('previous').disabled = page === 0; $('next').disabled = page >= pages - 1;
      $('page-count').textContent = `第 ${page + 1}/${pages} 页 · 本组 ${group.length} 条`;
      sample = group[page * 8] || null;
      if (sample) showSample(); else { $('enum-chart').innerHTML = ''; $('enum-sample').textContent = ''; }
    }
    function reset() { n = +$('enum-n').value; games = M.enumerate(n, $('condition').value === 'bridge'); page = 0; render(); }
    $('enum-n').addEventListener('change', reset); $('condition').addEventListener('change', reset);
    ['positive', 'lastZero'].forEach(key => $(`enum-${key}`).addEventListener('click', () => {
      field = key; page = 0;
      ['positive', 'lastZero'].forEach(k => $(`enum-${k}`).setAttribute('aria-pressed', String(k === field))); render();
    }));
    $('exact-bins').addEventListener('click', e => { const b = e.target.closest('[data-k]'); if (b) { bucket = +b.dataset.k; page = 0; render(); $('exact-bins').querySelector(`[data-k="${bucket}"]`).focus(); } });
    $('path-list').addEventListener('click', e => {
      const b = e.target.closest('[data-path]'); if (!b) return;
      sample = group[+b.dataset.path]; showSample();
      $('path-list').querySelectorAll('button').forEach(btn => btn.setAttribute('aria-pressed', String(btn === b)));
    });
    $('previous').addEventListener('click', () => { page--; render(); }); $('next').addEventListener('click', () => { page++; render(); });
    new ResizeObserver(showSample).observe($('enum-chart')); reset();
  }

  function convergence() {
    root.innerHTML = header('06', '从离散分布到连续极限', '改变总步数 N 和阈值 u，对比 P(U_N ≤ u) 的精确值与反正弦近似。') +
      `<div class="range-grid"><div><label for="length-index">总步数 N <output id="length-value"></output></label><input id="length-index" type="range" min="0" max="9" value="3" step="1"></div><div><label for="threshold">阈值 u <output id="threshold-value"></output></label><input id="threshold" type="range" min="0" max="100" value="10" step="1"></div></div>` +
      svg('cdf-chart', '有限步数的阶梯累积分布函数与连续反正弦累积分布函数') +
      `<div class="legend"><span class="key">有限 N 的精确 CDF</span><span class="key theory">连续极限 F(u)</span></div><div class="stats three"><div><p class="stat-label">精确 P(U_N ≤ u)</p><p class="stat-value accent" id="finite-value"></p></div><div><p class="stat-label">极限 F(u)</p><p class="stat-value" id="limit-value"></p></div><div><p class="stat-label">相差的百分点</p><p class="stat-value" id="error-value"></p></div></div><p class="note" id="endpoint-note" role="status"></p><p class="note">阶梯线的跳跃高度是某个点的概率。连续 CDF 没有跳跃。此图比较精确分布，无需随机抽样；增加 N 与增加模拟局数是两种不同操作。</p>`;
    const lengths = [2, 4, 6, 10, 20, 50, 100, 200, 1000, 2000];
    function render() {
      const n = lengths[+$('length-index').value], u = +$('threshold').value / 100, pmf = M.occupationPMF(n);
      const finite = M.discreteCDF(pmf, u), limit = M.cdf(u);
      $('length-value').value = n; $('threshold-value').value = pct(u, 0);
      $('length-index').setAttribute('aria-valuetext', `${n} 步`);
      $('threshold').setAttribute('aria-valuetext', pct(u, 0));
      $('finite-value').textContent = pct(finite, 2); $('limit-value').textContent = pct(limit, 2);
      $('error-value').textContent = (Math.abs(finite - limit) * 100).toFixed(2);
      $('endpoint-note').textContent = `N = ${n} 时，P(U_N = 0) = P(U_N = 1) = ${pct(pmf[0].p, 2)}；连续极限中，这两个单点的概率均为 0。`;
      const el = $('cdf-chart'), d = dimensions(el), { left, right, top, bottom } = d;
      const x = v => left + v * (right - left), y = v => bottom - v * (bottom - top);
      let html = '';
      [0, .5, 1].forEach(v => { html += `<line class="grid" x1="${left}" x2="${right}" y1="${y(v)}" y2="${y(v)}"/><text text-anchor="end" x="${left - 6}" y="${y(v) + 4}">${pct(v, 0)}</text>`; });
      html += `<text x="${left}" y="12">累计概率 P(U ≤ u)</text>`;
      let stairs = `M${left},${bottom}`, sum = 0;
      pmf.forEach(point => { sum += point.p; stairs += `H${x(point.x)}V${y(sum)}`; });
      let curve = '';
      for (let i = 0; i <= 500; i++) curve += `${i ? 'L' : 'M'}${x(i / 500)},${y(M.cdf(i / 500))}`;
      html += `<path class="positive" d="${stairs}"/><path class="theory" d="${curve}"/><line class="zero" x1="${x(u)}" x2="${x(u)}" y1="${top}" y2="${bottom}"/><circle class="marker" cx="${x(u)}" cy="${y(finite)}" r="4"/>`;
      [0, .25, .5, .75, 1].forEach(v => { html += `<text text-anchor="${v === 0 ? 'start' : v === 1 ? 'end' : 'middle'}" x="${x(v)}" y="${d.h - 7}">${pct(v, 0)}</text>`; });
      el.innerHTML = html;
    }
    $('length-index').addEventListener('input', render); $('threshold').addEventListener('input', render);
    new ResizeObserver(render).observe($('cdf-chart')); render();
  }
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'order') order();
  else if (mode === 'enumeration') enumeration();
  else if (mode === 'convergence') convergence();
  else if (mode === 'ensemble') ensemble();
  else if (mode === 'probability') probability();
  else walk();
  if ($('condition')) customizeSelect($('condition'));
})();
