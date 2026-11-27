const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// [악보대로 고치기] 끝까지 시험(204번): 맞게 읽은 음 둘을 일부러 한 칸 위로 바꿔(✎와 같은 기록) '잘못 읽은 음'을 만들고
// → 빨간 동그라미에 단추가 나오는지 → [이 음]·[이 마디 모두]로 원래 음으로 돌아오는지(파랑). 그림: <출력>-1-before / -2-note / -3-bar / -4-after .png
// NODE_PATH=/opt/npm-tools/node_modules node test/pwovfix2.cjs [접두어] [줄 이름 일부] [출력 접두어] [배율]
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', part = process.argv[3] || '대금', out = process.argv[4] || '/tmp/ovfix2', dpr = +(process.argv[5] || 2), SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1500, height: 900 }, deviceScaleFactor: dpr })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html') + '#allpanes-dbg'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.click('#allOn'); await p.waitForTimeout(2000);
  await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
  const val = await p.evaluate(n => { const o = [...document.getElementById('svPartSel').options].find(o => o.textContent.includes(n)); return o ? o.value : null; }, part);
  ok('보기 줄 ' + part, !!val); await p.selectOption('#svPartSel', val); await p.waitForTimeout(2000);
  for (let i = 0; i < 4; i++) { await p.click('#svZoomIn'); await p.waitForTimeout(500); }
  await p.evaluate(() => { const c = document.getElementById('svOver'); c.checked = true; c.dispatchEvent(new Event('change')); }); await p.waitForTimeout(4000);
  // 모든 음이 파랑인 마디(채운 머리 홀로 선 음 4개 이상)를 골라 둘째·셋째 음을 한 칸 위로
  const pick = await p.evaluate(() => { const A = window.__ovDbgApi(), st = A.state, d = A.svOverBuild(), key = document.getElementById('svPartSel').value;
    const lm = d.marks.get(key); if (!lm) return null;
    for (const [k, mk] of lm) { if (k < 8 || mk.pos.length < 6 || mk.pos[0].x < 200 || mk.pos[mk.pos.length - 1].x > 650 || mk.miss.length || !mk.pos.length || mk.pos.some(q => !q.ok || q.nd)) continue;
      const rb = st.lineRaw[key].bars[k], cand = [];
      for (const v of ['R', 'L']) A.noteList(rb, v).forEach((e, ord) => { if (e.midis && e.midis.length === 1 && e.dur.v <= 0.25 && e.dia) cand.push({ v, ord, e }); });
      if (cand.length < 5 || cand[1].e.midis[0] === cand[3].e.midis[0]) continue;
      // 229번: 220번부터 사용자가 고친 음은 '악보와 다르게'(주황) — 잘못 읽은 음 흉내는 인식 결과(lineRaw)를 직접 바꾸고 빈 수정으로 다시 입힘
      const pickd = [cand[1], cand[3]].map(c => { const m = c.e.midis[0], d0 = c.e.dia[m]; if (d0 == null) return null; const nm = A.diaToMidi(d0 + 1, c.e.kf || 0); c.e.midis = [nm]; c.e.dia = { [nm]: d0 + 1 }; return [m, nm]; });
      A.setEdit(key, k, cand[1].v, cand[1].ord, cand[1].e, null); A.fixRecount();
      if (pickd.some(x => !x)) continue;
      return { key, k, bar: st.bars[k].number, notes: pickd }; }
    return null; });
  ok('바꿀 마디 고름', !!pick, JSON.stringify(pick)); if (!pick) { await b.close(); process.exit(1); }
  await p.waitForTimeout(3000);
  let target = null;
  for (let i = 0; i < 60 && !target; i++) { for (const e of await p.$$('.sv-ovn.bad.tap')) if ((await e.getAttribute('title')).startsWith(pick.bar + '마디') && /칸 (위|아래)에 있음/.test(await e.getAttribute('title'))) { target = e; break; }
    if (!target) { await p.evaluate(() => { const w = document.getElementById('svWrap'); w.scrollTop += w.clientHeight * 0.8; }); await p.waitForTimeout(1200); } }
  console.log(await p.evaluate(pk => { const A = window.__ovDbgApi(), d = A.svOverBuild(), mk = d.marks.get(pk.key).get(pk.k); return JSON.stringify({ pos: mk.pos.map(q => [Math.round(q.x), Math.round(q.y), q.hit, !!q.wy, q.n.step + q.n.oct]), miss: mk.miss.map(h => [Math.round(h[0]), Math.round(h[1])]) }); }, pick));
  ok('빨간 동그라미(음 높이 다름)', !!target);
  if (!target) { await b.close(); process.exit(1); }
  const findRed = async () => { for (const e of await p.$$('.sv-ovn.bad.tap')) if ((await e.getAttribute('title')).startsWith(pick.bar + '마디') && /칸 (위|아래)에 있음/.test(await e.getAttribute('title'))) return e; return null; };
  await target.evaluate(x => x.scrollIntoView({ block: 'center', inline: 'center' })); await p.waitForTimeout(1500);
  let clip = null; const clipAt = async e => { let bb = e && await e.boundingBox(); for (let i = 0; i < 10 && !bb; i++) { await p.waitForTimeout(500); const e2 = await findRed(); bb = e2 && await e2.boundingBox(); } const vw = 1500, w = 600, h = 420; clip = { x: Math.max(0, Math.min(vw - w, bb.x - 430)), y: Math.max(0, Math.min(900 - h, bb.y - 270)), width: w, height: h }; return clip; };
  await clipAt(await findRed());
  const tapShot = async (nm) => { const e = await findRed(); await e.evaluate(x => x.scrollIntoView({ block: 'center', inline: 'center' })); await p.waitForTimeout(800); await clipAt(e); await e.click({ force: true }); await p.waitForTimeout(400); const btns = await p.$$eval('.ov-bubble .ov-fix', a => a.map(x => x.textContent)); await p.screenshot({ path: out + nm, clip }); return btns; };
  { const e0 = await findRed(); await e0.evaluate(x => x.scrollIntoView({ block: 'center', inline: 'center' })); await p.waitForTimeout(800); await clipAt(await findRed()); }
  const clip1 = clip; await p.screenshot({ path: out + '-1-before.png', clip });
  // 마디마다: 보라 단추 둘
  const btns = await tapShot('-3-bar.png');
  ok('단추 2개(이 음·이 마디 모두)', btns.length === 2, btns.join(' / '));
  await p.click('.ov-bubble .ov-fix >> nth=1'); await p.waitForTimeout(3500);
  const after = await p.evaluate(pk => { const A = window.__ovDbgApi(), d = A.svOverBuild(), mk = d.marks.get(pk.key).get(pk.k); return { bad: mk.pos.filter(q => !q.ok).length, miss: mk.miss.length }; }, pick);
  ok('[이 마디 모두] 뒤 빨강 없음', after.bad === 0 && after.miss === 0, JSON.stringify(after));
  // Ctrl+Z 한 번 → 한 음만 다시 빨강 → 음마다 단추 하나
  await p.keyboard.press('Control+z'); await p.waitForTimeout(3500);
  const b1 = await tapShot('-2-note.png');
  ok('Ctrl+Z 뒤 단추 1개(이 음)', b1.length === 1, b1.join(' / '));
  await p.click('.ov-bubble .ov-fix >> nth=0'); await p.waitForTimeout(3500);
  const a2 = await p.evaluate(pk => { const A = window.__ovDbgApi(), d = A.svOverBuild(), mk = d.marks.get(pk.key).get(pk.k); return mk.pos.filter(q => !q.ok).length; }, pick);
  ok('[이 음] 뒤 빨강 없음', a2 === 0, 'bad ' + a2);
  await p.mouse.click(3, 895); await p.waitForTimeout(300); await p.screenshot({ path: out + '-4-after.png', clip: clip1 });
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0); })();
