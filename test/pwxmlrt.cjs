// MusicXML 되읽기·다시 내보내기: node pwxmlrt.cjs <musicxml 파일…> → xmlout/rt-<이름>.musicxml (앱에 MusicXML을 올려 모든 줄 켜고 내보냄)
const { chromium } = require('playwright'); const fs = require('fs');
const path = require('path'), pick = f => { const t = '/tmp/pick-rt-' + path.basename(f).replace(/[^A-Za-z0-9.]/g, '_'); fs.copyFileSync(f, t); return t; };
const HTML = process.env.HTML || '/home/claude/web/deploy-hapju/index.html';
(async () => { const b = await chromium.launch();
 for (const pre of process.argv.slice(2)) {
  const p = await (await b.newContext({ viewport: { width: 1280, height: 860 }, acceptDownloads: true })).newPage();
  const errs = []; p.on('pageerror', e => errs.push(e.message)); p.on('console', m => { if (m.type() === 'error') errs.push(m.text()); });
  await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
  await p.route('https://fonts.googleapis.com/**', r => r.fulfill({ body: '', contentType: 'text/css' }));
  await p.goto('file://' + HTML + '#allpanes'); await p.setInputFiles('#pdfInput', pick(pre));
  try { await p.waitForFunction(() => document.querySelectorAll('#lineList .lcard').length >= 1 && /읽었습니다|MusicXML/.test(document.getElementById('fileInfo').textContent), null, { timeout: 90000 }); } catch (e) { console.log(pre, 'load fail'); await p.close(); continue; }
  await p.waitForTimeout(800); await p.click('#allOn').catch(() => {}); await p.waitForTimeout(1500);
  const dl = p.waitForEvent('download', { timeout: 30000 }); await p.click('#exportXmlBtn'); const d = await dl;
  await p.waitForSelector(".xchk-dlg", { timeout: 60000 }).catch(() => {}); await p.keyboard.press("Escape");   // 저장 뒤 확인 창 닫기
  fs.copyFileSync(await d.path(), `xmlout/rt-${path.basename(pre)}`);
  const info = await p.evaluate(() => ({ title: document.getElementById('tbSongName').textContent, lines: document.querySelectorAll('#lineList .lcard').length }));
  console.log(pre, info.title, 'lines', info.lines, 'errs', errs.length, errs.slice(0, 2).join(' | '));
  await p.close(); }
 await b.close(); })();
