const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// MusicXML 겹쳐 보기 + 음 고치기 시험(185번): 고친 뒤 동그라미를 다시 그리는지. NODE_PATH=/opt/npm-tools/node_modules node test/pwovedit.cjs  (UP=♯ DN=♭이면 반음은 동그라미에 안 나타나 FAIL이 정상)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const pre = process.env.PRE || '985e95bb', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') console.log('console:', m.text().slice(0, 200)); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 200000 });
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.click('#viewScore'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const c = document.getElementById('svOver'); c.checked = true; c.dispatchEvent(new Event('change')); }); await p.waitForTimeout(2000);
  const dots = () => p.evaluate(() => [...document.querySelectorAll('.sv-ovn')].map(e => e.className + '@' + e.style.left + ',' + e.style.top));
  const d0 = await dots(); ok(d0.length > 0, '겹쳐 보기 동그라미 ' + d0.length + ' (빨강 ' + d0.filter(x => /bad|miss/.test(x)).length + ')');
  const K = +(process.env.K || 6), UP = process.env.UP || '↑8', DN = process.env.DN || '↓8';
  const box = await p.locator('.sv-ovn').nth(K).boundingBox(); await p.locator('.sv-ovn').nth(K).scrollIntoViewIfNeeded();
  const box2 = await p.locator('.sv-ovn').nth(K).boundingBox();
  await p.click('#svEdit'); await p.mouse.click(box2.x + box2.width / 2, box2.y + box2.height / 2); await p.waitForTimeout(800);
  const nBtn = await p.evaluate(u => [...document.querySelectorAll('button')].filter(x => x.textContent === u && x.offsetParent).length, UP); ok(nBtn > 0, '고치기 창 ' + UP + ' 단추 ' + nBtn);
  await p.evaluate(u => [...document.querySelectorAll('button')].find(x => x.textContent === u && x.offsetParent).click(), UP); await p.waitForTimeout(2000);
  const d1 = await dots(); const gone = d0.filter(x => !d1.includes(x)), added = d1.filter(x => !d0.includes(x));
  ok(gone.length + added.length > 0, UP + ' 뒤 동그라미 바뀜: 빠짐 ' + gone.length + ' 생김 ' + added.length + ' | ' + gone.slice(0, 2).join(' ') + ' → ' + added.slice(0, 2).join(' '));
  await p.evaluate(u => [...document.querySelectorAll('button')].find(x => x.textContent === u && x.offsetParent).click(), DN); await p.waitForTimeout(2000);
  const d2 = await dots(); ok(JSON.stringify(d2.slice().sort()) === JSON.stringify(d0.slice().sort()), DN + '으로 되돌리면 처음 동그라미로');
  await p.screenshot({ path: '/tmp/pwovedit.png' });
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  console.log(fail ? 'FAIL ' + fail : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0); })();
