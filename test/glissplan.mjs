const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 209번 글리산도 재생 계획: 프론티어 가야금 파트보(4cd2237f) 20·52마디 아랫줄 X 머리 + gliss. → 음계를 따라 훑는 음, 해금 줄로 바꾸면 없음
// node test/glissplan.mjs
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js'), { renderPlan } = await import('../src/audio-engine.js');
const S = process.env.SAMPLES || __SWR + '/samples', f = S + '/' + fs.readdirSync(S).find(x => x.startsWith('4cd2237f'));
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
for (const [line, dir] of [[1, 1], [0, -1]]) {
  const r = P.analyzeLine(sc, line), bars = r.bars.map(b => ({ ...b, events: b.events.map(e => ({ ...e, line: 'g' })) }));
  const order = bars.map((_, i) => i), base = { tempoRows: [{ start: 1, bpm: 120, unit: 'q' }], speed: 1, sounds: {} };
  for (const n of [20, 52]) {
    const bi = bars.findIndex(b => b.number === n), ev = bars[bi].events.find(e => e.gliss);
    ok(ev && Math.sign(ev.gliss.steps) === dir, `줄 ${line} ${n}마디 글리산도 ${ev && JSON.stringify(ev.gliss)}`);
  }
  const pl = renderPlan(bars, order, { ...base, melodic: { g: { inst: 'gayageum' } } });
  for (const n of [20, 52]) {
    const bi = bars.findIndex(b => b.number === n), run = pl.notes.filter(x => x.glissRun && x.bi === bi);
    const ms = run.map(x => x.midis[0]), mono = ms.every((m, i) => !i || Math.sign(m - ms[i - 1]) === dir);
    const span = run.length ? run[run.length - 1].t - run[0].t : 0;
    console.log(`     ${n}마디: ${ms.join(' ')} (${span.toFixed(2)}초)`);
    ok(run.length >= 5 && mono && span > 1, `줄 ${line} ${n}마디 훑는 음 ${run.length}개, ${dir > 0 ? '올라감' : '내려감'}`);
  }
  const pl2 = renderPlan(bars, order, { ...base, melodic: { g: { inst: 'haegeum' } } });
  ok(!pl2.notes.some(x => x.glissRun), `줄 ${line} 해금 소리면 훑지 않음`);
}
console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
