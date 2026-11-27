const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 휴대폰 확대·축소·회전 레이아웃 시험(211번): NODE_PATH=/opt/npm-tools/node_modules node test/pwzoom.cjs [접두어]
//  좁은 폭(글자 크기를 키운 휴대폰과 같은 효과: 260·300·320·360·390px), 가로(667·844), 세로→가로→세로 돌리기에서
//  첫 화면·악보를 연 화면·악보로 보기·아래 서랍(악기·빠르기·연주·저장·음색)마다 가로로 넘치는 요소가 없는지 본다.
//  넘침 = 문서가 가로로 굴러감(scrollWidth > 화면 폭) 또는 보이는 요소의 오른쪽 끝이 화면 밖(가로 스크롤 칸 안의 것은 뺌)
const { chromium } = require('playwright'); const fs = require('fs');
const pre = process.argv[2] || '9203ad49', SM = __SWR + '/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
const HTML = 'file://' + require('path').resolve(process.env.HTML || __dirname + '/../index.html');
const SHOT = process.env.SHOT;   // 폴더를 주면 화면 사진
async function overflow(p) {
  return p.evaluate(() => {
    const W = innerWidth, out = [];
    const inScroller = el => { for (let e = el.parentElement; e && e !== document.body; e = e.parentElement) { const cs = getComputedStyle(e); if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && e.scrollWidth > e.clientWidth + 1) return true; if (/(auto|scroll|hidden|clip)/.test(cs.overflowX) && e.getBoundingClientRect().right <= W + 1) return true; } return false; };
    for (const el of document.body.querySelectorAll('*')) {
      if (!el.offsetParent && getComputedStyle(el).position !== 'fixed') continue;
      const r = el.getBoundingClientRect(); if (!r.width || !r.height) continue;
      if (r.right > W + 1.5 && r.left < W && !inScroller(el)) out.push((el.id ? '#' + el.id : el.tagName.toLowerCase() + (el.className && typeof el.className === 'string' ? '.' + el.className.trim().split(/\s+/).slice(0, 2).join('.') : '')) + ' ' + Math.round(r.right - W) + 'px');
    }
    // 바깥 요소만 남김(자식은 부모 때문에 넘치는 경우가 많음)
    return { doc: document.documentElement.scrollWidth - W, els: out.slice(0, 8), n: out.length };
  });
}
const report = (name, o) => ok(name, o.doc <= 1 && !o.n, o.doc > 1 || o.n ? `문서 +${o.doc}px, 요소 ${o.n}: ${o.els.join(', ')}` : '');
async function page(b, w, h) {
  const ctx = await b.newContext({ viewport: { width: w, height: h }, isMobile: true, hasTouch: true, deviceScaleFactor: 2 });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https?:\/\/(?!cdn\.jsdelivr\.net\/npm\/pdfjs-dist)/, r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto(HTML); await p.waitForTimeout(600); return { p, errs };
}
async function load(p) {
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(1200);
}
const shot = async (p, n) => { if (SHOT) await p.screenshot({ path: `${SHOT}/zoom-${n}.png` }); };
(async () => {
  const b = await chromium.launch();
  for (const [w, h] of [[260, 560], [300, 640], [320, 568], [360, 740], [390, 844], [667, 375], [844, 390]]) {
    const { p, errs } = await page(b, w, h); const tag = `${w}x${h}`;
    report(`${tag} 첫 화면`, await overflow(p)); await shot(p, tag + '-hero');
    await load(p);
    report(`${tag} 악보 연 화면`, await overflow(p)); await shot(p, tag + '-open');
    for (const d of ['악기', '빠르기', '연주', '저장', '음색']) {
      const opened = await p.evaluate(d => { const bt = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === d); if (!bt) return false; bt.click(); return true; }, d);
      if (!opened) continue; await p.waitForTimeout(350);
      report(`${tag} 서랍 ${d}`, await overflow(p)); await shot(p, tag + '-' + d);
      await p.evaluate(d => { const bt = [...document.querySelectorAll('button')].find(x => x.offsetParent && x.textContent.trim() === d); if (bt) bt.click(); }, d); await p.waitForTimeout(250);
    }
    await p.evaluate(() => { const v = [...document.querySelectorAll('button')].find(x => /악보로 보기/.test(x.textContent) && x.offsetParent); if (v) v.click(); }); await p.waitForTimeout(1500);
    report(`${tag} 악보로 보기`, await overflow(p)); await shot(p, tag + '-sv');
    for (let i = 0; i < 4; i++) { await p.evaluate(() => { const z = document.getElementById('svZoomIn'); if (z && z.offsetParent) z.click(); }); await p.waitForTimeout(300); }
    report(`${tag} 악보 크기 키움`, await overflow(p)); await shot(p, tag + '-svzoom');
    ok(`${tag} 페이지 오류 없음`, !errs.length, errs.join(' | '));
    await p.context().close();
  }
  { // 돌리기: 세로 → 가로 → 세로
    const { p, errs } = await page(b, 390, 844); await load(p);
    await p.setViewportSize({ width: 844, height: 390 }); await p.waitForTimeout(700);
    report('돌리기 가로', await overflow(p)); await shot(p, 'rot-land');
    await p.setViewportSize({ width: 390, height: 844 }); await p.waitForTimeout(700);
    report('돌리기 다시 세로', await overflow(p)); await shot(p, 'rot-port');
    const vp = await p.evaluate(() => (document.querySelector('meta[name=viewport]') || {}).content || '');
    ok('손가락 확대를 막지 않음(viewport)', !/maximum-scale\s*=\s*1(\.0)?\b|user-scalable\s*=\s*no/.test(vp), vp);
    ok('돌리기 페이지 오류 없음', !errs.length, errs.join(' | '));
  }
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
