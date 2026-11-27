const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 겹쳐 보기 그림 확인(202번): 보라(쪽 그림의 머리와 높이가 다름) 동그라미 수와 기둥 선. NODE_PATH=/opt/npm-tools/node_modules node test/pwovpix.cjs [접두어] [보기 줄 이름]
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', part = process.argv[3] || '', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1366, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html') + '#allpanes'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.click('#allOn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
  if (part) { const val = await p.evaluate(n => { const o = [...document.getElementById('svPartSel').options].find(o => o.textContent.replace(/만$/, '').trim() === n); return o ? o.value : null; }, part); if (val) { await p.selectOption('#svPartSel', val); await p.waitForTimeout(2000); } }
  await p.evaluate(() => { const c = document.getElementById('svOver'); c.checked = true; c.dispatchEvent(new Event('change')); });
  let tot = { all: 0, pix: 0, stems: 0 }, ex = [];
  for (let k = 0; k < 6; k++) { await p.waitForTimeout(2500);
    const r = await p.evaluate(() => ({ all: document.querySelectorAll('.sv-ovn').length, pix: [...document.querySelectorAll('.sv-ovn.pix')].map(e => e.title.slice(0, 90)), stems: document.querySelectorAll('.sv-ovs').length }));
    tot = r; ex = r.pix;
    await p.evaluate(() => { const w = document.getElementById('svWrap'); w.scrollTop += w.clientHeight * 0.9; }); }
  console.log(JSON.stringify({ all: tot.all, pix: tot.pix.length, stems: tot.stems })); console.log(ex.slice(0, 10).join('\n'));
  const pe = await p.$('.sv-ovn.pix'); if (pe) { await pe.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); const bb = await pe.boundingBox(); await p.screenshot({ path: '/tmp/ovpix.png', clip: { x: Math.max(0, Math.min(1366 - 500, bb.x - 250)), y: Math.max(0, bb.y - 80), width: 500, height: 170 } }); }
  const se = await p.$('.sv-ovs'); if (se) { await se.scrollIntoViewIfNeeded(); await p.waitForTimeout(800); const bb = await se.boundingBox(); await p.screenshot({ path: '/tmp/ovstem.png', clip: { x: Math.max(0, Math.min(1366 - 500, bb.x - 200)), y: Math.max(0, bb.y - 60), width: 500, height: 150 } }); }
  console.log('errs', errs.length, errs.slice(0, 2).join(' | ')); await b.close(); })();
