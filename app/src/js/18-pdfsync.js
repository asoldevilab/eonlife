/* EON Life · els PDF dels informes de cada pacient, a la seva carpeta (Microsoft 365).
   Funciona com la sincronització de l'Excel (09-sync.js): cada canvi d'una valoració, d'una sessió o del pacient deixa un
   avís a una cua que sobreviu al tancament de l'app. Quan fa un temps que no hi ha més canvis, l'app mira què han de
   tenir a «Informes» (18-pdfjobs.js), refà només els PDF que han canviat i els desa amb el mateix nom, substituint
   l'anterior: el fitxer sempre és la versió final. Si una valoració o una sessió s'ha esborrat (o una sessió ja no és
   feta), el seu PDF no s'esborra: es mou a «Informes › Arxiu». Mai es toca cap altre fitxer de la carpeta.
   L'interruptor de pausa és Configuració › «PDF dels informes» (settings.autoPdf). */

const PDF_KEYS = { queue: 'eonlife:pdf:queue', hashes: 'eonlife:pdf:hashes', done: 'eonlife:pdf:done' };

const PdfSync = (() => {
  const DELAY = 60000;      // temps sense canvis abans de fer els PDF (fer-los costa uns segons de la tauleta)
  const MAX_WAIT = 300000;  // com a molt, cada 5 minuts encara que s'estigui editant
  const SOON = 8000;        // en acabar una sessió
  const LEAVE = 15000;      // en sortir d'un editor
  const BACKOFF = [30000, 90000, 180000, 600000];

  const read = (key, fallback) => { try { const v = window.localStorage.getItem(key); return v ? JSON.parse(v) : fallback; } catch (e) { return fallback; } };
  const write = (key, v) => { try { window.localStorage.setItem(key, JSON.stringify(v)); } catch (e) { /* sense emmagatzematge */ } };

  let queue = read(PDF_KEYS.queue, {});     // { pid: { due, since, rev, tries, force? } }
  let hashes = read(PDF_KEYS.hashes, {});   // { «carpeta/nom»: resum del que es va fer }
  let done = read(PDF_KEYS.done, {});       // { pid: { at, made, kept, archived, failed, failedNames, files: [{ folder, name, url }], folderUrl } }
  let timer = null;
  let running = '';
  let own = false;                          // canvi fet per la pròpia feina (no compta com a canvi de dades)
  const live = { error: '', code: '', pid: '', step: '' };
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); if (typeof Store !== 'undefined' && Store.emit) Store.emit(); };
  const saveQueue = () => write(PDF_KEYS.queue, queue);
  const save = () => { saveQueue(); write(PDF_KEYS.hashes, hashes); write(PDF_KEYS.done, done); };

  // Només amb Microsoft 365 (el backend sap pujar, llistar i moure fitxers) i amb el generador de PDF a la pàgina.
  const available = () => typeof Store !== 'undefined' && Store.cloud() && !!Store.backend && typeof Store.backend.putFile === 'function'
    && typeof Store.backend.moveItem === 'function' && PdfSet.can();
  const enabled = () => available() && Store.ready && !Store.error && Store.settings.autoPdf !== false;

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
    // En pausa, sense dades o amb l'app en segon pla: es torna a mirar d'aquí a un moment (fer PDF és feina de la pantalla).
    if (!enabled() || (typeof document !== 'undefined' && document.visibilityState === 'hidden')) { timer = setTimeout(tick, 30000); return; }
    const now = Date.now();
    const next = Object.entries(queue).filter(([, q]) => q.due <= now).sort((a, b) => a[1].due - b[1].due)[0];
    if (!next) { schedule(); return; }
    const [pid, q] = next;
    const rev = q.rev;
    running = pid;
    emit();
    try {
      const res = await syncPatient(pid, { force: !!q.force });
      const cur = queue[pid];
      if (cur && cur.rev !== rev) { cur.due = Date.now() + SOON; cur.tries = 0; delete cur.force; } else delete queue[pid]; // ha canviat alguna cosa mentre es feia
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
    live.step = '';
    save();
    emit();
    schedule();
  }

  function friendly(e) {
    const code = (e && e.code) || '';
    if (code === 'network') return 'Sense connexió: els PDF es faran en tornar-la.';
    if (code === 'login') return 'La sessió de Microsoft ha caducat: torna a entrar perquè es puguin desar els PDF.';
    return (e && e.message) || 'No s\'han pogut desar els PDF.';
  }

  // Fa (o refà) els PDF d'un pacient i els deixa a «Informes». Retorna { made, kept, archived, failed?, failedNames?, files, folderUrl }.
  async function syncPatient(pid, { force = false } = {}) {
    const b = Store.backend;
    const plan = PdfSet.plan(pid);
    if (!plan) return { made: 0, kept: 0, archived: 0, skipped: true, files: [] };
    const folder = await b.ensureFolder(plan.patient);
    const fid = folder && folder.folderId;
    if (!fid) throw new Error('No s\'ha pogut crear la carpeta del pacient.');
    if (fid !== plan.patient.folderId || folder.folderUrl !== plan.patient.folderUrl) {
      own = true; // desar la carpeta a la fitxa no ha de tornar a posar el pacient a la cua
      try { Store.update('patients', pid, (x) => { x.folderUrl = folder.folderUrl; x.folderId = fid; }); } finally { own = false; }
    }
    const root = await b.ensurePath(fid, EXPORT_FOLDERS.reports);
    const dirs = {}, existing = {};
    for (const key of ['reportAssess', 'reportTests', 'reportSessions']) {
      dirs[key] = await b.ensurePath(fid, EXPORT_FOLDERS[key]);
      existing[key] = new Map((await b.children(dirs[key].id)).filter((x) => x.file).map((x) => [x.name.toLowerCase(), x]));
    }
    const out = { made: 0, kept: 0, archived: 0, files: [], madeNames: [], folderUrl: root.webUrl || '' };
    const failed = [];
    const wanted = { reportAssess: new Set(), reportTests: new Set(), reportSessions: new Set() };
    for (const it of plan.items) wanted[it.folder].add(it.name.toLowerCase());
    let n = 0;
    for (const it of plan.items) {
      n++;
      const dir = dirs[it.folder];
      const found = existing[it.folder].get(it.name.toLowerCase());
      const hk = `${dir.id}/${it.name}`;
      if (found && !force && hashes[hk] === it.hash) { out.kept++; out.files.push({ folder: it.folder, name: it.name, url: found.webUrl || '' }); continue; }
      live.pid = pid; live.step = `Fent el PDF ${n} de ${plan.items.length}: ${it.what}…`;
      emit();
      let bytes;
      try {
        bytes = await PdfSet.make(it);
      } catch (e) {
        // Un informe que no es pot dibuixar (dades malmeses) no atura els altres: es deixa anotat i es continua.
        failed.push(it.name);
        continue;
      }
      const res = await b.putFile(dir.id, it.name, bytes, { mime: 'application/pdf' });
      hashes[hk] = it.hash;
      out.made++;
      out.madeNames.push(it.name);
      out.files.push({ folder: it.folder, name: it.name, url: res.url || (found && found.webUrl) || '' });
    }
    // PDF que ja no toquen: els d'una valoració o sessió esborrada, o amb un nom d'abans (la data de la sessió ha canviat…).
    // Només es mouen els que van fer l'app (els recordats a «done» i els de registres esborrats); mai els que va desar algú a mà.
    // Si algun PDF no s'ha pogut fer, no es mou res: millor un PDF antic que cap.
    if (!failed.length) {
      const mine = new Set();
      for (const f of (done[pid] && done[pid].files) || []) mine.add(`${f.folder}/${f.name.toLowerCase()}`);
      for (const d of plan.dropped) mine.add(`${d.folder}/${d.name.toLowerCase()}`);
      let archive = null;
      for (const key of Object.keys(dirs)) {
        for (const [name, it] of existing[key]) {
          if (wanted[key].has(name) || !mine.has(`${key}/${name}`)) continue;
          if (!archive) archive = await b.ensurePath(fid, EXPORT_FOLDERS.reportArchive);
          await b.moveItem(it.id, archive.id);
          delete hashes[`${dirs[key].id}/${it.name}`];
          out.archived++;
        }
      }
    }
    if (failed.length) { out.failed = failed.length; out.failedNames = failed.slice(0, 5); }
    return out;
  }

  const api = {
    available, enabled,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },

    // Un pacient té canvis que poden canviar els seus PDF. urgent: en acabar una sessió.
    touch(pid, { urgent = false, delay = 0 } = {}) {
      if (!pid || !enabled()) return;
      const now = Date.now();
      const q = queue[pid] || { since: now, rev: 0, tries: 0 };
      q.rev++;
      q.tries = 0;
      q.due = urgent ? now + SOON : delay ? now + delay : Math.min(now + DELAY, q.since + MAX_WAIT);
      queue[pid] = q;
      saveQueue();
      schedule();
      emit();
    },
    soon(pid) { api.touch(pid, { urgent: true }); },
    // En sortir d'un editor: si aquest pacient té canvis pendents, es fan aviat (sense esperar el minut sencer).
    flush(pid) {
      const q = queue[pid];
      if (!q || !enabled()) return;
      q.due = Math.min(q.due, Date.now() + LEAVE);
      saveQueue();
      schedule();
    },

    // Es crida des de Store.put en cada canvi.
    onChange(kind, rec) {
      if (own || !rec || !enabled()) return;
      let pid = '';
      if (kind === 'patients') pid = rec.deleted ? '' : rec.id;
      else if (kind === 'sessions' || kind === 'assessments') pid = rec.patientId;
      if (pid) api.touch(pid);
    },

    // Torna a mirar la cua en obrir l'app o en tornar la connexió. No fa res per als que ja hi eren (només s'actua amb canvis).
    resume() { schedule(); },

    // Tots els pacients (Configuració › «Fes ara els PDF de tots els pacients»): només es refà el que ha canviat,
    // o tot si force.
    all({ force = false } = {}) {
      let n = 0;
      for (const p of Store.all('patients')) {
        const q = queue[p.id] || { since: Date.now(), rev: 0, tries: 0 };
        q.rev++;
        q.due = Date.now() + 500 + n * 400;
        q.tries = 0;
        if (force) q.force = true;
        queue[p.id] = q;
        n++;
      }
      save();
      schedule();
      emit();
      return n;
    },

    // Fa ara mateix els PDF d'un pacient (botó «Fes els PDF ara»). Retorna el resum.
    async now(pid, { force = false } = {}) {
      if (!available()) throw new Error('Aquesta versió no té carpeta al núvol.');
      if (running) throw new Error('Ja s\'estan fent els PDF d\'un altre pacient. Torna-ho a provar d\'aquí a un moment.');
      running = pid;
      emit();
      try {
        const res = await syncPatient(pid, { force });
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
        live.step = '';
        save();
        emit();
        schedule();
      }
    },

    // Estat visible d'un pacient: off · paused · running · error · pending · partial · ok · never
    info(pid) {
      if (!available()) return { state: 'off' };
      if (Store.settings.autoPdf === false) return { state: 'paused', last: done[pid] };
      if (running === pid) return { state: 'running', step: live.step };
      const q = queue[pid];
      const last = done[pid];
      if (live.error && live.pid === pid) return { state: 'error', error: live.error, code: live.code, last };
      if (q) return { state: 'pending', due: q.due, last };
      if (last && last.failed) return { state: 'partial', last };
      return last ? { state: 'ok', last } : { state: 'never' };
    },
    busy() { return running; },
    queued() { return Object.keys(queue).length; },
    // Fa ara mateix tot el que hi ha a la cua (una passada per pacient).
    async drain() {
      for (const pid of Object.keys(queue)) {
        if (queue[pid]) queue[pid].due = 0;
        await tick();
      }
    },
    // Els tests comencen de zero.
    reset() { queue = {}; hashes = {}; done = {}; live.error = ''; live.code = ''; live.pid = ''; live.step = ''; running = ''; clearTimeout(timer); save(); },
    syncPatient,
  };
  return api;
})();
