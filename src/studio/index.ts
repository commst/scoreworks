// ScoreWorks Studio 기능 묶음(212번~). Studio 저장소의 TypeScript를 그대로 가져와 esbuild로 묶고(tools/build-studio.mjs → src/studio-bundle.js),
// build.py가 앱에 끼워 넣는다. 앱에서는 전역 이름 SWS 하나로만 쓴다(앱의 기존 이름과 부딪치지 않게).
// 악보 자료의 기준은 ScoreWorks 인식 결과 + 수정 기록이고, .swc는 율명·정간보를 그릴 때만 잠깐 만든다(저장하지 않음).
export { engrave, verovioReady, VRV_BASE, VRV_VER } from './view/engrave.ts';
export { parseMusicXml } from './io/musicxml-in.ts';
export { annotateLabels, renderJeonggan, noteNameOf } from './view/yul.ts';
export { isJanggu, manualGu } from './view/gueum.ts';
export * as ops from './edit/ops.ts';
export const STUDIO_VER = 1;
