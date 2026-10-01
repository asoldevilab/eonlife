/* EON Life · dades: magatzem en memòria + desament automàtic.
   Tres modes:
   · Google        → quan l'app s'obre des de Google Apps Script: les dades van al full de càlcul del centre
                     (una fila per registre, amb columnes llegibles) i els vídeos/PDF a la carpeta Drive del client.
   · Microsoft 365 → quan s'obre la versió publicada per al centre (09-m365.js): les dades van a l'Excel de la
                     carpeta compartida de OneDrive/SharePoint i els vídeos a la carpeta de cada client.
   · Local         → quan s'obre el fitxer directament: les dades es guarden en aquest navegador (mode prova). */

const KINDS = ['patients', 'assessments', 'sessions', 'exercises', 'templates'];
const LOCAL_KEY = 'eonlife:data:v1';

function hasGoogle() {
  return typeof google !== 'undefined' && google && google.script && google.script.run;
}

const GoogleBackend = {
  mode: 'google',
  call(action, payload = {}) {
    return new Promise((resolve, reject) => {
      google.script.run
        .withSuccessHandler((res) => {
          if (res && res.ok) resolve(res.data);
          else reject(new Error((res && res.error) || 'Error desconegut del servidor.'));
        })
        .withFailureHandler((err) => reject(new Error((err && err.message) || String(err))))
        .api({ action, ...payload });
    });
  },
  async init() {
    const data = await this.call('bootstrap');
    return { records: data.records || {}, meta: { user: data.user || '', spreadsheetUrl: data.spreadsheetUrl || '', rootFolderUrl: data.rootFolderUrl || '' } };
  },
  save(kind, record, flat, log) { return this.call('upsert', { kind, record, flat, log }); },
  ensureFolder(patient) { return this.call('ensureFolder', { patient: { id: patient.id, firstName: patient.firstName, lastName: patient.lastName, folderId: patient.folderId || '' } }); },
  listFiles(folderId) { return this.call('listFiles', { folderId }); },
};

const LocalBackend = {
  mode: 'local',
  db: null,
  persistent: true,
  load() {
    try {
      const raw = window.localStorage.getItem(LOCAL_KEY);
      return raw ? JSON.parse(raw) : null;
    } catch (e) {
      this.persistent = false;
      return null;
    }
  },
  // Es desa a l'instant: la cua de Store ja agrupa les pulsacions de cada registre, i així
  // tancar o recarregar la pàgina just després d'un canvi no el perd.
  persist() {
    try {
      window.localStorage.setItem(LOCAL_KEY, JSON.stringify(this.db));
      this.persistent = true;
    } catch (e) {
      this.persistent = false;
    }
  },
  async init() {
    let db = this.load();
    let demo = false;
    if (!db) {
      db = makeDemoData();
      demo = true;
    }
    for (const k of KINDS) db[k] = db[k] || {};
    if (db.demo) migrateDemo(db);
    this.db = db;
    this.persist();
    return { records: db, meta: { demo: demo || !!db.demo, persistent: this.persistent } };
  },
  async save(kind, record) {
    const now = new Date().toISOString();
    const rec = { ...record, updatedAt: now };
    if (kind === 'settings') this.db.settings = rec;
    else this.db[kind][rec.id] = rec;
    this.persist();
    return { id: rec.id, updatedAt: now, updatedBy: '' };
  },
  async ensureFolder() { return null; },
  async listFiles() { return []; },
  reset(withDemo) {
    this.db = withDemo ? makeDemoData() : { patients: {}, assessments: {}, sessions: {}, exercises: {}, templates: {}, settings: null, demo: false };
    for (const k of KINDS) this.db[k] = this.db[k] || {};
    this.persist();
  },
};

// Les dades de prova d'abans portaven professionals ficticis: es canvien pels de l'equip.
function migrateDemo(db) {
  const rename = { 'Pau Roca': 'Arnau', 'Marta Soler': 'Richy' };
  for (const k of ['patients', 'assessments', 'sessions']) {
    for (const r of Object.values(db[k] || {})) if (rename[r.professional]) r.professional = rename[r.professional];
  }
  const st = db.settings;
  if (st && Array.isArray(st.professionals) && st.professionals.every((n) => rename[n])) st.professionals = [...CENTER_PROFESSIONALS];
  const svc = { 'P-DEMO-LAURA': 'membership', 'P-DEMO-JORDI': 'membership', 'P-DEMO-MONTSE': 'membership', 'P-DEMO-ALEX': 'valoracio' };
  for (const [id, v] of Object.entries(svc)) if (db.patients[id] && !db.patients[id].service) db.patients[id].service = v;
}

const Store = {
  backend: null,
  ready: false,
  error: null,
  errorCode: '',
  meta: {},
  version: 0,
  data: { patients: {}, assessments: {}, sessions: {}, exercises: {}, templates: {} },
  settings: defaultSettings(),
  listeners: new Set(),
  timers: {},
  inflight: {},
  again: new Set(),
  dirty: new Set(),
  saveError: null,
  saveErrorCode: '',
  lastSaved: null,
  rev: {},

  // Dades compartides al núvol (Google o Microsoft 365)?
  cloud() { return this.meta.mode === 'google' || this.meta.mode === 'm365'; },
  cloudName() { return this.meta.mode === 'google' ? 'Google Drive' : this.meta.mode === 'm365' ? 'Microsoft 365' : ''; },

  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
  emit() { this.version++; for (const fn of this.listeners) fn(this.version); },

  async init() {
    this.backend = hasGoogle() ? GoogleBackend : (typeof M365 !== 'undefined' && M365.available()) ? M365Backend : LocalBackend;
    this.error = null;
    this.errorCode = '';
    try {
      const { records, meta } = await this.backend.init();
      this.meta = { ...meta, mode: this.backend.mode };
      for (const k of KINDS) {
        const src = records[k] || {};
        const list = Array.isArray(src) ? src : Object.values(src);
        this.data[k] = Object.fromEntries(list.filter((r) => r && r.id).map((r) => [r.id, r]));
      }
      const st = records.settings && (Array.isArray(records.settings) ? records.settings[0] : records.settings);
      this.settings = { ...defaultSettings(), ...(st || {}) };
      this.settings.blocks = BLOCKS.map((b) => ({ key: b.key, name: b.name, desc: b.desc, ...((this.settings.blocks || []).find((x) => x.key === b.key) || {}) }));
      this.ready = true;
      this.replayOutbox();
    } catch (err) {
      this.error = err.message || String(err);
      this.errorCode = err.code || '';
    }
    this.emit();
  },

  // Canvis que no s'havien pogut desar (sense connexió, sessió caducada, pàgina tancada): es tornen a enviar.
  replayOutbox() {
    if (!this.backend.outbox) return;
    for (const [key, rec] of Object.entries(Outbox.all())) {
      const [kind, id] = key.split(/:(.+)/);
      if (!rec || !id) { Outbox.drop(key); continue; }
      if (kind === 'settings') this.settings = { ...this.settings, ...rec };
      else if (this.data[kind]) this.data[kind][id] = rec;
      else { Outbox.drop(key); continue; }
      this.queue(kind, id, 300);
    }
  },

  // ── Lectura ──
  get(kind, id) {
    if (kind === 'exercises') return this.exercise(id);
    if (kind === 'templates') return this.templates().find((t) => t.id === id) || null;
    const r = this.data[kind][id];
    return r && !r.deleted ? r : null;
  },
  all(kind) { return Object.values(this.data[kind]).filter((r) => !r.deleted); },
  byPatient(kind, pid) { return this.all(kind).filter((r) => r.patientId === pid); },

  patients() { return U.sortBy(this.all('patients'), (p) => U.norm(`${p.lastName} ${p.firstName}`)); },
  sessionsOf(pid) { return U.sortBy(this.byPatient('sessions', pid), (s) => `${s.date}#${String(U.num(s.number) || 0).padStart(4, '0')}`); },
  assessmentsOf(pid) { return U.sortBy(this.byPatient('assessments', pid), 'date'); },

  // Biblioteca = exercicis de base + canvis i exercicis nous desats.
  exercises() {
    const stored = this.data.exercises;
    const out = [];
    for (const e of SEED_EXERCISES) {
      const s = stored[e.id];
      if (s && s.deleted) continue;
      out.push(s ? { ...e, ...s } : e);
    }
    for (const s of Object.values(stored)) if (!s.deleted && !SEED_EXERCISES.some((e) => e.id === s.id)) out.push(s);
    return out;
  },
  exercise(id) { return this.exercises().find((e) => e.id === id) || null; },
  templates() {
    const stored = this.data.templates;
    const out = [];
    for (const t of SEED_TEMPLATES) {
      const s = stored[t.id];
      if (s && s.deleted) continue;
      out.push(s ? { ...t, ...s } : t);
    }
    for (const s of Object.values(stored)) if (!s.deleted && !SEED_TEMPLATES.some((t) => t.id === s.id)) out.push(s);
    return out;
  },
  professionals() {
    const set = new Set(this.settings.professionals || []);
    for (const p of this.all('patients')) if (p.professional) set.add(p.professional);
    return [...set].filter(Boolean).sort((a, b) => a.localeCompare(b, 'ca'));
  },

  // ── Escriptura ──
  put(kind, record, opts = {}) {
    const rec = { ...record };
    this.data[kind][rec.id] = rec;
    this.emit();
    this.queue(kind, rec.id, opts.immediate ? 0 : 900);
    return rec;
  },
  update(kind, id, fn) {
    const cur = kind === 'exercises' ? this.exercise(id) : kind === 'templates' ? this.get('templates', id) : this.data[kind][id];
    if (!cur) return null;
    const next = U.clone(cur);
    fn(next);
    return this.put(kind, next);
  },
  remove(kind, id) {
    const cur = kind === 'exercises' ? this.exercise(id) : kind === 'templates' ? this.get('templates', id) : this.data[kind][id];
    if (!cur) return;
    this.put(kind, { ...cur, deleted: true }, { immediate: true });
    if (kind === 'patients') {
      for (const k of ['assessments', 'sessions']) {
        for (const r of this.byPatient(k, id)) this.put(k, { ...r, deleted: true }, { immediate: true });
      }
    }
  },
  saveSettings(next) {
    this.settings = { ...this.settings, ...next, id: 'settings' };
    this.emit();
    this.queue('settings', 'settings', 600);
  },

  // ── Cua de desament (per registre, amb reintents) ──
  queue(kind, id, delay) {
    const key = `${kind}:${id}`;
    clearTimeout(this.timers[key]);
    this.dirty.add(key);
    this.rev[key] = (this.rev[key] || 0) + 1;
    if (this.backend && this.backend.outbox) {
      const rec = kind === 'settings' ? this.settings : this.data[kind] && this.data[kind][id];
      if (rec) Outbox.put(key, rec);
    }
    this.timers[key] = setTimeout(() => this.flush(kind, id), delay);
  },
  flushAll() {
    for (const key of [...this.dirty]) {
      const [kind, id] = key.split(/:(.+)/);
      clearTimeout(this.timers[key]);
      this.flush(kind, id);
    }
  },
  pending() { return this.dirty.size + Object.keys(this.inflight).length; },

  flush(kind, id) {
    const key = `${kind}:${id}`;
    if (this.inflight[key]) { this.again.add(key); return; }
    const rec = kind === 'settings' ? this.settings : this.data[kind][id];
    this.dirty.delete(key);
    if (!rec) return;
    let flat = {}, log = null;
    try {
      if (kind === 'patients') flat = Flat.patient(rec);
      else if (kind === 'assessments') flat = Flat.assessment(rec, this.data.patients[rec.patientId]);
      else if (kind === 'sessions') {
        flat = Flat.session(rec, this.data.patients[rec.patientId], this.settings);
        log = Flat.sessionLog(rec, this.data.patients[rec.patientId], this.settings);
      } else if (kind === 'exercises') flat = Flat.exercise(rec);
      else if (kind === 'templates') flat = Flat.template(rec);
    } catch (e) {
      flat = {};
    }
    this.emit();
    const rev = this.rev[key];
    this.inflight[key] = this.backend.save(kind, rec, flat, log)
      .then((res) => {
        const cur = kind === 'settings' ? this.settings : this.data[kind][id];
        if (cur && res) { cur.updatedAt = res.updatedAt; cur.updatedBy = res.updatedBy; }
        if (this.backend.outbox && this.rev[key] === rev && !this.dirty.has(key)) Outbox.drop(key);
        this.saveError = null;
        this.saveErrorCode = '';
        this.lastSaved = Date.now();
      })
      .catch((err) => {
        this.saveError = err.message || String(err);
        this.saveErrorCode = err.code || '';
        this.dirty.add(key);
        clearTimeout(this.timers[key]);
        this.timers[key] = setTimeout(() => this.flush(kind, id), 6000);
      })
      .finally(() => {
        delete this.inflight[key];
        if (this.again.has(key)) { this.again.delete(key); this.flush(kind, id); }
        this.emit();
      });
  },

  // ── Operacions de domini ──
  newPatient(fields = {}) {
    const p = {
      id: U.uid('P'), firstName: '', lastName: '', birthDate: '', sex: '', email: '', phone: '',
      service: 'valoracio', profile: '', professional: this.settings.professionals[0] || '', status: 'actiu', startDate: U.today(),
      goal: '', reason: '', history: '', surgeryDate: '', surgeryNote: '', injuryDate: '', injuryNote: '',
      folderUrl: '', folderId: '', notes: '', createdAt: new Date().toISOString(), ...fields,
    };
    return this.put('patients', p, { immediate: true });
  },

  newAssessment(pid, opts = {}) {
    const p = this.get('patients', pid);
    const prev = this.assessmentsOf(pid);
    const last = prev[prev.length - 1];
    const date = opts.date || U.today();
    const a = {
      id: U.uid('V'), patientId: pid, date, type: opts.type || (prev.length ? 'retest' : 'inicial'),
      professional: (p && p.professional) || '',
      general: { weight: last && last.general ? last.general.weight : '', height: last && last.general ? last.general.height : '', goal: (p && p.goal) || '' },
      values: {}, ybt: { d: {}, e: {} }, jumps: { attempts: [], readiness: '' },
      encoder: { rows: [{ id: U.uid('R'), name: 'Squat' }, { id: U.uid('R'), name: 'RDL' }, { id: U.uid('R'), name: 'Hip Thrust' }] },
      bike: {}, patterns: {}, free: [], conclusions: {},
      // Un control de mesures no mou la data del proper re-test.
      nextRetest: opts.type === 'control' && last ? (last.nextRetest || U.addMonths(last.date, T.retestMonths)) : U.addMonths(date, T.retestMonths),
      createdAt: new Date().toISOString(),
    };
    return this.put('assessments', a, { immediate: true });
  },

  emptyBlocks() { return BLOCKS.map((b) => ({ key: b.key, focus: '', note: '', items: [] })); },

  nextSessionNumber(pid) {
    const nums = this.byPatient('sessions', pid).map((s) => U.num(s.number)).filter((n) => n != null);
    return nums.length ? Math.max(...nums) + 1 : 1;
  },

  // mode: 'blank' | 'last' | template id
  newSession(pid, { date, mode = 'blank', templateId = null } = {}) {
    const p = this.get('patients', pid);
    let blocks = this.emptyBlocks();
    let goal = '';
    let pillar = '';
    if (mode === 'last') {
      const last = this.sessionsOf(pid).filter((s) => s.date <= (date || U.today())).pop() || this.sessionsOf(pid).pop();
      if (last) {
        blocks = cloneBlocks(last.blocks, true);
        goal = last.goal || '';
        pillar = last.pillar || '';
      }
    } else if (mode === 'template' && templateId) {
      const t = this.get('templates', templateId);
      if (t && t.kind === 'session') {
        blocks = this.emptyBlocks().map((b) => {
          const tb = (t.blocks || []).find((x) => x.key === b.key);
          return tb ? cloneBlock(tb, b.key) : b;
        });
        goal = t.goal || '';
      }
    }
    const s = {
      id: U.uid('S'), patientId: pid, date: date || U.today(), number: this.nextSessionNumber(pid),
      professional: (p && p.professional) || '', goal, pillar, status: 'planificada',
      readiness: {}, blocks, feedback: {}, createdAt: new Date().toISOString(),
    };
    return this.put('sessions', s, { immediate: true });
  },

  duplicateSession(sid, date) {
    const s = this.get('sessions', sid);
    if (!s) return null;
    const copy = {
      ...U.clone(s), id: U.uid('S'), date: date || U.today(), number: this.nextSessionNumber(s.patientId),
      status: 'planificada', readiness: {}, feedback: {}, blocks: cloneBlocks(s.blocks, true), createdAt: new Date().toISOString(),
    };
    delete copy.updatedAt; delete copy.updatedBy;
    return this.put('sessions', copy, { immediate: true });
  },

  saveBlockTemplate(block, name) {
    const t = { id: U.uid('T'), kind: 'block', block: block.key, name, focus: block.focus || '', desc: '', items: cloneItems(block.items, true) };
    if (block.groups && block.groups.length) t.groups = U.clone(block.groups);
    return this.put('templates', t, { immediate: true });
  },

  saveSessionTemplate(session, name) {
    const t = { id: U.uid('T'), kind: 'session', name, goal: session.goal || '',
      blocks: (session.blocks || []).map((b) => cloneBlock(b, b.key, true)) };
    return this.put('templates', t, { immediate: true });
  },

  // Exportació completa (còpia de seguretat).
  exportAll() {
    return JSON.stringify({
      app: 'EON Life', version: 1, exportedAt: new Date().toISOString(),
      patients: this.all('patients'), assessments: this.all('assessments'), sessions: this.all('sessions'),
      exercises: Object.values(this.data.exercises), templates: Object.values(this.data.templates), settings: this.settings,
    }, null, 1);
  },

  importAll(json) {
    const d = JSON.parse(json);
    if (!d || d.app !== 'EON Life') throw new Error('Aquest fitxer no és una còpia de seguretat d\'EON Life.');
    let n = 0;
    for (const k of KINDS) {
      for (const r of d[k] || []) {
        if (!r || !r.id) continue;
        this.put(k, r, { immediate: true });
        n++;
      }
    }
    if (d.settings) this.saveSettings(d.settings);
    return n;
  },
};

// Còpia dels exercicis per a una sessió nova o una plantilla (resetDone): sense «fet», sense el registre
// de l'encoder i sense el vídeo del client, que són d'aquell dia.
function cloneItems(items, resetDone) {
  return (items || []).map((it) => {
    const c = { ...U.clone(it), id: U.uid('I') };
    if (resetDone) { c.done = false; delete c.vbt; delete c.video; }
    return c;
  });
}

// Un bloc copiat (focus, nota, subblocs i exercicis).
function cloneBlock(src, key, resetDone) {
  const b = { key, focus: (src && src.focus) || '', note: (src && src.note) || '', items: cloneItems(src && src.items, resetDone) };
  if (src && src.groups && src.groups.length) b.groups = U.clone(src.groups);
  return b;
}

function cloneBlocks(blocks, resetDone) {
  const byKey = Object.fromEntries((blocks || []).map((b) => [b.key, b]));
  return BLOCKS.map((b) => cloneBlock(byKey[b.key], b.key, resetDone));
}
