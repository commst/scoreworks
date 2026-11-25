// Verovio로 악보 그리기 (Studio view/engrave.ts에서 가져옴, 212번)
// ScoreWorks는 빌드 도구 없이 한 파일로 나가므로 Verovio(압축 약 2.4MB)는 pdf.js처럼 jsDelivr에서 받는다.
// 인식 악보 보기를 처음 열 때만 받는다 — 연습만 하는 단원의 첫 화면은 그대로 빠르게.
// 시험에서는 이 주소를 node_modules/verovio/dist로 바꿔 끼운다(test/pwstudio0.cjs).
export const VRV_VER = '6.4.1';
export const VRV_BASE = `https://cdn.jsdelivr.net/npm/verovio@${VRV_VER}/dist/`;

let tkPromise: Promise<any> | null = null;
export function verovioReady(): Promise<any> {
  if (!tkPromise) tkPromise = (async () => {
    // 변수 주소라 묶는 도구(esbuild)가 건드리지 않고 브라우저가 그때 받는다
    const modUrl = VRV_BASE + 'verovio-module.mjs', esmUrl = VRV_BASE + 'verovio.mjs';
    const [{ default: createVerovioModule }, { VerovioToolkit }] = await Promise.all([import(/* @vite-ignore */ modUrl), import(/* @vite-ignore */ esmUrl)]);
    const M = await createVerovioModule();
    return new VerovioToolkit(M);
  })().catch(e => { tkPromise = null; throw e; });   // 받지 못하면 다음에 다시 시도
  return tkPromise;
}

export interface EngraveOpts { width: number; zoom: number; first?: boolean; breaks?: 'auto' | 'encoded' }   // width: 화면 폭(px), zoom: 100 = 보통, breaks: encoded = 원본 악보의 줄 바꿈(대조용)
export interface Engraved { pages: number; svg(page: number): string; timemap(): any[]; tk: any }

export async function engrave(xml: string, o: EngraveOpts): Promise<Engraved> {
  const tk = await verovioReady();
  const scale = Math.round(40 * o.zoom / 100);   // Verovio scale 40 ≈ 화면에서 읽기 좋은 크기
  tk.setOptions({
    scale,
    pageWidth: Math.max(800, Math.round(o.width * 100 / scale)),
    pageHeight: 60000, adjustPageHeight: true,   // 화면에서는 한 쪽을 길게(넘기지 않고 내려 보기)
    pageMarginTop: o.first === false ? 10 : 60, pageMarginBottom: 10, pageMarginLeft: 50, pageMarginRight: 50,
    breaks: o.breaks || 'auto', header: o.first === false ? 'none' : 'auto', footer: 'none',
    condense: 'none',   // 쉬는 파트도 늘 그림(단마다 오선 수·왼쪽 여백이 같게)
    mnumInterval: 1,   // 마디 번호를 모든 마디에
    svgViewBox: true, svgHtml5: true, svgRemoveXlink: true,
    justificationMaxVertical: 0,
  });
  if (!tk.loadData(xml)) throw new Error('악보를 그리지 못했습니다(Verovio): ' + tk.getLog());
  const pages = tk.getPageCount();
  return { pages, svg: (p: number) => tk.renderToSVG(p), timemap: () => tk.renderToTimemap({ includeMeasures: true }), tk };
}
