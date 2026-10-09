/* EON Life · lectura de la pantalla de l'Assault Bike amb una foto.
   La pantalla (LCD de segments) té sempre la mateixa disposició: el temps, la distància, les calories, i a sota els
   watts, la velocitat i les RPM mitjanes. L'usuari marca els quatre cantons de la pantalla a la foto; amb això es
   «dreça» la imatge (perspectiva) i cada casella es llegeix dígit a dígit comprovant quins dels 7 segments són foscos.
   Tot passa a la tauleta: la foto no surt de l'aparell. Els valors surten a les caselles perquè es comprovin abans de
   desar-los. Les funcions treballen sobre imatges en gris (Uint8Array) per poder-les provar fora del navegador. */

const LcdReader = (() => {
  // Mida de la pantalla dreçada i caselles (fraccions de la finestra de la pantalla: x0, y0, x1, y1).
  // want: com s'interpreta el que es llegeix (time = m:ss, num = un número amb un decimal si hi ha el punt).
  const W = 480, H = 1120;
  const FIELDS = {
    time: { label: 'Temps', box: [0.64, 0.338, 0.955, 0.440], want: 'time' },
    dist: { label: 'Distància', box: [0.70, 0.455, 0.955, 0.540], want: 'num' },
    cal: { label: 'Calories', box: [0.60, 0.556, 0.955, 0.640], want: 'num' },
    watts: { label: 'Watts mitjans', box: [0.07, 0.718, 0.345, 0.792], want: 'num' },
    speed: { label: 'Velocitat mitjana', box: [0.375, 0.718, 0.685, 0.792], want: 'num' },
    rpm: { label: 'RPM mitjanes', box: [0.725, 0.718, 0.955, 0.792], want: 'num' },
  };

  // ── Perspectiva ──
  // Sistema d'equacions 8×8 (eliminació de Gauss) per trobar l'homografia que porta el rectangle W×H a les quatre cantonades de la foto.
  function homography(quad) {
    const dst = [[0, 0], [W, 0], [W, H], [0, H]];
    const A = [], b = [];
    for (let i = 0; i < 4; i++) {
      const [x, y] = dst[i], [u, v] = quad[i];
      A.push([x, y, 1, 0, 0, 0, -u * x, -u * y]); b.push(u);
      A.push([0, 0, 0, x, y, 1, -v * x, -v * y]); b.push(v);
    }
    const n = 8;
    for (let i = 0; i < n; i++) {
      let m = i;
      for (let r = i + 1; r < n; r++) if (Math.abs(A[r][i]) > Math.abs(A[m][i])) m = r;
      [A[i], A[m]] = [A[m], A[i]]; [b[i], b[m]] = [b[m], b[i]];
      if (Math.abs(A[i][i]) < 1e-9) return null;
      for (let r = i + 1; r < n; r++) {
        const f = A[r][i] / A[i][i];
        for (let c = i; c < n; c++) A[r][c] -= f * A[i][c];
        b[r] -= f * b[i];
      }
    }
    const h = new Array(n);
    for (let i = n - 1; i >= 0; i--) {
      let s = b[i];
      for (let c = i + 1; c < n; c++) s -= A[i][c] * h[c];
      h[i] = s / A[i][i];
    }
    return h;
  }

  // Imatge en gris (w × h) → pantalla dreçada W × H (interpolació bilineal).
  function warp(gray, w, h, quad) {
    const t = homography(quad);
    if (!t) return null;
    const out = new Uint8Array(W * H);
    for (let y = 0; y < H; y++) {
      for (let x = 0; x < W; x++) {
        const d = t[6] * x + t[7] * y + 1;
        const u = (t[0] * x + t[1] * y + t[2]) / d, v = (t[3] * x + t[4] * y + t[5]) / d;
        const x0 = Math.floor(u), y0 = Math.floor(v);
        if (x0 < 0 || y0 < 0 || x0 >= w - 1 || y0 >= h - 1) { out[y * W + x] = 255; continue; }
        const fx = u - x0, fy = v - y0, i = y0 * w + x0;
        out[y * W + x] = gray[i] * (1 - fx) * (1 - fy) + gray[i + 1] * fx * (1 - fy) + gray[i + w] * (1 - fx) * fy + gray[i + w + 1] * fx * fy;
      }
    }
    return out;
  }

  // ── Segmentació d'una casella ──
  // Llindar d'Otsu sobre la casella (la tinta és més fosca que el fons de la pantalla).
  function otsu(vals) {
    const hist = new Array(256).fill(0);
    for (const v of vals) hist[v | 0]++;
    const total = vals.length;
    let sum = 0;
    for (let i = 0; i < 256; i++) sum += i * hist[i];
    let wb = 0, sb = 0, best = 0, first = 128, last = 128;
    for (let i = 0; i < 256; i++) {
      wb += hist[i];
      if (!wb) continue;
      const wf = total - wb;
      if (!wf) break;
      sb += i * hist[i];
      const mb = sb / wb, mf = (sum - sb) / wf;
      const between = wb * wf * (mb - mf) * (mb - mf);
      if (between > best * (1 + 1e-9)) { best = between; first = last = i; }
      else if (between >= best * (1 - 1e-9)) last = i; // un tram pla (imatge de dos tons): s'agafa el mig
    }
    return Math.round((first + last) / 2);
  }

  // Components connexos (8 veïns) de la màscara de tinta: [{ x0, y0, x1, y1, n }].
  function components(mask, w, h) {
    const lab = new Int32Array(w * h);
    const out = [];
    const stack = [];
    for (let i = 0; i < w * h; i++) {
      if (!mask[i] || lab[i]) continue;
      const id = out.length + 1;
      let x0 = w, y0 = h, x1 = 0, y1 = 0, n = 0;
      stack.push(i); lab[i] = id;
      while (stack.length) {
        const p = stack.pop();
        const px = p % w, py = (p / w) | 0;
        n++;
        if (px < x0) x0 = px; if (px > x1) x1 = px; if (py < y0) y0 = py; if (py > y1) y1 = py;
        for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
          const nx = px + dx, ny = py + dy;
          if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
          const q = ny * w + nx;
          if (mask[q] && !lab[q]) { lab[q] = id; stack.push(q); }
        }
      }
      out.push({ x0, y0, x1, y1, n });
    }
    return out;
  }

  // Segments d'un dígit (a b c d e f g) → xifra. Posicions normalitzades dins la caixa del dígit.
  // Segments en ordre a b c d e f g (a dalt, b dalt dreta, c baix dreta, d baix, e baix esquerra, f dalt esquerra, g al mig).
  const PATTERNS = { '1111110': '0', '0110000': '1', '1101101': '2', '1111001': '3', '0110011': '4', '1011011': '5', '1011111': '6', '0011111': '6',
    '1110000': '7', '1110010': '7', '1111111': '8', '1111011': '9', '1110011': '9' };
  // [x0, y0, x1, y1] de cada segment, i si és horitzontal.
  const SEGS = [[0.22, 0.00, 0.78, 0.15], [0.80, 0.08, 1.00, 0.46], [0.80, 0.54, 1.00, 0.92], [0.22, 0.85, 0.78, 1.00], [0.00, 0.54, 0.20, 0.92], [0.00, 0.08, 0.20, 0.46], [0.22, 0.425, 0.78, 0.575]];

  // Els dígits de la pantalla són en cursiva: el dígit s'inclina cap a la dreta per dalt. Per mostrejar un segment es
  // desfà la inclinació (slant = fracció de l'alçada que es desplaça la part de dalt).
  function digitAt(ink, w, box, slant) {
    const bw = box.x1 - box.x0 + 1, bh = box.y1 - box.y0 + 1;
    const sw = slant * bh, cw = Math.max(bw - sw, 1);
    const frac = SEGS.map(([u0, v0, u1, v1]) => {
      let on = 0, tot = 0;
      for (let y = Math.floor(box.y0 + v0 * bh); y <= Math.ceil(box.y0 + v1 * bh - 1); y++) {
        const v = (y - box.y0) / bh;
        const left = box.x0 + sw * (1 - v);
        for (let x = Math.floor(left + u0 * cw); x <= Math.ceil(left + u1 * cw - 1); x++) {
          tot++;
          if (x >= 0 && ink[y * w + x]) on++;
        }
      }
      return tot ? on / tot : 0;
    });
    const key = frac.map((f) => (f > 0.38 ? '1' : '0')).join('');
    const ch = PATTERNS[key] != null ? PATTERNS[key] : '?';
    return { ch, frac, key, margin: Math.min(...frac.map((f) => Math.abs(f - 0.38))) };
  }

  // Llegeix una casella de la pantalla dreçada. Retorna { text, chars, conf }.
  function readField(img, def, debug) {
    let x0, y0, x1, y1;
    if (def.px) [x0, y0, x1, y1] = def.px;
    else { const [fx0, fy0, fx1, fy1] = def.box; x0 = Math.round(fx0 * W); y0 = Math.round(fy0 * H); x1 = Math.round(fx1 * W); y1 = Math.round(fy1 * H); }
    x0 = Math.max(0, x0); y0 = Math.max(0, y0); x1 = Math.min(W, x1); y1 = Math.min(H, y1);
    const w = x1 - x0, h = y1 - y0;
    // Estirem el contrast (percentils 2–98) i binaritzem amb Otsu.
    const px = new Uint8Array(w * h);
    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) px[y * w + x] = img[(y0 + y) * W + x0 + x];
    const sorted = Array.from(px).sort((a, b) => a - b);
    const lo = sorted[Math.floor(sorted.length * 0.02)], hi = sorted[Math.floor(sorted.length * 0.98)];
    const span = Math.max(hi - lo, 1);
    const norm = px.map((v) => Math.max(0, Math.min(255, ((v - lo) / span) * 255)));
    // Una mica per sota d'Otsu: així els segments i el punt decimal no es toquen per la imatge borrosa.
    const thr = Math.min(otsu(norm) * 0.86, 190);
    const ink = new Uint8Array(w * h);
    for (let i = 0; i < w * h; i++) ink[i] = norm[i] < thr ? 1 : 0;
    // Traiem les línies que separen les files i les vores de la pantalla: files i columnes gairebé senceres de tinta
    // (un traç continu; els dos segments d'un 1 ocupen la mateixa columna però amb un buit pel mig).
    const longest = (get, n) => { let best = 0, cur = 0; for (let i = 0; i < n; i++) { if (get(i)) { cur++; if (cur > best) best = cur; } else cur = 0; } return best; };
    for (let y = 0; y < h; y++) {
      if (longest((x) => ink[y * w + x], w) > w * 0.8) for (let yy = Math.max(0, y - 2); yy <= Math.min(h - 1, y + 2); yy++) for (let x = 0; x < w; x++) ink[yy * w + x] = 0;
    }
    for (let x = 0; x < w; x++) {
      if (longest((y) => ink[y * w + x], h) > h * 0.8) for (let xx = Math.max(0, x - 2); xx <= Math.min(w - 1, x + 2); xx++) for (let y = 0; y < h; y++) ink[y * w + xx] = 0;
    }
    // Les línies inclinades (si els cantons no són exactes) no ocupen files senceres: també es treuen els traços massa
    // llargs per ser un segment (més de 36 px en horitzontal o 52 en vertical, a l'escala de la pantalla dreçada).
    for (let y = 0; y < h; y++) {
      let x = 0;
      while (x < w) {
        if (!ink[y * w + x]) { x++; continue; }
        let e = x;
        while (e < w && ink[y * w + e]) e++;
        if (e - x > 36) for (let k = x; k < e; k++) ink[y * w + k] = 0;
        x = e;
      }
    }
    for (let x = 0; x < w; x++) {
      let y = 0;
      while (y < h) {
        if (!ink[y * w + x]) { y++; continue; }
        let e = y;
        while (e < h && ink[e * w + x]) e++;
        if (e - y > 52) for (let k = y; k < e; k++) ink[k * w + x] = 0;
        y = e;
      }
    }
    // …i el soroll petit.
    let comps = components(ink, w, h).filter((c) => c.n >= 10);
    if (!comps.length) return { text: '', chars: [], conf: 0 };
    // La franja dels dígits: la dels components alts (els segments verticals). Els que queden fora (lletres del nom de la
    // casella, vores…) no compten.
    const maxC = Math.max(...comps.map((c) => c.y1 - c.y0 + 1));
    const tallC = comps.filter((c) => c.y1 - c.y0 + 1 >= maxC * 0.4);
    const bandTop = Math.min(...tallC.map((c) => c.y0)), bandBottom = Math.max(...tallC.map((c) => c.y1));
    // Els segments horitzontals de dalt i de baix queden centrats a la vora de la franja: un petit marge els deixa entrar.
    const pad = Math.max(1, Math.round((bandBottom - bandTop + 1) * 0.06));
    comps = comps.filter((c) => (c.y0 + c.y1) / 2 >= bandTop - pad && (c.y0 + c.y1) / 2 <= bandBottom + pad).sort((a, b2) => a.x0 - b2.x0);
    if (!comps.length) return { text: '', chars: [], conf: 0 };
    // Punts i dos punts: components diminuts (cap dimensió passa del 20 % de l'alçada dels dígits).
    const bh0 = bandBottom - bandTop + 1;
    const isDot = (c) => c.x1 - c.x0 + 1 <= bh0 * 0.2 && c.y1 - c.y0 + 1 <= bh0 * 0.2;
    const dotComps = comps.filter(isDot);
    const segs = comps.filter((c) => !isDot(c));
    if (!segs.length) return { text: '', chars: [], conf: 0 };
    // Cada segment és un component: s'agrupen en dígits quan se solapen (o gairebé es toquen) en x. Les barres uneixen els
    // verticals d'un mateix dígit, i entre dos dígits sempre hi ha un buit.
    const groups = [];
    for (const c of segs) {
      const g = groups[groups.length - 1];
      if (g && c.x0 <= g.x1 + 1) {
        g.x0 = Math.min(g.x0, c.x0); g.x1 = Math.max(g.x1, c.x1); g.y0 = Math.min(g.y0, c.y0); g.y1 = Math.max(g.y1, c.y1); g.parts.push(c);
      } else groups.push({ x0: c.x0, y0: c.y0, x1: c.x1, y1: c.y1, parts: [c] });
    }
    const digits = groups.filter((d) => d.y1 - d.y0 + 1 >= bh0 * 0.5);
    const valid = digits;
    if (!valid.length) return { text: '', chars: [], conf: 0 };
    // L'alçada dels dígits: dels segments de dalt als de baix (els verticals poden quedar una mica per dins).
    const top = Math.min(...valid.map((d) => d.y0)), bottom = Math.max(...valid.map((d) => d.y1)), bh = bottom - top + 1;
    // Els punts: un de sol a la part baixa és el decimal; dos amb la mateixa x, a mitja alçada, són el dos punts.
    const dots = [];
    dotComps.sort((p, q) => p.x0 - q.x0);
    for (let i = 0; i < dotComps.length; i++) {
      const c = dotComps[i], d = dotComps[i + 1];
      if (d && Math.abs(c.x0 - d.x0) <= bh * 0.12) { dots.push({ x0: Math.min(c.x0, d.x0), y0: Math.min(c.y0, d.y0), y1: Math.max(c.y1, d.y1), parts: [c, d] }); i++; }
      else dots.push({ x0: c.x0, y0: c.y0, y1: c.y1, parts: [c] });
    }
    // La inclinació de la cursiva: la que deixa els dígits més clars.
    let best = null;
    for (const slant of [0, 0.04, 0.08, 0.12, 0.16]) {
      const res = valid.map((d) => (d.x1 - d.x0 + 1 < bh * 0.3 ? { ch: '1', margin: 0.2, key: 'narrow' } : digitAt(ink, w, { x0: d.x0, x1: d.x1, y0: top, y1: bottom }, slant)));
      const score = res.reduce((s0, r) => s0 + (r.ch === '?' ? -1 : r.margin), 0);
      if (!best || score > best.score) best = { slant, res, score };
    }
    const items = valid.map((d, i) => ({ x: d.x0, ...best.res[i] }));
    // Punts (a la part baixa) i dos punts (dos blocs petits un sobre l'altre, a mitja alçada).
    for (const d of dots) {
      const cy = ((d.y0 + d.y1) / 2 - top) / bh;
      if (d.parts.length >= 2 && cy > 0.25 && cy < 0.75) items.push({ x: d.x0, ch: ':', margin: 0.2 });
      else if (d.parts.length === 1 && cy > 0.65) items.push({ x: d.x0, ch: '.', margin: 0.2 });
    }
    items.sort((a, b) => a.x - b.x);
    const text = items.map((i) => i.ch).join('');
    const conf = items.length ? Math.max(0, Math.min(1, Math.min(...items.map((i) => (i.ch === '?' ? 0 : i.margin))) / 0.2)) : 0;
    return { text, chars: items.map((i) => i.ch), conf, keys: items.map((i) => i.key), dbg: debug ? { comps, groups, dots, thr, w, h, ink, top, bottom, digits, slant: best.slant, res: best.res, valid } : null };
  }

  // Interpreta el text d'una casella: m:ss → segons; números amb un decimal.
  function parseValue(text, want) {
    const t = String(text || '');
    if (!t || /\?/.test(t)) return null;
    if (want === 'time') {
      const m = t.match(/^(\d{1,2}):(\d{2})$/) || t.match(/^(\d{1,2})(\d{2})$/);
      return m ? Number(m[1]) * 60 + Number(m[2]) : null;
    }
    return /^\d+(\.\d+)?$/.test(t) ? Number(t) : null;
  }

  // ── On són realment les files ──
  // Les files de la pantalla estan separades per línies fosques. Si els cantons marcats no són exactes, tota la imatge
  // dreçada queda una mica desplaçada: es busquen aquestes línies (a prop d'on haurien de ser) i les caselles es posen
  // entre elles. Si no se'n troba cap, es fan servir les posicions teòriques.
  const SEP_Y = [0.297, 0.444, 0.545, 0.645, 0.793];
  const SEP_X = [0.354, 0.698];
  function lowThreshold(img) {
    const v = [];
    for (let i = 0; i < img.length; i += 7) v.push(img[i]);
    v.sort((a, b) => a - b);
    return v[Math.floor(v.length * 0.8)] * 0.6;
  }
  // Perfil suavitzat de la quantitat de tinta per fila (axis 'y') o per columna (axis 'x') dins d'un rang de l'altra direcció.
  function profile(img, thr, axis, a0, a1) {
    const len = axis === 'y' ? H : W, other = axis === 'y' ? W : H;
    const raw = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let n = 0;
      for (let j = a0; j < a1; j++) n += img[axis === 'y' ? i * W + j : j * W + i] < thr ? 1 : 0;
      raw[i] = n / Math.max(a1 - a0, 1);
    }
    void other;
    const sm = new Float32Array(len);
    for (let i = 0; i < len; i++) {
      let t = 0, c = 0;
      for (let d = -4; d <= 4; d++) if (i + d >= 0 && i + d < len) { t += raw[i + d]; c++; }
      sm[i] = t / c;
    }
    return sm;
  }
  function nearestPeak(sm, expect, tol, min) {
    let best = -1, bv = min;
    for (let i = Math.max(1, Math.round(expect - tol)); i < Math.min(sm.length - 1, Math.round(expect + tol)); i++) {
      if (sm[i] > bv && sm[i] >= sm[i - 1] && sm[i] >= sm[i + 1]) { bv = sm[i]; best = i; }
    }
    return best;
  }
  function locate(img) {
    const thr = lowThreshold(img);
    const sy = profile(img, thr, 'y', Math.round(0.1 * W), Math.round(0.9 * W));
    const ys = SEP_Y.map((e) => { const p = nearestPeak(sy, e * H, 0.05 * H, 0.22); return p >= 0 ? p : null; });
    const y = ys.map((v, i) => (v == null ? Math.round(SEP_Y[i] * H) : v));
    // La fila de baix: tres caselles separades per línies verticals.
    const b0 = y[3] + 6, b1 = y[4] - 6;
    const sx = profile(img, thr, 'x', b0, b1);
    const xs = SEP_X.map((e) => { const p = nearestPeak(sx, e * W, 0.06 * W, 0.45); return p >= 0 ? p : null; });
    const x = xs.map((v, i) => (v == null ? Math.round(SEP_X[i] * W) : v));
    return { y, x, found: ys.filter((v) => v != null).length + xs.filter((v) => v != null).length };
  }

  // Caselles a partir de la geometria trobada: [x0, y0, x1, y1] en píxels de la pantalla dreçada.
  function layout(img) {
    const g = locate(img);
    const m = 7;
    const right = Math.round(0.975 * W);
    const band = (a, b) => [a + m, b - m];
    const row = (k, a, b, x0) => { const [y0, y1] = band(a, b); return { ...FIELDS[k], px: [Math.round(x0 * W), y0, right, y1] }; };
    // A la fila de baix els números són a la part de sota de la casella (a sobre hi ha el nom i «AVERAGE»).
    const bh = g.y[4] - g.y[3];
    const dy0 = g.y[3] + Math.round(bh * 0.47), dy1 = g.y[4] - 5;
    const cell = (k, a, b) => ({ ...FIELDS[k], px: [a, dy0, b, dy1] });
    return {
      geom: g,
      fields: {
        time: row('time', g.y[0], g.y[1], 0.56),
        dist: row('dist', g.y[1], g.y[2], 0.56),
        cal: row('cal', g.y[2], g.y[3], 0.56),
        watts: cell('watts', 28, g.x[0] - 7), speed: cell('speed', g.x[0] + 13, g.x[1] - 7), rpm: cell('rpm', g.x[1] + 13, right - 14),
      },
    };
  }

  // Llegeix totes les caselles d'una pantalla dreçada.
  function readAll(img) {
    const lay = layout(img);
    const out = {};
    for (const [k, def] of Object.entries(lay.fields)) {
      const r = readField(img, def);
      out[k] = { text: r.text, value: parseValue(r.text, def.want), conf: r.conf };
    }
    out.geom = lay.geom;
    return out;
  }

  // Lectura amb votació: els cantons marcats a mà mai són exactes, i un petit error (2–3 % de la pantalla) basta per fer
  // llegir malament una casella. Es llegeix la pantalla amb diverses variacions dels cantons (desplaçaments i zoom) i
  // per a cada casella guanya el valor que més surt; la proporció de coincidències és la confiança de la lectura.
  async function readVoting(gray, w, h, quad, opts) {
    const side = Math.hypot(quad[1][0] - quad[0][0], quad[1][1] - quad[0][1]);
    const step = side * ((opts && opts.step) || 0.02);
    const cx = quad.reduce((s0, p) => s0 + p[0], 0) / 4, cy = quad.reduce((s0, p) => s0 + p[1], 0) / 4;
    const trials = [];
    for (const z of [1, 0.97, 1.03]) for (const dy of [-1, 0, 1]) for (const dx of [-1, 0, 1]) {
      trials.push(quad.map(([x, y]) => [cx + (x - cx) * z + dx * step, cy + (y - cy) * z + dy * step]));
    }
    const tally = {};
    let used = 0;
    for (let i = 0; i < trials.length; i++) {
      if (opts && opts.onProgress) opts.onProgress(i / trials.length);
      // Es cedeix el fil entre lectura i lectura perquè la pantalla no es quedi congelada.
      if (typeof setTimeout === 'function') await new Promise((ok) => setTimeout(ok, 0));
      const img = warp(gray, w, h, trials[i]);
      if (!img) continue;
      used++;
      const r = readAll(img);
      for (const k of Object.keys(FIELDS)) {
        if (r[k].value == null) continue;
        const key = String(r[k].value);
        const t = (tally[k] = tally[k] || {});
        t[key] = t[key] || { n: 0, conf: 0, text: r[k].text, value: r[k].value };
        t[key].n++; t[key].conf += r[k].conf;
      }
    }
    const out = {};
    for (const k of Object.keys(FIELDS)) {
      const cands = Object.values(tally[k] || {}).sort((a, b2) => b2.n - a.n || b2.conf - a.conf);
      const top = cands[0];
      out[k] = top ? { text: top.text, value: top.value, conf: used ? top.n / used : 0, alt: cands.slice(1, 3).map((c) => c.value) } : { text: '', value: null, conf: 0, alt: [] };
    }
    out.trials = used;
    return out;
  }

  return { W, H, FIELDS, homography, warp, locate, layout, readField, readAll, readVoting, parseValue, otsu };
})();
