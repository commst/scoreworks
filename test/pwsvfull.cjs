const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 전체화면 보기 아래 연주 막대(190번): NODE_PATH=/opt/npm-tools/node_modules node test/pwsvfull.cjs [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const pre = process.env.PRE || '61c75dd1', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const mode = process.argv[2]; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 300000 });
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.evaluate(() => document.getElementById('viewScore').click()); await p.waitForTimeout(1200);
  await p.evaluate(() => document.getElementById('svFull').click()); await p.waitForTimeout(1500);
  const vis = id => p.evaluate(i => { const e = document.getElementById(i); if (!e) return null; const r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0 && r.top >= 0 && r.bottom <= innerHeight + 1; }, id);
  for (const id of ['svfStop', 'svPlay', 'svfNow', 'svfTrack', 'svfBack', 'svfN', 'svfFwd', 'svfSpdDown', 'svfSpd', 'svfSpdUp']) ok(await vis(id), id + ' 보임(화면 안)');
  const dockY = await p.evaluate(() => { const d = document.querySelector('.sv-fdock').getBoundingClientRect(), w = document.getElementById('svWrap').getBoundingClientRect(); return { dockTop: d.top, dockBottom: d.bottom, wrapBottom: w.bottom, H: innerHeight }; });
  ok(dockY.dockTop >= dockY.wrapBottom - 1 && dockY.dockBottom >= dockY.H - 2, '연주 막대가 맨 아래, 악보 칸 밑 ' + JSON.stringify(dockY));
  ok(await p.evaluate(() => getComputedStyle(document.getElementById('svPlay')).borderRadius === '50%' || parseFloat(getComputedStyle(document.getElementById('svPlay')).borderRadius) > 20), '재생 단추 둥근 모양');
  // 재생
  await p.evaluate(() => document.getElementById('svPlay').click()); await p.waitForFunction(() => window.__st.playing, null, { timeout: 200000 }); await p.waitForTimeout(1200);
  ok(await p.evaluate(() => /M6 5h4/.test(document.getElementById('svfIcon').innerHTML)), '재생 중 일시정지 모양');
  ok(await p.evaluate(() => /마디|카운트인/.test(document.getElementById('svfNow').textContent) && document.getElementById('svfNow').innerHTML === document.getElementById('nowText').innerHTML), '지금 마디 표시(기본 막대와 같음) ' + await p.evaluate(() => document.getElementById('svfNow').textContent));
  const nowBar = () => p.evaluate(() => { const m = /(\d+)마디/.exec(document.getElementById('nowText').textContent); return m ? +m[1] : 0; });
  const b0 = await nowBar();
  await p.evaluate(() => { const n = document.getElementById('svfN'); n.value = 8; n.dispatchEvent(new Event('change')); }); ok(await p.evaluate(() => document.getElementById('jumpN').value) === '8', '마디 수 8 → 기본 막대도 8');
  await p.evaluate(() => document.getElementById('svfFwd').click()); await p.waitForTimeout(1200); const b1 = await nowBar();
  ok(b1 >= b0 + 7 && b1 <= b0 + 10, '▶▶ 8마디 앞으로 ' + b0 + ' → ' + b1);
  await p.evaluate(() => document.getElementById('svfBack').click()); await p.waitForTimeout(1200); const b2 = await nowBar();
  ok(b2 >= b1 - 9 && b2 <= b1 - 6, '◀◀ 8마디 뒤로 ' + b1 + ' → ' + b2);
  await p.evaluate(() => document.getElementById('svfSpdDown').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('svfSpd').textContent === document.getElementById('dockSpd').textContent && document.getElementById('dockSpd').textContent !== '100%'), '속도 − → ' + await p.evaluate(() => document.getElementById('svfSpd').textContent));
  await p.evaluate(() => document.getElementById('svfSpdUp').click()); await p.waitForTimeout(400);
  ok(await p.evaluate(() => document.getElementById('svfSpd').textContent === '100%'), '속도 + → 100%');
  // 진행 막대 누르기: 가운데쯤
  const tr = await p.evaluate(() => { const r = document.getElementById('svfTrack').getBoundingClientRect(); return { x: r.left + r.width * 0.5, y: r.top + r.height / 2 }; });
  await p.mouse.click(tr.x, tr.y); await p.waitForTimeout(2000); const b3 = await nowBar();
  ok(b3 > 120 && b3 < 240, '진행 막대 가운데 → ' + b3 + '마디');
  await p.screenshot({ path: '/tmp/pwsvfull-' + (mode || 'desk') + '.png' });
  await p.evaluate(() => document.getElementById('svPlay').click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !window.__st.playing && /M7 4.5/.test(document.getElementById('svfIcon').innerHTML)), '일시정지 → 재생 모양');
  await p.evaluate(() => document.getElementById('svfStop').click()); await p.waitForTimeout(500);
  ok(await p.evaluate(() => /정지/.test(document.getElementById('svfNow').textContent)), '정지 ' + await p.evaluate(() => document.getElementById('svfNow').textContent));
  await p.keyboard.press('Escape'); await p.waitForTimeout(500);
  ok(await p.evaluate(() => !document.getElementById('scoreView').classList.contains('sv-full') && getComputedStyle(document.querySelector('.sv-fdock')).display === 'none'), 'Esc → 전체화면 닫힘, 아래 막대 숨김');
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  console.log(fail ? 'FAIL ' + fail : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0); })();
