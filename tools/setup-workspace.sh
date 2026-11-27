#!/usr/bin/env bash
# 새 작업 공간 준비. 시험 도구가 쓰는 작업 공간 뿌리(SW_ROOT) 아래 구조를 만든다:
#   $SW_ROOT/scoreplay(이 저장소 링크) · samples(샘플 PDF) · scoreplay_sample(비공개 저장소) · web/node_modules(pdf.js) · work/vrv(Verovio)
#   bash tools/setup-workspace.sh                                   # Linux·클라우드: 기본 SW_ROOT=/home/claude
#   SW_ROOT=$HOME/sw NPM_TOOLS=$HOME/sw/npm-tools bash tools/setup-workspace.sh   # 맥 등
# 시험을 돌릴 때도 같은 값을 줌: export SW_ROOT=$HOME/sw NPM_TOOLS=$HOME/sw/npm-tools NODE_PATH=$HOME/sw/npm-tools/node_modules
# 필요: git, node 18+, npm, python3. 샘플 저장소(commst/scoreplay_sample, 비공개)는 접근 권한이 있어야 받음.
set -euo pipefail
ROOT="${SW_ROOT:-${ROOT:-/home/claude}}"; export SW_ROOT="$ROOT"
if [ -z "${NPM_TOOLS:-}" ]; then if [ -d /opt/npm-tools ] || [ -w /opt ]; then NPM_TOOLS=/opt/npm-tools; else NPM_TOOLS="$ROOT/npm-tools"; fi; fi
HERE="$(cd "$(dirname "$0")/.." && pwd)"

for c in git node npm python3; do command -v "$c" >/dev/null || { echo "필요: $c 가 없습니다"; exit 1; }; done
if ! mkdir -p "$ROOT" 2>/dev/null; then
  echo "$ROOT 를 만들 수 없습니다. 다른 곳을 쓰려면: SW_ROOT=\$HOME/sw bash tools/setup-workspace.sh"
  exit 1
fi

# 1. 저장소를 $ROOT/scoreplay에(폴더 이름은 옛 이름 그대로 — 시험 도구가 이 경로를 씀)
if [ "$HERE" != "$ROOT/scoreplay" ]; then
  if [ -e "$ROOT/scoreplay" ]; then echo "이미 있음: $ROOT/scoreplay"; else ln -s "$HERE" "$ROOT/scoreplay"; echo "링크: $ROOT/scoreplay → $HERE"; fi
fi
(cd "$HERE" && npm install --no-audit --no-fund)

# 2. 앱 시험용 pdf.js 자리
mkdir -p "$ROOT/web/deploy-hapju"
ln -sfn "$HERE/node_modules" "$ROOT/web/node_modules"
ln -sf "$HERE/index.html" "$ROOT/web/deploy-hapju/index.html"

# 3. 도구(Playwright·esbuild·acorn) — NODE_PATH=$NPM_TOOLS/node_modules 로 씀
if [ ! -d "$NPM_TOOLS/node_modules/playwright" ]; then
  mkdir -p "$NPM_TOOLS" 2>/dev/null || { echo "$NPM_TOOLS 를 만들 수 없음 — NPM_TOOLS=\$HOME/npm-tools 로 다시 실행"; exit 1; }
  npm install --prefix "$NPM_TOOLS" --no-audit --no-fund playwright esbuild acorn
  (cd "$NPM_TOOLS" && npx playwright install --with-deps chromium || npx playwright install chromium)
fi

# 4. Verovio(인식 악보 시험이 CDN 대신 씀)
if [ ! -d "$ROOT/work/vrv/node_modules/verovio" ]; then mkdir -p "$ROOT/work/vrv"; npm install --prefix "$ROOT/work/vrv" --no-audit --no-fund verovio@6.4.1; fi

# 5. 샘플 악보(비공개 저장소)
if [ ! -d "$ROOT/scoreplay_sample" ]; then
  git clone --depth 1 https://github.com/commst/scoreplay_sample "$ROOT/scoreplay_sample" || echo "샘플 저장소를 받지 못함(권한 확인) — 화면 시험은 샘플이 필요"
fi
if [ -d "$ROOT/scoreplay_sample/pdf" ]; then mkdir -p "$ROOT/samples"; cp -n "$ROOT/scoreplay_sample/pdf/"*.pdf "$ROOT/samples/"; [ -f "$HERE/test/samples-alias.sh" ] && (cd "$HERE" && bash test/samples-alias.sh || true); fi

# 6. 확인
(cd "$HERE" && python3 build.py | tail -1)
echo "끝. 시험 전에: export SW_ROOT=$ROOT NPM_TOOLS=$NPM_TOOLS NODE_PATH=$NPM_TOOLS/node_modules"
echo "시험 예: cd $HERE && node test/pwboot.cjs index.html"
echo "뮤즈스코어(test/msall.sh)·MusicXML XSD는 HANDOFF.md 2장대로 필요할 때 따로 받기"
