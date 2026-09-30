/* EON Life · pantalla «Base de dades»: totes les dades dels clients en taules
   (una per àrea, com les pestanyes del full de càlcul), amb filtres, ordenació i «+ Afegeix». */

function DatabaseView({ table = 'valoracions', pid = '' }) {
  const [q, setQ] = useState('');
  const [client, setClient] = useState(pid || '');
  const [prof, setProf] = useState('');
  const [latest, setLatest] = useState(false);
  const [sort, setSort] = useState(null);
  const [limit, setLimit] = useState(150);
  useEffect(() => { setClient(pid || ''); }, [pid]);
  useEffect(() => { setSort(null); setLimit(150); }, [table]);

  const def = DB_TABLES.find((t) => t.id === table) || DB_TABLES[1];
  const cols = useMemo(() => DB.COLUMNS[def.id](), [def.id]);
  const patients = Store.patients();

  let list = DB.withData(def.id, DB.rows(def.id), cols);
  const nq = U.norm(q);
  if (nq) list = list.filter((r) => U.norm(U.fullName(r.p)).includes(nq));
  if (client) list = list.filter((r) => r.p.id === client);
  if (prof) list = list.filter((r) => ((r.a && r.a.professional) || (r.s && r.s.professional) || r.p.professional) === prof);
  if (latest && def.kind === 'assessments') {
    const last = {};
    for (const r of list) if (!last[r.p.id] || r.a.date > last[r.p.id].a.date) last[r.p.id] = r;
    list = Object.values(last);
  }
  const defaultSort = cols.find((c) => c.id === 'date') ? { id: 'date', dir: -1 } : { id: 'client', dir: 1 };
  const s = sort || defaultSort;
  const sortCol = cols.find((c) => c.id === s.id);
  list = DB.sortRows(list, sortCol, s.dir);
  const shown = list.slice(0, limit);

  const toggleSort = (c) => setSort(s.id === c.id ? { id: c.id, dir: -s.dir } : { id: c.id, dir: c.kind === 'date' || c.kind === 'num' || c.kind === 'pct' ? -1 : 1 });
  const open = (r) => {
    if (def.kind === 'patients') go('client', r.p.id);
    else if (def.kind === 'assessments') go('valoracio', r.a.id, def.focus && def.focus !== 'dades' ? def.focus : '');
    else go('sessio', r.s.id);
  };
  const add = () => {
    if (def.kind === 'patients') openNewPatient();
    else if (def.kind === 'assessments') openAddMeasurement(def.focus, client);
  };
  const exportCsv = () => {
    const headers = cols.map(DB.header);
    const data = list.map((r) => Object.fromEntries(cols.map((c, i) => [headers[i], DB.csvValue(c, r)])));
    const ok = U.download(`eonlife-${def.id}-${U.today()}.csv`, U.toCsv(data, headers), 'text/csv');
    if (!ok) UI.toast('No s\'ha pogut descarregar el fitxer.', 'bad');
  };

  return html`<div class="page page-wide">
    <header class="page-head">
      <div><p class="eyebrow">Totes les dades dels clients</p><h1 class="h1">Base de dades</h1></div>
      <div class="page-actions">
        ${!IS_ARTIFACT && html`<${Btn} icon="download" onClick=${exportCsv}>Exporta a Excel</${Btn}>`}
        ${def.add && html`<${Btn} variant="primary" icon="plus" onClick=${add}>${def.add}</${Btn}>`}
      </div>
    </header>

    <div class="dbtabs" role="tablist" aria-label="Taules">
      ${DB_TABLES.map((t) => html`<button type="button" role="tab" aria-selected=${t.id === def.id}
        class=${U.cls('dbtab', t.id === def.id && 'on')} onClick=${() => go('dades', t.id, client)}>${t.label}</button>`)}
    </div>

    <section class="card dbcard">
      <div class="dbbar">
        <label class="search"><${Icon} name="search" size=${17} />
          <input class="input" type="search" placeholder="Cerca un client…" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Cerca un client" /></label>
        <${Select} value=${client} onValue=${(v) => go('dades', def.id, v)} placeholder="Tots els clients" options=${patients.map((p) => ({ v: p.id, label: U.fullName(p) }))} ariaLabel="Client" />
        <${Select} value=${prof} onValue=${setProf} placeholder="Tots els professionals" options=${Store.professionals()} ariaLabel="Professional" />
        ${def.kind === 'assessments' && html`<label class="check"><input type="checkbox" checked=${latest} onChange=${(e) => setLatest(e.currentTarget.checked)} /> Només l'última de cada client</label>`}
      </div>
      <p class="dbhint"><span>${def.hint}</span> <span class="muted">${U.plural(list.length, 'fila', 'files')}${def.kind === 'assessments' || def.kind === 'patients' || def.kind === 'sessions' ? ' · toca una fila per obrir-la' : ''}</span></p>
      ${list.length ? html`<${DbTable} cols=${cols} rows=${shown} sort=${s} onSort=${toggleSort} onOpen=${open} />`
        : html`<${Empty} icon="table" title="Encara no hi ha dades en aquesta taula"
            text=${def.kind === 'assessments' ? 'Toca el botó per afegir-hi mesures d\'un client: s\'obrirà el formulari directament en aquest apartat.' : 'Quan n\'hi hagi, apareixeran aquí.'}>
            ${def.add && html`<${Btn} variant="primary" icon="plus" onClick=${add}>${def.add}</${Btn}>`}
          </${Empty}>`}
      ${list.length > shown.length && html`<div class="row-actions"><${Btn} onClick=${() => setLimit(limit + 300)}>Mostra'n més (${list.length - shown.length})</${Btn}></div>`}
    </section>
  </div>`;
}

function DbTable({ cols, rows, sort, onSort, onOpen }) {
  const grouped = cols.some((c) => c.group);
  // Capçalera en dos nivells: el grup (p. ex. «Quàdriceps») a sobre de D · E · Asim.
  const groups = [];
  for (const c of cols) {
    const last = groups[groups.length - 1];
    if (c.group && last && last.group === c.group) last.cols.push(c);
    else groups.push({ group: c.group || null, cols: [c] });
  }
  const starts = new Set(groups.filter((g) => g.group).map((g) => g.cols[0].id));
  const th = (c, extra = {}) => {
    const active = sort && sort.id === c.id;
    return html`<th class=${U.cls('sortable', c.kind === 'client' && 'sticky', ['num', 'pct', 'signed', 'date'].includes(c.kind) && 'num', starts.has(c.id) && 'gstart', active && 'sorted')}
      rowspan=${extra.rowspan} scope="col" aria-sort=${active ? (sort.dir > 0 ? 'ascending' : 'descending') : 'none'}>
      <button type="button" class="thbtn" onClick=${() => onSort(c)}>${c.label}${c.unit && html`<span class="thunit">${c.unit}</span>`}${active && html`<span class="thsort">${sort.dir > 0 ? '▲' : '▼'}</span>`}</button>
    </th>`;
  };
  return html`<div class="dbwrap">
    <table class=${U.cls('dbt', grouped && 'dbt-grouped')}>
      <thead>
        ${grouped ? html`
          <tr class="dbt-g">${groups.map((g) => (g.group
            ? html`<th colspan=${g.cols.length} class="grp gstart" scope="colgroup">${g.group}</th>`
            : th(g.cols[0], { rowspan: 2 })))}</tr>
          <tr class="dbt-h">${cols.filter((c) => c.group).map((c) => th(c))}</tr>`
          : html`<tr class="dbt-h">${cols.map((c) => th(c))}</tr>`}
      </thead>
      <tbody>${rows.map((r) => html`<tr key=${r.key} onClick=${() => onOpen(r)} tabindex="0" onKeyDown=${(e) => { if (e.key === 'Enter') onOpen(r); }}>
        ${cols.map((c) => html`<${DbCell} c=${c} r=${r} gstart=${starts.has(c.id)} />`)}
      </tr>`)}</tbody>
    </table>
  </div>`;
}

function DbCell({ c, r, gstart }) {
  const v = c.get(r);
  const tone = c.tone ? c.tone(r, v) : '';
  const isEmpty = DB.empty(v);
  const cls = U.cls(gstart && 'gstart', ['num', 'pct', 'signed', 'date'].includes(c.kind) && 'num', c.wide && 'wide');
  const wrap = (text) => (tone && !isEmpty ? html`<span class=${`pill pill-${tone}`}>${text}</span>` : text);
  if (c.kind === 'client') return html`<td class="sticky dbname">${v}</td>`;
  if (isEmpty && c.kind !== 'score') return html`<td class=${U.cls(cls, 'dbempty')}>—</td>`;
  switch (c.kind) {
    case 'date': return html`<td class=${cls}>${wrap(U.fmtDate(v))}</td>`;
    case 'num': return html`<td class=${cls}>${wrap(U.fmtFixed(v, c.dec ?? 1))}</td>`;
    case 'signed': return html`<td class=${cls}>${wrap(U.fmtSigned(v, c.dec ?? 1))}</td>`;
    case 'pct': return html`<td class=${cls}>${wrap(`${U.fmtFixed(v, c.dec ?? 0)} %`)}</td>`;
    case 'score': {
      const pain = c.pain ? c.pain(r) : false;
      if (!v && !pain) return html`<td class=${U.cls(cls, 'dbempty')}>—</td>`;
      return html`<td class=${U.cls(cls, 'center')}><${ScoreDot} v=${v} pain=${pain && !v} size="xs" />${pain && v ? html` <${ScoreDot} pain=${true} size="xs" />` : ''}</td>`;
    }
    case 'pain': return html`<td class=${U.cls(cls, 'center')}><${ScoreDot} pain=${true} size="xs" /></td>`;
    case 'block': return html`<td class=${cls}><${BlockTag} k=${v} small=${true} /></td>`;
    default: return html`<td class=${cls}>${wrap(v)}</td>`;
  }
}

// ── Afegir mesures: tria el client i la data i obre el formulari a l'apartat corresponent ──
function openAddMeasurement(focus, pid) {
  if (!Store.patients().length) { UI.toast('Primer crea un client.', 'bad'); openNewPatient(); return; }
  let close = null;
  close = UI.open(() => html`<${AddMeasurementDialog} focus=${focus} pid=${pid} onClose=${() => close()} />`);
}

const FOCUS_LABELS = {
  dades: 'Valoració completa', rom: 'Mobilitat (K-Move)', wblt: 'Knee-to-wall', neuro: 'Neurodinàmia i postural',
  dyn: 'Dinamometria (K-Push)', sls: 'Single Leg Squat', ybt: 'Y-Balance', jumps: 'Salts (My Jump)',
  encoder: 'Encoder i bike', patterns: 'Patrons de moviment', profile: 'Tests per perfil',
};

function AddMeasurementDialog({ focus = 'dades', pid, onClose }) {
  const patients = Store.patients();
  const [p, setP] = useState(pid || (patients[0] && patients[0].id) || '');
  const [date, setDate] = useState(U.today());
  const [what, setWhat] = useState(focus || 'dades');
  const prev = p ? Store.assessmentsOf(p) : [];
  const existing = prev.find((a) => a.date === date);
  const suggested = !prev.length ? 'inicial' : what === 'dades' ? 'retest' : 'control';
  const [type, setType] = useState(null);
  const t = type || suggested;
  const go_ = () => {
    if (!p) return;
    const a = existing || Store.newAssessment(p, { date, type: t });
    onClose();
    go('valoracio', a.id, what === 'dades' ? '' : what);
  };
  return html`<${Dialog} title="Afegeix mesures" onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="right" onClick=${go_}>Continua</${Btn}>`}>
    <div class="form-grid">
      <${Field} label="Client" id="am-client" wide=${true}>
        <${Select} id="am-client" value=${p} onValue=${(v) => { setP(v); setType(null); }} options=${patients.map((x) => ({ v: x.id, label: U.fullName(x) }))} />
      </${Field}>
      <${Field} label="Què vols registrar?" id="am-what" wide=${true}>
        <${Select} id="am-what" value=${what} onValue=${(v) => { setWhat(v); setType(null); }} options=${Object.entries(FOCUS_LABELS).map(([v, label]) => ({ v, label }))} />
      </${Field}>
      <${Field} label="Data" id="am-date"><${TextInput} id="am-date" type="date" value=${date} onValue=${setDate} /></${Field}>
      ${!existing && html`<${Field} label="Tipus" id="am-type"><${Select} id="am-type" value=${t} onValue=${setType} options=${OPT.assessmentTypes.map((o) => ({ v: o.v, label: o.label }))} /></${Field}>`}
    </div>
    <p class="dialog-text">${existing
      ? `Aquest client ja té una valoració el ${U.fmtDate(date)} (${(OPT.assessmentTypes.find((o) => o.v === existing.type) || {}).label.toLowerCase()}): les mesures s'hi afegiran.`
      : prev.length ? `Es crearà una valoració nova del ${U.fmtDate(date)}. Només cal omplir el que mesureu avui; la resta pot quedar en blanc.`
        : 'És la primera valoració d\'aquest client.'}</p>
  </${Dialog}>`;
}
