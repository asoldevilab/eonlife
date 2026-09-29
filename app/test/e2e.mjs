// Prova de fum de la interfície amb Chromium (Playwright).
//   node app/test/e2e.mjs [carpeta-captures]
// Obre dist/eonlife.html, recorre totes les pantalles, prova els fluxos principals
// i falla si hi ha errors de JavaScript a la consola.
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync } from 'node:fs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const { chromium } = playwright;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const url = pathToFileURL(join(root, 'dist', 'eonlife.html')).href;
const shots = process.argv[2] || null;
if (shots) mkdirSync(shots, { recursive: true });

const errors = [];
const browser = await chromium.launch();

async function open(viewport, scheme = 'light') {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const where = `${m.text()} ${(m.location() || {}).url || ''}`;
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)/.test(where)) errors.push(`console: ${m.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.goto(url);
  await page.waitForSelector('.page, .present');
  return { ctx, page };
}

async function shot(page, name, full = true) {
  if (!shots) return;
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: full });
}

async function goHash(page, hash) {
  await page.evaluate((h) => { window.location.hash = h; }, hash);
  await page.waitForTimeout(120);
}

const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); }
  catch (e) { errors.push(`${label}: ${e.message}`); console.log(`✗ ${label}: ${e.message}`); }
};

// ── Tauleta horitzontal ──
{
  const { ctx, page } = await open({ width: 1180, height: 820 });
  await step('inici', async () => {
    await page.waitForSelector('text=Sessions d\'avui');
    await page.waitForSelector('.crow');
    await shot(page, '01-inici');
  });
  await step('fitxa client · resum', async () => {
    await page.click('.crow >> text=Laura Vidal Serra');
    await page.waitForSelector('text=Última valoració');
    await shot(page, '02-client-resum');
  });
  await step('fitxa client · sessions', async () => {
    await page.click('.tab >> text=Sessions');
    await page.waitForSelector('.wgroup');
    await shot(page, '03-client-sessions', false);
  });
  await step('seguiment mensual', async () => {
    await page.click('.tab >> text=Seguiment mensual');
    await page.waitForSelector('.cal');
    await shot(page, '04-mes');
  });
  await step('valoracions i comparació', async () => {
    await page.click('.tab >> text=Valoracions');
    await page.waitForSelector('text=Comparació amb la valoració anterior');
    await shot(page, '05-valoracions');
  });
  await step('editor de valoració', async () => {
    await page.click('.arow-main >> nth=0');
    await page.waitForSelector('#sec-mobilitat');
    await shot(page, '06-valoracio');
  });
  await step('omplir un test i veure l\'asimetria', async () => {
    const d = page.getByLabel('Leg extension · quàdriceps dreta');
    await d.fill('300');
    const e = page.getByLabel('Leg extension · quàdriceps esquerra');
    await e.fill('400');
    await page.waitForSelector('text=25 %');
  });
  await step('informes adjunts: en mode local es pot enganxar l\'enllaç', async () => {
    await page.waitForSelector('#sec-fitxers >> text=Enllaça l\'informe de Kinvent');
    await page.click('#sec-fitxers >> text=Enllaça l\'informe de Kinvent');
    await page.fill('#prompt-input', 'https://eonlife.sharepoint.com/informe.pdf');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('#sec-fitxers .file-name');
  });
  await step('informe de la valoració', async () => {
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.report');
    await shot(page, '07-informe');
  });
  await step('editor de sessió', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.srow-main >> nth=0');
    await page.waitForSelector('.block');
    await shot(page, '08-sessio');
  });
  await step('afegir un exercici des de la biblioteca', async () => {
    const blk = page.locator('section.block.blk-acc');
    await blk.locator('.add-item').click();
    const input = blk.locator('.picker-input').last();
    await input.fill('face');
    await page.waitForSelector('.picker-opt >> text=Face pull');
    await page.click('.picker-opt >> text=Face pull');
    const val = await blk.locator('.picker-input').last().inputValue();
    if (val !== 'Face pull') throw new Error(`picker value = ${val}`);
    const sets = await blk.locator('.item').last().locator('.rx-s input').inputValue();
    if (sets !== '3') throw new Error(`sèries per defecte = ${sets}`);
  });
  await step('tancament: RPE i durada → càrrega', async () => {
    await page.click('.seg-rpe >> text=7');
    await page.fill('#fb-min', '60');
    await page.waitForSelector('.computed >> text=420 UA');
  });
  await step('fitxa per al client', async () => {
    await page.click('.editbar >> text=Presenta');
    await page.waitForSelector('.sheet');
    await shot(page, '09-fitxa-sessio');
  });
  await step('nova sessió des de plantilla', async () => {
    await goHash(page, '#/client/P-DEMO-ALEX');
    await page.click('.phead-actions >> text=Nova sessió');
    await page.click('.choice >> text=A partir d\'una plantilla');
    await page.click('.dialog-foot >> text=Crea la sessió');
    await page.waitForSelector('.block');
    const n = await page.locator('.item').count();
    if (n < 10) throw new Error(`només ${n} exercicis`);
  });
  await step('nou client', async () => {
    await goHash(page, '#/inici');
    await page.click('.page-actions >> text=Nou client');
    await page.fill('#np-first', 'Prova');
    await page.fill('#np-last', 'Automàtica');
    await page.click('.dialog-foot >> text=Crea el client');
    await page.waitForSelector('text=Dades personals');
  });
  await step('biblioteca', async () => {
    await goHash(page, '#/biblioteca');
    await page.waitForSelector('.exrow');
    await shot(page, '10-biblioteca', false);
    await goHash(page, '#/biblioteca/plantilles');
    await page.waitForSelector('.trow-tpl');
  });
  await step('configuració', async () => {
    await goHash(page, '#/configuracio');
    await page.waitForSelector('text=On es guarden les dades');
    await shot(page, '11-configuracio', false);
  });
  await step('base de dades: taules', async () => {
    await page.click('.sidebar >> text=Base de dades');
    await page.waitForSelector('.dbt tbody tr');
    await shot(page, '18-base-dades', false);
    await page.click('.dbtab >> text=Dinamometria · K-Push');
    await page.waitForSelector('.dbt >> text=Quàdriceps');
    await shot(page, '19-base-dades-dinamometria', false);
    await page.click('.dbtab >> text=Y-Balance');
    await page.waitForSelector('.dbt >> text=Composite');
    await page.click('.dbtab >> text=Registre d\'exercicis');
    await page.waitForSelector('.dbt tbody tr');
    // Ordenar per una columna.
    await page.click('.dbtab >> text=Sessions');
    await page.click('.dbt th >> text=RPE');
    await page.waitForSelector('.dbt th.sorted >> text=RPE');
  });
  await step('base de dades: afegir dinamometria a un client', async () => {
    await page.click('.dbtab >> text=Dinamometria · K-Push');
    await page.click('.page-actions >> text=Afegeix dinamometria');
    await page.selectOption('#am-client', { label: 'Àlex Martí Soler' });
    await page.fill('#am-date', '2026-10-05');
    await page.click('.dialog-foot >> text=Continua');
    await page.waitForSelector('#grp-dyn.flash');
    await page.getByLabel('Leg extension · quàdriceps dreta').fill('580');
    await page.getByLabel('Leg extension · quàdriceps esquerra').fill('560');
    await page.waitForTimeout(1100);
    await page.click('.sidebar >> text=Base de dades');
    await page.click('.dbtab >> text=Dinamometria · K-Push');
    await page.waitForSelector('.dbt td >> text=05/10/2026');
    const types = await page.locator('.dbt tbody tr:has-text("05/10/2026") td').allInnerTexts();
    if (!types.includes('Control')) throw new Error(`tipus: ${types.slice(0, 4).join(' | ')}`);
    if (!types.includes('580')) throw new Error('no surt el valor 580');
  });
  await step('fitxa del client: registrar mesures', async () => {
    await goHash(page, '#/client/P-DEMO-JORDI');
    await page.click('.quickadd >> text=Y-Balance');
    await page.waitForSelector('#am-client');
    await page.click('.dialog-foot >> text=Continua');
    await page.waitForSelector('#grp-ybt.flash');
  });
  await step('persistència local', async () => {
    const before = await page.evaluate(() => ({ pending: Store.pending(), stored: (localStorage.getItem('eonlife:data:v1') || '').includes('Automàtica') }));
    await page.evaluate(() => { window.__beforeReload = true; });
    await page.reload();
    await page.waitForSelector('.page');
    await goHash(page, '#/inici');
    try {
      await page.waitForSelector('text=Prova Automàtica');
    } catch (e) {
      const after = await page.evaluate(() => ({
        reloaded: !window.__beforeReload, hash: location.hash, ready: Store.ready,
        patients: Store.patients().map((p) => `${p.firstName} ${p.lastName}`),
        stored: (localStorage.getItem('eonlife:data:v1') || '').includes('Automàtica'),
        text: document.body.innerText.slice(0, 300),
      }));
      throw new Error(`${e.message}\nabans: ${JSON.stringify(before)}\ndesprés: ${JSON.stringify(after)}`);
    }
  });
  await ctx.close();
}

// ── Tauleta vertical en mode fosc ──
{
  const { ctx, page } = await open({ width: 820, height: 1180 }, 'dark');
  await step('fosc · inici', async () => { await shot(page, '12-fosc-inici', false); });
  await step('fosc · sessió', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.srow-main >> nth=0');
    await page.waitForSelector('.block');
    await shot(page, '13-fosc-sessio', false);
  });
  await step('fosc · informe', async () => {
    await goHash(page, '#/client/P-DEMO-JORDI/valoracions');
    await page.click('.arow-main >> nth=0');
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.report');
    await shot(page, '14-fosc-informe', false);
  });
  await ctx.close();
}

// ── Mòbil ──
{
  const { ctx, page } = await open({ width: 390, height: 844 });
  await step('mòbil · inici', async () => {
    await shot(page, '15-mobil-inici', false);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) throw new Error(`desbordament horitzontal de ${over}px`);
  });
  await step('mòbil · sessió', async () => {
    await goHash(page, '#/client/P-DEMO-MONTSE/sessions');
    await page.click('.srow-main >> nth=0');
    await page.waitForSelector('.block');
    await shot(page, '16-mobil-sessio', false);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) throw new Error(`desbordament horitzontal de ${over}px`);
  });
  await step('mòbil · valoració', async () => {
    await goHash(page, '#/client/P-DEMO-MONTSE/valoracions');
    await page.click('.arow-main >> nth=0');
    await page.waitForSelector('#sec-mobilitat');
    await shot(page, '17-mobil-valoracio', false);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) throw new Error(`desbordament horitzontal de ${over}px`);
  });
  await ctx.close();
}

// ── Impressió (PDF) ──
{
  const { ctx, page } = await open({ width: 1180, height: 820 });
  await step('PDF de la fitxa de sessió', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.srow-main >> nth=0');
    await page.click('.editbar >> text=Presenta');
    await page.waitForSelector('.sheet');
    if (shots) await page.pdf({ path: join(shots, 'fitxa-sessio.pdf'), format: 'A4', printBackground: true });
  });
  await step('PDF de l\'informe', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/valoracions');
    await page.click('.arow-main >> nth=0');
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.report');
    if (shots) await page.pdf({ path: join(shots, 'informe.pdf'), format: 'A4', printBackground: true });
  });
  await ctx.close();
}

await browser.close();
if (errors.length) {
  console.log(`\n${errors.length} errors:`);
  for (const e of errors) console.log(` - ${e}`);
  process.exit(1);
}
console.log('\nTot correcte.');
