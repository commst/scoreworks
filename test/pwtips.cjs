const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 250번: 첫 화면 세 단계·편집 처음 안내 — node test/pwtips.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = __SWR + '/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  await ctx.addInitScript(() => { try { localStorage.setItem('hapju-tips-test', '1'); } catch (e) {} });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' && /정간보|인식 악보/.test(m.text())) console.log('  con', m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  const steps = await p.$$eval('.hero-steps li', ls => ls.map(l => l.textContent.trim().slice(0, 12))); ok('첫 화면 세 단계', steps.length === 3, steps.join(' | ')); await p.screenshot({ path: '/tmp/tips-welcome-' + (phone ? 'phone' : 'pc') + '.png' });
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  for (const tm of ['tempoRows']) await p.evaluate(() => { for (const i of document.querySelectorAll('#tempoRows input[type=number]')) if (!+i.value) { i.value = 120; i.dispatchEvent(new Event('change', { bubbles: true })); } });
  const chk = (c, n) => ok(n, c);
  await p.evaluate(() => document.getElementById('svEdit').click()); await p.waitForTimeout(1500);
  ok('편집 처음 켜면 안내', await p.isVisible('#edTips'));
  await p.screenshot({ path: '/tmp/tips-edit-' + (phone ? 'phone' : 'pc') + '.png' });
  await p.click('#edTips .btn'); await p.waitForTimeout(300);
  ok('알겠어요 → 닫힘·기억', !(await p.$('#edTips')) && await p.evaluate(() => localStorage.getItem('hapju-tips-edit') === '1'));
  await p.evaluate(() => document.getElementById('svPractice').click()); await p.waitForTimeout(800);
  await p.evaluate(() => document.getElementById('svEdit').click()); await p.waitForTimeout(1200);
  ok('두 번째부터는 안 뜸', !(await p.$('#edTips')));
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 2).join(' | '));
  console.log(fail ? fail + ' FAIL' : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0);
})();
