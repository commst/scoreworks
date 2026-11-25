// 222번 시험: 4단계 구조 편집·음표판 — 지우기·되돌리기, 넣기(오선 위 누르기)·화음·성부 바꾸기, 다시 열어도 남음, 전체화면에서 음표판·검사기, MusicXML 만들기
// NODE_PATH=/opt/npm-tools/node_modules node test/pwpal.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = '/home/claude/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); p.on('console', m => { if (m.type() === 'warning' || m.type() === 'error') { if (!/ERR_TUNNEL|Failed to load/.test(m.text())) console.log('  con', m.text()); } });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  const open = async () => {
    await p.setInputFiles('#pdfInput', t);
    await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
    await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  };
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 180000 });
  await p.goto(HTML); await p.waitForTimeout(800); await open();
  if (phone) await p.click('#viewRec');
  await p.click('#svEdit'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(600);
  ok('편집을 켜면 음표판', (await p.evaluate(() => window.__ed.pal())).el);
  const K = 114, ID = 'n0_0_114_R0';
  const evs = () => p.evaluate(K => window.__ed.evs('0', K), K);
  const e0 = await evs();
  // ① 지우기 · Ctrl+Z
  await p.evaluate(id => window.__ed.select(id), ID); await p.waitForTimeout(600);
  await p.click('#edPal .pal-del-b'); await p.waitForTimeout(800);
  const e1 = await evs();
  ok('① 고른 음 지우기', e1.length === e0.length - 1 && !e1.some(e => e[0] === e0[0][0] && e[2] === 'R'), `${e0.length} → ${e1.length}`);
  ok('  지운 뒤 다음 음을 고름', !!(await p.evaluate(() => window.__ed.sel())));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(800);
  ok('  Ctrl+Z로 되살림', JSON.stringify(await evs()) === JSON.stringify(e0));
  // ② 넣기: 8분음표, 그 마디 가운데쯤 가온 줄
  await p.evaluate(() => window.__ed.select(null)); await p.waitForTimeout(300);
  if (!phone) { await p.keyboard.press('n'); await p.keyboard.press('4'); } else { await p.click('#edPal .pal-ins-b'); await p.click('#edPal button[title^="8분음표"]'); }
  await p.waitForTimeout(300);
  ok('② 넣기 모드', (await p.evaluate(() => window.__ed.pal())).mode === 'note');
  const spot = await p.evaluate(K => {
    const c = [...document.querySelectorAll('#recWrap .rec-chunk')]; let m = null;
    for (const el of c) { const ms = el.querySelectorAll('g.measure'); for (const q of ms) { const n = q.querySelector('g.note[data-id^="n0_0_' + K + '_"]'); if (n) { m = q; break; } } if (m) break; }
    if (!m) return null; m.scrollIntoView({ block: 'center' });
    const st = m.querySelector(':scope > g.staff'), ys = [...st.querySelectorAll(':scope > path')].slice(0, 5).map(p => { const r = p.getBoundingClientRect(); return r.top + r.height / 2; });
    const mb = m.getBoundingClientRect(), top = Math.min(...ys), bot = Math.max(...ys);
    return { x: mb.left + mb.width * 0.55, y: (top + bot) / 2, sp: (bot - top) / 4 };
  }, K);
  ok('  누를 자리', !!spot);
  await p.waitForTimeout(500);
  const spot2 = await p.evaluate(K => { const m = [...document.querySelectorAll('#recWrap g.measure')].find(q => q.querySelector('g.note[data-id^="n0_0_' + K + '_"]')); const st = m.querySelector(':scope > g.staff'), ys = [...st.querySelectorAll(':scope > path')].slice(0, 5).map(p => { const r = p.getBoundingClientRect(); return r.top + r.height / 2; }); const mb = m.getBoundingClientRect(), top = Math.min(...ys), bot = Math.max(...ys); return { x: mb.left + mb.width * 0.55, y: (top + bot) / 2, sp: (bot - top) / 4 }; }, K);
  if (!phone) { await p.mouse.move(spot2.x, spot2.y); await p.waitForTimeout(200); ok('  미리 보기(넣을 자리·음 이름)', await p.evaluate(() => { const g = document.querySelector('.pal-ghost'); return !!g && !g.hidden && /마디/.test(g.dataset.label); }), await p.evaluate(() => (document.querySelector('.pal-ghost') || {}).dataset?.label)); }
  if (phone) await p.touchscreen.tap(spot2.x, spot2.y); else await p.mouse.click(spot2.x, spot2.y);
  await p.waitForTimeout(1200);
  const e2 = await evs(), added = e2.filter(e => e[5] && e[1] === '1/8' && e[2] === 'R');
  ok('  오선을 누르면 8분음표가 들어감', added.length >= 1, JSON.stringify(added));
  const s2 = await p.evaluate(() => window.__ed.ctx());
  ok('  넣은 음을 고름', s2 && s2.dur === '1/8', JSON.stringify(s2 && [s2.now, s2.dur]));
  ok('  가온 줄 = 시5(B4)… 조표 따름', s2 && s2.now && s2.now.length === 1 && Math.abs(s2.now[0] - 71) <= 1, s2 && String(s2.now));
  // ③ 화음: 세 칸 위를 같은 박에
  await p.evaluate(() => {}); if (!phone) await p.keyboard.press('h'); else await p.click('#edPal button[title^="같은 박에"]');
  await drawn(); await p.waitForTimeout(1200);
  const sel = await p.evaluate(() => { const e = document.querySelector('#recWrap g.note.ed-sel'); if (!e) return null; const h = e.querySelector('.notehead') || e, r = h.getBoundingClientRect(); const st = e.closest('g.staff'), ys = [...st.querySelectorAll(':scope > path')].slice(0, 5).map(p => { const q = p.getBoundingClientRect(); return q.top + q.height / 2; }); return { x: r.left + r.width / 2, y: (Math.max(...ys) + Math.min(...ys)) / 2, sp: (Math.max(...ys) - Math.min(...ys)) / 4 }; });   // y = 가온 줄(넣은 음 자리)
  await p.waitForTimeout(300);
  if (process.env.DBG && sel) console.log('  dbg', JSON.stringify(sel), JSON.stringify(await p.evaluate(([x, y, sp]) => [window.__ed.pos(x, y), window.__ed.pos(x, y - sp * 1.5)], [sel.x, sel.y, sel.sp])));
  if (sel) { if (phone) await p.touchscreen.tap(sel.x, sel.y - sel.sp * 1.5); else await p.mouse.click(sel.x, sel.y - sel.sp * 1.5); }
  await p.waitForTimeout(1200);
  const s3 = await p.evaluate(() => window.__ed.ctx());
  ok('③ 화음: 같은 박에 누르면 음이 더해짐(세 칸 위 = 미♭5)', s3 && s3.now && s3.now.length === 2 && s3.now[1] === 75, JSON.stringify(s3 && s3.now));
  // ④ 고르기로 돌아가 성부 바꾸기
  if (!phone) await p.keyboard.press('Escape'); else await p.click('#edPal button[title^="음을 눌러 고르기"]');
  await p.waitForTimeout(300);
  ok('④ Esc → 고르기 모드', (await p.evaluate(() => window.__ed.pal())).mode === 'sel');
  await p.click('#edPal button[title="고른 음을 다른 성부로"]'); await p.waitForTimeout(1000);
  const s4 = await p.evaluate(() => window.__ed.sel());
  ok('  성부 바꾸기 → 아랫성부', s4 && s4.v === 'L', JSON.stringify(s4));
  ok('  MusicXML 만들기 오류 없음', (await p.evaluate(() => window.__ed.xml())) > 1000);
  const eBefore = await evs();
  // ⑤ 다시 열어도 그대로(이 기기에 저장)
  await p.click('#svPractice'); await open();
  await p.waitForTimeout(500);
  ok('⑤ 다시 열어도 마디 다시 쓰기가 남음', JSON.stringify(await evs()) === JSON.stringify(eBefore));
  // ⑥ 전체화면: 음표판·검사기
  if (phone) await p.click('#viewRec');
  await p.click('#svEdit'); await p.waitForTimeout(400); await drawn();
  await p.evaluate(() => { const b = document.getElementById('svFull'); if (b.offsetParent === null) { const m = document.querySelector('.sv-more'); if (m) m.click(); } });
  await p.click('#svFull'); await p.waitForTimeout(900); await drawn(); await p.waitForTimeout(400);
  await p.evaluate(id => window.__ed.select(id), ID); await p.waitForTimeout(800);
  const fs2 = await p.evaluate(() => {
    const pal = document.getElementById('edPal'), ins = document.getElementById('edInsp'), pr = pal.getBoundingClientRect(), ir = ins.getBoundingClientRect();
    const topAt = (r) => { const e = document.elementFromPoint(r.left + r.width / 2, r.top + Math.min(r.height / 2, 20)); return !!e && (pal.contains(e) || ins.contains(e)); };
    const dock = document.querySelector('.score-view.sv-full .sv-fdock'), dr = dock ? dock.getBoundingClientRect() : null;
    return { full: document.getElementById('scoreView').classList.contains('sv-full'), palTop: topAt(pr), insTop: topAt(ir), inView: pr.top >= 0 && pr.bottom <= innerHeight, aboveDock: !dr || pr.bottom <= dr.top + 1, insHidden: ins.hidden };
  });
  ok('⑥ 전체화면에서 음표판이 보이고 맨 위', fs2.full && fs2.palTop && fs2.inView, JSON.stringify(fs2));
  ok('  음표판이 아래 연주 막대를 가리지 않음', fs2.aboveDock);
  ok('  전체화면에서 검사기도 보임', !fs2.insHidden && fs2.insTop);
  await p.screenshot({ path: '/tmp/pwpal-full-' + (phone ? 'phone' : 'pc') + '.png' });
  await p.click('#edPal .pal-del-b'); await p.waitForTimeout(800);
  ok('  전체화면에서 지우기', (await evs()).length === eBefore.length - 1);
  await p.keyboard.press('Control+z'); await p.waitForTimeout(500);
  await p.click('#svFull'); await p.waitForTimeout(400);
  await p.click('#svPractice'); await p.waitForTimeout(300);
  ok('[연습] → 음표판 닫힘', !(await p.evaluate(() => window.__ed.pal())).el);
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
