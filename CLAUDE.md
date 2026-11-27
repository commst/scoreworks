# ScoreWorks Studio — Claude Code 작업 안내

국악관현악 악보 PDF를 읽어 재생·대조·편집하는 웹 앱(한 파일 html). 사용자는 국악관현악단 늘봄 단원들이 쓰도록 만들며, 단원은 https://commst.github.io/scoreworks/ 링크로만 씀.
**답과 문서는 한국어로.** 사용자 말투에 맞춰 쉬운 말로, 짧게.

## 먼저 읽을 것
- `HANDOFF.md` — 작업 규칙·작업 환경·샘플 목록·검사 순서·남은 과제·**사용자 할 일 목록**(맨 위 ★ 절). 새 세션은 이것부터
- `README.md` — 사용법·구조·빌드·도구·시험 목록
- `CHANGELOG.md` — 고친 내용(번호 순, 지금 245번까지). 새 항목은 `## YYYY-MM-DD (번호) · 제목` + 원인·고친 것·시험

## 작업 규칙 (사용자 요구 — 꼭 지킬 것)
1. **고칠 때마다 함께 갱신**: CHANGELOG.md(날짜+번호), README.md(사용법·구조가 바뀌면), HANDOFF.md(진행 메모), 앱 안 업데이트 이력(`src/index.template.html`의 `<template id="histTpl">` — 날짜 section, 기능은 `<h4>기능 업데이트 <small>n</small>`, 버그는 접힌 묶음 `<details class="hbug"><summary>버그 수정 <small>n건</small>…`, 개수 맞출 것), 앱 사용법 글, 화면이 바뀌면 사용설명서(`tools/manual/manual.html` → PDF, README 1-1-1)
2. **배포 = main에 올리기**(GitHub Pages). 단위 작업이 끝날 때마다 배포하고 다음으로. 답은 짧게 + 실행 링크
3. **롤백**: 배포 전 판을 `rollback/before-<번호>` 브랜치로 남김(태그 아님). 되돌리는 법은 HANDOFF '롤백'
4. **올리기 전**: `git fetch origin main && git rebase origin/main` — 앱이 GitHub API로 `settings/`에 바로 커밋하므로. 공통 조상이 잘려 충돌처럼 보이면 `git rebase --abort` 후 `git fetch --deepen=200 origin main`
5. **문법은 ES2020까지**(`??=`·`||=`·`&&=`, private `#`, 정규식 lookbehind 금지) — 옛 브라우저에서 앱 전체가 멈춤. build.py가 검사함
6. **시작 때 쓰는 전역 let/const는 그 앞에 선언**(113번 — 선언 전 접근 = 앱 멈춤). 화면 코드를 고치면 `node test/pwboot.cjs index.html`
7. **기존 기능을 깨지 말 것**(목표: 무결점). 단, **시험은 꼭 필요한 것만**(고친 곳에 닿는 시험 + pwboot). 전체 회귀는 해석기(score-parser.js)를 고칠 때만 — HANDOFF 4장
8. **샘플 악보 PDF는 공개 저장소에 절대 넣지 않음**(저작권) — 비공개 commst/scoreplay_sample
9. 오래 걸리는 일은 **단계마다 진행 상황을 알림**. 사용량 한도로 끊기면 묻지 말고 이어서
10. 커밋 메시지 끝에 `Co-Authored-By: Claude …` 줄
11. MusicXML 내보내기는 매우 중요(사용자가 피날레·뮤즈스코어에서 이어 편집) — 읽은 PDF와 최대한 같게. 인식과 악보가 다르면 **악보가 기준**

## 빌드
- `python3 build.py` → `index.html`(배포본, 약 16MB) + `version.json`. 고칠 곳은 `src/`(특히 `src/index.template.html`), 맨 위 index.html은 직접 고치지 않음
- `src/studio/*.ts`를 고쳤으면 먼저 `node tools/build-studio.mjs`(esbuild) → `src/studio-bundle.js`
- Node·Playwright·esbuild·acorn은 `NODE_PATH=<npm-tools>/node_modules`로 찾음(이전 작업 공간은 `/opt/npm-tools/node_modules`)

## 작업 공간 (경로 주의)
- 시험 도구 대부분이 **`/home/claude/...` 경로를 그대로 씀**(샘플 `/home/claude/samples`, pdf.js `/home/claude/web/node_modules`, Verovio `/home/claude/work/vrv`, 저장소 `/home/claude/scoreplay`). 새 환경이면 먼저 `bash tools/setup-workspace.sh`(Linux·WSL·클라우드). `/home/claude`를 만들 수 없는 환경(macOS 등)이면 사용자에게 알리고, 시험만 클라우드(claude.ai/code)나 WSL에서 돌리거나 경로를 환경 변수로 바꾸는 작업을 제안할 것
- 화면 시험은 Playwright(`test/pw*.cjs`), pdf.js·Verovio CDN은 시험 안에서 로컬 파일로 바꿔 끼움. 한글 파일 이름은 setInputFiles가 못 올려 `/tmp/pick-<접두어>.pdf`로 복사해 씀

## 지금 진행 중인 것 (자세한 것은 HANDOFF)
- UI 다듬기(제안 문서 https://claude.ai/artifact/WaxbbubNVCc4Arkqo8AyfG): ①경고 접기 238 ②연습·편집 239 ③단추 240 ④보기▾ 241(남은 것 [검토 n]) ⑤편집 도구 역할 ⑥첫 사용 안내 ⑦사용설명서 보강(악보 불러오기 → 경우별 음 고치기 → 내보내기 따라 하기). 242 설정 칸 모양, 243·244 태블릿 세로 악보 칸, 245 율명 겹침
- 사용자 할 일 목록(HANDOFF ★ 절): 되돌리기·모두 되돌리기 단추, 속도 개선(불러오기·스크롤·끌기 랙), '보기' 여러 악보 고르기
- 25현 가야금 줄 번호: 사용자에게 늘봄 조율을 물어 둔 상태
