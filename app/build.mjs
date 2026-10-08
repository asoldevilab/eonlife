// Genera l'aplicació en un sol fitxer HTML.
//   node app/build.mjs
//   node app/build.mjs --artifact ruta/sortida.html   (variant per a l'enllaç privat de claude.ai)
// Sortides:
//   dist/eonlife.html        → versió independent (mode local / demostració)
//   apps-script/Index.html   → mateix fitxer, per enganxar a Google Apps Script
//   dist/m365/index.html     → versió per publicar al web amb Microsoft 365 (codis de app/m365.config.json)
//   dist/m365/demo/index.html → demostració amb clients ficticis, sense compte (es publica a …/eonlife/demo/)
import { readFileSync, writeFileSync, readdirSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const appDir = dirname(fileURLToPath(import.meta.url));
const repo = join(appDir, '..');
const src = join(appDir, 'src');
const read = (p) => readFileSync(join(src, p), 'utf8');

const jsFiles = readdirSync(join(src, 'js')).filter((f) => f.endsWith('.js')).sort();
const appJs = jsFiles.map((f) => `/* ── ${f} ── */\n${read('js/' + f)}`).join('\n\n');
const vendorJs = ['vendor/preact-htm.umd.js', 'vendor/qrcode.js', 'vendor/html-to-image.js'].map(read).join('\n;\n');
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
// Instal·lable a la tauleta («Afegeix a la pantalla d'inici»): manifest i icones al costat de l'app.
const installable = [
  '<meta name="robots" content="noindex">',
  '<link rel="manifest" href="manifest.webmanifest">',
  '<link rel="icon" type="image/png" href="icon-192.png">',
  '<link rel="apple-touch-icon" href="apple-touch-icon.png">',
  '<meta name="apple-mobile-web-app-capable" content="yes">',
  '<meta name="mobile-web-app-capable" content="yes">',
  '<meta name="apple-mobile-web-app-title" content="EON Life">',
].join('\n');
// Les versions publicades miren version.json per actualitzar-se soles (vegeu 98-update.js).
const updatable = (h) => h.replace('window.EON_BUILD =', () => 'window.EON_UPDATE = true;\nwindow.EON_BUILD =');
const version = JSON.stringify({ build: stamp });
const m365Html = updatable(html
  .replace('<meta charset="utf-8">', () => `<meta charset="utf-8">\n${installable}`)
  .replace('window.EON_BUILD =', () => `window.EON_M365 = ${JSON.stringify(m365)};\nwindow.EON_AI = 'ai/';\nwindow.EON_BUILD =`));
const m365Dir = join(repo, 'dist', 'm365');
mkdirSync(m365Dir, { recursive: true });
writeFileSync(join(m365Dir, 'index.html'), m365Html);
writeFileSync(join(m365Dir, 'version.json'), version);
for (const f of readdirSync(join(src, 'assets', 'icons'))) copyFileSync(join(src, 'assets', 'icons', f), join(m365Dir, f));
// Detecció del cos per retallar les fotos de l'informe (MediaPipe, 16-photocrop.js): al costat de l'app, sense dependre
// de cap altre servidor. No es desa a git (es copia de app/src/vendor/mediapipe a cada build).
mkdirSync(join(m365Dir, 'ai'), { recursive: true });
for (const f of readdirSync(join(src, 'vendor', 'mediapipe'))) copyFileSync(join(src, 'vendor', 'mediapipe', f), join(m365Dir, 'ai', f));
writeFileSync(join(m365Dir, 'manifest.webmanifest'), JSON.stringify({
  name: 'EON Life · Human Performance',
  short_name: 'EON Life',
  description: 'Valoracions, sessions de 6 blocs i seguiment dels clients.',
  lang: 'ca',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  background_color: '#F3F0EC',
  theme_color: '#421215',
  icons: [
    { src: 'icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: 'icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: 'icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));
console.log(`Microsoft 365: dist/m365/index.html${m365.clientId ? '' : ' (sense codis: es demanaran a la primera connexió)'}`);

// Versió local publicada al costat de l'app (/demo/): sense iniciar sessió, les dades queden a l'aparell.
// És la que fan servir les tauletes mentre no hi ha Microsoft 365: comença buida, sense clients de prova
// (es poden carregar des de Configuració). S'instal·la a la tauleta («EON Life demo») i s'actualitza sola.
const demoDir = join(repo, 'dist', 'm365', 'demo');
mkdirSync(demoDir, { recursive: true });
const demoHead = installable
  .replace('href="icon-192.png"', 'href="../icon-192.png"').replace('href="apple-touch-icon.png"', 'href="../apple-touch-icon.png"')
  .replace('content="EON Life">', 'content="EON Life demo">');
writeFileSync(join(demoDir, 'index.html'), updatable(html.replace('<meta charset="utf-8">', () => `<meta charset="utf-8">\n${demoHead}`))
  .replace('window.EON_BUILD =', () => 'window.EON_NO_DEMO = true;\nwindow.EON_AI = \'../ai/\';\nwindow.EON_BUILD ='));
writeFileSync(join(demoDir, 'version.json'), version);
writeFileSync(join(demoDir, 'manifest.webmanifest'), JSON.stringify({
  name: 'EON Life · demostració',
  short_name: 'EON Life demo',
  description: 'Versió local: les dades queden en aquest aparell.',
  lang: 'ca',
  start_url: './',
  scope: './',
  display: 'standalone',
  orientation: 'any',
  background_color: '#F3F0EC',
  theme_color: '#421215',
  icons: [
    { src: '../icon-192.png', sizes: '192x192', type: 'image/png' },
    { src: '../icon-512.png', sizes: '512x512', type: 'image/png' },
    { src: '../icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
  ],
}, null, 2));
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
  art = art.replace('window.EON_BUILD =', () => 'window.EON_ENV = "artifact";\nwindow.EON_AI = "ai/";\nwindow.EON_BUILD =');
  const out = process.argv[ai + 1];
  mkdirSync(dirname(out), { recursive: true });
  writeFileSync(out, art);
  console.log(`Variant per a l'enllaç: ${out}`);
}
