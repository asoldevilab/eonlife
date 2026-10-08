/* EON Life · dades dels informes d'evolució (24-report-evol.js): els tests triats en un rang de dates i el que el
   pacient omple a cada sessió (RPE, dolor en acabar i wellness). Només càlculs, sense pantalla. */

const Evol = {
  // Rang per defecte: de la primera data amb dades fins avui.
  inRange(date, from, to) { return !!date && (!from || date >= from) && (!to || date <= to); },

  // Grups de l'informe de tests: els apartats del protocol (i «General» per al pes).
  AREAS: () => [...PROTOCOL.filter((s) => s.id !== 'altres').map((s) => ({ id: s.id, title: s.title, short: s.short })), { id: 'tot', title: 'General', short: 'General' }],

  // Cada test (mètrica de Calc.metrics) amb dades en aquestes valoracions: una fila per valoració, i el canvi del
  // primer al darrer valor. better: true / false / null (null = sense direcció, com el pes).
  tests(assessments, { from = '', to = '' } = {}) {
    const list = U.sortBy((assessments || []).filter((a) => Evol.inRange(a.date, from, to)), 'date');
    const out = [];
    for (const m of Calc.metrics()) {
      const rows = [];
      for (const a of list) {
        const v = m.get(a);
        if (m.bi) {
          const d = v ? U.num(v.d) : null, e = v ? U.num(v.e) : null;
          if (d == null && e == null) continue;
          const as = Calc.asym(d, e);
          rows.push({ date: a.date, aid: a.id, d, e, asym: as ? as.pct : null });
        } else {
          const x = U.num(v);
          if (x == null) continue;
          rows.push({ date: a.date, aid: a.id, v: x });
        }
      }
      if (!rows.length) continue;
      const dir = (delta) => (delta == null || delta === 0 || m.neutral ? null : (delta > 0) !== !!m.lowerBetter);
      const change = (k) => {
        const vals = rows.map((r) => r[k]).filter((x) => x != null);
        if (vals.length < 2) return null;
        const delta = vals[vals.length - 1] - vals[0];
        return { first: vals[0], last: vals[vals.length - 1], delta, better: dir(delta) };
      };
      out.push({
        id: m.id, label: m.label, unit: m.unit, bi: !!m.bi, lowerBetter: !!m.lowerBetter, neutral: !!m.neutral,
        area: Calc.area(m.id), rows,
        change: m.bi ? { d: change('d'), e: change('e') } : change('v'),
      });
    }
    return out;
  },

  // Sessions amb alguna dada del pacient (RPE, dolor o wellness) dins del rang.
  sessions(sessions, { from = '', to = '' } = {}) {
    const rows = [];
    for (const s of U.sortBy((sessions || []).filter((x) => Evol.inRange(x.date, from, to)), (x) => `${x.date}#${String(U.num(x.number) || 0).padStart(4, '0')}`)) {
      const f = s.feedback || {};
      const w = s.wellness || {};
      const wl = Calc.wellness(w);
      const row = {
        id: s.id, date: s.date, number: s.number, goal: s.goal || '', status: s.status,
        rpe: U.num(f.rpe), pain: U.num(f.pain), duration: U.num(f.duration), load: Calc.sessionLoad(s),
        wellness: wl && wl.total != null ? wl.total : null, wellnessAvg: wl ? wl.avg : null,
        items: Object.fromEntries(WELLNESS.map((q) => [q.k, U.num(w[q.k])])),
      };
      if (row.rpe != null || row.pain != null || wl) rows.push(row);
    }
    const stat = (k) => {
      const vals = rows.map((r) => r[k]).filter((x) => x != null);
      if (!vals.length) return null;
      const half = Math.ceil(vals.length / 2);
      const avg = (xs) => xs.reduce((a, b) => a + b, 0) / xs.length;
      return {
        n: vals.length, avg: avg(vals), min: Math.min(...vals), max: Math.max(...vals), first: vals[0], last: vals[vals.length - 1],
        // tendència: mitjana de la segona meitat menys la de la primera (amb 4 o més dades)
        trend: vals.length >= 4 ? avg(vals.slice(half)) - avg(vals.slice(0, half)) : null,
      };
    };
    return { rows, rpe: stat('rpe'), pain: stat('pain'), wellness: stat('wellness'), load: stat('load') };
  },
};
