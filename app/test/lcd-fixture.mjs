// Pantalles de l'Assault Bike inventades per provar el lector (cap foto real al repositori): una pantalla «dreçada»
// de 480 × 1120 amb la mateixa disposició que l'aparell (files separades per línies, tres caselles a baix, dígits de
// 7 segments en cursiva) i una foto en perspectiva on la pantalla hi és col·locada.
import { deflateSync } from 'node:zlib';

export const W = 480, H = 1120;
const INK = 45, PAPER = 205;

// Tinta a ratlles (com les lletres del nom de cada casella, que no són blocs plens).
function label(img, x0, y0, x1, y1) {
  for (let x = Math.round(x0); x < x1; x += 11) fill(img, x, y0, Math.min(x + 6, x1), y1);
}

function fill(img, x0, y0, x1, y1, v = INK) {
  for (let y = Math.max(0, Math.round(y0)); y < Math.min(H, Math.round(y1)); y++) for (let x = Math.max(0, Math.round(x0)); x < Math.min(W, Math.round(x1)); x++) img[y * W + x] = v;
}

// Segments (a b c d e f g) de cada xifra.
const ON = { 0: 'abcdef', 1: 'bc', 2: 'abdeg', 3: 'abcdg', 4: 'bcfg', 5: 'acdfg', 6: 'acdefg', 7: 'abc', 8: 'abcdefg', 9: 'abcdfg' };

// Un segment és un hexàgon allargat (com als LCD de veritat): els segments mai es toquen, però les seves caixes se
// solapen en x i en y. Es pinta fila a fila (la inclinació desplaça cada fila).
function poly(img, pts, slant, yRef, h) {
  const ys = pts.map((p) => p[1]);
  for (let yy = Math.ceil(Math.min(...ys)); yy <= Math.floor(Math.max(...ys)); yy++) {
    const xs = [];
    for (let i = 0; i < pts.length; i++) {
      const [x1, y1] = pts[i], [x2, y2] = pts[(i + 1) % pts.length];
      if ((y1 <= yy && y2 > yy) || (y2 <= yy && y1 > yy)) xs.push(x1 + ((yy - y1) / (y2 - y1)) * (x2 - x1));
    }
    if (xs.length < 2) continue;
    const off = slant * (h - (yy - yRef));
    fill(img, Math.min(...xs) + off, yy, Math.max(...xs) + off + 1, yy + 1);
  }
}

// Dibuixa una xifra amb la seva caixa (x, y, w, h), gruix t i inclinació (la part de dalt es desplaça cap a la dreta).
function digit(img, ch, x, y, w, h, t, slant) {
  const g = 1.5, q = t / 2;
  const H = (xa, xb, yc) => [[xa, yc], [xa + q, yc - q], [xb - q, yc - q], [xb, yc], [xb - q, yc + q], [xa + q, yc + q]];
  const V = (xc, ya, yb) => [[xc, ya], [xc + q, ya + q], [xc + q, yb - q], [xc, yb], [xc - q, yb - q], [xc - q, ya + q]];
  const L = x + q, R = x + w - q;
  const segs = {
    a: H(L + g, R - g, y + q), g: H(L + g, R - g, y + h / 2), d: H(L + g, R - g, y + h - q),
    b: V(R, y + q + g, y + h / 2 - g), c: V(R, y + h / 2 + g, y + h - q - g),
    f: V(L, y + q + g, y + h / 2 - g), e: V(L, y + h / 2 + g, y + h - q - g),
  };
  for (const s of ON[ch]) poly(img, segs[s], slant, y, h);
}

// Text de la pantalla (xifres, «.» i «:») alineat a la dreta fins a xRight, amb la base a yBottom.
function text(img, str, xRight, yBottom, { h = 70, w = 32, t = 8, gap = 10, slant = 0.1 } = {}) {
  const dot = 8;
  let x = xRight;
  for (let i = str.length - 1; i >= 0; i--) {
    const ch = str[i];
    if (ch === '.') { x -= dot; fill(img, x, yBottom - dot, x + dot, yBottom); x -= gap; }
    else if (ch === ':') { x -= dot; fill(img, x + slant * h * 0.7, yBottom - h * 0.68, x + slant * h * 0.7 + dot, yBottom - h * 0.68 + dot); fill(img, x + slant * h * 0.3, yBottom - h * 0.3, x + slant * h * 0.3 + dot, yBottom - h * 0.3 + dot); x -= gap; }
    else { x -= w; digit(img, ch, x, yBottom - h, w, h, t, slant); x -= gap; }
  }
}

// Pantalla dreçada amb els valors: { time: '0:30', dist: '0.2', cal: '21.1', watts: '915', speed: '34.7', rpm: '90' }.
export function screen(v, opts = {}) {
  const img = new Uint8Array(W * H).fill(PAPER);
  const sepY = [333, 497, 610, 722, 888];
  for (const y of sepY) fill(img, 0, y - 3, W, y + 3);
  fill(img, 0, 0, 7, H); fill(img, W - 7, 0, W, H); fill(img, 0, H - 14, W, H);
  for (const x of [170, 335]) fill(img, x - 3, sepY[3], x + 3, sepY[4]);
  // Les files grans: un bloc gros de tinta a l'esquerra (el nom de la casella) i els números a la dreta.
  for (const [a] of [[sepY[0]], [sepY[1]], [sepY[2]]]) label(img, 28, a + 70, 215, a + 120);
  label(img, 130, sepY[1] + 120, 180, sepY[1] + 128); // «MILES», petit
  text(img, v.time, 445, 482, opts);
  text(img, v.dist, 440, 592, opts);
  text(img, v.cal, 445, 706, opts);
  // Fila de baix: el nom i «AVERAGE» a dalt de cada casella, els números a sota.
  for (const [x0, x1] of [[28, 160], [190, 320], [352, 450]]) { label(img, x0, sepY[3] + 22, x1, sepY[3] + 58); label(img, x0, sepY[3] + 62, x0 + 60, sepY[3] + 68); }
  text(img, v.watts, 150, 878, opts);
  text(img, v.speed, 312, 878, opts);
  text(img, v.rpm, 432, 878, opts);
  return img;
}

// Matriu 3×3 inversa (per pintar la foto a partir de la pantalla).
function invert3(m) {
  const [a, b, c, d, e, f, g, h, i] = m;
  const A = e * i - f * h, B = -(d * i - f * g), C = d * h - e * g, det = a * A + b * B + c * C;
  return [A / det, -(b * i - c * h) / det, (b * f - c * e) / det, B / det, (a * i - c * g) / det, -(a * f - c * d) / det, C / det, -(a * h - b * g) / det, (a * e - b * d) / det];
}

// Foto en gris (w × h): fons fosc amb degradat i la pantalla dins del quadrilàter quad (dalt-esq., dalt-dta., baix-dta., baix-esq.).
export function photo(scr, quad, w, h, homography) {
  const hh = homography(quad);
  const inv = invert3([hh[0], hh[1], hh[2], hh[3], hh[4], hh[5], hh[6], hh[7], 1]);
  const out = new Uint8Array(w * h);
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    const d = inv[6] * x + inv[7] * y + inv[8];
    const u = (inv[0] * x + inv[1] * y + inv[2]) / d, v = (inv[3] * x + inv[4] * y + inv[5]) / d;
    let val = 40 + (x / w) * 30;
    if (u >= 0 && v >= 0 && u < W - 1 && v < H - 1) {
      const x0 = Math.floor(u), y0 = Math.floor(v), fx = u - x0, fy = v - y0, i = y0 * W + x0;
      val = scr[i] * (1 - fx) * (1 - fy) + scr[i + 1] * fx * (1 - fy) + scr[i + W] * (1 - fx) * fy + scr[i + W + 1] * fx * fy;
      // Una mica de llum desigual, com en una foto real.
      val = val * (0.9 + 0.2 * (y / h));
    }
    out[y * w + x] = Math.max(0, Math.min(255, val));
  }
  return out;
}

// PNG en gris sense llibreries: per passar la foto d'exemple a l'app dels tests e2e.
const crcTable = (() => { const t = []; for (let n = 0; n < 256; n++) { let c = n; for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1; t[n] = c >>> 0; } return t; })();
const crc32 = (buf) => { let c = 0xffffffff; for (const b of buf) c = crcTable[(c ^ b) & 255] ^ (c >>> 8); return (c ^ 0xffffffff) >>> 0; };
export function png(gray, w, h) {
  const raw = Buffer.alloc((w + 1) * h);
  for (let y = 0; y < h; y++) { raw[y * (w + 1)] = 0; Buffer.from(gray.buffer, gray.byteOffset + y * w, w).copy(raw, y * (w + 1) + 1); }
  const chunk = (type, data) => {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type), data]);
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(body));
    return Buffer.concat([len, body, crc]);
  };
  const ihdr = Buffer.alloc(13); ihdr.writeUInt32BE(w, 0); ihdr.writeUInt32BE(h, 4); ihdr[8] = 8; ihdr[9] = 0;
  return Buffer.concat([Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]), chunk('IHDR', ihdr), chunk('IDAT', deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}
