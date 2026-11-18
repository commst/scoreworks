// 160번 재발 막기: 셈여림 계산(dynLevelAt) 규칙 시험 — node test/dynlevel.mjs (PDF 필요 없음)
import { dynLevelAt as L } from '../src/audio-engine.js';
let bad = 0; const ok = (name, c) => { if (!c) { bad++; console.log('FAIL', name); } else console.log('ok  ', name); };
const near = (a, b) => Math.abs(a - b) < 1e-6;
const mp = { kind: 'mark', p0: 4, level: 0.6 };
const dim = { kind: 'ramp', p0: 15.5, p1: 16, dir: -1, hp: true, target: null };   // 달빛항해 대금 16마디 끝 >
ok('꺾쇠 전 크기', near(L([mp, dim], 15.2), 0.6));
ok('꺾쇠 안에서 작아짐', L([mp, dim], 15.9) < 0.3);
ok('끝 글자 없는 > 뒤에는 원래 크기로', near(L([mp, dim], 16.5), 0.6) && near(L([mp, dim], 40), 0.6));
ok('끝 글자 없는 < 뒤에도 원래 크기로', near(L([mp, { ...dim, dir: 1 }], 20), 0.6));
ok('셈여림 글자가 없는 줄은 mf(0.75)로 돌아옴', near(L([dim], 30), 0.75));
const p = { kind: 'mark', p0: 16, level: 0.45 };
ok('> 끝에 p가 있으면 p를 따름', near(L([mp, { ...dim, target: 0.45 }, p], 20), 0.45));
ok('끝 셈여림(target)이 정해진 꺾쇠는 그 크기 유지', near(L([mp, { ...dim, target: 0.45 }], 20), 0.45));
const cr = { kind: 'ramp', p0: 10, p1: 11, dir: 1, hp: true, target: null }, de = { kind: 'ramp', p0: 11, p1: 12, dir: -1, hp: true, target: null };
ok('< 바로 뒤 > (부풀림): > 시작이 < 끝 크기에서 이어짐', near(L([mp, cr, de], 11.0001), 0.85) || L([mp, cr, de], 11.0001) > 0.8);
ok('부풀림이 끝나면 원래 크기', near(L([mp, cr, de], 13), 0.6));
ok('다른 글자가 나오면 그 크기', near(L([mp, dim, { kind: 'mark', p0: 30, level: 0.9 }], 31), 0.9));
// 207번: mf 흐름 속 한 마디만 p < (미락흘 60·68마디) → 그 마디 안에서 p에서 커져 다음 마디부터 다시 mf
const mf = { kind: 'mark', p0: 0, level: 0.75 }, pp = { kind: 'mark', p0: 59, level: 0.45 }, up = { kind: 'ramp', p0: 59, p1: 59.94, dir: 1, hp: true, target: null };
ok('p < 마디 시작은 p', near(L([mf, pp, up], 59.0001), 0.45) || Math.abs(L([mf, pp, up], 59.0001) - 0.45) < 0.01);
ok('p < 마디 안에서 커짐', L([mf, pp, up], 59.5) > 0.55 && L([mf, pp, up], 59.5) < 0.75);
ok('p < 뒤에는 앞 크기(mf)로', near(L([mf, pp, up], 60.5), 0.75) && near(L([mf, pp, up], 80), 0.75));
ok('p만 있고 < 가 없으면 p 유지', near(L([mf, pp], 70), 0.45));
ok('앞 크기가 더 작으면(ppp → p <) 예전처럼 p로', near(L([{ ...mf, level: 0.22 }, pp, up], 70), 0.45));
ok('글자에서 떨어진 < 는 예전처럼 원래 크기로', near(L([mf, pp, { ...up, p0: 62, p1: 63 }], 70), 0.45));
ok('여러 마디에 걸친 p < 는 예전처럼 끝나면 p로', near(L([mf, pp, { ...up, p1: 63 }], 70), 0.45));
ok('다음 마디 < 로 이어지는 p < 는 예전처럼', near(L([mf, pp, up, { ...up, p0: 60, p1: 60.9 }], 70), 0.45));
ok('p < 바로 뒤 글자가 있으면 그 글자', near(L([mf, pp, up, { kind: 'mark', p0: 60, level: 0.9 }], 61), 0.9));
console.log(bad ? `${bad} FAIL` : 'ALL OK'); process.exit(bad ? 1 : 0);
