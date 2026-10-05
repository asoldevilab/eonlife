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
  // Encapçalament de cada targeta («Ángulo máximo», «Fuerza máxima»…): una línia curta que comença així.
  // També mal llegida: «Angule maximo», «Fuerza mama»…
  const HEAD = /^(\S*gul\S*|angle|fuer\S*|f\S*rza|forca|force)\s+(m|rn)\S*(\s+\S{1,2})?$|^(max(imum)? (angle|force)|peak force)$/;
  const FORCE = /^(fuer\S*|f\S*rza|forca|force|max(imum)? force|peak force)/;
  // Etiquetes «Izquierda» i «Derecha», també mig mal llegides («lzquierda», «¿quierda», «Derecna»…).
  const LEFT = /^(izquierda|esquerra|left|gauche)$/, RIGHT = /^(derecha|dreta|right|droite)$/;
  const isLeft = (w) => LEFT.test(w) || /quier|zquie|uierd|ierda/.test(w);
  const isRight = (w) => RIGHT.test(w) || /derec|erech|recha/.test(w);
  // Posició de les etiquetes a l'informe de Kinvent Physio, en proporció a l'amplada llegida (el 60 % esquerre de la
  // pàgina): serveix quan l'OCR no en llegeix alguna. Les dues són simètriques respecte del centre del gràfic.
  const GEO = { mid: 0.525, dy: 0.155, h: 0.0164, left: [0.1743, 0.2421], right: [0.8114, 0.8721] };
  const mirror = (b, w) => ({ x0: 2 * GEO.mid * w - b.x1, x1: 2 * GEO.mid * w - b.x0, y0: b.y0, y1: b.y1 });
  const nominal = (side, b, w) => ({ x0: GEO[side][0] * w, x1: GEO[side][1] * w, y0: b.y0, y1: b.y0 + GEO.h * w });

  // Títol net: sense la icona del dispositiu que l'OCR llegeix com a lletres soltes («WEN», «|»…).
  function cleanTitle(s) {
    const words = String(s || '').replace(/[|]/g, ' ').trim().split(/\s+/);
    while (words.length > 1 && !/^[A-ZÁÉÍÓÚÀÈÒÇ][a-záéíóúàèòïüç]/.test(words[0])) words.shift();
    return words.join(' ').replace(/(\d)\s*[*"”″º](?=\s|\)|$)/g, '$1°').replace(/\s+/g, ' ').trim();
  }

  // L'asimetria («17.9% Asimetría»), també quan el % o la paraula surten mal llegits («17.97 Asiietria», «3.9.Asmetna»).
  function asymOf(text) {
    const n = norm(text);
    const m = n.match(/(\d+(?:[.,]\d+)?)\s*%\s*(asimetr|asymmetr)/) || n.match(/(\d{1,2}[.,]\d)\S{0,2}\s*a\s?[s5][a-z]{3,}/);
    const v = m ? U.num(m[1]) : null;
    return v != null && v <= 100 ? v : null;
  }

  // Targetes d'una pàgina a partir de les línies de l'OCR ({ text, bbox, words: [{ text, bbox }] }).
  // width: amplada de la imatge llegida (per situar les etiquetes que no s'hagin llegit).
  function cards(lines, width = 1400) {
    const list = (lines || []).filter((l) => l && String(l.text || '').trim());
    const out = [];
    list.forEach((l, i) => {
      const n = norm(l.text);
      if (!HEAD.test(n) || n.split(' ').length > 3 || n.length > 26) return;
      let t = i - 1;
      while (t >= 0 && norm(list[t].text).replace(/[^a-z]/g, '').length < 6) t--;
      if (t < 0) return;
      out.push({ title: cleanTitle(list[t].text), measure: FORCE.test(n) ? 'force' : 'angle', head: l.bbox, from: i });
    });
    out.forEach((c, k) => {
      const until = k + 1 < out.length ? out[k + 1].from : list.length;
      const body = list.slice(c.from + 1, until);
      let row = null;
      for (const l of body) {
        for (const w of l.words || []) {
          const wn = norm(w.text).replace(/[^a-z]/g, '');
          if (wn.length < 3) continue;
          // Si la paraula està mig mal llegida, la seva caixa no és fiable: es fa servir la posició habitual a la mateixa alçada.
          if (!c.right && isRight(wn)) { c.right = RIGHT.test(wn) ? w.bbox : nominal('right', w.bbox, width); row = row || l; }
          else if (!c.left && isLeft(wn)) { c.left = LEFT.test(wn) ? w.bbox : nominal('left', w.bbox, width); row = row || l; }
        }
        if (c.asym == null) c.asym = asymOf(l.text);
      }
      // Una etiqueta llegida i l'altra no: és la paraula de l'altra banda de la mateixa línia o, si no n'hi ha, el mirall.
      if (row && !(c.left && c.right)) {
        const found = c.left || c.right;
        const other = (row.words || []).filter((w) => w.bbox !== found && norm(w.text).replace(/[^a-z]/g, '').length >= 3
          && (c.left ? w.bbox.x0 > found.x1 + (found.x1 - found.x0) : w.bbox.x1 < found.x0 - (found.x1 - found.x0)));
        const pick = other.length ? other[c.left ? other.length - 1 : 0].bbox : mirror(found, width);
        if (c.left) c.right = pick; else c.left = pick;
        c.guessed = true;
      }
      // Cap etiqueta llegida: on són sempre, a sota de l'encapçalament.
      if (!c.left && !c.right && c.head) {
        const y0 = c.head.y0 + GEO.dy * width, y1 = y0 + GEO.h * width;
        c.left = { x0: GEO.left[0] * width, x1: GEO.left[1] * width, y0, y1 };
        c.right = { x0: GEO.right[0] * width, x1: GEO.right[1] * width, y0, y1 };
        c.guessed = true;
      }
      // Números que la primera lectura ja ha vist a sota de cada etiqueta (una segona opció per als valors).
      for (const side of ['left', 'right']) {
        const b = c[side] && valueBox(c[side], width);
        if (!b) continue;
        const words = body.flatMap((l) => l.words || []).filter((w) => /\d/.test(w.text)
          && (w.bbox.x0 + w.bbox.x1) / 2 > b.x0 && (w.bbox.x0 + w.bbox.x1) / 2 < b.x1 && (w.bbox.y0 + w.bbox.y1) / 2 > b.y0 && (w.bbox.y0 + w.bbox.y1) / 2 < b.y1);
        c[side === 'left' ? 'lineE' : 'lineD'] = words.length ? words[0].text : '';
      }
      delete c.from;
    });
    return out;
  }

  // On es llegeix el valor: just a sota de l'etiqueta «Izquierda» o «Derecha», centrat i una mica més ample.
  // Les mides van en proporció a l'amplada llegida (no a la caixa de l'etiqueta, que l'OCR pot fer més gran o més petita):
  // el número és entre 1,4 i 4 alçades d'etiqueta per sota; més avall hi ha la fletxa amb el percentatge, que confondria.
  function valueBox(b, width = 1400) {
    const h = GEO.h * width, cx = (b.x0 + b.x1) / 2;
    const w = Math.min(Math.max(b.x1 - b.x0, 0.05 * width), 0.09 * width);
    return { x0: cx - w * 0.85, y0: b.y0 + h * 1.4, x1: cx + w * 0.85, y1: b.y0 + h * 4 };
  }

  // Possibles lectures d'un número, amb el «cost» de cada correcció.
  const CONFUSE = { 0: '689', 1: '7', 2: '7', 3: '8', 4: '1', 5: '63', 6: '058', 7: '12', 8: '3609', 9: '80' };
  const PLAUSIBLE = { angle: [0, 220], force: [0, 200] };
  function candidates(raw, measure) {
    // El número és la primera paraula amb xifres; la resta solen ser el símbol de grau o la unitat mal llegits.
    const tokens = String(raw || '').split(/\s+/).filter((t) => /\d/.test(t));
    const out = new Map();
    const [lo, hi] = PLAUSIBLE[measure] || [0, 1000];
    const add = (str, cost) => {
      const v = Number(str);
      // Kinvent escriu com a màxim una xifra decimal.
      if (!Number.isFinite(v) || v <= lo || v > hi || /\.\d{2}/.test(str)) return;
      // I la posa per sota de 100, però no a partir de 100.
      const fmtCost = (str.includes('.') ? v >= 100 : v < 100) ? 0.6 : 0;
      const c = cost + fmtCost;
      if (!out.has(v) || out.get(v).cost > c) out.set(v, { v, cost: c, dec: str.includes('.') });
    };
    const clean = (t) => {
      let x = t.replace(/,/g, '.').replace(/[^\d.]/g, '');
      const dot = x.indexOf('.');
      if (dot >= 0) x = x.slice(0, dot + 1) + x.slice(dot + 1).replace(/\./g, '');
      return x.replace(/^\.+|\.+$/g, '');
    };
    const sources = tokens.length > 1 ? [[clean(tokens[0]), 0], [clean(tokens.join('')), 0.4]] : [[clean(tokens.join('')), 0]];
    // Xifres de més després del decimal: la unitat («kg») o el grau llegits com a números («7.519» → 7.5).
    for (const [s0, c0] of [...sources]) if (/\.\d{2,}/.test(s0)) sources.push([s0.slice(0, s0.indexOf('.') + 2), c0 + 0.3]);
    for (const [s0, c0] of sources) {
      if (!s0) continue;
      const bases = [[s0, c0]];
      if (!s0.includes('.') && s0.length >= 2) bases.push([`${s0.slice(0, -1)}.${s0.slice(-1)}`, c0 + 0.5]);
      for (const [b, c] of bases) {
        add(b, c);
        for (let i = 0; i < b.length; i++) {
          for (const alt of CONFUSE[b[i]] || '') add(b.slice(0, i) + alt + b.slice(i + 1), c + 1);
        }
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

  // Totes les lectures d'un costat (la primera és la més fiable): com més lectures hi coincideixen, més s'hi confia.
  function candidatesAll(raws, measure) {
    const list = (Array.isArray(raws) ? raws : [raws]).filter((r) => r != null && String(r).trim());
    const out = new Map();
    list.forEach((raw, j) => {
      for (const c of candidates(raw, measure)) {
        const cost = c.cost + j * 0.2;
        const cur = out.get(c.v);
        if (!cur) out.set(c.v, { ...c, cost, n: c.cost < 0.7 ? 1 : 0 });
        else { cur.cost = Math.min(cur.cost, cost); if (c.cost < 0.7) cur.n++; }
      }
    });
    for (const c of out.values()) if (c.n > 1) c.cost = Math.max(0, c.cost - 0.3 * (c.n - 1));
    return [...out.values()].sort((a, b) => a.cost - b.cost);
  }

  // Tria els valors esquerra/dreta: tal com s'han llegit si quadren amb l'asimetria; si no, la correcció mínima que hi quadri.
  // rawE i rawD poden ser una lectura o una llista de lectures. Sense asimetria no es pot comprovar: ok és fals.
  function fixPair(rawE, rawD, asym, measure) {
    const ce = candidatesAll(rawE, measure), cd = candidatesAll(rawD, measure);
    if (!ce.length || !cd.length) {
      return { e: ce[0] ? ce[0].v : null, d: cd[0] ? cd[0].v : null, ok: false, fixed: false };
    }
    if (asym == null) return { e: ce[0].v, d: cd[0].v, ok: false, fixed: false };
    let best = null;
    for (const e of ce) for (const d of cd) {
      if (!asymOk(e, d, asym)) continue;
      const cost = e.cost + d.cost;
      if (!best || cost < best.cost) best = { e, d, cost };
    }
    if (!best) return { e: ce[0].v, d: cd[0].v, ok: false, fixed: false };
    return { e: best.e.v, d: best.d.v, ok: true, fixed: best.cost >= 1 };
  }

  // A quin camp de la valoració va cada prova (pel títol, en castellà, català o anglès).
  const has = (t, ...res) => res.every((re) => re.test(t));
  const HIP = /cadera|maluc|hip/, KNEE = /rodilla|genoll|knee/, SHOULDER = /hombro|espatlla|shoulder|abducci[oó]n de 90|abduccio de 90|90° abduction/;
  // L'OCR sovint llegeix «rn» com a «m» («intema», «extema»).
  const EXT_ROT = /exte(rn|m)/, INT_ROT = /inte(rn|m)/;
  const FLEX = /f[a-z]{0,2}exi|flex/, EXTENS = /extensi|extens/;
  function target(title, measure) {
    const t = norm(title);
    if (measure === 'angle') {
      if (has(t, HIP, EXT_ROT)) return 'rom_hip_er';
      if (has(t, HIP, INT_ROT)) return 'rom_hip_ir';
      if (has(t, SHOULDER, EXT_ROT)) return 'rom_sh_er';
      if (has(t, SHOULDER, INT_ROT)) return 'rom_sh_ir';
      if (has(t, FLEX, /hombro|espatlla|shoulder/)) return 'rom_sh_flex';
      if (has(t, EXTENS, KNEE)) return 'rom_knee_ext';
      if (has(t, FLEX, KNEE)) return 'rom_knee_flex';
      return '';
    }
    if (has(t, EXTENS, KNEE)) return 'dyn_knee_ext';
    if (has(t, FLEX, KNEE) || has(t, /curl/, KNEE)) return /\b30\b/.test(t) ? 'dyn_curl_30' : 'dyn_curl_90';
    if (/aducci|adducci|adduct|squeeze/.test(t)) return 'dyn_squeeze';
    if (has(t, HIP, EXT_ROT)) return 'dyn_hip_er';
    if (has(t, HIP, INT_ROT)) return 'dyn_hip_ir';
    if (has(t, SHOULDER, EXT_ROT)) return 'dyn_sh_er';
    return '';
  }

  // Kinvent dona la força en kg; la valoració la guarda en newtons.
  const KG_TO_N = 9.80665;
  const toN = (kg) => (kg == null ? null : Math.round(kg * KG_TO_N));

  return { jpegs, cards, cleanTitle, asymOf, valueBox, candidates, fixPair, target, toN, KG_TO_N };
})();
