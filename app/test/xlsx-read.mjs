// Lector mínim d'.xlsx per als tests (sense dependències): descomprimeix el ZIP (stored o deflate) i extreu els
// valors, les fórmules, les combinades, els enllaços i el format condicional de cada full.
import { inflateRawSync } from 'node:zlib';

export function unzip(bytes) {
  const b = Buffer.from(bytes);
  // Directori central: mides i mètode fiables.
  let end = b.length - 22;
  while (end >= 0 && b.readUInt32LE(end) !== 0x06054b50) end--;
  if (end < 0) throw new Error('No és un ZIP');
  const count = b.readUInt16LE(end + 10);
  let p = b.readUInt32LE(end + 16);
  const out = {};
  for (let i = 0; i < count; i++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('Directori central malmès');
    const method = b.readUInt16LE(p + 10);
    const crc = b.readUInt32LE(p + 16);
    const csize = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28), extraLen = b.readUInt16LE(p + 30), commLen = b.readUInt16LE(p + 32);
    const off = b.readUInt32LE(p + 42);
    const name = b.slice(p + 46, p + 46 + nameLen).toString('utf8');
    const lnLen = b.readUInt16LE(off + 26), leLen = b.readUInt16LE(off + 28);
    const raw = b.slice(off + 30 + lnLen + leLen, off + 30 + lnLen + leLen + csize);
    const data = method === 8 ? inflateRawSync(raw) : raw;
    out[name] = { data, crc, method };
    p += 46 + nameLen + extraLen + commLen;
  }
  return out;
}

const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');
const colNum = (s) => s.split('').reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0);

export function readXlsx(bytes) {
  const z = unzip(bytes);
  const text = (name) => (z[name] ? z[name].data.toString('utf8') : '');
  const strings = [...text('xl/sharedStrings.xml').matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
  const rels = {};
  for (const m of text('xl/_rels/workbook.xml.rels').matchAll(/<Relationship Id="([^"]+)"[^>]*?Target="([^"]+)"/g)) rels[m[1]] = `xl/${m[2]}`;
  const sheets = [];
  for (const m of text('xl/workbook.xml').matchAll(/<sheet name="([^"]+)" sheetId="\d+" r:id="([^"]+)"\/>/g)) {
    const name = unesc(m[1]);
    const path = rels[m[2]];
    const xml = text(path);
    const cells = new Map();
    for (const c of xml.matchAll(/<c r="([A-Z]+\d+)"((?:\s+[a-z]+="[^"]*")*)\s*(?:\/>|>([\s\S]*?)<\/c>)/g)) {
      const [, ref, attrs, inner = ''] = c;
      const t = (attrs.match(/ t="([^"]+)"/) || [])[1];
      const f = (inner.match(/<f[^>]*>([\s\S]*?)<\/f>/) || [])[1];
      const vRaw = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
      let v = null;
      if (vRaw !== undefined) v = t === 's' ? strings[Number(vRaw)] : t === 'str' ? unesc(vRaw) : t === 'b' ? vRaw === '1' : Number(vRaw);
      else if (t === 'inlineStr') v = unesc((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/) || ['', ''])[1]);
      cells.set(ref, { v, f: f ? unesc(f) : null, s: Number((attrs.match(/ s="(\d+)"/) || [])[1] || 0) });
    }
    const relFile = path.replace('worksheets/', 'worksheets/_rels/') + '.rels';
    const ext = {};
    for (const r of text(relFile).matchAll(/<Relationship Id="([^"]+)"[^>]*?Target="([^"]+)"/g)) ext[r[1]] = unesc(r[2]);
    const links = [...xml.matchAll(/<hyperlink ref="([^"]+)"([^>]*?)\/>/g)].map((h) => ({
      ref: h[1],
      location: unesc((h[2].match(/location="([^"]*)"/) || [])[1] || ''),
      target: ext[(h[2].match(/r:id="([^"]+)"/) || [])[1]] || '',
    }));
    sheets.push({
      name,
      xml,
      cells,
      merges: [...xml.matchAll(/<mergeCell ref="([^"]+)"\/>/g)].map((x) => x[1]),
      links,
      cfs: [...xml.matchAll(/<conditionalFormatting sqref="([^"]+)"><cfRule[^>]*><formula>([\s\S]*?)<\/formula>/g)].map((x) => ({ range: x[1], formula: unesc(x[2]) })),
      get(ref) { const c = cells.get(ref); return c ? c.v : null; },
      formula(ref) { const c = cells.get(ref); return c ? c.f : null; },
      // Tots els textos del full, units (per comprovar que una dada hi surt).
      text() { return [...cells.values()].map((c) => (c.v == null ? '' : String(c.v))).join('\n'); },
      find(re) { for (const [ref, c] of cells) if (c.v != null && re.test(String(c.v))) return ref; return null; },
      rowOf(ref) { return Number(ref.replace(/[A-Z]+/, '')); },
    });
  }
  return {
    zip: z, sheets, names: sheets.map((s) => s.name), strings,
    sheet(name) { const s = sheets.find((x) => x.name === name); if (!s) throw new Error(`No hi ha el full «${name}» (hi ha: ${sheets.map((x) => x.name).join(', ')})`); return s; },
    text() { return sheets.map((s) => s.text()).join('\n'); },
  };
}

export { colNum };
