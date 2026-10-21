/* EON Life · calendari: moure sessions arrossegant-les d'un dia a un altre (ratolí o dit), seleccionar-ne diverses per
   moure-les o eliminar-les de cop, la gràfica RPE/EVA de la fitxa i el calendari de la setmana de l'Inici. */

// ── Arrossegar sessions ──
// Ratolí: comença en moure uns píxels. Dit: mantenir-la premuda un moment (així el desplaçament normal de la pàgina no
// es trenca). Els dies del calendari porten data-date; en deixar-la anar, onDrop(ids, data).
const CalDrag = {
  st: null,
  last: 0,
  // Després d'arrossegar, el clic que ve darrere no ha d'obrir la sessió.
  recent() { return Date.now() - this.last < 450; },
  props(getIds, label, onDrop) {
    return {
      onMouseDown: (e) => { if (e.button === 0) CalDrag.arm(e.clientX, e.clientY, false, getIds, label, onDrop); },
      onTouchStart: (e) => { const t = e.touches && e.touches[0]; if (t && e.touches.length === 1) CalDrag.arm(t.clientX, t.clientY, true, getIds, label, onDrop); },
      onContextMenu: (e) => { if (CalDrag.st) e.preventDefault(); },
    };
  },
  arm(x, y, touch, getIds, label, onDrop) {
    this.cleanup();
    const st = { x0: x, y0: y, x, y, touch, getIds, label, onDrop, active: false, timer: 0, ghost: null, over: null };
    this.st = st;
    const move = (cx, cy, ev) => {
      if (this.st !== st) return;
      st.x = cx; st.y = cy;
      if (!st.active) {
        const d = Math.hypot(cx - st.x0, cy - st.y0);
        if (touch) { if (d > 10) this.cleanup(); return; }
        if (d < 6) return;
        this.begin();
      }
      if (ev && ev.cancelable) ev.preventDefault();
      this.track();
    };
    st.onMM = (e) => move(e.clientX, e.clientY, e);
    st.onTM = (e) => { const t = e.touches && e.touches[0]; if (t) move(t.clientX, t.clientY, e); };
    st.onUp = () => this.finish();
    if (touch) {
      st.timer = setTimeout(() => { if (this.st === st) this.begin(); }, 380);
      window.addEventListener('touchmove', st.onTM, { passive: false });
      window.addEventListener('touchend', st.onUp);
      window.addEventListener('touchcancel', st.onUp);
    } else {
      window.addEventListener('mousemove', st.onMM);
      window.addEventListener('mouseup', st.onUp);
    }
  },
  begin() {
    const st = this.st;
    if (!st || st.active) return;
    st.active = true;
    st.ids = st.getIds();
    try { if (navigator.vibrate) navigator.vibrate(12); } catch (e) { /* res */ }
    const g = document.createElement('div');
    g.className = 'cal-ghost';
    g.textContent = st.ids.length > 1 ? `${st.ids.length} sessions` : st.label;
    document.body.appendChild(g);
    st.ghost = g;
    document.body.classList.add('cal-dragging');
    this.track();
  },
  track() {
    const st = this.st;
    if (!st || !st.active) return;
    st.ghost.style.transform = `translate(${st.x + 14}px, ${st.y + 14}px)`;
    // A prop de la vora de la pantalla, la pàgina es desplaça per arribar als dies que no es veuen.
    const edge = 70, h = window.innerHeight;
    if (st.y > h - edge) window.scrollBy(0, Math.round((st.y - (h - edge)) / 3) + 4);
    else if (st.y < edge) window.scrollBy(0, -Math.round((edge - st.y) / 3) - 4);
    const el = document.elementFromPoint(st.x, st.y);
    const over = el && el.closest ? el.closest('[data-date]') : null;
    if (over !== st.over) {
      if (st.over) st.over.classList.remove('cal-drop');
      if (over) over.classList.add('cal-drop');
      st.over = over;
    }
  },
  finish() {
    const st = this.st;
    if (!st) return;
    const date = st.active && st.over ? st.over.getAttribute('data-date') : null;
    if (st.active) this.last = Date.now();
    this.cleanup();
    if (date) st.onDrop(st.ids, date);
  },
  cleanup() {
    const st = this.st;
    if (!st) return;
    clearTimeout(st.timer);
    window.removeEventListener('touchmove', st.onTM, { passive: false });
    window.removeEventListener('touchend', st.onUp);
    window.removeEventListener('touchcancel', st.onUp);
    window.removeEventListener('mousemove', st.onMM);
    window.removeEventListener('mouseup', st.onUp);
    if (st.ghost) st.ghost.remove();
    if (st.over) st.over.classList.remove('cal-drop');
    document.body.classList.remove('cal-dragging');
    this.st = null;
  },
};

// Mou sessions: to(sessió) → data nova. Demana confirmació si n'hi ha de fetes. Retorna quantes s'han mogut.
async function moveSessions(list, to) {
  const moves = list.map((s) => ({ s, date: to(s) })).filter((m) => m.date && m.date !== m.s.date);
  if (!moves.length) return 0;
  const done = moves.filter((m) => m.s.status === 'feta').length;
  if (done && !(await UI.confirm({
    title: done === moves.length && done === 1 ? 'Moure una sessió feta?' : 'Moure sessions fetes?',
    text: `${done === 1 ? 'Una de les sessions ja està feta' : `${done} de les sessions ja estan fetes`}: es canviarà la data on es van fer (i els seus resultats aniran amb la data nova).`,
    ok: 'Mou-les igualment',
  }))) return 0;
  for (const m of moves) Store.update('sessions', m.s.id, (x) => { x.date = m.date; });
  UI.toast(moves.length === 1 ? `Sessió ${moves[0].s.number || ''} moguda al ${U.fmtDate(moves[0].date)}.` : `${moves.length} sessions mogudes.`);
  return moves.length;
}

async function deleteSessions(list) {
  if (!list.length) return 0;
  const done = list.filter((s) => s.status === 'feta').length;
  const ok = await UI.confirm({
    title: list.length === 1 ? 'Eliminar la sessió?' : `Eliminar ${list.length} sessions?`,
    text: `${list.length === 1 ? `Sessió ${list[0].number || ''} del ${U.fmtDate(list[0].date)}.` : list.map((s) => `S${s.number || ''} (${U.fmtDateShort(s.date)})`).join(', ')}${done ? ` Compte: ${done === 1 ? 'una ja està feta i es perdran els seus resultats' : `${done} ja estan fetes i es perdran els seus resultats`}.` : ''}`,
    ok: 'Elimina', danger: true,
  });
  if (!ok) return 0;
  for (const s of list) Store.remove('sessions', s.id);
  UI.toast(list.length === 1 ? 'Sessió eliminada.' : `${list.length} sessions eliminades.`);
  return list.length;
}

// Barra d'accions de la selecció del seguiment mensual.
function CalSelectBar({ selected, monthSessions, onSelect, onDone }) {
  const n = selected.length;
  const shift = async (d) => { if (await moveSessions(selected, (s) => U.addDays(s.date, d))) onDone(true); };
  const toDate = async () => {
    const first = U.sortBy(selected, 'date')[0];
    const date = await askDate({ title: n > 1 ? `Moure ${n} sessions` : 'Canviar la data', label: n > 1 ? 'Nova data de la primera (les altres es mouen igual)' : 'Nova data', value: first ? first.date : U.today() });
    if (!date || !first) return;
    const d = U.diffDays(first.date, date);
    if (await moveSessions(selected, (s) => U.addDays(s.date, d))) onDone(true);
  };
  const del = async () => { if (await deleteSessions(selected)) onDone(true); };
  return html`<div class="cal-selbar" role="toolbar" aria-label="Accions de la selecció">
    <strong>${n ? U.plural(n, 'sessió seleccionada', 'sessions seleccionades') : 'Toca les sessions per seleccionar-les'}</strong>
    <span class="grow"></span>
    ${monthSessions.length > 0 && html`<${Btn} size="sm" variant="ghost" onClick=${() => onSelect(n === monthSessions.length ? [] : monthSessions.map((s) => s.id))}>${n === monthSessions.length ? 'Cap' : 'Tot el mes'}</${Btn}>`}
    ${n > 0 && html`
      <${Btn} size="sm" onClick=${() => shift(-1)} title="Un dia abans">−1 dia</${Btn}>
      <${Btn} size="sm" onClick=${() => shift(1)} title="Un dia després">+1 dia</${Btn}>
      <${Btn} size="sm" onClick=${() => shift(7)} title="Una setmana després">+1 setmana</${Btn}>
      <${Btn} size="sm" icon="calendar" onClick=${toDate}>Canvia la data…</${Btn}>
      <${Btn} size="sm" variant="danger" icon="trash" onClick=${del}>Elimina</${Btn}>`}
    <${Btn} size="sm" variant="ghost" icon="x" onClick=${() => onDone(false)}>Fet</${Btn}>
  </div>`;
}

// ── Gràfica RPE i EVA de la fitxa del pacient ──
function RpeEvaCard({ p, sessions, inner }) {
  const from = U.addMonths(U.today(), -3);
  const rows = sessions.filter((s) => s.date >= from && s.date <= U.today())
    .map((s) => ({ date: s.date, rpe: U.num(s.feedback && s.feedback.rpe), pain: U.num(s.feedback && s.feedback.pain) }))
    .filter((r) => r.rpe != null || r.pain != null);
  const avg = (k) => { const v = rows.map((r) => r[k]).filter((x) => x != null); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
  // Tendència: mitjana de la meitat recent menys la de la primera meitat.
  const trend = (k) => {
    const v = rows.map((r) => r[k]).filter((x) => x != null);
    if (v.length < 4) return null;
    const h = Math.floor(v.length / 2), a = v.slice(0, h), b = v.slice(-h);
    return b.reduce((x, y) => x + y, 0) / b.length - a.reduce((x, y) => x + y, 0) / a.length;
  };
  const arrow = (d, hiBad) => (d == null || Math.abs(d) < 0.5 ? html`<span class="muted">estable</span>`
    : html`<span class=${U.cls('trend', (hiBad ? d > 0 : false) && 'trend-bad', (hiBad ? d < 0 : false) && 'trend-good')}>${d > 0 ? '↑ puja' : '↓ baixa'} ${U.fmt(Math.abs(d), 1)}</span>`);
  return html`<section class=${U.cls('rpeeva', inner ? 'rpeeva-inner' : 'card')}>
    <div class="card-head"><h2 class=${inner ? 'h3' : 'h2'}>RPE i EVA · últims 3 mesos</h2>
      <${Btn} size="sm" icon="chart" onClick=${() => go('informesessions', p.id)}>Informe complet</${Btn}></div>
    ${rows.length ? html`
      <div class="kv-row">
        <div class="kv"><span>RPE mitjà</span><strong>${avg('rpe') == null ? '—' : U.fmt(avg('rpe'), 1)}</strong><small>${arrow(trend('rpe'), false)}</small></div>
        <div class="kv"><span>EVA mitjana (dolor en acabar)</span><strong>${avg('pain') == null ? '—' : U.fmt(avg('pain'), 1)}</strong><small>${arrow(trend('pain'), true)}</small></div>
        <div class="kv"><span>Sessions amb dades</span><strong>${rows.length}</strong></div>
      </div>
      <${LineChart} series=${[
        { name: 'RPE (esforç)', color: 'var(--series-1)', points: rows.map((r) => ({ x: r.date, y: r.rpe })) },
        { name: 'EVA (dolor en acabar)', color: 'var(--series-2)', points: rows.map((r) => ({ x: r.date, y: r.pain })) },
      ]} yMin=${0} yMax=${10} decimals=${0} height=${200} ariaLabel="Evolució de l'RPE i l'EVA dels últims 3 mesos" />`
      : html`<p class="muted">Encara no hi ha sessions dels últims 3 mesos amb RPE o EVA. S'omplen al tancament de cada sessió.</p>`}
  </section>`;
}

// ── Calendari de la setmana (Inici) ──
function WeekCalendar() {
  const today = U.today();
  const [wk, setWk] = useState(() => U.weekStart(today));
  const [prof, setProf] = useState(() => { try { return window.localStorage.getItem('eon.weekProf') || ''; } catch (e) { return ''; } });
  const pickProf = (v) => { setProf(v); try { window.localStorage.setItem('eon.weekProf', v); } catch (e) { /* res */ } };
  const end = U.addDays(wk, 6);
  const name = (pid) => { const p = Store.get('patients', pid); return p ? U.fullName(p) : 'Pacient'; };
  const profOf = (pid) => { const p = Store.get('patients', pid); return (p && p.professional) || ''; };
  const okProf = (x, pid) => !prof || (x || profOf(pid)) === prof;
  const sessions = Store.all('sessions').filter((s) => s.date >= wk && s.date <= end && okProf(s.professional, s.patientId));
  const assessments = Store.all('assessments').filter((a) => a.date >= wk && a.date <= end && okProf(a.professional, a.patientId));
  const retests = Store.patients().filter((p) => p.status === 'actiu' && okProf(p.professional, p.id))
    .map((p) => ({ p, r: Calc.retestDue(Store.assessmentsOf(p.id)) }))
    .filter((x) => x.r && x.r.due >= wk && x.r.due <= end);
  const profs = Store.professionals();
  const days = [0, 1, 2, 3, 4, 5, 6].map((i) => U.addDays(wk, i));
  const total = sessions.length + assessments.length + retests.length;
  return html`<section class="card weekcal" aria-label="Calendari de la setmana">
    <div class="card-head weekcal-head">
      <div class="month-nav">
        <${Btn} variant="ghost" icon="left" title="Setmana anterior" onClick=${() => setWk(U.addDays(wk, -7))} />
        <h2 class="h2">${wk === U.weekStart(today) ? 'Aquesta setmana' : `Setmana del ${U.fmtDateShort(wk)}`}</h2>
        <${Btn} variant="ghost" icon="right" title="Setmana següent" onClick=${() => setWk(U.addDays(wk, 7))} />
        ${wk !== U.weekStart(today) && html`<${Btn} size="sm" variant="ghost" onClick=${() => setWk(U.weekStart(today))}>Avui</${Btn}>`}
      </div>
      <div class="weekcal-filter">
        <${Select} value=${prof} onValue=${pickProf} options=${profs.map((x) => ({ v: x, label: x }))} placeholder="Tots els professionals" ariaLabel="Filtra per professional" />
        <span class="muted small">${U.plural(sessions.length, 'sessió', 'sessions')} · ${U.plural(assessments.length + retests.length, 'valoració', 'valoracions')}</span>
      </div>
    </div>
    <div class="weekcal-grid">${days.map((d) => {
      const ss = U.sortBy(sessions.filter((s) => s.date === d), (s) => `${s.time || '99'}#${U.norm(name(s.patientId))}`);
      const aa = assessments.filter((a) => a.date === d);
      const rr = retests.filter((x) => x.r.due === d);
      return html`<div class=${U.cls('weekcal-day', d === today && 'today', d < today && 'past')}>
        <div class="weekcal-dn"><span>${U.weekdayShort(d)}</span><strong>${U.parse(d).getDate()}</strong></div>
        ${ss.map((s) => html`<button type="button" class=${U.cls('weekcal-it', s.status === 'feta' ? 'done' : 'plan')} onClick=${() => go('sessio', s.id)}
          title=${[name(s.patientId), `Sessió ${s.number || ''}`, s.goal, s.professional].filter(Boolean).join(' · ')}>
          <span class="weekcal-who">${s.time && html`<span class="cal-s-time">${s.time}</span>`}${name(s.patientId)}</span>
          <span class="weekcal-what">S${s.number || ''}${s.status === 'feta' ? ' ✓' : ''}${s.goal ? ` · ${s.goal}` : ''}</span>
        </button>`)}
        ${aa.map((a) => html`<button type="button" class="weekcal-it assess" onClick=${() => go('valoracio', a.id)} title=${`Valoració · ${name(a.patientId)}`}>
          <span class="weekcal-who">${name(a.patientId)}</span><span class="weekcal-what">Valoració</span>
        </button>`)}
        ${rr.map((x) => html`<button type="button" class="weekcal-it retest" onClick=${() => go('client', x.p.id, 'valoracions')} title="Toca el re-test">
          <span class="weekcal-who">${U.fullName(x.p)}</span><span class="weekcal-what">Re-test pendent</span>
        </button>`)}
        ${!ss.length && !aa.length && !rr.length && html`<span class="weekcal-empty">—</span>`}
      </div>`;
    })}</div>
    ${!total && html`<p class="muted small">No hi ha res programat aquesta setmana${prof ? ` per a ${prof}` : ''}.</p>`}
    <div class="cal-legend"><span><i class="cal-key done"></i>Sessió feta</span><span><i class="cal-key plan"></i>Sessió programada</span>
      <span><i class="cal-key assess"></i>Valoració</span><span><i class="cal-key retest"></i>Re-test pendent</span></div>
  </section>`;
}

// ── Conflictes d'horari (Inici i sessió) ──
function scheduleConflictsFor(sessions, from, to) {
  const profOf = (pid) => { const p = Store.get('patients', pid); return (p && p.professional) || ''; };
  return Calc.scheduleConflicts(sessions, { from, to, unique: Store.uniqueMaterials(), profOf });
}

function ConflictItem({ c, focus }) {
  const who = (s) => { const p = Store.get('patients', s.patientId); return p ? U.fullName(p) : 'Pacient'; };
  const prof = (s) => s.professional || ((Store.get('patients', s.patientId) || {}).professional) || 'sense professional';
  const side = (s) => html`<button type="button" class=${U.cls('conf-s', focus && focus === s.id && 'me')} onClick=${() => go('sessio', s.id)}>
    <strong>${s.time}</strong> · ${who(s)} <span class="muted">· ${prof(s)} · S${s.number || ''}</span></button>`;
  return html`<li class=${`conf conf-${c.kind}`}>
    <div class="conf-head"><${Icon} name="alert" size=${16} />
      <span>${U.weekdayShort(c.date)} ${U.fmtDateShort(c.date)} · ${c.kind === 'prof'
        ? html`<strong>${c.prof}</strong> té dues sessions a la vegada`
        : html`material compartit: <strong>${c.mats.join(', ')}</strong>`}</span></div>
    <div class="conf-pair">${side(c.a)}${side(c.b)}</div>
  </li>`;
}

// Avís de l'Inici: conflictes de les properes 2 setmanes.
function ConflictsCard() {
  const today = U.today();
  const list = scheduleConflictsFor(Store.all('sessions'), today, U.addDays(today, 13));
  if (!list.length) return null;
  return html`<section class="card conflicts" aria-label="Conflictes d'horari">
    <div class="card-head"><h2 class="h2">Conflictes d'horari · properes 2 setmanes</h2>
      <span class="muted small">Cada sessió compta 1 hora. Material únic: Configuració › Material del centre.</span></div>
    <ul class="conf-list">${list.map((c) => html`<${ConflictItem} c=${c} />`)}</ul>
  </section>`;
}

// Avís a dalt de la sessió si coincideix amb una altra.
function SessionConflicts({ s }) {
  if (!s.time || s.status === 'feta') return null;
  const list = scheduleConflictsFor(Store.all('sessions').filter((x) => x.date === s.date), s.date, s.date)
    .filter((c) => c.a.id === s.id || c.b.id === s.id);
  if (!list.length) return null;
  return html`<section class="card conflicts conflicts-inline no-print" role="alert">
    <ul class="conf-list">${list.map((c) => html`<${ConflictItem} c=${c} focus=${s.id} />`)}</ul>
  </section>`;
}
