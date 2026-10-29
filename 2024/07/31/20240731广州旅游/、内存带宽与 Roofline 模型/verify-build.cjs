'use strict';
const assert = require('node:assert/strict'), fs = require('node:fs'), os = require('node:os'), path = require('node:path');
const Hexo = require('hexo'), { JSDOM } = require('jsdom');
const root = path.resolve(__dirname, '../../..'), work = fs.mkdtempSync(path.join(os.tmpdir(), 'blog-roofline-check-'));
const cache = path.join(work, 'cache'), output = path.join(work, 'site');
fs.mkdirSync(cache); fs.mkdirSync(output); fs.copyFileSync(path.join(root, 'db.json'), path.join(cache, 'db.json'));
const url = '2026/10/23/algorithm-complexity-memory-bandwidth-roofline/';
const assets = path.join(__dirname, '20261023算法复杂度、内存带宽与 Roofline 模型');
async function build(round) {
  const h = new Hexo(root, { silent: true, output: cache }); await h.init();
  h.public_dir = output + path.sep; h.config.public_dir = h.public_dir;
  await h.call('generate');
  const html = fs.readFileSync(path.join(output, url, 'index.html'), 'utf8'), dom = new JSDOM(html), doc = dom.window.document;
  assert.deepEqual([...doc.querySelectorAll('iframe.roofline-frame')].map(x => x.getAttribute('src')), ['complexity', 'traffic', 'roofline'].map(x => `/${url}lab.html?mode=${x}`));
  assert.equal(doc.querySelectorAll('mjx-merror, [data-mjx-error]').length, 0);
  assert(doc.querySelectorAll('mjx-container').length > 30, 'math must actually render');
  const folds = doc.querySelectorAll('details.roofline-proof'); assert.equal(folds.length, 2);
  assert([...folds].some(x => x.querySelector('mjx-container')), 'math inside folding must render');
  assert(!html.includes('{% asset_path')); assert(!html.includes('{% folding'));
  for (const file of ['lab.html', 'lab.css', 'lab.js', 'model.js']) assert.equal(fs.readFileSync(path.join(output, url, file), 'utf8'), fs.readFileSync(path.join(assets, file), 'utf8'));
  dom.window.close(); await h.exit(); console.log(`PASS build ${round}: 3 iframe URLs, 4 standalone assets, MathJax and folding.`);
}
(async () => { await build(1); await build(2); console.log(`Isolated output: ${output}`); })().catch(e => { console.error(e); process.exitCode = 1; });
