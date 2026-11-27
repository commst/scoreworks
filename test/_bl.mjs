const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const SM=__SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith('2bc31eef')))));
const [a,z]=[+process.argv[2],+process.argv[3]];
for (let li=0; li<sc.lines.length; li++){ const r=P.analyzeLine(sc,li); console.log(li, sc.lines[li].name.padEnd(8), r.bars.filter(b=>b.number>=a&&b.number<=z).map(b=>b.number+':'+b.barLen+(b.warnings.length?'*':'')+(b.events.length?'':'_')).join(' ')); }
