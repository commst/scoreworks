// 악기 켜기·끄기 카드 시험(194번): NODE_PATH=/opt/npm-tools/node_modules node test/pwquick.cjs [접두어] [phone]
//  단추 수 = 줄 수, 누르면 줄 카드 스위치와 함께 켜짐·꺼짐, 갈래 순서, 한 줄 단추 수(폭), 글자 잘림 없음, 그림 /tmp/quick-*.png
const { chromium, devices } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', phone = process.argv.includes('phone'), SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const HTML = process.env.HTML || __dirname + '/../index.html';
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 900 } }); const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(HTML)); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 2 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  if (phone) await p.click('.dtab[data-tab="inst"]').catch(() => {}); else await p.click('#tab-inst').catch(() => {});
  await p.waitForTimeout(800);
  const st = () => p.evaluate(() => ({ n: document.querySelectorAll('#quickGrid .qbtn').length, cards: document.querySelectorAll('#lineList .lcard').length,
    on: [...document.querySelectorAll('#quickGrid .qbtn')].filter(b => b.getAttribute('aria-pressed') === 'true').length,
    sw: [...document.querySelectorAll('#lineList .lsw')].filter(b => b.getAttribute('aria-checked') === 'true').length,
    fams: [...document.querySelectorAll('#quickGrid .qbtn')].map(b => b.dataset.fam), count: document.getElementById('quickCount').textContent,
    cols: (() => { const bs = [...document.querySelectorAll('#quickGrid .qbtn')]; if (!bs.length) return 0; const y = bs[0].offsetTop; return bs.filter(b => b.offsetTop === y).length; })(),
    widths: [...new Set([...document.querySelectorAll('#quickGrid .qbtn')].map(b => Math.round(b.getBoundingClientRect().width)))],
    clip: [...document.querySelectorAll('#quickGrid .qbtn')].filter(b => b.scrollHeight > b.clientHeight + 1).map(b => b.textContent),
    oneLine: [...document.querySelectorAll('#quickGrid .qbtn')].every(b => getComputedStyle(b).whiteSpace === 'nowrap' && getComputedStyle(b).textAlign === 'center') }));
  let s = await st();
  ok('단추 수 = 줄 수', s.n === s.cards, `${s.n}/${s.cards}`); ok('켠 수 = 스위치 켠 수', s.on === s.sw, `${s.on}/${s.sw} ${s.count}`);
  const ord = { wind: 0, string: 1, perc: 2, etc: 3 }; ok('갈래 순서', s.fams.every((f, i) => !i || ord[s.fams[i - 1]] <= ord[f]));
  ok('같은 폭', s.widths.length === 1, s.widths.join(',')); ok('한 줄 단추 수', s.cols >= 4, String(s.cols)); ok('한 줄·가운데(넘치면 …)', s.oneLine && !s.clip.length, s.clip.join(','));
  const vis = await p.isVisible('#quickLines'); ok('카드 보임', vis);
  await p.locator('#quickLines').scrollIntoViewIfNeeded().catch(() => {}); await p.locator('#quickLines').screenshot({ path: `/tmp/quick-${phone ? 'phone' : 'desk'}.png` }).catch(() => {});
  const off = await p.evaluate(() => [...document.querySelectorAll('#quickGrid .qbtn')].findIndex(b => b.getAttribute('aria-pressed') === 'false'));
  await p.locator('#quickGrid .qbtn').nth(off).click(); await p.waitForTimeout(400); let s2 = await st();
  ok('누르면 켜짐(스위치도)', s2.on === s.on + 1 && s2.sw === s.sw + 1, `${s2.on}/${s2.sw}`);
  await p.locator('#quickGrid .qbtn').nth(off).click(); await p.waitForTimeout(400); s2 = await st();
  ok('다시 누르면 꺼짐', s2.on === s.on && s2.sw === s.sw);
  // 줄 카드 스위치로 바꾸면 단추도
  await p.locator('#lineList .lsw').first().click(); await p.waitForTimeout(400); s2 = await st(); ok('스위치 → 단추 따라감', s2.on === s2.sw && s2.on !== s.on);
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
