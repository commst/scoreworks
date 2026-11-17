// 곡선 짝짓기 기록: node test/_tl3.mjs <접두어> <줄> <마디>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const [pre, li, n] = process.argv.slice(2).map((v, i) => i ? +v : v), S = '/home/claude/samples';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(S + '/' + fs.readdirSync(S).find(x => x.startsWith(pre)))));
globalThis.__curveLog = [];
const r = P.analyzeLine(sc, li); const k = r.bars.findIndex(b => b.number === n), g = r.geo[k];
console.log('geo', g.page, g.x0.toFixed(1), g.x1.toFixed(1), 'heads', JSON.stringify((g.heads || []).slice(0, 12)));
for (const e of globalThis.__curveLog) if (e.pi === g.page && e.c.x0 > g.x0 - 30 && e.c.x0 < g.x1) console.log(JSON.stringify(e));
