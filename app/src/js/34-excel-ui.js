/* EON Life · Excel de cada client a l'app: estat de la pujada a la carpeta, descàrrega i planificació del mes.
   L'app fa sola un Excel per pacient, amb un full per mes (sessions) i les valoracions (09-sync.js); aquí s'hi veu
   si és al dia, es pot pujar a mà o descarregar i es planifiquen sessions per endavant. */

// «fa 3 min», «fa 2 h», «el 02/10/2026»
function agoText(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return 'ara mateix';
  if (s < 3600) return `fa ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `fa ${Math.round(s / 3600)} h`;
  return `el ${U.fmtDate(U.iso(new Date(ts)))}`;
}

const failedText = (names, n) => `${n === 1 ? 'No s\'ha pogut fer 1 Excel' : `No s'han pogut fer ${n} Excel`}${names && names.length ? ` (${names.join(', ')})` : ''}: revisa les dades d'aquest pacient.`;

async function syncNow(pid, force) {
  try {
    const r = await Sync.now(pid, { force });
    UI.toast(r.uploaded || r.removed
      ? `${r.uploaded ? 'Excel del pacient desat a la carpeta' : 'L\'Excel del pacient ja era al dia'}${r.removed ? ` · ${U.plural(r.removed, 'Excel antic retirat', 'Excel antics retirats')}` : ''}.`
      : 'L\'Excel del pacient ja era al dia a la carpeta.');
    if (r.failed) UI.toast(failedText(r.failedNames, r.failed), 'bad');
  } catch (e) {
    UI.toast(e.message, 'bad');
  }
}

// Avís després de baixar un fitxer: res si qui ho feia ho ha rebutjat al visor.
function savedToast(status, okText) {
  if (status === 'declined') return;
  UI.toast(status === 'saved' ? okText : 'No s\'ha pogut descarregar en aquesta vista.', status === 'saved' ? 'ok' : 'bad');
}

async function downloadExcel(pid, key = 'C:client') {
  try {
    const { name, status } = await Exports.download(pid, key);
    savedToast(status, `Excel descarregat: ${name}`);
  } catch (e) {
    UI.toast(e.message, 'bad');
  }
}

// Estat de la pujada de l'Excel d'un client (només amb Microsoft 365).
function SyncBadge({ pid }) {
  const [, force] = useState(0);
  useEffect(() => Sync.subscribe(() => force((n) => n + 1)), []);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const st = Sync.info(pid);
  if (st.state === 'off') return null;
  const map = {
    running: ['neutral', 'refresh', 'Pujant l\'Excel a la carpeta…'],
    pending: ['warn', 'clock', 'Excel pendent de pujar (es puja sol)'],
    error: ['bad', 'alert', `Excel sense pujar: ${st.error}`],
    partial: ['warn', 'alert', 'No s\'ha pogut fer l\'Excel: revisa les dades d\'aquest pacient'],
    ok: ['ok', 'cloud', `Excel al dia a la carpeta · ${agoText(st.last && st.last.at)}`],
    never: ['neutral', 'table', 'Excel encara no pujat a la carpeta'],
    paused: ['neutral', 'table', 'Pujada automàtica de l\'Excel en pausa'],
  };
  const [tone, icon, text] = map[st.state] || map.never;
  return html`<div class="syncbadge" role="status">
    <${Pill} tone=${tone} icon=${icon}>${text}</${Pill}>
    ${st.state !== 'running' && html`<button type="button" class="link" onClick=${() => syncNow(pid)}>Puja'l ara</button>`}
  </div>`;
}

// Estat dels PDF dels informes d'un pacient (només amb Microsoft 365).
async function pdfNow(pid, force) {
  try {
    const r = await PdfSync.now(pid, { force });
    const bits = [];
    if (r.made) bits.push(`${U.plural(r.made, 'PDF fet', 'PDF fets')}`);
    if (r.archived) bits.push(`${U.plural(r.archived, 'PDF mogut', 'PDF moguts')} a «Arxiu»`);
    UI.toast(bits.length ? `${bits.join(' · ')} a la carpeta «Informes».` : 'Els PDF del pacient ja eren al dia.');
    if (r.failed) UI.toast(`No s'${r.failed === 1 ? 'ha' : 'han'} pogut fer ${U.plural(r.failed, 'PDF', 'PDF')}${r.failedNames && r.failedNames.length ? ` (${r.failedNames.join(', ')})` : ''}: revisa les dades d'aquest pacient.`, 'bad');
  } catch (e) {
    UI.toast(e.message, 'bad');
  }
}

function PdfBadge({ pid }) {
  const [, force] = useState(0);
  useEffect(() => PdfSync.subscribe(() => force((n) => n + 1)), []);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const st = PdfSync.info(pid);
  if (st.state === 'off') return null;
  const map = {
    running: ['neutral', 'refresh', st.step || 'Fent els PDF dels informes…'],
    pending: ['warn', 'clock', 'PDF dels informes pendents (es fan sols)'],
    error: ['bad', 'alert', `PDF dels informes sense desar: ${st.error}`],
    partial: ['warn', 'alert', 'No s\'ha pogut fer algun PDF: revisa les dades d\'aquest pacient'],
    ok: ['ok', 'note', `PDF dels informes al dia · ${agoText(st.last && st.last.at)}`],
    never: ['neutral', 'note', 'PDF dels informes encara no fets'],
    paused: ['neutral', 'note', 'PDF dels informes en pausa'],
  };
  const [tone, icon, text] = map[st.state] || map.never;
  return html`<div class="syncbadge" role="status">
    <${Pill} tone=${tone} icon=${icon}>${text}</${Pill}>
    ${st.state !== 'running' && html`<button type="button" class="link" onClick=${() => pdfNow(pid)}>Fes-los ara</button>`}
  </div>`;
}

// Elements de menú per a un client: pujar ara, obrir a la carpeta i descarregar.
function excelMenuItems(pid) {
  const items = [];
  const st = Sync.info(pid);
  const last = st.last || {};
  const open = (url) => () => window.open(url, '_blank', 'noopener');
  if (Sync.available()) {
    items.push({ label: 'Puja l\'Excel a la carpeta ara', icon: 'refresh', onClick: () => syncNow(pid) });
    if (last.fileUrl) items.push({ label: 'Obre l\'Excel del pacient', icon: 'table', onClick: open(last.fileUrl) });
    if (last.sessionsUrl) items.push({ label: 'Obre la carpeta «Sessions»', icon: 'folder', onClick: open(last.sessionsUrl) });
    if (last.assessUrl) items.push({ label: 'Obre la carpeta «Valoracions»', icon: 'folder', onClick: open(last.assessUrl) });
  }
  if (PdfSync.available()) {
    items.push({ sep: true });
    items.push({ label: 'Fes ara els PDF dels informes', icon: 'note', onClick: () => pdfNow(pid) });
    items.push({ label: 'Refés tots els PDF d\'aquest pacient', icon: 'refresh', onClick: () => pdfNow(pid, true) });
    const pl = (PdfSync.info(pid).last || {}).folderUrl;
    if (pl) items.push({ label: 'Obre la carpeta «Informes»', icon: 'folder', onClick: open(pl) });
  }
  if (U.canDownload()) {
    if (items.length) items.push({ sep: true });
    items.push({ label: 'Descarrega l\'Excel del pacient', icon: 'download', onClick: () => downloadExcel(pid) });
  }
  return items;
}

function ExcelMenu({ p }) {
  const items = excelMenuItems(p.id);
  if (!items.length) return null;
  return html`<${Menu} items=${items} icon="table" label="Excel" variant="secondary" title="Excel del pacient: pujar, obrir o descarregar" />`;
}

// ── Planifica el mes: crea d'una vegada les sessions de tot un mes ──
const MonthNav = {
  pending: {},
  // Mes que ha de mostrar el calendari del client la propera vegada.
  show(pid, month) { this.pending[pid] = month; },
  take(pid) { const m = this.pending[pid]; delete this.pending[pid]; return m || null; },
};

function openPlanMonth(p, month) {
  let close = null;
  close = UI.open(() => html`<${PlanMonthDialog} p=${p} month=${month} onClose=${() => close()} />`);
}

function PlanMonthDialog({ p, month: m0, onClose }) {
  const sessions = Store.sessionsOf(p.id);
  const tpls = Store.templates().filter((t) => t.kind === 'session');
  // Per defecte, els dies de la setmana que el client ja entrena més sovint.
  const usual = (() => {
    const n = {};
    for (const s of sessions.slice(-12)) { const d = U.parse(s.date).getDay(); n[d] = (n[d] || 0) + 1; }
    const top = Object.entries(n).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => Number(d));
    return top.length ? top : [1, 4];
  })();
  const [month, setMonth] = useState(m0);
  const [days, setDays] = useState(usual);
  const [bases, setBases] = useState({});
  const [every, setEvery] = useState('0');
  const [skip, setSkip] = useState(true);
  const thisMonth = U.monthKey(U.today());
  const months = Array.from({ length: 9 }, (_, i) => U.monthKey(U.addMonths(`${thisMonth}-01`, i - 1)));
  if (!months.includes(month)) months.unshift(month);
  const taken = new Set(sessions.map((s) => s.date));
  const dates = Store.monthDates(month, days);
  const fresh = dates.filter((d) => !taken.has(d));
  const count = skip ? fresh.length : dates.length;
  const toggle = (d) => setDays(days.includes(d) ? days.filter((x) => x !== d) : [...days, d]);
  const baseOf = (wd) => bases[wd] || 'last';
  const lastOn = (wd) => [...sessions].reverse().find((s) => Calc.itemCount(s) > 0 && U.parse(s.date).getDay() === wd);
  const create = () => {
    if (!days.length) { UI.toast('Tria almenys un dia de la setmana.', 'bad'); return; }
    const objs = {};
    for (const d of days) { const v = baseOf(d); objs[d] = v.startsWith('tpl:') ? { mode: 'template', templateId: v.slice(4) } : { mode: v }; }
    const res = Store.planMonth(p.id, { month, days, bases: objs, every: U.num(every) || 0, skipExisting: skip });
    onClose();
    MonthNav.show(p.id, month);
    UI.toast(res.created.length ? `${U.plural(res.created.length, 'sessió planificada', 'sessions planificades')} per a ${U.monthLow(month)}.` : 'No hi havia cap dia lliure: no s\'ha creat cap sessió.', res.created.length ? 'ok' : 'bad');
    go('client', p.id, 'mes');
    Sync.soon(p.id);
  };
  const baseOptions = (wd) => [
    { v: 'last', label: lastOn(wd) ? `Igual que l'última sessió de ${WEEKDAYS[wd]} (${U.fmtDateShort(lastOn(wd).date)})` : 'Igual que l\'última sessió' },
    { v: 'blank', label: 'En blanc: la dissenyo jo' },
    ...tpls.map((t) => ({ v: `tpl:${t.id}`, label: `Plantilla · ${t.name}` })),
  ];
  return html`<${Dialog} title="Planifica el mes" wide=${true} onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="calendar" disabled=${!count} onClick=${create}>${count ? `Crea ${U.plural(count, 'sessió', 'sessions')}` : 'No hi ha cap dia'}</${Btn}>`}>
    <p class="muted">Crea d'una vegada les sessions d'un mes, ja planificades: les podràs obrir i ajustar una a una, i surten al full del mes de l'Excel del pacient.</p>
    <div class="form-grid">
      <${Field} label="Mes" id="pm-month"><${Select} id="pm-month" value=${month} onValue=${setMonth} options=${months.map((m) => ({ v: m, label: U.fmtMonth(m) }))} /></${Field}>
      <${Field} label="Progressió dels exercicis" id="pm-every" hint="Els exercicis que tenen nivells a la biblioteca pugen un nivell (p. ex. Goblet squat → Back squat).">
        <${Select} id="pm-every" value=${every} onValue=${setEvery} options=${[
          { v: '0', label: 'Totes iguals: la progressió la faig jo' },
          { v: '1', label: 'Puja un nivell cada setmana' },
          { v: '2', label: 'Puja un nivell cada 2 setmanes' },
          { v: '3', label: 'Puja un nivell cada 3 setmanes' },
          { v: '4', label: 'Puja un nivell cada 4 setmanes' },
        ]} /></${Field}>
      <${Field} label="Dies d'entrenament" wide=${true}>
        <div class="chips">${WEEK_ORDER.map((d) => html`<${Chip} on=${days.includes(d)} onClick=${() => toggle(d)}>${WEEKDAYS[d]}</${Chip}>`)}</div></${Field}>
      ${WEEK_ORDER.filter((d) => days.includes(d)).map((d) => html`<${Field} label=${`Sessió de ${WEEKDAYS[d]}`} id=${`pm-base-${d}`} wide=${true}>
        <${Select} id=${`pm-base-${d}`} value=${baseOf(d)} onValue=${(v) => setBases({ ...bases, [d]: v })} options=${baseOptions(d)} /></${Field}>`)}
    </div>
    <label class="check"><input type="checkbox" checked=${skip} onChange=${(e) => setSkip(e.currentTarget.checked)} /> Salta els dies que ja tenen una sessió</label>
    <p class="muted mt">${dates.length ? html`${U.plural(count, 'sessió', 'sessions')} noves${skip && dates.length > fresh.length ? ` (${U.plural(dates.length - fresh.length, 'dia ja ocupat', 'dies ja ocupats')})` : ''}: ${(skip ? fresh : dates).map((d) => `${U.weekdayShort(d)} ${U.parse(d).getDate()}`).join(' · ') || '—'}` : 'Aquest mes no té cap dia dels triats.'}</p>
  </${Dialog}>`;
}

// ── Copia una setmana a les següents ──
function openCopyWeek(p, weekStart) {
  let close = null;
  close = UI.open(() => html`<${CopyWeekDialog} p=${p} weekStart=${weekStart} onClose=${() => close()} />`);
}

function CopyWeekDialog({ p, weekStart, onClose }) {
  const src = Store.sessionsOf(p.id).filter((s) => s.date >= weekStart && s.date <= U.addDays(weekStart, 6));
  const [weeks, setWeeks] = useState('3');
  const [progress, setProgress] = useState(false);
  const n = Math.max(1, Math.min(12, U.num(weeks) || 1));
  const create = () => {
    const res = Store.copyWeek(p.id, weekStart, { weeks: n, progress, skipExisting: true });
    onClose();
    UI.toast(res.created.length ? `${U.plural(res.created.length, 'sessió planificada', 'sessions planificades')}${res.skipped.length ? ` (${U.plural(res.skipped.length, 'dia ocupat saltat', 'dies ocupats saltats')})` : ''}.` : 'Tots els dies ja tenen sessió: no s\'ha creat res.', res.created.length ? 'ok' : 'bad');
    Sync.soon(p.id);
  };
  return html`<${Dialog} title=${`Copia la setmana del ${U.fmtDateLong(weekStart, false)}`} onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="copy" disabled=${!src.length} onClick=${create}>Copia a les ${n} setmanes següents</${Btn}>`}>
    ${src.length ? html`<p class="muted">Copia ${U.plural(src.length, 'sessió', 'sessions')} (${src.map((s) => `${U.weekdayShort(s.date)} ${U.parse(s.date).getDate()}`).join(' · ')}) a les setmanes següents, com a sessions planificades. Les podràs ajustar una a una.</p>
      <div class="form-grid">
        <${Field} label="Quantes setmanes" id="cw-n" hint="Fins a 12"><${NumInput} id="cw-n" value=${weeks} onValue=${setWeeks} /></${Field}>
      </div>
      <label class="check"><input type="checkbox" checked=${progress} onChange=${(e) => setProgress(e.currentTarget.checked)} /> Cada setmana puja un nivell els exercicis que tenen progressió</label>`
      : html`<p class="muted">Aquesta setmana no té cap sessió per copiar.</p>`}
  </${Dialog}>`;
}

// ── Configuració: Excel automàtics ──
function ExcelSettingsCard() {
  const [, force] = useState(0);
  useEffect(() => Sync.subscribe(() => force((n) => n + 1)), []);
  const cloud = Sync.available();
  const on = Store.settings.autoExcel !== false;
  const toggle = (v) => {
    Store.saveSettings({ autoExcel: v });
    if (v) Sync.all();
  };
  const all = () => { Sync.all({ force: true }); UI.toast('Es torna a fer i pujar l\'Excel de cada pacient. Pot tardar uns minuts.'); };
  return html`<section class="card">
    <div class="card-head"><h2 class="h2">Excel de cada pacient</h2>
      <${Pill} tone=${cloud ? (on ? 'ok' : 'warn') : 'neutral'} icon="table">${cloud ? (on ? 'Pujada automàtica' : 'En pausa') : 'Només descàrrega'}</${Pill}></div>
    <p>L'app fa sola, des del que s'omple a l'app, <strong>un Excel per pacient</strong> (<em>seguiment_nomcognoms_01.xlsx</em>): un resum, <strong>un full per mes</strong> amb el calendari i cada sessió (feta, planificada o prevista al pla), el registre de totes les sessions i les <strong>valoracions</strong> (l'evolució i el detall de cadascuna). Tot es registra a l'app: l'Excel és només de lectura i es refà sol quan hi ha canvis.</p>
    ${cloud ? html`<label class="check"><input type="checkbox" checked=${on} onChange=${(e) => toggle(e.currentTarget.checked)} /><span>Puja'l sol a la carpeta de cada pacient</span></label>
      <p class="muted small">Es puja uns segons després de l'últim canvi i substitueix l'anterior. Els Excel antics fets per l'app (els d'una sessió o una valoració, d'abans de l'Excel únic) es retiren de <em>Sessions</em> i <em>Valoracions</em> (queden a la paperera de reciclatge). Mai es toca cap altre fitxer.</p>
      ${Sync.queued() > 0 && html`<p class="muted">${U.plural(Sync.queued(), 'pacient té l\'Excel pendent', 'pacients tenen l\'Excel pendent')} de pujar.</p>`}
      <div class="row-actions"><${Btn} icon="refresh" disabled=${!on} onClick=${all}>Refés i puja l'Excel de tots els pacients</${Btn}></div>`
      : html`<p class="muted">En aquesta versió (sense carpeta al núvol) l'Excel del pacient es descarrega des de la seva fitxa (botó <em>Excel</em>) o des de cada sessió i cada valoració. Amb Microsoft 365 es puja sol a la carpeta del pacient.</p>`}
  </section>`;
}

// ── Configuració: PDF dels informes ──
function PdfSettingsCard() {
  const [, force] = useState(0);
  useEffect(() => PdfSync.subscribe(() => force((n) => n + 1)), []);
  const cloud = PdfSync.available();
  const on = Store.settings.autoPdf !== false;
  const toggle = (v) => Store.saveSettings({ autoPdf: v });
  const all = (f) => { const n = PdfSync.all({ force: f }); UI.toast(`Es miren els PDF de ${U.plural(n, 'pacient', 'pacients')}. Pot tardar uns minuts.`); };
  return html`<section class="card">
    <div class="card-head"><h2 class="h2">PDF dels informes</h2>
      <${Pill} tone=${cloud ? (on ? 'ok' : 'warn') : 'neutral'} icon="note">${cloud ? (on ? 'Automàtic' : 'En pausa') : 'Només manual'}</${Pill}></div>
    <p>L'app fa sola els <strong>PDF dels informes</strong> de cada pacient i els deixa a la seva carpeta, dins <em>Informes</em>: a <em>Valoracions</em>, un per valoració; a <em>Tests</em>, un sol PDF amb l'evolució dels tests; i a <em>Sessions</em>, un per sessió feta i un amb l'evolució de les sessions. Surten en el disseny (clar o fosc) que té el pacient.</p>
    ${cloud ? html`<label class="check"><input type="checkbox" checked=${on} onChange=${(e) => toggle(e.currentTarget.checked)} /><span>Fes-los i desa'ls sols a la carpeta de cada pacient</span></label>
      <p class="muted small">Quan algú canvia una valoració, una sessió o les dades del pacient, i fa un minut que no hi toca, l'app refà només els PDF que han canviat i substitueix el fitxer (el nom és sempre el mateix: no se'n fan còpies). Si s'esborra una valoració o una sessió, el seu PDF <strong>no s'esborra</strong>: es mou a <em>Informes › Arxiu</em>. Les sessions només tenen PDF quan són <em>fetes</em>. Només es fan amb l'app oberta i visible.</p>
      ${PdfSync.queued() > 0 && html`<p class="muted">${U.plural(PdfSync.queued(), 'pacient té els PDF pendents', 'pacients tenen els PDF pendents')} de fer.</p>`}
      <div class="row-actions">
        <${Btn} icon="note" disabled=${!on} onClick=${() => all(false)}>Fes ara els PDF de tots els pacients</${Btn}>
        <${Btn} variant="ghost" icon="refresh" disabled=${!on} onClick=${() => all(true)}>Refés-los tots (encara que no hagin canviat)</${Btn}>
      </div>`
      : html`<p class="muted">En aquesta versió (sense carpeta al núvol) el PDF d'un informe es descarrega des del botó <em>Descarrega el PDF</em> de cada informe. Amb Microsoft 365 es fan i es desen sols a la carpeta del pacient.</p>`}
  </section>`;
}
