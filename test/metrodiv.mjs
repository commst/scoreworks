// 209번 메트로놈 치는 단위: 4/4 두 마디(♩=60)에서 박마다 4, 박+반박 8, 8분 8, 16분 16번(마디마다), 첫 박 강하게, 분박은 작게
// 6/8(♩.=40) 한 마디: 박마다 2, 8분음표마다 6
// node test/metrodiv.mjs
const { renderPlan } = await import('../src/audio-engine.js');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const fr = (n, d) => ({ n, d, v: n / d, lt(o) { return this.v < o.v - 1e-12; }, add(o) { return fr(n * o.d + o.n * d, d * o.d); }, sub(o) { return fr(n * o.d - o.n * d, d * o.d); }, eq(o) { return Math.abs(this.v - o.v) < 1e-12; }, toString() { return n + '/' + d; } });
const bar = (number, n, d, ts) => ({ number, barLen: fr(n, d), timesig: ts, kind: 'normal', events: [], warnings: [] });
const run = (bars, rows, dv) => renderPlan(bars, bars.map((_, i) => i), { tempoRows: rows, speed: 1, sounds: {}, metronome: true, metroDiv: dv }).hits.filter(h => /^클릭/.test(h[1]));
const b44 = [bar(1, 1, 1, '4,4'), bar(2, 1, 1, '4,4')], r44 = [{ start: 1, bpm: 60, unit: 'q' }];
for (const [dv, n] of [['beat', 8], ['beat2', 16], ['q', 8], ['e', 16], ['s', 32], [undefined, 8]]) {
  const h = run(b44, r44, dv);
  ok(h.length === n, `4/4 ${dv || '(없음)'}: ${h.length}번 (기대 ${n})`);
  if (dv === 's') { const gaps = h.slice(1).map((x, i) => x[0] - h[i][0]); ok(gaps.every(g => Math.abs(g - 0.25) < 1e-6), '16분음표 간격 0.25초'); ok(h[0][1] === '클릭강' && h[4][2] === 0.55 && h[1][2] === 0.3, '첫 박 강, 박 보통, 분박 작게'); }
}
const b68 = [bar(1, 3, 4, '6,8')], r68 = [{ start: 1, bpm: 40, unit: 'dq' }];
ok(run(b68, r68, 'beat').length === 2, '6/8 박마다 2번');
ok(run(b68, r68, 'e').length === 6, '6/8 8분음표마다 6번');
console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
