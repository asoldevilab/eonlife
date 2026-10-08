/* EON Life · sincronització de l'Excel del client amb la seva carpeta (Microsoft 365).
   Cada cop que es canvia alguna cosa d'un pacient (dades, valoració, sessió o pla) es deixa un avís a una cua que
   sobreviu al tancament de l'app. Passats uns segons sense més canvis, l'app torna a fer l'Excel d'aquell pacient
   (seguiment_<client>_01.xlsx, a l'arrel de la seva carpeta: un full per mes amb les sessions i les valoracions) i
   només el puja si ha canviat (substituint el fitxer anterior, sense còpies repetides).
   Els Excel antics fets per l'app que ja no toquen (els d'abans de l'Excel únic, a «Sessions» i «Valoracions», o el
   d'un pacient reanomenat) es treuen de la carpeta (queden a la paperera de reciclatge). Mai es toca cap altre fitxer:
   només els que tenen el nom d'un Excel fet per l'app. */

const SYNC_KEYS = { queue: 'eonlife:sync:queue', hashes: 'eonlife:sync:hashes', done: 'eonlife:sync:done', day: 'eonlife:sync:day', format: 'eonlife:sync:format' };

const Sync = (() => {
  const DELAY = 20000;     // temps sense canvis abans de pujar
  const MAX_WAIT = 120000; // com a molt, es puja cada 2 minuts encara que s'estigui editant
  const SOON = 2500;       // en acabar una sessió o sortir de l'editor
  const BACKOFF = [20000, 60000, 120000, 300000];
  const FORMAT = 2;        // forma dels Excel (2 = un sol Excel per client). Quan canvia, es refan els de tots els clients.

  const read = (key, fallback) => { try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const write = (key, v) => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sense emmagatzematge */ } };

  let queue = read(SYNC_KEYS.queue, {});       // { pid: { due, since, rev, tries, force?, time? } }
  let hashes = read(SYNC_KEYS.hashes, {});     // { «carpeta/nom»: resum del contingut que es va pujar }
  let done = read(SYNC_KEYS.done, {});         // { pid: { at, uploaded, kept, removed } }
  let timer = null;
  let running = '';                            // client que s'està sincronitzant
  let own = false;                             // canvi fet per la pròpia sincronització (no compta com a canvi de dades)
  const live = { error: '', code: '', pid: '' };
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); if (typeof Store !== 'undefined' && Store.emit) Store.emit(); };
  const saveQueue = () => write(SYNC_KEYS.queue, queue); // (només la cua, que és petita: es crida a cada canvi de dades)
  const save = () => { saveQueue(); write(SYNC_KEYS.hashes, hashes); write(SYNC_KEYS.done, done); };

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
      const res = await syncClient(pid, { force: !!q.force, only: q.time ? 'time' : '' });
      const cur = queue[pid];
      if (cur && cur.rev !== rev) { cur.due = Date.now() + SOON; cur.tries = 0; delete cur.force; delete cur.time; } else delete queue[pid]; // ha canviat alguna cosa mentre es pujava
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

  // Fa (o refà) l'Excel d'un client i el deixa a la seva carpeta. Retorna { uploaded, kept, removed }.
  // only: 'time' = refresc diari: només es refà el que depèn de la data d'avui (ara, l'Excel del client sencer).
  async function syncClient(pid, { force = false, only = '' } = {}) {
    const b = Store.backend;
    const d = ExcelSet.data(pid);
    if (!d || d.patient.deleted) return { uploaded: 0, kept: 0, removed: 0, skipped: true };
    // La carpeta del client: si no n'hi ha, es crea; si algú l'ha esborrat o canviat de lloc, es torna a trobar o a fer.
    const folder = await b.ensureFolder(d.patient);
    const fid = folder && folder.folderId;
    if (!fid) throw new Error('No s\'ha pogut crear la carpeta del pacient.');
    if (fid !== d.patient.folderId || folder.folderUrl !== d.patient.folderUrl) {
      own = true; // desar la carpeta a la fitxa no ha de posar el client altre cop a la cua
      try { Store.update('patients', pid, (x) => { x.folderUrl = folder.folderUrl; x.folderId = fid; }); } finally { own = false; }
    }
    // L'Excel va a l'arrel de la carpeta del client; «Sessions» i «Valoracions» (on van els PDF i els vídeos) es fan
    // igualment perquè la carpeta tingui sempre la mateixa forma, i s'hi miren els Excel d'abans per retirar-los.
    const list = async (id) => new Map((await b.children(id)).filter((x) => x.file).map((x) => [x.name.toLowerCase(), x]));
    const dirs = { root: { id: fid, webUrl: folder.folderUrl || '' } }, existing = { root: await list(fid) };
    for (const key of ['assess', 'sessions']) {
      dirs[key] = await b.ensurePath(fid, EXPORT_FOLDERS[key]);
      existing[key] = await list(dirs[key].id);
    }
    const files = ExcelSet.plan(d);
    const links = {};
    const out = { uploaded: 0, kept: 0, removed: 0 };
    const failed = [];
    const stamp = xlStampText();
    for (const f of files) {
      const dir = dirs[f.folder];
      const found = existing[f.folder].get(f.name.toLowerCase());
      if (only === 'time' && !force && found && !f.timed) { links[f.key] = found.webUrl || ''; out.kept++; continue; }
      // Un Excel que no es pot fer (dades malmeses) no ha d'aturar els altres: es deixa anotat i es continua.
      let built;
      try { built = await f.make(links).build({ stamp }); } catch (e) { failed.push(f.name); continue; }
      const { bytes, digest } = built;
      const hk = `${dir.id}/${f.name}`;
      if (found && !force && hashes[hk] === digest) { links[f.key] = found.webUrl || ''; out.kept++; continue; }
      const item = await b.putFile(dir.id, f.name, bytes);
      hashes[hk] = digest;
      links[f.key] = item.url || (found && found.webUrl) || '';
      out.uploaded++;
    }
    // Excel antics fets per l'app que ja no corresponen a res (els d'abans de l'Excel únic, client reanomenat…).
    // Si l'Excel nou no s'ha pogut fer, no es treu res: millor un Excel antic que cap.
    const wanted = { root: new Set(), assess: new Set(), sessions: new Set() };
    for (const f of files) wanted[f.folder].add(f.name.toLowerCase());
    if (!failed.length) {
      for (const key of Object.keys(dirs)) {
        for (const [name, it] of existing[key]) {
          if (!Names.OWN[key].test(name) || wanted[key].has(name)) continue;
          await b.removeItem(it.id);
          delete hashes[`${dirs[key].id}/${name}`];
          out.removed++;
        }
      }
    }
    if (failed.length) { out.failed = failed.length; out.failedNames = failed.slice(0, 5); }
    // Enllaços per obrir l'Excel i les carpetes des de l'app.
    out.fileUrl = links['C:client'] || '';
    out.sessionsUrl = dirs.sessions.webUrl || '';
    out.assessUrl = dirs.assess.webUrl || '';
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
      delete q.time; // un canvi de dades demana la passada sencera
      q.due = urgent ? now + SOON : Math.min(now + DELAY, q.since + MAX_WAIT);
      queue[pid] = q;
      saveQueue();
      schedule();
      emit();
    },
    soon(pid) { api.touch(pid, { urgent: true }); },
    // En sortir d'un editor: si aquest client té canvis pendents, es pugen aviat (sense esperar els 20 s).
    flush(pid) {
      const q = queue[pid];
      if (!q || !enabled()) return;
      q.due = Math.min(q.due, Date.now() + SOON);
      saveQueue();
      schedule();
    },

    // Es crida des de Store.put en cada canvi.
    onChange(kind, rec) {
      if (own || !rec || !enabled()) return;
      let pid = '';
      if (kind === 'patients') pid = rec.deleted ? '' : rec.id;
      else if (kind === 'sessions' || kind === 'assessments') pid = rec.patientId;
      else if (kind === 'templates' && rec.kind === 'plan') pid = rec.patientId;
      if (pid) api.touch(pid);
    },

    // Torna a mirar la cua en obrir l'app o en tornar la connexió.
    resume() { schedule(); api.upgrade(); api.daily(); },

    // Primera obertura d'una versió que fa els Excel d'una altra forma: es refan els de tots els clients (i es retiren
    // els d'abans), sense esperar que algú en toqui les dades.
    upgrade() {
      if (!enabled() || read(SYNC_KEYS.format, 0) === FORMAT) return false;
      write(SYNC_KEYS.format, FORMAT);
      api.all();
      return true;
    },

    // Les dades no canvien soles, però la data sí: «Sense tancar», «la propera sessió» o el calendari del mes depenen d'avui.
    // Un cop al dia es refà (només el que depèn de la data) el que toca als clients amb sessions fetes o per fer en els últims 45 dies.
    daily() {
      if (!enabled()) return 0;
      const today = U.today();
      if (read(SYNC_KEYS.day, '') === today) return 0;
      write(SYNC_KEYS.day, today);
      const since = U.addDays(today, -45);
      const active = new Set();
      for (const s of Store.all('sessions')) if (s.patientId && s.date >= since) active.add(s.patientId);
      for (const t of Store.templates()) {
        if (t.kind !== 'plan' || !t.patientId || t.deleted) continue;
        const dates = Calc.planDates(t).filter(Boolean);
        if (dates.length && dates[dates.length - 1] >= since) active.add(t.patientId);
      }
      let n = 0;
      for (const p of Store.all('patients')) {
        if (!p.folderId || !active.has(p.id) || queue[p.id]) continue;
        queue[p.id] = { since: Date.now(), rev: 0, tries: 0, time: true, due: Date.now() + 4000 + n * 1500 };
        n++;
      }
      if (n) { save(); schedule(); emit(); }
      return n;
    },
    kick() { for (const q of Object.values(queue)) q.due = Math.min(q.due, Date.now() + 500); saveQueue(); schedule(); },

    // Puja ara mateix els Excel d'un client (botó «Sincronitza ara»). Retorna { uploaded, kept, removed }.
    async now(pid, { force = false } = {}) {
      if (!available()) throw new Error('Aquesta versió no té carpeta al núvol.');
      if (running) throw new Error('Ja s\'està pujant un altre pacient. Torna-ho a provar d\'aquí a un moment.');
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
        delete q.time;
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
      if (last && last.failed) return { state: 'partial', last };
      return last ? { state: 'ok', last } : { state: 'never' };
    },
    busy() { return running; },
    queued() { return Object.keys(queue).length; },
    // Fa ara mateix tot el que hi ha a la cua (una passada per client).
    async drain() {
      for (const pid of Object.keys(queue)) {
        if (queue[pid]) queue[pid].due = 0;
        await tick();
      }
    },
    // Fa servir als tests per començar de zero.
    reset() { queue = {}; hashes = {}; done = {}; live.error = ''; live.code = ''; live.pid = ''; running = ''; clearTimeout(timer); write(SYNC_KEYS.day, ''); write(SYNC_KEYS.format, 0); save(); },
    syncClient,
  };
  return api;
})();

// Descàrrega de l'Excel del client (versió local, sense carpeta al núvol, o per tenir-ne una còpia).
const Exports = {
  // L'Excel del client: { name, bytes }
  async file(pid, key = 'C:client') {
    const d = ExcelSet.data(pid);
    if (!d) throw new Error('No trobo aquest pacient.');
    const f = ExcelSet.plan(d).find((x) => x.key === key);
    if (!f) throw new Error('No trobo aquest fitxer.');
    const { bytes } = await f.make({}).build({ stamp: xlStampText() });
    return { name: f.name, bytes };
  },

  // Retorna { name, status } (status: 'saved', 'declined' o 'failed', vegeu U.saveFile).
  async download(pid, key = 'C:client') {
    const { name, bytes } = await this.file(pid, key);
    return { name, status: await U.downloadBytes(name, bytes, XlsxDoc.XLSX_MIME) };
  },
};
