// 큰보표 번갈아 치기(alignCrossStaff)로 바뀌는 마디 목록: node test/_xstaff.mjs <악보 경로…>
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs'; import path from 'path';
const P = await import('../src/score-parser.js');
let tot = 0;
for (const f of process.argv.slice(2)) {
  let sc; try { sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); } catch (e) { continue; }
  const lines = sc.lines.length ? sc.lines : [{ id: 0, label: '' }];
  const res = {}; const get = i => res[i] || (res[i] = P.analyzeLine(sc, sc.lines.length ? i : null));
  const out = [];
  for (let i = 0; i + 1 < lines.length; i++) {
    if (!/\(윗줄\)/.test(lines[i].label || '') || !/\(아랫줄\)/.test(lines[i + 1].label || '')) continue;
    for (const [a, b] of [[i, i + 1], [i + 1, i]]) {
      const r = get(a), n = P.alignCrossStaff(r, get(b)); if (n === r) continue;
      n.bars.forEach((bb, k) => { if (bb !== r.bars[k]) out.push(`${a}:${bb.number}`); });
    }
  }
  if (out.length) { tot += out.length; console.log(path.basename(f).slice(0, 8), out.length, out.slice(0, 40).join(' ')); }
}
console.log('TOTAL', tot);
