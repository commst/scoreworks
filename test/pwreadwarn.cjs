const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// '음표를 거의 못 읽은 악보' 경고와 원인(216번): NODE_PATH=/opt/npm-tools/node_modules node test/pwreadwarn.cjs [html]
//  ① 신아리랑(73929564, MuseScore 3.2.3)을 214번 전 상태로 읽게 해(window.__swNoMsSmufl) 경고·원인(글꼴 MScore·만든 프로그램)이 나오는지
//  ② 고친 상태로는 경고가 없는지 ③ 보통 악보(프론티어)도 경고가 없는지
//  신아리랑 PDF는 비공개 샘플 저장소(scoreplay_sample)에 올라가 있어야 함
const { chromium } = require('playwright'); const fs = require('fs'), path = require('path');
const SM = __SWR + '/samples/', HTML = 'file://' + path.resolve(process.argv[2] || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
const pick = pre => { const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t); return t; };
(async () => {
  const b = await chromium.launch();
  const run = async (pre, broken) => {
    const p = await (await b.newContext({ viewport: { width: 1280, height: 860 } })).newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message));
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    if (broken) await p.addInitScript(() => { globalThis.__swNoMsSmufl = true; });
    await p.goto(HTML); await p.waitForTimeout(500);
    await p.setInputFiles('#pdfInput', pick(pre));
    await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
    await p.waitForTimeout(500);
    const r = await p.evaluate(() => ({ msg: document.getElementById('msg').hidden ? '' : document.getElementById('msg').textContent, info: document.getElementById('fileInfo').textContent }));
    await p.close(); return { ...r, errs };
  };
  let r = await run('73929564', true);
  ok('못 읽은 상태: 경고', /음표·쉼표를 거의 읽지 못했습니다/.test(r.msg) && /음표를 거의 읽지 못함/.test(r.info), r.msg.slice(0, 120));
  ok('못 읽은 상태: 원인(글꼴·프로그램)', /'MScore' 글꼴의 기호 번호\(3,428개\)/.test(r.msg) && /MuseScore Version: 3\.2\.3/.test(r.msg), r.msg.slice(r.msg.indexOf('원인'), r.msg.indexOf('원인') + 120));
  r = await run('73929564', false); ok('고친 상태: 경고 없음', !/거의 읽지 못/.test(r.msg + r.info) && !/읽지 못한 줄/.test(r.msg), r.msg.slice(0, 80));
  r = await run('9203ad49', false); ok('보통 악보: 경고 없음', !/거의 읽지 못/.test(r.msg + r.info) && !/읽지 못한 줄/.test(r.msg), r.msg.slice(0, 80));
  ok('페이지 오류 없음', !r.errs.length, r.errs.join(' | '));
  await b.close(); console.log(fail ? `${fail}개 실패` : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
