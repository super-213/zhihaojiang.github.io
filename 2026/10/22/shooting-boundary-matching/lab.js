(() => {
  'use strict';
  const M = window.Shooting, root = document.getElementById('lab'), $ = id => document.getElementById(id);
  const fmt = x => x === null || x === undefined ? '—' : x === 0 ? '0' : Math.abs(x) < 1e-4 || Math.abs(x) >= 1e5 ? x.toExponential(4) : Number(x.toPrecision(7)).toString();
  const frame = window.frameElement, media = matchMedia('(prefers-color-scheme: dark)');
  let timer = null, redraw = () => {};
  function theme() {
    let dark = media.matches;
    try { if (parent !== window) dark = parent.document.body.classList.contains('dark-mode'); } catch (_) {}
    document.documentElement.classList.toggle('dark', dark);
  }
  media.addEventListener('change', theme); theme();
  let themeObserver, intersection;
  try {
    if (parent !== window) { themeObserver = new MutationObserver(theme); themeObserver.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] }); }
  } catch (_) {}
  const resize = new ResizeObserver(() => { if (frame) frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 4}px`; });
  resize.observe(root);
  function stop() { clearInterval(timer); timer = null; if ($('play')) $('play').textContent = '播放过程'; }
  function visibility() { if (document.hidden) stop(); }
  document.addEventListener('visibilitychange', visibility);
  function onResize() { redraw(); }
  window.addEventListener('resize', onResize);
  if (frame) { intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }); intersection.observe(frame); }
  window.addEventListener('pagehide', () => { stop(); resize.disconnect(); themeObserver?.disconnect(); intersection?.disconnect(); media.removeEventListener('change', theme); window.removeEventListener('resize', onResize); document.removeEventListener('visibilitychange', visibility); }, { once: true });
  const header = (n, title, intro) => `<p class="eyebrow">实验 ${n} / 边界条件匹配</p><h1>${title}</h1><p class="intro">${intro}</p>`;
  const stats = labels => `<dl class="stats">${labels.map(([id, title]) => `<div><dt>${title}</dt><dd id="${id}"></dd></div>`).join('')}</dl>`;
  const graph = '<svg id="chart" class="chart" role="img" aria-label="当前试射与对照曲线"></svg><p id="chart-scale" class="scale"></p>';
  const legend = (solid, dashed) => `<div class="legend"><span>${solid}</span><span class="dashed">${dashed}</span></div>`;
  function plot(series, beta, description) {
    const el = $('chart'), w = Math.max(260, el.getBoundingClientRect().width || 640), h = 250;
    const l = 51, r = w - 22, t = 20, b = h - 36;
    const values = [0, beta, ...series.flatMap(s => s.points.map(p => p[1]))];
    let low = Math.min(...values), high = Math.max(...values);
    const pad = Math.max(.1, (high - low) * .14); low -= pad; high += pad;
    const X = x => l + x * (r - l), Y = y => b - (y - low) / (high - low) * (b - t);
    el.setAttribute('viewBox', `0 0 ${w} ${h}`);
    el.setAttribute('aria-label', description);
    el.innerHTML = `<title>${description}</title>` +
      Array.from({ length: 5 }, (_, i) => { const v = low + (high - low) * i / 4; return `<path class="grid" d="M${l},${Y(v)}H${r}"/><text x="${l - 7}" y="${Y(v) + 4}" text-anchor="end">${Number(v.toPrecision(3))}</text>`; }).join('') +
      `<path class="axis" d="M${l},${t}V${b}H${r}"/>` +
      [0, .5, 1].map(x => `<text x="${X(x)}" y="${b + 20}" text-anchor="middle">${x}</text>`).join('') +
      `<text x="${l}" y="12">y</text><text x="${r + 12}" y="${b + 20}">x</text>` +
      series.map(s => `<path class="${s.dashed ? 'comparison' : 'curve'}" d="${s.points.map(([x, y], i) => `${i ? 'L' : 'M'}${X(x).toFixed(2)},${Y(y).toFixed(2)}`).join(' ')}"/>`).join('') +
      `<circle class="target" cx="${X(1)}" cy="${Y(beta)}" r="5"/>`;
    $('chart-scale').textContent = `横轴 x ∈ [0,1]；纵轴 y 自动取范围。右端空心圆：目标 β = ${fmt(beta)}。${description}`;
  }
  function aim() {
    root.innerHTML = header('01', '调整出发斜率，观察落点', '固定 y(0)=0、y″=−2。先选一个斜率 s，再保留曲线，与下一次试射比较。所有量均无量纲；曲线由解析式计算。') +
      '<label for="slope">出发斜率 s = <output id="slope-value"></output><input id="slope" type="range" min="-1" max="4" step="0.05" value="0.5"></label>' +
      '<label for="target">右端目标 β<select id="target"><option value="0">0 · 回到同一高度</option><option value="1">1 · 终点更高</option><option value="-0.5">−0.5 · 终点更低</option></select></label>' +
      stats([['end', '实际落点 y(1;s)'], ['residual', '有符号残差：落点 − 目标']]) + graph + legend('当前试射', '保留的试射') +
      '<div class="toolbar"><button id="save" class="primary">保留这次试射</button><button id="reset">重置</button></div><p id="saved" class="saved"></p>' +
      '<p id="feedback" class="status" role="status"></p><details class="hint"><summary>提示一：先找一高一低的两次试射</summary><p>残差为正表示落点高于目标，为负表示低于目标。保留一条曲线，再改变斜率，观察右端往哪个方向移动。</p></details><details class="hint"><summary>提示二：斜率增加 0.5，落点改变多少？</summary><p>本例 y(x;s)=sx−x²，右端 y(1;s)=s−1。要匹配 β，应取 s=β+1。这个简单关系只适用于当前方程。</p></details>';
    let saved = null;
    function render() {
      const s = +$('slope').value, beta = +$('target').value, shot = M.parabola(s, beta);
      $('slope-value').textContent = fmt(s); $('end').textContent = fmt(shot.end); $('residual').textContent = fmt(shot.residual);
      const series = [{ points: shot.points }]; if (saved) series.push({ points: saved.points, dashed: true });
      redraw = () => plot(series, beta, '实线为当前轨迹；虚线为已保留轨迹。'); redraw();
      $('saved').textContent = saved ? `已保留 s=${fmt(saved.s)}，β=${fmt(saved.beta)}，落点 ${fmt(saved.end)}，当时残差 ${fmt(saved.residual)}。${saved.beta !== beta ? '目标已改变；曲线可比较，但两次残差针对不同目标。' : '两次试射使用相同方程和目标，可比较落点。'}` : '尚未保留试射；可先保留一次偏低或偏高的结果。';
      $('feedback').textContent = Math.abs(shot.residual) < 1e-12 ? '在当前双精度与 10⁻¹² 的显示判定内命中目标。可改变 β，检验原斜率是否仍合适。' : `当前落点${shot.residual > 0 ? '高于' : '低于'}目标 ${fmt(Math.abs(shot.residual))}。下一次斜率由你选择。`;
    }
    $('slope').oninput = render; $('target').onchange = render;
    $('save').onclick = () => { const s = +$('slope').value, beta = +$('target').value; saved = { s, beta, ...M.parabola(s, beta) }; render(); };
    $('reset').onclick = () => { saved = null; $('slope').value = .5; $('target').value = '0'; render(); };
    render();
  }
  function match() {
    root.innerHTML = header('02', '把落点偏差交给二分法', '现在换成 y″=y，仍从 y(0)=0 出发，目标 y(1)=1。每次试射都用 N 步四阶 RK4。先选斜率区间，再观察哪一半被排除。') +
      '<div class="toolbar"><label for="bracket">初始斜率区间<select id="bracket"><option value="0,2">[0,2]</option><option value="1,2">[1,2]</option><option value="0,0.5">[0,0.5]</option><option value="-1,2">[−1,2]</option></select></label><label for="steps">积分步数 N<select id="steps"><option>4</option><option selected>8</option><option>16</option><option>32</option></select></label></div>' +
      '<div class="toolbar"><button id="prev">上一步</button><button id="next" class="primary">下一步</button><button id="play">播放过程</button><button id="finish">看停止状态</button><button id="reset">重置当前设置</button></div>' +
      '<p id="phase" class="status" role="status"></p><p class="equation" id="bracket-state"></p>' +
      stats([['trial', '本轮试射斜率 s'], ['nr', 'RK4 数值端点残差 Rₕ'], ['er', '同一 s 的解析端点残差 R'], ['ge', '网格最大绝对解误差 Eₕ']]) + graph + legend('当前 RK4 试射', '边值问题解析参考解') +
      '<p id="previous" class="saved"></p><div class="scroll"><table><caption>最近 6 轮；下一轮区间来自残差的符号。显示约 7 位有效数字。</caption><thead><tr><th>轮次</th><th>s</th><th>Rₕ(s)</th><th>保留区间</th></tr></thead><tbody id="rows"></tbody></table></div>' +
      '<details class="hint"><summary>提示：端点都偏高，能否直接二分？</summary><p>异号且连续，才能保证区间中至少有一个零点。同号只说明当前区间没有这个保证；不能据此宣布整个边值问题无解。</p></details><p class="note">停止规则：|Rₕ|≤10⁻¹⁰，最多 40 轮；另报区间不包根、数值异常或浮点停滞。播放每 1.2 秒展示一轮，仅用于阅读。改变设置会暂停并重新计算。Eₕ 只在当前网格节点上取最大值；计算均为 JavaScript 双精度。</p>';
    let result, position = 0, previous = null, n;
    function current() { const state = result.states[position]; return state ? { state, value: M.metrics(state.s, n) } : null; }
    function render() {
      const c = current();
      const failed = !c;
      $('prev').disabled = failed || position === 0; $('next').disabled = failed || position === result.states.length - 1;
      $('play').disabled = failed || result.states.length < 2; $('finish').disabled = failed;
      if (failed) {
        $('phase').textContent = result.status === 'unbracketed' ? `区间未包根：两端 Rₕ 分别为 ${fmt(result.flo)}、${fmt(result.fhi)}，同号，未开始二分。` : '积分或残差出现非有限数，停止。';
        for (const id of ['trial', 'nr', 'er', 'ge']) $(id).textContent = '—';
        $('bracket-state').textContent = '请重新选择区间；这不是“边值问题无解”的判定。'; $('rows').innerHTML = '';
        redraw = () => plot([{ points: M.hyperbolic(0, n).points }, { points: Array.from({ length: 81 }, (_, i) => [i / 80, Math.sinh(i / 80) / Math.sinh(1)]), dashed: true }], 1, '未迭代；实线仅显示 s=0 的参考试射。');
      } else {
        const { state: st, value: v } = c, last = position === result.states.length - 1;
        const status = { residual: '满足数值残差容差', limit: '达到迭代上限，未满足容差', stagnated: '浮点区间停滞', nonfinite: '出现非有限数，停止' }[result.status];
        $('phase').textContent = `第 ${position + 1} 轮 · ${st.decision}。${last ? status + '。' : ''}`;
        $('bracket-state').textContent = `本轮区间 [${fmt(st.lo)}, ${fmt(st.hi)}] → 保留 [${fmt(st.nextLo)}, ${fmt(st.nextHi)}]；本轮宽度 ${fmt(st.hi-st.lo)}；h=1/${n}`;
        $('trial').textContent = fmt(st.s); $('nr').textContent = fmt(v.numericalResidual); $('er').textContent = fmt(v.exactResidual); $('ge').textContent = fmt(v.gridError);
        $('rows').innerHTML = result.states.slice(Math.max(0, position - 5), position + 1).map((s, i) => `<tr class="${s === st ? 'current' : ''}"><td>${Math.max(0, position - 5) + i + 1}</td><td>${fmt(s.s)}</td><td>${fmt(s.r)}</td><td>[${fmt(s.nextLo)}, ${fmt(s.nextHi)}]</td></tr>`).join('');
        redraw = () => plot([{ points: v.shot.points }, { points: Array.from({ length: 121 }, (_, i) => [i / 120, Math.sinh(i / 120) / Math.sinh(1)]), dashed: true }], 1, '实线是数值积分节点的连线；虚线为解析参考。');
      }
      $('previous').textContent = previous ? `上一组：N=${previous.n}，第 ${previous.round} 轮，s=${fmt(previous.s)}，|Rₕ|=${fmt(Math.abs(previous.nr))}，Eₕ=${fmt(previous.ge)}。比较精度时，先让两组都达到停止状态。` : '可先看停止状态，再改变 N；这里会保留上一组结果供比较。';
      redraw();
    }
    function setup(keep) {
      stop(); if (keep && result) { const c = current(); if (c) previous = { n, round: position + 1, s: c.state.s, nr: c.value.numericalResidual, ge: c.value.gridError }; }
      n = +$('steps').value; result = M.solveHyperbolic(n, ...$('bracket').value.split(',').map(Number)); position = 0; render();
    }
    $('next').onclick = () => { stop(); if (position < result.states.length - 1) position++; render(); };
    $('prev').onclick = () => { stop(); if (position > 0) position--; render(); };
    $('finish').onclick = () => { stop(); position = result.states.length - 1; render(); };
    $('reset').onclick = () => setup(false); $('steps').onchange = $('bracket').onchange = () => setup(true);
    $('play').onclick = () => {
      if (timer) { stop(); return; }
      if (position === result.states.length - 1) position = 0;
      render(); $('play').textContent = '暂停';
      timer = setInterval(() => { position++; render(); if (position >= result.states.length - 1) stop(); }, 1200);
    };
    setup(false);
  }
  function boundary() {
    root.innerHTML = header('03', '落点接近零，曲线也接近零吗', '固定 y″=−k²y、y(0)=0。先改变 s，观察右端与区间内部，再切换 k 和目标 β。这里使用解析曲线，不混入积分误差。') +
      '<div class="toolbar"><label for="k">方程参数 k<select id="k"><option value="2">2</option><option value="3.14" selected>3.14 · 接近 π</option><option value="pi">π · 精确符号情形</option><option value="3.15">3.15</option></select></label><label for="beta">右端目标 β<select id="beta"><option value="0">0</option><option value="1">1</option></select></label></div>' +
      '<label for="slope">当前斜率 s = <output id="slope-value"></output><input id="slope" type="range" min="-4" max="4" step="0.1" value="1"></label>' +
      stats([['coefficient', '斜率到落点的系数 sin(k)/k'], ['residual', '当前端点残差 R(s)']]) + graph + legend('当前试射', 's=0 曲线 / 已匹配曲线') +
      '<div class="toolbar"><button id="inspect" class="primary">检查边界能否匹配</button><button id="reset">重置</button></div><p id="diagnosis" class="status" role="status"></p>' +
      '<details class="hint"><summary>提示一：比较中点与右端</summary><p>当 k=3.14、β=0 时，非零斜率的曲线可能在右端接近 0，在中间却离 0 较远。残差只测量右端，没有直接测量整条曲线。</p></details><details class="hint"><summary>提示二：把 π 的情形代入公式</summary><p>y(1;s)=s sin(k)/k。精确 k=π 时，无论 s 怎样取，右端都为 0。因此 β=0 有无穷多解，β=1 无解。3.14 不是 π；非零但很小的分母不能当成 0。</p></details><p class="note">“π”选项按数学上的精确 π 处理端点系数，显示为严格 0；内部绘图用双精度三角函数采样。这是符号情形的演示，不是用浮点阈值自动判断奇异。纵轴会随曲线调整。</p>';
    let inspected = false;
    function render() {
      const s = +$('slope').value, beta = +$('beta').value, o = M.oscillator($('k').value, s, beta);
      $('slope-value').textContent = fmt(s); $('coefficient').textContent = fmt(o.coefficient); $('residual').textContent = fmt(o.residual);
      let other = M.oscillator($('k').value, 0, beta);
      if (inspected && o.kind === 'unique') other = M.oscillator($('k').value, o.matchedSlope, beta);
      redraw = () => plot([{ points: o.points }, { points: other.points, dashed: true }], beta, inspected && o.kind === 'unique' ? '虚线改为边界匹配解；两条曲线使用同一纵轴。' : '虚线为 s=0 的对照曲线。'); redraw();
      $('diagnosis').textContent = !inspected ? `当前中点 y(0.5;s)=${fmt(s * Math.sin(o.k / 2) / o.k)}，右端残差=${fmt(o.residual)}。先比较这两个读数，再检查可解性。` : o.kind === 'family' ? '无穷多解：每个 s 都满足两端条件；不同曲线都命中，不存在唯一参考解。' : o.kind === 'none' ? '无解：所有试射的右端都为 0，无法匹配 β=1。继续调整斜率不能解决。' : `唯一匹配斜率 s*=${fmt(o.matchedSlope)}。${Math.abs(o.coefficient) < .01 ? '系数很小；β 从 0 改成 1，会需要很大的斜率和内部幅度。' : '当前系数非零，可以通过它求出唯一斜率。'}`;
    }
    $('slope').oninput = $('k').onchange = $('beta').onchange = () => { inspected = false; render(); };
    $('inspect').onclick = () => { inspected = true; render(); };
    $('reset').onclick = () => { $('k').value = '3.14'; $('beta').value = '0'; $('slope').value = '1'; inspected = false; render(); };
    render();
  }
  function sensitivity() {
    root.innerHTML = header('04', '相同的斜率偏差，放大多少', '方程 y″=λ²y，边界 y(0)=1、y(1)=0。只给正确初始斜率增加同一个 δs=10⁻⁸，观察增大 λ 后的端点偏差。') +
      '<label for="lambda">参数 λ = <output id="lambda-value"></output><input id="lambda" type="range" min="1" max="30" step="1" value="8"></label>' +
      stats([['gain', '端点放大倍数 sinh(λ)/λ'], ['error', '固定 δs 导致的端点偏差']]) + graph + legend('斜率偏差后的精确轨迹', '原边值问题的解析解') +
      '<p id="sensitivity-note" class="status" role="status"></p><details class="hint"><summary>解释：这张图隔离了哪一种误差？</summary><p>原解为 sinh(λ(1−x))/sinh(λ)，斜率增加 δs 后，整条轨迹增加 δs·sinh(λx)/λ。图按这两个解析式计算，隔离出初始斜率扰动的放大；没有模拟某个求解器的全部舍入误差。</p></details><p class="note">两条曲线共用自动调整的纵轴；当偏差很大时，原来位于 [0,1] 的参考解会显得很平。参数改变代表不同方程，比较的是同一斜率扰动的放大倍数。</p>';
    function render() {
      const lambda = +$('lambda').value, o = M.unstable(lambda, 1e-8);
      $('lambda-value').textContent = lambda; $('gain').textContent = fmt(o.gain); $('error').textContent = fmt(o.endError);
      $('sensitivity-note').textContent = `正确出发斜率约 ${fmt(o.slope)}；δs=10⁻⁸ 始终相同，右端偏差为 ${fmt(o.endError)}。解析参考曲线仍位于 [0,1]。`;
      redraw = () => plot([{ points: o.points }, { points: o.reference, dashed: true }], 0, '实线与虚线之差由解析扰动公式计算。'); redraw();
    }
    $('lambda').oninput = render; render();
  }
  const mode = new URLSearchParams(location.search).get('mode') || 'aim';
  ({ aim, match, boundary, sensitivity }[mode] || aim)();
})();
