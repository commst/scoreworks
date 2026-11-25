// 1단계(217번) 마디맵 지우기 시험: NODE_PATH=/opt/npm-tools/node_modules node test/pwnomap.cjs [접두어] [phone]
//  ① 마디맵 단추·마디 칸이 없고 처음(예시 장단)부터 악보 보기(인식 악보) ② 예전 저장값 mode:'map'으로 시작해도 악보 보기
//  ③ 마디 미리보기: PC는 원본 PDF·인식 악보 마디 위에 마우스를 두면, 휴대폰은 길게 누르면(재생하지 않음) ④ 미리보기 [상세]·[✎ 수정]
//  ⑤ 경고 목록 [마디로](요약의 확인 필요 번호)가 인식 악보에서 그 마디로 가서 깜빡
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = process.env.VRV || '/home/claude/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1280, height: 860 } });
  await ctx.addInitScript(() => { if (!sessionStorage.getItem('s')) { localStorage.setItem('hapju-view', JSON.stringify({ mode: 'map', zoom: 1 })); sessionStorage.setItem('s', '1'); } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 120000 });
  ok('첫 올리기 화면에서는 악보 그리기 도구를 받지 않음', (await p.evaluate(() => window.__recState().chunks.length)) === 0);
  await p.evaluate(() => document.getElementById('demoBtn').click()); await p.waitForTimeout(300);
  ok('마디맵 단추·칸 없음', await p.evaluate(() => !document.getElementById('viewMap') && !document.querySelector('.b') && document.getElementById('bars').hidden));
  ok("예전 저장값 'map'이어도 악보 보기", await p.evaluate(() => !document.getElementById('scoreView').hidden && document.body.classList.contains('sv-mode')));
  await drawn(); ok('예시 장단: 인식 악보', (await p.evaluate(() => window.__recState().src)) === 'rec');
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800);
  ok('PDF를 올리면 원본 PDF 단추 켜짐', await p.evaluate(() => document.getElementById('viewScore').getAttribute('aria-pressed') === 'true' && !document.getElementById('viewSide').hasAttribute('aria-disabled')));
  const tip = () => p.evaluate(() => { const t = document.querySelector('.bar-tip'); return t && !t.hidden ? { n: (t.querySelector('.bt-num b') || {}).textContent, detail: !!t.querySelector('.bt-chiplist'), edit: [...t.querySelectorAll('button')].some(x => /✎ 수정/.test(x.textContent)) } : null; });
  const playing = () => p.evaluate(() => !/정지|카운트인/.test(document.getElementById('nowText').textContent) || false);
  const at = async (sel, pick) => p.evaluate(([sel, pick]) => { const els = [...document.querySelectorAll(sel)]; const e = pick === 'pdf' ? els[0] : els.filter(m => m.querySelector('g.note'))[3]; e.scrollIntoView({ block: 'center' }); const r = e.getBoundingClientRect(); return pick === 'pdf' ? { x: r.left + r.width * 0.5, y: r.top + r.height * 0.3 } : { x: r.left + r.width / 2, y: r.top + r.height / 2 }; }, [sel, pick]);
  if (!phone) {
    // 223번: 처음 설정은 '정보 줄' — 마우스를 두면 큰 창 대신 위 정보 줄이 바뀌고, [상세]를 누를 때만 창
    await p.waitForTimeout(1500);
    ok('223: 마디 정보 처음 설정 = 정보 줄', (await p.evaluate(() => document.getElementById('svTipMode').value)) === 'strip');
    let strip = null;
    for (const fy of [0.2, 0.3, 0.4, 0.5]) { const r = await p.evaluate(fy => { const d = document.querySelector('#svWrap .sv-page'); d.scrollIntoView({ block: 'start' }); const b = d.getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + Math.min(b.height, 700) * fy }; }, fy); await p.mouse.move(r.x, r.y); await p.mouse.move(r.x + 3, r.y + 2); await p.waitForTimeout(1000); strip = await p.evaluate(() => { const e = document.getElementById('svInfo'); return e && !e.hidden ? e.querySelector('.si-num').textContent : null; }); if (strip && strip !== '1마디' && !(await tip())) break; }
    ok('223: 마우스를 두면 정보 줄만 바뀌고 큰 창은 안 뜸', !!strip && !(await tip()), strip);
    await p.click('#svInfo .si-more'); await p.waitForTimeout(600);
    const viaMore = await tip();
    ok('223: [상세 ▸]를 누르면 미리보기 창', !!viaMore && viaMore.n + '마디' === strip, JSON.stringify(viaMore));
    await p.mouse.move(5, 5); await p.waitForTimeout(800);
    await p.evaluate(() => { const s = document.getElementById('svTipMode'); s.value = 'hover'; s.dispatchEvent(new Event('change')); });
    ok('223: 설정 기억', (await p.evaluate(() => JSON.parse(localStorage.getItem('hapju-view')).tip)) === 'hover');
    // (예전 동작 — '떠오르는 창'으로 바꾼 뒤) 원본 PDF: 쪽에서 마디가 있을 만한 곳을 훑어 미리보기가 뜨는 자리를 찾음
    let got = null;
    for (const fy of [0.2, 0.3, 0.4, 0.5]) { const r = await p.evaluate(fy => { const d = document.querySelector('#svWrap .sv-page'); d.scrollIntoView({ block: 'start' }); const b = d.getBoundingClientRect(); return { x: b.left + b.width * 0.5, y: b.top + Math.min(b.height, 700) * fy }; }, fy); await p.mouse.move(r.x, r.y); await p.mouse.move(r.x + 3, r.y + 2); await p.waitForTimeout(1000); got = await tip(); if (got) break; }
    ok('원본 PDF: 마우스를 두면 미리보기', !!got, JSON.stringify(got));
    await p.mouse.move(5, 5); await p.waitForTimeout(800);
    await p.evaluate(() => document.getElementById('viewRec').click()); await drawn(); await p.waitForTimeout(400);
    const r = await at('#recWrap g.measure', 'rec'); await p.mouse.move(r.x, r.y); await p.mouse.move(r.x + 2, r.y + 1); await p.waitForTimeout(1000);
    got = await tip(); ok('인식 악보: 마우스를 두면 미리보기', !!got && !got.detail, JSON.stringify(got));
    await p.evaluate(() => [...document.querySelectorAll('.bar-tip .bt-mode')].find(x => x.textContent === '상세').click()); await p.waitForTimeout(200);
    got = await tip(); ok('미리보기 [상세]', !!got && got.detail);
    ok('미리보기 [✎ 수정] 단추', !!got && got.edit);
    await p.evaluate(() => [...document.querySelectorAll('.bar-tip button')].find(x => /✎ 수정/.test(x.textContent)).click()); await p.waitForTimeout(400);
    ok('[✎ 수정] → 고치기 창', await p.evaluate(() => !!document.querySelector('.edit-dlg')));
    await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  } else {
    await p.evaluate(() => document.getElementById('viewRec').click()); await drawn(); await p.waitForTimeout(400);
    const r = await at('#recWrap g.measure', 'rec');
    const cdp = await ctx.newCDPSession(p);
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: r.x, y: r.y }] });
    await p.waitForTimeout(700);
    if (process.env.DBG) console.log('  dbg during', JSON.stringify(await tip()), await p.evaluate(([x, y]) => { const e = document.elementFromPoint(x, y); return e && e.tagName + ' ' + (e.closest('.rec-chunk') ? 'chunk' : '') + ' ' + (e.closest('#svInfo') ? 'info' : ''); }, [r.x, r.y]));
    if (process.env.DBG) await p.evaluate(() => { window.__lg = []; const w = document.getElementById('recWrap'); w.addEventListener('scroll', () => window.__lg.push('scroll ' + w.scrollTop), true); for (const t of ['mouseleave', 'mousemove', 'click', 'pointerup']) document.addEventListener(t, ev => window.__lg.push(t + ' ' + (ev.target.tagName || '')), true); });
    await cdp.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
    await p.waitForTimeout(600);
    if (process.env.DBG) console.log('  dbg after', JSON.stringify(await p.evaluate(() => window.__lg)), JSON.stringify(await tip()));
    const got = await tip(); ok('휴대폰: 길게 누르면 미리보기', !!got, JSON.stringify(got));
    ok('휴대폰: 길게 눌러도 재생하지 않음', !(await playing()), await p.evaluate(() => document.getElementById('nowText').textContent));
  }
  // ⑤ 경고 [마디로]
  const w = await p.evaluate(() => { const k = document.querySelector('#summary .wnum'); if (!k) return null; k.click(); return k.textContent; });
  if (w) { await p.waitForTimeout(500); ok('경고 [마디로] → 인식 악보 그 마디 깜빡', await p.evaluate(() => !!document.querySelector('#recWrap .sv-flash.on')), w + '마디'); }
  else console.log('skip 경고 [마디로](이 악보는 확인 필요 마디 없음)');
  await p.screenshot({ path: `/tmp/pwnomap-${phone ? 'phone' : 'pc'}.png` });
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
