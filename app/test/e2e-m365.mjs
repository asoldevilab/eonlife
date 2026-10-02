// Prova completa de la versió Microsoft 365 al navegador: inici de sessió (PKCE), carpeta compartida,
// preparació de l'Excel, desament de clients/valoracions/sessions, pujada de vídeos, recàrrega,
// segona tauleta, treball sense connexió i sessió caducada. Microsoft (login + Graph) és simulat.
//   node app/test/e2e-m365.mjs [carpeta-captures]
import { createRequire } from 'node:module';
import { createServer } from 'node:http';
import { createHash } from 'node:crypto';
import { readFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createGraphMock } from './graph-mock.mjs';

const require = createRequire(import.meta.url);
let playwright;
try { playwright = require('playwright'); } catch (e) { playwright = createRequire('/opt/node22/lib/node_modules/')('playwright'); }
const { chromium } = playwright;

const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..');
const shots = process.argv[2] || null;
if (shots) mkdirSync(shots, { recursive: true });

const CLIENT_ID = '11111111-2222-3333-4444-555555555555';
const TENANT_ID = 'aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee';
const html = readFileSync(join(root, 'dist', 'm365', 'index.html'), 'utf8')
  .replace(/window\.EON_M365 = \{[^\n]*\};/, `window.EON_M365 = ${JSON.stringify({ clientId: CLIENT_ID, tenantId: TENANT_ID, folderUrl: '' })};`);

// version.json: la mateixa versió que la pàgina, tret que la prova en publiqui una de «nova».
const served = { build: (html.match(/window\.EON_BUILD = "([^"]+)"/) || [])[1] };
const server = createServer((req, res) => {
  if (req.url.startsWith('/eon/version.json')) { res.writeHead(200, { 'Content-Type': 'application/json' }); res.end(JSON.stringify({ build: served.build })); return; }
  if (req.url.startsWith('/eon/')) { res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' }); res.end(html); return; }
  res.writeHead(404); res.end();
});
await new Promise((r) => server.listen(0, 'localhost', r));
const ORIGIN = `http://localhost:${server.address().port}`;
const APP = `${ORIGIN}/eon/`;

const users = {
  'tok-laura': { email: 'laura@eonlife.test', name: 'Laura Puig' },
  'tok-pau': { email: 'pau@eonlife.test', name: 'Pau Roca' },
};
const mock = createGraphMock({ users });
const shared = mock.createSharedFolder('EON Life · Dades');

// ── Microsoft Entra simulat ──
const codes = new Map();
const refreshTokens = new Map(); // refresh → usuari
const loginAs = { current: 'tok-laura' };
const auth = { refreshFails: false, authorizeHits: 0, tokenHits: 0 };
const b64url = (buf) => Buffer.from(buf).toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const idToken = (u) => `${b64url('{"alg":"none"}')}.${b64url(JSON.stringify({ name: u.name, preferred_username: u.email }))}.x`;
const cors = { 'access-control-allow-origin': ORIGIN, 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,PUT,PATCH,DELETE,OPTIONS', 'access-control-expose-headers': '*' };

async function handleLogin(route) {
  const req = route.request();
  const u = new URL(req.url());
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (u.pathname.endsWith('/authorize')) {
    auth.authorizeHits++;
    const q = u.searchParams;
    if (q.get('client_id') !== CLIENT_ID || !u.pathname.includes(TENANT_ID)) return route.fulfill({ status: 400, body: 'client o inquilí incorrecte' });
    if (q.get('redirect_uri') !== APP) return route.fulfill({ status: 302, headers: { location: `${q.get('redirect_uri')}?error=invalid_request&error_description=${encodeURIComponent('AADSTS50011: The redirect URI does not match.')}&state=${q.get('state')}` } });
    const code = `code-${codes.size + 1}`;
    codes.set(code, { challenge: q.get('code_challenge'), user: loginAs.current, redirect: q.get('redirect_uri') });
    if (!/Files\.ReadWrite\.All/.test(q.get('scope')) || q.get('code_challenge_method') !== 'S256') return route.fulfill({ status: 400, body: 'scope/pkce' });
    return route.fulfill({ status: 302, headers: { location: `${q.get('redirect_uri')}?code=${code}&state=${encodeURIComponent(q.get('state'))}&session_state=zz` } });
  }
  if (u.pathname.endsWith('/token')) {
    auth.tokenHits++;
    const form = new URLSearchParams(req.postData() || '');
    let user;
    if (form.get('grant_type') === 'authorization_code') {
      const c = codes.get(form.get('code'));
      codes.delete(form.get('code'));
      const ok = c && c.redirect === form.get('redirect_uri') && b64url(createHash('sha256').update(form.get('code_verifier') || '').digest()) === c.challenge;
      if (!ok) return route.fulfill({ status: 400, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'AADSTS70008: code expired or PKCE mismatch' }) });
      user = c.user;
    } else if (form.get('grant_type') === 'refresh_token') {
      user = refreshTokens.get(form.get('refresh_token'));
      if (!user || auth.refreshFails) return route.fulfill({ status: 400, headers: cors, contentType: 'application/json', body: JSON.stringify({ error: 'invalid_grant', error_description: 'AADSTS700084: The refresh token has expired.' }) });
    } else return route.fulfill({ status: 400, headers: cors, body: '{}' });
    const refresh = `r-${Math.random().toString(36).slice(2)}`;
    refreshTokens.set(refresh, user);
    return route.fulfill({ status: 200, headers: cors, contentType: 'application/json', body: JSON.stringify({ access_token: user, refresh_token: refresh, expires_in: 3600, token_type: 'Bearer', id_token: idToken(users[user]) }) });
  }
  if (u.pathname.endsWith('/logout')) return route.fulfill({ status: 302, headers: { location: u.searchParams.get('post_logout_redirect_uri') } });
  return route.fulfill({ status: 404, body: 'no simulat' });
}

const net = { offline: false };
async function handleGraph(route) {
  const req = route.request();
  if (req.method() === 'OPTIONS') return route.fulfill({ status: 204, headers: cors });
  if (net.offline) return route.abort('internetdisconnected');
  const headers = req.headers();
  let res;
  if (req.url().startsWith(mock.UPLOAD)) res = mock.handleUpload(req.method(), req.url(), headers, req.postDataBuffer());
  else {
    const buf = req.postDataBuffer();
    const isJson = (headers['content-type'] || '').includes('json');
    const body = buf ? (isJson ? JSON.parse(buf.toString('utf8')) : buf) : undefined;
    res = mock.dispatch(req.method(), req.url(), headers, body);
  }
  return route.fulfill({ status: res.status || 200, headers: cors, contentType: 'application/json', body: res.status === 204 ? '' : JSON.stringify(res.body ?? null) });
}

const errors = [];
const browser = await chromium.launch();

async function device(name, { user = 'tok-laura', viewport = { width: 1180, height: 820 } } = {}) {
  const ctx = await browser.newContext({ viewport });
  const page = await ctx.newPage();
  page.setDefaultTimeout(9000);
  page.on('pageerror', (e) => errors.push(`${name} · pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error' && !/fonts\.(googleapis|gstatic)|net::ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(m.text())) errors.push(`${name} · console: ${m.text()}`);
  });
  await page.route(/fonts\.(googleapis|gstatic)\.com/, (r) => r.abort());
  await page.route(/login\.microsoftonline\.com/, handleLogin);
  await page.route(/graph\.microsoft\.com|upload\.mock\.test/, handleGraph);
  // Miniatures i vídeos de OneDrive (adreces temporals pre-autenticades).
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==', 'base64');
  await page.route(/download\.mock\.test/, (r) => r.fulfill({ status: 200, headers: cors, contentType: r.request().url().includes('/thumb/') ? 'image/png' : 'video/mp4', body: png }));
  loginAs.current = user;
  return { ctx, page };
}

async function shot(page, name) {
  if (!shots) return;
  await page.waitForTimeout(150);
  await page.screenshot({ path: join(shots, `${name}.png`), fullPage: false });
}

const step = async (label, fn) => {
  try { await fn(); console.log(`✓ ${label}`); } catch (e) { errors.push(`${label}: ${e.message}`); console.log(`✗ ${label}: ${e.message}`); }
};
const waitSaved = async (page) => {
  await page.waitForTimeout(80);
  await page.waitForFunction(() => Store.pending() === 0 && !Store.saveError, null, { timeout: 15000 });
};
const wb = () => mock.workbookIn(shared.folder.id);
const rows = (t) => wb().rows(t).filter((r) => r.id || r.session_id);

let pid = null;
{
  const { ctx, page } = await device('tauleta 1');
  await step('primer cop: pantalla d\'inici de sessió', async () => {
    await page.goto(`${APP}#/inici`);
    await page.waitForSelector('.connect >> text=Inicia la sessió');
    await shot(page, 'm365-01-login');
  });
  await step('inici de sessió amb Microsoft (PKCE) i tornada a l\'app', async () => {
    await page.click('text=Inicia la sessió amb Microsoft');
    await page.waitForSelector('text=Tria la carpeta compartida');
    if (page.url() !== `${APP}#/inici`) throw new Error(`adreça després del login: ${page.url()}`);
    const tok = await page.evaluate(() => JSON.parse(localStorage.getItem('eonlife:m365:token')));
    if (tok.user.email !== 'laura@eonlife.test' || !tok.refresh) throw new Error(JSON.stringify(tok));
    await page.waitForSelector('text=laura@eonlife.test');
    await shot(page, 'm365-02-carpeta');
  });
  await step('enllaç incorrecte → missatge clar', async () => {
    await page.fill('#cx-folder', 'https://eonlife.sharepoint.com/:f:/s/centre/NOEXISTEIX');
    await page.click('text=Connecta la carpeta');
    await page.waitForSelector('.connect-note >> text=No s\'ha pogut obrir aquest enllaç');
  });
  await step('carpeta compartida → preparar la carpeta', async () => {
    await page.fill('#cx-folder', shared.url);
    await page.click('text=Connecta la carpeta');
    await page.waitForSelector('text=Prepara la carpeta «EON Life · Dades»');
    await shot(page, 'm365-03-preparar');
    await page.click('.connect-actions >> text=Prepara la carpeta');
    await page.waitForSelector('text=Encara no hi ha clients', { timeout: 15000 });
    await page.waitForSelector('.sidebar-mode >> text=Microsoft 365');
    if (!mock.child(shared.folder.id, 'EON Life · Base de dades.xlsx')) throw new Error('no hi ha Excel');
    if (!mock.child(shared.folder.id, 'EON Life · Clients')) throw new Error('no hi ha carpeta de clients');
    await shot(page, 'm365-04-inici');
  });
  await step('nou client → fila a l\'Excel i carpeta amb subcarpetes', async () => {
    await page.click('.page-actions >> text=Nou client');
    await page.fill('#np-first', 'Montse');
    await page.fill('#np-last', 'Riera');
    await page.click('.dialog-foot >> text=Crea el client');
    await page.waitForSelector('text=Dades personals');
    await page.waitForSelector('.phead-actions >> text=Carpeta', { timeout: 15000 });
    await waitSaved(page);
    const r = rows('tPacients');
    if (r.length !== 1 || r[0].Nom !== 'Montse') throw new Error(JSON.stringify(r).slice(0, 300));
    pid = r[0].id;
    if (!String(r[0]['Carpeta del client']).includes('sharepoint.com')) throw new Error('sense enllaç de carpeta');
    const clients = mock.child(shared.folder.id, 'EON Life · Clients');
    const folder = mock.childrenOf(clients.id)[0];
    if (!folder || folder.name !== `Riera, Montse · ${pid}`) throw new Error(`carpeta: ${folder && folder.name}`);
    if (mock.childrenOf(folder.id).length !== 3) throw new Error('falten subcarpetes');
  });
  await step('valoració: dinamometria i Y-Balance a l\'Excel', async () => {
    await page.click('.phead-actions >> text=Valoració inicial');
    await page.waitForSelector('#sec-mobilitat');
    await page.getByLabel('Leg extension · quàdriceps dreta').fill('410');
    await page.getByLabel('Leg extension · quàdriceps esquerra').fill('350,5');
    await page.getByLabel('Knee-to-wall dreta').fill('7');
    await page.waitForTimeout(1200);
    await waitSaved(page);
    const r = rows('tValoracions');
    if (r.length !== 1) throw new Error(`files: ${r.length}`);
    const key = Object.keys(r[0]).find((k) => /quàdriceps.* E \(N\)$/i.test(k) || (/Leg extension/i.test(k) && / E \(N\)$/.test(k)));
    if (!key || r[0][key] !== 350.5) throw new Error(`columna ${key} = ${key && r[0][key]}`);
    if (r[0].updated_by !== 'laura@eonlife.test') throw new Error(`updated_by ${r[0].updated_by}`);
  });
  await step('vídeo gravat a la tauleta → «02 · Vídeos» del client', async () => {
    await page.locator('button.mini[title^="Leg extension"]').first().click();
    await page.waitForSelector('text=Grava ara');
    await shot(page, 'm365-05-video');
    const capture = await page.getAttribute('input[data-kind="record"]', 'capture');
    if (capture !== 'environment') throw new Error(`capture=${capture}`);
    // «Grava ara» obre la càmera; en acabar, el vídeo es puja i queda enllaçat sense prémer res més.
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('text=Grava ara')]);
    await chooser.setFiles({ name: 'IMG_0042.MOV', mimeType: 'video/quicktime', buffer: Buffer.alloc(327680 * 16 + 5000, 1) });
    await page.waitForSelector('.dialog', { state: 'detached', timeout: 15000 });
    await page.waitForSelector('button.mini.on[title^="Leg extension"]');
    const clients = mock.child(shared.folder.id, 'EON Life · Clients');
    const folder = mock.childrenOf(clients.id)[0];
    const vids = mock.childrenOf(mock.child(folder.id, '02 · Vídeos').id);
    if (vids.length !== 1 || !/Montse Riera\.mov$/.test(vids[0].name)) throw new Error(`vídeos: ${vids.map((v) => v.name)}`);
    await waitSaved(page);
  });
  await step('informe de Kinvent (PDF) → «01 · Valoracions» i enllaç a l\'Excel', async () => {
    await page.evaluate(() => { document.getElementById('sec-fitxers').scrollIntoView(); });
    await shot(page, 'm365-06a-informes');
    const [chooser] = await Promise.all([page.waitForEvent('filechooser'), page.click('#sec-fitxers >> text=Adjunta l\'informe de Kinvent')]);
    await chooser.setFiles({ name: 'Informe_Kinvent.pdf', mimeType: 'application/pdf', buffer: Buffer.alloc(52000, 2) });
    await page.waitForSelector('#sec-fitxers .file-name', { timeout: 15000 });
    await shot(page, 'm365-06b-informe-adjunt');
    await page.waitForTimeout(1100);
    await waitSaved(page);
    const clients = mock.child(shared.folder.id, 'EON Life · Clients');
    const folder = mock.childrenOf(clients.id)[0];
    const docs = mock.childrenOf(mock.child(folder.id, '01 · Valoracions').id).map((x) => x.name);
    if (docs.length !== 1 || !/Informe Kinvent · Montse Riera\.pdf$/.test(docs[0])) throw new Error(`fitxers: ${docs}`);
    const r = rows('tValoracions');
    if (!String(r[0]['Informes adjunts']).includes('Informe Kinvent')) throw new Error(`columna: ${r[0]['Informes adjunts']}`);
    // Botó directe a la targeta de la dinamometria (Kinvent K-Push).
    await page.waitForSelector('#grp-dyn >> text=Adjunta el PDF');
  });
  await step('informe amb vídeos (miniatura, reproducció i QR) i informe només de força', async () => {
    await page.click('.editbar >> text=Informe');
    await page.waitForSelector('.rvideos .rvid-thumb img', { timeout: 15000 });
    if (!(await page.locator('.rvideos svg.qr path').count())) throw new Error('sense codi QR');
    await shot(page, 'm365-07-informe-videos');
    await page.click('.rvid-thumb');
    const src = await page.getAttribute('.rvideos video', 'src');
    if (!/download\.mock\.test/.test(src || '')) throw new Error(`vídeo: ${src}`);
    await page.selectOption('.presentbar select', 'forca');
    await page.waitForSelector('.report-cover >> text=Informe · Força');
    if (!/#\/informe\/[^/]+\/forca$/.test(page.url())) throw new Error(`adreça: ${page.url()}`);
    if (!(await page.locator('.rvideos').count())) throw new Error('el vídeo de força no surt a l\'informe de força');
    await page.selectOption('.presentbar select', 'mobilitat');
    await page.waitForSelector('.report-cover >> text=Informe · Mobilitat');
    if (await page.locator('.rvideos').count()) throw new Error('a mobilitat no hi ha vídeos');
    await page.click('.presentbar >> text=Torna');
    await page.waitForSelector('#sec-forca >> text=Informe de força');
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
    const s = rows('tSessions');
    if (s.length !== 1 || s[0]['Càrrega (UA)'] !== 420) throw new Error(JSON.stringify(s[0] || {}).slice(0, 200));
    const log = rows('tRegistre_exercicis');
    if (log.length < 10 || log.some((r) => r.session_id !== s[0].id)) throw new Error(`registre: ${log.length}`);
  });
  await step('sessió: encoder ADR i vídeo del client → Registre_exercicis i «02 · Vídeos»', async () => {
    const item = page.locator('section.block.blk-for .item').first();
    await item.locator('.vbt-btn').click();
    const ins = item.locator('.vbt-table tbody tr').first().locator('input');
    await ins.nth(0).fill('80');
    await ins.nth(1).fill('5');
    await ins.nth(2).fill('0,80');
    await ins.nth(3).fill('0,60');
    await item.locator('.vbt-sum >> text=PV 25 %').waitFor();
    const [chooser] = await Promise.all([
      page.waitForEvent('filechooser'),
      (async () => { await item.locator('button.mini[title*="afegir enllaç"]').first().click(); await page.click('text=Grava ara'); })(),
    ]);
    await chooser.setFiles({ name: 'VID_0007.mp4', mimeType: 'video/mp4', buffer: Buffer.alloc(400000, 3) });
    await page.waitForSelector('.dialog', { state: 'detached', timeout: 15000 });
    await item.locator('button.mini.on[title*="obrir o canviar"]').waitFor();
    await page.waitForTimeout(1300);
    await waitSaved(page);
    const clients = mock.child(shared.folder.id, 'EON Life · Clients');
    const folder = mock.childrenOf(clients.id)[0];
    const vids = mock.childrenOf(mock.child(folder.id, '02 · Vídeos').id).map((v) => v.name);
    if (vids.length !== 2 || !vids.some((v) => /\.mp4$/.test(v))) throw new Error(`vídeos: ${vids}`);
    const log = rows('tRegistre_exercicis');
    const r = log.find((x) => x['Encoder · pèrdua de velocitat (%)'] !== '' && x['Encoder · pèrdua de velocitat (%)'] != null);
    if (!r || r['Encoder · pèrdua de velocitat (%)'] !== 25 || r['Encoder · V 1a rep millor (m/s)'] !== 0.8) throw new Error(`registre: ${JSON.stringify(r || {}).slice(0, 300)}`);
    await shot(page, 'm365-08-sessio-encoder');
  });
  await step('configuració: on són les dades', async () => {
    await page.evaluate(() => { location.hash = '#/configuracio'; });
    await page.waitForSelector('text=Microsoft 365 · carpeta del centre');
    await page.waitForSelector('a:has-text("Obre l\'Excel")');
    await shot(page, 'm365-06-configuracio');
  });
  await step('en recarregar, les dades venen de l\'Excel (sense tornar a entrar)', async () => {
    const before = auth.authorizeHits;
    await page.reload();
    await page.evaluate(() => { location.hash = '#/inici'; });
    await page.waitForSelector('text=Montse Riera', { timeout: 15000 });
    if (auth.authorizeHits !== before) throw new Error('ha tornat a demanar l\'inici de sessió');
  });
  await step('sense connexió: el canvi es guarda a la tauleta i s\'envia en tornar', async () => {
    await page.evaluate((id) => { location.hash = `#/client/${id}/fitxa`; }, pid);
    await page.waitForSelector('text=Dades personals');
    net.offline = true;
    await page.fill('#pf-goal', 'Tornar a córrer la cursa de la Mercè');
    await page.waitForSelector('.card-head >> text=Sense connexió · es desarà en tornar', { timeout: 20000 });
    await shot(page, 'm365-07-sense-connexio');
    await page.reload();
    await page.waitForSelector('text=No s\'han pogut carregar les dades', { timeout: 20000 });
    net.offline = false;
    await page.click('text=Torna-ho a provar');
    await page.waitForSelector('.page', { timeout: 15000 });
    await waitSaved(page);
    const r = rows('tPacients');
    if (r[0].Objectiu !== 'Tornar a córrer la cursa de la Mercè') throw new Error(`objectiu a l'Excel: ${r[0].Objectiu}`);
    const left = await page.evaluate(() => Object.keys(JSON.parse(localStorage.getItem('eonlife:m365:outbox') || '{}')).length);
    if (left) throw new Error(`queden ${left} canvis pendents`);
  });
  await step('sessió caducada: es torna a entrar sense perdre el canvi', async () => {
    await page.evaluate((id) => { location.hash = `#/client/${id}/fitxa`; }, pid);
    await page.waitForSelector('text=Dades personals');
    auth.refreshFails = true;
    await page.evaluate(() => { const t = JSON.parse(localStorage.getItem('eonlife:m365:token')); t.exp = 0; localStorage.setItem('eonlife:m365:token', JSON.stringify(t)); });
    await page.fill('#pf-goal', 'Córrer 10 km sense dolor');
    await page.waitForSelector('.card-head >> text=Sessió caducada · torna a entrar', { timeout: 20000 });
    await shot(page, 'm365-08-sessio-caducada');
    auth.refreshFails = false;
    await page.click('.card-head >> text=Sessió caducada · torna a entrar');
    try {
      await page.waitForSelector('text=Dades personals', { timeout: 15000 });
    } catch (e) {
      throw new Error(`${e.message.split('\n')[0]}\nURL ${page.url()}\n${(await page.evaluate(() => document.querySelector(".main") ? document.querySelector(".main").innerText : document.body.innerText)).slice(0, 700)}\nauth ${JSON.stringify(auth)}`);
    }
    await waitSaved(page);
    const r = rows('tPacients');
    if (r[0].Objectiu !== 'Córrer 10 km sense dolor') throw new Error(`objectiu a l'Excel: ${r[0].Objectiu}`);
  });
  await ctx.close();
}
{
  const { ctx, page } = await device('tauleta 2', { user: 'tok-pau', viewport: { width: 820, height: 1180 } });
  await step('segona tauleta: entra, connecta la carpeta i veu les mateixes dades', async () => {
    await page.goto(APP);
    await page.click('text=Inicia la sessió amb Microsoft');
    await page.fill('#cx-folder', shared.url);
    await page.click('text=Connecta la carpeta');
    try {
      await page.waitForSelector('text=Montse Riera', { timeout: 15000 });
    } catch (e) {
      throw new Error(`${e.message.split('\n')[0]}\n${(await page.evaluate(() => document.body.innerText)).slice(0, 400)}`);
    }
    if (mock.childrenOf(shared.folder.id).length !== 2) throw new Error('ha creat una segona base de dades');
    await page.evaluate((id) => { location.hash = `#/client/${id}/sessions`; }, pid);
    await page.waitForSelector('.srow');
    await shot(page, 'm365-09-tauleta2');
  });
  await step('canvis de la segona tauleta a l\'Excel amb el seu nom', async () => {
    await page.evaluate((id) => { location.hash = `#/client/${id}/fitxa`; }, pid);
    await page.fill('#pf-goal', 'Objectiu revisat per en Pau');
    await page.waitForTimeout(1100);
    await waitSaved(page);
    const r = rows('tPacients');
    if (r.length !== 1 || r[0].updated_by !== 'pau@eonlife.test') throw new Error(JSON.stringify(r).slice(0, 200));
  });
  await step('versió nova publicada: avís «Actualitza» i recàrrega sense perdre la sessió', async () => {
    const before = served.build;
    served.build = '2099-01-01 00:00';
    await page.evaluate(() => AppUpdate.check(true));
    await page.waitForSelector('.updbar >> text=Hi ha una versió nova');
    await shot(page, 'm365-10-actualitza');
    await page.click('.updbar >> text=Actualitza');
    await page.waitForURL(/\?v=2099/);
    // El servidor encara dona la pàgina d'abans: no torna a recarregar i ho diu.
    await page.waitForSelector('text=encara s\'està publicant');
    await page.waitForSelector('.sidebar-mode >> text=Microsoft 365');
    served.build = before;
  });
  await step('mòbil/tauleta vertical: pantalla de connexió sense desbordar', async () => {
    const over = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (over > 1) throw new Error(`desbordament de ${over}px`);
  });
  await ctx.close();
}

await browser.close();
server.close();
if (errors.length) {
  console.log(`\n${errors.length} errors:`);
  for (const e of errors) console.log(` - ${e}`);
  process.exit(1);
}
console.log('\nConnexió amb Microsoft 365: tot correcte.');
