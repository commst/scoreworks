const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 228번 시험: 음표 끌어 놓기 — ① 음표판 8분음표 단추를 악보로 끌어다 놓으면 그 자리에 들어감(마우스, 휴대폰은 손가락) ② 인식 악보의 음을 옆으로 끌어 다른 박으로 옮김(마우스) ③ 위아래 끌기는 예전처럼 높이만
// NODE_PATH=/opt/npm-tools/node_modules node test/pwdnd.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = __SWR + '/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 180000 });
  await p.click('#viewRec'); await p.click('#svEdit'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(600);
  const K = 114, evs = () => p.evaluate(K => window.__ed.evs('0', K), K);
  const meas = () => p.evaluate(K => { const m = [...document.querySelectorAll('#recWrap g.measure')].find(q => q.querySelector('g.note[data-id^="n0_0_' + K + '_"]')); const st = m.querySelector(':scope > g.staff'), ys = [...st.querySelectorAll(':scope > path')].slice(0, 5).map(p => { const r = p.getBoundingClientRect(); return r.top + r.height / 2; }); const mb = m.getBoundingClientRect(); return { l: mb.left, w: mb.width, mid: (Math.min(...ys) + Math.max(...ys)) / 2, sp: (Math.max(...ys) - Math.min(...ys)) / 4, top: mb.top }; }, K);
  await p.evaluate(K => { const n = document.querySelector('#recWrap g.note[data-id^="n0_0_' + K + '_"]'); n.scrollIntoView({ block: 'center' }); }, K); await p.waitForTimeout(500);
  const e0 = await evs();
  // ① 음표판 8분음표 단추를 끌어다 놓기
  const bt = await p.evaluate(() => { const b = document.querySelector('#edPal button[title^="8분음표"]'); b.scrollIntoView({ inline: 'center' }); const r = b.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  let m = await meas(); const tx = m.l + m.w * 0.55, ty = m.mid;
  if (phone) {
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: bt.x, y: bt.y }] });
    for (let i = 1; i <= 10; i++) { await cdp.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: bt.x + (tx - bt.x) * i / 10, y: bt.y + (ty - bt.y) * i / 10 }] }); await p.waitForTimeout(30); }
    ok('  끄는 동안 미리 보기', await p.evaluate(() => { const g = document.querySelector('.pal-ghost'); return !!g && !g.hidden && /마디/.test(g.dataset.label); }));
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  } else {
    await p.mouse.move(bt.x, bt.y); await p.mouse.down(); await p.mouse.move(tx, ty, { steps: 12 });
    const gs = await p.evaluate(() => [...document.querySelectorAll('.pal-ghost')].map(g => [g.hidden, g.dataset.label, g.style.display]));
    ok('  끄는 동안 미리 보기', gs.some(x => !x[0] && /마디/.test(x[1])), JSON.stringify(gs));
    await p.mouse.up();
  }
  await p.waitForTimeout(1200);
  const e1 = await evs(), add = e1.filter(e => e[5] && e[1] === '1/8' && e[2] === 'R');
  ok('① 음표판에서 끌어다 놓으면 8분음표가 들어감', add.length >= 1, JSON.stringify(add));
  ok('  넣은 음을 고름', ((await p.evaluate(() => window.__ed.ctx())) || {}).dur === '1/8');
  ok('  음표판 길이는 그대로(끌기는 고르기가 아님)', (await p.evaluate(() => window.__ed.pal())).dur === '1/4');
  await p.keyboard.press('Control+z'); await p.waitForTimeout(900);
  ok('  Ctrl+Z로 되돌림', JSON.stringify(await evs()) === JSON.stringify(e0));
  if (!phone) {
    // ② 옆으로 끌어 옮기기: 115마디 첫 음(0박)을 오른쪽으로
    await drawn(); await p.waitForTimeout(600);
    await p.evaluate(() => window.__ed.select('n0_0_114_R0')); await p.waitForTimeout(800);
    const h = await p.evaluate(() => { const e = document.querySelector('#recWrap g.note.ed-sel'); const hd = e.querySelector('.notehead') || e, r = hd.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
    m = await meas();
    await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(h.x + 30, h.y, { steps: 4 }); await p.mouse.move(m.l + m.w * 0.47, h.y, { steps: 8 });
    const tip = await p.evaluate(() => (document.querySelector('.ed-dragtip') || {}).textContent);
    await p.mouse.up(); await p.waitForTimeout(1200);
    const e2 = await evs(), moved = e2.filter(e => e[5] && e[2] === 'R' && e[3] && e[3][0] === 68 && e[0] !== '0' && e[1] === '1/4');   // 옮긴 음(덮어쓰기로 줄어든 이웃 음은 빼고)
    ok('② 옆으로 끌어 다른 박으로 옮김(높이·길이 그대로)', !e2.some(e => e[0] === '0' && e[2] === 'R') && moved.length >= 1 && moved[0][1] === '1/4', `${tip} → ${JSON.stringify(e2)}`);
    const s2 = await p.evaluate(() => window.__ed.sel());
    ok('  옮긴 음을 고름', s2 && s2.k === 114, JSON.stringify(s2));
    await p.keyboard.press('Control+z'); await p.waitForTimeout(900);
    ok('  Ctrl+Z로 되돌림', JSON.stringify(await evs()) === JSON.stringify(e0));
    // ③ 위아래 끌기는 높이만(옮기지 않음)
    await drawn(); await p.waitForTimeout(600);
    await p.evaluate(() => window.__ed.select('n0_0_114_R0')); await p.waitForTimeout(800);
    const h3 = await p.evaluate(() => { const e = document.querySelector('#recWrap g.note.ed-sel'); const hd = e.querySelector('.notehead') || e, r = hd.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hh: r.height }; });
    await p.mouse.move(h3.x, h3.y); await p.mouse.down(); await p.mouse.move(h3.x + 3, h3.y - h3.hh, { steps: 6 }); await p.mouse.up(); await p.waitForTimeout(900);
    const c3 = await p.evaluate(() => window.__ed.ctx());
    ok('③ 위아래로 끌면 높이만 바뀜', c3 && c3.rec && c3.rec.m && c3.rec.m[0] > 68 && (await evs()).length === e0.length, JSON.stringify(c3 && c3.rec));
  }
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
