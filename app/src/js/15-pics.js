/* EON Life · miniatures dels exercicis.
   Dibuixos propis (no són imatges de Technogym ni de cap altra app): un maniquí en 3D (cap, tronc en dos blocs, braços,
   mans, cames i peus amb volum) que es projecta en 2D des del costat, de cara o en 3/4, segons el pla del moviment, amb
   el material de colors diferents del cos (pesos d'acer, gomes i cables taronja, material tou turquesa, banc i caixa de
   l'entorn). Les postures són a 15-pics-poses.js. Cada exercici en té una d'automàtica segons el nom i el material; a la
   biblioteca se'n pot triar una altra o posar-hi una foto pròpia (feta amb la tauleta), que llavors és la miniatura. */

// ── Vectors 3D: x endavant, y amunt, z a la dreta de la persona ──
const v3 = {
  add: (a, b) => [a[0] + b[0], a[1] + b[1], a[2] + b[2]],
  sub: (a, b) => [a[0] - b[0], a[1] - b[1], a[2] - b[2]],
  mul: (a, k) => [a[0] * k, a[1] * k, a[2] * k],
  dot: (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2],
  cross: (a, b) => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]],
  len: (a) => Math.hypot(a[0], a[1], a[2]),
  norm: (a) => { const l = Math.hypot(a[0], a[1], a[2]) || 1; return [a[0] / l, a[1] / l, a[2] / l]; },
  lerp: (a, b, k) => [a[0] + (b[0] - a[0]) * k, a[1] + (b[1] - a[1]) * k, a[2] + (b[2] - a[2]) * k],
  // gira v al voltant de l'eix k (unitari) un angle en graus (regla de la mà dreta)
  rot(v, k, deg) {
    const r = (deg * Math.PI) / 180, c = Math.cos(r), s = Math.sin(r);
    const kv = v3.cross(k, v), d = v3.dot(k, v) * (1 - c);
    return [v[0] * c + kv[0] * s + k[0] * d, v[1] * c + kv[1] * s + k[1] * d, v[2] * c + kv[2] * s + k[2] * d];
  },
  along: (p, d, k) => [p[0] + d[0] * k, p[1] + d[1] * k, p[2] + d[2] * k],
};
const picRad = (d) => (d * Math.PI) / 180;

// ── Mides del cos (alçada ≈ 77) i gruixos (radis al principi i al final de cada segment) ──
const PIC_L = { trunk: 21.5, neck: 3.2, headR: 5.9, shDrop: 2.2, shW: 7.6, hipW: 4.6, upper: 13.4, fore: 11.4, hand: 3.4, thigh: 18.6, shin: 18.4, foot: 9.6 };
const PIC_R = { neck: [2.5, 2.2], upper: [3.05, 2.25], fore: [2.3, 1.65], hand: [1.75, 1.3], thigh: [4.5, 3.0], shin: [3.05, 1.95], foot: [2.05, 1.4] };
// El tronc en dos blocs (pelvis i tòrax), cadascun fet de seccions el·líptiques: [alçada sobre el maluc (fracció del
// tronc), mitja amplada, mitja fondària]. El contorn és l'envolupant de les seccions vistes des de la càmera.
const PIC_WAIST = 0.36;
const PIC_PELVIS = [[-0.13, 5.6, 4.4], [0.06, 6.8, 5.0], [0.36, 5.5, 4.0]];
const PIC_CHEST = [[0.34, 5.5, 4.0], [0.66, 7.0, 5.3], [0.95, 7.5, 3.9]];

// ── Direccions dels segments ──
// Postures vistes de costat (per defecte): un número és l'angle en el pla del costat (0 = endavant, 90 = avall,
// -90 = amunt, 180 = enrere), com es veu al dibuix mirant a la dreta. [θ, φ]: a més, φ graus cap a fora (el braç o la
// cama dreta cap a la dreta, l'esquerra cap a l'esquerra).
// Postures vistes de cara (front: true): un número és l'angle tal com es veu al dibuix (0 = a la dreta del dibuix,
// que és l'esquerra de la persona); [θ, φ]: φ graus cap endavant (cap a qui mira).
function picDir(s, side, front) {
  const [th, ph] = Array.isArray(s) ? s : [s, 0];
  const t = picRad(th), p = picRad(ph);
  if (front) return [Math.sin(p), -Math.sin(t) * Math.cos(p), -Math.cos(t) * Math.cos(p)];
  return [Math.cos(t) * Math.cos(p), -Math.sin(t) * Math.cos(p), side * Math.sin(p)];
}
// L'altre costat, si no es diu: igual (de costat) o com en un mirall (de cara).
const picMirror = (s, front) => (s == null ? s : !front ? s : Array.isArray(s) ? [180 - s[0], s[1]] : 180 - s);
const picSide = (P, f) => {
  const own = P[f];
  if (f === 'a' || f === 'l') return own || (f === 'a' ? [92, 88] : [90, 90]);
  const base = P[f === 'b' ? 'a' : 'l'] || (f === 'b' ? [92, 88] : [90, 90]);
  return own || base.map((s) => picMirror(s, P.front));
};

// Esquelet en 3D: el centre de la pelvis a l'origen. t = tronc (la pelvis i, si no es diu, també el tòrax); tl =
// inclinació lateral (de costat); roll = gir de tot el cos al voltant del tronc. El tòrax respecte de la pelvis: tf =
// flexió (arrodonir l'esquena; negatiu, extensió), ts = flexió lateral (cap a la dreta), tr = rotació (cap a la dreta).
// Espatlles: shr = amunt (encongir), shp = endavant. Cap: hd = endavant (mirar avall), ht = girat cap a la dreta.
function picJoints(P) {
  const L = PIC_L, F = !!P.front;
  const u = F ? picDir(P.t ?? -90, 1, true) : picDir(P.tl ? [P.t ?? -90, P.tl] : (P.t ?? -90), 1, false);
  let r = v3.sub([0, 0, 1], v3.mul(u, u[2]));
  r = v3.len(r) < 0.15 ? v3.norm(v3.cross([1, 0, 0], u)) : v3.norm(r);
  if (P.roll) r = v3.rot(r, u, P.roll);
  const f = v3.cross(u, r);
  // columna en dos trams: la pelvis (eix u) i el tòrax (eix uc), units a la cintura
  let uc = u;
  if (P.tf) uc = v3.rot(uc, r, -P.tf);
  if (P.ts) uc = v3.rot(uc, f, P.ts);
  let rc = v3.norm(v3.sub(r, v3.mul(uc, v3.dot(r, uc))));
  const rs = P.tr ? v3.rot(rc, uc, -P.tr) : rc;
  const fs = v3.cross(uc, rs);
  const pel = [0, 0, 0];
  const waist = v3.mul(u, PIC_WAIST * L.trunk);
  const neck = v3.along(waist, uc, (1 - PIC_WAIST) * L.trunk);
  const shC = v3.add(v3.along(neck, uc, (P.shr || 0) - L.shDrop), v3.mul(fs, P.shp || 0));
  const J = { P, u, r, f, uc, rc, rs, fs, pel, waist, neck, front: F };
  J.sh = [v3.along(shC, rs, L.shW), v3.along(shC, rs, -L.shW)];
  J.hip = [v3.mul(r, L.hipW), v3.mul(r, -L.hipW)];
  const hdir = P.hd ? v3.rot(uc, rs, -P.hd) : uc;
  J.neckTop = v3.along(neck, hdir, L.neck);
  J.head = v3.along(J.neckTop, hdir, L.headR * 0.92);
  let face = P.hd ? v3.rot(fs, rs, -P.hd) : fs;
  if (P.ht) face = v3.rot(face, hdir, -P.ht);
  J.face = face; J.hdir = hdir;
  // rel: 'arms' (els braços segueixen el tòrax), 'legs' (les cames segueixen la pelvis) o 'all': els angles, com si
  // la persona fos dreta (útil si el cos està girat o estirat de costat).
  const toFrame = (v, R, U, Fw) => v3.add(v3.add(v3.mul(Fw, v[0]), v3.mul(U, v[1])), v3.mul(R, v[2]));
  const rel = P.rel || '';
  const relA = (i) => rel === 'arms' || rel === 'all' || rel === (i ? 'b' : 'a'), relL = rel === 'legs' || rel === 'all';
  const dirA = (s, side, i) => v3.norm(relA(i) ? toFrame(picDir(s, side, F), rs, uc, fs) : picDir(s, side, F));
  const dir = (s, side) => v3.norm(relL ? toFrame(picDir(s, side, F), r, u, f) : picDir(s, side, F));
  J.arm = [0, 1].map((i) => {
    const sp = picSide(P, i ? 'b' : 'a'), side = i ? -1 : 1;
    const d1 = dirA(sp[0], side, i), d2 = dirA(sp[1], side, i);
    const e = v3.along(J.sh[i], d1, L.upper), w = v3.along(e, d2, L.fore);
    return { s: J.sh[i], e, w, h: v3.along(w, d2, L.hand * 0.55), tip: v3.along(w, d2, L.hand), d1, d2 };
  });
  J.leg = [0, 1].map((i) => {
    const sp = picSide(P, i ? 'm' : 'l'), side = i ? -1 : 1;
    const d1 = dir(sp[0], side), d2 = dir(sp[1], side);
    const k = v3.along(J.hip[i], d1, L.thigh), a = v3.along(k, d2, L.shin);
    // el peu: perpendicular a la cama cap endavant del cos, si no es diu
    let fd = sp[2] != null ? dir(sp[2], side) : v3.sub(f, v3.mul(d2, v3.dot(f, d2)));
    if (v3.len(fd) < 0.2) fd = v3.sub([1, 0, 0], v3.mul(d2, d2[0]));
    fd = v3.norm(fd);
    const heel = v3.add(v3.along(a, d2, 1.5), v3.mul(fd, -1.7));
    const toe = v3.add(v3.along(a, d2, 1.9), v3.mul(fd, L.foot - 1.7));
    return { h: J.hip[i], k, a, heel, toe, d1, d2, fd };
  });
  J.floorY = Math.min(...J.leg.flatMap((G) => [G.heel[1], G.toe[1]])) - PIC_R.foot[0];
  // el punt més baix de tot el cos (estirat, és l'esquena o el pit) i el terra (lift per sota d'aquest punt)
  const R = PIC_R, low = [J.floorY, J.head[1] - L.headR];
  for (const A of J.arm) low.push(A.e[1] - R.upper[1], A.w[1] - R.fore[1], A.tip[1] - R.hand[1]);
  for (const G of J.leg) low.push(G.k[1] - R.thigh[1], G.a[1] - R.shin[1]);
  const rings = [...PIC_PELVIS.map(([h, w, d]) => [v3.mul(u, h * L.trunk), r, f, w, d]), ...PIC_CHEST.map(([h, w, d]) => [v3.along(waist, uc, (h - PIC_WAIST) * L.trunk), rs, fs, w, d])];
  for (const [c, a, b, w, d] of rings) for (let k = 0; k < 12; k++) { const t = (k / 12) * Math.PI * 2; low.push(c[1] + a[1] * w * Math.cos(t) + b[1] * d * Math.sin(t)); }
  J.lowY = Math.min(...low);
  J.groundY = J.lowY - (P.lift || 0);
  return J;
}

// ── Càmeres ──
// side: de costat (mira a la dreta); front: de cara; q: tres quarts (de cara i del costat dret, una mica des de dalt);
// qb: tres quarts des de darrere; back: d'esquena; top: des de dalt (estirats).
const PIC_VIEWS = { side: [0, 0], front: [90, 0], q: [38, 13], ql: [142, 13], qb: [-50, 13], back: [-90, 0], left: [180, 0], top: [0, 70] };
function picCam(view) {
  const [ya, pa] = Array.isArray(view) ? view : PIC_VIEWS[view] || PIC_VIEWS.side;
  const a = picRad(ya), b = picRad(pa);
  const right = [Math.cos(a), 0, -Math.sin(a)];
  const back = [Math.sin(a), 0, Math.cos(a)];
  return { right, up: v3.sub(v3.mul([0, 1, 0], Math.cos(b)), v3.mul(back, Math.sin(b))), to: v3.add(v3.mul(back, Math.cos(b)), v3.mul([0, 1, 0], Math.sin(b))) };
}
const picProj = (C, p) => [v3.dot(p, C.right), -v3.dot(p, C.up)];
const picDepth = (C, p) => v3.dot(p, C.to);

// ── Peces (primitives) en 3D ──
// cap: segment amb gruix (a → b, radis ra → rb); ball: esfera; disc: cercle (centre, normal, radi); ell: el·lipse amb dos
// semieixos; hull: envolupant de seccions; poly: polígon ple; line: traç. cls: classe CSS (color).
const pk = {
  cap: (a, b, ra, rb, cls, o) => ({ t: 'cap', a, b, ra, rb, cls, ...o }),
  ball: (c, r, cls, o) => ({ t: 'ball', c, r, cls, ...o }),
  disc(c, n, r, cls, o) {
    n = v3.norm(n);
    let e1 = v3.cross(n, Math.abs(n[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
    e1 = v3.mul(v3.norm(e1), r);
    return { t: 'ell', c, e1, e2: v3.mul(v3.norm(v3.cross(n, e1)), r), cls, ...o };
  },
  ell: (c, e1, e2, cls, o) => ({ t: 'ell', c, e1, e2, cls, ...o }),
  poly: (pts, cls, o) => ({ t: 'poly', pts, cls, ...o }),
  line: (pts, w, cls, o) => ({ t: 'line', pts, w, cls, ...o }),
  // capsa (banc, caixa, plataforma…): les cares que es veuen, amb la de dalt més clara
  box(x0, x1, y0, y1, z0, z1, cls = 'pp', o) { return { t: 'box', x0, x1, y0, y1, z0, z1, cls, ...o }; },
};

// El cos: blocs del tronc, coll, cap i extremitats. near: el costat que es veu (més fosc), far: l'altre (més clar).
function picBodyPrims(J) {
  const L = PIC_L, R = PIC_R;
  const out = [];
  const T = L.trunk;
  const pring = ([h, w, d]) => ({ c: v3.mul(J.u, h * T), a: v3.mul(J.r, w), b: v3.mul(J.f, d) });
  const cring = ([h, w, d], R, Fv) => ({ c: v3.along(J.waist, J.uc, (h - PIC_WAIST) * T), a: v3.mul(R, w), b: v3.mul(Fv, d) });
  const rMid = v3.norm(v3.add(J.rc, J.rs)), fMid = v3.cross(J.uc, rMid);
  out.push({ t: 'hull', rings: PIC_PELVIS.map(pring), body: 'pelvis', cls: 'pk', z: -0.05 });
  const top = cring(PIC_CHEST[2], J.rs, J.fs);
  top.c = v3.add(v3.along(top.c, J.uc, J.P.shr || 0), v3.mul(J.fs, J.P.shp || 0));
  out.push({ t: 'hull', rings: [cring(PIC_CHEST[0], J.rc, v3.cross(J.uc, J.rc)), cring(PIC_CHEST[1], rMid, fMid), top], body: 'chest', cls: 'pk', z: 0 });
  out.push(pk.cap(J.neck, J.neckTop, R.neck[0], R.neck[1], 'pk', { body: 'neck', z: -0.02 }));
  out.push(pk.ball(J.head, L.headR, 'pk', { body: 'head', z: 0.01 }));
  out.push(pk.ball(v3.add(v3.along(J.head, J.face, L.headR * 0.86), v3.mul(J.hdir, -L.headR * 0.18)), L.headR * 0.24, 'pk', { body: 'nose', z: 0.012 }));
  J.arm.forEach((A, i) => {
    const side = i ? 'L' : 'R';
    out.push(pk.cap(A.s, A.e, R.upper[0], R.upper[1], 'pk', { body: `upper${side}`, limb: i ? 'b' : 'a' }));
    out.push(pk.cap(A.e, A.w, R.fore[0], R.fore[1], 'pk', { body: `fore${side}`, limb: i ? 'b' : 'a', zb: 0.01 }));
    out.push(pk.cap(A.w, A.tip, R.hand[0], R.hand[1], 'pk', { body: `hand${side}`, limb: i ? 'b' : 'a', zb: 0.02 }));
  });
  J.leg.forEach((G, i) => {
    const side = i ? 'L' : 'R';
    out.push(pk.cap(G.h, G.k, R.thigh[0], R.thigh[1], 'pk', { body: `thigh${side}`, limb: i ? 'm' : 'l' }));
    out.push(pk.cap(G.k, G.a, R.shin[0], R.shin[1], 'pk', { body: `shin${side}`, limb: i ? 'm' : 'l', zb: 0.01 }));
    out.push(pk.cap(G.heel, G.toe, R.foot[0], R.foot[1], 'pk', { body: `foot${side}`, limb: i ? 'm' : 'l', zb: 0.02 }));
  });
  return out;
}

// ── De 3D a 2D ──
// El·lipse a partir de dos semieixos conjugats (2D): radis i angle.
function picEllipse2(p1, p2) {
  const A = p1[0] * p1[0] + p2[0] * p2[0], C = p1[1] * p1[1] + p2[1] * p2[1], B = p1[0] * p1[1] + p2[0] * p2[1];
  const S = A + C, D = Math.sqrt((A - C) * (A - C) + 4 * B * B);
  return { rx: Math.sqrt(Math.max((S + D) / 2, 0)), ry: Math.sqrt(Math.max((S - D) / 2, 0)), rot: (0.5 * Math.atan2(2 * B, A - C) * 180) / Math.PI };
}
// Envolupant convexa (cadena monòtona) i repartiment en N punts a partir del punt de més amunt en la direcció «dir».
function picHull(pts) {
  const p = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
  const cr = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
  const lo = [], hi = [];
  for (const q of p) { while (lo.length >= 2 && cr(lo[lo.length - 2], lo[lo.length - 1], q) <= 0) lo.pop(); lo.push(q); }
  for (let i = p.length - 1; i >= 0; i--) { const q = p[i]; while (hi.length >= 2 && cr(hi[hi.length - 2], hi[hi.length - 1], q) <= 0) hi.pop(); hi.push(q); }
  return lo.slice(0, -1).concat(hi.slice(0, -1));
}
function picResample(poly, N, dir) {
  let s = 0, best = -Infinity;
  poly.forEach((q, i) => { const v = q[0] * dir[0] + q[1] * dir[1]; if (v > best) { best = v; s = i; } });
  const ring = poly.slice(s).concat(poly.slice(0, s));
  const seg = ring.map((q, i) => Math.hypot(ring[(i + 1) % ring.length][0] - q[0], ring[(i + 1) % ring.length][1] - q[1]));
  const per = seg.reduce((x, y) => x + y, 0) || 1;
  const out = [];
  let i = 0, acc = 0;
  for (let k = 0; k < N; k++) {
    const want = (per * k) / N;
    while (i < ring.length - 1 && acc + seg[i] < want) { acc += seg[i]; i++; }
    const q = ring[i], n = ring[(i + 1) % ring.length], f = seg[i] ? (want - acc) / seg[i] : 0;
    out.push([q[0] + (n[0] - q[0]) * f, q[1] + (n[1] - q[1]) * f]);
  }
  return out;
}

function picProject(prims, C, J) {
  const up2 = (() => { const a = picProj(C, J.pel), b = picProj(C, J.neck); const d = Math.hypot(b[0] - a[0], b[1] - a[1]); return d > 0.5 ? [(b[0] - a[0]) / d, (b[1] - a[1]) / d] : [0, -1]; })();
  return prims.map((q) => {
    const o = { ...q };
    if (q.t === 'cap') { o.a2 = picProj(C, q.a); o.b2 = picProj(C, q.b); o.depth = picDepth(C, v3.lerp(q.a, q.b, 0.5)); }
    else if (q.t === 'ball') {
      o.c2 = picProj(C, q.c); o.depth = picDepth(C, q.c);
      // el nas només es veu de perfil (de cara quedaria com un ull)
      if (q.body === 'nose') { const d = v3.dot(J.face, C.to); o.r = q.r * Math.sqrt(Math.max(0, 1 - d * d)) * (d < 0.2 ? 1 : 0.6); }
    }
    else if (q.t === 'ell') {
      o.c2 = picProj(C, q.c); o.depth = picDepth(C, q.c);
      Object.assign(o, picEllipse2(picProj(C, q.e1), picProj(C, q.e2)));
      o.face = picDepth(C, v3.norm(v3.cross(q.e1, q.e2)));
    } else if (q.t === 'hull') {
      const pts = [];
      for (const rg of q.rings) for (let k = 0; k < 16; k++) { const a = (k / 16) * Math.PI * 2; pts.push(picProj(C, v3.add(rg.c, v3.add(v3.mul(rg.a, Math.cos(a)), v3.mul(rg.b, Math.sin(a)))))); }
      o.pts2 = picResample(picHull(pts), 24, up2);
      o.depth = picDepth(C, q.rings[1].c);
    } else if (q.t === 'poly' || q.t === 'line') {
      o.pts2 = q.pts.map((p) => picProj(C, p));
      o.depth = picDepth(C, q.pts.reduce((s, p) => v3.add(s, p), [0, 0, 0]).map((x) => x / q.pts.length));
    } else if (q.t === 'box') {
      const X = [q.x0, q.x1], Y = [q.y0, q.y1], Z = [q.z0, q.z1];
      const P = (i, j, k) => picProj(C, [X[i], Y[j], Z[k]]);
      const faces = [];
      const see = (n) => v3.dot(n, C.to);
      // cara de dalt, la del davant/darrere i la del costat que miren a la càmera
      if (see([0, 1, 0]) > 0.02) faces.push({ pts: [P(0, 1, 0), P(1, 1, 0), P(1, 1, 1), P(0, 1, 1)], tone: 'top' });
      const fx = see([1, 0, 0]) >= 0 ? 1 : 0;
      if (Math.abs(see([1, 0, 0])) > 0.02) faces.push({ pts: [P(fx, 0, 0), P(fx, 1, 0), P(fx, 1, 1), P(fx, 0, 1)], tone: 'x' });
      const fz = see([0, 0, 1]) >= 0 ? 1 : 0;
      if (Math.abs(see([0, 0, 1])) > 0.02) faces.push({ pts: [P(0, 0, fz), P(1, 0, fz), P(1, 1, fz), P(0, 1, fz)], tone: 'z' });
      o.faces = faces;
      o.depth = picDepth(C, [(q.x0 + q.x1) / 2, (q.y0 + q.y1) / 2, (q.z0 + q.z1) / 2]);
    }
    return o;
  });
}

// Límits en 2D d'una peça projectada (per encaixar el dibuix).
function picPrimBox(o) {
  const xs = [], ys = [];
  const add = (p, r = 0) => { xs.push(p[0] - r, p[0] + r); ys.push(p[1] - r, p[1] + r); };
  if (o.t === 'cap') { add(o.a2, o.ra); add(o.b2, o.rb); }
  else if (o.t === 'ball') add(o.c2, o.r);
  else if (o.t === 'ell') add(o.c2, o.rx);
  else if (o.t === 'hull' || o.t === 'poly' || o.t === 'line') o.pts2.forEach((p) => add(p, (o.w || 0) / 2));
  else if (o.t === 'box') o.faces.forEach((f) => f.pts.forEach((p) => add(p)));
  if (!xs.length) return null;
  return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
}
const picUnion = (list) => {
  const bs = list.map(picPrimBox).filter(Boolean);
  return { x0: Math.min(...bs.map((b) => b.x0)), x1: Math.max(...bs.map((b) => b.x1)), y0: Math.min(...bs.map((b) => b.y0)), y1: Math.max(...bs.map((b) => b.y1)) };
};
// Mou i escala les peces projectades (per encaixar-les al quadre de 100 × 100).
function picPlace(o, s, dx, dy) {
  const m = (p) => [p[0] * s + dx, p[1] * s + dy];
  const n = { ...o };
  if (o.t === 'cap') { n.a2 = m(o.a2); n.b2 = m(o.b2); n.ra = o.ra * s; n.rb = o.rb * s; }
  else if (o.t === 'ball') { n.c2 = m(o.c2); n.r = o.r * s; }
  else if (o.t === 'ell') { n.c2 = m(o.c2); n.rx = o.rx * s; n.ry = o.ry * s; }
  else if (o.t === 'hull' || o.t === 'poly' || o.t === 'line') { n.pts2 = o.pts2.map(m); if (o.w) n.w = o.w * s; }
  else if (o.t === 'box') n.faces = o.faces.map((f) => ({ ...f, pts: f.pts.map(m) }));
  return n;
}

// ── SVG ──
const pf = (n) => { const v = Math.round(n * 10) / 10; return Object.is(v, -0) ? 0 : v; };
const pp2 = (q) => `${pf(q[0])} ${pf(q[1])}`;
// Segment amb gruix (càpsula cònica): dues tangents i dos arcs. L'estructura és sempre la mateixa (per animar-la).
function picCapPath(a, b, ra, rb) {
  if (rb > ra) return picCapPath(b, a, rb, ra);
  let dx = b[0] - a[0], dy = b[1] - a[1], d = Math.hypot(dx, dy);
  const min = ra - rb + 0.05;
  if (d < min) { if (d < 1e-6) { dx = 0; dy = 1; d = 1; } const k = min / d; dx *= k; dy *= k; d = min; b = [a[0] + dx, a[1] + dy]; }
  const ux = dx / d, uy = dy / d, s = (ra - rb) / d, c = Math.sqrt(Math.max(0, 1 - s * s));
  const n1 = [s * ux - c * uy, s * uy + c * ux], n2 = [s * ux + c * uy, s * uy - c * ux];
  const a1 = [a[0] + n1[0] * ra, a[1] + n1[1] * ra], b1 = [b[0] + n1[0] * rb, b[1] + n1[1] * rb];
  const b2 = [b[0] + n2[0] * rb, b[1] + n2[1] * rb], a2 = [a[0] + n2[0] * ra, a[1] + n2[1] * ra];
  return `M${pp2(a1)}L${pp2(b1)}A${pf(rb)} ${pf(rb)} 0 0 0 ${pp2(b2)}L${pp2(a2)}A${pf(ra)} ${pf(ra)} 0 1 0 ${pp2(a1)}Z`;
}
function picEllPath(c, rx, ry, rot) {
  const r = picRad(rot), ex = [Math.cos(r) * rx, Math.sin(r) * rx];
  const p1 = [c[0] + ex[0], c[1] + ex[1]], p2 = [c[0] - ex[0], c[1] - ex[1]];
  const R = `${pf(Math.max(rx, 0.05))} ${pf(Math.max(ry, 0.05))} ${pf(rot)}`;
  return `M${pp2(p1)}A${R} 0 1 ${pp2(p2)}A${R} 0 1 ${pp2(p1)}Z`;
}
const picPolyPath = (pts, close = true) => `M${pts.map(pp2).join('L')}${close ? 'Z' : ''}`;
function picPrimSvg(o) {
  const cls = o.cls;
  if (o.t === 'cap') return `<path class="${cls}" d="${picCapPath(o.a2, o.b2, o.ra, o.rb)}"/>`;
  if (o.t === 'ball') return `<path class="${cls}" d="${picEllPath(o.c2, o.r, o.r, 0)}"/>`;
  if (o.t === 'ell') return `<path class="${cls}" d="${picEllPath(o.c2, o.rx, o.ry, o.rot)}"/>`;
  if (o.t === 'hull' || o.t === 'poly') return `<path class="${cls}" d="${picPolyPath(o.pts2)}"/>`;
  if (o.t === 'line') return `<path class="${cls}" d="${picPolyPath(o.pts2, false)}" stroke-width="${pf(o.w)}"/>`;
  if (o.t === 'box') return o.faces.map((f) => `<path class="${cls}${f.tone === 'top' ? ' pp-top' : f.tone === 'z' ? ' pp-side' : ''}" d="${picPolyPath(f.pts)}"/>`).join('');
  return '';
}

// ── Material ──
// Classes: pm = pes (acer), pmh = mànec o barra (acer clar), pe = goma o cable (taronja, traç), ps = material tou
// (pilota, foam roller, fitball: turquesa), pp = entorn (banc, caixa, paret, màquina), pk / pkf = cos (a prop / lluny).
// Cilindre (disc de la barra, cap de la mancuerna, foam roller): envolupant de les dues bases.
function picCyl(c, ax, half, r, cls, o) {
  ax = v3.norm(ax);
  let e1 = v3.cross(ax, Math.abs(ax[1]) < 0.9 ? [0, 1, 0] : [1, 0, 0]);
  e1 = v3.norm(e1);
  const e2 = v3.cross(ax, e1);
  const ring = (k) => ({ c: v3.along(c, ax, k), a: v3.mul(e1, r), b: v3.mul(e2, r) });
  return { t: 'hull', rings: [ring(-half), ring(half), ring(-half)], cls, ...o };
}
// Barra amb discos: c = centre, ax = direcció de la barra.
function picBarbell(c, ax, { plates = true, half = 22, pr = 8.4 } = {}) {
  ax = v3.norm(ax);
  const out = [pk.cap(v3.along(c, ax, -half), v3.along(c, ax, half), 0.95, 0.95, 'pmh', { gear: 1 })];
  if (plates) for (const k of [-1, 1]) {
    out.push(picCyl(v3.along(c, ax, k * (half - 4.2)), ax, 1.5, pr, 'pm', { gear: 1 }));
    out.push(pk.disc(v3.along(c, ax, k * (half - 2.5)), ax, 2.1, 'pmh', { gear: 1 }));
  }
  return out;
}
// Mancuerna: sempre de perfil a la càmera (es reconeix millor): el mànec en la direcció «dreta» del dibuix.
function picDumbbell(c, C) {
  const ax = C.right;
  return [pk.cap(v3.along(c, ax, -3.4), v3.along(c, ax, 3.4), 0.8, 0.8, 'pmh', { gear: 1 }),
    picCyl(v3.along(c, ax, -4.6), ax, 1.35, 3.2, 'pm', { gear: 1 }), picCyl(v3.along(c, ax, 4.6), ax, 1.35, 3.2, 'pm', { gear: 1 })];
}
// Kettlebell: la bola i la nansa (sempre de cara a la càmera). up: cap on queda la nansa respecte de la bola.
function picKettlebell(hand, up, C) {
  up = v3.norm(up);
  const side = v3.norm(v3.sub(C.right, v3.mul(up, v3.dot(C.right, up))));
  const c = v3.along(hand, up, -5.0);
  const handle = [];
  for (let i = 0; i <= 6; i++) {
    const a = Math.PI * (i / 6);
    handle.push(v3.add(c, v3.add(v3.mul(side, Math.cos(a) * 2.9), v3.mul(up, 2.3 + Math.sin(a) * 2.9))));
  }
  return [pk.line(handle, 1.5, 'pml', { gear: 1 }), pk.ball(c, 4.1, 'pm', { gear: 1 })];
}

// Material que es porta (a les mans, a l'esquena, als genolls…), en 3D.
function picGear3(J, P, g, C) {
  if (!g || !g.kind) return [];
  const grip = P.grip || 'hands';
  const hR = J.arm[0].h, hL = J.arm[1].h;
  const mid = v3.lerp(hR, hL, 0.5);
  const out = [];
  if (g.kind === 'loop' && g.at === 'wrists') {
    const pR = J.arm[0].w, pL = J.arm[1].w;
    return [pk.line([pR, pL], 1.5, 'pe', { gear: 1 }), pk.disc(pR, J.arm[0].d2, 2.2, 'pe-ring', { gear: 1 }), pk.disc(pL, J.arm[1].d2, 2.2, 'pe-ring', { gear: 1 })];
  }
  if (g.kind === 'loop') {
    const at = (G) => (g.at === 'ankles' ? v3.lerp(G.k, G.a, 0.82) : v3.lerp(G.h, G.k, 0.86));
    const pR = at(J.leg[0]), pL = at(J.leg[1]);
    out.push(pk.line([pR, pL], 1.5, 'pe', { gear: 1 }));
    for (const [i, p] of [[0, pR], [1, pL]]) {
      const G = J.leg[i], d = g.at === 'ankles' ? G.d2 : G.d1;
      out.push({ ...pk.disc(p, d, g.at === 'ankles' ? 2.4 : 3.4, 'pe-ring', { gear: 1 }) });
    }
    return out;
  }
  if (g.kind === 'kbox') {
    const c = v3.lerp(v3.lerp(J.leg[0].heel, J.leg[0].toe, 0.5), v3.lerp(J.leg[1].heel, J.leg[1].toe, 0.5), 0.5);
    out.push(pk.box(c[0] - 13, c[0] + 13, J.floorY - 2.2, J.floorY, -9, 9, 'pp', { gear: 1, under: 1 }));
    out.push(pk.line([v3.add(J.pel, v3.mul(J.f, 3.5)), [c[0] + 1, J.floorY, 0]], 1.2, 'pe', { gear: 1 }));
    return out;
  }
  if (g.kind === 'sliders') {
    for (const G of J.leg) {
      const c = v3.lerp(G.heel, G.toe, 0.25), down = v3.mul(G.d2, 2.6);
      out.push(picCyl(v3.add(c, down), G.d2, 0.7, 3.6, 'ps', { gear: 1, under: 1 }));
    }
    return out;
  }
  if (grip === 'none') return out;
  if (g.kind === 'cable' || (g.kind === 'band' && P.pull)) {
    const h = grip === 'chest' ? mid : hR;
    if (g.kind === 'cable') out.push(pk.cap(v3.along(h, C.right, -1.6), v3.along(h, C.right, 1.6), 0.9, 0.9, 'pmh', { gear: 1 }));
    // politja o ancoratge en 3D (pull: [x, y, z] respecte del maluc): el cable, la politja i la torre
    if (Array.isArray(P.pull)) {
      const A = P.pull;
      out.push(pk.line([h, A], g.kind === 'cable' ? 1.1 : 1.5, 'pe', { gear: 1 }));
      out.push(pk.ball(A, 1.9, 'pmh', { gear: 1 }));
      if (g.kind === 'cable') out.push(pk.box(A[0] - 1.6, A[0] + 1.6, J.floorY, Math.max(A[1] + 6, J.floorY + 74), A[2] - 1.6, A[2] + 1.6, 'pp', { gear: 1, nofit: 1, z: -40 }));
    }
    // si no, el cable va cap a la vora del dibuix (picGear2)
    return out;
  }
  if (g.kind === 'band') {
    const foot = v3.lerp(J.leg[0].heel, J.leg[0].toe, 0.4);
    const h = grip === 'chest' ? mid : hR;
    const m = v3.add(v3.lerp(h, foot, 0.5), v3.mul(J.f, 3));
    out.push(pk.line([h, v3.lerp(h, m, 0.5), m, v3.lerp(m, foot, 0.5), foot], 1.4, 'pe', { gear: 1 }));
    if (grip !== 'chest' && grip !== 'near') {
      const footL = v3.lerp(J.leg[1].heel, J.leg[1].toe, 0.4), mL = v3.add(v3.lerp(hL, footL, 0.5), v3.mul(J.f, 3));
      out.push(pk.line([hL, v3.lerp(hL, mL, 0.5), mL, v3.lerp(mL, footL, 0.5), footL], 1.4, 'pe', { gear: 1 }));
    }
    return out;
  }
  // un sol pes (a la mà dreta o entre les dues mans); l'estructura no pot dependre de la distància entre les mans,
  // que canvia durant el moviment
  const one = grip === 'chest' || grip === 'near' || (g.kind === 'kb' && g.one);
  if (grip === 'back') {
    const c = v3.add(v3.along(J.neck, J.u, -3.4), v3.mul(J.fs, -4.4));
    if (g.kind === 'bar') return picBarbell(c, J.rs);
    if (g.kind === 'stick') return [pk.cap(v3.along(c, J.rs, -24), v3.along(c, J.rs, 24), 0.75, 0.75, 'pmh', { gear: 1 })];
  }
  if (grip === 'hips') {
    const c = v3.add(v3.along(J.pel, J.f, 6.4), v3.mul(J.u, 1.5));
    if (g.kind === 'bar') return picBarbell(c, J.r);
    if (g.kind === 'db') return picDumbbell(c, C);
    if (g.kind === 'kb') return picKettlebell(v3.along(c, J.f, 4), J.f, C);
    if (g.kind === 'ball') return [pk.ball(c, 4.6, 'ps', { gear: 1 })];
    return out;
  }
  if (grip === 'rack') {
    // barra al davant de les espatlles (front squat, push press, clean)
    const c = v3.add(v3.along(J.neck, J.uc, -3.6), v3.mul(J.fs, 5.2));
    if (g.kind === 'bar') return picBarbell(c, J.rs);
  }
  if (grip === 'throw') return [pk.ball(v3.add(hR, v3.mul(J.arm[0].d2, 3.6)), 4.6, 'ps', { gear: 1 })];
  if (grip === 'swing') {
    // swing: la kettlebell continua la línia dels braços
    if (g.kind === 'kb') return picKettlebell(mid, v3.mul(J.arm[0].d2, -1), C);
    if (g.kind === 'db') return [pk.cap(mid, v3.along(mid, J.arm[0].d2, 7), 0.8, 0.8, 'pmh', { gear: 1 }), picCyl(v3.along(mid, J.arm[0].d2, 8.4), J.arm[0].d2, 1.4, 3.3, 'pm', { gear: 1 })];
  }
  if (grip === 'center') {
    // un sol pes que penja de les dues mans, al mig (squat sumo)
    if (g.kind === 'kb') return picKettlebell(mid, [0, 1, 0], C);
    if (g.kind === 'db') return [pk.cap(v3.add(mid, [0, -1.5, 0]), v3.add(mid, [0, -8, 0]), 0.8, 0.8, 'pmh', { gear: 1 }),
      picCyl(v3.add(mid, [0, -9.5, 0]), [0, 1, 0], 1.4, 3.3, 'pm', { gear: 1 })];
  }
  const at = grip === 'chest' ? v3.add(mid, v3.mul(J.f, 1.2)) : hR;
  if (g.kind === 'landmine') {
    // la barra va de les mans a un punt de terra al davant (on pivota)
    const piv = [at[0] + 34, J.groundY + 1, at[2] * 0.3];
    const d = v3.norm(v3.sub(at, piv));
    return [pk.cap(piv, v3.along(at, d, 6), 0.95, 0.95, 'pmh', { gear: 1 }), picCyl(v3.along(at, d, 4.2), d, 1.5, 7.2, 'pm', { gear: 1 })];
  }
  if (g.kind === 'bar') {
    const ax = v3.len(v3.sub(hR, hL)) > 6 ? v3.sub(hR, hL) : J.rs;
    return picBarbell(one && grip !== 'chest' ? hR : v3.lerp(hR, hL, 0.5), ax);
  }
  if (g.kind === 'stick') {
    // la pica: al llarg de l'esquena a la bisagra amb pica; si no, a les mans
    if (P.stick === 'spine') {
      const off = v3.mul(J.f, -5.4);
      return [pk.cap(v3.add(v3.along(J.pel, J.u, -5), off), v3.add(v3.along(J.head, J.u, 7), off), 0.75, 0.75, 'pmh', { gear: 1 })];
    }
    const ax = v3.len(v3.sub(hR, hL)) > 6 ? v3.sub(hR, hL) : J.rs;
    const c = v3.lerp(hR, hL, 0.5);
    return [pk.cap(v3.along(c, v3.norm(ax), -24), v3.along(c, v3.norm(ax), 24), 0.75, 0.75, 'pmh', { gear: 1 })];
  }
  if (g.kind === 'ball') return [pk.ball(v3.add(at, v3.mul(J.f, 3.4)), 4.8, 'ps', { gear: 1 })];
  if (g.kind === 'card') return [pk.box(hR[0] - 0.4, hR[0] + 0.4, hR[1] + 1, hR[1] + 6.5, hR[2] - 2, hR[2] + 2, 'pp', { gear: 1 })];
  // per sobre del colze (press, rack): la bola reposa al darrere de l'avantbraç; si no, penja de la mà
  const kbUp = (A) => (A.h[1] > A.e[1] + 1 ? v3.norm(v3.add(v3.mul(J.f, 3.2), v3.mul(A.d2, 1.2))) : [0, 1, 0]);
  if (g.kind === 'db') return (one ? [] : picDumbbell(hL, C)).concat(picDumbbell(at, C));
  if (g.kind === 'kb') {
    if (grip === 'chest') return picKettlebell(v3.add(at, [0, 6.2, 0]), [0, -1, 0], C);
    return (one ? [] : picKettlebell(hL, kbUp(J.arm[1]), C)).concat(picKettlebell(at, kbUp(J.arm[0]), C));
  }
  return out;
}

// Cables i gomes ancorades (en 2D, cap a la politja o l'ancoratge del costat del dibuix) i la torre de la politja.
function picGear2(Q, P, g) {
  if (g && g.kind === 'trx') return [Q.hR, Q.hL].map((h) => ({ t: 'line', pts2: [h, [Math.min(96, h[0] + 26), 3]], w: 1.3, cls: 'pml' }));
  if (!g || typeof P.pull !== 'string' || !(g.kind === 'cable' || g.kind === 'band') || (P.grip || 'hands') === 'none') return [];
  const grip = P.grip || 'hands';
  const h = grip === 'chest' ? [(Q.hR[0] + Q.hL[0]) / 2, (Q.hR[1] + Q.hL[1]) / 2] : Q.hR;
  const a = P.pull === 'back' ? [5, h[1]] : P.pull === 'high' ? [6, 8] : P.pull === 'over' ? [h[0] + 4, 4] : P.pull === 'face' ? [95, Q.head[1]]
    : P.pull === 'low' ? [95, 84] : P.pull === 'fronthigh' ? [94, 7] : P.pull === 'backlow' ? [5, 84] : [95, h[1]];
  const out = [];
  if (g.kind === 'cable') {
    const x = a[0] < 50 ? 3 : 97;
    if (P.pull !== 'over') out.push({ t: 'line', pts2: [[x, 4], [x, 90]], w: 3.2, cls: 'pl' });
    out.push({ t: 'ball', c2: a, r: 1.9, cls: 'pmh' });
  }
  out.push({ t: 'line', pts2: [h, a], w: g.kind === 'cable' ? 1.1 : 1.5, cls: 'pe' });
  return out;
}

// ── Una postura dibuixada ──
const PIC_FLOOR = 89;
const picViewOf = (P) => P.view || (P.front ? 'front' : 'side');
// Projecta una postura (sense escalar): el cos, el material i, si cal, l'entorn.
function picScene(Q, gear, propsJ) {
  const J = picJoints(Q);
  const C = picCam(picViewOf(Q));
  const body = picProject(picBodyPrims(J), C, J);
  const items = picProject(picGear3(J, Q, gear, C), C, J);
  const env = Q.props ? picProject(Q.props(propsJ || J, pk, C), C, propsJ || J) : [];
  const pt = (p) => picProj(C, p);
  const key = { hR: pt(J.arm[0].h), hL: pt(J.arm[1].h), head: pt(J.head), pel: pt(J.pel), fR: pt(J.leg[0].a), fL: pt(J.leg[1].a),
    kR: pt(J.leg[0].k), kL: pt(J.leg[1].k), tR: pt(J.leg[0].toe), tL: pt(J.leg[1].toe), eR: pt(J.arm[0].e), sh: pt(J.sh[0]), neck: pt(J.neck) };
  return { J, C, body, items, env, key };
}
const picBoundsOf = (S) => picUnion(S.body);
// Escala i desplaçament d'un fotograma. opt: s (escala comuna), ax (x del suport), hy (alçada de les mans si penja).
function picFit(P, S, opt = {}) {
  const B = picBoundsOf(S), A = picUnion(S.body.concat(S.items.filter((o) => !o.under && !o.nofit)));
  const lift = P.lift || 0;
  const s = opt.s ?? Math.min(1.2, 88 / (A.x1 - A.x0), (PIC_FLOOR - lift - 5) / (B.y1 - B.y0)) * (P.s || 1);
  // el punt que no es mou durant el moviment: fix (fR/fL turmells, tR punta del peu, kR genoll, hR mans, pel maluc…);
  // si no, el peu de recolzament (x) i el terra (y)
  const fx = P.fix && S.key[P.fix];
  const anchorX = fx ? fx[0] : P.anchor === 'hip' ? S.key.pel[0] : P.front || picViewOf(P) !== 'side' ? (S.key.fR[0] + S.key.fL[0]) / 2 : S.key.fR[0];
  // fix: 'free': el cos es desplaça (P.dx, interpolat) respecte de la posició final (salts, desplaçaments)
  const dx = opt.ax != null ? opt.ax - anchorX * s + (P.fix === 'free' ? (P.dx || 0) * s : 0) : 50 - ((A.x0 + A.x1) / 2) * s + (P.fix === 'free' ? 0 : (P.dx || 0) * s);
  const anchorY = fx ? fx[1] : P.hang ? S.key.hR[1] : null;
  const dy = anchorY != null && opt.ay != null ? opt.ay - anchorY * s : PIC_FLOOR - lift * s - B.y1 * s;
  return { s, dx, dy, anchorX, anchorY };
}
function picPlaceScene(S, T) {
  const m = (p) => [p[0] * T.s + T.dx, p[1] * T.s + T.dy];
  const key = Object.fromEntries(Object.entries(S.key).map(([k, p]) => [k, m(p)]));
  return { ...S, T, key, body: S.body.map((o) => picPlace(o, T.s, T.dx, T.dy)), items: S.items.map((o) => picPlace(o, T.s, T.dx, T.dy)), env: S.env.map((o) => picPlace(o, T.s, T.dx, T.dy)) };
}

// ── Moviment ──
// Cada postura dinàmica té la posició inicial (from: només el que canvia) i la final (la postura mateixa). Els fotogrames
// s'interpolen angle a angle (no punt a punt, perquè els braços i les cames no s'escurcin).
const picLerpN = (x, y, k) => x + (y - x) * k;
function picLerpSpec(x, y, k) {
  if (!Array.isArray(x) && !Array.isArray(y)) return picLerpN(x, y, k);
  const a = Array.isArray(x) ? x : [x, 0], b = Array.isArray(y) ? y : [y, 0];
  return [picLerpN(a[0], b[0], k), picLerpN(a[1], b[1], k)];
}
function picLerp(A, B, k) {
  const out = { ...B };
  for (const f of ['t', 'tl', 'tf', 'ts', 'tr', 'roll', 'shr', 'shp', 'hd', 'ht', 'lift', 'dx']) {
    const d = f === 't' ? -90 : 0;
    if (A[f] != null || B[f] != null) out[f] = picLerpN(A[f] ?? d, B[f] ?? d, k);
  }
  for (const f of ['a', 'b', 'l', 'm']) {
    const x = picSide(A, f), y = picSide(B, f);
    out[f] = y.map((v, i) => (v == null ? v : picLerpSpec(x[i] ?? v, v, k)));
  }
  return out;
}
const picStart = (P) => ({ ...P, ...(P.from || {}) });
const PIC_STEPS = 4;

// Ordre de dibuix (el més lluny primer) i to (el costat que no es veu, més clar), segons la postura final, perquè tots
// els fotogrames tinguin les mateixes peces en el mateix ordre (i es puguin animar).
function picOrder(S) {
  const list = S.body.concat(S.items);
  const torso = (S.body.find((o) => o.body === 'chest') || {}).depth || 0;
  const key = (o) => o.depth + (o.z || 0) + (o.zb || 0);
  const order = list.map((o, i) => i).sort((i, j) => key(list[i]) - key(list[j]) || i - j);
  const far = list.map((o) => o.cls === 'pk' && !/^(pelvis|chest|neck|head|nose)$/.test(o.body) && o.depth < torso - 2.2);
  return { order, far };
}
function picSvgOf(P, S, ord, gear) {
  const parts = [`<path class="pfl" d="M4 ${PIC_FLOOR + 1.6}H96" stroke-width="1.6"/>`];
  const view = picViewOf(P);
  if (Array.isArray(view) ? view[1] > 5 : !['side', 'front', 'back'].includes(view)) {
    const b = picUnion(S.body);
    parts.push(`<path class="psh" d="${picEllPath([(b.x0 + b.x1) / 2, PIC_FLOOR + 0.6], (b.x1 - b.x0) * 0.42 + 4, 3.2, 0)}"/>`);
  }
  for (const o of S.env) parts.push(picPrimSvg(o));
  const list = S.body.concat(S.items);
  for (const i of ord.order) {
    const o = list[i];
    if (o) parts.push(picPrimSvg(ord.far[i] ? { ...o, cls: 'pkf' } : o));
  }
  for (const o of picGear2(S.key, P, gear)) parts.push(picPrimSvg(o));
  return `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</svg>`;
}

// Fotogrames d'una postura: la mateixa escala a tots, el suport quiet (el peu, el maluc o les mans si penja) i
// l'entorn (banc, caixa…) on és a la postura final, perquè no es mogui amb el cos (tret de P.propsMove).
function picFrames(P, gear = { kind: '' }) {
  const A = picStart(P);
  const ease = (x) => 0.5 - 0.5 * Math.cos(Math.PI * x);
  const poses = Array.from({ length: PIC_STEPS + 1 }, (_, i) => (i === PIC_STEPS ? P : picLerp(A, P, ease(i / PIC_STEPS))));
  const ref = picScene(P, gear);
  const scenes = poses.map((Q, i) => (i === PIC_STEPS ? ref : picScene(Q, gear, P.propsMove ? null : ref.J)));
  const s = Math.min(...scenes.map((S, i) => picFit(poses[i], S).s));
  const endT = picFit({ ...P, dx: 0 }, ref, { s });
  const opt = { s, ax: endT.anchorX * s + endT.dx, ay: endT.anchorY != null ? endT.anchorY * s + endT.dy : null };
  let placed = scenes.map((S, i) => picPlaceScene(S, picFit(poses[i], S, opt)));
  const fits = placed.every((S) => { const b = picUnion(S.body); return b.x0 > 1 && b.x1 < 99 && b.y0 > 1; });
  if (!fits) placed = scenes.map((S, i) => picPlaceScene(S, picFit(poses[i], S, { s })));
  const last = placed[placed.length - 1];
  if (!P.propsMove) placed = placed.map((S) => ({ ...S, env: last.env }));
  return { poses, scenes: placed, order: picOrder(last) };
}

// Animació: els fotogrames tenen els mateixos elements (només canvien els números), i cada atribut que canvia porta un
// <animate> (SMIL) amb els valors de tots els fotogrames: el navegador fa el moviment sol, sense JavaScript a cada
// fotograma. Inici quiet, baixa, quiet a baix i torna (2,6 s). Si l'estructura no coincideix, el dibuix queda quiet.
const PIC_DUR = 2.6;
function picAnimate(frames) {
  const re = /<(\/?)([a-zA-Z]+)((?:\s+[\w:-]+="[^"]*")*)\s*(\/?)>/g;
  const parse = (svg) => [...svg.matchAll(re)].map((m) => ({ close: !!m[1], tag: m[2], self: !!m[4], text: m[0],
    attrs: [...m[3].matchAll(/([\w:-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]]) }));
  const toks = frames.map(parse);
  const n = toks[0].length;
  if (toks.some((t) => t.length !== n)) return null;
  for (let i = 0; i < n; i++) {
    const a = toks[0][i];
    if (toks.some((t) => t[i].tag !== a.tag || t[i].close !== a.close || t[i].attrs.length !== a.attrs.length || t[i].attrs.some((x, j) => x[0] !== a.attrs[j][0]))) return null;
  }
  const K = frames.length - 1;
  const seq = [0, 0, ...Array.from({ length: K }, (_, i) => i + 1), K, ...Array.from({ length: K }, (_, i) => K - 1 - i)];
  const times = [0, 0.12, ...Array.from({ length: K }, (_, i) => 0.12 + (0.38 * (i + 1)) / K), 0.62, ...Array.from({ length: K }, (_, i) => 0.62 + (0.38 * (i + 1)) / K)];
  const keyTimes = times.map((x) => Math.min(1, Math.round(x * 1000) / 1000)).join(';');
  let out = '';
  for (let i = 0; i < n; i++) {
    const a = toks[0][i];
    if (a.close) { out += a.text; continue; }
    const anims = a.attrs.map(([name], j) => {
      const vals = toks.map((t) => t[i].attrs[j][1]);
      if (vals.every((v) => v === vals[0])) return '';
      return `<animate attributeName="${name}" dur="${PIC_DUR}s" begin="-${PIC_DUR * 0.52}s" repeatCount="indefinite" keyTimes="${keyTimes}" values="${seq.map((k) => vals[k]).join(';')}"/>`;
    }).join('');
    if (!anims) { out += a.text; continue; }
    const open = a.text.replace(/\s*\/>$/, '>');
    out += a.self ? `${open}${anims}</${a.tag}>` : `${open}${anims}`;
  }
  return out;
}

// Dibuix quiet d'una postura (centrat).
function picSvg(key, gear) {
  const P = PICS[key] || PICS.stand;
  const S = picScene(P, gear || { kind: '' });
  const placed = picPlaceScene(S, picFit(P, S));
  return picSvgOf(P, placed, picOrder(placed), gear || { kind: '' });
}

// ── Material que es porta (a les mans, a l'esquena, als genolls…) ──
// Les postures on el material del Power Personal és la barra (a la resta, mancuernes o res).
const PIC_BAR_POSES = new Set(['squat', 'squat_back', 'squat_front', 'squat_oh', 'split', 'split_oh', 'split_bench', 'lateral_lunge', 'hinge', 'deadlift', 'goodmorning',
  'row', 'ohpress', 'ohpress_seated', 'arnold', 'bench', 'bench_incline', 'clean', 'high_pull', 'snatch', 'upright_row', 'hipthrust', 'stepup', 'calf', 'curl', 'shrug', 'push_press']);
const PIC_DB_POSES = new Set(['rear_fly', 'rear_fly_bench', 'lat_raise', 'lat_raise_seated', 'front_raise', 'front_raise_alt', 'tri_kickback', 'triceps_oh', 'floor_press', 'fly', 'curl_alt', 'curl_incline']);

// El material que es dibuixa: barra, mancuernes, kettlebell, pilota, goma (a les mans o als genolls), cable, pica…
function picGearOf(e, key) {
  const t = U.norm(`${e.name || ''} ${e.tg || ''}`);
  const m = U.norm(e.material || '');
  const P = PICS[key] || {};
  const at = /banda als genolls|band at knees/.test(t) ? 'knees' : /banda als (turmells|peus)|band at (ankles|feet)/.test(t) ? 'ankles' : '';
  const lower = !P.grip || P.band;
  if (/^vor/.test(key)) return { kind: 'card' };
  if (/trx/.test(m + ' ' + t)) return { kind: 'trx' };
  if (/landmine/.test(m + ' ' + t)) return { kind: 'landmine' };
  if (/loop band/.test(m) || at) return at || lower ? { kind: 'loop', at: at || P.band || 'knees' } : { kind: 'band' };
  if (/kbox/.test(m)) return { kind: 'kbox' };
  if (/lliscador|flowin/.test(m + t)) return { kind: 'sliders' };
  if (/power personal/.test(m)) {
    if (/\bbanda\b|soft loop|nanses/.test(t)) return P.band ? { kind: 'loop', at: P.band } : P.grip || P.pull ? { kind: 'band' } : { kind: '' };
    if (/barra/.test(t)) return { kind: 'bar' };
    if (/obertures|ocells|elevacions|kickback|martell/.test(t) || PIC_DB_POSES.has(key)) return { kind: 'db' };
    return { kind: PIC_BAR_POSES.has(key) ? 'bar' : '' };
  }
  if (/barra|hexagonal|trap bar/.test(m + ' ' + t) && !/mancuern|kettlebell|\bkb\b/.test(t)) return { kind: 'bar' };
  if (/\bpica\b/.test(m + ' ' + t)) return { kind: 'stick' };
  if (/mancuern|dumbbell/.test(m + ' ' + t)) return { kind: 'db' };
  if (/kettlebell|\bkb\b/.test(m + ' ' + t)) return { kind: 'kb', one: /una ma|a un brac|unilateral|alterna?t?\b|\bun\b/.test(t) && !/kettlebells|dues/.test(t) };
  if (/med ball|pilota medicinal|\bslam\b|shot put/.test(t + ' ' + m)) return { kind: 'ball' };
  if (/politja|cable|pulley|keiser|conica|isoinercial|face pull|creuament/.test(m + ' ' + t)) return P.pull ? { kind: 'cable' } : { kind: '' };
  if (/goma|\bbanda\b|elastic|band\b/.test(m + ' ' + t)) return P.band ? { kind: 'loop', at: P.band } : P.pull || P.grip ? { kind: 'band' } : { kind: '' };
  return { kind: '' };
}

// ── Quina postura té cada exercici ──
// Per ordre: la primera regla que coincideix amb el nom (o el nom de Technogym) mana.
const PIC_RULES = [
  [/\bbike\b|bicicleta estatica/, 'bike'],
  [/alliberament|miofascial|foam roller|mobility ball/, (t) => (/planta del peu|plantar/.test(t) ? 'roll_foot' : /bessons|calf|glut/.test(t) ? 'roll_seated'
    : /quadriceps/.test(t) ? 'roll_prone' : /dorsal|lats|iliotibial|ilio-tibial|espatlla|shoulder|mobility ball/.test(t) ? 'roll_side' : 'roll_back')],
  [/respiracio|relaxacio|body scan|sospir|exhalacio|breath/, (t) => (/90\/90/.test(t) ? 'breath_9090' : /cocodril/.test(t) ? 'prone' : /assegu|360/.test(t) ? 'seated_breath'
    : /cames a la paret/.test(t) ? 'legs_wall' : /postura del nen/.test(t) ? 'child' : 'supine')],
  [/cames a la paret/, 'legs_wall'],
  [/postura del nen|child/, 'child'],
  [/estiraments? suaus|estiraments globals/, 'stretch_stand'],
  [/\bbike\b|bicicleta estatica/, 'bike'],
  [/alterg|carrera/, 'run_tread'],
  [/trineu|sled/, 'sled'],
  [/sprint al skillmill|skillmill/, 'run_tread'],
  [/knee-to-wall/, 'ankle_wall'],
  [/dorsiflexio en estocada/, 'ankle_kneel'],
  [/mobilitat de turmell/, (t) => (/goma|banda/.test(t) ? 'ankle_band' : 'ankle_wall')],
  [/couch stretch/, 'couch'],
  [/world'?s greatest/, 'wgs'],
  [/rotacio toracica en mig genoll/, 'kneel_rot'],
  [/flexors de maluc|mig genoll/, 'half_kneel'],
  [/90\/90/, (t) => (/lift-off/.test(t) ? 'sit_9090_lift' : 'sit_9090')],
  [/open book/, 'openbook'],
  [/rotacio toracica en quadrupedia/, 'quad_rot'],
  [/cat-camel|cat cow/, 'cat_camel'],
  [/rockback|rock back/, 'rockback'],
  [/passes laterals en quadrupedia/, 'quad_walk'],
  [/passes laterals en planxa/, 'plank_walk'],
  [/abduccio de maluc (alterna )?en quadrupedia/, 'fire_hydrant'],
  [/kickback de triceps|triceps kickback/, 'tri_kickback'],
  [/kickback/, 'quad_kick'],
  [/bird dog/, 'birddog'],
  [/superman/, (t) => (/abduccio/.test(t) ? 'superman_abd' : 'superman')],
  [/wall slide/, 'wall_slide'],
  [/pas d'espatlles/, 'pass_through'],
  [/y-t-w/, 'ytw'],
  [/estabilitzacio de la mirada|\bvor\b/, (t) => (/assegu/.test(t) ? 'vor_seated' : /tandem/.test(t) ? 'tandem' : 'vor')],
  [/equilibri/, (t) => (/inestable/.test(t) ? 'balance_dome' : 'balance')],
  [/hip airplane/, 'airplane'],
  [/dead bug/, 'deadbug'],
  [/ghd sit-up/, 'ghd_situp'],
  [/mcgill|curl-up/, 'mcgill'],
  [/sit-up/, 'situp'],
  [/crunch tocant|toe touch/, 'toe_touch'],
  [/flexio lateral|side bend/, 'side_bend'],
  [/thruster/, 'thruster'],
  [/sots press/, 'sots'],
  [/scaption/, 'scaption'],
  [/pullover estirat|pull over - supine/, 'pullover_supine'],
  [/crunch invers en planxa|flexio i crunch invers/, 'plank_tuck'],
  [/crunch/, (t) => (/bicicleta|bicycle/.test(t) ? 'bicycle' : /recollida/.test(t) ? 'crunch_tuck' : /cames estirades/.test(t) ? 'crunch_straight'
    : /genolls elevats|cames elevades/.test(t) ? 'crunch_legs' : 'crunch')],
  [/russian twist/, 'russian'],
  [/flutter/, 'boat_flutter'],
  [/abduccio de bracos en posicio de barca/, 'boat_abd'],
  [/barca|v-sit/, 'boat'],
  [/body saw/, 'body_saw'],
  [/ab wheel|rollout/, 'rollout'],
  [/copenhagen/, (t) => (/dinamic/.test(t) ? 'copenhagen_dyn' : /llarg/.test(t) ? 'copenhagen_long' : 'copenhagen')],
  [/planxa invertida/, (t) => (/flexio de maluc/.test(t) ? 'reverse_march' : 'reverse_plank')],
  [/abduccio (i flexio )?de maluc en planxa lateral/, 'side_plank_abd'],
  [/planxa lateral|side plank/, (t) => (/genolls/.test(t) ? 'side_plank_knees' : /arrencada/.test(t) ? 'side_plank_kb' : /brac estirat|straight arm/.test(t) ? 'side_plank_arm'
    : /abduccio/.test(t) ? 'side_plank_abd' : 'side_plank')],
  [/clamshell/, 'clamshell'],
  [/recolzat al colze/, 'side_abd_elbow'],
  [/estirat de costat|side-lying/, 'side_abd'],
  [/mountain climber|flexio(ns)? de maluc (alternes? )?(amb bracos estirats|en planxa)/, 'climber'],
  [/planxa jack|abduccio de maluc alterna en planxa/, 'plank_jack'],
  [/renegade/, 'renegade'],
  [/push-up escapular/, 'pushup_scap'],
  [/flexion.*(inclinad|mans elevades|mans al banc)/, 'pushup_incline'],
  [/^flexions?\b(?! de maluc)|\bflexions (sobre|amb)|flexio amb passes|push-?ups?\b/, 'pushup'],
  [/planxa frontal|^planxa$/, 'plank'],
  [/planxa|plank/, 'plank_high'],
  [/pont de glutis|glute bridge/, (t) => (/unipodal|una cama/.test(t) ? 'bridge_sl' : /cames estirades/.test(t) ? 'bridge_straight' : 'bridge')],
  [/hip thrust/, 'hipthrust'],
  [/curl femoral/, (t) => (/lliscador|flowin|slider/.test(t) ? 'slide_curl' : /fitball/.test(t) ? 'bridge_ball' : 'seated_curl')],
  [/nordic|glute-ham/, 'nordic'],
  [/hiperextensio|lower back/, 'hyperext'],
  [/elevacio de talons a la premsa/, 'legpress_calf'],
  [/leg press|premsa/, 'legpress'],
  [/leg extension|extensio de genoll/, 'legext'],
  [/(abductor|adductor) a la maquina/, 'abd_machine'],
  [/elevacio de talons|calf raise/, (t) => (/soli|genolls? flexionats?/.test(t) ? 'calf_bent' : /unipodal/.test(t) ? 'calf_sl' : 'calf')],
  [/squeeze/, 'squeeze'],
  [/pallof/, (t) => (/unipodal|una cama/.test(t) ? 'pallof_sl' : 'pallof')],
  [/woodchop|llenyataire/, 'woodchop'],
  [/turkish get-up/, 'tgu'],
  [/windmill/, (t) => (/pes avall/.test(t) ? 'windmill_low' : 'windmill')],
  [/halo/, 'halo'],
  [/overhead squat/, 'squat_oh'],
  [/snatch high pull/, 'high_pull'],
  [/(snatch|arrencada).*(kettlebell|\bkb\b)|kettlebell snatch/, 'kb_snatch'],
  [/snatch|arrencada/, 'snatch'],
  [/jump shrug|high pull/, 'high_pull'],
  [/(cargolada|clean).*(kettlebell|\bkb\b)/, 'kb_clean'],
  [/clean|cargolada/, 'clean'],
  [/split jerk/, 'split_jerk'],
  [/(estocada|lunge).*(per sobre del cap|overhead)/, 'split_oh'],
  [/push press|push jerk/, 'push_press'],
  [/landmine/, 'landmine_press'],
  [/press arnold/, 'arnold'],
  [/press (militar|d'espatlles) assegut|press militar assegut/, 'ohpress_seated'],
  [/press (militar|per sobre)|overhead press/, (t) => (/a una ma/.test(t) ? 'ohpress_one' : 'ohpress')],
  [/swing/, (t) => (/per sobre del cap/.test(t) ? 'swing_oh' : 'swing')],
  [/figura de 8/, 'figure8'],
  [/box jump/, 'box_jump'],
  [/drop jump/, 'drop_jump'],
  [/snap down/, 'land'],
  [/aterratge unipodal/, 'land_sl'],
  [/aterratge/, 'land'],
  [/jump squat|salt amb carrega/, 'jump_load'],
  [/pogo/, 'hop'],
  [/skater/, 'skater'],
  [/desplacament lateral|shuffle/, 'shuffle'],
  [/canvi de direccio|5-0-5/, 'cut'],
  [/tanques/, 'hurdles'],
  [/bounds|salt a una cama/, 'bounds'],
  [/salt horitzontal|salts? endavant/, 'jump_fwd'],
  [/cmj unipodal/, 'jump_sl'],
  [/\bcmj\b|salt|jump/, 'jump'],
  [/slam/, 'slam'],
  [/chest pass|passada de pit/, 'chest_pass'],
  [/scoop/, 'scoop'],
  [/llancament|shot put/, 'rot_throw'],
  [/skipping/, 'skipping'],
  [/sprint|acceleracio/, 'sprint'],
  [/carry|farmer|passeig/, (t) => (/suitcase|a una ma/.test(t) ? 'carry_one' : 'carry')],
  [/encongiments|shrug/, 'shrug'],
  [/rotacio externa/, 'ext_rot'],
  [/face pull/, 'face_pull'],
  [/creuament|crossover/, 'crossover'],
  [/pullover/, 'pullover'],
  [/rem vertical|upright row/, 'upright_row'],
  [/rem invertit|inverted row/, 'inverted_row'],
  [/rem assegut|seated row/, 'seated_row'],
  [/rem .*(politja|conica|keiser)/, 'row_standing'],
  [/rem (inclinat )?a una ma|rem inclinat altern/, 'row_one'],
  [/\brem\b|\brow\b|pendlay/, 'row'],
  [/dominad|pull-?up|chin-?up/, 'pullup'],
  [/jalon|jalo |pulldown/, 'pulldown'],
  [/press de pit (a una ma )?estirat|floor press/, 'floor_press'],
  [/press de pit keiser|press de pit assegut/, 'seated_press'],
  [/press inclinat|incline press/, 'bench_incline'],
  [/obertures/, 'fly'],
  [/press frances estirat|french press - supine/, 'skull'],
  [/press de banca|bench press|press de pit/, 'bench'],
  [/fons de triceps|\bdips?\b/, 'dip'],
  [/triceps|press frances/, (t) => (/per sobre del cap|press frances|a una ma amb kb/.test(t) ? (/a una ma/.test(t) ? 'triceps_oh_one' : 'triceps_oh') : 'pushdown')],
  [/curl concentrat/, 'curl_conc'],
  [/curl .*banc inclinat/, 'curl_incline'],
  [/curl .*assegut/, 'curl_seated'],
  [/curl (alterne|reciproc)|curl martell (alterne?|reciproc)/, 'curl_alt'],
  [/curl/, 'curl'],
  [/elevacions laterals|lateral raise/, (t) => (/assegut/.test(t) ? 'lat_raise_seated' : 'lat_raise')],
  [/elevacions frontals|front raise/, (t) => (/alternes/.test(t) ? 'front_raise_alt' : 'front_raise')],
  [/ocells|rear delt|reverse fly/, (t) => (/banc inclinat/.test(t) ? 'rear_fly_bench' : 'rear_fly')],
  [/estocada lateral|lateral lunge|cossack/, 'lateral_lunge'],
  [/passes laterals|monster walk|abduccio de maluc en mig squat/, 'side_step'],
  [/abduccio de maluc dempeus/, 'stand_abd'],
  [/extensio de maluc dempeus/, 'stand_kick'],
  [/flexio de maluc alterna/, 'march'],
  [/step down/, 'step_down'],
  [/step-?up|pujada/, 'stepup'],
  [/bulgar/, 'split_bench'],
  [/split squat|estocad|lunge|pas enrere/, 'split'],
  [/pistol|unipodal a caixa/, (t) => (/caixa/.test(t) ? 'pistol_box' : 'pistol')],
  [/squat a caixa/, 'squat_box'],
  [/sumo/, 'squat_sumo'],
  [/front squat/, 'squat_front'],
  [/back squat|squat amb barra|squat al power personal|squat amb pausa/, 'squat_back'],
  [/squat|sentadilla/, 'squat'],
  [/(pes mort|rdl|romanes|deadlift).*(unipodal|una cama)|(unipodal|una cama).*(pes mort|rdl)/, 'hinge_sl'],
  [/good morning/, 'goodmorning'],
  [/bisagra de maluc amb pica/, 'hinge_stick'],
  [/cames rigides|rdl|romanes/, 'hinge'],
  [/pes mort|deadlift|trap bar/, 'deadlift'],
  [/bisagra/, 'hinge'],
  [/short foot/, 'stand'],
];

// Si el nom no diu res: segons el múscul principal i, si no, el bloc.
const PIC_BY_MUSCLE = { 'Bíceps': 'curl', 'Tríceps': 'pushdown', 'Pectoral': 'bench', 'Dorsal': 'row', 'Deltoides': 'ohpress', 'Trapezi': 'shrug',
  'Escàpula': 'row_standing', 'Manegot rotador': 'ext_rot', 'Quàdriceps': 'squat', 'Isquiotibials': 'hinge', 'GMax': 'bridge', 'GMed': 'side_step',
  'Adductors': 'lateral_lunge', 'Abductors': 'side_step', 'Bessons i soli': 'calf', 'Core': 'plank', 'Oblics': 'side_plank', 'Lumbar': 'birddog' };
const PIC_BY_BLOCK = { mob: 'stretch_stand', act: 'plank', pot: 'jump', for: 'squat', acc: 'shrug', cal: 'supine' };

// Noms antics dels dibuixos (si algú n'havia triat un a la biblioteca).
const PIC_ALIAS = { stand_hold: 'shrug', ankle_mob: 'ankle_wall', cod: 'shuffle', incline_prone: 'ytw' };
function picKeyOf(e) {
  if (!e) return 'stand';
  const pic = e.pic && (PICS[e.pic] ? e.pic : PIC_ALIAS[e.pic]);
  if (pic) return pic;
  const t = U.norm(`${e.name || ''} ${e.tg || ''}`);
  for (const [re, key] of PIC_RULES) if (re.test(t)) return typeof key === 'function' ? key(t) : key;
  return PIC_BY_MUSCLE[e.gm] || PIC_BY_BLOCK[e.block] || 'stand';
}

// Dibuixos en moviment: es poden aturar a Configuració (en aquest aparell) i s'aturen sols si el sistema demana menys
// moviment. mode: 'auto' (en moviment si es pot), 'still' (la postura quieta), 'start' i 'end' (la posició inicial i
// la final, amb la mateixa escala que el moviment: per al paper i el PDF de la sessió, «inici → final»).
const PicMotion = {
  KEY: 'eonlife:pic-motion',
  on() {
    try { if (localStorage.getItem(this.KEY) === 'off') return false; } catch (e) { /* res */ }
    try { if (window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false; } catch (e) { /* res */ }
    return true;
  },
  set(v) { try { localStorage.setItem(this.KEY, v ? 'on' : 'off'); } catch (e) { /* res */ } },
};
// Es mou si la postura té posició inicial i l'exercici no és isomètric (planxes, aguants…: quiets).
const picIsometric = (e) => /isometr|aguant|\bhold\b|estatic/.test(U.norm(`${(e && e.name) || ''} ${(e && e.tg) || ''}`));
const picMoves = (key, e) => !!(PICS[key] && PICS[key].from) && !picIsometric(e);

const PIC_CACHE = new Map();
function exercisePicSvg(e, keyOverride, mode = 'auto') {
  const key = keyOverride || picKeyOf(e);
  const g = picGearOf(e || {}, key);
  const P = PICS[key] || PICS.stand;
  const m = !picMoves(key, e) ? 'still' : mode === 'auto' ? (PicMotion.on() ? 'anim' : 'still') : mode;
  const id = `${key}|${g.kind}|${g.at || ''}|${g.one ? 1 : 0}|${m}`;
  if (!PIC_CACHE.has(id)) {
    let svg;
    try {
      svg = picRenderMode(P, key, g, m);
    } catch (err) {
      // un dibuix que falla no ha d'aturar la pantalla
      svg = key === 'stand' ? '' : picSvg('stand', { kind: '' });
    }
    PIC_CACHE.set(id, svg);
  }
  return PIC_CACHE.get(id);
}
function picRenderMode(P, key, g, m) {
  {
    let svg;
    if (m === 'still') svg = picSvg(key, g);
    else {
      const F = picFrames(P, g);
      const frame = (i) => picSvgOf(F.poses[i], F.scenes[i], F.order, g);
      if (m === 'start') svg = frame(0);
      else if (m === 'end') svg = frame(PIC_STEPS);
      else svg = picAnimate(F.scenes.map((_, i) => frame(i))) || picSvg(key, g);
    }
    return svg;
  }
}

// ── A la interfície ──
// Miniatura d'un exercici de la biblioteca (ex) o d'una línia de sessió (it): la foto pròpia si en té, si no el
// pictograma amb el material triat. El color és el del bloc.
// Imatge del vídeo de demostració de YouTube de l'exercici (si no s'hi ha triat un dibuix concret).
function exerciseVideoThumb(e) {
  if (!e || !e.video || e.pic) return '';
  const v = videoEmbed(e.video);
  return v && v.kind === 'youtube' ? `https://i.ytimg.com/vi/${v.id}/mqdefault.jpg` : '';
}

// seq: al paper i al PDF (fitxa de la sessió), la posició inicial i la final en lloc del dibuix en moviment.
// still: el dibuix quiet (p. ex. al triar-ne un d'entre tots).
function ExThumb({ ex, it, block, size = 52, class: c, seq, still }) {
  const [failed, setFailed] = useState('');
  const lib = ex || (it && it.exId ? Store.exercise(it.exId) : null);
  const e = it ? (lib ? { ...lib, material: it.material || lib.material } : { name: it.name, material: it.material, block }) : lib;
  const k = block || (e && e.block) || '';
  // Foto pròpia > imatge del vídeo de YouTube > dibuix. Si la imatge no carrega (sense internet, vídeo privat…), el dibuix.
  const src = (lib && lib.photo) || exerciseVideoThumb(lib);
  const pic = !(src && failed !== src);
  const key = pic ? picKeyOf(e) : '';
  const both = seq && pic && picMoves(key, e);
  // En moviment només mentre es veu a la pantalla (una llista llarga no ha de tenir centenars d'animacions alhora).
  const ref = useRef(null);
  const moves = pic && !still && picMoves(key, e) && PicMotion.on();
  const [live, setLive] = useState(() => moves && typeof IntersectionObserver === 'undefined');
  useEffect(() => {
    if (!moves || typeof IntersectionObserver === 'undefined' || !ref.current) return undefined;
    const io = new IntersectionObserver((list) => { for (const x of list) setLive(x.isIntersecting); }, { rootMargin: '120px' });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [moves, key]);
  return html`<span ref=${ref} class=${U.cls('exthumb', k && `blk-${k}`, c, both && 'has-seq')} style=${`--thumb:${size}px`} aria-hidden="true">
    ${!pic ? html`<img src=${src} alt="" loading="lazy" onError=${() => setFailed(src)}
        onLoad=${(ev) => { if (src.includes('ytimg.com') && ev.currentTarget.naturalWidth <= 120) setFailed(src); }} />`
      : html`<span class="exthumb-pic" dangerouslySetInnerHTML=${{ __html: exercisePicSvg(e, key, moves && live ? 'auto' : 'still') }}></span>`}
    ${both && html`<span class="exthumb-seq"><span class="exthumb-step" dangerouslySetInnerHTML=${{ __html: exercisePicSvg(e, key, 'start') }}></span>
      <span class="exthumb-arrow">→</span><span class="exthumb-step" dangerouslySetInnerHTML=${{ __html: exercisePicSvg(e, key, 'end') }}></span></span>`}
  </span>`;
}

// Foto feta amb la tauleta (o triada de la galeria): retallada en quadrat i reduïda perquè càpiga a l'Excel.
async function picPhotoFromFile(file) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('img')); i.src = url; });
    const side = Math.min(img.naturalWidth, img.naturalHeight);
    if (!side) throw new Error('img');
    const S = 240;
    const cv = document.createElement('canvas');
    cv.width = S; cv.height = S;
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, S, S);
    cx.drawImage(img, (img.naturalWidth - side) / 2, (img.naturalHeight - side) / 2, side, side, 0, 0, S, S);
    return cv.toDataURL('image/jpeg', 0.72);
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Miniatura a la fitxa de l'exercici: dibuix automàtic, un altre dibuix, foto pròpia o la imatge del vídeo.
// Imatge del vídeo de YouTube: es comprova si carrega. YouTube torna una imatge grisa de 120 px quan no n'hi ha
// (vídeo privat, esborrat o encara processant-se).
function useVideoThumbState(src) {
  const [state, setState] = useState('');
  useEffect(() => {
    if (!src) { setState(''); return undefined; }
    let alive = true;
    setState('loading');
    const im = new Image();
    im.onload = () => { if (alive) setState(im.naturalWidth > 120 ? 'ok' : 'bad'); };
    im.onerror = () => { if (alive) setState('bad'); };
    im.src = src;
    return () => { alive = false; };
  }, [src]);
  return state;
}

function ThumbEditor({ f, setF }) {
  const fileRef = useRef(null);
  const yt = videoEmbed(f.video);
  const auto = picKeyOf({ ...f, pic: '' });
  const vthumb = f.photo ? '' : exerciseVideoThumb(f);
  const vstate = useVideoThumbState(vthumb);
  const onFile = async (ev) => {
    const file = ev.currentTarget.files && ev.currentTarget.files[0];
    ev.currentTarget.value = '';
    if (!file) return;
    try {
      setF({ ...f, photo: await picPhotoFromFile(file) });
    } catch (e) {
      UI.toast('No s\'ha pogut llegir la imatge.', 'bad');
    }
  };
  const choose = () => {
    let close = null;
    close = UI.open(() => html`<${PicChooser} ex=${f} auto=${auto} onPick=${(k) => { close(); setF({ ...f, pic: k === auto ? '' : k }); }} onClose=${() => close()} />`);
  };
  return html`<div class="thumbedit">
    <${ExThumb} ex=${f} size=${112} />
    <div class="thumbedit-body">
      <p class="thumbedit-what">${f.photo ? 'Foto pròpia' : vthumb && vstate !== 'bad' ? 'Imatge del vídeo de YouTube' : `Dibuix: ${(PICS[f.pic || auto] || PICS.stand).label}${f.pic ? '' : ' (automàtic)'}`}</p>
      ${vthumb && vstate === 'bad' && html`<p class="thumbedit-warn">No es pot carregar la imatge d'aquest vídeo de YouTube: potser és privat, encara s'està
        processant o no hi ha connexió. Mentrestant surt el dibuix. Per posar-hi la vostra foto, toqueu «Foto pròpia».</p>`}
      <div class="inline wrap">
        <${Btn} size="sm" icon="edit" onClick=${choose}>Canvia el dibuix</${Btn}>
        <${Btn} size="sm" icon="camera" onClick=${() => fileRef.current && fileRef.current.click()}>${f.photo ? 'Una altra foto' : 'Foto pròpia'}</${Btn}>
        ${yt && yt.kind === 'youtube' && !f.photo && f.pic && html`<${Btn} size="sm" variant="ghost" icon="video" onClick=${() => setF({ ...f, pic: '' })}>Imatge del vídeo</${Btn}>`}
        ${f.photo && html`<${Btn} size="sm" variant="ghost" icon="x" onClick=${() => setF({ ...f, photo: '' })}>Treu la foto</${Btn}>`}
      </div>
      <p class="muted small">La foto, d'un entrenador fent l'exercici (mai d'un pacient). Si l'exercici té un vídeo de YouTube, la miniatura és la imatge del vídeo; si no, el dibuix.</p>
      <input ref=${fileRef} type="file" accept="image/*" hidden onChange=${onFile} aria-label="Foto de l'exercici" />
    </div>
  </div>`;
}

function PicChooser({ ex, auto, onPick, onClose }) {
  const cur = ex.pic || auto;
  return html`<${Dialog} wide=${true} title="Tria el dibuix" onClose=${onClose} footer=${html`<span class="grow"></span><${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>`}>
    <div class="picgrid">${Object.keys(PICS).map((k) => html`<button type="button" class=${U.cls('picopt', k === cur && 'on')} onClick=${() => onPick(k)} aria-pressed=${k === cur}>
      <${ExThumb} ex=${{ ...ex, photo: '', pic: k }} size=${76} still=${true} />
      <span class="picopt-name">${PICS[k].label}${k === auto ? ' · automàtic' : ''}</span>
    </button>`)}</div>
  </${Dialog}>`;
}
