// 확인 필요 마디 바로가기(188번): NODE_PATH=/opt/npm-tools/node_modules node test/pwwarngo.cjs [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const pre = process.env.PRE || '61c75dd1', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const mode = process.argv[2]; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 300000 });
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.evaluate(() => { const b = document.getElementById('allOn'); if (b) b.click(); }); await p.waitForTimeout(3000);
  // 238번: 처음엔 경고 목록이 접혀 개수만 → 누르면 펼침(휴대폰은 악보 보기 중 요약 줄이 숨어 접힘 상태만 바꿈)
  { const st0 = await p.evaluate(() => ({ hid: document.getElementById('warnList').hidden, tg: (document.getElementById('warnTgl') || {}).textContent || '' })); ok(st0.hid && /⚠ \d+마디/.test(st0.tg), '처음엔 접혀 개수만 (' + st0.tg + ')');
    if (await p.isVisible('#warnTgl')) await p.click('#warnTgl'); else await p.evaluate(() => document.getElementById('warnTgl').click()); ok(await p.evaluate(() => !document.getElementById('warnList').hidden && document.querySelectorAll('#warnList .msg').length > 0), '누르면 펼침'); }
  // 217번: 마디맵이 없어져 [마디로]는 악보 보기(원본 PDF)의 그 마디로 가서 깜빡(.sv-flash)
  const rows = await p.$$eval('#warnList .msg', r => r.map(x => x.dataset.n + '마디 ' + x.textContent.slice(0, 40)));   // 마디 번호는 줄의 data-n(196번부터 붉은 길이 경고가 앞에 옴)
  ok(rows.length > 0 && rows.length <= 6, '경고 줄 ' + rows.length + ' ' + rows[0]);
  const nb = await p.$$eval('#warnList .msg', r => r.map(x => x.querySelectorAll('.wgo button').length)); ok(nb.every(n => n === 3), '줄마다 단추 3개 ' + nb.join(','));
  const target = +(/^(\d+)/.exec(rows[rows.length - 1])[1]);
  await p.evaluate(() => scrollTo(0, 0));
  await p.evaluate(() => [...document.querySelectorAll('#warnList .msg')].pop().querySelector('.wgo button').click()); await p.waitForTimeout(2500);   // 악보 칸이 부드럽게 굴러가는 시간
  const flashSt = () => p.evaluate(() => { const el = document.querySelector('#svWrap .sv-flash.on, #recWrap .sv-flash.on'); if (!el) return { flash: false }; const r = el.getBoundingClientRect(), w = el.closest('.sv-wrap').getBoundingClientRect(); return { flash: true, inView: r.top >= w.top - 2 && r.top <= w.bottom }; });
  const st = await flashSt();
  ok(st.flash && st.inView, target + '마디로: 화면 안·깜빡 ' + JSON.stringify(st));
  const more = await p.$('#warnList .wmore'); const sumN = await p.$$eval('#summary .wnum', r => r.length);
  ok(sumN > 6, '요약 번호 단추 ' + sumN);
  if (more) { await p.evaluate(() => document.querySelector('#warnList .wmore').click()); const n2 = await p.$$eval('#warnList .msg', r => r.length); ok(n2 === sumN, '더 보기 → ' + n2 + '줄'); }
  const lastNum = await p.$$eval('#summary .wnum', r => +r[r.length - 1].textContent);
  await p.evaluate(() => scrollTo(0, 0)); await p.evaluate(() => [...document.querySelectorAll('#summary .wnum')].pop().click()); await p.waitForTimeout(2500);
  { const f = await flashSt(); ok(f.flash && f.inView, '요약 번호 ' + lastNum + ' → 그 마디 화면 안 ' + JSON.stringify(f)); }
  await p.evaluate(() => [...document.querySelector('#warnList .msg').querySelectorAll('.wgo button')].find(x => /✎/.test(x.textContent)).click()); await p.waitForTimeout(600);
  ok(await p.evaluate(() => [...document.querySelectorAll('button')].some(x => x.textContent === '♯' && x.offsetParent)), '✎ 고치기 → 고치기 창');
  await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  const first = +(/^(\d+)/.exec(rows[0])[1]);
  await p.evaluate(() => [...document.querySelector('#warnList .msg').querySelectorAll('.wgo button')].find(x => /여기부터/.test(x.textContent)).click());
  await p.waitForFunction(() => window.__st.playing, null, { timeout: 200000 }); await p.waitForTimeout(800);
  const now = await p.evaluate(() => { const m = /(\d+)마디/.exec(document.getElementById('nowText').textContent); return m ? +m[1] : null; });
  ok(now >= first && now <= first + 2, '▶ 여기부터 → ' + now + '마디 (' + first + ')');
  // 접기
  await p.evaluate(() => document.querySelector('#warnList .wmore').click()); await p.waitForTimeout(300);
  ok(await p.$$eval('#warnList .msg', r => r.length) === 6, '접기 → 6줄');
  await p.evaluate(() => document.querySelector('#warnList .wmore').click()); await p.waitForTimeout(300);
  ok(await p.$$eval('#warnList .msg', r => r.length) === sumN, '다시 펼치기 → ' + sumN + '줄');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침 없음');
  // 악보로 보기, 연주 위치 따라가기 끔: [마디로] → 악보 칸이 그 마디로
  await p.keyboard.press('Space'); await p.waitForTimeout(300);
  await p.evaluate(() => { document.getElementById('viewScore').click(); const c = document.getElementById('svFollow'); if (c.checked) { c.checked = false; c.dispatchEvent(new Event('change')); } }); await p.waitForTimeout(2000);
  const wl = await p.evaluate(() => getComputedStyle(document.getElementById('warnList')).display);
  if (wl !== 'none') {
    const tgt = await p.evaluate(() => { const rows = [...document.querySelectorAll('#warnList .msg')]; const r = rows[rows.length - 1]; r.querySelector('.wgo button').click(); return +/^(\d+)/.exec(r.querySelector('span').textContent)[1]; });
    await p.waitForTimeout(2500);
    const sv = await p.evaluate(() => { const f = document.querySelector('.sv-flash'), w = document.getElementById('svWrap'); if (!f) return null; const a = f.getBoundingClientRect(), b = w.getBoundingClientRect(); return { fa: [a.top, a.bottom], wb: [b.top, b.bottom], max: w.scrollHeight - w.clientHeight, on: f.classList.contains('on'), inWrap: a.top >= b.top - 2 && a.top < b.bottom - 40 && a.height > 0, wrapInView: b.top >= 0 && b.top < innerHeight / 2, top: w.scrollTop }; });
    ok(sv && sv.on && sv.inWrap && sv.wrapInView, '악보로 보기(따라가기 끔) 마디로 ' + tgt + ' → ' + JSON.stringify(sv));
    await p.screenshot({ path: '/tmp/pwwarngo-sv-' + (mode || 'desk') + '.png' });
  } else console.log('     (휴대폰 악보로 보기에서는 경고 목록이 숨겨짐)');
  await p.evaluate(() => document.getElementById('warnList').scrollIntoView()); await p.screenshot({ path: '/tmp/pwwarngo-' + (mode || 'desk') + '.png' });
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  console.log(fail ? 'FAIL ' + fail : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0); })();
