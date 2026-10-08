/* EON Life · seguiment mensual (com l'Excel de control: calendari, RPE, temps i càrrega per dia,
   i la progressió de càrregues de cada exercici durant el mes). */

function MonthView({ p, sessions }) {
  const today = U.today();
  const [month, setMonth] = useState(() => MonthNav.take(p.id) || U.monthKey(today));
  const [allBlocks, setAllBlocks] = useState(false);
  // En planificar un mes (Planifica el mes), el calendari hi va sol.
  useEffect(() => { const m = MonthNav.take(p.id); if (m) setMonth(m); });
  const first = `${month}-01`;
  const last = U.addDays(U.addMonths(first, 1), -1);
  const gridStart = U.weekStart(first);
  const weeksCount = Math.ceil((U.diffDays(gridStart, last) + 1) / 7);
  const inMonth = sessions.filter((s) => s.date >= first && s.date <= last);
  const done = inMonth.filter((s) => s.status === 'feta');
  const loads = done.map(Calc.sessionLoad).filter((n) => n != null);
  const rpes = done.map((s) => U.num(s.feedback && s.feedback.rpe)).filter((n) => n != null);
  const weeks = Calc.weeks(sessions, gridStart, weeksCount);
  const shift = (n) => setMonth(U.monthKey(U.addMonths(first, n)));
  // Sessions previstes dels plans d'entrenament que encara no s'han fet (data → [{ plan, n }]).
  const planned = {};
  for (const plan of Store.plans(p.id)) {
    const used = new Set(Store.planSessions(plan).map((s) => U.num(s.planN)));
    Calc.planDates(plan).forEach((date, i) => {
      const ps = plan.sessions[i];
      if (ps && !used.has(ps.n)) (planned[date] = planned[date] || []).push({ plan, ps });
    });
  }
  const fromPlan = (date, x) => {
    const s = Store.newSession(p.id, { date, mode: 'plan', planId: x.plan.id, planN: x.ps.n });
    go('sessio', s.id);
  };

  return html`<div class="stack">
    <section class="card">
      <div class="card-head month-head">
        <div class="month-nav">
          <${Btn} variant="ghost" icon="left" title="Mes anterior" onClick=${() => shift(-1)} />
          <h2 class="h2 month-title">${U.fmtMonth(month)}</h2>
          <${Btn} variant="ghost" icon="right" title="Mes següent" onClick=${() => shift(1)} />
          ${month !== U.monthKey(today) && html`<${Btn} size="sm" variant="ghost" onClick=${() => setMonth(U.monthKey(today))}>Avui</${Btn}>`}
        </div>
        <${Btn} variant="primary" icon="calendar" onClick=${() => openPlanMonth(p, month)}>Planifica el mes</${Btn}>
        <div class="kv-row">
          <div class="kv"><span>Sessions fetes</span><strong>${done.length}<small> / ${inMonth.length}</small></strong></div>
          <div class="kv"><span>Càrrega del mes</span><strong>${loads.length ? `${U.fmt(loads.reduce((a, b) => a + b, 0), 0)} UA` : '—'}</strong></div>
          <div class="kv"><span>RPE mitjà</span><strong>${rpes.length ? U.fmt(rpes.reduce((a, b) => a + b, 0) / rpes.length, 1) : '—'}</strong></div>
        </div>
      </div>
      <div class="cal-wrap">
        <div class="cal" role="grid" aria-label=${`Calendari de ${U.fmtMonth(month)}`}>
          ${['dl', 'dt', 'dc', 'dj', 'dv', 'ds', 'dg'].map((d) => html`<div class="cal-h">${d}</div>`)}
          <div class="cal-h cal-h-week">Setmana</div>
          ${weeks.map((w) => html`
            ${[0, 1, 2, 3, 4, 5, 6].map((i) => {
              const date = U.addDays(w.start, i);
              const out = date < first || date > last;
              const list = sessions.filter((s) => s.date === date);
              return html`<div class=${U.cls('cal-d', out && 'out', date === today && 'today', i >= 5 && 'wkend')}>
                <div class="cal-dn">${U.parse(date).getDate()}</div>
                ${list.map((s) => {
                  const quick = !sessionFilled(s);
                  const nums = sessionNums(s);
                  return html`<button type="button" class=${U.cls('cal-s', s.status === 'feta' ? 'done' : 'plan', quick && 'quick')}
                    onClick=${() => (quick ? openQuickSession(p, { s }) : go('sessio', s.id))} title=${sessionTitle(s, quick)}>
                    <span class="cal-s-n">S${s.number}${quick ? ' · objectiu' : ''}${s.status === 'feta' ? ' ✓' : ''}</span>
                    <span class="cal-s-goal">${s.goal || 'Sessió'}</span>
                    ${nums}
                  </button>`;
                })}
                ${(planned[date] || []).map((x) => html`<button type="button" class="cal-s ghost" onClick=${() => fromPlan(date, x)}
                  title=${`Prevista al pla «${x.plan.name}». Toca-la per preparar-la.`}>
                  <span class="cal-s-n">S${x.ps.n} del pla</span>
                  <span class="cal-s-goal">${x.ps.goal || x.ps.phase || x.plan.goal || x.plan.name}</span>
                </button>`)}
                ${!list.length && !planned[date] && !out && i === 6 && html`<span class="cal-off">OFF</span>`}
                ${!out && !list.length && !planned[date] && i < 6 && html`<button type="button" class="cal-add" title=${`Nova sessió el ${U.fmtDate(date)}`} onClick=${() => openCalendarAdd(p, date)}><${Icon} name="plus" size=${15} /></button>`}
              </div>`;
            })}
            <div class="cal-w">
              <span class="cal-w-load">${w.load ? U.fmt(w.load, 0) : '—'}<small> UA</small></span>
              <span class="cal-w-meta">${w.done}/${w.sessions} fetes${w.rpe != null ? ` · RPE ${U.fmt(w.rpe, 1)}` : ''}</span>
              ${w.sessions > 0 && html`<button type="button" class="link cal-w-copy" title="Copia les sessions d'aquesta setmana a les següents" onClick=${() => openCopyWeek(p, w.start)}>Copia la setmana</button>`}
            </div>`)}
        </div>
      </div>
      <div class="cal-legend" aria-label="Llegenda">
        <span><i class="cal-key done"></i>Feta</span>
        <span><i class="cal-key plan"></i>Programada (amb exercicis)</span>
        <span><i class="cal-key quick"></i>Només l'objectiu</span>
        <span><i class="cal-key ghost"></i>Prevista al pla</span>
      </div>
      <p class="muted small">Sota l'objectiu de cada sessió: l'RPE i l'EVA (dolor en acabar la sessió). Càrrega de sessió = RPE (1–10) × durada en minuts, en unitats arbitràries (UA). Toca el + d'un dia buit per programar-hi una sessió sencera o per anotar-ne només l'objectiu, o planifica un mes sencer d'un cop. Les sessions amb vora discontínua són les previstes al pla d'entrenament. Tot el que hi ha aquí (fet, planificat i previst) surt també al full del mes de l'Excel del pacient.</p>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Progressió de càrregues</h2>
        <label class="check"><input type="checkbox" checked=${allBlocks} onChange=${(e) => setAllBlocks(e.currentTarget.checked)} /> Tots els blocs</label></div>
      <${LoadProgression} sessions=${inMonth} blocks=${allBlocks ? BLOCK_KEYS : ['pot', 'for', 'acc']} />
    </section>
  </div>`;
}

// Taula exercici × sessió amb la càrrega i la prescripció de cada dia.
function LoadProgression({ sessions, blocks }) {
  const cols = U.sortBy(sessions, (s) => `${s.date}#${String(s.number).padStart(4, '0')}`);
  const rows = [];
  for (const key of blocks) {
    const names = [];
    for (const s of cols) for (const b of s.blocks || []) if (b.key === key) for (const it of b.items || []) if (it.name && !names.includes(it.name)) names.push(it.name);
    for (const n of names) rows.push({ key, name: n });
  }
  if (!cols.length || !rows.length) return html`<${Empty} icon="dumbbell" title="Sense exercicis aquest mes" text="Quan hi hagi sessions, aquí es veurà com evolucionen les càrregues de cada exercici." />`;
  const cell = (s, key, name) => {
    const b = (s.blocks || []).find((x) => x.key === key);
    const it = b && (b.items || []).find((x) => x.name === name);
    if (!it) return html`<td class="lp-empty"></td>`;
    const load = Calc.load(it.load);
    const sr = it.sets && it.reps ? `${it.sets}×${it.reps}` : it.reps || '';
    return html`<td class=${U.cls('lp-cell', s.status === 'feta' && 'done')}>
      <span class="lp-load">${load || sr || '✓'}</span>${load && sr && html`<span class="lp-sr">${sr}</span>`}
    </td>`;
  };
  let lastKey = null;
  return html`<div class="table-wrap"><table class="table lp">
    <thead><tr><th class="lp-name">Exercici</th>${cols.map((s) => html`<th class="lp-col"><button type="button" class="link" onClick=${() => go('sessio', s.id)}>
      <span>${U.weekdayShort(s.date)} ${U.parse(s.date).getDate()}</span><span class="muted">S${s.number}</span></button></th>`)}</tr></thead>
    <tbody>${rows.map((r) => {
      const head = r.key !== lastKey ? html`<tr class="lp-block"><td colspan=${cols.length + 1}><${BlockTag} k=${r.key} small=${true} /></td></tr>` : null;
      lastKey = r.key;
      return html`${head}<tr><td class="lp-name">${r.name}</td>${cols.map((s) => cell(s, r.key, r.name))}</tr>`;
    })}</tbody>
  </table></div>`;
}

// ── Sessions del calendari: sencera (amb exercicis) o només l'objectiu ──
const sessionFilled = (s) => (s.blocks || []).some((b) => (b.items || []).some((i) => i.name));

// L'RPE i el dolor (EVA del final de la sessió) com a dues etiquetes ben visibles sota l'objectiu. El dolor es pinta
// segons la intensitat (0–2 verd, 3–5 groc, 6–10 vermell) per veure d'un cop d'ull si puja o baixa durant el mes.
const painTone = (v) => (v == null ? '' : v >= 6 ? 'bad' : v >= 3 ? 'warn' : 'ok');
function sessionNums(s) {
  const f = s.feedback || {};
  const rpe = U.num(f.rpe), pain = U.num(f.pain);
  if (rpe == null && pain == null) return null;
  return html`<span class="cal-s-fb">
    ${rpe != null && html`<span class="cal-m cal-m-rpe" title="RPE de la sessió (1–10)"><small>RPE</small>${rpe}</span>`}
    ${pain != null && html`<span class=${`cal-m cal-m-pain cal-m-${painTone(pain)}`} title="Dolor en acabar (EVA 0–10)"><small>EVA</small>${pain}</span>`}
  </span>`;
}

function sessionTitle(s, quick) {
  const load = Calc.sessionLoad(s);
  const f = s.feedback || {};
  return [s.goal || 'Sessió', quick ? 'Només l\'objectiu (toca-la per editar-la o programar-la sencera)' : '',
    U.num(f.duration) != null ? `${f.duration} min` : '', load != null ? `${U.fmt(load, 0)} UA` : ''].filter(Boolean).join(' · ');
}

// El + d'un dia del calendari: programar la sessió sencera (com sempre) o anotar-ne només l'objectiu.
function openCalendarAdd(p, date) {
  let close = null;
  close = UI.open(() => html`<${CalendarAddDialog} p=${p} date=${date} onClose=${() => close()} />`);
}

function CalendarAddDialog({ p, date, onClose }) {
  const [mode, setMode] = useState('quick');
  const option = (v, title, text) => html`<label class=${U.cls('choice', mode === v && 'on')}>
    <input type="radio" name="ca-mode" checked=${mode === v} onChange=${() => setMode(v)} />
    <span class="choice-body"><span class="choice-title">${title}</span><span class="choice-text">${text}</span></span>
  </label>`;
  if (mode === 'quick-form') return html`<${QuickSessionDialog} p=${p} date=${date} onClose=${onClose} />`;
  const next = () => {
    if (mode === 'full') { onClose(); openNewSession(p.id, date); } else setMode('quick-form');
  };
  return html`<${Dialog} title=${`Nova sessió · ${U.fmtDateLong(date)}`} onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="right" onClick=${next}>Continua</${Btn}>`}>
    <div class="choices">
      ${option('quick', 'Només l\'objectiu', 'Per omplir el calendari ràpid: s\'anota l\'objectiu (i el pilar, si vols) i surt al quadre del dia. Més endavant la pots programar sencera.')}
      ${option('full', 'Programa la sessió sencera', 'Amb els blocs i els exercicis: del pla, copiant l\'última, d\'una plantilla o en blanc.')}
    </div>
  </${Dialog}>`;
}

function openQuickSession(p, { s, date } = {}) {
  let close = null;
  close = UI.open(() => html`<${QuickSessionDialog} p=${p} s=${s} date=${date} onClose=${() => close()} />`);
}

// Sessió amb només l'objectiu: crear-la, editar-la, marcar-la com a feta amb l'RPE i el dolor, o passar-la a sencera.
function QuickSessionDialog({ p, s, date, onClose }) {
  const f0 = (s && s.feedback) || {};
  const [f, setF] = useState({
    goal: (s && s.goal) || '', pillar: (s && s.pillar) || '', status: (s && s.status) || 'planificada',
    rpe: f0.rpe || '', pain: f0.pain || '', duration: f0.duration || '',
  });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const when = (s && s.date) || date;
  const save = (thenFull) => {
    if (!f.goal.trim()) { UI.toast('Escriu l\'objectiu de la sessió.', 'bad'); return null; }
    const apply = (x) => {
      x.goal = f.goal.trim(); x.pillar = f.pillar; x.status = f.status;
      x.feedback = { ...(x.feedback || {}), rpe: f.rpe, pain: f.pain, duration: f.duration };
    };
    let rec;
    if (s) rec = Store.update('sessions', s.id, apply);
    else { rec = Store.addPlanned(p.id, { date: when, blocks: [], goal: f.goal.trim(), pillar: f.pillar }); rec = Store.update('sessions', rec.id, apply); }
    onClose();
    if (thenFull) go('sessio', rec.id);
    else UI.toast(s ? 'Sessió desada.' : `Sessió anotada el ${U.fmtDate(when)}.`);
    return rec;
  };
  const remove = async () => {
    if (!(await UI.confirm({ title: 'Eliminar aquesta sessió?', text: `S${s.number} · ${U.fmtDate(s.date)} · ${s.goal || 'sense objectiu'}`, ok: 'Elimina-la', danger: true }))) return;
    Store.remove('sessions', s.id);
    onClose();
  };
  const done = f.status === 'feta';
  return html`<${Dialog} title=${s ? `Sessió ${s.number} · ${U.fmtDateLong(when)}` : `Només l'objectiu · ${U.fmtDateLong(when)}`} onClose=${onClose} footer=${html`
    ${s && html`<${Btn} variant="ghost" icon="trash" onClick=${remove}>Elimina</${Btn}>`}
    <${Btn} variant="ghost" icon="edit" onClick=${() => save(true)}>Programa-la sencera</${Btn}>
    <${Btn} variant="primary" icon="check" onClick=${() => save(false)}>${s ? 'Desa' : 'Anota-la al calendari'}</${Btn}>`}>
    <form class="form-grid" onSubmit=${(e) => { e.preventDefault(); save(false); }}>
      <${Field} label="Objectiu de la sessió" id="qs-goal" wide=${true}>
        <${TextInput} id="qs-goal" value=${f.goal} onValue=${set('goal')} autoFocus=${true} placeholder="p. ex. Força de tren inferior · readaptació LCA" />
      </${Field}>
      <${Field} label="Pilar" id="qs-pillar"><${Select} id="qs-pillar" value=${f.pillar} onValue=${set('pillar')} options=${OPT.pillars} placeholder="—" /></${Field}>
      <${Field} label="Estat" id="qs-status">
        <${Seg} value=${f.status} onValue=${set('status')} allowEmpty=${false} ariaLabel="Estat" options=${OPT.sessionStatus.map((o) => ({ v: o.v, label: o.label }))} />
      </${Field}>
      ${done && html`
        <${Field} label="RPE de la sessió (1–10)" id="qs-rpe" wide=${true} hint=${RPE_HINT}>
          <${Seg} value=${f.rpe} onValue=${set('rpe')} options=${RPE_SCALE} ariaLabel="RPE de la sessió" />
        </${Field}>
        <${Field} label="Dolor en acabar (EVA 0–10)" id="qs-pain" wide=${true}>
          <${Seg} value=${f.pain} onValue=${set('pain')} options=${EVA_SCALE} ariaLabel="Dolor en acabar" />
        </${Field}>
        <${Field} label="Durada" id="qs-dur"><${NumInput} id="qs-dur" value=${f.duration} onValue=${set('duration')} unit="min" /></${Field}>`}
      <button type="submit" hidden></button>
    </form>
    ${!done && html`<p class="dialog-text">Quan el pacient l'hagi feta, torna-la a obrir i marca-la com a <strong>Feta</strong> per anotar-hi l'RPE i el dolor: surten al quadre del dia.</p>`}
  </${Dialog}>`;
}
