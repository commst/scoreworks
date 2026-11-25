// src/studio/*.ts → src/studio-bundle.js (전역 SWS, ES2020). build.py가 이 결과를 앱에 끼워 넣는다.
// Studio 코드를 고쳤을 때만 다시 돌린다: NODE_PATH=/opt/npm-tools/node_modules node tools/build-studio.mjs
// 결과 파일은 저장소에 넣는다(build.py는 파이썬만으로 돌게 — esbuild가 없는 곳에서도 빌드됨).
import { createRequire } from 'module';
import path from 'path';
import { fileURLToPath } from 'url';
const require = createRequire(import.meta.url);
const esbuild = require('esbuild');
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
await esbuild.build({
  entryPoints: [path.join(ROOT, 'src/studio/index.ts')],
  outfile: path.join(ROOT, 'src/studio-bundle.js'),
  bundle: true, format: 'iife', globalName: 'SWS', target: 'es2020', charset: 'utf8',
  legalComments: 'none', minify: false,
  banner: { js: '/* ScoreWorks Studio 기능 묶음 — src/studio/*.ts에서 tools/build-studio.mjs로 만든 파일. 직접 고치지 말 것 */' },
});
console.log('src/studio-bundle.js 만듦');
