// Genera l'aplicació en un sol fitxer HTML.
//   node app/build.mjs
// Sortides:
//   dist/eonlife.html        → versió independent (mode local / demostració)
//   apps-script/Index.html   → mateix fitxer, per enganxar a Google Apps Script
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const repo = join(appDir, '..');
const src = join(appDir, 'src');
const read = (p) => readFileSync(join(src, p), 'utf8');

const jsFiles = readdirSync(join(src, 'js')).filter((f) => f.endsWith('.js')).sort();
const appJs = jsFiles.map((f) => `/* ── ${f} ── */\n${read('js/' + f)}`).join('\n\n');
const vendorJs = read('vendor/preact-htm.umd.js');
const logo = 'data:image/png;base64,' + read('assets/logo-mask.b64').trim();
const css = read('styles.css').replaceAll('__LOGO_MASK__', logo);

// Un "</script" dins del codi tancaria l'etiqueta abans d'hora.
const safe = (s) => s.replace(/<\/script/gi, '<\\/script').replace(/<!--/g, '<\\!--');

const stamp = new Date().toISOString().slice(0, 16).replace('T', ' ');
const html = read('index.html')
  .replace('/*__CSS__*/', () => css)
  .replace('/*__VENDOR__*/', () => safe(vendorJs))
  .replace('/*__APP__*/', () => `window.EON_BUILD = ${JSON.stringify(stamp)};\n` + safe(appJs));

for (const out of [join(repo, 'dist', 'eonlife.html'), join(repo, 'apps-script', 'Index.html')]) {
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, html);
}
console.log(`OK · ${jsFiles.length} mòduls · ${(html.length / 1024).toFixed(0)} KB · ${stamp}`);
