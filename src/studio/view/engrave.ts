// Verovio로 악보 그리기 (Studio view/engrave.ts에서 가져옴, 212번)
// ScoreWorks는 빌드 도구 없이 한 파일로 나가므로 Verovio(압축 약 2.4MB)는 pdf.js처럼 jsDelivr에서 받는다.
// 인식 악보 보기를 처음 열 때만 받는다 — 연습만 하는 단원의 첫 화면은 그대로 빠르게.
// 시험에서는 이 주소를 node_modules/verovio/dist로 바꿔 끼운다(test/pwstudio0.cjs).
// 231번: 그리기는 뒤 일꾼(Web Worker)에서 — 그리는 동안 화면·재생 단추가 멈추지 않음. 일꾼을 못 만들면 예전처럼 화면에서
export const VRV_VER = '6.4.1';
export const VRV_BASE = `https://cdn.jsdelivr.net/npm/verovio@${VRV_VER}/dist/`;

// 일꾼 코드(글로 들고 있다가 Blob 주소로 띄움 — 한 파일 배포라 따로 파일을 둘 수 없음). ES2020만
const WORKER_SRC = `
let tk = null, ready = null;
async function init(base) {
  const r = await Promise.all([import(base + 'verovio-module.mjs'), import(base + 'verovio.mjs')]);
  const M = await r[0].default();
  try { r[1].enableLog(r[1].LOG_ERROR, M); } catch (e) {}
  tk = new r[1].VerovioToolkit(M);
}
onmessage = async (ev) => {
  const d = ev.data;
  if (d.init) { try { if (!ready) ready = init(d.base); await ready; postMessage({ ready: 1 }); } catch (e) { postMessage({ fail: String(e && e.message || e) }); } return; }
  try {
    await ready; const t0 = performance.now(); tk.setOptions(d.opts);
    if (!tk.loadData(d.xml)) throw new Error('악보를 그리지 못했습니다(Verovio): ' + tk.getLog());
    const n = tk.getPageCount(), svgs = [];
    for (let p = 1; p <= n; p++) svgs.push(tk.renderToSVG(p));
    postMessage({ id: d.id, svgs: svgs, ms: performance.now() - t0 });
  } catch (e) { postMessage({ id: d.id, err: String(e && e.message || e) }); }
};`;

let tkPromise: Promise<any> | null = null;
function mainReady(): Promise<any> {
  if (!tkPromise) tkPromise = (async () => {
    // 변수 주소라 묶는 도구(esbuild)가 건드리지 않고 브라우저가 그때 받는다
    const modUrl = VRV_BASE + 'verovio-module.mjs', esmUrl = VRV_BASE + 'verovio.mjs';
    const [{ default: createVerovioModule }, { VerovioToolkit, enableLog, LOG_ERROR }] = await Promise.all([import(/* @vite-ignore */ modUrl), import(/* @vite-ignore */ esmUrl)]);
    const M = await createVerovioModule();
    try { enableLog(LOG_ERROR, M); } catch (e) { /* 옛 판 */ }   // 경고(단 맞춤 등)를 콘솔에 수천 줄 쏟지 않게 — 오류만(213번)
    return new VerovioToolkit(M);
  })().catch(e => { tkPromise = null; throw e; });   // 받지 못하면 다음에 다시 시도
  return tkPromise;
}

let wBusy = 0; export function verovioBusy() { return wBusy; }
let W: Worker | null = null, wPromise: Promise<Worker> | null = null, wSeq = 0, useWorker = true;
const pend = new Map<number, { res: (s: string[]) => void; rej: (e: Error) => void }>();
function workerReady(): Promise<Worker> {
  if (wPromise) return wPromise;
  wPromise = new Promise<Worker>((res, rej) => {
    let w: Worker;
    try { w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: 'text/javascript' })), { type: 'module' }); }
    catch (e) { rej(e); return; }
    const to = setTimeout(() => { rej(new Error('일꾼 시간 초과')); try { w.terminate(); } catch (e) {} }, 90000);
    w.onmessage = ev => {
      const d = ev.data;
      if (d.ready) { clearTimeout(to); W = w; res(w); return; }
      if (d.fail) { clearTimeout(to); rej(new Error(d.fail)); try { w.terminate(); } catch (e) {} return; }
      const p = pend.get(d.id); if (!p) return; pend.delete(d.id);
      if (d.err) p.rej(new Error(d.err)); else { wBusy += d.ms || 0; p.res(d.svgs); }
    };
    w.onerror = ev => {
      clearTimeout(to); try { ev.preventDefault(); } catch (e) {}
      rej(new Error('일꾼 오류')); for (const p of pend.values()) p.rej(new Error('일꾼 오류')); pend.clear();
      if (W === w) { W = null; wPromise = null; }
    };
    w.postMessage({ init: 1, base: VRV_BASE });
  });
  return wPromise;
}
export function verovioReady(): Promise<any> {
  const g: any = typeof window === 'object' ? window : {};
  if (useWorker && typeof Worker === 'function' && !g.__vrvMain) {
    return workerReady().catch(e => {   // 일꾼을 못 띄우면(옛 브라우저·막힌 환경) 화면에서 그림
      console.warn('Verovio 일꾼을 쓰지 못해 화면에서 그립니다', e); useWorker = false; wPromise = null; return mainReady();
    });
  }
  return mainReady();
}
export function verovioWorker(): boolean { return !!W; }

export interface EngraveOpts { width: number; zoom: number; first?: boolean; breaks?: 'auto' | 'encoded' }   // width: 화면 폭(px), zoom: 100 = 보통, breaks: encoded = 원본 악보의 줄 바꿈(대조용)
export interface Engraved { pages: number; svg(page: number): string; timemap(): any[]; tk: any }

// 231번: 같은 글·같은 설정은 다시 그리지 않음(보기를 오가거나 줄을 껐다 켤 때) — 모두 합쳐 글자 수 상한까지
const CACHE = new Map<string, string[]>(); let cacheLen = 0;
function cacheMax(): number { try { return matchMedia('(pointer: coarse)').matches ? 8e6 : 30e6; } catch (e) { return 8e6; } }
function cachePut(k: string, svgs: string[]) {
  const n = svgs.reduce((a, s) => a + s.length, 0) + k.length; if (n > cacheMax() / 3) return;
  CACHE.set(k, svgs); cacheLen += n;
  while (cacheLen > cacheMax() && CACHE.size > 1) { const [k0, v0] = CACHE.entries().next().value as [string, string[]]; CACHE.delete(k0); cacheLen -= v0.reduce((a, s) => a + s.length, 0) + k0.length; }
}
export function engraveCacheClear() { CACHE.clear(); cacheLen = 0; }

function optsOf(o: EngraveOpts) {
  const scale = Math.round(40 * o.zoom / 100);   // Verovio scale 40 ≈ 화면에서 읽기 좋은 크기
  return {
    scale,
    pageWidth: Math.max(300, Math.round(o.width * 100 / scale)),   // 휴대폰에서 크기 +가 먹히게(예전 800이면 좁은 화면에서 늘 같은 배치, 213번)
    pageHeight: 60000, adjustPageHeight: true,   // 화면에서는 한 쪽을 길게(넘기지 않고 내려 보기)
    pageMarginTop: o.first === false ? 10 : 60, pageMarginBottom: 10, pageMarginLeft: 50, pageMarginRight: 50,
    breaks: o.breaks || 'auto', header: o.first === false ? 'none' : 'auto', footer: 'none',
    condense: 'none',   // 쉬는 파트도 늘 그림(단마다 오선 수·왼쪽 여백이 같게)
    mnumInterval: 1,   // 마디 번호를 모든 마디에
    svgViewBox: true, svgHtml5: true, svgRemoveXlink: true,
    justificationMaxVertical: 0,
    // 233번 뒤: 나란히(원래 줄 바꿈)는 조각마다 단 하나라 모든 단이 '마지막 단'이 되어, 80% 못 차면 늘리지 않아 칸 폭 절반쯤에서 끝났음 → 늘 끝까지
    ...(o.breaks === 'encoded' ? { minLastJustification: 0 } : {}),
  };
}
const noTimemap = () => { throw new Error('일꾼으로 그린 악보에는 timemap이 없습니다'); };
export async function engrave(xml: string, o: EngraveOpts): Promise<Engraved> {
  const opts = optsOf(o), key = JSON.stringify(opts) + '\n' + xml;
  const hit = CACHE.get(key);
  if (hit) { CACHE.delete(key); CACHE.set(key, hit); return { pages: hit.length, svg: (p: number) => hit[p - 1], timemap: noTimemap, tk: null }; }
  const tk = await verovioReady();
  if (W && useWorker) {
    const id = ++wSeq, w = W;
    const svgs = await new Promise<string[]>((res, rej) => { pend.set(id, { res, rej }); w.postMessage({ id, xml, opts }); });
    cachePut(key, svgs);
    return { pages: svgs.length, svg: (p: number) => svgs[p - 1], timemap: noTimemap, tk: null };
  }
  tk.setOptions(opts);
  if (!tk.loadData(xml)) throw new Error('악보를 그리지 못했습니다(Verovio): ' + tk.getLog());
  const pages = tk.getPageCount(), svgs: string[] = [];
  for (let p = 1; p <= pages; p++) svgs.push(tk.renderToSVG(p));
  cachePut(key, svgs);
  return { pages, svg: (p: number) => svgs[p - 1], timemap: () => tk.renderToTimemap({ includeMeasures: true }), tk };
}
