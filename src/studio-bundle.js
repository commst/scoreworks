/* ScoreWorks Studio 기능 묶음 — src/studio/*.ts에서 tools/build-studio.mjs로 만든 파일. 직접 고치지 말 것 */
var SWS = (() => {
  var __defProp = Object.defineProperty;
  var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
  var __getOwnPropNames = Object.getOwnPropertyNames;
  var __hasOwnProp = Object.prototype.hasOwnProperty;
  var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
  var __export = (target, all) => {
    for (var name in all)
      __defProp(target, name, { get: all[name], enumerable: true });
  };
  var __copyProps = (to, from, except, desc) => {
    if (from && typeof from === "object" || typeof from === "function") {
      for (let key of __getOwnPropNames(from))
        if (!__hasOwnProp.call(to, key) && key !== except)
          __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
    }
    return to;
  };
  var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
  var __publicField = (obj, key, value) => __defNormalProp(obj, typeof key !== "symbol" ? key + "" : key, value);

  // src/studio/index.ts
  var index_exports = {};
  __export(index_exports, {
    STUDIO_VER: () => STUDIO_VER,
    VRV_BASE: () => VRV_BASE,
    VRV_VER: () => VRV_VER,
    annotateLabels: () => annotateLabels,
    engrave: () => engrave,
    engraveCacheClear: () => engraveCacheClear,
    isJanggu: () => isJanggu,
    manualGu: () => manualGu,
    noteNameOf: () => noteNameOf,
    ops: () => ops_exports,
    parseMusicXml: () => parseMusicXml,
    renderJeonggan: () => renderJeonggan,
    verovioBusy: () => verovioBusy,
    verovioReady: () => verovioReady,
    verovioWorker: () => verovioWorker
  });

  // src/studio/view/engrave.ts
  var VRV_VER = "6.4.1";
  var VRV_BASE = `https://cdn.jsdelivr.net/npm/verovio@${VRV_VER}/dist/`;
  var WORKER_SRC = `
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
  var tkPromise = null;
  function mainReady() {
    if (!tkPromise) tkPromise = (async () => {
      const modUrl = VRV_BASE + "verovio-module.mjs", esmUrl = VRV_BASE + "verovio.mjs";
      const [{ default: createVerovioModule }, { VerovioToolkit, enableLog, LOG_ERROR }] = await Promise.all([import(
        /* @vite-ignore */
        modUrl
      ), import(
        /* @vite-ignore */
        esmUrl
      )]);
      const M = await createVerovioModule();
      try {
        enableLog(LOG_ERROR, M);
      } catch (e) {
      }
      return new VerovioToolkit(M);
    })().catch((e) => {
      tkPromise = null;
      throw e;
    });
    return tkPromise;
  }
  var wBusy = 0;
  function verovioBusy() {
    return wBusy;
  }
  var W = null;
  var wPromise = null;
  var wSeq = 0;
  var useWorker = true;
  var pend = /* @__PURE__ */ new Map();
  function workerReady() {
    if (wPromise) return wPromise;
    wPromise = new Promise((res, rej) => {
      let w;
      try {
        w = new Worker(URL.createObjectURL(new Blob([WORKER_SRC], { type: "text/javascript" })), { type: "module" });
      } catch (e) {
        rej(e);
        return;
      }
      const to = setTimeout(() => {
        rej(new Error("일꾼 시간 초과"));
        try {
          w.terminate();
        } catch (e) {
        }
      }, 9e4);
      w.onmessage = (ev) => {
        const d = ev.data;
        if (d.ready) {
          clearTimeout(to);
          W = w;
          res(w);
          return;
        }
        if (d.fail) {
          clearTimeout(to);
          rej(new Error(d.fail));
          try {
            w.terminate();
          } catch (e) {
          }
          return;
        }
        const p = pend.get(d.id);
        if (!p) return;
        pend.delete(d.id);
        if (d.err) p.rej(new Error(d.err));
        else {
          wBusy += d.ms || 0;
          p.res(d.svgs);
        }
      };
      w.onerror = (ev) => {
        clearTimeout(to);
        try {
          ev.preventDefault();
        } catch (e) {
        }
        rej(new Error("일꾼 오류"));
        for (const p of pend.values()) p.rej(new Error("일꾼 오류"));
        pend.clear();
        if (W === w) {
          W = null;
          wPromise = null;
        }
      };
      w.postMessage({ init: 1, base: VRV_BASE });
    });
    return wPromise;
  }
  function verovioReady() {
    const g = typeof window === "object" ? window : {};
    if (useWorker && typeof Worker === "function" && !g.__vrvMain) {
      return workerReady().catch((e) => {
        console.warn("Verovio 일꾼을 쓰지 못해 화면에서 그립니다", e);
        useWorker = false;
        wPromise = null;
        return mainReady();
      });
    }
    return mainReady();
  }
  function verovioWorker() {
    return !!W;
  }
  var CACHE = /* @__PURE__ */ new Map();
  var cacheLen = 0;
  function cacheMax() {
    try {
      return matchMedia("(pointer: coarse)").matches ? 8e6 : 3e7;
    } catch (e) {
      return 8e6;
    }
  }
  function cachePut(k, svgs) {
    const n = svgs.reduce((a, s) => a + s.length, 0) + k.length;
    if (n > cacheMax() / 3) return;
    CACHE.set(k, svgs);
    cacheLen += n;
    while (cacheLen > cacheMax() && CACHE.size > 1) {
      const [k0, v0] = CACHE.entries().next().value;
      CACHE.delete(k0);
      cacheLen -= v0.reduce((a, s) => a + s.length, 0) + k0.length;
    }
  }
  function engraveCacheClear() {
    CACHE.clear();
    cacheLen = 0;
  }
  function optsOf(o) {
    const scale = Math.round(40 * o.zoom / 100);
    return {
      scale,
      pageWidth: Math.max(300, Math.round(o.width * 100 / scale)),
      // 휴대폰에서 크기 +가 먹히게(예전 800이면 좁은 화면에서 늘 같은 배치, 213번)
      pageHeight: 6e4,
      adjustPageHeight: true,
      // 화면에서는 한 쪽을 길게(넘기지 않고 내려 보기)
      pageMarginTop: o.first === false ? 10 : 60,
      pageMarginBottom: 10,
      pageMarginLeft: 50,
      pageMarginRight: 50,
      breaks: o.breaks || "auto",
      header: o.first === false ? "none" : "auto",
      footer: "none",
      condense: "none",
      // 쉬는 파트도 늘 그림(단마다 오선 수·왼쪽 여백이 같게)
      mnumInterval: 1,
      // 마디 번호를 모든 마디에
      svgViewBox: true,
      svgHtml5: true,
      svgRemoveXlink: true,
      justificationMaxVertical: 0,
      // 233번 뒤: 나란히(원래 줄 바꿈)는 조각마다 단 하나라 모든 단이 '마지막 단'이 되어, 80% 못 차면 늘리지 않아 칸 폭 절반쯤에서 끝났음 → 늘 끝까지
      ...o.breaks === "encoded" ? { minLastJustification: 0 } : {}
    };
  }
  var noTimemap = () => {
    throw new Error("일꾼으로 그린 악보에는 timemap이 없습니다");
  };
  async function engrave(xml, o) {
    const opts = optsOf(o), key = JSON.stringify(opts) + "\n" + xml;
    const hit = CACHE.get(key);
    if (hit) {
      CACHE.delete(key);
      CACHE.set(key, hit);
      return { pages: hit.length, svg: (p) => hit[p - 1], timemap: noTimemap, tk: null };
    }
    const tk = await verovioReady();
    if (W && useWorker) {
      const id = ++wSeq, w = W;
      const svgs2 = await new Promise((res, rej) => {
        pend.set(id, { res, rej });
        w.postMessage({ id, xml, opts });
      });
      cachePut(key, svgs2);
      return { pages: svgs2.length, svg: (p) => svgs2[p - 1], timemap: noTimemap, tk: null };
    }
    tk.setOptions(opts);
    if (!tk.loadData(xml)) throw new Error("악보를 그리지 못했습니다(Verovio): " + tk.getLog());
    const pages = tk.getPageCount(), svgs = [];
    for (let p = 1; p <= pages; p++) svgs.push(tk.renderToSVG(p));
    cachePut(key, svgs);
    return { pages, svg: (p) => svgs[p - 1], timemap: () => tk.renderToTimemap({ includeMeasures: true }), tk };
  }

  // src/studio/swc/frac.ts
  var gcd = (a, b) => {
    a = Math.abs(a);
    b = Math.abs(b);
    while (b) [a, b] = [b, a % b];
    return a || 1;
  };
  var fr = (n, d = 1) => {
    if (d < 0) {
      n = -n;
      d = -d;
    }
    const g = gcd(n, d);
    return [n / g, d / g];
  };
  var add = (a, b) => fr(a[0] * b[1] + b[0] * a[1], a[1] * b[1]);
  var sub = (a, b) => fr(a[0] * b[1] - b[0] * a[1], a[1] * b[1]);
  var mul = (a, b) => fr(a[0] * b[0], a[1] * b[1]);
  var cmp = (a, b) => a[0] * b[1] - b[0] * a[1];
  var ZERO = [0, 1];

  // src/studio/io/musicxml-in.ts
  var kids = (e, name) => {
    const out = [];
    if (!e) return out;
    for (let n = e.firstChild; n; n = n.nextSibling) if (n.nodeType === 1 && (!name || n.nodeName === name)) out.push(n);
    return out;
  };
  var kid = (e, name) => kids(e, name)[0] || null;
  var txt = (e, name) => {
    const k = name ? kid(e, name) : e;
    return k ? (k.textContent || "").trim() : "";
  };
  var num = (e, name, d = 0) => {
    const s = txt(e, name);
    return s === "" ? d : +s;
  };
  var attr = (e, a) => e && e.getAttribute(a) || "";
  var ARTIC = { staccato: "staccato", staccatissimo: "staccatissimo", accent: "accent", "strong-accent": "marcato", tenuto: "tenuto", "detached-legato": "portato" };
  var UNIT = { quarter: "q", eighth: "e", half: "h" };
  function parseMusicXml(xml, parse = (s) => new DOMParser().parseFromString(s, "application/xml")) {
    const doc = parse(xml);
    const root = doc.documentElement;
    if (!root || root.nodeName !== "score-partwise") throw new Error(root && root.nodeName === "score-timewise" ? "score-timewise MusicXML은 아직 읽지 못합니다" : "MusicXML 악보가 아닙니다");
    const work = kid(root, "work"), ident = kid(root, "identification");
    const meta = { title: txt(work, "work-title") || txt(root, "movement-title") || "제목 없음", composer: "", arranger: "" };
    for (const c of kids(ident, "creator")) {
      const ty = attr(c, "type");
      if (ty === "composer") meta.composer = txt(c);
      else if (ty === "arranger") meta.arranger = txt(c);
    }
    for (const c of kids(kid(root, "credit"), "credit-words")) if (!meta.composer && /작곡|comp/i.test(txt(c))) meta.composer = txt(c);
    const plist = kid(root, "part-list"), names = {};
    let grp = "";
    for (const e of kids(plist)) {
      if (e.nodeName === "part-group") {
        if (attr(e, "type") === "start") grp = txt(e, "group-name") || grp || "g" + attr(e, "number");
        else grp = "";
      } else if (e.nodeName === "score-part") {
        const perc = kids(e, "score-instrument").some((si) => /drum|perc|cymb|gong|bell/i.test(txt(si, "instrument-name"))) || kids(e, "midi-instrument").some((m) => num(m, "midi-channel") === 10);
        names[attr(e, "id")] = { name: txt(e, "part-name"), abbr: txt(e, "part-abbreviation"), perc, group: grp || void 0 };
      }
    }
    const measures = [];
    const parts = [];
    kids(root, "part").forEach((pe, pi) => {
      const id = attr(pe, "id"), info = names[id] || { name: id, abbr: "", perc: false };
      const part = { id, name: info.name, abbr: info.abbr || void 0, inst: "", kind: info.perc ? "perc" : "pitched", staves: 1, clefs: [{ sign: "G", line: 2 }], group: info.group, measures: [] };
      let divs = 1;
      const ties = /* @__PURE__ */ new Map();
      kids(pe, "measure").forEach((me, mi) => {
        if (pi === 0) measures.push({ number: attr(me, "number") || String(mi + 1), len: ZERO });
        const M = measures[mi];
        if (!M) return;
        const pm = { events: [], dirs: [] };
        let pos = ZERO, maxPos = ZERO, last = null;
        const q = (d) => fr(d, 4 * divs);
        for (const e of kids(me)) {
          switch (e.nodeName) {
            case "attributes": {
              if (kid(e, "divisions")) divs = num(e, "divisions", 1);
              const key = kid(e, "key");
              if (key && pi === 0) {
                M.key = num(key, "fifths");
                const md = txt(key, "mode");
                if (md) M.mode = md;
              }
              const tm = kid(e, "time");
              if (tm && pi === 0) {
                M.time = [num(tm, "beats", 4), num(tm, "beat-type", 4)];
                if (attr(tm, "print-object") === "no") M.timeShow = false;
              }
              if (kid(e, "staves")) part.staves = num(e, "staves", 1);
              for (const c of kids(e, "clef")) {
                const st = +(attr(c, "number") || 1), cl = { sign: txt(c, "sign") || "G", line: num(c, "line", txt(c, "sign") === "F" ? 4 : 2) };
                const oc = num(c, "clef-octave-change");
                if (oc) cl.octave = oc;
                if (mi === 0 && cmp(pos, ZERO) === 0) part.clefs[st - 1] = cl;
                else (pm.clefs = pm.clefs || []).push({ t: pos, staff: st, clef: cl });
              }
              const tr = kid(e, "transpose");
              if (tr && mi === 0) part.transpose = { octave: num(tr, "octave-change"), chromatic: num(tr, "chromatic"), diatonic: num(tr, "diatonic") };
              break;
            }
            case "backup":
              pos = sub(pos, q(num(e, "duration")));
              if (cmp(pos, ZERO) < 0) pos = ZERO;
              break;
            case "forward":
              pos = add(pos, q(num(e, "duration")));
              if (cmp(pos, maxPos) > 0) maxPos = pos;
              break;
            case "direction":
              readDirection(e, pos, pm, M, pi, q);
              break;
            case "sound": {
              const tp = +attr(e, "tempo");
              if (tp && pi === 0 && !M.tempo) M.tempo = { bpm: tp, unit: "q", t: pos };
              break;
            }
            case "barline":
              readBarline(e, M, pi);
              break;
            case "print":
              if (pi === 0) {
                if (attr(e, "new-page") === "yes") M.pageBreak = true;
                else if (attr(e, "new-system") === "yes") M.systemBreak = true;
              }
              break;
            case "note": {
              const isChord = !!kid(e, "chord"), grace = kid(e, "grace"), cue = !!kid(e, "cue");
              if (cue) break;
              const d = grace ? ZERO : q(num(e, "duration"));
              const p = readPitch(e, part, ties, num(e, "voice", 1));
              if (isChord && last && p) {
                (last.notes = last.notes || []).push(p);
                readNotations(e, last, p);
                break;
              }
              if (isChord) break;
              const ev = { staff: num(e, "staff", 1), voice: num(e, "voice", 1), t: pos, dur: d };
              if (kid(e, "rest")) {
                ev.rest = true;
                if (attr(kid(e, "rest"), "measure") === "yes") ev.measureRest = true;
                if (attr(e, "print-object") === "no") ev.hidden = true;
              } else if (p) ev.notes = [p];
              const ty = txt(e, "type");
              if (ty) ev.type = ty;
              const dots = kids(e, "dot").length;
              if (dots) ev.dots = dots;
              const tmod = kid(e, "time-modification");
              if (tmod) ev.tuplet = { actual: num(tmod, "actual-notes", 3), normal: num(tmod, "normal-notes", 2) };
              if (grace) ev.grace = attr(grace, "slash") === "yes" ? "acciaccatura" : "appoggiatura";
              const st = txt(e, "stem");
              if (st === "up" || st === "down") ev.stem = st;
              const bm = kids(e, "beam");
              if (bm.length) ev.beams = bm.map((b) => txt(b));
              readNotations(e, ev, p);
              pm.events.push(ev);
              last = ev;
              if (!grace) {
                pos = add(pos, d);
                if (cmp(pos, maxPos) > 0) maxPos = pos;
              }
              break;
            }
          }
        }
        if (pi === 0 || cmp(maxPos, M.len) > 0) M.len = maxPos;
        if (!pm.dirs.length) delete pm.dirs;
        part.measures.push(pm);
      });
      parts.push(part);
    });
    let ts = [4, 4];
    for (const M of measures) {
      if (M.time) ts = M.time;
      if (cmp(M.len, ZERO) === 0) M.len = fr(ts[0], ts[1]);
    }
    for (const p of parts) p.measures.forEach((pm, i) => {
      for (const e of pm.events) if (e.measureRest) e.dur = measures[i].len;
    });
    return { format: "swc", v: 0, meta, measures, parts };
  }
  function readPitch(e, part, ties, voice) {
    const pe = kid(e, "pitch"), un = kid(e, "unpitched");
    let p;
    if (pe) p = { step: txt(pe, "step"), alter: num(pe, "alter"), oct: num(pe, "octave", 4) };
    else if (un) {
      p = { step: txt(un, "display-step") || "E", alter: 0, oct: num(un, "display-octave", 4) };
      part.kind = "perc";
    }
    if (!p) return void 0;
    const acc = txt(e, "accidental");
    if (acc) p.acc = acc;
    const nh = txt(e, "notehead");
    if (nh && nh !== "normal") p.head = nh;
    for (const t of kids(e, "tie")) {
      if (attr(t, "type") === "start") p.tieStart = true;
      else if (attr(t, "type") === "stop") p.tieStop = true;
    }
    void ties;
    void voice;
    return p;
  }
  function readNotations(e, ev, p) {
    for (const l of kids(e, "lyric")) {
      const tx = kid(l, "text");
      if (tx && txt(tx) && !(ev.marks || []).some((m) => m.k === "gueum")) (ev.marks = ev.marks || []).push({ k: "gueum", text: txt(tx) });
    }
    for (const n of kids(e, "notations")) {
      for (const t of kids(n, "tied")) if (p) {
        if (attr(t, "type") === "start") p.tieStart = true;
        else if (attr(t, "type") === "stop") p.tieStop = true;
      }
      for (const s of kids(n, "slur")) {
        const ty = attr(s, "type");
        if (ty === "start" || ty === "stop") (ev.slur = ev.slur || []).push(ty);
      }
      for (const t of kids(n, "tuplet")) if (ev.tuplet) {
        if (attr(t, "type") === "start") {
          ev.tuplet.start = true;
          ev.tuplet.bracket = attr(t, "bracket") !== "no";
        } else ev.tuplet.stop = true;
      }
      const mk = (m) => {
        if (!(ev.marks || []).some((x) => x.k === m.k)) (ev.marks = ev.marks || []).push(m);
      };
      for (const a of kids(n, "articulations")) for (const x of kids(a)) if (ARTIC[x.nodeName]) mk({ k: ARTIC[x.nodeName] });
      for (const o of kids(n, "ornaments")) for (const x of kids(o)) {
        if (x.nodeName === "trill-mark") mk({ k: "trill" });
        else if (x.nodeName === "wavy-line" && attr(x, "type") === "start") mk({ k: "nonghyeon" });
        else if (x.nodeName === "tremolo") mk({ k: "tremolo", n: +(x.textContent || 3) });
      }
      if (kid(n, "fermata")) mk({ k: "fermata" });
      for (const g of [...kids(n, "glissando"), ...kids(n, "slide")]) if (attr(g, "type") === "start") mk({ k: "gliss" });
    }
  }
  function readDirection(e, pos, pm, M, pi, q) {
    const off = kid(e, "offset"), t = off ? add(pos, q(+(off.textContent || 0))) : pos;
    const placement = attr(e, "placement") || void 0, staff = kid(e, "staff") ? num(e, "staff", 1) : void 0;
    for (const dt of kids(e, "direction-type")) for (const x of kids(dt)) {
      if (x.nodeName === "dynamics") {
        const d = kids(x)[0];
        if (d) pm.dirs.push({ t, staff, kind: "dyn", value: d.nodeName === "other-dynamics" ? txt(d) : d.nodeName, placement });
      } else if (x.nodeName === "wedge") pm.dirs.push({ t, staff, kind: "wedge", value: attr(x, "type"), placement });
      else if (x.nodeName === "words") {
        const w = txt(x);
        if (w) pm.dirs.push({ t, staff, kind: "words", value: w, placement });
      } else if (x.nodeName === "rehearsal" && pi === 0) M.rehearsal = txt(x);
      else if (x.nodeName === "segno" && pi === 0) M.segno = true;
      else if (x.nodeName === "coda" && pi === 0) M.coda = true;
      else if (x.nodeName === "metronome" && pi === 0) {
        const bu = txt(x, "beat-unit"), dotted = !!kid(x, "beat-unit-dot"), bpm = num(x, "per-minute");
        if (bpm) M.tempo = { bpm, unit: bu === "quarter" && dotted ? "dq" : UNIT[bu] || "q", t };
      }
    }
    const snd = kid(e, "sound"), tp = snd ? +attr(snd, "tempo") : 0;
    if (tp && pi === 0 && !M.tempo) M.tempo = { bpm: Math.round(tp), unit: "q", t };
  }
  function readBarline(e, M, pi) {
    if (pi !== 0) return;
    const loc = attr(e, "location") || "right", st = txt(e, "bar-style"), rep = kid(e, "repeat"), end = kid(e, "ending");
    if (rep && attr(rep, "direction") === "forward") M.repeatStart = true;
    if (rep && attr(rep, "direction") === "backward") M.repeatEnd = +(attr(rep, "times") || 2) - 1 || 1;
    if (end) {
      const ty = attr(end, "type");
      if (ty === "start") M.ending = { num: attr(end, "number"), type: "start" };
      else M.endingStop = { num: attr(end, "number"), type: ty };
    }
    if (loc === "right" && st) M.barline = st === "light-light" ? "double" : st === "light-heavy" ? "final" : st === "dashed" ? "dashed" : st === "none" ? "none" : "regular";
  }

  // src/studio/swc/pitch.ts
  var NAT = [0, 2, 4, 5, 7, 9, 11];
  var LET = "CDEFGAB";
  var midiOf = (p) => 12 * (p.oct + 1) + NAT[LET.indexOf(p.step)] + (p.alter || 0);
  var SHARPS = [3, 0, 4, 1, 5, 2, 6];
  var FLATS = [6, 2, 5, 1, 4, 0, 3];
  function keyAlt(k) {
    const a = [0, 0, 0, 0, 0, 0, 0];
    if (k > 0) for (let i = 0; i < k; i++) a[SHARPS[i]] = 1;
    else for (let i = 0; i < -k; i++) a[FLATS[i]] = -1;
    return a;
  }
  function spell(midi, dia, kf) {
    if (dia != null) {
      const st2 = (dia % 7 + 7) % 7, oct = Math.floor(dia / 7), alter = midi - (12 * (oct + 1) + NAT[st2]);
      if (Math.abs(alter) <= 2) return { step: LET[st2], alter, oct };
    }
    const a = keyAlt(kf), pc = (midi % 12 + 12) % 12;
    for (let st2 = 0; st2 < 7; st2++) if ((NAT[st2] + a[st2] + 12) % 12 === pc) return { step: LET[st2], alter: a[st2], oct: Math.round((midi - a[st2] - NAT[st2]) / 12) - 1 };
    const nat = NAT.indexOf(pc);
    if (nat >= 0) return { step: LET[nat], alter: 0, oct: Math.round((midi - NAT[nat]) / 12) - 1 };
    const st = kf < 0 ? NAT.indexOf(pc + 1) : NAT.indexOf(pc - 1), al = kf < 0 ? -1 : 1;
    return { step: LET[st], alter: al, oct: Math.round((midi - al - NAT[st]) / 12) - 1 };
  }

  // src/studio/view/gueum.ts
  var isJanggu = (p) => p.kind === "perc" && /장구|장고|janggu|janggo/i.test(p.name);
  var isGayageum = (p, inst) => inst === "gayageum" || /가야금|가야|현금/.test(p.name);
  var manualGu = (e) => {
    const m = (e.marks || []).find((x) => x.k === "gueum" && x.text);
    return m ? m.text : "";
  };
  function jangguAt(part, evs) {
    const sounding = evs.filter((e) => !e.rest && e.notes && e.notes.length);
    if (!sounding.length) return "";
    const pitches = new Set(part.measures.flatMap((m) => m.events).filter((e) => e.voice === 1 && e.notes).flatMap((e) => e.notes.map(midiOf)));
    const split = pitches.size > 1 ? (Math.max(...pitches) + Math.min(...pitches)) / 2 : null;
    let chae = false, buk = false, grace = false, roll = false;
    for (const e of sounding) for (const n of e.notes) {
      const side = e.voice >= 2 ? "buk" : split != null && midiOf(n) < split ? "buk" : "chae";
      if (e.grace) {
        if (side === "chae") grace = true;
        continue;
      }
      if (side === "chae") {
        chae = true;
        if ((e.marks || []).some((m) => m.k === "tremolo" || m.k === "trill")) roll = true;
      } else buk = true;
    }
    if (!chae && !buk) return "";
    if (roll && !buk) return "더러러러";
    if (chae && buk) return grace ? "기덩" : "덩";
    if (chae) return grace ? "기덕" : "덕";
    return "쿵";
  }
  function jangguOnsets(part, mi, staff = 0) {
    const evs = (part.measures[mi]?.events || []).filter((e) => !staff || e.staff === staff);
    const ts = [];
    for (const e of evs) if (!e.rest && e.notes && !e.grace && !ts.some((t) => cmp(t, e.t) === 0)) ts.push(e.t);
    ts.sort(cmp);
    return ts.map((t) => {
      const at = evs.filter((e) => cmp(e.t, t) === 0);
      return { t, gu: jangguAt(part, at), evs: at };
    }).filter((x) => x.gu);
  }
  var SANJO_GU = ["청", "흥", "둥", "당", "동", "징", "땅", "지", "찡", "칭", "쫑", "쨍"];
  var SANJO_OFF = [-17, -12, -10, -5, -3, 0, 2, 4, 7, 9, 12, 14];
  function gayageumGu(midi, jing) {
    let best = -1;
    for (let i = 0; i < 12; i++) if (jing + SANJO_OFF[i] <= midi) best = i;
    if (best < 0) return "";
    const d = midi - (jing + SANJO_OFF[best]);
    if (d === 0) return SANJO_GU[best];
    if (best === 11 && d > 3) return "";
    return d <= 3 ? SANJO_GU[best] + "˄" : "";
  }

  // src/studio/view/yul.ts
  var YUL_KO = ["황", "대", "태", "협", "고", "중", "유", "임", "이", "남", "무", "응"];
  var YUL_HJ = ["黃", "大", "太", "夾", "姑", "仲", "蕤", "林", "夷", "南", "無", "應"];
  var OCT_KO = { [-2]: "하배", [-1]: "배", 0: "", 1: "청", 2: "중청" };
  var OCT_HJ = { [-2]: "下倍", [-1]: "倍", 0: "", 1: "淸", 2: "重淸" };
  function yulName(midi, o) {
    const d = midi - o.base, i = (d % 12 + 12) % 12, oc = Math.floor(d / 12);
    const pre = (o.hanja ? OCT_HJ : OCT_KO)[oc];
    const nm = (o.hanja ? YUL_HJ : YUL_KO)[i];
    return pre != null ? pre + nm : (oc > 0 ? "↑" : "↓") + nm;
  }
  var soundMidi = (score, pi, n) => {
    const t = score.parts[pi].transpose;
    return midiOf(n) + (t ? 12 * (t.octave || 0) + (t.chromatic || 0) : 0);
  };
  function noteLabel(score, pi, e, n, first, c) {
    const mode = c.mode(pi), part = score.parts[pi];
    if (mode === "none") return "";
    if (mode === "yul") return yulName(soundMidi(score, pi, n), c);
    const man = manualGu(e);
    if (man) return first ? man : "";
    if (c.sanjo && isGayageum(part, c.inst(pi))) return gayageumGu(soundMidi(score, pi, n), c.jing);
    return "";
  }
  function annotateLabels(root, score, c) {
    root.querySelectorAll("text.yul").forEach((t) => t.remove());
    const NS = "http://www.w3.org/2000/svg";
    const rows = /* @__PURE__ */ new Map();
    const put = (st, key, x, sortKey, text) => {
      if (!text) return;
      const L = rows.get(st) || rows.set(st, []).get(st);
      let r = L.find((q) => q.key === key);
      if (!r) {
        r = { x, key, items: [] };
        L.push(r);
      }
      if (!r.items.some((it) => it[1] === text && it[0] === sortKey)) r.items.push([sortKey, text]);
    };
    const jcache = /* @__PURE__ */ new Map();
    root.querySelectorAll("g.note[data-id]").forEach((g) => {
      const m = /^e(\d+)-(\d+)-(\d+)-(\d+)$/.exec(g.getAttribute("data-id") || "");
      if (!m) return;
      const pi = +m[1], mi = +m[2], part = score.parts[pi];
      if (!part) return;
      const e = part.measures[mi]?.events[+m[3]], n = e && e.notes && e.notes[+m[4]];
      if (!e || !n || e.grace) return;
      const st = g.closest("g.staff"), head = g.querySelector(".notehead");
      if (!st || !head) return;
      let bb;
      try {
        bb = head.getBBox();
      } catch (err) {
        return;
      }
      const x = bb.x + bb.width / 2;
      if (part.kind === "perc") {
        if (c.mode(pi) === "none") return;
        const key = `${pi}-${mi}-${e.t[0]}/${e.t[1]}`;
        let gu = manualGu(e);
        if (!gu && isJanggu(part)) {
          const ck = pi + "-" + mi;
          if (!jcache.has(ck)) jcache.set(ck, jangguOnsets(part, mi));
          gu = (jcache.get(ck).find((o) => cmp(o.t, e.t) === 0) || { gu: "" }).gu;
        }
        put(st, key, x, 0, gu);
        return;
      }
      if (n.tieStop) return;
      put(st, `${pi}-${mi}-${m[3]}`, x, -soundMidi(score, pi, n), noteLabel(score, pi, e, n, +m[4] === 0, c));
    });
    for (const [st, L] of rows) {
      const ys = Array.from(st.children).filter((ch) => ch.tagName.toLowerCase() === "path").slice(0, 5).map((p) => {
        const mm = /M\s*[-\d.]+\s+([-\d.]+)/.exec(p.getAttribute("d") || "");
        return mm ? +mm[1] : NaN;
      }).filter((v) => isFinite(v));
      if (!ys.length) continue;
      const top = Math.min(...ys), bot = Math.max(...ys), sp = ys.length >= 5 ? (bot - top) / 4 : 180;
      for (const r of L) r.items.sort((a, b) => a[0] - b[0]).forEach(([, text], k) => {
        const t = document.createElementNS(NS, "text");
        t.setAttribute("class", "yul");
        t.setAttribute("x", String(r.x));
        t.setAttribute("y", String(bot + sp * (2.9 + k * 1.55)));
        t.setAttribute("text-anchor", "middle");
        t.setAttribute("font-size", String(sp * 1.4));
        t.textContent = text;
        st.appendChild(t);
      });
    }
  }
  var toV = (f) => f[0] / f[1];
  var NN = ["C", "C♯", "D", "E♭", "E", "F", "F♯", "G", "A♭", "A", "B♭", "B"];
  var noteNameOf = (m) => NN[(m % 12 + 12) % 12] + (Math.floor(m / 12) - 1);
  var escH = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
  function renderJeonggan(box, score, pi, o) {
    const part = score.parts[pi], cols = [], jang = isJanggu(part), mode = o.mode(pi);
    box.innerHTML = "";
    const head = document.createElement("div");
    head.className = "jg-head";
    head.innerHTML = `<b></b><span></span>`;
    head.querySelector("b").textContent = score.meta.title || "";
    head.querySelector("span").textContent = `${part.name}${part.staves > 1 ? ` (${o.staff === 1 ? "윗" : "아랫"}줄)` : ""} · 정간보 · ${jang ? "장구 구음" : mode === "gu" ? "구음" : `율명 (황종 = ${noteNameOf(o.base)})`}`;
    box.appendChild(head);
    const grid = document.createElement("div");
    grid.className = "jg";
    box.appendChild(grid);
    let time;
    score.measures.forEach((M, mi) => {
      if (M.time) time = M.time;
      const unit = o.unit || (time ? [1, time[1]] : [1, 4]);
      const lenV = toV(M.len), uV = toV(unit), n = Math.max(1, Math.round(lenV / uV + 0.499));
      const col = document.createElement("div");
      col.className = "jg-col";
      const no = document.createElement("div");
      no.className = "jg-no";
      no.textContent = M.number;
      col.appendChild(no);
      let ons = [];
      if (jang) ons = jangguOnsets(part, mi).map((x) => ({ t: toV(x.t), names: [x.evs.map(manualGu).find(Boolean) || x.gu], rest: false }));
      else if (part.kind !== "perc") {
        const evs = (part.measures[mi]?.events || []).filter((e) => e.staff === o.staff && e.voice === 1 && !e.grace && !e.hidden).sort((a, b) => cmp(a.t, b.t));
        ons = evs.map((e) => {
          if (e.rest || !e.notes) return { t: toV(e.t), names: [], rest: true };
          const ns = e.notes.map((nn, i) => ({ nn, i })).filter((x) => !x.nn.tieStop).sort((a, b) => soundMidi(score, pi, b.nn) - soundMidi(score, pi, a.nn));
          const lab = (x) => noteLabel(score, pi, e, x.nn, x.i === 0, o) || (mode === "yul" || mode === "none" ? yulName(soundMidi(score, pi, x.nn), o) : "");
          return { t: toV(e.t), names: ns.map(lab).filter(Boolean), rest: false };
        });
      }
      for (let i = 1; i < ons.length; i++) if (ons[i].rest && ons[i - 1].rest) ons[i].cont = true;
      for (let j = 0; j < n; j++) {
        const a = j * uV, b = Math.min(lenV, (j + 1) * uV);
        const on = ons.filter((x) => x.t >= a - 1e-9 && x.t < b - 1e-9);
        let k = 1;
        for (const c of [1, 2, 3, 4, 6, 8]) {
          k = c;
          if (on.every((x) => Math.abs((x.t - a) / uV * c - Math.round((x.t - a) / uV * c)) < 1e-6)) break;
        }
        const cell = document.createElement("div");
        cell.className = "jg-cell" + (j % 3 === 0 && n % 3 === 0 && n > 3 ? " g3" : "");
        for (let q = 0; q < k; q++) {
          const sb = document.createElement("div");
          sb.className = "jg-sub";
          const x = on.find((x2) => Math.round((x2.t - a) / uV * k) === q);
          if (x && x.rest && !x.cont) sb.textContent = "△";
          else if (x && !x.rest) sb.innerHTML = x.names.map((s2, i) => `<span${i ? ' class="ch"' : ""}>${escH(s2)}</span>`).join("");
          cell.appendChild(sb);
        }
        col.appendChild(cell);
      }
      grid.appendChild(col);
      cols.push(col);
    });
    return cols;
  }

  // src/studio/edit/ops.ts
  var ops_exports = {};
  __export(ops_exports, {
    STEPS: () => STEPS,
    addLetter: () => addLetter,
    addToChord: () => addToChord,
    deleteMeasures: () => deleteMeasures,
    diaOf: () => diaOf,
    evOf: () => evOf,
    fromDia: () => fromDia,
    insertAt: () => insertAt,
    insertMeasures: () => insertMeasures,
    isWhole: () => isWhole,
    keyAt: () => keyAt,
    moveTo: () => moveTo,
    redo: () => redo,
    refind: () => refind,
    setDur: () => setDur,
    setGueum: () => setGueum,
    setLetter: () => setLetter,
    step: () => step,
    timeAt: () => timeAt,
    toRest: () => toRest,
    toggleDot: () => toggleDot,
    transpose: () => transpose,
    undo: () => undo
  });

  // src/studio/io/musicxml-out.ts
  var TYPES = [["breve", [2, 1]], ["whole", [1, 1]], ["half", [1, 2]], ["quarter", [1, 4]], ["eighth", [1, 8]], ["16th", [1, 16]], ["32nd", [1, 32]], ["64th", [1, 64]], ["128th", [1, 128]]];
  function typeOf(written) {
    for (const [ty, base] of TYPES) for (let d = 0; d <= 3; d++) {
      const len = mul(base, [2 ** (d + 1) - 1, 2 ** d]);
      if (cmp(len, written) === 0) return { type: ty, dots: d };
    }
    return null;
  }

  // src/studio/swc/notate.ts
  var TUPS = [[3, 2], [5, 4], [6, 4], [7, 4], [7, 8], [9, 8]];
  var PLAIN = [];
  for (let k = 0; k <= 7; k++) {
    const b = [1, 2 ** k];
    PLAIN.push(mul(b, [7, 4]), mul(b, [3, 2]), b);
  }
  PLAIN.sort((a, b) => cmp(b, a));
  var plain = (d) => !!typeOf(d);
  var tupOf = (d) => {
    for (const [a, n] of TUPS) if (typeOf(mul(d, [a, n]))) return [a, n];
    return null;
  };
  function pieces(d) {
    if (plain(d) || tupOf(d)) return [d];
    const lists = [PLAIN];
    for (const [a, n] of TUPS) lists.push([...PLAIN, ...PLAIN.map((p) => mul(p, [n, a]))].sort((x, y) => cmp(y, x)));
    for (const L of lists) {
      const out = [];
      let r = d;
      while (cmp(r, ZERO) > 0) {
        const c = L.find((v) => cmp(v, r) <= 0);
        if (!c) break;
        out.push(c);
        r = sub(r, c);
      }
      if (cmp(r, ZERO) === 0) return out;
    }
    return [d];
  }
  function restPieces(t, d, beat) {
    const out = [];
    let cur = t, end = add(t, d);
    while (cmp(cur, end) < 0) {
      const q = Math.floor(cur[0] * beat[1] / (cur[1] * beat[0]) + 1e-9) + 1, nb = mul(beat, [q, 1]);
      const onBeat = cmp(mul(beat, [q - 1, 1]), cur) === 0;
      let len = sub(end, cur);
      const simple = (d2) => {
        const t2 = typeOf(d2);
        return !!t2 && t2.dots <= 1;
      };
      if (!(onBeat && simple(len))) len = cmp(nb, end) < 0 ? sub(nb, cur) : len;
      if (simple(len)) {
        out.push([cur, len]);
        cur = add(cur, len);
        continue;
      }
      let r = len;
      while (cmp(r, ZERO) > 0) {
        const c = PLAIN.find((v) => cmp(v, r) <= 0 && simple(v)) || pieces(r)[0];
        out.push([cur, c]);
        cur = add(cur, c);
        r = sub(r, c);
      }
    }
    return out;
  }
  function notateVoice(evs, o) {
    const main = evs.filter((e) => !e.grace).sort((a, b) => cmp(a.t, b.t));
    const graces = evs.filter((e) => e.grace);
    const out = [];
    let cur = ZERO;
    const proto = evs[0] || { staff: 1, voice: 1 };
    const rest = (t, d) => {
      for (const [rt, rd] of restPieces(t, d, o.beat)) out.push({ staff: proto.staff, voice: proto.voice, t: rt, dur: rd, rest: true, hidden: o.hideRests || void 0 });
    };
    main.forEach((e, i) => {
      if (cmp(e.t, cur) < 0 || cmp(e.t, o.len) >= 0 || cmp(e.dur, ZERO) <= 0) return;
      if (cmp(e.t, cur) > 0 && o.fillRests) rest(cur, sub(e.t, cur));
      let end = add(e.t, e.dur);
      const nx = main[i + 1];
      if (nx && cmp(nx.t, end) < 0 && cmp(nx.t, e.t) > 0) end = nx.t;
      if (cmp(end, o.len) > 0) end = o.len;
      for (const g of graces.filter((g2) => cmp(g2.t, e.t) === 0)) out.push({ ...g, t: e.t, dur: ZERO, type: g.type || "eighth" });
      const ps = pieces(sub(end, e.t));
      let t = e.t;
      ps.forEach((p, k) => {
        const ev = { ...e, t, dur: p, type: void 0, dots: void 0, tuplet: void 0, beams: void 0 };
        if (e.notes) ev.notes = e.notes.map((n) => ({ ...n, tieStart: k < ps.length - 1 ? true : n.tieStart, tieStop: k > 0 ? true : n.tieStop, acc: k > 0 ? void 0 : n.acc }));
        if (k > 0) {
          ev.marks = (e.marks || []).filter((m) => m.k === "nonghyeon" || m.k === "tremolo");
          ev.slur = void 0;
        }
        if (k < ps.length - 1 && e.slur && e.slur.includes("stop")) ev.slur = e.slur.filter((s) => s !== "stop");
        if (k === ps.length - 1 && k > 0 && e.slur && e.slur.includes("stop")) ev.slur = ["stop"];
        out.push(ev);
        t = add(t, p);
      });
      cur = end;
    });
    if (o.fillRests && cmp(cur, o.len) < 0) {
      if (!main.length) out.push({ staff: proto.staff, voice: proto.voice, t: ZERO, dur: o.len, rest: true, measureRest: true });
      else rest(cur, sub(o.len, cur));
    }
    tuplets(out);
    beams(out, o.beat);
    return out;
  }
  function tuplets(evs) {
    let open = [], ratio = null, acc = ZERO;
    const close = () => {
      if (open.length) {
        open[0].tuplet.start = true;
        open[open.length - 1].tuplet.stop = true;
      }
      open = [];
      ratio = null;
      acc = ZERO;
    };
    for (const e of evs) {
      if (e.grace || e.measureRest) {
        close();
        continue;
      }
      const r = plain(e.dur) ? null : tupOf(e.dur);
      if (!r || ratio && (r[0] !== ratio[0] || r[1] !== ratio[1])) close();
      if (!r) continue;
      ratio = r;
      e.tuplet = { actual: r[0], normal: r[1] };
      open.push(e);
      acc = add(acc, e.dur);
      if (plain(acc) && !typeOf(acc).dots) close();
    }
    if (open.length) {
      open[0].tuplet.start = true;
      open[open.length - 1].tuplet.stop = true;
    }
  }
  var LEVEL = { eighth: 1, "16th": 2, "32nd": 3, "64th": 4, "128th": 5 };
  function beams(evs, beat) {
    const beatNo = (t) => Math.floor(t[0] * beat[1] / (t[1] * beat[0]) + 1e-9);
    const lv = (e) => {
      if (e.rest || e.grace || !e.notes) return 0;
      const w = e.tuplet ? mul(e.dur, [e.tuplet.actual, e.tuplet.normal]) : e.dur, ty = typeOf(w);
      return ty ? LEVEL[ty.type] || 0 : 0;
    };
    let grp = [];
    const flush = () => {
      if (grp.length >= 2) {
        const L = grp.map(lv), max = Math.max(...L);
        grp.forEach((e, i) => {
          e.beams = [];
          for (let l = 1; l <= max; l++) {
            if (L[i] < l) break;
            const p = i > 0 && L[i - 1] >= l, n = i < grp.length - 1 && L[i + 1] >= l;
            e.beams.push(p && n ? "continue" : p ? "end" : n ? "begin" : i > 0 ? "backward hook" : "forward hook");
          }
        });
      }
      grp = [];
    };
    for (const e of evs) {
      if (e.grace) continue;
      if (!lv(e) || grp.length && beatNo(e.t) !== beatNo(grp[0].t)) flush();
      if (lv(e)) grp.push(e);
    }
    flush();
  }
  function beatOf(time) {
    if (!time) return [1, 4];
    const [n, d] = time;
    if (d >= 8 && n % 3 === 0 && n > 3) return fr(3, d);
    return d >= 4 ? [1, 4] : fr(1, d);
  }

  // src/studio/edit/ops.ts
  var clone = (x) => JSON.parse(JSON.stringify(x));
  function keyAt(score, mi) {
    for (let i = mi; i >= 0; i--) if (score.measures[i].key != null) return score.measures[i].key;
    return 0;
  }
  function timeAt(score, mi) {
    for (let i = mi; i >= 0; i--) if (score.measures[i].time) return score.measures[i].time;
    return void 0;
  }
  var Tx = class {
    constructor(score) {
      __publicField(this, "before", /* @__PURE__ */ new Map());
      __publicField(this, "score");
      this.score = score;
    }
    touch(pi, mi) {
      const k = pi + ":" + mi;
      if (!this.before.has(k)) this.before.set(k, clone(this.score.parts[pi].measures[mi]));
      return this.score.parts[pi].measures[mi];
    }
    done() {
      const out = [];
      for (const [k, b] of this.before) {
        const [pi, mi] = k.split(":").map(Number);
        const a = this.score.parts[pi].measures[mi];
        if (JSON.stringify(a) !== JSON.stringify(b)) out.push({ pi, mi, before: b, after: clone(a) });
      }
      return out;
    }
  };
  function setWhole(score, js) {
    const o = JSON.parse(js);
    score.measures = o.measures;
    score.parts.forEach((p, i) => {
      p.measures = o.parts[i];
    });
  }
  function undo(score, ed) {
    for (let i = ed.length - 1; i >= 0; i--) {
      const c = ed[i];
      if (c.whole) setWhole(score, c.whole.before);
      else score.parts[c.pi].measures[c.mi] = clone(c.before);
    }
  }
  function redo(score, ed) {
    for (const c of ed) {
      if (c.whole) setWhole(score, c.whole.after);
      else score.parts[c.pi].measures[c.mi] = clone(c.after);
    }
  }
  var isWhole = (ed) => ed.some((c) => !!c.whole);
  var evOf = (score, s) => score.parts[s.pi]?.measures[s.mi]?.events[s.ei];
  function tiedNext(score, pi, mi, e, n) {
    const end = add(e.t, e.dur);
    for (const [m, t] of [[mi, end], [mi + 1, ZERO]]) {
      const pm = score.parts[pi].measures[m];
      if (!pm) continue;
      if (m === mi + 1 && cmp(end, score.measures[mi].len) < 0) continue;
      const x = pm.events.find((x2) => x2.staff === e.staff && x2.voice === e.voice && !x2.rest && !x2.grace && cmp(x2.t, t) === 0);
      const nn = x && x.notes && x.notes.find((q) => q.tieStop && q.step === n.step && q.oct === n.oct);
      if (x && nn) return { mi: m, e: x, n: nn };
    }
    return null;
  }
  function tiedPrev(score, pi, mi, e, n) {
    for (const m of [mi, mi - 1]) {
      const pm = score.parts[pi].measures[m];
      if (!pm) continue;
      const t = m === mi ? e.t : score.measures[m].len;
      if (m === mi - 1 && cmp(e.t, ZERO) !== 0) continue;
      const x = pm.events.find((x2) => x2.staff === e.staff && x2.voice === e.voice && !x2.rest && !x2.grace && cmp(add(x2.t, x2.dur), t) === 0);
      const pn = x && x.notes && x.notes.find((q) => q.tieStart && q.step === n.step && q.oct === n.oct);
      if (x && pn) return { mi: m, e: x, n: pn };
    }
    return null;
  }
  function repitch(tx, s, f) {
    const sc = tx.score, pm = tx.touch(s.pi, s.mi), e = pm.events[s.ei];
    if (!e || !e.notes || sc.parts[s.pi].kind === "perc") return;
    const targets = s.ni != null && e.notes[s.ni] ? [s.ni] : e.notes.map((_, i) => i);
    for (const i of targets) {
      const old = e.notes[i], nw = { ...f(old), tieStart: old.tieStart, tieStop: old.tieStop, head: old.head };
      if (old.tieStop) {
        const p = tiedPrev(sc, s.pi, s.mi, e, old);
        if (p) {
          tx.touch(s.pi, p.mi);
          p.n.tieStart = void 0;
        }
        nw.tieStop = void 0;
      }
      let cur = { mi: s.mi, e, n: old }, guard = 0;
      while (cur.n.tieStart && guard++ < 64) {
        const nx = tiedNext(sc, s.pi, cur.mi, cur.e, cur.n);
        if (!nx) break;
        tx.touch(s.pi, nx.mi);
        const q = f(nx.n);
        nx.n.step = q.step;
        nx.n.alter = q.alter;
        nx.n.oct = q.oct;
        nx.n.acc = void 0;
        cur = nx;
      }
      nw.acc = void 0;
      e.notes[i] = nw;
    }
  }
  var keyAltOf = (k, st) => k > 0 ? "FCGDAEB".indexOf(st) < k ? 1 : 0 : k < 0 ? "BEADGCF".indexOf(st) < -k ? -1 : 0 : 0;
  function respell(m, k, dir) {
    const p = spell(m, void 0, k), pc = (m % 12 + 12) % 12, NAT2 = [0, 2, 4, 5, 7, 9, 11];
    if (p.alter === keyAltOf(k, p.step) || NAT2.includes(pc)) return p;
    const st = dir > 0 ? NAT2.indexOf((pc + 11) % 12) : NAT2.indexOf((pc + 1) % 12), al = dir > 0 ? 1 : -1;
    return { step: LET[st], alter: al, oct: Math.round((m - al - NAT2[st]) / 12) - 1 };
  }
  function transpose(score, s, semis) {
    const tx = new Tx(score), k = keyAt(score, s.mi);
    repitch(tx, s, (n) => respell(midiOf(n) + semis, k, semis));
    return tx.done();
  }
  function setLetter(score, s, step2) {
    const tx = new Tx(score), pm = tx.touch(s.pi, s.mi), e = pm.events[s.ei], part = score.parts[s.pi];
    if (!e || part.kind === "perc") return tx.done();
    const k = keyAt(score, s.mi);
    const alt = (k > 0 ? "FCGDAEB".indexOf(step2) < k : k < 0 && "BEADGCF".indexOf(step2) < -k) ? Math.sign(k) : 0;
    const near = (ref) => {
      let best = null, bd = 99;
      for (let o = 0; o <= 8; o++) {
        const p = { step: step2, alter: alt, oct: o }, d = Math.abs(midiOf(p) - ref);
        if (d < bd) {
          bd = d;
          best = p;
        }
      }
      return best;
    };
    if (e.rest || !e.notes || !e.notes.length) {
      let ref = -1;
      for (let m = s.mi; m >= Math.max(0, s.mi - 4) && ref < 0; m--) {
        const prev = (score.parts[s.pi].measures[m]?.events || []).filter((x) => x.staff === e.staff && x.notes && !x.rest && (m < s.mi || cmp(x.t, e.t) < 0)).sort((a, b) => cmp(b.t, a.t))[0];
        if (prev) ref = midiOf(prev.notes[0]);
      }
      const clef = part.clefs[e.staff - 1] || part.clefs[0];
      if (ref < 0) ref = (clef && clef.sign === "F" ? 50 : clef && clef.sign === "C" ? 60 : 71) + 12 * (clef && clef.octave || 0);
      e.rest = void 0;
      e.hidden = void 0;
      e.measureRest = void 0;
      e.notes = [near(ref)];
      return reflowAfter(tx, s);
    }
    repitch(tx, s, (n) => near(midiOf(n)));
    return tx.done();
  }
  function toRest(score, s) {
    const tx = new Tx(score), pm = tx.touch(s.pi, s.mi), e = pm.events[s.ei];
    if (!e || e.rest || !e.notes) return tx.done();
    const drop = (n) => {
      if (n.tieStop) {
        const p = tiedPrev(score, s.pi, s.mi, e, n);
        if (p) {
          tx.touch(s.pi, p.mi);
          p.n.tieStart = void 0;
        }
      }
      if (n.tieStart) {
        const x = tiedNext(score, s.pi, s.mi, e, n);
        if (x) {
          tx.touch(s.pi, x.mi);
          x.n.tieStop = void 0;
        }
      }
    };
    if (s.ni != null && e.notes.length > 1 && e.notes[s.ni]) {
      drop(e.notes[s.ni]);
      e.notes.splice(s.ni, 1);
      return tx.done();
    }
    for (const n of e.notes) drop(n);
    e.notes = void 0;
    e.rest = true;
    e.marks = void 0;
    e.slur = void 0;
    e.grace = void 0;
    return reflowAfter(tx, s);
  }
  function setDur(score, s, dur) {
    const tx = new Tx(score), pm = tx.touch(s.pi, s.mi), e = pm.events[s.ei];
    if (!e || e.grace) return tx.done();
    const len = score.measures[s.mi].len;
    let end = add(e.t, dur);
    if (cmp(end, len) > 0) end = len;
    const mine = (x) => x.staff === e.staff && x.voice === e.voice;
    for (const n of e.notes || []) n.tieStart = void 0;
    pm.events = pm.events.filter((x) => !(mine(x) && x !== e && cmp(x.t, e.t) > 0 && cmp(x.t, end) < 0));
    e.dur = sub(end, e.t);
    e.measureRest = void 0;
    return reflow(tx, s.pi, s.mi, e.staff, e.voice);
  }
  function toggleDot(score, s) {
    const e = evOf(score, s);
    if (!e || e.grace) return [];
    const w = e.tuplet ? [e.dur[0] * e.tuplet.actual, e.dur[1] * e.tuplet.normal] : e.dur;
    const dotted = w[0] % 3 === 0;
    const nd = dotted ? [e.dur[0] * 2, e.dur[1] * 3] : [e.dur[0] * 3, e.dur[1] * 2];
    return setDur(score, s, nd);
  }
  function reflowAfter(tx, s) {
    const e = tx.score.parts[s.pi].measures[s.mi].events[s.ei];
    return reflow(tx, s.pi, s.mi, e.staff, e.voice);
  }
  function reflow(tx, pi, mi, staff, voice) {
    const sc = tx.score, pm = tx.touch(pi, mi), M = sc.measures[mi];
    const mine = (x) => x.staff === staff && x.voice === voice;
    const sounding = pm.events.filter((x) => mine(x) && !x.rest).map((x) => ({ ...x, type: void 0, dots: void 0, tuplet: void 0, beams: void 0 }));
    const others = pm.events.filter((x) => !mine(x));
    const re = notateVoice(sounding, { len: M.len, beat: beatOf(timeAt(sc, mi)), fillRests: true, hideRests: voice > 1 }).map((x) => ({ ...x, staff, voice }));
    pm.events = [...others, ...re];
    return tx.done();
  }
  function step(score, s, dir) {
    const e = evOf(score, s);
    if (!e) return null;
    const list = (mi) => (score.parts[s.pi].measures[mi]?.events || []).map((x, ei) => ({ x, ei })).filter((o) => o.x.staff === e.staff && o.x.voice === e.voice && !o.x.hidden && !o.x.grace).sort((a, b) => cmp(a.x.t, b.x.t));
    const L = list(s.mi), i = L.findIndex((o) => o.ei === s.ei);
    if (i + dir >= 0 && i + dir < L.length) return { pi: s.pi, mi: s.mi, ei: L[i + dir].ei };
    for (let m = s.mi + dir; m >= 0 && m < score.measures.length; m += dir) {
      const M2 = list(m);
      if (M2.length) return { pi: s.pi, mi: m, ei: (dir > 0 ? M2[0] : M2[M2.length - 1]).ei };
      const any = (score.parts[s.pi].measures[m]?.events || []).findIndex((x) => x.staff === e.staff && !x.hidden && !x.grace);
      if (any >= 0) return { pi: s.pi, mi: m, ei: any };
    }
    return null;
  }
  function refind(score, s, staff, voice, t) {
    const ev = score.parts[s.pi].measures[s.mi].events;
    let ei = ev.findIndex((x) => x.staff === staff && x.voice === voice && !x.grace && cmp(x.t, t) === 0);
    if (ei < 0) ei = ev.findIndex((x) => x.staff === staff && !x.grace && cmp(x.t, t) <= 0 && cmp(add(x.t, x.dur), t) > 0);
    return ei < 0 ? null : { pi: s.pi, mi: s.mi, ei, ni: s.ni != null && ev[ei].notes && ev[ei].notes.length > s.ni ? s.ni : void 0 };
  }
  var STEPS = LET.split("");
  var diaOf = (p) => p.oct * 7 + LET.indexOf(p.step);
  function fromDia(d, key) {
    const st = LET[(d % 7 + 7) % 7];
    return { step: st, alter: keyAltOf(key, st), oct: Math.floor(d / 7) };
  }
  function insertCore(tx, pi, mi, staff, voice, t, dur, notes, from) {
    const sc = tx.score, pm = tx.touch(pi, mi), len = sc.measures[mi].len;
    let end = add(t, dur);
    if (cmp(end, len) > 0) end = len;
    const mine = (x) => x.staff === staff && x.voice === voice && !x.rest && !x.grace;
    const cut = (x) => {
      for (const n of x.notes || []) {
        if (n.tieStop) {
          const p = tiedPrev(sc, pi, mi, x, n);
          if (p) {
            tx.touch(pi, p.mi);
            p.n.tieStart = void 0;
          }
        }
        if (n.tieStart) {
          const q = tiedNext(sc, pi, mi, x, n);
          if (q) {
            tx.touch(pi, q.mi);
            q.n.tieStop = void 0;
          }
        }
      }
    };
    for (const x of pm.events.filter((x2) => mine(x2) && cmp(x2.t, t) >= 0 && cmp(x2.t, end) < 0)) {
      cut(x);
      pm.events.splice(pm.events.indexOf(x), 1);
    }
    for (const x of pm.events.filter((x2) => mine(x2) && cmp(x2.t, t) < 0 && cmp(add(x2.t, x2.dur), t) > 0)) {
      cut(x);
      x.dur = sub(t, x.t);
    }
    pm.events = pm.events.filter((x) => !(x.grace && x.staff === staff && x.voice === voice && cmp(x.t, t) >= 0 && cmp(x.t, end) < 0));
    if (notes && notes.length) {
      const ev = { staff, voice, t, dur: sub(end, t), notes: notes.map((n) => ({ step: n.step, alter: n.alter, oct: n.oct, head: n.head })) };
      if (from) {
        if (from.marks) ev.marks = from.marks;
        if (from.slur) ev.slur = from.slur;
      }
      pm.events.push(ev);
    }
  }
  function insertAt(score, pi, mi, staff, t, dur, dia, voice = 1) {
    const tx = new Tx(score), part = score.parts[pi];
    const notes = dia == null ? null : part.kind === "perc" ? [{ step: "C", alter: 0, oct: 5 }] : [fromDia(dia, keyAt(score, mi))];
    insertCore(tx, pi, mi, staff, voice, t, dur, notes);
    return reflow(tx, pi, mi, staff, voice);
  }
  function addToChord(score, pi, mi, staff, t, dur, dia, voice = 1) {
    const part = score.parts[pi], pm = score.parts[pi].measures[mi];
    const e = pm && pm.events.find((x) => x.staff === staff && x.voice === voice && !x.rest && !x.grace && x.notes && cmp(x.t, t) === 0);
    if (!e || part.kind === "perc") return insertAt(score, pi, mi, staff, t, dur, dia, voice);
    const tx = new Tx(score), p2 = tx.touch(pi, mi), ev = p2.events[pm.events.indexOf(e)];
    const n = fromDia(dia, keyAt(score, mi));
    if (ev.notes.some((q) => q.step === n.step && q.oct === n.oct)) return tx.done();
    ev.notes.push(n);
    ev.notes.sort((a, b) => midiOf(a) - midiOf(b));
    return tx.done();
  }
  function addLetter(score, s, step2) {
    const e = evOf(score, s);
    if (!e || !e.notes || !e.notes.length || score.parts[s.pi].kind === "perc") return [];
    const top = Math.max(...e.notes.map(diaOf)), st = LET.indexOf(step2);
    let d = Math.floor(top / 7) * 7 + st;
    if (d <= top) d += 7;
    return addToChord(score, s.pi, s.mi, e.staff, e.t, e.dur, d, e.voice);
  }
  var snap = (score) => JSON.stringify({ measures: score.measures, parts: score.parts.map((p) => p.measures) });
  function renumber(score) {
    const first = parseInt(score.measures[0] && score.measures[0].number, 10);
    const start = isFinite(first) ? first : 1;
    score.measures.forEach((M, i) => {
      M.number = String(start + i);
    });
  }
  function insertMeasures(score, at, count = 1) {
    const before = snap(score), ref = score.measures[Math.min(at, score.measures.length - 1)];
    const ts = timeAt(score, Math.max(0, Math.min(at, score.measures.length - 1)));
    const len = ts ? [ts[0], ts[1]] : ref ? ref.len : [1, 1];
    const atEnd = at >= score.measures.length;
    for (let k = 0; k < count; k++) {
      const M = { number: "", len: [len[0], len[1]] };
      if (at === 0 && k === 0 && ref) {
        for (const key of ["time", "key", "mode", "tempo"]) if (ref[key] != null) {
          M[key] = ref[key];
          delete ref[key];
        }
      }
      score.measures.splice(at + k, 0, M);
      for (const p of score.parts) {
        const evs = [];
        for (let st = 1; st <= p.staves; st++) evs.push({ staff: st, voice: 1, t: ZERO, dur: [len[0], len[1]], rest: true, measureRest: true });
        p.measures.splice(at + k, 0, { events: evs });
      }
    }
    void atEnd;
    if (at > 0) for (const p of score.parts) {
      for (const e of p.measures[at - 1].events) for (const n of e.notes || []) if (n.tieStart && cmp(add(e.t, e.dur), score.measures[at - 1].len) === 0) n.tieStart = void 0;
      const nx = p.measures[at + count];
      if (nx) {
        for (const e of nx.events) for (const n of e.notes || []) if (n.tieStop && cmp(e.t, ZERO) === 0) n.tieStop = void 0;
      }
    }
    renumber(score);
    return [{ pi: -1, mi: -1, before: { events: [] }, after: { events: [] }, whole: { before, after: snap(score) } }];
  }
  function deleteMeasures(score, from, count = 1) {
    if (score.measures.length - count < 1) return [];
    const before = snap(score), to = from + count;
    const carry = {};
    for (let i = from; i < to; i++) {
      const M = score.measures[i];
      for (const key of ["time", "key", "mode", "tempo"]) if (M[key] != null) carry[key] = M[key];
    }
    const next = score.measures[to];
    if (next) {
      for (const key of ["time", "key", "mode", "tempo"]) if (carry[key] != null && next[key] == null) next[key] = carry[key];
    }
    if (next && carry.time && !next.time) next.time = carry.time;
    score.measures.splice(from, count);
    for (const p of score.parts) p.measures.splice(from, count);
    for (const p of score.parts) {
      const pv = p.measures[from - 1];
      if (pv) {
        for (const e of pv.events) for (const n of e.notes || []) if (n.tieStart && cmp(add(e.t, e.dur), score.measures[from - 1].len) === 0) n.tieStart = void 0;
      }
      const nx = p.measures[from];
      if (nx) {
        for (const e of nx.events) for (const n of e.notes || []) if (n.tieStop && cmp(e.t, ZERO) === 0) n.tieStop = void 0;
      }
    }
    renumber(score);
    return [{ pi: -1, mi: -1, before: { events: [] }, after: { events: [] }, whole: { before, after: snap(score) } }];
  }
  function moveTo(score, s, mi, staff, t, dDia) {
    const tx = new Tx(score), e = evOf(score, s);
    if (!e || e.grace) return tx.done();
    const k = keyAt(score, mi), part = score.parts[s.pi];
    const shift = (n) => part.kind === "perc" ? n : fromDia(diaOf(n) + dDia, k);
    if (mi === s.mi && staff === e.staff && cmp(t, e.t) === 0) {
      if (!dDia || !e.notes || part.kind === "perc") return tx.done();
      repitch(tx, s, shift);
      return tx.done();
    }
    const notes = e.rest || !e.notes ? null : (s.ni != null && e.notes.length > 1 ? [e.notes[s.ni]] : e.notes).map(shift);
    const pm0 = tx.touch(s.pi, s.mi), voice0 = e.voice;
    if (s.ni != null && e.notes && e.notes.length > 1) e.notes.splice(s.ni, 1);
    else {
      insertCore(tx, s.pi, s.mi, e.staff, e.voice, e.t, e.dur, null);
    }
    void pm0;
    reflow(tx, s.pi, s.mi, e.staff, voice0);
    insertCore(tx, s.pi, mi, staff, voice0, t, e.dur, notes, e);
    return reflow(tx, s.pi, mi, staff, voice0);
  }
  function setGueum(score, s, text) {
    const tx = new Tx(score), pm = tx.touch(s.pi, s.mi), e = pm.events[s.ei];
    if (!e || e.rest) return tx.done();
    const t = text.trim(), marks = (e.marks || []).filter((m) => m.k !== "gueum");
    if (t) marks.push({ k: "gueum", text: t });
    e.marks = marks.length ? marks : void 0;
    return tx.done();
  }

  // src/studio/index.ts
  var STUDIO_VER = 1;
  return __toCommonJS(index_exports);
})();
