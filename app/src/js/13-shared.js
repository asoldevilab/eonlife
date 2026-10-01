/* EON Life · components de domini compartits (sessions, clients, diàlegs de creació). */

function statusPill(s) {
  return s.status === 'feta'
    ? html`<${Pill} tone="ok" icon="check">Feta</${Pill}>`
    : s.date < U.today()
      ? html`<${Pill} tone="warn">Sense tancar</${Pill}>`
      : html`<${Pill} tone="neutral">Planificada</${Pill}>`;
}

function DateBlock({ date }) {
  const d = U.parse(date);
  return html`<div class=${U.cls('dateblock', date === U.today() && 'today')}>
    <span class="dateblock-wd">${U.weekdayShort(date)}</span>
    <span class="dateblock-d">${d ? d.getDate() : '—'}</span>
    <span class="dateblock-m">${d ? MONTHS_SHORT[d.getMonth()] : ''}</span>
  </div>`;
}

function SessionRow({ s, showPatient, compact }) {
  const p = Store.get('patients', s.patientId);
  const load = Calc.sessionLoad(s);
  const f = s.feedback || {};
  const filled = (s.blocks || []).filter((b) => (b.items || []).some((i) => i.name));
  return html`<div class=${U.cls('srow', compact && 'srow-compact')}>
    <${DateBlock} date=${s.date} />
    <button type="button" class="srow-main" onClick=${() => go('sessio', s.id)}>
      <span class="srow-title">
        ${showPatient && p && html`<strong>${U.fullName(p)}</strong>`}
        <span class=${showPatient ? 'muted' : ''}>Sessió ${s.number || '—'}</span>
      </span>
      <span class="srow-goal">${s.goal || 'Sense objectiu definit'}</span>
      <span class="srow-blocks" aria-label="Blocs amb exercicis">
        ${BLOCKS.map((b) => html`<span class=${U.cls('dot', `blk-${b.key}`, filled.some((x) => x.key === b.key) && 'on')} title=${blockName(b.key)}></span>`)}
        <span class="muted">${U.plural(Calc.itemCount(s), 'exercici', 'exercicis')}</span>
        ${s.status === 'feta' && f.rpe && html`<span class="srow-fb">RPE ${f.rpe}${f.duration ? ` · ${f.duration} min` : ''}${load != null ? ` · ${U.fmt(load, 0)} UA` : ''}</span>`}
      </span>
    </button>
    <div class="srow-actions">
      ${statusPill(s)}
      <${Btn} variant="ghost" icon="play" title="Presenta la sessió al client" onClick=${() => go('fitxa', s.id)} />
    </div>
  </div>`;
}

function PatientChip({ p }) {
  if (!p) return null;
  return html`<button type="button" class="pchip" onClick=${() => go('client', p.id)}>
    <${Avatar} p=${p} size="sm" /><span>${U.fullName(p)}</span></button>`;
}

// ── Nou client ──
function openNewPatient() {
  let close = null;
  close = UI.open(() => html`<${NewPatientDialog} onClose=${() => close()} />`);
}

function NewPatientDialog({ onClose }) {
  const [f, setF] = useState({ firstName: '', lastName: '', service: 'valoracio', professional: Store.professionals()[0] || '', birthDate: '' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const create = () => {
    if (!f.firstName.trim()) { UI.toast('Escriu el nom del client.', 'bad'); return; }
    const p = Store.newPatient({ ...f, firstName: f.firstName.trim(), lastName: f.lastName.trim() });
    onClose();
    if (Store.cloud()) ensureFolder(p);
    go('client', p.id, 'fitxa');
  };
  return html`<${Dialog} title="Nou client" onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="plus" onClick=${create}>Crea el client</${Btn}>`}>
    <form class="form-grid" onSubmit=${(e) => { e.preventDefault(); create(); }}>
      <${Field} label="Nom" id="np-first"><${TextInput} id="np-first" value=${f.firstName} onValue=${set('firstName')} autoFocus=${true} /></${Field}>
      <${Field} label="Cognoms" id="np-last"><${TextInput} id="np-last" value=${f.lastName} onValue=${set('lastName')} /></${Field}>
      <${Field} label="Data de naixement" id="np-birth"><${TextInput} id="np-birth" type="date" value=${f.birthDate} onValue=${set('birthDate')} /></${Field}>
      <${Field} label="Professional de referència" id="np-prof">
        <${ProfSelect} id="np-prof" value=${f.professional} onValue=${set('professional')} />
      </${Field}>
      <${Field} label="Servei" id="np-service" wide=${true}>
        <${Seg} value=${f.service} onValue=${set('service')} allowEmpty=${false} ariaLabel="Servei" options=${OPT.services.map((o) => ({ v: o.v, label: o.label, title: o.desc }))} />
      </${Field}>
      <button type="submit" hidden></button>
    </form>
  </${Dialog}>`;
}

// Desplegable amb l'equip de Configuració (si el registre porta un nom que ja no hi és, es manté).
function ProfSelect({ id, value, onValue }) {
  return html`<${Select} id=${id} value=${value} onValue=${onValue} options=${Store.professionals()} placeholder="—" />`;
}

// Crea (si cal) la carpeta del client (Google Drive o Microsoft 365) i en desa l'enllaç.
async function ensureFolder(p, { silent } = {}) {
  if (!Store.cloud()) return null;
  try {
    const res = await Store.backend.ensureFolder(p);
    if (res && res.folderUrl) {
      Store.update('patients', p.id, (x) => { x.folderUrl = res.folderUrl; x.folderId = res.folderId; });
      if (!silent) UI.toast(`Carpeta del client creada a ${Store.cloudName()}.`);
    }
    return res;
  } catch (e) {
    UI.toast(`No s'ha pogut crear la carpeta: ${e.message}`, 'bad');
    return null;
  }
}

// Es poden pujar fitxers des de la tauleta? Amb Microsoft 365, a la carpeta del client; a la versió de prova
// (sense núvol), es desen a la mateixa tauleta.
function canUploadFiles() {
  if (!Store.cloud()) return LocalFiles.available();
  return !!(Store.backend && Store.backend.uploadFile);
}
function filesOnDevice() { return !Store.cloud(); }

// Puja un fitxer a una subcarpeta de la carpeta del client (la crea si encara no existeix).
// Nom: «AAAA-MM-DD · què és · Nom Cognoms.ext», perquè a la carpeta s'ordenin per data.
async function uploadToClient(patient, file, { label, date, subfolder, onProgress } = {}) {
  const ext = (file.name.match(/\.[a-z0-9]{2,5}$/i) || [''])[0].toLowerCase();
  const name = `${date || U.today()} · ${label} · ${U.fullName(patient)}${ext}`;
  if (filesOnDevice()) {
    const res = await LocalFiles.put(file, name);
    if (onProgress) onProgress(1);
    return { ...res, folderId: '' };
  }
  let fid = patient.folderId || '';
  if (!fid) {
    const res = await ensureFolder(Store.get('patients', patient.id) || patient, { silent: true });
    fid = (res && res.folderId) || '';
  }
  if (!fid) throw new Error('No s\'ha pogut crear la carpeta del client.');
  const res = await Store.backend.uploadFile(fid, file, {
    name,
    subfolder,
    onProgress,
  });
  return { ...res, folderId: fid };
}

// ── Nova sessió ──
function openNewSession(pid, date) {
  let close = null;
  close = UI.open(() => html`<${NewSessionDialog} pid=${pid} date=${date} onClose=${() => close()} />`);
}

function NewSessionDialog({ pid, date, onClose }) {
  const sessions = Store.sessionsOf(pid);
  const last = sessions.filter((s) => s.date <= (date || U.today())).pop() || sessions[sessions.length - 1];
  const tpls = Store.templates().filter((t) => t.kind === 'session');
  const [d, setD] = useState(date || U.today());
  const [mode, setMode] = useState(last ? 'last' : 'template');
  const [tpl, setTpl] = useState(tpls[0] ? tpls[0].id : '');
  const create = () => {
    const s = Store.newSession(pid, { date: d, mode: mode === 'template' && !tpl ? 'blank' : mode, templateId: tpl });
    onClose();
    go('sessio', s.id);
  };
  const option = (v, title, text, disabled, children) => html`<label class=${U.cls('choice', mode === v && 'on', disabled && 'disabled')}>
    <input type="radio" name="ns-mode" checked=${mode === v} disabled=${disabled} onChange=${() => setMode(v)} />
    <span class="choice-body"><span class="choice-title">${title}</span><span class="choice-text">${text}</span>${children}</span>
  </label>`;
  return html`<${Dialog} title="Nova sessió" onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="plus" onClick=${create}>Crea la sessió</${Btn}>`}>
    <${Field} label="Data" id="ns-date"><${TextInput} id="ns-date" type="date" value=${d} onValue=${setD} /></${Field}>
    <div class="choices">
      ${option('last', 'Copia l\'última sessió', last ? `Sessió ${last.number} · ${U.fmtDate(last.date)} · ${last.goal || 'sense objectiu'}` : 'Encara no hi ha cap sessió', !last)}
      ${option('template', 'A partir d\'una plantilla', 'Estructura de 6 blocs ja preparada.', false,
        mode === 'template' && html`<${Select} value=${tpl} onValue=${setTpl} options=${tpls.map((t) => ({ v: t.id, label: t.name }))} ariaLabel="Plantilla" />`)}
      ${option('blank', 'Sessió en blanc', 'Els 6 blocs buits: mobilitat, activació, potència, força principal, accessoris i tornada a la calma.', false)}
    </div>
  </${Dialog}>`;
}

// ── Nova valoració ──
function createAssessment(pid) {
  const a = Store.newAssessment(pid);
  go('valoracio', a.id);
}

// Resum de dates clau (IQ, lesió) com al full "DB" de l'Excel mensual.
function KeyDates({ p }) {
  const items = [];
  if (p.surgeryDate) items.push({ label: 'IQ', date: p.surgeryDate, note: p.surgeryNote });
  if (p.injuryDate) items.push({ label: 'Lesió', date: p.injuryDate, note: p.injuryNote });
  if (!items.length) return null;
  return html`<div class="keydates">${items.map((it) => {
    const days = U.diffDays(it.date, U.today());
    return html`<div class="keydate" title=${it.note || ''}>
      <span class="keydate-label">${it.label}</span>
      <span class="keydate-main">${days != null && days >= 0 ? `${days} dies · ${Math.floor(days / 7)} setmanes` : U.fmtDate(it.date)}</span>
      <span class="keydate-note">${it.note || U.fmtDate(it.date)}</span>
    </div>`;
  })}</div>`;
}
