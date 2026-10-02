/* EON Life · informe PDF de Kinvent (K-Move i K-Push) → valors de la valoració.
   El PDF de Kinvent Physio no porta text: cada pàgina és una imatge. L'app en treu les imatges, les llegeix amb OCR
   (Tesseract, a 23-kinvent.js) i aquí s'interpreta el que s'ha llegit: cada targeta de prova té el títol, «Ángulo
   máximo» o «Fuerza máxima», «Izquierda» i «Derecha» amb el valor a sota, i l'asimetria. L'asimetria serveix per
   comprovar (i corregir) els números llegits, que són grans i prims i de vegades l'OCR confon (6 ↔ 0, punt perdut). */

const KinventPdf = (() => {
  const enc = (s) => Array.from(s, (c) => c.charCodeAt(0));
  const STREAM = enc('stream');
  const ENDSTREAM = enc('endstream');
  const at = (b, i, pat) => pat.every((c, k) => b[i + k] === c);
  const find = (b, pat, from) => {
    for (let i = from; i <= b.length - pat.length; i++) if (b[i] === pat[0] && at(b, i, pat)) return i;
    return -1;
  };

  // Imatges JPEG del PDF (una per pàgina en els informes de Kinvent), en l'ordre en què hi són.
  function jpegs(bytes) {
    const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    const out = [];
    let i = 0;
    while ((i = find(b, STREAM, i)) >= 0) {
      let j = i + STREAM.length;
      if (b[j] === 0x0d) j++;
      if (b[j] === 0x0a) j++;
      if (b[j] === 0xff && b[j + 1] === 0xd8 && b[j + 2] === 0xff) {
        const k = find(b, ENDSTREAM, j);
        if (k < 0) break;
        let end = k;
        while (end > j && (b[end - 1] === 0x0a || b[end - 1] === 0x0d)) end--;
        out.push(b.subarray(j, end));
        i = k + ENDSTREAM.length;
      } else {
        i = j;
      }
    }
    return out;
  }

  const norm = (s) => U.norm(s).replace(/[*"”″º]/g, '°').replace(/\s+/g, ' ').trim();
  const HEAD = /^(angulo maximo|fuerza maxima|angle maxim|forca maxima|max(imum)? angle|max(imum)? force|peak force|angle max|force max)/;
  const LEFT = /^(izquierda|esquerra|left|gauche)$/;
  const RIGHT = /^(derecha|dreta|right|droite)$/;

  // Títol net: sense la icona del dispositiu que l'OCR llegeix com a lletres soltes («WEN», «|»…).
  function cleanTitle(s) {
    const words = String(s || '').replace(/[|]/g, ' ').trim().split(/\s+/);
    while (words.length > 1 && !/^[A-ZÁÉÍÓÚÀÈÒÇ][a-záéíóúàèòïüç]/.test(words[0])) words.shift();
    return words.join(' ').replace(/(\d)\s*[*"”″º](?=\s|\)|$)/g, '$1°').replace(/\s+/g, ' ').trim();
  }

  // Targetes d'una pàgina a partir de les línies de l'OCR ({ text, bbox, words: [{ text, bbox }] }).
  function cards(lines) {
    const list = (lines || []).filter((l) => l && String(l.text || '').trim());
    const out = [];
    list.forEach((l, i) => {
      const n = norm(l.text);
      if (!HEAD.test(n)) return;
      let t = i - 1;
      while (t >= 0 && norm(list[t].text).replace(/[^a-z]/g, '').length < 6) t--;
      if (t < 0) return;
      out.push({ title: cleanTitle(list[t].text), measure: /^(fuerza|forca|max(imum)? force|peak force|force)/.test(n) ? 'force' : 'angle', from: i });
    });
    out.forEach((c, k) => {
      const until = k + 1 < out.length ? out[k + 1].from : list.length;
      for (let i = c.from + 1; i < until; i++) {
        const l = list[i];
        for (const w of l.words || []) {
          const wn = norm(w.text).replace(/[^a-z]/g, '');
          if (!c.left && LEFT.test(wn)) c.left = w.bbox;
          else if (!c.right && RIGHT.test(wn)) c.right = w.bbox;
        }
        const m = norm(l.text).match(/(\d+(?:[.,]\d+)?)\s*%\s*(asimetr|asymmetr)/);
        if (m && c.asym == null) c.asym = U.num(m[1]);
      }
      delete c.from;
    });
    return out;
  }

  // On es llegeix el valor: just a sota de l'etiqueta «Izquierda» o «Derecha», centrat i una mica més ample.
  function valueBox(b) {
    const h = b.y1 - b.y0, w = b.x1 - b.x0, cx = (b.x0 + b.x1) / 2;
    return { x0: cx - w * 0.85, y0: b.y1 + h * 0.3, x1: cx + w * 0.85, y1: b.y1 + h * 3 };
  }

  // Possibles lectures d'un número, amb el «cost» de cada correcció.
  const CONFUSE = { 0: '689', 1: '7', 2: '7', 3: '8', 4: '1', 5: '63', 6: '058', 7: '12', 8: '3609', 9: '80' };
  const PLAUSIBLE = { angle: [0, 220], force: [0, 200] };
  function candidates(raw, measure) {
    let s = String(raw || '').replace(/\s+/g, '').replace(/,/g, '.').replace(/[^\d.]/g, '');
    const dot = s.indexOf('.');
    if (dot >= 0) s = s.slice(0, dot + 1) + s.slice(dot + 1).replace(/\./g, '');
    s = s.replace(/^\.+|\.+$/g, '');
    if (!s) return [];
    const out = new Map();
    const [lo, hi] = PLAUSIBLE[measure] || [0, 1000];
    const add = (str, cost) => {
      const v = Number(str);
      if (!Number.isFinite(v) || v <= lo || v > hi) return;
      // Kinvent escriu una xifra decimal per sota de 100 i cap a partir de 100.
      const fmtCost = (str.includes('.') ? v >= 100 : v < 100) ? 0.6 : 0;
      const c = cost + fmtCost;
      if (!out.has(v) || out.get(v).cost > c) out.set(v, { v, cost: c, dec: str.includes('.') });
    };
    const bases = [[s, 0]];
    if (!s.includes('.') && s.length >= 2) bases.push([`${s.slice(0, -1)}.${s.slice(-1)}`, 0.5]);
    for (const [b, c] of bases) {
      add(b, c);
      for (let i = 0; i < b.length; i++) {
        for (const alt of CONFUSE[b[i]] || '') add(b.slice(0, i) + alt + b.slice(i + 1), c + 1);
      }
    }
    return [...out.values()].sort((a, b) => a.cost - b.cost);
  }

  // L'asimetria de Kinvent és |E − D| / el més alt. Es té en compte l'arrodoniment dels valors mostrats.
  function asymOk(e, d, asym) {
    if (asym == null) return true;
    const half = (x) => (x.dec || x.v < 100 ? 0.05 : 0.5);
    let min = Infinity, max = -Infinity;
    for (const a of [e.v - half(e), e.v + half(e)]) for (const b of [d.v - half(d), d.v + half(d)]) {
      const p = (Math.abs(a - b) / Math.max(a, b)) * 100;
      min = Math.min(min, p); max = Math.max(max, p);
    }
    return asym >= min - 0.15 && asym <= max + 0.15;
  }

  // Tria els valors esquerra/dreta: tal com s'han llegit si quadren amb l'asimetria; si no, la correcció mínima que hi quadri.
  function fixPair(rawE, rawD, asym, measure) {
    const ce = candidates(rawE, measure), cd = candidates(rawD, measure);
    if (!ce.length || !cd.length) {
      return { e: ce[0] ? ce[0].v : null, d: cd[0] ? cd[0].v : null, ok: false, fixed: false };
    }
    let best = null;
    for (const e of ce) for (const d of cd) {
      if (!asymOk(e, d, asym)) continue;
      const cost = e.cost + d.cost;
      if (!best || cost < best.cost) best = { e, d, cost };
    }
    if (!best) return { e: ce[0].v, d: cd[0].v, ok: asym == null, fixed: false };
    return { e: best.e.v, d: best.d.v, ok: true, fixed: best.cost >= 1 };
  }

  // A quin camp de la valoració va cada prova (pel títol, en castellà, català o anglès).
  const has = (t, ...res) => res.every((re) => re.test(t));
  const HIP = /cadera|maluc|hip/, KNEE = /rodilla|genoll|knee/, SHOULDER = /hombro|espatlla|shoulder|abducci[oó]n de 90|abduccio de 90|90° abduction/;
  const EXT_ROT = /extern|external/, INT_ROT = /intern|internal/;
  function target(title, measure) {
    const t = norm(title);
    if (measure === 'angle') {
      if (has(t, HIP, EXT_ROT)) return 'rom_hip_er';
      if (has(t, HIP, INT_ROT)) return 'rom_hip_ir';
      if (has(t, SHOULDER, EXT_ROT)) return 'rom_sh_er';
      if (has(t, SHOULDER, INT_ROT)) return 'rom_sh_ir';
      if (has(t, /flexi|flex/, /hombro|espatlla|shoulder/)) return 'rom_sh_flex';
      if (has(t, /extensi|extens/, KNEE)) return 'rom_knee_ext';
      if (has(t, /flexi|flex/, KNEE)) return 'rom_knee_flex';
      return '';
    }
    if (has(t, /extensi|extens/, KNEE)) return 'dyn_knee_ext';
    if (has(t, /flexi|flex|curl/, KNEE)) return /\b30\b/.test(t) ? 'dyn_curl_30' : 'dyn_curl_90';
    if (/aducci|adducci|adduct|squeeze/.test(t)) return 'dyn_squeeze';
    if (has(t, HIP, EXT_ROT)) return 'dyn_hip_er';
    if (has(t, HIP, INT_ROT)) return 'dyn_hip_ir';
    if (has(t, SHOULDER, EXT_ROT)) return 'dyn_sh_er';
    return '';
  }

  // Kinvent dona la força en kg; la valoració la guarda en newtons.
  const KG_TO_N = 9.80665;
  const toN = (kg) => (kg == null ? null : Math.round(kg * KG_TO_N));

  return { jpegs, cards, cleanTitle, valueBox, candidates, fixPair, target, toN, KG_TO_N };
})();
