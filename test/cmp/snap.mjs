// 회귀 기준 스냅숏(181번): 지금 해석기 결과를 기준 파일로 저장해 두고, 해석기를 고친 뒤에는 새 결과만 만들어 기준과 견준다
// (예전 방식은 옛 해석기·새 해석기로 PDF를 두 번씩 읽었음). PDF 해석(pdf.js)은 opcache.mjs로 캐시 → 두 번째부터는 해석기 처리만 돎
//   node test/cmp/snap.mjs check            기준과 비교 (regrn.mjs와 같은 분류: FILL·EMPTIED·OTHER(TIE/STEM)·NEW·LOST, 새 경고)
//   node test/cmp/snap.mjs make             지금 해석기 결과로 기준을 새로 씀 (바뀐 결과를 그림 대조로 받아들인 뒤)
//   node test/cmp/snap.mjs show <접두어> <줄> <마디…>   기준에 적힌 그 마디
// 환경변수: LIST(악보 목록 파일, 없으면 test/cmp/samples5.txt의 다섯 곡), GOLDEN(기준 폴더, 기본 /home/claude/scoreplay_sample/golden),
//           PARSER(다른 해석기로 — 예: 새 작업 공간에서 git show <커밋>:src/score-parser.js로 기준 만들기), SAMPLES(샘플 폴더)
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs'; import path from 'path'; import zlib from 'zlib'; import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { loadScoreCached } from './opcache.mjs';
const HERE = path.dirname(fileURLToPath(import.meta.url));
const P = await import(process.env.PARSER ? path.resolve(process.env.PARSER) : path.join(HERE, '../../src/score-parser.js'));
const GOLDEN = process.env.GOLDEN || '/home/claude/scoreplay_sample/golden', SAMPLES = process.env.SAMPLES || '/home/claude/samples';
const [cmd = 'check', ...rest] = process.argv.slice(2);

function list() {
  if (process.env.LIST) return fs.readFileSync(process.env.LIST, 'utf8').split('\n').map(s => s.trim()).filter(Boolean);
  const pre = fs.readFileSync(path.join(HERE, 'samples5.txt'), 'utf8').split('\n').map(s => s.trim()).filter(s => s && !s.startsWith('#'));
  const all = fs.readdirSync(SAMPLES);
  return pre.flatMap(p => all.filter(f => f.startsWith(p) && f.endsWith('.pdf')).map(f => path.join(SAMPLES, f)));
}
// 마디 하나 = [번호, 길이, 종류, 경고들, 음들] — 음은 [시각, 길이, 음높이(또는 타악 자리), 표시(r 굴림·g꾸밈 수·t 붙임줄·s 울림 길이)]
const evSig = e => [String(e.t), String(e.dur), (e.midis ? e.midis.slice().sort((a, b) => a - b).join('.') : 'p' + (e.pos ?? '') + e.voice), (e.roll ? 'r' : '') + (e.grace ? 'g' + e.grace : '') + (e.tie ? 't' : '') + (e.sus ? 's' + e.sus : '')];
const barSig = b => [b.number, String(b.barLen), b.kind, b.warnings || [], b.events.map(evSig)];
async function snapFile(f) {
  let sc; try { sc = await loadScoreCached(P, pdfjs, f); } catch (e) { return null; }
  const ids = sc.lines.length ? sc.lines.map((l, i) => i) : [null];
  return { file: path.basename(f), title: sc.title, lines: ids.map(id => { const r = P.analyzeLine(sc, id); return { label: id == null ? sc.partName : sc.lines[id].label, bars: r.bars.map(barSig) }; }) };
}
const keyOf = f => crypto.createHash('md5').update(fs.readFileSync(f)).digest('hex').slice(0, 8);
const gfile = k => path.join(GOLDEN, k + '.json.gz');
const readG = k => fs.existsSync(gfile(k)) ? JSON.parse(zlib.gunzipSync(fs.readFileSync(gfile(k)))) : null;

// regrn.mjs와 같은 비교: 마디 번호로 맞대고, 음이 바뀐 마디는 붙임줄만 바뀌었는지(TIE)·아닌지(STEM)
const evKey = ev => ev.slice(0, 3).join('/') + ev[3].replace(/s[^rgt]*$/, '');
const sameBar = (x, y) => x[1] === y[1] && x[4].map(evKey).sort().join(',') === y[4].map(evKey).sort().join(',');
const fr = s => { const [n, d] = String(s).split('/'); return d ? +n / +d : +n; };
function tieOnly(x, y) {
  const att = b => b[4].filter(e => !e[3].includes('t')).flatMap(e => e[2].split('.').map(m => e[0] + '@' + m + '#' + e[1]));
  const oa = new Set(att(x)), na = new Set(att(y));
  const covered = k => { const at = k.indexOf('@'); const t = fr(k.slice(0, at)), m = k.slice(at + 1).split('#')[0];
    return y[4].some(e => e[2].split('.').includes(m) && (e[3].includes('t') || e[3].includes('s')) && fr(e[0]) <= t + 1e-9 && t < fr(e[0]) + fr((e[3].match(/s([^rgt]+)/) || [])[1] || e[1]) - 1e-9); };
  return [...na].every(k => oa.has(k) || [...oa].some(o => o.split('#')[0] === k.split('#')[0])) && [...oa].filter(k => !na.has(k)).every(k => covered(k) || [...na].some(o => o.split('#')[0] === k.split('#')[0]));
}
function compare(g, n) {
  const c = { FILL: [], EMPTIED: [], OTHER: [], NEW: [], LOST: [], NEWWARN: [], STEMS: [], LINES: [] }, t = { TIE: 0, STEM: 0, wa: 0, wb: 0, barsA: 0, barsB: 0 };
  if (g.lines.length !== n.lines.length) c.LINES.push(g.lines.length + '->' + n.lines.length);
  for (let i = 0; i < Math.min(g.lines.length, n.lines.length); i++) {
    const A = g.lines[i].bars, B = n.lines[i].bars; t.barsA += A.length; t.barsB += B.length;
    t.wa += A.filter(x => x[3].length).length; t.wb += B.filter(x => x[3].length).length;
    const ma = new Map(), mb = new Map(); for (const x of A) if (!ma.has(x[0])) ma.set(x[0], x); for (const x of B) if (!mb.has(x[0])) mb.set(x[0], x);
    for (const [num, x] of ma) { const y = mb.get(num), tag = i + ':' + num;
      if (!y) { c.LOST.push(tag); continue; }
      if (!x[3].length && y[3].length) c.NEWWARN.push(tag);
      if (sameBar(x, y)) continue;
      if (!x[4].length && y[4].length) c.FILL.push(tag); else if (x[4].length && !y[4].length) c.EMPTIED.push(tag);
      else { c.OTHER.push(tag); if (tieOnly(x, y)) t.TIE++; else { t.STEM++; c.STEMS.push(tag); } } }
    for (const num of mb.keys()) if (!ma.has(num)) c.NEW.push(i + ':' + num);
  }
  return { c, t };
}

if (cmd === 'show') {
  const [pre, li, ...nums] = rest; const g = readG(pre); if (!g) { console.log('기준 없음', pre); process.exit(1); }
  for (const b of g.lines[+li].bars) if (nums.map(Number).includes(b[0])) console.log(JSON.stringify(b));
  process.exit(0);
}
const files = list(); const T0 = Date.now();
if (cmd === 'make') {
  fs.mkdirSync(GOLDEN, { recursive: true }); let n = 0;
  for (const f of files) { const s = await snapFile(f); if (!s) continue; fs.writeFileSync(gfile(keyOf(f)), zlib.gzipSync(JSON.stringify(s))); n++; }
  fs.writeFileSync(path.join(GOLDEN, 'README.txt'), `회귀 기준 스냅숏 (test/cmp/snap.mjs make)\n만든 때 ${new Date().toISOString()}\n해석기 ${process.env.PARSER || 'src/score-parser.js'} (scoreworks ${process.env.GITREV || ''})\n파일 ${n}개\n`);
  console.log('기준', n, '파일 →', GOLDEN, ((Date.now() - T0) / 1000).toFixed(1) + '초');
} else {
  const T = { files: 0, noGolden: 0, FILL: 0, EMPTIED: 0, OTHER: 0, TIE: 0, STEM: 0, NEW: 0, LOST: 0, NEWWARN: 0, LINES: 0, wa: 0, wb: 0, barsA: 0, barsB: 0 };
  for (const f of files) {
    const k = keyOf(f), g = readG(k); const s = await snapFile(f); if (!s) continue;
    if (!g) { T.noGolden++; console.log(k, '기준 없음'); continue; }
    const { c, t } = compare(g, s); T.files++;
    for (const x in t) T[x] += t[x]; for (const x of ['FILL', 'EMPTIED', 'OTHER', 'NEW', 'LOST', 'NEWWARN', 'LINES']) T[x] += c[x].length;
    if (Object.entries(c).some(([x, v]) => x !== 'STEMS' && v.length) || t.barsA !== t.barsB)
      console.log(k, 'bars', t.barsA, '->', t.barsB, 'warn', t.wa, '->', t.wb, Object.entries(c).filter(([, v]) => v.length).map(([x, v]) => x + ' ' + v.length + ' [' + v.slice(0, +(process.env.SHOWN || 10)).join(' ') + ']').join(' | '));
  }
  console.log('TOTAL', JSON.stringify(T), ((Date.now() - T0) / 1000).toFixed(1) + '초');
}
