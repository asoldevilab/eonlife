// Prova de la variant de l'enllaç privat de claude.ai (sense impressió) amb un visor simulat.
//   node app/test/e2e-artifact.mjs
// El visor real només deixa baixar fitxers a través de la capacitat «downloads» (window.claude.use('downloads')).
// Aquí se'n posa una de simulada i es comprova que l'Excel del client i els CSV passen per ella, que un «no» de qui
// ho fa no mostra cap error i que, sense la capacitat, no surt cap botó de descàrrega.
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { execFileSync } from 'node:child_process';
import { unzip } from './xlsx-read.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const { chromium } = playwright;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const dir = mkdtempSync(join(tmpdir(), 'eon-art-'));
const artifact = join(dir, 'app.html');
execFileSync('node', [join(root, 'app', 'build.mjs'), '--artifact', artifact], { stdio: 'ignore' });
// El visor hi posa <html>, <head> i <body> al voltant del fragment.
const page0 = join(dir, 'wrapped.html');
writeFileSync(page0, `<!doctype html><html lang="ca"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head><body>${readFileSync(artifact, 'utf8')}</body></html>`);
const url = pathToFileURL(page0).href;

const errors = [];
const browser = await chromium.launch();

// `viewer`: 'accepta' | 'rebutja' | 'sense' (el visor no ofereix les descàrregues)
async function open(viewer) {
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 } });
  await ctx.addInitScript((mode) => {
    window.__saves = [];
    window.claude = {
      use: async (name) => {
        if (name !== 'downloads' || mode === 'sense') return null;
        return {
          save: async ({ filename, data }) => {
            const bytes = typeof data === 'string' ? new TextEncoder().encode(data) : data instanceof Blob ? new Uint8Array(await data.arrayBuffer()) : new Uint8Array(data.buffer ? data.buffer.slice(data.byteOffset, data.byteOffset + data.byteLength) : data);
            window.__saves.push({ filename, bytes: Array.from(bytes) });
            if (mode === 'rebutja') { const e = new Error('El visor ho ha rebutjat'); e.code = 'declined'; throw e; }
            return { status: 'saved' };
          },
        };
      },
    };
  }, viewer);
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => { if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ytimg\.com/.test(`${m.text()} ${(m.location() || {}).url || ''}`)) errors.push(`console: ${m.text()}`); });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/youtube|ytimg/, (r) => r.abort());
  await page.goto(url);
  await page.waitForSelector('.page, .present');
  return { ctx, page };
}

const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); } catch (e) { errors.push(`${label}: ${e.message}`); console.log(`✗ ${label}: ${e.message}`); }
};
const saves = (page) => page.evaluate(() => window.__saves);
const bytesOf = (s) => Buffer.from(s.bytes);

{
  const { ctx, page } = await open('accepta');
  await step('el visor ofereix les descàrregues: surt el menú Excel i es baixa l\'Excel del client', async () => {
    await page.click('.crow >> text=Laura Vidal Serra');
    await page.waitForSelector('text=Última valoració');
    await page.click('.phead-actions >> text=Excel');
    await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    await page.waitForSelector('text=Excel descarregat: seguiment_lauravidalserra_01.xlsx');
    const [s] = await saves(page);
    if (s.filename !== 'seguiment_lauravidalserra_01.xlsx') throw new Error(`nom ${s.filename}`);
    if (s.bytes[0] !== 0x50 || s.bytes[1] !== 0x4b) throw new Error('no és un xlsx');
    if (!Object.keys(unzip(bytesOf(s))).includes('xl/workbook.xml')) throw new Error('no és un llibre d\'Excel');
  });
  await step('l\'Excel del client també es baixa des de l\'editor d\'una sessió i d\'una valoració', async () => {
    const sid = await page.evaluate(() => Store.sessionsOf('P-DEMO-LAURA').filter((s) => s.status === 'feta').pop().id);
    await page.evaluate((id) => go('sessio', id), sid);
    await page.waitForSelector('.block');
    await page.click('.editbar .menu button');
    await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    await page.waitForFunction(() => window.__saves.length >= 2);
    const aid = await page.evaluate(() => Store.assessmentsOf('P-DEMO-LAURA').pop().id);
    await page.evaluate((id) => go('valoracio', id), aid);
    await page.waitForSelector('#sec-mobilitat');
    await page.click('.editbar .menu button');
    await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    await page.waitForFunction(() => window.__saves.length >= 3);
    if (!(await saves(page)).every((x) => x.filename === 'seguiment_lauravidalserra_01.xlsx')) throw new Error('noms dels fitxers');
  });
  await step('Configuració: els CSV i la còpia es baixen pel visor (sense «Importa»)', async () => {
    await page.evaluate(() => go('configuracio'));
    await page.waitForSelector('text=Exportar i còpies de seguretat');
    if (await page.locator('text=Importa una còpia').count()) throw new Error('«Importa una còpia» no té sentit al visor');
    await page.click('text=Valoracions a Excel (CSV)');
    await page.waitForFunction(() => window.__saves.some((x) => /^eonlife-valoracions-/.test(x.filename)));
    await page.click('text=Còpia de seguretat completa');
    await page.waitForFunction(() => window.__saves.some((x) => /^eonlife-copia-.*\.json$/.test(x.filename)));
    const json = JSON.parse(bytesOf((await saves(page)).find((x) => /\.json$/.test(x.filename))).toString('utf8'));
    if (!json || typeof json !== 'object') throw new Error('còpia buida');
  });
  await ctx.close();
}

{
  const { ctx, page } = await open('rebutja');
  await step('si qui ho fa diu que no al visor, no surt cap error', async () => {
    await page.click('.crow >> text=Laura Vidal Serra');
    await page.waitForSelector('text=Última valoració');
    await page.click('.phead-actions >> text=Excel');
    await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    await page.waitForFunction(() => window.__saves.length === 1);
    await page.waitForTimeout(400);
    const txt = await page.locator('body').innerText();
    if (/No s'ha pogut descarregar|Excel descarregat/.test(txt)) throw new Error('no hauria de sortir cap avís');
  });
  await ctx.close();
}

{
  const { ctx, page } = await open('sense');
  await step('sense la capacitat de descàrregues: cap botó per baixar fitxers', async () => {
    await page.click('.crow >> text=Laura Vidal Serra');
    await page.waitForSelector('text=Última valoració');
    await page.waitForTimeout(300);
    if (await page.locator('.phead-actions >> text=Excel').count()) throw new Error('no hauria de sortir el menú Excel');
    await page.evaluate(() => go('configuracio'));
    await page.waitForSelector('text=Exportar i còpies de seguretat');
    if (await page.locator('text=Valoracions a Excel (CSV)').count()) throw new Error('no hauria de sortir l\'exportació');
  });
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log(`\n${errors.length} errors:`);
  for (const e of errors) console.log(` - ${e}`);
  process.exit(1);
}
console.log('\nVariant de l\'enllaç privat: tot correcte.');
