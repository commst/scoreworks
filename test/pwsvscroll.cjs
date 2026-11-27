const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 악보로 보기 스크롤 시험(187번): 일시정지한 채 끝까지 스크롤하며 보이는 쪽에 그림이 있는지. NODE_PATH=/opt/npm-tools/node_modules node test/pwsvscroll.cjs [html] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const pre = process.env.PRE || '61c75dd1', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const html = path.resolve(process.argv[2] || path.join(__dirname, '../index.html')), mode = process.argv[3];
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1600, height: 1100 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + html); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 300000 });
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.click('#viewScore'); await p.waitForTimeout(1500);
  // 9마디쯤에서 일시정지(연주 위치 = 앞쪽 쪽)
  await p.click('#jumpFwd'); await p.waitForFunction(() => window.__st.playing, null, { timeout: 200000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const c = document.getElementById('svFollow'); if (c && c.checked) { c.checked = false; c.dispatchEvent(new Event('change')); } });
  await p.keyboard.press('Space'); await p.waitForTimeout(500);
  const blanks = [];
  for (let dir of [1, -1]) {
    for (let k = 0; k < 60; k++) {
      const end = await p.evaluate(d => { const w = document.querySelector('.sv-page') && document.querySelector('.sv-page').parentElement.closest('[id]'); const sc = [...document.querySelectorAll('*')].find(e => e.querySelector(':scope > .sv-page') && e.scrollHeight > e.clientHeight + 10) || w; const before = sc.scrollTop; sc.scrollTop += d * sc.clientHeight * 0.6; return sc.scrollTop === before; }, dir);
      await p.waitForTimeout(250);
      if (end) break;
    }
    await p.waitForTimeout(2500);
    const r = await p.evaluate(() => { const out = []; for (const el of document.querySelectorAll('.sv-page')) { const b = el.getBoundingClientRect(); if (b.bottom > 150 && b.top < innerHeight - 150) out.push([el.dataset.page || el.dataset.panel, !!el.querySelector('canvas')]); } return out; });
    for (const [pg, has] of r) if (!has) blanks.push((dir > 0 ? '끝' : '처음') + ':' + pg);
    ok(r.length && r.every(x => x[1]), (dir > 0 ? '끝까지' : '처음까지') + ' 스크롤 뒤 보이는 쪽 그림 있음 ' + JSON.stringify(r));
  }
  await p.screenshot({ path: '/tmp/pwsvscroll.png' });
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  console.log(fail ? 'FAIL ' + fail : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0); })();
