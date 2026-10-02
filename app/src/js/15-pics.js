/* EON Life · miniatures dels exercicis.
   Pictogrames propis (no són imatges de Technogym ni de cap altra app): una figura amb la postura del moviment i el
   material. Cada exercici en té un d'automàtic segons el nom i el material; a la biblioteca se'n pot triar un altre
   o posar-hi una foto pròpia (feta amb la tauleta), que llavors és la miniatura. */

// ── Figura ──
// Postura vista de costat (mirant a la dreta) o de cara (front: true). Angles en graus: 0 = dreta, 90 = avall,
// -90 = amunt, 180 = esquerra. t = tronc (del maluc al coll); a/b = braç proper/llunyà [braç, avantbraç];
// l/m = cama propera/llunyana [cuixa, cama, peu]. lift = alçada del cos sobre el terra (banc, caixa, salt).
const PIC_LEN = { torso: 23, neck: 9.5, head: 7, upper: 12.5, fore: 12, thigh: 17, shin: 18, foot: 5 };
const PIC_FLOOR = 89;

function picAt(p, len, deg) {
  const r = (deg * Math.PI) / 180;
  return [p[0] + Math.cos(r) * len, p[1] + Math.sin(r) * len];
}

function picBody(P, s) {
  const L = PIC_LEN;
  const t = P.t ?? -90;
  const p = [0, 0];
  const n = picAt(p, L.torso * s, t);
  const h = picAt(n, L.neck * s, t + (P.hd || 0));
  const front = !!P.front;
  const sh = front ? [picAt(n, 7 * s, t + 90), picAt(n, 7 * s, t - 90)] : [n, n];
  const hp = front ? [picAt(p, 4.5 * s, t + 90), picAt(p, 4.5 * s, t - 90)] : [p, p];
  const arm = (o, a) => { const e = picAt(o, L.upper * s, a[0]); return [o, e, picAt(e, L.fore * s, a[1])]; };
  const leg = (o, l) => {
    const k = picAt(o, L.thigh * s, l[0]);
    const f = picAt(k, L.shin * s, l[1]);
    return front && l[2] == null ? [o, k, f] : [o, k, f, picAt(f, L.foot * s, l[2] ?? l[1] - 90)];
  };
  const a = P.a || [92, 88];
  const l = P.l || [90, 90, 0];
  return { p, n, h, sh, hp, front, s, a: arm(sh[0], a), b: arm(sh[1], P.b || a), l: leg(hp[0], l), m: leg(hp[1], P.m || l) };
}

function picPoints(B) {
  const r = PIC_LEN.head * B.s;
  return [B.p, B.n, [B.h[0] - r, B.h[1] - r], [B.h[0] + r, B.h[1] + r], ...B.sh, ...B.hp, ...B.a, ...B.b, ...B.l, ...B.m];
}

function picMove(B, dx, dy) {
  const mv = (q) => [q[0] + dx, q[1] + dy];
  return { ...B, p: mv(B.p), n: mv(B.n), h: mv(B.h), sh: B.sh.map(mv), hp: B.hp.map(mv), a: B.a.map(mv), b: B.b.map(mv), l: B.l.map(mv), m: B.m.map(mv) };
}

// Col·loca la figura: centrada i amb el punt més baix a terra (o «lift» per sobre). Si no hi cap, s'encongeix.
function picLayout(P) {
  const box = (B) => {
    const pts = picPoints(B);
    const xs = pts.map((q) => q[0]), ys = pts.map((q) => q[1]);
    return { x0: Math.min(...xs), x1: Math.max(...xs), y0: Math.min(...ys), y1: Math.max(...ys) };
  };
  let B = picBody(P, 1);
  let bx = box(B);
  const lift = P.lift || 0;
  const s = Math.min(1, 86 / (bx.x1 - bx.x0), (PIC_FLOOR - lift - 6) / (bx.y1 - bx.y0)) * (P.s || 1);
  if (s !== 1) { B = picBody(P, s); bx = box(B); }
  return picMove(B, 50 - (bx.x0 + bx.x1) / 2 + (P.dx || 0) * s, PIC_FLOOR - lift * s - bx.y1);
}

// ── Peces SVG ──
const pf = (n) => Math.round(n * 10) / 10;
const picLine = (pts, cls, w) => `<path class="${cls}" d="M${pts.filter(Boolean).map((q) => `${pf(q[0])} ${pf(q[1])}`).join('L')}" stroke-width="${w}"/>`;
const picRect = (x, y, w, h, cls = 'pp', r = 1.5) => `<rect class="${cls}" x="${pf(x)}" y="${pf(y)}" width="${pf(Math.max(w, 0.5))}" height="${pf(Math.max(h, 0.5))}" rx="${r}"/>`;
const picCircle = (c, r, cls = 'pp') => `<circle class="${cls}" cx="${pf(c[0])}" cy="${pf(c[1])}" r="${pf(r)}"/>`;
const picMid = (p, q, k = 0.5) => [p[0] + (q[0] - p[0]) * k, p[1] + (q[1] - p[1]) * k];

// Material de suport que forma part de la postura (banc, caixa, paret, barra de dominades…). F = terra.
const PROP = {
  bench: (x0, x1, y) => picRect(x0, y, x1 - x0, 4.5, 'pp', 2) + picLine([[x0 + 4, y + 4], [x0 + 4, PIC_FLOOR]], 'pl', 2.6) + picLine([[x1 - 4, y + 4], [x1 - 4, PIC_FLOOR]], 'pl', 2.6),
  box: (x0, x1, y) => picRect(x0, y, x1 - x0, PIC_FLOOR - y, 'pp', 2),
  wall: (x) => picLine([[x, 8], [x, PIC_FLOOR]], 'pl', 3),
  bar: (c, w = 12) => picLine([[c[0] - w, c[1]], [c[0] + w, c[1]]], 'pl', 3),
  seat: (x0, x1, y) => picRect(x0, y, x1 - x0, 5, 'pp', 2) + picLine([[(x0 + x1) / 2, y + 5], [(x0 + x1) / 2, PIC_FLOOR]], 'pl', 3) + picLine([[(x0 + x1) / 2 - 9, PIC_FLOOR], [(x0 + x1) / 2 + 9, PIC_FLOOR]], 'pl', 3),
  roller: (c, r = 5.5) => picCircle(c, r, 'pp'),
  pad: (c, r = 3.5, cls = 'pp') => picCircle(c, r, cls),
};

// ── Postures ──
const PICS = {
  stand: { label: 'Dempeus', a: [95, 80], b: [85, 95], m: [92, 88, 0] },
  stand_hold: { label: 'Dempeus amb pes', a: [92, 90], b: [88, 92], m: [92, 88, 0], grip: 'hands' },
  squat: { band: 'knees', label: 'Squat', t: -64, l: [10, 106, 0], a: [72, -72], grip: 'chest' },
  squat_back: { label: 'Squat amb barra', t: -62, l: [10, 106, 0], a: [150, -105], grip: 'back' },
  squat_box: { label: 'Squat a caixa', t: -64, l: [10, 106, 0], a: [5, 0], props: (B) => PROP.box(B.p[0] - 13, B.p[0] + 2, B.p[1] + 3.5) },
  squat_oh: { label: 'Squat amb braços amunt', t: -72, hd: 16, l: [12, 106, 0], a: [-94, -96], grip: 'hands' },
  pistol: { label: 'Squat a una cama', t: -55, l: [12, 108, 0], m: [-4, -4], a: [-6, -4], grip: 'chest' },
  split: { label: 'Estocada', t: -88, l: [8, 92, 0], m: [104, 172, 98], a: [92, 90], grip: 'hands' },
  split_bench: { label: 'Squat búlgar', t: -84, l: [8, 94, 0], m: [112, -150, 180], a: [92, 90], grip: 'hands',
    props: (B) => PROP.bench(B.m[3][0] - 8, B.m[2][0] + 5, B.m[2][1] + 2.5) },
  split_oh: { label: 'Estocada amb braços amunt', t: -88, hd: 24, l: [8, 92, 0], m: [104, 172, 98], a: [-90, -92], grip: 'hands' },
  lateral_lunge: { label: 'Estocada lateral', front: true, t: -95, l: [40, 100], m: [140, 140], a: [125, -20], b: [55, 200] },
  side_step: { band: 'knees', label: 'Passes laterals', front: true, t: -90, l: [70, 98], m: [110, 82], a: [70, 140], b: [110, 40] },
  stand_abd: { band: 'knees', label: 'Abducció dempeus', front: true, t: -92, l: [62, 62], m: [92, 90], a: [70, 140], b: [110, 40] },
  stand_kick: { label: 'Extensió de maluc dempeus', t: -85, l: [118, 112, 30], m: [90, 90, 0], a: [40, 20] },
  stepup: { label: 'Step-up', t: -84, l: [-8, 96, 0], m: [100, 96, 30], a: [94, 86], grip: 'hands',
    props: (B) => PROP.box(B.l[2][0] - 9, B.l[2][0] + 14, B.l[2][1] + 3) },
  hinge: { label: 'Bisagra (pes mort)', t: -28, l: [82, 98, 0], a: [90, 90], grip: 'hands' },
  goodmorning: { label: 'Good morning', t: -25, l: [84, 96, 0], a: [175, -100], grip: 'back' },
  hinge_sl: { label: 'Pes mort a una cama', t: -14, l: [92, 90, 0], m: [176, 178, 100], a: [90, 90], grip: 'hands' },
  swing: { label: 'Swing', t: -88, l: [88, 92, 0], a: [8, 4], grip: 'chest' },
  swing_oh: { label: 'Swing per sobre del cap', t: -92, a: [-62, -66], grip: 'chest' },
  bridge: { band: 'knees', label: 'Pont de glutis', t: 158, hd: -10, l: [-30, 98, 0], a: [12, 4], grip: 'hips' },
  bridge_sl: { label: 'Pont de glutis a una cama', t: 158, hd: -10, l: [-22, -22, -100], m: [-30, 98, 0], a: [12, 4], grip: 'hips' },
  bridge_ball: { label: 'Curl femoral amb fitball', t: 160, hd: -10, l: [-24, 16, -60], a: [14, 4],
    props: (B) => picCircle([B.l[2][0] + 2, B.l[2][1] + 7], 7, 'pg') },
  hipthrust: { label: 'Hip thrust', t: 178, hd: -6, l: [-4, 92, 0], a: [40, 0], grip: 'hips',
    props: (B) => PROP.bench(B.n[0] - 12, B.n[0] + 5, B.n[1] + 4) },
  nordic: { label: 'Nordic', t: -58, l: [122, 180, 270], a: [40, -30], props: (B) => PROP.pad([B.l[2][0] + 2, B.l[2][1] - 6]) },
  hyperext: { label: 'Hiperextensió', t: -40, l: [140, 140, 225], a: [60, -150], lift: 10,
    props: (B) => PROP.pad([B.p[0] + 4, B.p[1] + 5], 4.5) + picLine([[B.p[0] + 4, B.p[1] + 9], [B.p[0] - 4, PIC_FLOOR]], 'pl', 3) + PROP.pad([B.l[2][0] - 1, B.l[2][1] + 5], 3) },
  legext: { label: 'Extensió de genoll a màquina', t: -98, l: [0, 8, -80], a: [70, 70], lift: 30,
    props: (B) => PROP.seat(B.p[0] - 8, B.l[1][0] + 1, B.p[1] + 4) + picRect(B.p[0] - 13, B.n[1] - 2, 4.5, B.p[1] - B.n[1] + 6) + PROP.pad([B.l[2][0] + 1, B.l[2][1] + 4], 3.5, 'pg') },
  seated_curl: { label: 'Curl femoral a màquina', t: -95, l: [0, 120, 30], a: [70, 70], lift: 24,
    props: (B) => PROP.seat(B.p[0] - 8, B.l[1][0] + 2, B.p[1] + 4) + picRect(B.p[0] - 13, B.n[1] - 2, 4.5, B.p[1] - B.n[1] + 6) + PROP.pad([B.l[2][0] - 2, B.l[2][1] - 4], 3.5, 'pg') },
  legpress: { label: 'Premsa', t: -152, hd: 25, l: [-48, 2, -88], a: [60, 20], lift: 20,
    props: (B) => picLine([[B.n[0] - 4, B.n[1] - 4], [B.p[0] + 2, B.p[1] + 5]], 'pl', 4.5) + picLine([[B.p[0] + 2, B.p[1] + 5], [B.p[0] + 2, PIC_FLOOR]], 'pl', 3)
      + picLine([[B.l[2][0] + 3, B.l[2][1] - 9], [B.l[2][0] + 3, B.l[2][1] + 9]], 'pgl', 4) },
  calf: { label: 'Elevació de talons', t: -90, l: [90, 90, 40], a: [94, 86], lift: 9, grip: 'hands',
    props: (B) => PROP.box(B.l[3][0] - 7, B.l[3][0] + 9, B.l[3][1] + 2) },
  abd_machine: { label: 'Abductor / adductor a màquina', front: true, t: -90, l: [38, 92], m: [142, 88], a: [100, 70], b: [80, 110], lift: 2,
    props: (B) => picRect(B.p[0] - 13, B.p[1] + 3, 26, 5) + picLine([[B.p[0], B.p[1] + 8], [B.p[0], PIC_FLOOR]], 'pl', 3)
      + PROP.pad([B.l[1][0] + 3.5, B.l[1][1]], 3, 'pg') + PROP.pad([B.m[1][0] - 3.5, B.m[1][1]], 3, 'pg') },
  copenhagen: { label: 'Copenhagen', front: true, t: 196, hd: -6, l: [-14, -14], m: [-14, -14], a: [90, 180], b: [-70, -80],
    props: (B) => PROP.box(B.l[2][0] - 9, B.l[2][0] + 7, B.l[2][1] + 3) },
  side_plank: { label: 'Planxa lateral', front: true, t: 192, hd: -6, l: [12, 12], m: [12, 12], a: [90, 180], b: [-70, -80] },
  side_abd: { band: 'knees', label: 'Abducció estirat de costat', front: true, t: 186, hd: -12, l: [-24, -24], m: [4, 4], a: [90, 180], b: [30, 20] },
  clamshell: { band: 'knees', label: 'Clamshell', front: true, t: 186, hd: -12, l: [-28, 150], m: [24, 168], a: [90, 180], b: [20, 30] },
  quadruped: { label: 'Quadrupèdia', t: -19, hd: 12, l: [90, 180, 180], a: [90, 90] },
  birddog: { label: 'Bird dog', t: -19, hd: 12, l: [90, 180, 180], m: [180, 176, 100], a: [-8, -8], b: [90, 90] },
  quad_kick: { label: 'Kickback en quadrupèdia', t: -19, hd: 12, l: [200, 176, 260], m: [90, 180, 180], a: [90, 90] },
  quad_rot: { label: 'Rotació en quadrupèdia', t: -19, hd: 0, l: [90, 180, 180], a: [-100, -100], b: [90, 90] },
  child: { label: 'Postura del nen', t: 12, hd: 30, l: [38, 182, 180], a: [6, 0] },
  plank: { label: 'Planxa', t: -12.4, hd: 6, l: [167.6, 167.6, 100], a: [90, 0] },
  plank_high: { label: 'Planxa de braços estirats', t: -25, hd: 6, l: [155, 155, 100], a: [90, 90] },
  climber: { label: 'Mountain climber', t: -25, hd: 6, l: [62, 150, 70], m: [155, 155, 100], a: [90, 90] },
  rollout: { label: 'Ab wheel', t: -6, hd: 12, l: [148, 180, 180], a: [40, 40], props: (B) => PROP.roller([B.a[2][0] + 1, PIC_FLOOR - 5], 5) },
  reverse_plank: { label: 'Planxa invertida', t: 205, hd: -20, l: [-15, -15, -100], a: [92, 92] },
  superman: { label: 'Superman', t: -8, hd: -10, l: [176, 176, 110], a: [-14, -10] },
  deadbug: { label: 'Dead bug', t: 180, hd: -8, l: [-88, 0, -90], m: [-20, -16, -100], a: [-84, -86], b: [-160, -168] },
  crunch: { label: 'Crunch', t: -150, hd: 10, l: [-45, 62, 0], a: [-28, -24] },
  crunch_legs: { label: 'Crunch amb cames elevades', t: -158, hd: 10, l: [-88, 0, -90], a: [-40, -30] },
  toe_touch: { label: 'Crunch tocant els peus', t: -150, hd: 10, l: [-92, -92, 0], a: [-55, -60] },
  boat: { label: 'Posició de barca', t: -128, hd: 10, l: [-36, 12, -70], a: [-20, -10], grip: 'chest' },
  pallof: { label: 'Pallof press', t: -88, l: [80, 98, 0], m: [100, 84, 0], a: [2, 0], grip: 'chest', anchor: 'back' },
  woodchop: { label: 'Woodchop', t: -80, l: [80, 98, 0], m: [102, 82, 0], a: [32, 34], grip: 'chest', anchor: 'high' },
  carry: { label: 'Carry', t: -88, l: [72, 102, 0], m: [112, 90, 0], a: [93, 90], b: [87, 90], grip: 'hands' },
  curl: { label: 'Curl de bíceps', t: -90, a: [96, -24], b: [94, 88], grip: 'hands' },
  pushdown: { label: 'Extensió de tríceps', t: -84, a: [96, 70], grip: 'hands', anchor: 'over' },
  triceps_oh: { label: 'Tríceps per sobre del cap', t: -90, a: [-82, 160], grip: 'hands' },
  tri_kickback: { label: 'Kickback de tríceps', t: -24, l: [82, 98, 0], a: [172, 174], b: [90, 90], grip: 'hands' },
  dip: { label: 'Fons de tríceps', t: -92, l: [-4, 30, -60], a: [128, 90], lift: 12,
    props: (B) => PROP.bench(B.a[2][0] - 14, B.a[2][0] + 4, B.a[2][1] + 1) },
  lat_raise: { label: 'Elevacions laterals', front: true, t: -90, a: [8, 4], b: [172, 176], grip: 'hands' },
  front_raise: { label: 'Elevacions frontals', t: -90, a: [2, 0], b: [92, 88], grip: 'hands' },
  rear_fly: { label: 'Ocells', t: -22, l: [82, 98, 0], a: [60, 64], b: [104, 100], grip: 'hands' },
  ext_rot: { label: 'Rotació externa d\'espatlla', t: -90, a: [92, 0], b: [94, 88], grip: 'hands', anchor: 'front' },
  row: { label: 'Rem', t: -28, l: [82, 98, 0], a: [-158, 92], grip: 'hands' },
  upright_row: { label: 'Rem vertical', t: -90, a: [-22, 138], grip: 'chest' },
  inverted_row: { label: 'Rem invertit', t: -158, hd: 6, l: [22, 22, -70], a: [-86, -70], grip: 'none',
    props: (B) => PROP.bar([B.a[2][0], B.a[2][1] - 1.5], 9) + picLine([[B.a[2][0] + 8, B.a[2][1]], [B.a[2][0] + 8, PIC_FLOOR]], 'pl', 2.4) },
  seated_row: { label: 'Rem assegut', t: -90, l: [0, 10, -80], a: [125, -4], lift: 10, grip: 'hands', anchor: 'front',
    props: (B) => picRect(B.p[0] - 10, B.p[1] + 3, 18, PIC_FLOOR - B.p[1] - 3) },
  row_standing: { label: 'Rem dempeus', t: -84, l: [80, 98, 0], m: [104, 84, 0], a: [125, -4], grip: 'hands', anchor: 'front' },
  face_pull: { label: 'Face pull', t: -86, l: [80, 98, 0], m: [104, 84, 0], a: [-175, -48], grip: 'hands', anchor: 'face' },
  crossover: { label: 'Creuament a la politja', t: -74, l: [80, 98, 0], m: [104, 84, 0], a: [55, 48], grip: 'hands', anchor: 'high' },
  pullover: { label: 'Pullover', t: -58, l: [82, 98, 0], a: [36, 36], grip: 'hands', anchor: 'over' },
  pullup: { label: 'Dominades', t: -90, hd: 22, l: [100, 118, 30], a: [-94, -88], lift: 10, grip: 'none', props: (B) => PROP.bar([B.a[2][0], B.a[2][1] - 1.5], 13) },
  pulldown: { label: 'Jaló al pit', t: -96, l: [0, 90, 0], a: [-108, -70], grip: 'none',
    props: (B) => picRect(B.p[0] - 9, B.p[1] + 3, 15, 5) + picLine([[B.p[0] - 1.5, B.p[1] + 8], [B.p[0] - 1.5, PIC_FLOOR]], 'pl', 3)
      + PROP.bar([B.a[2][0], B.a[2][1] - 1], 12) + picLine([[B.a[2][0], B.a[2][1] - 1], [B.a[2][0], 3]], 'pg', 2) },
  ohpress: { label: 'Press per sobre del cap', t: -90, hd: 24, a: [-90, -92], b: [-94, -90], grip: 'hands' },
  ohpress_seated: { label: 'Press assegut', t: -90, hd: 24, l: [0, 90, 0], a: [-90, -92], grip: 'hands',
    props: (B) => PROP.bench(B.p[0] - 10, B.p[0] + 12, B.p[1] + 3) },
  halo: { label: 'Halo', t: -90, a: [-60, -168], grip: 'hands' },
  bench: { label: 'Press de banca', t: 180, hd: -4, l: [26, 92, 0], a: [-90, -90], lift: 0, grip: 'hands',
    props: (B) => PROP.bench(B.n[0] - 10, B.p[0] + 4, B.p[1] + 4) },
  bench_incline: { label: 'Press inclinat', t: -146, hd: 0, l: [10, 96, 0], a: [-64, -64], grip: 'hands',
    props: (B) => picLine([[B.n[0] - 3, B.n[1] - 3], [B.p[0] + 2, B.p[1] + 5]], 'pl', 4.5) + PROP.bench(B.p[0] - 6, B.p[0] + 10, B.p[1] + 4) },
  floor_press: { label: 'Press estirat a terra', t: 180, hd: -8, l: [-48, 54, 0], a: [-90, -90], grip: 'hands' },
  seated_press: { label: 'Press de pit assegut', t: -94, l: [0, 90, 0], a: [2, 0], grip: 'hands', anchor: 'back',
    props: (B) => picRect(B.p[0] - 9, B.p[1] + 3, 15, 5) + picLine([[B.p[0] - 1.5, B.p[1] + 8], [B.p[0] - 1.5, PIC_FLOOR]], 'pl', 3) + picRect(B.p[0] - 13, B.n[1] - 2, 4.5, B.p[1] - B.n[1] + 6) },
  jump: { label: 'Salt vertical', t: -90, hd: 22, l: [96, 82, 60], m: [92, 94, 60], a: [-88, -90], b: [-94, -96], lift: 10,
    props: () => picLine([[40, PIC_FLOOR - 4], [40, PIC_FLOOR - 1]], 'pl', 2) + picLine([[60, PIC_FLOOR - 4], [60, PIC_FLOOR - 1]], 'pl', 2) },
  hop: { label: 'Salt amb càrrega', t: -88, l: [96, 84, 55], m: [92, 94, 55], a: [94, 88], lift: 8, grip: 'hands' },
  jump_fwd: { label: 'Salt horitzontal', t: -62, l: [10, 100, 20], m: [52, 140, 40], a: [-32, -26], lift: 14 },
  box_jump: { label: 'Box jump', t: -66, l: [14, 104, 0], a: [-10, -6], lift: 18,
    props: (B) => PROP.box(B.l[2][0] - 14, B.l[2][0] + 12, B.l[2][1] + 3) },
  drop_jump: { label: 'Drop jump', t: -84, l: [92, 90, 0], a: [130, 120], lift: 24,
    props: (B) => PROP.box(B.l[2][0] - 18, B.l[2][0] + 7, B.l[2][1] + 3) },
  land: { label: 'Aterratge', t: -55, l: [18, 110, 0], a: [148, 150] },
  chest_pass: { label: 'Passada de pit', t: -82, l: [70, 100, 0], m: [108, 88, 0], a: [-4, -2], grip: 'throw' },
  slam: { label: 'Slam', t: -94, hd: 24, a: [-88, -90], grip: 'chest' },
  rot_throw: { label: 'Llançament rotacional', t: -70, l: [72, 102, 0], m: [112, 86, 0], a: [-36, -30], grip: 'throw' },
  clean: { label: 'Cargolada', t: -82, l: [42, 118, 0], a: [-6, -152], grip: 'hands' },
  high_pull: { label: 'High pull', t: -88, l: [90, 92, 50], a: [-30, 128], grip: 'chest', lift: 3 },
  sprint: { label: 'Sprint', t: -70, hd: 8, l: [-18, 82, -10], m: [122, 150, 70], a: [132, 52], b: [34, -66], lift: 4 },
  skipping: { label: 'Skipping', t: -88, l: [-6, 88, 0], m: [92, 90, 30], a: [128, 52], b: [44, -56], lift: 2 },
  cod: { label: 'Canvi de direcció', front: true, t: -112, l: [58, 64], m: [104, 96], a: [-30, -10], b: [150, 120] },
  sled: { label: 'Empenta de trineu', t: -42, hd: 10, l: [26, 116, 0], m: [128, 150, 60], a: [-14, -6],
    props: (B) => picLine([[B.a[2][0] + 3, B.a[2][1] - 2], [B.a[2][0] + 3, PIC_FLOOR]], 'pl', 3) + picLine([[6, PIC_FLOOR + 1], [94, PIC_FLOOR + 1]], 'pl', 3) },
  run_tread: { label: 'Cinta / AlterG', t: -78, hd: 4, l: [-8, 84, -10], m: [118, 146, 70], a: [130, 56], b: [36, -66], lift: 3,
    props: () => picLine([[8, PIC_FLOOR + 1], [92, PIC_FLOOR + 1]], 'pl', 4) + picLine([[86, PIC_FLOOR], [80, 46]], 'pl', 3) },
  bike: { label: 'Bicicleta', t: -62, l: [-12, 92, 0], m: [52, 112, 10], a: [24, 14], lift: 14,
    props: (B) => picLine([[B.p[0] - 1, B.p[1] + 3], [B.p[0] + 6, PIC_FLOOR - 8]], 'pl', 3) + picLine([[B.p[0] - 6, B.p[1] + 3], [B.p[0] + 5, B.p[1] + 3]], 'pl', 3.5)
      + picLine([[B.a[2][0] + 2, B.a[2][1]], [B.a[2][0] - 2, PIC_FLOOR - 8]], 'pl', 3) + picCircle([B.p[0] + 10, PIC_FLOOR - 8], 6, 'pg')
      + picLine([[B.p[0] - 12, PIC_FLOOR], [B.a[2][0] + 6, PIC_FLOOR]], 'pl', 3) },
  ankle_mob: { label: 'Mobilitat de turmell', t: -86, l: [-2, 62, 0], m: [94, 180, 180], a: [-12, -6],
    props: (B) => PROP.wall(B.l[2][0] + 11) },
  half_kneel: { label: 'Mig genoll', t: -92, l: [6, 88, 0], m: [100, 180, 180], a: [-95, -92] },
  sit_9090: { label: '90/90', t: -88, l: [4, 168, 180], m: [168, 22, -60], a: [70, 30] },
  openbook: { label: 'Open book', front: true, t: 180, hd: -10, l: [-6, 168], m: [0, 172], a: [-90, -90], b: [6, 0] },
  legs_wall: { label: 'Cames a la paret', t: 180, hd: -6, l: [-90, -90, 0], a: [20, 4], props: (B) => PROP.wall(B.l[2][0] + 4) },
  supine: { label: 'Estirat panxa amunt', t: 180, hd: -6, l: [-50, 50, 0], a: [8, -40] },
  breath_9090: { label: 'Respiració 90/90', t: 180, hd: -6, l: [-90, 0, -90], a: [8, -40], props: (B) => PROP.box(B.l[1][0] - 2, B.l[2][0] + 6, B.l[1][1] + 3.5) },
  prone: { label: 'Estirat panxa avall', t: 0, hd: -2, l: [180, 180, 100], a: [120, 0] },
  seated_breath: { label: 'Assegut', front: true, t: -90, l: [18, 160], m: [162, 20], a: [110, 40], b: [70, 140] },
  roll_back: { label: 'Foam roller a l\'esquena', t: -150, hd: 14, l: [-38, 70, 0], a: [-130, 10], lift: 0,
    props: (B) => picCircle(picAt(picMid(B.p, B.n, 0.62), 6, -60), 6, 'pg') },
  roll_side: { label: 'Alliberament de costat', front: true, t: 192, hd: -6, l: [12, 12], m: [12, 12], a: [90, 180], b: [-70, -80],
    props: (B) => picCircle([B.p[0] + 3, PIC_FLOOR - 3.6], 3.6, 'pg') },
  roll_seated: { label: 'Alliberament assegut', t: -122, hd: 10, l: [-4, 0, -80], m: [-30, 60, 0], a: [148, 104], lift: 9,
    props: (B) => picCircle(picAt(picMid(B.l[1], B.l[2], 0.5), 5.2, 90), 4.6, 'pg') },
  roll_prone: { label: 'Alliberament panxa avall', t: -12.4, hd: 6, l: [172, 170, 100], a: [90, 0],
    props: (B) => picCircle(picAt(picMid(B.p, B.l[1], 0.6), 5.4, 80), 5, 'pg') },
  roll_foot: { label: 'Pilota sota el peu', t: -90, l: [45, 118, 0], m: [92, 88, 0], a: [94, 86], b: [86, 94], lift: 0,
    props: (B) => picCircle([B.l[2][0] + 3, B.l[2][1] + 4.5], 4, 'pg') },
  balance: { label: 'Equilibri a una cama', t: -90, l: [-8, 90, 0], m: [90, 90, 0], a: [24, 20], b: [150, 156] },
  balance_dome: { label: 'Equilibri inestable', t: -90, l: [-8, 90, 0], m: [90, 90, 0], a: [24, 20], b: [150, 156], lift: 7,
    props: (B) => `<path class="pp" d="M${pf(B.m[2][0] - 10)} ${PIC_FLOOR}A10 7.5 0 0 1 ${pf(B.m[2][0] + 10)} ${PIC_FLOOR}Z"/>` },
  vor: { label: 'Estabilització de la mirada', t: -90, a: [-8, -6], b: [94, 88],
    props: (B) => picRect(B.a[2][0] + 1, B.a[2][1] - 6, 5, 8, 'pg', 1) },
  vor_seated: { label: 'Mirada (assegut)', t: -90, l: [0, 90, 0], a: [-8, -6],
    props: (B) => picRect(B.a[2][0] + 1, B.a[2][1] - 6, 5, 8, 'pg', 1) + PROP.bench(B.p[0] - 10, B.p[0] + 12, B.p[1] + 3) },
  tgu: { label: 'Turkish get-up', t: -125, hd: 12, l: [-40, 58, 0], m: [-2, 0, -80], a: [-92, -92], b: [138, 100], grip: 'hands' },
  windmill: { label: 'Windmill', front: true, t: -140, l: [62, 80], m: [112, 102], a: [-92, -92], b: [100, 100], grip: 'near' },
  stretch_stand: { label: 'Estirament dempeus', front: true, t: -98, l: [86, 90], m: [96, 90], a: [-105, -110], b: [-110, -100] },
  wall_slide: { label: 'Wall slide', t: -90, a: [-150, -96], b: [-150, -96], props: (B) => PROP.wall(B.p[0] - 7) },
  incline_prone: { label: 'Estirat sobre banc inclinat', t: -36, hd: -4, l: [116, 98, 0], a: [-26, -24],
    props: (B) => picLine([[B.p[0] - 2, B.p[1] + 5], [B.n[0] + 2, B.n[1] + 5]], 'pl', 4.5) + picLine([[B.p[0] + 2, B.p[1] + 5], [B.p[0] + 2, PIC_FLOOR]], 'pl', 3) },
  squeeze: { label: 'Squeeze amb pilota', t: 180, hd: -6, l: [-50, 50, 0], a: [8, -40], props: (B) => picCircle([B.l[1][0] + 1, B.l[1][1] - 5], 4.5, 'pg') },
  ghd_situp: { label: 'GHD sit-up', t: -168, hd: 4, l: [4, 30, -60], a: [-150, -160], lift: 26,
    props: (B) => PROP.pad([B.p[0] + 3, B.p[1] + 5.5], 5) + picLine([[B.p[0] + 3, B.p[1] + 10], [B.p[0] + 3, PIC_FLOOR]], 'pl', 3) + PROP.pad([B.l[2][0] + 1, B.l[2][1] + 5], 3) },
};

// ── Material que es porta (a les mans, a l'esquena, als genolls…) ──
// Les postures on el material del Power Personal és la barra (a la resta, mancuernes o res).
const PIC_BAR_POSES = new Set(['squat', 'squat_back', 'squat_oh', 'split', 'split_oh', 'split_bench', 'lateral_lunge', 'hinge', 'goodmorning', 'row', 'ohpress',
  'ohpress_seated', 'bench', 'bench_incline', 'clean', 'high_pull', 'upright_row', 'hipthrust', 'stepup', 'calf', 'curl', 'stand_hold']);
const PIC_DB_POSES = new Set(['rear_fly', 'lat_raise', 'front_raise', 'tri_kickback', 'triceps_oh', 'floor_press']);

function picGearOf(e, key) {
  const t = U.norm(`${e.name || ''} ${e.tg || ''}`);
  const m = U.norm(e.material || '');
  const P = PICS[key] || {};
  const at = /banda als genolls|band at knees/.test(t) ? 'knees' : /banda als (turmells|peus)|band at (ankles|feet)/.test(t) ? 'ankles' : '';
  const lower = !P.grip || P.band;
  if (/loop band/.test(m) || at) return at || lower ? { kind: 'loop', at: at || P.band || 'knees' } : { kind: 'band' };
  if (/kbox/.test(m)) return { kind: 'kbox' };
  if (/lliscador|flowin/.test(m + t)) return { kind: 'sliders' };
  if (/power personal/.test(m)) {
    if (/\bbanda\b|soft loop|nanses/.test(t)) return { kind: P.band ? 'loop' : 'band', at: P.band };
    if (/barra/.test(t)) return { kind: 'bar' };
    if (/obertures|ocells|elevacions|kickback|martell/.test(t) || PIC_DB_POSES.has(key)) return { kind: 'db' };
    return { kind: PIC_BAR_POSES.has(key) ? 'bar' : '' };
  }
  if (/barra|landmine|hexagonal|trap bar/.test(m + ' ' + t) && !/mancuern|kettlebell|\bkb\b/.test(t)) return { kind: 'bar' };
  if (/\bpica\b/.test(t)) return { kind: 'stick' };
  if (/mancuern|dumbbell/.test(m + ' ' + t)) return { kind: 'db' };
  if (/kettlebell|\bkb\b/.test(m + ' ' + t)) return { kind: 'kb', one: /una ma|a un brac|unilateral|alterna?t?\b|\bun\b/.test(t) && !/kettlebells|dues/.test(t) };
  if (/med ball|pilota medicinal|\bslam\b|shot put/.test(t + ' ' + m)) return { kind: 'ball' };
  if (/politja|cable|pulley|keiser|conica|isoinercial|face pull|creuament/.test(m + ' ' + t)) return { kind: 'cable' };
  if (/goma|\bbanda\b|elastic|band\b/.test(m + ' ' + t)) return P.band ? { kind: 'loop', at: P.band } : { kind: 'band' };
  return { kind: '' };
}

function picGear(B, P, g) {
  if (!g.kind) return '';
  const s = B.s;
  const wa = B.a[2], wb = B.b[2];
  const out = [];
  const dumbbell = (c, faint) => `<g class="${faint ? 'pg pfar' : 'pg'}">${picRect(c[0] - 7 * s, c[1] - 3.6 * s, 3.2 * s, 7.2 * s, 'pg', 1)}${picRect(c[0] + 3.8 * s, c[1] - 3.6 * s, 3.2 * s, 7.2 * s, 'pg', 1)}${picLine([[c[0] - 4, c[1]], [c[0] + 4, c[1]]], 'pgl', 2.4)}</g>`;
  const kettlebell = (c, faint) => `<g class="${faint ? 'pfar' : ''}"><path class="pgl" d="M${pf(c[0] - 3.4 * s)} ${pf(c[1] + 3 * s)}V${pf(c[1] - 0.5 * s)}A3.4 3.4 0 0 1 ${pf(c[0] + 3.4 * s)} ${pf(c[1] - 0.5 * s)}V${pf(c[1] + 3 * s)}" stroke-width="2.2"/>${picCircle([c[0], c[1] + 7 * s], 5.6 * s, 'pg')}</g>`;
  const plate = (c) => picCircle(c, 8.5 * s, 'pg') + picCircle(c, 1.8 * s, 'phole');
  const grip = P.grip || 'hands';
  const mid = picMid(wa, wb);
  if (g.kind === 'loop') {
    const ka = g.at === 'ankles' ? B.l[2] : B.l[1], kb = g.at === 'ankles' ? B.m[2] : B.m[1];
    if (B.front || Math.hypot(ka[0] - kb[0], ka[1] - kb[1]) > 5) out.push(picLine([ka, kb], 'pgl', 3.2));
    else out.push(`<ellipse class="pgl" cx="${pf(ka[0])}" cy="${pf(ka[1])}" rx="${pf(4.8 * s)}" ry="${pf(4.8 * s)}" stroke-width="2.6" fill="none"/>`);
    return out.join('');
  }
  if (g.kind === 'kbox') {
    const f = B.l[2];
    out.push(picRect(f[0] - 16, PIC_FLOOR - 1, 32, 4, 'pg', 1.5));
    out.push(picLine([[f[0] + 2, PIC_FLOOR - 1], B.p], 'pgl', 2));
    return out.join('');
  }
  if (g.kind === 'sliders') {
    for (const f of [B.l[2], B.m[2]]) out.push(`<ellipse class="pg" cx="${pf(f[0])}" cy="${pf(f[1] + 2.2)}" rx="${pf(5 * s)}" ry="1.6"/>`);
    return out.join('');
  }
  if (grip === 'none') return '';
  if (g.kind === 'cable' || (g.kind === 'band' && P.anchor)) {
    const h = grip === 'chest' ? mid : wa;
    const an = P.anchor === 'back' ? [4, h[1]] : P.anchor === 'high' ? [5, 8] : P.anchor === 'over' ? [h[0] + 6, 5] : P.anchor === 'face' ? [96, B.h[1]] : [96, h[1]];
    out.push(picLine([h, an], 'pgl', 1.8));
    out.push(picCircle(an, 2.6, 'pg'));
    return out.join('');
  }
  if (g.kind === 'band') {
    const foot = B.l[2];
    const h = grip === 'chest' ? mid : wa;
    out.push(`<path class="pgl" d="M${pf(h[0])} ${pf(h[1])}Q${pf(h[0] + 7)} ${pf((h[1] + foot[1]) / 2)} ${pf(foot[0] + 2)} ${pf(foot[1] + 1)}" stroke-width="2" fill="none"/>`);
    return out.join('');
  }
  if (grip === 'back') {
    const c = picAt(B.n, 6 * s, (P.t ?? -90) - 90);
    if (g.kind === 'bar' || g.kind === 'stick') return g.kind === 'bar' ? plate(c) : picCircle(c, 2.6, 'pg');
  }
  if (grip === 'hips') {
    const c = picAt(B.p, 9 * s, -90);
    return g.kind === 'bar' ? plate(c) : g.kind === 'db' ? dumbbell(c) : g.kind === 'kb' ? kettlebell([c[0], c[1] - 6]) : g.kind === 'ball' ? picCircle(c, 6, 'pg') : '';
  }
  if (grip === 'throw') return picCircle([wa[0] + 7 * s, wa[1] - 1], 6 * s, 'pg');
  const one = grip === 'chest' || grip === 'near' || (g.kind === 'kb' && g.one) || Math.hypot(wa[0] - wb[0], wa[1] - wb[1]) < 5;
  const at = grip === 'chest' ? mid : wa;
  if (g.kind === 'bar') return plate(at);
  if (g.kind === 'stick') return picCircle(at, 2.6, 'pg');
  if (g.kind === 'ball') return picCircle([at[0] + 2, at[1]], 6.5 * s, 'pg');
  if (g.kind === 'db') return (one ? '' : dumbbell(wb, true)) + dumbbell(at);
  if (g.kind === 'kb') return (one ? '' : kettlebell(wb, true)) + kettlebell(at);
  return '';
}

function picSvg(key, gear) {
  const P = PICS[key] || PICS.stand;
  const B = picLayout(P);
  const w = { limb: 6.4 * B.s, torso: (B.front ? 9.5 : 8.6) * B.s };
  const parts = [`<path class="pfl" d="M5 ${PIC_FLOOR + 1.6}H95" stroke-width="1.6"/>`];
  if (P.props) parts.push(P.props(B));
  parts.push(`<g class="pfar">${picLine(B.b, 'pf', w.limb)}${picLine(B.m, 'pf', w.limb)}</g>`);
  if (B.front) parts.push(picLine(B.sh, 'pf', w.limb) + picLine(B.hp, 'pf', w.limb));
  parts.push(picLine([B.p, B.n], 'pf', w.torso));
  parts.push(picCircle(B.h, PIC_LEN.head * B.s, 'phd'));
  if (B.front) parts.push(picLine(B.b, 'pf', w.limb) + picLine(B.m, 'pf', w.limb));
  // Les extremitats properes amb una vora del color del fons, perquè es vegin quan passen per davant del cos.
  const halo = (pts) => picLine([picMid(pts[0], pts[1], 0.4), ...pts.slice(1)], 'phalo', w.limb + 3);
  parts.push(halo(B.l), picLine(B.l, 'pf', w.limb), halo(B.a), picLine(B.a, 'pf', w.limb));
  parts.push(picGear(B, P, gear || { kind: '' }));
  return `<svg class="pic" viewBox="0 0 100 100" aria-hidden="true" fill="none" stroke-linecap="round" stroke-linejoin="round">${parts.join('')}</svg>`;
}

// ── Quina postura té cada exercici ──
// Per ordre: la primera regla que coincideix amb el nom (o el nom de Technogym) mana.
const PIC_RULES = [
  [/passes laterals en planxa/, 'plank_high'],
  [/alliberament|miofascial|foam roller|mobility ball/, (t) => (/planta del peu|plantar/.test(t) ? 'roll_foot' : /bessons|calf|glut/.test(t) ? 'roll_seated'
    : /quadriceps/.test(t) ? 'roll_prone' : /dorsal|lats|iliotibial|ilio-tibial/.test(t) ? 'roll_side' : /mobility ball/.test(t) ? 'roll_side' : 'roll_back')],
  [/respiracio|relaxacio|body scan|sospir|exhalacio|breath/, (t) => (/90\/90/.test(t) ? 'breath_9090' : /cocodril/.test(t) ? 'prone' : /assegu|360/.test(t) ? 'seated_breath'
    : /cames a la paret/.test(t) ? 'legs_wall' : /postura del nen/.test(t) ? 'child' : 'supine')],
  [/cames a la paret/, 'legs_wall'],
  [/postura del nen|child/, 'child'],
  [/estiraments? suaus|estiraments globals/, 'stretch_stand'],
  [/\bbike\b|bicicleta estatica/, 'bike'],
  [/alterg|carrera/, 'run_tread'],
  [/trineu|sled/, 'sled'],
  [/sprint al skillmill|skillmill/, 'run_tread'],
  [/knee-to-wall|dorsiflexio|mobilitat de turmell/, 'ankle_mob'],
  [/couch stretch|flexors de maluc|mig genoll|world'?s greatest/, 'half_kneel'],
  [/90\/90/, 'sit_9090'],
  [/open book/, 'openbook'],
  [/rotacio toracica en quadrupedia/, 'quad_rot'],
  [/cat-camel|cat cow|rockback|passes laterals en quadrupedia|abduccio de maluc (alterna )?en quadrupedia/, 'quadruped'],
  [/kickback de triceps|triceps kickback/, 'tri_kickback'],
  [/kickback/, 'quad_kick'],
  [/bird dog/, 'birddog'],
  [/superman/, 'superman'],
  [/wall slide/, 'wall_slide'],
  [/pas d'espatlles|y-t-w/, (t) => (/y-t-w/.test(t) ? 'incline_prone' : 'ohpress')],
  [/estabilitzacio de la mirada|\bvor\b/, (t) => (/assegu/.test(t) ? 'vor_seated' : 'vor')],
  [/equilibri/, (t) => (/inestable/.test(t) ? 'balance_dome' : 'balance')],
  [/hip airplane/, 'hinge_sl'],
  [/dead bug/, 'deadbug'],
  [/mcgill|curl-up|sit-up al|crunch tocant|toe touch/, (t) => (/tocant|toe/.test(t) ? 'toe_touch' : 'crunch')],
  [/ghd sit-up/, 'ghd_situp'],
  [/crunch invers en planxa|flexio i crunch invers/, 'plank_high'],
  [/crunch/, (t) => (/genolls elevats|recollida|cames (estirades )?elevades|bicicleta|bicycle/.test(t) ? 'crunch_legs' : 'crunch')],
  [/barca|russian twist|flutter|v-sit/, 'boat'],
  [/body saw/, 'plank'],
  [/ab wheel|rollout/, 'rollout'],
  [/copenhagen/, 'copenhagen'],
  [/planxa invertida/, 'reverse_plank'],
  [/planxa lateral|side plank/, 'side_plank'],
  [/clamshell/, 'clamshell'],
  [/estirat de costat|recolzat al colze|side-lying/, 'side_abd'],
  [/mountain climber|flexio(ns)? de maluc (alternes? )?(amb bracos estirats|en planxa)/, 'climber'],
  [/planxa|plank|push-up escapular|flexio(ns)?(?! de maluc)\b|renegade|flexions/, (t) => (/planxa frontal|^planxa$/.test(t) ? 'plank' : 'plank_high')],
  [/pont de glutis|glute bridge/, (t) => (/unipodal|una cama/.test(t) ? 'bridge_sl' : 'bridge')],
  [/hip thrust/, 'hipthrust'],
  [/curl femoral/, (t) => (/fitball|lliscador/.test(t) ? 'bridge_ball' : 'seated_curl')],
  [/nordic|glute-ham/, 'nordic'],
  [/hiperextensio|lower back/, 'hyperext'],
  [/leg press|premsa/, 'legpress'],
  [/leg extension|extensio de genoll/, 'legext'],
  [/(abductor|adductor) a la maquina/, 'abd_machine'],
  [/elevacio de talons|calf raise/, 'calf'],
  [/squeeze/, 'squeeze'],
  [/pallof/, 'pallof'],
  [/woodchop|llenyataire/, 'woodchop'],
  [/turkish get-up/, 'tgu'],
  [/windmill/, 'windmill'],
  [/halo/, 'halo'],
  [/sots press|overhead squat/, 'squat_oh'],
  [/snatch|arrencada/, (t) => (/high pull/.test(t) ? 'high_pull' : 'squat_oh')],
  [/jump shrug|high pull/, 'high_pull'],
  [/clean|cargolada/, 'clean'],
  [/split jerk|(estocada|lunge).*(per sobre del cap|overhead)/, 'split_oh'],
  [/push press|push jerk|press militar|press per sobre|overhead press|press arnold|landmine press/, (t) => (/assegut/.test(t) ? 'ohpress_seated' : 'ohpress')],
  [/swing/, (t) => (/per sobre del cap/.test(t) ? 'swing_oh' : 'swing')],
  [/box jump/, 'box_jump'],
  [/drop jump/, 'drop_jump'],
  [/snap down|aterratge/, 'land'],
  [/jump squat|salt amb carrega|pogo/, 'hop'],
  [/skater|canvi de direccio|5-0-5|desplacament lateral|shuffle/, 'cod'],
  [/salt horitzontal|salts? endavant|bounds|tanques|salt a una cama/, 'jump_fwd'],
  [/\bcmj\b|salt|jump/, 'jump'],
  [/slam/, 'slam'],
  [/chest pass|passada de pit/, 'chest_pass'],
  [/llancament|scoop|shot put/, 'rot_throw'],
  [/skipping/, 'skipping'],
  [/sprint|acceleracio/, 'sprint'],
  [/carry|farmer|passeig/, 'carry'],
  [/encongiments|shrug/, 'stand_hold'],
  [/rotacio externa/, 'ext_rot'],
  [/face pull/, 'face_pull'],
  [/creuament|crossover/, 'crossover'],
  [/pullover/, 'pullover'],
  [/rem vertical|upright row/, 'upright_row'],
  [/rem invertit|inverted row/, 'inverted_row'],
  [/rem assegut|seated row/, 'seated_row'],
  [/rem .*(politja|conica|keiser)/, 'row_standing'],
  [/\brem\b|\brow\b|pendlay/, 'row'],
  [/dominad|pull-?up|chin-?up/, 'pullup'],
  [/jalon|jalo |pulldown/, 'pulldown'],
  [/press de pit (a una ma )?estirat|floor press/, 'floor_press'],
  [/press de pit keiser|press de pit assegut/, 'seated_press'],
  [/press inclinat|incline press/, 'bench_incline'],
  [/press de banca|bench press|obertures|press de pit/, 'bench'],
  [/fons de triceps|\bdips?\b/, 'dip'],
  [/triceps|press frances/, (t) => (/per sobre del cap|press frances|a una ma amb kb/.test(t) ? 'triceps_oh' : 'pushdown')],
  [/curl/, 'curl'],
  [/elevacions laterals|lateral raise/, 'lat_raise'],
  [/elevacions frontals|front raise/, 'front_raise'],
  [/ocells|rear delt|reverse fly/, 'rear_fly'],
  [/estocada lateral|lateral lunge|cossack/, 'lateral_lunge'],
  [/passes laterals|monster walk|abduccio de maluc en mig squat/, 'side_step'],
  [/abduccio de maluc dempeus/, 'stand_abd'],
  [/abduccio de maluc en planxa|abduccio i flexio de maluc en planxa/, 'side_plank'],
  [/extensio de maluc dempeus/, 'stand_kick'],
  [/flexio de maluc alterna/, 'balance'],
  [/step-?up|step down|pujada/, 'stepup'],
  [/bulgar/, 'split_bench'],
  [/split squat|estocad|lunge|pas enrere/, 'split'],
  [/pistol|unipodal a caixa/, 'pistol'],
  [/squat a caixa/, 'squat_box'],
  [/front squat/, 'squat'],
  [/back squat|squat amb barra|squat al power personal|squat amb pausa/, 'squat_back'],
  [/squat|sentadilla/, 'squat'],
  [/(pes mort|rdl|romanes|deadlift).*(unipodal|una cama)|(unipodal|una cama).*(pes mort|rdl)/, 'hinge_sl'],
  [/good morning/, 'goodmorning'],
  [/pes mort|rdl|deadlift|romanes|bisagra|figura de 8|cames rigides/, 'hinge'],
  [/short foot/, 'stand'],
];

// Si el nom no diu res: segons el múscul principal i, si no, el bloc.
const PIC_BY_MUSCLE = { 'Bíceps': 'curl', 'Tríceps': 'pushdown', 'Pectoral': 'bench', 'Dorsal': 'row', 'Deltoides': 'ohpress', 'Trapezi': 'stand_hold',
  'Escàpula': 'row_standing', 'Manegot rotador': 'ext_rot', 'Quàdriceps': 'squat', 'Isquiotibials': 'hinge', 'GMax': 'bridge', 'GMed': 'side_step',
  'Adductors': 'lateral_lunge', 'Abductors': 'side_step', 'Bessons i soli': 'calf', 'Core': 'plank', 'Oblics': 'side_plank', 'Lumbar': 'birddog' };
const PIC_BY_BLOCK = { mob: 'stretch_stand', act: 'plank', pot: 'jump', for: 'squat', acc: 'stand_hold', cal: 'supine' };

function picKeyOf(e) {
  if (!e) return 'stand';
  if (e.pic && PICS[e.pic]) return e.pic;
  const t = U.norm(`${e.name || ''} ${e.tg || ''}`);
  for (const [re, key] of PIC_RULES) if (re.test(t)) return typeof key === 'function' ? key(t) : key;
  return PIC_BY_MUSCLE[e.gm] || PIC_BY_BLOCK[e.block] || 'stand';
}

const PIC_CACHE = new Map();
function exercisePicSvg(e, keyOverride) {
  const key = keyOverride || picKeyOf(e);
  const g = picGearOf(e || {}, key);
  const id = `${key}|${g.kind}|${g.at || ''}|${g.one ? 1 : 0}`;
  if (!PIC_CACHE.has(id)) PIC_CACHE.set(id, picSvg(key, g));
  return PIC_CACHE.get(id);
}

// ── A la interfície ──
// Miniatura d'un exercici de la biblioteca (ex) o d'una línia de sessió (it): la foto pròpia si en té, si no el
// pictograma amb el material triat. El color és el del bloc.
function ExThumb({ ex, it, block, size = 52, class: c }) {
  const lib = ex || (it && it.exId ? Store.exercise(it.exId) : null);
  const e = it ? (lib ? { ...lib, material: it.material || lib.material } : { name: it.name, material: it.material, block }) : lib;
  const k = block || (e && e.block) || '';
  const photo = lib && lib.photo;
  return html`<span class=${U.cls('exthumb', k && `blk-${k}`, c)} style=${`--thumb:${size}px`} aria-hidden="true">
    ${photo ? html`<img src=${photo} alt="" loading="lazy" />` : html`<span class="exthumb-pic" dangerouslySetInnerHTML=${{ __html: exercisePicSvg(e) }}></span>`}
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
function ThumbEditor({ f, setF }) {
  const fileRef = useRef(null);
  const yt = videoEmbed(f.video);
  const auto = picKeyOf({ ...f, pic: '' });
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
      <p class="thumbedit-what">${f.photo ? 'Foto pròpia' : `Dibuix: ${(PICS[f.pic || auto] || PICS.stand).label}${f.pic ? '' : ' (automàtic)'}`}</p>
      <div class="inline wrap">
        <${Btn} size="sm" icon="edit" onClick=${choose}>Canvia el dibuix</${Btn}>
        <${Btn} size="sm" icon="camera" onClick=${() => fileRef.current && fileRef.current.click()}>${f.photo ? 'Una altra foto' : 'Foto pròpia'}</${Btn}>
        ${yt && yt.thumb && !f.photo && html`<${Btn} size="sm" variant="ghost" icon="video" onClick=${() => setF({ ...f, photo: `https://i.ytimg.com/vi/${yt.id}/mqdefault.jpg` })}>Imatge del vídeo</${Btn}>`}
        ${f.photo && html`<${Btn} size="sm" variant="ghost" icon="x" onClick=${() => setF({ ...f, photo: '' })}>Treu la foto</${Btn}>`}
      </div>
      <p class="muted small">La foto, d'un entrenador fent l'exercici (mai d'un client). Si no n'hi ha, surt el dibuix.</p>
      <input ref=${fileRef} type="file" accept="image/*" hidden onChange=${onFile} aria-label="Foto de l'exercici" />
    </div>
  </div>`;
}

function PicChooser({ ex, auto, onPick, onClose }) {
  const cur = ex.pic || auto;
  return html`<${Dialog} wide=${true} title="Tria el dibuix" onClose=${onClose} footer=${html`<span class="grow"></span><${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>`}>
    <div class="picgrid">${Object.keys(PICS).map((k) => html`<button type="button" class=${U.cls('picopt', k === cur && 'on')} onClick=${() => onPick(k)} aria-pressed=${k === cur}>
      <${ExThumb} ex=${{ ...ex, photo: '', pic: k }} size=${76} />
      <span class="picopt-name">${PICS[k].label}${k === auto ? ' · automàtic' : ''}</span>
    </button>`)}</div>
  </${Dialog}>`;
}
