// pdf.js 해석 결과(쪽마다 그리기 명령 목록) 캐시 — 회귀 검사 때 PDF를 다시 해석하지 않으려고(181번).
// 해석기가 쓰는 것만 담는다: 쪽 크기·회전(viewport), 명령 번호 전부, 해석기가 읽는 명령의 인자(글자는 unicode·width·isSpace·originalCharCode),
// 글꼴 id → 이름. 해석기(score-parser.js)의 처리는 모두 그대로 다시 돌므로, extractPages가 새 명령·글자 속성을 읽게 되면 OPCACHE_VER를 올릴 것
// 쓰기: const sc = await loadScoreCached(P, pdfjs, 파일) — P = score-parser 모듈
import fs from 'fs'; import zlib from 'zlib'; import crypto from 'crypto'; import path from 'path';
export const OPCACHE_VER = 2;
const DIR = process.env.OPCACHE || '/home/claude/opcache';
const KEEP = ['beginText', 'closeEOFillStroke', 'closeFillStroke', 'closePath', 'closeStroke', 'constructPath', 'endPath', 'eoFill', 'eoFillStroke', 'fill', 'fillStroke',
  'moveText', 'nextLine', 'restore', 'save', 'setCharSpacing', 'setFillGray', 'setFillRGBColor', 'setFont', 'setHScale', 'setLeading', 'setLeadingMoveText', 'setLineWidth',
  'setStrokeGray', 'setStrokeRGBColor', 'setTextMatrix', 'setTextRise', 'setWordSpacing', 'showSpacedText', 'showText', 'stroke', 'transform'];
const plain = v => ArrayBuffer.isView(v) ? Array.from(v) : Array.isArray(v) ? v.map(plain) : v && typeof v === 'object' ? Object.fromEntries(Object.entries(v).map(([k, x]) => [k, plain(x)])) : v;
const glyph = g => (g && typeof g === 'object') ? { unicode: g.unicode, width: g.width, isSpace: g.isSpace, originalCharCode: g.originalCharCode } : g;

async function build(pdfjs, data) {
  const OPS = pdfjs.OPS, keep = new Set(KEEP.map(k => OPS[k]));
  const doc = await pdfjs.getDocument({ data, disableFontFace: true, isEvalSupported: false }).promise;
  const pages = [];
  for (let pn = 1; pn <= doc.numPages; pn++) {
    const page = await doc.getPage(pn), ol = await page.getOperatorList(), vp = page.getViewport({ scale: 1 });
    const fonts = {}, args = [];
    for (let i = 0; i < ol.fnArray.length; i++) {
      const fn = ol.fnArray[i], a = ol.argsArray[i];
      if (!keep.has(fn)) { args.push(null); continue; }
      if (fn === OPS.setFont) { const id = a[0]; if (!(id in fonts)) { try { const f = page.commonObjs.get(id); fonts[id] = f.name || f.loadedName || id; } catch (e) { fonts[id] = id; } } }
      args.push(fn === OPS.showText || fn === OPS.showSpacedText ? [a[0].map(glyph)] : plain(a));
    }
    pages.push({ vp: { width: vp.width, height: vp.height, transform: Array.from(vp.transform) }, fn: Array.from(ol.fnArray), args, fonts });
  }
  await doc.destroy();
  return { v: OPCACHE_VER, numPages: pages.length, pages };
}
// 캐시에서 만든 가짜 pdf.js 문서(extractPages가 쓰는 것만)
function fakeDoc(c) {
  return { numPages: c.numPages, destroy: async () => {},
    getPage: async pn => { const p = c.pages[pn - 1];
      return { getOperatorList: async () => ({ fnArray: p.fn, argsArray: p.args }), getViewport: () => p.vp,
        commonObjs: { get: id => { if (!(id in p.fonts)) throw new Error('font ' + id); return { name: p.fonts[id] }; } } }; } };
}
export async function loadScoreCached(P, pdfjs, file) {
  const data = fs.readFileSync(file), key = crypto.createHash('md5').update(data).digest('hex');
  const cf = path.join(DIR, key + '.json.gz');
  let c = null;
  if (fs.existsSync(cf)) { try { c = JSON.parse(zlib.gunzipSync(fs.readFileSync(cf))); if (c.v !== OPCACHE_VER) c = null; } catch (e) { c = null; } }
  if (!c) { c = await build(pdfjs, new Uint8Array(data)); fs.mkdirSync(DIR, { recursive: true }); fs.writeFileSync(cf, zlib.gzipSync(JSON.stringify(c), { level: 4 })); }
  const fake = { ...pdfjs, OPS: pdfjs.OPS, getDocument: () => ({ promise: Promise.resolve(fakeDoc(c)) }) };
  return P.loadScore(fake, new Uint8Array(0));
}
