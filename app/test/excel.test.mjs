// Proves de l'Excel del client que genera l'app (08-xlsxdoc.js, 09-excel-*.js, 09-names.js, 09-sync.js) i de la planificació del mes.
//   node --test app/test/excel.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync, spawnSync } from 'node:child_process';
import { writeFileSync, mkdtempSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCore } from './load-core.mjs';
import { createGraphMock } from './graph-mock.mjs';
import { readXlsx } from './xlsx-read.mjs';

const STAMP = '05/10/2026 18:30';
// Rellotge fix (5 d'octubre de 2026): les dades de prova són relatives a «avui» i així els tests valen qualsevol dia.
let FIXED = new Date(2026, 9, 5, 12, 0, 0).getTime();
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

// L'Excel del client fet amb les dades d'un client de la demo.
async function clientBook(core, Store, pid, today = '2026-10-05') {
  const d = core.ExcelSet.data(pid, Store);
  const files = core.ExcelSet.plan(d, { today });
  return { d, files, x: readXlsx((await files[0].make({}).build({ stamp: STAMP })).bytes) };
}
const xfsOf = (x) => [...x.zip['xl/styles.xml'].data.toString('utf8').match(/<cellXfs[\s\S]*?<\/cellXfs>/)[0].matchAll(/<xf [^>]*?(?:\/>|>[\s\S]*?<\/xf>)/g)].map((m) => m[0]);

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
  // L'Excel del client
  assert.equal(Names.clientFile(p), 'seguiment_lauravidalserra_01.xlsx');
  assert.ok(Names.OWN.root.test('seguiment_lauravidalserra_01.xlsx'));
  assert.ok(!Names.OWN.root.test('seguiment de la Laura.xlsx'));
  assert.ok(!Names.OWN.root.test('pla de la Laura.xlsx'));
  // Els Excel d'abans de l'Excel únic es reconeixen (per retirar-los); qualsevol altre fitxer, no.
  assert.ok(Names.OWN.sessions.test('sessio_lauravidalserra_20261002_01.xlsx'));
  assert.ok(Names.OWN.sessions.test('visiogeneral_lauravidalserra_01.xlsx'));
  assert.ok(!Names.OWN.sessions.test('notes de l\'equip.xlsx'));
  assert.ok(!Names.OWN.sessions.test('hipthrust_lauravidalserra_20261002_01.mp4'));
  assert.ok(Names.OWN.assess.test('retest_lauravidalserra_20261001_01.xlsx'));
  assert.ok(Names.OWN.assess.test('valoracioinicial_lauravidalserra_20260702_01.xlsx'));
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

// ── L'Excel del client ──
test('Excel del client: un sol fitxer amb resum, valoracions, un full per mes, registre i el detall de cada valoració', async () => {
  const { core, Store } = setup();
  const { ExcelSet } = core;
  const { d, files, x } = await clientBook(core, Store, 'P-DEMO-LAURA');
  assert.equal(files.length, 1, 'un sol fitxer per client');
  assert.equal(files[0].key, 'C:client');
  assert.equal(files[0].folder, 'root', 'a l\'arrel de la carpeta del client');
  assert.equal(files[0].name, 'seguiment_lauravidalserra_01.xlsx');
  assert.deepEqual(x.names, ['Resum', 'Valoracions', 'Ago26', 'Set26', 'Oct26', 'Registre', 'Val. inicial 02-07-26', 'Re-test 01-10-26']);
  // S'obre pel mes actual
  assert.match(x.zip['xl/workbook.xml'].data.toString('utf8'), /activeTab="4"/);
  // Registre: una fila per sessió (reals i previstes), amb l'enllaç a la sessió dins del full del mes
  const items = ExcelSet.items(d);
  const reg = x.sheet('Registre');
  const dataRows = [...reg.cells.keys()].filter((k) => /^A\d+$/.test(k) && reg.rowOf(k) >= 6);
  assert.equal(dataRows.length, items.length);
  assert.ok([...reg.cells.entries()].some(([k, c]) => /^L\d+$/.test(k) && /^IF\(COUNT\(J\d+,K\d+\)=2,J\d+\*K\d+,""\)$/.test(c.f || '')));
  const states = new Set([...reg.cells.entries()].filter(([k]) => /^E\d+$/.test(k) && reg.rowOf(k) >= 6).map(([, c]) => c.v));
  assert.deepEqual([...states].sort(), ['Feta', 'Planificada', 'Prevista al pla'].sort());
  const months = new Set(['Ago26', 'Set26', 'Oct26']);
  const regLinks = reg.links.filter((l) => /^Q\d+$/.test(l.ref));
  assert.equal(regLinks.length, items.filter((s) => s.date <= '2026-10-31').length, 'cada sessió enllaça amb el seu full del mes');
  assert.ok(regLinks.every((l) => months.has(l.location.match(/^'([^']+)'!/)[1])));
  // Resum: targetes amb fórmules sobre el registre, perfil i enllaços al detall de cada valoració
  const res = x.sheet('Resum');
  assert.equal(res.get('A6'), 15);
  assert.match(res.formula('A6'), /COUNTIF\('Registre'!\$E\$6:\$E\$\d+,"Feta"\)/);
  assert.equal(res.get('C6'), 6295);
  assert.match(res.text(), /Tornar a competir en trail de 42 km/);
  assert.match(res.text(), /Evitar baixades i salts/);
  assert.deepEqual(res.links.map((l) => l.location), ['\'Val. inicial 02-07-26\'!A1', '\'Re-test 01-10-26\'!A1']);
  // Valoracions: les dues l'una al costat de l'altra, amb el canvi calculat per l'Excel
  const val = x.sheet('Valoracions');
  assert.deepEqual(val.links.map((l) => l.location), ['\'Val. inicial 02-07-26\'!A1', '\'Re-test 01-10-26\'!A1']);
  assert.ok([...val.cells.values()].some((c) => c.f && /^IF\(COUNT\([A-Z]+\d+,[A-Z]+\d+\)=2,[A-Z]+\d+-[A-Z]+\d+,""\)$/.test(c.f)), 'canvi com a fórmula');
  assert.match(val.text(), /Y-Balance · composite/);
  assert.match(x.sheet('Re-test 01-10-26').text(), /Re-test · Laura Vidal Serra/);
  // Fulls protegits sense contrasenya; només les files del registre estan desbloquejades (així es pot ordenar i filtrar)
  assert.match(reg.xml, /<sheetProtection sheet="1"[^>]*sort="0"[^>]*autoFilter="0"/);
  const xfs = xfsOf(x);
  const unlocked = (sheet, ref) => /<protection locked="0"\/>/.test(xfs[sheet.cells.get(ref).s] || '');
  for (const ref of ['A6', 'F6', 'Q6', `Q${5 + items.length}`]) assert.ok(unlocked(reg, ref), `${ref} del registre desbloquejada`);
  assert.ok(!unlocked(reg, 'A5'), 'la capçalera del registre, no');
  assert.ok(!unlocked(res, 'A6') && !unlocked(x.sheet('Oct26'), 'B1'), 'la resta de fulls queda bloquejada');
});

test('full del mes a l\'estil de l\'Oriol: calendari, dades de cada dia i les sessions senceres a sota', async () => {
  const { core, Store } = setup();
  const { x } = await clientBook(core, Store, 'P-DEMO-LAURA');
  const o = x.sheet('Oct26');
  // Setmana 1 (del 28 de setembre al 4 d'octubre): dates, sessió, estat, RPE · temps
  assert.equal(o.get('A1'), 'S1');
  assert.equal(o.get('B1'), core.XlsxDoc.serial('2026-09-28'));
  assert.equal(o.get('B2'), 'Sessió 13');
  assert.equal(o.get('B3'), 'Feta ✔');
  assert.equal(o.get('N3'), 'OFF', 'el diumenge sense sessió és descans');
  // Càrrega del dia = RPE × temps i total de la setmana, calculats per l'Excel
  assert.equal(o.formula('B8'), 'IF(COUNT(B6,B7)=2,B6*B7,"")');
  assert.equal(o.get('B8'), 455);
  assert.equal(o.formula('B12'), 'SUM(B8,D8,F8,H8,J8,L8,N8)');
  assert.equal(o.get('B12'), 1300);
  // La data del calendari porta a la sessió, que és a sota amb totes les columnes de l'Oriol
  const s15 = o.find(/^SESSIÓ 15 · FETA/);
  assert.ok(s15);
  assert.equal(o.links.find((l) => l.ref === 'J1').location, `'Oct26'!${s15}`);
  const txt = o.text();
  for (const h of ['GM', 'Cont', 'Pos', 'A', 'Exercici', 'Material', '+', 'S', 'R', 'Obs', 'PROFESSIONAL', 'SETMANA']) assert.ok(txt.split('\n').includes(h), `falta la columna ${h}`);
  assert.ok(txt.includes('Back squat'));
  assert.match(txt, /Encoder · S1: 50 kg ×6 0,76→0,61 m\/s PV 20 %/);
  assert.match(txt, /RPE 7 · 65 min · 455 UA · dolor 0\/10/);
  assert.ok(txt.includes('4 · FORÇA PRINCIPAL'));
  // Planificades i previstes al pla
  assert.ok(txt.includes('Planificada'));
  assert.match(txt, /SESSIÓ PREVISTA · S\d+ DEL PLA/);
  assert.match(txt, /S\d+ del pla/);
  // En imprimir, cada setmana va a la seva pàgina (Oct26 té 5 setmanes: 4 salts)
  assert.match(o.xml, /<colBreaks count="4" manualBreakCount="4"><brk id="15" max="1048575" man="1"\/><brk id="30" /);
  // Al full d'agost només hi ha les setmanes d'agost i la sessió del 31
  const ago = x.sheet('Ago26');
  assert.equal(ago.get('A1'), 'S1');
  assert.ok(ago.find(/^SESSIÓ 1 · FETA/));
});

test('Excel d\'un client nou, sense sessions ni valoracions: resum, el mes actual i el registre buit', async () => {
  const { core, Store } = setup();
  const p = Store.newPatient({ firstName: 'Nou', lastName: 'Client' });
  const { files, x } = await clientBook(core, Store, p.id);
  assert.deepEqual([...files.map((f) => f.name)], ['seguiment_nouclient_01.xlsx']);
  assert.deepEqual(x.names, ['Resum', 'Oct26', 'Registre']);
  assert.match(x.sheet('Registre').text(), /Encara no hi ha cap sessió/);
  assert.match(x.sheet('Oct26').text(), /Cap sessió aquesta setmana/);
});

test('valoració: els tests que ja no es fan no surten (si no tenen dades) i l\'RPE del final, sí', async () => {
  const { core, Store } = setup();
  const { Calc, TEST_INDEX, PROTOCOL, ExcelAssessment } = core;
  const retired = Object.values(TEST_INDEX).filter((t) => t.retired).map((t) => t.id).sort();
  assert.deepEqual(retired, ['dyn_curl_30', 'dyn_hip_er', 'dyn_hip_ir', 'dyn_sh_er', 'pkb', 'rom_knee_ext', 'rom_sh_flex', 'slump']);
  const neuro = PROTOCOL.flatMap((s) => s.groups).find((g) => g.id === 'neuro');
  assert.equal(Calc.groupOn({ values: {} }, neuro), false, 'la neurodinàmia ja no es fa (tots els seus tests estan retirats)');
  assert.equal(Calc.groupOn({ values: { pkb: { d: 'Negatiu' } } }, neuro), true, 'una valoració antiga la conserva');
  assert.equal(Calc.groupOn({ values: {} }, PROTOCOL.flatMap((s) => s.groups).find((g) => g.id === 'postural')), true);
  const enc = PROTOCOL.flatMap((s) => s.groups).find((g) => g.kind === 'encoder');
  assert.ok(enc.retired, 'l\'encoder de la valoració ja no es fa');
  assert.equal(Calc.testOn({ values: {} }, TEST_INDEX.dyn_hip_ir), false);
  assert.equal(Calc.testOn({ values: { dyn_hip_ir: { note: 'només una nota' } } }, TEST_INDEX.dyn_hip_ir), false);
  assert.equal(Calc.testOn({ values: { dyn_hip_ir: { d: '150' } } }, TEST_INDEX.dyn_hip_ir), true, 'una valoració antiga amb dades les continua mostrant');
  assert.equal(Calc.testOn({ values: {} }, TEST_INDEX.dyn_curl_90), true);
  assert.equal(Calc.groupOn({ encoder: { rows: [] } }, enc), false);
  assert.equal(Calc.groupOn({ encoder: { rows: [{ name: 'Squat', load: '40' }] } }, enc), true);
  // La demo ja no en té
  for (const a of Object.values(Store.data.assessments)) {
    for (const id of retired) assert.ok(!Calc.testHasData((a.values || {})[id]), `${a.id}: ${id}`);
    assert.equal(((a.encoder && a.encoder.rows) || []).length, 0);
  }
  // A l'Excel: res dels tests retirats; l'RPE de cada valoració al detall i a l'evolució
  const pid = 'P-DEMO-LAURA';
  const list = Store.assessmentsOf(pid);
  Store.update('assessments', list[0].id, (x) => { x.rpe = '6'; });
  Store.update('assessments', list[1].id, (x) => { x.rpe = '8'; });
  const { x } = await clientBook(core, Store, pid);
  const txt = x.text();
  for (const id of retired) assert.ok(!txt.includes(TEST_INDEX[id].name), `no hauria de sortir: ${TEST_INDEX[id].name}`);
  assert.ok(!/Encoder ·/.test(x.sheet('Valoracions').text()) && !/Encoder · velocitat/.test(txt));
  const det = x.sheet('Re-test 01-10-26');
  const rr = det.rowOf(det.find(/^RPE de la valoració/));
  assert.equal(det.get(`B${rr}`), 8);
  const ev = x.sheet('Valoracions');
  const er = ev.rowOf(ev.find(/^RPE de la valoració$/));
  assert.deepEqual([ev.get(`C${er}`), ev.get(`E${er}`)], [6, 8]);
  void ExcelAssessment;
});

// ── Dades incompletes o estranyes ──
// Les dades que venen d'altres versions, d'una importació o d'un camp buit al mig d'una edició no poden trencar cap Excel:
// es fan servir les dades de la demo amb camps esborrats, buits, canviats de tipus, molt llargs o amb caràcters estranys.
test('dades incompletes o estranyes: cap Excel es trenca (prova aleatòria amb llavor fixa)', async () => {
  const { core, db, Store } = setup();
  const { ExcelSet } = core;
  let seed = 20261005;
  const rnd = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296; };
  const pick = (a) => a[Math.floor(rnd() * a.length)];
  const WEIRD = ['<b>&"\'</b>', '\u0000nul\u0007', '😀 emoji', '=SUM(A1)', '\n\nsalts\n de línia\n', '   espais   ', 'a'.repeat(33000), 'Text llarg amb accents àèéíòóú ç · ñ — '.repeat(40)];
  const leaf = (v) => {
    const k = rnd();
    if (k < 0.2) return undefined;
    if (k < 0.3) return null;
    if (k < 0.4) return '';
    if (k < 0.5) return typeof v === 'number' ? String(v) : typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) ? Number(v) : 'abc';
    if (k < 0.75) return pick(WEIRD);
    if (k < 0.85) return typeof v === 'number' ? -v : 0;
    if (k < 0.9) return NaN;
    return v;
  };
  const KEEP = new Set(['id', 'patientId', 'kind', 'status']);
  const mutate = (o, p) => {
    if (Array.isArray(o)) return rnd() < p / 3 ? o.slice(0, Math.floor(rnd() * o.length)) : o.map((x) => mutate(x, p));
    if (!o || typeof o !== 'object') return o;
    const out = {};
    for (const [k, v] of Object.entries(o)) {
      if (KEEP.has(k)) { out[k] = v; continue; }
      if (rnd() < p) {
        if (v && typeof v === 'object') { const r = rnd(); out[k] = r < 0.3 ? undefined : r < 0.5 ? (Array.isArray(v) ? [] : {}) : mutate(v, p); } else out[k] = leaf(v);
      } else out[k] = v && typeof v === 'object' ? mutate(v, p) : v;
    }
    return out;
  };
  const many = (m, q) => Object.fromEntries(Object.entries(m).map(([k, v]) => [k, mutate(v, q)]));
  let built = 0;
  for (let round = 0; round < 8; round++) {
    const p = 0.08 + rnd() * 0.22;
    const data = { patients: many(db.patients, p * 0.5), assessments: many(db.assessments, p), sessions: many(db.sessions, p), exercises: {}, templates: many(db.templates, p * 0.3) };
    for (const [k, x] of Object.entries(data.sessions)) if (rnd() < 0.9) x.date = db.sessions[k].date;
    for (const [k, x] of Object.entries(data.assessments)) if (rnd() < 0.9) { x.date = db.assessments[k].date; x.type = db.assessments[k].type; }
    Store.data = data;
    for (const pid of Object.keys(data.patients)) {
      const files = ExcelSet.plan(ExcelSet.data(pid, Store));
      const links = {};
      for (const f of files) {
        try {
          const { bytes } = await f.make(links).build({ stamp: STAMP });
          assert.ok(readXlsx(bytes).names.length > 0);
          built++;
        } catch (e) { assert.fail(`ronda ${round} · ${pid} · ${f.name}: ${e.message}`); }
      }
    }
  }
  assert.equal(built, 8 * Object.keys(db.patients).length, 'un Excel per client i ronda');
});

// ── Auditoria: tot el que s'omple a l'app surt a l'Excel ──
test('auditoria de la sessió: cada camp que s\'omple a l\'app surt al full del mes i al registre', async () => {
  const { core, db, Store } = setup();
  const { ExcelClient, Calc, WELLNESS } = core;
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
  const doc = ExcelClient.build({ patient: p, items: [s], plans: [], assessments: [], settings: Store.settings, today: '2026-10-06' });
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  assert.deepEqual(x.names, ['Resum', 'Oct26', 'Registre']);
  const o = x.sheet('Oct26');
  const all = o.text();
  const must = [mk('objectiu'), mk('pilar'), mk('wnotes'), mk('fnotes'), mk('decisio'), mk('grup1'), mk('grup2'), mk('metgrup1'), 'SESSIÓ 42 · FETA ✔', 'dimarts', '‹PROF›'];
  for (const b of core.BLOCKS) must.push(mk(`focus${b.key}`), mk(`metode${b.key}`));
  for (let i = 0; i < 6; i++) for (const k of ['a', 'b']) must.push(mk(`ex${i}${k}`), mk(`mat${i}${k}`), mk(`reps${i}${k}`), mk(`int${i}${k}`), `desc. ${mk(`desc${i}${k}`)}`, mk(`nota${i}${k}`));
  for (const t of must) assert.ok(all.includes(t), `no surt al full del mes: ${t}`);
  for (const q of WELLNESS) assert.ok(all.includes(`${q.label} ${s.wellness[q.k]}`), `wellness: ${q.label}`);
  assert.ok(all.includes('total 15/25'));
  // Números: RPE, durada, càrrega (fórmula), wellness total, dolor, data, sèries
  assert.ok(hasNum(o, 8) && hasNum(o, 70) && hasNum(o, 560), 'RPE, durada i càrrega');
  assert.ok(hasNum(o, 15) && hasNum(o, 3), 'wellness total i dolor');
  assert.ok(hasNum(o, core.XlsxDoc.serial('2026-10-06')), 'la data és una data d\'Excel');
  assert.ok(hasNum(o, 4), 'sèries');
  for (let n = 51; n <= 62; n++) assert.ok(all.includes(Calc.load(String(n))), `càrrega ${n}`);
  for (const t of ['ECC', 'Sd', 'UL', 'tempo 3-1-1-0', 'GMax']) assert.ok(all.includes(t), `falta ${t}`);
  // Encoder: cada sèrie
  assert.match(all, /Encoder · S1: 80 kg ×5 0\.81→0\.62 m\/s PV 23 % 501 W/);
  // Enllaços: vídeo del client (al nom) i demostració (a les observacions) de cada exercici
  const targets = o.links.map((l) => l.target);
  for (let i = 0; i < 6; i++) for (const k of ['a', 'b']) {
    assert.ok(targets.includes(`https://eonlife.sharepoint.com/v${i}${k}.mp4`), `falta el vídeo de l'exercici ${i}${k}`);
    assert.ok(targets.includes(`https://youtu.be/d${i}${k}`), `falta la demostració ${i}${k}`);
  }
  // Registre i resum
  const reg = x.sheet('Registre');
  assert.ok(reg.text().includes(mk('prof')) && reg.text().includes(mk('objectiu')));
  for (const v of [42, 8, 70, 560, 3, 15, 12]) assert.ok(hasNum(reg, v), `registre ${v}`);
  assert.match(x.sheet('Resum').get('A1'), /Seguiment · Marcel Auditoria Prova/);
});

test('auditoria de la valoració: cada test, valor i fitxer surt al detall i a l\'evolució', async () => {
  const { core, db, Store } = setup();
  const { ExcelClient, TEST_INDEX, PATTERNS } = core;
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
    patterns[pt.id] = pt.uni ? { sd: '-', se: '--', chips: [`‹chip ${pt.id}›`], note: `‹nota ${pt.id}›`, decision: `‹decisió ${pt.id}›`, pain: i === 0, secD: '21', secE: '19' } : { score: '-', chips: [`‹chip ${pt.id}›`], note: `‹nota ${pt.id}›`, decision: `‹decisió ${pt.id}›` };
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
    conclusions: { strengths: '‹forts›', priorities: '‹prioritats›', plan: '‹pla›' }, nextRetest: '2027-01-06', rpe: '9',
    files: [{ id: 'F', name: 'informekinvent_marcelauditoria_20261006_01.pdf', url: 'https://eonlife.sharepoint.com/kinvent.pdf', label: 'Informe Kinvent', date: '2026-10-06' }],
  };
  const prev = { ...a, id: 'V-PREV', date: '2026-07-06', type: 'inicial', general: { ...a.general, weight: '73' }, values: Object.fromEntries(Object.entries(values).map(([k, v]) => [k, typeof v.d === 'number' ? { ...v, d: v.d - 5, e: v.e - 3 } : v])) };
  const doc = ExcelClient.build({ patient: p, items: [], plans: [], assessments: [prev, a], settings: Store.settings, today: '2026-10-06' });
  const x = readXlsx((await doc.build({ stamp: STAMP })).bytes);
  assert.deepEqual(x.names, ['Resum', 'Valoracions', 'Oct26', 'Registre', 'Val. inicial 06-07-26', 'Re-test 06-10-26']);
  const det = x.sheet('Re-test 06-10-26');
  const all = det.text();
  for (const t of ['‹avaluador›', '‹motiu›', '‹wnotes›', '‹forts›', '‹prioritats›', '‹pla›', '‹nota ybt›', '‹nota salts›', '‹nota intent›', '‹encoder›', '‹mesura lliure›', 'Re-test']) assert.ok(all.includes(t), `no surt: ${t}`);
  for (const t of Object.values(TEST_INDEX)) assert.ok(all.includes(`‹nota ${t.id}›`), `falta la nota del test ${t.name}`);
  for (const pt of PATTERNS) assert.ok(all.includes(`‹chip ${pt.id}›`) && all.includes(`‹nota ${pt.id}›`) && all.includes(`‹decisió ${pt.id}›`), `falta el patró ${pt.name}`);
  // Tots els números: tests (dreta, esquerra, valor únic), Y-Balance, salts, encoder, bici, mesures lliures, pes, alçada i wellness
  for (const v of expectNums) assert.ok(hasNum(det, v), `falta el valor ${v}`);
  for (const v of [60, 90, 88, 85, 66, 93, 90]) assert.ok(hasNum(det, v), `Y-Balance ${v}`);
  for (const v of [33.3, 2999, 1777, 1.44, 0.55, 12, 480, 210, 61, 0.77, 444, 800, 600, 400]) assert.ok(hasNum(det, v), `rendiment ${v}`);
  for (const v of [17, 19, 23, 71.5, 178, 3, 4, 2, 5, 1, 15]) assert.ok(hasNum(det, v), `valor ${v}`);
  assert.ok([...det.cells.values()].some((c) => c.f && /'Re-test 06-10-26'!\$B\$\d+/.test(c.f)), 'N/kg amb el pes de la mateixa valoració');
  assert.equal(det.get(`B${det.rowOf(det.find(/^RPE de la valoració/))}`), 9, 'RPE de la valoració');
  // Enllaços: fotos i vídeos de cada test, Y-Balance, patrons, salts, vídeo general i PDF de Kinvent
  const targets = det.links.map((l) => l.target);
  const wantLinks = ['general.mp4', 'salts.mp4', 'ybt-d.mp4', 'ybt-e.mp4', 'kinvent.pdf'];
  for (const t of Object.values(TEST_INDEX)) {
    for (const m of t.photos || []) wantLinks.push(`foto-${t.id}-${m.k}.jpg`);
    for (const m of t.videos || []) wantLinks.push(`video-${t.id}-${m.k}.mp4`);
  }
  for (const pt of PATTERNS) for (const m of pt.videos || []) wantLinks.push(`pat-${pt.id}-${m.k}.mp4`);
  for (const l of wantLinks) assert.ok(targets.some((t) => t.endsWith(l)), `falta l'enllaç ${l}`);
  // Evolució: cada test numèric de les dues valoracions, amb el canvi
  const ev = x.sheet('Valoracions');
  for (const v of expectNums) assert.ok(hasNum(ev, v), `evolució: falta el valor ${v}`);
  for (const t of ['‹encoder›', '‹mesura lliure›', '‹forts›']) assert.ok(ev.text().includes(t), `evolució: falta ${t}`);
  const deltas = [...ev.cells.values()].filter((c) => c.f && /^IF\(COUNT/.test(c.f)).map((c) => c.v);
  assert.ok(deltas.includes(5) && deltas.includes(3), 'el canvi entre les dues valoracions');
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

test('sincronització: un sol Excel a la carpeta del client, sense repetir, substituint-lo i retirant només els Excel antics de l\'app', async () => {
  const { core, Store, db, mock, api, names, done } = await cloudSetup();
  const { Sync } = core;
  try {
    const pid = 'P-DEMO-LAURA';
    const r1 = await Sync.syncClient(pid);
    const p = Store.get('patients', pid);
    assert.ok(p.folderId && p.folderUrl, 'la carpeta del client s\'ha creat i enllaçat');
    assert.deepEqual([r1.uploaded, r1.kept, r1.removed], [1, 0, 0]);
    assert.deepEqual(names(p, []), ['seguiment_lauravidalserra_01.xlsx']);
    // «Sessions» i «Valoracions» hi són (per als PDF i els vídeos), sense cap Excel
    assert.deepEqual(names(p, ['Sessions']), []);
    assert.deepEqual(names(p, ['Valoracions']), []);
    assert.match(r1.fileUrl, /sharepoint/);
    assert.ok(r1.sessionsUrl && r1.assessUrl);
    // Segona passada sense canvis: no es puja res
    const r2 = await Sync.syncClient(pid);
    assert.deepEqual([r2.uploaded, r2.kept], [0, 1]);
    // El fitxer pujat és un Excel vàlid
    const book = () => readXlsx(mock.child(p.folderId, 'seguiment_lauravidalserra_01.xlsx').content);
    assert.ok(book().names.includes('Oct26'));
    // Canvi d'una sessió: es refà i se substitueix (mateixa ruta, sense còpies)
    const s15 = Object.values(db.sessions).find((s) => s.patientId === pid && s.number === 15);
    Store.update('sessions', s15.id, (x) => { x.feedback = { ...x.feedback, rpe: '9' }; });
    const r3 = await Sync.syncClient(pid);
    assert.equal(r3.uploaded, 1);
    assert.deepEqual(names(p, []), ['seguiment_lauravidalserra_01.xlsx']);
    assert.equal(book().sheet('Oct26').get('J6'), 9, 'el canvi surt al fitxer de la carpeta (RPE del divendres 2)');
    // Els Excel d'abans (un per sessió, un per valoració i la visió general) es retiren; cap altre fitxer es toca
    const sdir = mock.child(p.folderId, 'Sessions'), vdir = mock.child(p.folderId, 'Valoracions');
    const one = new Uint8Array([1]);
    for (const n of ['sessio_lauravidalserra_20261002_01.xlsx', 'visiogeneral_lauravidalserra_01.xlsx', 'notes de l\'equip.xlsx']) await api.putFile(sdir.id, n, one);
    await api.putFile(sdir.id, 'hipthrust_lauravidalserra_20261002_01.mp4', one, { mime: 'video/mp4' });
    await api.putFile(vdir.id, 'retest_lauravidalserra_20261001_01.xlsx', one);
    await api.putFile(vdir.id, 'informekinvent_lauravidalserra_20260702_01.pdf', one, { mime: 'application/pdf' });
    await api.putFile(p.folderId, 'pla de la Laura.xlsx', one);
    const r4 = await Sync.syncClient(pid);
    assert.deepEqual([r4.uploaded, r4.removed], [0, 3]);
    assert.deepEqual(names(p, ['Sessions']), ['hipthrust_lauravidalserra_20261002_01.mp4', 'notes de l\'equip.xlsx']);
    assert.deepEqual(names(p, ['Valoracions']), ['informekinvent_lauravidalserra_20260702_01.pdf']);
    assert.deepEqual(names(p, []), ['pla de la Laura.xlsx', 'seguiment_lauravidalserra_01.xlsx']);
    // Client reanomenat: l'Excel passa al nom nou i el vell es retira
    Store.update('patients', pid, (x) => { x.firstName = 'Laia'; });
    const r5 = await Sync.syncClient(pid);
    assert.deepEqual([r5.uploaded, r5.removed], [1, 1]);
    assert.deepEqual(names(p, []), ['pla de la Laura.xlsx', 'seguiment_laiavidalserra_01.xlsx']);
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
    // La primera vegada que s'obre una versió que fa els Excel d'una altra forma, es refan els de tots els clients
    Sync.reset();
    assert.equal(Sync.upgrade(), true);
    assert.equal(Sync.queued(), Store.all('patients').length);
    assert.equal(Sync.upgrade(), false, 'només una vegada');
    Sync.reset();
    Store.update('sessions', s.id, (x) => { x.goal = 'Un altre objectiu'; });
    Store.update('assessments', a.id, (x) => { x.general = { ...x.general, goal: 'y' }; });
    const ok = await Sync.now('P-DEMO-LAURA');
    assert.ok(ok.uploaded > 0);
    assert.equal(Sync.info('P-DEMO-LAURA').state, 'ok');
    assert.equal(Sync.queued(), 1, 'queda l\'avís de l\'altre client');
  } finally { done(); }
});

test('sincronització: carpeta esborrada o canviada de lloc, sessions sense data i versió sense núvol', async () => {
  const { core, Store, db, mock, names, done } = await cloudSetup();
  const { Sync } = core;
  try {
    const pid = 'P-DEMO-JORDI';
    await Sync.syncClient(pid);
    const old = Store.get('patients', pid).folderId;
    assert.ok(old);
    // Algú esborra la carpeta del client a OneDrive: es refà i tot es torna a pujar
    mock.dispatch('DELETE', `${mock.GRAPH}/drives/${[...mock.drives.keys()][0]}/items/${old}`, { authorization: 'Bearer tok' });
    const r = await Sync.syncClient(pid);
    const now = Store.get('patients', pid);
    assert.notEqual(now.folderId, old, 'carpeta nova');
    assert.deepEqual([r.uploaded, r.kept], [1, 0]);
    assert.deepEqual(names(now, []), ['seguiment_jordipuigferrer_01.xlsx']);
    // Una sessió sense data (mentre s'escriu la data) no surt a l'Excel ni el trenca
    const s = Object.values(db.sessions).find((x) => x.patientId === pid);
    Store.update('sessions', s.id, (x) => { x.date = ''; });
    const r2 = await Sync.syncClient(pid);
    assert.deepEqual([r2.uploaded, r2.removed, r2.failed], [1, 0, undefined]);
    assert.deepEqual(names(now, []), ['seguiment_jordipuigferrer_01.xlsx']);
    Store.update('sessions', s.id, (x) => { x.date = '2026-09-20'; });
    assert.equal((await Sync.syncClient(pid)).removed, 0);
    // Sense núvol (mode local) la sincronització no existeix i no molesta
    Store.meta = { mode: 'local' };
    assert.ok(!Sync.available() && !Sync.enabled());
    assert.equal(Sync.info(pid).state, 'off');
    Sync.reset();
    Store.update('sessions', s.id, (x) => { x.goal = 'x'; });
    assert.equal(Sync.queued(), 0, 'sense núvol no es deixa cap avís a la cua');
    Store.meta = { mode: 'm365' };
  } finally { done(); }
});

test('si l\'Excel no es pot fer, no es puja ni es retira res i es diu', async () => {
  const { core, Store, mock, api, names, done } = await cloudSetup();
  const { Sync, ExcelClient, Exports } = core;
  const orig = ExcelClient.build;
  try {
    const pid = 'P-DEMO-LAURA';
    await Sync.syncClient(pid);
    const p = Store.get('patients', pid);
    const before = mock.child(p.folderId, 'seguiment_lauravidalserra_01.xlsx').content;
    await api.putFile(mock.child(p.folderId, 'Sessions').id, 'sessio_lauravidalserra_20261002_01.xlsx', new Uint8Array([1]));
    ExcelClient.build = () => { throw new Error('dades malmeses'); };
    const s = Object.values(Store.data.sessions).find((x) => x.patientId === pid);
    Store.update('sessions', s.id, (x) => { x.goal = 'Canvi'; });
    const r = await Sync.syncClient(pid);
    assert.equal(r.failed, 1);
    assert.deepEqual([...r.failedNames], ['seguiment_lauravidalserra_01.xlsx']);
    assert.deepEqual([r.uploaded, r.removed], [0, 0], 'millor un Excel antic que cap');
    assert.ok(names(p, ['Sessions']).includes('sessio_lauravidalserra_20261002_01.xlsx'));
    assert.equal(mock.child(p.folderId, 'seguiment_lauravidalserra_01.xlsx').content, before, 'l\'Excel d\'abans es queda');
    await Sync.now(pid);
    assert.equal(Sync.info(pid).state, 'partial');
    await assert.rejects(Exports.file(pid), /dades malmeses/);
    // En arreglar-se, es puja i es retira l'antic
    ExcelClient.build = orig;
    const r2 = await Sync.syncClient(pid);
    assert.equal(r2.failed, undefined);
    assert.deepEqual([r2.uploaded, r2.removed], [1, 1]);
  } finally { ExcelClient.build = orig; done(); }
});

test('refresc diari: en canviar el dia es refà l\'Excel dels clients que entrenen', async () => {
  const { core, Store, mock, done } = await cloudSetup();
  const { Sync, ExcelClient } = core;
  const day0 = FIXED;
  try {
    const pid = 'P-DEMO-LAURA';
    Store.addPlanned(pid, { date: '2026-10-07', blocks: Store.emptyBlocks().slice(0, 1), goal: 'Pas pendent' });
    await Sync.syncClient(pid);
    const p = Store.get('patients', pid);
    const stateOf = () => {
      const reg = readXlsx(mock.child(p.folderId, 'seguiment_lauravidalserra_01.xlsx').content).sheet('Registre');
      return reg.get(`E${reg.rowOf(reg.find(/^Pas pendent$/))}`);
    };
    assert.equal(stateOf(), 'Planificada');
    assert.equal(Sync.daily(), 0, 'el mateix dia no es torna a fer res');
    // Passen quatre dies i ningú toca res: en obrir l'app, la sessió que no s'ha tancat canvia d'estat
    FIXED = new Date(2026, 9, 9, 8, 0, 0).getTime();
    Sync.reset();
    assert.ok(Sync.daily() >= 1, 'es posa a la cua');
    assert.equal(Sync.info(pid).state, 'pending');
    assert.equal(Sync.daily(), 0, 'un sol cop al dia');
    let builds = 0;
    const orig = ExcelClient.build;
    ExcelClient.build = (...a) => { builds++; return orig(...a); };
    try { await Sync.drain(); } finally { ExcelClient.build = orig; }
    assert.equal(builds, 1);
    assert.equal(Sync.info(pid).last.uploaded, 1);
    assert.equal(stateOf(), 'Sense tancar');
    // Un client que fa mesos que no entrena no es toca cada dia
    FIXED = new Date(2027, 5, 1, 8, 0, 0).getTime();
    assert.equal(Sync.daily(), 0);
  } finally { FIXED = day0; done(); }
});

test('descàrrega a la versió local: l\'Excel del client', async () => {
  const { core } = setup();
  const { Exports } = core;
  const f = await Exports.file('P-DEMO-LAURA');
  assert.equal(f.name, 'seguiment_lauravidalserra_01.xlsx');
  const x = readXlsx(f.bytes);
  assert.ok(x.names.includes('Resum') && x.names.includes('Oct26') && x.names.includes('Registre'));
  await assert.rejects(Exports.file('P-NO-HI-ES'), /No trobo aquest pacient/);
  await assert.rejects(Exports.file('P-DEMO-LAURA', 'S:x'), /No trobo aquest fitxer/);
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
  const picks = ['P-DEMO-LAURA', 'P-DEMO-JORDI'].map((pid) => ExcelSet.plan(ExcelSet.data(pid, Store), { today: '2026-10-05' })[0]);
  void files;
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
