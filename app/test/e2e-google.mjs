// Prova la connexió completa app ↔ Code.gs: el navegador creu que és dins de Google Apps Script
// (google.script.run) i les crides van al servidor simulat de gas-mock.mjs.
//   node app/test/e2e-google.mjs
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { loadGas } from './gas-mock.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const { chromium } = playwright;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const url = pathToFileURL(join(root, 'apps-script', 'Index.html')).href;
const env = loadGas({ user: 'oriol@eonlife.test' });
env.gas.setup();

const errors = [];
const browser = await chromium.launch();

async function openApp() {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.exposeFunction('__gasApi', (req) => JSON.parse(JSON.stringify(env.gas.api(JSON.parse(JSON.stringify(req))))));
  await page.addInitScript(() => {
    const runner = (ok, fail) => new Proxy({}, {
      get: (_, prop) => {
        if (prop === 'withSuccessHandler') return (fn) => runner(fn, fail);
        if (prop === 'withFailureHandler') return (fn) => runner(ok, fn);
        return (...args) => { setTimeout(() => window.__gasApi(...args).then((r) => ok && ok(r), (e) => fail && fail(e)), 30); };
      },
    });
    window.google = { script: { run: runner(null, null) } };
  });
  await page.goto(url);
  await page.waitForSelector('.page');
  return { ctx, page };
}

const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); } catch (e) { errors.push(`${label}: ${e.message}`); console.log(`✗ ${label}: ${e.message}`); }
};
const sheetRows = (name) => {
  const sh = env.ss.getSheetByName(name);
  if (sh.getLastRow() < 2) return [];
  const h = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0];
  return sh.getRange(2, 1, sh.getLastRow() - 1, sh.getLastColumn()).getValues().map((r) => Object.fromEntries(h.map((k, i) => [k, r[i]])));
};
const waitSaved = async (page) => {
  await page.waitForTimeout(50);
  await page.waitForFunction(() => Store.pending() === 0 && !Store.saveError);
};

let pid = null;
{
  const { ctx, page } = await openApp();
  await step('mode Google sense dades', async () => {
    await page.waitForSelector('text=Encara no hi ha clients');
    await page.waitForSelector('.sidebar-mode >> text=Google Sheets');
  });
  await step('nou client → fila al full i carpeta a Drive', async () => {
    await page.click('.page-actions >> text=Nou client');
    await page.fill('#np-first', 'Marta');
    await page.fill('#np-last', 'Riera');
    await page.click('.dialog-foot >> text=Crea el client');
    await page.waitForSelector('text=Dades personals');
    await page.waitForSelector('.phead-actions >> text=Carpeta');
    await waitSaved(page);
    const rows = sheetRows('Pacients');
    if (rows.length !== 1) throw new Error(`files: ${rows.length}`);
    if (rows[0].Nom !== 'Marta' || !String(rows[0]['Carpeta del client']).includes('drive.google.com')) throw new Error(JSON.stringify(rows[0]).slice(0, 200));
    pid = rows[0].id;
    const folder = env.myDrive.folders[0].folders[0];
    if (!folder || folder.getName() !== `Riera, Marta · ${pid}`) throw new Error('carpeta no creada');
  });
  await step('valoració → columnes llegibles al full', async () => {
    await page.click('.phead-actions >> text=Valoració inicial');
    await page.waitForSelector('#sec-mobilitat');
    await page.getByLabel('Knee-to-wall dreta').fill('7');
    await page.getByLabel('Knee-to-wall esquerra').fill('11,5');
    await waitSaved(page);
    await page.waitForTimeout(1300);
    await waitSaved(page);
    const rows = sheetRows('Valoracions');
    if (rows.length !== 1) throw new Error(`files: ${rows.length}`);
    if (rows[0]['Knee-to-wall E (cm)'] !== 11.5) throw new Error(`valor: ${rows[0]['Knee-to-wall E (cm)']}`);
    if (!String(rows[0]["Punts d'atenció"]).includes('Dorsiflexió')) throw new Error('sense punts d\'atenció');
  });
  await step('sessió des de plantilla → Sessions i Registre_exercicis', async () => {
    await page.evaluate((id) => { location.hash = `#/client/${id}`; }, pid);
    await page.click('.phead-actions >> text=Nova sessió');
    await page.click('.choice >> text=A partir d\'una plantilla');
    await page.click('.dialog-foot >> text=Crea la sessió');
    await page.waitForSelector('.block');
    await page.fill('#se-goal', 'Força · dominant de genoll');
    await page.click('.seg-rpe >> text=7');
    await page.fill('#fb-min', '60');
    await page.waitForTimeout(1300);
    await waitSaved(page);
    const s = sheetRows('Sessions');
    if (s.length !== 1 || s[0]['Càrrega (UA)'] !== 420) throw new Error(JSON.stringify(s[0] || {}).slice(0, 200));
    const log = sheetRows('Registre_exercicis');
    if (log.length < 10 || log[0].session_id !== s[0].id) throw new Error(`registre: ${log.length}`);
  });
  await step('biblioteca: exercici nou', async () => {
    await page.evaluate(() => { location.hash = '#/biblioteca'; });
    await page.click('.page-actions >> text=Nou exercici');
    await page.fill('#ex-name', 'Hip thrust a la politja cònica');
    await page.click('.dialog-foot >> text=Desa');
    await waitSaved(page);
    if (!sheetRows('Biblioteca').some((r) => r.Nom === 'Hip thrust a la politja cònica')) throw new Error('no desat');
  });
  await ctx.close();
}
{
  const { ctx, page } = await openApp();
  await step('en tornar a obrir, les dades venen del full', async () => {
    await page.waitForSelector('text=Marta Riera');
    await page.evaluate((id) => { location.hash = `#/client/${id}/sessions`; }, pid);
    await page.waitForSelector('.srow');
    await page.evaluate(() => { location.hash = '#/biblioteca'; });
    await page.waitForSelector('text=Hip thrust a la politja cònica');
  });
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log(`\n${errors.length} errors:`);
  for (const e of errors) console.log(` - ${e}`);
  process.exit(1);
}
console.log('\nConnexió amb Google: tot correcte.');
