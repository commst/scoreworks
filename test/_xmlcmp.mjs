// 두 MusicXML 해석기 결과 비교: PREV=<옛 musicxml.js> node test/_xmlcmp.mjs <파일…>
import fs from 'fs';
const A = await import(process.env.PREV), B = await import('../src/musicxml.js');
const sig = r => JSON.stringify({ bars: r.bars.map(b => [b.number, b.barLen.toString(), b.timesig, b.repeatStart, b.repeatEnd, b.volta, b.events.map(e => [e.voice, e.t.toString(), e.dur.toString(), e.midis, !!e.tie, e.pos])]), marks: r.marks, reh: r.rehearsal });
for (const f of process.argv.slice(2)) {
  const by = new Uint8Array(fs.readFileSync(f)); const a = await A.loadMusicXml(by, f), b = await B.loadMusicXml(by, f);
  let diff = 0, slur = 0;
  for (let l = 0; l < a.xmlLines.length; l++) { const ra = A.analyzeXmlLine(a, l), rb = B.analyzeXmlLine(b, l); if (sig(ra) !== sig(rb)) { diff++; if (diff < 3) { const x = sig(ra), y = sig(rb); let i = 0; while (x[i] === y[i]) i++; console.log('  line', l, x.slice(i - 80, i + 80), '\n   vs', y.slice(i - 80, i + 80)); } }
    slur += rb.bars.reduce((s, bb) => s + bb.events.filter(e => e.slurS || e.slurE).length, 0); }
  console.log(f, 'lines', a.xmlLines.length, 'diff', diff, 'slur-events', slur);
}
