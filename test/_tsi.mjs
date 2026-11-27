const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'); const SM=__SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(process.argv[2])))));
const r = P.analyzeLine(sc, +process.argv[3]); for (const n of process.argv.slice(4)) { const b = r.bars.find(x=>x.number==n); console.log(n, b.tsInferred, JSON.stringify(b.timesig), b.timesigChange); }
