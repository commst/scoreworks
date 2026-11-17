// 큰보표 번갈아 치기(180번) 앱 시험: 총보를 열고 모든 줄을 켠 뒤 그 마디의 줄별 음 시각
// NODE_PATH=/opt/npm-tools/node_modules node test/pwxstaff.cjs <접두어> <마디…>
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const [pre, ...nums] = process.argv.slice(2), SM = '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const p = await (await b.newContext()).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 200000 }); await p.waitForTimeout(1500);
  await p.click('#allOn').catch(() => {}); await p.waitForTimeout(8000);
  const out = await p.evaluate(nums => { const st = window.__st; const r = {};
    for (const n of nums.map(Number)) { const b = st.bars.find(x => x.number === n); if (!b) continue; const by = {};
      for (const e of b.events) if (e.midis) (by[e.line] = by[e.line] || []).push(e.t.toString() + ':' + e.midis.join('+'));
      r[n] = { len: b.barLen.toString(), by }; }
    return r; }, nums);
  console.log(JSON.stringify(out, null, 0).replace(/\],"/g, '],\n "')); console.log('errs', errs.length, errs.slice(0, 2).join(' | ')); await b.close(); })();
