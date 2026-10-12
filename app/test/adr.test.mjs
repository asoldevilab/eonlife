// Lector de les dades de l'ADR (Encoder i Jumping): CSV en diversos formats, Excel i conversió a perfil, sèries i salts.
//   node --test app/test/adr.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import { loadCore } from './load-core.mjs';

const FixedDate = class extends Date { constructor(...a) { super(...(a.length ? a : ['2026-10-12T10:00:00Z'])); } static now() { return new Date('2026-10-12T10:00:00Z').getTime(); } };
const core = loadCore('09', { CompressionStream, DecompressionStream, Response, Blob, Date: FixedDate });
const { ADR, Calc } = core;
const laura = { firstName: 'Laura', lastName: 'Vidal Serra' };

// Exportació d'un entrenament (castellà, «;» i coma decimal): una fila per repetició, dues persones i dos exercicis.
const ES = [
  'Atleta;Ejercicio;Fecha;Serie;Repetición;Carga (kg);Velocidad media (m/s);Velocidad media propulsiva (m/s);Velocidad máxima (m/s);Potencia (W);ROM (cm)',
  'Laura Vidal Serra;Press banca;12/10/2026 11:03;1;1;40;1,04;1,10;1,50;408;45',
  'Laura Vidal Serra;Press banca;12/10/2026 11:03;1;2;40;0,94;1,00;1,40;369;45',
  'Laura Vidal Serra;Press banca;12/10/2026 11:03;1;3;40;0,86;0,92;1,30;337;44',
  'Laura Vidal Serra;Press banca;12/10/2026 11:05;2;1;50;0,76;0,81;1,10;372;44',
  'Laura Vidal Serra;Press banca;12/10/2026 11:05;2;2;50;0,75;0,80;1,05;368;44',
  'Laura Vidal Serra;Press banca;12/10/2026 11:05;2;3;50;0,69;0,73;1,00;338;43',
  'Laura Vidal Serra;Press banca;12/10/2026 11:08;3;1;60;0,59;0,63;0,90;347;43',
  'Laura Vidal Serra;Press banca;12/10/2026 11:08;3;2;60;0,58;0,62;0,88;341;43',
  'Laura Vidal Serra;Press banca;12/10/2026 11:08;3;3;60;0,56;0,60;0,85;329;42',
  'Laura Vidal Serra;Press banca;12/10/2026 11:11;4;1;70;0,45;0,49;0,70;309;42',
  'Laura Vidal Serra;Press banca;12/10/2026 11:11;4;2;70;0,39;0,43;0,64;268;41',
  'Laura Vidal Serra;Press banca;12/10/2026 11:11;4;3;70;0,27;0,31;0,50;185;40',
  'Laura Vidal Serra;Sentadilla;12/10/2026 11:30;1;1;60;0,90;0,95;1,30;529;50',
  'Laura Vidal Serra;Sentadilla;12/10/2026 11:30;1;2;60;0,81;0,86;1,20;476;50',
  'Jordi Puig Ferrer;Press banca;12/10/2026 12:00;1;1;80;0,50;0,55;0,80;392;45',
].join('\n');

test('ADR: CSV en castellà (;, coma decimal, una fila per repetició): columnes, persones, exercicis i dies', () => {
  const r = ADR.parseText(ES, laura);
  assert.equal(r.error, null);
  const h = r.headers;
  assert.equal(h[r.map.athlete], 'Atleta');
  assert.equal(h[r.map.exercise], 'Ejercicio');
  assert.equal(h[r.map.set], 'Serie');
  assert.equal(h[r.map.rep], 'Repetición');
  assert.match(h[r.map.load], /^Carga/);
  assert.match(h[r.map.mv], /^Velocidad media \(/);
  assert.match(h[r.map.mpv], /propulsiva/);
  assert.match(h[r.map.pv], /máxima/);
  assert.match(h[r.map.power], /^Potencia/);
  assert.equal(r.records.length, 15);
  assert.deepEqual([...r.vars], ['mv', 'mpv', 'pv']);
  // Persones: la Laura coincideix; en Jordi, no
  assert.deepEqual([...r.match.names], ['Laura Vidal Serra']);
  assert.equal(r.people.length, 2);
  // Exercicis, amb el seu preset
  const ex = Object.fromEntries(r.exercises.map((e) => [e.name, e]));
  assert.equal(ex['Press banca'].preset, 'bench');
  assert.equal(ex['Sentadilla'].preset, 'squat');
  assert.equal(r.dates[0].date, '2026-10-12');
});

test('ADR: perfil càrrega-velocitat: la més ràpida de cada càrrega o totes les repeticions (i quadra amb la pantalla de l\'ADR)', () => {
  const r = ADR.parseText(ES, laura);
  const mine = r.records.filter((x) => x.athlete === 'Laura Vidal Serra' && x.exercise === 'Press banca');
  const fast = ADR.points(mine, { variable: 'mv', mode: 'fast' });
  assert.deepEqual([...fast.map((p) => [p.load, p.v])], [[40, 1.04], [50, 0.76], [60, 0.59], [70, 0.45]]);
  const all = ADR.points(mine, { variable: 'mv', mode: 'all' });
  assert.equal(all.length, 12);
  // Amb les 12 repeticions surt el mateix que a la pantalla de l'ADR: 1RM 79,08 kg a 0,17 m/s
  const ex = { name: 'Press banca', preset: 'bench', mvt: '0,17', rows: all.map((p, i) => ({ id: `R${i}`, load: String(p.load), mv: String(p.v) })) };
  assert.equal(Math.round(Calc.lvpExercise(ex, null).rm * 100) / 100, 79.08);
  assert.equal(all[0].power, 408);
  // Velocitat propulsiva o de pic en lloc de la mitjana
  assert.equal(ADR.points(mine, { variable: 'mpv', mode: 'fast' })[0].v, 1.1);
  assert.equal(ADR.points(mine, { variable: 'pv', mode: 'fast' })[0].v, 1.5);
});

test('ADR: sèries per a la sessió: repeticions, V 1a i última, pèrdua de velocitat i potència màxima', () => {
  const r = ADR.parseText(ES, laura);
  const mine = r.records.filter((x) => x.athlete === 'Laura Vidal Serra' && x.exercise === 'Press banca');
  const sets = ADR.sets(mine, {});
  assert.equal(sets.length, 4, 'una sèrie per càrrega');
  assert.deepEqual([...sets.map((s) => s.reps)], [3, 3, 3, 3]);
  assert.equal(sets[0].kg, 40);
  assert.equal(sets[0].v1, 1.04);
  assert.equal(sets[0].vlast, 0.86);
  assert.equal(Math.round(sets[0].vl), 17, '(1,04 − 0,86) / 1,04');
  assert.equal(sets[0].pmax, 408);
  const row = ADR.setRow(sets[0]);
  assert.deepEqual({ ...row }, { kg: '40', reps: '3', v1: '1,04', vlast: '0,86', vl: '17', pmax: '408' });
  // Sense columna de sèrie: una de nova quan la repetició torna a l'1 o canvia la càrrega
  const noSet = ADR.parseText('Ejercicio;Rep;Carga;Velocidad media\nSquat;1;60;0,9\nSquat;2;60;0,8\nSquat;1;60;0,85\nSquat;2;60;0,75\nSquat;1;70;0,7', null);
  assert.deepEqual([...ADR.sets(noSet.records, {}).map((s) => s.reps)], [2, 2, 1]);
  // La columna de pèrdua de velocitat de l'ADR, si hi és, mana
  const withVl = ADR.parseText('Serie;Rep;Carga;Velocidad media;Pérdida de velocidad\n1;1;60;0,9;0\n1;2;60;0,8;11,1\n1;3;60;0,72;20', null);
  assert.equal(ADR.sets(withVl.records, {})[0].vl, 20);
});

test('ADR: CSV en anglès amb «,» i punt decimal, amb línies de títol abans de la capçalera i unitats a les cel·les', () => {
  const en = [
    'ADR System export, workout "Strength", 12/10/2026',
    '',
    'Athlete,Exercise,Date,Set,Rep,Load,Mean Velocity,Peak Velocity,Mean Power',
    'Laura Vidal Serra,Back Squat,2026-10-12 11:00,1,1,60 kg,0.90 m/s,1.30,529 W',
    'Laura Vidal Serra,Back Squat,2026-10-12 11:00,1,2,60 kg,0.81 m/s,1.20,476 W',
  ].join('\n');
  const r = ADR.parseText(en, laura);
  assert.equal(r.error, null);
  assert.equal(r.records.length, 2);
  assert.equal(r.records[0].load, 60);
  assert.equal(r.records[0].mv, 0.9);
  assert.equal(r.records[0].pv, 1.3);
  assert.equal(r.records[0].power, 529);
  assert.equal(r.exercises[0].preset, 'squat');
  assert.equal(r.records[0].date, '2026-10-12');
});

test('ADR: correcció del mapatge a mà (capçaleres que no es reconeixen) i unitats en cm/s', () => {
  const odd = 'Quilos;Rapidesa (cm/s);Intent\n40;104;1\n50;76;1\n60;59;1';
  let r = ADR.parseText(odd, null);
  assert.equal(r.map.load, undefined, 'la càrrega no es reconeix sola');
  assert.equal(ADR.points(r.records, {}).length, 0, 'sense càrrega no hi ha punts');
  r = ADR.parseText(odd, null, { load: 0 });
  assert.equal(r.error, null);
  assert.equal(r.records.length, 3);
  assert.equal(r.records[0].mv, 1.04, 'cm/s → m/s');
  assert.equal(r.records[0].load, 40);
  assert.deepEqual([...ADR.points(r.records, {}).map((p) => [p.load, p.v])], [[40, 1.04], [50, 0.76], [60, 0.59]]);
  // La mateixa columna assignada a una altra cosa o a cap
  r = ADR.parseText(odd, null, { load: 0, mv: '' });
  assert.equal(r.error, 'No trobo cap fila amb velocitat (o salt) al fitxer. Assigna les columnes a mà.');
  // La capçalera serveix de clau per recordar el mapatge
  assert.equal(typeof ADR.sig(r.headers), 'string');
});

test('ADR Jumping: salts amb altura, temps de vol i contacte (en m i s es converteixen a cm i ms)', () => {
  const csv = 'Atleta;Salto;Fecha;Altura (cm);Tiempo de vuelo (ms);Tiempo de contacto (ms);RSI\nLaura Vidal Serra;CMJ;12/10/2026 10:10;31,2;505;;\nLaura Vidal Serra;DJ;12/10/2026 10:15;28,0;470;190;1,47';
  const r = ADR.parseText(csv, laura);
  assert.equal(r.error, null);
  assert.equal(r.hasJumps, true);
  assert.equal(r.hasEncoder, false);
  const j = ADR.jumps(r.records);
  assert.equal(j.length, 2);
  assert.equal(j[0].type, 'CMJ');
  assert.equal(j[0].height, '31,2');
  assert.equal(j[0].flight, '505');
  assert.equal(j[1].type, 'DJ');
  assert.equal(j[1].contact, '190');
  assert.equal(j[1].rsi, '1,47');
  assert.equal(j[0].when, '2026-10-12T10:10');
  const m = ADR.parseText('Atleta;Salto;Altura (m);Tiempo de vuelo (s)\nLaura Vidal Serra;CMJ;0,312;0,505', laura);
  assert.equal(ADR.jumps(m.records)[0].height, '31,2');
  assert.equal(ADR.jumps(m.records)[0].flight, '505');
});

test('ADR: files de resum i errors', () => {
  const withSummary = 'Serie;Repetición;Carga;Velocidad media\n1;1;60;0,9\n1;2;60;0,8\nMedia;;60;0,85';
  assert.equal(ADR.parseText(withSummary, null).records.length, 2, 'la fila «Media» no és una repetició');
  assert.ok(ADR.parseText('només una línia', null).error);
  assert.ok(ADR.parseText('Nom;Edat\nLaura;35', null).error, 'sense velocitat ni salts');
});

test('ADR: Excel (.xlsx) amb les mateixes dades, amb la data com a número de sèrie', async () => {
  const doc = core.XlsxDoc.create({ title: 'ADR' });
  const ws = doc.sheet('Entrenament');
  const head = ['Atleta', 'Ejercicio', 'Fecha', 'Serie', 'Repetición', 'Carga (kg)', 'Velocidad media (m/s)'];
  head.forEach((h, i) => ws.set(1, i + 1, h));
  const rows = [['Laura Vidal Serra', 'Squat', 46307.45, 1, 1, 60, 0.9], ['Laura Vidal Serra', 'Squat', 46307.45, 1, 2, 60, 0.81]];
  rows.forEach((r, k) => r.forEach((v, i) => ws.set(k + 2, i + 1, v)));
  const { bytes } = await doc.build({ stamp: { date: new Date('2026-10-12T10:00:00Z') } }).catch(() => doc.build({}));
  const file = { arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) };
  const got = await ADR.rowsOf(file);
  const r = ADR.parseRows(got, laura);
  assert.equal(r.error, null);
  assert.equal(r.records.length, 2);
  assert.equal(r.records[0].load, 60);
  assert.equal(r.records[1].mv, 0.81);
  assert.equal(r.records[0].date, '2026-10-12', 'número de sèrie d\'Excel → data');
});
