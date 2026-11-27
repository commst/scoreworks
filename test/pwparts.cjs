const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 247번: 악보 보기 '보기'에서 여러 악기 고르기 — node test/pwparts.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = __SWR + '/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' && /정간보|인식 악보/.test(m.text())) console.log('  con', m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  for (const tm of ['tempoRows']) await p.evaluate(() => { for (const i of document.querySelectorAll('#tempoRows input[type=number]')) if (!+i.value) { i.value = 120; i.dispatchEvent(new Event('change', { bubbles: true })); } });
  const chk = (c, n) => ok(n, c);
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 240000 });
  await p.evaluate(() => document.getElementById('allOn').click()); await p.waitForFunction(() => document.querySelectorAll('#svPartSel option').length > 4, null, { timeout: 120000 }).catch(() => {}); await p.waitForTimeout(800);
  // 원본 악보: 단추 → 작은 창 → 두 줄 고르기
  await p.click('#viewScore'); await p.waitForTimeout(800);
  if (phone) { const m = await p.$('#svMore'); if (m && await m.isVisible()) {} }
  chk(await p.isVisible('#svPartBtn'), 'part button visible');
  await p.click('#svPartBtn'); await p.waitForTimeout(300);
  chk(await p.isVisible('#svPartPop'), 'popover open'); await p.screenshot({ path: '/tmp/parts-' + (phone ? 'phone' : 'pc') + '.png' });
  const nb = (await p.$$('#svPartPop input')).length; chk(nb >= 3, 'line checkboxes ' + nb); const box = i => p.click(`#svPartPop label:nth-of-type(${i + 1}) input`);
  const want = await p.$$eval('#svPartPop input', bs => bs.slice(0, 3).map(b => b.dataset.key));
  await box(0); await p.waitForTimeout(500);
  let st = await p.evaluate(() => ({ sel: document.getElementById('svPartSel').value, btn: document.getElementById('svPartBtn').textContent, strips: document.querySelectorAll('#svWrap .sv-strip').length }));
  chk(st.sel === want[0] && /만/.test(st.btn) && st.strips > 0, 'one line → OO만 ' + JSON.stringify(st));
  await box(2); await p.waitForTimeout(800); await p.screenshot({ path: '/tmp/parts2-' + (phone ? 'phone' : 'pc') + '.png' });
  st = await p.evaluate(() => ({ sel: document.getElementById('svPartSel').value, btn: document.getElementById('svPartBtn').textContent, strips: [...document.querySelectorAll('#svWrap .sv-strip')].length, sys1: document.querySelectorAll('#svWrap .sv-sys1').length }));
  chk(st.sel === '' && /·/.test(st.btn) && st.strips >= 2 * st.sys1 && st.sys1 > 0, 'two lines → strips ' + JSON.stringify(st));
  await box(1); await p.waitForTimeout(800);
  st = await p.evaluate(() => ({ btn: document.getElementById('svPartBtn').textContent, strips: document.querySelectorAll('#svWrap .sv-strip').length, sys1: document.querySelectorAll('#svWrap .sv-sys1').length }));
  chk(/외 2/.test(st.btn) && st.strips >= 3 * st.sys1, 'three lines ' + JSON.stringify(st));
  // 재생 중 마디 누르기 → 노란 칸이 띠 위에
  await p.mouse.click(5, 5); await p.waitForTimeout(200); chk(!(await p.isVisible('#svPartPop')), 'popover closes on outside');
  await p.evaluate(() => window.__barClick && window.__barClick(4)); await p.waitForTimeout(1500);
  // 인식 악보: 고른 세 줄만 그림
  await p.click('#viewRec'); await drawn(); await p.waitForTimeout(800);
  const nst = await p.evaluate(() => { const m = document.querySelector('#recWrap g.measure'); return m ? m.querySelectorAll('g.staff').length : 0; });
  chk(nst >= 3 && nst <= 6, 'rec shows chosen parts only, staves=' + nst);
  // 총보 전체로
  await p.click('#svPartBtn'); await p.waitForTimeout(300); await p.click('#svPartPop .pp-all'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(500);
  const nAll = await p.evaluate(() => { const m = document.querySelector('#recWrap g.measure'); return m ? m.querySelectorAll('g.staff').length : 0; });
  st = await p.evaluate(() => document.getElementById('svPartBtn').textContent);
  chk(/총보 전체/.test(st) && nAll >= nst, 'back to full ' + st + ' staves=' + nAll);
  chk(!errs.length, 'no page errors ' + errs.slice(0, 2).join(' | '));
  console.log(fail ? fail + ' FAIL' : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0);
})();
