const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 3단계(219번) 편집 모드·검사기 시험: NODE_PATH=/opt/npm-tools/node_modules node test/pwed.cjs [접두어] [phone]
//  ① [연습 | ✎ 편집] — 편집을 켜면 PC는 나란히, 끄면 원본 PDF로 돌아감
//  ② 인식 악보에서 음을 누르면 고름(파랑) + 검사기 + 원본 PDF 머리에 파란 동그라미, 판정('PDF 음표와 맞음' 등)
//  ③ 검사기 ♯ / 자판 ↑ → 수정 기록(성부|순번)에 m, 인식 악보가 다시 그려지고 고른 음 유지, 고친 음 보라, 판정이 '악보와 다르게' + 메모 칸
//  ④ 메모 저장, 길이 단추·자판(4), Ctrl+Z 되돌리기, ← → 이동, ▶ 이 마디(그 마디가 끝나면 멈춤), Esc, [연습]으로 돌아가면 검사기 닫힘
//  ⑤ 원본 PDF에서 마디를 누르면 예전처럼 음 목록 창, 페이지 오류 없음
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = process.env.VRV || __SWR + '/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 120000 });
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 빠르기를 못 읽은 악보도 재생되게
  await p.evaluate(() => { for (const i of document.querySelectorAll('#tempoRows input[type=number]')) if (!+i.value) { i.value = 120; i.dispatchEvent(new Event('input', { bubbles: true })); i.dispatchEvent(new Event('change', { bubbles: true })); } });
  const pressed = id => p.evaluate(id => document.getElementById(id).getAttribute('aria-pressed') === 'true', id);
  ok('처음은 연습', await pressed('svPractice') && !(await pressed('svEdit')));
  if (phone) await p.click('#viewRec');
  await p.click('#svEdit'); await p.waitForTimeout(500);
  ok('편집 켜짐', await pressed('svEdit') && !(await pressed('svPractice')));
  if (!phone) ok('PC: 편집을 켜면 나란히', (await p.evaluate(() => window.__recState().src)) === 'side');
  await drawn(); await p.waitForTimeout(500);
  // 음 하나 누르기(넷째 마디 이후 첫 음표)
  const pickNote = async () => { const n0 = await pickNote0(); if (!n0) return n0; await p.waitForTimeout(700); return (await p.evaluate(id => { const el = document.querySelector(`#recWrap g.note[data-id^="${id}_"]`) || document.querySelector(`#recWrap g.note[data-id="${id}"]`); if (!el) return null; const h = el.querySelector('.notehead') || el, r = h.getBoundingClientRect(); return { id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, n0.id)) || n0; };   // 230번: 굴린 뒤(나란히 함께 넘기기) 자리를 다시 잼
  const pickNote0 = () => p.evaluate(FROM => {
    const ids = window.__ed.ids().filter(i => /_R\d+$/.test(i) && +i.split('_')[2] >= FROM);
    for (const id of ids) { window.__ed.select(id); const cx = window.__ed.ctx(); window.__ed.select(null); if (!cx || !cx.now || !cx.now.length) continue; const el = document.querySelector(`#recWrap g.note[data-id^="${id}_"]`) || document.querySelector(`#recWrap g.note[data-id="${id}"]`); if (!el) continue; el.scrollIntoView({ block: 'center' }); const h = el.querySelector('.notehead') || el, r = h.getBoundingClientRect(); if (r.width) return { id, x: r.left + r.width / 2, y: r.top + r.height / 2 }; }
    return null;
  }, +(process.env.FROM || 3));
  const selVisible = () => p.evaluate(() => { const e = document.querySelector('#recWrap g.note.ed-sel'); if (!e) return 'none'; const b = e.getBoundingClientRect(), w = document.getElementById('recWrap').getBoundingClientRect(); return b.top >= w.top - 2 && b.bottom <= w.bottom + 2 && b.top >= 0 && b.bottom <= innerHeight ? 'yes' : `no ${Math.round(b.top)} [${Math.round(w.top)},${Math.round(w.bottom)}]`; });
  let n = await pickNote(); ok('누를 음을 찾음', !!n, n && n.id);
  if (phone) await p.touchscreen.tap(n.x, n.y); else await p.mouse.click(n.x, n.y);
  await p.waitForTimeout(700);
  const sel = await p.evaluate(() => window.__ed.sel());
  ok('음을 누르면 고름', sel && sel.id === n.id, JSON.stringify(sel));
  ok('검사기가 보임', await p.evaluate(() => { const e = document.getElementById('edInsp'); return !!e && !e.hidden && e.getBoundingClientRect().height > 100; }));
  ok('고른 음 파랑', await p.evaluate(() => document.querySelectorAll('#recWrap g.note.ed-sel').length > 0));
  await p.waitForTimeout(1200); if (!phone) { const sv = await selVisible(); ok('고른 음이 화면에 보임(나란히 함께 넘기기 뒤에도)', sv === 'yes', sv); }
  ok('재생은 시작되지 않음', await p.evaluate(() => /정지/.test(document.getElementById('nowText').textContent)));
  if (!phone) ok('원본 PDF 머리에 파란 동그라미', await p.evaluate(() => document.querySelectorAll('#svWrap .sv-sel').length > 0));
  await p.waitForTimeout(600);
  const v0 = await p.evaluate(() => window.__ed.verdict()); ok('판정이 나옴', v0 === 'ok' || v0 === 'diff' || v0 === 'na', v0);
  const c0 = await p.evaluate(() => window.__ed.ctx());
  // 높이 올리기
  if (phone) await p.click('#edInsp button[title^="한 옥타브 올림"]'); else await p.keyboard.press('Control+ArrowUp');
  await p.waitForTimeout(400);
  const c1 = await p.evaluate(() => window.__ed.ctx());
  ok('Ctrl+↑/↑8 → 수정 기록에 높이', c1 && c1.rec && c1.rec.m && c1.rec.m[0] === c0.now[0] + 12, JSON.stringify(c1 && c1.rec));
  await drawn(); await p.waitForTimeout(900);
  ok('다시 그린 뒤에도 고른 음 유지', await p.evaluate(id => window.__ed.sel().id === id && document.querySelectorAll('#recWrap g.note.ed-sel').length > 0, n.id));
  if (!phone) { const sv = await selVisible(); ok('고친 뒤에도 고른 음이 화면에 보임', sv === 'yes', sv); }
  ok('고친 음 보라', await p.evaluate(() => document.querySelectorAll('#recWrap g.note.ed-mod').length > 0));
  const v1 = await p.evaluate(() => window.__ed.verdict());
  if (v0 === 'ok') {
    ok("옥타브 올리면 '악보와 다르게'", v1 === 'diff', v1);
    ok('메모 칸', await p.evaluate(() => !!document.querySelector('#edInsp .ei-memo')));
    await p.fill('#edInsp .ei-memo', 'PDF 오타'); await p.press('#edInsp .ei-memo', 'Enter'); await p.waitForTimeout(400);
    ok('메모 저장', (await p.evaluate(() => window.__ed.ctx().rec.memo)) === 'PDF 오타');
    // 되돌려 맞추면 '악보대로'(원래 음이 PDF와 맞았으므로 수정 기록은 지워짐)
  } else console.log('note: 처음 판정이', v0, '— 악보대로/다르게 비교는 건너뜀');
  await p.screenshot({ path: '/tmp/pwed-insp-' + (phone ? 'phone' : 'pc') + '.png' });
  // 길이
  const durBefore = (await p.evaluate(() => window.__ed.ctx())).dur;
  if (phone) await p.click('#edInsp button[title^="4분음표"]'); else await p.keyboard.press('3');
  await p.waitForTimeout(400);
  const c2 = await p.evaluate(() => window.__ed.ctx());
  ok('길이 4분음표', c2.dur === '1/4' && (durBefore === '1/4' || c2.rec.d === '1/4'), durBefore + ' → ' + c2.dur);
  // 되돌리기
  if (!phone) {
    await p.keyboard.press('Control+z'); await p.waitForTimeout(400);
    ok('Ctrl+Z로 길이 되돌림', (await p.evaluate(() => window.__ed.ctx().dur)) === durBefore);
    await p.keyboard.press('ArrowRight'); await p.waitForTimeout(300);
    const s2 = await p.evaluate(() => window.__ed.sel());
    ok('→ 뒤 음', s2 && s2.id !== n.id, s2 && s2.id);
    await p.keyboard.press('ArrowLeft'); await p.waitForTimeout(300);
    ok('← 앞 음(처음 음)', (await p.evaluate(() => window.__ed.sel().id)) === n.id);
  }
  // 이 음 되돌리기(↺)
  await p.click('#edInsp button[title="이 음을 원래대로"]'); await p.waitForTimeout(500);
  ok('↺ 되돌리기 → 수정 없음', !(await p.evaluate(() => window.__ed.ctx().rec)));
  // ▶ 이 마디: 그 마디가 끝나면 멈춤
  await p.click('#edInsp button.primary');
  let played = false;
  for (let i = 0; i < 60; i++) { await p.waitForTimeout(500); const pl = await p.evaluate(() => !/정지|카운트인|만드는/.test(document.getElementById('nowText').textContent)); if (pl) played = true; else if (played) break; }
  const nowT = await p.evaluate(() => document.getElementById('nowText').textContent);
  ok('▶ 이 마디: 재생된 뒤 멈춤', played && !(await p.evaluate(() => window.__st.playing)), nowT);
  // Esc → 닫기
  if (!phone) { await p.keyboard.press('Escape'); await p.waitForTimeout(200); ok('Esc → 고르기 풀림·검사기 닫힘', await p.evaluate(() => !window.__ed.sel() && document.getElementById('edInsp').hidden)); }
  // 원본 PDF에서 마디 → 음 목록 창(예전과 같음)
  if (!phone) {
    const r = await p.evaluate(() => { const d = document.querySelectorAll('#svWrap .sv-strip.sv-sys1')[2] || document.querySelector('#svWrap .sv-page'); d.scrollIntoView({ block: d.classList.contains('sv-strip') ? 'center' : 'start' }); const b = d.getBoundingClientRect(); return d.classList.contains('sv-strip') ? { x: b.left + b.width * 0.45, y: b.top + b.height * 0.06 } : { x: b.left + b.width * 0.45, y: b.top + Math.min(b.height, 600) * 0.35 }; });   // 230번: 나란히 켠 줄 띠면 띠 위쪽 빈 곳(음표 머리에서 먼 곳)
    await p.mouse.click(r.x, r.y); await p.waitForTimeout(800);
    ok('원본 PDF 마디 → 음 목록 창', await p.evaluate(() => !!document.querySelector('.edit-dlg')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(200);
  }
  // 다시 고른 뒤 [연습]
  n = await pickNote(); if (phone) await p.touchscreen.tap(n.x, n.y); else await p.mouse.click(n.x, n.y); await p.waitForTimeout(400);
  await p.click('#svPractice'); await p.waitForTimeout(500);
  ok('[연습] → 검사기 닫힘·파랑/보라 없음', await p.evaluate(() => !window.__ed.sel() && (document.getElementById('edInsp') || { hidden: true }).hidden && !document.querySelector('#recWrap .ed-sel, #recWrap .ed-mod')));
  if (!phone) ok('[연습] → 원본 PDF로 돌아감', (await p.evaluate(() => window.__recState().src)) === 'pdf');
  await p.screenshot({ path: '/tmp/pwed-' + (phone ? 'phone' : 'pc') + '.png' });
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
