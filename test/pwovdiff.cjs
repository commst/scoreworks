const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 겹쳐 보기 1·2단계(193번): node test/pwovdiff.cjs <접두어> [줄:마디] — MusicXML 저장 뒤 확인 창에서 주황(모양·셈여림 다름)·빨강 마디 수, 차이 종류별 마디 수. 줄:마디를 주면 그 마디로 가서 겹쳐 보기 그림(/tmp/ov.png)과 주황 동그라미 이유
// 겹쳐 보기 확장 확인: 총보를 열고 모든 줄 켠 뒤 xmlCheck 결과에서 모양·셈여림 차이 집계
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2], SM = __SWR + '/samples/', src = SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(src, t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 900 } })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + (process.env.HTML || __SWR + '/scoreplay/index.html') + '#allpanes'); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.click('#allOn').catch(() => {}); await p.waitForTimeout(2000);
  const dl = p.waitForEvent('download', { timeout: 60000 }).catch(() => null); await p.click('#exportXmlBtn'); await dl;
  await p.waitForSelector('.xchk-dlg', { timeout: 60000 });
  const res = await p.evaluate(() => { const bs = [...document.querySelectorAll('.xchk-bars button')]; const kinds = {}; let dyn = 0; const ex = [];
    for (const b of bs) { const w = b.title; const m = w.match(/적힌 모양이 PDF와 다른 음 \d+개 \(([^)]*)\)/); if (m) for (const k of m[1].split('·')) kinds[k] = (kinds[k] || 0) + 1; if (/셈여림·꺾쇠가 다름/.test(w)) dyn++;
      if (/적힌 모양|셈여림·꺾쇠/.test(w) && ex.length < 400) ex.push(b.closest('.xchk-line').querySelector('b').textContent + ' ' + w.slice(0, 220)); }
    return { bad: bs.filter(b => b.classList.contains('bad')).length, diff: bs.filter(b => b.classList.contains('diff')).length, all: bs.length, dyn, kinds, ex }; });
  console.log(JSON.stringify({...res, ex: undefined})); console.log(res.ex.filter(e => new RegExp(process.env.KF || "붙임줄|기둥").test(e)).slice(0, 8).join("\n")); console.log(await p.evaluate(() => [...document.querySelectorAll(".xchk-line b")].map((b, i) => i + ":" + b.textContent).join(" "))); console.log('errs', errs);
  if (process.argv[3]) { const [li, bn] = process.argv[3].split(':');
    await p.evaluate(([li, bn]) => { const L = [...document.querySelectorAll('.xchk-line')][+li]; const bt = [...L.querySelectorAll('button')].find(b => b.textContent === bn); bt.click(); }, [li, bn]); await p.waitForTimeout(3000);
    const info = await p.evaluate(() => [...document.querySelectorAll('.sv-ovn.diff')].slice(0, 8).map(e => e.title).concat([...document.querySelectorAll('.sv-ovd')].slice(0, 6).map(e => 'dir ' + e.textContent + (e.classList.contains('diff') ? '!' : ''))));
    console.log(info); const el = await p.$('#svWrap'); await (el || p).screenshot({ path: '/tmp/ov.png' }); }
  await b.close(); })();
