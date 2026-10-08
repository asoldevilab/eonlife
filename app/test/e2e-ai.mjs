// Prova del retall de les fotos de l'informe amb IA (16-photocrop.js): la versió publicada (dist/m365/demo, amb la
// IA a dist/m365/ai) servida per un servidor local, i una foto de prova CC0 (fixtures/persona-cc0.jpg: el «cameraman»
// de scikit-image, sense restriccions de drets) posada al mig d'una imatge més gran.
//   node app/build.mjs && node app/test/e2e-ai.mjs [carpeta-captures]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { readFileSync, existsSync, mkdirSync } from 'node:fs';
import { join, dirname, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const here = dirname(fileURLToPath(import.meta.url));
const root = join(here, '..', '..', 'dist', 'm365');
const shots = process.argv[2] || '';
if (shots) mkdirSync(shots, { recursive: true });

const types = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.wasm': 'application/wasm', '.json': 'application/json', '.png': 'image/png', '.jpg': 'image/jpeg', '.tflite': 'application/octet-stream', '.webmanifest': 'application/manifest+json' };
const server = createServer((req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
  const file = path === '/foto.jpg' ? join(here, 'fixtures', 'persona-cc0.jpg') : join(root, path.endsWith('/') ? `${path}index.html` : path);
  if (!file.startsWith(root) && !file.endsWith('persona-cc0.jpg')) { res.writeHead(403); res.end(); return; }
  if (!existsSync(file)) { res.writeHead(404); res.end(); return; }
  res.writeHead(200, { 'Content-Type': types[extname(file)] || 'application/octet-stream' });
  res.end(readFileSync(file));
});
await new Promise((ok) => server.listen(0, '127.0.0.1', ok));
const base = `http://127.0.0.1:${server.address().port}`;

let failed = 0;
const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); } catch (e) { failed++; console.log(`✗ ${label}: ${e.message}`); }
};

const browser = await playwright.chromium.launch();
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
page.on('pageerror', (e) => console.log('error de la pàgina:', e.message));
try {
  await page.goto(`${base}/demo/`);
  await page.waitForSelector('.page');
  await step('la IA troba la persona i l\'enquadra en vertical (3:4) amb aire', async () => {
    const box = await page.evaluate(() => PhotoCrop.crop(`${location.origin}/foto.jpg`, `${location.origin}/foto.jpg`));
    if (!box) throw new Error('no ha trobat cap persona');
    // La foto de prova és 1200 × 900, amb la persona dins del quadre 420–1020 × 250–850
    const px = { x: box.x * 1200, y: box.y * 900, w: box.w * 1200, h: box.h * 900 };
    if (Math.abs(px.w / px.h - 0.75) > 0.02) throw new Error(`proporció ${(px.w / px.h).toFixed(2)}`);
    if (px.x > 600 || px.x + px.w < 800 || px.y > 450) throw new Error(`no conté la persona: ${JSON.stringify(px)}`);
    if (px.w * px.h > 0.9 * 1200 * 900) throw new Error('és gairebé tota la foto');
    // Es recorda: el segon cop no torna a detectar
    const again = await page.evaluate(() => PhotoCrop.known(`${location.origin}/foto.jpg`));
    if (JSON.stringify(again) !== JSON.stringify(box)) throw new Error('no es recorda');
  });
  await step('a l\'informe, la foto surt retallada (i el PDF es fa)', async () => {
    await page.click('text=Configuració');
    await page.click('text=Carrega els pacients de prova');
    await page.click('.dialog-foot >> text=Carrega');
    await page.waitForTimeout(800);
    const aid = await page.evaluate(() => {
      const a = Store.assessmentsOf('P-DEMO-LAURA').slice(-1)[0];
      Store.update('assessments', a.id, (x) => { x.values.adams = { ...(x.values.adams || {}), d: 'Negatiu', photo: `${location.origin}/foto.jpg` }; });
      return a.id;
    });
    await page.evaluate((id) => go('informe', id), aid);
    await page.waitForSelector('.rphoto.rphoto-cropped .rphoto-frame img[data-crop]', { timeout: 30000 });
    const r = await page.$eval('.rphoto-cropped .rphoto-img', (e) => { const b = e.getBoundingClientRect(); return b.width / b.height; });
    if (Math.abs(r - 0.75) > 0.02) throw new Error(`marc ${r}`);
    if (shots) await page.locator('.rphotos').screenshot({ path: join(shots, 'fotos-retallades.png') });
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.presentbar >> text=Descarrega el PDF')]);
    if (shots) await dl.saveAs(join(shots, 'informe-fotos.pdf'));
  });
  await step('sense IA (la detecció falla): la foto surt sencera', async () => {
    const box = await page.evaluate(() => PhotoCrop.frame([], 1200, 900));
    if (box !== null) throw new Error('hauria de ser sencera');
    const tiny = await page.evaluate(() => PhotoCrop.frame([{ x: 10, y: 10, w: 40, h: 60, score: 0.9 }], 1200, 900));
    if (tiny !== null) throw new Error('una persona molt petita (o mal detectada) no es retalla');
  });
} finally {
  await browser.close();
  server.close();
}
console.log(failed ? `\n${failed} errors` : '\nRetall de fotos amb IA: tot correcte.');
process.exit(failed ? 1 : 0);
