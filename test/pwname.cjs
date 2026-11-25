// 224번 시험: 인식 악보에서 긴 악기 이름을 두세 줄로 접는지(마디 자리를 넓게), 파일용 MusicXML 이름은 그대로
// NODE_PATH=/opt/npm-tools/node_modules node test/pwname.cjs [접두어]
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = '/home/claude/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), p = await (await b.newContext({ viewport: { width: 1440, height: 900 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); document.getElementById('allOn').click(); });
  await p.click('#viewRec');
  await p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[0][2] > 0; }, null, { timeout: 180000 }); await p.waitForTimeout(1500);
  const r = await p.evaluate(() => {
    const labs = [...document.querySelectorAll('#recWrap .rec-chunk')][0].querySelectorAll('g.label');
    const L = [...labs].map(g => ({ t: [...g.querySelectorAll('tspan.text')].map(x => x.textContent.trim()), w: g.getBoundingClientRect().width }));
    const m0 = document.querySelector('#recWrap g.measure'), sv = document.querySelector('#recWrap .rec-chunk svg');
    return { L, maxW: Math.max(...L.map(x => x.w)), left: m0.getBoundingClientRect().left - sv.getBoundingClientRect().left, svW: sv.getBoundingClientRect().width };
  });
  const brass = r.L.find(x => x.t.join(' ').includes('Brasschime'));
  ok('긴 이름(Brasschime / Cymbal, 징 / 젬베)을 여러 줄로', !!brass && brass.t.length >= 2, JSON.stringify(brass));
  ok('짧은 이름은 한 줄', r.L.filter(x => x.t.length === 1).length > 5);
  ok('이름 칸이 쪽 폭의 18% 안', r.left / r.svW < 0.18, `${Math.round(r.left)} / ${Math.round(r.svW)}`);
  await p.screenshot({ path: '/tmp/pwname.png' });
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
