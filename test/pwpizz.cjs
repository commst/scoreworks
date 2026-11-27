const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 208번: 아쟁 주법(pizz.·arco) — 악보 글자로 뜯기 구간, 음 수정 창의 '주법', 저장·되돌리기, 뜯기 녹음 받기, MusicXML pizz.·arco
// node test/pwpizz.cjs <html> [desktop|mobile]   (월광 소아쟁 파트보 5139dcdd: 9마디 PIZZ ~ 23마디 arco)
const { chromium, devices } = require((process.env.NPM_TOOLS || '/opt/npm-tools') + '/node_modules/playwright'); const fs = require('fs');
const FILE = require('path').resolve(process.argv[2] || 'index.html'), MODE = process.argv[3] || 'desktop';
const pdf = '/tmp/pick-5139dcdd.pdf'; fs.copyFileSync(__SWR + '/samples/' + fs.readdirSync(__SWR + '/samples').find(f => f.startsWith('5139dcdd')), pdf);
let fails = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) fails++; };
(async () => { const b = await chromium.launch();
  const ctx = await b.newContext({ ...(MODE === 'mobile' ? devices['iPhone 13'] : { viewport: { width: 1280, height: 900 } }), acceptDownloads: true });
  const errs = []; const open = async () => { const p = await ctx.newPage(); p.on('pageerror', e => errs.push(e.message)); p.on('dialog', d => d.accept());
    await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: __SWR + '/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
    await p.route(/^https:\/\/(?!cdn\.jsdelivr).*/, r => r.abort());
    await p.goto('file://' + FILE + '#allpanes'); await p.waitForFunction(() => window.__appReady === 'ok');
    await p.setInputFiles('#pdfInput', pdf); await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 150000 }); await p.waitForTimeout(800);
    return p; };
  let p = await open();
  const info = await p.evaluate(() => { const st = window.__st, k = Object.keys(st.lineRes)[0], r = st.lineRes[k];
    const at = n => { const bb = r.bars.find(x => x.number === n); const ev = bb.events.filter(e => e.midis && e.midis.length); return [ev.filter(e => e.pz).length, ev.length]; };
    return { k, inst: st.lineCfg[k].inst, b5: at(5), b9: at(9), b22: at(22), b23: at(23) }; });
  ok(info.inst === 'ajaeng', MODE + ' 소아쟁 줄 악기 = 아쟁 ' + info.inst);
  ok(info.b5[0] === 0 && info.b9[0] === info.b9[1] && info.b22[0] === info.b22[1] && info.b23[0] === 0, MODE + ' 악보 PIZZ(9마디)~arco(23마디) 구간이 뜯기 ' + JSON.stringify(info));
  await p.waitForFunction(() => document.documentElement.dataset.bankajaeng_pizz === 'ok', null, { timeout: 20000 }).catch(() => {});
  ok(await p.evaluate(() => document.documentElement.dataset.bankajaeng_pizz) === 'ok', MODE + ' 뜯기 녹음(ajaeng_pizz) 받음');
  ok(!(await p.evaluate(() => [...document.querySelectorAll('select option')].some(o => o.value === 'ajaeng_pizz'))), MODE + ' 줄 악기 목록에 뜯기는 없음');
  // 음 수정 창: 5마디 첫 음 '여기부터 뜯기'
  const openEd = async n => { await p.evaluate(n => window.__openEditor(n), n); await p.waitForSelector('.edit-dlg'); };
  await openEd(5);
  ok(await p.locator('.edit-dlg .ed-pzhint').count() === 1, MODE + ' 주법 안내 글');
  const sel = p.locator('.edit-dlg .ed-row select[aria-label="주법"]');
  ok(await sel.count() >= 2 && (await p.locator('.edit-dlg .ed-pz i').first().textContent()).includes('활'), MODE + ' 음마다 주법 고르기(지금 활)');
  await sel.first().selectOption('pf'); await p.waitForTimeout(500);
  const b5 = () => p.evaluate(k => { const bb = window.__st.lineRes[k].bars.find(x => x.number === 5); const ev = bb.events.filter(e => e.midis && e.midis.length); return [ev.filter(e => e.pz).length, ev.length]; }, info.k);
  let v = await b5(); ok(v[0] === v[1] && v[1] > 0, MODE + ' 여기부터 뜯기 → 5마디 모두 뜯기 ' + v);
  ok((await p.locator('.edit-dlg .ed-pz i.on').count()) >= v[1] && await p.locator('.edit-dlg .ed-row.changed').count() === 1, MODE + ' 칩이 뜯기로, 고친 줄 표시');
  // 둘째 음은 '이 음만 활'
  await p.locator('.edit-dlg .ed-row select[aria-label="주법"]').nth(1).selectOption('a1'); await p.waitForTimeout(500);
  v = await b5(); ok(v[0] === v[1] - 1, MODE + ' 이 음만 활 → 하나만 활 ' + v);
  // MusicXML: 고친 줄은 고친 결과대로 pizz.·arco + <sound pizzicato>
  await p.keyboard.press('Escape'); await p.evaluate(() => { const d = document.querySelector('.edit-back'); if (d) d.click(); });
  const dl = p.waitForEvent('download', { timeout: 60000 }); await p.click('#exportXmlBtn'); const d = await dl;
  const xml = fs.readFileSync(await d.path(), 'utf8'); fs.writeFileSync('/tmp/pwpizz-' + MODE + '.musicxml', xml);   // XSD 검사용(test/xsdcheck.py)
  const wd = [...xml.matchAll(/<measure number="(\d+)"[\s\S]*?<\/measure>/g)].flatMap(m => [...m[0].matchAll(/<words[^>]*>(pizz\.|arco|PIZZ)<\/words><\/direction-type>(?:<offset>\d+<\/offset>)?(?:<staff>\d+<\/staff>)?<sound pizzicato="(yes|no)"/g)].map(w => `${m[1]}:${w[1]}:${w[2]}`));
  console.log('     MusicXML pizz/arco:', wd.slice(0, 8).join(' '));
  ok(wd[0] === '5:pizz.:yes' && wd[1] === '5:arco:no' && wd[2] === '5:pizz.:yes' && wd.some(x => /^23:arco/.test(x)) && !wd.some(x => /^9:/.test(x)), MODE + ' MusicXML 주법 글자가 고친 대로(5마디 뜯기·한 음 활, 9마디 PIZZ는 이미 뜯기라 없음)');
  // 다시 열어도 그대로
  await p.close(); p = await open();
  v = await b5(); ok(v[0] === v[1] - 1, MODE + ' 다시 열어도 주법 수정 그대로 ' + v);
  // 되돌리기(Ctrl+Z 대신 '이 마디 모두 되돌리기')
  await openEd(5); await p.locator('.ed-foot button', { hasText: '이 마디 모두 되돌리기' }).click(); await p.waitForTimeout(500);
  v = await b5(); ok(v[0] === 0, MODE + ' 되돌리면 다시 활 ' + v);
  ok(errs.length === 0, MODE + ' 페이지 오류 0 ' + errs.slice(0, 2).join(' | '));
  await b.close(); console.log(fails ? `FAILED ${fails}` : 'ALL OK'); process.exit(fails ? 1 : 0); })();
