// Pàgina de revisió dels dibuixos dels exercicis (Artifact de claude.ai): tots els exercicis de la biblioteca amb
// el seu dibuix en moviment, l'inici i el final. L'equip marca cada dibuix com a «Bé» o «Malament» amb una nota i
// una foto; les respostes es desen a la base de dades de la pàgina (col·lecció «reviews», una per exercici) i Claude
// les llegeix per corregir les postures. Cada exercici porta l'empremta del dibuix actual: quan el dibuix canvia, la
// revisió antiga queda com a «Corregit: revisa'l».
//   node app/review/build-review.mjs  →  dist/revisio-dibuixos.html
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { loadCore } from '../test/load-core.mjs';

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const js = (f) => readFileSync(join(root, 'app', 'src', 'js', f), 'utf8');
const css = readFileSync(join(root, 'app', 'src', 'styles.css'), 'utf8');

// Motor dels dibuixos: les postures i 15-pics.js fins als components de la interfície (que fan servir Preact).
const pics = js('15-pics.js');
const engine = js('15-pics-poses.js') + '\n' + pics.slice(0, pics.indexOf('function exerciseVideoThumb'));

// Colors dels dibuixos (clar i fosc) i les regles .pic de l'app.
const picTokens = (from) => {
  const a = css.indexOf('--pic-prop:', from), b = css.indexOf('\n', css.indexOf('--pic-hair-far', a));
  return { text: css.slice(a, b).replace(/\s+/g, ' ').trim(), end: b };
};
const light = picTokens(0), dark = picTokens(light.end);
const picCss = css.split('\n').filter((l) => /^\.pic[ {.]/.test(l)).join('\n');

// Exercicis, amb l'empremta del dibuix que es veu ara.
const { U, SEED_EXERCISES } = loadCore();
const P = new Function('U', 'window', 'localStorage', `${engine}\nreturn { picKeyOf, exercisePicSvg };`)(
  U, { matchMedia: () => ({ matches: false }) }, { getItem: () => null, setItem() {} });
const fnv = (s) => { let h = 0x811c9dc5; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 0x01000193); } return (h >>> 0).toString(16).padStart(8, '0'); };
const UPPER = ['Pectoral', 'Dorsal', 'Deltoides', 'Bíceps', 'Tríceps', 'Trapezi', 'Escàpula', 'Manegot rotador', 'Avantbraç', 'Tren superior'];
const LOWER = ['GMax', 'GMed', 'Quàdriceps', 'Isquiotibials', 'Adductors', 'Abductors', 'Bessons i soli', 'Tibial anterior', 'Flexors de maluc', 'Tren inferior'];
const CORE = ['Core', 'Oblics', 'Lumbar'];
const zone = (gm) => (UPPER.includes(gm) ? 'sup' : LOWER.includes(gm) ? 'inf' : CORE.includes(gm) ? 'core' : 'altres');
const ex = SEED_EXERCISES.map((e) => {
  const o = { id: e.id, name: e.name, tg: e.tg || '', material: e.material || '', gm: e.gm || '', block: e.block || '' };
  if (e.pic) o.pic = e.pic;
  o.key = P.picKeyOf(e);
  o.z = zone(e.gm);
  o.h = fnv(P.exercisePicSvg(e, null, 'anim'));
  return o;
});

const tpl = readFileSync(join(root, 'app', 'review', 'review.html'), 'utf8');
const out = tpl
  .replace('/*__PIC_LIGHT__*/', light.text)
  .replace(/\/\*__PIC_DARK__\*\//g, dark.text)
  .replace('/*__PIC_CSS__*/', picCss)
  .replace('/*__ENGINE__*/', () => engine.replace(/<\/script/gi, '<\\/script'))
  .replace('/*__EXERCISES__*/[]', () => JSON.stringify(ex).replace(/</g, '\\u003c'))
  .replace('__BUILT__', new Date().toISOString().slice(0, 10))
  .replace('__COUNT__', String(ex.length));
mkdirSync(join(root, 'dist'), { recursive: true });
writeFileSync(join(root, 'dist', 'revisio-dibuixos.html'), out);
console.log(`dist/revisio-dibuixos.html · ${ex.length} exercicis · ${(out.length / 1024).toFixed(0)} kB`);
