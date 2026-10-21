(() => {
  'use strict';
  const M = window.Tridiagonal, root = document.getElementById('lab'), $ = id => document.getElementById(id);
  const fmt = x => x === null ? '—' : !Number.isFinite(x) ? '不可用' : x === 0 ? '0' : Math.abs(x) < .0001 || Math.abs(x) >= 1e7 ? x.toExponential(3) : Number(x.toPrecision(6)).toString();
  const integer = x => x.toLocaleString('zh-CN');
  const frame = window.frameElement;
  let timer;
  function syncTheme() {
    let dark = matchMedia('(prefers-color-scheme: dark)').matches;
    try { if (parent !== window) dark = parent.document.body.classList.contains('dark-mode'); } catch (_) {}
    document.documentElement.classList.toggle('dark', dark);
  }
  const media = matchMedia('(prefers-color-scheme: dark)');
  media.addEventListener('change', syncTheme); syncTheme();
  let themeObserver;
  try {
    if (parent !== window) { themeObserver = new MutationObserver(syncTheme); themeObserver.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] }); }
  } catch (_) {}
  const resizeObserver = new ResizeObserver(() => { if (frame) frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 3}px`; });
  resizeObserver.observe(root);
  function stop() { clearInterval(timer); timer = null; if ($('play')) $('play').textContent = '播放过程'; }
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });
  let intersection;
  if (frame) {
    intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); });
    intersection.observe(frame);
  }
  window.addEventListener('pagehide', () => { stop(); resizeObserver.disconnect(); themeObserver?.disconnect(); intersection?.disconnect(); media.removeEventListener('change', syncTheme); }, { once: true });
  const header = (n, title, intro) => `<p class="eyebrow">实验 ${n} / 三对角与追赶法</p><h1>${title}</h1><p class="intro">${intro}</p>`;
  function matrix(a, b, c, selected) {
    const n = b.length;
    return `<table class="matrix"><caption>系数矩阵 A · 第 ${selected + 1} 行已标出</caption><tbody>${b.map((_, i) => `<tr class="${i === selected ? 'selected' : ''}">${b.map((_, j) => {
      const v = j === i ? b[i] : j === i - 1 ? a[i] : j === i + 1 ? c[i] : 0;
      return `<td class="${v === 0 ? 'zero' : j === i ? 'diag' : ''}">${fmt(v)}</td>`;
    }).join('')}</tr>`).join('')}</tbody></table>`;
  }
  function structure() {
    root.innerHTML = header('01', '先试一组温度，再检查每个点', '左端固定 0 ℃。每个内部点必须等于左右邻点的平均。修改试算温度，检查哪里不平衡；可保存一组结果后继续改进。默认的 50 ℃ 只是起始试算。') +
      '<div class="toolbar"><label for="n">内部点数<select id="n"><option>3</option><option selected>4</option><option>6</option></select></label></div>' +
      '<label class="field" for="right">右端温度：<output id="right-value">100</output> ℃<input id="right" type="range" min="0" max="100" step="10" value="100"></label>' +
      '<div id="trial-inputs" class="trial-inputs" role="group" aria-label="填写内部点的试算温度"></div>' +
      '<div class="toolbar"><button id="inspect" class="primary">检查当前试算</button><button id="save-trial">保留本次对照</button><button id="solve-trial">载入方程组的解</button></div>' +
      '<p id="balance" class="status" role="status"></p><p id="saved-trial" class="note"></p>' +
      '<details class="hint"><summary>提示一：先看偏差最大的位置</summary><p>正偏差表示该点比左右邻点的平均温度更高，负偏差表示更低。修改一个点也会影响邻点，调完后要重新检查所有点。</p></details>' +
      '<details class="hint"><summary>提示二：把平均关系改写成温差</summary><p>若每个点都平衡，自己减左邻，应等于右邻减自己。试着让每段温差相同；n 个内部点连同两端共有 n+1 段。也可以直接载入解，再与自己保存的试算比较。</p></details>' +
      '<div class="scroll"><div class="rod" id="rod" role="group" aria-label="选择内部温度节点"></div></div><p class="note">图中显示当前试算，实色按钮表示选中节点。下面只核对该节点的一条方程。</p>' +
      '<p id="equation" class="formula"></p><p id="structure-note" class="status"></p><details class="hint"><summary>查看这一行在系数矩阵中的位置</summary><div class="scroll" id="matrix"></div></details>';
    let selected = 1, trial = Array(4).fill(50), inspected = false, saved = null;
    function current() { return { n: +$('n').value, right: +$('right').value }; }
    function readTrial() {
      const fields = Array.from($('trial-inputs').querySelectorAll('input'));
      if (fields.some(e => e.value.trim() === '' || !e.checkValidity() || !Number.isFinite(+e.value))) {
        $('balance').textContent = '请把每个试算温度填写为 −1000 到 1000 ℃ 之间的有限数。'; return false;
      }
      trial = fields.map(e => +e.value); return true;
    }
    function summarize() {
      const { n, right } = current(), h = M.heat(n, 0, right), b = M.heatBalance(trial, 0, right);
      $('right-value').textContent = right;
      $('rod').innerHTML = `<div class="end">左端<small>0 ℃</small></div>${trial.map((v, i) => `<div><button data-node="${i}" aria-pressed="${i === selected}" aria-label="选择第 ${i + 1} 个内部点">x${i + 1}</button><small>${fmt(v)} ℃</small></div>`).join('')}<div class="end">右端<small>${right} ℃</small></div>`;
      $('rod').querySelectorAll('button').forEach(button => button.onclick = () => { selected = +button.dataset.node; summarize(); $('rod').querySelector(`[data-node="${selected}"]`).focus(); });
      $('matrix').innerHTML = matrix(h.a, h.b, h.c, selected);
      $('equation').textContent = `${selected ? `−x${selected} + ` : ''}2x${selected + 1}${selected + 1 < n ? ` − x${selected + 2}` : ''} = ${h.d[selected]}`;
      $('structure-note').textContent = inspected ? `当前 x${selected + 1} = ${fmt(trial[selected])} ℃，与左右邻点平均值之差为 ${fmt(b.difference[selected])} ℃（正数表示更高，负数表示更低）。` : `第 ${selected + 1} 行只涉及自己及相邻未知数；首尾已知温度移入右端。检查后可查看当前试算在这里的偏差。`;
      const tolerance = 1e-10 * Math.max(1, right, ...trial.map(Math.abs));
      $('balance').textContent = inspected ? `相对邻点平均的最大绝对偏差：${fmt(b.maxDifference)} ℃。${b.maxDifference <= tolerance ? `在当前双精度、${fmt(tolerance)} ℃ 的检查容差内，每个点均已平衡。` : `偏差最大的点：${b.difference.map((v, i) => Math.abs(v) === b.maxDifference ? `x${i + 1}` : null).filter(Boolean).join('、')}。点击对应节点查看局部关系。`}` : '尚未检查这组试算。可先修改任意节点，再检查整根细杆的局部平衡。';
      $('saved-trial').textContent = saved ? `已保留：${saved.n} 个内部点，右端 ${saved.right} ℃，试算 (${saved.trial.map(fmt).join(', ')})，最大偏差 ${fmt(saved.max)} ℃。${saved.n === n && saved.right === right ? inspected ? `当前最大偏差 ${fmt(b.maxDifference)} ℃，可直接与上次比较。` : '修改后再次检查，即可与这组结果比较。' : '当前节点数或边界不同，对照时需同时考虑输入条件。'}` : '尚未保留结果；可以先留下一组，再修改温度比较偏差。';
    }
    function drawInputs() {
      $('trial-inputs').innerHTML = trial.map((v, i) => `<label for="trial-${i}">x${i + 1}（℃）<input id="trial-${i}" type="number" step="any" min="-1000" max="1000" required value="${v}"></label>`).join('');
      $('trial-inputs').querySelectorAll('input').forEach(e => e.oninput = () => { inspected = false; if (readTrial()) summarize(); });
      summarize();
    }
    $('inspect').onclick = () => { if (readTrial()) { inspected = true; summarize(); } };
    $('save-trial').onclick = () => { if (readTrial()) { const { n, right } = current(); saved = { n, right, trial: [...trial], max: M.heatBalance(trial, 0, right).maxDifference }; inspected = true; summarize(); } };
    $('solve-trial').onclick = () => { const { n, right } = current(), h = M.heat(n, 0, right); trial = [...h.exact]; inspected = true; drawInputs(); };
    $('n').onchange = () => { const { n } = current(); trial = Array(n).fill(50); selected = Math.min(selected, n - 1); inspected = false; drawInputs(); };
    $('right').oninput = () => { inspected = false; if (readTrial()) summarize(); };
    drawInputs();
  }
  function sweep() {
    root.innerHTML = header('02', '先消去左邻，再从末行回代', '表中 a、u、c 是当前行的三个系数，r 是当前右端。被处理的行有底色及“←”标记；计算保留完整双精度，显示约 6 位有效数字。') +
      '<div class="toolbar"><label for="preset">输入<select id="preset"><option value="heat">4 个温度点</option><option value="other">非对称、严格占优</option></select></label></div>' +
      '<div class="toolbar"><button id="prev">上一步</button><button id="next" class="primary">下一步</button><button id="play">播放过程</button><button id="reset">重置</button></div>' +
      '<span id="phase" class="badge"></span><div class="scroll"><table><caption>每次只更新当前一行；a 已消为 0 的位置保留显示。</caption><thead><tr><th>行</th><th>a 左邻</th><th>u 自己</th><th>c 右邻</th><th>r 右端</th></tr></thead><tbody id="rows"></tbody></table></div>' +
      '<p class="formula" id="operation" role="status"></p><div id="solution" class="solution" aria-label="已回代求出的未知数"></div><p id="sweep-note" class="note"></p><p class="note">自动播放每 1.5 秒展示一个算法步骤，仅用于阅读，不表示实际运行时间。可暂停、回看；默认不自动播放。</p>';
    let input, result, position;
    function render() {
      const s = result.states[position], n = input.b.length;
      $('phase').textContent = `${position}/${result.states.length - 1} · ${s.phase}${s.row >= 0 ? ` · 第 ${s.row + 1} 行` : ''}`;
      $('rows').innerHTML = s.u.map((v, i) => `<tr class="${i === s.row ? 'selected' : ''}"><th>${i + 1}${i === s.row ? ' ←' : ''}</th><td>${fmt(s.lower[i])}</td><td>${fmt(v)}</td><td>${fmt(input.c[i])}</td><td>${fmt(s.r[i])}</td></tr>`).join('');
      if (!position) $('operation').textContent = '先保留第 1 行；下一步用它消去第 2 行中的 x1。';
      else if (s.phase === '向前消元') {
        const old = result.states[position - 1], i = s.row, m = s.note.m;
        $('operation').textContent = `m${i + 1} = ${fmt(input.a[i])} ÷ ${fmt(old.u[i - 1])} = ${fmt(m)}；第 ${i + 1} 行减去 (${fmt(m)}) × 第 ${i} 行。u = ${fmt(old.u[i])} − (${fmt(m)}) × (${fmt(input.c[i - 1])}) = ${fmt(s.u[i])}；r = ${fmt(old.r[i])} − (${fmt(m)}) × (${fmt(old.r[i - 1])}) = ${fmt(s.r[i])}。`;
      } else {
        const i = s.row;
        $('operation').textContent = i === n - 1 ? `末行只有一个未知数：x${n} = ${fmt(s.r[i])} ÷ ${fmt(s.u[i])} = ${fmt(s.x[i])}。` : `右邻 x${i + 2} 已知：x${i + 1} = [${fmt(s.r[i])} − (${fmt(input.c[i])}) × ${fmt(s.x[i + 1])}] ÷ ${fmt(s.u[i])} = ${fmt(s.x[i])}。`;
      }
      $('solution').innerHTML = s.x.map((v, i) => `<span class="${v !== null ? 'known' : ''}">x${i + 1} = ${fmt(v)}</span>`).join('');
      $('sweep-note').textContent = position === result.states.length - 1 ? `完成。代回原始方程的最大绝对残差 = ${fmt(M.residual(input.a, input.b, input.c, input.d, result.x))}。${$('preset').value === 'other' ? '此例的解析解为 (1, 2, 3, 4)。' : '温度按 ℃ 计。'}` : s.phase === '向前消元' ? '前面各行的关系仍然保留；当前行的左邻系数被消去，上对角系数没有改变。' : '“—”表示尚未回代求出，不表示该未知数等于 0。';
      $('prev').disabled = position === 0; $('next').disabled = position === result.states.length - 1;
    }
    function setup() {
      stop(); position = 0;
      input = $('preset').value === 'heat' ? M.heat(4) : { a: [0, -1, 2, -2], b: [4, 5, 6, 5], c: [1, -1, 2, 0], d: [6, 6, 30, 14] };
      result = M.solve(input.a, input.b, input.c, input.d, true); render();
    }
    $('prev').onclick = () => { stop(); position--; render(); };
    $('next').onclick = () => { stop(); position++; render(); };
    $('reset').onclick = setup; $('preset').onchange = setup;
    $('play').onclick = () => {
      if (timer) { stop(); return; }
      if (position === result.states.length - 1) position = 0;
      render(); $('play').textContent = '暂停';
      timer = setInterval(() => { position++; render(); if (position === result.states.length - 1) stop(); }, 1500);
    };
    setup();
  }
  function cost() {
    root.innerHTML = header('03', '三条带，省去整张零元素表', '改变未知数个数 n。读数由公式直接计算；存储只比较系数矩阵，不含右端、输出或容器开销。') +
      '<label class="field" for="scale">未知数个数 n = <output id="n-value">10000</output><input id="scale" type="range" min="1" max="6" step="1" value="4"></label>' +
      '<div class="stats"><div><p class="stat-label">追赶法算术次数 · 8n−7</p><p id="ops" class="stat-value"></p></div><div><p class="stat-label">规模翻倍后的算术次数</p><p id="twice" class="stat-value"></p></div></div>' +
      '<div class="storage"><div class="storage-line"><span>三对角 · 3n−2 个数</span><strong id="band"></strong></div><div class="track"><div class="fill" id="band-bar"></div></div><div class="storage-line"><span>稠密 · n² 个数</span><strong id="dense"></strong></div><div class="track"><div class="fill dense" style="width:100%"></div></div></div>' +
      '<p class="status" id="ratio" role="status"></p><p class="note">条长按保存的数的个数使用共同线性尺度；过短的条保留 2 像素可见标记，精确比值看读数。按每数 8 字节、十进制 MB 估算，不实际分配这些数组。</p><p class="note">普通稠密高斯消元的主要算术量随 n³ 增长；本实验没有测量任何方法的实际耗时。</p>';
    function render() {
      const n = 10 ** +$('scale').value, k = M.counts(n);
      $('n-value').textContent = integer(n); $('ops').textContent = integer(k.operations); $('twice').textContent = integer(M.counts(2 * n).operations);
      $('band').textContent = `${integer(k.band)} · ${fmt(8 * k.band / 1e6)} MB`; $('dense').textContent = `${integer(k.dense)} · ${fmt(8 * k.dense / 1e6)} MB`;
      $('band-bar').style.width = `${100 * k.band / k.dense}%`;
      $('ratio').textContent = `同一矩阵，稠密存储是三对角存储的 ${fmt(k.dense / k.band)} 倍；n 翻倍，追赶法算术次数约翻倍，而稠密矩阵的元素数变为 4 倍。`;
    }
    $('scale').oninput = render; render();
  }
  function pivot() {
    root.innerHTML = header('04', '方程可解，不代表主元合适', '共同输入为 εx1 + x2 = 1、x1 + x2 = 2。只改变 ε，比较不换行与先交换两行后的结果。') +
      '<div class="toolbar"><label for="epsilon">左上角系数 ε<select id="epsilon"><option value="zero">0 · 零主元</option><option value="2" selected>10⁻²</option><option value="8">10⁻⁸</option><option value="12">10⁻¹²</option><option value="16">10⁻¹⁶</option><option value="18">10⁻¹⁸</option></select></label></div>' +
      '<p class="formula" id="reference"></p><p id="previous-pivot" class="note"></p><div class="comparison"><section class="bad"><span class="badge">不换行 · 追赶法</span><div id="plain"></div></section><section><span class="badge">先交换两行</span><div id="pivoted"></div></section></div>' +
      '<p class="status" id="pivot-note" role="status"></p><details class="hint"><summary>提示：先比较哪一项中间量？</summary><p>两边的消元倍数分别为 1/ε 与 ε。比较它们的大小，再回看消元后的相减及最后的除法。非零只能保证除法有定义，不能保证舍入误差小。</p></details><p class="note">解误差：相对解析参考值的最大绝对差。残差：原始两条方程左右两侧差的最大绝对值。0 表示当前双精度计算得 0，不能据此宣称无限精度下严格无误差。</p>';
    function metrics(x, v) { return `<p class="metric">求得 (x1, x2)<b>(${fmt(x[0])}, ${fmt(x[1])})</b></p><p class="metric">最大绝对解误差<b>${fmt(v.error)}</b></p><p class="metric">最大绝对残差<b>${fmt(v.residual)}</b></p>`; }
    let previous = null;
    function render() {
      const epsilon = $('epsilon').value === 'zero' ? 0 : 10 ** -Number($('epsilon').value), p = M.pivotExample(epsilon);
      $('previous-pivot').textContent = previous ? `上一次 ε = ${fmt(previous.epsilon)}：不换行${previous.error === null ? '未输出解' : `最大解误差 ${fmt(previous.error)}`}；交换两行后最大解误差 ${fmt(previous.pivotedError)}。` : '先观察当前输入，再自行选择一个更小的非零 ε 或零主元，检验结果是否仍可靠。';
      $('reference').textContent = `ε = ${fmt(epsilon)}；解析参考 (x1, x2) ≈ (${fmt(p.exact[0])}, ${fmt(p.exact[1])})`;
      $('plain').innerHTML = p.plain ? `<p class="note">第一主元 ${fmt(epsilon)}；消元倍数 ${fmt(p.multiplier)}</p>${metrics(p.plain, p.plainMetrics)}` : '<p class="metric"><b>停止：第一主元为 0</b></p><p class="note">下一步要算 1 ÷ 0。未输出解，误差与残差不适用。</p>';
      $('pivoted').innerHTML = `<p class="note">第一主元 1；消元倍数 ${fmt(epsilon)}</p>${metrics(p.pivoted, p.pivotedMetrics)}`;
      $('pivot-note').textContent = !epsilon ? '观察：不换行版本停止；交换两行仍得到解。原方程的唯一解是 (1, 1)。' : `观察：本次两种方法的最大解误差分别为 ${fmt(p.plainMetrics.error)} 与 ${fmt(p.pivotedMetrics.error)}。可与上一次输入比较，再决定检验哪个 ε。`;
      previous = { epsilon, error: p.plainMetrics ? p.plainMetrics.error : null, pivotedError: p.pivotedMetrics.error };
    }
    $('epsilon').onchange = render; render();
  }
  const mode = new URLSearchParams(location.search).get('mode') || 'structure';
  ({ structure, sweep, cost, pivot }[mode] || structure)();
})();
