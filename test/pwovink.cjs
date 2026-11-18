// 겹쳐 보기 그림 대조가 기기 화면 배율과 상관없는지(204번): 배율 1·2·3에서 보라 수·빨강 고치기 단추 수, 그리고 맞은 머리를 1칸 옮겨 재면 −1로 나오는지
// NODE_PATH=/opt/npm-tools/node_modules node test/pwovink.cjs [접두어] [보기 줄 이름] [배율들 예 1,2,3] [그림 저장 접두어]
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '61c75dd1', part = process.argv[3] || '신디2 (윗줄)', dprs = (process.argv[4] || '1,2,3').split(',').map(Number), shot = process.argv[5] || '', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
(async () => { const b = await chromium.launch(); const out = [];
  for (const dpr of dprs) {
    const p = await (await b.newContext({ viewport: { width: 1366, height: 1000 }, deviceScaleFactor: dpr })).newPage();
    const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
    await p.goto('file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html') + '#allpanes-dbg'); await p.setInputFiles('#pdfInput', t);
    await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
    await p.click('#allOn'); await p.waitForTimeout(2000);
    await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
    if (part) { const val = await p.evaluate(n => { const o = [...document.getElementById('svPartSel').options].find(o => o.textContent.replace(/만$/, '').trim() === n); return o ? o.value : null; }, part); if (val) { await p.selectOption('#svPartSel', val); await p.waitForTimeout(2000); } }
    await p.evaluate(() => { window.__ovDbg = []; const c = document.getElementById('svOver'); c.checked = true; c.dispatchEvent(new Event('change')); });
    const pix = new Set(), red = new Set(), seen = new Set(); let shift = { n: 0, ok0: 0, ok1: 0 };
    for (let k = 0; k < 8; k++) { await p.waitForTimeout(3000);
      const r = await p.evaluate(() => ({ pix: [...document.querySelectorAll('.sv-ovn.pix')].map(e => e.title.slice(0, 60)), red: [...document.querySelectorAll('.sv-ovn.bad')].filter(e => /음 높이가 다름 —/.test(e.title)).map(e => e.title.slice(0, 60)) }));
      r.pix.forEach(x => pix.add(x)); r.red.forEach(x => red.add(x));
      if (shot && dpr === dprs[dprs.length - 1]) for (const e of await p.$$('.sv-ovn.pix, .sv-ovn.bad.tap')) { const tt = await e.getAttribute('title'); if (!/칸 (위|아래)에 있음/.test(tt) || seen.has(tt)) continue; seen.add(tt);
        const vis = await e.evaluate(x => { const r = x.getBoundingClientRect(); return r.top > 300 && r.bottom < 960; }); if (!vis) { seen.delete(tt); continue; }
        { const bb0 = await e.boundingBox(); await p.screenshot({ path: `${shot}-${seen.size}-zoom.png`, clip: { x: Math.max(0, bb0.x - 110), y: Math.max(0, bb0.y - 60), width: 220, height: 120 } }); }
        await e.click({ force: true }); await p.waitForTimeout(400); const n = await p.$$eval('.ov-bubble .ov-fix', a => a.length);
        if (n) { const bb = await e.boundingBox(), bub = await (await p.$('.ov-bubble')).boundingBox();
          const x0 = Math.max(0, Math.min(bb.x, bub.x) - 40), y0 = Math.max(0, Math.min(bb.y, bub.y) - 30), x1 = Math.min(1366, Math.max(bb.x + bb.width, bub.x + bub.width) + 40), y1 = Math.min(1000, Math.max(bb.y + bb.height, bub.y + bub.height) + 90);
          await p.screenshot({ path: `${shot}-${seen.size}${n > 1 ? '-bar' : ''}.png`, clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }); console.log('shot', seen.size, n, tt.slice(0, 70)); }
        await p.mouse.click(5, 995); await p.waitForTimeout(200); }
      await p.evaluate(() => { const w = document.getElementById('svWrap'); w.scrollTop += w.clientHeight * 0.9; }); }
    shift = await p.evaluate(() => { let n = 0, ok0 = 0, ok1 = 0; for (const d of (window.__ovDbg || []).slice(0, 300)) { const a = window.__ovInk(d.page, d.x, d.y, d.sp), c = window.__ovInk(d.page, d.x, d.y + d.sp, d.sp); if (a == null || c == null) continue; n++; if (Math.abs(a) < 0.3) ok0++; if (Math.abs(c + 1) < 0.3) ok1++; } return { n, ok0, ok1 }; });
    const nov = await p.evaluate(() => document.querySelectorAll(".sv-ovn").length); out.push({ dpr, nov, e1: errs[0], pix: pix.size, redFix: red.size, shift, errs: errs.length }); console.log(JSON.stringify(out[out.length - 1])); console.log([...pix].slice(0, 4).join('\n')); console.log([...red].slice(0, 4).join('\n'));
    await p.close(); }
  await b.close(); })();
