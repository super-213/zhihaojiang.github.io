(() => {
  'use strict';
  const M = window.RooflineLab, root = document.getElementById('lab');
  const $ = id => document.getElementById(id);
  const fmt = n => Number(n.toPrecision(6)).toLocaleString('en-US', { maximumFractionDigits: 6 });
  const media = matchMedia('(prefers-color-scheme: dark)'), reduced = matchMedia('(prefers-reduced-motion: reduce)');
  let frame = null, observer = null, intersection = null, timer = null, draw = () => {};
  try { frame = window.frameElement; } catch (_) {}
  function theme() {
    let dark = media.matches;
    try { if (parent !== window) dark = parent.document.body.classList.contains('dark-mode'); } catch (_) {}
    document.documentElement.classList.toggle('dark', dark);
  }
  function stop() { clearInterval(timer); timer = null; if ($('play')) $('play').textContent = '播放搬运'; }
  function visibility() { if (document.hidden) stop(); }
  media.addEventListener('change', theme); theme();
  try { if (parent !== window) { observer = new MutationObserver(theme); observer.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] }); } } catch (_) {}
  const resize = new ResizeObserver(() => { if (frame) frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 4}px`; });
  resize.observe(root);
  if (frame) { intersection = new IntersectionObserver(e => { if (!e[0].isIntersecting) stop(); }); intersection.observe(frame); }
  document.addEventListener('visibilitychange', visibility);
  window.addEventListener('resize', redraw);
  function redraw() { draw(); }
  window.addEventListener('pagehide', () => {
    stop(); resize.disconnect(); observer?.disconnect(); intersection?.disconnect();
    media.removeEventListener('change', theme); window.removeEventListener('resize', redraw);
    document.removeEventListener('visibilitychange', visibility);
  }, { once: true });
  const header = (n, title, intro) => `<p class="eyebrow">实验 ${n} / 从工作量到性能上限</p><h1>${title}</h1><p class="intro">${intro}</p>`;
  const stats = items => `<dl class="stats">${items.map(([id, label]) => `<div><dt>${label}</dt><dd id="${id}"></dd></div>`).join('')}</dl>`;
  const methods = '<label for="method">实现方式<select id="method"><option value="split">分两遍 · 保存临时数组 z</option><option value="fused">合并一遍 · z 留在寄存器</option></select></label>';
  const hints = (a, b) => `<details><summary>提示一：先观察什么</summary><p>${a}</p></details><details><summary>提示二：核对计算依据</summary><p>${b}</p></details>`;
  function complexity() {
    root.innerHTML = header('01', '同样的工作，不同的组织', '任务固定为 zᵢ=axᵢ+b，再计算 yᵢ=zᵢ+c。每个元素按 1 次乘法、2 次加法计数；每个数占 8 byte。先保留结果，再改变规模或实现。') +
      '<div class="controls"><label for="size">输入个数 n<output id="size-value"></output><input id="size" type="range" min="0" max="14" step="1" value="4"></label>' + methods + '</div>' +
      stats([['work', '浮点运算数 W · FLOP'], ['iterations', '循环体执行次数'], ['aux', '额外临时数组 · byte'], ['order', '固定宽度操作模型中的时间阶']]) +
      '<div class="table-scroll"><table><caption>同一实现，把规模连续翻倍</caption><thead><tr><th>规模</th><th>浮点运算数</th><th>临时数组 / byte</th></tr></thead><tbody id="growth"></tbody></table></div>' +
      '<div class="toolbar"><button class="primary" id="save">保留当前结果</button><button id="reset">重置</button></div><p class="saved" id="saved"></p><p class="status" id="feedback" role="status"></p>' +
      hints('先只把 n 翻倍，看 W 的比例；再固定 n 切换实现，看 W 与临时数组是否同时改变。', 'W=3n。分两遍的循环体共执行 2n 次，合并后执行 n 次，但每次循环做的工作不同，不能只比循环次数。这里没有计时。');
    const sizes = Array.from({ length: 15 }, (_, i) => 2 ** (i + 2)); let saved = null;
    const current = () => M.affine(sizes[+$('size').value], 8, $('method').value === 'fused');
    draw = () => {
      const r = current(); $('size').setAttribute('aria-valuetext', `${fmt(r.n)} 个元素`); $('size-value').textContent = fmt(r.n); $('work').textContent = fmt(r.work);
      $('iterations').textContent = fmt(r.iterations); $('aux').textContent = fmt(r.auxiliary); $('order').textContent = 'Θ(n) · 线性增长';
      $('growth').innerHTML = [1, 2, 4].map(k => { const v = M.affine(k * r.n, 8, r.fused); return `<tr><td>${fmt(v.n)}</td><td>${fmt(v.work)}</td><td>${fmt(v.auxiliary)}</td></tr>`; }).join('');
      $('feedback').textContent = `当前 ${r.fused ? '合并一遍' : '分两遍'}：${fmt(r.n)} 个元素 × 3 FLOP。数组规模翻倍，工作量也翻倍；切换实现会改变临时存储与循环组织。`;
      $('saved').textContent = saved ? `已保留：n=${fmt(saved.n)}，${saved.fused ? '合并' : '分两遍'}，W=${fmt(saved.work)} FLOP，临时数组 ${fmt(saved.auxiliary)} byte。当前 W / 保留 W = ${fmt(r.work / saved.work)}。` : '尚未保留结果。';
    };
    $('size').addEventListener('input', draw); $('method').addEventListener('change', draw);
    $('save').onclick = () => { saved = current(); draw(); };
    $('reset').onclick = () => { $('size').value = 4; $('method').value = 'split'; saved = null; draw(); }; draw();
  }
  function traffic() {
    root.innerHTML = header('02', '逐次核算跨主存边界的流量', '固定 n=1,000,000；数组超出缓存。每次数组读写跨主存边界一次，不计写分配。先选实现和元素大小，再逐步追踪。4 byte 与 8 byte 是两种存储精度，输出精度要求也会不同。') +
      '<div class="controls">' + methods + '<label for="bytes">单个元素大小<select id="bytes"><option value="8">8 byte · 双精度</option><option value="4">4 byte · 单精度</option></select></label></div>' +
      '<div class="flow"><div class="node">主存<br>x / z / y 数组</div><div class="arrow" id="arrow" aria-hidden="true">↔</div><div class="node">处理器侧<br>缓存与寄存器</div></div><ol class="stages" id="stages"></ol>' +
      '<div class="toolbar"><button id="prev">回看一步</button><button id="next" class="primary">下一次搬运</button><button id="play">播放搬运</button><button id="reset">回到起点</button></div>' +
      '<p id="phase" role="status" class="status"></p><div class="meter" role="progressbar" aria-label="本轮搬运完成比例" aria-valuemin="0" aria-valuemax="100" id="progress"><span id="fill"></span></div>' +
      stats([['moved', '截至当前已搬运 · MB'], ['total', '本轮全部流量 · MB'], ['intensity', '完成整项任务的算术强度 · FLOP/byte'], ['bound', '假设 B=100 GB/s，整项搬运时间下界']]) +
      '<div class="table-scroll"><table><caption>相同 n、相同元素大小的完整任务对比</caption><thead><tr><th>实现</th><th>流量 / MB</th><th>FLOP/byte</th></tr></thead><tbody id="comparison"></tbody></table></div>' +
      '<div class="toolbar"><button id="save">保留整项结果</button></div><p id="saved" class="saved"></p><p class="note">动画按“整批数组的一次读或写”推进，不展示 CPU 的逐元素时序；播放间隔不表示真实耗时。算术强度用完整任务的 W/Q，不能用半途流量去除全部工作。</p>' +
      hints('对照分两遍中的“写 z”和“读 z”，再切换合并实现，看看哪些搬运消失了。', '每项流量是 n×元素字节数。分两遍有 4 项，合并有 2 项；同一精度下都是 3n FLOP。改精度会同时改变数值表示，不能默认得到同样误差。');
    let step = 0, saved = null;
    const current = () => M.affine(1e6, +$('bytes').value, $('method').value === 'fused');
    draw = () => {
      const r = current(); step = Math.min(step, r.stages.length);
      $('stages').innerHTML = r.stages.map((s, i) => `<li class="${i < step ? 'done' : ''} ${i === step - 1 ? 'current' : ''}">${i < step ? '✓ 已搬运' : '○ 待搬运'} · ${s.text} · ${fmt(s.bytes / 1e6)} MB</li>`).join('');
      const last = r.stages[step - 1]; $('arrow').textContent = last ? last.direction === 'read' ? '→' : '←' : '↔';
      $('phase').textContent = step === 0 ? '起点：尚未计入搬运。可以先预测总流量，再逐步核对。' : `第 ${step}/${r.stages.length} 项：${last.text}。${step === r.stages.length ? '本轮全部搬运已完成。' : '下一步可继续，或回看刚才的状态。'}`;
      $('moved').textContent = fmt(r.stages.slice(0, step).reduce((q, s) => q + s.bytes, 0) / 1e6);
      $('total').textContent = fmt(r.traffic / 1e6); $('intensity').textContent = fmt(r.intensity);
      $('bound').textContent = `${fmt(r.traffic / 1e8)} ms`;
      $('fill').style.width = `${step / r.stages.length * 100}%`; $('progress').setAttribute('aria-valuenow', step / r.stages.length * 100);
      $('prev').disabled = step === 0; $('next').disabled = step === r.stages.length; $('play').disabled = step === r.stages.length || reduced.matches;
      if (reduced.matches) $('play').textContent = '减少动态效果 · 请单步';
      $('comparison').innerHTML = [false, true].map(f => { const v = M.affine(r.n, r.bytes, f); return `<tr class="${f === r.fused ? 'active' : ''}"><td>${f ? '合并' : '分两遍'}</td><td>${fmt(v.traffic / 1e6)}</td><td>${fmt(v.intensity)}</td></tr>`; }).join('');
      $('saved').textContent = saved ? `已保留：${saved.fused ? '合并' : '分两遍'}，每元素 ${saved.bytes} byte，总流量 ${fmt(saved.traffic / 1e6)} MB。${saved.bytes !== r.bytes ? '精度已改变，当前结果不再是相同数值精度的实现对比。' : `同精度下，当前流量 / 保留流量 = ${fmt(r.traffic / saved.traffic)}。`}` : '尚未保留整项结果。';
    };
    function advance() { step++; if (step >= current().stages.length) stop(); draw(); }
    $('next').onclick = () => { stop(); advance(); }; $('prev').onclick = () => { stop(); step--; draw(); };
    $('play').onclick = () => { if (timer) stop(); else { $('play').textContent = '暂停搬运'; timer = setInterval(advance, 1000); } };
    $('reset').onclick = () => { stop(); step = 0; draw(); };
    for (const id of ['method', 'bytes']) $(id).addEventListener('change', () => { stop(); step = 0; draw(); });
    $('save').onclick = () => { saved = current(); draw(); }; draw();
  }
  function roofline() {
    root.innerHTML = header('03', '选择改动，比较哪条屋顶发生变化', '所有参数都是教学假设。先保留默认点，再只改变算力或带宽；随后将强度改到 16，检查原来的判断是否仍成立。图上的点表示模型上限。') +
      '<div class="controls"><label for="preset" class="full">强度示例<select id="preset"><option value="0.1875">合并数组 · 3/16 FLOP/byte</option><option value="0.09375">分两遍数组 · 3/32 FLOP/byte</option><option value="4">块更新 b=64 · 4 FLOP/byte</option><option value="16">假设充分复用 · 16 FLOP/byte</option><option value="custom">自定强度</option></select></label>' +
      '<label for="intensity-control" class="full">算术强度 I · FLOP/byte<output id="i-value"></output><input id="intensity-control" type="range" min="-4" max="6" step="any" value="-2.415037499278844"></label>' +
      '<label for="peak">算力 Pmax · GFLOP/s<output id="p-value"></output><input id="peak" type="range" min="50" max="2000" step="50" value="1000"></label>' +
      '<label for="bandwidth">带宽 B · GB/s<output id="b-value"></output><input id="bandwidth" type="range" min="10" max="400" step="10" value="100"></label></div>' +
      '<svg id="chart" class="chart" role="img" aria-label="Roofline 双对数图"></svg><div class="legend"><span>当前屋顶与实心圆</span><span class="dashed">带宽线 IB</span><span class="compute">计算线 Pmax</span></div><p class="scale">横轴：I / FLOP/byte；纵轴：P / GFLOP/s。双对数坐标，相邻等距刻度表示固定倍数。空心方块为保留的旧参数上限，未必在当前屋顶下。</p>' +
      stats([['ceiling', '当前吞吐上限 · GFLOP/s'], ['ridge', '转折点 I* · FLOP/byte']]) +
      '<p id="feedback" class="status" role="status"></p><div class="toolbar"><button id="save" class="primary">保留当前点</button><button id="reset">恢复默认参数</button></div><p id="saved" class="saved"></p>' +
      hints('先比较 I×B 与 Pmax 的大小。哪一项更小，哪一项就构成当前屋顶。保留点可帮助比较一次只改一个条件的结果。', '上限 min(Pmax, I×B)，转折点 Pmax/B。屋顶不是实测性能；只看强度位置，不能确认实际带宽已经用满。');
    let saved = null;
    const current = () => M.roofline(2 ** +$('intensity-control').value, +$('peak').value, +$('bandwidth').value);
    function plot(r) {
      const svg = $('chart'), width = Math.max(260, svg.getBoundingClientRect().width || 640), height = 285;
      svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
      const l = 48, right = width - 16, t = 26, bottom = height - 38;
      const X = i => l + (Math.log2(i) + 4) / 10 * (right - l);
      const Y = p => bottom - (Math.log2(p) + 2) / 14 * (bottom - t);
      const points = Array.from({ length: 121 }, (_, i) => 2 ** (-4 + 10 * i / 120));
      if (r.ridge > .0625 && r.ridge < 64) { points.push(r.ridge); points.sort((a, b) => a - b); }
      const line = fn => points.map((i, k) => `${k ? 'L' : 'M'}${X(i).toFixed(2)},${Y(fn(i)).toFixed(2)}`).join(' ');
      const description = `强度 ${fmt(r.intensity)}，计算上限 ${r.peak} GFLOP/s，带宽 ${r.bandwidth} GB/s，模型上限 ${fmt(r.ceiling)} GFLOP/s。`;
      svg.setAttribute('aria-label', description);
      svg.innerHTML = `<title>${description}</title><defs><clipPath id="bounds"><rect x="${l}" y="${t}" width="${right - l}" height="${bottom - t}"/></clipPath></defs>` +
        [.5, 2, 8, 32, 128, 512, 2048].map(p => `<path class="grid" d="M${l},${Y(p)}H${right}"/><text x="${l - 6}" y="${Y(p) + 4}" text-anchor="end">${p}</text>`).join('') +
        [.0625, .25, 1, 4, 16, 64].map(i => `<path class="grid" d="M${X(i)},${t}V${bottom}"/><text x="${X(i)}" y="${bottom + 23}" text-anchor="${i === .0625 ? 'start' : i === 64 ? 'end' : 'middle'}">${i}</text>`).join('') +
        `<path class="axis" d="M${l},${t}V${bottom}H${right}"/><text x="${l}" y="14">P / GFLOP/s</text><text x="${right}" y="14" text-anchor="end">I / FLOP/byte →</text><g clip-path="url(#bounds)"><path class="memory-guide" d="${line(i => i * r.bandwidth)}"/><path class="compute-guide" d="M${l},${Y(r.peak)}H${right}"/><path class="roof" d="${line(i => Math.min(r.peak, i * r.bandwidth))}"/>` +
        (saved ? `<rect class="saved-point" x="${X(saved.intensity) - 5}" y="${Y(saved.ceiling) - 5}" width="10" height="10"/>` : '') +
        `<circle class="point" cx="${X(r.intensity)}" cy="${Y(r.ceiling)}" r="6"/></g>`;
    }
    draw = () => {
      const r = current(); $('intensity-control').setAttribute('aria-valuetext', `${fmt(r.intensity)} FLOP/byte`); $('i-value').textContent = fmt(r.intensity); $('p-value').textContent = fmt(r.peak); $('b-value').textContent = fmt(r.bandwidth);
      $('ceiling').textContent = fmt(r.ceiling); $('ridge').textContent = fmt(r.ridge);
      $('feedback').textContent = `IB=${fmt(r.intensity * r.bandwidth)}，Pmax=${r.peak} GFLOP/s。${r.regime === 'bandwidth' ? '带宽线更低：当前位于带宽约束区。' : r.regime === 'compute' ? '计算线更低：当前位于计算约束区。' : '两条线相交：当前恰好位于转折点。'}这是上限判断，实际吞吐可能更低。`;
      $('saved').textContent = saved ? `□ 已保留：I=${fmt(saved.intensity)}，Pmax=${saved.peak}，B=${saved.bandwidth}，上限 ${fmt(saved.ceiling)} GFLOP/s。当前 / 保留上限 = ${fmt(r.ceiling / saved.ceiling)}。` : '尚未保留点。强度滑杆采用对数映射，向右移动会按倍数增加。';
      plot(r);
    };
    $('intensity-control').addEventListener('input', () => { $('preset').value = 'custom'; draw(); });
    for (const id of ['peak', 'bandwidth']) $(id).addEventListener('input', draw);
    $('preset').addEventListener('change', () => { if ($('preset').value !== 'custom') $('intensity-control').value = Math.log2(+$('preset').value); draw(); });
    $('save').onclick = () => { saved = current(); draw(); };
    $('reset').onclick = () => { $('intensity-control').value = Math.log2(.1875); $('peak').value = 1000; $('bandwidth').value = 100; $('preset').value = '0.1875'; saved = null; draw(); }; draw();
  }
  const mode = new URLSearchParams(location.search).get('mode');
  if (mode === 'traffic') traffic(); else if (mode === 'roofline') roofline(); else complexity();
})();
