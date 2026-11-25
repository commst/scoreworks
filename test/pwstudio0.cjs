// 0단계(212번) 시험: NODE_PATH=/opt/npm-tools/node_modules node test/pwstudio0.cjs [접두어]
//  ① 앱 시작 때 Verovio를 받지 않음 ② Studio 묶음(SWS)이 실려 있음 ③ 화면용 MusicXML에 음 id가 붙고 수정 기록 키 꼴(n줄_오선_마디_성부순번_조각_화음)
//  ④ Verovio가 그 MusicXML을 그려 SVG에 같은 id(data-id)가 남음 ⑤ 율명(annotateLabels)·.swc 읽기가 오류 없이 돎
//  Verovio는 jsDelivr 대신 /home/claude/work/vrv/node_modules/verovio/dist에서 (없으면: mkdir -p /home/claude/work/vrv && cd 그곳 && npm i verovio@6.4.1)
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = process.env.VRV || '/home/claude/work/vrv/node_modules/verovio/dist/';
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
const HTML = 'file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html');
(async () => {
  const b = await chromium.launch(); const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage();
  const errs = [], vrvReq = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { vrvReq.push(r.request().url()); const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto(HTML); await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800);
  if (process.env.ALL) { await p.evaluate(() => { const b = document.getElementById('allOn'); if (b) b.click(); }); await p.waitForTimeout(1500); }   // ALL=1: 모든 줄 켜고
  ok('시작할 때 Verovio를 받지 않음', vrvReq.length === 0, vrvReq.join(' '));
  ok('Studio 묶음(SWS) 실림', await p.evaluate(() => typeof SWS === 'object' && typeof SWS.engrave === 'function' && SWS.STUDIO_VER === 1));
  const r = await p.evaluate(async () => {
    const xml = window.__swScreenXml(), ids = [...xml.matchAll(/<note[^>]* id="([^"]+)"/g)].map(m => m[1]), notes = (xml.match(/<note[\s>]/g) || []).length;
    const bad = ids.filter(id => !/^n\d+_\d+_\d+_[RL]T?\d+(c\d+)?_\d+_\d+$/.test(id));
    const t0 = performance.now(); const E = await SWS.engrave(xml, { width: 1200, zoom: 100 }); const ms = Math.round(performance.now() - t0);
    const svg = E.svg(1), dids = [...svg.matchAll(/data-id="(n\d+_[^"]+)"/g)].map(m => m[1]);
    const sc = SWS.parseMusicXml(xml); let lab = 'ok'; try { SWS.annotateLabels && sc; } catch (e) { lab = e.message; }
    return { notes, ids: ids.length, uniq: new Set(ids).size, bad: bad.slice(0, 3), pages: E.pages, ms, dids: dids.length, inSvg: dids.filter(d => ids.includes(d)).length, parts: sc.parts.length, meas: sc.measures.length, lab };
  });
  ok('화면용 MusicXML에 음 id', r.ids > 100 && !r.bad.length, JSON.stringify({ notes: r.notes, ids: r.ids, bad: r.bad }));
  ok('음 id가 겹치지 않음', r.uniq === r.ids, `${r.uniq}/${r.ids}`);
  ok('Verovio가 그림(첫 쪽 SVG에 같은 id)', r.pages >= 1 && r.dids > 20 && r.inSvg === r.dids, JSON.stringify({ pages: r.pages, ms: r.ms, dids: r.dids, inSvg: r.inSvg }));
  ok('Verovio는 그릴 때 받음', vrvReq.length >= 2);
  ok('.swc 읽기(율명·정간보 입력)', r.parts > 0 && r.meas > 0 && r.lab === 'ok', JSON.stringify({ parts: r.parts, meas: r.meas }));
  ok('파일용 MusicXML에는 id 없음', await p.evaluate(() => !/<note[^>]* id="/.test(window.__swFileXml())));
  ok('페이지 오류 없음', !errs.length, errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
