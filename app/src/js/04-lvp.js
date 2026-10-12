/* EON Life · perfil càrrega-velocitat (ADR Encoder lineal).
   Cada exercici té unes quantes càrregues amb la velocitat mitjana de la fase concèntrica. La velocitat baixa de manera
   gairebé lineal quan puja la càrrega: amb una recta (regressió) estimem la 1RM sense haver d'arribar-hi, la càrrega
   per a cada velocitat i com es desplaça el perfil entre valoracions. */

// Exercicis de referència. mvt = velocitat mitjana amb què es fa l'1RM (velocitat mínima de referència), en m/s.
// Són valors de la literatura (orientatius): s'editen a cada exercici. «Altre» no en porta: sense MVT no hi ha 1RM.
const LVP_PRESETS = [
  { id: 'squat', name: 'Squat', mvt: 0.30, mvtF: 0.25, ref: 'Esquena, flexió completa. 0,30 m/s en homes i 0,25 m/s en dones.' },
  { id: 'bench', name: 'Press banca', mvt: 0.17, ref: 'Barra o Smith: la 1RM surt cap a 0,16–0,17 m/s.' },
  { id: 'deadlift', name: 'Pes mort', mvt: 0.15, ref: 'Convencional: la 1RM surt cap a 0,14–0,15 m/s.' },
  { id: 'hipthrust', name: 'Hip thrust', mvt: 0.25, ref: 'Amb barra: la 1RM surt cap a 0,25 m/s (un estudi).' },
  { id: 'other', name: 'Altre exercici', mvt: null, ref: 'Sense valor de referència: posa\'n un si el coneixes; si no, només es calcula la recta.' },
];

// Velocitats per a les quals donem la càrrega estimada (només les que queden entre la 1RM i la velocitat sense càrrega).
const LVP_SPEEDS = [1.0, 0.8, 0.6, 0.5, 0.4, 0.3];

const LVP = {
  presets: LVP_PRESETS,
  preset(id) { return LVP_PRESETS.find((p) => p.id === id) || LVP_PRESETS[LVP_PRESETS.length - 1]; },
  // MVT per defecte d'un preset (les dones, al squat, tenen una velocitat més baixa).
  defaultMvt(id, sex) {
    const p = LVP.preset(id);
    return p.mvtF != null && /^(d|f|dona|femeni|female)/i.test(String(sex || '')) ? p.mvtF : p.mvt;
  },
  newExercise(id, sex) {
    const p = LVP.preset(id);
    const mvt = LVP.defaultMvt(id, sex);
    return { id: U.uid('L'), preset: p.id, name: p.id === 'other' ? '' : p.name, mvt: mvt != null ? String(mvt).replace('.', ',') : '', rows: [LVP.newRow(), LVP.newRow(), LVP.newRow(), LVP.newRow()] };
  },
  newRow() { return { id: U.uid('R'), load: '', mv: '', pv: '', reps: '' }; },
};

Object.assign(Calc, {
  // Una fila compta si té càrrega i velocitat mitjana vàlides.
  lvpRows(ex) {
    return ((ex && ex.rows) || [])
      .map((r) => ({ load: U.num(r.load), mv: U.num(r.mv), pv: U.num(r.pv), reps: U.num(r.reps) }))
      .filter((r) => r.load != null && r.load > 0 && r.mv != null && r.mv > 0)
      .sort((x, y) => x.load - y.load);
  },
  // Regressió lineal de la càrrega sobre la velocitat, com fa l'app de l'ADR: càrrega = L0 + pendent × velocitat
  // (pendent negatiu, en kg per m/s). L0 és la càrrega a velocitat zero i V0 = −L0 / pendent, la velocitat sense càrrega.
  lvpFit(rows) {
    const n = rows.length;
    if (n < 2) return null;
    const mx = rows.reduce((s, r) => s + r.mv, 0) / n, my = rows.reduce((s, r) => s + r.load, 0) / n;
    const sxx = rows.reduce((s, r) => s + (r.mv - mx) ** 2, 0), sxy = rows.reduce((s, r) => s + (r.mv - mx) * (r.load - my), 0);
    if (!sxx) return null;
    const slope = sxy / sxx, l0 = my - slope * mx;
    const syy = rows.reduce((s, r) => s + (r.load - my) ** 2, 0);
    const sse = rows.reduce((s, r) => s + (r.load - (l0 + slope * r.mv)) ** 2, 0);
    const r2 = syy ? Math.max(0, 1 - sse / syy) : null;
    return { n, slope, l0, v0: slope < 0 ? -l0 / slope : null, r2, see: n > 2 ? Math.sqrt(sse / (n - 2)) : null };
  },
  // Càrrega que correspon a una velocitat segons la recta (null si no surt una càrrega positiva).
  lvpLoadAt(fit, v) {
    if (!fit || !(fit.slope < 0)) return null;
    const l = fit.l0 + fit.slope * v;
    return l > 0 ? l : null;
  },
  // Velocitat que correspon a una càrrega segons la recta (per dibuixar-la al gràfic).
  lvpVelAt(fit, load) { return fit && fit.slope < 0 ? (load - fit.l0) / fit.slope : null; },
  // Un exercici: recta, 1RM estimada, càrregues per velocitat i avisos.
  lvpExercise(ex, weight) {
    const rows = Calc.lvpRows(ex);
    const fit = Calc.lvpFit(rows);
    const mvt = U.num(ex && ex.mvt);
    const out = { id: ex && ex.id, name: String((ex && ex.name) || '').trim(), preset: (ex && ex.preset) || 'other', rows, fit, mvt, n: rows.length, rm: null, rmRel: null, table: [], maxLoad: rows.length ? rows[rows.length - 1].load : null, warns: [], lines: [] };
    const f2 = (n) => U.fmtFixed(n, 2), f0 = (n) => U.fmt(n, 0);
    if (!fit) { if (out.n === 1) out.warns.push('Cal almenys dues càrregues per dibuixar la recta (millor 4 o més).'); return out; }
    if (!(fit.slope < 0)) { out.fit = null; out.warns.push('La velocitat no baixa quan puja la càrrega: revisa les dades abans de fer servir la recta.'); return out; }
    if (mvt != null && mvt > 0) {
      const rm = fit.l0 + fit.slope * mvt;
      if (rm > 0) out.rm = rm;
      if (out.rm && weight) out.rmRel = out.rm / weight;
    }
    // Per a cada càrrega: % de la 1RM i potència (kg × 9,8 × velocitat mitjana, només amb la càrrega externa, com l'ADR).
    out.rows = rows.map((r) => ({ ...r, pct: out.rm ? (r.load / out.rm) * 100 : null, power: r.load * 9.8 * r.mv }));
    out.rmPower = out.rm != null ? out.rm * 9.8 * mvt : null;
    // Equacions, escrites com a l'app de l'ADR (per comparar-les): KG = a·v + b i %1RM = a·v + b.
    const sg = (n) => (n < 0 ? '−' : '+');
    const eq = (slope, l0) => `${sg(slope) === '−' ? '−' : ''}${U.fmtFixed(Math.abs(slope), 2)} × velocitat ${sg(l0)} ${U.fmtFixed(Math.abs(l0), 2)}`;
    out.eq = `Càrrega (kg) = ${eq(fit.slope, fit.l0)}`;
    out.eqPct = out.rm ? `%1RM = ${eq((100 * fit.slope) / out.rm, (100 * fit.l0) / out.rm)}` : '';
    const lo = mvt != null ? mvt : 0;
    for (const v of LVP_SPEEDS) {
      if (v < lo - 1e-9) continue;
      const l = Calc.lvpLoadAt(fit, v);
      if (l != null) out.table.push({ v, load: l, pct: out.rm ? (l / out.rm) * 100 : null });
    }
    // Línies per a l'informe (resultats) i avisos per a qui introdueix les dades.
    out.lines.push(`Recta: ${out.eq.replace('Càrrega', 'càrrega')}${fit.r2 != null ? ` (R² ${f2(fit.r2)})` : ''}.`);
    if (out.rm != null) out.lines.push(`1RM estimada: ${f0(out.rm)} kg${out.rmRel != null ? ` (${f2(out.rmRel)} vegades el pes corporal)` : ''}, amb una velocitat mínima de ${f2(mvt)} m/s.`);
    else if (mvt == null) out.warns.push('Sense velocitat mínima de referència no es pot estimar la 1RM. Posa-la a l\'exercici si en coneixes una.');
    out.lines.push(`Càrrega a velocitat zero (L0): ${f0(fit.l0)} kg · velocitat sense càrrega (V0): ${f2(fit.v0)} m/s.`);
    if (out.n === 2) out.warns.push('Només hi ha dues càrregues: la recta és orientativa. Amb 4 o més és molt més fiable.');
    if (fit.r2 != null && out.n >= 3 && fit.r2 < 0.9) out.warns.push(`L'ajust és baix (R² ${f2(fit.r2)}): repeteix alguna càrrega o revisa la tècnica i la col·locació de l'encoder.`);
    const vmax = Math.max(...rows.map((r) => r.mv)), vmin = Math.min(...rows.map((r) => r.mv));
    if (vmax > 1.1) out.warns.push(`Hi ha càrregues amb velocitat de més d'1,1 m/s (${f2(vmax)}): són massa lleugeres i poden torcer la recta.`);
    if (out.rm != null && vmin > mvt + 0.35) out.warns.push(`La càrrega més pesada va a ${f2(vmin)} m/s: encara és lluny de la 1RM i l'estimació extrapola molt. Afegeix una càrrega més pesada, sense arribar al límit.`);
    if (out.rm != null && out.maxLoad > out.rm * 1.02) out.warns.push(`La càrrega més alta (${f0(out.maxLoad)} kg) supera la 1RM estimada: revisa la velocitat mínima o les dades.`);
    return out;
  },
  // Tots els exercicis d'una valoració, amb la comparació amb la valoració anterior (mateix exercici pel nom).
  // keepEmpty: també els exercicis encara sense dades (per al formulari, en el mateix ordre).
  lvpAnalysis(a, prev, keepEmpty = false) {
    const w = Calc.weight(a);
    const list = ((a && a.lvp && a.lvp.exercises) || []).map((ex) => Calc.lvpExercise(ex, w)).filter((x) => keepEmpty || x.n > 0);
    const prevList = prev ? ((prev.lvp && prev.lvp.exercises) || []).map((ex) => Calc.lvpExercise(ex, Calc.weight(prev))).filter((x) => x.fit) : [];
    for (const x of list) {
      const key = U.norm(x.name || x.preset);
      const p = prevList.find((q) => U.norm(q.name || q.preset) === key);
      if (!p || !x.fit) continue;
      const at = (e, v) => Calc.lvpLoadAt(e.fit, v);
      const c = { date: prev.date || '', rm: p.rm, rmDiff: x.rm != null && p.rm != null ? x.rm - p.rm : null, rmPct: x.rm != null && p.rm ? ((x.rm - p.rm) / p.rm) * 100 : null,
        l05: at(p, 0.5), l05Diff: at(x, 0.5) != null && at(p, 0.5) != null ? at(x, 0.5) - at(p, 0.5) : null };
      x.cmp = c; x.prevEx = p;
      const when = c.date ? ` (${U.fmtDate(c.date)})` : '';
      if (c.rmDiff != null) x.lines.push(`Respecte de la valoració anterior${when}: 1RM estimada ${U.fmtSigned(c.rmDiff, 0)} kg${c.rmPct != null ? ` (${U.fmtSigned(c.rmPct, 1)} %)` : ''}.`);
      if (c.l05Diff != null) x.lines.push(`Càrrega a 0,50 m/s: ${U.fmtSigned(c.l05Diff, 0)} kg (${U.fmt(c.l05, 0)} → ${U.fmt(at(x, 0.5), 0)} kg).`);
    }
    return list;
  },
  // Valoració sense res al perfil (per saber si el grup està fet).
  lvpAny(a) { return ((a && a.lvp && a.lvp.exercises) || []).some((ex) => Calc.lvpRows(ex).length > 0); },
});
