/* EON Life · Microsoft 365.
   Quan l'app es publica per al centre (web amb window.EON_M365), cada professional entra amb el seu compte
   de Microsoft i les dades es desen a la carpeta compartida de OneDrive/SharePoint:
   · «EON Life · Base de dades.xlsx» → la base de dades: un full per tipus de dada (Pacients, Valoracions,
     Sessions…), una fila per registre i una columna per test. Columna oculta data_json = registre complet.
   · «EON Life · Clients» → una carpeta per client («Cognoms, Nom · P-xxxx») amb Valoracions (i Vídeos valoracions)
     i Sessions (i Vídeos sessions d'entrenament): vegeu 09-names.js.
   Mateixa estructura que la versió de Google (apps-script/Code.gs). */

const M365_KEYS = {
  config: 'eonlife:m365:config',
  token: 'eonlife:m365:token',
  pkce: 'eonlife:m365:pkce',
  outbox: 'eonlife:m365:outbox',
};

// Les subcarpetes de cada client són a EXPORT_FOLDERS (09-names.js): Valoracions, Vídeos valoracions, Sessions i
// Vídeos sessions d'entrenament.
const M365_NAMES = {
  workbook: 'EON Life · Base de dades.xlsx',
  clients: 'EON Life · Clients',
};

const XL = {
  sheets: { patients: 'Pacients', assessments: 'Valoracions', sessions: 'Sessions', exercises: 'Biblioteca', templates: 'Plantilles', settings: 'Configuracio' },
  log: 'Registre_exercicis',
  base: ['id', 'patient_id', 'updated_at', 'updated_by', 'deleted', 'data_json'],
  logBase: ['session_id', 'patient_id'],
  extraChunks: 9, // data_json_2 … data_json_10 ja creades a la plantilla (un pla d'entrenament llarg ocupa ~150.000 caràcters)
  cellLimit: 30000, // Excel admet 32.767 caràcters per cel·la
  table: (sheet) => `t${sheet}`,
};

class M365Error extends Error {
  constructor(message, code, status) { super(message); this.code = code || ''; this.status = status || 0; }
}

const store_ = (area) => ({
  get(k) { try { const v = window[area].getItem(k); return v ? JSON.parse(v) : null; } catch (e) { return null; } },
  set(k, v) { try { window[area].setItem(k, JSON.stringify(v)); return true; } catch (e) { return false; } },
  del(k) { try { window[area].removeItem(k); } catch (e) { /* res */ } },
});
const M365Local = store_('localStorage');

// ── Configuració ──
const M365 = {
  // La versió publicada per al centre porta window.EON_M365 = { clientId, tenantId, folderUrl }.
  available() { return !!window.EON_M365 || !!(M365Local.get(M365_KEYS.config) || {}).enabled; },
  config() {
    const baked = window.EON_M365 || {};
    const saved = M365Local.get(M365_KEYS.config) || {};
    const pick = (k) => (baked[k] && String(baked[k]).trim()) || saved[k] || '';
    return {
      clientId: pick('clientId'), tenantId: pick('tenantId'), folderUrl: pick('folderUrl'),
      baked: { clientId: !!baked.clientId, tenantId: !!baked.tenantId, folderUrl: !!baked.folderUrl },
      driveId: saved.driveId || '', folderId: saved.folderId || '', folderName: saved.folderName || '', folderWebUrl: saved.folderWebUrl || '',
      resolvedFrom: saved.resolvedFrom || '',
    };
  },
  save(patch) {
    const cur = M365Local.get(M365_KEYS.config) || {};
    M365Local.set(M365_KEYS.config, { ...cur, ...patch });
  },
  forgetFolder() { this.save({ driveId: '', folderId: '', folderName: '', folderWebUrl: '', resolvedFrom: '', folderUrl: '' }); },
};

// ── Inici de sessió (OAuth 2.0 amb PKCE, sense biblioteques) ──
const b64url = (bytes) => btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const randomB64 = (n) => { const a = new Uint8Array(n); crypto.getRandomValues(a); return b64url(a); };

const MsAuth = {
  scopes: 'openid profile offline_access User.Read Files.ReadWrite.All',
  fetch: (...a) => fetch(...a),
  authority(cfg) { return `https://login.microsoftonline.com/${encodeURIComponent(cfg.tenantId || 'organizations')}/oauth2/v2.0`; },
  // Sempre la mateixa adreça (amb o sense «index.html»): és la que es registra a Entra.
  redirectUri() { return window.location.origin + window.location.pathname.replace(/index\.html?$/i, ''); },
  tokens() { return M365Local.get(M365_KEYS.token); },
  user() { const t = this.tokens(); return (t && t.user) || null; },
  clear() { M365Local.del(M365_KEYS.token); },
  expire() { const t = this.tokens(); if (t) M365Local.set(M365_KEYS.token, { ...t, exp: 0 }); },

  async begin(cfg, { prompt, loginHint } = {}) {
    const verifier = randomB64(48);
    const state = randomB64(16);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(verifier)));
    // A localStorage (i no a sessionStorage): l'app instal·lada a la tauleta pot tornar de Microsoft en una altra finestra.
    M365Local.set(M365_KEYS.pkce, { state, verifier, hash: window.location.hash || '', at: Date.now() });
    const q = new URLSearchParams({
      client_id: cfg.clientId, response_type: 'code', redirect_uri: this.redirectUri(), response_mode: 'query',
      scope: this.scopes, state, code_challenge: b64url(digest), code_challenge_method: 'S256',
    });
    if (prompt) q.set('prompt', prompt);
    if (loginHint) q.set('login_hint', loginHint);
    window.location.assign(`${this.authority(cfg)}/authorize?${q}`);
  },

  // En tornar de Microsoft (?code=…&state=…): canvia el codi per les claus d'accés i neteja l'adreça.
  async complete(cfg) {
    const q = new URLSearchParams(window.location.search);
    if (!q.has('code') && !q.has('error')) return false;
    const saved = M365Local.get(M365_KEYS.pkce);
    M365Local.del(M365_KEYS.pkce);
    const pending = saved && Date.now() - (saved.at || 0) < 15 * 60 * 1000 ? saved : null;
    window.history.replaceState(null, '', window.location.pathname + ((pending && pending.hash) || ''));
    // Torna a la pantalla on s'era abans d'anar a Microsoft (replaceState no avisa el navegador de l'app).
    if (typeof Router !== 'undefined' && Router.current) {
      Router.current = Router.parse(window.location.hash);
      Router.emit(false);
    }
    if (q.has('error')) throw new M365Error(describeAuthError(q.get('error'), q.get('error_description')), 'login');
    if (!pending || pending.state !== q.get('state')) throw new M365Error('La resposta de l\'inici de sessió no és vàlida o ha caducat. Torna-ho a provar.', 'login');
    await this.tokenRequest(cfg, { grant_type: 'authorization_code', code: q.get('code'), redirect_uri: this.redirectUri(), code_verifier: pending.verifier });
    return true;
  },

  async tokenRequest(cfg, params) {
    let res, data;
    try {
      res = await this.fetch(`${this.authority(cfg)}/token`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: new URLSearchParams({ client_id: cfg.clientId, scope: this.scopes, ...params }).toString(),
      });
      data = await res.json().catch(() => ({}));
    } catch (e) {
      throw new M365Error('No hi ha connexió amb Microsoft. Comprova la connexió a internet.', 'network');
    }
    if (!res.ok || !data.access_token) throw new M365Error(describeAuthError(data.error, data.error_description), 'login');
    const old = this.tokens() || {};
    const t = {
      access: data.access_token,
      refresh: data.refresh_token || old.refresh || '',
      exp: Date.now() + (Number(data.expires_in) || 3600) * 1000,
      user: parseIdToken(data.id_token) || old.user || null,
    };
    M365Local.set(M365_KEYS.token, t);
    return t;
  },

  async accessToken(cfg) {
    const t = this.tokens();
    if (t && t.access && t.exp - 120000 > Date.now()) return t.access;
    if (t && t.refresh) {
      try {
        return (await this.tokenRequest(cfg, { grant_type: 'refresh_token', refresh_token: t.refresh })).access;
      } catch (e) {
        if (e.code === 'network') throw e;
        this.clear();
      }
    }
    throw new M365Error('Cal iniciar la sessió amb el compte de Microsoft del centre.', 'login');
  },

  logout(cfg) {
    this.clear();
    window.location.assign(`${this.authority(cfg)}/logout?post_logout_redirect_uri=${encodeURIComponent(this.redirectUri())}`);
  },
};

function parseIdToken(jwt) {
  try {
    const part = jwt.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
    const json = decodeURIComponent(escape(atob(part + '='.repeat((4 - (part.length % 4)) % 4))));
    const c = JSON.parse(json);
    return { name: c.name || '', email: c.preferred_username || c.email || c.upn || '' };
  } catch (e) {
    return null;
  }
}

// Errors de Microsoft Entra més habituals, explicats.
function describeAuthError(code, desc) {
  const d = String(desc || '');
  const has = (x) => d.includes(x);
  if (has('AADSTS50011')) return 'L\'adreça d\'aquesta app no està registrada a Microsoft Entra. Cal afegir-la com a «URI de redirecció» de tipus «Aplicació d\'una sola pàgina (SPA)».';
  if (has('AADSTS9002326') || has('AADSTS9002327')) return 'L\'app està registrada com a «Web» i ha de ser «Aplicació d\'una sola pàgina (SPA)». Canvia-ho a Microsoft Entra › Autenticació.';
  if (has('AADSTS65001') || has('AADSTS90094') || has('AADSTS90008')) return 'Cal que l\'administrador de Microsoft 365 aprovi els permisos de l\'app («Concedeix el consentiment de l\'administrador»).';
  if (has('AADSTS700016')) return 'L\'identificador de l\'aplicació no existeix en aquest directori. Revisa l\'Id. de l\'aplicació i l\'Id. del directori.';
  if (has('AADSTS90002') || has('AADSTS90023')) return 'L\'identificador del directori (inquilí) no és correcte.';
  if (has('AADSTS50105')) return 'El teu compte no té accés a aquesta app. Demana a l\'administrador que te l\'assigni.';
  if (has('AADSTS70000') || has('AADSTS54005') || has('AADSTS70008')) return 'L\'inici de sessió ha caducat. Torna-ho a provar.';
  if (code === 'access_denied') return 'S\'ha cancel·lat l\'inici de sessió o no s\'han acceptat els permisos.';
  if (code === 'interaction_required' || code === 'login_required' || code === 'invalid_grant') return 'Cal tornar a iniciar la sessió amb Microsoft.';
  return `No s'ha pogut iniciar la sessió amb Microsoft${d ? `: ${d.split(/\r?\n/)[0]}` : code ? ` (${code})` : '.'}`;
}

// ── Microsoft Graph ──
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

class GraphClient {
  constructor(getToken, { fetchImpl, base = 'https://graph.microsoft.com/v1.0' } = {}) {
    this.getToken = getToken;
    this.fetch = fetchImpl || ((...a) => fetch(...a));
    this.base = base;
  }

  async req(method, path, { body, headers = {}, retries = 4, absolute = false, noAuth = false, binary = false } = {}) {
    const url = absolute ? path : this.base + path;
    for (let attempt = 0; ; attempt++) {
      const h = { ...headers };
      if (!noAuth) h.Authorization = `Bearer ${await this.getToken()}`;
      let payload;
      if (body !== undefined) {
        if (binary) payload = body;
        else { payload = JSON.stringify(body); h['Content-Type'] = 'application/json'; }
      }
      let res;
      const offline = typeof navigator !== 'undefined' && navigator.onLine === false;
      try {
        if (offline) throw new Error('offline');
        res = await this.fetch(url, { method, headers: h, body: payload });
      } catch (e) {
        // Sense connexió no s'insisteix gaire: la cua de desament ja torna a provar-ho cada pocs segons.
        if (!offline && attempt < Math.min(retries, 1)) { await sleep(800); continue; }
        throw new M365Error('No hi ha connexió amb Microsoft 365. Els canvis es desaran quan torni la connexió.', 'network');
      }
      if (res.status === 401 && attempt === 0 && !noAuth) { MsAuth.expire(); continue; }
      if ([429, 502, 503, 504].includes(res.status) && attempt < retries) {
        const ra = Number(res.headers.get('Retry-After'));
        await sleep(ra > 0 ? Math.min(ra, 30) * 1000 : 700 * 2 ** attempt);
        continue;
      }
      if (res.status === 204) return null;
      const text = await res.text();
      let data = null;
      try { data = text ? JSON.parse(text) : null; } catch (e) { data = null; }
      if (!res.ok) throw graphError(res.status, data);
      return data;
    }
  }

  // Fins a 20 peticions en una sola crida ($batch). Retorna les respostes en el mateix ordre.
  // sequential: el servei les executa una darrere l'altra (recomanat per a Excel).
  async batch(requests, { retries = 3, sequential = false } = {}) {
    const out = new Array(requests.length);
    let todo = requests.map((r, i) => ({ ...r, id: String(i + 1), i }));
    for (let attempt = 0; todo.length; attempt++) {
      const chunks = [];
      for (let i = 0; i < todo.length; i += 20) chunks.push(todo.slice(i, i + 20));
      const again = [];
      let wait = 0;
      for (const chunk of chunks) {
        const res = await this.req('POST', '/$batch', {
          body: {
            requests: chunk.map((r, k) => {
              const headers = { ...(r.headers || {}), ...(r.body !== undefined ? { 'Content-Type': 'application/json' } : {}) };
              return {
                id: r.id, method: r.method || 'GET', url: r.url,
                ...(Object.keys(headers).length ? { headers } : {}),
                ...(r.body !== undefined ? { body: r.body } : {}),
                ...(sequential && k > 0 ? { dependsOn: [chunk[k - 1].id] } : {}),
              };
            }),
          },
        });
        for (const resp of (res && res.responses) || []) {
          const r = chunk.find((x) => x.id === String(resp.id));
          if (!r) continue;
          // 424: no s'ha executat perquè ha fallat l'anterior de la cadena.
          if ([409, 424, 429, 502, 503, 504].includes(resp.status) && attempt < retries) {
            again.push(r);
            wait = Math.max(wait, Number((resp.headers || {})['Retry-After']) * 1000 || 800 * 2 ** attempt);
          } else {
            out[r.i] = resp.status >= 400 ? { error: graphError(resp.status, resp.body) } : { status: resp.status, body: resp.body };
          }
        }
      }
      todo = again;
      if (todo.length) await sleep(Math.min(wait, 30000));
    }
    return out;
  }
}

function graphError(status, data) {
  const err = (data && data.error) || {};
  const code = err.code || String(status);
  let msg = err.message || `Error ${status}`;
  if (status === 403 || code === 'accessDenied') msg = 'No tens permís per escriure a la carpeta compartida. Demana que et donin accés d\'edició.';
  else if (status === 404 && /itemNotFound/i.test(code)) msg = 'No s\'ha trobat l\'element a OneDrive/SharePoint (potser s\'ha mogut o esborrat).';
  else if (status === 423) msg = 'L\'Excel està bloquejat per una altra aplicació. Es tornarà a provar.';
  else if (status === 507) msg = 'No queda espai a OneDrive/SharePoint.';
  const e = new M365Error(msg, code, status);
  e.detail = err.message || '';
  return e;
}

// ── Excel com a base de dades ──
class ExcelDb {
  constructor(graph, driveId, itemId) {
    this.g = graph;
    this.path = `/drives/${driveId}/items/${itemId}/workbook`;
    this.session = null;
    this.queue = Promise.resolve();
    this.failedCols = new Set();
  }

  // Les escriptures a l'Excel van d'una en una (Excel no admet bé canvis simultanis).
  exclusive(fn) {
    const run = this.queue.then(fn, fn);
    this.queue = run.catch(() => null);
    return run;
  }

  async ensureSession() {
    if (this.session && Date.now() - this.session.used < 4 * 60 * 1000) { this.session.used = Date.now(); return; }
    try {
      const s = await this.g.req('POST', `${this.path}/createSession`, { body: { persistChanges: true }, retries: 2 });
      this.session = s && s.id ? { id: s.id, used: Date.now() } : null;
    } catch (e) {
      if (e.code === 'network') throw e;
      this.session = null; // sense sessió també funciona, només és més lent
    }
  }

  sessionHeaders() { return this.session ? { 'workbook-session-id': this.session.id } : {}; }

  async call(method, rel, opts = {}) {
    await this.ensureSession();
    try {
      return await this.g.req(method, this.path + rel, { ...opts, headers: { ...this.sessionHeaders(), ...(opts.headers || {}) } });
    } catch (e) {
      if (this.session && /session/i.test(e.code)) {
        this.session = null;
        await this.ensureSession();
        return this.g.req(method, this.path + rel, { ...opts, headers: { ...this.sessionHeaders(), ...(opts.headers || {}) } });
      }
      throw e;
    }
  }

  async batch(list) {
    await this.ensureSession();
    const base = this.path.replace(/^\//, '');
    return this.g.batch(list.map((r) => ({ ...r, url: `/${base}${r.url}`, headers: { ...this.sessionHeaders(), ...(r.headers || {}) } })), { sequential: true });
  }

  static tablePath(sheet) { return `/tables/${encodeURIComponent(XL.table(sheet))}`; }
  static rangePath(sheet, address) { return `/worksheets/${encodeURIComponent(sheet)}/range(address='${address}')`; }

  // "Pacients!A1:AF57" → { startRow, startCol, endRow, endCol }
  static parseAddress(addr) {
    const a = String(addr || '').split('!').pop().replace(/\$/g, '');
    const m = a.match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
    if (!m) throw new M365Error(`Adreça de rang desconeguda: ${addr}`, 'address');
    const n = (s) => s.split('').reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0);
    return { startCol: n(m[1]), startRow: Number(m[2]), endCol: n(m[3] || m[1]), endRow: Number(m[4] || m[2]) };
  }

  // Capçalera i columna d'identificadors d'una taula en una sola anada i tornada.
  async layout(sheet, idColumn = 'id') {
    return (await this.layouts([[sheet, idColumn]]))[0];
  }

  static layoutRequests(sheet, idColumn) {
    const t = ExcelDb.tablePath(sheet);
    return [
      { url: `${t}/headerRowRange?$select=address,values` },
      { url: `${t}/columns/${encodeURIComponent(idColumn)}/dataBodyRange?$select=address,values` },
    ];
  }

  // Diverses taules alhora. Una taula que no existeix torna l'error (status 404) al seu lloc.
  async layouts(list, { tolerate = false } = {}) {
    const res = await this.batch(list.flatMap(([sheet, idColumn = 'id']) => ExcelDb.layoutRequests(sheet, idColumn)));
    return list.map((_, k) => {
      const head = res[2 * k], ids = res[2 * k + 1];
      const err = head.error || ids.error;
      if (err) { if (tolerate) return { error: err }; throw err; }
      return ExcelDb.makeLayout(head, ids);
    });
  }

  static makeLayout(head, ids) {
    const h = ExcelDb.parseAddress(head.body.address);
    const b = ExcelDb.parseAddress(ids.body.address);
    return {
      headers: (head.body.values[0] || []).map((x) => String(x)),
      startCol: h.startCol,
      headerRow: h.startRow,
      firstRow: b.startRow,
      ids: (ids.body.values || []).map((r) => String(r[0] == null ? '' : r[0])),
    };
  }

  rowAddress(lay, sheetRow, width) {
    return `${Xlsx.colName(lay.startCol)}${sheetRow}:${Xlsx.colName(lay.startCol + width - 1)}${sheetRow}`;
  }

  // Afegeix les columnes que falten al final de la taula. Si no es pot, la dada continua a data_json.
  async addColumns(sheet, lay, keys) {
    const have = new Set(lay.headers.map((x) => x.toLowerCase()));
    const missing = [];
    for (const k of keys) {
      const lk = k.toLowerCase();
      if (!have.has(lk) && !this.failedCols.has(`${sheet}|${lk}`) && !missing.some((m) => m.toLowerCase() === lk)) missing.push(k);
    }
    for (const name of missing) {
      try {
        await this.call('POST', `${ExcelDb.tablePath(sheet)}/columns/add`, { body: { name }, retries: 2 });
        lay.headers.push(name);
      } catch (e) {
        if (e.code === 'network') throw e;
        this.failedCols.add(`${sheet}|${name.toLowerCase()}`);
      }
    }
    return lay;
  }

  async readTable(sheet, opts = {}) {
    return (await this.readTables([[sheet, opts]]))[0];
  }

  // Llegeix diverses taules amb dues anades i tornades: capçaleres + identificadors, i després les dades.
  async readTables(list) {
    const lays = await this.layouts(list.map(([sheet]) => [sheet, 'id']), { tolerate: true });
    const plans = list.map(([sheet, opts = {}], k) => {
      const lay = lays[k];
      if (lay.error) {
        if (lay.error.status === 404) return null; // el full no existeix (encara)
        throw lay.error;
      }
      return this.readPlan(sheet, lay, opts);
    });
    const reqs = plans.flatMap((p, k) => (p ? p.reqs.map((r) => ({ ...r, k })) : []));
    const res = reqs.length ? await this.batch(reqs) : [];
    res.forEach((r, i) => {
      if (r.error) throw r.error;
      const { k, s } = reqs[i];
      plans[k].put(s, r.body.values || []);
    });
    return plans.map((p) => (p ? p.finish() : []));
  }

  readPlan(sheet, lay, { keepDeleted = false } = {}) {
    const n = lay.ids.length;
    const col = (name) => lay.headers.indexOf(name);
    const iDel = col('deleted');
    const iJson = col('data_json');
    const chunkCols = lay.headers.map((h, i) => ({ i, n: /^data_json_(\d+)$/.test(h) ? Number(h.split('_').pop()) : 0 }))
      .filter((x) => x.n > 0).sort((a, b) => a.n - b.n);
    if (iDel < 0 || iJson < 0) return { reqs: [], put() {}, finish: () => [] }; // no és una taula de l'app
    const wanted = [iDel, iJson, ...chunkCols.map((c) => c.i)];
    // Les columnes deleted/data_json* són contigües a la plantilla: un sol rang per tros de files.
    const lo = Math.min(...wanted), hi = Math.max(...wanted);
    const STEP = 200;
    const reqs = [];
    const cols = {};
    for (const ci of wanted) cols[ci] = new Array(n).fill('');
    for (let s = 0; s < n; s += STEP) {
      const r1 = lay.firstRow + s, r2 = lay.firstRow + Math.min(n, s + STEP) - 1;
      const range = `${Xlsx.colName(lay.startCol + lo)}${r1}:${Xlsx.colName(lay.startCol + hi)}${r2}`;
      reqs.push({ s, url: `${ExcelDb.rangePath(sheet, range)}?$select=values` });
    }
    const put = (s, values) => values.forEach((line, j) => { for (const ci of wanted) cols[ci][s + j] = line[ci - lo]; });
    return { reqs, put, finish: () => this.collect(sheet, lay, cols, { iDel, iJson, chunkCols, keepDeleted }) };
  }

  collect(sheet, lay, cols, { iDel, iJson, chunkCols, keepDeleted }) {
    const n = lay.ids.length;
    const byId = {};
    for (let i = 0; i < n; i++) {
      const id = lay.ids[i];
      if (!id) continue;
      const dv = cols[iDel][i];
      const deleted = dv === true || String(dv).toUpperCase() === 'TRUE';
      if (deleted && !keepDeleted) { delete byId[id]; continue; }
      let json = String(cols[iJson][i] || '');
      for (const c of chunkCols) json += unmarkChunk(cols[c.i][i]);
      if (!json) continue;
      try {
        const rec = JSON.parse(json);
        if (deleted) rec.deleted = true;
        const prev = byId[id];
        if (!prev || String(rec.updatedAt || '') >= String(prev.updatedAt || '')) byId[id] = rec;
      } catch (e) {
        console.warn(`Fila il·legible a ${sheet}: ${id}`);
      }
    }
    return Object.values(byId);
  }

  async upsert(kind, record, flat, log, user) {
    const sheet = XL.sheets[kind];
    if (!sheet) throw new M365Error(`Tipus de dada desconegut: ${kind}`, 'kind');
    if (!record || !/^[A-Za-z0-9_-]{1,80}$/.test(String(record.id || ''))) throw new M365Error('Registre sense identificador vàlid.', 'id');
    return this.exclusive(async () => {
      const now = new Date().toISOString();
      const rec = { ...record, updatedAt: now, updatedBy: user };
      const json = JSON.stringify(rec);
      const chunks = [];
      for (let i = 0; i < json.length; i += XL.cellLimit) chunks.push(json.slice(i, i + XL.cellLimit));
      if (chunks.length > 1 + XL.extraChunks) throw new M365Error('Aquest registre és massa gran per desar-lo a l\'Excel.', 'size');
      const readable = Object.keys(flat || {}).filter((k) => !XL.base.includes(k) && !/^data_json/.test(k) && k.length <= 200 && !/[\r\n]/.test(k));
      for (let attempt = 0; ; attempt++) {
        try {
          const lay = await this.layout(sheet);
          // Un Excel creat amb una plantilla anterior pot tenir menys columnes data_json_*: millor avisar que desar-ne mig.
          if (chunks.length > 1 + lay.headers.filter((h) => /^data_json_\d+$/.test(h)).length) throw new M365Error('Aquest registre és massa gran per desar-lo a l\'Excel. Si és un pla d\'entrenament, divideix-lo en dos plans més curts.', 'size');
          await this.addColumns(sheet, lay, readable);
          const row = lay.headers.map((h) => {
            if (h === 'id') return rec.id;
            if (h === 'patient_id') return kind === 'patients' ? rec.id : (rec.patientId || '');
            if (h === 'updated_at') return now;
            if (h === 'updated_by') return user;
            if (h === 'deleted') return !!rec.deleted;
            if (h === 'data_json') return chunks[0] || '';
            if (/^data_json_\d+$/.test(h)) return markChunk(chunks[Number(h.split('_').pop()) - 1]);
            return xlCell(flat[h]);
          });
          const at = lay.ids.indexOf(String(rec.id));
          if (at >= 0) {
            await this.call('PATCH', ExcelDb.rangePath(sheet, this.rowAddress(lay, lay.firstRow + at, row.length)), { body: { values: [row] } });
          } else {
            // Afegir files a una taula és atòmic: dues tauletes no poden escriure a la mateixa fila.
            await this.call('POST', `${ExcelDb.tablePath(sheet)}/rows/add`, { body: { values: [row] }, retries: 0 });
          }
          break;
        } catch (e) {
          if (attempt >= 2 || ![409, 429, 500, 502, 503, 504].includes(e.status)) throw e;
          await sleep(1200 * (attempt + 1));
        }
      }
      if (kind === 'sessions') await this.writeLog(rec, rec.deleted ? [] : (log || []));
      return { id: rec.id, updatedAt: now, updatedBy: user };
    });
  }

  // Registre d'exercicis: una fila per exercici; es substitueixen les files de la sessió.
  async writeLog(session, rows) {
    const sheet = XL.log;
    const lay = await this.layout(sheet, 'session_id');
    const keys = [];
    for (const r of rows) for (const k of Object.keys(r)) if (!keys.includes(k) && !XL.logBase.includes(k)) keys.push(k);
    await this.addColumns(sheet, lay, keys);
    const values = rows.map((r) => lay.headers.map((h) => {
      if (h === 'session_id') return session.id;
      if (h === 'patient_id') return session.patientId || '';
      return xlCell(r[h]);
    }));
    const mine = [];
    lay.ids.forEach((id, i) => { if (id === String(session.id)) mine.push(i); });
    const width = lay.headers.length;
    const common = Math.min(mine.length, values.length);
    for (let k = 0; k < common;) {
      // Files consecutives en una sola escriptura.
      let j = k;
      while (j + 1 < common && mine[j + 1] === mine[j] + 1) j++;
      const r1 = lay.firstRow + mine[k], r2 = lay.firstRow + mine[j];
      const addr = `${Xlsx.colName(lay.startCol)}${r1}:${Xlsx.colName(lay.startCol + width - 1)}${r2}`;
      await this.call('PATCH', ExcelDb.rangePath(sheet, addr), { body: { values: values.slice(k, j + 1) } });
      k = j + 1;
    }
    if (values.length > common) {
      await this.call('POST', `${ExcelDb.tablePath(sheet)}/rows/add`, { body: { values: values.slice(common) }, retries: 0 });
    }
    // Sobren files: s'esborren de baix a dalt perquè no es moguin les altres.
    for (const i of mine.slice(common).reverse()) {
      const addr = this.rowAddress(lay, lay.firstRow + i, width);
      try {
        await this.call('POST', `${ExcelDb.rangePath(sheet, addr)}/delete`, { body: { shift: 'Up' } });
      } catch (e) {
        if (e.code === 'network') throw e;
        // Excel no deixa buidar del tot una taula: es deixa la fila en blanc.
        await this.call('PATCH', ExcelDb.rangePath(sheet, addr), { body: { values: [new Array(width).fill('')] } });
      }
    }
  }
}

// Continuació de data_json: una marca inicial evita que Excel llegeixi el tros com a fórmula o
// es mengi un apòstrof inicial.
const markChunk = (s) => (s ? `~${s}` : '');
const unmarkChunk = (v) => { const s = v == null ? '' : String(v); return s.startsWith('~') ? s.slice(1) : s; };

// Valor segur per a una cel·la: números com a número, dates AAAA-MM-DD com a data i la resta com a text
// (l'apòstrof inicial fa que Excel no el converteixi: «8-10» no ha de ser el 8 d'octubre, ni «=…» una fórmula).
function xlCell(v) {
  if (v === null || v === undefined) return '';
  if (typeof v === 'number') return isFinite(v) ? v : '';
  if (typeof v === 'boolean') return v;
  const s = String(v);
  if (/^-?\d+([.,]\d+)?$/.test(s) && s.length < 16) return Number(s.replace(',', '.'));
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  if (/^[=+\-@']/.test(s) || /^[\d\s.,:/\-']+$/.test(s) || /^\d+\s*(e|E)\s*\d+$/.test(s)) return `'${s}`;
  return s;
}

// Columnes de la plantilla: les mateixes que genera l'app per a un registre buit.
function m365TemplateSheets() {
  const chunk = Array.from({ length: XL.extraChunks }, (_, i) => `data_json_${i + 2}`);
  const cols = (keys, widths = {}) => keys.map((name) => ({
    name,
    hidden: /^data_json/.test(name),
    width: /^data_json/.test(name) ? 10 : widths[name] || (name.length > 18 ? 22 : 16),
  }));
  const base = [...XL.base, ...chunk];
  const p = { id: 'P', firstName: '', lastName: '' };
  const a = {
    id: 'V', patientId: 'P', date: '', values: {}, ybt: { d: {}, e: {} }, jumps: { attempts: [] },
    encoder: { rows: [{ name: 'Squat' }, { name: 'RDL' }, { name: 'Hip Thrust' }] }, bike: {}, patterns: {}, free: [], general: {},
  };
  const s = { id: 'S', patientId: 'P', blocks: BLOCKS.map((b) => ({ key: b.key, items: [] })), feedback: {}, wellness: {} };
  const logKeys = Object.keys(Flat.sessionLog({ blocks: [{ key: 'for', items: [{ name: 'x' }] }] }, p)[0]);
  const settingsKeys = [];
  const readable = {
    patients: Object.keys(Flat.patient(p)),
    assessments: Object.keys(Flat.assessment(a, p)),
    sessions: Object.keys(Flat.session(s, p)),
    exercises: Object.keys(Flat.exercise({})),
    templates: Object.keys(Flat.template({ items: [], blocks: [] })),
    settings: settingsKeys,
  };
  const wide = { Client: 24, Nom: 18, Cognoms: 22, Objectiu: 30, Observacions: 30, Exercici: 26 };
  const sheets = Object.entries(XL.sheets).map(([kind, name]) => ({
    name, table: XL.table(name), columns: cols([...base, ...readable[kind]], wide),
  }));
  sheets.push({ name: XL.log, table: XL.table(XL.log), columns: cols([...XL.logBase, ...logKeys], wide) });
  return sheets;
}

function m365TemplateFile() {
  return Xlsx.workbook(m365TemplateSheets());
}

// ── Carpetes i fitxers (OneDrive / SharePoint) ──
const safeName = (s) => String(s || '').replace(/["*:<>?/\\|#%]/g, ' ').replace(/\s+/g, ' ').trim().replace(/^\.+|\.+$/g, '').slice(0, 120);

class M365Api {
  constructor(graph, cfg, user) {
    this.g = graph;
    this.cfg = cfg;
    this.user = user;
    this.drive = `/drives/${cfg.driveId}`;
    this.db = null;
    this.workbookItem = null;
    this.clientsItem = null;
  }

  static encodeShare(url) {
    const bytes = new TextEncoder().encode(url.trim());
    return `u!${b64url(bytes)}`;
  }

  // Enllaç d'una carpeta (el de «Copia l'enllaç» o el de la barra d'adreces) → carpeta de Graph.
  static async resolveFolder(graph, url) {
    const clean = String(url || '').trim();
    if (!/^https:\/\/\S+$/i.test(clean)) throw new M365Error('Enganxa l\'enllaç complet de la carpeta (comença per https://).', 'folder');
    let item;
    try {
      item = await graph.req('GET', `/shares/${M365Api.encodeShare(clean)}/driveItem?$select=id,name,webUrl,folder,parentReference`, { headers: { Prefer: 'redeemSharingLink' } });
    } catch (e) {
      if (e.code === 'network') throw e;
      throw new M365Error('No s\'ha pogut obrir aquest enllaç. Comprova que és l\'enllaç de la carpeta i que tens permís d\'edició.', 'folder');
    }
    if (!item || !item.folder) throw new M365Error('Aquest enllaç és d\'un fitxer, no d\'una carpeta. Copia l\'enllaç de la carpeta compartida.', 'folder');
    return { driveId: item.parentReference && item.parentReference.driveId, folderId: item.id, folderName: item.name, folderWebUrl: item.webUrl };
  }

  childPath(parentId, name) { return `${this.drive}/items/${parentId}:/${encodeURIComponent(name)}`; }

  async child(parentId, name) {
    try {
      return await this.g.req('GET', `${this.childPath(parentId, name)}?$select=id,name,webUrl,folder,file`);
    } catch (e) {
      if (e.status === 404) return null;
      throw e;
    }
  }

  async ensureChildFolder(parentId, name) {
    const found = await this.child(parentId, name);
    if (found) return found;
    try {
      return await this.g.req('POST', `${this.drive}/items/${parentId}/children`, { body: { name, folder: {}, '@microsoft.graph.conflictBehavior': 'fail' } });
    } catch (e) {
      if (e.status === 409) return this.child(parentId, name);
      throw e;
    }
  }

  async children(folderId) {
    const out = [];
    let next = `${this.drive}/items/${folderId}/children?$select=id,name,webUrl,folder,file,lastModifiedDateTime&$top=200`;
    while (next && out.length < 2000) {
      const res = await this.g.req('GET', next, { absolute: /^https:/.test(next) });
      out.push(...((res && res.value) || []));
      next = res && res['@odata.nextLink'];
    }
    return out;
  }

  // Existeix la base de dades a la carpeta?
  async locate() {
    this.workbookItem = await this.child(this.cfg.folderId, M365_NAMES.workbook);
    this.clientsItem = await this.child(this.cfg.folderId, M365_NAMES.clients);
    if (this.workbookItem) this.db = new ExcelDb(this.g, this.cfg.driveId, this.workbookItem.id);
    return !!this.workbookItem;
  }

  // Primer cop: crea l'Excel (plantilla) i la carpeta de clients.
  async setup() {
    if (!this.workbookItem) {
      const bytes = m365TemplateFile();
      try {
        this.workbookItem = await this.g.req('PUT', `${this.childPath(this.cfg.folderId, M365_NAMES.workbook)}:/content?@microsoft.graph.conflictBehavior=fail`, {
          body: new Blob([bytes], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' }),
          binary: true,
          headers: { 'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
        });
      } catch (e) {
        if (e.status !== 409) throw e;
        this.workbookItem = await this.child(this.cfg.folderId, M365_NAMES.workbook);
      }
    }
    this.clientsItem = await this.ensureChildFolder(this.cfg.folderId, M365_NAMES.clients);
    this.db = new ExcelDb(this.g, this.cfg.driveId, this.workbookItem.id);
  }

  async bootstrap() {
    const kinds = Object.entries(XL.sheets);
    const tables = await this.db.readTables(kinds.map(([kind, sheet]) => [sheet, { keepDeleted: kind === 'exercises' || kind === 'templates' }]));
    return Object.fromEntries(kinds.map(([kind], i) => [kind, tables[i]]));
  }

  async ensureFolder(p) {
    if (!p.id || !/^[A-Za-z0-9_-]{1,80}$/.test(String(p.id))) throw new M365Error('Client sense identificador vàlid.', 'id');
    if (p.folderId) {
      try {
        const f = await this.g.req('GET', `${this.drive}/items/${p.folderId}?$select=id,webUrl,folder,deleted`);
        if (f && f.folder && !f.deleted) return { folderId: f.id, folderUrl: f.webUrl };
      } catch (e) {
        if (e.code === 'network') throw e;
      }
    }
    if (!this.clientsItem) this.clientsItem = await this.ensureChildFolder(this.cfg.folderId, M365_NAMES.clients);
    const existing = (await this.children(this.clientsItem.id)).find((x) => x.folder && x.name.includes(p.id));
    if (existing) return { folderId: existing.id, folderUrl: existing.webUrl };
    const name = safeName([[p.lastName, p.firstName].filter(Boolean).join(', ') || 'Client', p.id].join(' · '));
    const folder = await this.ensureChildFolder(this.clientsItem.id, name);
    for (const path of [EXPORT_FOLDERS.assessVideos, EXPORT_FOLDERS.sessionVideos]) await this.ensurePath(folder.id, path);
    return { folderId: folder.id, folderUrl: folder.webUrl };
  }

  // Carpeta d'una ruta dins d'una carpeta (la crea, nivell a nivell, si cal): ['Valoracions', 'Vídeos valoracions'].
  async ensurePath(rootId, path) {
    this.paths = this.paths || new Map();
    const key = `${rootId}/${path.join('/')}`;
    if (this.paths.has(key)) return this.paths.get(key);
    let cur = { id: rootId };
    for (const name of path) cur = await this.ensureChildFolder(cur.id, name);
    this.paths.set(key, cur);
    return cur;
  }

  // Tots els fitxers de la carpeta d'un client (fins a dos nivells de subcarpetes: Valoracions › Vídeos valoracions…).
  async listFiles(folderId) {
    if (!folderId) return [];
    const out = [];
    const walk = async (id, rel, depth) => {
      const items = await this.children(id);
      for (const it of items) {
        if (it.file && out.length < 400) out.push({ id: it.id, name: it.name, url: it.webUrl, mimeType: (it.file && it.file.mimeType) || '', folder: rel, updated: it.lastModifiedDateTime || '' });
      }
      if (depth < 2) for (const sub of items.filter((x) => x.folder)) await walk(sub.id, rel ? `${rel}/${sub.name}` : sub.name, depth + 1);
    };
    await walk(folderId, '', 0);
    return out.sort((a, b) => (a.updated < b.updated ? 1 : a.updated > b.updated ? -1 : 0));
  }

  // Miniatura i adreça temporal de reproducció (una hora) de fitxers de la carpeta, per veure els vídeos a l'informe.
  async media(ids) {
    const res = await this.g.batch(ids.map((id) => ({ url: `${this.drive}/items/${id}?$expand=thumbnails` })));
    return res.map((r, i) => {
      if (!r || r.error) return { id: ids[i] };
      const b = r.body || {};
      const t = (b.thumbnails || [])[0] || {};
      return { id: ids[i], play: b['@microsoft.graph.downloadUrl'] || '', thumb: (t.large || t.medium || t.small || {}).url || '' };
    });
  }

  // Puja un fitxer de la tauleta a una carpeta del client (path = ['Valoracions', 'Vídeos valoracions']), per trossos i amb progrés.
  // El nom és etiqueta_client_data_NN.ext: amb { stem, ext } el número de sèrie (_01, _02…) és el següent lliure de la carpeta.
  async uploadFile(folderId, file, { name, stem, ext, onProgress, path = EXPORT_FOLDERS.sessionVideos } = {}) {
    if (!file || !file.size) throw new M365Error('El fitxer és buit.', 'upload');
    const target = await this.ensurePath(folderId, path);
    let fileName = name;
    if (stem) {
      const taken = (await this.children(target.id)).map((x) => x.name);
      fileName = `${stem}_${Names.serial(Names.nextSerial(taken, stem, ext || ''))}${ext || ''}`;
    }
    fileName = safeName(fileName || file.name) || 'fitxer';
    return this.uploadBlob(target.id, fileName, file, { conflict: 'rename', onProgress });
  }

  // Puja un fitxer per trossos (sessió de pujada de Graph) i en retorna { id, name, url }.
  async uploadBlob(parentId, fileName, file, { conflict = 'rename', onProgress } = {}) {
    const size = file.size;
    const session = await this.g.req('POST', `${this.childPath(parentId, fileName)}:/createUploadSession`, {
      body: { item: { '@microsoft.graph.conflictBehavior': conflict, name: fileName } },
    });
    const CHUNK = 327680 * 16; // 5 MB (múltiple de 320 KiB)
    let item = null;
    for (let start = 0; start < size; start += CHUNK) {
      const end = Math.min(size, start + CHUNK);
      const part = file.slice(start, end);
      for (let attempt = 0; ; attempt++) {
        try {
          const res = await this.g.fetch(session.uploadUrl, {
            method: 'PUT',
            headers: { 'Content-Range': `bytes ${start}-${Math.max(end - 1, 0)}/${size}` },
            body: part,
          });
          if (res.status === 200 || res.status === 201) item = await res.json();
          else if (res.status !== 202) throw new M365Error(`No s'ha pogut pujar el fitxer (error ${res.status}).`, 'upload', res.status);
          break;
        } catch (e) {
          if (attempt >= 3) throw e.code ? e : new M365Error('S\'ha tallat la connexió mentre es pujava el fitxer.', 'network');
          await sleep(1500 * (attempt + 1));
        }
      }
      if (onProgress) onProgress(end / size);
    }
    return { id: item && item.id, name: (item && item.name) || fileName, url: (item && item.webUrl) || '' };
  }

  // Desa un fitxer generat per l'app (l'Excel del client), substituint el que hi hagi amb el mateix nom.
  async putFile(parentId, fileName, bytes, { mime = XlsxDoc.XLSX_MIME } = {}) {
    const name = safeName(fileName);
    if (bytes.length > 3.5 * 1024 * 1024) return this.uploadBlob(parentId, name, new Blob([bytes], { type: mime }), { conflict: 'replace' });
    const item = await this.g.req('PUT', `${this.childPath(parentId, name)}:/content?@microsoft.graph.conflictBehavior=replace`, {
      body: new Blob([bytes], { type: mime }),
      binary: true,
      headers: { 'Content-Type': mime },
    });
    return { id: item && item.id, name: (item && item.name) || name, url: (item && item.webUrl) || '' };
  }

  // Esborra un fitxer (va a la paperera de reciclatge de OneDrive/SharePoint, es pot recuperar).
  async removeItem(itemId) {
    try {
      await this.g.req('DELETE', `${this.drive}/items/${itemId}`);
    } catch (e) {
      if (e.status !== 404) throw e;
    }
  }
}

// ── Canvis pendents guardats a la tauleta (sobreviuen a un tancament o a un nou inici de sessió) ──
const Outbox = {
  all() { return M365Local.get(M365_KEYS.outbox) || {}; },
  put(key, rec) { const o = this.all(); o[key] = rec; M365Local.set(M365_KEYS.outbox, o); },
  drop(key) { const o = this.all(); if (key in o) { delete o[key]; M365Local.set(M365_KEYS.outbox, o); } },
};

// ── Backend per a Store ──
const M365Backend = {
  mode: 'm365',
  outbox: true,
  api: null,
  cfg: null,
  graph: null,

  graphFor(cfg) {
    return new GraphClient(() => MsAuth.accessToken(cfg), { fetchImpl: MsAuth.fetch });
  },

  // Passos de connexió: config → login → folder → setup → dades.
  async init() {
    const cfg = M365.config();
    this.cfg = cfg;
    if (!cfg.clientId || !cfg.tenantId) throw new M365Error('Falta configurar la connexió amb Microsoft 365.', 'config');
    await MsAuth.complete(cfg);
    await MsAuth.accessToken(cfg);
    this.graph = this.graphFor(cfg);
    const user = MsAuth.user() || {};
    if (!cfg.driveId || !cfg.folderId || (cfg.folderUrl && cfg.baked.folderUrl && cfg.resolvedFrom !== cfg.folderUrl)) {
      if (!cfg.folderUrl) throw new M365Error('Falta triar la carpeta compartida on es desaran les dades.', 'folder');
      const f = await M365Api.resolveFolder(this.graph, cfg.folderUrl);
      M365.save({ ...f, resolvedFrom: cfg.folderUrl });
      Object.assign(cfg, f);
    }
    this.api = new M365Api(this.graph, cfg, user.email || user.name || '');
    if (!(await this.api.locate())) throw new M365Error(`La carpeta «${cfg.folderName || 'compartida'}» encara no té la base de dades.`, 'setup');
    const records = await this.api.bootstrap();
    return {
      records,
      meta: {
        user: user.email || user.name || '',
        userName: user.name || '',
        spreadsheetUrl: (this.api.workbookItem && this.api.workbookItem.webUrl) || '',
        rootFolderUrl: (this.api.clientsItem && this.api.clientsItem.webUrl) || '',
        dataFolderUrl: cfg.folderWebUrl || '',
        dataFolderName: cfg.folderName || '',
      },
    };
  },

  async connectFolder(url) {
    const cfg = M365.config();
    const graph = this.graphFor(cfg);
    const f = await M365Api.resolveFolder(graph, url);
    M365.save({ ...f, folderUrl: url.trim(), resolvedFrom: url.trim() });
    return f;
  },

  async setup() {
    const cfg = M365.config();
    const graph = this.graphFor(cfg);
    const user = MsAuth.user() || {};
    const api = new M365Api(graph, cfg, user.email || '');
    await api.locate();
    await api.setup();
  },

  save(kind, record, flat, log) { return this.api.db.upsert(kind, U.clone(record), flat, log, this.api.user); },
  ensureFolder(p) { return this.api.ensureFolder(p); },
  listFiles(folderId) { return this.api.listFiles(folderId); },
  uploadFile(folderId, file, opts) { return this.api.uploadFile(folderId, file, opts); },
  // Fitxers generats per l'app (Excel): vegeu 09-sync.js.
  ensurePath(rootId, path) { return this.api.ensurePath(rootId, path); },
  children(folderId) { return this.api.children(folderId); },
  putFile(parentId, name, bytes, opts) { return this.api.putFile(parentId, name, bytes, opts); },
  removeItem(itemId) { return this.api.removeItem(itemId); },
  forgetPaths() { if (this.api && this.api.paths) this.api.paths.clear(); },
  // { enllaç del vídeo → { thumb, play } } per als vídeos que són a la carpeta del client.
  async mediaInfo(folderId, urls) {
    const files = await this.api.listFiles(folderId);
    const byUrl = new Map(files.map((f) => [f.url, f.id]));
    const wanted = [...new Set(urls)].filter((u) => byUrl.has(u));
    if (!wanted.length) return {};
    const info = await this.api.media(wanted.map((u) => byUrl.get(u)));
    return Object.fromEntries(wanted.map((u, i) => [u, info[i]]));
  },
};
