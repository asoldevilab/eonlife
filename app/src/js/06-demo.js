/* EON Life · dades de demostració (clients ficticis) per provar l'app en mode local.
   Les dates es calculen a partir d'avui perquè la demo sempre sembli actual. */

function makeDemoData() {
  const today = U.today();
  const D = (n) => U.addDays(today, n);
  const exById = Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e]));
  const db = { patients: {}, assessments: {}, sessions: {}, exercises: {}, templates: {}, demo: true,
    settings: defaultSettings() };

  const patient = (p) => { db.patients[p.id] = { status: 'actiu', email: '', phone: '', folderUrl: '', folderId: '', notes: '', surgeryDate: '', surgeryNote: '', injuryDate: '', injuryNote: '', createdAt: `${p.startDate}T09:00:00.000Z`, ...p }; return p.id; };

  const bi = (d, e) => ({ d: d == null ? '' : String(d), e: e == null ? '' : String(e) });
  const one = (v) => ({ v: String(v) });

  const assessment = (a) => {
    const rec = {
      id: U.uid('V'), type: 'inicial', values: {}, ybt: { d: {}, e: {} }, jumps: { attempts: [], readiness: '' },
      encoder: { rows: [] }, bike: {}, patterns: {}, free: [], conclusions: {}, createdAt: `${a.date}T10:00:00.000Z`, ...a,
    };
    rec.nextRetest = rec.nextRetest || U.addMonths(rec.date, THRESHOLDS.retestMonths);
    db.assessments[rec.id] = rec;
    return rec;
  };

  const jump = (type, height, power, force, velocity, rsimod) => ({ id: U.uid('J'), type, load: '', height: String(height), power: String(power), force: String(force), velocity: String(velocity), rsimod: String(rsimod), note: '' });
  const pat = (score, extra = {}) => ({ score, chips: [], note: '', ...extra });
  const patUni = (sd, se, extra = {}) => ({ sd, se, chips: [], note: '', ...extra });

  // ── Clients ──
  const laura = patient({ id: 'P-DEMO-LAURA', firstName: 'Laura', lastName: 'Vidal Serra', birthDate: '1991-04-12', sex: 'D', profile: 'A', service: 'membership',
    professional: 'Arnau', startDate: D(-96), email: 'laura.vidal@example.com', phone: '600 000 101',
    goal: 'Tornar a competir en trail de 42 km sense dolor al genoll.',
    reason: 'Dolor femoropatel·lar recurrent a la cama dreta en les baixades.',
    history: 'Condropatia rotuliana dreta (2024). Corredora de muntanya, 4 dies per setmana.' });
  const jordi = patient({ id: 'P-DEMO-JORDI', firstName: 'Jordi', lastName: 'Puig Ferrer', birthDate: '1974-09-03', sex: 'H', profile: 'B', service: 'membership',
    professional: 'Richy', startDate: D(-24), email: 'jordi.puig@example.com', phone: '600 000 202',
    goal: 'Tornar a esquiar la temporada vinent amb seguretat.',
    reason: 'Readaptació després de la reconstrucció del LCA.',
    history: 'Esquiador aficionat. Sense altres lesions rellevants.',
    surgeryDate: D(-84), surgeryNote: 'Reconstrucció del LCA del genoll esquerre (plàstia HTH).' });
  const montse = patient({ id: 'P-DEMO-MONTSE', firstName: 'Montserrat', lastName: 'Font Riba', birthDate: '1955-01-22', sex: 'D', profile: 'C', service: 'membership',
    professional: 'Richy', startDate: D(-45),
    goal: 'Guanyar autonomia i confiança per caminar per la muntanya amb els néts.',
    reason: 'Osteopènia i por a caure.',
    history: 'Osteopènia (2023). Pròtesi de maluc dret (2019).' });
  const alex = patient({ id: 'P-DEMO-ALEX', firstName: 'Àlex', lastName: 'Martí Soler', birthDate: '1999-06-30', sex: 'H', profile: 'A', service: 'valoracio',
    professional: 'Arnau', startDate: D(-2), email: 'alex.marti@example.com',
    goal: 'Rendiment en futbol semiprofessional i prevenció de recaigudes.',
    reason: 'Valoració de pretemporada.',
    history: 'Distensió d\'adductors esquerre fa 5 mesos.',
    injuryDate: D(-150), injuryNote: 'Distensió d\'adductor llarg esquerre (grau I).' });

  // ── Valoracions ──
  assessment({ patientId: laura, date: D(-95), type: 'inicial', professional: 'Arnau',
    general: { weight: '58', height: '167', goal: 'Trail de 42 km sense dolor.' },
    values: {
      rom_hip_ir: bi(32, 38), rom_hip_er: bi(41, 44), rom_sh_ir: bi(55, 58), rom_sh_er: bi(98, 101),
      rom_knee_flex: bi(138, 142), rom_knee_ext: bi(0, 1),
      wblt: bi(7, 11), slump: { d: 'Negatiu', e: 'Negatiu' }, pkb: { d: 'Negatiu', e: 'Negatiu' },
      adams: one('Negatiu'), thomas: { d: 'Positiu · recte anterior', e: 'Negatiu' }, windlass: { d: 'Negatiu', e: 'Negatiu' },
      dyn_knee_ext: bi(312, 368), dyn_curl_90: bi(190, 205), dyn_curl_30: bi(220, 236), dyn_squeeze: one(260),
      dyn_hip_ir: bi(150, 158), dyn_hip_er: bi(142, 150),
      sls: { sd: '-', se: '0', chips: ['Valg de genoll', 'Caiguda de pelvis'], note: 'Valg dinàmic a la cama dreta a partir de la 2a repetició.' },
      lsd: { sd: '-', se: '0', chips: ['Valg de genoll'] }, cod505: bi(2.62, 2.55), ckcuest: one(22),
    },
    ybt: { d: { ant: '58', pm: '92', pl: '88', len: '86' }, e: { ant: '63', pm: '95', pl: '91', len: '86' } },
    jumps: { readiness: 'verd', attempts: [jump('CMJ', 27.8, 2240, 1290, 1.16, 0.37), jump('CMJ', 28.4, 2290, 1310, 1.19, 0.39), jump('CMJ', 28.1, 2270, 1300, 1.17, 0.38)] },
    encoder: { rows: [{ id: U.uid('R'), name: 'Squat', load: '40', vel: '0,78', power: '420' }, { id: U.uid('R'), name: 'RDL', load: '40', vel: '0,62', power: '' }, { id: U.uid('R'), name: 'Hip Thrust', load: '60', vel: '0,55', power: '' }] },
    patterns: {
      squat: pat('-', { chips: ['Valg de genoll'] }), lunge: patUni('-', '0', { chips: ['Valg de genoll'] }),
      deadlift: pat('0'), rdl: pat('0'), hipthrust: pat('0'),
      laterallunge: patUni('-', '0', { chips: ['Recorregut limitat'] }), copenhagen: patUni('0', '0', { secD: '30', secE: '28' }),
    },
    conclusions: {
      strengths: 'Bona base de força de maluc i patrons de frontissa competents. Molt bona adherència.',
      priorities: '1. Dorsiflexió del turmell dret (7 cm) i diferència de 4 cm entre turmells.\n2. Dèficit de força del quàdriceps dret (15 %).\n3. Control del valg dinàmic en els unilaterals.',
      plan: 'Mobilitat de turmell diària. Força principal amb dominant de genoll 2 dies per setmana (3 × 6, RIR 2) i excèntric a la politja cònica. Pliometria progressiva a partir de la setmana 4.',
    } });

  assessment({ patientId: laura, date: D(-4), type: 'retest', professional: 'Arnau',
    general: { weight: '57.5', height: '167', goal: 'Trail de 42 km sense dolor.' },
    values: {
      rom_hip_ir: bi(35, 38), rom_hip_er: bi(43, 45), rom_sh_ir: bi(56, 58), rom_sh_er: bi(99, 101),
      rom_knee_flex: bi(141, 142), rom_knee_ext: bi(0, 1),
      wblt: bi(9.5, 11.5), slump: { d: 'Negatiu', e: 'Negatiu' }, pkb: { d: 'Negatiu', e: 'Negatiu' },
      adams: one('Negatiu'), thomas: { d: 'Negatiu', e: 'Negatiu' }, windlass: { d: 'Negatiu', e: 'Negatiu' },
      dyn_knee_ext: bi(352, 372), dyn_curl_90: bi(204, 210), dyn_curl_30: bi(232, 240), dyn_squeeze: one(285),
      dyn_hip_ir: bi(158, 161), dyn_hip_er: bi(150, 154),
      sls: { sd: '0', se: '0', chips: [] }, lsd: { sd: '0', se: '0' }, cod505: bi(2.51, 2.49), ckcuest: one(24),
    },
    ybt: { d: { ant: '62', pm: '95', pl: '91', len: '86' }, e: { ant: '64', pm: '96', pl: '92', len: '86' } },
    jumps: { readiness: 'verd', attempts: [jump('CMJ', 30.2, 2350, 1340, 1.22, 0.42), jump('CMJ', 30.9, 2390, 1360, 1.24, 0.44), jump('CMJ', 30.5, 2370, 1350, 1.23, 0.43), jump('SJ', 27.9, 2230, 1280, 1.15, '')] },
    encoder: { rows: [{ id: U.uid('R'), name: 'Squat', load: '50', vel: '0,74', power: '505' }, { id: U.uid('R'), name: 'RDL', load: '55', vel: '0,60', power: '' }, { id: U.uid('R'), name: 'Hip Thrust', load: '80', vel: '0,52', power: '' }] },
    bike: { peak: '720', mean: '520', min: '390' },
    patterns: {
      squat: pat('0'), lunge: patUni('0', '0'), deadlift: pat('0'), rdl: pat('0'), hipthrust: pat('0'),
      laterallunge: patUni('-', '0', { chips: ['Recorregut limitat'] }), copenhagen: patUni('0', '0', { secD: '30', secE: '30' }),
    },
    conclusions: {
      strengths: 'Millora clara de la dorsiflexió dreta (+2,5 cm) i del quàdriceps dret (+13 %). CMJ +2,5 cm.',
      priorities: '1. Consolidar el control en unilaterals amb càrrega.\n2. Mobilitat d\'adductors (lateral lunge dret).',
      plan: 'Iniciar fase de potència: pliometria reactiva 2 dies per setmana. Mantenir força principal a 3 × 5 (RIR 1-2).',
    } });

  assessment({ patientId: jordi, date: D(-22), type: 'inicial', professional: 'Richy',
    general: { weight: '84', height: '181', goal: 'Tornar a esquiar amb seguretat.' },
    values: {
      rom_hip_ir: bi(30, 28), rom_hip_er: bi(40, 38), rom_knee_flex: bi(140, 118), rom_knee_ext: bi(0, -3),
      wblt: bi(10, 8.5), slump: { d: 'Negatiu', e: 'Negatiu' }, pkb: { d: 'Negatiu', e: 'Negatiu' },
      adams: one('Negatiu'), thomas: { d: 'Negatiu', e: 'Negatiu' },
      dyn_knee_ext: bi(520, 340), dyn_curl_90: bi(260, 210), dyn_curl_30: bi(290, 250), dyn_squeeze: one(310),
      dyn_hip_ir: bi(170, 165), dyn_hip_er: bi(165, 160),
      sls: { sd: '0', se: '--', chips: ['Valg de genoll', 'Rotació de tronc'], note: 'Evita carregar la cama esquerra.' },
      squat_ref: one(15), pushup_ref: one(18), sl_stance: bi(30, 18), step3: one(132),
    },
    ybt: { d: { ant: '64', pm: '98', pl: '94', len: '94' }, e: { ant: '56', pm: '90', pl: '85', len: '94' } },
    encoder: { rows: [] },
    patterns: {
      squat: pat('-', { chips: ['Desplaçament lateral'] }), lunge: patUni('0', '--', { chips: ['Valg de genoll', 'Pèrdua d\'equilibri'] }),
      deadlift: pat('0'), rdl: pat('0'), hipthrust: pat('0'),
      laterallunge: patUni('0', '-'), copenhagen: patUni('0', '-', { secD: '25', secE: '15' }),
    },
    conclusions: {
      strengths: 'Bona força de tren superior i de cadena posterior. Molt motivat.',
      priorities: '1. Flexió de genoll esquerre (118°).\n2. Força de quàdriceps esquerre (35 % d\'asimetria).\n3. Control del valg en unilaterals esquerres.',
      plan: 'Coordinat amb fisioteràpia. Sense impactes fins al criteri del fisio. Força de quàdriceps en cadena oberta i tancada, 2 dies per setmana.',
    } });

  assessment({ patientId: montse, date: D(-42), type: 'inicial', professional: 'Richy',
    general: { weight: '62', height: '158', goal: 'Autonomia i confiança caminant.' },
    values: {
      rom_hip_ir: bi(22, 25), rom_hip_er: bi(30, 34), rom_sh_ir: bi(48, 50), rom_sh_er: bi(80, 84),
      wblt: bi(6, 7), adams: one('Positiu'),
      dyn_knee_ext: bi(210, 225), dyn_curl_90: bi(120, 128), dyn_squeeze: one(160),
      chair30: one(11), tug: one(11.2), armcurl: bi(14, 13), ankle_seat: bi(12, 10), sh_flex_seat: bi(150, 145),
      stage4: one('Etapa 3 · tàndem'), reach_seat: one(28), walk6: one(455),
    },
    patterns: { squat: pat('-', { note: 'Adaptat: squat a cadira.' }), hipthrust: pat('0', { note: 'Adaptat: pont de glutis a terra.' }), deadlift: pat('-', { note: 'Des d\'una caixa elevada.' }) },
    conclusions: {
      strengths: 'Bona mobilitat d\'espatlla i molt bona actitud.',
      priorities: '1. Dorsiflexió de turmell limitada a totes dues cames.\n2. Força de tren inferior per aixecar-se i pujar escales.\n3. Equilibri en suport monopodal.',
      plan: 'Força funcional 2 dies per setmana amb progressió de sit-to-stand, step-up baix i equilibri. Caminades de 30 minuts els dies alterns.',
    } });

  assessment({ patientId: alex, date: D(-2), type: 'inicial', professional: 'Arnau',
    general: { weight: '76', height: '179', goal: 'Rendiment i prevenció de recaigudes.' },
    values: {
      rom_hip_ir: bi(38, 30), rom_hip_er: bi(45, 42), rom_sh_ir: bi(60, 62), rom_sh_er: bi(105, 104),
      rom_knee_flex: bi(145, 144), wblt: bi(12, 11.5), slump: { d: 'Negatiu', e: 'Negatiu' }, pkb: { d: 'Negatiu', e: 'Negatiu' },
      thomas: { d: 'Negatiu', e: 'Positiu · psoes ilíac' },
      dyn_knee_ext: bi(560, 548), dyn_curl_90: bi(310, 298), dyn_curl_30: bi(335, 330), dyn_squeeze: one(420),
      dyn_hip_ir: bi(190, 185), dyn_hip_er: bi(180, 158),
      sls: { sd: '0', se: '0' }, lsd: { sd: '0', se: '-' }, cod505: bi(2.31, 2.40), ckcuest: one(27),
    },
    ybt: { d: { ant: '68', pm: '104', pl: '101', len: '92' }, e: { ant: '67', pm: '100', pl: '97', len: '92' } },
    jumps: { readiness: 'verd', attempts: [jump('CMJ', 40.6, 4020, 1880, 1.41, 0.58), jump('CMJ', 41.2, 4060, 1900, 1.43, 0.6), jump('CMJ', 40.9, 4040, 1890, 1.42, 0.59)] },
    encoder: { rows: [{ id: U.uid('R'), name: 'Squat', load: '80', vel: '0,82', power: '' }, { id: U.uid('R'), name: 'RDL', load: '80', vel: '0,65', power: '' }, { id: U.uid('R'), name: 'Hip Thrust', load: '120', vel: '0,58', power: '' }] },
    patterns: {
      squat: pat('0'), lunge: patUni('0', '0'), deadlift: pat('0'), rdl: pat('0'), hipthrust: pat('0'),
      laterallunge: patUni('0', '-', { chips: ['Recorregut limitat'] }),
      copenhagen: patUni('0', '-', { secD: '30', secE: '20', chips: ['Maluc cau'], note: 'Sense dolor, però perd l\'alineació als 20 s a l\'esquerra.' }),
    },
    conclusions: {
      strengths: 'Perfil de potència alt (CMJ 41 cm) i força de genoll simètrica.',
      priorities: '1. Rotació interna de maluc esquerre (21 % d\'asimetria).\n2. Resistència d\'adductors esquerres (Copenhagen 20 s).',
      plan: 'Copenhagen progressiu 3 dies per setmana i mobilitat de maluc. Força i potència segons calendari de competició.',
    } });

  // ── Sessions ──
  const item = (exId, over = {}) => itemFromExercise(exById[exId], over);
  const blocks = (spec) => BLOCKS.map((b) => ({ key: b.key, focus: (spec[b.key] && spec[b.key].focus) || '', note: '', items: ((spec[b.key] && spec[b.key].items) || []).map(([id, o]) => item(id, o)) }));

  const numbers = {};
  const session = (pid, date, prof, goal, spec, fb) => {
    numbers[pid] = (numbers[pid] || 0) + 1;
    const done = !!fb;
    const s = { id: U.uid('S'), patientId: pid, date, number: numbers[pid], professional: prof, goal, pillar: '',
      status: done ? 'feta' : 'planificada', readiness: done ? { sleep: String(fb.sleep || 4), energy: String(fb.energy || 4), pain: String(fb.painPre ?? 0) } : {},
      blocks: blocks(spec), feedback: done ? { rpe: String(fb.rpe), duration: String(fb.min), pain: String(fb.pain || 0), notes: fb.notes || '', decision: fb.decision || '' } : {},
      createdAt: `${date}T08:00:00.000Z` };
    if (done) for (const b of s.blocks) for (const it of b.items) it.done = true;
    db.sessions[s.id] = s;
  };

  // Laura: dilluns, dimecres i divendres (dia A genoll / dia B maluc) durant 5 setmanes.
  const w0 = U.addDays(U.weekStart(today), -35);
  let k = 0;
  for (let w = 0; w < 5; w++) {
    for (const off of [0, 2, 4]) {
      const date = U.addDays(w0, w * 7 + off);
      const kneeDay = k % 2 === 0;
      const sq = 40 + w * 2.5, hip = 60 + w * 5, rdl = 40 + w * 2.5;
      const spec = kneeDay ? {
        mob: { focus: 'Maluc i turmell', items: [['X-MOB-01'], ['X-MOB-02'], ['X-MOB-03']] },
        act: { focus: 'Glutis', items: [['X-ACT-05'], ['X-ACT-12', { sets: '3', reps: '30 s' }]] },
        pot: { focus: w >= 3 ? 'Salts verticals' : '', items: w >= 3 ? [['X-POT-01', { sets: '3', reps: '3' }], ['X-POT-04', { sets: '2', reps: '10' }]] : [['X-POT-06', { load: '3' }]] },
        for: { focus: 'Dominant de genoll', items: [['X-FOR-01', { sets: '3', reps: '6', load: String(sq), intensity: 'RIR 2', vbt: demoVbt(sq) }], ['X-FOR-04', { sets: '3', reps: '6/cama', load: String(8 + w * 2), intensity: 'RIR 2' }], ['X-FOR-06', { sets: '3', reps: '6/cama', load: '8', intensity: 'RIR 2' }], ['X-FOR-07', { sets: '3', reps: '8', load: String(80 + w * 10), intensity: 'RIR 2' }]] },
        acc: { focus: 'Politja cònica', items: [['X-ACC-01'], ['X-ACC-14', { load: '12' }]] },
        cal: { focus: 'Respiració', items: [['X-CAL-01'], ['X-CAL-06']] },
      } : {
        mob: { focus: 'Maluc i turmell', items: [['X-MOB-12'], ['X-MOB-08'], ['X-MOB-06']] },
        act: { focus: 'Core', items: [['X-ACT-01'], ['X-ACT-02']] },
        pot: { focus: 'Balístic', items: [['X-POT-09', { load: '16' }]] },
        for: { focus: 'Dominant de maluc', items: [['X-FOR-08', { sets: '3', reps: '8', load: String(hip), intensity: 'RIR 2' }], ['X-FOR-09', { sets: '3', reps: '6', load: String(rdl), intensity: 'RIR 2' }], ['X-FOR-10', { sets: '3', reps: '5', load: String(50 + w * 5), intensity: 'RIR 2' }], ['X-FOR-19', { sets: '3', reps: '10/costat', load: '14', intensity: 'RIR 2' }]] },
        acc: { focus: 'Resistència pneumàtica', items: [['X-ACC-04'], ['X-ACC-08'], ['X-ACC-13', { load: '12' }]] },
        cal: { focus: 'Parasimpàtic', items: [['X-CAL-03'], ['X-CAL-02']] },
      };
      if (date < today) {
        session(laura, date, 'Arnau', kneeDay ? 'Força de tren inferior · dominant de genoll' : 'Força de tren inferior · dominant de maluc', spec, {
          rpe: [6, 7, 7, 8, 7][w] + (kneeDay ? 0 : -1), min: [60, 65, 60, 70, 65][w], pain: w < 2 && kneeDay ? 2 : 0,
          sleep: 3 + ((k + w) % 3), energy: 3 + (k % 3), painPre: w < 2 && kneeDay ? 1 : 0,
          notes: kneeDay && w === 1 ? 'Molèstia lleu al genoll dret en el split squat (2/10). Es redueix recorregut.' : '',
          decision: kneeDay ? `Pujar a ${U.fmt(sq + 2.5)} kg al back squat si manté RIR 2.` : 'Mantenir càrregues i prioritzar la tècnica de l\'RDL.',
        });
      }
      k++;
    }
  }
  // Sessió d'avui (planificada) per a Laura.
  session(laura, today, 'Arnau', 'Potència i força · dominant de genoll', {
    mob: { focus: 'Maluc i turmell', items: [['X-MOB-01'], ['X-MOB-02'], ['X-MOB-03']] },
    act: { focus: 'Glutis', items: [['X-ACT-05'], ['X-ACT-12', { sets: '3', reps: '30 s' }]] },
    pot: { focus: 'Salts verticals', items: [['X-POT-01', { sets: '4', reps: '3' }], ['X-POT-05', { sets: '3', reps: '3', note: 'Caixa de 30 cm.' }]] },
    for: { focus: 'Dominant de genoll', items: [['X-FOR-01', { sets: '3', reps: '6', load: '52.5', intensity: 'RIR 2' }], ['X-FOR-04', { sets: '3', reps: '6/cama', load: '18', intensity: 'RIR 2' }], ['X-FOR-06', { sets: '3', reps: '6/cama', load: '10', intensity: 'RIR 2' }], ['X-FOR-07', { sets: '3', reps: '8', load: '130', intensity: 'RIR 2' }]] },
    acc: { focus: 'Politja cònica', items: [['X-ACC-01'], ['X-ACC-04'], ['X-ACC-14', { load: '14' }]] },
    cal: { focus: 'Respiració', items: [['X-CAL-01'], ['X-CAL-06']] },
  }, null);

  addDemoPlan(db, today);

  // Jordi: dimarts i dijous, 3 setmanes.
  const jw0 = U.addDays(U.weekStart(today), -21);
  for (let w = 0; w < 3; w++) {
    for (const off of [1, 3]) {
      const date = U.addDays(jw0, w * 7 + off);
      if (date >= today) continue;
      session(jordi, date, 'Richy', 'Readaptació LCA · força de quàdriceps', {
        mob: { focus: 'Genoll', items: [['X-MOB-14'], ['X-MOB-12'], ['X-MOB-07']] },
        act: { focus: 'Quàdriceps', items: [['X-ACT-12', { sets: '4', reps: '45 s' }], ['X-ACT-04']] },
        pot: { focus: '', items: [] },
        for: { focus: 'Dominant de genoll', items: [['X-FOR-03', { load: String(12 + w * 4) }], ['X-FOR-07', { reps: '10', load: String(60 + w * 10), intensity: 'RIR 3' }], ['X-FOR-08', { load: String(40 + w * 10), intensity: 'RIR 3' }]] },
        acc: { focus: 'Unilateral', items: [['X-ACC-05', { note: 'Cama esquerra: 3 × 12 amb 3 s d\'excèntrica.' }], ['X-ACC-12', { sets: '2', reps: '8/cama' }], ['X-ACC-17']] },
        cal: { focus: 'Respiració', items: [['X-CAL-01'], ['X-CAL-08']] },
      }, { rpe: 5 + w, min: 55, pain: w === 0 ? 2 : 1, sleep: 4, energy: 4, painPre: 1,
        notes: w === 0 ? 'Dolor 2/10 a la part anterior del genoll en el goblet squat profund.' : '',
        decision: 'Progressar càrrega del leg press i mantenir profunditat controlada.' });
    }
  }
  session(jordi, D(1), 'Richy', 'Readaptació LCA · força de quàdriceps', {
    mob: { focus: 'Genoll', items: [['X-MOB-14'], ['X-MOB-12']] },
    act: { focus: 'Quàdriceps', items: [['X-ACT-12', { sets: '4', reps: '45 s' }], ['X-ACT-04']] },
    for: { focus: 'Dominant de genoll', items: [['X-FOR-03', { load: '24' }], ['X-FOR-07', { reps: '10', load: '90', intensity: 'RIR 3' }], ['X-FOR-06', { sets: '3', reps: '8/cama', load: '0', note: 'Caixa de 20 cm.' }]] },
    acc: { focus: 'Resistència pneumàtica', items: [['X-ACC-05'], ['X-ACC-06'], ['X-ACC-12', { sets: '2', reps: '8/cama' }]] },
    cal: { focus: 'Respiració', items: [['X-CAL-01']] },
  }, null);

  // Montserrat: dilluns i dijous, 6 setmanes.
  const mw0 = U.addDays(U.weekStart(today), -42);
  for (let w = 0; w < 6; w++) {
    for (const off of [0, 3]) {
      const date = U.addDays(mw0, w * 7 + off);
      if (date >= today) continue;
      session(montse, date, 'Richy', 'Autonomia · força i equilibri', {
        mob: { focus: 'Turmell', items: [['X-MOB-12'], ['X-MOB-09']] },
        act: { focus: 'Glutis', items: [['X-ACT-04'], ['X-ACT-14']] },
        pot: { focus: 'Velocitat', items: [['X-POT-08', { load: '2', sets: '2', reps: '6' }]] },
        for: { focus: 'Cos sencer', items: [['X-FOR-03', { load: String(4 + Math.floor(w / 2) * 2), reps: '8', intensity: 'RIR 3', note: 'Squat a cadira.' }], ['X-FOR-06', { reps: '6/cama', load: '0', intensity: 'RIR 3', note: 'Esglaó de 15 cm amb suport.' }], ['X-FOR-21', { reps: '8', intensity: 'RIR 3' }]] },
        acc: { focus: 'Equilibri', items: [['X-ACC-12', { sets: '2', reps: '6/cama', note: 'Amb suport a la paret.' }], ['X-ACC-14', { load: '0', sets: '2', reps: '10/cama' }]] },
        cal: { focus: 'Respiració', items: [['X-CAL-03']] },
      }, { rpe: 5 + (w > 3 ? 1 : 0), min: 50, pain: 0, sleep: 3, energy: 4,
        decision: w > 3 ? 'Afegir exercici d\'equilibri amb ulls tancats.' : '' });
    }
  }
  session(montse, today, 'Richy', 'Autonomia · força i equilibri', {
    mob: { focus: 'Turmell', items: [['X-MOB-12'], ['X-MOB-09']] },
    act: { focus: 'Glutis', items: [['X-ACT-04'], ['X-ACT-14']] },
    pot: { focus: 'Velocitat', items: [['X-POT-08', { load: '2', sets: '2', reps: '6' }]] },
    for: { focus: 'Cos sencer', items: [['X-FOR-03', { load: '10', reps: '8', intensity: 'RIR 3', note: 'Squat a cadira.' }], ['X-FOR-06', { reps: '6/cama', load: '0', intensity: 'RIR 3', note: 'Esglaó de 20 cm.' }], ['X-FOR-21', { reps: '8', intensity: 'RIR 3' }]] },
    acc: { focus: 'Equilibri', items: [['X-ACC-12', { sets: '2', reps: '6/cama' }], ['X-ACC-14', { load: '0', sets: '2', reps: '10/cama' }]] },
    cal: { focus: 'Respiració', items: [['X-CAL-03'], ['X-CAL-06']] },
  }, null);

  // Àlex: primera sessió planificada per demà.
  session(alex, D(1), 'Arnau', 'Sessió 1 · tècnica i adductors', {
    mob: { focus: 'Maluc', items: [['X-MOB-02'], ['X-MOB-11'], ['X-MOB-08']] },
    act: { focus: 'Adductors', items: [['X-ACT-07', { sets: '3', reps: '20 s/costat' }], ['X-ACT-02']] },
    pot: { focus: 'Salts', items: [['X-POT-01'], ['X-POT-11']] },
    for: { focus: 'Dominant de maluc', items: [['X-FOR-10', { load: '100', intensity: 'RIR 2' }], ['X-FOR-08', { load: '120', intensity: 'RIR 2' }], ['X-FOR-04', { load: '20', intensity: 'RIR 2' }], ['X-FOR-17', { intensity: 'RIR 2' }]] },
    acc: { focus: 'Politja cònica', items: [['X-ACC-03'], ['X-ACC-15'], ['X-ACC-16']] },
    cal: { focus: 'Respiració', items: [['X-CAL-01'], ['X-CAL-05']] },
  }, null);

  return db;
}

// Encoder del back squat de la Laura: la velocitat de la 1a repetició millora setmana a setmana.
function demoVbt(kg) {
  const v1 = Math.round((0.62 + ((Number(kg) - 40) / 2.5) * 0.035) * 100) / 100;
  const set = () => ({ kg: String(kg), reps: '6', v1: String(v1).replace('.', ','), vlast: String(Math.round(v1 * 80) / 100).replace('.', ',') });
  return { mode: 'encoder', sets: [set(), set(), set()] };
}

// Pla d'exemple per a la Laura: 12 sessions des d'avui, amb la sessió d'avui com a S1 i un nivell més cada 4 sessions.
function addDemoPlan(db, today) {
  const pid = 'P-DEMO-LAURA';
  if (!db.patients[pid] || Object.values(db.templates || {}).some((t) => t.kind === 'plan' && t.patientId === pid)) return;
  const mine = Object.values(db.sessions).filter((s) => s.patientId === pid).sort((a, b) => (a.date < b.date ? -1 : 1));
  const s1 = mine.find((s) => s.date >= today) || mine[mine.length - 1];
  if (!s1) return;
  const phase = (n) => (n <= 4 ? 'Força' : n <= 8 ? 'Potència' : n <= 11 ? 'Transferència' : 'Descàrrega');
  const sessions = [];
  let blocks = cloneBlocks(s1.blocks, true);
  for (let n = 1; n <= 12; n++) {
    if (n > 1) {
      blocks = cloneBlocks(blocks, true);
      if ((n - 1) % 4 === 0) progressBlocks(blocks);
    }
    sessions.push({ id: `PS-DEMO-${n}`, n, phase: phase(n), goal: '', blocks });
  }
  db.templates = db.templates || {};
  db.templates['PL-DEMO-LAURA'] = { id: 'PL-DEMO-LAURA', kind: 'plan', patientId: pid, name: 'Bloc 2 · força i potència', goal: 'Tornar a competir en trail de 42 km',
    start: s1.date, days: [1, 3, 5], sessions, createdAt: `${s1.date}T08:00:00.000Z` };
  s1.planId = 'PL-DEMO-LAURA';
  s1.planN = 1;
}
