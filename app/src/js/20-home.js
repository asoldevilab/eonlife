/* EON Life · pantalla d'inici: sessions d'avui, re-tests pendents i llista de clients. */

function greeting() {
  const h = new Date().getHours();
  return h < 14 ? 'Bon dia' : h < 21 ? 'Bona tarda' : 'Bona nit';
}

function HomeView() {
  const today = U.today();
  const [q, setQ] = useState('');
  const [fProf, setFProf] = useState('');
  const [fProfile, setFProfile] = useState('');
  const [fStatus, setFStatus] = useState('actiu');

  const patients = Store.patients();
  const sessions = Store.all('sessions');
  const byPatient = useMemo(() => {
    const m = {};
    for (const s of sessions) (m[s.patientId] = m[s.patientId] || []).push(s);
    return m;
  }, [Store.version]);

  const todays = U.sortBy(sessions.filter((s) => s.date === today), (s) => U.norm(U.fullName(Store.get('patients', s.patientId))));
  const upcoming = U.sortBy(sessions.filter((s) => s.date > today && s.date <= U.addDays(today, 7)), 'date');
  const wk0 = U.weekStart(today), wk1 = U.addDays(wk0, 6);
  const week = sessions.filter((s) => s.date >= wk0 && s.date <= wk1);
  const active = patients.filter((p) => p.status === 'actiu');
  const retests = U.sortBy(active.map((p) => ({ p, r: Calc.retestDue(Store.assessmentsOf(p.id)) }))
    .filter((x) => !x.r || x.r.days <= 21), (x) => (x.r ? x.r.days : -999));

  const nq = U.norm(q);
  const list = patients.filter((p) => (!nq || U.norm(`${p.firstName} ${p.lastName} ${p.email}`).includes(nq))
    && (!fProf || p.professional === fProf) && (!fProfile || p.profile === fProfile) && (!fStatus || p.status === fStatus));

  return html`<div class="page">
    <header class="page-head">
      <div>
        <p class="eyebrow">${U.fmtDateLong(today)}</p>
        <h1 class="h1">${greeting()}</h1>
      </div>
      <div class="page-actions">
        <${Btn} icon="clipboard" onClick=${() => openAddMeasurement('dades')}>Afegeix mesures</${Btn}>
        <${Btn} variant="primary" icon="plus" onClick=${openNewPatient}>Nou client</${Btn}>
      </div>
    </header>

    ${Store.meta.demo && html`<${DemoBanner} />`}

    <section class="stats">
      <${Stat} icon="users" label="Clients actius" value=${active.length} sub=${`${patients.length} en total`} />
      <${Stat} icon="calendar" label="Sessions d'avui" value=${todays.length} sub=${todays.length ? `${todays.filter((s) => s.status === 'feta').length} fetes` : 'Cap sessió planificada'} />
      <${Stat} icon="dumbbell" label="Aquesta setmana" value=${week.filter((s) => s.status === 'feta').length} unit=${`/ ${week.length}`} sub="sessions fetes / planificades" />
      <${Stat} icon="clipboard" label="Re-tests pendents" value=${retests.filter((x) => x.r && x.r.days <= 0).length} sub=${`Valoració cada ${THRESHOLDS.retestMonths} mesos`} tone=${retests.some((x) => x.r && x.r.days <= 0) ? 'warn' : ''} />
    </section>

    <div class="home-grid">
      <section class="card">
        <div class="card-head"><h2 class="h2">Sessions d'avui</h2></div>
        ${todays.length ? html`<div class="slist">${todays.map((s) => html`<${SessionRow} s=${s} showPatient=${true} />`)}</div>`
          : html`<${Empty} icon="calendar" title="Avui no hi ha cap sessió" text="Crea una sessió des de la fitxa del client." />`}
        ${upcoming.length > 0 && html`<h3 class="h3 mt">Propers 7 dies</h3>
          <div class="slist">${upcoming.slice(0, 8).map((s) => html`<${SessionRow} s=${s} showPatient=${true} compact=${true} />`)}</div>`}
      </section>

      <section class="card">
        <div class="card-head"><h2 class="h2">Valoracions pendents</h2></div>
        ${retests.length ? html`<ul class="plainlist">${retests.map(({ p, r }) => html`<li class="retest">
          <${PatientChip} p=${p} />
          ${r ? html`<span class=${U.cls('retest-when', r.days <= 0 && 'due')}>${r.days <= 0 ? `Re-test des del ${U.fmtDate(r.due)}` : `Re-test el ${U.fmtDate(r.due)}`}</span>`
            : html`<span class="retest-when due">Sense valoració inicial</span>`}
          <${Btn} size="sm" variant="ghost" icon="clipboard" onClick=${() => createAssessment(p.id)}>${r ? 'Re-test' : 'Valorar'}</${Btn}>
        </li>`)}</ul>` : html`<${Empty} icon="check" title="Tot al dia" text="No hi ha re-tests en les properes 3 setmanes." />`}
      </section>
    </div>

    <section class="card">
      <div class="card-head">
        <h2 class="h2">Clients</h2>
        <span class="muted">${U.plural(list.length, 'client', 'clients')}</span>
      </div>
      <div class="filters">
        <label class="search"><${Icon} name="search" size=${17} />
          <input class="input" type="search" placeholder="Cerca per nom…" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Cerca clients" />
        </label>
        <${Select} value=${fStatus} onValue=${setFStatus} placeholder="Tots els estats" options=${OPT.status} ariaLabel="Estat" />
        <${Select} value=${fProfile} onValue=${setFProfile} placeholder="Tots els perfils" options=${OPT.profiles} ariaLabel="Perfil" />
        <${Select} value=${fProf} onValue=${setFProf} placeholder="Tots els professionals" options=${Store.professionals()} ariaLabel="Professional" />
      </div>
      ${list.length ? html`<div class="clist">${list.map((p) => html`<${ClientRow} p=${p} sessions=${byPatient[p.id] || []} />`)}</div>`
        : html`<${Empty} icon="users" title=${patients.length ? 'Cap client coincideix amb la cerca' : 'Encara no hi ha clients'} text=${patients.length ? 'Prova amb uns altres filtres.' : 'Crea el primer client per començar.'}>
          ${!patients.length && html`<${Btn} variant="primary" icon="plus" onClick=${openNewPatient}>Nou client</${Btn}>`}
        </${Empty}>`}
    </section>
  </div>`;
}

function ClientRow({ p, sessions }) {
  const today = U.today();
  const done = U.sortBy(sessions.filter((s) => s.status === 'feta'), 'date', -1)[0];
  const next = U.sortBy(sessions.filter((s) => s.date >= today && s.status !== 'feta'), 'date')[0];
  const last = Store.assessmentsOf(p.id).pop();
  const age = U.age(p.birthDate);
  return html`<button type="button" class="crow" onClick=${() => go('client', p.id)}>
    <${Avatar} p=${p} />
    <span class="crow-main">
      <span class="crow-name">${U.fullName(p)}</span>
      <span class="crow-meta">${[age != null && `${age} anys`, p.professional].filter(Boolean).join(' · ')}</span>
    </span>
    <span class="crow-profile"><${Pill} tone="brand" title=${(OPT.profiles.find((o) => o.v === p.profile) || {}).label}>Perfil ${p.profile || '—'}</${Pill}></span>
    <span class="crow-col"><span class="crow-k">Última sessió</span><span>${done ? U.since(done.date) : '—'}</span></span>
    <span class="crow-col"><span class="crow-k">Propera</span><span>${next ? (next.date === today ? 'Avui' : U.fmtDateShort(next.date)) : '—'}</span></span>
    <span class="crow-col"><span class="crow-k">Valoració</span><span>${last ? U.fmtDateShort(last.date) : html`<span class="warn-text">Pendent</span>`}</span></span>
    <${Icon} name="right" class="crow-go" />
  </button>`;
}

function DemoBanner() {
  return html`<div class="banner">
    <${Icon} name="info" />
    <div><strong>${IS_ARTIFACT ? 'Enllaç de prova amb clients ficticis.' : 'Mode de prova amb clients ficticis.'}</strong> Les dades es guarden només en aquest ${IS_ARTIFACT ? 'dispositiu' : 'navegador'}. Quan l'app estigui connectada al Microsoft 365 de la clínica, tot es desarà a l'Excel de la carpeta compartida.</div>
    <${Btn} size="sm" variant="ghost" onClick=${() => go('configuracio')}>Configuració</${Btn}>
  </div>`;
}
