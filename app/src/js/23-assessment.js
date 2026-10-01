/* EON Life · valoració funcional a la tauleta (Mobilitat · Força · Rendiment · Patrons · Perfil).
   Tot es calcula al moment: asimetries, N/kg, composite del Y-Balance, resum de salts i patrons. */

function AssessmentEditor({ id, focus }) {
  // Si s'hi arriba des de la base de dades («+ Afegeix dinamometria»…), baixa fins al grup i el ressalta.
  useEffect(() => {
    if (!focus) return undefined;
    const t = setTimeout(() => {
      const el = document.getElementById(`grp-${focus}`) || document.getElementById(`sec-${focus}`);
      if (!el) return;
      el.scrollIntoView({ block: 'start' });
      el.classList.add('flash');
      setTimeout(() => el.classList.remove('flash'), 1800);
    }, 80);
    return () => clearTimeout(t);
  }, [id, focus]);
  const a = Store.get('assessments', id);
  if (!a) return html`<div class="page"><${Empty} icon="clipboard" title="No trobo aquesta valoració" text="Potser s'ha eliminat.">
    <${Btn} onClick=${() => go('inici')}>Torna a l'inici</${Btn}></${Empty}></div>`;
  const p = Store.get('patients', a.patientId) || {};
  const upd = (fn) => Store.update('assessments', a.id, fn);
  const set = (k) => (v) => upd((x) => { x[k] = v; });
  const setGen = (k) => (v) => upd((x) => { x.general = { ...(x.general || {}), [k]: v }; });
  const setCon = (k) => (v) => upd((x) => { x.conclusions = { ...(x.conclusions || {}), [k]: v }; });
  const setVal = (tid, k, v) => upd((x) => { x.values = x.values || {}; x.values[tid] = { ...(x.values[tid] || {}), [k]: v }; });
  const g = a.general || {}, c = a.conclusions || {};
  const alerts = Calc.alerts(a);
  const typeLabel = (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració';

  const remove = async () => {
    if (!(await UI.confirm({ title: 'Eliminar la valoració?', text: `${typeLabel} del ${U.fmtDate(a.date)}.`, ok: 'Elimina', danger: true }))) return;
    Store.remove('assessments', a.id);
    go('client', a.patientId, 'valoracions');
  };
  const scrollTo = (sid) => {
    const el = document.getElementById(`sec-${sid}`);
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };
  const nav = [{ id: 'dades', label: 'Dades' }, ...PROTOCOL.map((s) => ({ id: s.id, label: s.short, n: sectionProgress(a, s, p) })), { id: 'conclusions', label: 'Conclusions' }];

  return html`<div class="page page-edit">
    <div class="editbar">
      <${Btn} variant="ghost" icon="back" title="Torna a la fitxa del client" onClick=${() => go('client', a.patientId, 'valoracions')} />
      <div class="editbar-title"><strong>${typeLabel}</strong><span>${U.fullName(p)} · ${U.fmtDate(a.date)}</span></div>
      <${SaveStatus} />
      <${Btn} variant="primary" icon="play" onClick=${() => go('informe', a.id)}>Informe</${Btn}>
      <${Menu} items=${[{ label: 'Elimina la valoració', icon: 'trash', danger: true, onClick: remove }]} />
      <nav class="secnav" aria-label="Seccions de la valoració">
        ${nav.map((n) => html`<button type="button" class="secnav-btn" onClick=${() => scrollTo(n.id)}>${n.label}${n.n && n.n.total ? html`<span class=${U.cls('secnav-n', n.n.done === n.n.total && 'full')}>${n.n.done}/${n.n.total}</span>` : ''}</button>`)}
      </nav>
    </div>

    <section class="card" id="sec-dades">
      <div class="card-head"><h2 class="h2">Dades de la valoració</h2></div>
      <div class="form-grid form-grid-4">
        <${Field} label="Data" id="as-date"><${TextInput} id="as-date" type="date" value=${a.date} onValue=${set('date')} /></${Field}>
        <${Field} label="Tipus" id="as-type"><${Select} id="as-type" value=${a.type} onValue=${set('type')} options=${OPT.assessmentTypes} /></${Field}>
        <${Field} label="Professional" id="as-prof"><${ProfSelect} id="as-prof" value=${a.professional} onValue=${set('professional')} /></${Field}>
        <${Field} label="Pes" id="as-weight"><${NumInput} id="as-weight" value=${g.weight} onValue=${setGen('weight')} unit="kg" /></${Field}>
        <${Field} label="Alçada" id="as-height"><${NumInput} id="as-height" value=${g.height} onValue=${setGen('height')} unit="cm" /></${Field}>
        <${Field} label="Motiu / objectiu" id="as-goal" wide=${true}><${TextInput} id="as-goal" value=${g.goal} onValue=${setGen('goal')} /></${Field}>
        <${Field} label="Vídeo general de la valoració" id="as-video">
          <div class="inline"><${VideoButton} url=${g.video} title="Vídeo general" patient=${p} onChange=${setGen('video')} /><span class="muted small">${U.isUrl(g.video) ? 'Enllaç desat' : 'Sense enllaç'}</span></div>
        </${Field}>
      </div>
    </section>

    <${AssessmentFiles} a=${a} p=${p} upd=${upd} />

    ${PROTOCOL.map((sec) => html`<section class="asec" id=${`sec-${sec.id}`}>
      <div class="asec-head">
        <h2 class="asec-title">${sec.title}</h2>
        ${areaHasData(a, sec.id) && html`<${Btn} variant="ghost" size="sm" icon="play" onClick=${() => go('informe', a.id, sec.id)}
          title=${`Informe només de ${sec.short.toLowerCase()}, comparat amb l'última vegada`}>Informe de ${sec.short.toLowerCase()}</${Btn}>`}
      </div>
      ${sec.groups.map((grp) => html`<${GroupCard} key=${grp.id} g=${grp} a=${a} p=${p} upd=${upd} setVal=${setVal} />`)}
    </section>`)}

    <section class="card" id="sec-conclusions">
      <div class="card-head"><h2 class="h2">Conclusions i pla</h2></div>
      <h3 class="h3">Punts d'atenció automàtics</h3>
      ${alerts.length ? html`<ul class="alerts">${alerts.map((x) => html`<li class=${`alert alert-${x.tone}`}><${Icon} name=${x.tone === 'bad' ? 'alert' : 'info'} size=${16} />${x.text}</li>`)}</ul>`
        : html`<p class="muted">Cap punt d'atenció amb les dades actuals.</p>`}
      <div class="form-grid mt">
        <${Field} label="Punts forts" id="co-str" wide=${true}><${Area} id="co-str" value=${c.strengths} onValue=${setCon('strengths')} placeholder="Què fa bé el client, on té marge…" /></${Field}>
        <${Field} label="Prioritats" id="co-pri" wide=${true}><${Area} id="co-pri" value=${c.priorities} onValue=${setCon('priorities')} placeholder=${'1. …\n2. …'} /></${Field}>
        <${Field} label="Decisions per al pla d'entrenament" id="co-plan" wide=${true}><${Area} id="co-plan" value=${c.plan} onValue=${setCon('plan')} /></${Field}>
        <${Field} label="Propera valoració (re-test)" id="co-next" hint=${`Per defecte, ${THRESHOLDS.retestMonths} mesos després.`}><${TextInput} id="co-next" type="date" value=${a.nextRetest} onValue=${set('nextRetest')} /></${Field}>
      </div>
      <div class="row-actions"><${Btn} variant="primary" icon="play" onClick=${() => go('informe', a.id)}>Veure l'informe per al client</${Btn}></div>
    </section>
  </div>`;
}

// Progrés d'una secció (tests amb algun valor / total).
function sectionProgress(a, sec, p) {
  let done = 0, total = 0;
  const has = (x) => x && Object.entries(x).some(([k, v]) => !['note', 'video', 'chips'].includes(k) && v !== '' && v != null && v !== false);
  for (const g of sec.groups) {
    if (g.kind === 'patterns') { total += PATTERNS.length; done += PATTERNS.filter((pt) => Calc.patternScore((a.patterns || {})[pt.id], pt.uni)).length; }
    else if (g.kind === 'ybt') { total++; if (Calc.ybt(a).d.comp != null || Calc.ybt(a).e.comp != null) done++; }
    else if (g.kind === 'jumps') { total++; if (((a.jumps && a.jumps.attempts) || []).length) done++; }
    else if (g.kind === 'encoder') { total++; if (((a.encoder && a.encoder.rows) || []).some((r) => U.num(r.vel) != null || U.num(r.load) != null)) done++; }
    else if (g.kind === 'bike') { total++; if (U.num((a.bike || {}).peak) != null) done++; }
    else if (g.kind === 'profile') {
      const list = PROFILE_TESTS.filter((t) => !p.profile || t.profiles.includes(p.profile));
      total += list.length; done += list.filter((t) => has((a.values || {})[t.id])).length;
    } else if (g.kind === 'free') { /* opcional */ }
    else for (const t of g.tests || []) { if (t.optional) continue; total++; if (has((a.values || {})[t.id])) done++; }
  }
  return { done, total };
}

function GroupCard({ g, a, p, upd, setVal }) {
  const [info, setInfo] = useState(false);
  let body;
  if (g.kind === 'patterns') body = html`<${PatternsBlock} a=${a} p=${p} upd=${upd} />`;
  else if (g.kind === 'ybt') body = html`<${YbtBlock} a=${a} p=${p} upd=${upd} />`;
  else if (g.kind === 'jumps') body = html`<${JumpsBlock} a=${a} p=${p} upd=${upd} />`;
  else if (g.kind === 'encoder') body = html`<${EncoderBlock} a=${a} upd=${upd} />`;
  else if (g.kind === 'bike') body = html`<${BikeBlock} a=${a} upd=${upd} />`;
  else if (g.kind === 'profile') body = html`<${ProfileBlock} a=${a} p=${p} setVal=${setVal} />`;
  else if (g.kind === 'free') body = html`<${FreeBlock} a=${a} upd=${upd} />`;
  else body = html`<div class="trows">${(g.tests || []).map((t0) => html`<${TestRow} key=${t0.id} t=${TEST_INDEX[t0.id]} a=${a} p=${p} setVal=${setVal} />`)}</div>`;
  const title = g.title || (g.kind === 'patterns' ? 'Movement Assessment' : g.kind === 'profile' ? 'Bateria segons el perfil del client' : g.kind === 'free' ? 'Mesures addicionals' : '');
  return html`<div class="card group" id=${`grp-${g.id}`}>
    <div class="group-head">
      <h3 class="group-title">${title}</h3>
      ${g.device && html`<${Pill} tone=${g.device === 'Fase 2' ? 'warn' : 'neutral'}>${g.device}</${Pill}>`}
      ${/Kinvent/.test(g.device || '') && html`<${AttachButton} a=${a} p=${p} upd=${upd} label=${`Informe ${g.device.replace(' · ', ' ')}`} compact=${true} />`}
      ${(g.info || g.ref) && html`<button type="button" class=${U.cls('link', 'group-info-btn')} onClick=${() => setInfo(!info)} aria-expanded=${info}>
        <${Icon} name="info" size=${15} />Protocol</button>`}
    </div>
    ${info && html`<div class="group-info">${g.info && html`<p>${g.info}</p>`}${g.ref && html`<p class="ref">${g.ref}</p>`}</div>`}
    ${body}
  </div>`;
}

function Tools({ x, onNote, noteOpen, onVideo, title, patient }) {
  return html`<div class="trow-tools">
    <${NoteButton} value=${x.note} open=${noteOpen} onToggle=${onNote} />
    <${VideoButton} url=${x.video} title=${title} patient=${patient} onChange=${onVideo} />
  </div>`;
}

function ScoreSeg({ value, onValue, ariaLabel }) {
  return html`<${Seg} value=${value || ''} onValue=${onValue} ariaLabel=${ariaLabel} class="seg-score"
    options=${SCORES.map((s) => ({ v: s.v, label: s.sym, tone: s.tone, title: `${s.label}: ${s.desc}` }))} />`;
}

function Choice({ value, onValue, options, ariaLabel }) {
  return options.length <= 2
    ? html`<${Seg} value=${value || ''} onValue=${onValue} options=${options} ariaLabel=${ariaLabel} size="sm" />`
    : html`<${Select} value=${value} onValue=${onValue} options=${options} placeholder="—" ariaLabel=${ariaLabel} />`;
}

function TestRow({ t, a, p, setVal }) {
  const x = (a.values || {})[t.id] || {};
  const [noteOpen, setNoteOpen] = useState(!!x.note);
  const s = (k) => (v) => setVal(t.id, k, v);
  let inputs = null, result = null;

  if (t.kind === 'bi') {
    inputs = html`<div class="sides">
      <div class="side"><span class="side-k" title="Dreta">D</span><${NumInput} value=${x.d} onValue=${s('d')} unit=${t.unit} ariaLabel=${`${t.name} dreta`} /></div>
      <div class="side"><span class="side-k" title="Esquerra">E</span><${NumInput} value=${x.e} onValue=${s('e')} unit=${t.unit} ariaLabel=${`${t.name} esquerra`} /></div>
    </div>`;
    const d = U.num(x.d), e = U.num(x.e);
    const pills = [];
    if (t.diffOnly) {
      if (d != null && e != null) {
        const diff = d - e;
        const bad = t.rule === 'wblt' && Math.abs(diff) >= THRESHOLDS.wbltDiff;
        pills.push(html`<${Pill} tone=${bad ? 'bad' : 'neutral'} title="Diferència dreta − esquerra">Dif. ${U.fmtSigned(diff, 1)} ${t.unit}</${Pill}>`);
      }
      if (t.rule === 'wblt') for (const [k, v] of [['D', d], ['E', e]]) if (v != null && v < THRESHOLDS.wbltMin) pills.push(html`<${Pill} tone="bad" title=${`Per sota de ${THRESHOLDS.wbltMin} cm`}>${`${k} < ${THRESHOLDS.wbltMin} cm`}</${Pill}>`);
    } else {
      const as = Calc.asym(d, e);
      if (as) pills.push(html`<${Pill} tone=${Calc.asymTone(as.pct)} title="Asimetria |D − E| / màxim">${U.fmt(as.pct, 0)} %</${Pill}>`);
    }
    if (t.perKg) {
      const w = Calc.weight(a);
      const dk = Calc.perKg(d, w), ek = Calc.perKg(e, w);
      if (dk != null || ek != null) pills.push(html`<span class="perkg">${U.fmt(dk, 1)} · ${U.fmt(ek, 1)} N/kg</span>`);
      else if ((d != null || e != null) && !w) pills.push(html`<span class="perkg muted">Falta el pes per calcular N/kg</span>`);
    }
    result = pills;
  } else if (t.kind === 'single') {
    inputs = html`<div class="sides"><div class="side side-one"><${NumInput} value=${x.v} onValue=${s('v')} unit=${t.unit} ariaLabel=${t.name} /></div></div>`;
    if (t.perKg || t.group === 'dyn') {
      const k = Calc.perKg(x.v, Calc.weight(a));
      if (k != null) result = html`<span class="perkg">${U.fmt(k, 1)} N/kg</span>`;
    }
    if (t.hint) result = html`<span class="muted small">${t.hint}</span>`;
  } else if (t.kind === 'biSelect') {
    inputs = html`<div class="sides">
      <div class="side"><span class="side-k">D</span><${Choice} value=${x.d} onValue=${s('d')} options=${t.options} ariaLabel=${`${t.name} dreta`} /></div>
      <div class="side"><span class="side-k">E</span><${Choice} value=${x.e} onValue=${s('e')} options=${t.options} ariaLabel=${`${t.name} esquerra`} /></div>
    </div>`;
  } else if (t.kind === 'select') {
    inputs = html`<div class="sides"><div class="side side-one"><${Choice} value=${x.v} onValue=${s('v')} options=${t.options} ariaLabel=${t.name} /></div></div>`;
  } else if (t.kind === 'text') {
    inputs = html`<div class="sides"><div class="side side-one side-text"><${TextInput} value=${x.v} onValue=${s('v')} placeholder=${t.placeholder} ariaLabel=${t.name} /></div></div>`;
  } else if (t.kind === 'scoreBi') {
    const worst = Calc.patternScore(x, true);
    inputs = html`<div class="sides">
      <div class="side"><span class="side-k">D</span><${ScoreSeg} value=${x.sd} onValue=${s('sd')} ariaLabel=${`${t.name} dreta`} /></div>
      <div class="side"><span class="side-k">E</span><${ScoreSeg} value=${x.se} onValue=${s('se')} ariaLabel=${`${t.name} esquerra`} /></div>
    </div>`;
    result = html`<${Chip} on=${x.pain} onClick=${() => s('pain')(!x.pain)} title=${PAIN_INFO.desc}>P · dolor</${Chip}>${worst && html`<span class="muted small">Pitjor: ${Calc.scoreInfo(worst).label.toLowerCase()}</span>`}`;
  }

  return html`<div class=${U.cls('trow', `trow-${t.kind}`)}>
    <div class="trow-name">${t.name}${t.optional && html` <span class="opt">opcional</span>`}${t.info && html`<span class="trow-info">${t.info}</span>`}</div>
    ${inputs}
    <div class="trow-result">${result}</div>
    <${Tools} x=${x} title=${t.name} patient=${p} noteOpen=${noteOpen} onNote=${() => setNoteOpen(!noteOpen)} onVideo=${s('video')} />
    ${t.kind === 'scoreBi' && t.chips && html`<div class="trow-chips">${t.chips.map((ch) => {
      const on = (x.chips || []).includes(ch);
      return html`<${Chip} on=${on} onClick=${() => s('chips')(on ? (x.chips || []).filter((y) => y !== ch) : [...(x.chips || []), ch])}>${ch}</${Chip}>`;
    })}</div>`}
    ${noteOpen && html`<div class="trow-note"><${Area} value=${x.note} onValue=${s('note')} placeholder="Observacions del test" rows=${1} ariaLabel=${`Nota: ${t.name}`} /></div>`}
  </div>`;
}

function YbtBlock({ a, p, upd }) {
  const y = a.ybt || { d: {}, e: {} };
  const calc = Calc.ybt(a);
  const [noteOpen, setNoteOpen] = useState(!!y.note);
  const set = (side, k) => (v) => upd((x) => { x.ybt = x.ybt || { d: {}, e: {} }; x.ybt[side] = { ...(x.ybt[side] || {}), [k]: v }; });
  const setTop = (k) => (v) => upd((x) => { x.ybt = { ...(x.ybt || { d: {}, e: {} }), [k]: v }; });
  const rows = [['ant', 'Anterior', 'antDiff'], ['pm', 'Posteromedial', 'pmDiff'], ['pl', 'Posterolateral', 'plDiff'], ['len', 'Longitud de la cama', null]];
  return html`<div class="ybt">
    <div class="table-wrap"><table class="table ybt-table">
      <thead><tr><th></th><th>Dreta</th><th>Esquerra</th><th class="num">Diferència</th></tr></thead>
      <tbody>
        ${rows.map(([k, label, dk]) => html`<tr>
          <th scope="row">${label}</th>
          <td><${NumInput} value=${(y.d || {})[k]} onValue=${set('d', k)} unit="cm" ariaLabel=${`${label} dreta`} /></td>
          <td><${NumInput} value=${(y.e || {})[k]} onValue=${set('e', k)} unit="cm" ariaLabel=${`${label} esquerra`} /></td>
          <td class="num">${dk && calc[dk] != null ? html`<${Pill} tone=${k === 'ant' && calc[dk] >= THRESHOLDS.ybtAntDiff ? 'bad' : 'neutral'}>${U.fmt(calc[dk], 1)} cm</${Pill}>` : ''}</td>
        </tr>`)}
        <tr class="ybt-comp"><th scope="row">Composite</th>
          <td><strong>${calc.d.comp != null ? `${U.fmt(calc.d.comp, 1)} %` : '—'}</strong></td>
          <td><strong>${calc.e.comp != null ? `${U.fmt(calc.e.comp, 1)} %` : '—'}</strong></td>
          <td class="num">${calc.compDiff != null ? html`<span class="muted">${U.fmt(calc.compDiff, 1)} punts</span>` : ''}</td></tr>
      </tbody>
    </table></div>
    <div class="ybt-foot">
      <span class="muted small">Composite = (ANT + PM + PL) ÷ (3 × longitud de la cama) × 100. Diferència anterior ≥ ${THRESHOLDS.ybtAntDiff} cm: punt d'atenció.</span>
      <${Tools} x=${y} title="Y-Balance" patient=${p} noteOpen=${noteOpen} onNote=${() => setNoteOpen(!noteOpen)} onVideo=${setTop('video')} />
    </div>
    ${noteOpen && html`<${Area} value=${y.note} onValue=${setTop('note')} placeholder="Observacions del Y-Balance" rows=${1} />`}
  </div>`;
}

function JumpsBlock({ a, p, upd }) {
  const j = a.jumps || { attempts: [] };
  const list = j.attempts || [];
  const summary = Calc.jumps(a);
  const w = Calc.weight(a);
  const [noteOpen, setNoteOpen] = useState(!!j.note);
  const fileRef = useRef(null);
  const setJ = (k) => (v) => upd((x) => { x.jumps = { ...(x.jumps || { attempts: [] }), [k]: v }; });
  const setAt = (aid, k) => (v) => upd((x) => { const it = x.jumps.attempts.find((z) => z.id === aid); if (it) it[k] = v; });
  const add = () => upd((x) => {
    x.jumps = x.jumps || { attempts: [] };
    const lastType = x.jumps.attempts.length ? x.jumps.attempts[x.jumps.attempts.length - 1].type : 'CMJ';
    x.jumps.attempts = [...x.jumps.attempts, { id: U.uid('J'), type: lastType, height: '', power: '', force: '', velocity: '', rsimod: '' }];
  });
  const del = (aid) => upd((x) => { x.jumps.attempts = x.jumps.attempts.filter((z) => z.id !== aid); });
  const importCsv = async (file) => {
    if (!file) return;
    try {
      const text = await U.readFile(file);
      const res = parseMyJumpCsv(text);
      if (res.error) { UI.toast(res.error, 'bad'); return; }
      const ok = await UI.confirm({ title: `Importar ${U.plural(res.attempts.length, 'intent', 'intents')} de My Jump?`,
        text: `Columnes detectades: ${Object.keys(res.map).map((k) => (MYJUMP_COLUMNS.find((c) => c.key === k) || {}).label).join(', ')}. Tipus: ${[...new Set(res.attempts.map((x) => x.type))].join(', ')}.`, ok: 'Importa' });
      if (!ok) return;
      upd((x) => { x.jumps = x.jumps || { attempts: [] }; x.jumps.attempts = [...x.jumps.attempts, ...res.attempts]; });
      UI.toast('Intents importats.');
    } catch (e) {
      UI.toast(`No s'ha pogut llegir el fitxer: ${e.message}`, 'bad');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const col = (k, label, unit) => ({ k, label, unit });
  const cols = [col('height', 'Altura', 'cm'), col('power', 'Potència', 'W'), col('force', 'Força', 'N'), col('velocity', 'Velocitat', 'm/s'), col('rsimod', 'RSI-mod', '')];
  return html`<div class="jumps">
    <div class="jumps-top">
      <div class="inline"><span class="field-label">Estat de forma</span>
        <${Seg} value=${j.readiness || ''} onValue=${setJ('readiness')} options=${OPT.readiness.map((o) => ({ v: o.v, label: o.label, tone: o.v === 'verd' ? 'ok' : o.v === 'groc' ? 'warn' : 'bad' }))} ariaLabel="Estat de forma" size="sm" /></div>
      <span class="grow"></span>
      <input type="file" accept=".csv,text/csv,text/plain" hidden ref=${fileRef} onChange=${(e) => importCsv(e.currentTarget.files[0])} />
      <${Btn} size="sm" icon="upload" onClick=${() => fileRef.current && fileRef.current.click()}>Importa CSV de My Jump</${Btn}>
      <${Tools} x=${j} title="Salts" patient=${p} noteOpen=${noteOpen} onNote=${() => setNoteOpen(!noteOpen)} onVideo=${setJ('video')} />
    </div>
    ${noteOpen && html`<${Area} value=${j.note} onValue=${setJ('note')} placeholder="Observacions dels salts" rows=${1} />`}
    ${list.length > 0 && html`<div class="table-wrap"><table class="table jumps-table">
      <thead><tr><th>#</th><th>Tipus</th>${cols.map((c) => html`<th>${c.label}${c.unit && html` <span class="muted">${c.unit}</span>`}</th>`)}<th></th></tr></thead>
      <tbody>${list.map((at, i) => html`<tr>
        <td class="muted">${i + 1}</td>
        <td><${Select} value=${at.type} onValue=${setAt(at.id, 'type')} options=${OPT.jumpTypes} ariaLabel="Tipus de salt" /></td>
        ${cols.map((c) => html`<td><${NumInput} value=${at[c.k]} onValue=${setAt(at.id, c.k)} ariaLabel=${`${c.label} intent ${i + 1}`} /></td>`)}
        <td><${Btn} variant="ghost" icon="x" title="Treu l'intent" onClick=${() => del(at.id)} /></td>
      </tr>`)}</tbody>
    </table></div>`}
    <div class="row-actions"><${Btn} size="sm" icon="plus" onClick=${add}>Afegeix intent</${Btn}></div>
    ${Object.keys(summary).length > 0 && html`<div class="jump-sum">${Object.entries(summary).map(([type, sm]) => html`<div class="jump-card">
      <div class="jump-type">${type}<span class="muted"> · ${U.plural(sm.n, 'intent', 'intents')}</span></div>
      <div class="jump-best">${U.fmt(sm.best, 1)}<small> cm</small></div>
      <div class="jump-meta">Mitjana ${U.fmt(sm.mean, 1)} cm${sm.bestPower != null ? html` · ${U.fmt(sm.bestPower, 0)} W` : ''}${sm.relPower != null ? html` · <strong>${U.fmt(sm.relPower, 1)} W/kg</strong>` : ''}${sm.bestRsi != null ? html` · RSI-mod ${U.fmt(sm.bestRsi, 2)}` : ''}</div>
    </div>`)}</div>`}
    ${list.length > 0 && !w && html`<p class="muted small">Afegeix el pes a les dades de la valoració per calcular la potència relativa (W/kg).</p>`}
  </div>`;
}

function EncoderBlock({ a, upd }) {
  const rows = (a.encoder && a.encoder.rows) || [];
  const setR = (rid, k) => (v) => upd((x) => { const r = x.encoder.rows.find((z) => z.id === rid); if (r) r[k] = v; });
  const add = () => upd((x) => { x.encoder = x.encoder || { rows: [] }; x.encoder.rows = [...(x.encoder.rows || []), { id: U.uid('R'), name: '' }]; });
  const del = (rid) => upd((x) => { x.encoder.rows = x.encoder.rows.filter((z) => z.id !== rid); });
  return html`<div>
    ${rows.length > 0 && html`<div class="table-wrap"><table class="table">
      <thead><tr><th>Exercici</th><th>Càrrega <span class="muted">kg</span></th><th>Velocitat mitjana <span class="muted">m/s</span></th><th>Potència <span class="muted">W</span></th><th></th></tr></thead>
      <tbody>${rows.map((r) => html`<tr>
        <td><${TextInput} value=${r.name} onValue=${setR(r.id, 'name')} placeholder="Exercici" ariaLabel="Exercici" /></td>
        <td><${NumInput} value=${r.load} onValue=${setR(r.id, 'load')} ariaLabel=${`${r.name} càrrega`} /></td>
        <td><${NumInput} value=${r.vel} onValue=${setR(r.id, 'vel')} ariaLabel=${`${r.name} velocitat`} /></td>
        <td><${NumInput} value=${r.power} onValue=${setR(r.id, 'power')} ariaLabel=${`${r.name} potència`} /></td>
        <td><${Btn} variant="ghost" icon="x" title="Treu la fila" onClick=${() => del(r.id)} /></td>
      </tr>`)}</tbody>
    </table></div>`}
    <div class="row-actions"><${Btn} size="sm" icon="plus" onClick=${add}>Afegeix exercici</${Btn}></div>
  </div>`;
}

function BikeBlock({ a, upd }) {
  const b = a.bike || {};
  const r = Calc.bike(a);
  const set = (k) => (v) => upd((x) => { x.bike = { ...(x.bike || {}), [k]: v }; });
  return html`<div class="bike">
    <div class="form-grid form-grid-4">
      <${Field} label="Potència pic"><${NumInput} value=${b.peak} onValue=${set('peak')} unit="W" /></${Field}>
      <${Field} label="Potència mitjana"><${NumInput} value=${b.mean} onValue=${set('mean')} unit="W" /></${Field}>
      <${Field} label="Potència mínima"><${NumInput} value=${b.min} onValue=${set('min')} unit="W" /></${Field}>
    </div>
    <div class="kv-row">
      <div class="kv"><span>Pic relatiu</span><strong>${r.peakRel != null ? `${U.fmt(r.peakRel, 1)} W/kg` : '—'}</strong></div>
      <div class="kv"><span>Mitjana relativa</span><strong>${r.meanRel != null ? `${U.fmt(r.meanRel, 1)} W/kg` : '—'}</strong></div>
      <div class="kv"><span>Índex de fatiga</span><strong>${r.fatigue != null ? `${U.fmt(r.fatigue, 1)} %` : '—'}</strong><small>(pic − mínima) ÷ pic</small></div>
    </div>
    <p class="muted small">Els watts de la bicicleta d'aire no són comparables amb els del Wingate clàssic: serveixen per comparar el client amb ell mateix.</p>
  </div>`;
}

function PatternsBlock({ a, p, upd }) {
  const [rules, setRules] = useState(false);
  const pc = Calc.patterns(a);
  const setP = (pid, k, v) => upd((x) => { x.patterns = x.patterns || {}; x.patterns[pid] = { ...(x.patterns[pid] || {}), [k]: v }; });
  return html`<div class="patterns">
    <div class="scale">
      ${SCORES.map((s) => html`<div class=${`scale-item scale-${s.tone}`}>
        <${ScoreDot} v=${s.v} />
        <div><strong>${s.label}</strong><span>${s.desc}</span><em>Decisió: ${s.decision}</em></div>
      </div>`)}
      <div class="scale-item scale-p"><${ScoreDot} pain=${true} /><div><strong>${PAIN_INFO.label}</strong><span>${PAIN_INFO.desc}</span></div></div>
    </div>
    <div class="patterns-bar">
      <span class="pcount"><${ScoreDot} v="0" size="sm" /> ${pc.counts['0']}</span>
      <span class="pcount"><${ScoreDot} v="-" size="sm" /> ${pc.counts['-']}</span>
      <span class="pcount"><${ScoreDot} v="--" size="sm" /> ${pc.counts['--']}</span>
      <span class="pcount"><${ScoreDot} pain=${true} size="sm" /> ${pc.counts.P}</span>
      <span class="muted small">${pc.scored} de ${pc.total} patrons puntuats · als unilaterals compta el pitjor costat</span>
      <span class="grow"></span>
      <button type="button" class="link" onClick=${() => setRules(!rules)} aria-expanded=${rules}><${Icon} name="video" size=${15} />Com gravem i puntuem</button>
    </div>
    ${rules && html`<ol class="rules">${RECORDING_RULES.map((r) => html`<li><strong>${r.t}.</strong> ${r.d}</li>`)}
      <li class="rules-why">A la primera visita no corregim: les consignes arriben a partir de la 2a sessió (Bennett et al., 2019; Frost et al., 2015).</li></ol>`}
    <div class="pgrid">
      ${PATTERNS.map((pt, i) => html`<${PatternCard} key=${pt.id} pt=${pt} n=${i + 1} v=${(a.patterns || {})[pt.id] || {}} p=${p} set=${(k, v) => setP(pt.id, k, v)} />`)}
    </div>
  </div>`;
}

function PatternCard({ pt, n, v, p, set }) {
  const [obs, setObs] = useState(false);
  const [noteOpen, setNoteOpen] = useState(!!v.note);
  const score = Calc.patternScore(v, pt.uni);
  const auto = score ? Calc.scoreInfo(score).decision : '';
  return html`<div class=${U.cls('pcard', score && `pcard-${Calc.scoreInfo(score).tone}`, v.pain && 'pcard-p')}>
    <div class="pcard-head">
      <h4 class="pcard-title"><span class="muted">${n} ·</span> ${pt.name}</h4>
      <${ScoreDot} v=${score} pain=${v.pain} />
    </div>
    <p class="pcard-exec"><strong>Execució:</strong> ${pt.exec}<br /><strong>Adaptació:</strong> ${pt.adapt}</p>
    <button type="button" class="link small" onClick=${() => setObs(!obs)} aria-expanded=${obs}><${Icon} name=${obs ? 'up' : 'down'} size=${14} />Què observem</button>
    ${obs && html`<div class="pcard-obs">
      <ul>${pt.observe.map((o) => html`<li><${Icon} name="check" size=${14} />${o}</li>`)}</ul>
      <p><${ScoreDot} v="-" size="xs" /> ${pt.minor}</p>
      <p><${ScoreDot} v="--" size="xs" /> ${pt.major}</p>
      ${pt.note && html`<p class="muted small">${pt.note}</p>`}
    </div>`}
    <div class="pcard-score">
      ${pt.uni ? html`
        <div class="side"><span class="side-k">D</span><${ScoreSeg} value=${v.sd} onValue=${(x) => set('sd', x)} ariaLabel=${`${pt.name} dreta`} />
          ${pt.seconds && html`<${NumInput} value=${v.secD} onValue=${(x) => set('secD', x)} unit="s" ariaLabel=${`${pt.name} segons dreta`} />`}</div>
        <div class="side"><span class="side-k">E</span><${ScoreSeg} value=${v.se} onValue=${(x) => set('se', x)} ariaLabel=${`${pt.name} esquerra`} />
          ${pt.seconds && html`<${NumInput} value=${v.secE} onValue=${(x) => set('secE', x)} unit="s" ariaLabel=${`${pt.name} segons esquerra`} />`}</div>`
        : html`<${ScoreSeg} value=${v.score} onValue=${(x) => set('score', x)} ariaLabel=${pt.name} />`}
      <${Chip} on=${v.pain} onClick=${() => set('pain', !v.pain)} title=${PAIN_INFO.desc}>P · dolor</${Chip}>
    </div>
    <div class="trow-chips">${pt.chips.map((ch) => {
      const on = (v.chips || []).includes(ch);
      return html`<${Chip} on=${on} onClick=${() => set('chips', on ? (v.chips || []).filter((y) => y !== ch) : [...(v.chips || []), ch])}>${ch}</${Chip}>`;
    })}</div>
    <label class="pcard-dec"><span class="field-label">Decisió</span>
      <input class="input" value=${v.decision || ''} placeholder=${auto || 'Es proposa segons la puntuació'} onInput=${(e) => set('decision', e.currentTarget.value)} /></label>
    <div class="pcard-foot">
      ${v.pain && html`<span class="warn-text small"><${Icon} name="alert" size=${14} /> S'atura el test i es deriva al fisio.</span>`}
      <span class="grow"></span>
      <${Tools} x=${v} title=${pt.name} patient=${p} noteOpen=${noteOpen} onNote=${() => setNoteOpen(!noteOpen)} onVideo=${(x) => set('video', x)} />
    </div>
    ${noteOpen && html`<${Area} value=${v.note} onValue=${(x) => set('note', x)} placeholder="Compensacions observades" rows=${1} />`}
  </div>`;
}

function ProfileBlock({ a, p, setVal }) {
  const [prof, setProf] = useState(p.profile || 'A');
  const list = PROFILE_TESTS.filter((t) => !prof || t.profiles.includes(prof));
  // El perfil A/B/C de la bateria es desa al client (decideix quins tests surten la propera vegada).
  const choose = (v) => {
    setProf(v);
    if (v && p.id && v !== p.profile) Store.update('patients', p.id, (x) => { x.profile = v; });
  };
  return html`<div>
    <div class="profile-pick">
      <span class="field-label">Bateria del perfil</span>
      <${Seg} value=${prof} onValue=${choose} ariaLabel="Perfil" options=${[...OPT.profiles.map((o) => ({ v: o.v, label: o.label, title: o.desc })), { v: '', label: 'Tots' }]} allowEmpty=${false} />
    </div>
    <div class="trows">${list.map((t) => html`<${TestRow} key=${t.id} t=${TEST_INDEX[t.id]} a=${a} p=${p} setVal=${setVal} />`)}</div>
  </div>`;
}

function FreeBlock({ a, upd }) {
  const rows = a.free || [];
  const setR = (rid, k) => (v) => upd((x) => { const r = x.free.find((z) => z.id === rid); if (r) r[k] = v; });
  const add = () => upd((x) => { x.free = [...(x.free || []), { id: U.uid('R'), name: '', unit: '', d: '', e: '', v: '' }]; });
  const del = (rid) => upd((x) => { x.free = x.free.filter((z) => z.id !== rid); });
  return html`<div>
    <p class="muted small">Qualsevol altra mesura que vulgueu registrar (també es desa al full de càlcul).</p>
    ${rows.length > 0 && html`<div class="table-wrap"><table class="table">
      <thead><tr><th>Mesura</th><th>Dreta</th><th>Esquerra</th><th>Valor únic</th><th>Unitat</th><th></th></tr></thead>
      <tbody>${rows.map((r) => html`<tr>
        <td><${TextInput} value=${r.name} onValue=${setR(r.id, 'name')} placeholder="Nom de la mesura" ariaLabel="Nom de la mesura" /></td>
        <td><${NumInput} value=${r.d} onValue=${setR(r.id, 'd')} ariaLabel="Dreta" /></td>
        <td><${NumInput} value=${r.e} onValue=${setR(r.id, 'e')} ariaLabel="Esquerra" /></td>
        <td><${NumInput} value=${r.v} onValue=${setR(r.id, 'v')} ariaLabel="Valor" /></td>
        <td><${TextInput} value=${r.unit} onValue=${setR(r.id, 'unit')} placeholder="cm, °, N…" ariaLabel="Unitat" /></td>
        <td><${Btn} variant="ghost" icon="x" title="Treu la mesura" onClick=${() => del(r.id)} /></td>
      </tr>`)}</tbody>
    </table></div>`}
    <div class="row-actions"><${Btn} size="sm" icon="plus" onClick=${add}>Afegeix mesura</${Btn}></div>
  </div>`;
}

// ── Informes de Kinvent (PDF) i altres fitxers de la valoració ──
// Es pugen a «01 · Valoracions» de la carpeta del client i queden enllaçats a la valoració (i a l'Excel).
function AssessmentFiles({ a, p, upd }) {
  const files = a.files || [];
  const unlink = async (f) => {
    if (!(await UI.confirm({ title: 'Treure l\'enllaç?', text: `«${f.name}» deixarà de sortir a la valoració. El fitxer es queda a la carpeta del client.`, ok: 'Treu l\'enllaç' }))) return;
    upd((x) => { x.files = (x.files || []).filter((y) => y.id !== f.id); });
  };
  return html`<section class="card" id="sec-fitxers">
    <div class="card-head"><h2 class="h2">Informes i fitxers</h2>
      <div class="inline">
        <${AttachButton} a=${a} p=${p} upd=${upd} label="Informe Kinvent" primary=${true} />
        <${AttachButton} a=${a} p=${p} upd=${upd} label="Document" />
      </div>
    </div>
    ${files.length ? html`<ul class="files">${files.map((f) => html`<li class="file" key=${f.id}>
        <${Icon} name="note" size=${18} />
        <a class="link file-name" href=${f.url} target="_blank" rel="noopener">${f.name}</a>
        <span class="muted small">${U.fmtDate(f.date)}</span>
        <${Btn} variant="ghost" size="sm" icon="x" title="Treu l'enllaç" onClick=${() => unlink(f)} />
      </li>`)}</ul>`
      : html`<p class="muted">${canUploadFiles()
        ? 'Quan acabis amb Kinvent, desa l\'informe en PDF a la tauleta (per exemple amb «Files by Google») i adjunta\'l aquí: es guarda sol a «01 · Valoracions» de la carpeta del client.'
        : 'Enganxa l\'enllaç de l\'informe de Kinvent (PDF). Amb l\'app connectada a Microsoft 365, el PDF es puja directament a la carpeta del client.'}</p>`}
  </section>`;
}

function AttachButton({ a, p, upd, label, primary, compact }) {
  const [pct, setPct] = useState(null);
  const ref = useRef(null);
  const add = (f) => upd((x) => { x.files = [...(x.files || []), { id: U.uid('F'), date: U.today(), ...f }]; });
  const upload = async (file) => {
    if (ref.current) ref.current.value = '';
    if (!file) return;
    setPct(0);
    try {
      const res = await uploadToClient(p, file, { label, date: a.date, subfolder: M365_NAMES.reports, onProgress: setPct });
      add({ name: res.name, url: res.url, label });
      UI.toast('Informe desat a la carpeta del client.');
    } catch (e) {
      UI.toast(e.message, 'bad');
    }
    setPct(null);
  };
  const addLink = async () => {
    const url = await UI.prompt({ title: label, label: 'Enllaç del fitxer', placeholder: 'https://…' });
    if (!url) return;
    if (!U.isUrl(url)) { UI.toast('Enganxa un enllaç complet (https://…).', 'bad'); return; }
    add({ name: `${label} · ${U.fmtDate(a.date)}`, url, label });
  };
  const upOk = canUploadFiles();
  const text = compact ? 'Adjunta el PDF' : label === 'Document' ? 'Un altre fitxer' : 'Adjunta l\'informe de Kinvent';
  if (pct != null) return html`<span class="attach-busy" role="status"><span class="spinner"></span>Pujant… ${Math.round(pct * 100)} %</span>`;
  return html`<span class="attach">
    ${upOk && html`<input type="file" accept=".pdf,application/pdf,image/*,.csv,.xlsx,.xls" hidden ref=${ref} onChange=${(e) => upload(e.currentTarget.files[0])} />`}
    <${Btn} variant=${primary ? 'primary' : compact ? 'ghost' : 'secondary'} size=${compact ? 'sm' : undefined} icon="upload"
      onClick=${() => (upOk ? ref.current && ref.current.click() : addLink())}>${upOk ? text : compact ? 'Enllaç del PDF' : text.replace('Adjunta', 'Enllaça')}</${Btn}>
  </span>`;
}
