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
    values: { wblt: { d: '7', e: '11' }, dyn_knee_ext: { d: '312', e: '368' }, rom_knee_ext: { d: '0', e: '1' }, thomas: { d: 'Positiu · psoes ilíac', e: 'Negatiu' }, tug: { v: '12,4' } },
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
  assert.match(text, /Timed Up and Go de 12,4 s/);
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
  assert.equal(flat['Client'], 'Laura Vidal Serra');
  assert.equal(flat['Knee-to-wall D (cm)'], 7);
  assert.equal(flat['Knee-to-wall diferència (cm)'], -4);
  assert.equal(flat['ROM RE espatlla asimetria (%)'], 2.97);
  assert.equal(flat['Força RI maluc D (N)'], 150);
  assert.equal(flat['CMJ millor altura (cm)'], 28.4);
  assert.equal(flat['YBT composite D (%)'], 92.25);
  assert.equal(flat['Squat (puntuació)'], '−');
  assert.equal(typeof flat['Força quàdriceps D (N/kg)'], 'number');
  assert.ok('ROM extensió genoll diferència (°)' in flat);
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
