# ScoreWorks(옛 이름 합주연습기) 인수인계 메모

새 대화에서 이어 작업할 때 먼저 읽는 문서입니다. 무엇을 왜 고쳤는지는 CHANGELOG.md, 사용법·구성·빌드는 README.md에 있습니다. 이 문서는 **작업 규칙, 작업 환경, 샘플 목록, 검사 순서, 남은 과제**만 모았습니다. (마지막 갱신: 2026-11-25, CHANGELOG 230번까지)


## ★ Studio 기능 접목 (11-25~) — 기획·롤백

- 기획서: https://claude.ai/artifact/FPMxjgJ9zvfyQKNb2rjgXB (프로젝트 문서 claude/studio/HANDOFF.md 4장에 요점). 이름은 **ScoreWorks Studio**(211번), 모드 이름은 [연습 | 편집], 동작은 '수정'
- 정할 것 답(사용자 11-25): 1 이 기획으로, 2 [편집]은 모두에게 보이되 GitHub 공유 저장은 토큰 있는 사람만, 3 Studio 웹 주소는 기능을 다 옮기면 내림(배포한 적 없음), 4 마디 나누기·합치기는 5단계까지 써 본 뒤, 5 25현 가야금은 율명 아래 **줄 번호**(기본 조율은 아직 모름), 6 .mxl 열기 더함
- 진행: 211 이름·휴대폰 화면, 212 0단계 끝(src/studio + studio-bundle.js(SWS), Verovio jsDelivr 지연, buildMusicXml({ids:true}) 음 id = 수정 기록 키, 시험 test/pwstudio0.cjs), **213 2단계 끝 — 인식 악보·나란히 보기(보기 전용)**
- **순서 바꿈(11-25)**: 2단계(인식 악보 보기)를 1단계(마디맵 지우기)보다 먼저 — 쪽 그림 없는 악보(MusicXML 악보·예시 장단·마디 위치 못 읽은 PDF)도 볼 화면이 있게. 213번으로 됨
- 213번 구조(자세한 것은 CHANGELOG 213):
  - 보기 단추 [원본 PDF #viewScore][인식 악보 #viewRec][나란히 #viewSide][마디맵 #viewMap]. viewMode는 그대로 'score'|'map', 악보 안에서 무엇을 볼지는 `svSrc`('pdf'|'rec'|'side', hapju-view.src), 쪽 그림이 없으면 `svSrcEff()`='rec'
  - 상태는 `REC`(앞쪽에 선언 — 113번 규칙). recBuild: buildMusicXml({ids, evIds}) → DOMParser → recSlice(from,to,keep) → SWS.engrave → 조각(.rec-chunk, c.ms = g.measure 목록, 마디 k = c.from + 순서). 화면용에서는 multiple-rest를 넣지 않음(1:1 맞춤). 같은 구조면 잘라 본 글이 달라진 조각만 다시
  - 훅: svShow→recShow, svCursor→recCursor, svNotesAt→recNotesAt(marks.ev → REC.evIds → REC.idx(data-id 앞 네 칸)), svClick·recClick→svBarAction, renderPartSel(인식 악보면 켠 줄 모두), buildScoreView→recBuildSerial(30ms 뒤, 하나씩)
  - 엔진 marks에 `ev`(그 음)를 실음, x가 없는 음도 담음(PDF 쪽 svNotesAt은 x로 거름)
  - engrave.ts: 쪽 폭 하한 300(휴대폰 크기 +), Verovio 로그는 오류만
  - 시험 `NODE_PATH=/opt/npm-tools/node_modules node test/pwrec.cjs [접두어] [phone]`(ALL=1). Verovio는 /home/claude/work/vrv(`npm i verovio@6.4.1`)
- **217 1단계 끝 — 마디맵 지움**: viewMode 늘 'score', svSyncView, 마디 미리보기는 svTipHover(마우스 0.6초)·svLongDown(길게 0.45초) → barTipContent([타임라인|상세]·[✎ 수정]), warnGo → svGoBar/recGoBar, 첫 화면(body.welcome)에서는 인식 악보 안 그림. 시험 test/pwnomap.cjs
- **218 사용설명서 갱신 끝**(그림 tools/manual/mancap11.cjs, 훅 window.__svBarRect)
- **219 3단계 1차 끝 — 편집 모드·검사기**(자세한 것은 CHANGELOG 219): [연습|✎ 편집](#svPractice/#svEdit, 악보 칸 도구줄), 상태 `ED`(REC 앞에 선언), edNoteAt → edSelect(id) → edCtx(줄·마디·raw/cur 음·수정 기록) → edRender(#edInsp) → edPatch = setEdit. 판정 edJudge(그 마디 recSlice → xmlReadBack(n.id) → xmlNoteXY ↔ geo.heads). 보이게 edReveal/edRevealPdf(REC.sync로 함께 넘기기 잠깐 멈춤). 이 마디 듣기 ED.playOne(svShow). 훅 window.__ed, window.__barClick(n). 시험 test/pwed.cjs(FROM=100)
- **220 — 불러오면 원본 PDF + 3단계 2차 끝**(자세한 것은 CHANGELOG 220): clearScoreUi에서 svSrc='pdf'. xmlCheck `edEvAt` → p.intent(주황 점선 ✎ `.sv-ovn.intent`, 짝 없는 머리 mk.iMiss 주황 네모, 확인할 곳·악보대로 고치기에서 빠짐), `svOverData.intents` → #svDiff [✎ 악보와 다르게 n]·openDiffSheet(diffIdx, fixRender에서 셈 — overStale은 편집 중·목록 있을 때도 fixSoon). ✓ 맞음 = 수정 기록 마디 칸 `ok: 1`(setBarOk·barOk, applyEdits → rb.okd, countEdits(e, all)·countOks), 겹쳐 보기 `.sv-okd`. PDF 머리 고르기 edPdfNoteAt(EV_SRC → 화면용 id, edEnsureIds). 끌어서 높이 edDragDown/edDragTo/edDragEnd(마우스·펜, midiToDia). 편집 자판은 .edit-back 창이 있으면 안 받음. 시험 test/pwed2.cjs
- **221 — 나란히: 인식 악보 단 = PDF 단**(사용자 제보 11-25): REC.enc이면 recSlice가 기준 geo의 쪽·오선이 바뀌는 마디에 `<print new-system>`, Verovio breaks 'encoded', 그릴 폭 recEncFactor(PDF 단 마디 수 ÷ 3, 휴대폰 ÷ 2) → 넘치면 recOverflow만큼 한 번 더(최대 6배), c.encF. 시험 test/pwside.cjs(훅 __recSys). 남은 것: 단이 아주 빽빽하면(16분음표 많은 7~8마디) 글자가 작음 — 사용자가 [크기 +]로 키우거나, 필요하면 나란히 기본 크기를 올릴 것
- **222 — 4단계 구조 편집·음표판·전체화면 편집**(자세한 것은 CHANGELOG 222): PAL·palRender·palPlace·palClick·palHover, recPosAt(오선 줄·음표 data-id로 박·높이), opInsert/opDelete/opVoice → rewriteBar → 수정 기록 마디 칸 `bar {o: barSig, ev}` → applyEdits가 applyRewrite(지문 같을 때만), baseBar(그 위 음 수정 기준). 겹쳐 보기 rb.rew 마디의 짝 없는 머리 = 주황. 전체화면: body.sv-lock이면 검사기·음표판 z 1600, palPlace가 .sv-fdock 위로. recHit·recPosAt은 세로로 가장 가까운 마디. 시험 test/pwpal.cjs(PC·휴대폰)
- **223 — 마디 정보 줄**(사용자가 고른 1+4안): svTipPref('strip' 처음·'hover'·'off', hapju-view.tip), svInfoShow(#svInfo, [상세 ▸] → showBarTip). 시험 pwnomap
- **224 — 인식 악보 긴 악기 이름 여러 줄**(사용자 11-25: 이름이 길면 두세 줄로 접더라도 마디 폭을 넓게): buildMusicXml 화면용(SCREEN)만 `wrapPartName`(폭 12, '/'·','·'·'·빈칸 뒤, `&#10;` → Verovio 여러 줄). 시험 test/pwname.cjs
- **225 — 5단계 율명·구음·정간보**(자세한 것은 CHANGELOG 225): 아래 글자 svLab('none'·'yul'·'gu')·svBase → recXmlOpts()(recBuild·edEnsureIds 같은 글) → buildMusicXml 화면용 lyricObjs(가사 칸), 파일은 적은 구음(rec.gu → e.gu)만 가사. 정간보 svSrc 'jg'(svSrcEff, svSyncView, buildScoreView → jgBuildSoon, svShow → jgShow, svCursor·svNotesAt·svGoBar 분기), SWS.parseMusicXml + renderJeonggan. 시험 test/pwyul.cjs
- **226 — 길이 단추를 음표 모양으로**(사용자 11-25): 음표판·검사기 길이(온~32분·점·셋잇단)와 넣기·지우기 모드 단추에 직접 그린 SVG 아이콘(noteIcon 등, currentColor). 단추 title·aria-label은 그대로라 시험 선택자 그대로
- **227 — [음표만·율명·구음] 단추**(사용자: 율명 보기 옵션이 빠진 듯 — 휴대폰은 보기 설정에 접혀 있었음): #svLabLbl 늘 보임, 값은 숨은 select #svLab
- **228 — 음표 끌어 놓기**(사용자: 드래그앤드롭): 음표판 길이 단추 끌어 넣기(마우스·펜·손가락), 인식 악보 음 옆으로 끌어 옮기기(마우스·펜), 시험 test/pwdnd.cjs. 손가락으로 악보 위 음 끌기는 6단계
- **229 — 편집 속도**(사용자: 느린 속도 해결 방안): 잰 값(프론티어 19줄 170마디, PC) — PDF 읽기 2.5초, 모든 줄 켜기 4초, 인식 악보 첫 조각 1.5초·전체 9초, 겹쳐 보기 대조 0.5초, 재생 시작 4초, **음 하나 고치기 10.3초 → 0.7초**. 원인·고친 것: ① 검사기가 열려 칸이 좁아진 폭 차이로 다음 고치기 때 인식 악보 전체를 다시 그림 → 편집 중이거나 48px 안 폭 차이는 그대로(REC.width) ② 화면용 MusicXML을 통째로 다시 읽음(0.25초) → recSetXml(달라진 마디만 읽어 바꿔 끼움, REC.split·REC.changed) ③ 모든 조각 글자를 견줌 → 바뀐 마디 조각(+다음 조각)만 ④ recAfterDraw(only) 다시 그린 조각만 ⑤ 경고 목록을 그릴 때마다 '악보대로 고칠 곳' 곡 전체 대조(0.7초) → 처음·켠 줄이 바뀔 때만(fixSig) ⑥ '악보와 다르게' 수는 diffQuick(고친 음만 edJudge). 재는 도구 window.__perfDbg(recBuild 단계별 시간), __recState().nRender, __recSrcs. 시험 pwfixlist·pwovfix2는 220번부터 깨져 있었음(✎로 잘못 읽은 음을 흉내 → 주황) → lineRaw를 직접 바꾸고 __ovDbgApi().fixRecount()로 고침(pwovfix2의 오래된 한 줄 실패도 함께 없어짐)
- **230 — 나란히 마디 맞춤**(사용자: 좌우 마디 수를 같게): 한 단 마디 수는 221번부터 같았고, 왼쪽은 총보 19줄·오른쪽은 켠 2줄이라 같은 높이에 1단 대 11단이 보였던 것 → 나란히 + 총보 전체 + 일부 줄이면 왼쪽 PDF를 켠 줄 오선 띠로(svCropKeys, svLayoutPart 여러 줄, svHit은 띠의 줄 geo). 남은 차이(6단 대 10단)는 인식 악보가 작게 그려지는 탓 — [크기 +]로 맞춤. 편집 중 나란히는 REC.enc 끔(PDF 단 나눔이면 오선 칸 1.2px라 누를 수 없음 — pwpal·pwdnd가 이것으로 실패했었음)
- **속도 다음 후보**(사용자에게 제안): 인식 악보를 보이는 곳 둘레만 그리기(지금은 9초 동안 조각마다 0.4초씩 끊김), Verovio·MusicXML 만들기를 Web Worker로(화면 안 멈춤), 재생 소리 만들기 줄마다 캐시(악기 하나 바꿀 때 그 줄만), 휴대폰은 CPU가 4배쯤 느려 위가 더 중요
- **229~231 속도**: 229 편집 한 음 10초 → 0.7초(그리던 폭 유지·바뀐 조각만), 230 나란히 왼쪽 PDF 켠 줄 띠, 231 Verovio Web Worker(engrave.ts의 WORKER_SRC, file://에서는 화면 그리기로 물러남 — 시험은 대부분 file://이라 일꾼 길은 http 사본으로 따로 시험: test/의 시험을 sed로 주소만 http://localhost:8766/index.html + api.github.com·raw.githubusercontent 막기, `python3 -m http.server 8766 --directory <저장소>`), 그림 캐시, 나란히 조각 = PDF 단 경계·미리 그리기, 소리 미리 만들기(preSoon·runPre·PRE, 시험에서 끄기 `window.__noPre`). 남은 후보: 인식 악보 전체 8.7초는 일꾼 시간이 거의 전부 — 줄이려면 보이는 곳 둘레만 그리기(조각 경계가 앞 조각 결과에 달려 있어 큰 변경), 재생 소리 만들기 3초(앞부분만 먼저는 크기 맞추기 때문에 보류)
- **232**: 보기 단추 이름(원본 악보·인식 악보·나란히 보기·정간보 보기 — id·값은 그대로), 단추 줄 #vsBar sticky(--vsh), 나란히 함께 넘기기 되울림 막기(REC.lastSync). 사용설명서 그림은 예전 단추 이름 그대로(다시 찍을 때 바꿀 것)
- **233**: 나란히 조각 첫 마디에도 `<print new-system>`(없으면 Verovio가 encoded를 버림), 함께 넘기기는 마디 안 높이 비율로, 악보 칸 높이 svFit(--svwh). 아이패드 재현 /tmp/ipad.cjs 방식(devices['iPad Pro 11 landscape'], 소나기 61c75dd1 모두 켜기 → 나란히 → 끝까지 내림)
- **234**: 나란히(breaks encoded)는 Verovio `minLastJustification: 0` — 조각마다 단 하나라 모든 단이 '마지막 단'으로 늘려지지 않던 것
- **235**: 왼쪽 패널 서랍(LAY·layApply·layOpen, hapju-layout, body.lay-ov·side-off·top-off — 처음 쓰는 기기는 닫힘). 넓은 화면에서 왼쪽 탭을 누르는 옛 시험은 addInitScript로 hapju-layout {mode:'push', side:true}를 넣을 것(pwsheetx·pwtabland처럼)
- **236(긴급)**: 시작 검사 6초는 DOMContentLoaded부터(16MB 받는 중 잘못된 경고), preSoon에서 SV_PHONE 대신 matchMedia
- **237**: 접기·펴기 = 서랍 손잡이(.drawer-h #sideTgl 왼쪽 가장자리 가운데 --sidew, #topTgl 위 가운데) — 밀기 동작 없음(Safari 뒤로 가기)
- **UI 다듬기(11-26~, 제안 문서 https://claude.ai/artifact/WaxbbubNVCc4Arkqo8AyfG)**: 사용자 결정 — 율명·구음 단추는 바깥 유지, 단위 작업마다 배포, 가벼운 것부터 ①경고 목록 접기(238 끝) ②연습·편집을 첫 줄로(239 끝 — svModesHome, 휴대폰·전체화면은 예전 자리) ③단추 모양(240 끝 — 스위치·알약·select, 휴대폰은 작은 스위치만·select 기본) ④[보기▾](241 — #svPop·svPopSet, 전체화면은 바깥에 둠)·[검토 n] (242 — 사용자 요청으로 설정 칸 모양 맞추기 먼저: `.pane2` CSS, 제목 왼쪽·스위치 목록) ⑤편집 도구 역할 ⑥첫 사용 안내 ⑦사용설명서 보강(악보 불러오기→경우별 음 고치기→내보내기 따라하기). 나머지 '정할 것'은 작업하며 정함
- **243**: svFit 아래 남는 높이 = #shell 끝 − 칸 끝 + body padding-bottom(scrollHeight는 닫힌 아래 서랍까지 세어 아이패드 세로에서 칸이 280px로 줄었음). 재현 /tmp/ipadp.cjs(devices['iPad Pro 11'], 어두운 모드). 244: body.svfit .app2 min-height 0(100vh + body 아래 여백이 끝에 빈 곳을 만듦)
- **245**: 율명·구음 겹침 — 화면용 가사 lyrPad(두 글자 이상 한글 양옆 U+2009 ×(n−1)), 그린 뒤 recLyricFit(넘치는 글자만 가로 줄임). 겹침 세기 /tmp/sylp3.cjs
- **사용자 할 일 목록(11-27 — 지금은 하지 말고 기록만, 사용자가 물으면 알려 줄 것)**:
  1. ~~Claude Code로 작업을 옮기기 위한 인수인계 문서 작성~~ — 11-27 끝남: 저장소 맨 위 `CLAUDE.md`(Claude Code가 세션마다 자동으로 읽음 — 규칙·빌드·경로·진행 요약), `tools/setup-workspace.sh`(새 작업 공간 준비), 아래 'Claude Code로 이어 하기'
  2. 변경 내용 되돌리기(history back): 음표판에 [되돌리기] — 마디 음표 편집을 할 때마다 이전 변경을 하나씩 되돌림, [모두 되돌리기] — 마디 변경사항 모두 취소
  3. 속도 개선: 악보 불러오기가 상당히 느림, 편집 중 화면 스크롤·음표 끌기에서 랙이 많이 걸림 → 최적화·개선 방안
  4. ~~악보 보기의 '보기' 여러 개 고르기~~ — 11-27 끝남(247번: #svPartBtn·#svPartPop, svParts·svSelKeys·svSelHas, 시험 pwparts). 원래 메모: '보기'(#svPartSel, 화면에 표시할 악보 고르기)를 하나만이 아니라 여러 개 고를 수 있게 — 지금은 '총보 전체' 또는 한 줄('OO만'). 여러 줄 띠 보기는 나란히(230번 svCropKeys)에 이미 있음
- **25현 가야금 줄 번호는 보류**: 사용자에게 늘봄 기본 조율(1~25현 음) 또는 곡마다 조현표인지 물어봄(11-25) — 답을 받으면 율명 아래 줄 번호(lyricObjs에 줄 하나 더)
- **다음 할 일**: 6단계 태블릿·휴대폰(손가락 끌어 넣기·옮기기 — 길게 눌러 끌기, 음표판 손가락 끌어 넣기, 줄 사이 11px 기준 크기). 5단계에서 남은 것: 정간보에 장구 말고 다른 타악은 아직 비어 있음, 산조가야금 줄 구음(12현)은 25현 쓰는 늘봄에는 안 넣음, 한자 율명 고르기
- 남은 시험 문제: pwovfix2 'Ctrl+Z 뒤 단추 1개' 한 줄 실패(218번 판도 같음 — 원인 미확인). 예전 시험(pwedit·pwshare)은 219번에서 마디맵 없는 화면으로 옮김. 다른 시험에도 `#bars .b`(마디 칸)를 쓰는 것이 남아 있으면 같은 방식(__openEditor·__barClick)으로 옮길 것
- 214(긴급): MuseScore 3 PDF('MScore' 글꼴이 SMuFL 번호)를 못 읽던 것 고침 — 글꼴마다 두 번호표 맞는 수로 고름. 샘플 신아리랑 73929564 — 비공개 샘플 저장소에는 사용자가 직접 올리기로 함(11-25). 216: 음표를 거의 못 읽은 악보 경고(glyphStats·readHealth, test/pwreadwarn.cjs), 옛 저장 설정 바로잡기(줄 설정 pitched, test/pwcfgfix.cjs)
- 213에서 남은 것: 조각 경계를 넘는 붙임줄·이음줄·꺾쇠는 끊겨 보임, 인식 악보에서 [MusicXML 겹쳐 보기]·[⚠ 경고]·[✎ 악보대로]는 원본 PDF 쪽 기능(인식 악보만 볼 때는 효과 없음)
- 단계: 0 준비 → 1 마디맵 지우기 → 2 대조(인식 악보 + 나란히) → 3 수정·바로 듣기 → 4 구조 편집 → 5 율명·구음·정간보 → 6 태블릿·휴대폰 → 7 마디 나누기·합치기
- **롤백(사용자 요구)**: 단계마다 배포 전 판을 브랜치로 남김 — `rollback/sw-before-studio`(210번, 접목 전), 이후 `rollback/before-<번호>`. 이 작업 공간은 **태그 올리기가 403으로 막힘** → 브랜치 사용
  - 되돌리기(앱이 올린 settings/ 커밋을 지우지 않게 reset 대신 파일만 되돌림): `git fetch origin main rollback/<이름> && git checkout origin/main -B main && git checkout origin/rollback/<이름> -- src index.html version.json build.py && python3 build.py && git commit -am "롤백: <이름> 판으로" && git push origin main`
  - 남긴 브랜치: `rollback/sw-before-studio`(210), `rollback/before-212`(211), `rollback/before-213`(212), `rollback/before-218`(217), `rollback/before-219`(218), `rollback/before-220`(219), `rollback/before-222`(220·221), `rollback/before-225`(222~224), `rollback/before-229`(228), `rollback/before-231`(229·230)
  - 저장 형식은 더하기만(hapju-edits 등에 새 칸을 더하되 옛 판이 읽는 칸은 그대로) → 옛 판으로 돌아가도 단원 설정·수정 기록이 깨지지 않음. 새 기록은 옛 판에서는 무시됨

## Claude Code로 이어 하기 (11-27)

- 사용자는 VS Code의 Claude Code 확장으로 이어 가려 함. 저장소를 열면 `CLAUDE.md`를 자동으로 읽고, 거기서 이 문서로 옴
- 새 환경 준비(246번부터 경로는 환경 변수): 맥은 `SW_ROOT=$HOME/sw bash tools/setup-workspace.sh` 한 번, 시험 전 `export SW_ROOT=$HOME/sw NPM_TOOLS=$HOME/sw/npm-tools NODE_PATH=$HOME/sw/npm-tools/node_modules`. 리눅스·클라우드는 기본값(/home/claude, /opt/npm-tools) 그대로. 뮤즈스코어(test/msall.sh는 `$SW_ROOT/mscore`)·MusicXML XSD(`$SW_ROOT/work/xsd`)는 2장대로 따로
- 장소 옮기기: VS Code 확장과 터미널은 대화 기록을 함께 씀(터미널 `claude --resume`, 터미널용 CLI는 따로 설치). VS Code → 웹·휴대폰은 패널에서 `/remote-control`(PC에서 계속 돎). 웹 클라우드 세션 → VS Code는 세션 기록의 Web 탭, 터미널은 `claude --teleport`(사본이라 웹으로 다시 반영 안 됨). 코드는 언제나 main에 올리고 받아서 맞춤
- claude.ai 프로젝트 '악보 리더기'의 문서(claude/CHANGELOG.md·README.md·HANDOFF.md)는 이 저장소 파일의 사본 — Claude Code에서는 저장소 파일만 고치면 됨(프로젝트 동기화는 claude.ai에서 작업할 때만)

## 210번(11-24) 타악 마디별 소리 — 끝남

- percWordSound(악보 글자) + c.segs(줄 카드 표) + 수정 기록 ps → percSndMap → refreshPercSnd(e.snd, EV_SRC) → renderPlan·MIDI·MusicXML. 시험 `node test/percsnd.mjs`, `node test/pwpercsnd.cjs index.html [mobile]`(미락흘 Cymbals 파트보 004d79b5)
- 남은 것: 칸 자리(오선 높이)별로 악기를 나누는 악보는 아직 윗·아랫성부·X 머리로만 — 사용자 악보가 이런 꼴이면 '칸 자리별 소리'를 더할 것

## 209번(11-24) 사용자 제보 6가지 — 끝남, 답 기다리는 것 2가지

- 글리산도: 해석기 glissLines(곧은 선은 'gliss.' 글자 조각이나 다음 음에서 끝날 때만) → e.gliss {steps, endW}, renderPlan GLISS_PLUCK 악기만 음계(scaleOf)로 훑음. 시험 `node test/glissplan.mjs`. 남은 것: MusicXML <glissando>, 관·현악기 미끄러짐 소리
- 두 오선 첫 악기 아랫줄 함께 켜기(총보 칸), 마디 이동 JUMP_PRE, 빨간 선 고르게(svCurNotes 끄면), 메트로놈 metroDiv(`node test/metrodiv.mjs`)
- **사용자 답 기다림**: 프론티어 가야금 78마디(세 파트보 모두 악보와 같게 읽음 — 아랫줄이 꺼져 있던 탓인지 다시 들어 보기로), 미락흘 가야금 67마디 '마디 점프'(무엇이 안 되는지 — 69마디부터 여러 마디 쉼표)

## 208번(11-23) 아쟁 pizz.·arco — 끝남

- 뜯기 소리 = 켠 아쟁 녹음 음색 + 뜯는 줄 합성(`tools/make_ajaeng_pizz.py` → banks/ajaeng_pizz, 사용자가 비교 4가지 중 1번을 고름). 실제 뜯은 녹음을 구하면 같은 이름 뱅크로 바꾸면 됨
- 앱 `markPizz`(marks.words의 pizz.~arco + 수정 기록 pz: 'pf'·'af'·'p1'·'a1') → e.pz → renderPlan이 아쟁 줄만 ajaeng_pizz. 해석기는 그대로
- 아쟁 주법을 건드리면 `node test/pizzmark.mjs` + `node test/pwpizz.cjs index.html [mobile]`(뒤 MusicXML은 /tmp/pwpizz-*.musicxml → xsdcheck.py)

## 남은 일 (11-18, 205번까지 — 사용자: 하지 말고 기록만)

- **악보대로 고치기(203~205번) 실제 곡 확인**: 다섯 곡(소나기·월광·프론티어·달빛항해·미락흘) 전 줄에서 고칠 수 있는 곳 0(보라·빨강 모두). 시험·캡처는 맞는 음을 ✎로 바꾼 시연(test/pwovfix2.cjs·pwfixlist.cjs). 나머지 총보 40여 곡 일괄 검사는 사용자가 '하지 마'(11-18) — 다시 요청할 때만. 하려면 곡마다 `node test/pwovink.cjs <접두어> '' 2`(배율별 보라·빨강 단추 수) 뒤 나온 곳을 그림 대조
- 빨강 '높이만 다름' 조건(204번): 같은 가로 자리 0.6칸 안 짝 하나, 그 마디 문제가 높이뿐(빠진 머리·남는 음·박 위치 다름 없음), 맞은 음 2개 이상·고칠 음의 2배 이상, 1.5칸 안. 조건을 넓히면 월광 1~15마디(박 없는 마디)·가야금 18~27마디에서 엉뚱한 고치기(파2 → 솔♯3 등)가 다시 나옴
- **월광 1~15마디 겹쳐 보기 자리 계산 의심**: 12마디(k=1 등)에서 모든 줄 음이 PDF 머리보다 0.5칸 위로 그려짐(해석기 음높이는 머리와 맞음) → xmlNoteXY(박 없는 마디·조표/음자리표 자리)를 볼 것
- [악보대로 고치기]는 조표만 따르고 임시표는 보지 않음(diaToMidi) — ♯·♭은 ✎로
- fixIndex(대조 다시 셈)는 프론티어 전 줄 약 0.56초 → 경고 목록 그릴 때·고칠 곳이 있던 상태에서 바꿀 때만. 휴대폰에서 느리면 더 줄일 것
- 시험용 훅: 주소 #…dbg일 때 `window.__ovDbgApi()`(svOverBuild·state·setEdit·noteList·diaToMidi·cfgKey), `window.__ovInk(쪽, x, y, sp)`
- 미룬 것(전부터): 겹쳐 보기 빔 묶음·임시표 견주기, 해석기 — 월광 소금 96·98 꾸밈음 이음줄을 붙임줄로 읽음(악센트·꾸밈음이 내보내기에서 빠짐), 소나기 장고 쌍둥이 머리 성부·기둥 어긋남, 월광 가야금 18·20·26마디 숨은 쉼표·박 자리(wip/166-hidden-rest.patch)
- 배포 주의: `git fetch --depth=5` 뒤 rebase하면 앱이 올린 설정 커밋이 많을 때 공통 조상이 잘려 충돌처럼 보임 → `git rebase --abort` 후 `git fetch --deepen=200 origin main`으로 다시

## 다음 할 일 (11-17 사용자)

- **MusicXML 불러오기 남은 것 — 191번에서 끝남**(이음줄 번호·겹친 이음줄, 붙임줄 time-only 재생). 남은 것: time-only 붙임줄을 내보내기에 적기. MusicXML 불러오기를 고치면 `node test/musicxml-import.mjs` + 예전 판과 `PREV=<옛 musicxml.js> node test/_xmlcmp.mjs xmlout/*.musicxml` + 되읽기 `node test/pwxmlrt.cjs <파일>`

- **MusicXML 겹쳐 보기 확장 — 193번에서 끝남**(1단계 음표 종류·점·기둥·아티큘레이션, 2단계 셈여림·꺾쇠·붙임줄·이음줄). 시험 test/pwovdiff.cjs. 주황 마디에서 찾은 해석기·내보내기 문제(예: 월광 소금 96 꾸밈음 이음줄을 붙임줄로 읽어 악센트가 빠짐)는 CHANGELOG 193

## 172번(11-17) 붙임줄 검사 도구

- `PREV=<예전 해석기> NEW=src/score-parser.js node test/_tiecmp.mjs <악보…>` → 줄마다 LOST(예전에 잇던 음을 이제 침)·ADDED(새로 이음)·OTHER(울림 길이만) 마디
- `PREV=<예전> node test/_tiecrop.mjs <접두어> <줄:마디,…> <출력.png>` → 앞 마디와 함께 잘라 쌓고 예전·새 사건을 글로
- `node test/_tl3.mjs <접두어> <줄> <마디>` → 그 마디 곡선의 짝짓기 기록(__curveLog)
- `node test/_tiemiss.mjs <악보…>` → 놓친 붙임줄 후보(176번). `node test/_drw.mjs <접두어> <쪽> <x0> <x1> <y0> <y1>` → 그 영역 그리기 명령

## 170번(11-13) 연주회 6곡 음 재생 점검 — 끝남, 남은 것은 CHANGELOG 170 '남은 것'

- 도구: `NODE_PATH=/opt/npm-tools/node_modules node test/pwspill.cjs <접두어> out.json` — 앱에서 모든 줄을 켠 뒤 마디 길이를 넘는 음(잘림) 목록. 서명(dumpbars)으로 줄 간 마디 길이 불일치를 뽑는 방식은 /tmp/chk/*.py(이 작업 공간에만)
- 고친 것: 앱 마디 길이 투표에 되풀이 마디 포함(달빛항해 10~14·34마디 5/4), 해석기 온음표 2도 화음 묶기(머리 폭 안). 회귀 289마디 전부 온음표 화음 유형으로 확인
- 남은 잘림(1/8~1/2박, 해석기 과제): 달빛항해 대금·해금 130~136, 가야금 107~114, 소나기 장고 91~101·186~192, 신디 172·221~223, 프론티어34-2 대금 42·74·134·피리 132, 멋으로 가야금 윗줄 89~143(2분음표+8분음표가 한 성부)
- 미락흘은 잘리는 마디 0

## 할 일 (11-12 23:12 사용자 지정)

**원칙(사용자): 수정 때문에 기존에 잘 되던 것이 오류를 일으키면 안 됨** — 해석기를 고치면 바뀌는 마디를 표본이 아니라 전부 그림 대조(오늘 159번이 표본 대조만 하다 월광을 망가뜨림)

진행 상황: ③ 끝(168번). ① 169번에서 월광에만 적용해 배포(ALIGN_SHORT — 다른 곡에 넓히려면 곡마다 대조 후 지문 추가). 예전 기록: ① 코드는 wip-166 브랜치 stash에 있었음 — 전체 총보 회귀(test/alignv.mjs)에서 41곡 1,047마디가 바뀜(숨은 쉼표 972, 넘친 마디 71, 자유 박 4), 유형 341가지(/tmp/pat.json), 그림 대조 전. ② **172번에서 붙임줄 짝짓기 부분만 넣음(더하기만 + 꾸밈음 이음줄 제외), 남은 것은 CHANGELOG 172**. 작업본은 wip/169-tie-addonly.patch(169번 전 해석기 기준 — 예전 붙임줄은 그대로·더하기만, 키 큰 곡선 제외, 타악 sus). 다시 하려면 test/_tiecmp.mjs(LOST 0 확인)와 곡마다 대조 후 ALIGN_SHORT처럼 곡별로 켜는 방식 권장 — 월광·방황·바르도에서 잃은 붙임줄 0, 방황 피리 64→65마디 화음 붙임줄은 192번에서 고침

우선 처리(이 순서): ① 숨은 쉼표 마디 세로 맞춤(월광 가야금 18·20·26마디 — wip/166-hidden-rest.patch) ② ✎ 음 고치기에 '붙임줄 잇기/끊기'(168번에서 끝남) ③ 해석기 붙임줄 짝짓기 다시(기존 붙임줄은 없애지 않고 더하기만, 꾸밈 기호 낀 곡선·오선 넘는 곡선 제외)

기록만(나중에): ④ 버그 찾기 마무리 — 전체 화면 시험 절반만 돌림(pwspeed가 도중에 멈춤, 원인 미확인), MusicXML 검사(pwxml·xsdcheck·xmlcheck·integrity·msall) 안 함 ⑤ 방황 245마디 따라가기 — 재현 안 됨, 다시 생기면 기기·보기·켠 악기 받기 ⑥ 아이폰 악보 사라짐(134번) 실기기 확인 대기
확인 끝남: 신고 첨부가 gmail에서 실제 파일로 옴(162번, 사용자 11-12 23:12)

## 할 일 순서 (11-12 16:44 사용자 지정 — 이 순서대로)

**가. 160번 — 특정 악기 소리가 갑자기 작아짐 — 고쳐 긴급 배포함(11-12). 원인: 끝 셈여림 없는 꺾쇠 뒤로 줄어든 크기가 곡 끝까지 남음(145번에서 두드러짐). 남은 것: dynstuck 전체 결과 보고**: 달빛항해 대금만 켜고 재생하면 처음엔 크다가 17마디부터 갑자기 작아짐, 해금은 15마디부터. 다른 곡·타악기에도 있을 수 있음. **원인과 발생 시점(처음부터인지, 어느 업데이트부터인지)을 밝히고 재발 막는 시험까지**
**나. 159번 붙임줄 — 167번에서 재생·MusicXML은 다시 넣음(165 상태), 해석기 짝짓기는 빠져 있음(월광 틀림). 다시 할 때는 사용자와 먼저 상의. 숨은 쉼표 마디(월광 가야금 18마디 등) 고침은 /tmp/wip166-parser.patch(회귀 그림 대조 필요). 예전 기록: 해석기 쪽은 165번에서 되돌림(월광 가야금 26·173, 거문고 167마디가 틀려짐). 재생 쪽(lastOf)만 살아 있음. 다시 넣으려면 /tmp/sp-159.js(= 커밋 a736e92의 src/score-parser.js)에서 출발해 `PREV=<옛 해석기> node test/_bdall.mjs <총보>`의 NOTES 마디를 모든 총보에서 그림 대조. 아래는 기록**: 작업 중 변경은 **wip-159 브랜치**(a50235b)에 있음 — 해석기 붙임줄 짝짓기(곡선 테두리 밖 머리 fit/pickAt, 성부 무관 짝짓기를 타악 줄에도, 사이 머리 검사 hd×1.4), 재생 renderPlan lastOf(줄|음높이로 앞 음 찾기, 화음 일부만 이어지면 떼어 늘림), 타악 붙임줄 sus/pcs와 MusicXML 타악 조각 붙임줄. 전체 회귀가 도중에 끊김. 끊긴 결과에서 의심 마디: 바르도 소아쟁(01391308) 1마디(화음 붙임줄이 아랫음에만 붙고 윗음 65가 다시 침), 4마디(61 붙임줄 사라짐), 미락흘 Cymbals(004d79b5) 97마디가 빔(EMPTIED) → 그림(test/crop.mjs)과 대조해 고친 뒤 `bash test/cmp/reg2.sh /home/claude/prev test/regrn.mjs`. 마디 사건 비교 test/_bd2.mjs <접두어> <줄> <마디…>
**다. 음색 탭 [들어보기] — 161번에서 끝남**: 멈춤을 누를 때까지 계속 재생, 재생 중 설정을 바꾸면 바로 들리게. 음색 설정도 원격 저장소(공유 설정)에 저장·불러오기
**라. 문제점 신고 첨부 — 162번에서 고침(숨은 폼 전송). 사용자가 실제 gmail로 받아지는지 확인 대기**: 전송·오류는 없으나 gmail에서 첨부가 이름·용량 글자로만 보이고 내려받을 수 없음(FormSubmit ajax 주소는 파일을 붙이지 않음) → 숨은 form + iframe 등 실제 첨부 방식으로
**마. 아래 159번의 2·3번 — 164번에서 3번(묶음으로 나뉜 쪽의 노란 칸) 고침. 2번 245마디는 재현 안 됨 → 사용자에게 기기·보기·켠 악기 물어봄** (방황 245·253마디 따라가기, 아랫단 따라가기)

## 159번 (11-12 사용자 제보)

1. **붙임줄 뒤 음을 다시 침**: 붙임줄(같은 음을 잇는 곡선)로 이어진 뒤 음은 소리를 새로 내지 않고 앞 음의 울림을 이어야 하는데 다시 연주함. 예시는 방황이지만 사용자 말로는 다른 곡도 같음 → 방황만 고치지 말고 일반 규칙으로
   - 사용자 그림 ①: 16분음표 넷(빔 둘) 묶음의 마지막 음에서 다음 2분음표(기둥 아래)로 가는 붙임줄 — 빔 묶음 끝 음 → 기둥 방향이 반대인 긴 음
   - 사용자 그림 ②(총보, 노란 칸 마디): 쉼표 뒤 8분음표 ⌒ 점4분음표를 여러 줄이 함께(단음 줄, 화음 줄 — 화음은 음마다 붙임줄, 악센트 >가 붙임줄 위에 있음). 같은 그림 아래 단의 같은 마디도
   - 볼 곳: 해석기의 붙임줄 짝짓기(104번 ④·114번 ②③·112번), 곡선 인식(98번: 직선 여러 개로 편 곡선), renderPlan의 e.tie 잇기(81번: 같은 줄·같은 음높이). 먼저 `node test/_bar.mjs`류로 그 마디 이벤트에 tie가 붙는지 확인 → 해석기 문제인지 재생 문제인지 가름. 악센트·아티큘레이션 글자가 곡선과 머리 사이에 있어 '사이에 다른 머리 없음' 검사나 높이 판정에 걸리는지도
   - 고친 뒤 regrn 전체 회귀(붙임줄만 바뀐 마디 수), MusicXML tie 짝(integrity.py)
2. **방황 245마디, 253마디부터 '연주 위치 따라가기'가 동작하지 않음**(악보로 보기에서 노란 칸·빨간 선·따라 내려가기)
3. **한 쪽에 단(그룹)이 여러 개일 때 윗단에서만 따라가기가 동작하는 경우**(방황·판놀음에서 발견) — 2번과 같은 원인일 수 있음. 볼 곳: geo(마디의 쪽·오선·x), 15번에서 관악 묶음 + 나머지 묶음을 한 단으로 합친 악보(방황·판놀음), 기준 줄의 geo가 아랫단 마디에 없는지, svHit·재생 선 그리기·따라가기 스크롤. 방황 총보 20983efb, 판놀음 65f37e53·판놀음II
   - 사용자에게 물어볼 것은 없음(곡·마디가 주어짐). 재현은 Playwright로 그 마디부터 재생해 노란 칸(.sv-hl 등) 위치와 #svWrap scrollTop을 봄

## 1. 작업 규칙 (사용자 요청)

- **프로그램 이름은 ScoreWorks**(부제 '국악관현악 악보 분석 및 재생 도구', 11-11에 합주연습기에서 바꿈). 글꼴 Pretendard(본문)·Outfit(이름), 아이콘은 src/index.template.html의 `<symbol id="swMark">`(파비콘은 같은 그림의 data URI). 저장 키(hapju-*)·내보낸 파일 형식 이름(hapju-settings 등)은 예전 것과 맞도록 그대로 둠. **저장소는 11-11에 commst/scoreplay → commst/scoreworks로 이름을 바꿈**(실행 링크 https://commst.github.io/scoreworks/ — 옛 링크 commst.github.io/scoreplay는 GitHub이 넘겨주지 않아 404, 사용자가 넘겨주는 페이지는 두지 않기로 함)

- 고칠 때마다 **GitHub main에 바로 올리고**(https://github.com/commst/scoreworks), 답은 **짧게 + 실행 링크** https://commst.github.io/scoreworks/
- **독립실행 html 파일은 만들지 않는다.** html·zip을 따로 보내지 않는다(단원은 링크로만 씀)
- 고칠 때마다 함께 갱신:
  1. CHANGELOG.md — 날짜 + 일련번호 `## 2026-MM-DD (번호) · 제목`, 원인·고친 방법·확인 결과
  2. README.md — 사용법·구성·도구·빌드가 바뀌면
  3. **앱 안 '업데이트 이력'** — src/index.template.html의 `<template id="histTpl">`. 날짜별 `<section class="hday">`, `<h4>기능 업데이트 <small>n</small>`의 `<details><summary>제목</summary><p>설명</p></details>`, 버그는 **접힌 묶음** `<details class="hbug"><summary>버그 수정 <small>n건</small></summary><ul class="hlist bug"><li><details>…</details></li></ul></details>` 안에(사용자 11-26 — 하나씩 늘어놓지 말 것). 개수(small)도 맞출 것
  4. **프로젝트 문서 동기화** — Projects 도구 project_write로 `claude/CHANGELOG.md`, `claude/README.md`에 local_path로 올림
- **토큰 절약(사용자 11-12)**: 꼭 필요한 시험만 한다 — 고친 부분에 직접 닿는 시험 + pwboot 정도. 전체 화면 시험·전체 회귀는 해석기를 고칠 때만, 그림 대조는 바뀐 유형마다 대표 마디만
- 목표는 **무결점 프로그램**: 고칠 때 기존 기능을 깨지 않는다
- **회귀 검사는 기준 스냅숏으로(181번)**: `node test/cmp/snap.mjs check`(다섯 곡 101파일, 약 27초) — 기준(지금 받아들인 해석 결과)과 새 해석기 결과를 마디 번호로 맞대 FILL·EMPTIED·OTHER(TIE/STEM)·NEW·LOST·NEWWARN을 보여 줌. 옛 해석기를 따로 둘 필요 없음. 바뀐 마디를 그림 대조로 받아들였으면 **커밋 전에 `GITREV=$(git rev-parse --short HEAD) node test/cmp/snap.mjs make`로 기준을 새로 씀**(안 쓰면 다음 검사에 이번 변화가 또 나옴). 기준은 비공개 샘플 저장소 `/home/claude/scoreplay_sample/golden/`(악보 내용이라 공개 저장소에 두지 않음), PDF 해석 캐시는 `/home/claude/opcache/`(test/cmp/opcache.mjs — 해석기가 pdf.js에서 새 명령·글자 속성을 읽게 되면 OPCACHE_VER를 올릴 것). 새 작업 공간에서 기준이 없으면 `PARSER=<git show 지금 main의 score-parser.js를 outline-*.js와 같은 폴더에 둔 경로> node test/cmp/snap.mjs make`. 한 마디 기준 보기 `node test/cmp/snap.mjs show <접두어> <줄> <마디…>`
- **회귀 범위(사용자 11-17)**: 해석기를 고치면 전체 샘플이 아니라 **소나기·월광·프론티어·미락흘·달빛항해**의 총보·파트보(test/cmp/samples5.txt, 101파일)만 비교한다 — `ls /home/claude/samples | grep -f <(grep -v '^#' test/cmp/samples5.txt) | sed 's#^#/home/claude/samples/#' > /tmp/readable5; LIST=/tmp/readable5 bash test/cmp/reg2.sh /home/claude/prev test/regrn.mjs`(약 2분). 나머지 곡은 필요할 때 git 이력의 옛 해석기(`git show <커밋>:src/score-parser.js`)와 전체 비교하면 누적된 변화가 한꺼번에 나온다
- **MusicXML 내보내기가 매우 중요**: 사용자는 내보낸 MusicXML을 피날레·뮤즈스코어에서 열어 새 악보를 편집하는 일이 많다. 읽어 들인 PDF와 최대한 같아야 함
- 디자인: A안(가운데 악보, 아래 연주 막대, 왼쪽 탭 설정). 다크 테마 안 씀(시스템 어두운 모드에서 글씨는 보여야 함)
- 오래 걸리는 작업은 **단계가 끝날 때마다 진행 상황을 알린다**. 사용량 한도로 끊기면 리셋 뒤 **묻지 말고 이어서** 한다(진행 메모를 남겨 둘 것)
- **문법은 ES2020까지만**(`??=`·`||=`·`&&=`, 클래스 private `#`·static 블록, 정규식 lookbehind 등 금지): 단원 기기 중 옛 브라우저가 있어 한 곳만 써도 앱 전체가 시작되지 않음(113번). build.py가 test/syntaxcheck.cjs로 검사해 넘으면 빌드를 멈춤
- 커밋 메시지 끝: `Co-Authored-By: Claude …` 줄(세션 안내에 따름)

## 2. 작업 환경

- 저장소 클론: `/home/claude/scoreplay` — 저장소 이름은 scoreworks지만 시험 도구들이 이 로컬 경로를 쓰므로 폴더 이름은 그대로(없으면 add_repo commst/scoreworks 후 `git clone https://github.com/commst/scoreworks /home/claude/scoreplay`). `npm install`(pdfjs-dist 4.10.38) 후 test/의 .mjs가 돈다
- 소스: `src/index.template.html`(앱 화면·MusicXML 내보내기 buildMusicXml·재생 흐름), `src/score-parser.js`(PDF 해석기), `src/audio-engine.js`(소리), `src/musicxml.js`(MusicXML 읽기), `src/outline-*.js`
- 빌드: `python3 build.py` → `index.html` + `version.json`(판 번호 = 한국 시각) + `dist/`
- 이전 세션은 `/home/claude/web`(melody.html = index.template.html, score-parser.js, build_melody.py → deploy-hapju/index.html)에서 고친 뒤 저장소 src로 복사했다. 새 세션은 저장소 src에서 바로 고쳐도 됨
- 뮤즈스코어 4.4.4 AppImage: `/home/claude/mscore/squashfs-root/AppRun` (없으면 다시 받아 압축 풀기; test/msall.sh가 사용)
- **샘플 악보는 비공개 저장소 commst/scoreplay_sample(밑줄)에 있음** — 새 대화(= 새 작업 공간)에서는 사용자에게 zip을 다시 받지 말고: add_repo commst/scoreplay_sample → `git clone --depth 1 https://github.com/commst/scoreplay_sample /home/claude/scoreplay_sample` → `mkdir -p /home/claude/samples && cp /home/claude/scoreplay_sample/pdf/*.pdf /home/claude/samples/`. 611개(약 300MB), manifest.json = md5 → 받은 zip·zip 안 경로. 새 악보를 받으면 ingest.py로 푼 뒤 그 저장소 pdf/와 manifest.json에도 더해 푸시(저작권 — 공개 저장소 scoreplay에는 PDF를 넣지 않음)
- **작업 공간이 새로 만들어지면**(샘플·도구가 모두 사라짐): 저장소 다시 받기 → `npm install` → `mkdir -p /home/claude/web && ln -sfn /home/claude/scoreplay/node_modules /home/claude/web/node_modules` → `mkdir -p /home/claude/web/deploy-hapju && ln -sf /home/claude/scoreplay/index.html /home/claude/web/deploy-hapju/index.html`(fuzz2·pwxml 기본 경로). Playwright는 `NODE_PATH=/opt/npm-tools/node_modules`. MusicXML XSD는 `https://raw.githubusercontent.com/w3c/musicxml/v4.0/schema/{musicxml,xml,xlink}.xsd` → `/home/claude/work/xsd/`. 뮤즈스코어는 `https://github.com/musescore/MuseScore/releases/download/v4.4.4/MuseScore-Studio-4.4.4.243461245-x86_64.AppImage` 받아 `--appimage-extract`
- **작업 공간 사양이 작음(메모리 7GB·코어 2개)**: regall.sh(8개 동시)는 메모리 부족 → `bash test/cmp/reg2.sh <이전 해석기 폴더> test/regrn.mjs`(2개씩, 약 10분). 회귀가 도는 동안 src/score-parser.js를 고치면 결과가 섞이므로 끝날 때까지 손대지 말 것(git stash도 금지)
- **시험 도구용 샘플 별칭**: 샘플을 받은 뒤 `bash test/samples-alias.sh`(옛 접두어 b3a31a97·44e95fb3 → 지금 샘플). 회귀 목록은 `ls /home/claude/samples | grep -v ALIAS`로. axe는 `/home/claude/work/axetmp`에 `npm i axe-core@4.10`
- 처음 돌릴 때 만들 폴더: `mkdir -p xmlout`(pwxml), `mkdir -p /home/claude/mscore/all`(msall.sh)
- 작업 공간에서 github.io·jsdelivr CDN에는 접속이 막혀 배포 페이지를 직접 열 수 없음 → 배포본과 같은 index.html을 Playwright로(pdf.js는 node_modules로 바꿔 끼움) 시험
- 샘플은 사용자에게 **zip으로** 받는다(PDF를 그대로 첨부하면 대화에 펼쳐져 토큰을 많이 씀). 맥에서 만든 zip은 파일 이름이 `#Uc18c` 꼴로 풀리므로 `#U(4자리)`를 글자로 바꿔 이름 붙임
- 한글 파일 이름은 Playwright setInputFiles로 올라가지 않음 → 시험 도구는 `/tmp/pick-<접두어>.pdf`로 복사해 올림(이미 반영)
- 시험 스크립트 대부분은 `/home/claude/samples`(샘플 PDF), `/home/claude/web/node_modules/pdfjs-dist`(앱 시험 때 CDN 대신 쓰는 pdf.js) 경로를 씀. 환경이 새로 만들어졌으면 경로를 맞추거나 SAMPLES 환경변수 사용

## 3. 샘플 악보

### 2026-11-10 다시 받은 zip 전체 (작업 공간이 새로 만들어져 다시 받음: 샘플 611개, 회귀에 쓰는 '읽히는' 악보 481개)
- **이 611개는 비공개 저장소 commst/scoreplay_sample의 pdf/에 올려 둠**(2026-11-10). 2절의 방법으로 받는다
- 받은 zip 36개를 `python3 test/cmp/ingest.py /mnt/user-data/uploads/*.zip`로 넣음. 34-2 프론티어는 34-1 zip 안에 함께 있음
- **소나기는 새 판으로 바뀜(사용자 지정, 옛 pdfFactory 판은 무시)**: zip 63 'Microsoft Print To PDF'로 인쇄한 Encore 악보 — 총보 61c75dd1(22줄 355마디), 대금 031413dc, 소금 b181d587, 피리·태평소 6e27980d, 해금 54ebac86, 가야금 c8df8196·2 1dc61f3a, 거문고 ee2a16f2, 신디1 00cc3dc7·2 8ed32fe5, 타악기 3b5a0517 / 아쟁 a4736a85는 아이폰 사진 PDF(못 읽음). 아래 11-05 목록의 소나기 md5는 더 이상 없음
- 아래 '이전 작업 공간의 샘플 (87개)' 중 이번 zip에 없는 것: 1fe03d65·26dd8f21·44e95fb3·52cfd0bf·59ee4663·9128e77f·9e386483·a05c32d0·b3a31a97·bfb7e6f7·d95ddafe 등 → pwv2는 `PRE=9203ad49`로 돌림(곡 제목 'Flower' 확인 1건만 실패하는 것은 정상), pwedit는 옛 샘플이 없어 못 돌림
- 회귀 목록 /tmp/readable = `ls /home/claude/samples/*.pdf > /tmp/readable`(611개, 읽히지 않는 것은 도구가 건너뜀 — 114번 회귀에서 해석된 파일 499개). 이전 해석기는 /home/claude/prev/에 outline-*.js와 함께. MusicXML XSD는 /home/claude/work/xsd/에 받아 둘 것(xsdcheck.py 경로)


### 2026-11-05 사용자 zip 전체 (샘플 613개, 읽을 수 있는 PDF 542개)
- 받은 zip: /mnt/user-data/uploads/*.zip (곡마다 하나, 이름 앞 번호 = 곡 번호). `python3 test/cmp/ingest.py <zip…>`로 풀어 넣고, zip 안 경로(폴더 = 곡·판) 목록은 manifest.json으로 다시 만든다(ingest.py와 같은 이름 풀기로 zip을 읽어 경로·md5를 적음)
- **대조 규칙(사용자 지정)**: 그룹 = zip 맨 위 폴더. 멋으로 사는 세상(ver0·1·2)·프린스오브제주(두 폴더)·프론티어(34-1·34-2)는 폴더마다 다른 판이라 폴더 안 총보↔파트보끼리. 신뱃놀이는 '신뱃놀이…' 파일끼리(그냥 '총보'와 악기 이름만 있는 파트보는 그림 PDF). 화랑은 관악·타악·현악 폴더 파트보를 총보.pdf와. 아침을 두드리는 소리 총보(5693b576)는 실내악(15-1) 폴더에 있으나 15번 파트보와 대조. 총보가 없는 곡(뱃노래·배띄워라·쑥대머리·길 위에서 만난 사람들·멋으로 사는 세상 ver1·신모듬 3악장(총보가 그림))은 파트보만으로 학습
- 판 차이로 대조 제외: Flowers of K(총보 3/2 66마디 ↔ 파트보 3/4 131마디, 뒤로 갈수록 구성이 다름)
- 그림 PDF(못 읽음, 지원 안 함): 신뱃놀이 타악·건반·'총보' 16개, 판놀음II 스코어 추출 18개, 프린스오브제주 선율 파트보 8개, Fly to the sky 파트보 9개, 아리랑(환상곡)-편집 4개, 신모듬 3악장 스코어·가야금 HJ편집, 미락흘 가야금 HJ편집, 월광 타악 스코어
- **열두 달이 다 좋아 파트보 10개는 그림이 아니라 글꼴 없이 선으로만 그린 PDF** — MuseScore 2.0처럼 모양 맞추기로 지원할 수 있음(과제)


### 2026-11-05 새 작업 공간에 받은 것 (103개, zip 5개: 34-1·34-2 프론티어, 37 월광, 42 달빛항해, 57 미락흘, 63 소나기)
아래 87개 목록과 겹치는 것은 총보 4개뿐(달빛항해 5a5e4c8e, Frontier 9203ad49, 월광 = 경기도립 위촉작품 2bc31eef, 미락흘 = 강원도립 신년음악회 5b2e1f54). 나머지 87개 옛 샘플은 이 작업 공간에 없음.
**선율 파트보가 총보와 함께 있어 마디별 대조에 쓸 수 있음.** 다만 사용자가 가진 악보를 모두 올려 **판이 총보와 다를 수 있음** — 마디 수가 다르면 다른 판으로 보고, 마디 순서를 맞춘 뒤 대부분 일치하는 짝 안에서 국소적으로 어긋난 곳만 오류 후보로 볼 것
- 소나기 (설장구 협주곡, pdfFactory): 총보 78767dd2(22줄 274마디), 타악 989bed97, 가야금1 4d14b65a·2 d01fdca8, 거문고 30ecf7c5, 대금 a20fb355, 소금 05c142e6, 피리 340c8186, 태평소 d5810074, 해금 cc07366e(277마디 — 판 다를 수 있음), 소아쟁 7d439097, 대아쟁 d1283340, 건반 cb301e6b·2 bc30801e
- 프론티어 34-1 (PScript5): 총보 363ca361(15줄 171마디, 옛 a33365d9와 다른 파일), 소금 f26de2e2, 대금 db1091d7, 피리태평소 fffcb9e2, 해금 7cce8f62, 대아쟁 f6400eaa, 가야금 738f131a·2 209a06bb, 거문고 e4b67b61, 건반 af049f24, 타악 1ea4bf1f
- 프론티어 34-2 우리앙상블 (Sibelius 20.6, 총보 9203ad49 170마디): 소금 71309168, 대금 52f7f3f4, 피리 f8a5cee4, 대피리 7a7b0010, 태평소 52dee6a8, 해금 348383a3, 소아쟁 f3f4b1c7, 대아쟁 c89e2641, 가야금 4cd2237f, 거문고 a159a572, 양금 33e41278, Piano b2ad8152, 장구 eeacfd93, 모듬북 5572839c, 꽹가리·징 e37dd8e0, Brass chime·징·잼베 30c7f710
- 달빛항해 (doPDF, 총보 5a5e4c8e 152마디 / 다른 판 Score 6a8c363c): 소금 f71ee972, 대금 4ff5d13d, 피리 4c11c62e, 태평소 a435527b, 해금 d74e426b, 대아쟁 6a124bec, 가야금 65547a57, 거문고 0e4db8dc, 양금 242e8d42, 장구 082ee014, 북 8d480304, 대고 73401d64, 징 2faa3aa8, 공 e731a6ea, OPEN SYMBAL f1a3f359, Bell cc62fc8e, 탬버린 29a4d840, 트라이앵글 7a10f13f
- 월광 (PScript5, 총보 2bc31eef 193마디): 소금 e8e04c44, 대금 047aeebe, 피리 a5d361b5, 대피리 ab608a97, 태평소 31d13b53, 해금 10ef889e, 소아쟁 5139dcdd, 대아쟁 04107df0, 양금 42e6719b, 가야금 2ab6053d, 거문고 2abfe33b, 신디 7d47f709, 장구 8dd5f49b, 쇠 d9ff8023, 징 a2cfc6ba, 모듬북 ab414a04, 심벌·윈드차임 9c5b4722, 대고·공 03d96428 / 타악 스코어 c6413c84는 그림 PDF(못 읽음)
- 미락흘 (Sibelius 22.10, 총보 5b2e1f54 264마디): 소금 985e95bb, 대금 ccb5bf3e, 피리 bd38a457, 저피리 20875ffb, 태평소 cef37825, 피리·태평소 합본 daad401a, 생황 340e1cd7, 해금 671dc786, 소아쟁 89ad9170, 대아쟁 b0bf3d18, 가야금 50f274a6·2 92f62e02, 거문고 6db43133, syn. 4cf0e820, Contrabass 1a5f86c1, 장구 22dd0425, 모듬북 16723f30, 꽹과리·젬베·triangle c0b6c20d, Cymbals·windbell·징·대북 004d79b5 / 가야금 part1 HJ편집 6e5c0683은 그림 PDF(못 읽음)

### 이전 작업 공간의 샘플 (87개)

- 위치: `/home/claude/samples/<md5 앞 8자>-<원래 파일 이름>.pdf` — **저장소에는 없음**(저작권). 작업 공간이 비워졌으면 사용자에게 다시 받거나, 대화 첨부(/mnt/user-data/attachments/…)에서 md5 앞 8자로 이름 붙여 복사
- 새 악보를 받으면 md5로 중복 확인(`md5sum`) 후 `<md5 8자>-이름.pdf`로 추가
- 아래 '줄·마디'는 첫 줄 기준

### 못 읽는 것 (5개) — 스캔 그림 PDF(ezPDF Maker)
신뱃놀이 타악 파트보 5개: 꽹과리·징(12419d72), 북1·북2(19605c57), 장구(5cd1e6e9), 북(91a3a115), 꽹과리(b79d82f4)

### 총보: 선율 + 타악 (33개)
| 곡 | 접두어 | 줄 | 마디 | 파트보 |
|---|---|---|---|---|
| 강원도립국악관현악단 신년음악회 (美!樂!扢!_miracle) | 5b2e1f54 | 21 | 264 | 타악만 |
| 경기도립국악단 위촉작품 (2002) | 2bc31eef | 20 | 193 | 없음 |
| 고구려의 혼 | dbe4d244 | 15 | 118 | 없음 |
| 관현악곡 아리랑 | 1fe03d65 | 14 | 179 | 없음 |
| 남도 아리랑 | e8f58449 | 16 | 194 | 타악만 |
| 남도 아리랑 (다른 판) | a9697ae6 | 16 | 204 | 없음 |
| 달빛항해 | 5a5e4c8e | 21 | 152 | 타악만 |
| 달빛항해 (다른 판, dalbit-Score) | 76ecdce9 | 16 | 152 | (장구·북 파트보가 이 판일 수도) |
| 밀양아리랑 (MuseScore 2.1) | 1e636b86 | 9 | 164 | 없음 |
| 바르도 (Sibelius) | 6268ef29 | 19 | 482 | 없음 |
| 방황 | 20983efb | 17 | 268 | 없음(타악 총보 있음) |
| 신맞이 (2021 수정) | dee46270 | 22 | 316 | 없음 |
| 신뱃놀이 | f69a7ce3 | 14 | 245 | 타악만(스캔이라 못 읽음) |
| 아름다운 나라 | 1aeefe07 | 17 | 118 | 없음 |
| 아름다운 인생 2 – Passion | ea34b050 | 20 | 250 | 타악만 |
| 아리랑 랩소디 (MuseScore 2.1) | 59e5089b | 11 | 116 | 없음 |
| 아리랑 환상곡 (MuseScore 2.1) | 5dce28a0 | 7 | 69 | 없음 |
| 아침을 두드리는 소리 | 5693b576 | 22 | 374 | 타악만 |
| 얼씨구야 | 52cfd0bf | 22 | 249 | 없음 |
| 연변목가 | b3a31a97 | 15 | 158 | 타악만 |
| 열두 달이 다 좋아 | 1c15f8d2 | 17 | 119 | 없음 |
| 축연무 | 59b91b36 | 15 | 89 | 없음(타악 총보 있음) |
| 타(TA) (Finale 2012) | c61daae9 | 19 | 330 | 없음 |
| 판놀음 | 65f37e53 | 20 | 109 | 타악만 |
| 홀로 아리랑 | dbd12037 | 16 | 89 | 없음 |
| 화랑의 기상 | 9e386483 | 21 | 266 | 없음 |
| 청산 (한컴 PDF, Petrucci) | 3c395456 | 21 | 319 | 없음 |
| 소금협주곡 「길」 | 7a797745 | 16 | 304 | 없음 |
| Flower of K | 44e95fb3 | 12 | 66 | 없음 |
| Fly to the sky | 40c156c7 | 20 | 54 | 없음 |
| Frontier (양방언, Sibelius) | 9203ad49 | 19 | 170 | 타악만 |
| Frontier (다른 판) | a33365d9 | 15 | 171 | 타악만 |
| Prince of CHEJU | b6e0ee9d | 15 | 101 | 타악만 |

### 타악 총보 (8개)
남도 아리랑 타악(91373a93) · 멋으로 사는 세상 타악(11637cb5) · 방황 타악(2feeab8e) · 신모듬 3악장 타악(8ab47907) · 아름다운 인생 2 타악(0a657772, 경고 많음 90/249) · 축연무 타악(20e36aa0) · 판놀음 타악(cb8b6436) · Prince of je-ju 타악(a32e0925)

### 파트보 (41개, 선율은 3개뿐)
- 강원도립 신년음악회: 장구 5ef31747, 모듬북 6144f89d, 꽹과리·젬베 fa08e11a
- 길 위에서 만난 사람들 (MuseScore 2.0.3, **총보 없음**): 소금 9192cc4a, 대아쟁 951ae4f2, 북 ab23dfc8, 꽹과리 ce44921e, 장구 f1fd9649
- 남도 아리랑: 북(고) 17113663, 장구 7e6fa5ea·fe1130fa, 쇠 4c4eb272, 모듬북 9900dce5
- 달빛항해: 장구 52e96694, 북 b52d816b
- 멋으로 사는 세상: 모듬북 e0c4a9d1, 스네어·하이햇 e53f406b
- 아름다운 인생 2: 모듬북 63191cce, 봉고 648e2702(경고 79/249)
- 아침을 두드리는 소리: 꽹과리 2c89fa52, 모듬북 ca8c1caa, 장구 11aad2cc, 다른 판 11c7127c·640f819f·7b668d7c
- 연변목가: 목탁 26dd8f21, 북 5b6313b5, 장고 d95ddafe
- 축제 (**총보 없음**): 꽹과리·징 2e6051aa, 모듬북 6423deca, 장구 a05c32d0(경고 63/127)
- FRONTIER: 꽹과리·징 9128e77f, 모듬북 bfb7e6f7, 장구 59ee4663
- Prince of Cheju: 모듬북 91b99175, 봉고 a0dbfb55, 장고 be9b5b83, 악기 미확인 818bf285·de220c62
- 신모듬 3악장: 소아쟁 468af318 (선율 총보 없음)
- 판놀음: 장구 5f54fd88(경고 84/109)

### 더 받으면 좋은 샘플 (사용자에게 안내함)
- **선율 악기 파트보**(가야금·대금·해금·피리·거문고·아쟁) — 특히 총보가 있는 곡(달빛항해·연변목가·남도 아리랑·아침을 두드리는 소리·청산·길)의 것: 총보 결과를 정답 삼아 마디마다 자동 대조 가능
- 길 위에서 만난 사람들·축제의 총보
- MuseScore 3·4, Dorico PDF (아직 시험 못 함)

## 4. 고친 뒤 검사 순서

해석기(score-parser.js)를 고쳤으면 (마디 수가 바뀌는 수정은 `test/regrn.mjs`(마디 번호로 맞댐), 일괄 실행은 `TOOL=test/regrn.mjs bash test/cmp/regall.sh <이전 해석기 폴더>` — 샘플 목록은 /tmp/readable. 이전 파일은 `/home/claude/prev/`에 outline-*.js와 함께 복사해 두어야 import가 됨):
1. 고치기 전 파일을 복사해 둔다(예: `/home/claude/score-parser.prev.js`)
2. `node --max-old-space-size=6000 test/regr.mjs <이전 파일 절대경로> <샘플들>` — 85곡 이상은 메모리 부족(137)이 나므로 40여 개씩 나눠서. `files diff 0`이 기본, 차이가 나면 `PREV=… node test/bdiff.mjs <접두어>`로 마디별 확인 후 그림 대조(`test/vis.mjs`, pdftoppm으로 해당 마디 잘라 보기)
   - 성부(R/L) 나누기를 건드렸으면 regr는 모두 차이로 나오므로 `test/regrv.mjs`(성부 빼고 음만 비교, 경고 마디 수 변화)와 `test/alignv.mjs`(세로 맞춤까지) 사용. 바뀐 마디는 `test/crop.mjs <접두어> <줄> <마디>`로 잘라 그림과 대조
3. 새 악보: `test/inv.mjs`(요약), `test/lstat.mjs`(줄별 경고)
4. 세로 맞춤을 건드렸으면 `test/alignregr.mjs` (alt=0, lost 없음, broken=0)

앱·MusicXML:
5. 빌드 후 **`node test/dynlevel.mjs`(셈여림 규칙 — 160번)**, **`node test/tieplan.mjs`(재생 붙임줄 잇기)**, **`node test/musicxml-import.mjs`(MusicXML 불러오기 — 178번)**, **`node test/tdzcheck.cjs index.html`(선언 전 접근 후보)**, **`node test/pwboot.cjs index.html`(저장된 설정으로 시작되는지 — 113번)**, `node test/pwv2.cjs <html> desktop|tablet|phone`, `node test/fuzz2.cjs <씨앗> 50 [mobile]`, `node test/pwedit.cjs <html>`, 화면 관련이면 pwtabland·pwseek·pwspeed·pwpause·pwaxe·pwcontrast
6. MusicXML: `node test/pwxml.cjs <접두어…>`(앱에서 모든 줄 켜고 내보내기 → test/xmlout/), `python3 test/xsdcheck.py xmlout/*.musicxml`(전부 VALID), `python3 test/xmlcheck.py <접두어…>`(원래 음 대비 빠짐·더함), `python3 test/integrity.py …`(붙임줄·이음줄·잇단 짝 0 오류), `bash test/msall.sh <절대경로…>`(뮤즈스코어로 열기 rc=0, 쪽 수)
7. 이전 판과 견줄 때: `HTML=<이전 index.html> node test/pwxml.cjs …`

## 5. 구조 요점 (자세한 것은 CHANGELOG)

- 해석기: 쪽 → 오선·단(layout) → 줄(lines) → `analyzeLine(score, 줄)` = 마디 목록(bars: number, barLen(분수, 온음표=1), events{t,dur,voice R/L,midis,x,tie…}, warnings) + geo(마디의 쪽·오선·x) + marks
- 악보 글꼴 번호는 Maestro(맥) 번호로 맞춤: Petrucci·SMuFL·MScore·Anastasia·윈도 PUA·Latin-1(한컴 PDF) 변환은 extractPages 뒤 글자 후처리
- **세로 맞춤(alignToSystem)**: 총보에서 '박자보다 김/마디 길이를 넘음' 마디만, 같은 단의 경고 없는 줄들의 음 시각(분수)과 가로 자리로 다시 읽음. 앱은 줄을 처음 해석할 때 `alignRaw`로 적용(다른 줄 해석은 악보마다 `_rawCache`)
- MusicXML 내보내기(buildMusicXml): 4분음표 = 3360, 조표·음 이름, 성부 합치기, 빔·잇단·붙임줄·이음줄, 쪽·오선 크기(KS 0.8)·마디 폭, 파트 묶음·악기 소리, 셈여림·연주 지시 글자, 깨진 잇단 마디는 16분 칸으로 다시 만듦
- 음 고치기(✎): 원래 음(시각·길이·음높이)이 같을 때만 다시 입힘 → 인식이 바뀌면 '적용하지 못함'으로 알림
- 설정 저장 키는 파일 내용 지문(fp) — 제목이 바뀌어도 설정은 유지

## 6. 남은 과제·알려진 한계

### 128번(11-11) — 문제점 신고하기·다른 파일의 음 수정 (끝남)

- [문제점 신고하기]: FormSubmit(`REPORT_TO`, 사용자 계정 메일 — 공개 소스에 두는 것에 사용자 동의)로 전송, 실패하면 mailto. **사용자가 첫 제보 뒤 확인 메일의 [Activate Form]을 눌러야 도착함 — 눌렀는지 아직 확인 전.** 확인되면 FormSubmit이 주는 무작위 별칭 주소로 `REPORT_TO`를 바꿔 메일 주소를 소스에서 숨길 수 있음(사용자가 원하면)
- 음 수정 공유: 같은 파일은 122번부터 이미 됨. 다른 파일(판)로 받을 때도 원래 음이 같은 곳에 적용하도록 고침. 시험 test/pwreport.cjs, test/pwshare.cjs(음 수정 항목 추가)

**158번(11-12) 끝남**: 음색 탭(전역 `hapju-tone`, 앱 TONE_MEL·TONE_PERC·toneApply·percSounds·demoRender, 엔진 applyTone·setInstTones·setPercVolumes), 신고 첨부(FormData, 여러 개는 zipFiles), 사용법·사용설명서 갱신(그림 전부 다시 찍음: tools/manual/mancap → 4 → 5 → `mancap6 shot 107 장고` → 7 → 8 → 새 mancap9 = 27_tone_tab·28_report). 시험 test/pwtone.cjs(새), pwboot·pwreport에 항목 추가. **확인 대기: FormSubmit ajax 주소가 첨부를 실제 메일에 붙여 주는지(작업 공간에서는 외부 접속이 막혀 못 봄) — 사용자가 한 번 보내 보고 알려 주기로. 안 붙으면 숨은 form + iframe(`https://formsubmit.co/<주소>`, `_next`)로 바꿀 것.** wip-158 브랜치는 지워도 됨. 새 타악 소리를 더하면 TONE_PERC에도 넣을 것. 이 작업 공간에서 pwv2의 'topbar song'·'no errors(ERR_TUNNEL)' 2건과 pwtabland iPad 세로 2건은 main도 같음(환경·옛 시험)

**157번(11-12)**: 기본 음량 원칙(사용자): 곡·음원 하나에 맞추지 않는다 — 시험 악보로 모두 같은 크기 + 악기 특성 보정(LV·GAIN 표는 CHANGELOG 157), 곡마다는 음량 막대. 측정 test/levelref.py → levelstems.mjs → levelmeas.py

**156번(11-12)**: 음량 막대 = 들리는 크기 %(pctToVol/volToPct, 10dB = 두 배), 저장은 vol(배율) 그대로

**155번(11-12)**: 관악 LV +3dB(대금·소금 1.4, 피리·대피리·태평소 1.6), 장구 JG 2.0으로 되돌림. 줄별 크기 비교: test/stems.mjs <html> <접두어> <폴더> 0 <마디부터> <마디까지> 뒤 소리 나는 구간 0.4초 RMS 중앙값

**154번(11-12)**: 대금·소금·해금·피리 LV를 150번 전으로(사용자: 다른 곡에서 너무 작음). 음원 한 곡에 맞춘 관악·해금 크기는 쓰지 말 것

**153번(11-12)**: [악보 제목으로] 단추 없앰(비우면 읽은 제목)

**152번(11-12)**: .song-rename grid minmax(0,1fr) — 휴대폰 악보 파일 창 넘침. 확인용 스크립트 /tmp/filesdlg.cjs 방식(iPhone 13 흉내, 화면 밖 요소 목록)

**151번(11-12)**: ghCheck·ghSave — 저장소 saved와 이 기기 설정 saved 비교(저장소가 나중일 때만 알림)

**150번(11-12)**: 프론티어 음원 대조로 LV·KG·JG 조정. 도구 test/frontier/(README), test/stems.mjs(줄마다 크기 맞추기 없이 WAV, 앱 window.__rawLevel·window.__st). 음원은 scoreplay_sample audio/. 다음 후보: 음원 쪽 1초 안 셈여림·어택 변화가 큼(관악 어택·음마다 셈여림), 다른 곡 음원으로 같은 비교(한 곡 치우침 막기)

**149번(11-12)**: fermataEnd(가운데+마디 끝 늘임표), 온음표만 있는 쪽의 normSize, 'tr'(217) 글자 트릴(trSyms)

**148번(11-11)**: playbackOrder — 점 있는 도돌이 시작을 만난 뒤에는 겹세로줄(sectionStart)을 돌아갈 자리로 안 씀(explicit). 연주 순서 비교 도구 /tmp/ord.mjs 방식(줄 0의 orderToText, PARSER=이전 해석기)

**147번(11-11)**: 심벌 롤 = 녹음 롤 × env(cymbalRoll envAt, 작아지면 큰 부분부터). 직접 mix 시험 스크립트는 /tmp/rt3.mjs 방식(samples.json 디코드)

**146번(11-11)**: 양금 LV 0.85, 타악 굴림도 줄 셈여림 env(addRoll env), 트레몰로·굴림 안 셈여림은 dB×1.8(dramatic)

**145번(11-11)**: 작아지는 꺾쇠 ×0.25(그림)·×0.45(글자)

**144번(11-11)**: 꽹과리막음 녹음 0번(딸깍만)을 빼고 1번만

**143번(11-11)**: 꽹과리 X 머리는 성부 상관없이 막음(kkMute 예외 없앰), 서랍 ✕ 44px

**141·142번(11-11)**: 트레몰로 되풀이(expandTremolo, nt.env 줄별 셈여림), 꺾쇠 겹침·크기, 2도 화음 기둥 묶음 0.6pt, 타악 소리 팀파니(samples.json '팀파니' → 높은 G·낮은 C). 시험 test/tremwav.mjs·pwtimp.cjs

**140번(11-11)**: 잔향 처음 값 보통(0.22)

**139번(11-11)**: 조표만 있는 칸은 마디 아님(keyOnly, 조표 없는 줄은 같은 단 다른 오선을 봄). 남은 것: 멋으로 사는 세상 ver2 총보(c062682c) Cymbals 줄 158마디에서 하나 어긋남

**138번(11-11)**: 메트로놈 클릭 4/5kHz '틱', 음악 크기 맞추기 뒤 따로 더함, 크기 선택(optMetroVol). 측정 test/metrolvl.mjs·metroband.py

**137번(11-11)**: 저장소 이름 scoreworks로 — 앱 안 주소(GH_REPO, APP_URL, 사용설명서 링크, 브라우저에서 실행), README·설명서·시험 도구(라우팅 주소)를 새 주소로

**136번(11-11)**: 이 기기에 설정이 없는 곡에 공유 설정이 있으면 #ghOffer 알림으로 물어 [확인]으로 적용(전에는 바로 적용)

**135번(11-11)**: 이름 ScoreWorks, 글꼴·아이콘·위 막대(가운데 이름, 3칸 grid: .tb-left/.tb-logo/.tb-right, 단추 .ll/.ls 긴·짧은 이름)·첫 화면 가운데 배치. 사용설명서 그림 전부 다시 찍음(tools/manual/mancap*.cjs — 글꼴은 /home/claude/work/fonts에 `npm i pretendard@1.3.9 @fontsource-variable/outfit`, PDF 만들 때 /home/claude/work/manual/fonts/에 PretendardVariable.woff2·outfit-latin-wght-normal.woff2 복사, mancap6은 `shot 79 가야금`, 새 mancap8 = 04b·15). 화면 그림 비교는 test/pwshot.cjs

**134번(11-11)**: 휴대폰이 메모리 때문에 페이지를 다시 열면 악보가 사라지던 것 → 올린 파일을 IndexedDB `hapju-session`에 기억(sessSave/sessBoot/sessClear, 같은 탭이면 저절로, 새 탭이면 #resumeBtn). 터치 기기 입력칸 16px(iOS 저절로 확대 막음), 악보 보기 캔버스 상한(svScale·SV_KEEP·freeCanvas). 시험 test/pwsession.cjs. **아이폰 실기기 확인 대기**

**133번(11-11)**: 서랍 탭 줄과 ✕를 sticky 머리 `.side-head`로 묶음(굴리면 ✕가 사라지던 것). 시험 test/pwsheetx.cjs

**132번(11-11)**: ♩=♪ 기본 방향 = 오른쪽이 새 박(앱 eqRight: eqFlip 없음/true = 오른쪽). 해석기 defaultTempoRows는 예전(왼쪽) 방식 값 그대로 두고 앱에서 propagateEq로 다시 계산. 시험 test/pweq.cjs

**131번(11-11)**: Sibelius Opus 글꼴의 X 머리(192)를 X 머리 음표로 읽음(프론티어 꽹과리 12마디 제보). 회귀 경고 7,920 → 7,795, 새 경고 0

**130번(11-11) 끝남**: 연주 칸 제목 '재생 설정', 빠르기 탭 '빠르기'·'rit. · accel.' 제목 왼쪽 정렬(`.ttl-row.ttl-left`). main에 올림. wip-130 브랜치는 남아 있음(지워도 됨)

**129번(11-11) 단추·제목 정리**: 단추 색(--b-bg 등)·같은 너비(.btn-grid)·제목 가운데(.ttl-row)·곡 제목 바꾸기(state.titleRead/state.title, 설정 songTitle). 시험 test/pwtitle.cjs. **사용설명서(manual.pdf)는 예전 단추 이름('사용법'·'화면 가득 보기')과 첫 화면 단추 줄 그림이 남아 있음 — 다음에 그림·글 갱신**

**127번 뒤 확인 대기**: 사용자가 태블릿에서 월광 설정을 올렸다고 했으나 저장소에는 달빛항해(Score).pdf 설정만 있었다(월광 파일 없음). 127번에서 안내 글에 파일 이름을 넣었으니, 사용자가 월광을 다시 저장해 보고 알려 주기로 함.

**전체 점검에서 남은 것**(사용자가 다시 요청하지는 않음): MusicXML 일괄 내보내기 검사, '쉼표 일부 숨김' 경고 약 8,000개 분류(타 c61daae9, 아름다운 인생 ea34b050, 화랑), 판놀음II 타악 e2e04847 12마디 주고받는 짧은 빔, 2도 떨어진 이웃 음을 화음으로 읽는 것(아름다운 인생 196, 연변목가 가야금 79~82), 월광 거문고 8마디 4분 셋잇단, 소나기 대금 162 쌍둥이 머리 점. 사용설명서 3장 그림이 예전 화면, 좁은 표에서 '기준' 선택 글자 잘림.

### 이전부터 남은 것

- MusicXML: 마디를 넘는 이음줄(예: 달빛항해 해금 9→10), '2nd Time' 같은 글자, 숨긴 쉼표가 보이는 것
- MusicXML 원래 음 대비 차이(이전부터 있던 것, 잇단 맞춤 마디): 아침을 두드리는 소리 44, 달빛항해 19, 청산 15, 신맞이 12, 경기도립 9 등
- 뮤즈스코어 쪽 수가 크게 늘어나는 곡: 아름다운 인생 2(42→71쪽), 아침을 두드리는 소리(47→54), 신맞이(52→56) — 뮤즈스코어가 마디 폭을 쓰지 않음
- 세로 맞춤으로 못 고친 넘친 마디 약 1,100개(근거 줄 부족), 셋잇단·다섯잇단 섞인 복잡한 마디
- 아침을 두드리는 소리 다른 판 모듬북(640f819f) 229·231마디: 첫 화음의 점을 못 읽어 X 머리 음들이 마디를 넘음
- 경고 많은 타악 파트보: 판놀음 장구, 아름다운 인생 2 봉고·타악 총보, 축제 장구
- 스캔 PDF는 읽지 못함(신뱃놀이 파트 5개)
- 총보↔파트보 대조 도구는 test/cmp/ (104번). 104번 뒤 남은 다른 마디: 리듬 2,121(경고 없는 것 707), 음높이만 1,500여(대부분 판 차이 ±12·조옮김)
- 남은 대조 과제: 빽빽한 총보(한 쪽 22줄)의 32분음표 빔(아침을 두드리는 소리 꽹과리·대고 — 파트보가 맞음), 달빛항해 Score 136마디 윗성부 셋잇단 괄호, 방황 가야금·화랑 25현 등 임시표·조표, 각 그룹의 '마디 길이 다름' 유형(rhythm.py) 나머지
- 남은 '쉼표 숨김' 경고 대부분은 악보 그대로: 5/4박 마디에 온음표 하나(프론티어 34-1 대아쟁 21~24마디 — 마디 전체로 볼지는 미정), 성부가 마디 중간에 갈라짐(소나기 대금 141마디 등 — MusicXML에서 숨긴 쉼표 대신 forward를 쓸지 검토)
- 파트보 제목이 첫 글자만 나오는 것: 프론티어 34-1 해금 파트보 제목이 '해'(줄 이름은 ONE 표로 채우지만 파트보 제목은 안 채움)
- 106번 뒤 남은 것: 배띄워라 대아쟁 4마디(아래 성부를 점2분 머리로 적고 8분음표가 이어짐 — 악보 표기 문제로 보임), 월광 총보 1~15마디는 마디선 없는 rubato라 단마다 한 마디, 열두 달 Score 현 8·9·12마디(괄호 못 찾음), 프린스오브제주 소금 39마디, 아침을 두드리는 소리 가야금 147~164마디(셋잇단 두 묶음만 적힌 4/4 마디: 숨은 쉼표 자리). MusicXML 대량 검사는 /tmp/xsel(75곡) + `node test/pwxml.cjs` 4개씩 나눠 돌림(합쳐 약 15분). 총보 없는 그룹(뱃노래·배띄워라·쑥대머리·길위에서·멋으로 ver1·신모듬 3악장)의 경고 유형: 쉼표 숨김, 박자보다 김, 마디 합침
- 107번 뒤: 사용자 제보 'rit를 한 마디에 넣었는데 동작하지 않음'은 예시·파트보에서 재현 안 됨(엔진·화면 모두 느려짐 확인) — 곡·마디·길이·끝 %·기기를 물어 둠
- 108번: MusicXML 저장 뒤 확인 창(xmlCheck/openXmlCheck)과 겹쳐 보기(svOverPanel, #svOver). 확인 창은 '치는 때'만 비교(음높이 비교는 옥타브·조옮김 설정 때문에 안 함). 겹쳐 보기 세로 자리는 MusicXML 음 이름 + 음자리표로 계산
- 109번: 확인 창·겹쳐 보기를 PDF 음표 머리(geo.heads, 해석기가 normal 마디에 넣음) 기준으로. xmlNoteXY가 음의 쪽 좌표 계산, 허용 가로 1.4칸·세로 0.3칸. 타악 줄(role perc)·옥타브·조옮김 줄은 가로만(pitchOk). 이벤트에 dia(적힌 온음 번호)를 실어 MusicXML 음 이름을 적힌 대로(C♭ 등). 남은 일: 확인 창에 뜬 마디(Frontier 대금·해금 15·19·47·51마디의 아랫성부 쉼표 자리 A♭ 등)는 실제 인식 오류 — 다음 해석기 개선 후보
- 110번: Sibelius의 작은 글자 셈여림(Opus Text) 읽기. 셈여림을 건드리면 `TOOL=test/regdyn.mjs bash test/cmp/regall.sh <이전 해석기 폴더>`
- **111·112번(11-10)**: 소나기 새 판(윈도 인쇄 Encore) 읽기, 아래 기둥 화음의 아랫음 성부 갈림 고침. 남은 것: 바르도 대금 23마디 첫 화음으로 들어오는 붙임줄, 판놀음II 태평소 41마디 붙임줄 온음표, 소나기 타악기 MusicXML이 뮤즈스코어에서 8 → 15쪽
- **이어 할 일(11-10 사용자 요청 '아랫성부 표기 누락·쉬는 마디·악상기호')**: ① 아랫성부 — **112번에서 고침(아래 내용은 기록)** — 한 기둥(아래로 향한) 화음의 아랫머리를 따로 성부 R로 갈라 읽는 문제. 예: Frontier 총보 9203ad49 대금(줄 1)·해금(줄 16) 15·19·47·51마디, Piano 윗줄 19마디: 아랫음 A♭을 쉼표 자리(0.625)에 놓고 셋잇단도 못 붙임 → MusicXML 성부1(위 기둥)=아랫음, 성부2=윗음으로 뒤바뀜. 해석기 makeNote 기둥 고르기·성부 나누기 쪽을 볼 것, 고친 뒤 regrn 전체 회귀. 확인 창(저장 뒤 확인)의 'PDF 머리에 맞는 음 없음/음 높이 다름' 마디가 이런 곳의 목록이 됨 ② 쉬는 마디 — MusicXML·뮤즈스코어에서는 정상, 사용자에게 곡·마디를 물어 볼 것 ③ 악상기호 — 셈여림은 110번에서 고침, 나머지(아티큘레이션·글자 지시)는 MusicXML에 들어감(Frontier: staccato 801·accent 768·slur 704·tenuto 97·words 64)
- **113번(11-10)**: '악보로 보기'를 저장해 두면 시작이 멈추던 것(`svOverData` 선언 전 접근) 고침. 시작할 때 실행되는 코드가 쓰는 전역 `let`/`const`는 반드시 그 앞에 선언할 것(선언 전 접근 = 앱 전체 멈춤). 화면을 고친 뒤에는 `node test/pwboot.cjs index.html`(저장된 설정 여러 가지로 시작)을 꼭 돌릴 것. 114번: 바르도 대금 23마디 붙임줄 임시표·판놀음II 태평소 41마디(반쪽씩 그린 붙임줄 채움을 여러 마디 쉼표로 읽음) 고침. 남은 것: 판놀음II 태평소 37마디(두 성부 같은 음 온음표를 비켜 적음 → 붙임줄 이음으로 읽어 2/1)
- 117번에서 찾은 해석기 문제: 연변목가 총보(52271c34) 가야금 윗줄 79~82·86~89마디 — 141번에서 고침(사용설명서 9장 예시는 158번에서 장고 107마디로 바꿈)
- 사용설명서를 바꾸면: tools/manual/manual.html 고치고 `cp -r tools/manual/{manual.html,img} /home/claude/work/manual/` 뒤 `node tools/manual/mkpdf.cjs` → manual.pdf 복사. 장 번호를 바꾸면 차례·'n장' 참조도
- 116번 점검에서 남긴 것(이전부터): 바르도 총보 대금 300마디 1/32 길게 읽음 → 301마디 붙임줄 음이 MusicXML에서 빠짐, 바르도 해금 42마디 셋잇단 16분, pwrange2는 84번 전 화면용 옛 시험
- 앱의 기준 줄(master)은 경고가 가장 적은 줄 → 경고 수가 바뀌면 기준 줄이 바뀔 수 있음(103번에서 월광 8·16마디 MusicXML 박자가 바뀐 원인)
- **121번(11-10)**: 오선 사이 덧줄 음표의 주인 오선(ownerFix, 덧줄로 판단), 같은 음 되풀이 16분음표의 기둥 고르기, 겹친 위·아래 꼬리. 경고 유형 집계는 `node test/wtally.mjs <악보…>`(샘플 전체 약 10분, 결과 JSON 줄). 남은 것: 두 성부가 번갈아 치는 타악 줄의 애매한 토막 빔(e2e04847 12마디), '쉼표 일부 숨김' 경고 8천여 건 중 실제 오류 가려내기(경고 많은 곡: 타 c61daae9 430, 아름다운 인생 ea34b050, 화랑 등), 타(c61daae9) 3:18마디처럼 점4분음 셋(9/8)인 마디의 박자 판단
- **122번(11-11)**: 공유 설정(저장소 `settings/*.json`, 앱이 GitHub API로 main에 바로 커밋함 → **푸시 전에 반드시 `git fetch origin main` 후 rebase**), 마디 골라 넣기(pickMode), 뒤 구간 함께 옮기기(tempoShift), tempoDet. 시험 `node test/pwshare.cjs`. 실제 토큰으로 저장되는지는 사용자가 확인해야 함(아직 확인 전)
- **126번(11-11)**: 자유 박 마디(alignFreeBars — '마디선이 보이지 않아' 경고가 있는 단을 가로 자리로 맞춤), 표지 빈 오선(blankLeadPages). 고친 뒤 `node test/freechk.mjs <총보…>`로 out·nonmono·lenMismatch가 0인지 볼 것. 회귀 비교용 이전 해석기는 /home/claude/prev/

