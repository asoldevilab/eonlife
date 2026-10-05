// Proves dels Excel que genera l'app (08-xlsxdoc.js, 09-excel-*.js, 09-names.js, 09-sync.js) i de la planificació del mes.
//   node --test app/test/excel.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCore } from './load-core.mjs';
import { createGraphMock } from './graph-mock.mjs';
import { readXlsx, unzip } from './xlsx-read.mjs';

const STAMP = '05/10/2026 18:30';
// Rellotge fix (5 d'octubre de 2026): les dades de prova són relatives a «avui» i així els tests valen qualsevol dia.
const FIXED = new Date(2026, 9, 5, 12, 0, 0).getTime();
class FixedDate extends Date {
  constructor(...a) { if (a.length) super(...a); else super(FIXED); }
  static now() { return FIXED; }
}

function setup() {
  const core = loadCore('09', { CompressionStream, Response, Date: FixedDate });
  const db = core.makeDemoData();
  const { Store } = core;
  Store.data = { patients: db.patients, assessments: db.assessments, sessions: db.sessions, exercises: {}, templates: db.templates };
  Store.settings = db.settings;
  Store.emit = () => {};
  Store.queue = () => {}; // sense desar al backend
  return { core, db, Store };
}
const sessionsOf = (db, pid) => Object.values(db.sessions).filter((s) => s.patientId === pid).sort((a, b) => (a.date < b.date ? -1 : 1));
const numCells = (sheet) => [...sheet.cells.values()].filter((c) => typeof c.v === 'number').map((c) => c.v);
const Calc_itemCount = (core, s) => core.Calc.itemCount(s);
const hasNum = (sheet, n) => numCells(sheet).some((v) => Math.abs(v - n) < 1e-9);

// ── Noms ──
test('noms: sense accents ni espais, amb data i número de sèrie', () => {
  const { core } = setup();
  const { Names } = core;
  assert.equal(Names.client({ firstName: 'Laura', lastName: 'Vidal Serra' }), 'lauravidalserra');
  assert.equal(Names.client({ firstName: 'Àlex', lastName: 'Martí-Soler' }), 'alexmartisoler');
  assert.equal(Names.client({ firstName: 'Núria', lastName: 'Pol·lèn d\'Alòs' }), 'nuriapollendalos');
  assert.equal(Names.client({}), 'client');
  assert.equal(Names.stamp('2026-10-02'), '20261002');
  assert.equal(Names.label('Hip Thrust'), 'hipthrust');
  assert.equal(Names.label('Test de flexió de tronc (Adams)'), 'testflexiotroncadams');
  assert.equal(Names.label('Single leg squat · dreta'), 'singlelegsquatdreta');
  const p = { firstName: 'Laura', lastName: 'Vidal Serra' };
  assert.equal(Names.file('Hip thrust', p, '2026-10-02', '.mp4', []), 'hipthrust_lauravidalserra_20261002_01.mp4');
  assert.equal(Names.file('Hip thrust', p, '2026-10-02', '.mp4', ['hipthrust_lauravidalserra_20261002_01.mp4']), 'hipthrust_lauravidalserra_20261002_02.mp4');
  assert.equal(Names.file('Hip thrust', p, '2026-10-02', '.mp4', ['hipthrust_lauravidalserra_20261002_01.mp4', 'altre.mp4', 'hipthrust_lauravidalserra_20261002_07.mp4']), 'hipthrust_lauravidalserra_20261002_08.mp4');
  assert.equal(Names.sessionFile(p, '2026-10-02', 1), 'sessio_lauravidalserra_20261002_01.xlsx');
  assert.equal(Names.assessmentFile(p, 'inicial', '2026-07-02', 1), 'valoracioinicial_lauravidalserra_20260702_01.xlsx');
  assert.equal(Names.assessmentFile(p, 'retest', '2026-10-01', 2), 'retest_lauravidalserra_20261001_02.xlsx');
  assert.equal(Names.overviewFile(p), 'visiogeneral_lauravidalserra_01.xlsx');
  // Només es reconeixen com a propis els Excel que fa l'app.
  assert.ok(Names.OWN.sessions.test('sessio_lauravidalserra_20261002_01.xlsx'));
  assert.ok(Names.OWN.sessions.test('visiogeneral_lauravidalserra_01.xlsx'));
  assert.ok(!Names.OWN.sessions.test('notes de l\'equip.xlsx'));
  assert.ok(!Names.OWN.sessions.test('hipthrust_lauravidalserra_20261002_01.mp4'));
  assert.ok(Names.OWN.assess.test('retest_lauravidalserra_20261001_01.xlsx'));
  assert.ok(!Names.OWN.assess.test('informekinvent_lauravidalserra_20260702_01.pdf'));
});

// ── Escriptor ──
test('XlsxDoc: estructura vàlida, estils, fórmules, enllaços i combinades', async () => {
  const { core } = setup();
  const { XlsxDoc } = core;
  const doc = XlsxDoc.create({ title: 'Prova' });
  const ws = doc.sheet('Sessió', { freeze: [4, 2], titles: [1, 3] });
  ws.cols([20, 10]);
  ws.merge(1, 1, 1, 3, 'Títol <amb> & "símbols"', { b: true, fill: '421215', color: 'FFFFFF' });
  ws.set(2, 1, 5, { fmt: '0.0' });
  ws.set(2, 2, 7, { fmt: '0.0' });
  ws.set(2, 3, { f: 'IF(COUNT(A2:B2)=2,A2*B2,"")', v: 35 });
  ws.set(3, 1, { date: '2026-10-02' });
  ws.set(4, 1, { rich: [['Negreta ', { b: true }], ['normal']] }, { wrap: true });
  ws.set(5, 1, 'Línia 1\nLínia 2', { wrap: true });
  ws.set(6, 1, 'enllaç'); ws.link(6, 1, '#\'Segon\'!B2', 'Vés-hi');
  ws.set(7, 1, 'web'); ws.link(7, 1, 'https://example.com/a?b=1&c=2');
  ws.cf('A2:B2', 'A2>5', { fill: 'FBE8C2' });
  doc.sheet('Segon').set(2, 2, { f: '\'Sessió\'!C2*2', v: 70 });
  const { bytes, digest } = await doc.build({ stamp: STAMP });
  const x = readXlsx(bytes);
  assert.deepEqual(x.names, ['Sessió', 'Segon']);
  const s = x.sheet('Sessió');
  assert.equal(s.get('A1'), 'Títol <amb> & "símbols"');
  assert.equal(s.get('A2'), 5);
  assert.equal(s.formula('C2'), 'IF(COUNT(A2:B2)=2,A2*B2,"")');
  assert.equal(s.get('C2'), 35);
  assert.equal(s.get('A3'), 46297); // 02/10/2026 com a número de sèrie d'Excel
  assert.equal(s.get('A5'), 'Línia 1\nLínia 2');
  assert.deepEqual(s.merges, ['A1:C1']);
  assert.deepEqual(s.links.map((l) => l.location || l.target), ['\'Segon\'!B2', 'https://example.com/a?b=1&c=2']);
  assert.equal(s.cfs.length, 1);
  assert.equal(x.sheet('Segon').formula('B2'), '\'Sessió\'!C2*2');
  // Comprimit, amb CRC correctes i mida menor que sense comprimir.
  assert.ok(Object.values(x.zip).some((e) => e.method === 8), 'hi ha entrades amb deflate');
  const raw = await doc.build({ stamp: STAMP, compress: false });
  assert.ok(raw.bytes.length > bytes.length);
  assert.equal(raw.digest, digest);
  assert.equal(JSON.stringify(readXlsx(raw.bytes).sheet('Sessió').text()), JSON.stringify(s.text()));
  // El resum no depèn de l'hora de generació, però sí del contingut.
  assert.equal((await doc.build({ stamp: 'un altre dia' })).digest, digest);
  const other = XlsxDoc.create({});
  other.sheet('Sessió', { freeze: [4, 2], titles: [1, 3] }).set(1, 1, 'una altra cosa');
  assert.notEqual(other.digest(), digest);
});

test('XlsxDoc: l\'hora de generació se substitueix i les combinades que se superposen es rebutgen', async () => {
  const { core } = setup();
  const { XlsxDoc } = core;
  const doc = XlsxDoc.create({});
  const ws = doc.sheet('A');
  ws.set(1, 1, `Actualitzat el ${XlsxDoc.STAMP}`);
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  assert.equal(x.sheet('A').get('A1'), `Actualitzat el ${STAMP}`);
  const bad = XlsxDoc.create({});
  const w = bad.sheet('B');
  w.merge(1, 1, 2, 2, 'x');
  w.merge(2, 2, 3, 3, 'y');
  assert.throws(() => bad.parts(), /se superposen/);
  assert.throws(() => { const d = XlsxDoc.create({}); d.sheet('X'); d.sheet('x'); }, /repetit/);
});

// ── Excel d'una sessió ──
test('Excel de la sessió feta: dades, wellness, tancament, exercicis i encoder', async () => {
  const { core, db } = setup();
  const { ExcelSession, Names } = core;
  const p = db.patients['P-DEMO-LAURA'];
  const sessions = sessionsOf(db, p.id);
  const s = sessions.find((x) => x.number === 15);
  const doc = ExcelSession.build({ patient: p, session: s, sessions, settings: db.settings, today: '2026-10-05' });
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  assert.deepEqual(x.names, ['Sessió', 'Exercicis', 'Encoder']);
  const a = x.sheet('Sessió');
  assert.equal(a.get('A1'), 'Sessió 15 · Laura Vidal Serra');
  assert.match(a.text(), /Força de tren inferior · dominant de genoll/);
  assert.match(a.text(), /Feta/);
  assert.equal(a.get(a.find(/^Total \(màxim 25\)/).replace('A', 'B')), 20, 'wellness total');
  // Càrrega = RPE × durada (fórmula)
  const loadRow = a.rowOf(a.find(/^Càrrega de la sessió/));
  assert.match(a.formula(`B${loadRow}`), /^IF\(COUNT\(B\d+,B\d+\)=2,B\d+\*B\d+,""\)$/);
  assert.equal(a.get(`B${loadRow}`), 455);
  // Exercicis: tots els noms i la prescripció
  const e = x.sheet('Exercicis');
  for (const b of s.blocks) for (const it of b.items) assert.ok(e.find(new RegExp(`^${it.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`)), `falta ${it.name}`);
  assert.ok(e.find(/^Back squat$/));
  assert.ok(e.text().includes('V 1a rep 0,76 m/s'), 'resum de l\'encoder');
  const enc = x.sheet('Encoder');
  assert.equal(enc.get(enc.find(/^Back squat$/)), 'Back squat');
  assert.match(Names.sessionFile(p, s.date, 1), /^sessio_lauravidalserra_20261002_01\.xlsx$/);
});

test('Excel de la sessió planificada i de la prevista al pla', async () => {
  const { core, db } = setup();
  const { ExcelSession, ExcelSet, Store } = core;
  const p = db.patients['P-DEMO-LAURA'];
  const d = ExcelSet.data(p.id, Store);
  const planned = d.sessions.find((s) => s.status !== 'feta');
  const x = readXlsx((await ExcelSession.build({ patient: p, session: planned, sessions: d.sessions, settings: d.settings, today: planned.date }).build({ stamp: STAMP })).bytes);
  const a = x.sheet('Sessió');
  const stRow = a.rowOf(a.find(/^Estat$/));
  assert.equal(a.get(`B${stRow}`), 'Planificada');
  assert.match(a.formula(`B${stRow}`), /TODAY\(\)/, 'passa sola a «Sense tancar»');
  assert.ok(!a.find(/^Tancament de la sessió$/), 'una sessió planificada no té tancament');
  assert.ok(!a.find(/^Wellness/), 'ni wellness');
  assert.equal(a.cfs.length, 2);
  // Una sessió prevista del pla
  const ghost = ExcelSet.ghosts(d)[0];
  assert.ok(ghost, 'el pla de la demo té sessions previstes');
  const g = readXlsx((await ExcelSession.build({ patient: p, session: ghost, sessions: d.sessions, plan: d.plans[0], settings: d.settings, today: '2026-10-05' }).build({ stamp: STAMP })).bytes);
  assert.match(g.sheet('Sessió').get('A1'), /^Sessió prevista S\d+ · Laura Vidal Serra$/);
  assert.match(g.sheet('Sessió').text(), /Prevista al pla/);
  assert.match(g.sheet('Sessió').text(), /Bloc 2 · força i potència|Pla d'entrenament/);
});

// ── Auditoria: tot el que s'omple a l'app surt a l'Excel ──
test('auditoria de la sessió: cada camp que s\'omple a l\'app surt a l\'Excel', async () => {
  const { core, db, Store } = setup();
  const { ExcelSession, Names } = core;
  const p = { ...db.patients['P-DEMO-ALEX'], firstName: 'Marcel', lastName: 'Auditoria Prova' };
  const mk = (n) => `‹${n}›`; // marcadors únics
  let seq = 0;
  const item = (k, extra = {}) => ({ id: `I${k}`, name: mk(`ex${k}`), exId: '', gm: 'GMax', cont: 'ECC', pos: 'Sd', lat: 'UL', material: mk(`mat${k}`), sets: '4', reps: mk(`reps${k}`), load: `${50 + (++seq)}`, intensity: mk(`int${k}`), rest: mk(`desc${k}`), tempo: '3-1-1-0', note: mk(`nota${k}`), done: true, video: `https://eonlife.sharepoint.com/v${k}.mp4`, demo: `https://youtu.be/d${k}`, ...extra });
  const blocks = core.BLOCKS.map((b, i) => ({
    key: b.key, focus: mk(`focus${b.key}`), note: '', method: 'x', methodName: mk(`metode${b.key}`),
    items: [item(`${i}a`), item(`${i}b`, i === 3 ? { vbt: { mode: 'encoder', sets: [{ kg: '80', reps: '5', v1: '0.81', vlast: '0.62', pmax: '501' }] } } : {})],
  }));
  blocks[3].groups = [{ id: 'G1', name: mk('grup1'), method: 'y', methodName: mk('metgrup1') }, { id: 'G2', name: mk('grup2') }];
  blocks[3].items[0].g = 'G1'; blocks[3].items[1].g = 'G2';
  const s = {
    id: 'S-AUD', patientId: p.id, date: '2026-10-06', number: 42, professional: mk('prof'), goal: mk('objectiu'), pillar: mk('pilar'), status: 'feta',
    wellness: { fatigue: '1', sleep: '2', soreness: '3', stress: '4', mood: '5', notes: mk('wnotes') },
    feedback: { rpe: '8', duration: '70', pain: '3', notes: mk('fnotes'), decision: mk('decisio') }, blocks,
  };
  const doc = ExcelSession.build({ patient: p, session: s, sessions: [s], settings: Store.settings, today: '2026-10-06' });
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  const all = x.text();
  const must = [p.firstName, 'Auditoria Prova', mk('prof'), mk('objectiu'), mk('pilar'), mk('wnotes'), mk('fnotes'), mk('decisio'), 'dimarts, 6 d\'octubre de 2026', mk('grup1'), mk('grup2'), mk('metgrup1')];
  for (const b of core.BLOCKS) must.push(mk(`focus${b.key}`), mk(`metode${b.key}`));
  for (let i = 0; i < 6; i++) for (const k of ['a', 'b']) must.push(mk(`ex${i}${k}`), mk(`mat${i}${k}`), mk(`reps${i}${k}`), mk(`int${i}${k}`), mk(`desc${i}${k}`), mk(`nota${i}${k}`));
  for (const t of must) assert.ok(all.includes(t), `no surt a l'Excel: ${t}`);
  const sh = x.sheet('Sessió');
  assert.ok(hasNum(sh, 8) && hasNum(sh, 70) && hasNum(sh, 560), 'RPE, durada i càrrega');
  assert.ok(hasNum(sh, core.XlsxDoc.serial('2026-10-06')), 'la data és una data d\'Excel');
  assert.ok([1, 2, 3, 4, 5].every((n) => hasNum(sh, n)), 'les 5 respostes del wellness');
  assert.ok(hasNum(sh, 15), 'wellness total');
  assert.ok(hasNum(sh, 3), 'dolor');
  const ex = x.sheet('Exercicis');
  for (let n = 51; n <= 62; n++) assert.ok(hasNum(ex, n), `càrrega ${n}`);
  assert.ok(hasNum(ex, 4), 'sèries');
  for (const t of ['ECC', 'Sd', 'UL', '3-1-1-0', 'GMax']) assert.ok(ex.text().includes(t), `falta ${t}`);
  // Enllaços: vídeo del client i demostració de cada exercici
  const targets = ex.links.map((l) => l.target);
  for (let i = 0; i < 6; i++) for (const k of ['a', 'b']) {
    assert.ok(targets.includes(`https://eonlife.sharepoint.com/v${i}${k}.mp4`), `falta el vídeo de l'exercici ${i}${k}`);
    assert.ok(targets.includes(`https://youtu.be/d${i}${k}`), `falta la demostració ${i}${k}`);
  }
  assert.ok(sh.links.length >= 12, 'enllaços dels vídeos del client a la pàgina de la sessió');
  // Encoder
  const en = x.sheet('Encoder');
  for (const v of [80, 5, 0.81, 0.62, 501]) assert.ok(hasNum(en, v), `encoder ${v}`);
  assert.equal(Names.sessionFile(p, s.date, 1), 'sessio_marcelauditoriaprova_20261006_01.xlsx');
});

test('auditoria de la valoració: cada test, valor i fitxer surt a l\'Excel', async () => {
  const { core, db, Store } = setup();
  const { ExcelAssessment, TEST_INDEX, PROTOCOL, PATTERNS } = core;
  const p = { ...db.patients['P-DEMO-ALEX'], firstName: 'Marcel', lastName: 'Auditoria' };
  const values = {};
  let n = 0;
  const num = () => 1000 + (++n) * 7 + 0.5;
  const expectNums = [];
  for (const t of Object.values(TEST_INDEX)) {
    const v = {};
    if (t.kind === 'bi') { v.d = num(); v.e = num(); expectNums.push(v.d, v.e); }
    else if (t.kind === 'single') { v.v = num(); expectNums.push(v.v); }
    else if (t.kind === 'select') v.v = 'Positiu';
    else if (t.kind === 'biSelect') { v.d = 'Positiu'; v.e = 'Negatiu'; }
    else if (t.kind === 'scoreBi') { v.sd = '--'; v.se = '-'; v.chips = ['Valg de genoll']; v.pain = true; }
    v.note = `‹nota ${t.id}›`;
    for (const m of t.photos || []) v[m.k] = `https://eonlife.sharepoint.com/foto-${t.id}-${m.k}.jpg`;
    for (const m of t.videos || []) v[m.k] = `https://eonlife.sharepoint.com/video-${t.id}-${m.k}.mp4`;
    values[t.id] = v;
  }
  const y = { d: { ant: '60', pm: '90', pl: '88', len: '85' }, e: { ant: '66', pm: '93', pl: '90', len: '85' }, note: '‹nota ybt›', videoD: 'https://eonlife.sharepoint.com/ybt-d.mp4', videoE: 'https://eonlife.sharepoint.com/ybt-e.mp4' };
  const patterns = {};
  PATTERNS.forEach((pt, i) => {
    patterns[pt.id] = pt.uni ? { sd: '-', se: '--', chips: [`‹chip ${pt.id}›`], note: `‹nota ${pt.id}›`, pain: i === 0, secD: '21', secE: '19' } : { score: '-', chips: [`‹chip ${pt.id}›`], note: `‹nota ${pt.id}›` };
    for (const m of pt.videos || []) patterns[pt.id][m.k] = `https://eonlife.sharepoint.com/pat-${pt.id}-${m.k}.mp4`;
  });
  const a = {
    id: 'V-AUD', patientId: p.id, date: '2026-10-06', type: 'retest', professional: '‹avaluador›',
    general: { weight: '71.5', height: '178', goal: '‹motiu›', video: 'https://eonlife.sharepoint.com/general.mp4' },
    wellness: { fatigue: '3', sleep: '4', soreness: '2', stress: '5', mood: '1', notes: '‹wnotes›' },
    values, ybt: y,
    jumps: { readiness: 'groc', note: '‹nota salts›', video: 'https://eonlife.sharepoint.com/salts.mp4', attempts: [{ id: 'J1', type: 'CMJ', height: '33.3', power: '2999', force: '1777', velocity: '1.44', rsimod: '0.55', load: '12', flight: '480', contact: '210', note: '‹nota intent›' }] },
    encoder: { rows: [{ id: 'R1', name: '‹encoder›', load: '61', vel: '0.77', power: '444' }] },
    bike: { peak: '800', mean: '600', min: '400' },
    patterns, free: [{ id: 'F1', name: '‹mesura lliure›', d: '17', e: '19', v: '23', unit: 'mm' }],
    conclusions: { strengths: '‹forts›', priorities: '‹prioritats›', plan: '‹pla›' }, nextRetest: '2027-01-06',
    files: [{ id: 'F', name: 'informekinvent_marcelauditoria_20261006_01.pdf', url: 'https://eonlife.sharepoint.com/kinvent.pdf', label: 'Informe Kinvent', date: '2026-10-06' }],
  };
  const prev = { ...a, id: 'V-PREV', date: '2026-07-06', type: 'inicial', general: { ...a.general, weight: '73' }, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, v.d !== undefined && typeof v.d === 'number' ? { ...v, d: v.d - 5, e: v.e - 3 } : v])) };
  const doc = ExcelAssessment.build({ patient: p, assessment: a, previous: prev, settings: Store.settings, today: '2026-10-06' });
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  assert.deepEqual(x.names, ['Resum', 'Comparació', 'Mobilitat', 'Força', 'Rendiment', 'Patrons', 'Altres mesures']);
  const all = x.text();
  for (const t of ['‹avaluador›', '‹motiu›', '‹wnotes›', '‹forts›', '‹prioritats›', '‹pla›', '‹nota ybt›', '‹nota salts›', '‹nota intent›', '‹encoder›', '‹mesura lliure›']) assert.ok(all.includes(t), `no surt: ${t}`);
  assert.ok(x.sheet('Resum').text().includes('Re-test'));
  for (const t of Object.values(TEST_INDEX)) assert.ok(all.includes(`‹nota ${t.id}›`), `falta la nota del test ${t.name}`);
  for (const pt of PATTERNS) assert.ok(all.includes(`‹chip ${pt.id}›`) && all.includes(`‹nota ${pt.id}›`), `falta el patró ${pt.name}`);
  // Tots els números dels tests (dreta, esquerra, valor únic)
  const sheetsWithNums = ['Mobilitat', 'Força', 'Rendiment'].map((s) => x.sheet(s));
  for (const v of expectNums) assert.ok(sheetsWithNums.some((s) => hasNum(s, v)), `falta el valor ${v}`);
  const f = x.sheet('Força');
  for (const v of [60, 90, 88, 85, 66, 93, 90]) assert.ok(hasNum(f, v), `Y-Balance ${v}`);
  const r = x.sheet('Rendiment');
  for (const v of [33.3, 2999, 1777, 1.44, 0.55, 12, 480, 210, 61, 0.77, 444, 800, 600, 400]) assert.ok(hasNum(r, v), `rendiment ${v}`);
  const o = x.sheet('Altres mesures');
  for (const v of [17, 19, 23]) assert.ok(hasNum(o, v), `mesura lliure ${v}`);
  // Pes i alçada, wellness, pes → N/kg amb fórmula
  const res = x.sheet('Resum');
  for (const v of [71.5, 178, 3, 4, 2, 5, 1, 15]) assert.ok(hasNum(res, v), `resum ${v}`);
  assert.ok(f.cells.size > 0 && [...f.cells.values()].some((c) => c.f && /Resum'!\$B\$/.test(c.f)), 'N/kg amb el pes del full Resum');
  // Enllaços: fotos i vídeos de cada test, Y-Balance, patrons, salts, vídeo general i PDF de Kinvent
  const targets = new Set(x.sheets.flatMap((s) => s.links.map((l) => l.target)));
  const wantLinks = ['general.mp4', 'salts.mp4', 'ybt-d.mp4', 'ybt-e.mp4', 'kinvent.pdf'];
  for (const t of Object.values(TEST_INDEX)) {
    for (const m of t.photos || []) wantLinks.push(`foto-${t.id}-${m.k}.jpg`);
    for (const m of t.videos || []) wantLinks.push(`video-${t.id}-${m.k}.mp4`);
  }
  for (const pt of PATTERNS) for (const m of pt.videos || []) wantLinks.push(`pat-${pt.id}-${m.k}.mp4`);
  for (const l of wantLinks) assert.ok([...targets].some((t) => t.endsWith(l)), `falta l'enllaç ${l}`);
  // Comparació: cada test numèric amb el seu canvi
  const c = x.sheet('Comparació');
  assert.ok(c.cells.size > 40);
  assert.ok([...c.cells.values()].some((cell) => cell.f && /^D\d+-C\d+$|^C\d+-B\d+$/.test(cell.f.replace(/\s/g, ''))), 'canvi com a fórmula');
  void PROTOCOL;
});

// ── Conjunt de fitxers d'un client ──
test('conjunt de fitxers: noms, números de sèrie i carpetes', () => {
  const { core, db, Store } = setup();
  const { ExcelSet } = core;
  const p = db.patients['P-DEMO-LAURA'];
  // Dues sessions el mateix dia → _01 i _02; una valoració més del mateix tipus i dia → _02
  const first = sessionsOf(db, p.id)[0];
  db.sessions['S-DUP'] = { ...first, id: 'S-DUP', number: 99, status: 'planificada' };
  const a0 = Object.values(db.assessments).find((a) => a.patientId === p.id && a.type === 'inicial');
  db.assessments['V-DUP'] = { ...a0, id: 'V-DUP', createdAt: '2099-01-01T00:00:00Z' };
  const d = ExcelSet.data(p.id, Store);
  const files = ExcelSet.plan(d, { today: '2026-10-05' });
  const names = files.map((f) => `${f.folder}/${f.name}`);
  assert.equal(new Set(names).size, names.length, 'cap nom repetit');
  assert.ok(names.includes(`sessions/sessio_lauravidalserra_${first.date.replace(/-/g, '')}_01.xlsx`));
  assert.ok(names.includes(`sessions/sessio_lauravidalserra_${first.date.replace(/-/g, '')}_02.xlsx`));
  assert.ok(names.includes(`assess/valoracioinicial_lauravidalserra_${a0.date.replace(/-/g, '')}_01.xlsx`));
  assert.ok(names.includes(`assess/valoracioinicial_lauravidalserra_${a0.date.replace(/-/g, '')}_02.xlsx`));
  assert.ok(names.includes('assess/retest_lauravidalserra_20261001_01.xlsx'));
  assert.ok(names.includes('sessions/visiogeneral_lauravidalserra_01.xlsx'));
  // Les sessions previstes del pla (encara sense fer) també tenen el seu fitxer
  assert.ok(files.filter((f) => f.kind === 'session').length > d.sessions.length);
  for (const f of files) assert.match(f.name, f.folder === 'assess' ? core.Names.OWN.assess : core.Names.OWN.sessions);
});

// ── Excel de visió general ──
test('visió general: resum, un calendari i un detall per mes, i registre de sessions', async () => {
  const { core, db, Store } = setup();
  const { ExcelSet } = core;
  const p = db.patients['P-DEMO-LAURA'];
  const d = ExcelSet.data(p.id, Store);
  const items = ExcelSet.items(d);
  const doc = ExcelSet.plan(d, { today: '2026-10-05' }).find((f) => f.kind === 'overview').make({});
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  assert.deepEqual(x.names, ['Resum', 'Agost 2026', 'Agost 2026 · detall', 'Setembre 2026', 'Setembre 2026 · detall', 'Octubre 2026', 'Octubre 2026 · detall', 'Registre']);
  const reg = x.sheet('Registre');
  const dataRows = [...reg.cells.keys()].filter((k) => /^A\d+$/.test(k) && reg.rowOf(k) >= 6);
  assert.equal(dataRows.length, items.length, 'una fila per sessió (reals i previstes)');
  // Estat i càrrega com a fórmula
  assert.ok([...reg.cells.entries()].some(([k, c]) => /^L\d+$/.test(k) && /^IF\(COUNT\(J\d+,K\d+\)=2,J\d+\*K\d+,""\)$/.test(c.f || '')));
  const states = new Set([...reg.cells.entries()].filter(([k]) => /^E\d+$/.test(k) && reg.rowOf(k) >= 6).map(([, c]) => c.v));
  assert.deepEqual([...states].sort(), ['Feta', 'Planificada', 'Prevista al pla'].sort());
  // Resum: targetes amb fórmules sobre el registre
  const res = x.sheet('Resum');
  assert.equal(res.get('A6'), 15);
  assert.match(res.formula('A6'), /COUNTIF\('Registre'!\$E\$6:\$E\$\d+,"Feta"\)/);
  assert.equal(res.get('C6'), 6295);
  assert.match(res.text(), /Tornar a competir en trail de 42 km/);
  assert.match(res.text(), /Evitar baixades i salts/);
  // Calendari d'octubre: cap «Sessió 15 · FETA», les previstes i els enllaços al detall
  const cal = x.sheet('Octubre 2026');
  assert.ok(cal.text().includes('Sessió 15 · FETA'));
  assert.ok(cal.text().includes('S2 del pla · PREVISTA'));
  assert.ok(cal.links.length >= 12 && cal.links.every((l) => /^'Octubre 2026 · detall'!/.test(l.location)));
  assert.equal(cal.cfs.length, 10, 'avui ressaltat per format condicional (dues regles per setmana, 5 setmanes)');
  const det = x.sheet('Octubre 2026 · detall');
  assert.ok(det.text().includes('Back squat') && det.text().includes('DIVENDRES 02/10/2026'));
  // El mes: la fórmula de la targeta compta les sessions del rang de dates
  assert.ok([...cal.cells.values()].some((c) => c.f && /^COUNTIFS\('Registre'!\$A\$6:\$A\$\d+,">="&DATE\(2026,10,1\),'Registre'!\$A\$6:\$A\$\d+,"<="&DATE\(2026,10,31\)\)$/.test(c.f)));
});

test('visió general: sense sessions té el resum i el mes actual', async () => {
  const { core, db, Store } = setup();
  const { ExcelSet } = core;
  const p = Store.newPatient({ firstName: 'Nou', lastName: 'Client' });
  void db;
  const d = ExcelSet.data(p.id, Store);
  const files = ExcelSet.plan(d, { today: '2026-10-05' });
  assert.deepEqual([...files.map((f) => f.kind)], ['overview']);
  const x = readXlsx((await files[0].make({}).build({ stamp: STAMP })).bytes);
  assert.deepEqual(x.names, ['Resum', 'Octubre 2026', 'Octubre 2026 · detall', 'Registre']);
  assert.match(x.sheet('Registre').text(), /Encara no hi ha cap sessió/);
});

// ── Sincronització amb la carpeta (simulador de Graph) ──
async function cloudSetup() {
  const s = setup();
  const { core } = s;
  const { GraphClient, M365Api, M365Backend } = core.M365;
  const mock = createGraphMock({ users: { tok: { email: 'arnau@eonlife.test' } } });
  const shared = mock.createSharedFolder();
  const graph = new GraphClient(async () => 'tok', { fetchImpl: mock.fetch });
  const f = await M365Api.resolveFolder(graph, shared.url);
  const api = new M365Api(graph, { ...f }, 'arnau@eonlife.test');
  if (!(await api.locate())) await api.setup();
  M365Backend.api = api;
  M365Backend.save = async () => ({ updatedAt: new Date().toISOString() });
  s.Store.backend = M365Backend;
  s.Store.meta = { mode: 'm365' };
  s.Store.ready = true;
  core.Sync.reset();
  const names = (p, path) => {
    let cur = p.folderId;
    for (const n of path) cur = mock.child(cur, n).id;
    return mock.childrenOf(cur).filter((x) => x.file).map((x) => x.name).sort();
  };
  return { ...s, mock, api, names, done() { core.Sync.reset(); for (const t of Object.values(s.Store.timers)) clearTimeout(t); } };
}

test('sincronització: puja tot, no repeteix, substitueix, renomena i esborra només els seus fitxers', async () => {
  const { core, Store, db, mock, api, names, done } = await cloudSetup();
  const { Sync } = core;
  try {
    const pid = 'P-DEMO-LAURA';
    const r1 = await Sync.syncClient(pid);
    const p = Store.get('patients', pid);
    assert.ok(p.folderId && p.folderUrl, 'la carpeta del client s\'ha creat i enllaçat');
    assert.equal(r1.kept, 0);
    assert.ok(r1.uploaded > 25);
    assert.deepEqual(names(p, ['Valoracions']), ['retest_lauravidalserra_20261001_01.xlsx', 'valoracioinicial_lauravidalserra_20260702_01.xlsx']);
    assert.ok(names(p, ['Sessions']).includes('visiogeneral_lauravidalserra_01.xlsx'));
    assert.ok(names(p, ['Sessions']).includes('sessio_lauravidalserra_20261002_01.xlsx'));
    assert.match(r1.overviewUrl, /sharepoint/);
    // Segona passada sense canvis: no es puja res
    const r2 = await Sync.syncClient(pid);
    assert.equal(r2.uploaded, 0);
    assert.equal(r2.kept, r1.uploaded);
    // El fitxer pujat és un Excel vàlid
    const f = mock.child(mock.child(p.folderId, 'Sessions').id, 'sessio_lauravidalserra_20261002_01.xlsx');
    assert.equal(readXlsx(f.content).sheet('Sessió').get('A1'), 'Sessió 15 · Laura Vidal Serra');
    // Canvi d'una sessió: es refà aquesta i la visió general; el fitxer es substitueix (mateixa ruta, sense còpies)
    const s15 = Object.values(db.sessions).find((s) => s.patientId === pid && s.number === 15);
    const before = names(p, ['Sessions']);
    Store.update('sessions', s15.id, (x) => { x.feedback = { ...x.feedback, rpe: '9' }; });
    const r3 = await Sync.syncClient(pid);
    assert.equal(r3.uploaded, 2);
    assert.deepEqual(names(p, ['Sessions']), before);
    const ses = readXlsx(mock.child(mock.child(p.folderId, 'Sessions').id, 'sessio_lauravidalserra_20261002_01.xlsx').content).sheet('Sessió');
    assert.equal(ses.get(`B${ses.rowOf(ses.find(/^RPE global/))}`), 9, 'el canvi surt al fitxer de la carpeta');
    // Canvi de dia: el fitxer vell es retira i en surt un de nou amb el nom del dia nou
    Store.update('sessions', s15.id, (x) => { x.date = '2026-10-03'; });
    const r4 = await Sync.syncClient(pid);
    assert.equal(r4.removed, 1);
    assert.ok(!names(p, ['Sessions']).includes('sessio_lauravidalserra_20261002_01.xlsx'));
    assert.ok(names(p, ['Sessions']).includes('sessio_lauravidalserra_20261003_01.xlsx'));
    // Fitxers que no són els d'aquesta app no es toquen mai
    const sdir = mock.child(p.folderId, 'Sessions');
    await api.putFile(sdir.id, 'notes de l\'equip.xlsx', new Uint8Array([1]));
    await api.putFile(sdir.id, 'hipthrust_lauravidalserra_20261002_01.mp4', new Uint8Array([1]), { mime: 'video/mp4' });
    Store.remove('sessions', s15.id);
    const r5 = await Sync.syncClient(pid);
    assert.equal(r5.removed, 1);
    const left = names(p, ['Sessions']);
    assert.ok(left.includes('notes de l\'equip.xlsx') && left.includes('hipthrust_lauravidalserra_20261002_01.mp4'));
    assert.ok(!left.includes('sessio_lauravidalserra_20261003_01.xlsx'));
    // Client reanomenat: tots els fitxers passen al nom nou
    Store.update('patients', pid, (x) => { x.firstName = 'Laia'; });
    const r6 = await Sync.syncClient(pid);
    assert.ok(r6.removed > 20);
    assert.ok(names(p, ['Valoracions']).every((n) => n.includes('laiavidalserra')));
  } finally { done(); }
});

test('sincronització: cua amb avís, estat i errors amb reintent', async () => {
  const { core, Store, mock, done } = await cloudSetup();
  const { Sync } = core;
  try {
    assert.ok(Sync.available() && Sync.enabled());
    assert.equal(Sync.info('P-DEMO-LAURA').state, 'never');
    // Un canvi a una sessió deixa un avís a la cua del seu client
    const s = Object.values(Store.data.sessions).find((x) => x.patientId === 'P-DEMO-LAURA');
    Store.update('sessions', s.id, (x) => { x.goal = 'Nou objectiu'; });
    assert.equal(Sync.info('P-DEMO-LAURA').state, 'pending');
    assert.equal(Sync.queued(), 1);
    // Un canvi a un client sense carpeta (valoració d'un altre client) avisa només aquell
    const a = Object.values(Store.data.assessments).find((x) => x.patientId === 'P-DEMO-JORDI');
    Store.update('assessments', a.id, (x) => { x.general = { ...x.general, goal: 'x' }; });
    assert.equal(Sync.queued(), 2);
    // Pausa: no es fa res
    Store.settings = { ...Store.settings, autoExcel: false };
    assert.ok(!Sync.enabled());
    assert.equal(Sync.info('P-DEMO-LAURA').state, 'paused');
    Store.settings = { ...Store.settings, autoExcel: true };
    // Error de xarxa: el missatge és clar i l'avís es manté
    mock.state.online = false;
    await assert.rejects(Sync.now('P-DEMO-LAURA'), /Sense connexió/);
    assert.equal(Sync.info('P-DEMO-LAURA').state, 'error');
    mock.state.online = true;
    // Sense permís d'escriptura
    mock.setReadOnly(['arnau@eonlife.test']);
    await assert.rejects(Sync.now('P-DEMO-LAURA'), /permís per escriure/);
    mock.setReadOnly([]);
    const ok = await Sync.now('P-DEMO-LAURA');
    assert.ok(ok.uploaded > 0);
    assert.equal(Sync.info('P-DEMO-LAURA').state, 'ok');
    assert.equal(Sync.queued(), 1, 'queda l\'avís de l\'altre client');
  } finally { done(); }
});

test('descàrrega a la versió local: cada Excel i el ZIP amb les dues carpetes', async () => {
  const { core, Store } = setup();
  const { Exports, ExcelSet } = core;
  const pid = 'P-DEMO-LAURA';
  const d = ExcelSet.data(pid, Store);
  const s = d.sessions.find((x) => x.number === 15);
  const f = await Exports.file(pid, `S:${s.id}`);
  assert.equal(f.name, 'sessio_lauravidalserra_20261002_01.xlsx');
  assert.equal(readXlsx(f.bytes).sheet('Sessió').get('A1'), 'Sessió 15 · Laura Vidal Serra');
  const z = await Exports.zip(pid);
  assert.match(z.name, /^eonlife_lauravidalserra_\d{8}\.zip$/);
  const entries = Object.keys(unzip(z.bytes));
  assert.ok(entries.includes('Valoracions/retest_lauravidalserra_20261001_01.xlsx'));
  assert.ok(entries.includes('Sessions/visiogeneral_lauravidalserra_01.xlsx'));
  assert.equal(entries.length, z.count);
});

// ── Planificar el mes ──
test('planifica el mes: una sessió per dia triat, amb progressió i sense trepitjar dies ocupats', () => {
  const { core, Store, db } = setup();
  const pid = 'P-DEMO-LAURA';
  const before = Store.sessionsOf(pid).length;
  // Novembre 2026: dilluns, dimecres i divendres; el 4 de novembre (dimecres) ja té una sessió
  Store.addPlanned(pid, { date: '2026-11-04', blocks: Store.emptyBlocks().slice(0, 1), goal: 'ocupat' });
  const dates = Store.monthDates('2026-11', [1, 3, 5]);
  assert.equal(dates.length, 13);
  const res = Store.planMonth(pid, { month: '2026-11', days: [1, 3, 5], every: 2, skipExisting: true });
  assert.equal(res.created.length, 12);
  assert.deepEqual([...res.skipped], ['2026-11-04']);
  const made = [...res.created.map((s) => s.date)];
  assert.deepEqual(made, [...dates].filter((d) => d !== '2026-11-04'));
  assert.ok(res.created.every((s) => s.status === 'planificada' && !s.feedback.rpe && s.number > 16));
  // Numeració consecutiva per ordre de data
  const nums = [...res.created.map((s) => s.number)];
  assert.deepEqual([...nums], [...nums].sort((a, b) => a - b));
  assert.equal(Store.sessionsOf(pid).length, before + 13);
  // Cada sessió porta els exercicis de l'última del mateix dia de la setmana, sense «fet» ni vídeos
  assert.ok(res.created.every((s) => Calc_itemCount(core, s) > 0));
  assert.ok(res.created.every((s) => s.blocks.every((b) => b.items.every((it) => !it.done && !it.video && !it.vbt))));
  // En blanc
  const blank = Store.planMonth(pid, { month: '2026-12', days: [2], bases: { 2: { mode: 'blank' } } });
  assert.ok(blank.created.length >= 4 && blank.created.every((s) => s.blocks.length === 0));
  void db;
});
test('copia una setmana a les següents (amb progressió) saltant els dies ocupats', () => {
  const { Store } = setup();
  const pid = 'P-DEMO-LAURA';
  const wk = '2026-09-28'; // dilluns: conté les sessions 13, 14 i 15
  const src = Store.sessionsOf(pid).filter((s) => s.date >= wk && s.date <= '2026-10-04');
  assert.equal(src.length, 3);
  const res = Store.copyWeek(pid, wk, { weeks: 2, progress: true });
  // 2 setmanes × 3 sessions, menys els dies que ja tenien sessió (la setmana del 5/10 ja en té una el dilluns)
  assert.equal(res.created.length + res.skipped.length, 6);
  assert.ok([...res.skipped].includes('2026-10-05'));
  assert.ok(res.created.every((s) => s.status === 'planificada'));
  assert.deepEqual([...res.created.map((s) => s.date)], ['2026-10-07', '2026-10-09', '2026-10-12', '2026-10-14', '2026-10-16']);
});

// ── Validació amb programes reals (opcional: només si hi ha python3 amb openpyxl o LibreOffice) ──
test('els fitxers els obre openpyxl i LibreOffice recalcula les fórmules igual (si hi són)', async (t) => {
  const have = (cmd, args) => { try { return spawnSync(cmd, args, { stdio: 'ignore' }).status === 0; } catch (e) { return false; } };
  const py = have('python3', ['-c', 'import openpyxl']);
  const lo = have('soffice', ['--version']);
  if (!py) { t.skip('python3 amb openpyxl no disponible'); return; }
  const { core, db, Store } = setup();
  const { ExcelSet } = core;
  const dir = mkdtempSync(join(tmpdir(), 'eon-xl-'));
  const d = ExcelSet.data('P-DEMO-LAURA', Store);
  const files = ExcelSet.plan(d, { today: '2026-10-05' });
  const picks = [files.find((f) => f.kind === 'overview'), files.find((f) => f.kind === 'assessment'), files.filter((f) => f.kind === 'assessment')[1], files.find((f) => f.kind === 'session')];
  const paths = [];
  for (const f of picks) { const p = join(dir, f.name); writeFileSync(p, (await f.make({}).build({ stamp: STAMP })).bytes); paths.push(p); }
  void db;
  const out = execFileSync('python3', ['-c', `
import openpyxl, sys, json
res = {}
for f in sys.argv[1:]:
    wb = openpyxl.load_workbook(f)
    res[f.split('/')[-1]] = [ws.title for ws in wb]
print(json.dumps(res))
`, ...paths], { encoding: 'utf8' });
  const res = JSON.parse(out);
  assert.equal(Object.keys(res).length, picks.length);
  if (!lo) { t.diagnostic('LibreOffice no disponible: no es recalculen les fórmules'); return; }
  // Recàlcul complet amb LibreOffice i comparació amb els valors que ha posat el generador.
  const profile = mkdtempSync(join(tmpdir(), 'eon-lo-'));
  const user = join(profile, 'user');
  execFileSync('mkdir', ['-p', user]);
  writeFileSync(join(user, 'registrymodifications.xcu'), '<?xml version="1.0" encoding="UTF-8"?><oor:items xmlns:oor="http://openoffice.org/2001/registry" xmlns:xs="http://www.w3.org/2001/XMLSchema" xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"><item oor:path="/org.openoffice.Office.Calc/Formula/Load"><prop oor:name="OOXMLRecalcMode" oor:op="fuse"><value>0</value></prop></item></oor:items>');
  const script = join(dir, 'cmp.py');
  writeFileSync(script, readFileSync(new URL('./recalc-compare.py', import.meta.url), 'utf8'));
  const run = spawnSync('python3', [script, profile, ...paths], { encoding: 'utf8', timeout: 280000 });
  assert.equal(run.status, 0, run.stdout + run.stderr);
  assert.match(run.stdout, /0 diferències/);
});
