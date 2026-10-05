/* EON Life · Excel de cada client a l'app: estat de la pujada a la carpeta, descàrregues i planificació del mes.
   L'app fa sola un Excel per sessió, un per valoració i un Excel gegant de visió general (09-sync.js); aquí
   s'hi veu si són al dia, es poden pujar a mà o descarregar i es planifiquen sessions per endavant. */

// «fa 3 min», «fa 2 h», «el 02/10/2026»
function agoText(ts) {
  if (!ts) return '';
  const s = Math.max(0, Math.round((Date.now() - ts) / 1000));
  if (s < 45) return 'ara mateix';
  if (s < 3600) return `fa ${Math.max(1, Math.round(s / 60))} min`;
  if (s < 86400) return `fa ${Math.round(s / 3600)} h`;
  return `el ${U.fmtDate(U.iso(new Date(ts)))}`;
}

async function syncNow(pid, force) {
  try {
    const r = await Sync.now(pid, { force });
    UI.toast(r.uploaded || r.removed
      ? `Excel desats a la carpeta: ${U.plural(r.uploaded, 'fitxer nou o canviat', 'fitxers nous o canviats')}${r.removed ? ` · ${U.plural(r.removed, 'd\'antic retirat', 'd\'antics retirats')}` : ''}.`
      : 'Els Excel ja estaven al dia a la carpeta.');
  } catch (e) {
    UI.toast(e.message, 'bad');
  }
}

// Avís després de baixar un fitxer: res si qui ho feia ho ha rebutjat al visor.
function savedToast(status, okText) {
  if (status === 'declined') return;
  UI.toast(status === 'saved' ? okText : 'No s\'ha pogut descarregar en aquesta vista.', status === 'saved' ? 'ok' : 'bad');
}

async function downloadExcel(pid, key) {
  try {
    const { name, status } = await Exports.download(pid, key);
    savedToast(status, `Excel descarregat: ${name}`);
  } catch (e) {
    UI.toast(e.message, 'bad');
  }
}

async function downloadExcelZip(pid) {
  try {
    const { name, status } = await Exports.downloadZip(pid);
    savedToast(status, `Descarregat: ${name} (carpetes Valoracions i Sessions).`);
  } catch (e) {
    UI.toast(e.message, 'bad');
  }
}

// Estat de la pujada dels Excel d'un client (només amb Microsoft 365).
function SyncBadge({ pid }) {
  const [, force] = useState(0);
  useEffect(() => Sync.subscribe(() => force((n) => n + 1)), []);
  useEffect(() => { const t = setInterval(() => force((n) => n + 1), 30000); return () => clearInterval(t); }, []);
  const st = Sync.info(pid);
  if (st.state === 'off') return null;
  const map = {
    running: ['neutral', 'refresh', 'Pujant els Excel a la carpeta…'],
    pending: ['warn', 'clock', 'Excel pendents de pujar (es pugen sols)'],
    error: ['bad', 'alert', `Excel sense pujar: ${st.error}`],
    ok: ['ok', 'cloud', `Excel al dia a la carpeta · ${agoText(st.last && st.last.at)}`],
    never: ['neutral', 'table', 'Excel encara no pujats a la carpeta'],
    paused: ['neutral', 'table', 'Pujada automàtica dels Excel en pausa'],
  };
  const [tone, icon, text] = map[st.state] || map.never;
  return html`<div class="syncbadge" role="status">
    <${Pill} tone=${tone} icon=${icon}>${text}</${Pill}>
    ${st.state !== 'running' && html`<button type="button" class="link" onClick=${() => syncNow(pid)}>Puja'ls ara</button>`}
  </div>`;
}

// Elements de menú per a un client: pujar ara, obrir a la carpeta i descarregar.
function excelMenuItems(pid) {
  const items = [];
  const st = Sync.info(pid);
  const last = st.last || {};
  const open = (url) => () => window.open(url, '_blank', 'noopener');
  if (Sync.available()) {
    items.push({ label: 'Puja els Excel a la carpeta ara', icon: 'refresh', onClick: () => syncNow(pid) });
    if (last.overviewUrl) items.push({ label: 'Obre l\'Excel de visió general', icon: 'table', onClick: open(last.overviewUrl) });
    if (last.sessionsUrl) items.push({ label: 'Obre la carpeta «Sessions»', icon: 'folder', onClick: open(last.sessionsUrl) });
    if (last.assessUrl) items.push({ label: 'Obre la carpeta «Valoracions»', icon: 'folder', onClick: open(last.assessUrl) });
  }
  if (U.canDownload()) {
    if (items.length) items.push({ sep: true });
    items.push({ label: 'Descarrega l\'Excel de visió general', icon: 'download', onClick: () => downloadExcel(pid, 'O:overview') });
    items.push({ label: 'Descarrega tots els Excel (ZIP)', icon: 'download', onClick: () => downloadExcelZip(pid) });
  }
  return items;
}

function ExcelMenu({ p }) {
  const items = excelMenuItems(p.id);
  if (!items.length) return null;
  return html`<${Menu} items=${items} icon="table" label="Excel" variant="secondary" title="Excel del client: pujar, obrir o descarregar" />`;
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
    UI.toast(res.created.length ? `${U.plural(res.created.length, 'sessió planificada', 'sessions planificades')} per a ${U.fmtMonth(month)}.` : 'No hi havia cap dia lliure: no s\'ha creat cap sessió.', res.created.length ? 'ok' : 'bad');
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
    <p class="muted">Crea d'una vegada les sessions d'un mes, ja planificades: les podràs obrir i ajustar una a una, i surten a l'Excel de visió general i amb el seu propi Excel a la carpeta del client.</p>
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
  const all = () => { Sync.all({ force: true }); UI.toast('Es tornen a fer i pujar els Excel de tots els clients. Pot tardar uns minuts.'); };
  return html`<section class="card">
    <div class="card-head"><h2 class="h2">Excel de cada client</h2>
      <${Pill} tone=${cloud ? (on ? 'ok' : 'warn') : 'neutral'} icon="table">${cloud ? (on ? 'Pujada automàtica' : 'En pausa') : 'Només descàrrega'}</${Pill}></div>
    <p>L'app fa sola, des del que s'omple a l'app, un <strong>Excel per cada sessió</strong> (feta, planificada o prevista), un <strong>Excel per cada valoració</strong> i un <strong>Excel gegant de visió general</strong> per client, amb un calendari i un detall per cada mes. Tot es registra a l'app: els Excel són només de lectura i es refan sols quan hi ha canvis.</p>
    ${cloud ? html`<label class="check"><input type="checkbox" checked=${on} onChange=${(e) => toggle(e.currentTarget.checked)} /> Puja'ls sols a la carpeta de cada client (<em>Valoracions</em> i <em>Sessions</em>)</label>
      <p class="muted small">Es pugen uns segons després de l'últim canvi. Si una sessió es canvia de dia o s'elimina, el seu Excel antic es retira de la carpeta (queda a la paperera de reciclatge). Mai es toca cap altre fitxer.</p>
      ${Sync.queued() > 0 && html`<p class="muted">${U.plural(Sync.queued(), 'client té', 'clients tenen')} Excel pendents de pujar.</p>`}
      <div class="row-actions"><${Btn} icon="refresh" disabled=${!on} onClick=${all}>Refés i puja els Excel de tots els clients</${Btn}></div>`
      : html`<p class="muted">En aquesta versió (sense carpeta al núvol) els Excel es descarreguen des de la fitxa de cada client (botó <em>Excel</em>) o des de cada sessió i cada valoració. Amb Microsoft 365 es pugen sols a la carpeta del client.</p>`}
  </section>`;
}
