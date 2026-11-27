const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// node test/_dbg.mjs <접두어> <줄> <마디> : 그 마디 둘레의 음표 머리·덧줄 원자료
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const SM = __SWR + '/samples/'; const f = SM + fs.readdirSync(SM).find(x => x.startsWith(process.argv[2]));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
const r = P.analyzeLine(sc, sc.lines.length ? +process.argv[3] : null); const k = r.bars.findIndex(b => b.number === +process.argv[4]); const g = r.geo[k];
const pg = sc.pages[g.page], st = sc.layouts[g.page].staves, s = st[g.staff];
console.log('page', g.page, 'staff', g.staff, [s.top.toFixed(1), s.bottom.toFixed(1)], 'x', g.x0.toFixed(0), g.x1.toFixed(0));
const near = h => h.ox > g.x0 - 2 && h.ox < g.x1 && h.oy > s.top - 40 && h.oy < s.bottom + 40;
console.log('heads', pg.glyphs.filter(h => [207, 250, 119].includes(h.code) && near(h)).map(h => [h.code, +h.x0.toFixed(1), +h.oy.toFixed(1)].join(',')).join(' '));
console.log('other', pg.glyphs.filter(h => ![207, 250, 119].includes(h.code) && near(h)).map(h => [h.code, +h.x0.toFixed(1), +h.oy.toFixed(1)].join(',')).join(' '));
