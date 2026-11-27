const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 쪽의 한 영역에 있는 그리기 명령: node test/_drw.mjs <접두어> <쪽(0부터)> <x0> <x1> <y0> <y1>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, pg, x0, x1, y0, y1] = process.argv.slice(2).map((v, i) => i ? +v : v), S = __SWR + '/samples';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(S + '/' + fs.readdirSync(S).find(x => x.startsWith(pre)))));
const p = sc.pages[pg];
for (const d of p.drawings) { const r = d.rect; if (!r || r.x1 < x0 || r.x0 > x1 || r.y1 < y0 || r.y0 > y1) continue;
  console.log(d.type, [r.x0, r.x1, r.y0, r.y1].map(v => +v.toFixed(1)).join(','), 'w', +(r.x1 - r.x0).toFixed(1), 'h', +(r.y1 - r.y0).toFixed(1), (d.items || []).map(i => i.op).join('').slice(0, 40)); }
