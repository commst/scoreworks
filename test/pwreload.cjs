const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 악보 다시 불러오기·못 읽는 악보 시험(190번): NODE_PATH=/opt/npm-tools/node_modules node test/pwreload.cjs [html]
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const SM = __SWR + '/samples/', cp = pre => { const t = '/tmp/pick-' + pre + '.pdf'; fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t); return t; };
const html = path.resolve(process.argv[2] || path.join(__dirname, '../index.html'));
let fail = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fail++; };
(async () => { const b = await chromium.launch(); const ctx = await b.newContext({ viewport: { width: 1600, height: 1000 } });
  const p = await ctx.newPage(); await p.addInitScript(() => { try { if (localStorage.getItem('hapju-warnopen') == null) localStorage.setItem('hapju-warnopen', '1'); } catch (e) {} }); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
  await p.goto('file://' + html); await p.waitForFunction(() => window.__appReady === 'ok');
  const snap = () => p.evaluate(() => {
    const t = id => { const e = document.getElementById(id); return e ? e.textContent.trim().replace(/\s+/g, ' ').slice(0, 90) : null; };
    return { welcome: document.body.classList.contains('welcome'), song: t('tbSongName'), info: t('tbSongInfo'), fileName: t('fileName'), fileInfo: t('fileInfo'), parts: t('partsFileName'), full: t('fullFileList'), extra: t('extraFileList'), set: t('setState'), msg: (document.getElementById('msg').hidden ? '' : t('msg')), title: (document.getElementById('songTitleIn') || {}).value, bars: window.__st.bars.length, lines: window.__st.lineList.length, from: document.getElementById('from').value, to: document.getElementById('to').value, warn: document.querySelectorAll('#warnList .msg').length, reh: t('rehBox') };
  });
  const load = async (pre, input = '#pdfInput') => { await p.setInputFiles(input, cp(pre)); await p.waitForFunction(() => !/읽는 중/.test(document.getElementById('fileInfo').textContent) && !/분석 중/.test(document.getElementById('partsFileInfo').textContent), null, { timeout: 300000 }); await p.waitForTimeout(1500); return snap(); };
  const A = await load(process.env.A || '61c75dd1'); console.log('A', JSON.stringify(A));
  const B = await load(process.env.B || '9203ad49'); console.log('B', JSON.stringify(B));
  const A2 = await load(process.env.A || '61c75dd1'); console.log('A2', JSON.stringify(A2));
  const A3 = await load(process.env.A || '61c75dd1'); console.log('A3', JSON.stringify(A3));
  // 파트보 → 총보
  const P = await load('54ebac86', '#partsInput'); console.log('P', JSON.stringify(P));
  const A4 = await load(process.env.A || '61c75dd1'); console.log('A4', JSON.stringify(A4));
  // 기대: 다시 불러오면 앞 악보 정보가 남지 않음
  ok(B.song !== A.song && B.lines !== A.lines && B.to === String(B.bars) && !/61c75dd1/.test(B.full + B.fileName), 'A→B 앞 악보 정보 없음');
  ok(JSON.stringify(A2) === JSON.stringify(A) && JSON.stringify(A3) === JSON.stringify(A), '같은 악보를 다시 열면 처음 연 것과 같음');
  ok(P.full === '' && !/61c75dd1/.test(P.fileName), '총보 → 파트보: 총보 정보 없음');
  ok(JSON.stringify(A4) === JSON.stringify(A), '파트보 → 총보: 처음 연 것과 같음');
  // 상태를 바꿔 둔 뒤 다시 열기: '○○만' 보기·겹쳐 보기·음 고치기·스크롤·연주 범위가 남지 않아야
  await p.evaluate(() => document.getElementById('viewScore').click()); await p.waitForTimeout(1500);
  await p.evaluate(() => { const s = document.getElementById('svPartSel'); const o = [...s.options].find(o => o.value); if (o) { s.value = o.value; s.dispatchEvent(new Event('change')); } const ov = document.getElementById('svOver'); ov.checked = true; ov.dispatchEvent(new Event('change')); document.getElementById('svEdit').click(); document.getElementById('svWrap').scrollTop = 3000; const f = document.getElementById('from'); f.value = 20; f.dispatchEvent(new Event('change')); });
  await p.waitForTimeout(1000);
  const before = await p.evaluate(() => ({ part: document.getElementById('svPartSel').value, ov: document.getElementById('svOver').checked, ed: document.getElementById('svEdit').getAttribute('aria-pressed'), from: document.getElementById('from').value }));
  console.log('바꾼 상태', JSON.stringify(before));
  await load(process.env.B || '9203ad49'); await p.waitForTimeout(1500);
  const after = await p.evaluate(() => ({ part: document.getElementById('svPartSel').value, ov: document.getElementById('svOver').checked, ed: document.getElementById('svEdit').getAttribute('aria-pressed'), from: document.getElementById('from').value, top: document.getElementById('svWrap').scrollTop }));
  ok(!after.part && !after.ov && after.ed !== 'true' && after.from === '1' && after.top < 50, '다른 악보를 열면 보기 상태 초기화 ' + JSON.stringify(after));
  // 못 읽는 악보 → 첫 화면 + 오류
  for (const [f, what] of [['/tmp/pick-scan.pdf', '그림 PDF'], ['/tmp/pick-broken.pdf', '깨진 PDF']]) {
    await load(process.env.A || '61c75dd1');
    await p.setInputFiles('#pdfInput', f); await p.waitForFunction(() => !/읽는 중/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 }); await p.waitForTimeout(1200);
    const S = await snap(); console.log(what, JSON.stringify(S));
    ok(S.welcome && S.msg && /pick-scan|열지 못|문제/.test(S.msg) && S.full === '' && S.song === '예시 장단', what + ' → 첫 화면 + 오류 보임');
    await p.screenshot({ path: '/tmp/pwreload-' + what.replace(/ /g, '') + '.png' });
  }
  // 첫 화면에서 다시 정상 악보
  const A5 = await load(process.env.A || '61c75dd1'); ok(!A5.welcome && A5.bars === A.bars && !A5.msg, '첫 화면에서 다시 열기 정상');
  // 파트보로 못 읽는 악보
  await p.setInputFiles('#partsInput', '/tmp/pick-scan.pdf'); await p.waitForFunction(() => !/분석 중/.test(document.getElementById('partsFileInfo').textContent), null, { timeout: 120000 }); await p.waitForTimeout(1200);
  const PS = await snap(); ok(PS.welcome && PS.msg, '파트보 칸에 못 읽는 악보 → 첫 화면 + 오류 ' + JSON.stringify(PS).slice(0, 200));
  ok(!errs.length, '페이지 오류 없음 ' + errs.join(' | '));
  console.log(fail ? 'FAIL ' + fail : 'ALL OK'); await b.close(); process.exit(fail ? 1 : 0); })();
