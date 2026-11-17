// opcache 검증: PDF를 바로 읽은 결과와 캐시로 읽은 결과가 같은지(모든 줄·마디·음·경고·geo·marks)
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
import { loadScoreCached } from './opcache.mjs';
const P = await import('../../src/score-parser.js');
const sig = (sc) => { const ids = sc.lines.length ? sc.lines.map((l, i) => i) : [null]; return JSON.stringify([sc.title, sc.partName, sc.numPages, ids.map(id => { const r = P.analyzeLine(sc, id); return [r.bars.map(b => [b.number, String(b.barLen), b.kind, b.warnings, b.events.map(e => [String(e.t), String(e.dur), e.midis, e.tie, e.x])]), r.geo, r.marks]; })]); };
let same = 0, diff = 0, t1 = 0, t2 = 0;
for (const f of fs.readFileSync(process.argv[2], 'utf8').trim().split('\n')) {
  let a; const s0 = Date.now(); try { a = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); } catch (e) { continue; }
  const sa = sig(a); const s1 = Date.now(); const b = await loadScoreCached(P, pdfjs, f); const sb = sig(b); const s2 = Date.now();
  t1 += s1 - s0; t2 += s2 - s1;
  if (sa === sb) same++; else { diff++; console.log('DIFF', f); }
}
console.log('same', same, 'diff', diff, 'direct s', t1 / 1000, 'cached(first, incl. build) s', t2 / 1000);
