const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 겹쳐 보기 동그라미 누르면 이유 말풍선(200번): NODE_PATH=/opt/npm-tools/node_modules node test/pwovtap.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '2bc31eef', phone = process.argv.includes('phone'), SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html')); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(1500);
  await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const c = document.getElementById('svOver'); c.checked = true; c.dispatchEvent(new Event('change')); }); await p.waitForTimeout(4000);
  const n = await p.evaluate(() => document.querySelectorAll('.sv-ovn.tap').length); ok('이유 있는 동그라미', n > 0, String(n));
  const tap = p.locator('.sv-ovn.tap').first(); await tap.scrollIntoViewIfNeeded(); await p.waitForTimeout(800);
  const playing0 = await p.evaluate(() => document.body.className);
  await tap.click({ force: true }); await p.waitForTimeout(600);
  const bub = await p.evaluate(() => { const e = document.querySelector('.ov-bubble'); return e && !e.hidden ? e.textContent : null; });
  ok('누르면 말풍선', !!bub && /마디/.test(bub), bub || '');
  await p.screenshot({ path: `/tmp/ovtap-${phone ? 'phone' : 'desk'}.png` });
  const nt = await p.evaluate(() => (document.getElementById('nowText') || {}).textContent || ''); ok('재생 시작 안 함', !/마디 재생|재생 중/.test(nt), nt.slice(0, 40));
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
