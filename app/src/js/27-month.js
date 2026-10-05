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
                  const load = Calc.sessionLoad(s);
                  return html`<button type="button" class=${U.cls('cal-s', s.status === 'feta' ? 'done' : 'plan')} onClick=${() => go('sessio', s.id)} title=${s.goal}>
                    <span class="cal-s-n">S${s.number}</span>
                    <span class="cal-s-goal">${s.goal || 'Sessió'}</span>
                    ${s.status === 'feta' && html`<span class="cal-s-fb">RPE ${(s.feedback || {}).rpe || '—'} · ${(s.feedback || {}).duration || '—'}′${load != null ? ` · ${U.fmt(load, 0)}` : ''}</span>`}
                  </button>`;
                })}
                ${(planned[date] || []).map((x) => html`<button type="button" class="cal-s ghost" onClick=${() => fromPlan(date, x)}
                  title=${`Prevista al pla «${x.plan.name}». Toca-la per preparar-la.`}>
                  <span class="cal-s-n">S${x.ps.n} del pla</span>
                  <span class="cal-s-goal">${x.ps.goal || x.ps.phase || x.plan.goal || x.plan.name}</span>
                </button>`)}
                ${!list.length && !planned[date] && !out && i === 6 && html`<span class="cal-off">OFF</span>`}
                ${!out && !list.length && !planned[date] && i < 6 && html`<button type="button" class="cal-add" title=${`Nova sessió el ${U.fmtDate(date)}`} onClick=${() => openNewSession(p.id, date)}><${Icon} name="plus" size=${15} /></button>`}
              </div>`;
            })}
            <div class="cal-w">
              <span class="cal-w-load">${w.load ? U.fmt(w.load, 0) : '—'}<small> UA</small></span>
              <span class="cal-w-meta">${w.done}/${w.sessions} fetes${w.rpe != null ? ` · RPE ${U.fmt(w.rpe, 1)}` : ''}</span>
              ${w.sessions > 0 && html`<button type="button" class="link cal-w-copy" title="Copia les sessions d'aquesta setmana a les següents" onClick=${() => openCopyWeek(p, w.start)}>Copia la setmana</button>`}
            </div>`)}
        </div>
      </div>
      <p class="muted small">Càrrega de sessió = RPE (0–10) × durada en minuts, en unitats arbitràries (UA). Toca un dia buit per planificar-hi una sessió, o planifica un mes sencer d'un cop. Les sessions amb vora discontínua són les previstes al pla d'entrenament. Tot el que hi ha aquí (fet, planificat i previst) surt també a l'Excel de visió general del client.</p>
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
