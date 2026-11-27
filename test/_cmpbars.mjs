const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 두 마디를 줄마다 견줌(같아야 할 마디가 다른지): node test/_cmpbars.mjs <접두어> <마디A> <마디B>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, A, B] = process.argv.slice(2), S = __SWR + '/samples';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(S + '/' + fs.readdirSync(S).find(x => x.startsWith(pre)))));
const f = e => `${e.voice}${e.t}:${(e.midis || [e.pos]).join('+')}/${e.dur}${e.tie ? 'T' : ''}${e.pcs ? 'p' + e.pcs.join(',') : ''}${e.roll ? 'R' : ''}${e.trill ? 'tr' : ''}${e.grace ? 'g' + e.grace : ''}`;
for (let i = 0; i < sc.lines.length; i++) { const r = P.analyzeLine(sc, i); const a = r.bars.find(b => b.number === +A), b = r.bars.find(b => b.number === +B);
  const sa = a.events.map(f).join(' '), sb = b.events.map(f).join(' ');
  if (sa !== sb || a.kind !== b.kind) console.log(i, sc.lines[i].label, '\n  ', A, a.kind, sa, '\n  ', B, b.kind, sb); }
const tm = P.analyzeLine(sc, 0).marks; console.log('tempo', JSON.stringify(tm.tempo.filter(t => t.p0 > +A - 4 && t.p0 < +B + 1)));
