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
  await page.route(/youtube|ytimg/, (r) => r.abort());
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
    const fake = `window.__kv = ${JSON.stringify({ pages: fx.pages, values: fx.values.rawTesseract })};
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
    if (v.values.rom_sh_er.e !== '76,2' || v.values.dyn_knee_ext.e !== '182' || v.values.dyn_squeeze.v !== '79') throw new Error(JSON.stringify(v.values.dyn_squeeze));
    if (!(v.files || []).some((f) => f.label === 'Informe Kinvent')) throw new Error('no s\'ha adjuntat el PDF');
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
