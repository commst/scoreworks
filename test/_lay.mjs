const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(__SWR + '/scoreplay/src/score-parser.js');
const [pre, ...pgs] = process.argv.slice(2); const SM = __SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
for (const p of pgs) { const L = sc.layouts[+p]; console.log('page', p, 'staves', L.staves.length, 'systems', JSON.stringify(L.systems), 'sysOf', JSON.stringify(L.sysOf), 'tops', L.staves.map(s => Math.round(s.top)).join(',')); }
