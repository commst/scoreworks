// [악보대로 고치기] 시험(203번): 보라 동그라미를 누르면 말풍선에 고치기 단추, 누르면 음 수정 기록이 생기고 동그라미가 다시 그려짐
// NODE_PATH=/opt/npm-tools/node_modules node test/pwovfix.cjs [접두어] [보기 줄 이름]
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '61c75dd1', part = process.argv[3] || '신디2 (윗줄)', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1366, height: 1000 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html') + '#allpanes'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.click('#allOn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
  const val = await p.evaluate(n => { const o = [...document.getElementById('svPartSel').options].find(o => o.textContent.replace(/만$/, '').trim() === n); return o ? o.value : null; }, part);
  if (val) { await p.selectOption('#svPartSel', val); await p.waitForTimeout(2000); }
  await p.evaluate(() => { const c = document.getElementById('svOver'); c.checked = true; c.dispatchEvent(new Event('change')); });
  let pe = null; for (let k = 0; k < 8 && !pe; k++) { await p.waitForTimeout(2500); pe = await p.$('.sv-ovn.pix'); if (!pe) await p.evaluate(() => { const w = document.getElementById('svWrap'); w.scrollTop += w.clientHeight * 0.9; }); }
  ok('보라 동그라미 있음', !!pe); if (!pe) { await b.close(); process.exit(1); }
  await pe.scrollIntoViewIfNeeded(); await p.waitForTimeout(500); await pe.click({ force: true }); await p.waitForTimeout(400);
  const btn = await p.$('.ov-bubble .ov-fix'); ok('말풍선에 고치기 단추', !!btn, btn ? await btn.textContent() : '');
  await p.screenshot({ path: '/tmp/ovfix.png' });
  const before = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hapju-edits:')).map(k => localStorage.getItem(k).length).join());
  if (btn) { await btn.click(); await p.waitForTimeout(2500); }
  const after = await p.evaluate(() => Object.keys(localStorage).filter(k => k.startsWith('hapju-edits:')).map(k => localStorage.getItem(k).length).join());
  ok('음 수정 기록 생김', after && after !== before, `${before} → ${after}`);
  ok('안내 글', /악보 그림 높이대로/.test(await p.evaluate(() => document.body.innerText)));
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
