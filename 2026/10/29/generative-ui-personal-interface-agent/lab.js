(() => {
  'use strict';
  const M = window.PersonalUILab, root = document.getElementById('lab'), $ = id => document.getElementById(id);
  const mode = new URLSearchParams(location.search).get('mode') || 'compose';
  const media = matchMedia('(prefers-color-scheme: dark)');
  let timer = null, frame = null, observer = null, intersection = null;
  try { frame = window.frameElement; } catch (_) {}
  function theme() {
    let dark = media.matches;
    try { if (parent !== window) dark = parent.document.body.classList.contains('dark-mode'); } catch (_) {}
    document.documentElement.classList.toggle('dark', dark);
  }
  theme(); media.addEventListener('change', theme);
  try { if (parent !== window) { observer = new MutationObserver(theme); observer.observe(parent.document.body, { attributes: true, attributeFilter: ['class'] }); } } catch (_) {}
  const resize = new ResizeObserver(() => { if (frame) frame.style.height = `${Math.ceil(root.getBoundingClientRect().height) + 6}px`; }); resize.observe(root);
  function stop() { clearInterval(timer); timer = null; if ($('play')) $('play').textContent = '播放过程'; }
  function visibility() { if (document.hidden) stop(); }
  document.addEventListener('visibilitychange', visibility);
  if (frame) { intersection = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) stop(); }); intersection.observe(frame); }
  window.addEventListener('pagehide', () => { stop(); resize.disconnect(); observer?.disconnect(); intersection?.disconnect(); media.removeEventListener('change', theme); document.removeEventListener('visibilitychange', visibility); }, { once: true });
  const header = (n, title, text) => `<p class="eyebrow">PERSONAL UI / 实验 ${n}</p><h1>${title}</h1><p class="intro">${text}</p>`;
  const select = (id, title, options) => `<label for="${id}">${title}<select id="${id}">${options.map(([v,t]) => `<option value="${v}">${t}</option>`).join('')}</select></label>`;
  const hints = (a,b) => `<details><summary>提示：先比较什么</summary><p>${a}</p></details><details><summary>展开完整解释</summary><p>${b}</p></details>`;
  const view = (s, lightOff = false) => `<div class="surface ${s.style}"><nav>家庭空间　/　返回　/　设置</nav><h2>${{browse:'我的家庭',leave:'出门检查',energy:'检查用电'}[s.task]}</h2>${s.order.map(k => `<section data-panel="${k}"><h3>${M.panels[k].title}</h3><p>${k === 'devices' && lightOff ? M.panels[k].body.replace('客厅灯 · 开启', '客厅灯 · 关闭') : M.panels[k].body}</p></section>`).join('')}${s.action ? `<button class="light-action" ${lightOff ? 'disabled' : ''}>关闭客厅灯（模拟）</button><p class="action-result" role="status">${lightOff ? '模拟服务确认客厅灯已关闭。' : ''}</p>` : ''}</div>`;
  function compose() {
    root.innerHTML = header('01','同一组能力，怎样安排更合适','先选一个喜欢的首页并保留，再只改变一项。两个视图使用完全相同的虚构数据。这里通过固定规则组合界面，不是实时 AI 生成。') + '<div class="controls">' +
      select('style','审美', [['soft','柔和暖色'],['plain','简洁中性'],['bold','高对比硬边']]) +
      select('layout','日常首页组织', [['devices','设备优先'],['photos','相册优先']]) +
      select('task','当前任务', [['browse','日常浏览'],['leave','准备出门'],['energy','检查用电']]) + '</div>' +
      '<div class="toolbar"><button id="save" class="primary">保留当前版本作对照</button><button id="reset">重置</button></div><div class="compare"><div><p class="caption">对照版本</p><div id="baseline"></div></div><div><p class="caption">当前组合</p><div id="current"></div></div></div><p id="feedback" class="status" role="status"></p><p class="note">初始数据固定：4.2 kWh、12 张照片、同一组设备；模拟关灯会同步更新两个视图。任务视图只展示相关部分；返回与设置的位置保持固定。</p>' +
      hints('先只改变审美，比较组件顺序。再回到日常浏览改变首页组织，最后选择出门任务。','审美改变外观，首页偏好改变排序，任务改变需要展示的能力。本例给任务规则更高优先级，因此在出门视图里修改首页偏好不会改变顺序；这不是模型推理结果。');
    let saved = M.compose('soft','devices','browse'), lightOff = false;
    function draw() {
      const now = M.compose($('style').value,$('layout').value,$('task').value);
      $('baseline').innerHTML = view(saved, lightOff); $('current').innerHTML = view(now, lightOff);
      root.querySelectorAll('.light-action').forEach(btn => btn.onclick = () => { if (M.request('member','light','lights.setPower',true).ok) { lightOff = true; draw(); } });
      const changes = [];
      if (saved.style !== now.style) changes.push('视觉样式改变');
      if (saved.order.join() !== now.order.join()) changes.push('信息顺序或展示范围改变');
      if (saved.task !== now.task) changes.push('当前任务改变');
      if (saved.layout !== now.layout && saved.order.join() === now.order.join()) changes.push('首页偏好已改变，当前任务规则保持展示范围');
      $('feedback').textContent = changes.length ? changes.join('；') + '。固定数据与稳定导航未变。' : '当前组合与对照版本相同。可以只改一项开始比较。';
    }
    ['style','layout','task'].forEach(id => $(id).addEventListener('change',draw));
    $('save').onclick = () => { saved = M.compose($('style').value,$('layout').value,$('task').value); draw(); };
    $('reset').onclick = () => { lightOff=false; $('style').value='soft';$('layout').value='devices';$('task').value='browse'; saved=M.compose('soft','devices','browse');draw(); }; draw();
  }
  function contract() {
    root.innerHTML = header('02','生成按钮之后，谁决定能否执行','目标：构造一次会被拒绝的请求，再修正它。选择身份、目标与在线状态后，点击发出请求；修改条件会清除旧回执。全部检查在本地模拟，不连接真实设备。') + '<div class="controls">' +
      select('role','身份',[['member','家庭成员'],['guest','访客']]) + select('device','目标',[['light','客厅灯'],['fridge','冰箱']]) +
      select('action','请求的能力',[['lights.setPower','设置电源为关闭'],['devices.repair','自动修复（虚构能力）']]) + select('online','设备状态',[['yes','在线'],['no','离线']]) + '</div>' +
      '<div class="toolbar"><button id="send" class="primary">发出模拟请求</button><button id="reset">重置</button></div><div class="result"><h2 id="stage">尚未请求</h2><p id="result" role="status">默认条件允许关闭客厅灯。先预测改变一个条件会发生什么。</p></div><ol class="trace"><li>能力存在：请求的动作是否在目录内</li><li>身份有权：本例只允许家庭成员控制设备</li><li>业务允许：本例只开放灯光设置，禁止关闭冰箱</li><li>执行回执：离线时不能声称已经关闭</li></ol>' +
      hints('试试让“家庭成员”关闭“冰箱”。身份正确是否就足够？再试试访客关闭在线的灯。','能力、权限、业务条件与执行结果是不同检查。通过前面一项，不意味着后面自动成功。真实系统不能依赖这个浏览器演示来保护设备，必须在服务端强制检查。');
    const pending = () => { $('stage').textContent='条件已改变';$('result').textContent='尚未请求：旧回执已清除，请重新发出模拟请求。'; };
    ['role','device','action','online'].forEach(id => $(id).onchange=pending);
    $('send').onclick = () => { const r=M.request($('role').value,$('device').value,$('action').value,$('online').value==='yes');$('stage').textContent=r.stage;$('result').textContent=r.message; };
    $('reset').onclick = () => { ['role','device','action','online'].forEach(id=>$(id).selectedIndex=0);$('stage').textContent='尚未请求';$('result').textContent='默认条件允许关闭客厅灯。先预测改变一个条件会发生什么。'; };
  }
  function flow() {
    root.innerHTML=header('03','把一次更新拆开检查','选择一个情境，再单步或播放。观察“采用界面”与“执行操作”的间隔，以及失败时保留的版本。这里是设计流程示意，播放间隔不代表实际耗时。') + '<div class="controls">' + select('scenario','情境',[['normal','合法方案，设备在线'],['invalid','方案含虚构能力'],['offline','合法方案，设备离线']]) + '</div><div id="pipeline" class="pipeline" aria-label="更新步骤"></div><p class="progress" id="progress"></p><div class="stage-box" role="status"><h2 id="stage"></h2><p id="explanation"></p></div><div class="toolbar"><button id="prev">上一步</button><button id="next" class="primary">下一步</button><button id="play">播放过程</button><button id="reset">回到已有界面</button></div>' + hints('在“预览并采用”时，设备有没有被关闭？切到虚构能力，检查是否还能采用这个方案。','方案校验失败时保留旧版。方案合法后才可预览并采用；用户操作仍需独立检查并等待结果。设备离线只说明操作失败，不应让合法界面消失。');
    let index=0, steps=M.flow('normal');
    function draw() { $('pipeline').innerHTML=steps.map(([name],i)=>`<span class="${i===index?'active':''}" ${i===index?'aria-current="step"':''}>${i+1} ${name}</span>`).join('');$('progress').textContent=`步骤 ${index+1} / ${steps.length}`;$('stage').textContent=steps[index][0];$('explanation').textContent=steps[index][1];$('prev').disabled=index===0;$('next').disabled=index===steps.length-1;if(index===steps.length-1)stop(); }
    $('scenario').onchange=()=>{stop();index=0;steps=M.flow($('scenario').value);draw();};
    $('prev').onclick=()=>{stop();index=Math.max(0,index-1);draw();};$('next').onclick=()=>{stop();index=Math.min(steps.length-1,index+1);draw();};$('reset').onclick=()=>{stop();index=0;draw();};
    $('play').onclick=()=>{if(timer){stop();return;}if(index===steps.length-1)index=0;draw();$('play').textContent='暂停播放';timer=setInterval(()=>{index++;draw();},2200);};draw();
  }
  ({compose,contract,flow}[mode] || compose)();
})();
