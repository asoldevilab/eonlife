// Servidor intermediari de NOE (docs/noe-proxy/worker.js): autenticació, origen, model permès i reenviament a Anthropic.
//   node --test app/test/noe-proxy.test.mjs
import test from 'node:test';
import assert from 'node:assert/strict';
import worker, { verifyEntra } from '../../docs/noe-proxy/worker.js';

const TENANT = 'tenant-eon-1234', CLIENT = 'client-eon-5678';
const ENV = { ANTHROPIC_API_KEY: 'sk-ant-secret', ALLOWED_ORIGINS: 'https://asoldevilab.github.io', ACCESS_CODES: 'codi-tauleta-1,codi-tauleta-2', ENTRA_TENANT_ID: TENANT, ENTRA_CLIENT_ID: CLIENT };
const ORIGIN = 'https://asoldevilab.github.io';

const b64u = (buf) => Buffer.from(buf).toString('base64url');
const { publicKey, privateKey } = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
const pubJwk = { ...(await crypto.subtle.exportKey('jwk', publicKey)), kid: 'k1', use: 'sig' };
async function jwt(claims, { kid = 'k1', key = privateKey } = {}) {
  const h = b64u(JSON.stringify({ alg: 'RS256', kid, typ: 'JWT' })), p = b64u(JSON.stringify(claims));
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(`${h}.${p}`));
  return `${h}.${p}.${b64u(sig)}`;
}
const goodClaims = (extra = {}) => ({ iss: `https://login.microsoftonline.com/${TENANT}/v2.0`, aud: CLIENT, tid: TENANT, exp: Math.floor(Date.now() / 1000) + 3600, preferred_username: 'arnau@eonlife.cat', ...extra });

// Xarxa simulada: les claus públiques de Microsoft i la resposta d'Anthropic.
const calls = [];
globalThis.fetch = async (url, init = {}) => {
  calls.push({ url: String(url), init });
  if (String(url).includes('/discovery/v2.0/keys')) return new Response(JSON.stringify({ keys: [pubJwk] }), { status: 200, headers: { 'content-type': 'application/json' } });
  if (String(url) === 'https://api.anthropic.com/v1/messages') {
    const body = JSON.parse(init.body);
    if (body.messages && body.messages[0] && body.messages[0].content === 'error') return new Response(JSON.stringify({ type: 'error', error: { type: 'rate_limit_error', message: 'massa' } }), { status: 429, headers: { 'content-type': 'application/json' } });
    return new Response('event: message_start\ndata: {"type":"message_start"}\n\n', { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }
  throw new Error(`xarxa no esperada: ${url}`);
};

const post = (body, headers = {}, env = ENV) => worker.fetch(new Request('https://noe.eonlife.test/v1/messages', { method: 'POST', headers: { 'content-type': 'application/json', origin: ORIGIN, ...headers }, body: typeof body === 'string' ? body : JSON.stringify(body) }), env);
const ok = { model: 'claude-sonnet-5-5', max_tokens: 4000, stream: true, messages: [{ role: 'user', content: 'hola' }] };

test('proxy: el preflight CORS només és per a l\'origen de l\'app', async () => {
  const good = await worker.fetch(new Request('https://noe.eonlife.test/', { method: 'OPTIONS', headers: { origin: ORIGIN } }), ENV);
  assert.equal(good.status, 204);
  assert.equal(good.headers.get('access-control-allow-origin'), ORIGIN);
  assert.match(good.headers.get('access-control-allow-headers'), /x-eon-code/);
  assert.match(good.headers.get('access-control-allow-headers'), /authorization/);
  const bad = await worker.fetch(new Request('https://noe.eonlife.test/', { method: 'OPTIONS', headers: { origin: 'https://dolent.test' } }), ENV);
  assert.equal(bad.status, 403);
});

test('proxy: sense codi ni inici de sessió no passa res, i la clau no surt mai', async () => {
  calls.length = 0;
  const r = await post(ok);
  assert.equal(r.status, 401);
  const j = await r.json();
  assert.equal(j.error.type, 'eon_auth');
  assert.ok(!JSON.stringify(j).includes('sk-ant'));
  assert.equal(calls.length, 0, 'ni s\'ha cridat Anthropic');
  assert.equal((await post(ok, { 'x-eon-code': 'incorrecte' })).status, 401);
  assert.equal((await post(ok, { 'x-eon-code': 'codi-tauleta-1' }, { ...ENV, ACCESS_CODES: '', ENTRA_TENANT_ID: '' })).status, 401, 'sense codis ni Entra configurats, res no passa');
  assert.equal((await post(ok, { origin: 'https://dolent.test', 'x-eon-code': 'codi-tauleta-1' })).status, 403, 'origen no permès');
  assert.equal((await worker.fetch(new Request('https://noe.eonlife.test/', { method: 'GET' }), ENV)).status, 405);
});

test('proxy: amb un codi d\'accés vàlid reenvia a Anthropic amb la clau del servidor i torna el flux', async () => {
  calls.length = 0;
  const r = await post(ok, { 'x-eon-code': 'codi-tauleta-2', 'anthropic-beta': 'algun-beta' });
  assert.equal(r.status, 200);
  assert.equal(r.headers.get('content-type'), 'text/event-stream');
  assert.equal(r.headers.get('access-control-allow-origin'), ORIGIN);
  assert.equal(r.headers.get('cache-control'), 'no-store');
  assert.match(await r.text(), /message_start/);
  const up = calls.find((c) => c.url === 'https://api.anthropic.com/v1/messages');
  assert.equal(up.init.headers['x-api-key'], 'sk-ant-secret');
  assert.equal(up.init.headers['anthropic-version'], '2023-06-01');
  assert.equal(up.init.headers['anthropic-beta'], 'algun-beta');
  assert.ok(!('x-eon-code' in up.init.headers) && !('authorization' in up.init.headers), 'les credencials de la tauleta no arriben a Anthropic');
  assert.equal(JSON.parse(up.init.body).model, 'claude-sonnet-5-5');
  // Un error d'Anthropic (límit) passa tal qual perquè l'app el pugui explicar
  const e = await post({ ...ok, messages: [{ role: 'user', content: 'error' }] }, { 'x-eon-code': 'codi-tauleta-1' });
  assert.equal(e.status, 429);
});

test('proxy: només models permesos i un màxim de longitud; mida limitada', async () => {
  const h = { 'x-eon-code': 'codi-tauleta-1' };
  const m = await post({ ...ok, model: 'claude-qualsevol-car' }, h);
  assert.equal(m.status, 400);
  assert.match((await m.json()).error.message, /Model no permès/);
  calls.length = 0;
  await post({ ...ok, max_tokens: 500000 }, h);
  assert.equal(JSON.parse(calls.find((c) => c.url.includes('anthropic.com')).init.body).max_tokens, 64000, 'es limita a MAX_TOKENS_CAP');
  await post({ ...ok, max_tokens: 500000 }, h, { ...ENV, MAX_TOKENS_CAP: '20000' });
  assert.equal(JSON.parse(calls[calls.length - 1].init.body).max_tokens, 20000);
  assert.equal((await post('això no és json', h)).status, 400);
  assert.equal((await post({ ...ok, messages: [{ role: 'user', content: 'x'.repeat(3000) }] }, h, { ...ENV, MAX_BODY_KB: '1' })).status, 413);
  assert.equal((await post({ ...ok, model: 'claude-haiku-5-5' }, h, { ...ENV, ALLOWED_MODELS: 'claude-haiku-5-5' })).status, 200);
  assert.equal((await post(ok, h, { ...ENV, ALLOWED_MODELS: 'claude-haiku-5-5' })).status, 400);
});

test('proxy: el token d\'inici de sessió de Microsoft del centre (signatura, emissor, aplicació, caducitat i correu)', async () => {
  const good = await jwt(goodClaims());
  const claims = await verifyEntra(good, ENV);
  assert.equal(claims.preferred_username, 'arnau@eonlife.cat');
  assert.equal((await post(ok, { authorization: `Bearer ${good}` })).status, 200);
  // Caducat, d'una altra app, d'un altre directori, signat amb una altra clau o amb una clau desconeguda: no
  assert.equal(await verifyEntra(await jwt(goodClaims({ exp: Math.floor(Date.now() / 1000) - 10 })), ENV), null);
  assert.equal(await verifyEntra(await jwt(goodClaims({ aud: 'altra-app' })), ENV), null);
  assert.equal(await verifyEntra(await jwt(goodClaims({ iss: 'https://login.microsoftonline.com/un-altre/v2.0', tid: 'un-altre' })), ENV), null);
  const other = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  assert.equal(await verifyEntra(await jwt(goodClaims(), { key: other.privateKey }), ENV), null, 'signatura falsa');
  assert.equal(await verifyEntra(await jwt(goodClaims(), { kid: 'desconeguda' }), ENV), null);
  assert.equal(await verifyEntra('no.es.untoken', ENV), null);
  assert.equal((await post(ok, { authorization: 'Bearer abc.def.ghi' })).status, 401);
  // Llista de comptes permesos (correu o domini)
  const restricted = { ...ENV, ALLOWED_EMAILS: '@eonlife.cat, ricardo@altre.cat' };
  assert.equal((await post(ok, { authorization: `Bearer ${good}` }, restricted)).status, 200);
  const outsider = await jwt(goodClaims({ preferred_username: 'intrus@gmail.com' }));
  assert.equal((await post(ok, { authorization: `Bearer ${outsider}` }, restricted)).status, 403);
  assert.equal((await post(ok, { authorization: `Bearer ${await jwt(goodClaims({ preferred_username: 'ricardo@altre.cat' }))}` }, restricted)).status, 200);
});
