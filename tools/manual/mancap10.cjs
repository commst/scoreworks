const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 사용설명서 그림(190번): 12_score_play(악보로 보기 + 음표 따라가기), 13_dock(연주 막대 + 마디 이동), 29_full(전체화면 보기 + 아래 연주 막대),
// 16a_map_top(확인 필요 바로가기), 30_unreadable(못 읽는 악보 → 첫 화면 + 오류)
// NODE_PATH=/opt/npm-tools/node_modules node tools/manual/mancap10.cjs   (글꼴: /home/claude/work/fonts에서 npm i pretendard@1.3.9 @fontsource-variable/outfit)
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
fs.mkdirSync('/tmp/manual-pick', { recursive: true });
const SM = __SWR + '/samples/', pick = (p, nice) => { const t = '/tmp/manual-pick/' + (nice || p) + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t); return t; };
const O = path.resolve(__dirname, 'img') + '/', HTML = 'file://' + path.resolve(process.env.HTML || path.join(__dirname, '../../index.html'));
const SCORE = process.env.SCORE || '52271c34';   // 연변목가 총보
async function setup(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, colorScheme: 'light' });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: __SWR + '/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = __SWR + '/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|fonts\.)/, r => r.abort());
  await p.goto(HTML); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  return p;
}
const shot = (p, n, opt = {}) => p.screenshot({ path: O + n + '.png', ...opt });
const el = async (p, sel, n, pad = 6) => { const bx = await p.locator(sel).first().boundingBox(); await shot(p, n, { clip: { x: Math.max(0, bx.x - pad), y: Math.max(0, bx.y - pad), width: bx.width + pad * 2, height: bx.height + pad * 2 } }); };
(async () => {
  const b = await chromium.launch();
  const p = await setup(b, 1280, 800);
  await p.setInputFiles('#pdfInput', pick(SCORE, 'Yeonbyeon-Mokga-score'));
  await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 120000 }); await p.waitForTimeout(1200);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  // 마디맵 위쪽: 확인 필요 바로가기
  await p.click('#viewMap'); await p.waitForTimeout(600);
  const st = await p.locator('#stage .bars-panel').boundingBox(), wl = await p.locator('#warnList').boundingBox();
  await shot(p, '16a_map_top', { clip: { x: st.x, y: st.y, width: st.width, height: Math.min(560, wl.y + Math.min(wl.height, 190) - st.y + 8) } });
  // 악보로 보기 + 음표 따라가기: 연습 번호 D부터
  await p.click('#viewScore'); await p.waitForTimeout(2500);
  const rb = await p.$$('#rehBtns button'); if (rb.length > 3) await rb[3].click(); else await p.click('#playBtn');
  await p.waitForTimeout(9000); await shot(p, '12_score_play');
  await el(p, '#dock', '13_dock', 0);
  // 전체화면 보기
  await p.click('#svFull'); await p.waitForTimeout(3500); await shot(p, '29_full');
  await p.click('#svPlay'); await p.waitForTimeout(300); await p.keyboard.press('Escape'); await p.waitForTimeout(300);
  await p.click('#barsStopBtn').catch(() => {});
  // 못 읽는 악보 → 첫 화면 + 오류
  const { execSync } = require('child_process');
  execSync(`python3 -c "from PIL import Image, ImageDraw\nim=Image.new('RGB',(800,1100),'white'); d=ImageDraw.Draw(im)\nfor y in range(100,1000,120):\n  [d.line((50,y+k*10,750,y+k*10),fill='black') for k in range(5)]\nim.save('/tmp/manual-pick/scan.pdf')"`);
  await p.click('#filesBtn'); await p.waitForTimeout(300);
  await p.setInputFiles('#pdfInput', '/tmp/manual-pick/scan.pdf'); await p.waitForFunction(() => document.body.classList.contains('welcome') && !document.getElementById('msg').hidden, null, { timeout: 60000 }); await p.waitForTimeout(600);
  await p.evaluate(() => scrollTo(0, 0)); await shot(p, '30_unreadable', { clip: { x: 0, y: 0, width: 1280, height: 420 } });
  await b.close(); console.log('ok');
})();
