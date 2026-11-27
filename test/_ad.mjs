const __SWR = process.env.SW_ROOT || '/home/claude';   // 작업 공간 뿌리(샘플·pdf.js·Verovio·저장소) — 맥 등은 SW_ROOT로 바꿈
import * as pdfjs from 'pdfjs-dist/legacy/build/pdf.mjs'; import fs from 'fs';
const P = await import(process.env.PW); const SM=__SWR + '/samples/';
const sc = await P.loadScore(pdfjs, new Uint8Array(fs.readFileSync(SM + fs.readdirSync(SM).find(x => x.startsWith('2bc31eef')))));
const all = sc.lines.map((l,i)=>P.analyzeLine(sc,i));
globalThis.__ad=(n,k)=>{ if([19,57].includes(n)) console.log('bar',n,'return#',k); };
P.alignToSystem(all[9], all);
const b=all[9].bars.find(x=>x.number===57); console.log(JSON.stringify({kind:b.kind, rep:b.repeat, keys:Object.keys(b)}));
const i19 = all[9].bars.findIndex(x=>x.number===19);
all.forEach((r,li)=>{ const b=r.bars[i19], g=r.geo[i19]; console.log(li, b.number, b.kind, String(b.barLen), b.warnings.length, 'p'+(g&&g.page), b.events.length, b.events.slice(0,4).map(e=>`${e.t}@${e.x==null?'-':Math.round(e.x)}${e.tie?'T':''}`).join(' ')); });
