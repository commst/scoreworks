// 220번 시험: 악보를 불러오면 원본 PDF 보기 + 3단계 2차(악보와 다르게 주황 ✎·목록, ✓ 맞음, 원본 PDF 머리 눌러 고르기, 끌어서 높이)
// NODE_PATH=/opt/npm-tools/node_modules node test/pwed2.cjs [접두어]   (FROM=마디 순번, 기본 100)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = process.env.VRV || '/home/claude/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept()); p.on('console', m => { if (m.type() === 'warning') console.log('  warn', m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(500);
  await p.evaluate(() => localStorage.setItem('hapju-view', JSON.stringify({ mode: 'score', src: 'rec', zoom: 1 })));   // 지난번에 인식 악보를 보던 기기
  await p.reload(); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  ok('① 악보를 불러오면 원본 PDF 보기', (await p.evaluate(() => window.__recState().src)) === 'pdf', await p.evaluate(() => window.__recState().src));
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 120000 });
  await p.click('#svEdit'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(500);
  // PDF와 맞는 음 하나 찾기
  const found = await p.evaluate(FROM => {
    for (const id of window.__ed.ids().filter(i => /_R\d+$/.test(i) && +i.split('_')[2] >= FROM)) { window.__ed.select(id); const cx = window.__ed.ctx(); if (cx && cx.now && cx.now.length === 1 && window.__ed.judge() === 'ok') return { id, now: cx.now }; }
    return null;
  }, +(process.env.FROM || 100));
  ok('PDF와 맞는 음', !!found, found && found.id);
  await p.waitForTimeout(800);
  // ② 원본 PDF 머리를 눌러 고르기: 파란 동그라미 자리를 누름(원본 PDF만 보는 화면 — 나란히는 함께 넘기기로 PDF 칸이 움직임)
  await p.click('#viewScore'); await p.waitForTimeout(600); await p.evaluate(id => window.__ed.select(id), found.id); await p.waitForTimeout(1500);
  const ring = await p.evaluate(() => { const d = document.querySelector('#svWrap .sv-sel'); if (!d) return null; const r = d.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; });
  ok('파란 동그라미', !!ring);
  await p.keyboard.press('ArrowRight'); await p.waitForTimeout(400);   // 같은 마디 뒤 음으로(검사기가 열린 채라 화면 배치가 그대로)
  ok('  다른 음으로 옮김', (await p.evaluate(() => window.__ed.sel().id)) !== found.id);
  if (ring) { console.log('  dbg', await p.evaluate(r => { const e = document.elementFromPoint(r.x, r.y); return (e && e.className) + ' ' + JSON.stringify(window.__ed.pdfAt(r.x, r.y)); }, ring)); await p.mouse.click(ring.x, ring.y); await p.waitForTimeout(700); }
  const s2 = await p.evaluate(() => window.__ed.sel());
  ok('② 원본 PDF 음표 머리를 누르면 그 음을 고름', s2 && s2.id === found.id, JSON.stringify(s2 && s2.id));
  ok('  음 목록 창은 뜨지 않음', !(await p.evaluate(() => !!document.querySelector('.edit-dlg'))));
  await p.click('#viewSide'); await p.waitForTimeout(800);
  // ③ 끌어서 높이: 인식 악보의 음 머리를 위로 2칸(반 칸 × 2)
  await p.evaluate(id => window.__ed.select(id), found.id); await p.waitForTimeout(900);
  const h = await p.evaluate(id => { const el = document.querySelector(`#recWrap g.note[data-id^="${id}_"]`) || document.querySelector(`#recWrap g.note[data-id="${id}"]`); if (!el) return null; const hd = el.querySelector('.notehead') || el, r = hd.getBoundingClientRect(); return { x: r.left + r.width / 2, y: r.top + r.height / 2, hh: r.height }; }, found.id);
  ok('끌 음 머리', !!h);
  await p.mouse.move(h.x, h.y); await p.mouse.down(); await p.mouse.move(h.x, h.y - h.hh * 0.5, { steps: 3 }); await p.mouse.move(h.x, h.y - h.hh * 1.0, { steps: 3 });
  const tip = await p.evaluate(() => { const d = document.querySelector('.ed-dragtip'); return d && d.textContent; });
  await p.mouse.up(); await p.waitForTimeout(600);
  const c3 = await p.evaluate(() => window.__ed.ctx());
  ok('③ 끌어서 높이 — 2도 위(온음계 두 칸)', c3 && c3.rec && c3.rec.m && c3.rec.m[0] > found.now[0] && c3.rec.m[0] - found.now[0] <= 4, `${found.now} → ${c3 && c3.rec && c3.rec.m} 미리보기 ${tip}`);
  ok('  고른 음 그대로', (await p.evaluate(() => window.__ed.sel() && window.__ed.sel().id)) === found.id);
  await drawn(); await p.waitForTimeout(1200);
  ok("  판정 '악보와 다르게'", (await p.evaluate(() => window.__ed.verdict())) === 'diff', await p.evaluate(() => window.__ed.verdict()));
  await p.fill('#edInsp .ei-memo', '지휘자 지시'); await p.press('#edInsp .ei-memo', 'Enter'); await p.waitForTimeout(400);
  // ④ 겹쳐 보기: 고친 음은 빨강이 아니라 주황 ✎, [✎ 악보와 다르게 n] 목록
  await p.evaluate(() => { const c = document.getElementById('svOver'); if (!c.checked) c.click(); });
  await p.waitForTimeout(2500);
  ok('④ 겹쳐 보기에 주황 ✎(악보와 다르게)', await p.evaluate(() => document.querySelectorAll('#svWrap .sv-ovn.intent:not(.miss)').length > 0));
  ok('  원래 자리 PDF 머리는 주황 네모', await p.evaluate(() => document.querySelectorAll('#svWrap .sv-ovn.miss.intent').length > 0));
  await p.evaluate(() => { const e = document.querySelector('#svWrap .sv-ovn.intent'); if (e) e.scrollIntoView({ block: 'center' }); }); await p.waitForTimeout(500);
  await p.screenshot({ path: '/tmp/pwed2-ov.png' });
  const lst = await p.evaluate(() => window.__ed.diff());
  ok('  [✎ 악보와 다르게 n] 단추·목록', await p.evaluate(() => !document.getElementById('svDiff').hidden) && lst.length >= 1 && lst.some(x => x[3] === '지휘자 지시'), JSON.stringify(lst.slice(0, 3)));
  await p.click('#svDiff'); await p.waitForTimeout(400);
  ok('  목록 창', await p.evaluate(() => /악보와 다르게 고친 곳/.test((document.querySelector('.edit-dlg h2') || {}).textContent || '')));
  await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  // ⑤ ✓ 맞음
  await p.evaluate(id => window.__ed.select(id), found.id); await p.waitForTimeout(500);
  await p.click('#edInsp .ei-ok'); await p.waitForTimeout(2500);
  ok('⑤ ✓ 맞음 저장', await p.evaluate(() => window.__ed.barOk()));
  ok('  겹쳐 보기에 ✓ 표시', await p.evaluate(() => document.querySelectorAll('#svWrap .sv-okd').length > 0));
  await p.keyboard.press('Control+z'); await p.waitForTimeout(800);
  ok('  Ctrl+Z로 ✓ 맞음 되돌림', !(await p.evaluate(() => window.__ed.barOk())));
  // 되돌리기
  await p.click('#edInsp button[title="이 음을 원래대로"]'); await p.waitForTimeout(2500);
  ok('↺ 되돌리면 목록에서 빠짐', (await p.evaluate(() => window.__ed.diff().length)) === lst.length - 1 && await p.evaluate(() => document.getElementById('svDiff').hidden === (window.__ed.diff().length === 0)));
  // ⑥ 다시 불러오면 원본 PDF
  await p.click('#svPractice'); await p.click('#viewRec'); await p.waitForTimeout(300);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800);
  ok('⑥ 인식 악보를 보다가 다시 불러와도 원본 PDF', (await p.evaluate(() => window.__recState().src)) === 'pdf');
  await p.screenshot({ path: '/tmp/pwed2.png' });
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
