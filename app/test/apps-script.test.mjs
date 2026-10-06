// Tests del servidor de Google Apps Script (Code.gs) amb serveis simulats.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadGas } from './gas-mock.mjs';
import { loadCore } from './load-core.mjs';

const C = loadCore();

function fresh() {
  const env = loadGas();
  env.gas.setup();
  return env;
}

const headersOf = (sh) => sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
const rowsOf = (sh) => (sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues());

test('setup crea les pestanyes, la carpeta de clients i treu el full buit', () => {
  const { ss, props, myDrive } = fresh();
  const names = ss.getSheets().map((s) => s.getName());
  for (const n of ['Pacients', 'Valoracions', 'Sessions', 'Biblioteca', 'Plantilles', 'Configuracio', 'Registre_exercicis']) assert.ok(names.includes(n), n);
  assert.ok(!names.includes('Full 1'));
  assert.equal(props.get('SPREADSHEET_ID'), ss.getId());
  assert.equal(myDrive.folders[0].getName(), 'EON Life · Clients');
  assert.deepEqual(headersOf(ss.getSheetByName('Pacients')), ['id', 'patient_id', 'updated_at', 'updated_by', 'deleted', 'data_json']);
});

test('upsert desa, actualitza sense duplicar i el bootstrap ho retorna', () => {
  const { gas, ss } = fresh();
  const p = { id: 'P-1', firstName: 'Laura', lastName: 'Vidal', profile: 'A' };
  let r = gas.api({ action: 'upsert', kind: 'patients', record: p, flat: C.Flat.patient(p) });
  assert.equal(r.ok, true, r.error);
  r = gas.api({ action: 'upsert', kind: 'patients', record: { ...p, lastName: 'Vidal Serra' }, flat: C.Flat.patient({ ...p, lastName: 'Vidal Serra' }) });
  assert.equal(r.ok, true);
  const sh = ss.getSheetByName('Pacients');
  assert.equal(rowsOf(sh).length, 1);
  const h = headersOf(sh);
  assert.equal(rowsOf(sh)[0][h.indexOf('Cognoms')], 'Vidal Serra');
  assert.equal(rowsOf(sh)[0][h.indexOf('patient_id')], 'P-1');
  const boot = gas.api({ action: 'bootstrap' });
  assert.equal(boot.ok, true);
  assert.equal(boot.data.records.patients[0].lastName, 'Vidal Serra');
  assert.equal(boot.data.records.patients[0].updatedBy, 'coach@eonlife.test');
  assert.equal(boot.data.user, 'coach@eonlife.test');
});

test('una valoració completa amplia les columnes i es pot llegir', () => {
  const { gas, ss } = fresh();
  const db = C.makeDemoData();
  const a = Object.values(db.assessments).find((x) => x.patientId === 'P-DEMO-LAURA');
  const flat = C.Flat.assessment(a, db.patients['P-DEMO-LAURA']);
  const r = gas.api({ action: 'upsert', kind: 'assessments', record: a, flat });
  assert.equal(r.ok, true, r.error);
  const sh = ss.getSheetByName('Valoracions');
  const h = headersOf(sh);
  assert.ok(h.length > 130, `columnes: ${h.length}`);
  const row = rowsOf(sh)[0];
  assert.equal(row[h.indexOf('CMJ millor altura (cm)')], flat['CMJ millor altura (cm)']);
  const back = gas.api({ action: 'bootstrap' }).data.records.assessments[0];
  assert.equal(back.id, a.id);
  assert.equal(JSON.stringify(back.values.wblt), JSON.stringify(a.values.wblt));
});

test('registres molt grans es parteixen en diverses cel·les', () => {
  const { gas, ss } = fresh();
  const big = { id: 'S-BIG', patientId: 'P-1', blocks: [], note: 'x'.repeat(120000) };
  const r = gas.api({ action: 'upsert', kind: 'sessions', record: big, flat: {} });
  assert.equal(r.ok, true, r.error);
  const h = headersOf(ss.getSheetByName('Sessions'));
  assert.ok(h.includes('data_json_2') && h.includes('data_json_3'));
  const back = gas.api({ action: 'bootstrap' }).data.records.sessions[0];
  assert.equal(back.note.length, 120000);
  // Si després es fa més petit, les cel·les de continuació es buiden.
  gas.api({ action: 'upsert', kind: 'sessions', record: { ...big, note: 'curt' }, flat: {} });
  assert.equal(gas.api({ action: 'bootstrap' }).data.records.sessions[0].note, 'curt');
});

test('registre d\'exercicis: substitueix les files de la sessió i les treu en eliminar-la', () => {
  const { gas, ss } = fresh();
  const db = C.makeDemoData();
  const sessions = Object.values(db.sessions).filter((s) => s.patientId === 'P-DEMO-LAURA' && s.status === 'feta').slice(0, 3);
  for (const s of sessions) {
    const r = gas.api({ action: 'upsert', kind: 'sessions', record: s, flat: C.Flat.session(s, db.patients[s.patientId]), log: C.Flat.sessionLog(s, db.patients[s.patientId]) });
    assert.equal(r.ok, true, r.error);
  }
  const log = ss.getSheetByName('Registre_exercicis');
  const total = sessions.reduce((n, s) => n + C.Flat.sessionLog(s, db.patients[s.patientId]).length, 0);
  assert.equal(rowsOf(log).length, total);
  // Tornar a desar la sessió del mig amb menys exercicis.
  const mid = JSON.parse(JSON.stringify(sessions[1]));
  mid.blocks.forEach((b) => { b.items = b.items.slice(0, 1); });
  gas.api({ action: 'upsert', kind: 'sessions', record: mid, flat: {}, log: C.Flat.sessionLog(mid, db.patients[mid.patientId]) });
  const midRows = rowsOf(log).filter((r) => r[0] === mid.id);
  assert.equal(midRows.length, C.Flat.sessionLog(mid, db.patients[mid.patientId]).length);
  // Eliminar-la.
  gas.api({ action: 'upsert', kind: 'sessions', record: { ...mid, deleted: true }, flat: {} });
  assert.equal(rowsOf(log).filter((r) => r[0] === mid.id).length, 0);
  assert.equal(gas.api({ action: 'bootstrap' }).data.records.sessions.filter((s) => s.id === mid.id).length, 0);
});

test('esborrar totes les files del registre no falla encara que el full sigui just', () => {
  const { gas, ss } = fresh();
  const log = ss.getSheetByName('Registre_exercicis');
  log.maxRows = 1;
  const s = { id: 'S-1', patientId: 'P-1', date: '2026-09-28', blocks: [] };
  const rows = [{ Exercici: 'Squat', 'Sèries': '3' }, { Exercici: 'RDL', 'Sèries': '3' }];
  assert.equal(gas.api({ action: 'upsert', kind: 'sessions', record: s, flat: {}, log: rows }).ok, true);
  assert.equal(rowsOf(log).length, 2);
  const r = gas.api({ action: 'upsert', kind: 'sessions', record: s, flat: {}, log: [] });
  assert.equal(r.ok, true, r.error);
  assert.equal(rowsOf(log).length, 0);
});

test('els textos que semblen fórmules es desen com a text i els números com a número', () => {
  const { gas, ss } = fresh();
  const p = { id: 'P-2', firstName: '=IMPORTXML("x")' };
  gas.api({ action: 'upsert', kind: 'patients', record: p, flat: { Nom: '=IMPORTXML("x")', Edat: '35', Pes: '57,5', Nota: '-' } });
  const sh = ss.getSheetByName('Pacients');
  const h = headersOf(sh);
  const row = rowsOf(sh)[0];
  assert.equal(row[h.indexOf('Nom')], '=IMPORTXML("x")'); // text literal, no fórmula
  assert.equal(row[h.indexOf('Edat')], 35);
  assert.equal(row[h.indexOf('Pes')], 57.5);
});

test('carpeta del client: es crea una vegada amb subcarpetes i es reutilitza', () => {
  const { gas, myDrive } = fresh();
  const r1 = gas.api({ action: 'ensureFolder', patient: { id: 'P-9', firstName: 'Jordi', lastName: 'Puig' } });
  assert.equal(r1.ok, true, r1.error);
  const root = myDrive.folders[0];
  assert.equal(root.folders.length, 1);
  assert.equal(root.folders[0].getName(), 'Puig, Jordi · P-9');
  assert.deepEqual(root.folders[0].folders.map((f) => f.getName()), ['01 · Valoracions', '02 · Vídeos', '03 · Informes']);
  const r2 = gas.api({ action: 'ensureFolder', patient: { id: 'P-9', firstName: 'Jordi', lastName: 'Puig' } });
  assert.equal(r2.data.folderId, r1.data.folderId);
  const r3 = gas.api({ action: 'ensureFolder', patient: { id: 'P-9', folderId: r1.data.folderId } });
  assert.equal(r3.data.folderUrl, r1.data.folderUrl);
  // Fitxers per enllaçar vídeos.
  root.folders[0].folders[1].addFile('squat-frontal.mov', 'video/quicktime');
  const files = gas.api({ action: 'listFiles', folderId: r1.data.folderId });
  assert.equal(files.ok, true);
  assert.equal(files.data[0].name, 'squat-frontal.mov');
  assert.equal(files.data[0].folder, '02 · Vídeos');
});

test('errors controlats', () => {
  const { gas } = fresh();
  assert.match(gas.api({ action: 'upsert', kind: 'res', record: { id: 'x' } }).error, /desconegut/);
  assert.match(gas.api({ action: 'upsert', kind: 'patients', record: { id: 'a b' } }).error, /identificador/);
  assert.match(gas.api({ action: 'volar' }).error, /Acció desconeguda/);
});

test('la biblioteca retorna també els exercicis eliminats (per amagar els de base)', () => {
  const { gas } = fresh();
  gas.api({ action: 'upsert', kind: 'exercises', record: { id: 'X-MOB-01', deleted: true }, flat: {} });
  gas.api({ action: 'upsert', kind: 'patients', record: { id: 'P-3', deleted: true }, flat: {} });
  const rec = gas.api({ action: 'bootstrap' }).data.records;
  assert.equal(rec.exercises.length, 1);
  assert.equal(rec.exercises[0].deleted, true);
  assert.equal(rec.patients.length, 0);
});
