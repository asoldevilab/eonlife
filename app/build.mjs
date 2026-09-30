// Genera l'aplicació en un sol fitxer HTML.
//   node app/build.mjs
//   node app/build.mjs --artifact ruta/sortida.html   (variant per a l'enllaç privat de claude.ai)
// Sortides:
//   dist/eonlife.html        → versió independent (mode local / demostració)
//   apps-script/Index.html   → mateix fitxer, per enganxar a Google Apps Script
//   dist/m365/index.html     → versió per publicar al web amb Microsoft 365 (codis de app/m365.config.json)
//   dist/m365/demo/index.html → demostració amb clients ficticis, sense compte (es publica a …/eonlife/demo/)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync } from 'node:fs';
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

// Versió per a Microsoft 365: la mateixa app amb els codis de l'aplicació d'Entra i la carpeta compartida.
const cfgPath = join(appDir, 'm365.config.json');
const cfg = existsSync(cfgPath) ? JSON.parse(readFileSync(cfgPath, 'utf8')) : {};
const m365 = {
  clientId: String(cfg.clientId || '').trim(),
  tenantId: String(cfg.tenantId || '').trim(),
  folderUrl: String(cfg.folderUrl || '').trim(),
};
const m365Html = html
  .replace('<meta charset="utf-8">', () => '<meta charset="utf-8">\n<meta name="robots" content="noindex">')
  .replace('window.EON_BUILD =', () => `window.EON_M365 = ${JSON.stringify(m365)};\nwindow.EON_BUILD =`);
mkdirSync(join(repo, 'dist', 'm365'), { recursive: true });
writeFileSync(join(repo, 'dist', 'm365', 'index.html'), m365Html);
console.log(`Microsoft 365: dist/m365/index.html${m365.clientId ? '' : ' (sense codis: es demanaran a la primera connexió)'}`);

// Demostració publicada al costat de l'app: mode local amb clients ficticis, sense iniciar sessió.
mkdirSync(join(repo, 'dist', 'm365', 'demo'), { recursive: true });
writeFileSync(join(repo, 'dist', 'm365', 'demo', 'index.html'),
  html.replace('<meta charset="utf-8">', () => '<meta charset="utf-8">\n<meta name="robots" content="noindex">'));
console.log('Demostració: dist/m365/demo/index.html');

// Variant per a l'enllaç privat: el visor ja hi posa <html>, <head> i <body>; sense impressió ni descàrregues.
const ai = process.argv.indexOf('--artifact');
if (ai > 0 && process.argv[ai + 1]) {
  const once = (text, re) => {
    const n = (text.match(new RegExp(re.source, 'gi')) || []).length;
    if (n !== 1) throw new Error(`S'esperava una sola coincidència de ${re} i n'hi ha ${n}`);
    return text.replace(re, '');
  };
  let art = html;
  for (const re of [/<!DOCTYPE html>\s*/i, /<html lang="ca">\s*/i, /<head>\s*/i, /<meta charset="utf-8">\s*/i,
    /<meta name="viewport"[^>]*>\s*/i, /<meta name="theme-color"[^>]*>\s*/i, /<\/head>\s*/i, /<body>\s*/i, /<\/body>\s*/i, /<\/html>\s*/i]) {
    art = once(art, re);
  }
  art = art.replace('window.EON_BUILD =', () => 'window.EON_ENV = "artifact";\nwindow.EON_BUILD =');
  const out = process.argv[ai + 1];
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, art);
  console.log(`Variant per a l'enllaç: ${out}`);
}
