const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 총보를 열고 모든 줄을 켠 뒤 state.bars에서 마디 길이를 넘는 음(잘리는 음)을 센다(170번 점검): NODE_PATH=/opt/npm-tools/node_modules node test/pwspill.cjs <접두어> [out.json]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [pre, outF] = process.argv.slice(2), SM = __SWR + '/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__SWR + '/scoreplay/index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 200000 }); await p.waitForTimeout(1500);
  await p.click('#allOn').catch(() => {}); await p.waitForFunction(() => !document.querySelector('.busy, #busy:not([hidden])'), null, { timeout: 300000 }).catch(() => {}); await p.waitForTimeout(6000);
  const out = await p.evaluate(() => { const st = window.__st; const bars = st.bars || []; const res = { n: bars.length, lines: Object.keys(st.lineRes || {}).length, spill: [], short: {}, byLine: {} };
    for (const b of bars) { const L = b.barLen.v; const over = {}; for (const e of b.events) { const end = e.t.v + e.dur.v; if (end > L + 1e-6) { const k = e.line; over[k] = Math.max(over[k] || 0, end - L); } }
      for (const k in over) { res.spill.push([b.number, k, +(over[k]).toFixed(3), b.barLen.n + '/' + b.barLen.d]); res.byLine[k] = (res.byLine[k] || 0) + 1; } }
    res.names = {}; for (const k of Object.keys(st.lineRes || {})) { try { res.names[k] = (window.lineLabel ? lineLabel(+k.split(':').pop()) : k); } catch (e) { res.names[k] = k; } }
    res.timesigs = bars.map(b => b.barLen.n + '/' + b.barLen.d); return res; });
  out.errs = errs; console.log(JSON.stringify({ pre, n: out.n, lines: out.lines, spillBars: out.spill.length, byLine: out.byLine, errs }));
  if (outF) fs.writeFileSync(outF, JSON.stringify(out)); await b.close(); })();
