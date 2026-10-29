(function (root) {
  'use strict';
  const capabilities = ['devices.read', 'energy.read', 'photos.read', 'calendar.read', 'lights.setPower'];
  const panels = {
    devices: { title: '设备状态', body: '客厅灯 · 开启｜空调 · 关闭｜冰箱 · 运行' },
    energy: { title: '今日用电', body: '4.2 kWh（千瓦时）｜昨日 4.6 kWh' },
    photos: { title: '家庭相册', body: '周末散步 · 12 张照片' },
    calendar: { title: '家庭日程', body: '明天 18:00 · 家庭晚餐' }
  };
  function compose(style, layout, task) {
    if (!['soft', 'plain', 'bold'].includes(style) || !['devices', 'photos'].includes(layout) || !['browse', 'leave', 'energy'].includes(task)) throw Error('未知组合');
    const order = task === 'leave' ? ['devices', 'calendar'] : task === 'energy' ? ['energy', 'devices'] : layout === 'photos' ? ['photos', 'calendar', 'devices', 'energy'] : ['devices', 'energy', 'photos', 'calendar'];
    return { style, layout, task, order, action: task === 'leave' ? '关闭客厅灯' : null };
  }
  function request(role, device, action, online) {
    if (action !== 'lights.setPower') return { stage: '能力校验', ok: false, message: '拒绝：能力目录中没有这个操作。' };
    if (role !== 'member') return { stage: '权限检查', ok: false, message: '拒绝：访客没有设备控制权限。' };
    if (device !== 'light') return { stage: '业务检查', ok: false, message: '拒绝：本例只允许设置灯光，冰箱不能关闭。' };
    if (!online) return { stage: '执行回执', ok: false, message: '失败：客厅灯离线，未确认关闭，保留重试入口。' };
    return { stage: '执行回执', ok: true, message: '成功：模拟服务确认客厅灯已关闭。' };
  }
  function flow(scenario) {
    const steps = [
      ['已有界面', '当前版本 v1 可用。设置与返回入口保持固定。'],
      ['提出方案', scenario === 'invalid' ? 'Agent 提出“自动修复冰箱”，但能力目录没有这项操作。' : 'Agent 提出出门检查视图：设备、日程与灯光操作。'],
      ['校验方案', scenario === 'invalid' ? '校验失败：未知动作。拒绝候选方案，继续使用 v1。' : '组件、数据绑定和动作均在本例允许范围内。'],
      ['预览并采用', '用户采用候选版本 v2。此时只更新界面，尚未关闭设备。'],
      ['用户发出操作', '用户点击关闭客厅灯。模拟服务重新检查权限与业务条件。'],
      ['收到结果', scenario === 'offline' ? '设备离线：v2 显示未完成及重试入口；仍可恢复 v1。' : '模拟服务确认关闭：v2 更新灯光状态；仍可恢复 v1。']
    ];
    return scenario === 'invalid' ? steps.slice(0, 3) : steps;
  }
  const api = { capabilities, panels, compose, request, flow };
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PersonalUILab = api;
})(typeof globalThis !== 'undefined' ? globalThis : this);
