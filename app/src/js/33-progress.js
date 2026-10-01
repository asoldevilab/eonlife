/* EON Life · progrés del client per ensenyar-l'hi: una sessió d'abans i una d'ara, exercici per exercici
   (nivell de progressió, càrrega i velocitat de l'encoder), i l'evolució de cada exercici de força. */

function ProgressView({ pid, planId }) {
  const p = Store.get('patients', pid);
  const plan = planId ? Store.get('templates', planId) : null;
  const all = Store.sessionsOf(pid);
  const inPlan = plan ? all.filter((s) => s.planId === plan.id) : [];
  const list = inPlan.length >= 2 ? inPlan : all;
  const done = list.filter((s) => s.status === 'feta');
  const [fromId, setFrom] = useState(list[0] ? list[0].id : '');
  const [toId, setTo] = useState((done[done.length - 1] || list[list.length - 1] || {}).id || '');
  const back = () => go('client', pid, 'pla');
  if (!p) return html`<div class="page"><${Empty} icon="chart" title="No trobo aquest client" /></div>`;
  if (list.length < 2) {
    return html`<div class="present"><${PresentBar} title="Progrés" onClose=${back} />
      <article class="sheet"><${Empty} icon="chart" title="Encara no hi ha prou sessions" text="Quan el client tingui almenys dues sessions, aquí es veurà com ha progressat." /></article></div>`;
  }
  const from = list.find((s) => s.id === fromId) || list[0];
  const to = list.find((s) => s.id === toId) || list[list.length - 1];
  const res = Calc.progress(from, to, (id) => Store.exercise(id));
  const between = list.filter((s) => s.date >= from.date && s.date <= to.date);
  const label = (s) => `${s.planN && plan ? `S${s.planN} del pla` : `Sessió ${s.number}`} · ${U.fmtDate(s.date)}`;
  const anySpeed = res.blocks.some((b) => b.rows.some((r) => r.v1.b != null || r.v1.a != null));
  const options = list.map((s) => ({ v: s.id, label: `${s.planN && plan ? `S${s.planN}` : `S${s.number}`} · ${U.fmtDateShort(s.date)}${s.status === 'feta' ? '' : ' (prevista)'}` }));

  return html`<div class="present">
    <${PresentBar} title=${`Progrés · ${U.fullName(p)}`} onClose=${back}>
      <label class="pv-pick"><span>De</span><${Select} value=${from.id} onValue=${setFrom} ariaLabel="Sessió d'abans" options=${options} /></label>
      <label class="pv-pick"><span>a</span><${Select} value=${to.id} onValue=${setTo} ariaLabel="Sessió d'ara" options=${options} /></label>
    </${PresentBar}>
    <article class="sheet pv">
      <header class="sheet-head">
        <${BrandMark} />
        <div class="sheet-id">
          <p class="eyebrow">${plan ? plan.name : 'Entrenament'}</p>
          <h1 class="sheet-title">El teu progrés</h1>
          <p class="sheet-client">${U.fullName(p)}</p>
        </div>
      </header>
      <p class="pv-range"><span>${label(from)}</span><span class="pv-arrow" aria-hidden="true">→</span><span>${label(to)}</span></p>

      <div class="stats pv-stats">
        <div class="stat"><span class="stat-label">Sessions fetes</span><span class="stat-value">${between.filter((s) => s.status === 'feta').length}</span><span class="stat-sub">en aquest període</span></div>
        <div class="stat"><span class="stat-label">Exercicis més avançats</span><span class="stat-value">${res.summary.levelUp}</span><span class="stat-sub">han pujat de nivell</span></div>
        <div class="stat"><span class="stat-label">Més càrrega</span><span class="stat-value">${res.summary.loadUp}</span><span class="stat-sub">exercicis amb més quilos</span></div>
        ${anySpeed && html`<div class="stat"><span class="stat-label">Més velocitat</span><span class="stat-value">${res.summary.speedUp}</span><span class="stat-sub">segons l'encoder</span></div>`}
      </div>

      ${res.blocks.map((b) => html`<section class=${`pv-block blk-${b.key}`}>
        <header class="sblock-head"><span class="sblock-num">${blockDef(b.key).num}</span><h2 class="sblock-name">${blockName(b.key)}</h2></header>
        <div class="pv-rows">${b.rows.map((r) => html`<${ProgressRow} r=${r} />`)}</div>
      </section>`)}

      <${ProgressCharts} sessions=${between} to=${to} />

      <footer class="sheet-foot">
        <span>${Store.settings.centerName || 'EON Life'} · ${Store.settings.centerTagline || 'Human Performance'}</span>
        <span>${U.fmtDate(U.today())}</span>
      </footer>
    </article>
  </div>`;
}

function ProgressSide({ it, v1 }) {
  if (!it) return html`<div class="pv-side pv-none"><span class="muted">—</span></div>`;
  const ex = it.exId ? Store.exercise(it.exId) : null;
  return html`<div class="pv-side">
    <span class="pv-name">${it.name}${ex && ex.level && html` <span class="lvl-chip">N${ex.level}</span>`}</span>
    <span class="pv-rx">${[Calc.presc(it), v1 != null && `${U.fmtFixed(v1, 2)} m/s`].filter(Boolean).join(' · ')}</span>
  </div>`;
}

function ProgressRow({ r }) {
  const chips = [];
  const sign = (n) => (n > 0 ? '+' : n < 0 ? '−' : '');
  if (r.level.diff) chips.push({ up: r.level.diff > 0, text: `${r.level.diff > 0 ? '▲' : '▼'} ${U.plural(Math.abs(r.level.diff), 'nivell', 'nivells')}` });
  if (r.kg.diff) chips.push({ up: r.kg.diff > 0, text: `${sign(r.kg.diff)}${U.fmt(Math.abs(r.kg.diff), 1)} kg${r.kg.pct != null ? ` (${sign(r.kg.pct)}${Math.abs(r.kg.pct)} %)` : ''}` });
  if (r.v1.diff) chips.push({ up: r.v1.diff > 0, text: `${sign(r.v1.diff)}${U.fmtFixed(Math.abs(r.v1.diff), 2)} m/s` });
  if (!r.before) chips.push({ text: 'Nou' });
  else if (r.match === 'pos' && !chips.length) chips.push({ text: 'Exercici diferent' });
  else if (!chips.length) chips.push({ text: 'Igual', muted: true });
  return html`<div class="pv-row">
    <${ProgressSide} it=${r.before} v1=${r.v1.a} />
    <span class="pv-arrow" aria-hidden="true">→</span>
    <${ProgressSide} it=${r.now} v1=${r.v1.b} />
    <div class="pv-delta">${chips.map((c) => html`<span class=${U.cls('pv-chip', c.up === true && 'up', c.up === false && 'down', c.muted && 'muted')}>${c.text}</span>`)}</div>
  </div>`;
}

// Evolució dels exercicis de potència i força de la sessió d'ara (mateix exercici en almenys dues sessions).
function ProgressCharts({ sessions, to }) {
  const names = [];
  for (const b of to.blocks || []) if (['pot', 'for'].includes(b.key)) for (const it of b.items || []) if (it.name && !names.includes(it.name)) names.push(it.name);
  const series = names.map((name) => {
    const kg = [], v = [];
    for (const s of sessions) for (const b of s.blocks || []) for (const it of b.items || []) {
      if (it.name !== name) continue;
      const k = Calc.kg(it), vb = Calc.vbt(it);
      if (k != null) kg.push({ x: s.date, y: k });
      if (vb && vb.v1 != null) v.push({ x: s.date, y: vb.v1 });
    }
    return { name, kg, v };
  }).filter((x) => x.kg.length >= 2 || x.v.length >= 2).slice(0, 8);
  if (!series.length) return null;
  return html`<section class="pv-evo">
    <h2 class="rsec-title">Evolució</h2>
    <div class="pv-charts">${series.map((x) => html`<div class="pv-chart">
      <h3 class="h3">${x.name}</h3>
      ${x.kg.length >= 2 && html`<p class="pv-chart-t">Càrrega (kg)</p>
        <${LineChart} series=${[{ name: 'Càrrega', color: 'var(--series-1)', points: x.kg }]} unit="kg" decimals=${1} height=${170} ariaLabel=${`Càrrega de ${x.name}`} />`}
      ${x.v.length >= 2 && html`<p class="pv-chart-t">Velocitat de la 1a repetició (m/s)</p>
        <${LineChart} series=${[{ name: 'Velocitat', color: 'var(--series-1)', points: x.v }]} unit="m/s" decimals=${2} height=${170} ariaLabel=${`Velocitat de ${x.name}`} />`}
    </div>`)}</div>
  </section>`;
}
