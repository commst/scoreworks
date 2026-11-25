// 보기 단추(원본 PDF·인식 악보·나란히·마디맵)를 차례로 눌러도 단추 줄이 화면에 남는지(215번): NODE_PATH=/opt/npm-tools/node_modules node test/pwswitch.cjs [html]
const { chromium, devices } = require('playwright');
const VRV='/home/claude/work/vrv/node_modules/verovio/dist/';
(async()=>{const b=await chromium.launch(); let fail=0;
for (const [nm,o] of [['pc',{viewport:{width:1280,height:800}}],['phone',{...devices['iPhone 13']}],['tablet',{viewport:{width:820,height:1180},isMobile:true,hasTouch:true}]]) {
const p=await (await b.newContext(o)).newPage(); const errs=[]; p.on('pageerror',e=>errs.push(e.message));
await p.route('https://cdn.jsdelivr.net/npm/pdfjs-dist@4.10.38/**', r => { const f = r.request().url().split('pdfjs-dist@4.10.38/')[1].replace('.min.mjs', '.mjs'); r.fulfill({ path: '/home/claude/web/node_modules/pdfjs-dist/' + f, contentType: 'text/javascript' }); });
await p.route('https://cdn.jsdelivr.net/npm/verovio@*/dist/**', r => { const f = r.request().url().split('/dist/')[1]; r.fulfill({ path: VRV + f, contentType: 'text/javascript', headers: { 'access-control-allow-origin': '*' } }); });
await p.goto('file://' + require('path').resolve(process.argv[2] || __dirname + '/../index.html')); await p.waitForTimeout(500);
await p.setInputFiles('#pdfInput', '/tmp/pick-9203ad49.pdf');
await p.waitForFunction(() => /읽었습니다/.test(document.getElementById('fileInfo').textContent), null, { timeout: 120000 });
const vis = () => p.evaluate(() => { const r = document.getElementById('viewRec').getBoundingClientRect(), el = document.elementFromPoint(r.left + r.width / 2, r.top + r.height / 2); return { top: Math.round(r.top), hit: !!el && (el.id === 'viewRec' || document.getElementById('viewRec').contains(el)) }; });
const out=[];
for (const id of ['viewScore','viewRec','viewSide','viewScore','viewRec','viewSide','viewRec','viewScore']) {
  await p.evaluate(i=>{ const b=document.getElementById(i), r=b.getBoundingClientRect(); b.dispatchEvent(new MouseEvent('click',{bubbles:true,clientX:r.left+5,clientY:r.top+5})); }, id);   // 사용자가 단추를 누르는 것처럼(보이는 단추)
  await p.waitForTimeout(700); const v=await vis(); out.push(id.slice(4)+':'+(v.hit?'보임':'안보임('+v.top+')')); if(!v.hit) fail++;
}
console.log(nm, out.join(' '), errs.length?errs:'');
await p.screenshot({path:`/tmp/sw-${nm}.png`});
}
console.log(fail?fail+' FAIL':'ALL OK'); await b.close(); process.exit(fail ? 1 : 0);})();
