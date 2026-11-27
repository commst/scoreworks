const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
// 아쟁 주법(208번): 앱의 markPizz(악보 pizz.·arco 글자 + 음 수정 '주법' → 음마다 e.pz)를 실제 악보로 시험
// node test/pizzmark.mjs [악보.pdf…]  — 인자가 없으면 월광 소아쟁(5139dcdd)·바르도 소아쟁(01391308)
// 마디마다 뜯기 음 수 / 전체 음 수를 보이고, 글자 바로 앞 음은 바뀌지 않고 글자 뒤 음부터 바뀌는지, 수정 표시(pf·af·p1·a1)가 맞게 먹는지 확인
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
const src = fs.readFileSync(new URL('../src/index.template.html', import.meta.url), 'utf8');
const a = src.indexOf('const PZ_ON = '), b = src.indexOf('const lineResOf = ');
const { markPizz, pizzWord } = new Function(src.slice(a, b) + '; return { markPizz, pizzWord };')();
const SAMPLES = process.env.SAMPLES || __SWR + '/samples';
let files = process.argv.slice(2);
if (!files.length) files = fs.readdirSync(SAMPLES).filter(f => /^(5139dcdd|01391308)/.test(f)).map(f => SAMPLES + '/' + f);
let bad = 0;
const ok = (c, m) => { if (!c) { bad++; console.log('  ✗', m); } };
// 글자 판정
for (const [t, v] of [['pizz.', true], ['PIZZ', true], ['Pizz.', true], ['arco', false], ['Arco.', false], ['div.', null], ['피치카토', true], ['con sord.', null]]) ok(pizzWord(t) === v, `pizzWord(${t}) = ${pizzWord(t)}`);
for (const f of files) {
  const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
  const r0 = P.analyzeLine(sc, sc.lines && sc.lines.length ? 0 : null);
  const r = markPizz(r0);
  const W = r0.marks.words.filter(w => pizzWord(w.text) != null);
  console.log(f.split('/').pop(), '— 글자', W.map(w => `${w.text}@${r0.bars[Math.floor(w.p0)].number}`).join(' '));
  const seq = r.bars.map((bb, bi) => { const ev = bb.events.filter(e => e.midis && e.midis.length); return { n: bb.number, bi, pz: ev.filter(e => e.pz).length, all: ev.length }; });
  // 글자가 있는 마디 앞뒤를 보여 준다
  for (const w of W) {
    const bi = Math.floor(w.p0), on = pizzWord(w.text);
    const row = seq.slice(Math.max(0, bi - 1), bi + 2).map(s => `${s.n}:${s.pz}/${s.all}`).join(' ');
    console.log(`  ${w.text.padEnd(6)} ${row}`);
    const after = r.bars[bi].events.filter(e => e.midis && e.midis.length && bi + e.t.v / r.bars[bi].barLen.v >= w.p0 + 0.02);
    if (after.length) ok(after.every(e => !!e.pz === on) || W.some(x => x !== w && Math.abs(x.p0 - w.p0) < 1), `${w.text}@${r.bars[bi].number} 뒤 음이 ${on ? '뜯기' : '활'}가 아님`);
  }
  // 음 수정 표시: 첫 뜯기 구간 앞 활 음에 'pf' → 그 음부터 뜯기, 'a1'을 뜯기 음 하나에 → 그 음만 활
  const evs = []; r0.bars.forEach((bb, bi) => bb.events.forEach((e, i) => { if (e.midis && e.midis.length && !e.tie) evs.push({ bi, i, e }); }));
  const firstPz = evs.findIndex(x => r.bars[x.bi].events[x.i].pz);
  if (firstPz > 3) {
    const tgt = evs[firstPz - 3], one = evs[firstPz + 1];
    const ed = { ...r0, bars: r0.bars.map((bb, bi) => ({ ...bb, events: bb.events.map((e, i) => bi === tgt.bi && i === tgt.i ? { ...e, pzEd: 'pf' } : bi === one.bi && i === one.i ? { ...e, pzEd: 'a1' } : e) })) };
    const r2 = markPizz(ed), pzOf = x => !!r2.bars[x.bi].events[x.i].pz;
    ok(!pzOf(evs[firstPz - 4]) && pzOf(tgt) && pzOf(evs[firstPz - 2]) && pzOf(evs[firstPz]), `'여기부터 뜯기'가 그 음부터 먹지 않음`);
    ok(!pzOf(one) && pzOf(evs[firstPz + 2]), `'이 음만 활'이 그 음만 먹지 않음`);
  }
}
// 재생 계획: 아쟁 줄의 e.pz 음만 ajaeng_pizz(농현 없음), 다른 악기 줄은 pz가 있어도 그대로
{
  const { renderPlan } = await import('../src/audio-engine.js');
  const f = files[0], sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f)));
  const r = markPizz(P.analyzeLine(sc, sc.lines && sc.lines.length ? 0 : null));
  const bars = r.bars.map(bb => ({ ...bb, events: bb.events.map(e => ({ ...e, line: 'a' })) }));
  const order = bars.map((_, i) => i), base = { tempoRows: [{ start: 1, bpm: 90, unit: 'q' }], speed: 1, sounds: {} };
  for (const inst of ['ajaeng', 'ajaeng_syn', 'haegeum']) {
    const pl = renderPlan(bars, order, { ...base, melodic: { a: { inst } } });
    const pz = pl.notes.filter(n => n.inst === 'ajaeng_pizz'), want = inst !== 'haegeum';
    const nPz = bars.reduce((n, bb) => n + bb.events.filter(e => e.pz && e.midis && e.midis.length && !e.tie).length, 0);
    console.log(`  재생 ${inst}: 뜯기 음 ${pz.length} (악보 pz 음 ${nPz})`);
    ok(want ? pz.length > 0 && pz.length <= nPz && pz.every(n => n.nong === false) : pz.length === 0, `${inst} 재생 계획의 뜯기 음이 이상함`);
  }
}
console.log(bad ? `실패 ${bad}` : '모두 통과');
process.exit(bad ? 1 : 0);
