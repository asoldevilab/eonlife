// Proves de la connexió amb Microsoft 365 (09-m365.js) contra el simulador de Graph.
//   node --test app/test/m365.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { writeFileSync, mkdtempSync } from 'node:fs';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { loadCore } from './load-core.mjs';
import { createGraphMock } from './graph-mock.mjs';

const TOKEN = 'tok-laura';

function setup({ user = 'laura@eonlife.test' } = {}) {
  const core = loadCore('09');
  const mock = createGraphMock({ users: { [TOKEN]: { email: user }, 'tok-pau': { email: 'pau@eonlife.test' } } });
  const shared = mock.createSharedFolder();
  const { GraphClient, M365Api } = core.M365;
  const graph = (token = TOKEN) => new GraphClient(async () => token, { fetchImpl: mock.fetch });
  const api = async (token = TOKEN, email = user) => {
    const g = graph(token);
    const f = await M365Api.resolveFolder(g, shared.url);
    const a = new M365Api(g, { ...f }, email);
    if (!(await a.locate())) await a.setup();
    return a;
  };
  return { core, mock, shared, graph, api };
}

const wbRows = (mock, shared, table) => mock.workbookIn(shared.folder.id).rows(table);

test('la plantilla de l\'Excel és vàlida (openpyxl) i té una taula per full', (t) => {
  const { core } = setup();
  const bytes = core.M365.m365TemplateFile();
  const dir = mkdtempSync(join(tmpdir(), 'eon-xlsx-'));
  const file = join(dir, 'plantilla.xlsx');
  writeFileSync(file, Buffer.from(bytes));
  try {
    execFileSync('python3', ['-c', 'import openpyxl'], { stdio: 'ignore' });
  } catch (e) {
    t.skip('python3 amb openpyxl no disponible');
    return;
  }
  const out = execFileSync('python3', ['-c', `
import openpyxl, json, sys
wb = openpyxl.load_workbook(sys.argv[1])
res = {}
for ws in wb:
    t = list(ws.tables.items())
    res[ws.title] = {"tables": t, "header": [c.value for c in ws[1]], "frozen": ws.freeze_panes,
                     "hidden": [k for k, d in ws.column_dimensions.items() if d.hidden]}
print(json.dumps(res))
`, file], { encoding: 'utf8' });
  const res = JSON.parse(out);
  assert.deepEqual(Object.keys(res), ['Pacients', 'Valoracions', 'Sessions', 'Biblioteca', 'Plantilles', 'Configuracio', 'Registre_exercicis']);
  for (const [name, info] of Object.entries(res)) {
    assert.equal(info.tables.length, 1, name);
    assert.equal(info.tables[0][0], `t${name}`);
    assert.equal(info.frozen, 'A2');
  }
  assert.deepEqual(res.Pacients.header.slice(0, 6), ['id', 'patient_id', 'updated_at', 'updated_by', 'deleted', 'data_json']);
  assert.ok(res.Valoracions.header.some((h) => /^YBT composite D/.test(h)), 'columnes del Y-Balance');
  assert.ok(res.Valoracions.header.some((h) => /^Força/.test(h)), 'columnes de dinamometria');
  assert.ok(res.Pacients.hidden.includes('F'), 'data_json amagada');
});

test('connecta la carpeta compartida, prepara l\'Excel i la carpeta de clients', async () => {
  const { mock, shared, api } = setup();
  const a = await api();
  assert.ok(mock.child(shared.folder.id, 'EON Life · Base de dades.xlsx'));
  assert.ok(mock.child(shared.folder.id, 'EON Life · Clients'));
  assert.equal(a.cfg.folderName, 'EON Life · Dades');
  // Segona tauleta: ja hi és, no es torna a crear.
  const b = await api('tok-pau', 'pau@eonlife.test');
  assert.equal(b.workbookItem.id, a.workbookItem.id);
  assert.equal(mock.childrenOf(shared.folder.id).length, 2);
});

test('desa, actualitza i torna a llegir registres sense duplicar files', async () => {
  const { core, mock, shared, api } = setup();
  const a = await api();
  const { Flat } = core;
  const p = { id: 'P-TEST1', firstName: 'Laura', lastName: 'Puig', profile: 'A', professional: 'Pau Roca', phone: '+34 600 11 22 33', notes: '=HYPERLINK("http://x","clic")' };
  await a.db.upsert('patients', p, Flat.patient(p), null, a.user);
  await a.db.upsert('patients', { ...p, lastName: 'Puig Serra' }, Flat.patient({ ...p, lastName: 'Puig Serra' }), null, a.user);
  const rows = wbRows(mock, shared, 'tPacients').filter((r) => r.id);
  assert.equal(rows.length, 1);
  assert.equal(rows[0].Cognoms, 'Puig Serra');
  assert.equal(rows[0].updated_by, 'laura@eonlife.test');
  assert.equal(rows[0]['Telèfon'], '+34 600 11 22 33', 'el + inicial no es converteix en fórmula');
  assert.equal(rows[0].Notes, '=HYPERLINK("http://x","clic")', 'les fórmules queden com a text');
  const recs = await a.bootstrap();
  assert.equal(recs.patients.length, 1);
  assert.equal(recs.patients[0].lastName, 'Puig Serra');
  assert.equal(recs.patients[0].updatedBy, 'laura@eonlife.test');
});

test('valoració: columnes llegibles, tests nous i registres llargs', async () => {
  const { core, mock, shared, api } = setup();
  const a = await api();
  const { Flat, TEST_INDEX } = core;
  const p = { id: 'P-2', firstName: 'Jordi', lastName: 'Vila' };
  const dyn = Object.values(TEST_INDEX).find((x) => x.perKg);
  const v = {
    id: 'V-1', patientId: 'P-2', date: '2026-09-28', type: 'inicial', general: { weight: '80' },
    values: { [dyn.id]: { d: '400', e: '320' } }, ybt: { d: { ant: '60', pm: '95', pl: '90', len: '90' }, e: { ant: '55', pm: '92', pl: '88', len: '90' } },
    jumps: { attempts: [] }, encoder: { rows: [] }, bike: {}, patterns: {},
    free: [{ id: 'F1', name: 'Grip test', unit: 'kg', d: '44', e: '40' }],
    conclusions: { notes: 'x'.repeat(70000) }, // obliga a repartir data_json en diverses cel·les
  };
  await a.db.upsert('assessments', v, Flat.assessment(v, p), null, a.user);
  const row = wbRows(mock, shared, 'tValoracions').find((r) => r.id === 'V-1');
  assert.equal(row.patient_id, 'P-2');
  assert.equal(row[`${dyn.col} D (${dyn.unit})`], 400);
  assert.ok(Math.abs(row[`${dyn.col} asimetria (%)`] - 20) < 0.01);
  assert.equal(row['YBT diferència anterior (cm)'], 5);
  assert.equal(row['Grip test D (kg)'], 44, 'columna nova afegida a la taula');
  assert.ok(String(row.data_json_2).startsWith('~'));
  const back = (await a.bootstrap()).assessments.find((x) => x.id === 'V-1');
  assert.equal(back.conclusions.notes.length, 70000);
  assert.equal(back.values[dyn.id].d, '400');
});

test('sessions: registre d\'exercicis substituït sense tocar les altres sessions', async () => {
  const { core, mock, shared, api } = setup();
  const a = await api();
  const { Flat } = core;
  const p = { id: 'P-3', firstName: 'Montse', lastName: 'Riera' };
  const mk = (id, n) => ({
    id, patientId: 'P-3', date: '2026-09-2' + n, number: n, blocks: [
      { key: 'for', focus: 'Dominant de genoll', items: [
        { id: 'I1', name: 'Split Squat', sets: '3', reps: '8-10', load: '20', intensity: 'RIR 2' },
        { id: 'I2', name: 'Hip Thrust', sets: '3', reps: '6', load: '60' },
        { id: 'I3', name: 'Leg Curl', sets: '2', reps: '12', load: '25' },
      ] },
    ], feedback: {}, readiness: {},
  });
  const s1 = mk('S-1', 1), s2 = mk('S-2', 2);
  for (const s of [s1, s2]) await a.db.upsert('sessions', s, Flat.session(s, p), Flat.sessionLog(s, p), a.user);
  let log = wbRows(mock, shared, 'tRegistre_exercicis').filter((r) => r.session_id);
  assert.equal(log.length, 6);
  assert.equal(log[0]['Reps / temps'], '8-10', '«8-10» no es converteix en data');
  // La sessió 1 perd dos exercicis: només se n'esborren les seves files.
  s1.blocks[0].items = s1.blocks[0].items.slice(0, 1);
  await a.db.upsert('sessions', s1, Flat.session(s1, p), Flat.sessionLog(s1, p), a.user);
  log = wbRows(mock, shared, 'tRegistre_exercicis').filter((r) => r.session_id);
  assert.equal(log.filter((r) => r.session_id === 'S-1').length, 1);
  assert.equal(log.filter((r) => r.session_id === 'S-2').length, 3);
  // Esborrar la sessió 2 treu les seves files del registre i la sessió de les dades.
  await a.db.upsert('sessions', { ...s2, deleted: true }, Flat.session(s2, p), [], a.user);
  log = wbRows(mock, shared, 'tRegistre_exercicis').filter((r) => r.session_id);
  assert.deepEqual(log.map((r) => r.session_id), ['S-1']);
  const recs = await a.bootstrap();
  assert.deepEqual(Array.from(recs.sessions, (s) => s.id), ['S-1']);
});

test('un error 504 després d\'afegir la fila no la duplica', async () => {
  const { core, mock, shared, api } = setup();
  const a = await api();
  mock.fault({ method: 'POST', match: /tPacients\/rows\/add/, status: 504, after: true });
  const p = { id: 'P-504', firstName: 'Àlex', lastName: 'Font' };
  await a.db.upsert('patients', p, core.Flat.patient(p), null, a.user);
  const rows = wbRows(mock, shared, 'tPacients').filter((r) => r.id === 'P-504');
  assert.equal(rows.length, 1);
});

test('dues tauletes que creen clients alhora no es trepitgen', async () => {
  const { core, mock, shared, api } = setup();
  const a = await api();
  const b = await api('tok-pau', 'pau@eonlife.test');
  const ps = Array.from({ length: 6 }, (_, i) => ({ id: `P-C${i}`, firstName: `Client ${i}`, lastName: 'Prova' }));
  await Promise.all(ps.map((p, i) => (i % 2 ? b : a).db.upsert('patients', p, core.Flat.patient(p), null, 'x')));
  const ids = wbRows(mock, shared, 'tPacients').map((r) => r.id).filter(Boolean).sort();
  assert.deepEqual(ids, ps.map((p) => p.id).sort());
});

test('carpeta del client, llistat de fitxers i pujada de vídeo per trossos', async () => {
  const { mock, api } = setup();
  const a = await api();
  const p = { id: 'P-9', firstName: 'Laura', lastName: 'Puig' };
  const f1 = await a.ensureFolder(p);
  const f2 = await a.ensureFolder({ ...p, folderId: '' });
  assert.equal(f1.folderId, f2.folderId);
  const folder = mock.items.get(f1.folderId);
  assert.equal(folder.name, 'Puig, Laura · P-9');
  assert.deepEqual(mock.childrenOf(f1.folderId).map((x) => x.name).sort(), ['01 · Valoracions', '02 · Vídeos', '03 · Informes']);
  const size = 327680 * 16 + 1234; // dos trossos
  const blob = new Blob([new Uint8Array(size).fill(7)], { type: 'video/mp4' });
  blob.name = 'IMG_0001.MOV';
  const seen = [];
  const up = await a.uploadFile(f1.folderId, blob, { name: '2026-09-28 · Squat: dreta/esquerra.mov', onProgress: (x) => seen.push(x) });
  assert.ok(up.url);
  assert.equal(seen.at(-1), 1);
  const videos = mock.child(f1.folderId, '02 · Vídeos');
  const file = mock.childrenOf(videos.id)[0];
  assert.equal(file.name, '2026-09-28 · Squat dreta esquerra.mov');
  assert.equal(file.content.length, size);
  const list = await a.listFiles(f1.folderId);
  assert.equal(list.length, 1);
  assert.equal(list[0].folder, '02 · Vídeos');
  // Miniatura i adreça de reproducció per a l'informe.
  const [m] = await a.media([list[0].id]);
  assert.match(m.play, /download\.mock\.test/);
  assert.match(m.thumb, /thumb/);
});

test('sense permís d\'edició: missatge clar', async () => {
  const { core, mock, api } = setup();
  const a = await api();
  mock.setReadOnly(['laura@eonlife.test']);
  const p = { id: 'P-RO', firstName: 'X' };
  await assert.rejects(a.db.upsert('patients', p, core.Flat.patient(p), null, a.user), /permís per escriure/);
});

test('enllaç que no és d\'una carpeta o que no existeix', async () => {
  const { core, graph } = setup();
  const { M365Api } = core.M365;
  await assert.rejects(M365Api.resolveFolder(graph(), 'hola'), /https/);
  await assert.rejects(M365Api.resolveFolder(graph(), 'https://eonlife.sharepoint.com/:f:/s/centre/NOEXISTEIX'), /No s'ha pogut obrir/);
});

test('valors de cel·la: números, dates i textos ambigus', () => {
  const { core } = setup();
  const { xlCell } = core.M365;
  assert.equal(xlCell('12,5'), 12.5);
  assert.equal(xlCell('2026-09-28'), '2026-09-28');
  assert.equal(xlCell('8-10'), "'8-10");
  assert.equal(xlCell('3/4'), "'3/4");
  assert.equal(xlCell("'hola"), "''hola");
  assert.equal(xlCell('-RIR'), "'-RIR");
  assert.equal(xlCell('RIR 2'), 'RIR 2');
  assert.equal(xlCell(true), true);
  assert.equal(xlCell(null), '');
});

test('taules llargues: es llegeixen per trossos i en poques crides', async () => {
  const { core, mock, api } = setup();
  const a = await api();
  for (let i = 0; i < 450; i++) {
    const p = { id: `P-L${String(i).padStart(3, '0')}`, firstName: `Client ${i}`, lastName: 'Llarg' };
    await a.db.upsert('patients', p, core.Flat.patient(p), null, a.user);
  }
  await a.db.upsert('patients', { id: 'P-L007', firstName: 'Esborrat', deleted: true }, {}, null, a.user);
  const before = mock.log.length;
  const recs = await a.bootstrap();
  const calls = mock.log.slice(before).filter((x) => /\$batch/.test(x.url)).length;
  assert.equal(recs.patients.length, 449);
  assert.ok(recs.patients.some((p) => p.id === 'P-L449'));
  assert.ok(calls <= 4, `crides $batch: ${calls}`);
});

test('informe de Kinvent (PDF) a «01 · Valoracions» del client', async () => {
  const { mock, api } = setup();
  const a = await api();
  const f = await a.ensureFolder({ id: 'P-K', firstName: 'Jordi', lastName: 'Vila' });
  const pdf = new Blob([new Uint8Array(40000).fill(3)], { type: 'application/pdf' });
  const up = await a.uploadFile(f.folderId, pdf, { name: '2026-09-29 · Informe Kinvent K-Push · Jordi Vila.pdf', subfolder: '01 · Valoracions' });
  const dir = mock.child(f.folderId, '01 · Valoracions');
  assert.deepEqual(mock.childrenOf(dir.id).map((x) => x.name), ['2026-09-29 · Informe Kinvent K-Push · Jordi Vila.pdf']);
  assert.ok(up.url.includes('sharepoint.com'));
});
