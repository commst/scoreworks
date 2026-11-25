// 225번 시험: 5단계 율명·구음·정간보 — 아래 글자(율명·구음), 장구 구음 자동, 검사기 구음 적기 → 인식 악보·MusicXML 가사, 정간보 보기(마디 = 한 줄, 누르면 재생·지금 마디 칠함)
// NODE_PATH=/opt/npm-tools/node_modules node test/pwyul.cjs [접두어] [phone]
const { chromium, devices } = require('playwright'); const fs = require('fs'), path = require('path');
const pre = process.argv[2] || '9203ad49', phone = process.argv[3] === 'phone', SM = '/home/claude/samples/', t = '/tmp/pick-' + pre + '.pdf';
fs.copyFileSync(SM + fs.readdirSync(SM).find(f => f.startsWith(pre)), t);
const VRV = '/home/claude/work/vrv/node_modules/verovio/dist/', HTML = 'file://' + path.resolve(process.env.HTML || __dirname + '/../index.html');
let fail = 0; const ok = (n, c, x = '') => { if (!c) fail++; console.log((c ? 'ok   ' : 'FAIL ') + n + (x ? ' ' + x : '')); };
(async () => {
  const b = await chromium.launch(), ctx = await b.newContext(phone ? { ...devices['iPhone 13'] } : { viewport: { width: 1440, height: 900 } });
  const p = await ctx.newPage(); const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'warning' && /정간보|인식 악보/.test(m.text())) console.log('  con', m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
  await p.goto(HTML); await p.waitForTimeout(800);
  await p.setInputFiles('#pdfInput', t);
  await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
  await p.waitForTimeout(800); await p.evaluate(() => { const m = document.getElementById('msg'); if (m && !m.hidden) m.click(); });
  for (const tm of ['tempoRows']) await p.evaluate(() => { for (const i of document.querySelectorAll('#tempoRows input[type=number]')) if (!+i.value) { i.value = 120; i.dispatchEvent(new Event('change', { bubbles: true })); } });
  const setSel = (id, v) => p.evaluate(([id, v]) => { const s = document.getElementById(id); s.value = v; s.dispatchEvent(new Event('change', { bubbles: true })); }, [id, v]);
  const drawn = () => p.waitForFunction(() => { const s = window.__recState(); return s.chunks.length && s.chunks[s.chunks.length - 1][1] >= s.nbars && s.chunks.every(c => c[2] === c[1] - c[0]); }, null, { timeout: 180000 });
  await p.click('#viewRec'); await drawn(); await p.waitForTimeout(500);
  if (phone) { await setSel('svPartSel', ''); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(500); }   // 휴대폰은 처음에 첫 줄만 — 장구도 보이게 총보 전체로
  const syl = () => p.evaluate(() => [...document.querySelectorAll('#recWrap .rec-chunk')].flatMap(c => [...c.querySelectorAll('g.syl text, g.syl')].map(x => x.textContent.trim())).filter(Boolean));
  ok('처음엔 아래 글자 없음', (await syl()).length === 0);
  // ① 율명
  await setSel('svLab', 'yul'); await p.waitForTimeout(400); await drawn(); await p.waitForTimeout(800);
  const y1 = await syl();
  ok('① 율명: 음 아래 글자', y1.length > 20, y1.slice(0, 12).join(' '));
  ok('  소금 A♭4 = 중(황종 E♭4)', y1.includes('중') && y1.includes('임'));
  ok('  장구는 구음(덩·쿵·덕)', ['덩', '쿵', '덕'].some(g => y1.includes(g)));
  ok('  황종 단추 보임', await p.evaluate(() => !document.getElementById('svBaseLbl').hidden));
  await setSel('svBase', '68'); await p.waitForTimeout(400); await drawn(); await p.waitForTimeout(800);
  const y2 = await syl(); ok('  황종을 A♭4로 바꾸면 A♭4 = 황', y2.includes('황') && JSON.stringify(y2) !== JSON.stringify(y1), y2.slice(0, 8).join(' '));
  await setSel('svBase', '63'); await p.waitForTimeout(300);
  // ② 구음 적기
  await p.click('#svEdit'); await p.waitForTimeout(500); await drawn(); await p.waitForTimeout(500);
  await p.evaluate(() => window.__ed.select('n0_0_114_R0')); await p.waitForTimeout(700);
  ok('② 검사기에 구음 칸', await p.evaluate(() => !!document.querySelector('#edInsp .ei-gu')));
  await p.fill('#edInsp .ei-gu', '동'); await p.press('#edInsp .ei-gu', 'Enter'); await p.waitForTimeout(600);
  const c2 = await p.evaluate(() => window.__ed.ctx());
  ok('  수정 기록에 구음', c2 && c2.rec && c2.rec.gu === '동', JSON.stringify(c2 && c2.rec));
  ok('  구음만 적은 음은 보라(고친 음)가 아님', !(await p.evaluate(() => (window.__ed.evs('0', 114) || []).some(e => e[5]))));
  const xf = await p.evaluate(() => window.__ed.xmlFile());
  ok('  파일용 MusicXML에 가사 칸으로', /<lyric number="1"><syllabic>single<\/syllabic><text>동<\/text><\/lyric>/.test(xf) && (xf.match(/<lyric /g) || []).length === 1);
  await setSel('svLab', 'gu'); await p.waitForTimeout(400); await drawn(); await p.waitForTimeout(1200);
  const g1 = await p.evaluate(() => [...document.querySelectorAll('#recWrap g.syl')].map(x => x.textContent.trim()));
  ok('  아래 글자 구음: 적은 구음 + 장구 구음, 율명은 없음', g1.includes('동') && g1.some(x => /덩|덕|쿵/.test(x)) && !g1.includes('중'), g1.slice(0, 8).join(' '));
  await p.click('#svPractice'); await p.waitForTimeout(300);
  // ③ 정간보
  await p.click('#viewJg'); await p.waitForTimeout(1500);
  const jg = await p.evaluate(() => { const cols = document.querySelectorAll('#jgWrap .jg-col'); return { n: cols.length, txt: [...cols].slice(0, 4).map(c => c.textContent).join(' | '), head: (document.querySelector('#jgWrap .jg-head') || {}).textContent, vis: !document.getElementById('jgWrap').hidden && document.getElementById('recWrap').hidden && document.getElementById('svWrap').hidden }; });
  ok('③ 정간보: 마디마다 한 줄(170)', jg.n === 170 && jg.vis, JSON.stringify({ n: jg.n, head: jg.head }));
  await setSel('svLab', 'yul'); await p.waitForTimeout(800);
  const jt = await p.evaluate(() => [...document.querySelectorAll('#jgWrap .jg-col')][114].textContent);
  ok('  율명으로 적힘(115마디에 중)', /중/.test(jt), jt);
  const jangKey = await p.evaluate(() => { const s = document.getElementById('svPartSel'); const o = [...s.options].find(o => /장구/.test(o.textContent)); return o && o.value; });
  if (jangKey) { await setSel('svPartSel', jangKey); await p.waitForTimeout(1000); }
  const jj = await p.evaluate(() => [...document.querySelectorAll('#jgWrap .jg-col')].slice(0, 3).map(c => c.textContent).join(' | '));
  ok('  장구만 → 구음 정간보', !!jangKey && /덩|덕|쿵/.test(jj), jj.slice(0, 80));
  // 누르면 재생·칠함
  await p.evaluate(() => document.querySelectorAll('#jgWrap .jg-col')[9].click());
  let on = null; for (let i = 0; i < 30; i++) { await p.waitForTimeout(400); on = await p.evaluate(() => { const c = document.querySelector('#jgWrap .jg-col.on'); return c ? +c.dataset.k : null; }); if (on != null && on >= 9) break; }
  ok('  마디를 누르면 그 마디부터 재생·지금 마디 칠함', on != null && on >= 9 && on <= 12, String(on));
  await p.evaluate(() => document.getElementById('stopBtn') ? document.getElementById('stopBtn').click() : null);
  await p.screenshot({ path: '/tmp/pwyul-' + (phone ? 'phone' : 'pc') + '.png' });
  await p.click('#viewRec'); await p.waitForTimeout(500);
  ok('정간보 → 인식 악보로 돌아옴', await p.evaluate(() => document.getElementById('jgWrap').hidden && !document.getElementById('recWrap').hidden));
  // ④ 늘 보이는 [음표만·율명·구음] 단추(226번 뒤): 원본 PDF에서 율명을 누르면 인식 악보 + 율명
  await p.click('#viewScore'); await p.waitForTimeout(400);
  await p.click('#svLabLbl button[data-lab="none"]'); await p.waitForTimeout(300);
  ok('④ [음표만·율명·구음] 단추가 보임', await p.evaluate(() => { const e = document.querySelector('#svLabLbl button[data-lab="yul"]'); const r = e.getBoundingClientRect(); return !!e.offsetParent && r.width > 0; }));
  await p.click('#svLabLbl button[data-lab="yul"]'); await p.waitForTimeout(600);
  ok('  원본 PDF에서 [율명] → 인식 악보 + 율명', (await p.evaluate(() => window.__recState().src)) === 'rec' && await p.evaluate(() => document.querySelector('#svLabLbl button[data-lab="yul"]').getAttribute('aria-pressed') === 'true' && document.getElementById('svLab').value === 'yul' && !document.getElementById('svBaseLbl').hidden));
  await p.screenshot({ path: '/tmp/pwyul-labs-' + (phone ? 'phone' : 'pc') + '.png' });
  ok('페이지 오류 없음', !errs.length, errs.slice(0, 3).join(' | '));
  await b.close(); console.log(fail ? 'FAIL ' + fail : 'ALL OK'); process.exit(fail ? 1 : 0);
})();
