/* EON Life · fitxa del client: resum, sessions, seguiment mensual, valoracions i dades. */

function PatientView({ id, tab = 'resum' }) {
  const p = Store.get('patients', id);
  if (!p) return html`<div class="page"><${Empty} icon="users" title="No trobo aquest client" text="Potser s'ha eliminat.">
    <${Btn} onClick=${() => go('inici')}>Torna a l'inici</${Btn}></${Empty}></div>`;
  const sessions = Store.sessionsOf(id);
  const assessments = Store.assessmentsOf(id);
  const setTab = (t) => go('client', id, t);
  const service = OPT.services.find((o) => o.v === p.service);
  const age = U.age(p.birthDate);
  const status = OPT.status.find((o) => o.v === p.status);

  const remove = async () => {
    const ok = await UI.confirm({ title: `Eliminar ${U.fullName(p)}?`, text: 'S\'amagaran el client, les seves valoracions i les sessions. Al full de càlcul queden marcats com a eliminats i es poden recuperar.', ok: 'Elimina', danger: true });
    if (!ok) return;
    Store.remove('patients', p.id);
    UI.toast('Client eliminat.');
    go('inici');
  };

  return html`<div class="page">
    <nav class="crumbs"><button type="button" class="link" onClick=${() => go('inici')}><${Icon} name="back" size=${16} />Clients</button></nav>
    <header class="phead">
      <${Avatar} p=${p} size="lg" />
      <div class="phead-main">
        <p class="eyebrow">${service ? service.label : 'Sense servei'}${status && status.v !== 'actiu' ? ` · ${status.label}` : ''}</p>
        <h1 class="h1">${U.fullName(p)}</h1>
        <p class="phead-meta">${[age != null && `${age} anys`, p.professional, p.startDate && `Client des del ${U.fmtDate(p.startDate)}`].filter(Boolean).join(' · ')}</p>
        ${p.goal && html`<p class="phead-goal"><${Icon} name="target" size=${16} />${p.goal}</p>`}
        <${KeyDates} p=${p} />
      </div>
      <div class="phead-actions">
        <${Btn} variant="primary" icon="plus" onClick=${() => openNewSession(p.id)}>Nova sessió</${Btn}>
        <${Btn} icon="clipboard" onClick=${() => createAssessment(p.id)}>${assessments.length ? 'Nova valoració' : 'Valoració inicial'}</${Btn}>
        ${p.folderUrl ? html`<${Btn} icon="folder" href=${p.folderUrl}>Carpeta</${Btn}>`
          : Store.cloud() ? html`<${Btn} icon="folder" onClick=${() => ensureFolder(p)}>Crea la carpeta</${Btn}>` : null}
        <${Menu} items=${[
          { label: 'Edita les dades', icon: 'edit', onClick: () => setTab('fitxa') },
          { sep: true },
          { label: 'Elimina el client', icon: 'trash', danger: true, onClick: remove },
        ]} />
      </div>
    </header>

    <${Tabs} active=${tab} onChange=${setTab} tabs=${[
      { id: 'resum', label: 'Resum' },
      { id: 'sessions', label: 'Sessions', count: sessions.length },
      { id: 'mes', label: 'Seguiment mensual' },
      { id: 'valoracions', label: 'Valoracions', count: assessments.length },
      { id: 'fitxa', label: 'Fitxa' },
    ]} />

    ${tab === 'resum' && html`<${PatientSummary} p=${p} sessions=${sessions} assessments=${assessments} />`}
    ${tab === 'sessions' && html`<${PatientSessions} p=${p} sessions=${sessions} />`}
    ${tab === 'mes' && html`<${MonthView} p=${p} sessions=${sessions} />`}
    ${tab === 'valoracions' && html`<${PatientAssessments} p=${p} assessments=${assessments} />`}
    ${tab === 'fitxa' && html`<${PatientForm} p=${p} onRemove=${remove} />`}
  </div>`;
}

function PatientSummary({ p, sessions, assessments }) {
  const today = U.today();
  const next = sessions.filter((s) => s.date >= today && s.status !== 'feta')[0];
  const lastDone = sessions.filter((s) => s.status === 'feta').pop();
  const last = assessments[assessments.length - 1];
  const alerts = last ? Calc.alerts(last) : [];
  const weeks = Calc.weeks(sessions, U.addDays(U.weekStart(today), -7 * 9), 10);
  const quick = [['dades', 'Valoració completa'], ['rom', 'Mobilitat'], ['dyn', 'Dinamometria'], ['ybt', 'Y-Balance'], ['jumps', 'Salts · CMJ'], ['patterns', 'Patrons']];
  return html`<section class="card quickadd">
    <div class="quickadd-head"><h2 class="h2">Registrar mesures</h2><span class="muted small">Obre el formulari directament a l'apartat</span></div>
    <div class="quickadd-chips">
      ${quick.map(([f, label]) => html`<button type="button" class="chip" onClick=${() => openAddMeasurement(f, p.id)}><${Icon} name="plus" size=${14} />${label}</button>`)}
      <button type="button" class="chip" onClick=${() => go('dades', 'valoracions', p.id)}><${Icon} name="table" size=${14} />Veure totes les dades</button>
    </div>
  </section>
  <div class="grid-2">
    <section class="card">
      <div class="card-head"><h2 class="h2">Propera sessió</h2>
        <${Btn} size="sm" variant="ghost" icon="plus" onClick=${() => openNewSession(p.id)}>Nova</${Btn}></div>
      ${next ? html`<div class="slist"><${SessionRow} s=${next} /></div>
        <div class="row-actions"><${Btn} variant="primary" icon="play" onClick=${() => go('fitxa', next.id)}>Presenta al client</${Btn}>
        <${Btn} icon="edit" onClick=${() => go('sessio', next.id)}>Edita</${Btn}></div>`
        : html`<${Empty} icon="calendar" title="Cap sessió planificada" text="Crea la propera sessió copiant l'última o des d'una plantilla." />`}
      ${lastDone && html`<div class="lastfb">
        <h3 class="h3">Última sessió feta · ${U.fmtDate(lastDone.date)}</h3>
        <div class="kv-row">
          <div class="kv"><span>RPE</span><strong>${lastDone.feedback.rpe || '—'}</strong></div>
          <div class="kv"><span>Durada</span><strong>${lastDone.feedback.duration ? `${lastDone.feedback.duration} min` : '—'}</strong></div>
          <div class="kv"><span>Càrrega</span><strong>${Calc.sessionLoad(lastDone) != null ? `${U.fmt(Calc.sessionLoad(lastDone), 0)} UA` : '—'}</strong></div>
          <div class="kv"><span>Dolor</span><strong>${lastDone.feedback.pain != null && lastDone.feedback.pain !== '' ? `${lastDone.feedback.pain}/10` : '—'}</strong></div>
        </div>
        ${lastDone.feedback.decision && html`<p class="decision"><${Icon} name="right" size=${15} />${lastDone.feedback.decision}</p>`}
      </div>`}
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Última valoració</h2>
        ${last && html`<span class="muted">${U.fmtDate(last.date)} · ${(OPT.assessmentTypes.find((t) => t.v === last.type) || {}).label}</span>`}</div>
      ${last ? html`
        <${PatternStrip} a=${last} />
        ${alerts.length ? html`<ul class="alerts">${alerts.slice(0, 5).map((a) => html`<li class=${`alert alert-${a.tone}`}><${Icon} name=${a.tone === 'bad' ? 'alert' : 'info'} size=${16} />${a.text}</li>`)}</ul>
          ${alerts.length > 5 && html`<p class="muted">i ${alerts.length - 5} punts més a l'informe.</p>`}` : html`<p class="muted">Cap punt d'atenció automàtic.</p>`}
        <div class="row-actions">
          <${Btn} variant="primary" icon="play" onClick=${() => go('informe', last.id)}>Informe</${Btn}>
          <${Btn} icon="edit" onClick=${() => go('valoracio', last.id)}>Edita</${Btn}>
        </div>`
        : html`<${Empty} icon="clipboard" title="Sense valoració" text="La valoració inicial recull mobilitat, força, rendiment i patrons de moviment.">
          <${Btn} variant="primary" icon="clipboard" onClick=${() => createAssessment(p.id)}>Fes la valoració inicial</${Btn}></${Empty}>`}
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Càrrega setmanal</h2><span class="muted">RPE × minuts · UA</span></div>
      <${WeekBars} weeks=${weeks} currentWeek=${U.weekStart(today)} />
    </section>

    <section class="card">
      <${EvolutionCard} assessments=${assessments} />
    </section>
  </div>`;
}

function EvolutionCard({ assessments, compact }) {
  const metrics = useMemo(() => Calc.metrics().filter((m) => assessments.some((a) => {
    const v = m.get(a);
    return m.bi ? v && (v.d != null || v.e != null) : v != null;
  })), [assessments]);
  const [mid, setMid] = useState(null);
  const m = metrics.find((x) => x.id === mid) || metrics.find((x) => x.id === 'cmj') || metrics[0];
  if (!m) return html`<div class="card-head"><h2 class="h2">Evolució</h2></div>
    <${Empty} icon="chart" title="Encara no hi ha dades" text="Quan hi hagi valoracions, aquí es veurà l'evolució de cada test." />`;
  const series = m.bi
    ? [{ name: 'Dreta', color: 'var(--side-d)', points: assessments.map((a) => ({ x: a.date, y: (m.get(a) || {}).d })) },
      { name: 'Esquerra', color: 'var(--side-e)', points: assessments.map((a) => ({ x: a.date, y: (m.get(a) || {}).e })) }]
    : [{ name: m.label, color: 'var(--series-1)', points: assessments.map((a) => ({ x: a.date, y: m.get(a) })) }];
  return html`<div class="card-head"><h2 class="h2">Evolució</h2>
      <${Select} value=${m.id} onValue=${setMid} options=${metrics.map((x) => ({ v: x.id, label: x.label }))} ariaLabel="Test" class="select-sm" /></div>
    <${LineChart} series=${series} unit=${m.unit} decimals=${m.unit === 'N' ? 0 : 1} ariaLabel=${`Evolució: ${m.label}`} height=${compact ? 180 : 220} />
    ${assessments.length < 2 && html`<p class="muted small">Amb el re-test (cada ${THRESHOLDS.retestMonths} mesos) es veurà la tendència.</p>`}`;
}

function PatientSessions({ p, sessions }) {
  const groups = {};
  for (const s of sessions) (groups[U.weekStart(s.date)] = groups[U.weekStart(s.date)] || []).push(s);
  const keys = Object.keys(groups).sort().reverse();
  return html`<section class="card">
    <div class="card-head"><h2 class="h2">Sessions</h2>
      <${Btn} variant="primary" icon="plus" onClick=${() => openNewSession(p.id)}>Nova sessió</${Btn}></div>
    ${keys.length ? keys.map((wk) => {
      const list = groups[wk].slice().reverse();
      const w = Calc.weeks(groups[wk], wk, 1)[0];
      return html`<div class="wgroup">
        <div class="wgroup-head"><span>Setmana del ${U.fmtDateLong(wk, false)}</span>
          <span class="muted">${w.done}/${list.length} fetes${w.load ? ` · ${U.fmt(w.load, 0)} UA` : ''}</span></div>
        <div class="slist">${list.map((s) => html`<${SessionRow} s=${s} />`)}</div>
      </div>`;
    }) : html`<${Empty} icon="calendar" title="Encara no hi ha sessions" text="Cada sessió té 6 blocs: mobilitat, activació, potència, força principal, accessoris i tornada a la calma.">
      <${Btn} variant="primary" icon="plus" onClick=${() => openNewSession(p.id)}>Crea la primera sessió</${Btn}></${Empty}>`}
  </section>`;
}

function PatientAssessments({ p, assessments }) {
  const [allRows, setAllRows] = useState(false);
  const list = assessments.slice().reverse();
  const cur = list[0], prev = list[1];
  const cmp = cur && prev ? Calc.compare(cur, prev, !allRows) : [];
  const remove = async (a) => {
    const ok = await UI.confirm({ title: 'Eliminar la valoració?', text: `${(OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label} del ${U.fmtDate(a.date)}.`, ok: 'Elimina', danger: true });
    if (ok) { Store.remove('assessments', a.id); UI.toast('Valoració eliminada.'); }
  };
  return html`<div class="stack">
    <section class="card">
      <div class="card-head"><h2 class="h2">Valoracions</h2>
        <${Btn} variant="primary" icon="clipboard" onClick=${() => createAssessment(p.id)}>${list.length ? 'Nou re-test' : 'Valoració inicial'}</${Btn}></div>
      ${list.length ? html`<div class="alist">${list.map((a) => {
        const c = Calc.cmj(a), pc = Calc.patterns(a), al = Calc.alerts(a);
        return html`<div class="arow">
          <${DateBlock} date=${a.date} />
          <button type="button" class="arow-main" onClick=${() => go('valoracio', a.id)}>
            <span class="arow-title"><strong>${(OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label}</strong><span class="muted">${a.professional}</span></span>
            <span class="arow-meta">
              ${c && c.best != null && html`<span>CMJ <strong>${U.fmt(c.best)} cm</strong></span>`}
              ${pc.scored > 0 && html`<span class="arow-scores"><${ScoreDot} v="0" size="xs" />${pc.counts['0']} <${ScoreDot} v="-" size="xs" />${pc.counts['-']} <${ScoreDot} v="--" size="xs" />${pc.counts['--']}${pc.counts.P ? html` <${ScoreDot} pain=${true} size="xs" />${pc.counts.P}` : ''}</span>`}
              <span class=${al.some((x) => x.tone === 'bad') ? 'warn-text' : 'muted'}>${U.plural(al.length, 'punt d\'atenció', 'punts d\'atenció')}</span>
            </span>
          </button>
          <div class="arow-actions">
            <${Btn} variant="ghost" icon="play" title="Informe per al client" onClick=${() => go('informe', a.id)} />
            <${Menu} items=${[{ label: 'Edita', icon: 'edit', onClick: () => go('valoracio', a.id) }, { label: 'Elimina', icon: 'trash', danger: true, onClick: () => remove(a) }]} />
          </div>
        </div>`;
      })}</div>` : html`<${Empty} icon="clipboard" title="Encara no hi ha valoracions" text="Mobilitat i anàlisi postural, força, rendiment i sessió 1 de patrons bàsics." />`}
    </section>
    ${list.length > 0 && html`<section class="card"><${EvolutionCard} assessments=${assessments} /></section>`}
    ${cmp.length > 0 && html`<section class="card">
      <div class="card-head"><h2 class="h2">Comparació amb la valoració anterior</h2>
        <span class="inline"><span class="muted">${U.fmtDate(prev.date)} → ${U.fmtDate(cur.date)}</span>
        <label class="check"><input type="checkbox" checked=${allRows} onChange=${(e) => setAllRows(e.currentTarget.checked)} /> Tots els tests</label></span></div>
      <${CompareTable} rows=${cmp} />
    </section>`}
  </div>`;
}

function CompareTable({ rows }) {
  return html`<div class="table-wrap"><table class="table">
    <thead><tr><th>Test</th><th class="num">Anterior</th><th class="num">Actual</th><th class="num">Canvi</th></tr></thead>
    <tbody>${rows.map((r) => html`<tr>
      <td>${r.label}</td>
      <td class="num">${U.fmt(r.prev, r.unit === 'N' ? 0 : 1)} <span class="muted">${r.unit}</span></td>
      <td class="num">${U.fmt(r.cur, r.unit === 'N' ? 0 : 1)} <span class="muted">${r.unit}</span></td>
      <td class="num"><span class=${U.cls('delta', r.better === true && 'delta-up', r.better === false && 'delta-down')}>
        ${r.better === true ? '▲' : r.better === false ? '▼' : '•'} ${U.fmtSigned(r.delta, r.unit === 'N' ? 0 : 1)}</span></td>
    </tr>`)}</tbody>
  </table></div>`;
}

function PatientForm({ p, onRemove }) {
  const set = (k) => (v) => Store.update('patients', p.id, (x) => { x[k] = v; });
  const F = (label, k, opts = {}) => html`<${Field} label=${label} id=${`pf-${k}`} wide=${opts.wide}>
    ${opts.area ? html`<${Area} id=${`pf-${k}`} value=${p[k]} onValue=${set(k)} placeholder=${opts.placeholder} />`
      : opts.options ? html`<${Select} id=${`pf-${k}`} value=${p[k]} onValue=${set(k)} options=${opts.options} placeholder=${opts.empty} />`
      : html`<${TextInput} id=${`pf-${k}`} type=${opts.type || 'text'} value=${p[k]} onValue=${set(k)} placeholder=${opts.placeholder} list=${opts.list} />`}
  </${Field}>`;
  return html`<div class="stack">
    <section class="card">
      <div class="card-head"><h2 class="h2">Dades personals</h2><${SaveStatus} /></div>
      <div class="form-grid">
        ${F('Nom', 'firstName')}${F('Cognoms', 'lastName')}
        ${F('Data de naixement', 'birthDate', { type: 'date' })}${F('Sexe', 'sex', { options: OPT.sex, empty: '—' })}
        ${F('Correu electrònic', 'email', { type: 'email' })}${F('Telèfon', 'phone', { type: 'tel' })}
      </div>
    </section>
    <${DoctorReportCard} p=${p} />
    <section class="card">
      <div class="card-head"><h2 class="h2">Seguiment al centre</h2></div>
      <div class="form-grid">
        <${Field} label="Servei" id="pf-service" wide=${true}>
          <${Seg} value=${p.service} onValue=${set('service')} allowEmpty=${false} ariaLabel="Servei" options=${OPT.services.map((o) => ({ v: o.v, label: o.label, title: o.desc }))} />
        </${Field}>
        ${F('Professional de referència', 'professional', { list: 'prof-list', placeholder: 'Nom del professional' })}
        ${F('Estat', 'status', { options: OPT.status })}
        ${F('Data d\'alta al centre', 'startDate', { type: 'date' })}
        ${F('Objectiu', 'goal', { area: true, wide: true, placeholder: 'Què vol aconseguir el client?' })}
        ${F('Motiu de consulta', 'reason', { area: true, wide: true })}
        ${F('Antecedents i historial', 'history', { area: true, wide: true, placeholder: 'Lesions, cirurgies, patologies, medicació, esport…' })}
      </div>
      <${ProfessionalsList} />
    </section>
    <section class="card">
      <div class="card-head"><h2 class="h2">Dates clau</h2><span class="muted">Es compten els dies des de la data</span></div>
      <div class="form-grid">
        ${F('Data de la intervenció (IQ)', 'surgeryDate', { type: 'date' })}${F('Intervenció', 'surgeryNote', { placeholder: 'p. ex. Reconstrucció LCA genoll esquerre' })}
        ${F('Data de la lesió', 'injuryDate', { type: 'date' })}${F('Lesió', 'injuryNote', { placeholder: 'p. ex. Distensió d\'adductor' })}
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h2 class="h2">Carpeta al núvol</h2></div>
      <p class="muted">Vídeos de la valoració i dels exercicis, informes en PDF i documents del client. Es pot compartir amb el client en mode lectura.</p>
      <div class="form-grid">
        ${F(Store.cloud() ? `Enllaç de la carpeta (${Store.cloudName()})` : 'Enllaç de la carpeta del client', 'folderUrl', { wide: true, placeholder: 'https://…' })}
      </div>
      <div class="row-actions">
        ${p.folderUrl && html`<${Btn} icon="folder" href=${p.folderUrl}>Obre la carpeta</${Btn}>`}
        ${!p.folderUrl && Store.cloud() && html`<${Btn} icon="folder" onClick=${() => ensureFolder(p)}>Crea la carpeta del client</${Btn}>`}
      </div>
    </section>
    <section class="card">
      <div class="card-head"><h2 class="h2">Notes internes</h2></div>
      <${Area} value=${p.notes} onValue=${set('notes')} placeholder="Només per a l'equip. No surten als informes." rows=${3} ariaLabel="Notes internes" />
    </section>
    <div class="danger-zone">
      <${Btn} variant="danger" icon="trash" onClick=${onRemove}>Elimina el client</${Btn}>
    </div>
  </div>`;
}

// ── Informe previ de la doctora ──
// S'enganxa el text (o es tria un Word o un .txt) i es reparteix pels camps del client, amb una vista prèvia.
function DoctorReportCard({ p }) {
  const [text, setText] = useState('');
  const [pct, setPct] = useState(null);
  const fileRef = useRef(null);
  const pdfRef = useRef(null);
  const docs = p.docs || [];
  const readFile = async (file) => {
    if (fileRef.current) fileRef.current.value = '';
    if (!file) return;
    try {
      const t = /\.docx$/i.test(file.name) ? await DoctorReport.docxText(await file.arrayBuffer()) : await U.readFile(file);
      setText(t);
      openDoctorPreview(p, t);
    } catch (e) {
      UI.toast(e.message || 'No s\'ha pogut llegir el fitxer.', 'bad');
    }
  };
  const uploadPdf = async (file) => {
    if (pdfRef.current) pdfRef.current.value = '';
    if (!file) return;
    setPct(0);
    try {
      const res = await uploadToClient(p, file, { label: 'Informe mèdic', subfolder: '03 · Informes', onProgress: setPct });
      Store.update('patients', p.id, (x) => { x.docs = [...(x.docs || []), { id: U.uid('F'), name: res.name, url: res.url, date: U.today() }]; });
      UI.toast('Informe desat a la carpeta del client.');
    } catch (e) {
      UI.toast(e.message, 'bad');
    }
    setPct(null);
  };
  return html`<section class="card" id="doctor-report">
    <div class="card-head"><h2 class="h2">Informe de la doctora</h2></div>
    <p class="muted">Enganxa el text de l'informe previ (o tria'n el fitxer de Word) i l'app omple l'objectiu, el motiu de consulta, els antecedents i les dates de la intervenció i la lesió. Abans de desar-ho veuràs què va a cada lloc.</p>
    <${Area} value=${text} onValue=${setText} rows=${4} ariaLabel="Text de l'informe de la doctora"
      placeholder=${'Motiu de consulta: …\nAntecedents: …\nDiagnòstic: …\nObjectiu: …'} />
    <div class="row-actions">
      <${Btn} variant="primary" icon="check" disabled=${!text.trim()} onClick=${() => openDoctorPreview(p, text)}>Omple les dades del client</${Btn}>
      <input type="file" accept=".docx,.txt,text/plain,application/vnd.openxmlformats-officedocument.wordprocessingml.document" hidden ref=${fileRef} onChange=${(e) => readFile(e.currentTarget.files[0])} />
      <${Btn} icon="upload" onClick=${() => fileRef.current && fileRef.current.click()}>Llegeix un Word</${Btn}>
      ${canUploadFiles() && html`<input type="file" accept=".pdf,application/pdf,image/*,.docx" hidden ref=${pdfRef} onChange=${(e) => uploadPdf(e.currentTarget.files[0])} />
        ${pct != null ? html`<span class="attach-busy"><span class="spinner"></span>Pujant… ${Math.round(pct * 100)} %</span>`
          : html`<${Btn} icon="folder" onClick=${() => pdfRef.current && pdfRef.current.click()}>Desa el PDF a la carpeta</${Btn}>`}`}
    </div>
    ${docs.length > 0 && html`<ul class="files mt">${docs.map((f) => html`<li class="file" key=${f.id}><${Icon} name="note" size=${18} />
      <a class="link file-name" href=${f.url} target="_blank" rel="noopener">${f.name}</a><span class="muted small">${U.fmtDate(f.date)}</span></li>`)}</ul>`}
    ${p.medical && html`<details class="medical mt"><summary>Últim informe aplicat${p.medicalDate ? ` · ${U.fmtDate(p.medicalDate)}` : ''}</summary><p class="prose small">${p.medical}</p></details>`}
  </section>`;
}

function openDoctorPreview(p, text) {
  const found = DoctorReport.parse(text);
  const keys = Object.keys(found);
  if (!keys.length) { UI.toast('No he trobat cap dada a l\'informe.', 'bad'); return; }
  let close = null;
  close = UI.open(() => html`<${DoctorPreview} p=${p} text=${text} found=${found} onClose=${() => close()} />`, { onDismiss: () => close() });
}

function DoctorPreview({ p, text, found, onClose }) {
  const [on, setOn] = useState(Object.fromEntries(Object.keys(found).map((k) => [k, true])));
  const apply = () => {
    Store.update('patients', p.id, (x) => {
      for (const [k, v] of Object.entries(found)) {
        if (!on[k]) continue;
        const cur = String(x[k] || '').trim();
        // Les dates se substitueixen; els textos s'afegeixen al que ja hi havia.
        x[k] = /Date$/.test(k) || !cur ? v : cur.includes(v) ? cur : `${cur}\n${v}`;
      }
      x.medical = text.trim();
      x.medicalDate = U.today();
    });
    onClose();
    UI.toast('Dades del client actualitzades amb l\'informe de la doctora.');
  };
  return html`<${Dialog} title="Informe de la doctora" wide=${true} onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="check" onClick=${apply} disabled=${!Object.values(on).some(Boolean)}>Desa a la fitxa</${Btn}>`}>
    <p class="dialog-text">Això és el que he trobat. Desmarca el que no vulguis desar. Els textos s'afegeixen al que ja hi ha i les dates se substitueixen.</p>
    <div class="docmap">${Object.entries(found).map(([k, v]) => html`<label class=${U.cls('docrow', !on[k] && 'off')} key=${k}>
      <input type="checkbox" checked=${on[k]} onChange=${(e) => setOn({ ...on, [k]: e.currentTarget.checked })} />
      <span class="docrow-k">${DoctorReport.LABELS[k] || k}${p[k] && !/Date$/.test(k) ? html`<span class="muted small"> · s'afegeix</span>` : ''}</span>
      <span class="docrow-v">${/Date$/.test(k) ? U.fmtDate(v) : v}</span>
    </label>`)}</div>
  </${Dialog}>`;
}
