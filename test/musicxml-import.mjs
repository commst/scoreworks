// MusicXML 불러오기 회귀 시험 (PDF 필요 없음): node test/musicxml-import.mjs
// 178번 — divisions가 마디 안·파트마다 달라도 시각이 맞는지, <repeat times>, 더한 박자(3+2/8, 2/4+3/8), 이음줄(slur)
import { loadMusicXml, analyzeXmlLine } from '../src/musicxml.js';
import { playbackOrder } from '../src/score-parser.js';

const hdr = parts => `<?xml version="1.0"?><score-partwise version="3.1"><part-list>${parts.map((_, i) => `<score-part id="P${i}"><part-name>p${i}</part-name></score-part>`).join('')}</part-list>${parts.map((p, i) => `<part id="P${i}">${p}</part>`).join('')}</score-partwise>`;
const n = (step, dur, extra = '', oct = 4) => `<note><pitch><step>${step}</step><octave>${oct}</octave></pitch><duration>${dur}</duration>${extra}</note>`;
const att = (div, beats = '4', type = '4') => `<attributes><divisions>${div}</divisions><time><beats>${beats}</beats><beat-type>${type}</beat-type></time></attributes>`;
const load = xml => loadMusicXml(new TextEncoder().encode(xml), 't.musicxml');
let fail = 0;
const check = (name, got, want) => { const ok = JSON.stringify(got) === JSON.stringify(want); if (!ok) fail++; console.log((ok ? 'ok   ' : 'FAIL ') + name + (ok ? '' : `  got ${JSON.stringify(got)} want ${JSON.stringify(want)}`)); };
const evs = (sc, line = 0, bar = 0) => analyzeXmlLine(sc, line).bars[bar].events.map(e => [e.midis ? e.midis[0] : null, e.t.toString(), e.dur.toString()]);

// 1. 마디 안에서 divisions가 바뀜: C(4분, div 1) 뒤 D(4분, div 2)
{ const sc = await load(hdr([`<measure number="1">${att(1, '2')}${n('C', 1)}<attributes><divisions>2</divisions></attributes>${n('D', 2)}</measure>`]));
  check('divisions 마디 안에서 바뀜', evs(sc), [[60, '0', '1/4'], [62, '1/4', '1/4']]); }

// 2. 파트마다 divisions가 다름: 윗파트(div 1) 둘째 박의 rit.가 아랫파트(div 2)에도 같은 자리
{ const sc = await load(hdr([`<measure number="1">${att(1)}${n('C', 1)}<direction><direction-type><words>rit.</words></direction-type></direction>${n('C', 3)}</measure>`,
    `<measure number="1">${att(2)}${n('E', 8)}</measure>`]));
  check('파트마다 divisions — rit. 자리', [0, 1].map(l => analyzeXmlLine(sc, l).marks.tempo.map(t => t.p0)), [[0.25], [0.25]]);
  check('파트마다 divisions — 음 길이', evs(sc, 1), [[64, '0', '1']]); }

// 3. 셈여림 offset(소수 포함)·마디 안 divisions 변경 뒤 셈여림 자리
{ const sc = await load(hdr([`<measure number="1">${att(2)}${n('C', 2)}<attributes><divisions>4</divisions></attributes><direction><direction-type><dynamics><f/></dynamics></direction-type><offset>2</offset></direction>${n('D', 12)}</measure>`]));
  check('셈여림 자리(offset·divisions 변경)', analyzeXmlLine(sc, 0).marks.dyn.map(d => d.p0), [0.375]); }

// 4. <repeat times="3"> — 1~2마디를 세 번
const m = (k, bar = '', first = att(1)) => `<measure number="${k}">${k === 1 ? first + '<barline location="left"><repeat direction="forward"/></barline>' : ''}${n('C', 4)}${bar}</measure>`;
{ const sc = await load(hdr([m(1) + m(2, '<barline location="right"><repeat direction="backward" times="3"/></barline>') + m(3)]));
  const bars = analyzeXmlLine(sc, 0).bars;
  check('repeat times=3', playbackOrder(bars).map(i => i + 1), [1, 2, 1, 2, 1, 2, 3]);
  check('repeat times=3 — 반복 끄면 한 번', playbackOrder(bars, { repeats: false }).map(i => i + 1), [1, 2, 3]); }
{ const sc = await load(hdr([m(1) + m(2, '<barline location="right"><repeat direction="backward"/></barline>') + m(3)]));
  check('repeat times 없음 = 두 번(예전 그대로)', playbackOrder(analyzeXmlLine(sc, 0).bars).map(i => i + 1), [1, 2, 1, 2, 3]); }
{ // 1·2번 괄호가 있으면 괄호 번호가 먼저(times는 보지 않음)
  const v1 = '<barline location="left"><ending number="1" type="start"/></barline>', v2 = '<barline location="left"><ending number="2" type="start"/></barline>';
  const sc = await load(hdr([m(1) + `<measure number="2">${v1}${n('C', 4)}<barline location="right"><ending number="1" type="stop"/><repeat direction="backward" times="2"/></barline></measure><measure number="3">${v2}${n('C', 4)}</measure>`]));
  check('1·2번 괄호 반복', playbackOrder(analyzeXmlLine(sc, 0).bars).map(i => i + 1), [1, 2, 1, 3]); }

// 5. 더한 박자
{ const sc = await load(hdr([`<measure number="1">${att(2, '3+2', '8')}${n('C', 5)}</measure>`]));
  const b = analyzeXmlLine(sc, 0).bars[0];
  check('3+2/8', [b.timesig, b.barLen.toString()], [[5, 8], '5/8']); }
{ const sc = await load(hdr([`<measure number="1"><attributes><divisions>2</divisions><time><beats>2</beats><beat-type>4</beat-type><beats>3</beats><beat-type>8</beat-type></time></attributes>${n('C', 7)}</measure>`]));
  const b = analyzeXmlLine(sc, 0).bars[0];
  check('2/4+3/8', [b.timesig, b.barLen.toString()], [[7, 8], '7/8']); }
{ const sc = await load(hdr([`<measure number="1">${att(2, '6', '8')}${n('C', 6)}</measure>`]));
  check('6/8(보통 박자 그대로)', analyzeXmlLine(sc, 0).bars[0].timesig, [6, 8]); }

// 6. 못갖춘마디 길이(divisions 4, 8분음표 하나)
{ const sc = await load(hdr([`<measure number="0" implicit="yes">${att(4)}${n('C', 2)}</measure><measure number="1">${n('D', 16)}</measure>`]));
  check('못갖춘마디 길이', analyzeXmlLine(sc, 0).bars.map(b => b.barLen.toString()), ['1/8', '1']); }

// 7. 이음줄(slur) 시작·끝, 화음 구성음에 걸린 이음줄은 화음 이벤트에
{ const sl = t => `<notations><slur type="${t}" number="1"/></notations>`;
  const sc = await load(hdr([`<measure number="1">${att(1)}${n('C', 1, sl('start'))}${n('D', 1)}${n('E', 1)}<note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>1</duration>${sl('stop')}</note>${n('F', 1)}</measure>`]));
  check('이음줄 시작·끝(화음 구성음 포함)', analyzeXmlLine(sc, 0).bars[0].events.map(e => [e.midis, !!e.slurS, !!e.slurE]),
    [[[60], true, false], [[62], false, false], [[64, 67], false, true], [[65], false, false]]); }

// 8. 붙임줄(마디를 넘음·화음 일부만) — 예전 그대로
{ const ti = t => `<tie type="${t}"/>`, tn = t => `<notations><tied type="${t}"/></notations>`;
  const sc = await load(hdr([`<measure number="1">${att(1)}${n('C', 4, ti('start') + tn('start'))}<note><chord/><pitch><step>E</step><octave>4</octave></pitch><duration>4</duration></note></measure><measure number="2">${n('C', 4, ti('stop') + tn('stop'))}<note><chord/><pitch><step>G</step><octave>4</octave></pitch><duration>4</duration></note></measure>`]));
  check('붙임줄 화음 일부', analyzeXmlLine(sc, 0).bars[1].events.map(e => [e.midis, !!e.tie]), [[[60], true], [[67], false]]); }

console.log(fail ? `${fail}개 실패` : '모두 통과');
process.exit(fail ? 1 : 0);
