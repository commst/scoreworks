// 숨은 쉼표 표시 시험(198번): NODE_PATH=/opt/npm-tools/node_modules node test/pwhidden.cjs [접두어] [줄 이름] [마디]
//  '쉼표 일부 숨김' 마디가 붉게 나오지 않는지, 악보로 보기('OO만')에 숨은 쉼표 칸이 그려지는지, 끄면 사라지는지. 그림 /tmp/hidden.png
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '61c75dd1', lname = process.argv[3] || '북2', bar = process.argv[4] || '6', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1366, height: 900 } })).newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('hapju-warnopen') == null) localStorage.setItem('hapju-warnopen', '1'); } catch (e) {} });
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html') + '#allpanes'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.click('#allOn'); await p.waitForTimeout(2500);
  const more = await p.$('#warnList .wmore'); if (more) { await more.click(); await p.waitForTimeout(300); }
  const w = await p.evaluate(bn => { const row = [...document.querySelectorAll('#warnList .msg')].find(x => x.textContent.startsWith(bn + '마디')); return row ? { bad: row.classList.contains('bad'), txt: row.textContent.slice(0, 120) } : null; }, bar);
  ok('숨은 쉼표 경고 마디는 붉지 않음', w && !w.bad, w && w.txt);
  await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
  const val = await p.evaluate(n => { const o = [...document.getElementById('svPartSel').options].find(o => o.textContent.replace(/만$/, '').trim() === n); return o ? o.value : null; }, lname);
  if (val) { await p.selectOption('#svPartSel', val); await p.waitForTimeout(2500); }
  await p.evaluate(bn => { const rows = [...document.querySelectorAll('#warnList .msg')]; }, bar);
  const n1 = await p.evaluate(() => document.querySelectorAll('.sv-hr').length); ok('숨은 쉼표 칸 그림', n1 > 0, String(n1));
  for (let z = 0; z < 4; z++) await p.click('#svZoomIn').catch(() => {}); await p.waitForTimeout(2500);
  const first = await p.$('.sv-hr'); if (first) { await first.evaluate(e => e.scrollIntoView({ block: 'center' })); await p.waitForTimeout(1500); const bb = await first.boundingBox(); console.log('bb', JSON.stringify(bb)); if (bb) await p.screenshot({ path: '/tmp/hidden.png', clip: { x: Math.max(0, Math.min(1366 - 640, bb.x - 320)), y: Math.max(0, bb.y - 90), width: 640, height: 200 } }); }
  await p.click('#svHidden'); await p.waitForTimeout(400); ok('끄면 사라짐', await p.evaluate(() => document.querySelectorAll('.sv-hr').length) === 0);
  await p.click('#svHidden'); await p.waitForTimeout(400);
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
