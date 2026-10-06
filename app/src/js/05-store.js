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
    let demoRemoved = 0;
    if (!db) {
      db = NO_DEMO ? emptyLocalDb() : makeDemoData();
      demo = !NO_DEMO;
    }
    for (const k of KINDS) db[k] = db[k] || {};
    // Els clients de prova que s'havien carregat sols marxen; si algú els torna a carregar des de Configuració, es queden.
    if (NO_DEMO && db.demo && !db.demoLoaded) demoRemoved = removeDemoClients(db);
    if (db.demo) migrateDemo(db);
    this.db = db;
    this.persist();
    if (NO_DEMO) {
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* res */ }
    }
    return { records: db, meta: { demo: demo || !!db.demo, persistent: this.persistent, demoRemoved } };
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
    this.db = withDemo ? { ...makeDemoData(), demoLoaded: true } : emptyLocalDb();
    for (const k of KINDS) this.db[k] = this.db[k] || {};
    this.persist();
  },
};

function emptyLocalDb() {
  return { patients: {}, assessments: {}, sessions: {}, exercises: {}, templates: {}, settings: null, demo: false };
}

// Treu els clients ficticis (P-DEMO-…) i el que hi penja: valoracions, sessions i plans. La biblioteca
// d'exercicis, les plantilles, la configuració i els clients reals es queden. Torna quants clients ha tret.
function removeDemoClients(db) {
  const isDemo = (id) => /^P-DEMO-/.test(String(id || ''));
  let n = 0;
  for (const id of Object.keys(db.patients || {})) if (isDemo(id)) { delete db.patients[id]; n++; }
  for (const k of ['assessments', 'sessions', 'templates']) {
    for (const [id, r] of Object.entries(db[k] || {})) if (r && isDemo(r.patientId)) delete db[k][id];
  }
  db.demo = false;
  return n;
}

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
  // Dades de prova d'abans del pla d'entrenament i de l'encoder.
  for (const s of Object.values(db.sessions || {})) {
    if (s.patientId !== 'P-DEMO-LAURA' || s.status !== 'feta') continue;
    for (const b of s.blocks || []) for (const it of b.items || []) if (it.exId === 'X-FOR-01' && !it.vbt && U.num(it.load)) it.vbt = demoVbt(U.num(it.load));
  }
  if (typeof addDemoPlan === 'function') addDemoPlan(db, U.today());
  if (typeof addDemoProfiles === 'function') addDemoProfiles(db);
  // Tests que el centre ja no fa (retired al catàleg) i l'encoder de la valoració: fora de les valoracions de prova.
  const retired = Object.values(TEST_INDEX).filter((t) => t.retired).map((t) => t.id);
  for (const a of Object.values(db.assessments || {})) {
    if (!/^P-DEMO-/.test(String(a.patientId || ''))) continue;
    for (const id of retired) if (a.values) delete a.values[id];
    if (a.encoder) a.encoder.rows = [];
  }
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
      if (typeof Sync !== 'undefined') Sync.resume();
      if (meta.demoRemoved) setTimeout(() => UI.toast('S\'han esborrat els clients de prova. Ja podeu afegir els vostres.'), 400);
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
  methods(block) {
    const all = this.templates().filter((t) => t.kind === 'method');
    return block ? all.filter((t) => !(t.blocks || []).length || t.blocks.includes(block)) : all;
  },
  // Exercicis d'una família de progressió, del nivell més fàcil al més difícil.
  ladder(family) {
    if (!family) return [];
    const f = U.norm(family);
    return U.sortBy(this.exercises().filter((e) => e.family && U.norm(e.family) === f), (e) => `${String(U.num(e.level) ?? 9)}#${e.name}`);
  },
  families() {
    const out = {};
    for (const e of this.exercises()) if (e.family) (out[e.family] = out[e.family] || []).push(e);
    return out;
  },
  // Exercici del nivell següent (dir = 1) o anterior (dir = -1) de la mateixa família.
  stepLevel(ex, dir) {
    if (!ex || !ex.family) return null;
    const list = this.ladder(ex.family);
    const i = list.findIndex((e) => e.id === ex.id);
    if (i < 0) return null;
    return list[i + dir] || null;
  },
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
  // Material: el del centre (Configuració) i després el petit material general.
  materials() {
    const center = this.settings.materials && this.settings.materials.length ? this.settings.materials : CENTER_MATERIALS;
    return { center: [...center], other: OPT.material.filter((m) => !center.includes(m)) };
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
    // L'Excel del client (sessions i valoracions) es refà sol (09-sync.js).
    if (typeof Sync !== 'undefined') Sync.onChange(kind, rec);
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
      service: 'valoracio', professional: this.settings.professionals[0] || '', status: 'actiu', startDate: U.today(),
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
      // Pes i alçada: els de la fitxa del client (o, si no n'hi ha, els de l'última valoració).
      general: { weight: (p && p.weight) || (last && last.general ? last.general.weight : '') || '', height: (p && p.height) || (last && last.general ? last.general.height : '') || '', goal: (p && p.goal) || '' },
      values: {}, ybt: { d: {}, e: {} }, jumps: { attempts: [], readiness: '' },
      encoder: { rows: [{ id: U.uid('R'), name: 'Squat' }, { id: U.uid('R'), name: 'RDL' }, { id: U.uid('R'), name: 'Hip Thrust' }] },
      bike: {}, patterns: {}, free: [], conclusions: {},
      // Un control de mesures no mou la data del proper re-test.
      nextRetest: opts.type === 'control' && last ? (last.nextRetest || U.addMonths(last.date, T.retestMonths)) : U.addMonths(date, T.retestMonths),
      createdAt: new Date().toISOString(),
    };
    return this.put('assessments', a, { immediate: true });
  },

  emptyBlocks() { return BLOCKS.map((b) => this.blankBlock(b.key)); },
  blankBlock(key) { return { key, focus: '', note: '', items: [] }; },
  // Només els blocs que ja tenen alguna cosa (exercicis, focus, mètode o subblocs); la resta s'afegeixen a mà.
  usedBlocks(blocks) {
    return (blocks || []).filter((b) => (b.items || []).some((i) => i.name) || b.focus || b.method || (b.groups || []).length);
  },
  // Blocs d'una plantilla de sessió per posar en una sessió (només els que la plantilla omple).
  templateBlocks(t, resetDone) {
    return this.usedBlocks(BLOCKS.map((b) => {
      const tb = ((t && t.blocks) || []).find((x) => x.key === b.key);
      return tb ? cloneBlock(tb, b.key, resetDone) : this.blankBlock(b.key);
    }));
  },

  nextSessionNumber(pid) {
    const nums = this.byPatient('sessions', pid).map((s) => U.num(s.number)).filter((n) => n != null);
    return nums.length ? Math.max(...nums) + 1 : 1;
  },

  // mode: 'blank' | 'last' | template id
  newSession(pid, { date, mode = 'blank', templateId = null, planId = null, planN = null } = {}) {
    const p = this.get('patients', pid);
    let fromPlan = null;
    // En blanc, la sessió no té cap bloc: s'afegeixen a mà segons el client.
    let blocks = [];
    let goal = '';
    let pillar = '';
    if (mode === 'last') {
      const last = this.sessionsOf(pid).filter((s) => s.date <= (date || U.today())).pop() || this.sessionsOf(pid).pop();
      if (last) {
        blocks = this.usedBlocks(cloneBlocks(last.blocks, true));
        goal = last.goal || '';
        pillar = last.pillar || '';
      }
    } else if (mode === 'plan' && planId) {
      const plan = this.get('templates', planId);
      const ps = plan && (plan.sessions || []).find((x) => x.n === U.num(planN));
      if (ps) {
        blocks = this.usedBlocks(cloneBlocks(ps.blocks, true));
        goal = ps.goal || plan.goal || '';
        fromPlan = { planId, planN: ps.n };
      }
    } else if (mode === 'template' && templateId) {
      const t = this.get('templates', templateId);
      if (t && t.kind === 'session') {
        blocks = this.templateBlocks(t);
        goal = t.goal || '';
      }
    }
    const s = {
      id: U.uid('S'), patientId: pid, date: date || U.today(), number: this.nextSessionNumber(pid),
      professional: deviceProfessional() || (p && p.professional) || '', goal, pillar, status: 'planificada',
      wellness: {}, blocks, feedback: {}, createdAt: new Date().toISOString(), ...(fromPlan || {}),
    };
    return this.put('sessions', s, { immediate: true });
  },

  duplicateSession(sid, date) {
    const s = this.get('sessions', sid);
    if (!s) return null;
    const copy = {
      ...U.clone(s), id: U.uid('S'), date: date || U.today(), number: this.nextSessionNumber(s.patientId),
      status: 'planificada', wellness: {}, feedback: {}, blocks: cloneBlocks(s.blocks, true), createdAt: new Date().toISOString(),
    };
    delete copy.updatedAt; delete copy.updatedBy; delete copy.planId; delete copy.planN;
    return this.put('sessions', copy, { immediate: true });
  },

  // ── Planificar per endavant: sessions futures (un mes sencer, o una setmana copiada a les següents) ──
  // Crea una sessió planificada amb aquests blocs.
  addPlanned(pid, { date, blocks, goal = '', pillar = '' }) {
    const p = this.get('patients', pid);
    const s = {
      id: U.uid('S'), patientId: pid, date, number: this.nextSessionNumber(pid),
      professional: deviceProfessional() || (p && p.professional) || '', goal, pillar, status: 'planificada',
      wellness: {}, blocks, feedback: {}, createdAt: new Date().toISOString(),
    };
    return this.put('sessions', s, { immediate: true });
  },

  // Dates d'un mes (AAAA-MM) que cauen en aquests dies de la setmana (0 = diumenge … 6 = dissabte).
  monthDates(month, days) {
    const first = `${month}-01`;
    const last = U.addDays(U.addMonths(first, 1), -1);
    const out = [];
    for (let d = first; d <= last; d = U.addDays(d, 1)) if ((days || []).map(Number).includes(U.parse(d).getDay())) out.push(d);
    return out;
  },

  // Planifica un mes: una sessió per cada dia triat. bases[dia de la setmana] = { mode: 'last' | 'template' | 'blank', templateId }:
  //   'last' = còpia de l'última sessió d'aquell dia de la setmana (o, si no n'hi ha, de l'última sessió del client).
  // every = cada quantes setmanes puja un nivell cada exercici que té progressió (0 = mai).
  planMonth(pid, { month, days, bases = {}, every = 0, skipExisting = true }) {
    const sessions = this.sessionsOf(pid);
    const taken = new Set(sessions.map((s) => s.date));
    const filled = (s) => (s.blocks || []).some((b) => (b.items || []).some((i) => i.name));
    const lastOn = (wd) => [...sessions].reverse().find((s) => filled(s) && U.parse(s.date).getDay() === wd)
      || [...sessions].reverse().find(filled) || null;
    const chain = {}; // dia de la setmana → { blocks, goal, pillar } de l'última sessió creada
    const seen = {};  // dia de la setmana → quantes se n'han creat en aquest mes
    const created = [], skipped = [];
    for (const date of this.monthDates(month, days)) {
      const wd = U.parse(date).getDay();
      if (skipExisting && taken.has(date)) { skipped.push(date); continue; }
      let blocks, goal = '', pillar = '';
      if (chain[wd]) {
        blocks = cloneBlocks(chain[wd].blocks, true);
        goal = chain[wd].goal; pillar = chain[wd].pillar;
        if (every > 0 && seen[wd] % every === 0) progressBlocks(blocks);
      } else {
        const base = bases[wd] || { mode: 'last' };
        const tpl = base.mode === 'template' ? this.get('templates', base.templateId) : null;
        const src = base.mode === 'last' ? lastOn(wd) : null;
        if (tpl && tpl.kind === 'session') { blocks = this.templateBlocks(tpl); goal = tpl.goal || ''; }
        else if (src) { blocks = this.usedBlocks(cloneBlocks(src.blocks, true)); goal = src.goal || ''; pillar = src.pillar || ''; }
        else blocks = [];
      }
      seen[wd] = (seen[wd] || 0) + 1;
      chain[wd] = { blocks, goal, pillar };
      created.push(this.addPlanned(pid, { date, blocks: this.usedBlocks(cloneBlocks(blocks, true)), goal, pillar }));
    }
    return { created, skipped };
  },

  // Copia les sessions d'una setmana (dilluns = weekStart) a les setmanes següents; amb progress, cada setmana puja un nivell.
  copyWeek(pid, weekStart, { weeks = 1, progress = false, skipExisting = true } = {}) {
    const end = U.addDays(weekStart, 6);
    const src = this.sessionsOf(pid).filter((s) => s.date >= weekStart && s.date <= end);
    const taken = new Set(this.sessionsOf(pid).map((s) => s.date));
    const created = [], skipped = [];
    const cur = Object.fromEntries(src.map((s) => [s.id, s.blocks]));
    for (let k = 1; k <= weeks; k++) {
      for (const s of src) {
        const date = U.addDays(s.date, 7 * k);
        const blocks = cloneBlocks(cur[s.id], true);
        if (progress) progressBlocks(blocks);
        cur[s.id] = blocks;
        if (skipExisting && taken.has(date)) { skipped.push(date); continue; }
        taken.add(date);
        created.push(this.addPlanned(pid, { date, blocks: this.usedBlocks(blocks), goal: s.goal || '', pillar: s.pillar || '' }));
      }
    }
    return { created, skipped };
  },

  // ── Pla d'entrenament: una seqüència de sessions (S1…SN) amb progressió, per a un client ──
  plans(pid) {
    return U.sortBy(this.templates().filter((t) => t.kind === 'plan' && (!pid || t.patientId === pid)), (t) => t.start || '', -1);
  },
  // Sessions reals fetes (o creades) a partir d'un pla.
  planSessions(plan) {
    return plan ? this.byPatient('sessions', plan.patientId).filter((s) => s.planId === plan.id) : [];
  },
  // Pròxima sessió del pla que encara no s'ha creat.
  nextPlanN(plan) {
    const used = new Set(this.planSessions(plan).map((s) => U.num(s.planN)));
    const n = (plan.sessions || []).map((x) => x.n).find((k) => !used.has(k));
    return n || null;
  },
  // opts: { name, goal, start, days: [1, 4], count, base: 'last' | 'template' | 'blank', templateId, every }
  // every = cada quantes sessions puja un nivell cada exercici que té progressió (0 = mai).
  newPlan(pid, { name, goal = '', start, days = [1, 4], count = 12, base = 'last', templateId = '', every = 0 } = {}) {
    let first = this.emptyBlocks();
    if (base === 'last') {
      const last = this.sessionsOf(pid).pop();
      if (last) first = cloneBlocks(last.blocks, true);
    } else if (base === 'template' && templateId) {
      const t = this.get('templates', templateId);
      if (t && t.kind === 'session') first = cloneBlocks(t.blocks, true);
    }
    const sessions = [];
    let blocks = first;
    for (let n = 1; n <= Math.max(1, Math.min(40, U.num(count) || 12)); n++) {
      if (n > 1) {
        blocks = cloneBlocks(blocks, true);
        if (every > 0 && (n - 1) % every === 0) progressBlocks(blocks);
      }
      sessions.push({ id: U.uid('PS'), n, phase: '', goal: '', blocks });
    }
    const plan = { id: U.uid('PL'), kind: 'plan', patientId: pid, name: name || `Pla de ${sessions.length} sessions`, goal, start: start || U.today(), days, sessions, createdAt: new Date().toISOString() };
    return this.put('templates', plan, { immediate: true });
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

// Qui fa servir aquesta tauleta: l'últim professional triat en una sessió. Les sessions noves es fan a nom seu
// (no del professional de referència del client).
const ME_KEY = 'eonlife:professional';
function deviceProfessional(v) {
  try {
    if (v === undefined) return window.localStorage.getItem(ME_KEY) || '';
    if (v) window.localStorage.setItem(ME_KEY, v); else window.localStorage.removeItem(ME_KEY);
  } catch (e) { /* sense emmagatzematge */ }
  return v || '';
}

// Canvia un exercici pel d'un altre nivell de la mateixa família (progressió o regressió).
// Es mantenen la prescripció i les notes; la càrrega es treu perquè és un altre exercici.
function progressItem(x, nx, prevMap) {
  x.name = nx.name;
  x.exId = nx.id;
  for (const k of ['gm', 'cont', 'pos', 'lat', 'material', 'tempo']) x[k] = nx[k] || '';
  for (const k of ['sets', 'reps', 'intensity', 'rest']) if (!x[k]) x[k] = nx[k] || '';
  const last = prevMap ? prevMap[nx.name] : null;
  x.load = last && last.load ? last.load : '';
  delete x.demo;
  return x;
}

// Puja un nivell tots els exercicis dels blocs que tenen una progressió.
function progressBlocks(blocks) {
  let n = 0;
  for (const b of blocks || []) for (const it of b.items || []) {
    const nx = it.exId ? Store.stepLevel(Store.exercise(it.exId), 1) : null;
    if (nx) { progressItem(it, nx); n++; }
  }
  return n;
}

// Un bloc copiat (focus, nota, subblocs i exercicis).
function cloneBlock(src, key, resetDone) {
  const b = { key, focus: (src && src.focus) || '', note: (src && src.note) || '', items: cloneItems(src && src.items, resetDone) };
  if (src && src.method) { b.method = src.method; b.methodName = src.methodName || ''; }
  if (src && src.groups && src.groups.length) b.groups = U.clone(src.groups);
  return b;
}

function cloneBlocks(blocks, resetDone) {
  const byKey = Object.fromEntries((blocks || []).map((b) => [b.key, b]));
  return BLOCKS.map((b) => cloneBlock(byKey[b.key], b.key, resetDone));
}
