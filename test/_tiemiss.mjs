// 놓친 붙임줄 후보 찾기: 납작한 곡선의 양 끝(시작 −10~+4pt, 끝 −6~+12pt)에 같은 높이(1pt 안) 음표 머리가 있고 사이에 다른 머리가 없는데,
// 끝 머리의 사건이 붙임줄(tie)로 처리되지 않은 곳. 단 맨 앞 곡선(시작 머리 없음)은 끝 머리가 곡선 바로 바깥이고 왼쪽에 음표가 없을 때
// node test/_tiemiss.mjs <악보…>  → 줄마다 후보 마디 JSON 줄
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import('../src/score-parser.js');
for (const f of process.argv.slice(2)) {
  let sc; try { sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(f))); } catch (e) { continue; }
  const out = { f: f.split('/').pop().slice(0, 8), lines: {} };
  const nl = sc.lines.length || 1;
  for (let li = 0; li < nl; li++) {
    globalThis.__curveLog = [];
    let r; try { r = P.analyzeLine(sc, sc.lines.length ? li : null); } catch (e) { continue; }
    const log = globalThis.__curveLog; globalThis.__curveLog = null;
    // 이 줄의 머리: 쪽·오선 위쪽 높이 → [x, y, 마디 차례]
    const heads = new Map();
    r.geo.forEach((g, k) => { if (!g || !g.heads) return; const st = sc.layouts[g.page].staves[g.staff]; const key = g.page + '|' + st.top.toFixed(1);
      if (!heads.has(key)) heads.set(key, { st, list: [] }); for (const h of g.heads) heads.get(key).list.push({ x: h[0], y: h[1], k }); });
    const miss = [];
    for (const e of log) {
      const H = heads.get(e.pi + '|' + e.st.toFixed(1)); if (!H) continue;
      const c = e.c, st = H.st, hd = (st.bottom - st.top) / 4 || 7;
      if (c.y1 - c.y0 > hd * 1.2 || c.x1 - c.x0 < 6) continue;
      const ccy = (c.y0 + c.y1) / 2;
      const ends = H.list.filter(h => c.x1 - 6 <= h.x && h.x <= c.x1 + 12 && h.x > c.x0 + 2 && Math.abs(h.y - ccy) < hd * 2.2);
      if (!ends.length) continue;
      const ex = Math.min(...ends.map(h => h.x)), en = ends.filter(h => h.x < ex + 2);
      const sts = H.list.filter(h => c.x0 - 10 <= h.x && h.x <= c.x0 + 4);
      let pair = null;
      if (sts.length) {
        const sx = Math.max(...sts.map(h => h.x)), sn = sts.filter(h => h.x > sx - 2);
        if (H.list.some(h => h.x > sx + hd * 1.4 && h.x < ex - hd * 1.4)) continue;   // 사이 머리 — 이음줄
        // 곡선에 가장 가까운 같은 높이 짝
        let best = null; for (const s of sn) for (const t of en) if (Math.abs(s.y - t.y) < 1) { const d = Math.abs(t.y - ccy); if (!best || d < best.d) best = { s, t, d }; }
        if (!best) continue; pair = best.t;
      } else {
        if (c.x0 - st.x0 > 70 || H.list.some(h => h.x < c.x0 - 2 && h.k === en[0].k)) continue;
        pair = en.sort((p, q) => Math.abs(p.y - ccy) - Math.abs(q.y - ccy))[0];
      }
      if (Math.abs(pair.y - ccy) > hd * 1.6) continue;
      const b = r.bars[pair.k]; if (!b) continue;
      const evs = b.events.filter(v => v.x != null && Math.abs(v.x - pair.x) < 1.6);
      if (!evs.length) continue;
      // 끝 머리 사건이 붙임줄로 이어졌으면(마디 첫 tie, 또는 같은 마디 앞 음의 sus/pcs로 합쳐져 사건이 없어짐) 통과
      if (evs.some(v => v.tie)) continue;
      // 같은 마디 안 붙임줄은 앞 음의 sus로 합쳐지므로, 그 x에서 시작하는 사건이 있으면 → 다시 치는 것
      miss.push(b.number);
    }
    if (miss.length) out.lines[li + ' ' + ((sc.lines[li] && sc.lines[li].name) || '').slice(0, 10)] = [...new Set(miss)].sort((a, b) => a - b);
  }
  console.log(JSON.stringify(out));
}
