/* EON Life · escriptor de PDF mínim: una pàgina A4 per imatge JPEG (les pàgines de l'informe fet a l'app, 17-reportpdf.js).
   El JPEG va tal qual dins del PDF (filtre DCTDecode), sense tornar-lo a comprimir.

   Ús:
     const bytes = PdfWriter.build([{ jpeg, w, h }, …], { title: 'Valoració inicial · Laura Vidal Serra' }); */

const PdfWriter = (() => {
  const A4 = { w: 595.28, h: 841.89 };   // punts (1/72 de polzada)
  const enc = new TextEncoder();

  // Text d'un diccionari: en ASCII, entre parèntesis; amb accents, en UTF-16BE hexadecimal (<FEFF…>).
  function pdfText(s) {
    const str = String(s || '');
    if (/^[\x20-\x7e]*$/.test(str)) return `(${str.replace(/[\\()]/g, '\\$&')})`;
    let hex = 'FEFF';
    for (const ch of str) {
      const cp = ch.codePointAt(0);
      const units = cp > 0xffff ? [0xd800 + ((cp - 0x10000) >> 10), 0xdc00 + ((cp - 0x10000) & 0x3ff)] : [cp];
      for (const u of units) hex += u.toString(16).toUpperCase().padStart(4, '0');
    }
    return `<${hex}>`;
  }

  // D:AAAAMMDDHHmmSS
  const pdfDate = (d) => `D:${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}${String(d.getHours()).padStart(2, '0')}${String(d.getMinutes()).padStart(2, '0')}${String(d.getSeconds()).padStart(2, '0')}`;

  function build(pages, { title = '', author = '', date = new Date(), page = A4 } = {}) {
    if (!pages || !pages.length) throw new Error('El PDF no té cap pàgina.');
    const chunks = [];
    let size = 0;
    const offsets = [];
    const push = (x) => { const b = typeof x === 'string' ? enc.encode(x) : x; chunks.push(b); size += b.length; };
    const obj = (n, body) => { offsets[n] = size; push(`${n} 0 obj\n`); for (const part of [].concat(body)) push(part); push('\nendobj\n'); };

    push('%PDF-1.4\n%âãÏÓ\n'); // la 2a línia, amb bytes > 127, diu als programes que el fitxer és binari
    const n = pages.length;
    // 1 catàleg · 2 pàgines · per pàgina: 3k pàgina, 3k+1 contingut, 3k+2 imatge · al final, informació
    const pageObj = (i) => 3 + i * 3;
    const info = 3 + n * 3;
    obj(1, '<< /Type /Catalog /Pages 2 0 R >>');
    obj(2, `<< /Type /Pages /Kids [${pages.map((_, i) => `${pageObj(i)} 0 R`).join(' ')}] /Count ${n} >>`);
    const W = page.w.toFixed(2), H = page.h.toFixed(2);
    pages.forEach((pg, i) => {
      const p = pageObj(i);
      if (!pg.jpeg || typeof pg.jpeg.length !== 'number' || pg.jpeg[0] !== 0xff || pg.jpeg[1] !== 0xd8) throw new Error(`La pàgina ${i + 1} no és una imatge JPEG.`);
      obj(p, `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${W} ${H}] /Resources << /XObject << /Im0 ${p + 2} 0 R >> /ProcSet [/PDF /ImageC] >> /Contents ${p + 1} 0 R >>`);
      const content = `q\n${W} 0 0 ${H} 0 0 cm\n/Im0 Do\nQ\n`;
      obj(p + 1, [`<< /Length ${enc.encode(content).length} >>\nstream\n`, content, 'endstream']);
      obj(p + 2, [`<< /Type /XObject /Subtype /Image /Width ${pg.w} /Height ${pg.h} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${pg.jpeg.length} >>\nstream\n`, pg.jpeg, '\nendstream']);
    });
    obj(info, `<< /Title ${pdfText(title)} /Author ${pdfText(author)} /Producer (EON Life) /Creator (EON Life) /CreationDate (${pdfDate(date)}) >>`);
    const xref = size;
    let table = `xref\n0 ${info + 1}\n0000000000 65535 f \n`;
    for (let k = 1; k <= info; k++) table += `${String(offsets[k]).padStart(10, '0')} 00000 n \n`;
    push(table);
    push(`trailer\n<< /Size ${info + 1} /Root 1 0 R /Info ${info} 0 R >>\nstartxref\n${xref}\n%%EOF\n`);
    const out = new Uint8Array(size);
    let at = 0;
    for (const c of chunks) { out.set(c, at); at += c.length; }
    return out;
  }

  return { build, A4, pdfText };
})();

// Els selectors de les regles @media print, aplicats dins d'un contenidor .pdf-mode (:root, html i body passen a ser el
// contenidor): així el PDF que fa l'app (17-reportpdf.js) té el mateix aspecte que imprimir l'informe.
const PrintScope = (() => {
  function split(sel) {
    const out = [];
    let depth = 0, cur = '';
    for (const ch of sel) {
      if (ch === '(' || ch === '[') depth++;
      else if (ch === ')' || ch === ']') depth--;
      if (ch === ',' && depth === 0) { out.push(cur); cur = ''; } else cur += ch;
    }
    out.push(cur);
    return out.map((s) => s.trim()).filter(Boolean);
  }
  function scope(sel, root = '.pdf-mode') {
    return split(sel).map((s) => {
      const m = s.match(/^(?::root|html|body)((?:\[[^\]]*\]|:not\((?:[^()]|\([^()]*\))*\))*)(.*)$/);
      return m ? `${root}${m[2]}` : `${root} ${s}`;
    }).join(', ');
  }
  return { scope, split };
})();
