/* EON Life · pla d'entrenament: les sessions d'un client (S1…SN) preparades amb antelació i amb progressió.
   Cada sessió del pla té els mateixos 6 blocs que una sessió normal. Quan el pacient ve, «Nova sessió › Del pla»
   (o el calendari) crea la sessió del dia a partir de la del pla; la sessió es continua omplint com sempre. */

const PLAN_PHASES = ['Adaptació', 'Hipertròfia', 'Força', 'Potència', 'Transferència', 'Descàrrega', 'Manteniment'];
const WEEK_ORDER = [1, 2, 3, 4, 5, 6, 0];

function planDaysLabel(days) {
  return WEEK_ORDER.filter((d) => (days || []).includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(' · ');
}

// Pestanya «Pla» de la fitxa del client.
function PatientPlan({ p }) {
  const plans = Store.plans(p.id);
  const progress = Store.sessionsOf(p.id).length >= 2 && html`<section class="card">
    <div class="card-head"><div class="grow"><h2 class="h2">Progrés</h2>
      <p class="muted">Compara una sessió d'abans amb la d'ara, exercici per exercici: nivell, càrrega i velocitat de l'encoder. Per ensenyar-ho al pacient.</p></div>
      <${Btn} icon="chart" onClick=${() => go('progres', p.id)}>Mira el progrés</${Btn}></div>
  </section>`;
  if (!plans.length) {
    return html`<div class="stack"><section class="card"><${Empty} icon="layers" title="Encara no té cap pla d'entrenament"
      text="Prepara d'una vegada les sessions de les pròximes setmanes (per exemple 12 sessions, dues per setmana), amb la progressió dels exercicis del nivell més bàsic al més avançat.">
      <${Btn} variant="primary" icon="plus" onClick=${() => openNewPlan(p)}>Crea un pla</${Btn}></${Empty}></section>${progress}</div>`;
  }
  return html`<div class="stack">
    ${plans.map((plan, i) => html`<${PlanCard} key=${plan.id} plan=${plan} p=${p} main=${i === 0} />`)}
    ${progress}
    <div><${Btn} icon="plus" onClick=${() => openNewPlan(p)}>Crea un altre pla</${Btn}></div>
  </div>`;
}

function PlanCard({ plan, p, main }) {
  const real = Store.planSessions(plan);
  const total = (plan.sessions || []).length;
  const fetes = real.filter((s) => s.status === 'feta').length;
  const next = Store.nextPlanN(plan);
  const dates = Calc.planDates(plan);
  // Sessió del pla ja creada però encara no feta (p. ex. la d'avui).
  const pending = U.sortBy(real.filter((s) => s.status !== 'feta'), 'date')[0];
  const start = () => {
    const s = Store.newSession(p.id, { date: U.today(), mode: 'plan', planId: plan.id, planN: next });
    go('sessio', s.id);
  };
  return html`<section class=${U.cls('card plancard', main && 'plancard-main')}>
    <div class="card-head">
      <div class="grow"><h2 class="h2">${plan.name}</h2>
        <p class="muted">${[plan.goal, `des del ${U.fmtDate(plan.start)}`, planDaysLabel(plan.days)].filter(Boolean).join(' · ')}</p></div>
      <div class="inline">
        ${real.length > 0 && html`<${Btn} icon="chart" onClick=${() => go('progres', p.id, plan.id)}>Progrés</${Btn}>`}
        <${Btn} icon="edit" onClick=${() => go('pla', plan.id)}>Obre el pla</${Btn}>
      </div>
    </div>
    <div class="planbar" aria-label=${`${fetes} de ${total} sessions fetes`}>
      ${(plan.sessions || []).map((x, i) => {
        const s = real.find((y) => U.num(y.planN) === x.n);
        return html`<button type="button" class=${U.cls('planbar-s', s && (s.status === 'feta' ? 'done' : 'made'), x.n === next && 'next')}
          title=${`S${x.n}${x.phase ? ` · ${x.phase}` : ''} · ${s ? U.fmtDate(s.date) : `prevista ${U.fmtDateShort(dates[i] || '')}`}`}
          onClick=${() => (s ? go('sessio', s.id) : go('pla', plan.id, x.n))}>${x.n}</button>`;
      })}
    </div>
    <p class="muted small">${fetes} de ${total} sessions fetes${next ? ` · la pròxima és la S${next}${dates[next - 1] ? ` (prevista el ${U.fmtDateShort(dates[next - 1])})` : ''}` : ' · pla acabat'}</p>
    ${main && (pending
      ? html`<div class="row-actions"><${Btn} variant="primary" icon="play" onClick=${() => go('sessio', pending.id)}>Obre la S${pending.planN} (${U.fmtDateShort(pending.date)})</${Btn}></div>`
      : next && html`<div class="row-actions"><${Btn} variant="primary" icon="play" onClick=${start}>Fes la sessió ${next} avui</${Btn}></div>`)}
  </section>`;
}

function openNewPlan(p) {
  let close = null;
  close = UI.open(() => html`<${NewPlanDialog} p=${p} onClose=${() => close()} />`);
}

function NewPlanDialog({ p, onClose }) {
  const hasLast = Store.sessionsOf(p.id).length > 0;
  const tpls = Store.templates().filter((t) => t.kind === 'session');
  const [f, setF] = useState({ name: '', goal: p.goal || '', start: U.today(), days: [1, 4], count: '12', base: hasLast ? 'last' : 'template', templateId: tpls[0] ? tpls[0].id : '', every: '4' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const toggleDay = (d) => setF({ ...f, days: f.days.includes(d) ? f.days.filter((x) => x !== d) : [...f.days, d] });
  const n = Math.max(1, Math.min(40, U.num(f.count) || 12));
  const end = f.days.length ? Calc.planDate({ start: f.start, days: f.days }, n) : '';
  const create = () => {
    if (!f.days.length) { UI.toast('Tria almenys un dia de la setmana.', 'bad'); return; }
    const plan = Store.newPlan(p.id, { ...f, name: f.name.trim(), count: n, every: U.num(f.every) || 0 });
    onClose();
    go('pla', plan.id);
  };
  return html`<${Dialog} title="Nou pla d'entrenament" wide=${true} onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="check" onClick=${create}>Crea el pla</${Btn}>`}>
    <div class="form-grid">
      <${Field} label="Nom del pla" id="pl-name"><${TextInput} id="pl-name" value=${f.name} onValue=${set('name')} placeholder=${`Pla de ${n} sessions`} /></${Field}>
      <${Field} label="Objectiu" id="pl-goal"><${TextInput} id="pl-goal" value=${f.goal} onValue=${set('goal')} placeholder="p. ex. Tornar a córrer sense dolor" /></${Field}>
      <${Field} label="Data d'inici" id="pl-start"><${TextInput} id="pl-start" type="date" value=${f.start} onValue=${set('start')} /></${Field}>
      <${Field} label="Nombre de sessions" id="pl-count" hint="Fins a 40"><${NumInput} id="pl-count" value=${f.count} onValue=${set('count')} /></${Field}>
      <${Field} label="Dies de la setmana" wide=${true}>
        <div class="chips">${WEEK_ORDER.map((d) => html`<${Chip} on=${f.days.includes(d)} onClick=${() => toggleDay(d)}>${WEEKDAYS[d]}</${Chip}>`)}</div></${Field}>
      <${Field} label="La sessió 1 surt de…" wide=${true}>
        <${Seg} value=${f.base} onValue=${set('base')} allowEmpty=${false} ariaLabel="Punt de partida"
          options=${[...(hasLast ? [{ v: 'last', label: 'L\'última sessió' }] : []), { v: 'template', label: 'Una plantilla' }, { v: 'blank', label: 'En blanc' }]} />
        ${f.base === 'template' && html`<div class="mt-s"><${Select} value=${f.templateId} onValue=${set('templateId')} ariaLabel="Plantilla" options=${tpls.map((t) => ({ v: t.id, label: t.name }))} /></div>`}
      </${Field}>
      <${Field} label="Progressió dels exercicis" id="pl-every" wide=${true}
        hint="Els exercicis que tenen progressió a la biblioteca pugen un nivell (p. ex. Goblet squat → Back squat). Després es pot ajustar cada sessió a mà.">
        <${Select} id="pl-every" value=${f.every} onValue=${set('every')} options=${[
          { v: '0', label: 'Totes iguals: la progressió la faig jo' },
          { v: '2', label: 'Puja un nivell cada 2 sessions' },
          { v: '3', label: 'Puja un nivell cada 3 sessions' },
          { v: '4', label: 'Puja un nivell cada 4 sessions' },
          { v: '6', label: 'Puja un nivell cada 6 sessions' },
        ]} /></${Field}>
    </div>
    <p class="muted">${n} sessions${f.days.length ? ` · ${f.days.length} per setmana · de l'${U.fmtDate(f.start)} al ${U.fmtDate(end)}` : ''}</p>
  </${Dialog}>`;
}

// ── Editor del pla: graella de progressió (sessions en columnes) i la sessió triada a sota ──
function PlanEditor({ id, n }) {
  const plan = Store.get('templates', id);
  const [sel, setSel] = useState(U.num(n) || 1);
  if (!plan || plan.kind !== 'plan') {
    return html`<div class="page"><${Empty} icon="layers" title="No trobo aquest pla"><${Btn} onClick=${() => go('inici')}>Torna a l'inici</${Btn}></${Empty}></div>`;
  }
  const p = Store.get('patients', plan.patientId) || {};
  const upd = (fn) => Store.update('templates', plan.id, fn);
  const set = (k) => (v) => upd((x) => { x[k] = v; });
  const real = Store.planSessions(plan);
  const dates = Calc.planDates(plan);
  const list = plan.sessions || [];
  const cur = list.find((x) => x.n === sel) || list[0];
  const curReal = cur && real.find((s) => U.num(s.planN) === cur.n);
  const nextPs = cur && list.find((x) => x.n === cur.n + 1);
  const updCur = (fn) => upd((x) => { const ps = (x.sessions || []).find((y) => y.n === cur.n); if (ps) fn(ps); });
  const toggleDay = (d) => upd((x) => { const ds = x.days || []; x.days = ds.includes(d) ? ds.filter((y) => y !== d) : [...ds, d]; });

  // La sessió següent passa a ser una còpia d'aquesta (i, si es vol, amb un nivell més).
  const copyToNext = async (progress) => {
    if (!nextPs) return;
    const has = (nextPs.blocks || []).some((b) => (b.items || []).some((i) => i.name));
    if (has && !(await UI.confirm({ title: `Substituir la sessió ${nextPs.n}?`, text: `Els exercicis de la S${nextPs.n} se substituiran pels de la S${cur.n}${progress ? ' amb un nivell més' : ''}.`, ok: 'Substitueix' }))) return;
    let ups = 0;
    upd((x) => {
      const from = x.sessions.find((y) => y.n === cur.n), to = x.sessions.find((y) => y.n === cur.n + 1);
      to.blocks = cloneBlocks(from.blocks, true);
      if (progress) ups = progressBlocks(to.blocks);
    });
    setSel(cur.n + 1);
    UI.toast(progress ? `S${cur.n + 1}: ${U.plural(ups, 'exercici ha pujat', 'exercicis han pujat')} de nivell.` : `S${cur.n} copiada a la S${cur.n + 1}.`);
  };
  const levelUpHere = () => {
    let ups = 0;
    updCur((ps) => { ups = progressBlocks(ps.blocks); });
    UI.toast(ups ? `${U.plural(ups, 'exercici ha pujat', 'exercicis han pujat')} un nivell.` : 'Cap exercici d\'aquesta sessió té un nivell més a la biblioteca.');
  };
  const addSession = () => {
    const last = list[list.length - 1];
    if (list.length >= 40) { UI.toast('Un pla pot tenir fins a 40 sessions. Per continuar, crea un pla nou.', 'bad'); return; }
    upd((x) => { x.sessions = [...x.sessions, { id: U.uid('PS'), n: last.n + 1, phase: last.phase || '', goal: '', blocks: cloneBlocks(last.blocks, true) }]; });
    setSel(last.n + 1);
  };
  const removeLast = async () => {
    const last = list[list.length - 1];
    if (list.length < 2) return;
    if (real.some((s) => U.num(s.planN) === last.n)) { UI.toast(`La S${last.n} ja s'ha fet: no es pot treure del pla.`, 'bad'); return; }
    if (!(await UI.confirm({ title: `Treure la sessió ${last.n}?`, text: 'Es treu l\'última sessió del pla.', ok: 'Treu-la', danger: true }))) return;
    upd((x) => { x.sessions = x.sessions.filter((y) => y.n !== last.n); });
    setSel(Math.min(sel, last.n - 1));
  };
  const startToday = () => {
    const s = Store.newSession(p.id, { date: U.today(), mode: 'plan', planId: plan.id, planN: cur.n });
    go('sessio', s.id);
  };
  const remove = async () => {
    if (!(await UI.confirm({ title: `Eliminar «${plan.name}»?`, text: 'Les sessions que ja s\'han fet no s\'esborren.', ok: 'Elimina', danger: true }))) return;
    Store.remove('templates', plan.id);
    go('client', plan.patientId, 'pla');
  };

  return html`<div class="page page-edit">
    <div class="editbar">
      <${Btn} variant="ghost" icon="back" title="Torna al pacient" onClick=${() => go('client', plan.patientId, 'pla')} />
      <div class="editbar-title"><strong>${plan.name}</strong><span>${U.fullName(p)} · ${list.length} sessions</span></div>
      <${SaveStatus} />
      ${real.length > 0 && html`<${Btn} icon="chart" onClick=${() => go('progres', plan.patientId, plan.id)}>Progrés</${Btn}>`}
      <${Menu} items=${[
        { label: 'Afegeix una sessió al final', icon: 'plus', onClick: addSession },
        list.length > 1 ? { label: `Treu l'última sessió (S${list[list.length - 1].n})`, icon: 'x', onClick: removeLast } : null,
        { sep: true },
        { label: 'Elimina el pla', icon: 'trash', danger: true, onClick: remove },
      ]} />
    </div>

    <section class="card">
      <div class="form-grid form-grid-4">
        <${Field} label="Nom del pla" id="pe-name"><${TextInput} id="pe-name" value=${plan.name} onValue=${set('name')} /></${Field}>
        <${Field} label="Objectiu" id="pe-goal"><${TextInput} id="pe-goal" value=${plan.goal} onValue=${set('goal')} /></${Field}>
        <${Field} label="Data d'inici" id="pe-start"><${TextInput} id="pe-start" type="date" value=${plan.start} onValue=${set('start')} /></${Field}>
        <${Field} label="Dies"><div class="chips">${WEEK_ORDER.map((d) => html`<${Chip} on=${(plan.days || []).includes(d)} onClick=${() => toggleDay(d)}>${WEEKDAYS_SHORT[d]}</${Chip}>`)}</div></${Field}>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Progressió</h2><span class="muted small">Toca una sessió per veure-la i editar-la. ▲ = l'exercici puja de nivell respecte a la sessió anterior.</span></div>
      <${PlanGrid} plan=${plan} sel=${cur && cur.n} onSel=${setSel} real=${real} dates=${dates} />
    </section>

    ${cur && html`<section class="card plan-cur">
      <div class="card-head">
        <div class="grow"><h2 class="h2">Sessió ${cur.n} del pla</h2>
          <p class="muted">${curReal ? `Feta el ${U.fmtDate(curReal.date)}` : `Prevista el ${U.fmtDateLong(dates[cur.n - 1] || '', true)}`}</p></div>
        <div class="inline">
          ${curReal ? html`<${Btn} icon="edit" onClick=${() => go('sessio', curReal.id)}>Obre la sessió feta</${Btn}>`
            : html`<${Btn} variant="primary" icon="play" onClick=${startToday}>Fes-la avui</${Btn}>`}
          <${Menu} items=${[
            nextPs ? { label: `Copia a la S${nextPs.n} i puja un nivell`, icon: 'up', onClick: () => copyToNext(true) } : null,
            nextPs ? { label: `Copia a la S${nextPs.n} igual`, icon: 'copy', onClick: () => copyToNext(false) } : null,
            { label: 'Puja un nivell tots els exercicis', icon: 'up', onClick: levelUpHere },
          ]} />
        </div>
      </div>
      <div class="form-grid">
        <${Field} label="Fase" id="ps-phase"><${TextInput} id="ps-phase" value=${cur.phase} onValue=${(v) => updCur((ps) => { ps.phase = v; })} list="phase-list" placeholder="p. ex. Adaptació" /></${Field}>
        <${Field} label="Objectiu de la sessió" id="ps-goal"><${TextInput} id="ps-goal" value=${cur.goal} onValue=${(v) => updCur((ps) => { ps.goal = v; })} placeholder=${plan.goal || 'p. ex. Força · dominant de genoll'} /></${Field}>
      </div>
      <datalist id="phase-list">${PLAN_PHASES.map((x) => html`<option value=${x}></option>`)}</datalist>
    </section>`}
    ${cur && (cur.blocks || []).map((b) => html`<${BlockCard} key=${`${cur.id}-${b.key}`} block=${b} templateMode=${true}
      onChange=${(fn) => updCur((ps) => { const bb = ps.blocks.find((y) => y.key === b.key); if (bb) fn(bb); })} />`)}
  </div>`;
}

// Graella: una columna per sessió del pla i una fila per posició d'exercici de cada bloc.
function PlanGrid({ plan, sel, onSel, real, dates }) {
  const cols = plan.sessions || [];
  const named = (ps, key) => (((ps.blocks || []).find((b) => b.key === key) || {}).items || []).filter((i) => i.name);
  const rows = [];
  for (const b of BLOCKS) {
    const max = Math.max(0, ...cols.map((ps) => named(ps, b.key).length));
    if (max) rows.push({ head: b.key });
    for (let i = 0; i < max; i++) rows.push({ key: b.key, i });
  }
  const lvl = (it) => { const ex = it && it.exId ? Store.exercise(it.exId) : null; return ex ? { level: U.num(ex.level), family: ex.family } : null; };
  const change = (prev, it) => {
    if (!prev || !it || prev.name === it.name) return '';
    const a = lvl(prev), b = lvl(it);
    if (a && b && a.family && a.family === b.family && a.level != null && b.level != null) return b.level > a.level ? 'up' : b.level < a.level ? 'down' : 'swap';
    return 'swap';
  };
  if (!rows.length) return html`<p class="muted">Encara no hi ha exercicis. Tria la sessió 1 i omple'n els blocs.</p>`;
  return html`<div class="table-wrap plangrid-wrap"><table class="plangrid">
    <thead><tr><th class="pg-corner">Sessió</th>${cols.map((ps, k) => {
      const s = real.find((x) => U.num(x.planN) === ps.n);
      return html`<th class=${U.cls('pg-col', ps.n === sel && 'on', s && s.status === 'feta' && 'done')}>
        <button type="button" onClick=${() => onSel(ps.n)} aria-pressed=${ps.n === sel}>
          <span class="pg-n">S${ps.n}${s && s.status === 'feta' ? ' ✓' : ''}</span>
          <span class="pg-date">${U.fmtDateShort(s ? s.date : dates[k] || '')}</span>
          ${ps.phase && html`<span class="pg-phase">${ps.phase}</span>`}
        </button></th>`;
    })}</tr></thead>
    <tbody>${rows.map((r) => (r.head
      ? html`<tr class="pg-block"><th class="pg-rowh"><${BlockTag} k=${r.head} small=${true} /></th><td colspan=${cols.length}></td></tr>`
      : html`<tr><th class="pg-rowh pg-num">${blockDef(r.key).num}.${r.i + 1}</th>${cols.map((ps, k) => {
        const it = named(ps, r.key)[r.i];
        const prev = k > 0 ? named(cols[k - 1], r.key)[r.i] : null;
        const ch = change(prev, it);
        const l = lvl(it);
        return html`<td class=${U.cls('pg-cell', ps.n === sel && 'on', ch && `pg-${ch}`)} onClick=${() => onSel(ps.n)}>
          ${it ? html`<span class="pg-ex">${ch === 'up' ? '▲ ' : ch === 'down' ? '▼ ' : ''}${it.name}</span>
            <span class="pg-rx">${[l && l.level ? `N${l.level}` : '', Calc.presc(it)].filter(Boolean).join(' · ')}</span>` : html`<span class="pg-empty">—</span>`}
        </td>`;
      })}</tr>`))}</tbody>
  </table></div>`;
}
