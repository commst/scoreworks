const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 줄마다 마디 geo(쪽·오선·x) 보기: node test/_geo2.mjs <접두어> <마디부터> <마디까지> [줄,…]
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, a, z, ls] = process.argv.slice(2); const SM = __SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith(pre)))));
const lines = ls ? ls.split(',').map(Number) : sc.lines.map((_, i) => i);
for (const li of lines) { const r = P.analyzeLine(sc, li);
  const s = r.bars.map((b, i) => [b, r.geo[i]]).filter(([b]) => b.number >= +a && b.number <= +z).map(([b, g]) => g ? `${b.number}:p${g.page}s${g.staff}x${Math.round(g.x0)}` : `${b.number}:-`);
  console.log(li, sc.lines[li].name, r.bars.length, s.join(' ')); }
