// 옛 저장 설정 바로잡기(216번): NODE_PATH=/opt/npm-tools/node_modules node test/pwcfgfix.cjs <옛 판 index.html(214번 전, 예: git show rollback/before-214:index.html)> [새 판 html]
//  ① 옛 판(MuseScore 3를 못 읽던 판)에서 신아리랑을 열고 [모두 켜기] → 9줄 모두 타악(장구)으로 자동 저장
//  ② 새 판에서 같은 악보 → 저장 설정을 불러와도 음높이가 읽히는 줄은 선율로 바뀌고 안내
//  ③ 새 판에서 일부러 대금을 타악으로 바꿔 저장 → 다시 열어도 타악 그대로(일부러 고른 것은 지킴)
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const OLD = path.resolve(process.argv[2]), NEW = path.resolve(process.argv[3] || __dirname + '/../index.html'), SM = '/home/claude/samples/';
const t = '/tmp/pick-73929564.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith('73929564')), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext({ viewport: { width: 1280, height: 860 } });   // 같은 저장소(localStorage)를 씀
  const open = async (html, fn) => {
    const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
    await p.goto('file://' + html + '#dbg'); await p.waitForTimeout(600);
    await p.setInputFiles('#pdfInput', t);
    await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
    await p.waitForTimeout(1500);
    const r = fn ? await fn(p) : null;
    const cfg = await p.evaluate(() => { const st = window.__ovDbgApi().state; return Object.values(st.lineCfg).map(c => c.role); });
    const msg = await p.evaluate(() => document.getElementById('msg').textContent);
    await p.close(); return { cfg, msg, r, errs };
  };
  let o = await open(OLD, async p => { await p.evaluate(() => document.getElementById('allOn').click()); await p.waitForTimeout(2500); });
  ok('옛 판: 모두 타악으로 저장', o.cfg.every(r => r === 'perc'), o.cfg.join(','));
  o = await open(NEW);
  ok('새 판: 선율로 바로잡음', o.cfg.filter(r => r === 'melody').length === 9, o.cfg.join(','));
  ok('새 판: 안내', /타악\(장구 소리\)으로 정해져 있었습니다/.test(o.msg), o.msg.slice(0, 80));
  o = await open(NEW, async p => { await p.evaluate(() => { const st = window.__ovDbgApi().state; st.lineCfg['1'].role = 'perc'; document.getElementById('setSaveNow').click(); }); await p.waitForTimeout(800); });
  o = await open(NEW);
  ok('일부러 타악으로 바꾼 대금은 그대로', o.cfg[1] === 'perc' && o.cfg.filter(r => r === 'melody').length === 8, o.cfg.join(','));
  ok('안내 없음', !/타악\(장구 소리\)으로 정해져/.test(o.msg));
  ok('페이지 오류 없음', !o.errs.length, o.errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
