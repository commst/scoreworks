// 음 길이 경고(196번): 마디보다 음이 남거나 모자라면 경고 목록·요약 번호를 붉게. NODE_PATH=/opt/npm-tools/node_modules node test/pwlenwarn.cjs [접두어] [마디] [기대 글]
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '2bc31eef', bar = process.argv[3] || '37', want = process.argv[4] || '16분음표 1개만큼 남음', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
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
  const r = await p.evaluate(bn => { const rows = [...document.querySelectorAll('#warnList .msg')]; const row = rows.find(x => x.textContent.includes(bn + '마디'));
    return { row: row ? row.textContent.slice(0, 200) : null, bad: row ? row.classList.contains('bad') : false, color: row && row.querySelector('.wlen') ? getComputedStyle(row.querySelector('.wlen')).color : '',
      nBad: rows.filter(x => x.classList.contains('bad')).length, nAll: rows.length, sumBad: !![...document.querySelectorAll('.summary .wnum.bad')].find(k => k.textContent === bn) }; }, bar);
  ok('경고 줄 있음·붉게', r.bad && /rgb\(197, 34, 31\)/.test(r.color), r.row); ok('기대 글', r.row && r.row.includes(want)); ok('요약 번호 붉게', r.sumBad);
  console.log('붉은 줄', r.nBad, '/', r.nAll);
  const order = await p.evaluate(() => { const rows = [...document.querySelectorAll('#warnList .msg')]; const k = rows.findIndex(x => !x.classList.contains('bad')); return k < 0 || rows.slice(k).every(x => !x.classList.contains('bad')); });
  ok('붉은 경고가 먼저', order); ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
