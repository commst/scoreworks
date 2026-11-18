// 악보로 보기 [⚠ 경고 n] 시험(197번): NODE_PATH=/opt/npm-tools/node_modules node test/pwwarnsheet.cjs [접두어]
//  휴대폰: 악보로 보기에서 단추가 보이고 누르면 경고 창(모든 경고 마디, 붉은 줄), [마디로]를 누르면 창이 닫힘. 컴퓨터: 단추 숨김(목록이 그대로 보임)
const { chromium, devices } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '2bc31eef', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
const HTML = 'file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html');
const open = async (b, opt) => { const p = await (await b.newContext(opt)).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto(HTML); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(1500); return { p, errs }; };
(async () => { const b = await chromium.launch();
  { const { p, errs } = await open(b, { ...devices['iPhone 13'] });
    await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
    ok('악보로 보기 중', await p.evaluate(() => document.body.classList.contains('sv-mode')));
    ok('경고 목록 숨김', !(await p.isVisible('#warnList')));
    ok('[⚠ 경고] 보임', await p.isVisible('#svWarn'), await p.textContent('#svWarn'));
    await p.click('#svWarn'); await p.waitForTimeout(400);
    const r = await p.evaluate(() => ({ rows: document.querySelectorAll('.warn-dlg .msg').length, bad: document.querySelectorAll('.warn-dlg .msg.bad').length, n: document.getElementById('svWarnN').textContent }));
    ok('창: 경고 마디 모두', r.rows > 0 && String(r.rows) === r.n, JSON.stringify(r));
    await p.screenshot({ path: '/tmp/warnsheet-phone.png' });
    await p.locator('.warn-dlg .msg .wgo button').first().click(); await p.waitForTimeout(800);
    ok('[마디로] 누르면 창 닫힘', !(await p.$('.warn-dlg')));
    ok('페이지 오류 없음', !errs.length, errs.join(' | ')); }
  { const { p } = await open(b, { viewport: { width: 1366, height: 900 } });
    await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
    ok('컴퓨터: 단추 숨김, 목록 보임', !(await p.isVisible('#svWarn')) && await p.isVisible('#warnList')); }
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
