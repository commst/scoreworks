const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 줄의 셈여림 표시와 마디별 크기: node test/_dyn.mjs <접두어> <줄> [마디부터] [마디까지]
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PARSER || '../src/score-parser.js'); const E = await import('../src/audio-engine.js');
const [pre, li, a = 1, z = 40] = process.argv.slice(2); const SM = __SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
const r = P.analyzeLine(sc, +li); console.log(sc.lines[+li].name);
for (const d of r.marks.dyn) { const b = r.bars[Math.floor(d.p0)]; if (b && b.number >= a && b.number <= z) console.log(' bar', b.number, JSON.stringify(d)); }
console.log(r.bars.filter(b => b.number >= a && b.number <= z).map((b) => { const i = r.bars.indexOf(b); return b.number + ':' + E.dynLevelAt(r.marks.dyn, i + 0.01).toFixed(2); }).join(' '));
