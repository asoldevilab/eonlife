/* EON Life · informes d'evolució per al pacient (pantalla, PDF i paper), en mode clar o fosc:
   · Informe de tests: els tests que es triïn, en un rang de dates, amb una taula i una gràfica d'evolució per test.
   · Informe de sessions: l'RPE, el dolor en acabar (EVA) i el wellness que el pacient omple a cada sessió.
   Les dades surten d'Evol (04-evol.js). Els comentaris del professional no hi surten mai. */

const fmtVal = (v, unit) => (v == null ? '—' : U.fmt(v, unit === 'N' ? 0 : 1));

// Rang de dates amb dreceres (tot, 3 mesos, 6 mesos, aquest any).
function ReportRange({ from, to, setFrom, setTo, first }) {
  const today = U.today();
  const presets = [
    { label: 'Tot', from: first, to: today },
    { label: 'Últims 3 mesos', from: U.addMonths(today, -3), to: today },
    { label: 'Últims 6 mesos', from: U.addMonths(today, -6), to: today },
    { label: 'Aquest any', from: `${today.slice(0, 4)}-01-01`, to: today },
  ];
  return html`<div class="rpick-range">
    <${Field} label="Des de" id="rr-from"><${TextInput} id="rr-from" type="date" value=${from} onValue=${setFrom} /></${Field}>
    <${Field} label="Fins a" id="rr-to"><${TextInput} id="rr-to" type="date" value=${to} onValue=${setTo} /></${Field}>
    <div class="rpick-presets">${presets.map((x) => html`<button type="button" class=${U.cls('chip', x.from === from && x.to === to && 'on')}
      onClick=${() => { setFrom(x.from); setTo(x.to); }}>${x.label}</button>`)}</div>
  </div>`;
}

// Portada comuna dels dos informes.
function EvolCover({ p, eyebrow, from, to, count }) {
  const service = OPT.services.find((o) => o.v === p.service);
  const age = U.age(p.birthDate, to);
  return html`<header class="report-cover">
    <${BrandMark} />
    <div class="report-id">
      <p class="eyebrow">${eyebrow}</p>
      <h1 class="report-title">${U.fullName(p)}</h1>
      <p class="report-sub">Del ${U.fmtDateLong(from, false)} al ${U.fmtDateLong(to, false)} · ${count}</p>
    </div>
    <dl class="report-facts">
      ${age != null && html`<div><dt>Edat</dt><dd>${age} anys</dd></div>`}
      ${service && html`<div><dt>Servei</dt><dd>${service.label}</dd></div>`}
      ${p.professional && html`<div><dt>Professional</dt><dd>${p.professional}</dd></div>`}
      ${p.goal && html`<div class="wide"><dt>Objectiu</dt><dd>${p.goal}</dd></div>`}
    </dl>
  </header>`;
}

// «28,4 → 30,9 cm  ▲ +2,5» (el color diu si ha millorat; el pes no té direcció).
function ChangeText({ c, unit, side }) {
  if (!c) return null;
  const cls = U.cls('delta', c.better === true && 'delta-up', c.better === false && 'delta-down');
  return html`<span class="tchange">${side && html`<strong>${side}</strong> `}${fmtVal(c.first, unit)} → ${fmtVal(c.last, unit)} ${unit}
    <span class=${cls}>${c.better === true ? '▲' : c.better === false ? '▼' : '•'} ${U.fmtSigned(c.delta, unit === 'N' ? 0 : 1)}</span></span>`;
}

function TestBlock({ t, charts }) {
  const dec = t.unit === 'N' ? 0 : 1;
  const series = t.bi
    ? [{ name: 'Dreta', color: 'var(--side-d)', points: t.rows.map((r) => ({ x: r.date, y: r.d })) },
      { name: 'Esquerra', color: 'var(--side-e)', points: t.rows.map((r) => ({ x: r.date, y: r.e })) }]
    : [{ name: t.label, color: 'var(--series-1)', points: t.rows.map((r) => ({ x: r.date, y: r.v })) }];
  return html`<div class="tblock" data-test=${t.id}>
    <div class="tblock-head">
      <h3 class="h3">${t.label}${t.unit && html` <span class="muted small">· ${t.unit}</span>`}</h3>
      <div class="tblock-change">${t.bi
        ? html`<${ChangeText} c=${t.change.d} unit=${t.unit} side="D" /><${ChangeText} c=${t.change.e} unit=${t.unit} side="E" />`
        : html`<${ChangeText} c=${t.change} unit=${t.unit} />`}</div>
    </div>
    ${charts && t.rows.length >= 2 && html`<${LineChart} series=${series} unit=${t.unit} decimals=${dec} height=${200} ariaLabel=${`Evolució: ${t.label}`} pointLabels=${!t.bi && t.rows.length <= 12} />`}
    <div class="table-wrap"><table class="table rtable ttable">
      <thead><tr><th>Data</th>${t.bi ? html`<th class="num">Dreta</th><th class="num">Esquerra</th><th class="num">Asimetria</th>` : html`<th class="num">Valor</th>`}</tr></thead>
      <tbody>${t.rows.map((r) => html`<tr>
        <td>${U.fmtDate(r.date)}</td>
        ${t.bi ? html`<td class="num">${fmtVal(r.d, t.unit)}</td><td class="num">${fmtVal(r.e, t.unit)}</td>
          <td class="num"><span class=${U.cls('tasym', Calc.asymTone(r.asym) && `tone-${Calc.asymTone(r.asym)}`)}>${r.asym == null ? '—' : `${U.fmt(r.asym, 0)} %`}</span></td>`
          : html`<td class="num">${fmtVal(r.v, t.unit)}</td>`}
      </tr>`)}</tbody>
    </table></div>
    ${t.rows.length < 2 && html`<p class="muted small">Només hi ha una valoració amb aquest test en aquest rang de dates.</p>`}
  </div>`;
}

// ── Informe de tests ──
function TestsReport({ pid }) {
  const p = Store.get('patients', pid);
  const all = p ? Store.assessmentsOf(pid) : [];
  const first = all.length ? all[0].date : U.today();
  const [from, setFrom] = useState(first);
  const [to, setTo] = useState(U.today());
  const [sel, setSel] = useState(null);      // null = els tests clau que tinguin dades
  const [charts, setCharts] = useState(true);
  if (!p) return html`<div class="page"><${Empty} icon="users" title="No trobo aquest pacient" /></div>`;
  const data = Evol.tests(all, { from, to });
  const chosen = sel || new Set((data.some((t) => Calc.KEY_METRICS.includes(t.id)) ? data.filter((t) => Calc.KEY_METRICS.includes(t.id)) : data).map((t) => t.id));
  const toggle = (ids, on) => { const n = new Set(chosen); for (const id of ids) { if (on) n.add(id); else n.delete(id); } setSel(n); };
  const areas = Evol.AREAS().map((a) => ({ ...a, tests: data.filter((t) => t.area === a.id || (a.id === 'tot' && !Evol.AREAS().some((x) => x.id === t.area))) })).filter((a) => a.tests.length);
  const shown = areas.map((a) => ({ ...a, tests: a.tests.filter((t) => chosen.has(t.id)) })).filter((a) => a.tests.length);
  const nA = new Set(data.filter((t) => chosen.has(t.id)).flatMap((t) => t.rows.map((r) => r.aid))).size;
  const theme = reportThemeClass(p);
  const center = Store.settings.centerName || 'EON Life';
  const name = `${Names.stem('Informe evolució tests', p, to)}_01.pdf`;
  return html`<div class=${`present ${theme}`}>
    <${PresentBar} title=${`Informe de tests · ${U.fullName(p)}`} onClose=${() => go('client', pid, 'valoracions')} noTheme=${true}
      actions=${html`<${PdfSaveButton} p=${p} name=${name} where="reportTests" title=${`Informe de tests · ${U.fullName(p)}`} footer=${`${center} · Informe de tests · ${U.fullName(p)}`} />`}>
      <${ReportThemeSwitch} p=${p} />
    </${PresentBar}>
    <section class="rpick no-print" aria-label="Tria del contingut de l'informe">
      <${ReportRange} from=${from} to=${to} setFrom=${setFrom} setTo=${setTo} first=${first} />
      ${!data.length ? html`<p class="muted">No hi ha cap test amb dades en aquest rang de dates.</p>` : html`
        <div class="rpick-groups">${areas.map((a) => html`<div class="rpick-group">
          <div class="rpick-ghead"><strong>${a.title}</strong>
            <button type="button" class="link small" onClick=${() => toggle(a.tests.map((t) => t.id), true)}>Tots</button>
            <button type="button" class="link small" onClick=${() => toggle(a.tests.map((t) => t.id), false)}>Cap</button></div>
          <div class="rpick-chips">${a.tests.map((t) => html`<label class=${U.cls('chip rpick-chip', chosen.has(t.id) && 'on')}>
            <input type="checkbox" checked=${chosen.has(t.id)} onChange=${(e) => toggle([t.id], e.currentTarget.checked)} />${t.label}
            <span class="muted small">${t.rows.length}</span></label>`)}</div>
        </div>`)}</div>
        <label class="check"><input type="checkbox" checked=${charts} onChange=${(e) => setCharts(e.currentTarget.checked)} /> Gràfiques d'evolució de cada test</label>`}
    </section>
    <article class=${`report report-narrow ${theme}`}>
      <${EvolCover} p=${p} eyebrow="Informe d'evolució · Tests" from=${from} to=${to} count=${U.plural(nA, 'valoració', 'valoracions')} />
      ${!shown.length ? html`<section class="rsec"><p class="muted">Tria almenys un test per fer l'informe.</p></section>`
        : shown.map((a) => html`<section class="rsec">
          <h2 class="rsec-title">${a.title}</h2>
          ${a.tests.map((t) => html`<${TestBlock} t=${t} charts=${charts} />`)}
        </section>`)}
      <footer class="sheet-foot"><span>${center} · Informe d'evolució · ${Store.settings.centerTagline || 'Human Performance'}</span></footer>
    </article>
  </div>`;
}

// ── Informe d'evolució de les sessions: RPE, dolor (EVA) i wellness ──
const trendWord = (st, better) => {
  if (!st || st.trend == null || Math.abs(st.trend) < 0.25) return st && st.n >= 4 ? 'estable' : '';
  const up = st.trend > 0;
  const good = better === 'up' ? up : better === 'down' ? !up : null;
  return html`<span class=${U.cls('delta', good === true && 'delta-up', good === false && 'delta-down')}>${up ? '▲ puja' : '▼ baixa'} ${U.fmt(Math.abs(st.trend), 1)}</span>`;
};

function SessionsReport({ pid }) {
  const p = Store.get('patients', pid);
  const all = p ? Store.sessionsOf(pid) : [];
  const today = U.today();
  const first = all.length ? all[0].date : today;
  const [from, setFrom] = useState(() => (U.addMonths(today, -3) > first ? U.addMonths(today, -3) : first));
  const [to, setTo] = useState(today);
  const [show, setShow] = useState({ rpe: true, pain: true, wellness: true, items: false, load: false });
  if (!p) return html`<div class="page"><${Empty} icon="users" title="No trobo aquest pacient" /></div>`;
  const ev = Evol.sessions(all, { from, to });
  const pts = (k) => ev.rows.map((r) => ({ x: r.date, y: r[k] }));
  // Taula de xifres: mitjana, mínim, màxim, primera i última sessió, i tendència (2a meitat − 1a meitat).
  const numRow = (label, st, unit, dec, better) => st && html`<tr>
    <td><strong>${label}</strong></td><td class="num">${st.n}</td><td class="num"><strong>${U.fmt(st.avg, dec)}</strong>${unit}</td>
    <td class="num">${U.fmt(st.min, dec)}</td><td class="num">${U.fmt(st.max, dec)}</td><td class="num">${U.fmt(st.first, dec)}</td><td class="num">${U.fmt(st.last, dec)}</td>
    <td class="num">${st.trend == null ? '—' : html`<span class=${U.cls('delta', better && st.trend !== 0 && ((st.trend > 0) === (better === 'up') ? 'delta-up' : 'delta-down'))}>${U.fmtSigned(st.trend, 1)}</span>`}</td></tr>`;
  const groupTable = (title, list, label) => html`<h3 class="h3">${title}</h3>
    <div class="table-wrap"><table class="table rtable ttable">
      <thead><tr><th>${label}</th><th class="num">Sessions</th>${show.rpe && html`<th class="num">RPE mitjà</th>`}${show.pain && html`<th class="num">EVA mitjana</th>`}${show.wellness && html`<th class="num">Wellness mitjà</th>`}${show.load && html`<th class="num">Càrrega (UA)</th>`}</tr></thead>
      <tbody>${list.map((g) => html`<tr>
        <td>${label === 'Mes' ? U.fmtMonth(g.key) : `${U.fmtDate(g.key)} – ${U.fmtDate(U.addDays(g.key, 6))}`}</td><td class="num">${g.n}</td>
        ${show.rpe && html`<td class="num">${g.rpe == null ? '—' : U.fmt(g.rpe, 1)}</td>`}
        ${show.pain && html`<td class="num"><span class=${U.cls('tasym', tone(g.pain, true) && `tone-${tone(g.pain, true)}`)}>${g.pain == null ? '—' : U.fmt(g.pain, 1)}</span></td>`}
        ${show.wellness && html`<td class="num">${g.wellness == null ? '—' : U.fmt(g.wellness, 1)}</td>`}
        ${show.load && html`<td class="num">${g.load == null ? '—' : U.fmt(g.load, 0)}</td>`}
      </tr>`)}</tbody></table></div>`;
  const opt = (k, label) => html`<label class="check"><input type="checkbox" checked=${show[k]} onChange=${(e) => setShow({ ...show, [k]: e.currentTarget.checked })} /> ${label}</label>`;
  const theme = reportThemeClass(p);
  const center = Store.settings.centerName || 'EON Life';
  const name = `${Names.stem('Informe evolució sessions', p, to)}_01.pdf`;
  const avg = (st, dec = 1) => (st ? U.fmt(st.avg, dec) : '—');
  const chart = (title, sub, k, yMin, yMax, color = 'var(--series-1)') => html`<div class="tblock">
    <div class="tblock-head"><h3 class="h3">${title}</h3><span class="muted small">${sub}</span></div>
    ${pts(k).some((x) => x.y != null) ? html`<${LineChart} series=${[{ name: title, color, points: pts(k) }]} decimals=${0} yMin=${yMin} yMax=${yMax} height=${210} ariaLabel=${title} pointLabels=${ev.rows.length <= 40} />`
      : html`<p class="muted small">Cap sessió d'aquest rang té aquesta dada.</p>`}
  </div>`;
  const tone = (v, hiBad) => (v == null ? '' : hiBad ? (v >= 6 ? 'bad' : v >= 3 ? 'warn' : 'ok') : '');
  return html`<div class=${`present ${theme}`}>
    <${PresentBar} title=${`Evolució de les sessions · ${U.fullName(p)}`} onClose=${() => go('client', pid, 'sessions')} noTheme=${true}
      actions=${html`<${PdfSaveButton} p=${p} name=${name} where="reportSessions" title=${`Evolució de les sessions · ${U.fullName(p)}`} footer=${`${center} · Evolució de les sessions · ${U.fullName(p)}`} />`}>
      <${ReportThemeSwitch} p=${p} />
    </${PresentBar}>
    <section class="rpick no-print" aria-label="Tria del contingut de l'informe">
      <${ReportRange} from=${from} to=${to} setFrom=${setFrom} setTo=${setTo} first=${first} />
      <div class="rpick-opts">${opt('rpe', 'RPE')}${opt('pain', 'EVA (dolor en acabar)')}${opt('wellness', 'Wellness total')}${opt('items', 'Wellness per pregunta')}${opt('load', 'Càrrega (RPE × minuts)')}</div>
    </section>
    <article class=${`report report-narrow ${theme}`}>
      <${EvolCover} p=${p} eyebrow="Informe d'evolució · Sessions" from=${from} to=${to} count=${U.plural(ev.rows.length, 'sessió', 'sessions')} />
      ${!ev.rows.length ? html`<section class="rsec"><p class="muted">No hi ha cap sessió amb RPE, dolor o wellness en aquest rang de dates.</p></section>` : html`
        <section class="rsec">
          <h2 class="rsec-title">Resum</h2>
          <div class="rtiles">
            ${show.rpe && html`<${Stat} label="RPE mitjà" value=${avg(ev.rpe)} unit="/10" sub=${ev.rpe ? html`${U.fmt(ev.rpe.min, 0)}–${U.fmt(ev.rpe.max, 0)} · ${trendWord(ev.rpe, null)}` : 'Sense dades'} />`}
            ${show.pain && html`<${Stat} label="EVA mitjana (dolor en acabar)" value=${avg(ev.pain)} unit="/10" sub=${ev.pain ? html`${U.fmt(ev.pain.min, 0)}–${U.fmt(ev.pain.max, 0)} · ${trendWord(ev.pain, 'down')}` : 'Sense dades'} />`}
            ${show.wellness && html`<${Stat} label="Wellness mitjà" value=${avg(ev.wellness)} unit="/25" sub=${ev.wellness ? html`${U.fmt(ev.wellness.min, 0)}–${U.fmt(ev.wellness.max, 0)} · ${trendWord(ev.wellness, 'up')}` : 'Sense dades'} />`}
            ${show.load && html`<${Stat} label="Càrrega mitjana" value=${avg(ev.load, 0)} unit="UA" sub=${ev.load ? `${U.plural(ev.load.n, 'sessió', 'sessions')} amb durada` : 'Sense dades'} />`}
          </div>
          <h3 class="h3">Xifres del període</h3>
          <div class="table-wrap"><table class="table rtable ttable tnums">
            <thead><tr><th><span class="sr-only">Mesura</span></th><th class="num">Sessions</th><th class="num">Mitjana</th><th class="num">Mínim</th><th class="num">Màxim</th><th class="num">Primera</th><th class="num">Última</th><th class="num">Tendència</th></tr></thead>
            <tbody>
              ${show.rpe && numRow('RPE (1–10)', ev.rpe, '', 1, null)}
              ${show.pain && numRow('EVA (0–10)', ev.pain, '', 1, 'down')}
              ${show.wellness && numRow('Wellness (/25)', ev.wellness, '', 1, 'up')}
              ${show.load && numRow('Càrrega (UA)', ev.load, '', 0, null)}
            </tbody>
          </table></div>
          <p class="muted small">Tendència: mitjana de la segona meitat de les sessions menys la de la primera (amb 4 sessions o més).</p>
        </section>
        <section class="rsec">
          <h2 class="rsec-title">Evolució</h2>
          ${show.rpe && chart('RPE de cada sessió', '1 = molt suau · 10 = esforç màxim', 'rpe', 0, 10)}
          ${show.pain && chart('EVA · dolor en acabar', '0 = sense dolor · 10 = el pitjor imaginable', 'pain', 0, 10, 'var(--series-2)')}
          ${show.wellness && chart('Wellness en arribar', 'Suma de les 5 preguntes (màxim 25)', 'wellness', 5, 25)}
          ${show.load && chart('Càrrega de la sessió', 'RPE × minuts (UA)', 'load', null, null)}
          ${show.items && html`<h3 class="h3">Wellness per pregunta <span class="muted small">· de l'1 al 5 (5 = el millor estat)</span></h3>
            <div class="tsmall">${WELLNESS.map((q) => html`<div class="tblock">
              <div class="tblock-head"><strong>${q.label}</strong></div>
              <${LineChart} series=${[{ name: q.label, color: 'var(--series-1)', points: ev.rows.map((r) => ({ x: r.date, y: r.items[q.k] })) }]} decimals=${0} yMin=${1} yMax=${5} height=${140} ariaLabel=${q.label} />
            </div>`)}</div>`}
        </section>
        <section class="rsec">
          <h2 class="rsec-title">Per mesos i per setmanes</h2>
          ${groupTable('Per mesos', ev.months, 'Mes')}
          ${groupTable('Per setmanes', ev.weeks, 'Setmana')}
        </section>
        <section class="rsec">
          <h2 class="rsec-title">Sessió a sessió</h2>
          <div class="table-wrap"><table class="table rtable ttable">
            <thead><tr><th>Data</th><th>Sessió</th><th>Objectiu</th>${show.rpe && html`<th class="num">RPE</th>`}${show.pain && html`<th class="num">EVA</th>`}${show.wellness && html`<th class="num">Wellness</th>`}${show.load && html`<th class="num">UA</th>`}</tr></thead>
            <tbody>${ev.rows.map((r) => html`<tr>
              <td>${U.fmtDate(r.date)}</td><td>S${r.number}</td><td>${r.goal || '—'}</td>
              ${show.rpe && html`<td class="num">${r.rpe ?? '—'}</td>`}
              ${show.pain && html`<td class="num"><span class=${U.cls('tasym', tone(r.pain, true) && `tone-${tone(r.pain, true)}`)}>${r.pain ?? '—'}</span></td>`}
              ${show.wellness && html`<td class="num">${r.wellness != null ? `${r.wellness}/25` : '—'}</td>`}
              ${show.load && html`<td class="num">${r.load != null ? U.fmt(r.load, 0) : '—'}</td>`}
            </tr>`)}</tbody>
          </table></div>
        </section>`}
      <footer class="sheet-foot"><span>${center} · Evolució de les sessions · ${Store.settings.centerTagline || 'Human Performance'}</span></footer>
    </article>
  </div>`;
}
