/* EON Life · servidor intermediari de NOE (Cloudflare Worker).
   Guarda la clau de l'API d'Anthropic perquè no hagi d'estar a cap tauleta. Les tauletes parlen amb aquest servidor i ell
   parla amb Anthropic. Només deixa passar peticions de l'app (ORIGIN), amb un codi d'accés del centre o amb el compte de
   Microsoft del centre (Entra), només amb els models permesos i amb un màxim de longitud.

   Variables (Settings › Variables and Secrets del Worker):
     ANTHROPIC_API_KEY   (secret)   la clau de l'API (sk-ant-…)
     ALLOWED_ORIGINS                adreces de l'app, separades per comes: https://asoldevilab.github.io
     ACCESS_CODES        (secret)   codis d'accés vàlids, separats per comes (cada tauleta o persona en pot tenir un i es poden canviar)
     ENTRA_TENANT_ID     (opcional) id. del directori de Microsoft: accepta el token d'inici de sessió del centre
     ENTRA_CLIENT_ID     (opcional) id. de l'aplicació d'Entra de l'app (el mateix de m365.config.json)
     ALLOWED_EMAILS      (opcional) correus (o dominis, p. ex. @eonlife.cat) que poden fer servir NOE; buit = tothom del directori
     ALLOWED_MODELS      (opcional) models permesos, separats per comes (per defecte: sonnet, opus i haiku 5.5, fable 5.1)
     MAX_TOKENS_CAP      (opcional) màxim de max_tokens (per defecte 64000)
     MAX_BODY_KB         (opcional) mida màxima de la petició en KB (per defecte 4096)
   Cal almenys ACCESS_CODES o ENTRA_TENANT_ID + ENTRA_CLIENT_ID: sense cap dels dos, el servidor no deixa passar res. */

const DEFAULT_MODELS = ['claude-sonnet-5-5', 'claude-opus-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'];
const UPSTREAM = 'https://api.anthropic.com/v1/messages';
let jwks = { at: 0, keys: [], tenant: '' };

const list = (v) => String(v || '').split(',').map((s) => s.trim()).filter(Boolean);
const json = (status, type, message, headers = {}) => new Response(JSON.stringify({ type: 'error', error: { type, message } }), { status, headers: { 'content-type': 'application/json', ...headers } });

// Comparació en temps constant (per no donar pistes sobre els codis).
function same(a, b) {
  const x = new TextEncoder().encode(String(a)), y = new TextEncoder().encode(String(b));
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

const b64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (s.length % 4)) % 4)), (c) => c.charCodeAt(0));
const part = (s) => JSON.parse(new TextDecoder().decode(b64(s)));

// Token d'identitat de Microsoft Entra: signatura (RS256), emissor, aplicació i caducitat.
async function verifyEntra(token, env, now = Date.now()) {
  try {
    const [h, p, s] = String(token).split('.');
    if (!h || !p || !s) return null;
    const head = part(h), claims = part(p);
    if (head.alg !== 'RS256') return null;
    const tenant = env.ENTRA_TENANT_ID, client = env.ENTRA_CLIENT_ID;
    if (!tenant || !client) return null;
    if (claims.iss !== `https://login.microsoftonline.com/${tenant}/v2.0` || claims.aud !== client || claims.tid !== tenant) return null;
    if (!(claims.exp * 1000 > now) || (claims.nbf && claims.nbf * 1000 > now + 60000)) return null;
    if (jwks.tenant !== tenant || now - jwks.at > 3600000 || !jwks.keys.some((k) => k.kid === head.kid)) {
      const res = await fetch(`https://login.microsoftonline.com/${tenant}/discovery/v2.0/keys`);
      if (!res.ok) return null;
      jwks = { at: now, keys: (await res.json()).keys || [], tenant };
    }
    const jwk = jwks.keys.find((k) => k.kid === head.kid);
    if (!jwk) return null;
    const key = await crypto.subtle.importKey('jwk', { kty: jwk.kty, n: jwk.n, e: jwk.e, alg: 'RS256', ext: true }, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const ok = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, b64(s), new TextEncoder().encode(`${h}.${p}`));
    return ok ? claims : null;
  } catch (e) {
    return null;
  }
}

// Qui és? { who } si està autoritzat; { status, message } si no.
async function authorize(request, env) {
  const codes = list(env.ACCESS_CODES);
  const code = request.headers.get('x-eon-code');
  if (code && codes.some((c) => same(c, code))) return { who: 'codi' };
  const bearer = (request.headers.get('authorization') || '').replace(/^Bearer\s+/i, '');
  if (bearer && env.ENTRA_TENANT_ID && env.ENTRA_CLIENT_ID) {
    const claims = await verifyEntra(bearer, env);
    if (claims) {
      const email = String(claims.preferred_username || claims.email || claims.upn || '').toLowerCase();
      const allowed = list(env.ALLOWED_EMAILS).map((x) => x.toLowerCase());
      if (allowed.length && !allowed.some((a) => (a.startsWith('@') ? email.endsWith(a) : email === a))) return { status: 403, message: 'Aquest compte no té permís per fer servir NOE.' };
      return { who: email || 'entra' };
    }
  }
  return { status: 401, message: 'Falta el codi d\'accés del centre o l\'inici de sessió de Microsoft.' };
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('origin') || '';
    const origins = list(env.ALLOWED_ORIGINS);
    const okOrigin = origins.includes(origin);
    const cors = {
      'access-control-allow-origin': okOrigin ? origin : origins[0] || '',
      'access-control-allow-headers': 'content-type, anthropic-version, anthropic-beta, authorization, x-eon-code',
      'access-control-allow-methods': 'POST, OPTIONS', 'access-control-max-age': '86400', vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return okOrigin ? new Response(null, { status: 204, headers: cors }) : json(403, 'eon_origin', 'Origen no permès.', cors);
    if (request.method !== 'POST') return json(405, 'eon_method', 'Només s\'accepta POST.', cors);
    if (origin && !okOrigin) return json(403, 'eon_origin', 'Origen no permès.', cors);
    if (!env.ANTHROPIC_API_KEY) return json(500, 'eon_config', 'Falta la clau de l\'API al servidor (ANTHROPIC_API_KEY).', cors);
    const auth = await authorize(request, env);
    if (!auth.who) return json(auth.status, auth.status === 401 ? 'eon_auth' : 'eon_forbidden', auth.message, cors);

    // Petició: mida, JSON, model permès i longitud màxima.
    const maxBytes = (Number(env.MAX_BODY_KB) || 4096) * 1024;
    if (Number(request.headers.get('content-length') || 0) > maxBytes) return json(413, 'eon_size', 'La petició és massa gran.', cors);
    const raw = await request.text();
    if (raw.length > maxBytes) return json(413, 'eon_size', 'La petició és massa gran.', cors);
    let body;
    try { body = JSON.parse(raw); } catch (e) { return json(400, 'eon_body', 'La petició no és JSON.', cors); }
    const models = list(env.ALLOWED_MODELS).length ? list(env.ALLOWED_MODELS) : DEFAULT_MODELS;
    if (!body || typeof body !== 'object' || !models.includes(body.model)) return json(400, 'eon_policy', `Model no permès. Permesos: ${models.join(', ')}.`, cors);
    const cap = Number(env.MAX_TOKENS_CAP) || 64000;
    if (!(body.max_tokens > 0) || body.max_tokens > cap) body.max_tokens = Math.min(Number(body.max_tokens) || cap, cap);

    const headers = { 'content-type': 'application/json', 'anthropic-version': request.headers.get('anthropic-version') || '2023-06-01', 'x-api-key': env.ANTHROPIC_API_KEY };
    const beta = request.headers.get('anthropic-beta');
    if (beta) headers['anthropic-beta'] = beta;
    const up = await fetch(UPSTREAM, { method: 'POST', headers, body: JSON.stringify(body) });
    // Només s'escriu qui, el model i el resultat (mai el contingut: són dades de salut).
    console.log(JSON.stringify({ who: auth.who, model: body.model, status: up.status }));
    return new Response(up.body, { status: up.status, headers: { ...cors, 'content-type': up.headers.get('content-type') || 'application/json', 'cache-control': 'no-store' } });
  },
};

export { verifyEntra, authorize };
