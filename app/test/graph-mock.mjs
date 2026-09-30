// Simulació en memòria de Microsoft Graph (OneDrive/SharePoint + Excel) per provar 09-m365.js.
// Reprodueix el que ens importa del servei real: adreces de rang, taules d'Excel (files/columnes),
// conversió de valors com si s'escrivissin a mà, límits de cel·la, $batch, sessions de pujada i errors.

const GRAPH = 'https://graph.microsoft.com/v1.0';
const UPLOAD = 'https://upload.mock.test/up/';

const colNum = (s) => s.split('').reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0);
const colName = (n) => { let s = ''; for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s; return s; };
function parseAddr(a) {
  const m = String(a).split('!').pop().replace(/\$/g, '').match(/^([A-Z]+)(\d+)(?::([A-Z]+)(\d+))?$/);
  if (!m) throw httpError(400, 'InvalidArgument', `Adreça no vàlida: ${a}`);
  return { c1: colNum(m[1]), r1: Number(m[2]), c2: colNum(m[3] || m[1]), r2: Number(m[4] || m[2]) };
}
const addr = (sheet, c1, r1, c2, r2) => `${sheet}!${colName(c1)}${r1}:${colName(c2)}${r2}`;

function httpError(status, code, message) { const e = new Error(message); e.status = status; e.code = code; return e; }

// ── ZIP (només entrades sense compressió, com les que genera 08-xlsx.js) ──
function unzip(bytes) {
  const b = Buffer.from(bytes);
  const out = {};
  let p = 0;
  while (p + 4 <= b.length && b.readUInt32LE(p) === 0x04034b50) {
    const method = b.readUInt16LE(p + 8);
    const size = b.readUInt32LE(p + 18);
    const nameLen = b.readUInt16LE(p + 26);
    const extra = b.readUInt16LE(p + 28);
    const name = b.slice(p + 30, p + 30 + nameLen).toString('utf8');
    const start = p + 30 + nameLen + extra;
    if (method !== 0) throw new Error(`Compressió no suportada al simulador: ${name}`);
    out[name] = b.slice(start, start + size).toString('utf8');
    p = start + size;
  }
  return out;
}
const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&');

class Workbook {
  constructor(xlsxBytes) {
    this.sheets = new Map(); // nom → { cells: Map("r,c" → valor) }
    this.tables = new Map(); // nom en minúscules → { name, sheet, c1, r1, c2, r2 }
    const f = unzip(xlsxBytes);
    const rels = {};
    for (const m of f['xl/_rels/workbook.xml.rels'].matchAll(/<Relationship Id="([^"]+)"[^>]*Target="([^"]+)"/g)) rels[m[1]] = `xl/${m[2]}`;
    for (const m of f['xl/workbook.xml'].matchAll(/<sheet name="([^"]+)" sheetId="\d+" r:id="([^"]+)"\/>/g)) {
      const name = unesc(m[1]);
      const path = rels[m[2]];
      const sh = { name, cells: new Map() };
      this.sheets.set(name, sh);
      const xml = f[path];
      for (const c of xml.matchAll(/<c r="([A-Z]+)(\d+)"[^>]*?(?: t="([a-zA-Z]+)")?>(.*?)<\/c>/g)) {
        const [, col, row, t, inner] = c;
        let v;
        if (t === 'inlineStr') v = unesc((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/) || ['', ''])[1]);
        else if (t === 'b') v = /<v>1<\/v>/.test(inner);
        else v = Number((inner.match(/<v>(.*?)<\/v>/) || ['', '0'])[1]);
        sh.cells.set(`${row},${colNum(col)}`, v);
      }
      const relPath = path.replace('worksheets/', 'worksheets/_rels/') + '.rels';
      if (f[relPath]) {
        for (const r of f[relPath].matchAll(/Target="\.\.\/tables\/([^"]+)"/g)) {
          const tx = f[`xl/tables/${r[1]}`];
          const tname = unesc(tx.match(/ name="([^"]+)"/)[1]);
          const ref = parseAddr(tx.match(/ ref="([^"]+)"/)[1]);
          const cols = [...tx.matchAll(/<tableColumn id="\d+" name="([^"]+)"\/>/g)].map((x) => unesc(x[1]));
          if (cols.length !== ref.c2 - ref.c1 + 1) throw new Error(`Taula ${tname}: columnes i rang no coincideixen`);
          cols.forEach((n, i) => {
            const cell = sh.cells.get(`${ref.r1},${ref.c1 + i}`);
            if (cell !== n) throw new Error(`Taula ${tname}: la capçalera «${cell}» no coincideix amb «${n}»`);
          });
          const lower = cols.map((c) => c.toLowerCase());
          if (new Set(lower).size !== lower.length) throw new Error(`Taula ${tname}: noms de columna repetits`);
          this.tables.set(tname.toLowerCase(), { name: tname, sheet: name, ...ref });
        }
      }
    }
  }

  sheet(name) {
    const sh = this.sheets.get(decodeURIComponent(name));
    if (!sh) throw httpError(404, 'ItemNotFound', `No existeix el full ${name}`);
    return sh;
  }
  table(name) {
    const t = this.tables.get(decodeURIComponent(name).toLowerCase());
    if (!t) throw httpError(404, 'ItemNotFound', `No existeix la taula ${name}`);
    return t;
  }
  get(sh, r, c) { const v = sh.cells.get(`${r},${c}`); return v === undefined ? '' : v; }
  values(sh, c1, r1, c2, r2) {
    const out = [];
    for (let r = r1; r <= r2; r++) { const line = []; for (let c = c1; c <= c2; c++) line.push(this.get(sh, r, c)); out.push(line); }
    return out;
  }
  // Com Excel quan s'hi escriu un valor: apòstrof = text, «=» = fórmula, números i dates es converteixen.
  coerce(v) {
    if (v === null) return undefined; // null = no tocar
    if (typeof v !== 'string') return v;
    if (v.length > 32767) throw httpError(400, 'InvalidArgument', 'Text massa llarg per a una cel·la');
    if (v.startsWith("'")) return v.slice(1);
    if (v.startsWith('=')) return '#NAME?';
    if (/^-?\d+(\.\d+)?$/.test(v)) return Number(v);
    if (/^\d{4}-\d{2}-\d{2}$/.test(v)) return (Date.parse(`${v}T00:00:00Z`) / 86400000) + 25569;
    if (/^\d{1,2}[-/]\d{1,2}([-/]\d{2,4})?$/.test(v)) return 40000 + Number(v.replace(/\D/g, '').slice(0, 4));
    if (/^(TRUE|FALSE)$/i.test(v)) return /^TRUE$/i.test(v);
    return v;
  }
  write(sh, c1, r1, values) {
    values.forEach((line, i) => line.forEach((v, j) => {
      const x = this.coerce(v);
      if (x === undefined) return;
      if (x === '') sh.cells.delete(`${r1 + i},${c1 + j}`);
      else sh.cells.set(`${r1 + i},${c1 + j}`, x);
    }));
  }
  headers(t) { return this.values(this.sheet(t.sheet), t.c1, t.r1, t.c2, t.r1)[0]; }
  // Llegeix una taula com a objectes (per als tests).
  rows(tableName) {
    const t = this.table(tableName);
    const sh = this.sheet(t.sheet);
    const h = this.headers(t);
    return this.values(sh, t.c1, t.r1 + 1, t.c2, t.r2).map((line) => Object.fromEntries(h.map((k, i) => [k, line[i]])));
  }
  // Desplaça cap amunt les cel·les de les columnes c1..c2 per sota de r2 (Range: delete, shift Up).
  deleteRows(sh, c1, r1, c2, r2) {
    const n = r2 - r1 + 1;
    const maxRow = Math.max(0, ...[...sh.cells.keys()].map((k) => Number(k.split(',')[0])));
    for (let r = r1; r <= maxRow; r++) {
      for (let c = c1; c <= c2; c++) {
        const src = this.get(sh, r + n, c);
        if (src === '') sh.cells.delete(`${r},${c}`); else sh.cells.set(`${r},${c}`, src);
      }
    }
    for (const t of this.tables.values()) {
      if (t.sheet !== sh.name || c1 > t.c1 || c2 < t.c2 || r1 <= t.r1) continue;
      if (r1 <= t.r2) {
        if (t.r2 - n <= t.r1) throw httpError(400, 'InvalidOperation', 'Una taula ha de tenir almenys una fila.');
        t.r2 -= Math.min(n, t.r2 - r1 + 1);
      }
    }
  }
}

export function createGraphMock({ users = {}, now = () => new Date().toISOString() } = {}) {
  let seq = 0;
  const id = (p) => `${p}${(++seq).toString(36).toUpperCase()}`;
  const drives = new Map();
  const items = new Map(); // id → item
  const shares = new Map(); // url → itemId
  const workbooks = new Map(); // itemId → Workbook
  const uploads = new Map();
  const faults = [];
  const log = [];
  let readOnly = new Set();
  const state = { online: true };

  function addItem(driveId, parentId, name, extra) {
    const it = { id: id('I'), driveId, parentId, name, createdDateTime: now(), lastModifiedDateTime: now(), ...extra };
    it.webUrl = `https://eonlife.sharepoint.com/sites/centre/${encodeURIComponent(name)}?id=${it.id}`;
    items.set(it.id, it);
    return it;
  }
  function childOf(parentId, name) {
    for (const it of items.values()) if (it.parentId === parentId && it.name.toLowerCase() === name.toLowerCase() && !it.deleted) return it;
    return null;
  }
  const view = (it) => {
    const v = { id: it.id, name: it.name, webUrl: it.webUrl, lastModifiedDateTime: it.lastModifiedDateTime, createdDateTime: it.createdDateTime, parentReference: { driveId: it.driveId, id: it.parentId } };
    if (it.folder) v.folder = { childCount: [...items.values()].filter((x) => x.parentId === it.id).length };
    if (it.file) v.file = { mimeType: it.file.mimeType };
    if (it.content) v.size = it.content.length;
    return v;
  };

  // Carpeta compartida inicial (la que dona informàtica).
  function createSharedFolder(name = 'EON Life · Dades') {
    const driveId = `b!${id('D')}`;
    drives.set(driveId, { id: driveId });
    const root = addItem(driveId, null, 'Documents', { folder: {} });
    const folder = addItem(driveId, root.id, name, { folder: {} });
    const url = `https://eonlife.sharepoint.com/:f:/s/centre/${folder.id}?e=abc`;
    shares.set(url, folder.id);
    return { driveId, folder, url };
  }

  const who = (headers) => {
    const auth = headers.authorization || headers.Authorization || '';
    const token = auth.replace(/^Bearer\s+/i, '');
    return users[token] || (token ? { email: 'professional@eonlife.test' } : null);
  };

  function workbookOf(itemId) {
    const it = items.get(itemId);
    if (!it) throw httpError(404, 'itemNotFound', 'Item not found');
    if (!workbooks.has(itemId)) workbooks.set(itemId, new Workbook(it.content));
    return workbooks.get(itemId);
  }

  function handleWorkbook(method, itemId, rest, body, user) {
    const wb = workbookOf(itemId);
    const write = method !== 'GET';
    if (write && readOnly.has(user.email)) throw httpError(403, 'accessDenied', 'Access denied');
    let m;
    if (rest === '/createSession' && method === 'POST') return { status: 201, body: { id: id('SES'), persistChanges: true } };
    if ((m = rest.match(/^\/tables\/([^/]+)\/headerRowRange$/)) && method === 'GET') {
      const t = wb.table(m[1]);
      return { body: { address: addr(t.sheet, t.c1, t.r1, t.c2, t.r1), values: [wb.headers(t)] } };
    }
    if ((m = rest.match(/^\/tables\/([^/]+)\/range$/)) && method === 'GET') {
      const t = wb.table(m[1]);
      return { body: { address: addr(t.sheet, t.c1, t.r1, t.c2, t.r2) } };
    }
    if ((m = rest.match(/^\/tables\/([^/]+)\/columns\/([^/]+)\/dataBodyRange$/)) && method === 'GET') {
      const t = wb.table(m[1]);
      const name = decodeURIComponent(m[2]).toLowerCase();
      const h = wb.headers(t).map((x) => String(x).toLowerCase());
      let ci = h.indexOf(name);
      if (ci < 0 && /^\d+$/.test(name)) ci = Number(name) - 1;
      if (ci < 0) throw httpError(404, 'ItemNotFound', `No existeix la columna ${name}`);
      const c = t.c1 + ci;
      return { body: { address: addr(t.sheet, c, t.r1 + 1, c, t.r2), values: wb.values(wb.sheet(t.sheet), c, t.r1 + 1, c, t.r2) } };
    }
    if ((m = rest.match(/^\/tables\/([^/]+)\/columns\/add$/)) && method === 'POST') {
      const t = wb.table(m[1]);
      const name = String(body.name || '');
      if (wb.headers(t).some((x) => String(x).toLowerCase() === name.toLowerCase())) throw httpError(400, 'InvalidArgument', 'Column name already exists');
      t.c2 += 1;
      wb.sheet(t.sheet).cells.set(`${t.r1},${t.c2}`, name);
      return { body: { id: String(t.c2 - t.c1 + 1), name } };
    }
    if ((m = rest.match(/^\/tables\/([^/]+)\/rows\/add$/)) && method === 'POST') {
      const t = wb.table(m[1]);
      const width = t.c2 - t.c1 + 1;
      const vals = body.values || [];
      if (vals.some((l) => l.length !== width)) throw httpError(400, 'InvalidArgument', `The number of values (${vals[0] && vals[0].length}) doesn't match the table width (${width}).`);
      const sh = wb.sheet(t.sheet);
      wb.write(sh, t.c1, t.r2 + 1, vals);
      t.r2 += vals.length;
      return { body: { index: t.r2 - t.r1 - 1, values: vals } };
    }
    if ((m = rest.match(/^\/worksheets\/([^/]+)\/range\(address='([^']+)'\)(\/delete)?$/))) {
      const sh = wb.sheet(m[1]);
      const a = parseAddr(m[2]);
      if (m[3] && method === 'POST') {
        if (body.shift !== 'Up') throw httpError(400, 'InvalidArgument', 'Només shift Up');
        wb.deleteRows(sh, a.c1, a.r1, a.c2, a.r2);
        return { status: 204 };
      }
      if (method === 'GET') return { body: { address: addr(sh.name, a.c1, a.r1, a.c2, a.r2), values: wb.values(sh, a.c1, a.r1, a.c2, a.r2) } };
      if (method === 'PATCH') {
        const vals = body.values;
        if (vals) {
          if (vals.length !== a.r2 - a.r1 + 1 || vals.some((l) => l.length !== a.c2 - a.c1 + 1)) throw httpError(400, 'InvalidArgument', 'The number of rows or columns in the input array doesn\'t match the size or dimensions of the range.');
          wb.write(sh, a.c1, a.r1, vals);
        }
        return { body: { address: addr(sh.name, a.c1, a.r1, a.c2, a.r2) } };
      }
    }
    throw httpError(400, 'BadRequest', `Operació d'Excel no simulada: ${method} ${rest}`);
  }

  function handle(method, rawUrl, headers = {}, body) {
    const url = new URL(rawUrl, GRAPH + '/');
    let path = decodeURI(url.pathname.replace(/^\/v1\.0/, ''));
    const user = who(headers);
    if (!user) throw httpError(401, 'InvalidAuthenticationToken', 'Access token is empty.');
    let m;
    if (path === '/$batch' && method === 'POST') {
      if (body.requests.length > 20) throw httpError(400, 'BadRequest', 'Un $batch admet com a màxim 20 peticions');
      const seen = new Set();
      for (const r of body.requests) {
        for (const d of r.dependsOn || []) if (!seen.has(d)) throw httpError(400, 'BadRequest', `dependsOn ${d} no és una petició anterior del lot`);
        seen.add(r.id);
      }
      const responses = body.requests.map((r) => {
        const res = dispatch(r.method || 'GET', GRAPH + r.url, { ...headers, ...(r.headers || {}) }, r.body);
        return { id: r.id, status: res.status || 200, headers: {}, body: res.body };
      });
      return { body: { responses } };
    }
    if ((m = path.match(/^\/shares\/([^/]+)\/driveItem$/))) {
      const enc = m[1];
      if (!enc.startsWith('u!')) throw httpError(400, 'invalidRequest', 'Bad share id');
      const b64 = enc.slice(2).replace(/-/g, '+').replace(/_/g, '/');
      const shareUrl = Buffer.from(b64 + '='.repeat((4 - (b64.length % 4)) % 4), 'base64').toString('utf8');
      const itemId = shares.get(shareUrl);
      if (!itemId) throw httpError(404, 'itemNotFound', 'The sharing link no longer exists');
      return { body: view(items.get(itemId)) };
    }
    if ((m = path.match(/^\/drives\/([^/]+)\/items\/([^/:]+)(.*)$/))) {
      const [, driveId, itemId, restRaw] = m;
      if (!drives.has(driveId)) throw httpError(404, 'itemNotFound', 'Drive not found');
      const it = items.get(itemId);
      if (!it) throw httpError(404, 'itemNotFound', 'Item not found');
      const rest = restRaw;
      if (rest.startsWith('/workbook')) return handleWorkbook(method, itemId, rest.slice('/workbook'.length), body, user);
      // Adreçament per ruta: items/{pare}:/{nom}[:/content | :/createUploadSession]
      let pm;
      if ((pm = rest.match(/^:\/([^:]+?)(?::\/(content|createUploadSession))?$/))) {
        const name = pm[1];
        const action = pm[2];
        const existing = childOf(itemId, name);
        if (!action) {
          if (method !== 'GET') throw httpError(400, 'BadRequest', 'Mètode no simulat');
          if (!existing) throw httpError(404, 'itemNotFound', 'Item not found');
          return { body: view(existing) };
        }
        if (readOnly.has(user.email)) throw httpError(403, 'accessDenied', 'Access denied');
        if (action === 'content' && method === 'PUT') {
          const conflict = url.searchParams.get('@microsoft.graph.conflictBehavior') || 'replace';
          if (existing && conflict === 'fail') throw httpError(409, 'nameAlreadyExists', 'The specified item name already exists.');
          const bytes = Buffer.from(body);
          const f = existing || addItem(driveId, itemId, name, { file: { mimeType: headers['Content-Type'] || headers['content-type'] || 'application/octet-stream' } });
          f.content = bytes;
          f.lastModifiedDateTime = now();
          workbooks.delete(f.id);
          return { status: existing ? 200 : 201, body: view(f) };
        }
        if (action === 'createUploadSession' && method === 'POST') {
          const sid = id('UP');
          uploads.set(sid, { driveId, parentId: itemId, name, conflict: (body.item || {})['@microsoft.graph.conflictBehavior'] || 'fail', parts: [], received: 0 });
          return { body: { uploadUrl: UPLOAD + sid, expirationDateTime: now() } };
        }
      }
      if (rest === '/children' && method === 'GET') {
        const top = Number(url.searchParams.get('$top')) || 200;
        const skip = Number(url.searchParams.get('$skiptoken')) || 0;
        const all = [...items.values()].filter((x) => x.parentId === itemId && !x.deleted).sort((a, b) => a.name.localeCompare(b.name));
        const page = all.slice(skip, skip + top);
        const res = { value: page.map(view) };
        if (skip + top < all.length) res['@odata.nextLink'] = `${GRAPH}/drives/${driveId}/items/${itemId}/children?$top=${top}&$skiptoken=${skip + top}`;
        return { body: res };
      }
      if (rest === '/children' && method === 'POST') {
        if (readOnly.has(user.email)) throw httpError(403, 'accessDenied', 'Access denied');
        const existing = childOf(itemId, body.name);
        if (existing && body['@microsoft.graph.conflictBehavior'] === 'fail') throw httpError(409, 'nameAlreadyExists', 'The specified item name already exists.');
        if (/["*:<>?/\\|]/.test(body.name)) throw httpError(400, 'invalidRequest', 'Invalid name');
        return { status: 201, body: view(addItem(driveId, itemId, body.name, { folder: {} })) };
      }
      if (rest === '' && method === 'GET') return { body: view(it) };
    }
    throw httpError(400, 'BadRequest', `Petició no simulada: ${method} ${path}`);
  }

  function dispatch(method, url, headers, body) {
    try {
      const f = faults.findIndex((x) => x.match(method, url));
      if (f >= 0) {
        const fault = faults[f];
        if (--fault.times <= 0) faults.splice(f, 1);
        if (fault.after) { const res = handle(method, url, headers, body); log.push({ method, url, status: fault.status }); return { status: fault.status, body: { error: { code: 'fault', message: `Error simulat (${fault.status}) després d'aplicar-se` } }, applied: res }; }
        return { status: fault.status, body: { error: { code: fault.code || 'serviceNotAvailable', message: `Error simulat ${fault.status}` } } };
      }
      const res = handle(method, url, headers, body);
      log.push({ method, url, status: res.status || 200 });
      return { status: res.status || 200, body: res.body };
    } catch (e) {
      log.push({ method, url, status: e.status || 500 });
      return { status: e.status || 500, body: { error: { code: e.code || 'generalException', message: e.message } } };
    }
  }

  function handleUpload(method, url, headers, body) {
    const sid = url.slice(UPLOAD.length);
    const up = uploads.get(sid);
    if (!up) return { status: 404, body: { error: { code: 'itemNotFound', message: 'Upload session not found' } } };
    if (headers.authorization || headers.Authorization) return { status: 401, body: { error: { code: 'unauthenticated', message: 'No s\'ha d\'enviar Authorization a la URL de pujada' } } };
    const range = (headers['content-range'] || headers['Content-Range'] || '').match(/bytes (\d+)-(\d+)\/(\d+)/);
    if (!range) return { status: 400, body: { error: { code: 'invalidRange', message: 'Falta Content-Range' } } };
    const [, s, e, total] = range.map(Number);
    const bytes = Buffer.from(body);
    if (s !== up.received || e - s + 1 !== bytes.length) return { status: 416, body: { error: { code: 'invalidRange', message: 'Fragment fora d\'ordre' } } };
    if (e + 1 < total && bytes.length % 327680 !== 0) return { status: 400, body: { error: { code: 'invalidRange', message: 'Fragment no múltiple de 320 KiB' } } };
    up.parts.push(bytes);
    up.received = e + 1;
    if (up.received < total) return { status: 202, body: { nextExpectedRanges: [`${up.received}-`] } };
    let name = up.name;
    if (childOf(up.parentId, name)) {
      if (up.conflict === 'rename') { const dot = name.lastIndexOf('.'); name = `${name.slice(0, dot)} 1${name.slice(dot)}`; }
      else return { status: 409, body: { error: { code: 'nameAlreadyExists', message: 'exists' } } };
    }
    const f = addItem(up.driveId, up.parentId, name, { file: { mimeType: /\.(mp4|mov|m4v)$/i.test(name) ? 'video/mp4' : 'application/octet-stream' } });
    f.content = Buffer.concat(up.parts);
    uploads.delete(sid);
    return { status: 201, body: view(f) };
  }

  // Interfície fetch() per als tests de Node.
  async function fetchImpl(url, init = {}) {
    if (!state.online) throw new TypeError('Failed to fetch');
    const method = (init.method || 'GET').toUpperCase();
    const headers = Object.fromEntries(Object.entries(init.headers || {}).map(([k, v]) => [k, v]));
    let body = init.body;
    if (body && typeof body.arrayBuffer === 'function') body = new Uint8Array(await body.arrayBuffer());
    let res;
    if (url.startsWith(UPLOAD)) res = handleUpload(method, url, headers, body);
    else {
      const json = typeof body === 'string' ? JSON.parse(body) : body;
      res = dispatch(method, url, headers, json);
    }
    return fakeResponse(res.status || 200, res.body);
  }

  return {
    GRAPH, UPLOAD, items, drives, shares, workbooks, faults, log, state,
    createSharedFolder,
    dispatch,
    handleUpload,
    fetch: fetchImpl,
    setReadOnly(emails) { readOnly = new Set(emails); },
    // Error simulat: { method, match: RegExp, status, times, after } (after = s'aplica i després falla)
    fault({ method, match, status, times = 1, after = false, code }) {
      faults.push({ match: (mm, u) => (!method || mm === method) && match.test(decodeURIComponent(u)), status, times, after, code });
    },
    workbookIn(folderId, name = 'EON Life · Base de dades.xlsx') {
      const f = childOf(folderId, name);
      return f ? workbookOf(f.id) : null;
    },
    child: childOf,
    childrenOf(parentId) { return [...items.values()].filter((x) => x.parentId === parentId && !x.deleted); },
  };
}

export function fakeResponse(status, body) {
  const isBytes = body instanceof Uint8Array || Buffer.isBuffer(body);
  const text = body === undefined || body === null ? '' : isBytes ? '' : JSON.stringify(body);
  return {
    status,
    ok: status >= 200 && status < 300,
    statusText: String(status),
    headers: { get: () => null },
    async text() { return text; },
    async json() { return text ? JSON.parse(text) : null; },
  };
}
