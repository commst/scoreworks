// 악보 보기 '음표 표시' 시험: 총보를 열고 악보로 보기에서 n마디부터 재생 → 지금 소리 나는 음의 PDF 머리에 동그라미(.sv-note)가 그려지는지,
// 'OO만' 보기·끄기·정지 때 사라지는지, 그림(/tmp/pwnotes-*.png)
// NODE_PATH=/opt/npm-tools/node_modules node test/pwnotes.cjs <접두어> <마디> [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const [pre, bar, mode] = process.argv.slice(2), SM = '/home/claude/samples/'; const t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => {
  const b = await chromium.launch(); const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 200000 });
  await p.evaluate(() => { const b = document.getElementById('allOn'); if (b) b.click(); });
  await p.waitForTimeout(4000);
  await p.evaluate(() => document.getElementById('viewScore').click()); await p.waitForTimeout(1500);
  await p.evaluate(f => { const e = document.getElementById('from'); e.value = f; e.dispatchEvent(new Event('change', { bubbles: true })); }, bar);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  await p.click('#playBtn');
  await p.waitForFunction(() => window.__st.playing && window.__st.rendered, null, { timeout: 120000 });
  await p.waitForTimeout(2500);
  const info = await p.evaluate(() => {
    const vis = [...document.querySelectorAll('.sv-note')].filter(e => !e.hidden && e.isConnected);
    const plan = window.__st.rendered.plan;
    return { n: vis.length, marks: plan.marks ? plan.marks.length : -1, colors: [...new Set(vis.map(e => e.style.getPropertyValue('--c')))] };
  });
  console.log(JSON.stringify(info));
  ok(info.marks > 0, 'plan.marks 있음 ' + info.marks);
  ok(info.n > 0, '재생 중 음표 동그라미 ' + info.n + '개');
  await p.evaluate(() => { const w = document.getElementById('svWrap'); w.scrollIntoView(); });
  await p.screenshot({ path: `/tmp/pwnotes-${pre}-${mode || 'desk'}.png` });
  // 한 줄만 보기
  const opt = await p.evaluate(() => { const s = document.getElementById('svPartSel'); const o = [...s.options].find(x => x.value); if (!o) return null; s.value = o.value; s.dispatchEvent(new Event('change')); return o.value; });
  if (opt) {
    await p.waitForTimeout(2500);
    const one = await p.evaluate(k => { const vis = [...document.querySelectorAll('.sv-note')].filter(e => !e.hidden && e.isConnected); return vis.length; }, opt);
    ok(one >= 0, `'${opt}만' 보기에서 동그라미 ${one}개(그 줄이 쉬면 0)`);
    await p.screenshot({ path: `/tmp/pwnotes-${pre}-${mode || 'desk'}-one.png` });
    await p.evaluate(() => { const s = document.getElementById('svPartSel'); s.value = ''; s.dispatchEvent(new Event('change')); });
    await p.waitForTimeout(1500);
  }
  // 끄기
  await p.evaluate(() => { const c = document.getElementById('svNotes'); c.checked = false; c.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(500);
  ok(await p.evaluate(() => [...document.querySelectorAll('.sv-note')].every(e => e.hidden)), '음표 표시 끄면 모두 숨김');
  await p.evaluate(() => { const c = document.getElementById('svNotes'); c.checked = true; c.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(1200);
  ok(await p.evaluate(() => [...document.querySelectorAll('.sv-note')].some(e => !e.hidden)), '다시 켜면 다시 보임');
  ok(await p.evaluate(() => JSON.parse(localStorage.getItem('hapju-view') || '{}').notes !== false), '설정 기억(켬)');
  // 정지
  await p.click('#barsStopBtn'); await p.waitForTimeout(400);
  ok(await p.evaluate(() => [...document.querySelectorAll('.sv-note')].every(e => e.hidden)), '정지하면 숨김');
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  await b.close(); console.log(fail ? `FAIL ${fail}` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
