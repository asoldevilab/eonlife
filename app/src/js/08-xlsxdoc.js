/* EON Life · escriptor d'Excel amb estils (.xlsx), sense dependències.
   A diferència de Xlsx (08-xlsx.js, que només crea la plantilla de la base de dades), aquest escriptor fa
   llibres per llegir: colors, cel·les combinades, text enriquit, fórmules amb el valor ja calculat, enllaços,
   format condicional, files i columnes fixades, protecció suau i configuració d'impressió. L'app el fa servir
   per als Excel que genera sola per a cada sessió, cada valoració i la visió general de cada client.

   Ús:
     const doc = XlsxDoc.create({ title: 'Sessió 12', creator: 'EON Life' });
     const ws = doc.sheet('Sessió', { grid: false, landscape: true, freeze: [4, 1] });
     ws.cols([30, 16, 16]);
     ws.set(1, 1, 'Hola', { b: true, fill: '421215', color: 'FFFFFF' });
     ws.set(2, 1, { f: 'SUM(B2:C2)', v: 3 }, { fmt: '0' });          // fórmula amb el valor calculat
     ws.set(3, 1, { date: '2026-10-02' });                            // data (número de sèrie d'Excel)
     ws.set(4, 1, { rich: [['Negreta ', { b: true }], ['normal']] });
     ws.merge(5, 1, 5, 3, 'Text combinat', { wrap: true });
     const { bytes } = await doc.build();                              // Uint8Array amb el .xlsx
*/

const XlsxDoc = (() => {
  const NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main';
  const NSR = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const PKG = 'http://schemas.openxmlformats.org/package/2006/relationships';
  const REL = 'http://schemas.openxmlformats.org/officeDocument/2006/relationships';
  const HEAD = '<?xml version="1.0" encoding="UTF-8" standalone="yes"?>\n';
  const STAMP = '@@EON-STAMP@@'; // se substitueix per l'hora de generació en construir el fitxer (no compta per al resum)

  const esc = (s) => String(s)
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F￾￿]/g, '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  const colName = (n) => Xlsx.colName(n);
  const ref = (r, c) => `${colName(c)}${r}`;
  const argb = (c) => `FF${String(c).replace('#', '').toUpperCase()}`;
  // Data AAAA-MM-DD → número de sèrie d'Excel.
  const serial = (iso) => {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? Math.round(Date.UTC(Number(m[1]), Number(m[2]) - 1, Number(m[3])) / 86400000) + 25569 : null;
  };
  const num = (n) => String(Number(Number(n).toPrecision(15)));
  const merge2 = (s) => (Array.isArray(s) ? Object.assign({}, ...s.filter(Boolean)) : s || {});

  // Resum ràpid (cyrb53) per saber si un fitxer ha canviat des de l'última vegada que es va pujar.
  function hash(text) {
    let h1 = 0xdeadbeef, h2 = 0x41c6ce57;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charCodeAt(i);
      h1 = Math.imul(h1 ^ ch, 2654435761);
      h2 = Math.imul(h2 ^ ch, 1597334677);
    }
    h1 = Math.imul(h1 ^ (h1 >>> 16), 2246822507) ^ Math.imul(h2 ^ (h2 >>> 13), 3266489909);
    h2 = Math.imul(h2 ^ (h2 >>> 16), 2246822507) ^ Math.imul(h1 ^ (h1 >>> 13), 3266489909);
    return (4294967296 * (2097151 & h2) + (h1 >>> 0)).toString(36);
  }

  // ── Estils ──
  const BUILTIN_FMT = { General: 0, '0': 1, '0.00': 2, '#,##0': 3, '#,##0.00': 4, '0%': 9, '0.00%': 10 };

  class Styles {
    constructor() {
      this.fonts = []; this.fills = []; this.borders = []; this.fmts = []; this.xfs = []; this.dxfs = [];
      this.map = { font: new Map(), fill: new Map(), border: new Map(), fmt: new Map(), xf: new Map(), dxf: new Map() };
      this.fonts.push('<font><sz val="11"/><name val="Calibri"/><family val="2"/></font>');
      this.fills.push('<fill><patternFill patternType="none"/></fill>', '<fill><patternFill patternType="gray125"/></fill>');
      this.borders.push('<border><left/><right/><top/><bottom/><diagonal/></border>');
      this.xf({});
    }

    intern(kind, key, xml, list) {
      const m = this.map[kind];
      if (!m.has(key)) { m.set(key, list.length); list.push(xml); }
      return m.get(key);
    }

    fontXml(s, rich) {
      const sz = s.sz || 10;
      const parts = [s.b ? '<b/>' : '', s.i ? '<i/>' : '', s.u ? '<u/>' : '', `<sz val="${sz}"/>`, s.color ? `<color rgb="${argb(s.color)}"/>` : '', `<name val="${esc(s.font || 'Calibri')}"/>`, '<family val="2"/>'];
      return rich ? parts.join('').replace('<name', '<rFont').replace('<family val="2"/>', '<family val="2"/>') : `<font>${parts.join('')}</font>`;
    }

    font(s) {
      const xml = this.fontXml(s);
      return this.intern('font', xml, xml, this.fonts);
    }

    fill(color) {
      if (!color) return 0;
      const xml = `<fill><patternFill patternType="solid"><fgColor rgb="${argb(color)}"/><bgColor indexed="64"/></patternFill></fill>`;
      return this.intern('fill', xml, xml, this.fills);
    }

    border(s) {
      const side = (name, style) => {
        if (!style) return `<${name}/>`;
        return `<${name} style="${style}"><color rgb="${argb(s.bc || 'D9D2CB')}"/></${name}>`;
      };
      const all = s.border || null;
      const pick = (k) => (s[k] === undefined ? all : s[k]);
      const xml = `<border>${side('left', pick('bl'))}${side('right', pick('br'))}${side('top', pick('bt'))}${side('bottom', pick('bb'))}<diagonal/></border>`;
      if (xml === this.borders[0]) return 0;
      return this.intern('border', xml, xml, this.borders);
    }

    fmt(code) {
      if (!code || code === 'General') return 0;
      if (code in BUILTIN_FMT) return BUILTIN_FMT[code];
      const m = this.map.fmt;
      if (!m.has(code)) m.set(code, 164 + m.size);
      if (!this.fmts.some((x) => x.code === code)) this.fmts.push({ id: m.get(code), code });
      return m.get(code);
    }

    // Retorna l'índex de cellXfs d'un estil ({ b, i, u, sz, color, font, fill, fmt, h, v, wrap, indent, border, bc, bt, bb, bl, br }).
    xf(style) {
      const s = merge2(style);
      const fontId = this.font({ b: s.b, i: s.i, u: s.u, sz: s.sz, color: s.color, font: s.font });
      const fillId = this.fill(s.fill);
      const borderId = this.border(s);
      const fmtId = this.fmt(s.fmt);
      const al = { h: s.h || '', v: s.v || (Object.keys(s).length ? 'center' : ''), wrap: !!s.wrap, indent: s.indent || 0 };
      const key = [fontId, fillId, borderId, fmtId, al.h, al.v, al.wrap ? 1 : 0, al.indent, s.unlock ? 1 : 0].join('|');
      if (!this.map.xf.has(key)) {
        this.map.xf.set(key, this.xfs.length);
        const alignXml = al.h || al.v || al.wrap || al.indent
          ? `<alignment${al.h ? ` horizontal="${al.h}"` : ''}${al.v ? ` vertical="${al.v}"` : ''}${al.wrap ? ' wrapText="1"' : ''}${al.indent ? ` indent="${al.indent}"` : ''}/>` : '';
        const protXml = s.unlock ? '<protection locked="0"/>' : ''; // cel·la desbloquejada (a un full protegit): perquè es pugui ordenar
        const inner = alignXml + protXml;
        this.xfs.push(`<xf numFmtId="${fmtId}" fontId="${fontId}" fillId="${fillId}" borderId="${borderId}" xfId="0"${fmtId ? ' applyNumberFormat="1"' : ''}${fontId ? ' applyFont="1"' : ''}${fillId ? ' applyFill="1"' : ''}${borderId ? ' applyBorder="1"' : ''}${alignXml ? ' applyAlignment="1"' : ''}${protXml ? ' applyProtection="1"' : ''}${inner ? `>${inner}</xf>` : '/>'}`);
      }
      return this.map.xf.get(key);
    }

    // Estil diferencial per al format condicional ({ fill, color, b, bt/bb/bl/br o border }).
    dxf(s) {
      const x = merge2(s);
      const font = x.color || x.b || x.i ? `<font>${x.b ? '<b/>' : ''}${x.i ? '<i/>' : ''}${x.color ? `<color rgb="${argb(x.color)}"/>` : ''}</font>` : '';
      const fill = x.fill ? `<fill><patternFill><bgColor rgb="${argb(x.fill)}"/></patternFill></fill>` : '';
      const side = (name, st) => (st ? `<${name} style="${st}"><color rgb="${argb(x.bc || '421215')}"/></${name}>` : '');
      const pick = (k) => (x[k] === undefined ? x.border : x[k]);
      const bx = [side('left', pick('bl')), side('right', pick('br')), side('top', pick('bt')), side('bottom', pick('bb'))].join('');
      const xml = `<dxf>${font}${fill}${bx ? `<border>${bx}</border>` : ''}</dxf>`;
      return this.intern('dxf', xml, xml, this.dxfs);
    }

    xml() {
      return `${HEAD}<styleSheet xmlns="${NS}">`
        + (this.fmts.length ? `<numFmts count="${this.fmts.length}">${this.fmts.map((f) => `<numFmt numFmtId="${f.id}" formatCode="${esc(f.code)}"/>`).join('')}</numFmts>` : '')
        + `<fonts count="${this.fonts.length}">${this.fonts.join('')}</fonts>`
        + `<fills count="${this.fills.length}">${this.fills.join('')}</fills>`
        + `<borders count="${this.borders.length}">${this.borders.join('')}</borders>`
        + '<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>'
        + `<cellXfs count="${this.xfs.length}">${this.xfs.join('')}</cellXfs>`
        + '<cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles>'
        + `<dxfs count="${this.dxfs.length}">${this.dxfs.join('')}</dxfs>`
        + '<tableStyles count="0" defaultTableStyle="TableStyleMedium2" defaultPivotStyle="PivotStyleLight16"/>'
        + '</styleSheet>';
    }
  }

  // ── Textos compartits ──
  class Strings {
    constructor(styles) { this.list = []; this.map = new Map(); this.count = 0; this.styles = styles; }
    add(text) {
      this.count++;
      const key = `s:${text}`;
      if (!this.map.has(key)) { this.map.set(key, this.list.length); this.list.push(`<si><t xml:space="preserve">${esc(text)}</t></si>`); }
      return this.map.get(key);
    }
    // runs: [[text, { b, i, u, sz, color }], …]; base = estil de la cel·la (mida i tipus de lletra per defecte)
    addRich(runs, base) {
      this.count++;
      const key = `r:${JSON.stringify(runs)}|${base.sz || ''}|${base.color || ''}`;
      if (!this.map.has(key)) {
        this.map.set(key, this.list.length);
        const xml = runs.map(([t, st]) => {
          const s = { sz: base.sz, color: base.color, font: base.font, ...(st || {}) };
          return `<r><rPr>${this.styles.fontXml(s, true)}</rPr><t xml:space="preserve">${esc(t)}</t></r>`;
        }).join('');
        this.list.push(`<si>${xml}</si>`);
      }
      return this.map.get(key);
    }
    xml() {
      return `${HEAD}<sst xmlns="${NS}" count="${this.count}" uniqueCount="${this.list.length}">${this.list.join('')}</sst>`;
    }
  }

  // ── Mida del text (per saber l'alçada de les files amb salt de línia) ──
  // Amplades dels caràcters de Calibri (per 1000 d'em) de l'espai (32) al 383, en normal i en negreta, i alguns símbols.
  const CAL_REG = [226,326,401,498,507,715,682,221,303,303,498,498,250,306,252,386,507,507,507,507,507,507,507,507,507,507,268,268,498,498,498,463,894,579,544,533,615,488,459,631,623,252,319,520,420,855,646,662,517,673,543,459,487,642,567,890,519,487,468,307,386,307,498,498,291,479,525,423,525,498,305,471,525,229,239,455,229,799,525,527,525,525,349,391,335,525,452,715,433,453,395,314,460,314,498,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,226,326,498,507,498,507,498,498,393,834,402,512,498,500,507,394,339,498,336,334,292,550,586,252,307,246,422,512,636,671,675,463,579,579,579,579,579,579,763,533,488,488,488,488,252,252,252,252,625,646,662,662,662,662,662,498,664,642,642,642,642,487,517,527,479,479,479,479,479,479,773,423,498,498,498,498,229,229,229,229,525,525,527,527,527,527,527,498,529,525,525,525,525,453,525,453,579,479,579,479,579,479,533,423,533,423,533,423,533,423,615,568,625,552,488,498,488,498,488,498,488,498,488,498,631,471,631,471,631,471,631,471,623,525,656,533,252,229,252,229,252,229,252,229,252,229,571,469,319,239,520,455,455,420,229,420,229,423,264,546,374,430,248,646,525,646,525,646,525,579,628,525,662,527,662,527,662,527,867,850,543,349,543,349,543,349,459,391,459,391,459,391,459,391,487,335,487,346,487,342,642,525,642,525,642,525,642,525,642,525,642,525,890,715,487,453,487,468,395,468,395,468,395,243];
  const CAL_BOLD = [226,326,438,498,507,729,705,233,312,312,498,498,258,306,267,430,507,507,507,507,507,507,507,507,507,507,276,276,498,498,498,463,898,606,561,529,630,488,459,637,631,267,331,547,423,874,659,676,532,686,563,473,495,653,591,906,551,520,478,325,430,325,498,498,300,494,537,418,537,503,316,474,537,246,255,480,246,813,537,538,537,537,355,399,347,537,473,745,459,474,397,344,475,344,498,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,500,226,326,498,507,498,507,498,498,415,834,416,539,498,500,507,390,342,498,338,336,301,563,598,268,303,252,435,539,658,691,702,463,606,606,606,606,606,606,775,529,488,488,488,488,267,267,267,267,639,659,676,676,676,676,676,498,681,653,653,653,653,520,532,555,494,494,494,494,494,494,775,418,503,503,503,503,246,246,246,246,537,537,538,538,538,538,538,498,544,537,537,537,537,474,537,474,606,494,606,494,606,494,529,418,529,418,529,418,529,418,630,597,639,569,488,503,488,503,488,503,488,503,488,503,637,474,637,474,637,474,637,474,631,537,658,547,267,246,267,246,267,246,267,246,267,246,598,501,331,255,547,480,480,423,246,423,246,430,306,562,422,433,264,659,537,659,537,659,537,622,641,537,676,538,676,538,676,538,874,843,563,355,563,355,563,355,473,399,473,399,473,399,473,399,495,347,495,363,495,354,653,537,653,537,653,537,653,537,653,537,653,537,906,745,520,474,520,478,397,478,397,478,397,258];
  const CAL_EXTRA = {8211:[498,498],8212:[905,905],8216:[250,258],8217:[250,258],8220:[418,435],8221:[418,435],8226:[498,498],8230:[690,711],8594:[905,905],8722:[498,498],8804:[498,498],8805:[498,498]};
  const glyph = (cp, bold) => {
    if (cp >= 32 && cp <= 383) return (bold ? CAL_BOLD : CAL_REG)[cp - 32];
    const e = CAL_EXTRA[cp];
    return e ? e[bold ? 1 : 0] : 700; // símbols que Calibri no té (✔ ▲ █…): una mica més amples que una lletra
  };
  // Píxels que ocupa una paraula (a 96 ppp) amb aquesta mida (en punts).
  const wordPx = (text, sz, bold) => {
    let w = 0;
    for (const ch of text) w += glyph(ch.codePointAt(0), bold);
    return (w / 1000) * sz * (96 / 72);
  };

  // Línies que ocupa un text (runs: [[text, { sz, b }]]) en una cel·la d'aquesta amplada en caràcters (amb salt de línia automàtic).
  // Simula el salt de línia d'Excel (a espais i guions) amb les amplades reals de Calibri; el marge és prudent perquè mai es talli un text.
  function fitLines(runs, widthChars, sz = 10, bold = false) {
    const list = typeof runs === 'string' ? [[runs, {}]] : runs;
    const avail = Math.max(10, (widthChars * 7 - 7) * 0.97);
    let lines = 1, cur = 0, gap = 0;
    for (const [text, st] of list) {
      const size = (st && st.sz) || sz, b = st && st.b !== undefined ? !!st.b : bold;
      for (const para of String(text).split(/(\n)/)) {
        if (para === '\n') { lines++; cur = 0; gap = 0; continue; }
        // Paraules i espais; després d'un guió també es pot partir la línia (sense «lookbehind»: no el porten tots els navegadors).
        for (const tok of para.replace(/-/g, '-\u0001').split(/( +|\u0001)/)) {
          if (!tok || tok === '\u0001') continue;
          if (/^ +$/.test(tok)) { gap += wordPx(' ', size, b) * tok.length; continue; }
          const w = wordPx(tok, size, b);
          if (cur === 0) { cur = w; gap = 0; }
          else if (cur + gap + w <= avail) { cur += gap + w; gap = 0; }
          else { lines++; cur = w; gap = 0; }
          if (cur > avail) { lines += Math.floor(cur / avail); cur %= avail; } // paraula més llarga que la cel·la
        }
      }
    }
    return lines;
  }
  const lineHeight = (sz) => Math.max(12, sz * 1.34);

  // ── Full ──
  class Sheet {
    constructor(doc, name, opts = {}) {
      this.doc = doc;
      this.name = name;
      this.opts = opts;
      this.cells = new Map();
      this.heights = new Map();
      this.widths = [];
      this.hidden = new Set();
      this.merges = [];
      this.links = [];
      this.cfs = [];
      this.filter = '';
    }

    cols(widths) { widths.forEach((w, i) => { if (w) this.widths[i + 1] = w; }); return this; }
    col(c, w, hidden) { this.widths[c] = w; if (hidden) this.hidden.add(c); return this; }
    rowH(r, h) { this.heights.set(r, h); return this; }
    freeze(row, col = 1) { this.opts.freeze = [row, col]; return this; }
    autoFilter(range) { this.filter = range; return this; }

    // value: text, número, booleà, { f, v } (fórmula amb valor), { date }, { rich }, null (només l'estil)
    set(r, c, value, style) {
      let s = merge2(style);
      let v = value;
      if (v && typeof v === 'object' && v.date !== undefined) {
        v = serial(v.date);
        if (!s.fmt) s = { ...s, fmt: 'dd/mm/yyyy' };
      }
      if (typeof v === 'number' && !Number.isFinite(v)) v = null;
      // Només hi caben textos, números, booleans, text enriquit {rich} i fórmules {f}: qualsevol altra cosa es deixa en blanc.
      if (v && typeof v === 'object' && v.rich === undefined && v.f === undefined) v = null;
      else if (typeof v === 'function' || typeof v === 'symbol') v = null;
      else if (typeof v === 'bigint') v = Number(v);
      this.cells.set(`${r}:${c}`, { r, c, v, s });
      return this;
    }

    // Estil per a un rang sense tocar els valors que ja hi ha.
    fill(r1, c1, r2, c2, style) {
      const s = merge2(style);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        const k = `${r}:${c}`;
        const cur = this.cells.get(k);
        if (cur) cur.s = { ...s, ...cur.s }; else this.cells.set(k, { r, c, v: null, s });
      }
      return this;
    }

    // Cel·les d'un rang desbloquejades (la resta del full queda protegida): serveix perquè es pugui ordenar una taula.
    unlock(r1, c1, r2, c2) {
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
        const k = `${r}:${c}`;
        const cur = this.cells.get(k);
        if (cur) cur.s = { ...cur.s, unlock: true }; else this.cells.set(k, { r, c, v: null, s: { unlock: true } });
      }
      return this;
    }

    // Cel·la combinada: el valor va a la cantonada i l'estil (vores i color) a totes les cel·les del rang.
    merge(r1, c1, r2, c2, value, style) {
      const s = merge2(style);
      for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) this.set(r, c, null, s);
      this.set(r1, c1, value, s);
      if (r2 > r1 || c2 > c1) this.merges.push([r1, c1, r2, c2]);
      return this;
    }

    // target: '#Full!A1' (dins del llibre) o una adreça web.
    link(r, c, target, tip) {
      if (target) this.links.push({ r, c, target, tip });
      return this;
    }

    // Format condicional: formula (sense «=») amb referències relatives a la cantonada superior esquerra del rang.
    cf(range, formula, dxf) {
      this.cfs.push({ range, formula, dxf });
      return this;
    }

    width(c, rect) {
      let w = 0;
      for (let k = c; k <= (rect ? rect[3] : c); k++) w += this.widths[k] || 8.43;
      return w;
    }

    // Alçada d'una fila: la que s'hi ha posat com a mínim i el que calgui per als textos amb salt de línia.
    heightOf(r, cells, mergeAt) {
      if (this.opts.autoHeight === false) return this.heights.get(r) || 0; // (per comparar l'estimació amb el que fa un full de càlcul de veritat)
      let need = 0;
      for (const cell of cells) {
        if (!cell.s.wrap || cell.v == null || cell.v === '') continue;
        const mg = mergeAt.get(`${r}:${cell.c}`);
        if (mg && mg[2] > mg[0]) continue; // combinada en vertical: no s'estima
        const sz = cell.s.sz || 10;
        let runs;
        if (typeof cell.v === 'object') {
          if (cell.v.rich) runs = cell.v.rich.map((x) => (typeof x === 'string' ? [x, {}] : [x[0], x[1] || {}]));
          else if (cell.v.f) runs = [[String(cell.v.v == null ? '' : cell.v.v), {}]];
          else continue;
        } else runs = [[String(cell.v), {}]];
        if (!runs.some((x) => x[0])) continue;
        need = Math.max(need, Math.ceil(fitLines(runs, this.width(cell.c, mg), sz, !!cell.s.b) * lineHeight(sz) + 3));
      }
      const set = this.heights.get(r) || 0;
      const h = Math.max(set, need);
      return h ? Math.min(409, h) : 0;
    }

    xml(ctx) {
      const o = this.opts;
      const rows = new Map();
      for (const cell of this.cells.values()) (rows.get(cell.r) || rows.set(cell.r, []).get(cell.r)).push(cell);
      for (const r of this.heights.keys()) if (!rows.has(r)) rows.set(r, []);
      const mergeAt = new Map();
      for (const m of this.merges) mergeAt.set(`${m[0]}:${m[1]}`, m);
      let maxR = 1, maxC = 1;
      const data = [...rows.keys()].sort((a, b) => a - b).map((r) => {
        const cs = rows.get(r).sort((a, b) => a.c - b.c);
        for (const cell of cs) { maxC = Math.max(maxC, cell.c); }
        maxR = Math.max(maxR, r);
        const h = this.heightOf(r, cs, mergeAt);
        return `<row r="${r}"${h ? ` ht="${num(h)}" customHeight="1"` : ''}>${cs.map((cell) => this.cellXml(cell, ctx)).join('')}</row>`;
      }).join('');

      const view = [];
      if (o.freeze && (o.freeze[0] > 1 || o.freeze[1] > 1)) {
        const [fr, fc] = o.freeze;
        const tl = ref(fr, fc);
        const xs = fc > 1 ? ` xSplit="${fc - 1}"` : '', ys = fr > 1 ? ` ySplit="${fr - 1}"` : '';
        const pane = fr > 1 && fc > 1 ? 'bottomRight' : fr > 1 ? 'bottomLeft' : 'topRight';
        view.push(`<pane${xs}${ys} topLeftCell="${tl}" activePane="${pane}" state="frozen"/>`);
        if (fr > 1 && fc > 1) view.push(`<selection pane="topRight" activeCell="${ref(1, fc)}" sqref="${ref(1, fc)}"/>`, `<selection pane="bottomLeft" activeCell="${ref(fr, 1)}" sqref="${ref(fr, 1)}"/>`);
        view.push(`<selection pane="${pane}" activeCell="${tl}" sqref="${tl}"/>`);
      } else view.push('<selection activeCell="A1" sqref="A1"/>');
      const zoom = o.zoom ? ` zoomScale="${o.zoom}" zoomScaleNormal="${o.zoom}"` : '';
      const sel = ctx.active === this.index ? ' tabSelected="1"' : '';

      const colXml = this.widths.map((w, c) => (w ? `<col min="${c}" max="${c}" width="${num(w)}" customWidth="1"${this.hidden.has(c) ? ' hidden="1"' : ''}/>` : '')).join('');
      const out = [];
      out.push(`${HEAD}<worksheet xmlns="${NS}" xmlns:r="${NSR}">`);
      out.push(`<sheetPr>${o.tab ? `<tabColor rgb="${argb(o.tab)}"/>` : ''}<pageSetUpPr fitToPage="1"/></sheetPr>`);
      out.push(`<dimension ref="A1:${ref(maxR, maxC)}"/>`);
      out.push(`<sheetViews><sheetView workbookViewId="0"${o.grid === false ? ' showGridLines="0"' : ''}${zoom}${sel}>${view.join('')}</sheetView></sheetViews>`);
      out.push('<sheetFormatPr defaultRowHeight="15"/>');
      if (colXml) out.push(`<cols>${colXml}</cols>`);
      out.push(`<sheetData>${data}</sheetData>`);
      if (o.protect !== false) out.push('<sheetProtection sheet="1" objects="1" scenarios="1" formatColumns="0" formatRows="0" sort="0" autoFilter="0"/>');
      if (this.filter) out.push(`<autoFilter ref="${this.filter}"/>`);
      if (this.merges.length) out.push(`<mergeCells count="${this.merges.length}">${this.merges.map((m) => `<mergeCell ref="${ref(m[0], m[1])}:${ref(m[2], m[3])}"/>`).join('')}</mergeCells>`);
      this.cfs.forEach((x, i) => {
        out.push(`<conditionalFormatting sqref="${x.range}"><cfRule type="expression" dxfId="${ctx.styles.dxf(x.dxf)}" priority="${i + 1}"><formula>${esc(x.formula)}</formula></cfRule></conditionalFormatting>`);
      });
      const rels = [];
      if (this.links.length) {
        out.push(`<hyperlinks>${this.links.map((l) => {
          const tip = l.tip ? ` tooltip="${esc(l.tip)}"` : '';
          if (l.target.startsWith('#')) return `<hyperlink ref="${ref(l.r, l.c)}" location="${esc(l.target.slice(1))}"${tip}/>`;
          rels.push(l.target);
          return `<hyperlink ref="${ref(l.r, l.c)}" r:id="rId${rels.length}"${tip}/>`;
        }).join('')}</hyperlinks>`);
      }
      this.rels = rels;
      if (o.center) out.push('<printOptions horizontalCentered="1"/>');
      out.push('<pageMargins left="0.4" right="0.4" top="0.5" bottom="0.55" header="0.25" footer="0.25"/>');
      out.push(`<pageSetup paperSize="9" orientation="${o.landscape === false ? 'portrait' : 'landscape'}" fitToWidth="1" fitToHeight="0"/>`);
      out.push(`<headerFooter><oddFooter>${esc(`&L&8${o.footer || 'EON Life · Human Performance'}&C&8&A&R&8Pàgina &P de &N`)}</oddFooter></headerFooter>`);
      out.push('</worksheet>');
      return out.join('');
    }

    cellXml(cell, ctx) {
      const st = ctx.styles.xf(cell.s);
      const r = ref(cell.r, cell.c);
      const sa = st ? ` s="${st}"` : '';
      const v = cell.v;
      if (v === null || v === undefined || v === '') return st ? `<c r="${r}"${sa}/>` : '';
      if (typeof v === 'number') return `<c r="${r}"${sa}><v>${num(v)}</v></c>`;
      if (typeof v === 'boolean') return `<c r="${r}"${sa} t="b"><v>${v ? 1 : 0}</v></c>`;
      if (typeof v === 'string') return `<c r="${r}"${sa} t="s"><v>${ctx.sst.add(v.length > 32000 ? v.slice(0, 32000) : v)}</v></c>`;
      if (v.rich) return `<c r="${r}"${sa} t="s"><v>${ctx.sst.addRich(v.rich.map((x) => (typeof x === 'string' ? [x] : x)), cell.s)}</v></c>`;
      if (v.f !== undefined) {
        const f = String(v.f).replace(/^=/, '');
        const cv = v.v;
        if (typeof cv === 'number' && Number.isFinite(cv)) return `<c r="${r}"${sa}><f>${esc(f)}</f><v>${num(cv)}</v></c>`;
        if (typeof cv === 'boolean') return `<c r="${r}"${sa} t="b"><f>${esc(f)}</f><v>${cv ? 1 : 0}</v></c>`;
        return `<c r="${r}"${sa} t="str"><f>${esc(f)}</f><v>${esc(cv == null ? '' : cv)}</v></c>`;
      }
      throw new Error(`Valor no admès a ${ref(cell.r, cell.c)}`);
    }
  }

  const INVALID_NAME = /[:\\/?*[\]]/;

  class Doc {
    constructor(props = {}) {
      this.props = props;
      this.sheets = [];
      this.styles = new Styles();
      this.active = 0;
    }

    sheet(name, opts = {}) {
      const clean = String(name).replace(/[:\\/?*[\]]/g, ' ').replace(/^'+|'+$/g, '').trim().slice(0, 31) || 'Full';
      if (this.sheets.some((s) => s.name.toLowerCase() === clean.toLowerCase())) throw new Error(`Full repetit: ${clean}`);
      const ws = new Sheet(this, clean, opts);
      ws.index = this.sheets.length;
      this.sheets.push(ws);
      return ws;
    }

    validate() {
      for (const ws of this.sheets) {
        if (INVALID_NAME.test(ws.name)) throw new Error(`Nom de full no vàlid: ${ws.name}`);
        const linked = new Set();
        for (const l of ws.links) {
          const k = `${l.r}:${l.c}`;
          if (linked.has(k)) throw new Error(`Dos enllaços a la mateixa cel·la ${ws.name}!${ref(l.r, l.c)}`);
          linked.add(k);
        }
        const taken = new Set();
        for (const [r1, c1, r2, c2] of ws.merges) {
          for (let r = r1; r <= r2; r++) for (let c = c1; c <= c2; c++) {
            const k = `${r}:${c}`;
            if (taken.has(k)) throw new Error(`Cel·les combinades que se superposen a ${ws.name}!${ref(r, c)}`);
            taken.add(k);
          }
        }
      }
    }

    // Parts del paquet (sense comprimir), com a {nom, text}. L'hora de generació va a part perquè no afecti el resum.
    parts() {
      this.validate();
      const styles = this.styles;
      const sst = new Strings(styles);
      const ctx = { styles, sst, active: this.active };
      const sheetXml = this.sheets.map((ws) => ws.xml(ctx));
      const ct = [
        '<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>',
        '<Default Extension="xml" ContentType="application/xml"/>',
        '<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>',
        '<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>',
        '<Override PartName="/xl/sharedStrings.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sharedStrings+xml"/>',
        '<Override PartName="/docProps/core.xml" ContentType="application/vnd.openxmlformats-package.core-properties+xml"/>',
        '<Override PartName="/docProps/app.xml" ContentType="application/vnd.openxmlformats-officedocument.extended-properties+xml"/>',
        ...this.sheets.map((ws, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`),
      ];
      const wbRels = [
        ...this.sheets.map((ws, i) => `<Relationship Id="rId${i + 1}" Type="${REL}/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`),
        `<Relationship Id="rId${this.sheets.length + 1}" Type="${REL}/styles" Target="styles.xml"/>`,
        `<Relationship Id="rId${this.sheets.length + 2}" Type="${REL}/sharedStrings" Target="sharedStrings.xml"/>`,
      ];
      const names = this.sheets.map((ws, i) => {
        const t = ws.opts.titles;
        const q = `'${ws.name.replace(/'/g, "''")}'`;
        // Com fa Excel: un filtre automàtic va amb el seu nom ocult (_FilterDatabase) i els títols d'impressió amb el seu.
        const filter = ws.filter ? `<definedName name="_xlnm._FilterDatabase" localSheetId="${i}" hidden="1">${q}!${ws.filter.replace(/([A-Z]+)(\d+)/g, '$$$1$$$2')}</definedName>` : '';
        return filter + (t ? `<definedName name="_xlnm.Print_Titles" localSheetId="${i}">${q}!$${t[0]}:$${t[1]}</definedName>` : '');
      }).join('');
      const files = [
        { name: '[Content_Types].xml', text: `${HEAD}<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">${ct.join('')}</Types>` },
        { name: '_rels/.rels', text: `${HEAD}<Relationships xmlns="${PKG}"><Relationship Id="rId1" Type="${REL}/officeDocument" Target="xl/workbook.xml"/><Relationship Id="rId2" Type="http://schemas.openxmlformats.org/package/2006/relationships/metadata/core-properties" Target="docProps/core.xml"/><Relationship Id="rId3" Type="${REL}/extended-properties" Target="docProps/app.xml"/></Relationships>` },
        { name: 'docProps/app.xml', text: `${HEAD}<Properties xmlns="http://schemas.openxmlformats.org/officeDocument/2006/extended-properties"><Application>EON Life</Application>${this.props.company ? `<Company>${esc(this.props.company)}</Company>` : ''}</Properties>` },
        { name: 'xl/workbook.xml', text: `${HEAD}<workbook xmlns="${NS}" xmlns:r="${NSR}"><workbookPr/><bookViews><workbookView xWindow="0" yWindow="0" windowWidth="28800" windowHeight="16000" activeTab="${this.active}"/></bookViews><sheets>${this.sheets.map((ws, i) => `<sheet name="${esc(ws.name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join('')}</sheets>${names ? `<definedNames>${names}</definedNames>` : ''}<calcPr calcId="191029" fullCalcOnLoad="1"/></workbook>` },
        { name: 'xl/_rels/workbook.xml.rels', text: `${HEAD}<Relationships xmlns="${PKG}">${wbRels.join('')}</Relationships>` },
        { name: 'xl/styles.xml', text: styles.xml() },
        { name: 'xl/sharedStrings.xml', text: sst.xml() },
      ];
      this.sheets.forEach((ws, i) => {
        files.push({ name: `xl/worksheets/sheet${i + 1}.xml`, text: sheetXml[i] });
        if (ws.rels && ws.rels.length) {
          files.push({ name: `xl/worksheets/_rels/sheet${i + 1}.xml.rels`, text: `${HEAD}<Relationships xmlns="${PKG}">${ws.rels.map((t, k) => `<Relationship Id="rId${k + 1}" Type="${REL}/hyperlink" Target="${esc(t)}" TargetMode="External"/>`).join('')}</Relationships>` });
        }
      });
      return files;
    }

    // Resum del contingut (sense l'hora de generació): igual si les dades no han canviat.
    digest() {
      return hash(this.parts().map((f) => `${f.name}\n${f.text}`).join('\n'));
    }

    core(stamp) {
      const iso = (stamp instanceof Date ? stamp : new Date()).toISOString().replace(/\.\d+Z$/, 'Z');
      const p = this.props;
      return `${HEAD}<cp:coreProperties xmlns:cp="http://schemas.openxmlformats.org/package/2006/metadata/core-properties" xmlns:dc="http://purl.org/dc/elements/1.1/" xmlns:dcterms="http://purl.org/dc/terms/" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance">`
        + `<dc:title>${esc(p.title || 'EON Life')}</dc:title>${p.subject ? `<dc:subject>${esc(p.subject)}</dc:subject>` : ''}<dc:creator>${esc(p.creator || 'EON Life')}</dc:creator>`
        + `<cp:lastModifiedBy>${esc(p.creator || 'EON Life')}</cp:lastModifiedBy><dcterms:created xsi:type="dcterms:W3CDTF">${iso}</dcterms:created><dcterms:modified xsi:type="dcterms:W3CDTF">${iso}</dcterms:modified></cp:coreProperties>`;
    }

    // { bytes, digest } · stamp = text que substitueix XlsxDoc.STAMP (p. ex. «02/10/2026 18:30»); compress = false per desactivar el deflate.
    async build({ stamp = '', compress = true, now = new Date() } = {}) {
      const parts = this.parts();
      const digest = hash(parts.map((f) => `${f.name}\n${f.text}`).join('\n'));
      const enc = new TextEncoder();
      const files = parts.map((f) => ({
        name: f.name,
        raw: enc.encode(f.name === 'xl/sharedStrings.xml' ? f.text.split(STAMP).join(esc(stamp)) : f.text),
      }));
      files.splice(2, 0, { name: 'docProps/core.xml', raw: enc.encode(this.core(now)) });
      const canDeflate = compress && typeof CompressionStream === 'function' && typeof Response === 'function' && typeof Blob === 'function';
      const entries = [];
      for (const f of files) {
        let bytes = f.raw, method = 0;
        if (canDeflate && f.raw.length > 200) {
          try {
            const z = new Uint8Array(await new Response(new Blob([f.raw]).stream().pipeThrough(new CompressionStream('deflate-raw'))).arrayBuffer());
            if (z.length < f.raw.length) { bytes = z; method = 8; }
          } catch (e) { /* sense compressió */ }
        }
        entries.push({ name: f.name, bytes, crc: Xlsx.crc32(f.raw), size: f.raw.length, method });
      }
      return { bytes: Xlsx.zipRaw(entries), digest };
    }
  }

  return {
    create: (props) => new Doc(props),
    STAMP, serial, hash, esc, colName, ref, fitLines,
    XLSX_MIME: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  };
})();
