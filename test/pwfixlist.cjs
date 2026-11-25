// '악보대로 고칠 수 있는 곳' 모아 보기(205번): 맞게 읽은 음 둘을 ✎로 한 칸 올려 '잘못 읽은 음'을 만들고 → 경고 목록 위 요약 → [모아 보기] 창 →
// [고치러 가기]로 그 음 말풍선이 열리는지, [그림 대조 전체 검사]가 끝나는지. 그림: <출력>-bar.png(요약) -sheet.png(창) -bubble.png(말풍선)
// NODE_PATH=/opt/npm-tools/node_modules node test/pwfixlist.cjs [접두어] [줄 이름 일부] [출력 접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', part = process.argv[3] || '대금', out = process.argv[4] || '/tmp/fixlist', phone = process.argv[5] === 'phone', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1400, height: 950 }, deviceScaleFactor: 2 })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html') + '#allpanes-dbg'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.click('#allOn'); await p.waitForTimeout(2500);
  const ms = await p.evaluate(() => { const A = window.__ovDbgApi(), t0 = performance.now(); A.svOverBuild(); return Math.round(performance.now() - t0); });
  console.log('대조 계산(MusicXML 만들기+대조) ms', ms);
  const pick = await p.evaluate(n => { const A = window.__ovDbgApi(), st = A.state, d = A.svOverBuild(); const key = [...d.marks.keys()].find(k => { const l = st.lineList.find(l => A.cfgKey(l.id) === k); return l && (l.name || '').includes(n); });
    const lm = d.marks.get(key);
    for (const [k, mk] of lm) { if (k < 8 || mk.pos.length < 6 || mk.miss.length || mk.pos.some(q => !q.ok || q.nd)) continue;
      const rb = st.lineRaw[key].bars[k], cand = [];
      for (const v of ['R', 'L']) A.noteList(rb, v).forEach((e, ord) => { if (e.midis && e.midis.length === 1 && e.dur.v <= 0.25 && e.dia) cand.push({ v, ord, e }); });
      if (cand.length < 5 || cand[1].e.midis[0] === cand[3].e.midis[0]) continue;
      // 229번: 220번부터 사용자가 고친 음은 '악보와 다르게'(주황)라 잘못 읽은 음 흉내는 인식 결과(lineRaw)를 직접 바꿔서 — 그 뒤 빈 수정으로 다시 입힘
      for (const c of [cand[1], cand[3]]) { const m = c.e.midis[0], d1 = c.e.dia[m] + 1, nm = A.diaToMidi(d1, c.e.kf || 0); c.e.midis = [nm]; c.e.dia = { [nm]: d1 }; }
      A.setEdit(key, k, cand[1].v, cand[1].ord, cand[1].e, null); A.fixRecount();
      return { key, k, bar: st.bars[k].number }; } return null; }, part);
  ok('바꿀 마디 고름', !!pick, JSON.stringify(pick)); if (!pick) { await b.close(); process.exit(1); }
  await p.waitForTimeout(3500);
  const barTxt = await p.evaluate(() => { const e = document.getElementById('fixBar'); return e && !e.hidden ? e.textContent : ''; });
  ok('경고 목록 위 요약', /악보대로 고칠 수 있는 곳 1마디 · 음 2개/.test(barTxt), barTxt);
  const fb = await p.$('#fixBar'); if (fb) { await fb.scrollIntoViewIfNeeded(); const bb = await fb.boundingBox(); await p.screenshot({ path: out + '-bar.png', clip: { x: Math.max(0, bb.x - 10), y: Math.max(0, bb.y - 60), width: Math.min(700, bb.width + 20), height: bb.height + 200 } }); }
  await p.click('#fixBar button'); await p.waitForTimeout(500);
  const rows = await p.$$eval('.warn-dlg .warnlist .msg', a => a.map(x => x.textContent));
  ok('모아 보기 창 목록', rows.length === 1 && rows[0].includes(pick.bar + '마디'), rows.join(' | '));
  const dlg = await p.$('.warn-dlg'); if (dlg) await dlg.screenshot({ path: out + '-sheet.png' });
  // 전체 검사
  await p.click('.fixscan button'); await p.waitForFunction(() => /검사 끝/.test((document.querySelector('.fixscan') || {}).textContent || ''), null, { timeout: 180000 });
  ok('그림 대조 전체 검사 끝', true, await p.$eval('.fixscan', e => e.textContent));
  const rows2 = await p.$$eval('.warn-dlg .warnlist .msg', a => a.length); ok('검사 뒤에도 목록 1마디(보라 오탐 없음)', rows2 === 1, String(rows2));
  await p.click('.warn-dlg .warnlist .msg button'); await p.waitForTimeout(6000);
  const bub = await p.evaluate(() => { const e = document.querySelector('.ov-bubble'); return e && !e.hidden ? e.textContent : ''; });
  ok('[고치러 가기] → 말풍선', /악보대로 고치기/.test(bub), bub.slice(0, 80));
  const be = await p.$('.ov-bubble'); if (be) { const bb = await be.boundingBox(); const vw = p.viewportSize().width, vh = p.viewportSize().height; await p.screenshot({ path: out + '-bubble.png', clip: { x: Math.max(0, Math.min(vw - Math.min(vw, 620), bb.x - 80)), y: Math.max(0, Math.min(vh - 380, bb.y - 40)), width: Math.min(vw, 620), height: 380 } }); }
  await p.click('.ov-bubble .ov-fix >> nth=1').catch(() => {}); await p.waitForTimeout(4000);
  const after = await p.evaluate(() => { const e = document.getElementById('fixBar'); return e ? (e.hidden ? '숨김' : e.textContent) : '없음'; });
  ok('고친 뒤 요약 사라짐', after === '숨김', after);
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
