// Prova de fum de la interfície amb Chromium (Playwright).
//   node app/test/e2e.mjs [carpeta-captures]
// Obre dist/eonlife.html, recorre totes les pantalles, prova els fluxos principals
// i falla si hi ha errors de JavaScript a la consola.
import { createRequire } from 'node:module';
import { join, dirname } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { mkdirSync, readFileSync } from 'node:fs';

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
  await step('versió de prova: el PDF de Kinvent es tria de la tauleta i s\'hi desa', async () => {
    await page.waitForSelector('#sec-fitxers >> text=Adjunta l\'informe de Kinvent');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#sec-fitxers >> text=Adjunta l\'informe de Kinvent')]);
    await chooser.setFiles({ name: 'Informe_Kinvent.pdf', mimeType: 'application/pdf', buffer: Buffer.from('%PDF-1.4 prova') });
    await page.waitForSelector('#sec-fitxers .file-name >> text=Informe Kinvent');
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
    await shot(page, '07-informe');
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
  await step('tancament: RPE i durada → càrrega', async () => {
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
    await page.click('.page-actions >> text=Nou client');
    await page.fill('#np-first', 'Prova');
    await page.fill('#np-last', 'Automàtica');
    await page.click('.dialog-foot >> text=Crea el client');
    await page.waitForSelector('text=Dades personals');
  });
  await step('servei i professionals del centre', async () => {
    await page.waitForSelector('[role="radiogroup"][aria-label="Servei"] >> text=Valoració inicial');
    await page.click('[role="radiogroup"][aria-label="Servei"] >> text=Seguiment membership');
    await page.waitForSelector('.phead .eyebrow >> text=Seguiment membership');
    const profs = await page.$$eval('#pf-professional option', (o) => o.map((x) => x.value));
    for (const n of ['Richy', 'Arnau', 'Oriol Pastor (fisioteràpia)']) if (!profs.includes(n)) throw new Error(`falta ${n}: ${profs}`);
    if (profs.some((n) => /Pau Roca|Marta Soler/.test(n))) throw new Error(`noms ficticis: ${profs}`);
    // És un desplegable: amb un nom ja triat s'hi veuen igualment tots els professionals.
    await page.selectOption('#pf-professional', 'Oriol Pastor (fisioteràpia)');
    await page.waitForSelector('.phead-meta >> text=Oriol Pastor (fisioteràpia)');
    await page.selectOption('#pf-professional', 'Arnau');
  });
  await step('informe de la doctora → objectiu, motiu, antecedents i dates', async () => {
    await page.fill('textarea[aria-label="Text de l\'informe de la doctora"]', 'Motiu de consulta: dolor lumbar en aixecar pes\nAntecedents: hèrnia L5-S1 (2021)\nIntervenció quirúrgica: microdiscectomia 14/02/2022\nObjectiu: tornar a entrenar força sense dolor');
    await page.click('text=Omple les dades del client');
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
    await page.waitForSelector('.toast >> text=S\'han esborrat els clients de prova');
    const names = await page.$$eval('.crow-name', (n) => n.map((x) => x.textContent));
    if (names.join('|') !== 'Client De Veritat') throw new Error(`clients: ${names}`);
    if (await page.$('.banner >> text=clients ficticis')) throw new Error('encara surt l\'avís de prova');
    await shot(page, '60-tauleta-sense-clients-prova', false);
    await goHash(page, '#/biblioteca');
    await page.fill('.page input[type="search"]', 'Exercici propi');
    await page.waitForSelector('text=Exercici propi');
    // En tornar a obrir, no torna a avisar.
    await page.reload();
    await page.waitForSelector('.page');
    await page.waitForTimeout(700);
    if (await page.$('.toast >> text=clients de prova')) throw new Error('avisa cada cop');
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
    await page.click('.page-actions >> text=Nou client');
    await page.fill('#np-first', 'Primer');
    await page.fill('#np-last', 'Client');
    await page.click('.dialog-foot >> text=Crea el client');
    await page.waitForSelector('text=Dades personals');
    await goHash(page, '#/inici');
    await page.waitForSelector('.crow-name >> text=Primer Client');
    // Els clients de prova es poden tornar a carregar a mà des de Configuració.
    await goHash(page, '#/configuracio');
    await page.click('text=Carrega els clients de prova');
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
