// 210번 타악 마디별 소리: renderPlan이 e.snd를 줄 설정보다 먼저 쓰는지, 다른 소리로 바꾼 북 음은 높이로 북 나누기를 하지 않는지
// node test/percsnd.mjs
const { renderPlan } = await import('../src/audio-engine.js');
let bad = 0; const ok = (c, m) => { console.log((c ? 'ok   ' : 'FAIL ') + m); if (!c) bad++; };
const fr = (n, d) => ({ n, d, v: n / d });
const ev = (t, voice, extra = {}) => ({ t: fr(t, 4), dur: fr(1, 4), voice, line: 'p', pos: 4, ...extra });
const bars = [
  { number: 1, barLen: fr(1, 1), timesig: [4, 4], kind: 'normal', warnings: [], events: [ev(0, 'R'), ev(1, 'L'), ev(2, 'R', { snd: '징' }), ev(3, 'L', { snd: '트라이앵글' })] },
  { number: 2, barLen: fr(1, 1), timesig: [4, 4], kind: 'normal', warnings: [], events: [ev(0, 'R', { snd: 'off' }), ev(1, 'R')] },
];
const pl = renderPlan(bars, [0, 1], { tempoRows: [{ start: 1, bpm: 60, unit: 'q' }], speed: 1, sounds: { 'p:R': '심벌', 'p:L': '북녹음' } });
const keys = pl.hits.map(h => h[1]);
console.log('    ', keys.join(' '));
ok(keys[0] === '심벌' && keys[1] === '북녹음', '바꾸지 않은 음은 줄 설정(윗성부 심벌, 아랫성부 북)');
ok(keys[2] === '징' && keys[3] === '트라이앵글', 'e.snd 음은 그 소리(징·트라이앵글)');
ok(keys.length === 5 && keys[4] === '심벌', "'off'로 바꾼 음은 소리 없음, 다음 음은 다시 줄 설정");
console.log(bad ? `FAILED ${bad}` : 'ALL OK'); process.exit(bad ? 1 : 0);
