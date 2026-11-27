const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(__SWR + '/scoreplay/src/score-parser.js');
const [pre, li, bar] = process.argv.slice(2); const SM = __SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
globalThis.__curveLog = []; const r = P.analyzeLine(sc, +li);
const g = r.geo[r.bars.findIndex(b => b.number == bar)]; console.log('geo', g.page, g.staff, g.x0, g.x1);
for (const L of globalThis.__curveLog) if (L.pi === g.page && L.c.x1 >= g.x0 - 30 && L.c.x0 <= g.x1 + 5) console.log(JSON.stringify({ c: Object.values(L.c).map(v => +v.toFixed(1)), v: L.voice, S: L.start.map(a => a.map(v => typeof v === 'number' ? +v.toFixed(1) : v)), E: L.end.map(a => a.map(v => typeof v === 'number' ? +v.toFixed(1) : v)), hs: L.hs }));
