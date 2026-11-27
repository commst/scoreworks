const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 사용설명서 그림(218번 — 213~217번 화면): 01_welcome·03_main(이름 ScoreWorks Studio, 보기 단추 셋), 12_score_play, 31_rec(인식 악보),
// 32_side(나란히), 16d_bar_tip·16c_map_detail(악보 위 마디 미리보기 — 타임라인·상세), 15_edit(미리보기 [✎ 수정] → 고치기 창),
// 16a_map_top(요약·확인 필요 목록), 34_edit(편집 모드 검사기 — 219번), 22_phone_main·24_phone_score·33_phone_rec(휴대폰)
// NODE_PATH=/opt/npm-tools/node_modules node tools/manual/mancap11.cjs
//   글꼴: /home/claude/work/fonts에서 npm i pretendard@1.3.9 @fontsource-variable/outfit
//   Verovio: /home/claude/work/vrv에서 npm i verovio@6.4.1
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
fs.mkdirSync('/tmp/manual-pick', { recursive: true });
const SM = __SWR + '/samples/', pick = (p, nice) => { const t = '/tmp/manual-pick/' + (nice || p) + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(p)), t); return t; };
const O = path.resolve(__dirname, 'img') + '/', HTML = 'file://' + path.resolve(process.env.HTML || path.join(__dirname, '../../index.html'));
const VRV = process.env.VRV || __SWR + '/work/vrv/node_modules/verovio/dist/';
const SCORE = process.env.SCORE || '52271c34';   // 연변목가 총보
const ONLY = (process.env.ONLY || '').split(',').filter(Boolean), want = n => !ONLY.length || ONLY.includes(n);
async function setup(b, w, h, mobile) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, deviceScaleFactor: 2, isMobile: !!mobile, hasTouch: !!mobile, colorScheme: 'light' });
  const p = await ctx.newPage(); p.on('dialog', d => d.accept()); p.on('pageerror', e => console.log('PAGEERR', e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ contentType: 'text/css', body: "@font-face{font-family:'Outfit';font-weight:100 900;font-display:swap;src:url(https://fonts.gstatic.com/outfit.woff2) format('woff2')}" }));
  await p.route('https://fonts.gstatic.com/**', r => r.fulfill({ path: __SWR + '/work/fonts/node_modules/@fontsource-variable/outfit/files/outfit-latin-wght-normal.woff2', contentType: 'font/woff2' }));
  await p.route('https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/**', r => { const fp = __SWR + '/work/fonts/node_modules/pretendard/dist/web/variable/' + r.request().url().split('/variable/')[1].replace('.min.css', '.css'); return fs.existsSync(fp) ? r.fulfill({ path: fp }) : r.fulfill({ status: 404, body: '' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr|fonts\.)/, r => r.abort());
  await p.goto(HTML); await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(600);
  return p;
}
const shot = (p, n, opt = {}) => want(n) ? p.screenshot({ path: O + n + '.png', ...opt }) : null;
const el = async (p, sel, n, pad = 6) => { if (!want(n)) return; const bx = await p.locator(sel).first().boundingBox(); await shot(p, n, { clip: { x: Math.max(0, bx.x - pad), y: Math.max(0, bx.y - pad), width: bx.width + pad * 2, height: bx.height + pad * 2 } }); };
const load = async p => {
  await p.setInputFiles('#pdfInput', pick(SCORE, 'Yeonbyeon-Mokga-score'));
  await p.waitForFunction(() => !document.body.classList.contains('welcome') && document.querySelectorAll('#lineList .lcard').length > 1, null, { timeout: 120000 }); await p.waitForTimeout(1500);
  await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
};
const toView = (p, off = 150) => p.evaluate(o => { const v = document.getElementById('svPanes'); scrollTo(0, v.getBoundingClientRect().top + scrollY - o); }, off).then(() => p.waitForTimeout(500));
const recReady = p => p.waitForFunction(() => document.querySelectorAll('#recWrap .rec-chunk svg').length > 0, null, { timeout: 120000 }).then(() => p.waitForTimeout(1500));
// 악보 칸에서 k번째 마디(0부터)의 화면 자리
const barRect = (p, k, where) => p.evaluate(([k, w]) => { const r = window.__svBarRect(k, w); return r && { x: r.left, y: r.top, w: r.width, h: r.height }; }, [k, where]);
(async () => {
  const b = await chromium.launch();
  let p = await setup(b, 1280, 800);
  await shot(p, '01_welcome');
  await load(p);
  await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400);
  await shot(p, '03_main');
  // 요약·확인 필요 목록
  if (want('16a_map_top')) {
    const st = await p.locator('#stage .bars-panel').boundingBox(), wl = await p.locator('#warnList').boundingBox();
    await shot(p, '16a_map_top', { clip: { x: st.x, y: st.y, width: st.width, height: Math.min(560, wl.y + Math.min(wl.height, 190) - st.y + 8) } });
  }
  // 원본 PDF 위 마디 미리보기(타임라인·상세)
  await p.click('#viewScore'); await p.waitForTimeout(2500);
  const tipShot = async (k, where, name) => {
    await p.evaluate(([k, w]) => { const wr = document.querySelector(w === 'rec' ? '#recWrap' : '#svWrap'); wr.scrollIntoView({ block: 'start' }); const r = window.__svBarRect(k, w); if (!r) return; const wb = wr.getBoundingClientRect(); wr.scrollTop += r.top - wb.top - 30; }, [k, where]); await p.waitForTimeout(500);
    const r = await barRect(p, k, where); console.log(name, JSON.stringify(r)); await p.mouse.move(r.x + r.w * 0.5, r.y + r.h * 0.3); await p.waitForTimeout(150); await p.mouse.move(r.x + r.w * 0.5 + 2, r.y + r.h * 0.3 + 2); await p.waitForTimeout(1100);
    const t = await p.$('.bar-tip:not([hidden])') ? await p.locator('.bar-tip:not([hidden])').boundingBox() : null;
    if (t) { const x0 = Math.max(0, Math.min(t.x, r.x) - 12), y0 = Math.max(0, Math.min(t.y, r.y) - 12), x1 = Math.min(1280, Math.max(t.x + t.width, r.x + r.w) + 12), y1 = Math.min(800, Math.max(t.y + t.height, r.y + r.h) + 12); await shot(p, name, { clip: { x: x0, y: y0, width: x1 - x0, height: y1 - y0 } }); }
    else console.log('no tip', name);
    return t;
  };
  await p.evaluate(() => { try { localStorage.setItem('hapju-bartip', 'timeline'); } catch (e) {} });
  await tipShot(31, 'pdf', '16d_bar_tip');
  if (await p.$('.bar-tip:not([hidden]) [data-m="detail"], .bar-tip:not([hidden]) .bt-mode button:nth-child(2)')) await p.click('.bar-tip:not([hidden]) [data-m="detail"], .bar-tip:not([hidden]) .bt-mode button:nth-child(2)').catch(() => {});
  else await p.evaluate(() => [...document.querySelectorAll('.bar-tip .bt-mode')].find(x => x.textContent === '상세').click());
  await p.mouse.move(5, 300); await p.waitForTimeout(500);
  await tipShot(31, 'pdf', '16c_map_detail');
  // 미리보기 [✎ 수정] → 고치기 창(21마디)
  await p.mouse.move(5, 300); await p.waitForTimeout(500);
  await p.evaluate(() => { try { localStorage.setItem('hapju-bartip', 'timeline'); } catch (e) {} });
  await tipShot(20, 'pdf', '_tmp');
  const eb = p.locator('.bar-tip:not([hidden]) button', { hasText: '수정' }).first();
  if (await eb.count()) { await eb.click(); await p.waitForTimeout(900); if (await p.$('.edit-dlg')) { await shot(p, '15_edit'); await p.keyboard.press('Escape'); } else console.log('no edit dlg'); } else console.log('no ✎ in tip');
  await p.mouse.move(5, 300); await p.waitForTimeout(400);
  // 원본 PDF 재생 + 음표 따라가기
  await p.evaluate(() => scrollTo(0, 0));
  const rb = await p.$$('#rehBtns button'); if (rb.length > 3) await rb[3].click(); else await p.click('#playBtn');
  await p.waitForTimeout(7000); await toView(p); await p.waitForTimeout(2000); await shot(p, '12_score_play');
  // 인식 악보(재생 중)
  await p.click('#viewRec'); await recReady(p); await p.waitForTimeout(2500); await toView(p); await p.waitForTimeout(1500); await shot(p, '31_rec');
  // 나란히
  await p.click('#viewSide'); await recReady(p); await p.waitForTimeout(3000); await toView(p); await p.waitForTimeout(1500); await shot(p, '32_side');
  await p.click('#playBtn'); await p.waitForTimeout(300);
  await p.click('#viewScore'); await p.waitForTimeout(500);
  // 편집 모드: 인식 악보에서 음을 눌러 검사기(219번) — 한 옥타브 올려 '악보와 다르게'를 보이고 되돌림
  if (want('34_edit')) {
    await p.click('#svEdit'); await recReady(p); await p.waitForTimeout(1500);
    const n = await p.evaluate(() => { for (const id of window.__ed.ids().filter(i => /_R\d+$/.test(i) && +i.split('_')[2] >= 20)) { window.__ed.select(id); const c = window.__ed.ctx(); window.__ed.select(null); if (!c || !c.now || !c.now.length) continue; const el = document.querySelector(`#recWrap g.note[data-id^="${id}_"]`); if (!el) continue; el.scrollIntoView({ block: 'center' }); const h = el.querySelector('.notehead') || el, r = h.getBoundingClientRect(); if (r.width) return { x: r.left + r.width / 2, y: r.top + r.height / 2 }; } return null; });
    await p.mouse.click(n.x, n.y); await p.waitForTimeout(800); await p.keyboard.press('Control+ArrowUp'); await p.waitForTimeout(3000);
    await p.evaluate(() => { const i = document.querySelector('#edInsp .ei-memo'); if (i) { i.value = 'PDF 오타(지휘자 확인)'; i.dispatchEvent(new Event('change')); } }); await p.waitForTimeout(800);
    await toView(p); await p.waitForTimeout(800); await shot(p, '34_edit');
    await p.keyboard.press('Control+z'); await p.keyboard.press('Control+z'); await p.waitForTimeout(500); await p.click('#svPractice'); await p.waitForTimeout(500);
  }
  await p.context().close();
  // 휴대폰
  if (want('22_phone_main') || want('24_phone_score') || want('33_phone_rec')) {
    p = await setup(b, 390, 844, true); await load(p);
    await p.evaluate(() => scrollTo(0, 0)); await p.waitForTimeout(400); await shot(p, '22_phone_main');
    await p.click('#viewScore'); await p.waitForTimeout(2500); await toView(p, 90); await shot(p, '24_phone_score');
    await p.click('#viewRec'); await recReady(p); await toView(p, 90); await shot(p, '33_phone_rec');
    await p.context().close();
  }
  await b.close(); try { fs.unlinkSync(O + '_tmp.png'); } catch (e) {} console.log('ok');
})();
