// 붙임줄 대조용 일괄 자르기: PREV=<예전 해석기> node test/_tiecrop.mjs <접두어> <줄:마디,줄:마디…> <출력 png>
// 앞 마디와 그 마디를 함께 잘라(같은 오선일 때) 위아래로 쌓고, 줄마다 예전·새 사건(이어진 음 T 표시)을 글로 찍는다
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs'; import { execSync } from 'child_process';
const A = await import(process.env.PREV), B = await import('../src/score-parser.js');
const [pre, spec, out] = process.argv.slice(2), S = process.env.SAMPLES || '/home/claude/samples';
const f = S + '/' + fs.readdirSync(S).find(x => x.startsWith(pre));
const d = new Uint8Array(fs.readFileSync(f));
const sa = await A.loadScore(pdfjs, d.slice()), sb = await B.loadScore(pdfjs, d.slice());
const items = spec.split(',').map(s => s.split(':').map(Number));
const cache = new Map(); const ana = (P, sc, li) => { const k = (P === A ? 'a' : 'b') + li; if (!cache.has(k)) cache.set(k, P.analyzeLine(sc, li)); return cache.get(k); };
const sig = b => b ? b.events.map(e => `${e.voice}${e.t}+${e.dur}${e.tie ? 'T' : ''}${e.sus ? 's' + e.sus : ''}[${(e.midis || ['p' + (e.pos ?? '')]).join('.')}]`).join(' ') : '-';
const files = [], R = 2.4;
for (const [li, n] of items) {
  const ra = ana(A, sa, li), rb = ana(B, sb, li);
  const k = rb.bars.findIndex(b => b.number === n), g = rb.geo[k]; if (!g) continue;
  const gp = rb.geo[k - 1]; const st = sb.layouts[g.page].staves[g.staff];
  const x0 = Math.max(0, (gp && gp.page === g.page && gp.staff === g.staff ? gp.x0 : g.x0) - 20), x1 = g.x1 + 25, y0 = Math.max(0, st.top - 30), y1 = st.bottom + 30;
  const o = `/tmp/tc-${pre}-${li}-${n}`;
  execSync(`pdftoppm -f ${g.page + 1} -l ${g.page + 1} -r ${72 * R} -x ${Math.round(x0 * R)} -y ${Math.round(y0 * R)} -W ${Math.round((x1 - x0) * R)} -H ${Math.round((y1 - y0) * R)} -png -singlefile "${f}" ${o}`);
  files.push(o + '.png');
  console.log(`${li}:${n} ${(sb.lines[li] && sb.lines[li].name || '').slice(0, 10)}\n  old ${sig(ra.bars[k])}\n  new ${sig(rb.bars[k])}`);
}
if (out && files.length) execSync(`python3 /tmp/chk/montage.py ${out} ${files.join(' ')}`);
