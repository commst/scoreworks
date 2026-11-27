const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 210번 타악 마디별 소리: 악보 글자(cym.·대북·windbell.)로 자동, 줄 카드 '구간별 소리' 표, 음 수정 '이 음만·여기부터', MusicXML 악기, 다시 열기
// node test/pwpercsnd.cjs <html> [desktop|mobile]   (미락흘 Cymbals·windbell·징·대북 파트보 004d79b5)
const { chromium, devices } = require((process.env.NPM_TOOLS || '/opt/npm-tools') + '/node_modules/playwright'); const fs = require('fs');
const FILE = require('path').resolve(process.argv[2] || 'index.html'), MODE = process.argv[3] || 'desktop';
const pdf = '/tmp/pick-004d79b5.pdf'; fs.copyFileSync(__SWR + '/samples/' + fs.readdirSync(__SWR + '/samples').find(f => f.startsWith('004d79b5')), pdf);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ ...(MODE === 'mobile' ? devices['iPhone 13'] : { viewport: { width: 1280, height: 900 } }), acceptDownloads: true });
  const errs = []; const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
    await p.goto('file://' + FILE + '#allpanes'); await p.waitForFunction(() => window.__appReady === 'ok');
    await p.setInputFiles('#pdfInput', pdf); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(800);
    return p; };
  // 마디마다 [윗성부 소리들, 아랫성부 소리들] (바꾸지 않은 음은 '-') — 내보내기 직전처럼 refreshPercSnd 뒤 state.bars
  const snd = (p, nums) => p.evaluate(nums => { const st = window.__st, o = {};
    for (const n of nums) { const b = st.bars.find(x => x.number === n); o[n] = b ? b.events.filter(e => !e.tie).map(e => e.voice + ':' + (e.snd || '-')).join(' ') : 'none'; }
    return o; }, nums);
  let p = await open();
  const info = await p.evaluate(() => { const st = window.__st, k = Object.keys(st.lineCfg)[0], c = st.lineCfg[k]; return { k, role: c.role, R: c.R, L: c.L }; });
  ok(info.role === 'perc', MODE + ' 타악 줄 ' + JSON.stringify(info));
  let s = await snd(p, [91, 92, 96, 100]);
  console.log('     ', JSON.stringify(s));
  ok(/북/.test(s[92]) && /윈드차임/.test(s[96]) && /심벌/.test(s[100]) && !/북|윈드차임/.test(s[100]), MODE + " 악보 글자: 92마디 '대북' → 북, 96 'windbell.' → 윈드차임, 100 'cym' → 심벌");
  // 줄 카드 '구간별 소리': 펼치고 [+ 구간 추가] → 2마디부터 징
  await p.evaluate(() => { const b = document.getElementById('expandAll'); if (b && !b.hidden && b.getAttribute('aria-pressed') !== 'true') b.click(); document.querySelectorAll('details.lc, .line-card details').forEach(d => d.open = true); });
  await p.waitForTimeout(300);
  ok(await p.locator('.perc-segs').count() >= 1, MODE + ' 줄 카드에 구간별 소리 칸');
  ok(/대북/.test(await p.locator('.perc-segs .ps-auto').first().textContent()), MODE + ' 악보에서 읽은 바뀌는 곳 목록');
  await p.locator('.perc-segs .ps-add').first().click();
  const row = p.locator('.perc-segs .ps-row').first();
  await row.locator('input[type=number]').fill('2'); await row.locator('input[type=number]').dispatchEvent('change');
  await row.locator('select[aria-label="소리"]').selectOption('징'); await p.waitForTimeout(300);
  s = await p.evaluate(() => { window.__st && 0; return null; });
  const segOk = await p.evaluate(k => JSON.stringify(window.__st.lineCfg[k].segs), info.k);
  ok(segOk === '[{"bar":2,"v":"*","snd":"징"}]', MODE + ' 표에 저장 ' + segOk);
  // 음 수정: 25마디 첫 음 '이 음만' 바라, 26마디 첫 음 '여기부터' 트라이앵글
  const openEd = async n => { await p.evaluate(n => window.__openEditor(n), n); await p.waitForSelector('.edit-dlg'); };
  await openEd(25);
  ok(await p.locator('.edit-dlg select[aria-label="소리 범위"]').count() >= 1, MODE + ' 음 수정 창에 소리 고르기');
  await p.locator('.edit-dlg select[aria-label="소리 범위"]').first().selectOption('1');
  await p.locator('.edit-dlg select[aria-label="소리"]').first().selectOption('바라'); await p.waitForTimeout(300);
  await p.evaluate(() => { const d = document.querySelector('.edit-back'); if (d) d.click(); }); await p.keyboard.press('Escape');
  await openEd(26);
  await p.locator('.edit-dlg select[aria-label="소리 범위"]').first().selectOption('f');
  await p.locator('.edit-dlg select[aria-label="소리"]').first().selectOption('트라이앵글'); await p.waitForTimeout(300);
  await p.evaluate(() => { const d = document.querySelector('.edit-back'); if (d) d.click(); }); await p.keyboard.press('Escape');
  // 내보내기로 refreshPercSnd + MusicXML 악기
  const dl = p.waitForEvent('download', { timeout: 60000 }); await p.click('#exportXmlBtn'); const d = await dl;
  const xml = fs.readFileSync(await d.path(), 'utf8'); fs.writeFileSync('/tmp/pwpercsnd-' + MODE + '.musicxml', xml);
  const closeDlg = async () => { await p.waitForTimeout(400); await p.keyboard.press('Escape'); await p.evaluate(() => document.querySelectorAll('.edit-back').forEach(x => x.click())); await p.waitForTimeout(200); };   // 저장 뒤 확인 창
  await closeDlg();
  s = await snd(p, [2, 7, 8, 25, 26, 27, 34]);
  console.log('     ', JSON.stringify(s));
  ok(/징/.test(s[2]) && /징/.test(s[7]) && /심벌/.test(s[8]) && !/징/.test(s[8]), MODE + " 표 2마디부터 징, 8마디 'cym.'에서 심벌로");
  const f25 = s[25].split(' '); ok(/바라/.test(f25[0]) && !f25.slice(1).some(x => /바라/.test(x)), MODE + ' 25마디 첫 음만 바라');
  ok(/트라이앵글/.test(s[26]) && /트라이앵글/.test(s[27]) && !/트라이앵글/.test(s[34]), MODE + " 26마디부터 트라이앵글, 34마디 'cym.'에서 끝");
  ok(/<instrument-name>징<\/instrument-name>/.test(xml) && /<instrument-name>바라<\/instrument-name>/.test(xml) && /<instrument-name>트라이앵글<\/instrument-name>/.test(xml), MODE + ' MusicXML에 바꾼 소리 악기(징·바라·트라이앵글)');
  // 글자 자동 끄기
  await p.locator('.perc-segs label.chk input').first().uncheck(); await p.waitForTimeout(300);
  const dl2 = p.waitForEvent('download', { timeout: 60000 }); await p.click('#exportXmlBtn'); await dl2; await closeDlg();
  s = await snd(p, [92, 96]); ok(!/북|윈드차임/.test(s[92] + s[96]), MODE + ' 글자 자동을 끄면 92·96마디 줄 설정');
  await p.locator('.perc-segs label.chk input').first().check(); await p.waitForTimeout(500);
  // 다시 열기
  await p.waitForTimeout(1000);   // 설정 자동 저장(0.7초 모아서)
  await p.close(); p = await open();
  const dl3 = p.waitForEvent('download', { timeout: 60000 }); await p.click('#exportXmlBtn'); await dl3;
  s = await snd(p, [2, 25, 26, 92]);
  ok(/징/.test(s[2]) && /바라/.test(s[25]) && /트라이앵글/.test(s[26]) && /북/.test(s[92]), MODE + ' 다시 열어도 그대로 ' + JSON.stringify(s));
  ok(errs.length === 0, MODE + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0); })();
