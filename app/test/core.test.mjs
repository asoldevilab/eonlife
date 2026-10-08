// Tests dels càlculs i de les dades.  node --test app/test/
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load-core.mjs';

const C = loadCore();
const { U, Calc, Flat } = C;

test('números en format català', () => {
  assert.equal(U.num('12,5'), 12.5);
  assert.equal(U.num(' 7 '), 7);
  assert.equal(U.num(''), null);
  assert.equal(U.num('abc'), null);
  assert.equal(U.fmt(12.345, 1), '12,3');
  assert.equal(U.fmt(null), '—');
  assert.equal(U.fmtSigned(-2.5), '−2,5');
});

test('dates', () => {
  assert.equal(U.weekStart('2026-10-01'), '2026-09-28'); // dijous → dilluns
  assert.equal(U.addMonths('2026-01-31', 1), '2026-02-28');
  assert.equal(U.fmtDateLong('2026-10-06'), 'dimarts, 6 d\'octubre de 2026');
  assert.equal(U.fmtDateLong('2026-09-28', false), '28 de setembre de 2026');
  assert.equal(U.age('1991-04-12', '2026-09-28'), 35);
});

test('asimetria', () => {
  const a = Calc.asym(312, 368);
  assert.equal(Math.round(a.pct * 10) / 10, 15.2);
  assert.equal(Calc.asymTone(a.pct), 'bad');
  assert.equal(Calc.asymTone(12), 'warn');
  assert.equal(Calc.asymTone(5), 'ok');
  assert.equal(Calc.asym('', 3), null);
});

test('Y-Balance composite', () => {
  const y = Calc.ybt({ ybt: { d: { ant: '58', pm: '92', pl: '88', len: '86' }, e: { ant: '63', pm: '95', pl: '91', len: '86' } } });
  assert.equal(Math.round(y.d.comp * 10) / 10, 92.2);
  assert.equal(Math.round(y.e.comp * 10) / 10, 96.5);
  assert.equal(y.antDiff, 5);
});

test('salts: millor i mitjana per tipus', () => {
  const j = Calc.jumps({ general: { weight: '58' }, jumps: { attempts: [
    { type: 'CMJ', height: '27,8', power: '2240' }, { type: 'CMJ', height: '28.4', power: '2290' }, { type: 'SJ', height: '25' },
  ] } });
  assert.equal(j.CMJ.best, 28.4);
  assert.equal(j.CMJ.n, 2);
  assert.equal(Math.round(j.CMJ.mean * 100) / 100, 28.1);
  assert.equal(Math.round(j.CMJ.relPower * 10) / 10, 39.5);
  assert.equal(j.SJ.best, 25);
});

test('patrons: unilaterals es queden amb el pitjor costat', () => {
  assert.equal(Calc.patternScore({ sd: '0', se: '--' }, true), '--');
  assert.equal(Calc.patternScore({ sd: '-', se: '' }, true), '-');
  const s = Calc.patterns({ patterns: { squat: { score: '0' }, lunge: { sd: '0', se: '-' }, copenhagen: { sd: '0', se: '0', pain: true } } });
  assert.deepEqual({ ...s.counts }, { '0': 2, '-': 1, '--': 0, P: 1 });
});

test('punts d\'atenció', () => {
  const alerts = Calc.alerts({
    values: { wblt: { d: '7', e: '11' }, dyn_knee_ext: { d: '312', e: '368' }, rom_knee_ext: { d: '0', e: '1' }, thomas: { d: 'Positiu · psoes ilíac', e: 'Negatiu' } },
    ybt: { d: { ant: '58' }, e: { ant: '63' } },
    patterns: { copenhagen: { sd: '0', se: '0', pain: true } },
  });
  const text = alerts.map((a) => a.text).join('\n');
  assert.match(text, /Dorsiflexió de turmell limitada \(dreta\)/);
  assert.match(text, /Diferència de 4 cm entre turmells/);
  assert.match(text, /Leg extension · quàdriceps: 15 %/);
  assert.match(text, /Y-Balance: diferència de 5 cm/);
  assert.match(text, /Copenhagen Plank: dolor/);
  assert.match(text, /Test de Thomas positiu \(dreta\)/);
  assert.doesNotMatch(text, /Extensió de genoll/); // només diferència, no percentatge
  assert.equal(alerts[0].tone, 'bad');
});

test('prescripció', () => {
  assert.equal(Calc.presc({ sets: '3', reps: '6', load: '60', intensity: 'RIR 2', rest: '90 s' }), '3 × 6 · 60 kg · RIR 2 · desc. 90 s');
  assert.equal(Calc.load('52.5'), '52,5 kg');
  assert.equal(Calc.load('0'), '');
  assert.equal(Calc.presc({ sets: '2', reps: '10', load: '30-30Kg' }), '2 × 10 · 30-30Kg');
  assert.equal(Calc.presc({ reps: '10\'' }), '10\'');
});

test('càrrega de sessió = RPE × minuts', () => {
  assert.equal(Calc.sessionLoad({ feedback: { rpe: '7', duration: '60' } }), 420);
  assert.equal(Calc.sessionLoad({ feedback: { rpe: '7' } }), null);
});

test('dades de demostració coherents', () => {
  const db = C.makeDemoData();
  const patients = Object.values(db.patients);
  const sessions = Object.values(db.sessions);
  const assessments = Object.values(db.assessments);
  assert.equal(patients.length, 4);
  assert.ok(sessions.length > 20);
  assert.ok(assessments.length >= 5);
  for (const s of sessions) {
    assert.equal(s.blocks.length, 6);
    assert.ok(db.patients[s.patientId]);
    for (const b of s.blocks) for (const it of b.items) assert.ok(it.name, `exercici sense nom a ${s.id}`);
  }
  const today = U.today();
  assert.ok(sessions.some((s) => s.date === today && s.status === 'planificada'));
});

test('columnes per al full de càlcul', () => {
  const db = C.makeDemoData();
  const a = Object.values(db.assessments).find((x) => x.patientId === 'P-DEMO-LAURA' && x.type === 'inicial');
  Flat.strict = true;
  const flat = Flat.assessment(a, db.patients['P-DEMO-LAURA']);
  for (const x of Object.values(db.assessments)) Flat.assessment(x, db.patients[x.patientId]);
  Flat.strict = false;
  assert.equal(flat['Pacient'], 'Laura Vidal Serra');
  assert.equal(flat['Knee-to-wall D (cm)'], 7);
  assert.equal(flat['Knee-to-wall diferència (cm)'], -4);
  assert.equal(flat['ROM RE espatlla asimetria (%)'], 2.97);
  assert.equal(flat['Força curl 90/90 D (N)'], 190);
  // Els tests que ja no es fan no tenen columna, si la valoració no en té dades; si en té (una d'abans), sí.
  assert.ok(!('Força RI maluc D (N)' in flat) && !('Força curl 30/30 D (N)' in flat) && !Object.keys(flat).some((k) => /^Encoder /.test(k)));
  const old = Flat.assessment({ ...a, values: { ...a.values, dyn_hip_ir: { d: '150', e: '158' } }, encoder: { rows: [{ name: 'Squat', load: '40', vel: '0.78' }] } }, db.patients['P-DEMO-LAURA']);
  assert.equal(old['Força RI maluc D (N)'], 150);
  assert.equal(old['Encoder Squat càrrega (kg)'], 40);
  assert.equal(flat['RPE de la valoració (1-10)'], '');
  assert.equal(Flat.assessment({ ...a, rpe: '7' }, db.patients['P-DEMO-LAURA'])['RPE de la valoració (1-10)'], 7);
  assert.equal(flat['CMJ millor altura (cm)'], 28.4);
  assert.equal(flat['YBT composite D (%)'], 92.25);
  assert.equal(flat['Squat (puntuació)'], '−');
  assert.equal(typeof flat['Força quàdriceps D (N/kg)'], 'number');
  assert.ok(!('ROM extensió genoll diferència (°)' in flat));
  assert.ok('Knee-to-wall diferència (cm)' in flat);
  const s = Object.values(db.sessions).find((x) => x.patientId === 'P-DEMO-LAURA' && x.status === 'feta');
  const rows = Flat.sessionLog(s, db.patients['P-DEMO-LAURA']);
  assert.ok(rows.length > 8);
  assert.match(rows[0]['Ordre'], /^1\.1$/);
  const fs = Flat.session(s, db.patients['P-DEMO-LAURA']);
  assert.equal(typeof fs['Càrrega (UA)'], 'number');
});

test('importació CSV de My Jump', () => {
  const csv = [
    'FECHA / HORA;TIPO DE PRUEBA / SALTO;ALTURA CAJÓN (m);CARGA (kg);ALTURA SALTO (cm);RSI MOD (m/s);FUERZA (N);VELOCIDAD (m/s);POTENCIA (W);ÍNDICE FUERZA REACTIVA',
    '28/09/2026 10:00;CMJ;---;0;31,2;0,45;1400;1,25;2400;---',
    '28/09/2026 10:02;CMJ;---;0;32,0;0,47;1420;1,27;2450;---',
    '28/09/2026 10:05;SJ;---;0;29,1;---;1350;1,2;2300;---',
  ].join('\n');
  const r = C.parseMyJumpCsv(csv);
  assert.equal(r.error, null);
  assert.equal(r.attempts.length, 3);
  assert.equal(r.attempts[0].type, 'CMJ');
  assert.equal(r.attempts[0].height, '31,2');
  assert.equal(r.attempts[0].force, '1400');
  assert.equal(r.attempts[2].type, 'SJ');
  assert.equal(r.attempts[2].rsimod, '');
  const en = C.parseMyJumpCsv('Date,Test,Jump height (cm),Force (N),Velocity (m/s),Power (W)\n2026-09-28,CMJ Free,35.1,1500,1.3,2600');
  assert.equal(en.attempts[0].type, 'CMJ lliure');
  assert.equal(en.attempts[0].height, '35.1');
});

test('mode local: cada canvi es desa al navegador a l\'instant', async () => {
  const core = loadCore();
  await core.LocalBackend.init();
  core.LocalBackend.save('patients', { id: 'P-INSTANT', firstName: 'Prova' });
  const raw = core.__storage.get('eonlife:data:v1');
  assert.ok(raw && raw.includes('P-INSTANT'), 'no s\'ha desat de seguida');
});

test('base de dades: totes les taules es poden calcular amb les dades de prova', async () => {
  const core = loadCore();
  await core.Store.init();
  for (const t of core.DB_TABLES) {
    const cols = core.DB.COLUMNS[t.id]();
    const rows = core.DB.withData(t.id, core.DB.rows(t.id), cols);
    assert.ok(cols.length > 2, `${t.id}: columnes`);
    for (const r of rows) for (const c of cols) {
      assert.doesNotThrow(() => { c.get(r); core.DB.csvValue(c, r); }, `${t.id}.${c.id}`);
    }
  }
});

test('base de dades: dinamometria i Y-Balance', async () => {
  const core = loadCore();
  await core.Store.init();
  const cols = core.DB.COLUMNS.dinamometria();
  const rows = core.DB.withData('dinamometria', core.DB.rows('dinamometria'), cols);
  const laura = core.DB.sortRows(rows.filter((r) => r.p.id === 'P-DEMO-LAURA'), cols.find((c) => c.id === 'date'), 1)[0];
  const col = (id) => cols.find((c) => c.id === id);
  assert.equal(col('dyn_knee_ext.d').get(laura), 312);
  assert.equal(Math.round(col('dyn_knee_ext.asym').get(laura)), 15);
  assert.equal(col('dyn_knee_ext.asym').tone(laura, col('dyn_knee_ext.asym').get(laura)), 'bad');
  assert.equal(core.DB.header(col('dyn_knee_ext.dkg')), 'Quàdriceps · D (N/kg)');
  // Y-Balance: la Montserrat no en té, i no ha de sortir a la taula.
  const ycols = core.DB.COLUMNS.ybalance();
  const yrows = core.DB.withData('ybalance', core.DB.rows('ybalance'), ycols);
  assert.ok(yrows.length >= 3);
  assert.ok(!yrows.some((r) => r.p.id === 'P-DEMO-MONTSE'));
  // Patrons: l'exportació fa servir els símbols de puntuació.
  const pcols = core.DB.COLUMNS.patrons();
  const prow = core.DB.rows('patrons').find((r) => r.p.id === 'P-DEMO-JORDI');
  assert.equal(core.DB.csvValue(pcols.find((c) => c.id === 'lunge'), prow), '−−');
});

test('informe de la doctora: cada apartat al seu camp', () => {
  const { DoctorReport } = loadCore();
  const r = DoctorReport.parse(`INFORME MÈDIC
Pacient: Laura Vidal
Data: 28/09/2026
Motiu de consulta: Dolor anterior de genoll dret en córrer.
ANTECEDENTS
- Al·lèrgies: no conegudes
- Esguinç de turmell esquerre (2019)
Diagnòstic: Síndrome femoropatel·lar
Intervenció quirúrgica: Artroscòpia de menisc intern dret 12/03/2024
Lesió: distensió d'isquiotibials, 05-09-26
Objectiu: Tornar a córrer la marató sense dolor.
Recomanacions: evitar salts 15 dies.`);
  assert.equal(r.reason, 'Dolor anterior de genoll dret en córrer.');
  assert.equal(r.goal, 'Tornar a córrer la marató sense dolor.');
  assert.match(r.history, /^Diagnòstic: Síndrome femoropatel·lar/);
  assert.match(r.history, /Al·lèrgies: no conegudes/);
  assert.doesNotMatch(r.history, /Laura Vidal|INFORME/);
  assert.equal(r.surgeryDate, '2024-03-12');
  assert.equal(r.surgeryNote, 'Artroscòpia de menisc intern dret');
  assert.equal(r.injuryDate, '2026-09-05');
  assert.match(r.notes, /evitar salts/);
  // En castellà i amb guions.
  const e = DoctorReport.parse('Motivo de consulta: lumbalgia\nAntecedentes personales: HTA\nObjetivo - mejorar fuerza');
  assert.equal(e.reason, 'lumbalgia');
  assert.equal(e.history, 'HTA');
  assert.equal(e.goal, 'mejorar fuerza');
});

test('encoder: pèrdua de velocitat, resum i columnes del registre', () => {
  const { Calc, Flat } = loadCore();
  const it = { name: 'Back squat', sets: '3', reps: '5', vbt: { mode: 'encoder', sets: [
    { kg: '80', reps: '5', v1: '0,80', vlast: '0,64', pmax: '820' },
    { kg: '85', reps: '5', v1: '0,72', vlast: '0,60', vl: '15' },
    {},
  ] } };
  assert.equal(Math.round(Calc.vl(it.vbt.sets[0])), 20);
  const v = Calc.vbt(it);
  assert.equal(v.sets, 2);
  assert.equal(v.v1, 0.8);
  assert.equal(v.vl, 17.5);
  assert.equal(v.pmax, 820);
  assert.equal(v.text, 'V 1a rep 0,80 m/s · PV 18 % · 820 W');
  const row = Flat.sessionLog({ blocks: [{ key: 'for', items: [it] }] }, { firstName: 'X' })[0];
  assert.equal(row['Encoder · V 1a rep millor (m/s)'], 0.8);
  assert.equal(row['Encoder · pèrdua de velocitat (%)'], 17.5);
  assert.match(row['Encoder / salts · detall'], /S1: 80 kg ×5 0,80→0,64 m\/s PV 20 % 820 W/);
  const j = Calc.vbt({ vbt: { mode: 'salts', sets: [{ reps: '3', h: '34,5', hmean: '32', rsi: '1,8' }] } });
  assert.equal(j.text, 'Salt millor 34,5 cm · mitjana 32 cm · RSI 1,80');
  assert.equal(Calc.vbt({ name: 'x' }), null);
});

test('professionals del centre i servei del client', () => {
  const { Flat, OPT, migrateDemo, makeDemoData } = loadCore();
  const db = makeDemoData();
  const profs = new Set(Object.values(db.patients).map((p) => p.professional));
  assert.ok(!profs.has('Pau Roca') && !profs.has('Marta Soler'));
  assert.deepEqual(Array.from(db.settings.professionals), ['Ricardo Villamizar', 'Arnau', 'Oriol Pastor (fisioteràpia)']);
  assert.deepEqual(Array.from(OPT.services, (o) => o.label), ['Valoració inicial (Membership)', 'Bo (pacient puntual)']);
  assert.equal(Flat.patient({ service: 'membership' }).Servei, 'Valoració inicial (Membership)');
  assert.equal(Flat.patient({ service: 'bo' }).Servei, 'Bo (pacient puntual)');
  // Dades de prova antigues guardades a la tauleta.
  const old = { demo: true, patients: { 'P-DEMO-LAURA': { professional: 'Pau Roca' } }, assessments: {}, sessions: { s: { professional: 'Marta Soler' } },
    settings: { professionals: ['Pau Roca', 'Marta Soler'] } };
  migrateDemo(old);
  assert.equal(old.patients['P-DEMO-LAURA'].professional, 'Arnau');
  assert.equal(old.patients['P-DEMO-LAURA'].service, 'membership');
  assert.equal(old.sessions.s.professional, 'Ricardo Villamizar');
  assert.deepEqual(Array.from(old.settings.professionals), ['Ricardo Villamizar', 'Arnau', 'Oriol Pastor (fisioteràpia)']);
});

test('subblocs d\'un bloc: ordre, Excel i còpia a la sessió següent', () => {
  const { Calc, Flat, cloneBlocks } = loadCore();
  const b = {
    key: 'for',
    groups: [{ id: 'G1', name: '' }, { id: 'G2', name: 'Superset · 3 voltes' }],
    items: [
      { id: 'a', name: 'Back squat', sets: '3', reps: '6', g: 'G1' },
      { id: 'c', name: 'Hip thrust', sets: '3', reps: '8', g: 'G2' },
      { id: 'b', name: 'Step-up', sets: '3', reps: '6', g: 'G1', video: 'https://x.test/v.mp4', vbt: { mode: 'encoder', sets: [{ v1: '0,8' }] }, done: true },
      { id: 'd', name: 'Copenhagen', sets: '2', reps: '20"' },
    ],
  };
  Calc.sortByGroups(b);
  assert.deepEqual(Array.from(b.items, (x) => x.id), ['a', 'b', 'd', 'c']);
  const gs = Calc.groups(b);
  assert.deepEqual(Array.from(gs, (x) => x.label), ['Bloc 1', 'Bloc 2 · Superset · 3 voltes']);
  assert.deepEqual(Array.from(gs, (x) => Array.from(x.items, (y) => y.it.id)), [['a', 'b', 'd'], ['c']]);
  assert.equal(Calc.groups({ items: [{ name: 'x' }] }), null);

  const log = Flat.sessionLog({ blocks: [b] }, { firstName: 'X' });
  assert.deepEqual(Array.from(log, (r) => r.Subbloc), ['Bloc 1', 'Bloc 1', 'Bloc 1', 'Bloc 2 · Superset · 3 voltes']);
  const row = Flat.session({ blocks: [b] }, { firstName: 'X' });
  assert.match(row['Força principal · exercicis'], /^Bloc 1: Back squat 3 × 6 \| Step-up 3 × 6 \| Copenhagen 2 × 20" ‖ Bloc 2 · Superset · 3 voltes: Hip thrust 3 × 8$/);

  // «Copia l'última sessió»: es mantenen els subblocs, però no el registre de l'encoder ni el vídeo del client.
  const copy = cloneBlocks([b], true).find((x) => x.key === 'for');
  assert.deepEqual(Array.from(copy.groups, (g) => g.id), ['G1', 'G2']);
  assert.deepEqual(Array.from(copy.items, (x) => x.g), ['G1', 'G1', undefined, 'G2']);
  const st = copy.items.find((x) => x.name === 'Step-up');
  assert.equal(st.vbt, undefined);
  assert.equal(st.video, undefined);
  assert.equal(st.done, false);
  assert.notEqual(st.id, 'b');
});

test('progressions de la biblioteca, pla d\'entrenament i progrés entre sessions', () => {
  const { Store, Calc, Flat, progressBlocks, makeDemoData } = loadCore();
  const ladder = Store.ladder('Squat bilateral');
  assert.deepEqual(Array.from(ladder, (e) => e.name), ['Squat a caixa amb pes corporal', 'Goblet squat', 'Back squat', 'Front squat', 'Back squat amb pausa']);
  assert.equal(Store.stepLevel(Store.exercise('X-FOR-03'), 1).name, 'Back squat');
  assert.equal(Store.stepLevel(Store.exercise('X-FOR-22'), -1), null);
  // Totes les famílies tenen nivells seguits des de l'1.
  for (const [name, list] of Object.entries(Store.families())) {
    assert.deepEqual(Array.from(Store.ladder(name), (e) => e.level), Array.from(list, (_, i) => String(i + 1)), name);
  }

  // Dates previstes: des de dijous 1/10/2026, dilluns, dimecres i divendres.
  assert.deepEqual(Array.from(Calc.planDates({ start: '2026-10-01', days: [1, 3, 5] }, 4)), ['2026-10-02', '2026-10-05', '2026-10-07', '2026-10-09']);

  // Pujar un nivell: Goblet squat → Back squat; la prescripció es manté i la càrrega es treu.
  const blocks = [{ key: 'for', items: [{ id: 'i', exId: 'X-FOR-03', name: 'Goblet squat', sets: '4', reps: '5', load: '24' }, { id: 'j', name: 'Exercici lliure' }] }];
  assert.equal(progressBlocks(blocks), 1);
  assert.equal(blocks[0].items[0].name, 'Back squat');
  assert.equal(blocks[0].items[0].exId, 'X-FOR-01');
  assert.equal(blocks[0].items[0].reps, '5');
  assert.equal(blocks[0].items[0].load, '');

  // Pla de la demostració: 12 sessions i el back squat progressa cada 4 sessions.
  const db = makeDemoData();
  const plan = db.templates['PL-DEMO-LAURA'];
  assert.equal(plan.sessions.length, 12);
  const sq = (n) => plan.sessions[n - 1].blocks.find((b) => b.key === 'for').items[0].name;
  assert.deepEqual([sq(1), sq(5), sq(9)], ['Back squat', 'Front squat', 'Back squat amb pausa']);
  assert.equal(Object.values(db.sessions).filter((s) => s.planId === plan.id).length, 1);
  assert.equal(Flat.template(plan).Tipus, 'Pla');

  // Progrés: mateix exercici (quilos i velocitat) i mateixa família (nivells).
  const enc = (kg, v1) => ({ mode: 'encoder', sets: [{ kg: String(kg), reps: '5', v1 }] });
  const from = { blocks: [{ key: 'for', items: [
    { name: 'Press de banca', exId: 'X-FOR-13', load: '40', vbt: enc(40, '0,50') },
    { name: 'Goblet squat', exId: 'X-FOR-03', load: '20' },
    { name: 'Dead bug', exId: 'X-ACT-01' },
  ] }] };
  const to = { blocks: [{ key: 'for', items: [
    { name: 'Press de banca', exId: 'X-FOR-13', load: '40', vbt: enc(40, '0,80') },
    { name: 'Front squat', exId: 'X-FOR-02', load: '40' },
    { name: 'Hip thrust', exId: 'X-FOR-08', load: '60' },
  ] }] };
  const res = Calc.progress(from, to, (id) => Store.exercise(id));
  const [bench, squat, hip] = res.blocks[0].rows;
  assert.equal(bench.match, 'name');
  assert.equal(bench.v1.diff, 0.3);
  assert.equal(bench.kg.diff, 0);
  assert.equal(squat.match, 'family');
  assert.equal(squat.level.diff, 2);
  assert.equal(squat.kg.diff, null);
  assert.equal(hip.match, 'pos');
  assert.equal(res.summary.levelUp, 1);
  assert.equal(res.summary.speedUp, 1);
  assert.equal(Calc.kg({ load: '2 × 16 kg' }), 16);
});

test('mètodes d\'entrenament al bloc i al subbloc (Excel)', () => {
  const { Flat, Store } = loadCore();
  assert.ok(Store.methods('for').some((m) => m.name === 'Clúster'));
  assert.ok(!Store.methods('cal').some((m) => m.name === 'Clúster'));
  const b = { key: 'for', method: 'M-07', methodName: 'Contrast (PAPE)', groups: [{ id: 'G1', name: '' }, { id: 'G2', name: '', method: 'M-03', methodName: 'Clúster' }],
    items: [{ id: 'a', name: 'Back squat', g: 'G1' }, { id: 'b', name: 'Hip thrust', g: 'G2' }] };
  const log = Flat.sessionLog({ blocks: [b] }, { firstName: 'X' });
  assert.deepEqual(Array.from(log, (r) => r['Mètode']), ['Contrast (PAPE)', 'Clúster']);
  assert.equal(Flat.session({ blocks: [b] }, { firstName: 'X' })['Força principal · mètode'], 'Contrast (PAPE) · Bloc 2: Clúster');
  assert.equal(Flat.template(Store.methods().find((m) => m.id === 'M-03')).Tipus, 'Mètode');
});

test('material del centre i músculs de la biblioteca', () => {
  const { SEED_EXERCISES, OPT, Store } = loadCore();
  const muscles = new Set(OPT.gm);
  for (const e of SEED_EXERCISES) {
    if (e.gm) assert.ok(muscles.has(e.gm), `${e.name}: múscul ${e.gm}`);
    for (const m of e.muscles || []) assert.ok(muscles.has(m), `${e.name}: múscul ${m}`);
    if (e.material) assert.equal(e.materials[0], e.material, `${e.name}: el material per defecte va primer`);
    assert.ok(!['Barra', 'KB', 'Mancuernes', 'Politja'].includes(e.material), `${e.name}: material antic ${e.material}`);
  }
  const byGm = (m) => SEED_EXERCISES.filter((e) => e.gm === m || (e.muscles || []).includes(m)).length;
  for (const m of ['Bíceps', 'Tríceps', 'Deltoides', 'Pectoral', 'Dorsal', 'Quàdriceps', 'Isquiotibials', 'Bessons i soli']) assert.ok(byGm(m) >= 3, m);
  const center = Store.materials().center;
  for (const m of ['Barra olímpica (20-25 kg)', 'Politja cònica isoinercial', 'Keiser (pneumàtica)', 'kBox Lite Exxentric', 'Banc GHD', 'AlterG']) assert.ok(center.includes(m), m);
  assert.ok(!Store.materials().other.includes('Barra olímpica (20-25 kg)'));
  const squat = SEED_EXERCISES.find((e) => e.id === 'X-FOR-01');
  assert.deepEqual(Array.from(squat.materials).slice(0, 3), ['Barra olímpica (20-25 kg)', 'Mancuernes Technogym', 'Kettlebell']);
});

test('exercicis de la loop band de Technogym', () => {
  const { SEED_EXERCISES, Store } = loadCore();
  const lb = SEED_EXERCISES.filter((e) => e.material === 'Loop band Technogym');
  assert.equal(lb.length, 50);
  assert.equal(new Set(lb.map((e) => e.tg)).size, 50);
  assert.ok(lb.every((e) => e.gm && e.tg && e.materials.includes('Goma elàstica')));
  assert.deepEqual(Array.from(Store.ladder('Loop band · crunch'), (e) => e.tg),
    ['Crunch with knees raised - band at knees', 'Crunch with knees raised - band at ankles', 'Crunch with knee tuck - band at ankles', 'Bicycle crunch', 'Crunch with raised straight legs - band at ankles']);
  assert.ok(Store.materials().center.includes('Loop band Technogym'));
});

test('exercicis de kettlebell, mobility ball, Power Personal i mancuernes de Technogym', () => {
  const { SEED_EXERCISES, Store } = loadCore();
  const count = (m) => SEED_EXERCISES.filter((e) => e.material === m);
  assert.equal(count('Kettlebell').filter((e) => e.id.startsWith('X-KB-')).length, 50);
  assert.equal(count('Mobility ball Technogym').filter((e) => e.id.startsWith('X-MB-')).length, 9);
  assert.equal(count('Power Personal Technogym').filter((e) => e.id.startsWith('X-PP-')).length, 38);
  assert.equal(SEED_EXERCISES.filter((e) => e.id.startsWith('X-DB-') && e.material === 'Mancuernes Technogym').length, 51);
  const tg = SEED_EXERCISES.filter((e) => /^X-(KB|MB|PP|DB)-/.test(e.id));
  assert.ok(tg.every((e) => e.tg && e.gm && e.materials[0] === e.material));
  assert.ok(tg.filter((e) => e.id.startsWith('X-MB-')).every((e) => e.block === 'mob'));
  assert.equal(new Set(SEED_EXERCISES.map((e) => e.name)).size, SEED_EXERCISES.length);
  assert.ok(Store.materials().center.includes('Power Personal Technogym'));
});

test('miniatures: cada exercici té un pictograma propi amb el material', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/js/15-pics.js', import.meta.url), 'utf8');
  const { SEED_EXERCISES } = loadCore();
  const P = new Function('U', `${src}\nreturn { PICS, picKeyOf, picGearOf, exercisePicSvg };`)(U);
  const keyOf = (name, extra = {}) => P.picKeyOf({ name, ...extra });
  for (const e of SEED_EXERCISES) {
    const k = P.picKeyOf(e);
    assert.ok(P.PICS[k], `${e.name} → ${k}`);
    const svg = P.exercisePicSvg(e);
    assert.ok(svg.startsWith('<svg') && !/NaN|undefined/.test(svg), e.name);
  }
  assert.equal(keyOf('Back squat'), 'squat_back');
  assert.equal(keyOf('Front squat al Power Personal'), 'squat');
  assert.equal(keyOf('Press de banca'), 'bench');
  assert.equal(keyOf('Dominades'), 'pullup');
  assert.equal(keyOf('Dead bug'), 'deadbug');
  assert.equal(keyOf('Kettlebell swing'), 'swing');
  assert.equal(keyOf('Pont de glutis amb loop band'), 'bridge');
  assert.equal(keyOf('Flexions de maluc alternes en planxa · banda als peus'), 'climber');
  assert.equal(keyOf('Crunch bicicleta amb loop band'), 'crunch_legs');
  assert.equal(keyOf('Bike suau'), 'bike');
  assert.equal(keyOf('Alliberament miofascial del quàdriceps · cercles'), 'roll_prone');
  assert.equal(keyOf('Exercici nou', { gm: 'Bíceps' }), 'curl');
  assert.equal(keyOf('Back squat', { pic: 'bench' }), 'bench');
  // Revisió dels dibujos: cada exercici amb la postura que toca
  assert.equal(keyOf('Curl femoral amb lliscadors Flowin'), 'slide_curl');
  assert.equal(keyOf('Curl femoral amb fitball'), 'bridge_ball');
  assert.equal(keyOf('Kettlebell snatch'), 'ohpress');
  assert.equal(keyOf('Arrencada completa (snatch)'), 'squat_oh');
  assert.equal(keyOf('Flexions inclinades (mans elevades)'), 'pushup_incline');
  assert.equal(keyOf('Elevació de talons amb genoll flexionat (soli)'), 'calf_bent');
  assert.equal(keyOf('Elevació de talons bipodal'), 'calf');
  assert.equal(keyOf('Fons de tríceps al banc'), 'dip');
  assert.ok(/class="pgl"/.test(P.exercisePicSvg({ name: 'Bisagra de maluc amb pica', material: 'Pica' })), 'la pica al llarg de l\'esquena');
  assert.equal(P.picGearOf({ name: 'Curl femoral amb lliscadors Flowin', material: 'Lliscadors Flowin' }, 'slide_curl').kind, 'sliders');
});

test('dibuixos en moviment: posició inicial i final, animació SMIL, isomètrics quiets i inici → final per al paper', async () => {
  const { readFileSync } = await import('node:fs');
  const src = readFileSync(new URL('../src/js/15-pics.js', import.meta.url), 'utf8');
  const { SEED_EXERCISES } = loadCore();
  const win = { matchMedia: () => ({ matches: false }) };
  const P = new Function('U', 'window', 'localStorage', `${src}\nreturn { PICS, picKeyOf, picGearOf, exercisePicSvg, picFrames, picAnimate, picMoves, PIC_CACHE };`)(U, win, { getItem: () => null, setItem() {} });
  const moving = Object.keys(P.PICS).filter((k) => P.PICS[k].from);
  assert.ok(moving.length >= 90, `${moving.length} postures amb moviment`);
  // Cada postura amb moviment fa una animació vàlida (mateixa estructura a tots els fotogrames) que hi cap
  for (const k of moving) {
    const svg = P.exercisePicSvg({ name: 'x' }, k, 'auto');
    assert.ok(/<animate attributeName=/.test(svg), `${k} no es mou`);
    assert.ok(!/NaN|undefined/.test(svg), k);
    const start = P.exercisePicSvg({ name: 'x' }, k, 'start'), end = P.exercisePicSvg({ name: 'x' }, k, 'end');
    assert.ok(!/<animate/.test(start) && !/<animate/.test(end) && start !== end, `${k}: inici i final`);
  }
  // Tots els exercicis de la biblioteca: el dibuix es pot fer (en moviment o quiet)
  for (const e of SEED_EXERCISES) assert.ok(P.exercisePicSvg(e).startsWith('<svg'), e.name);
  assert.equal(P.picKeyOf({ name: 'Flexions' }), 'pushup');
  assert.ok(P.picMoves('pallof', { name: 'Pallof press dinàmic' }));
  assert.ok(!P.picMoves('pallof', { name: 'Pallof press isomètric' }), 'els isomètrics no es mouen');
  assert.ok(!/<animate/.test(P.exercisePicSvg({ name: 'Pallof press isomètric' })));
  assert.ok(!P.picMoves('plank', { name: 'Planxa' }));
  // Estructura diferent entre fotogrames: no s'anima (millor quiet que trencat)
  assert.equal(P.picAnimate(['<svg><path d="M1 1"/></svg>', '<svg><circle r="1"/></svg>']), null);
  assert.equal(P.picGearOf({ name: 'Goblet squat', material: 'Kettlebell' }, 'squat').kind, 'kb');
  assert.equal(P.picGearOf({ name: 'Monster walk · banda als genolls', material: 'Loop band Technogym' }, 'side_step').at, 'knees');
  assert.equal(P.picGearOf({ name: 'Rem inclinat al Power Personal', material: 'Power Personal Technogym' }, 'row').kind, 'bar');
  assert.equal(P.picGearOf({ name: 'Sit-up al Power Personal', material: 'Power Personal Technogym' }, 'crunch').kind, '');
});

test('sessió en blanc sense blocs; plantilla i última sessió només amb els blocs que tenen alguna cosa', async () => {
  const core = loadCore();
  await core.Store.init();
  const { Store } = core;
  // Dates lluny de les sessions de prova (que depenen d'avui), perquè «l'última sessió» sigui la de la plantilla.
  const day = (n) => core.U.addDays(core.U.today(), 400 + n);
  const blank = Store.newSession('P-DEMO-LAURA', { date: day(0), mode: 'blank' });
  assert.equal(blank.blocks.length, 0);
  const t = { id: 'T-X', kind: 'session', name: 'Prova', blocks: [
    { key: 'cal', items: [{ id: 'i1', name: 'Respiració 90/90' }] },
    { key: 'mob', items: [{ id: 'i2', name: 'Cat-camel' }] },
    { key: 'pot', items: [] },
  ] };
  Store.put('templates', t, { immediate: true });
  const fromTpl = Store.newSession('P-DEMO-LAURA', { date: day(1), mode: 'template', templateId: 'T-X' });
  assert.deepEqual(Array.from(fromTpl.blocks, (b) => b.key), ['mob', 'cal']);
  Store.update('sessions', fromTpl.id, (x) => { x.blocks.push({ key: 'acc', focus: '', note: '', items: [] }); });
  const fromLast = Store.newSession('P-DEMO-LAURA', { date: day(2), mode: 'last' });
  assert.deepEqual(Array.from(fromLast.blocks, (b) => b.key), ['mob', 'cal']);
});

test('informe de Kinvent: imatges del PDF, targetes, correcció amb l\'asimetria i camps', async () => {
  const { readFileSync } = await import('node:fs');
  const { KinventPdf } = loadCore('07', {});
  // PDF mínim amb una imatge JPEG (com els de Kinvent Physio, que són pàgines fetes d'imatges).
  const jpg = [0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0xff, 0xd9];
  const enc = (s) => Array.from(s, (c) => c.charCodeAt(0));
  const pdf = new Uint8Array([...enc('%PDF-1.7\n5 0 obj\n<< /Type /XObject /Subtype /Image /Filter /DCTDecode /Length 8 >>\nstream\n'), ...jpg,
    ...enc('\nendstream\nendobj\n6 0 obj\n<< /Length 5 >>\nstream\nBT ET\nendstream\nendobj\n')]);
  const imgs = KinventPdf.jpegs(pdf);
  assert.equal(imgs.length, 1);
  assert.deepEqual(Array.from(imgs[0]), jpg);

  const fx = JSON.parse(readFileSync(new URL('./fixtures/kinvent-ocr.json', import.meta.url), 'utf8'));
  const cards = fx.pages.flatMap((lines) => KinventPdf.cards(lines, fx.width));
  assert.deepEqual(cards.map((c) => c.title), [
    'Rotadores externos en sedestación con abducción de 90° (R3)', 'Rotadores internos en sedestación con abducción de 90°',
    // «Fiexión»: tal com ho llegeix l'OCR (el títol es reconeix igualment).
    'Rotación externa de cadera en sedestación', 'Rotación interna de cadera en sedestación', 'Fiexión de la rodilla',
    'Flexión de la rodilla en decúbito prono con flexión de 90°', 'Aducción de cadera en decúbito supino',
    'Extensión de rodilla en sedestación con flexión de 90°']);
  assert.deepEqual(cards.map((c) => c.measure), ['angle', 'angle', 'angle', 'angle', 'angle', 'force', 'force', 'force']);
  assert.deepEqual(cards.map((c) => c.asym), [17.9, 3.9, 45, 9.2, 1.4, 35.9, 11.9, 3.9]);
  assert.ok(cards.every((c) => c.left && c.right && c.left.x1 < c.right.x0 && c.layout === 'history'));
  assert.deepEqual(cards.map((c) => KinventPdf.target(c.title, c.measure)),
    ['rom_sh_er', 'rom_sh_ir', 'rom_hip_er', 'rom_hip_ir', 'rom_knee_flex', 'dyn_curl_90', 'dyn_squeeze', 'dyn_knee_ext']);

  // Lectures reals de l'OCR (un 6 llegit com a 0 i un punt perdut) → corregides amb l'asimetria.
  const raw = fx.values.rawTesseract, exp = fx.values.expected.map(Number);
  cards.forEach((c, i) => {
    const r = KinventPdf.fixPair(raw[i * 2], raw[i * 2 + 1], c.asym, c.measure);
    assert.equal(r.ok, true, c.title);
    assert.deepEqual([r.e, r.d], [exp[i * 2], exp[i * 2 + 1]], c.title);
  });
  assert.equal(KinventPdf.fixPair('70.2', '92.7', 17.9, 'angle').fixed, true);
  assert.equal(KinventPdf.fixPair('50.0', '92.7', 17.9, 'angle').ok, false);
  assert.equal(KinventPdf.toN(18.6), 182);
  assert.equal(KinventPdf.target('Rotación interna de cadera', 'force'), 'dyn_hip_ir');
  assert.equal(KinventPdf.target('Hip external rotation', 'angle'), 'rom_hip_er');
});

test('informe de Kinvent de poca resolució: etiquetes i asimetries mal llegides, i esquerra i dreta igualment bé', async () => {
  const { readFileSync } = await import('node:fs');
  const { KinventPdf } = loadCore('07', {});
  const fx = JSON.parse(readFileSync(new URL('./fixtures/kinvent-ocr-lowres.json', import.meta.url), 'utf8'));
  const cards = fx.pages.flatMap((lines) => KinventPdf.cards(lines, fx.width));
  assert.deepEqual(cards.map((c) => KinventPdf.target(c.title, c.measure)),
    ['rom_sh_er', 'rom_sh_ir', 'rom_hip_er', 'rom_hip_ir', 'rom_knee_flex', 'dyn_curl_90', 'dyn_squeeze', 'dyn_knee_ext']);
  assert.deepEqual(cards.map((c) => c.asym), [17.9, 3.9, null, 9.2, null, null, 11.9, 3.9]);
  // Cada targeta té les dues bandes, a banda i banda del gràfic (encara que alguna etiqueta no s'hagi llegit bé).
  for (const c of cards) {
    const mid = 0.315 * fx.width, cx = (b) => (b.x0 + b.x1) / 2;
    assert.ok(c.left && c.right && c.layout === 'history', c.title);
    assert.ok(cx(c.left) < mid - 300 && cx(c.right) > mid + 300, c.title);
  }
  // Els valors surten bé; sense asimetria per comprovar-los, queden per revisar.
  cards.forEach((c, i) => {
    const r = KinventPdf.fixPair([fx.reads[i][0], c.lineE], [fx.reads[i][1], c.lineD], c.asym, c.measure);
    assert.deepEqual([r.e, r.d], fx.expected[i], c.title);
    assert.equal(r.ok, c.asym != null, c.title);
  });

  assert.equal(KinventPdf.asymOf('17.9% Asimetría'), 17.9);
  assert.equal(KinventPdf.asymOf('17.97 Asiietria'), 17.9);
  assert.equal(KinventPdf.asymOf('3.9.Asmetna'), 3.9);
  assert.equal(KinventPdf.asymOf('9,2 Asimerna'), 9.2);
  assert.equal(KinventPdf.asymOf('leve : 1 / 10'), null);
  assert.equal(KinventPdf.candidates('7.519', 'force')[0].v, 7.5);
  assert.equal(KinventPdf.candidates('4.8 9', 'force')[0].v, 4.8);
  assert.equal(KinventPdf.target('Rotación intema de cadera en sedestación', 'angle'), 'rom_hip_ir');
  assert.equal(KinventPdf.target('Fhexión de la rodilla', 'angle'), 'rom_knee_flex');
  assert.equal(KinventPdf.fixPair('48.4', '26.6', null, 'angle').ok, false);
  // Cap etiqueta llegida: on són sempre, a sota de «Ángulo máximo» (informe amb la gràfica de l'evolució).
  const [g] = KinventPdf.cards([
    { text: 'Rotación externa de cadera en sedestación 1º y la sesión actual | 5 días', bbox: { x0: 155, y0: 805, x1: 1927, y1: 826 },
      words: [{ text: 'Rotación', bbox: { x0: 155, y0: 805, x1: 250, y1: 826 } }, { text: 'externa', bbox: { x0: 259, y0: 805, x1: 340, y1: 826 } },
        { text: 'de', bbox: { x0: 348, y0: 805, x1: 374, y1: 826 } }, { text: 'cadera', bbox: { x0: 381, y0: 805, x1: 454, y1: 826 } },
        { text: 'en', bbox: { x0: 462, y0: 805, x1: 487, y1: 826 } }, { text: 'sedestación', bbox: { x0: 495, y0: 805, x1: 627, y1: 826 } },
        { text: '1º', bbox: { x0: 1670, y0: 805, x1: 1688, y1: 826 } }, { text: 'y', bbox: { x0: 1695, y0: 805, x1: 1704, y1: 826 } },
        { text: 'la', bbox: { x0: 1711, y0: 805, x1: 1725, y1: 826 } }, { text: 'sesión', bbox: { x0: 1733, y0: 805, x1: 1791, y1: 826 } },
        { text: 'actual', bbox: { x0: 1799, y0: 805, x1: 1854, y1: 826 } }] },
    { text: 'Ángulo máximo Máximo sep 24 - sep 29, 2026', bbox: { x0: 93, y0: 881, x1: 1908, y1: 910 },
      words: [{ text: 'Ángulo', bbox: { x0: 93, y0: 881, x1: 175, y1: 910 } }, { text: 'máximo', bbox: { x0: 185, y0: 881, x1: 280, y1: 910 } },
        { text: 'Máximo', bbox: { x0: 1224, y0: 881, x1: 1317, y1: 910 } }, { text: 'sep', bbox: { x0: 1678, y0: 881, x1: 1715, y1: 910 } }] },
  ], 2000);
  assert.equal(g.title, 'Rotación externa de cadera en sedestación');
  assert.equal(g.layout, 'history');
  assert.ok(g.guessed && Math.abs(g.left.x0 - 209) < 2 && Math.abs(g.right.x1 - 1046) < 2 && Math.abs(g.left.y0 - 1068) < 3);
});

test('informe de Kinvent d\'una sola sessió: «Derecha» a la dreta de la pàgina i una prova d\'un sol valor', async () => {
  const { readFileSync } = await import('node:fs');
  const { KinventPdf } = loadCore('07', {});
  const fx = JSON.parse(readFileSync(new URL('./fixtures/kinvent-ocr-single.json', import.meta.url), 'utf8'));
  const cards = fx.pages.flatMap((lines) => KinventPdf.cards(lines, fx.width));
  assert.deepEqual(cards.map((c) => KinventPdf.target(c.title, c.measure)),
    ['rom_sh_er', 'rom_sh_ir', 'rom_hip_er', 'rom_hip_ir', 'rom_knee_flex', 'dyn_curl_90', 'dyn_squeeze', 'dyn_knee_ext']);
  assert.equal(cards[0].title, 'Rotadores externos en sedestación con abducción de 90° (R3)');
  assert.ok(cards.every((c) => c.layout === 'single'));
  assert.deepEqual(cards.map((c) => c.asym), [11.6, 5.5, null, 29.3, 1.7, 15.1, 0.4, 23.8]);
  // Les etiquetes llegides: «Izquierda» a un sisè de la pàgina i «Derecha» a cinc sisens.
  for (const c of cards.filter((x) => !x.single)) assert.ok(c.left.x1 < 450 && c.right.x0 > 1550, c.title);
  // La rotació externa de maluc només té un valor (sense etiquetes ni asimetria).
  assert.ok(cards[2].single && !cards.filter((c, i) => i !== 2).some((c) => c.single));
  assert.equal(KinventPdf.fixPair(cards[2].lineV, cards[2].lineV, null, 'angle').e, 35.5);
  // La força que la primera lectura ja havia vist (també «25.99» → 25.9).
  for (const i of [5, 6, 7]) {
    const r = KinventPdf.fixPair(cards[i].lineE, cards[i].lineD, cards[i].asym, 'force');
    assert.equal(r.ok, true, cards[i].title);
    assert.deepEqual([r.e, r.d], fx.expected[i], cards[i].title);
  }
});

test('fitxa del client: perfil físic, pes i alçada lligats a les valoracions, i columnes de l\'Excel', async () => {
  const core = loadCore();
  await core.Store.init();
  const { Store, Calc, Flat } = core;
  const p = { id: 'P-PROVA', firstName: 'Prova', height: '170', weight: '65', dominance: 'E', activityLevel: 'molt', limitations: 'Sense salts', emergency: 'Pare · 600' };
  const f = Flat.patient(p);
  assert.equal(f['Alçada (cm)'], 170);
  assert.equal(f['Dominància'], 'Esquerra');
  assert.equal(f['Nivell d\'activitat'], 'Molt actiu (3 o més dies)');
  assert.equal(f['Limitacions per entrenar'], 'Sense salts');
  assert.equal(Math.round(Calc.bmi('65', '170') * 10) / 10, 22.5);
  // Sense pes a la fitxa: el de l'última valoració que en tingui.
  const b = Calc.body({}, [{ date: '2026-01-01', general: { weight: '70' } }, { date: '2026-03-01', general: { weight: '' } }]);
  assert.deepEqual([b.weight.v, b.weight.date, b.height.v], [70, '2026-01-01', null]);
  // Una valoració nova agafa el pes i l'alçada de la fitxa.
  Store.put('patients', p, { immediate: true });
  const a = Store.newAssessment('P-PROVA', { date: '2026-10-01' });
  assert.deepEqual([a.general.weight, a.general.height], ['65', '170']);
  // Els demos tenen el perfil omplert (dades inventades).
  assert.equal(Store.get('patients', 'P-DEMO-JORDI').dominance, 'D');
  assert.ok(Store.get('patients', 'P-DEMO-MONTSE').limitations);
});

test('exercicis EON: codi per bloc (1.0, 1.1…), ordre i següent número; el 1.3 de mobilitat té el vídeo', () => {
  const { Calc, SEED_EXERCISES, Flat } = loadCore();
  assert.deepEqual(Array.from(Calc.codeKey('1.3')), [1, 3]);
  assert.equal(Calc.codeKey('1,3'), null);
  const list = [{ code: '1.10' }, { code: '1.2' }, { code: '2.0' }, { code: '1.0' }];
  assert.deepEqual([...list].sort(Calc.byCode).map((e) => e.code), ['1.0', '1.2', '1.10', '2.0']);
  assert.equal(Calc.nextCode(list, 1), '1.11');
  assert.equal(Calc.nextCode(list, 4), '4.0');
  const e = SEED_EXERCISES.find((x) => x.code === '1.3');
  assert.equal(e.block, 'mob');
  assert.equal(e.name, '1.3');
  assert.equal(e.video, 'https://youtu.be/RaKob2IOfqk');
  assert.equal(Flat.exercise(e)['Codi EON'], '1.3');
});

test('app de les tauletes: treu els clients de prova i manté la resta; si es tornen a carregar, es queden', async () => {
  const { makeDemoData, removeDemoClients } = loadCore();
  const db = makeDemoData();
  db.patients['P-REAL'] = { id: 'P-REAL', firstName: 'Client', lastName: 'Real' };
  db.sessions['S-REAL'] = { id: 'S-REAL', patientId: 'P-REAL', blocks: [] };
  db.templates['T-MEVA'] = { id: 'T-MEVA', name: 'Plantilla pròpia', blocks: [] };
  db.exercises['X-MEU'] = { id: 'X-MEU', name: 'Exercici propi', block: 'mob', photo: 'data:image/jpeg;base64,AAA' };
  db.settings.centerName = 'EON Life Andorra';
  assert.equal(removeDemoClients(db), 4);
  assert.deepEqual(Object.keys(db.patients), ['P-REAL']);
  assert.deepEqual(Object.keys(db.sessions), ['S-REAL']);
  assert.equal(Object.keys(db.assessments).length, 0);
  assert.ok(db.templates['T-MEVA'] && !db.templates['PL-DEMO-LAURA']);
  assert.ok(db.exercises['X-MEU'].photo);
  assert.equal(db.settings.centerName, 'EON Life Andorra');
  assert.equal(db.demo, false);

  // A la tauleta: les dades d'abans (amb els clients de prova) es netegen en obrir l'app nova.
  const core = loadCore('07', { window: { EON_NO_DEMO: true } });
  const old = core.makeDemoData();
  old.patients['P-REAL'] = { id: 'P-REAL', firstName: 'Client', lastName: 'Real' };
  core.__storage.set('eonlife:data:v1', JSON.stringify(old));
  let r = await core.LocalBackend.init();
  assert.deepEqual(Object.keys(r.records.patients), ['P-REAL']);
  assert.equal(r.meta.demo, false);
  assert.equal(r.meta.demoRemoved, 4);
  assert.deepEqual(Object.keys(JSON.parse(core.__storage.get('eonlife:data:v1')).patients), ['P-REAL']);
  r = await core.LocalBackend.init();
  assert.equal(r.meta.demoRemoved, 0);
  // Un aparell nou comença buit.
  core.__storage.clear();
  r = await core.LocalBackend.init();
  assert.equal(Object.keys(r.records.patients).length, 0);
  assert.equal(r.meta.demo, false);
  // Si algú torna a carregar els clients de prova des de Configuració, no s'esborren sols.
  core.LocalBackend.reset(true);
  r = await core.LocalBackend.init();
  assert.equal(Object.keys(r.records.patients).length, 4);
  assert.equal(r.meta.demoRemoved, 0);
  // Les altres versions (enllaç de prova, fitxer) segueixen començant amb els clients de prova.
  const demo = loadCore();
  r = await demo.LocalBackend.init();
  assert.equal(Object.keys(r.records.patients).length, 4);
  assert.equal(r.meta.demo, true);
});

test('Richy passa a dir-se Ricardo Villamizar a les dades ja desades i a la llista de l\'equip', async () => {
  const core = loadCore();
  await core.Store.init();
  const { Store } = core;
  Store.data.patients['P-R'] = { id: 'P-R', firstName: 'Anna', lastName: 'Prova', professional: 'Richy' };
  Store.data.sessions['S-R'] = { id: 'S-R', patientId: 'P-R', date: '2026-10-01', professional: 'Richy', blocks: [], feedback: {} };
  Store.data.assessments['A-R'] = { id: 'A-R', patientId: 'P-R', date: '2026-10-01', professional: 'Arnau', values: {} };
  Store.data.patients['P-V'] = { id: 'P-V', firstName: 'Pere', lastName: 'Prova', service: 'valoracio' };
  Store.settings.professionals = ['Richy', 'Arnau', 'Ricardo Villamizar'];
  Store.renameProfessionals();
  assert.equal(Store.get('patients', 'P-V').service, 'membership', 'la valoració inicial va amb la membership');
  assert.equal(Store.get('patients', 'P-R').professional, 'Ricardo Villamizar');
  assert.equal(Store.get('sessions', 'S-R').professional, 'Ricardo Villamizar');
  assert.equal(Store.get('assessments', 'A-R').professional, 'Arnau');
  assert.deepEqual([...Store.settings.professionals], ['Ricardo Villamizar', 'Arnau']);
  assert.ok(![...Store.professionals()].includes('Richy'));
});

test('informe: la propera valoració només amb el mes i l\'any; tipus de pacient i pilar de readaptació', () => {
  const { U, OPT } = loadCore();
  assert.equal(U.fmtMonthYear('2027-01-14'), 'Gener de 2027');
  assert.equal(U.fmtMonthYear('2027-04-02'), 'Abril de 2027');
  assert.equal(U.fmtMonthYear(''), '—');
  assert.deepEqual([...OPT.services.map((o) => o.v)], ['membership', 'bo']);
  assert.ok(OPT.pillars.includes('Readaptació'));
});

test('informe de tests: una fila per valoració dins del rang, canvi del primer al darrer i direcció de la millora', async () => {
  const core = loadCore();
  await core.Store.init();
  const { Store, Evol } = core;
  const all = Store.assessmentsOf('P-DEMO-LAURA');
  const tests = Evol.tests(all);
  const cmj = tests.find((t) => t.id === 'cmj');
  assert.equal(cmj.rows.length, all.filter((a) => core.Calc.cmj(a) && core.Calc.cmj(a).best != null).length);
  assert.equal(cmj.area, 'rendiment');
  assert.equal(cmj.change.delta > 0, cmj.change.better, 'més alt és millor');
  const knee = tests.find((t) => t.id === 'dyn_knee_ext');
  assert.ok(knee.bi && knee.rows.every((r) => 'd' in r && 'e' in r && 'asym' in r));
  const w = tests.find((t) => t.id === 'weight');
  if (w && w.change) assert.equal(w.change.better, null, 'el pes no té direcció');
  // Rang que només agafa l'última valoració: una fila i sense canvi
  const last = all[all.length - 1].date;
  const one = Evol.tests(all, { from: last, to: last }).find((t) => t.id === 'cmj');
  assert.equal(one.rows.length, 1);
  assert.equal(one.change, null);
  assert.equal(Evol.tests(all, { from: '2000-01-01', to: '2000-12-31' }).length, 0);
  // Un test on menys és millor
  const lower = Object.values(core.TEST_INDEX).find((t) => t.lowerBetter && t.kind === 'single');
  if (lower) {
    const fake = [{ id: 'a1', date: '2026-01-01', values: { [lower.id]: { v: 10 } } }, { id: 'a2', date: '2026-02-01', values: { [lower.id]: { v: 8 } } }];
    assert.equal(Evol.tests(fake).find((t) => t.id === lower.id).change.better, true);
  }
});

test('informe de sessions: RPE, dolor en acabar i wellness de cada sessió, mitjanes i tendència', () => {
  const { Evol } = loadCore();
  const s = (n, date, rpe, pain, wl) => ({ id: `S${n}`, number: n, date, goal: 'Força', status: 'feta',
    feedback: { rpe: rpe == null ? '' : String(rpe), pain: pain == null ? '' : String(pain), duration: '60' },
    wellness: wl == null ? {} : { fatigue: wl, sleep: wl, soreness: wl, stress: wl, mood: wl } });
  const list = [s(1, '2026-09-01', 5, 4, 3), s(2, '2026-09-03', 6, 3, 3), s(3, '2026-09-05', 7, 1, 4), s(4, '2026-09-08', 8, 0, 5),
    s(5, '2026-09-10', null, null, null), s(6, '2026-10-20', 6, 2, 4)];
  const ev = Evol.sessions(list, { from: '2026-09-01', to: '2026-09-30' });
  assert.deepEqual([...ev.rows.map((r) => r.number)], [1, 2, 3, 4], 'sense la sessió buida ni la de fora del rang');
  assert.equal(ev.rpe.avg, 6.5);
  assert.equal(ev.pain.trend, -3, 'el dolor baixa');
  assert.equal(ev.wellness.first, 15);
  assert.equal(ev.wellness.last, 25);
  assert.equal(ev.rows[0].load, 300);
  assert.equal(ev.rows[3].items.mood, 5);
  assert.equal(Evol.sessions([], {}).rpe, null);
});
