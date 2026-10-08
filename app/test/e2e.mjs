// Prova de fum de la interfície amb Chromium (Playwright).
//   node app/test/e2e.mjs [carpeta-captures]
// Obre dist/eonlife.html, recorre totes les pantalles, prova els fluxos principals
// i falla si hi ha errors de JavaScript a la consola.
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { readXlsx } from './xlsx-read.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const { chromium } = playwright;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const url = pathToFileURL(join(root, 'dist', 'eonlife.html')).href;
const shots = process.argv[2] || null;
if (shots) mkdirSync(shots, { recursive: true });

const errors = [];
const TINY_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
// Imatge de YouTube de prova: 320 × 180, com les de veritat (la grisa de «sense imatge» en fa 120).
const YT_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAUAAAAC0CAIAAABqhmJGAAABkUlEQVR42u3TAQkAAAjAMDWmSYxoLHMIW4TDc6cD+KkkAAMDBgYMDAYGDAwYGDAwGBgwMGBgMDBgYMDAgIHBwICBAQMDBgYDAwYGDAwGBgwMGBgwMBgYMDBgYMDAYGDAwICBwcCAgQEDAwYGAwMGBgwMBgYMDBgYMDAYGDAwYGDAwGBgwMCAgcHAgIEBAwMGBgMDBgYMDBgYDAwYGDAwGBgwMGBgwMBgYMDAgIEBA4OBAQMDBgYDAwYGDAwYGAwMGBgwMBgYMDBgYMDAYGDAwICBAQODgQEDAwYGAwMGBgwMGBgMDBgYMDBgYDAwYGDAwGBgwMCAgQEDg4EBAwMGBgwMBgYMDBgYDAwYGDAwYGAwMGBgwMBgYMDAgIEBA4OBAQMDBgYMDAYGDAwYGAwMGBgwMGBgMDBgYMDAgIHBwICBAQODgQEDAwYGDAwGBgwMGBgMDBgYMDBgYDAwYGDAwICBwcCAgQEDg4EBAwMGBgwMBgYMDBgYMDAYGDAwYGAwMGBgwMCAgcHAgIEBAwMGht8ORS4DAmPlJXEAAAAASUVORK5CYII=', 'base64');
const browser = await chromium.launch();

async function open(viewport, scheme = 'light') {
  const ctx = await browser.newContext({ viewport, colorScheme: scheme, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    const where = `${m.text()} ${(m.location() || {}).url || ''}`;
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|ytimg\.com/.test(where)) errors.push(`console: ${m.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/youtube/, (r) => r.abort());
  await page.route(/ytimg/, (r) => r.fulfill({ body: YT_PNG, contentType: 'image/png' }));
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
    // Els tests complementaris per perfil (A/B/C) ja no es fan servir.
    if (await page.$('#sec-perfil') || await page.$('text=Bateria del perfil')) throw new Error('encara hi ha els tests per perfil');
    await shot(page, '06-valoracio');
  });
  await step('omplir un test i veure l\'asimetria', async () => {
    const d = page.getByLabel('Leg extension · quàdriceps dreta');
    await d.fill('300');
    const e = page.getByLabel('Leg extension · quàdriceps esquerra');
    await e.fill('400');
    await page.waitForSelector('text=25 %');
  });
  await step('valoració: els tests que ja no es fan no surten i l\'RPE (1–10) es posa al final', async () => {
    for (const t of ['Rotadors interns de maluc', 'Rotadors externs de maluc', 'Rotadors externs d\'espatlla', 'Leg curl 30/30', 'Flexió d\'espatlla sobre el cap', 'Extensió de genoll', 'Slump test', 'Prone knee bending']) {
      if (await page.locator('.trow-name', { hasText: t }).count()) throw new Error(`encara surt: ${t}`);
    }
    if (await page.locator('#grp-encoder').count() || await page.locator('#grp-neuro').count()) throw new Error('encara surt l\'encoder o la neurodinàmia');
    if (!(await page.locator('.trow-name', { hasText: 'Leg curl 90/90' }).count())) throw new Error('falta el leg curl 90/90');
    await page.click('.secnav-btn >> text=RPE');
    const btns = await page.locator('#sec-rpe .seg-rpe .seg-btn').allInnerTexts();
    if (btns.join() !== '1,2,3,4,5,6,7,8,9,10') throw new Error(`escala ${btns}`);
    await page.click('#sec-rpe .seg-rpe >> text=7');
    const aid = await page.evaluate(() => location.hash.split('/')[2]);
    await page.waitForFunction((id) => Store.get('assessments', id).rpe === '7', aid);
    await shot(page, '06e-rpe-valoracio', false);
  });
  await step('versió de prova: el PDF de Kinvent es tria de la tauleta i s\'hi desa', async () => {
    await page.waitForSelector('#sec-fitxers >> text=Adjunta l\'informe de Kinvent');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#sec-fitxers >> text=Adjunta l\'informe de Kinvent')]);
    await chooser.setFiles({ name: 'Informe_Kinvent.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 prova') });
    // Nom acordat: etiqueta_nomcognoms_aaaammdd_01.ext
    await page.waitForSelector('#sec-fitxers .file-name >> text=/^informekinvent_[a-z0-9]+_\\d{8}_01\\.pdf$/');
    const href = await page.getAttribute('#sec-fitxers .file-name', 'href');
    if (!/^eonlocal:F/.test(href || '')) throw new Error(`enllaç ${href}`);
    await page.click('#sec-fitxers .file-name');
    await page.waitForSelector('.dialog >> text=Desat només en aquesta tauleta');
    await shot(page, '06c-pdf-tauleta', false);
    await page.click('.dialog-head button[title="Tanca"]');
    await page.waitForSelector('.dialog', { state: 'detached' });
  });
  await step('versió de prova: vídeo gravat a la tauleta i reproduït a l\'informe', async () => {
    await page.locator('button.mini[title^="Vídeo general"]').click();
    await page.waitForSelector('.dialog >> text=només en aquesta tauleta');
    const capture = await page.getAttribute('input[data-kind="record"]', 'capture');
    if (capture !== 'environment') throw new Error(`capture=${capture}`);
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Grava ara')]);
    await chooser.setFiles({ name: 'VID_0001.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(2048, 1) });
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.waitForSelector('#sec-dades >> text=Enllaç desat');
    await page.click('.editbar >> text=Informe');
    await page.click('.rvid:has-text("Vídeo general") .rvid-thumb');
    const src = await page.getAttribute('.rvid:has-text("Vídeo general") video', 'src');
    if (!/^blob:/.test(src || '')) throw new Error(`vídeo ${src}`);
    await page.click('.presentbar >> text=Torna');
    await page.waitForSelector('#sec-mobilitat');
  });
  await step('vídeo enllaçat i informe només d\'un apartat', async () => {
    await page.locator('button.mini[title^="Leg extension"]').first().click();
    await page.fill('#video-url', 'https://eonlife.sharepoint.com/:v:/s/centre/leg-extension.mp4');
    await page.click('.dialog-foot >> text=Desa');
    await page.click('#sec-forca >> text=Informe de força');
    await page.waitForSelector('.report-cover >> text=Informe · Força');
    await page.waitForSelector('.rvideos svg.qr path');
    if (await page.locator('.report >> text=Mobilitat i anàlisi postural').count()) throw new Error('surt mobilitat a l\'informe de força');
    await shot(page, '07b-informe-forca');
    await page.selectOption('.presentbar select', 'tot');
    await page.waitForSelector('.report >> text=Resum');
    await page.click('.presentbar >> text=Torna');
    await page.waitForSelector('#sec-mobilitat');
  });
  await step('informe de la valoració', async () => {
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.report');
    if (await page.$('.rsec-title >> text=Tests complementaris')) throw new Error('l\'informe encara té els tests per perfil');
    // Els comentaris del professional no surten mai a l'informe; la propera valoració, només amb el mes i l'any; cap data al peu.
    await page.evaluate(() => Store.update('patients', 'P-DEMO-LAURA', (x) => { x.notes = 'Nota privada de l\'equip XYZ'; }));
    await page.waitForTimeout(150);
    const rep = await page.evaluate(() => ({ text: document.querySelector('.report').innerText, next: (document.querySelector('.rnext strong') || {}).textContent || '', foot: document.querySelector('.report .sheet-foot').innerText }));
    if (rep.text.includes('XYZ')) throw new Error('els comentaris del professional surten a l\'informe');
    if (rep.next && !/^[A-ZÀ-Ú][a-zà-ú]+ de \d{4}$/.test(rep.next)) throw new Error(`propera valoració: ${rep.next}`);
    if (/\d{2}\/\d{2}\/\d{4}/.test(rep.foot)) throw new Error(`data al peu: ${rep.foot}`);
    await shot(page, '07-informe');
  });
  await step('informe: «Descarrega el PDF» el fa la mateixa app (A4, sense vídeos ni el diàleg d\'imprimir)', async () => {
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.presentbar >> text=Descarrega el PDF')]);
    if (!/^informe[a-z]+_lauravidalserra_\d{8}_01\.pdf$/.test(dl.suggestedFilename())) throw new Error(`nom ${dl.suggestedFilename()}`);
    const pdf = readFileSync(await dl.path());
    const txt = pdf.toString('latin1');
    const pages = (txt.match(/\/Type \/Page\b/g) || []).length;
    if (!txt.startsWith('%PDF-') || pages < 3 || !/\/MediaBox \[0 0 595\.28 841\.89\]/.test(txt)) throw new Error(`PDF: ${pages} pàgines`);
    if (pdf.length > 6e6) throw new Error(`PDF massa gran: ${pdf.length}`);
    if (shots) writeFileSync(join(shots, 'informe-app.pdf'), pdf);
    await page.waitForSelector('.presentbar >> text=Descarrega el PDF');
    if (await page.locator('.pdf-stage').count()) throw new Error('no s\'ha netejat l\'escenari del PDF');
  });
  await step('informe en mode fosc (fons granat): es desa a la fitxa i el PDF també surt fosc', async () => {
    await page.click('[aria-label="Disseny de l\'informe"] >> text=Fosc');
    await page.waitForSelector('.present.report-dark article.report.report-dark');
    const bg = await page.$eval('article.report', (e) => getComputedStyle(e).backgroundColor);
    if (bg !== 'rgb(66, 18, 21)') throw new Error(`fons ${bg}`);
    if (await page.evaluate(() => Store.get('patients', 'P-DEMO-LAURA').reportTheme) !== 'dark') throw new Error('no es desa a la fitxa');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.presentbar >> text=Descarrega el PDF')]);
    const pdf = readFileSync(await dl.path());
    if (shots) writeFileSync(join(shots, 'informe-fosc.pdf'), pdf);
    await shot(page, '07b-informe-fosc');
    await page.click('[aria-label="Disseny de l\'informe"] >> text=Clar');
    await page.waitForSelector('article.report.report-light');
  });
  await step('informe de tests: triar tests i dates, taula i gràfica de cada test, i PDF', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/valoracions');
    await page.click('.card-head >> text=Informe de tests');
    await page.waitForSelector('.rpick');
    await page.waitForSelector('.report .tblock[data-test="cmj"] .chart svg');
    // Treure i tornar a posar un test
    await page.click('.rpick-chip:has-text("CMJ · millor altura")');
    if (await page.$('.report .tblock[data-test="cmj"]')) throw new Error('el test tret encara surt');
    await page.click('.rpick-chip:has-text("CMJ · millor altura")');
    await page.waitForSelector('.report .tblock[data-test="cmj"] table tbody tr');
    // Sense gràfiques: només la taula
    await page.click('text=Gràfiques d\'evolució de cada test');
    if (await page.$('.report .tblock .chart')) throw new Error('les gràfiques no s\'amaguen');
    await page.click('text=Gràfiques d\'evolució de cada test');
    // Un rang sense valoracions
    await page.fill('#rr-from', '2001-01-01'); await page.fill('#rr-to', '2001-12-31');
    await page.waitForSelector('.rpick >> text=No hi ha cap test amb dades');
    await page.click('.rpick-presets >> text=Tot');
    await page.waitForSelector('.report .tblock[data-test="cmj"]');
    const txt = await page.$eval('.report', (e) => e.innerText);
    if (txt.includes('XYZ')) throw new Error('els comentaris del professional surten a l\'informe de tests');
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.presentbar >> text=Descarrega el PDF')]);
    if (!/^informeevoluciotests_lauravidalserra_\d{8}_01\.pdf$/.test(dl.suggestedFilename())) throw new Error(dl.suggestedFilename());
    const pdf = readFileSync(await dl.path());
    if ((pdf.toString('latin1').match(/\/Type \/Page\b/g) || []).length < 2) throw new Error('PDF massa curt');
    if (shots) writeFileSync(join(shots, 'informe-tests.pdf'), pdf);
    await shot(page, '07c-informe-tests');
    await page.click('.presentbar >> text=Torna');
    await page.waitForSelector('.alist');
  });
  await step('informe d\'evolució de les sessions: RPE, dolor i wellness', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.card-head >> text=Informe d\'evolució');
    await page.waitForSelector('.report .rtiles >> text=RPE mitjà');
    await page.waitForSelector('.report >> text=EVA · dolor en acabar');
    await page.waitForSelector('.report >> text=Wellness en arribar');
    if ((await page.locator('.report .chart svg').count()) < 3) throw new Error('falten gràfiques');
    await page.click('text=Wellness per pregunta');
    await page.waitForSelector('.report .tsmall .chart svg');
    const rows = await page.locator('.report table tbody tr').count();
    if (rows < 3) throw new Error(`files: ${rows}`);
    const [dl] = await Promise.all([page.waitForEvent('download', { timeout: 120000 }), page.click('.presentbar >> text=Descarrega el PDF')]);
    if (!/^informeevoluciosessions_lauravidalserra_\d{8}_01\.pdf$/.test(dl.suggestedFilename())) throw new Error(dl.suggestedFilename());
    await shot(page, '07d-informe-sessions');
  });
  await step('editor de sessió', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.srow-main >> nth=0');
    await page.waitForSelector('.block');
    await shot(page, '08-sessio');
  });
  await step('afegir un exercici: cerca i material', async () => {
    const blk = page.locator('section.block.blk-acc');
    await blk.locator('.add-item:not(.add-group)').click();
    await page.waitForSelector('.dialog .xb-zones');
    await page.fill('.dialog input[aria-label="Cerca exercicis"]', 'face');
    await page.click('.xb-ex >> text=Face pull');
    await page.click('.xb-matbtn >> text=Politja Technogym');
    await page.waitForSelector('.dialog', { state: 'detached' });
    const val = await blk.locator('.picker-input').last().inputValue();
    if (val !== 'Face pull') throw new Error(`picker value = ${val}`);
    const sets = await blk.locator('.item').last().locator('.rx-s input').inputValue();
    if (sets !== '3') throw new Error(`sèries per defecte = ${sets}`);
    await blk.locator('.item').last().locator('.tag >> text=Politja Technogym').waitFor();
  });
  await step('afegir un exercici per material: Loop band Technogym', async () => {
    const blk = page.locator('section.block.blk-act');
    await blk.locator('.add-item:not(.add-group)').click();
    await page.click('.xb-zone >> text=Per material');
    await page.click('.xb-folder >> text=Loop band Technogym');
    if ((await page.locator('.xb-ex').count()) < 40) throw new Error('falten exercicis de la loop band');
    await page.click('.xb-ex >> text=Pont de glutis amb loop band');
    await page.waitForSelector('.dialog', { state: 'detached' });
    const item = blk.locator('.item').last();
    if ((await item.locator('.picker-input').inputValue()) !== 'Pont de glutis amb loop band') throw new Error('no s\'ha afegit');
    await item.locator('.tag >> text=Loop band Technogym').waitFor();
    // També es troba pel nom anglès de l'app de Technogym.
    await blk.locator('.add-item:not(.add-group)').click();
    await page.fill('.dialog input[aria-label="Cerca exercicis"]', 'monster walks - band at knees');
    await page.waitForSelector('.xb-ex >> text=Monster walk · banda als genolls');
    // Kettlebell, Power Personal i mobility ball de l'app de Technogym.
    await page.fill('.dialog input[aria-label="Cerca exercicis"]', 'russian swing');
    await page.waitForSelector('.xb-ex >> text=Swing rus amb kettlebell');
    await page.fill('.dialog input[aria-label="Cerca exercicis"]', 'Power Personal');
    await page.waitForSelector('.xb-ex >> text=Ocells al Power Personal');
    await page.fill('.dialog input[aria-label="Cerca exercicis"]', 'Mobility ball');
    if ((await page.locator('.xb-ex').count()) < 9) throw new Error('falten exercicis de la mobility ball');
    await page.click('.dialog-head button[title="Tanca"]');
    await item.locator('.item-side .menu button').click();
    await page.click('.menu-list >> text=Elimina');
  });
  await step('afegir un exercici per carpetes: tren superior → bíceps → material', async () => {
    const blk = page.locator('section.block.blk-for');
    await blk.locator('.add-item:not(.add-group)').click();
    await page.click('.xb-zone >> text=Tren superior');
    await page.waitForSelector('.xb-folder >> text=Bíceps');
    await shot(page, '08d-carpetes', false);
    await page.click('.xb-folder >> text=Bíceps');
    await page.click('.xb-ex >> text=Curl martell');
    await page.waitForSelector('.xb-mat >> text=Amb quin material?');
    await page.click('.xb-matbtn >> text=Goma elàstica');
    await page.waitForSelector('.dialog', { state: 'detached' });
    const item = blk.locator('.item').last();
    if ((await item.locator('.picker-input').inputValue()) !== 'Curl martell') throw new Error('no s\'ha afegit el curl martell');
    await item.locator('.tag >> text=Goma elàstica').waitFor();
    await item.locator('.item-side .menu button').click();
    await page.click('.menu-list >> text=Elimina');
  });
  await step('tancament: RPE (1–10) i durada → càrrega', async () => {
    const btns = await page.locator('.feedback .seg-rpe .seg-btn').allInnerTexts();
    if (btns.join() !== '1,2,3,4,5,6,7,8,9,10') throw new Error(`escala ${btns}`);
    await page.click('.seg-rpe >> text=7');
    await page.fill('#fb-min', '60');
    await page.waitForSelector('.computed >> text=420 UA');
  });
  await step('encoder ADR a la força principal', async () => {
    const item = page.locator('section.block.blk-for .item').first();
    await item.locator('.vbt-btn').click();
    const ins = item.locator('.vbt-table tbody tr').first().locator('input');
    await ins.nth(0).fill('80');
    await ins.nth(1).fill('5');
    await ins.nth(2).fill('0,80');
    await ins.nth(3).fill('0,64');
    await ins.nth(5).fill('820');
    if ((await ins.nth(4).getAttribute('placeholder')) !== '20') throw new Error('la pèrdua de velocitat no es calcula');
    await item.locator('.vbt-sum >> text=V 1a rep 0,80 m/s · PV 20 % · 820 W').waitFor();
    await item.locator('.vbt-head >> text=ADR Jumping').click();
    await item.locator('.vbt-table >> text=Altura millor').waitFor();
    await item.locator('.vbt-head >> text=Encoder ADR').click();
    await shot(page, '08b-encoder');
  });
  await step('força principal dividida en blocs (bloc 1 amb 3 exercicis, bloc 2 amb 2)', async () => {
    const blk = page.locator('section.block.blk-for');
    await blk.locator('.add-group >> text=Divideix en blocs').click();
    await blk.locator('.sgroup').nth(1).waitFor();
    if ((await blk.locator('.sgroup').nth(0).locator('.item').count()) !== 4) throw new Error('el bloc 1 ha de tenir els 4 exercicis');
    await blk.locator('.sgroup').nth(1).locator('.sgroup-name').fill('Superset · 3 voltes');
    // L'últim exercici del bloc 1 passa al bloc 2 (des del menú de l'exercici).
    await blk.locator('.sgroup').nth(0).locator('.item').last().locator('.item-side .menu button').click();
    await page.click('.menu-list >> text=Mou al bloc 2');
    await blk.locator('.sgroup').nth(1).locator('.item').first().waitFor();
    await blk.locator('.sgroup').nth(1).locator('.add-item >> text=Afegeix exercici al bloc 2').click();
    await page.waitForSelector('.dialog-title >> text=Bloc 2');
    await page.click('.xb-zone >> text=Tren inferior');
    await page.click('.xb-folder >> text=Gluti major (GMax)');
    await page.click('.xb-ex-name >> text="Hip thrust"');
    await page.click('.xb-matbtn >> text=Barra olímpica');
    await page.waitForFunction(() => document.querySelectorAll('section.block.blk-for .sgroup')[1].querySelectorAll('.item').length === 2);
    if ((await blk.locator('.sgroup').nth(0).locator('.item').count()) !== 3) throw new Error('bloc 1');
    // «Mou amunt» des del primer exercici del bloc 2 el torna al bloc 1.
    await blk.locator('.sgroup').nth(1).locator('.item').first().locator('.item-side .menu button').click();
    await page.click('.menu-list >> text=Mou amunt');
    await page.waitForFunction(() => document.querySelectorAll('section.block.blk-for .sgroup')[0].querySelectorAll('.item').length === 4);
    await blk.locator('.sgroup').nth(0).locator('.item').last().locator('.item-side .menu button').click();
    await page.click('.menu-list >> text=Mou avall');
    await page.waitForFunction(() => document.querySelectorAll('section.block.blk-for .sgroup')[1].querySelectorAll('.item').length === 2);
    await blk.scrollIntoViewIfNeeded();
    await shot(page, '08c-subblocs', false);
  });
  await step('progressió d\'un exercici (▲ ▼) i mètode del bloc', async () => {
    const blk = page.locator('section.block.blk-for');
    const first = blk.locator('.item').first();
    if ((await first.locator('.picker-input').inputValue()) !== 'Back squat') throw new Error('el primer exercici no és el back squat');
    await first.locator('.lvl-btn[aria-label="Progressa un nivell"]').click();
    await page.waitForFunction(() => document.querySelector('section.block.blk-for .item .picker-input').value === 'Front squat');
    await first.locator('.lvl-n >> text=N4').waitFor();
    await first.locator('.lvl-btn[aria-label="Regressa un nivell"]').click();
    await page.waitForFunction(() => document.querySelector('section.block.blk-for .item .picker-input').value === 'Back squat');
    await page.selectOption('section.block.blk-for .block-head .method-select', { label: 'Contrast (PAPE)' });
    await blk.locator('.method-hint >> text=Contrast (PAPE)').first().waitFor();
    await blk.locator('.sgroup').nth(1).locator('.method-select').selectOption({ label: 'Clúster' });
    await blk.locator('.sgroup').nth(1).locator('.method-hint >> text=Clúster').waitFor();
  });
  await step('vídeo de demostració (YouTube) desat a la biblioteca', async () => {
    const item = page.locator('section.block.blk-mob .item').first();
    await item.locator('button.mini[title*="demostració"]').click();
    await page.fill('#demo-url', 'https://youtu.be/dQw4w9WgXcQ');
    await page.waitForSelector('.dialog .embed iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]');
    await page.click('.dialog-foot >> text=Desa');
    await item.locator('button.mini.on[title*="demostració"]').waitFor();
  });
  await step('fitxa per al client', async () => {
    await page.click('.editbar >> text=Presenta');
    await page.waitForSelector('.sheet');
    await page.waitForSelector('.sblock.blk-for .sx-thumb svg.pic');
    // L'exercici amb vídeo de YouTube té de miniatura la imatge del vídeo.
    await page.waitForSelector('.sblock.blk-mob .sx-thumb img[src="https://i.ytimg.com/vi/dQw4w9WgXcQ/mqdefault.jpg"]');
    await shot(page, '09-fitxa-sessio');
  });
  await step('presenta: subblocs de la força principal', async () => {
    await page.waitForSelector('.sblock.blk-for .sx-group >> text=Bloc 1');
    await page.waitForSelector('.sblock.blk-for .sx-group >> text=Superset · 3 voltes');
    if ((await page.locator('.sblock.blk-for .sx-group').count()) !== 2) throw new Error('subblocs a la fitxa');
    await page.waitForSelector('.sblock.blk-for .sblock-focus >> text=Contrast (PAPE)');
    await page.waitForSelector('.sblock.blk-for .sx-group .sx-method >> text=Clúster');
  });
  await step('presenta: vídeos del bloc de mobilitat', async () => {
    await page.click('.sblock.blk-mob .sblock-videos');
    await page.waitForSelector('.bv .embed iframe[src*="youtube-nocookie.com/embed/dQw4w9WgXcQ"]');
    await shot(page, '09b-videos-bloc');
    // Escape tanca els vídeos (amb el focus a la pàgina: dins del reproductor de YouTube, la tecla és del reproductor).
    await page.locator('.bv-head button[title="Tanca"]').focus();
    await page.keyboard.press('Escape');
    await page.waitForSelector('.bv', { state: 'detached' });
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
  await step('sessió en blanc: sense blocs i afegits a mà', async () => {
    await goHash(page, '#/client/P-DEMO-ALEX');
    await page.click('.phead-actions >> text=Nova sessió');
    await page.click('.choice >> text=Sessió en blanc');
    await page.click('.dialog-foot >> text=Crea la sessió');
    await page.waitForSelector('.addblocks-empty');
    if (await page.locator('section.block').count()) throw new Error('la sessió en blanc no ha de tenir blocs');
    await page.click('.addblock >> text=Força principal');
    await page.waitForSelector('section.block.blk-for');
    await page.click('.addblock >> text=Mobilitat');
    await page.waitForSelector('section.block.blk-mob');
    const keys = await page.$$eval('section.block', (els) => els.map((e) => [...e.classList].find((c) => c.startsWith('blk-'))));
    if (keys.join() !== 'blk-mob,blk-for') throw new Error(`ordre dels blocs: ${keys}`);
    if ((await page.locator('.addblock').count()) !== 4) throw new Error('han de quedar 4 blocs per afegir');
    await shot(page, '08e-sessio-blocs-a-ma');
    await page.locator('section.block.blk-mob .block-head button[title="Plantilles del bloc"]').click();
    await page.click('.menu-list >> text=Treu el bloc de la sessió');
    await page.waitForSelector('section.block.blk-mob', { state: 'detached' });
  });
  await step('pla d\'entrenament: 8 sessions amb progressió cada 2', async () => {
    await goHash(page, '#/client/P-DEMO-ALEX/pla');
    await page.click('.card >> text=Crea un pla');
    await page.fill('#pl-name', 'Pla de pretemporada');
    await page.fill('#pl-count', '8');
    await page.selectOption('#pl-every', '2');
    await shot(page, '11a-pla-nou', false);
    await page.click('.dialog-foot >> text=Crea el pla');
    await page.waitForSelector('.plangrid');
    if ((await page.locator('.pg-col').count()) !== 8) throw new Error('han de ser 8 sessions');
    if (!(await page.locator('.pg-cell.pg-up').count())) throw new Error('no hi ha cap exercici que pugi de nivell');
    await page.click('.pg-col >> text=S3');
    await page.waitForSelector('.plan-cur >> text=Sessió 3 del pla');
    await shot(page, '11b-pla-editor');
  });
  await step('pla: sessions previstes al calendari i sessió del dia des del pla', async () => {
    await goHash(page, '#/client/P-DEMO-ALEX/mes');
    await page.waitForSelector('.cal');
    if (!(await page.locator('.cal-s.ghost').count())) await page.click('.month-nav button[title="Mes següent"]');
    await page.locator('.cal-s.ghost').first().click();
    await page.waitForSelector('.plan-pill >> text=S1 del pla');
    await goHash(page, '#/client/P-DEMO-ALEX/sessions');
    await page.click('.page .card-head >> text=Nova sessió');
    await page.waitForSelector('.choice.on >> text=Del pla d\'entrenament');
    await page.click('.dialog-foot >> text=Crea la sessió');
    await page.waitForSelector('.plan-pill >> text=S2 del pla');
  });
  await step('progrés: sessió d\'abans i d\'ara (càrrega i velocitat de l\'encoder)', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/pla');
    await page.click('text=Mira el progrés');
    await page.waitForSelector('.pv-row');
    await page.waitForSelector('.pv-chip.up >> text=m/s');
    await page.waitForSelector('.pv-evo .chart svg');
    await shot(page, '11c-progres');
    await page.click('.presentbar >> text=Torna');
    await page.waitForSelector('.plancard');
  });
  await step('nou client', async () => {
    await goHash(page, '#/inici');
    await page.click('.page-actions >> text=Nou pacient');
    await page.fill('#np-first', 'Prova');
    await page.fill('#np-last', 'Automàtica');
    await page.click('.dialog-foot >> text=Crea el pacient');
    await page.waitForSelector('text=Dades personals');
  });
  await step('servei i professionals del centre', async () => {
    await page.waitForSelector('.phead .eyebrow >> text=Valoració inicial (Membership)');
    if (await page.locator('[role="radiogroup"][aria-label="Servei"] button').count() !== 2) throw new Error('han de ser dos tipus de pacient');
    await page.click('[role="radiogroup"][aria-label="Servei"] >> text=Bo (pacient puntual)');
    await page.waitForSelector('.phead .eyebrow >> text=Bo (pacient puntual)');
    await page.click('[role="radiogroup"][aria-label="Servei"] >> text=Valoració inicial (Membership)');
    await page.waitForSelector('.phead .eyebrow >> text=Valoració inicial (Membership)');
    const profs = await page.$$eval('#pf-professional option', (o) => o.map((x) => x.value));
    for (const n of ['Ricardo Villamizar', 'Arnau', 'Oriol Pastor (fisioteràpia)']) if (!profs.includes(n)) throw new Error(`falta ${n}: ${profs}`);
    if (profs.some((n) => /Pau Roca|Marta Soler/.test(n))) throw new Error(`noms ficticis: ${profs}`);
    // És un desplegable: amb un nom ja triat s'hi veuen igualment tots els professionals.
    await page.selectOption('#pf-professional', 'Oriol Pastor (fisioteràpia)');
    await page.waitForSelector('.phead-meta >> text=Oriol Pastor (fisioteràpia)');
    await page.selectOption('#pf-professional', 'Arnau');
  });
  await step('informe de la doctora → objectiu, motiu, antecedents i dates', async () => {
    await page.fill('textarea[aria-label="Text de l\'informe de la doctora"]', 'Motiu de consulta: dolor lumbar en aixecar pes\nAntecedents: hèrnia L5-S1 (2021)\nIntervenció quirúrgica: microdiscectomia 14/02/2022\nObjectiu: tornar a entrenar força sense dolor');
    await page.click('text=Omple les dades del pacient');
    await page.waitForSelector('.docmap >> text=Motiu de consulta');
    await shot(page, '10a-informe-doctora');
    await page.click('.dialog-foot >> text=Desa a la fitxa');
    await page.waitForFunction(() => document.querySelector('#pf-goal') && document.querySelector('#pf-goal').value === 'tornar a entrenar força sense dolor');
    if ((await page.inputValue('#pf-reason')) !== 'dolor lumbar en aixecar pes') throw new Error('motiu');
    if ((await page.inputValue('#pf-surgeryDate')) !== '2022-02-14') throw new Error('data IQ');
    if (!(await page.inputValue('#pf-history')).includes('hèrnia L5-S1')) throw new Error('antecedents');
  });
  await step('biblioteca: progressions i apunts d\'un mètode', async () => {
    await goHash(page, '#/biblioteca');
    await page.click('.seg >> text=Progressions');
    await page.waitForSelector('.ladder >> text=Olímpics · cargolada');
    await page.waitForSelector('.ladder >> text=Equilibri');
    await shot(page, '10b-progressions', false);
    await goHash(page, '#/biblioteca/metodes');
    await page.click('.method >> text=Clúster');
    await page.fill('#me-notes', 'Apunts del curs: ideal amb l\'encoder per mantenir la velocitat.');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.method:has-text("Clúster") .ic, .method:has-text("Clúster") svg');
    await shot(page, '10c-metodes', false);
  });
  await step('biblioteca', async () => {
    await goHash(page, '#/biblioteca');
    await page.waitForSelector('.exrow');
    await shot(page, '10-biblioteca', false);
    await goHash(page, '#/biblioteca/plantilles');
    await page.waitForSelector('.trow-tpl');
  });
  await step('biblioteca per grup muscular i material del centre', async () => {
    await goHash(page, '#/biblioteca');
    await page.click('.seg >> text=Per grup muscular');
    await page.click('.mfolder summary >> text=Tríceps');
    await page.waitForSelector('.mfolder[open] .exrow >> text=Extensió de tríceps a la politja');
    await goHash(page, '#/configuracio');
    await page.waitForSelector('.profchip >> text=kBox Lite Exxentric');
    await page.fill('input[aria-label="Material nou"]', 'Trineu');
    await page.click('form:has(input[aria-label="Material nou"]) >> text=Afegeix');
    await page.waitForSelector('.profchip >> text=Trineu');
  });
  await step('miniatures: dibuix i foto pròpia d\'un exercici', async () => {
    await goHash(page, '#/biblioteca');
    await page.click('.seg >> text=Miniatures');
    await page.waitForSelector('.xb-grid .xb-ex .exthumb svg.pic');
    await shot(page, '36-biblioteca-miniatures', false);
    await page.click('.seg >> text=Llista');
    await page.fill('input[aria-label="Cerca exercicis"]', 'Hip thrust');
    await page.click('.exrow >> nth=0');
    await page.waitForSelector('.thumbedit >> text=Dibuix: Hip thrust (automàtic)');
    await page.click('.thumbedit >> text=Canvia el dibuix');
    await page.click('.picopt-name >> text="Pont de glutis"');
    await page.waitForSelector('.thumbedit >> text=Dibuix: Pont de glutis');
    const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64');
    await page.setInputFiles('.thumbedit input[type=file]', { name: 'foto.png', mimeType: 'image/png', buffer: png });
    await page.waitForSelector('.thumbedit .exthumb img[src^="data:image/jpeg"]');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.waitForSelector('.exrow >> nth=0 >> .exthumb img');
  });
  await step('valoració: llegir l\'informe PDF de Kinvent (OCR simulat amb la lectura real d\'un informe)', async () => {
    // Sense internet als tests: el lector (Tesseract) es substitueix per un que torna el que va llegir d'un informe de prova.
    const fx = JSON.parse(readFileSync(join(root, 'app', 'test', 'fixtures', 'kinvent-ocr.json'), 'utf8'));
    // El PDF de prova té pàgines petites (744 px): l'app les llegeix a 2400 px d'amplada, i les línies són d'una lectura a 2000.
    const f = 2400 / fx.width;
    const sb = (b) => ({ x0: b.x0 * f, y0: b.y0 * f, x1: b.x1 * f, y1: b.y1 * f });
    const pages = fx.pages.map((ls) => ls.map((l) => ({ ...l, bbox: sb(l.bbox), words: l.words.map((w) => ({ ...w, bbox: sb(w.bbox) })) })));
    const fake = `window.__kv = ${JSON.stringify({ pages, values: fx.values.rawTesseract })};
      window.Tesseract = { createWorker: async () => { let ps = {}; return {
        setParameters: async (p) => { ps = p; },
        recognize: async () => (ps.tessedit_pageseg_mode === '7' ? { data: { text: window.__kv.values.shift() || '' } }
          : { data: { blocks: [{ paragraphs: [{ lines: window.__kv.pages.shift() || [] }] }] } }),
        terminate: async () => {} }; } };`;
    await page.route(/cdn\.jsdelivr\.net\/npm\/tesseract\.js@/, (r) => r.fulfill({ body: fake, contentType: 'text/javascript' }));
    const aid = await page.evaluate(() => Store.all('assessments').find((x) => x.patientId === 'P-DEMO-JORDI').id);
    await goHash(page, `#/valoracio/${aid}`);
    await page.locator('input[aria-label="Informe de Kinvent per llegir"]').first().setInputFiles(join(root, 'app', 'test', 'fixtures', 'kinvent-blank.pdf'));
    await page.waitForSelector('.kvi-row >> nth=7');
    const first = await page.locator('.kvi-row').first().locator('.kvi-val input').evaluateAll((els) => els.map((e) => e.value));
    if (first.join() !== '76,2,92,7') throw new Error(`valors corregits: ${first}`);
    await shot(page, '06d-kinvent', false);
    await page.click('.dialog-foot >> text=Omple 8 proves');
    await page.waitForSelector('.dialog', { state: 'detached' });
    const v = await page.evaluate((id) => Store.get('assessments', id), aid);
    if (v.values.rom_sh_er.e !== '76,2' || v.values.dyn_knee_ext.e !== '182' || v.values.dyn_squeeze.d !== '79' || v.values.dyn_squeeze.e !== '71') throw new Error(JSON.stringify(v.values.dyn_squeeze));
    if (!(v.files || []).some((f) => f.label === 'Informe Kinvent')) throw new Error('no s\'ha adjuntat el PDF');
  });
  await step('valoració: fotos del test de Thomas (dreta i esquerra) i de flexió de tronc; vídeos del single leg squat per costat', async () => {
    const aid = await page.evaluate(() => Store.all('assessments').find((x) => x.patientId === 'P-DEMO-JORDI').id);
    await goHash(page, `#/valoracio/${aid}`);
    const thomas = page.locator('.trow', { hasText: 'Test de Thomas' });
    await thomas.locator('.tphoto', { hasText: 'Foto dreta' }).waitFor();
    if (await thomas.locator('.trow-tools button[title*="Test de Thomas"]').count()) throw new Error('el test de Thomas encara té el botó de vídeo');
    // Foto feta amb la càmera (dreta) i triada de la galeria (esquerra).
    await thomas.locator('.tphoto', { hasText: 'Foto dreta' }).locator('input[data-kind="camera"]').setInputFiles({ name: 'IMG_0001.png', mimeType: 'image/png', buffer: TINY_PNG });
    await thomas.locator('.tphoto.has', { hasText: 'Foto dreta' }).locator('.tphoto-img img').waitFor();
    await thomas.locator('.tphoto', { hasText: 'Foto esquerra' }).locator('input[data-kind="gallery"]').setInputFiles({ name: 'IMG_0002.png', mimeType: 'image/png', buffer: TINY_PNG });
    await thomas.locator('.tphoto.has', { hasText: 'Foto esquerra' }).locator('.tphoto-img img').waitFor();
    const adams = page.locator('.trow', { hasText: 'Test de flexió de tronc' });
    if ((await adams.locator('.tphoto').count()) !== 1) throw new Error('la flexió de tronc ha de tenir una sola foto');
    await adams.locator('input[data-kind="camera"]').setInputFiles({ name: 'IMG_0003.png', mimeType: 'image/png', buffer: TINY_PNG });
    await adams.locator('.tphoto.has .tphoto-img img').waitFor();
    // Single leg squat: un vídeo per costat.
    const sls = page.locator('.trow', { hasText: 'Single leg squat' });
    if ((await sls.locator('.tvideo').count()) !== 2) throw new Error('el single leg squat ha de tenir dos vídeos');
    await sls.locator('.tvideo', { hasText: 'Vídeo dreta' }).locator('input[data-kind="record"]').setInputFiles({ name: 'sls-d.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video dreta') });
    await sls.locator('.tvideo.has', { hasText: 'Vídeo dreta' }).waitFor();
    await sls.locator('.tvideo', { hasText: 'Vídeo esquerra' }).locator('input[data-kind="gallery"]').setInputFiles({ name: 'sls-e.mp4', mimeType: 'video/mp4', buffer: Buffer.from('video esquerra') });
    await sls.locator('.tvideo.has', { hasText: 'Vídeo esquerra' }).waitFor();
    // Y-Balance: les 3 mesures i la longitud per cama, i un vídeo per cama.
    const ybt = page.locator('#grp-ybt');
    if ((await ybt.locator('.ybt-table tbody tr').count()) !== 5) throw new Error('files del Y-Balance');
    await ybt.locator('.tvideo', { hasText: 'Vídeo dreta' }).locator('input[data-kind="record"]').setInputFiles({ name: 'ybt-d.mp4', mimeType: 'video/mp4', buffer: Buffer.from('ybt dreta') });
    await ybt.locator('.tvideo.has', { hasText: 'Vídeo dreta' }).waitFor();
    await ybt.locator('.tvideo', { hasText: 'Vídeo esquerra' }).locator('input[data-kind="gallery"]').setInputFiles({ name: 'ybt-e.mp4', mimeType: 'video/mp4', buffer: Buffer.from('ybt esquerra') });
    await ybt.locator('.tvideo.has', { hasText: 'Vídeo esquerra' }).waitFor();
    // Patró Lateral Lunge: un vídeo per costat.
    const lat = page.locator('.pcard', { hasText: 'Lateral Lunge' });
    if ((await lat.locator('.tvideo').count()) !== 2) throw new Error('el lateral lunge ha de tenir dos vídeos');
    await lat.locator('.tvideo', { hasText: 'Vídeo esquerra' }).locator('input[data-kind="record"]').setInputFiles({ name: 'lat-e.mp4', mimeType: 'video/mp4', buffer: Buffer.from('lateral esquerra') });
    await lat.locator('.tvideo.has', { hasText: 'Vídeo esquerra' }).waitFor();
    // Tots els patrons unilaterals (Lunge, Lateral Lunge, Copenhagen) tenen dos vídeos; els bilaterals, cap.
    for (const pt of ['Lunge', 'Copenhagen Plank']) {
      if ((await page.locator('.pcard', { has: page.locator('.pcard-title', { hasText: new RegExp(`· ${pt}$`) }) }).locator('.tvideo').count()) !== 2) throw new Error(`${pt}: dos vídeos`);
    }
    if ((await page.locator('.pcard', { has: page.locator('.pcard-title', { hasText: /· Squat$/ }) }).locator('.tvideo').count()) !== 0) throw new Error('el squat no té vídeos per costat');
    await page.waitForTimeout(300);
    const all = await page.evaluate((id) => Store.get('assessments', id), aid);
    if (!/^eonlocal:/.test((all.patterns.laterallunge || {}).videoE || '')) throw new Error(`lateral lunge: ${JSON.stringify(all.patterns.laterallunge)}`);
    const v = all.values;
    for (const [t, k] of [['thomas', 'photoD'], ['thomas', 'photoE'], ['adams', 'photo'], ['sls', 'videoD'], ['sls', 'videoE']]) {
      if (!/^eonlocal:/.test((v[t] || {})[k] || '')) throw new Error(`${t}.${k}: ${JSON.stringify(v[t])}`);
    }
    if (!/^eonlocal:/.test(all.ybt.videoD || '') || !/^eonlocal:/.test(all.ybt.videoE || '')) throw new Error(`ybt: ${JSON.stringify(all.ybt)}`);
    await thomas.scrollIntoViewIfNeeded();
    await shot(page, '06e-fotos-videos', false);
    // A l'informe: les tres fotos amb el nom del test i el costat, i els dos vídeos del single leg squat.
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.rphoto figcaption >> text=Test de Thomas · dreta');
    if ((await page.locator('.rphoto').count()) !== 3) throw new Error('fotos a l\'informe');
    await page.waitForSelector('.rphoto img');
    await page.waitForSelector('.rvid >> text=Single leg squat · esquerra');
    await page.waitForSelector('.rvid >> text=Y-Balance Test · dreta');
    await page.waitForSelector('.rvid >> text=Lateral Lunge · esquerra');
    // Excel: enllaços a les fotos i als vídeos.
    const flat = await page.evaluate((id) => { const a = Store.get('assessments', id); return Flat.assessment(a, Store.get('patients', a.patientId)); }, aid);
    if (!/^eonlocal:/.test(flat['Test de Thomas foto D']) || !/^eonlocal:/.test(flat['Single leg squat vídeo E'])) throw new Error('columnes de l\'Excel');
  });
  await step('wellness a l\'inici de la sessió i de la valoració (1-5 i observacions)', async () => {
    const sid = await page.evaluate(() => Store.newSession('P-DEMO-ALEX', { date: U.today(), mode: 'blank' }).id);
    await goHash(page, `#/sessio/${sid}`);
    const card = page.locator('#se-wellness');
    await card.waitFor();
    for (const [label, v] of [['Fatiga', '4'], ['Qualitat del son', '2'], ['Dolor muscular', '3'], ['Nivell d\'estrès', '4'], ['Estat d\'ànim', '5']]) {
      await card.locator(`[role="radiogroup"][aria-label="${label} de l'1 al 5"] >> text="${v}"`).click();
    }
    await card.locator('textarea').fill('Ha dormit malament per un viatge.');
    await card.locator('.pill >> text=18/25').waitFor();
    if (!(await card.locator('.wl-item.wl-low', { hasText: 'Qualitat del son' }).count())) throw new Error('el son baix no es marca');
    await page.waitForTimeout(300);
    const w = await page.evaluate((id) => Store.get('sessions', id).wellness, sid);
    if (w.fatigue !== '4' || w.sleep !== '2' || w.mood !== '5' || w.notes !== 'Ha dormit malament per un viatge.') throw new Error(JSON.stringify(w));
    const flat = await page.evaluate((id) => { const x = Store.get('sessions', id); return Flat.session(x, Store.get('patients', x.patientId), Store.settings); }, sid);
    if (flat['Wellness total (/25)'] !== 18 || flat['Qualitat del son (1-5)'] !== 2) throw new Error(JSON.stringify(flat));
    await card.scrollIntoViewIfNeeded();
    await shot(page, '08b-wellness-sessio', false);
    // A la valoració, a sota de les dades.
    const aid = await page.evaluate(() => Store.all('assessments').find((x) => x.patientId === 'P-DEMO-ALEX').id);
    await goHash(page, `#/valoracio/${aid}`);
    await page.locator('#as-wellness [role="radiogroup"][aria-label="Fatiga de l\'1 al 5"] >> text="3"').click();
    await page.waitForTimeout(300);
    const aw = await page.evaluate((id) => Store.get('assessments', id).wellness, aid);
    if (!aw || aw.fatigue !== '3') throw new Error(JSON.stringify(aw));
    await page.locator('#as-wellness .pill >> text=1 de 5').waitFor();
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.report-facts >> text=Fatiga 3');
  });
  await step('fitxa del client: perfil i limitacions al resum; el pes de la valoració actualitza la fitxa', async () => {
    await goHash(page, '#/client/P-DEMO-ALEX/fitxa');
    await page.fill('#pf-height input, input#pf-height', '183');
    await page.fill('#pf-limitations', 'Sense salts unipodals aquesta setmana');
    await page.waitForTimeout(300);
    await goHash(page, '#/client/P-DEMO-ALEX');
    await page.waitForSelector('.cprof-limits >> text=Sense salts unipodals aquesta setmana');
    await page.waitForSelector('.cprof-fact >> text=183 cm');
    await page.waitForSelector('.cprof-fact >> text=IMC');
    await shot(page, '02b-client-perfil', false);
    const aid = await page.evaluate(() => { const l = Store.assessmentsOf('P-DEMO-ALEX'); return l[l.length - 1].id; });
    await goHash(page, `#/valoracio/${aid}`);
    await page.fill('#as-weight', '78');
    await page.waitForTimeout(300);
    const w = await page.evaluate(() => Store.get('patients', 'P-DEMO-ALEX').weight);
    if (w !== '78') throw new Error(`pes de la fitxa: ${w}`);
  });
  await step('biblioteca: crear un exercici que no hi és, amb el vídeo de YouTube com a miniatura', async () => {
    await goHash(page, '#/biblioteca');
    await page.click('.seg >> text=Llista');
    await page.fill('input[aria-label="Cerca exercicis"]', 'Exercici gravat al centre');
    await page.click('text=Crea «Exercici gravat al centre»');
    if ((await page.inputValue('#ex-name')) !== 'Exercici gravat al centre') throw new Error('el nom no ve de la cerca');
    await page.fill('#ex-video', 'https://youtu.be/FiuU4aBaUb0');
    await page.waitForSelector('.thumbedit >> text=Imatge del vídeo de YouTube');
    await page.selectOption('#ex-gm', 'Quàdriceps'); // el múscul principal és la carpeta on surt (obligatori)
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.waitForSelector('.exrow:has-text("Exercici gravat al centre") .exthumb img[src="https://i.ytimg.com/vi/FiuU4aBaUb0/mqdefault.jpg"]');
    // Un vídeo privat (YouTube no en dona la imatge): avís i dibuix.
    await page.route(/ytimg\.com\/vi\/PrivatVid00/, (r) => r.fulfill({ status: 404, body: '' }));
    await page.click('.page-actions >> text=Nou exercici');
    await page.fill('#ex-name', 'Prova de vídeo privat');
    await page.fill('#ex-video', 'https://youtu.be/PrivatVid00');
    await page.waitForSelector('.thumbedit-warn >> text=potser és privat');
    await page.waitForSelector('.thumbedit .exthumb svg.pic');
    await page.click('.dialog-foot >> text=Cancel·la');
  });
  await step('exercicis EON: carpeta per blocs, 1.3 de mobilitat amb el vídeo i «Afegeix el 1.4»', async () => {
    await goHash(page, '#/biblioteca');
    await page.fill('input[aria-label="Cerca exercicis"]', '');
    await page.click('.seg >> text=Exercicis EON');
    await page.waitForSelector('.eon-group .xb-ex:has-text("1.3") .exthumb img[src="https://i.ytimg.com/vi/RaKob2IOfqk/mqdefault.jpg"]');
    await shot(page, '10d-exercicis-eon', false);
    await page.click('.eon-group:has-text("Mobilitat") >> text=Afegeix el 1.4');
    if ((await page.inputValue('#ex-code')) !== '1.4' || (await page.inputValue('#ex-name')) !== '1.4') throw new Error('codi i nom del següent');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.waitForSelector('.eon-group:has-text("Mobilitat") >> text=Afegeix el 1.5');
    // A «Afegeix exercici» de la sessió, la carpeta Exercicis EON surt primer.
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.srow-main >> nth=0');
    await page.locator('section.block.blk-mob .add-item:not(.add-group)').click();
    await page.click('.xb-zone >> text=Exercicis EON');
    await page.click('.xb-folder >> text=1 · Mobilitat');
    const names = await page.locator('.xb-ex .xb-ex-name').allTextContents();
    if (names.map((x) => x.trim()).join() !== '1.3,1.4') throw new Error(`exercicis: ${names}`);
    await page.click('.dialog-head button[title="Tanca"]');
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
    // Un dia sense cap valoració d'aquest client (les dades de prova depenen d'avui): així és una mesura nova, de control.
    const day = await page.evaluate(() => U.addDays(U.today(), 1));
    const shown = day.split('-').reverse().join('/');
    await page.fill('#am-date', day);
    await page.click('.dialog-foot >> text=Continua');
    await page.waitForSelector('#grp-dyn.flash');
    await page.getByLabel('Leg extension · quàdriceps dreta').fill('580');
    await page.getByLabel('Leg extension · quàdriceps esquerra').fill('560');
    await page.waitForTimeout(1100);
    await page.click('.sidebar >> text=Base de dades');
    await page.click('.dbtab >> text=Dinamometria · K-Push');
    await page.waitForSelector(`.dbt td >> text=${shown}`);
    const types = await page.locator(`.dbt tbody tr:has-text("${shown}") td`).allInnerTexts();
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
  await step('fitxa: comentaris del professional al principi, tipus «Bo» i «Nou test» del pacient', async () => {
    await goHash(page, '#/client/P-DEMO-JORDI/fitxa');
    await page.waitForSelector('.pnotes');
    const firsts = await page.evaluate(() => [...document.querySelectorAll('.page .stack > section')].slice(0, 2).map((x) => x.className));
    if (!/pgoal/.test(firsts[0]) || !/pnotes/.test(firsts[1])) throw new Error(`l'objectiu i els comentaris no són al principi de la fitxa: ${firsts}`);
    await page.fill('#pf-goal', 'Tornar a esquiar sense dolor');
    await page.waitForSelector('.phead-goal >> text=Tornar a esquiar sense dolor');
    await goHash(page, '#/client/P-DEMO-JORDI/resum');
    if (await page.$eval('#rs-goal', (e) => e.value) !== 'Tornar a esquiar sense dolor') throw new Error('l\'objectiu no surt al resum');
    await goHash(page, '#/client/P-DEMO-JORDI/fitxa');
    await page.waitForSelector('.pnotes');
    await page.fill('#pf-notes', 'Primera trobada: li fa por el salt');
    await page.click('[role="radiogroup"][aria-label="Servei"] >> text=Bo (pacient puntual)');
    await page.waitForSelector('.phead .eyebrow >> text=Bo (pacient puntual)');
    await page.click('.phead-actions >> text=Nou test');
    await page.waitForSelector('.dialog >> text=Nou test');
    const sel = await page.$eval('#am-client', (e) => e.value);
    if (sel !== 'P-DEMO-JORDI') throw new Error(`Nou test sense el pacient: ${sel}`);
    await page.click('.dialog-foot >> text=Cancel·la');
    await goHash(page, '#/inici');
    await page.selectOption('select[aria-label="Tipus de pacient"]', 'bo');
    await page.waitForSelector('.crow >> text=Jordi');
    if (await page.locator('.crow').count() !== 1) throw new Error('el filtre per tipus no funciona');
    await page.selectOption('select[aria-label="Tipus de pacient"]', '');
  });
  await step('calendari: + d\'un dia → només l\'objectiu, i l\'RPE i el dolor sota l\'objectiu', async () => {
    await goHash(page, '#/client/P-DEMO-JORDI/mes');
    await page.waitForSelector('.cal');
    await page.click('.cal-btn-next, button[title="Mes següent"]');
    await page.locator('.cal-add').first().click();
    await page.waitForSelector('.dialog >> text=Programa la sessió sencera');
    await page.click('.dialog-foot >> text=Continua');
    await page.fill('#qs-goal', 'Readaptació ràpida de prova');
    await page.selectOption('#qs-pillar', 'Readaptació');
    await page.click('.dialog-foot >> text=Anota-la al calendari');
    await page.waitForSelector('.cal-s.quick >> text=Readaptació ràpida de prova');
    await page.click('.cal-s.quick >> text=Readaptació ràpida de prova');
    await page.click('[role="radiogroup"][aria-label="Estat"] >> text=Feta');
    await page.click('[role="radiogroup"][aria-label="RPE de la sessió"] >> text="7"');
    await page.click('[role="radiogroup"][aria-label="Dolor en acabar"] >> text="3"');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.cal-s.quick.done .cal-m-rpe >> text=7');
    await page.waitForSelector('.cal-s.quick.done .cal-m-pain.cal-m-warn >> text=3');
    await shot(page, '12-calendari-rapid');
    // La sessió sencera: els blocs es poden afegir després
    await page.click('.cal-s.quick >> text=Readaptació ràpida de prova');
    await page.click('.dialog-foot >> text=Programa-la sencera');
    await page.waitForSelector('#se-pillar');
    if (await page.$eval('#se-pillar', (e) => e.value) !== 'Readaptació') throw new Error('pilar');
  });
  await step('biblioteca: un exercici propi, ben classificat, surt a «Els nostres exercicis» i a la carpeta del seu múscul', async () => {
    await goHash(page, '#/biblioteca');
    await page.click('.libhelp summary');
    await page.waitForSelector('.libhelp >> text=Nou exercici en aquesta carpeta');
    await page.click('.page-actions >> text=Nou exercici');
    await page.fill('#ex-name', 'Pont de glutis EON amb pausa');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.toast >> text=Tria el múscul principal');
    await page.selectOption('#ex-gm', 'GMax');
    await page.waitForSelector('.explaces li >> text=Els nostres exercicis');
    await page.click('.dialog-foot >> text=Desa');
    await page.waitForSelector('.dialog', { state: 'detached' });
    await page.click('label.check:has-text("Només els nostres")');
    await page.waitForSelector('.exrow >> text=Pont de glutis EON amb pausa');
    const rows = await page.locator('.exrow').count(), own = await page.locator('.exrow .own-chip').count();
    if (!rows || rows !== own || rows > 10) throw new Error(`el filtre «Només els nostres» no funciona: ${rows} files, ${own} nostres`);
    // A la sessió: «Afegeix exercici» › Els nostres exercicis
    await goHash(page, '#/client/P-DEMO-LAURA/sessions');
    await page.click('.srow-main >> nth=0');
    await page.waitForSelector('.block');
    await page.locator('section.block.blk-for .add-item:not(.add-group)').first().click();
    await page.click('.xb-zone >> text=Els nostres exercicis');
    await page.click('.xb-folder >> text=Força principal');
    await page.waitForSelector('.xb-ex >> text=Pont de glutis EON amb pausa');
    await page.waitForSelector('.xb-here >> text=Nou exercici en aquesta carpeta');
    await page.click('.dialog-foot >> text=Cancel·la');
  });
  await step('dibuixos en moviment a la biblioteca; es poden aturar; a la fitxa impresa, inici → final', async () => {
    await goHash(page, '#/biblioteca');
    await page.fill('input[aria-label="Cerca exercicis"]', 'Back squat');
    await page.waitForSelector('.exrow:has-text("Back squat") .exthumb animate', { state: 'attached' });
    await goHash(page, '#/configuracio');
    await page.uncheck('#pic-motion');
    await goHash(page, '#/biblioteca');
    await page.fill('input[aria-label="Cerca exercicis"]', 'Back squat');
    await page.waitForSelector('.exrow:has-text("Back squat") .exthumb svg');
    if (await page.locator('.exrow:has-text("Back squat") .exthumb animate').count()) throw new Error('no s\'ha aturat');
    await goHash(page, '#/configuracio');
    await page.check('#pic-motion');
    const sid = await page.evaluate(() => Store.sessionsOf('P-DEMO-LAURA').filter((x) => x.status === 'feta').pop().id);
    await goHash(page, `#/fitxa/${sid}`);
    await page.waitForSelector('.sx-thumb.has-seq .exthumb-seq .exthumb-step svg', { state: 'attached' });
    await page.emulateMedia({ media: 'print' });
    const vis = await page.$eval('.sx-thumb.has-seq', (e) => [getComputedStyle(e.querySelector('.exthumb-seq')).display, getComputedStyle(e.querySelector('.exthumb-pic')).display]);
    await page.emulateMedia({ media: 'screen' });
    await goHash(page, '#/inici');
    if (vis[0] === 'none' || vis[1] !== 'none') throw new Error(`en imprimir: ${vis}`);
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
  // ── Excel de cada client i planificació del mes (versió local: descàrrega) ──
  await step('planifica el mes: sessions planificades al calendari', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/mes');
    await page.waitForSelector('.cal');
    const month = await page.evaluate(() => U.monthKey(U.addMonths(`${U.monthKey(U.today())}-01`, 2)));
    const label = await page.evaluate((m) => U.fmtMonth(m), month);
    await page.click('.month-head >> text=Planifica el mes');
    await page.waitForSelector('.dialog >> text=Crea d\'una vegada les sessions');
    await page.selectOption('#pm-month', month);
    for (const d of ['dilluns', 'dimarts', 'dimecres', 'dijous', 'divendres', 'dissabte', 'diumenge']) {
      const chip = page.locator('.dialog .chips .chip', { hasText: new RegExp(`^${d}$`) });
      const on = await chip.evaluate((el) => el.classList.contains('on'));
      if (on !== ['dimarts', 'dijous'].includes(d)) await chip.click();
    }
    await shot(page, '04b-planifica-el-mes', false);
    const n = await page.evaluate((m) => Store.monthDates(m, [2, 4]).length, month);
    await page.click(`.dialog-foot >> text=Crea ${n} sessions`);
    await page.waitForSelector(`.toast >> text=${n} sessions planificades`);
    await page.waitForSelector(`.month-title >> text=${label}`);
    const shown = await page.locator('.cal-s.plan').count();
    if (shown !== n) throw new Error(`al calendari hi ha ${shown} sessions planificades i n'esperàvem ${n}`);
    const bad = await page.evaluate((m) => Store.sessionsOf('P-DEMO-LAURA').filter((s) => s.date.startsWith(m)).some((s) => s.status !== 'planificada' || (s.feedback && s.feedback.rpe)), month);
    if (bad) throw new Error('alguna sessió planificada no ho està');
    await shot(page, '04c-mes-planificat');
  });
  await step('copia una setmana a les següents', async () => {
    const monday = await page.evaluate(() => U.weekStart(U.addMonths(U.today(), 4)));
    const month = monday.slice(0, 7);
    await goHash(page, '#/inici');
    await page.evaluate(([d, m]) => { Store.addPlanned('P-DEMO-LAURA', { date: d, blocks: [], goal: 'Setmana tipus' }); MonthNav.show('P-DEMO-LAURA', m); }, [monday, month]);
    await goHash(page, '#/client/P-DEMO-LAURA/mes');
    await page.waitForSelector('.cal-w-copy');
    await page.click('.cal-w-copy >> nth=0');
    await page.waitForSelector('.dialog >> text=Copia la setmana del');
    await page.fill('#cw-n', '2');
    await page.click('.dialog-foot >> text=Copia a les 2 setmanes següents');
    try {
      await page.waitForSelector('.toast >> text=2 sessions planificades');
    } catch (e) {
      const info = await page.evaluate((d) => ({ toasts: [...document.querySelectorAll('.toast')].map((t) => t.innerText), dialog: !!document.querySelector('.dialog'),
        sessions: Store.sessionsOf('P-DEMO-LAURA').filter((x) => x.date >= d).map((x) => `${x.date}:${x.goal}`).slice(0, 12) }), monday);
      throw new Error(`${e.message.split('\n')[0]} · ${JSON.stringify(info)}`);
    }
    const dates = await page.evaluate((d) => Store.sessionsOf('P-DEMO-LAURA').filter((s) => s.date > d && s.goal === 'Setmana tipus').map((s) => s.date), monday);
    const want = await page.evaluate((d) => [U.addDays(d, 7), U.addDays(d, 14)], monday);
    if (JSON.stringify(dates) !== JSON.stringify(want)) throw new Error(`dates copiades ${dates} (esperades ${want})`);
  });
  await step('Excel: descarrega l\'Excel del client (resum, un full per mes, registre i valoracions)', async () => {
    await goHash(page, '#/client/P-DEMO-LAURA/mes');
    await page.waitForSelector('.cal');
    const [dl] = await Promise.all([page.waitForEvent('download'), (async () => {
      await page.click('.phead-actions >> text=Excel');
      await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    })()]);
    if (dl.suggestedFilename() !== 'seguiment_lauravidalserra_01.xlsx') throw new Error(`nom ${dl.suggestedFilename()}`);
    const x = readXlsx(readFileSync(await dl.path()));
    const month = await page.evaluate(() => ExcelMonth.sheetName(U.monthKey(U.addMonths(`${U.monthKey(U.today())}-01`, 2))));
    for (const n of ['Resum', 'Valoracions', 'Registre', month]) if (!x.names.includes(n)) throw new Error(`falta el full ${n} (hi ha ${x.names})`);
    if (!x.names.some((n) => /^Val\. inicial \d{2}-\d{2}-\d{2}$/.test(n))) throw new Error(`falta el detall de la valoració inicial (hi ha ${x.names})`);
    if (!x.sheet(month).text().includes('Planificada')) throw new Error('el full del mes planificat no mostra les sessions');
    if (!x.sheet('Resum').text().includes('Tornar a competir en trail de 42 km')) throw new Error('falta l\'objectiu del client');
    await shot(page, '04d-menu-excel', false);
  });
  await step('Excel: es descarrega també des de l\'editor de cada sessió i de cada valoració', async () => {
    const sid = await page.evaluate(() => Store.sessionsOf('P-DEMO-LAURA').filter((s) => s.status === 'feta').pop().id);
    await goHash(page, `#/sessio/${sid}`);
    await page.waitForSelector('.block');
    const [d1] = await Promise.all([page.waitForEvent('download'), (async () => {
      await page.click('.editbar .menu button');
      await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    })()]);
    if (d1.suggestedFilename() !== 'seguiment_lauravidalserra_01.xlsx') throw new Error(`nom ${d1.suggestedFilename()}`);
    const s = readXlsx(readFileSync(await d1.path()));
    if (!s.sheets.some((sh) => /^[A-Z][a-z]{2}\d{2}$/.test(sh.name) && sh.text().includes('Back squat'))) throw new Error('falten els exercicis als fulls dels mesos');
    const aid = await page.evaluate(() => Store.assessmentsOf('P-DEMO-LAURA').pop().id);
    await goHash(page, `#/valoracio/${aid}`);
    await page.waitForSelector('#sec-mobilitat');
    const [d2] = await Promise.all([page.waitForEvent('download'), (async () => {
      await page.click('.editbar .menu button');
      await page.click('.menu-list >> text=Descarrega l\'Excel del pacient');
    })()]);
    if (d2.suggestedFilename() !== 'seguiment_lauravidalserra_01.xlsx') throw new Error(`nom ${d2.suggestedFilename()}`);
    const v = readXlsx(readFileSync(await d2.path()));
    if (!v.names.some((n) => /^Re-test \d{2}-\d{2}-\d{2}$/.test(n))) throw new Error(`falta el detall del re-test (hi ha ${v.names})`);
    // La configuració explica els Excel
    await goHash(page, '#/configuracio');
    await page.waitForSelector('text=Excel de cada pacient');
    await page.waitForSelector('text=Només descàrrega');
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

// ── App de les tauletes (/demo/): sense clients de prova ──
{
  const { ctx, page } = await open({ width: 1180, height: 820 });
  await step('tauleta: en actualitzar, marxen els clients de prova i es queden els reals i la biblioteca', async () => {
    // Dades d'abans: els clients de prova, un client real i un exercici propi.
    await page.evaluate(() => {
      const db = JSON.parse(localStorage.getItem('eonlife:data:v1'));
      db.patients['P-REAL'] = { id: 'P-REAL', firstName: 'Client', lastName: 'De Veritat', status: 'actiu', service: 'membership' };
      db.exercises['X-PROPI'] = { id: 'X-PROPI', name: 'Exercici propi', block: 'mob', cat: 'Exercicis EON', materials: [] };
      localStorage.setItem('eonlife:data:v1', JSON.stringify(db));
    });
    await ctx.addInitScript(() => { window.EON_NO_DEMO = true; });
    await page.reload();
    await page.waitForSelector('.crow');
    await page.waitForSelector('.toast >> text=S\'han esborrat els pacients de prova');
    const names = await page.$$eval('.crow-name', (n) => n.map((x) => x.textContent));
    if (names.join('|') !== 'Client De Veritat') throw new Error(`clients: ${names}`);
    if (await page.$('.banner >> text=pacients ficticis')) throw new Error('encara surt l\'avís de prova');
    await shot(page, '60-tauleta-sense-clients-prova', false);
    await goHash(page, '#/biblioteca');
    await page.fill('.page input[type="search"]', 'Exercici propi');
    await page.waitForSelector('text=Exercici propi');
    // En tornar a obrir, no torna a avisar.
    await page.reload();
    await page.waitForSelector('.page');
    await page.waitForTimeout(700);
    if (await page.$('.toast >> text=pacients de prova')) throw new Error('avisa cada cop');
  });
  await ctx.close();
}
{
  const ctx = await browser.newContext({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: 1 });
  await ctx.addInitScript(() => { window.EON_NO_DEMO = true; });
  const page = await ctx.newPage();
  page.setDefaultTimeout(8000);
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await step('tauleta nova: l\'app comença buida i es pot crear el primer client', async () => {
    await page.goto(url);
    await page.waitForSelector('.page');
    if (await page.$('.crow')) throw new Error('hi ha clients');
    await shot(page, '61-tauleta-buida', false);
    await page.click('.page-actions >> text=Nou pacient');
    await page.fill('#np-first', 'Primer');
    await page.fill('#np-last', 'Client');
    await page.click('.dialog-foot >> text=Crea el pacient');
    await page.waitForSelector('text=Dades personals');
    await goHash(page, '#/inici');
    await page.waitForSelector('.crow-name >> text=Primer Client');
    // Els clients de prova es poden tornar a carregar a mà des de Configuració.
    await goHash(page, '#/configuracio');
    await page.click('text=Carrega els pacients de prova');
    await page.click('.dialog-foot >> text=Carrega la demo');
    await page.waitForSelector('.crow-name >> text=Laura Vidal Serra');
    await page.reload();
    await page.waitForSelector('.crow-name >> text=Laura Vidal Serra');
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
