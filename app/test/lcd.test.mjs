// Lectura de la pantalla de l'Assault Bike (16-lcd.js) amb pantalles i fotos inventades: al repositori no hi ha cap foto real.
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { screen, photo, W, H } from './lcd-fixture.mjs';

const src = readFileSync(join(dirname(fileURLToPath(import.meta.url)), '..', 'src', 'js', '16-lcd.js'), 'utf8');
const L = new Function(`${src}\nreturn LcdReader;`)();

const A = { time: '0:30', dist: '0.2', cal: '21.1', watts: '915', speed: '34.7', rpm: '90' };
const B = { time: '0:30', dist: '0.3', cal: '17.9', watts: '602', speed: '28.3', rpm: '84' };
const WANT = { A: { time: 30, dist: 0.2, cal: 21.1, watts: 915, speed: 34.7, rpm: 90 }, B: { time: 30, dist: 0.3, cal: 17.9, watts: 602, speed: 28.3, rpm: 84 } };
const values = (r) => Object.fromEntries(Object.keys(WANT.A).map((k) => [k, r[k].value]));

test('pantalla dreçada: es llegeixen temps, distància, calories, watts, velocitat i RPM', () => {
  assert.equal(L.W, W);
  assert.equal(L.H, H);
  assert.deepEqual(values(L.readAll(screen(A))), WANT.A);
  assert.deepEqual(values(L.readAll(screen(B))), WANT.B);
});

test('pantalla dreçada: dígits sense inclinar i molt inclinats', () => {
  assert.deepEqual(values(L.readAll(screen(A, { slant: 0 }))), WANT.A);
  assert.deepEqual(values(L.readAll(screen(B, { slant: 0.14 }))), WANT.B);
});

test('el temps es converteix a segons i els números no vàlids no es llegeixen', () => {
  assert.equal(L.parseValue('0:30', 'time'), 30);
  assert.equal(L.parseValue('1:05', 'time'), 65);
  assert.equal(L.parseValue('0:3?', 'time'), null);
  assert.equal(L.parseValue('21.1', 'num'), 21.1);
  assert.equal(L.parseValue('2?.1', 'num'), null);
  assert.equal(L.parseValue('', 'num'), null);
});

test('una pantalla en blanc no inventa números', () => {
  const blank = new Uint8Array(W * H).fill(205);
  const r = L.readAll(blank);
  for (const k of Object.keys(WANT.A)) assert.equal(r[k].value, null, k);
});

test('foto en perspectiva amb els cantons marcats a mà (amb error): la votació encerta', async () => {
  const quad = [[160, 120], [700, 160], [665, 1150], [135, 1180]];
  const ph = photo(screen(A), quad, 900, 1300, L.homography);
  // El que marcaria una persona: uns quants píxels de més o de menys a cada cantó.
  const marked = [[quad[0][0] + 7, quad[0][1] - 6], [quad[1][0] - 8, quad[1][1] + 5], [quad[2][0] + 6, quad[2][1] + 8], [quad[3][0] - 5, quad[3][1] - 7]];
  const steps = [];
  const r = await L.readVoting(ph, 900, 1300, marked, { onProgress: (p) => steps.push(p) });
  assert.deepEqual(values(r), WANT.A);
  assert.ok(r.trials >= 20, 'ha de fer diverses lectures');
  assert.ok(steps.length >= 20 && steps[steps.length - 1] < 1, 'avisa del progrés');
  for (const k of Object.keys(WANT.A)) assert.ok(r[k].conf > 0.5, `${k}: confiança ${r[k].conf}`);
});

test('foto amb els cantons molt malament: no dona un número segur', async () => {
  const quad = [[160, 120], [700, 160], [665, 1150], [135, 1180]];
  const ph = photo(screen(A), quad, 900, 1300, L.homography);
  // Un rectangle qualsevol, lluny de la pantalla.
  const r = await L.readVoting(ph, 900, 1300, [[10, 10], [150, 10], [150, 400], [10, 400]]);
  for (const k of Object.keys(WANT.A)) assert.ok(r[k].value == null || r[k].conf < 0.7, `${k} no pot ser segur: ${r[k].text} ${r[k].conf}`);
});
