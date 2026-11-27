const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 2단계(213번) 인식 악보 보기 시험: NODE_PATH=/opt/npm-tools/node_modules node test/pwrec.cjs [접두어] [phone]
//  ① 시작 화면(예시 장단, 쪽 그림 없음)에서 [인식 악보]가 그려짐 ② PDF를 올린 뒤 [인식 악보] — 첫 조각 시간, 모든 마디가 그려짐(조각 마디 수 = 마디 수)
//  ③ 마디를 누르면 그 마디부터 재생 → 노란 칸(지금 마디)·음표 칠하기 ④ 크기 + ⑤ 'OO만' ⑥ 나란히(두 칸 다 보임, 좌우/위아래)
//  ⑦ 파일용 MusicXML은 전과 같음(음 id·여러 마디 쉼표) ⑧ 페이지 오류 없음
//  Verovio는 jsDelivr 대신 /home/claude/work/vrv/node_modules/verovio/dist에서 (없으면: mkdir -p /home/claude/work/vrv && cd 그곳 && npm i verovio@6.4.1)
const { chromium, devices } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = process.env.VRV || __SWR + '/work/vrv/node_modules/verovio/dist/';
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
const HTML = 'file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html');
(async () => {
  const b = await chromium.launch();
  const ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 860 } });
  const p = await ctx.newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto(HTML); await p.waitForTimeout(600);
  const st = () => p.evaluate(() => window.__recState());
  const drawnAll = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 120000 });
  const click = async sel => { await p.evaluate(s => document.querySelector(s).click(), sel); };
  // ① 예시 장단(첫 올리기 화면에서는 그리지 않음 — 217번: 예시로 들어가야 그림)
  await click('#demoBtn'); await p.waitForTimeout(300);
  await click('#viewRec'); await drawnAll();
  let s = await st(); ok('예시 장단: 인식 악보 그림', s.chunks.length >= 1 && s.src === 'rec', JSON.stringify(s.chunks));
  ok('예시 장단: [원본 PDF]·[나란히]는 쓸 수 없음', await p.evaluate(() => document.getElementById('viewSide').getAttribute('aria-disabled') === 'true'));
  // ② PDF
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  ok('악보를 불러오면 원본 PDF 보기(220번)', (await st()).src === 'pdf');
  await click('#viewRec'); await drawnAll();
  const tk0 = (await st()).tok;
  const t0 = Date.now();
  if (process.env.ALL) await p.evaluate(() => document.getElementById('allOn').click());   // ALL=1: 모든 줄 켜고
  else await p.evaluate(() => { document.getElementById('svZoomIn').click(); });   // 다시 그리기 시간 재기(크기를 바꿔서)
  await p.waitForFunction(tk0 => { const s = window.__recState(); return s.tok > tk0 && s.chunks.length && s.chunks[0][2] > 0; }, tk0, { timeout: 60000 });
  const first = Date.now() - t0;
  ok((process.env.ALL ? '모든 줄 켬' : '크기 바꿈') + ': 첫 조각 3초 안', first < 3000, first + 'ms');
  await drawnAll(); s = await st();
  if (!process.env.ALL) { await p.evaluate(() => document.getElementById('svZoomOut').click()); await drawnAll(); }
  ok('PDF: 모든 마디를 그림', s.chunks[s.chunks.length - 1][1] === s.nbars, `${s.nbars}마디 · 조각 ${s.chunks.length} · ${Date.now() - t0}ms`);
  ok('음 id 찾아보기 표', s.idx > 50, String(s.idx));
  // ③ 마디 누르기 → 재생, 노란 칸, 음표 칠하기
  await p.evaluate(() => { const ms = [...document.querySelectorAll('#recWrap g.measure')].filter(m => m.querySelector('g.note')); const m = ms[Math.min(6, ms.length - 1)], r = m.getBoundingClientRect(); m.closest('.rec-chunk').dispatchEvent(new MouseEvent('click', { bubbles: true, clientX: r.left + r.width / 2, clientY: r.top + r.height / 2 })); });
  await p.waitForFunction(() => /마디/.test(window.__recState().hl) && window.__recState().on > 0, null, { timeout: 30000 }).catch(() => {});
  s = await st();
  if (await p.evaluate(() => /템포를 인식하지/.test(document.getElementById('msg').textContent))) console.log('skip 재생(이 악보는 빠르기를 못 읽음 — 앱이 재생을 막음)');
  else { ok('누른 마디부터 재생·노란 칸', /마디/.test(s.hl), s.hl); ok('음표 칠하기', s.on > 0, String(s.on)); }
  await click('#barsStopBtn'); await p.waitForTimeout(300);
  // ④ 크기 +
  const sh = () => p.evaluate(() => Math.round(document.querySelector('#recWrap g.staff').getBoundingClientRect().height * 10) / 10);
  const n0 = await sh();
  await click('#svZoomIn'); await drawnAll(); await p.waitForTimeout(300);
  const n1 = await sh();
  ok('크기 + (오선이 커짐)', n1 > n0 * 1.1, `${n0} → ${n1}px`);
  await click('#svZoomOut'); await drawnAll();
  // ⑤ 'OO만'
  const opt = await p.evaluate(() => { const o = [...document.getElementById('svPartSel').options].find(o => o.value); return o ? o.value : null; });
  if (opt) {
    await p.selectOption('#svPartSel', opt); await p.waitForTimeout(200); await drawnAll(); await p.waitForTimeout(200);
    const staves = await p.evaluate(() => document.querySelector('#recWrap g.measure').querySelectorAll(':scope > g.staff').length);
    ok("'OO만' 보기(오선 하나·둘)", staves <= 2, String(staves));
    if (!phone) { await p.selectOption('#svPartSel', ''); await p.waitForTimeout(200); await drawnAll(); }
  } else ok("'OO만' 보기 선택지", false);
  // ⑥ 나란히
  await click('#viewSide'); await p.waitForTimeout(500); await drawnAll();
  const side = await p.evaluate(() => { const a = document.getElementById('svWrap').getBoundingClientRect(), c = document.getElementById('recWrap').getBoundingClientRect(); return { a: [a.left, a.top, a.width, a.height].map(Math.round), c: [c.left, c.top, c.width, c.height].map(Math.round), rows: document.getElementById('svPanes').classList.contains('rows') }; });
  ok('나란히: 두 칸 다 보임', side.a[2] > 100 && side.c[2] > 100 && side.a[3] > 100 && side.c[3] > 100, JSON.stringify(side));
  ok(phone ? '나란히: 휴대폰 세로 = 위아래' : '나란히: PC = 좌우', phone ? side.rows && side.c[1] > side.a[1] : !side.rows && side.c[0] > side.a[0]);
  // 나란히: 인식 악보를 넘기면 PDF도 따라감
  const y0 = await p.evaluate(() => document.getElementById('svWrap').scrollTop);
  await p.evaluate(() => { const w = document.getElementById('recWrap'); w.scrollTop = w.scrollHeight * 0.5; });
  await p.waitForTimeout(600);
  const y1 = await p.evaluate(() => document.getElementById('svWrap').scrollTop);
  ok('나란히: 한쪽을 넘기면 다른 쪽도', y1 > y0 + 50, `${y0} → ${y1}`);
  await p.screenshot({ path: `/tmp/pwrec-${phone ? 'phone' : 'pc'}-side.png` });
  await click('#viewRec'); await p.waitForTimeout(500); await p.screenshot({ path: `/tmp/pwrec-${phone ? 'phone' : 'pc'}-rec.png` });
  // ⑦ 파일용 MusicXML
  ok('파일용 MusicXML에는 id 없음', await p.evaluate(() => !/<note[^>]* id="/.test(window.__swFileXml())));
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
