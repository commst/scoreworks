// 221번 시험: 나란히 보기에서 인식 악보의 단 나눔이 원본 PDF와 같은지(PDF 한 단 = 인식 악보 한 단), 인식 악보만 볼 때는 예전처럼 자동
// NODE_PATH=/opt/npm-tools/node_modules node test/pwside.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = '/home/claude/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 180000 });
  await p.click('#viewSide'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(500);
  const sys = await p.evaluate(() => window.__recSys());
  const mixed = sys.filter(a => new Set(a).size !== 1), keys = sys.map(a => a[0]), dup = keys.filter((k, i) => keys.indexOf(k) !== i);
  ok('나란히: 인식 악보 단마다 한 PDF 단의 마디만', !mixed.length, `단 ${sys.length}개, 섞인 단 ${mixed.length}` + (mixed[0] ? ' 예 ' + mixed[0].join(',') : ''));
  ok('나란히: PDF 한 단이 인식 악보 한 단(나뉘지 않음)', !dup.length, dup.slice(0, 5).join(' '));
  const per = sys.map(a => a.length); console.log('  단마다 마디 수', per.slice(0, 12).join(' '));
  await p.screenshot({ path: '/tmp/pwside-' + (phone ? 'phone' : 'pc') + '.png' });
  await p.click('#viewRec'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(500);
  const sys2 = await p.evaluate(() => window.__recSys());
  ok('인식 악보만: 예전처럼 화면 폭에 맞춘 자동 단 나눔', sys2.length > 0 && JSON.stringify(sys2) !== JSON.stringify(sys), `단 ${sys2.length}개`);
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
