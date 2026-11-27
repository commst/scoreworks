const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const A = await import(__SWR + '/prev/score-parser.js'), B = await import(__SWR + '/scoreplay/src/score-parser.js');
const [pre, li, ...bars] = process.argv.slice(2); const SM=__SWR + '/samples/';
const f = SM + fs.readdirSync(SM).find(x => x.startsWith(pre)); const d = fs.readFileSync(f);
const a = await A.loadScore(pdfjs, new Uint8Array(d)), b = await B.loadScore(pdfjs, new Uint8Array(d));
const ra = A.analyzeLine(a, +li), rb = B.analyzeLine(b, +li);
const fm = e => `${e.voice}${e.t}+${e.dur}${e.sus?'s'+e.sus:''}${e.tie?'T':''}[${(e.midis||['p'+(e.pos??'')]).join('.')}]`;
for (const n of bars) { const x = ra.bars.find(q=>q.number==n), y = rb.bars.find(q=>q.number==n);
  console.log('bar', n); console.log(' old', x.events.map(fm).join(' ')); console.log(' new', y.events.map(fm).join(' ')); }
