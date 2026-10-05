/* EON Life · sincronització dels Excel amb la carpeta del client (Microsoft 365).
   Cada cop que es canvia alguna cosa d'un client (dades, valoració, sessió o pla) es deixa un avís a una cua que
   sobreviu al tancament de l'app. Passats uns segons sense més canvis, l'app torna a fer els Excel d'aquell client i
   només puja els que han canviat (substituint el fitxer anterior, sense còpies repetides):
     · un Excel per sessió (feta, planificada o prevista al pla) a «Sessions»
     · un Excel per valoració a «Valoracions»
     · l'Excel gegant de visió general a «Sessions»
   Els fitxers antics que ja no toquen (una sessió eliminada o canviada de dia) es treuen de la carpeta (queden a la
   paperera de reciclatge). Mai es toca cap altre fitxer: només els que tenen el nom d'un Excel fet per l'app. */

const SYNC_KEYS = { queue: 'eonlife:sync:queue', hashes: 'eonlife:sync:hashes', done: 'eonlife:sync:done' };

const Sync = (() => {
  const DELAY = 20000;     // temps sense canvis abans de pujar
  const MAX_WAIT = 120000; // com a molt, es puja cada 2 minuts encara que s'estigui editant
  const SOON = 2500;       // en acabar una sessió o sortir de l'editor
  const BACKOFF = [20000, 60000, 120000, 300000];

  const read = (key, fallback) => { try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const write = (key, v) => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sense emmagatzematge */ } };

  let queue = read(SYNC_KEYS.queue, {});       // { pid: { due, since, rev, tries } }
  let hashes = read(SYNC_KEYS.hashes, {});     // { «carpeta/nom»: resum del contingut que es va pujar }
  let done = read(SYNC_KEYS.done, {});         // { pid: { at, uploaded, kept, removed } }
  let timer = null;
  let running = '';                            // client que s'està sincronitzant
  const live = { error: '', code: '', pid: '' };
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); if (typeof Store !== 'undefined' && Store.emit) Store.emit(); };
  const save = () => { write(SYNC_KEYS.queue, queue); write(SYNC_KEYS.hashes, hashes); write(SYNC_KEYS.done, done); };

  // Disponible només amb Microsoft 365 (el backend sap pujar fitxers fets per l'app).
  const available = () => typeof Store !== 'undefined' && Store.cloud() && !!Store.backend && typeof Store.backend.putFile === 'function';
  const enabled = () => available() && Store.ready && !Store.error && Store.settings.autoExcel !== false;

  function schedule() {
    clearTimeout(timer);
    timer = null;
    const dues = Object.values(queue).map((q) => q.due);
    if (!dues.length || typeof setTimeout !== 'function') return;
    timer = setTimeout(tick, Math.max(400, Math.min(...dues) - Date.now()));
  }

  async function tick() {
    timer = null;
    if (running) return;
    if (!enabled()) { timer = setTimeout(tick, 30000); return; } // en pausa o encara sense dades: es torna a mirar d'aquí a un moment
    const now = Date.now();
    const next = Object.entries(queue).filter(([, q]) => q.due <= now).sort((a, b) => a[1].due - b[1].due)[0];
    if (!next) { schedule(); return; }
    const [pid, q] = next;
    const rev = q.rev;
    running = pid;
    emit();
    try {
      const res = await syncClient(pid, { force: !!q.force });
      const cur = queue[pid];
      if (cur && cur.rev !== rev) { cur.due = Date.now() + SOON; cur.tries = 0; delete cur.force; } else delete queue[pid]; // ha canviat alguna cosa mentre es pujava
      done[pid] = { at: Date.now(), ...res };
      live.error = ''; live.code = ''; live.pid = '';
    } catch (e) {
      const cur = queue[pid] || q;
      cur.tries = (cur.tries || 0) + 1;
      cur.due = Date.now() + BACKOFF[Math.min(cur.tries, BACKOFF.length) - 1];
      queue[pid] = cur;
      live.error = friendly(e);
      live.code = (e && e.code) || '';
      live.pid = pid;
      if (e && e.status === 404 && Store.backend.forgetPaths) Store.backend.forgetPaths();
    }
    running = '';
    save();
    emit();
    schedule();
  }

  function friendly(e) {
    const code = (e && e.code) || '';
    if (code === 'network') return 'Sense connexió: els Excel es pujaran en tornar-la.';
    if (code === 'login') return 'La sessió de Microsoft ha caducat: torna a entrar perquè es puguin pujar els Excel.';
    return (e && e.message) || 'No s\'han pogut pujar els Excel.';
  }

  // Fa (o refà) tots els Excel d'un client i els deixa a la seva carpeta. Retorna { uploaded, kept, removed }.
  async function syncClient(pid, { force = false } = {}) {
    const b = Store.backend;
    const d = ExcelSet.data(pid);
    if (!d || d.patient.deleted) return { uploaded: 0, kept: 0, removed: 0, skipped: true };
    let fid = d.patient.folderId;
    if (!fid) {
      const res = await b.ensureFolder(d.patient);
      fid = res && res.folderId;
      if (!fid) throw new Error('No s\'ha pogut crear la carpeta del client.');
      Store.update('patients', pid, (x) => { x.folderUrl = res.folderUrl; x.folderId = res.folderId; });
    }
    const dirs = {}, existing = {};
    for (const key of ['assess', 'sessions']) {
      dirs[key] = await b.ensurePath(fid, EXPORT_FOLDERS[key]);
      existing[key] = new Map((await b.children(dirs[key].id)).filter((x) => x.file).map((x) => [x.name.toLowerCase(), x]));
    }
    const files = ExcelSet.plan(d);
    const order = [...files.filter((f) => f.kind !== 'overview'), ...files.filter((f) => f.kind === 'overview')];
    const links = {};
    const out = { uploaded: 0, kept: 0, removed: 0 };
    const stamp = xlStampText();
    for (const f of order) {
      const dir = dirs[f.folder];
      const { bytes, digest } = await f.make(links).build({ stamp });
      const hk = `${dir.id}/${f.name}`;
      const found = existing[f.folder].get(f.name.toLowerCase());
      if (found && !force && hashes[hk] === digest) { links[f.key] = found.webUrl || ''; out.kept++; continue; }
      const item = await b.putFile(dir.id, f.name, bytes);
      hashes[hk] = digest;
      links[f.key] = item.url || (found && found.webUrl) || '';
      out.uploaded++;
    }
    // Fitxers antics d'Excel que ja no corresponen a res (sessió eliminada, canviada de dia, client reanomenat…).
    const wanted = { assess: new Set(), sessions: new Set() };
    for (const f of files) wanted[f.folder].add(f.name.toLowerCase());
    for (const key of Object.keys(dirs)) {
      for (const [name, it] of existing[key]) {
        if (!Names.OWN[key].test(name) || wanted[key].has(name)) continue;
        await b.removeItem(it.id);
        delete hashes[`${dirs[key].id}/${name}`];
        out.removed++;
      }
    }
    // Enllaços per obrir les carpetes i la visió general des de l'app.
    out.sessionsUrl = dirs.sessions.webUrl || '';
    out.assessUrl = dirs.assess.webUrl || '';
    out.overviewUrl = links['O:overview'] || '';
    return out;
  }

  const api = {
    available, enabled,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // Un client té canvis per pujar. urgent: en acabar una sessió o en sortir de l'editor.
    touch(pid, { urgent = false } = {}) {
      if (!pid || !enabled()) return;
      const now = Date.now();
      const q = queue[pid] || { since: now, rev: 0, tries: 0 };
      q.rev++;
      q.tries = 0;
      q.due = urgent ? now + SOON : Math.min(now + DELAY, q.since + MAX_WAIT);
      queue[pid] = q;
      save();
      schedule();
      emit();
    },
    soon(pid) { api.touch(pid, { urgent: true }); },
    // En sortir d'un editor: si aquest client té canvis pendents, es pugen aviat (sense esperar els 20 s).
    flush(pid) {
      const q = queue[pid];
      if (!q || !enabled()) return;
      q.due = Math.min(q.due, Date.now() + SOON);
      save();
      schedule();
    },

    // Es crida des de Store.put en cada canvi.
    onChange(kind, rec) {
      if (!rec || !enabled()) return;
      let pid = '';
      if (kind === 'patients') pid = rec.deleted ? '' : rec.id;
      else if (kind === 'sessions' || kind === 'assessments') pid = rec.patientId;
      else if (kind === 'templates' && rec.kind === 'plan') pid = rec.patientId;
      if (pid) api.touch(pid);
    },

    // Torna a mirar la cua en obrir l'app o en tornar la connexió.
    resume() { schedule(); },
    kick() { for (const q of Object.values(queue)) q.due = Math.min(q.due, Date.now() + 500); save(); schedule(); },

    // Puja ara mateix els Excel d'un client (botó «Sincronitza ara»). Retorna { uploaded, kept, removed }.
    async now(pid, { force = false } = {}) {
      if (!available()) throw new Error('Aquesta versió no té carpeta al núvol.');
      if (running) throw new Error('Ja s\'està pujant un altre client. Torna-ho a provar d\'aquí a un moment.');
      running = pid;
      emit();
      try {
        const res = await syncClient(pid, { force });
        delete queue[pid];
        done[pid] = { at: Date.now(), ...res };
        live.error = ''; live.code = ''; live.pid = '';
        return res;
      } catch (e) {
        live.error = friendly(e); live.code = (e && e.code) || ''; live.pid = pid;
        if (e && e.status === 404 && Store.backend.forgetPaths) Store.backend.forgetPaths();
        throw new Error(live.error);
      } finally {
        running = '';
        save();
        emit();
        schedule();
      }
    },

    // Tots els clients (Configuració › «Sincronitza tots els clients»).
    all({ force = false } = {}) {
      for (const p of Store.all('patients')) {
        const q = queue[p.id] || { since: Date.now(), rev: 0, tries: 0 };
        q.rev++;
        q.due = Date.now() + 500 + Object.keys(queue).length * 300;
        if (force) q.force = true;
        queue[p.id] = q;
      }
      save();
      schedule();
      emit();
    },

    // Estat visible d'un client: off · pendent · pujant · error · al dia · mai
    info(pid) {
      if (!available()) return { state: 'off' };
      if (Store.settings.autoExcel === false) return { state: 'paused', last: done[pid] };
      if (running === pid) return { state: 'running' };
      const q = queue[pid];
      const last = done[pid];
      if (live.error && live.pid === pid) return { state: 'error', error: live.error, code: live.code, last };
      if (q) return { state: 'pending', due: q.due, last };
      return last ? { state: 'ok', last } : { state: 'never' };
    },
    busy() { return running; },
    queued() { return Object.keys(queue).length; },
    // Fa servir als tests per començar de zero.
    reset() { queue = {}; hashes = {}; done = {}; live.error = ''; live.code = ''; live.pid = ''; running = ''; clearTimeout(timer); save(); },
    syncClient,
  };
  return api;
})();

// Enllaços de descàrrega dels Excel (versió local, sense carpeta al núvol) i còpia de tots els fitxers d'un client en un ZIP.
const Exports = {
  folderOf: (f) => EXPORT_FOLDERS[f.folder][0],

  // Un fitxer del conjunt d'un client: { name, bytes }
  async file(pid, key) {
    const d = ExcelSet.data(pid);
    if (!d) throw new Error('No trobo aquest client.');
    const f = ExcelSet.plan(d).find((x) => x.key === key);
    if (!f) throw new Error('No trobo aquest fitxer.');
    const { bytes } = await f.make({}).build({ stamp: xlStampText() });
    return { name: f.name, bytes };
  },

  async download(pid, key) {
    const { name, bytes } = await this.file(pid, key);
    return U.downloadBytes(name, bytes, XlsxDoc.XLSX_MIME) ? name : '';
  },

  // ZIP amb les carpetes Valoracions/ i Sessions/ tal com queden al núvol.
  async zip(pid) {
    const d = ExcelSet.data(pid);
    if (!d) throw new Error('No trobo aquest client.');
    const stamp = xlStampText();
    const out = [];
    const files = ExcelSet.plan(d);
    const links = {};
    for (const f of [...files.filter((x) => x.kind !== 'overview'), ...files.filter((x) => x.kind === 'overview')]) {
      const { bytes } = await f.make(links).build({ stamp });
      out.push({ name: `${EXPORT_FOLDERS[f.folder][0]}/${f.name}`, data: bytes });
    }
    return { name: `eonlife_${Names.client(d.patient)}_${Names.stamp(U.today())}.zip`, bytes: Xlsx.zip(out), count: out.length };
  },

  async downloadZip(pid) {
    const { name, bytes } = await this.zip(pid);
    return U.downloadBytes(name, bytes, 'application/zip') ? name : '';
  },
};
