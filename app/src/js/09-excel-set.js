/* EON Life · els Excel d'un client: quins fitxers toca fer, amb quin nom i a quina carpeta.
   Un de sol: l'Excel del pacient (seguiment_<client>_01.xlsx) a l'arrel de la seva carpeta, amb les sessions (fetes,
   planificades i previstes als plans) i les valoracions. Aquí es reuneixen les dades del pacient per fer-lo. */

const ExcelSet = (() => {
  const real = (list) => (list || []).filter((x) => x && !x.deleted);

  // Dades d'un client des de l'Store (o d'un objecte equivalent als tests: { patients, assessments, sessions, templates, settings }).
  function data(pid, src) {
    const S = src || Store;
    const get = (k) => (S.all ? S.all(k) : real(Object.values(S.data[k] || {})));
    const patient = S.get ? S.get('patients', pid) : (S.data.patients || {})[pid];
    if (!patient) return null;
    const byDate = (a, b) => (a.date === b.date ? (U.num(a.number) || 0) - (U.num(b.number) || 0) : a.date < b.date ? -1 : 1);
    // Sense data (p. ex. mentre s'escriu una de nova) no es pot situar al calendari ni donar nom a un fitxer: queden fora fins que en tinguin.
    const sessions = get('sessions').filter((s) => s.patientId === pid && U.parse(s.date)).sort(byDate);
    const assessments = get('assessments').filter((a) => a.patientId === pid && U.parse(a.date)).sort((a, b) => (a.date === b.date ? xlStr(a.createdAt).localeCompare(xlStr(b.createdAt)) : a.date < b.date ? -1 : 1));
    const templates = S.templates ? S.templates() : real(Object.values(S.data.templates || {}));
    const plans = templates.filter((t) => t.kind === 'plan' && t.patientId === pid && !t.deleted);
    return { patient, sessions, assessments, plans, settings: S.settings || defaultSettings(), exercise: (id) => (S.exercise ? S.exercise(id) : null) };
  }

  // Sessions previstes dels plans que encara no s'han fet com a sessió real (només les que ja tenen exercicis dissenyats).
  function ghosts({ patient, sessions, plans }) {
    const out = [];
    for (const plan of plans) {
      const used = new Set(sessions.filter((s) => s.planId === plan.id).map((s) => U.num(s.planN)));
      const dates = Calc.planDates(plan);
      (plan.sessions || []).forEach((ps, i) => {
        if (used.has(U.num(ps.n)) || !dates[i]) return;
        if (!(ps.blocks || []).some((b) => (b.items || []).some((it) => it.name))) return;
        out.push({
          id: `G:${plan.id}:${ps.n}`, ghost: true, patientId: patient.id, date: dates[i], number: null, status: 'prevista',
          goal: ps.goal || plan.goal || '', pillar: '', professional: patient.professional || '', blocks: ps.blocks || [],
          feedback: {}, wellness: {}, planId: plan.id, planN: ps.n, phase: ps.phase || '',
        });
      });
    }
    return out;
  }

  // Sessions reals i previstes ordenades per data (a igualtat de data, primer les reals).
  function items(d) {
    return [...d.sessions, ...ghosts(d)].sort((a, b) => (a.date === b.date ? (a.ghost ? 1 : 0) - (b.ghost ? 1 : 0) || (U.num(a.number) || U.num(a.planN) || 0) - (U.num(b.number) || U.num(b.planN) || 0) : a.date < b.date ? -1 : 1));
  }

  // Els fitxers d'un client: ara un de sol, l'Excel del client, a l'arrel de la seva carpeta.
  function plan(d, { today = U.today() } = {}) {
    const p = d.patient;
    const all = items(d);
    return [{
      key: 'C:client', kind: 'client', id: p.id, folder: 'root', name: Names.clientFile(p), date: '',
      timed: true, // «Sense tancar», la setmana actual i les dates clau depenen del dia d'avui
      make: () => ExcelClient.build({ ...d, items: all, today }),
    }];
  }

  return { data, ghosts, items, plan };
})();
