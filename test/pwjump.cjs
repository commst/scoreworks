// 연주 막대 마디 이동(183번) 시험: NODE_PATH=/opt/npm-tools/node_modules node test/pwjump.cjs [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'); const path = require('path');
const pre = process.env.PRE || '985e95bb', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const mode = process.argv[2]; let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext(mode === 'phone' ? { ...devices['iPhone 13'] } : { viewport: { width: 1366, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + path.resolve(__dirname, '../index.html')); await p.waitForFunction(() => window.__appReady === 'ok');
  await p.setInputFiles('#pdfInput', t); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 200000 });
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  const bar = () => p.evaluate(() => { const m = /(\d+)마디/.exec(document.getElementById('nowText').textContent); return m ? +m[1] : null; });
  const vis = await p.evaluate(() => { const r = document.querySelector('#dock .dock-jump').getBoundingClientRect(); return r.width > 0 && r.right <= innerWidth + 1 && r.left >= -1; });
  ok(vis, '마디 이동 칸이 화면 안에 보임');
  ok(await p.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), '가로 넘침 없음');
  // 소리를 만들기 전: 연주 범위 첫 마디(1) + 4 → 5마디부터
  await p.click('#jumpFwd'); await p.waitForFunction(() => window.__st.playing, null, { timeout: 120000 }); await p.waitForTimeout(600);
  let b1 = await bar(); ok(b1 >= 5 && b1 <= 6, '만들기 전 ▶▶ → 5마디부터 (' + b1 + ')');
  await p.click('#jumpFwd'); await p.waitForTimeout(500); let b2 = await bar(); ok(b2 >= b1 + 4 && b2 <= b1 + 5, '재생 중 ▶▶ 4마디 뒤 (' + b1 + ' → ' + b2 + ')');
  await p.click('#jumpBack'); await p.waitForTimeout(500); let b3 = await bar(); ok(b3 >= b2 - 4 && b3 <= b2 - 3, '◀◀ 4마디 앞 (' + b3 + ')');
  await p.fill('#jumpN', '2'); await p.dispatchEvent('#jumpN', 'change');
  await p.click('#jumpBack'); await p.waitForTimeout(500); let b4 = await bar(); ok(b4 >= b3 - 2 && b4 <= b3 - 1, '숫자 2로 바꿔 ◀◀ (' + b4 + ')');
  for (let k = 0; k < 5; k++) await p.click('#jumpBack'); await p.waitForTimeout(500); ok((await bar()) <= 2, '처음보다 앞으로는 1마디에서 멈춤');
  ok(await p.evaluate(() => localStorage.getItem('hapju-jumpN') === '2'), '숫자 기억');
  await p.screenshot({ path: '/tmp/pwjump-' + (mode || 'desk') + '.png' });
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  console.log(fail ? 'FAIL ' + fail : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0); })();
