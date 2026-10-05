/* EON Life · el conjunt d'Excel d'un client: quins fitxers toca fer, amb quin nom i a quina carpeta.
   Valoracions/  → un Excel per valoració (valoracioinicial_…, retest_…)
   Sessions/     → un Excel per sessió (feta, planificada o prevista al pla) i l'Excel gegant de visió general.
   La resta (carpetes, noms, números de sèrie) es decideix aquí a partir de les dades de l'app. */

const ExcelSet = (() => {
  const real = (list) => (list || []).filter((x) => x && !x.deleted);

  // Dades d'un client des de l'Store (o d'un objecte equivalent als tests: { patients, assessments, sessions, templates, settings }).
  function data(pid, src) {
    const S = src || Store;
    const get = (k) => (S.all ? S.all(k) : real(Object.values(S.data[k] || {})));
    const patient = S.get ? S.get('patients', pid) : (S.data.patients || {})[pid];
    if (!patient) return null;
    const byDate = (a, b) => (a.date === b.date ? (U.num(a.number) || 0) - (U.num(b.number) || 0) : a.date < b.date ? -1 : 1);
    const sessions = get('sessions').filter((s) => s.patientId === pid).sort(byDate);
    const assessments = get('assessments').filter((a) => a.patientId === pid).sort((a, b) => (a.date === b.date ? xlStr(a.createdAt).localeCompare(xlStr(b.createdAt)) : a.date < b.date ? -1 : 1));
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

  // Noms dels fitxers: el número de sèrie compta els fitxers del mateix dia (i, a les valoracions, del mateix tipus).
  function plan(d, { today = U.today() } = {}) {
    const p = d.patient;
    const files = [];
    const count = {};
    const next = (key) => (count[key] = (count[key] || 0) + 1);
    const all = items(d);
    const planOf = (s) => d.plans.find((x) => x.id === s.planId) || null;
    for (const s of all) {
      const n = next(`s:${s.date}`);
      files.push({
        key: `S:${s.id}`, kind: 'session', id: s.id, folder: 'sessions', name: Names.sessionFile(p, s.date, n), date: s.date,
        make: () => ExcelSession.build({ patient: p, session: s, sessions: d.sessions, plan: planOf(s), settings: d.settings, today }),
      });
    }
    d.assessments.forEach((a, i) => {
      const n = next(`a:${a.type}:${a.date}`);
      files.push({
        key: `A:${a.id}`, kind: 'assessment', id: a.id, folder: 'assess', name: Names.assessmentFile(p, a.type, a.date, n), date: a.date,
        make: (links) => ExcelAssessment.build({ patient: p, assessment: a, previous: d.assessments[i - 1] || null, settings: d.settings, today, links }),
      });
    });
    files.push({
      key: 'O:overview', kind: 'overview', folder: 'sessions', name: Names.overviewFile(p), date: '',
      make: (links) => ExcelOverview.build({ ...d, items: all, today, links: links || {} }),
    });
    return files;
  }

  return { data, ghosts, items, plan };
})();
