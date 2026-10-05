/* EON Life · Excel generats per l'app: estils i peces comunes (títols, seccions, taules, enllaços).
   Els Excel de cada sessió, de cada valoració i de la visió general del client es fan amb aquestes peces,
   perquè tots tinguin els mateixos colors i la mateixa disposició que l'app. */

const XL_C = {
  BRAND: '421215', BRAND_M: '6B3A3D', BRAND_L: 'F1E4E1', GREY: 'F5F2EE', LINE: 'D9D2CB', MUTED: '6B5F5B',
  RED: 'F6D5D1', AMB: 'FBE8C2', GRN: 'DDEBD5', OFF: 'ECE8E3', PREV: 'EFE9E1', LINK: '0F5EA8',
};
// Colors dels 6 blocs de la sessió (els mateixos que a l'app).
const XL_BLOCK = { mob: '2F6FB0', act: '1E8A5C', pot: 'D35A2E', for: '8A2F36', acc: '6D4FB0', cal: 'B7882A' };

const XS = {
  title: { b: true, sz: 16, color: 'FFFFFF', fill: XL_C.BRAND, h: 'left', v: 'center', indent: 1 },
  sub: { i: true, sz: 10, color: XL_C.MUTED, h: 'left', v: 'center', indent: 1 },
  note: { i: true, sz: 9, color: XL_C.MUTED, h: 'left', v: 'center', indent: 1 },
  section: { b: true, sz: 12, color: XL_C.BRAND, fill: XL_C.BRAND_L, h: 'left', v: 'center', indent: 1 },
  head: { b: true, sz: 10, color: 'FFFFFF', fill: XL_C.BRAND_M, h: 'center', v: 'center', wrap: true, border: 'thin' },
  headL: { b: true, sz: 10, color: 'FFFFFF', fill: XL_C.BRAND_M, h: 'left', v: 'center', wrap: true, border: 'thin' },
  label: { b: true, sz: 10, fill: XL_C.GREY, h: 'left', v: 'center', wrap: true, border: 'thin' },
  cell: { sz: 10, h: 'center', v: 'center', border: 'thin' },
  cellW: { sz: 10, h: 'center', v: 'center', wrap: true, border: 'thin' },
  text: { sz: 10, h: 'left', v: 'center', wrap: true, border: 'thin' },
  top: { sz: 10, h: 'left', v: 'top', wrap: true, border: 'thin' },
  muted: { color: XL_C.MUTED },
  bold: { b: true },
  link: { color: XL_C.LINK, u: true },
  small: { sz: 9 },
};

const XL_VERSION = 1; // puja en canviar el disseny dels fitxers: així es tornen a generar tots

function xlStr(v) { return v == null ? '' : String(v); }
function xlNum(v) { const n = U.num(v); return n == null ? null : n; }
// «60» → 60 (número); qualsevol altre text es manté tal qual («2 × 16 kg», «goma verda»).
function xlNumOrText(v) {
  const s = xlStr(v).trim();
  if (!s) return null;
  return /^-?\d+([.,]\d+)?$/.test(s) ? U.num(s) : s;
}
const xlRef = (r, c) => XlsxDoc.ref(r, c);
const xlCol = (c) => XlsxDoc.colName(c);
// Referència a una cel·la d'un altre full: 'Nom del full'!B3
const xlSheetRef = (name, r, c) => `'${String(name).replace(/'/g, "''")}'!${xlRef(r, c)}`;
// Enllaç a un full del mateix llibre (cantonada de la cel·la).
const xlGo = (name, r = 1, c = 1) => `#${xlSheetRef(name, r, c)}`;

// Només els enllaços web es poden obrir des de l'Excel; els fitxers de la versió de prova («eonlocal:») queden a la tauleta.
function xlIsWeb(url) { return /^https?:\/\/\S+$/i.test(xlStr(url).trim()); }

// Rètol de la capçalera: títol, subtítol i avís (files 1 a 3). Retorna la primera fila lliure.
function xlTitle(ws, text, sub, ncols, { note, height = 30 } = {}) {
  ws.merge(1, 1, 1, ncols, text, XS.title);
  ws.rowH(1, height);
  ws.merge(2, 1, 2, ncols, sub, XS.sub);
  ws.merge(3, 1, 3, ncols, note || `Actualitzat el ${XlsxDoc.STAMP} · Aquest fitxer el genera sol l'app EON Life: no l'editis (els canvis es perdrien). Tot s'omple i es corregeix des de l'app.`, XS.note);
  return 5;
}

// Franja de secció (retorna la fila següent).
function xlSection(ws, r, text, ncols, color) {
  ws.merge(r, 1, r, ncols, text, [XS.section, color ? { color } : null]);
  ws.rowH(r, 22);
  return r + 1;
}

// Capçalera d'una taula: labels = [text | [text, colspan]]. Retorna la fila següent.
function xlHeader(ws, r, labels, start = 1, left = 0) {
  let c = start;
  labels.forEach((l, i) => {
    const [t, span] = Array.isArray(l) ? l : [l, 1];
    ws.merge(r, c, r, c + span - 1, t, i === left ? XS.headL : XS.head);
    c += span;
  });
  ws.rowH(r, 22);
  return r + 1;
}

// Files «etiqueta · valor» (el valor ocupa fins a la darrera columna). rows: [[etiqueta, valor, { style, link, keep }]]
// Les files sense valor no es posen (menys si porten keep: true), perquè el full no s'ompli de buits; amb id, pos[id] = fila on ha quedat.
function xlKv(ws, r, rows, ncols, pos) {
  for (const row of rows) {
    const [label, value, opt = {}] = row;
    if ((value === '' || value == null) && !opt.keep) continue;
    if (opt.id && pos) pos[opt.id] = r;
    ws.set(r, 1, label, XS.label);
    ws.merge(r, 2, r, ncols, value, [XS.text, opt.style]);
    if (opt.link) ws.link(r, 2, opt.link, opt.tip);
    r++;
  }
  return r;
}

// Color d'una asimetria (% sobre 100): ≥ 15 % vermell, ≥ 10 % ambre, la resta verd.
function xlAsymFill(pct) {
  if (pct == null) return null;
  return pct >= THRESHOLDS.asymAlert ? XL_C.RED : pct >= THRESHOLDS.asymWarn ? XL_C.AMB : XL_C.GRN;
}

// Estat d'una sessió segons les dades (i el dia d'avui, per a «Sense tancar»).
function xlSessionState(s, today) {
  if (s.ghost) return { key: 'prevista', label: 'Prevista al pla', fill: XL_C.PREV };
  if (s.status === 'feta') return { key: 'feta', label: 'Feta', fill: XL_C.GRN };
  if (s.date && s.date < (today || U.today())) return { key: 'sense', label: 'Sense tancar', fill: XL_C.AMB };
  return { key: 'planificada', label: 'Planificada', fill: XL_C.BRAND_L };
}

// Hora de generació que es mostra a la capçalera (dd/mm/aaaa hh:mm).
function xlStampText(d = new Date()) {
  return `${U.pad(d.getDate())}/${U.pad(d.getMonth() + 1)}/${d.getFullYear()} ${U.pad(d.getHours())}:${U.pad(d.getMinutes())}`;
}

// Nom del bloc segons la configuració del centre.
function xlBlockName(key, settings) { return blockName(key, settings); }

// Codis de contracció, posició i lateralitat de la llegenda dels exercicis.
function xlLegend() {
  const part = (list) => list.map((o) => `${o.v} ${o.label.toLowerCase()}`).join(' · ');
  return `Cont.: ${part(OPT.cont)}   ·   Pos.: ${part(OPT.pos)}   ·   Lat.: ${part(OPT.lat)}`;
}

// Cel·la d'enllaç: text visible i, si és una adreça web, l'enllaç. Retorna el valor que s'ha escrit.
function xlLinkCell(ws, r, c, url, label, style) {
  const web = xlIsWeb(url);
  ws.set(r, c, label, [XS.cell, style, web ? XS.link : XS.muted]);
  if (web) ws.link(r, c, xlStr(url).trim(), 'Obre el fitxer');
  return web;
}
