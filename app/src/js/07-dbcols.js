/* EON Life · base de dades: definició de les taules (files i columnes).
   Cada taula correspon a una pestanya del sistema EON v1 (clients, valoracions, Kinvent ROM,
   dinamometria, postural, Y-Balance, My Jump, patrons, sessions, registre d'exercicis).
   Les mesures viuen dins de cada valoració: una fila = una valoració d'un client en una data. */

const DB_TABLES = [
  { id: 'clients', label: 'Clients', kind: 'patients', add: 'Nou client', hint: 'Una fila per client.' },
  { id: 'valoracions', label: 'Valoracions', kind: 'assessments', focus: 'dades', add: 'Nova valoració', hint: 'Una fila per valoració, amb les dades clau de cada àrea.' },
  { id: 'mobilitat', label: 'Mobilitat · K-Move', kind: 'assessments', focus: 'rom', add: 'Afegeix mobilitat', hint: 'Goniometria digital (Kinvent K-Move) i knee-to-wall. Graus i cm.' },
  { id: 'postural', label: 'Neurodinàmia i postural', kind: 'assessments', focus: 'neuro', add: 'Afegeix tests posturals', hint: 'Slump, prone knee bending, Adams, Thomas, Windlass i single leg squat.' },
  { id: 'dinamometria', label: 'Dinamometria · K-Push', kind: 'assessments', focus: 'dyn', add: 'Afegeix dinamometria', hint: 'Força isomètrica (Kinvent K-Push) en newtons, N/kg i asimetria.' },
  { id: 'ybalance', label: 'Y-Balance', kind: 'assessments', focus: 'ybt', add: 'Afegeix Y-Balance', hint: 'Distàncies en cm, longitud de cama i composite.' },
  { id: 'salts', label: 'Salts · My Jump', kind: 'assessments', focus: 'jumps', add: 'Afegeix salts', hint: 'Resum dels intents de CMJ i altres salts.' },
  { id: 'rendiment', label: 'Encoder i bike', kind: 'assessments', focus: 'encoder', add: 'Afegeix encoder o bike', hint: 'Velocitat d\'execució i Assault bike 30 s.' },
  { id: 'patrons', label: 'Patrons', kind: 'assessments', focus: 'patterns', add: 'Afegeix patrons', hint: 'Sessió 1 · puntuació 0 / − / −− i P (dolor).' },
  { id: 'perfil', label: 'Tests per perfil', kind: 'assessments', focus: 'profile', add: 'Afegeix tests de perfil', hint: 'Tests complementaris dels perfils A, B i C.' },
  { id: 'sessions', label: 'Sessions', kind: 'sessions', hint: 'Una fila per sessió: RPE, minuts i càrrega.' },
  { id: 'exercicis', label: 'Registre d\'exercicis', kind: 'log', hint: 'Una fila per exercici de cada sessió.' },
];

const DB = (() => {
  const num = (x) => U.num(x);
  const V = (a, tid) => ((a && a.values) || {})[tid] || {};
  const typeShort = (t) => (OPT.assessmentTypes.find((o) => o.v === t) || {}).short || '';
  const positive = (x) => (x && /^Positiu/.test(x) ? 'warn' : '');
  const decFor = (unit) => (['°', 'N', 'W', 'bpm', 'reps', 'tocs', 'm'].includes(unit) ? 0 : unit === 'm/s' ? 2 : 1);

  const lead = () => [
    { id: 'client', label: 'Client', kind: 'client', lead: true, get: (r) => U.fullName(r.p) },
    { id: 'date', label: 'Data', kind: 'date', lead: true, get: (r) => r.a.date },
    { id: 'type', label: 'Tipus', kind: 'text', lead: true, get: (r) => typeShort(r.a.type) },
  ];

  function biCols(tid, group) {
    const t = TEST_INDEX[tid];
    const g = group || t.short || t.name;
    const u = t.unit;
    const dec = decFor(u);
    const low = t.rule === 'wblt' ? (r, v) => (v != null && v < THRESHOLDS.wbltMin ? 'bad' : '') : null;
    const cols = [
      { id: `${tid}.d`, group: g, label: 'D', unit: u, kind: 'num', dec, get: (r) => num(V(r.a, tid).d), tone: low },
      { id: `${tid}.e`, group: g, label: 'E', unit: u, kind: 'num', dec, get: (r) => num(V(r.a, tid).e), tone: low },
    ];
    if (t.diffOnly) {
      cols.push({ id: `${tid}.dif`, group: g, label: 'Dif.', unit: u, kind: 'signed', dec: 1,
        get: (r) => { const d = num(V(r.a, tid).d), e = num(V(r.a, tid).e); return d != null && e != null ? d - e : null; },
        tone: t.rule === 'wblt' ? (r, v) => (v != null && Math.abs(v) >= THRESHOLDS.wbltDiff ? 'bad' : '') : null });
    } else {
      cols.push({ id: `${tid}.asym`, group: g, label: 'Asim.', unit: '%', kind: 'pct', dec: 0,
        get: (r) => { const as = Calc.asym(V(r.a, tid).d, V(r.a, tid).e); return as ? as.pct : null; },
        tone: (r, v) => Calc.asymTone(v) });
    }
    if (t.perKg) {
      cols.push({ id: `${tid}.dkg`, group: g, label: 'D', unit: 'N/kg', kind: 'num', dec: 1, get: (r) => Calc.perKg(V(r.a, tid).d, Calc.weight(r.a)) });
      cols.push({ id: `${tid}.ekg`, group: g, label: 'E', unit: 'N/kg', kind: 'num', dec: 1, get: (r) => Calc.perKg(V(r.a, tid).e, Calc.weight(r.a)) });
    }
    return cols;
  }

  const singleCol = (tid, label) => {
    const t = TEST_INDEX[tid];
    return { id: tid, label: label || t.short || t.name, unit: t.unit, kind: 'num', dec: decFor(t.unit), get: (r) => num(V(r.a, tid).v) };
  };
  const biSelectCols = (tid) => {
    const t = TEST_INDEX[tid];
    const g = t.short || t.name;
    return [
      { id: `${tid}.d`, group: g, label: 'D', kind: 'text', get: (r) => V(r.a, tid).d || '', tone: (r, v) => positive(v) },
      { id: `${tid}.e`, group: g, label: 'E', kind: 'text', get: (r) => V(r.a, tid).e || '', tone: (r, v) => positive(v) },
    ];
  };
  const selectCol = (tid) => {
    const t = TEST_INDEX[tid];
    return { id: tid, label: t.short || t.name, kind: 'text', get: (r) => V(r.a, tid).v || '', tone: (r, v) => positive(v) };
  };
  const scoreBiCols = (tid) => {
    const t = TEST_INDEX[tid];
    const g = t.short || t.name;
    return [
      { id: `${tid}.d`, group: g, label: 'D', kind: 'score', get: (r) => V(r.a, tid).sd || '' },
      { id: `${tid}.e`, group: g, label: 'E', kind: 'score', get: (r) => V(r.a, tid).se || '' },
      { id: `${tid}.p`, group: g, label: 'P', kind: 'pain', get: (r) => (V(r.a, tid).pain ? 'P' : '') },
    ];
  };
  const encoder = (name) => (r) => ((r.a.encoder && r.a.encoder.rows) || []).find((x) => U.norm(x.name) === U.norm(name)) || {};
  const jump = (type, k) => (r) => { const j = Calc.jumps(r.a)[type]; return j ? j[k] : null; };
  const patterns = (r) => Calc.patterns(r.a);

  const COLUMNS = {
    clients: () => [
      { id: 'client', label: 'Client', kind: 'client', get: (r) => U.fullName(r.p) },
      { id: 'age', label: 'Edat', kind: 'num', dec: 0, get: (r) => U.age(r.p.birthDate) },
      { id: 'service', label: 'Servei', kind: 'text', get: (r) => (OPT.services.find((o) => o.v === r.p.service) || {}).label || '' },
      { id: 'prof', label: 'Professional', kind: 'text', get: (r) => r.p.professional || '' },
      { id: 'status', label: 'Estat', kind: 'text', get: (r) => (OPT.status.find((o) => o.v === r.p.status) || {}).label || '' },
      { id: 'start', label: 'Alta', kind: 'date', get: (r) => r.p.startDate || '' },
      { id: 'done', label: 'Sessions fetes', kind: 'num', dec: 0, get: (r) => Store.byPatient('sessions', r.p.id).filter((s) => s.status === 'feta').length },
      { id: 'lastSession', label: 'Última sessió', kind: 'date', get: (r) => (U.sortBy(Store.byPatient('sessions', r.p.id).filter((s) => s.status === 'feta'), 'date', -1)[0] || {}).date || '' },
      { id: 'lastAssessment', label: 'Última valoració', kind: 'date', get: (r) => (Store.assessmentsOf(r.p.id).pop() || {}).date || '' },
      { id: 'retest', label: 'Propera valoració', kind: 'date', get: (r) => { const x = Calc.retestDue(Store.assessmentsOf(r.p.id)); return x ? x.due : ''; },
        tone: (r, v) => (v && v <= U.today() ? 'warn' : '') },
      { id: 'iq', label: 'Dies des de la IQ', kind: 'num', dec: 0, get: (r) => (r.p.surgeryDate ? U.diffDays(r.p.surgeryDate, U.today()) : null) },
      { id: 'injury', label: 'Dies des de la lesió', kind: 'num', dec: 0, get: (r) => (r.p.injuryDate ? U.diffDays(r.p.injuryDate, U.today()) : null) },
      { id: 'goal', label: 'Objectiu', kind: 'text', wide: true, get: (r) => r.p.goal || '' },
    ],

    valoracions: () => [
      ...lead(),
      { id: 'prof', label: 'Professional', kind: 'text', get: (r) => r.a.professional || '' },
      { id: 'weight', label: 'Pes', unit: 'kg', kind: 'num', dec: 1, get: (r) => Calc.weight(r.a) },
      { id: 'cmj', group: 'CMJ', label: 'Millor', unit: 'cm', kind: 'num', dec: 1, get: jump('CMJ', 'best') },
      { id: 'cmjw', group: 'CMJ', label: 'Potència', unit: 'W/kg', kind: 'num', dec: 1, get: jump('CMJ', 'relPower') },
      { id: 'ybtd', group: 'Y-Balance', label: 'D', unit: '%', kind: 'num', dec: 1, get: (r) => Calc.ybt(r.a).d.comp },
      { id: 'ybte', group: 'Y-Balance', label: 'E', unit: '%', kind: 'num', dec: 1, get: (r) => Calc.ybt(r.a).e.comp },
      { id: 'ktwd', group: 'Knee-to-wall', label: 'D', unit: 'cm', kind: 'num', dec: 1, get: (r) => num(V(r.a, 'wblt').d), tone: (r, v) => (v != null && v < THRESHOLDS.wbltMin ? 'bad' : '') },
      { id: 'ktwe', group: 'Knee-to-wall', label: 'E', unit: 'cm', kind: 'num', dec: 1, get: (r) => num(V(r.a, 'wblt').e), tone: (r, v) => (v != null && v < THRESHOLDS.wbltMin ? 'bad' : '') },
      { id: 'quad', label: 'Asim. quàdriceps', unit: '%', kind: 'pct', dec: 0, get: (r) => { const as = Calc.asym(V(r.a, 'dyn_knee_ext').d, V(r.a, 'dyn_knee_ext').e); return as ? as.pct : null; }, tone: (r, v) => Calc.asymTone(v) },
      { id: 'p0', group: 'Patrons', label: '0', kind: 'num', dec: 0, get: (r) => (patterns(r).scored ? patterns(r).counts['0'] : null) },
      { id: 'p1', group: 'Patrons', label: '−', kind: 'num', dec: 0, get: (r) => (patterns(r).scored ? patterns(r).counts['-'] : null) },
      { id: 'p2', group: 'Patrons', label: '−−', kind: 'num', dec: 0, get: (r) => (patterns(r).scored ? patterns(r).counts['--'] : null), tone: (r, v) => (v ? 'bad' : '') },
      { id: 'pp', group: 'Patrons', label: 'P', kind: 'num', dec: 0, get: (r) => (patterns(r).scored || patterns(r).counts.P ? patterns(r).counts.P : null), tone: (r, v) => (v ? 'bad' : '') },
      { id: 'alerts', label: 'Punts d\'atenció', kind: 'num', dec: 0, get: (r) => Calc.alerts(r.a).length,
        tone: (r) => (Calc.alerts(r.a).some((x) => x.tone === 'bad') ? 'bad' : Calc.alerts(r.a).length ? 'warn' : '') },
    ],

    mobilitat: () => [...lead(), ...['rom_hip_ir', 'rom_hip_er', 'rom_sh_ir', 'rom_sh_er', 'rom_sh_flex', 'rom_knee_flex', 'rom_knee_ext', 'wblt'].flatMap((tid) => biCols(tid))],

    postural: () => [...lead(), ...biSelectCols('slump'), ...biSelectCols('pkb'), selectCol('adams'), ...biSelectCols('thomas'), ...biSelectCols('windlass'), ...scoreBiCols('sls')],

    dinamometria: () => [
      ...lead(),
      { id: 'weight', label: 'Pes', unit: 'kg', kind: 'num', dec: 1, get: (r) => Calc.weight(r.a) },
      ...['dyn_knee_ext', 'dyn_curl_90', 'dyn_curl_30', 'dyn_hip_ir', 'dyn_hip_er', 'dyn_sh_er'].flatMap((tid) => biCols(tid)),
      { ...singleCol('dyn_squeeze', 'Squeeze'), group: 'Squeeze', label: 'N' },
      { id: 'squeezekg', group: 'Squeeze', label: 'N/kg', kind: 'num', dec: 1, get: (r) => Calc.perKg(V(r.a, 'dyn_squeeze').v, Calc.weight(r.a)) },
      { id: 'hqd', group: 'Ràtio isquios/quàdriceps', label: 'D', kind: 'num', dec: 2, get: (r) => Calc.hq(r.a).d },
      { id: 'hqe', group: 'Ràtio isquios/quàdriceps', label: 'E', kind: 'num', dec: 2, get: (r) => Calc.hq(r.a).e },
    ],

    ybalance: () => {
      const side = (s, k) => (r) => Calc.ybt(r.a)[s][k];
      const dir = (k, label) => [
        { id: `${k}.d`, group: label, label: 'D', unit: 'cm', kind: 'num', dec: 1, get: side('d', k) },
        { id: `${k}.e`, group: label, label: 'E', unit: 'cm', kind: 'num', dec: 1, get: side('e', k) },
      ];
      return [
        ...lead(),
        ...dir('ant', 'Anterior'),
        { id: 'antdiff', group: 'Anterior', label: 'Dif.', unit: 'cm', kind: 'num', dec: 1, get: (r) => Calc.ybt(r.a).antDiff, tone: (r, v) => (v != null && v >= THRESHOLDS.ybtAntDiff ? 'bad' : '') },
        ...dir('pm', 'Posteromedial'), ...dir('pl', 'Posterolateral'), ...dir('len', 'Longitud de cama'),
        { id: 'compd', group: 'Composite', label: 'D', unit: '%', kind: 'num', dec: 1, get: side('d', 'comp') },
        { id: 'compe', group: 'Composite', label: 'E', unit: '%', kind: 'num', dec: 1, get: side('e', 'comp') },
      ];
    },

    salts: () => [
      ...lead(),
      { id: 'cmjbest', group: 'CMJ', label: 'Millor', unit: 'cm', kind: 'num', dec: 1, get: jump('CMJ', 'best') },
      { id: 'cmjmean', group: 'CMJ', label: 'Mitjana', unit: 'cm', kind: 'num', dec: 1, get: jump('CMJ', 'mean') },
      { id: 'cmjpow', group: 'CMJ', label: 'Potència', unit: 'W', kind: 'num', dec: 0, get: jump('CMJ', 'bestPower') },
      { id: 'cmjrel', group: 'CMJ', label: 'Potència', unit: 'W/kg', kind: 'num', dec: 1, get: jump('CMJ', 'relPower') },
      { id: 'cmjf', group: 'CMJ', label: 'Força', unit: 'N', kind: 'num', dec: 0, get: jump('CMJ', 'bestForce') },
      { id: 'cmjv', group: 'CMJ', label: 'Velocitat', unit: 'm/s', kind: 'num', dec: 2, get: jump('CMJ', 'bestVel') },
      { id: 'cmjrsi', group: 'CMJ', label: 'RSI-mod', kind: 'num', dec: 2, get: jump('CMJ', 'bestRsi') },
      { id: 'cmjn', group: 'CMJ', label: 'Intents', kind: 'num', dec: 0, get: jump('CMJ', 'n') },
      { id: 'sj', label: 'SJ millor', unit: 'cm', kind: 'num', dec: 1, get: jump('SJ', 'best') },
      { id: 'cmjfree', label: 'CMJ lliure millor', unit: 'cm', kind: 'num', dec: 1, get: jump('CMJ lliure', 'best') },
      { id: 'dj', label: 'DJ RSI-mod', kind: 'num', dec: 2, get: jump('DJ', 'bestRsi') },
      { id: 'ready', label: 'Estat de forma', kind: 'text', get: (r) => (r.a.jumps && r.a.jumps.readiness) || '',
        tone: (r, v) => (v === 'vermell' ? 'bad' : v === 'groc' ? 'warn' : v === 'verd' ? 'ok' : '') },
    ],

    rendiment: () => [
      ...lead(),
      ...['Squat', 'RDL', 'Hip Thrust'].flatMap((n) => [
        { id: `${n}.kg`, group: `Encoder ${n}`, label: 'Càrrega', unit: 'kg', kind: 'num', dec: 1, get: (r) => num(encoder(n)(r).load) },
        { id: `${n}.v`, group: `Encoder ${n}`, label: 'Velocitat', unit: 'm/s', kind: 'num', dec: 2, get: (r) => num(encoder(n)(r).vel) },
      ]),
      { id: 'bikepk', group: 'Assault bike 30 s', label: 'Pic', unit: 'W', kind: 'num', dec: 0, get: (r) => Calc.bike(r.a).peak },
      { id: 'bikepkr', group: 'Assault bike 30 s', label: 'Pic', unit: 'W/kg', kind: 'num', dec: 1, get: (r) => Calc.bike(r.a).peakRel },
      { id: 'bikemean', group: 'Assault bike 30 s', label: 'Mitjana', unit: 'W', kind: 'num', dec: 0, get: (r) => Calc.bike(r.a).mean },
      { id: 'bikefat', group: 'Assault bike 30 s', label: 'Fatiga', unit: '%', kind: 'num', dec: 1, get: (r) => Calc.bike(r.a).fatigue },
    ],

    patrons: () => [
      ...lead(),
      ...PATTERNS.map((pt) => ({ id: pt.id, group: 'Puntuació', label: pt.short || pt.name, kind: 'score',
        get: (r) => Calc.patternScore((r.a.patterns || {})[pt.id], pt.uni), pain: (r) => !!((r.a.patterns || {})[pt.id] || {}).pain })),
      { id: 'c0', group: 'Resum', label: '0', kind: 'num', dec: 0, get: (r) => (patterns(r).scored ? patterns(r).counts['0'] : null) },
      { id: 'c1', group: 'Resum', label: '−', kind: 'num', dec: 0, get: (r) => (patterns(r).scored ? patterns(r).counts['-'] : null) },
      { id: 'c2', group: 'Resum', label: '−−', kind: 'num', dec: 0, get: (r) => (patterns(r).scored ? patterns(r).counts['--'] : null), tone: (r, v) => (v ? 'bad' : '') },
      { id: 'cp', group: 'Resum', label: 'P', kind: 'num', dec: 0, get: (r) => (patterns(r).scored || patterns(r).counts.P ? patterns(r).counts.P : null), tone: (r, v) => (v ? 'bad' : '') },
    ],

    perfil: () => [
      ...lead(),
      { id: 'profile', label: 'Perfil', kind: 'text', get: (r) => r.p.profile || '' },
      ...PROFILE_TESTS.flatMap((t) => {
        if (t.kind === 'bi') return biCols(t.id, t.name).filter((c) => !c.id.endsWith('.asym'));
        if (t.kind === 'single') return [singleCol(t.id, t.name)];
        if (t.kind === 'scoreBi') return scoreBiCols(t.id).filter((c) => !c.id.endsWith('.p'));
        return [{ id: t.id, label: t.name, kind: 'text', get: (r) => V(r.a, t.id).v || '' }];
      }),
    ],

    sessions: () => [
      { id: 'client', label: 'Client', kind: 'client', lead: true, get: (r) => U.fullName(r.p) },
      { id: 'date', label: 'Data', kind: 'date', lead: true, get: (r) => r.s.date },
      { id: 'num', label: 'Nº', kind: 'num', dec: 0, lead: true, get: (r) => num(r.s.number) },
      { id: 'goal', label: 'Objectiu', kind: 'text', wide: true, get: (r) => r.s.goal || '' },
      { id: 'status', label: 'Estat', kind: 'text', get: (r) => (r.s.status === 'feta' ? 'Feta' : 'Planificada'), tone: (r) => (r.s.status === 'feta' ? 'ok' : '') },
      { id: 'sleep', group: 'Com arriba', label: 'Son', kind: 'num', dec: 0, get: (r) => num((r.s.readiness || {}).sleep) },
      { id: 'energy', group: 'Com arriba', label: 'Energia', kind: 'num', dec: 0, get: (r) => num((r.s.readiness || {}).energy) },
      { id: 'painpre', group: 'Com arriba', label: 'Dolor', kind: 'num', dec: 0, get: (r) => num((r.s.readiness || {}).pain) },
      { id: 'rpe', group: 'Tancament', label: 'RPE', kind: 'num', dec: 0, get: (r) => num((r.s.feedback || {}).rpe) },
      { id: 'min', group: 'Tancament', label: 'Minuts', kind: 'num', dec: 0, get: (r) => num((r.s.feedback || {}).duration) },
      { id: 'load', group: 'Tancament', label: 'Càrrega', unit: 'UA', kind: 'num', dec: 0, get: (r) => Calc.sessionLoad(r.s) },
      { id: 'painpost', group: 'Tancament', label: 'Dolor', kind: 'num', dec: 0, get: (r) => num((r.s.feedback || {}).pain), tone: (r, v) => (v != null && v >= 4 ? 'bad' : '') },
      { id: 'exercises', label: 'Exercicis', kind: 'num', dec: 0, get: (r) => Calc.itemCount(r.s) },
      { id: 'prof', label: 'Professional', kind: 'text', get: (r) => r.s.professional || '' },
    ],

    exercicis: () => [
      { id: 'client', label: 'Client', kind: 'client', lead: true, get: (r) => U.fullName(r.p) },
      { id: 'date', label: 'Data', kind: 'date', lead: true, get: (r) => r.s.date },
      { id: 'num', label: 'Sessió', kind: 'num', dec: 0, lead: true, get: (r) => num(r.s.number) },
      { id: 'block', label: 'Bloc', kind: 'block', get: (r) => r.b.key },
      { id: 'order', label: 'Ordre', kind: 'text', get: (r) => `${blockNum(r.b.key)}.${r.idx + 1}` },
      { id: 'name', label: 'Exercici', kind: 'text', wide: true, get: (r) => r.it.name },
      { id: 'sets', label: 'Sèries', kind: 'text', get: (r) => r.it.sets || '' },
      { id: 'reps', label: 'Reps / temps', kind: 'text', get: (r) => r.it.reps || '' },
      { id: 'load', label: 'Càrrega', kind: 'text', get: (r) => Calc.load(r.it.load) },
      { id: 'int', label: 'Intensitat', kind: 'text', get: (r) => r.it.intensity || '' },
      { id: 'rest', label: 'Descans', kind: 'text', get: (r) => r.it.rest || '' },
      { id: 'material', label: 'Material', kind: 'text', get: (r) => r.it.material || '' },
      { id: 'done', label: 'Fet', kind: 'text', get: (r) => (r.it.done ? 'Sí' : ''), tone: (r, v) => (v ? 'ok' : '') },
    ],
  };

  function rows(tableId) {
    const P = (id) => Store.get('patients', id);
    const def = DB_TABLES.find((t) => t.id === tableId);
    if (!def) return [];
    if (def.kind === 'patients') return Store.patients().map((p) => ({ key: p.id, p }));
    if (def.kind === 'sessions') return Store.all('sessions').map((s) => ({ key: s.id, s, p: P(s.patientId) })).filter((r) => r.p);
    if (def.kind === 'log') {
      const out = [];
      for (const s of Store.all('sessions')) {
        const p = P(s.patientId);
        if (!p) continue;
        for (const b of s.blocks || []) (b.items || []).filter((i) => i.name).forEach((it, idx) => out.push({ key: `${s.id}:${it.id}`, s, p, b, it, idx }));
      }
      return out;
    }
    return Store.all('assessments').map((a) => ({ key: a.id, a, p: P(a.patientId) })).filter((r) => r.p);
  }

  const empty = (v) => v == null || v === '' || (typeof v === 'number' && !Number.isFinite(v));

  // Files amb alguna dada a les columnes pròpies de la taula (no només client i data).
  function withData(tableId, list, cols) {
    const def = DB_TABLES.find((t) => t.id === tableId);
    if (!def || def.kind !== 'assessments' || tableId === 'valoracions') return list;
    const own = cols.filter((c) => !c.lead);
    return list.filter((r) => own.some((c) => !empty(c.get(r))));
  }

  function sortRows(list, col, dir) {
    if (!col) return list;
    const val = (r) => col.get(r);
    return [...list].sort((x, y) => {
      const a = val(x), b = val(y);
      if (empty(a) && empty(b)) return 0;
      if (empty(a)) return 1;
      if (empty(b)) return -1;
      if (typeof a === 'number' && typeof b === 'number') return (a - b) * dir;
      return String(a).localeCompare(String(b), 'ca', { numeric: true }) * dir;
    });
  }

  function header(c) {
    return `${c.group ? `${c.group} · ` : ''}${c.label}${c.unit ? ` (${c.unit})` : ''}`;
  }

  // Valor per a l'exportació a Excel.
  function csvValue(c, r) {
    const v = c.get(r);
    if (empty(v)) return '';
    if (c.kind === 'score') return Flat.sym(v) + (c.pain && c.pain(r) ? ' P' : '');
    if (typeof v === 'number') return U.round(v, c.dec ?? 2);
    if (c.kind === 'block') return blockName(v);
    return v;
  }

  return { COLUMNS, rows, withData, sortRows, header, csvValue, empty };
})();
