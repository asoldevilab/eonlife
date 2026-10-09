/* EON Life · informe de la valoració per ensenyar al client (pantalla) i desar en PDF.
   Pot ser complet o d'un sol apartat (Mobilitat, Força, Rendiment, Patrons, Perfil): en aquest cas es compara
   amb l'última valoració que tenia dades d'aquell apartat, per veure l'evolució quan es repeteix. */

// Té dades aquest apartat del protocol?
function areaHasData(a, area) {
  if (area === 'tot') return true;
  const sec = PROTOCOL.find((s) => s.id === area);
  if (!sec) return false;
  if (area === 'altres') return (a.free || []).some((r) => r.name);
  return sectionProgress(a, sec, {}).done > 0;
}

function AssessmentReport({ id, scope: scopeParam = 'tot' }) {
  const a = Store.get('assessments', id);
  const [notes, setNotes] = useState(false);
  if (!a) return html`<div class="page"><${Empty} icon="clipboard" title="No trobo aquesta valoració" /></div>`;
  const p = Store.get('patients', a.patientId) || {};
  const all = Store.assessmentsOf(a.patientId);
  const idx = all.findIndex((x) => x.id === a.id);
  const areas = PROTOCOL.filter((s) => areaHasData(a, s.id));
  const scope = scopeParam !== 'tot' && PROTOCOL.some((s) => s.id === scopeParam) ? scopeParam : 'tot';
  const scopeSec = PROTOCOL.find((s) => s.id === scope);
  const show = (area) => scope === 'tot' || scope === area;
  // Valoració anterior: la immediatament anterior (informe complet) o l'última amb dades d'aquest apartat.
  const prev = idx > 0 ? (scope === 'tot' ? all[idx - 1] : all.slice(0, idx).reverse().find((x) => areaHasData(x, scope)) || null) : null;
  const v = a.values || {};
  const g = a.general || {}, c = a.conclusions || {};
  const w = Calc.weight(a);
  const alerts = Calc.alerts(a);
  const cmj = Calc.cmj(a);
  const jumps = Calc.jumps(a);
  const jumpAn = Calc.jumpAnalysis(a, prev);
  const ybt = Calc.ybt(a);
  const pc = Calc.patterns(a);
  const bike = Calc.bike(a);
  const bikeAn = Calc.bikeAnalysis(a, prev);
  const hq = Calc.hq(a);
  const typeLabel = (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració';
  const service = OPT.services.find((o) => o.v === p.service);
  const age = U.age(p.birthDate, a.date);

  const biRows = (ids, perKg) => ids.map((tid) => TEST_INDEX[tid]).map((t) => {
    const x = v[t.id] || {};
    const d = U.num(x.d), e = U.num(x.e);
    const dk = Calc.perKg(d, w), ek = Calc.perKg(e, w);
    return { label: t.name, d, e, unit: t.unit, diffOnly: t.diffOnly,
      sub: perKg && (dk != null || ek != null) ? `${U.fmt(dk, 1)} · ${U.fmt(ek, 1)} N/kg` : (notes && x.note) || '' };
  }).filter((r) => r.d != null || r.e != null);

  const rom = biRows(['rom_hip_ir', 'rom_hip_er', 'rom_sh_ir', 'rom_sh_er', 'rom_sh_flex', 'rom_knee_flex']);
  const kneeExt = biRows(['rom_knee_ext'])[0];
  const wblt = biRows(['wblt']);
  const dyn = biRows(['dyn_knee_ext', 'dyn_curl_90', 'dyn_curl_30', 'dyn_squeeze', 'dyn_hip_ir', 'dyn_hip_er', 'dyn_sh_er'], true);
  // Squeeze d'abans: un sol valor (ara es mesura cada costat).
  const squeeze = (v.dyn_squeeze || {}).d || (v.dyn_squeeze || {}).e ? null : U.num((v.dyn_squeeze || {}).v);
  const clin = ['slump', 'pkb', 'adams', 'thomas', 'windlass'].map((tid) => ({ t: TEST_INDEX[tid], x: v[tid] || {} }))
    .filter(({ x }) => x.d || x.e || x.v || x.photo || x.photoD || x.photoE);
  const sls = v.sls || {};
  const wl = Calc.wellness(a.wellness);
  const enc = ((a.encoder && a.encoder.rows) || []).filter((r) => r.name && (U.num(r.load) != null || U.num(r.vel) != null));
  const cmp = !prev ? [] : scope === 'tot' ? Calc.compare(a, prev, true) : Calc.compare(a, prev).filter((r) => Calc.area(r.id) === scope);
  const hasPatterns = pc.scored > 0 || pc.counts.P > 0;
  const videos = Calc.videos(a).filter((x) => scope === 'tot' || x.area === scope);
  const patternsCmp = prev && show('patrons') ? PATTERNS.map((pt) => {
    const x = (a.patterns || {})[pt.id] || {}, y = (prev.patterns || {})[pt.id] || {};
    return { pt, cur: Calc.patternScore(x, pt.uni), curP: !!x.pain, old: Calc.patternScore(y, pt.uni), oldP: !!y.pain };
  }).filter((r) => (r.cur || r.curP) && (r.old || r.oldP)) : [];
  const setScope = (v) => go('informe', a.id, v === 'tot' ? '' : v);

  const ScoreCell = ({ s, pain }) => html`<span class="rscore"><${ScoreDot} v=${s} pain=${pain} size="sm" />${s ? Calc.scoreInfo(s).label : ''}</span>`;

  const theme = reportThemeClass(p);
  return html`<div class=${`present ${theme}`}>
    <${PresentBar} title=${`${typeLabel} · ${U.fullName(p)}`} onClose=${() => go('valoracio', a.id)} noTheme=${true}
      actions=${html`<${ReportPdfButton} a=${a} p=${p} typeLabel=${typeLabel} scopeSec=${scopeSec} />`}>
      <${ReportThemeSwitch} p=${p} />
      ${areas.length > 1 && html`<${Select} value=${scope} onValue=${setScope} class="select-sm" ariaLabel="Apartat de l'informe"
        options=${[{ v: 'tot', label: 'Informe complet' }, ...areas.map((s) => ({ v: s.id, label: `Només ${s.short.toLowerCase()}` }))]} />`}
      <${Btn} variant="ghost" icon=${notes ? 'eye' : 'eyeoff'} onClick=${() => setNotes(!notes)} title="Mostra o amaga les observacions de cada test">${notes ? 'Amb notes' : 'Sense notes'}</${Btn}>
    </${PresentBar}>
    <article class=${`report ${theme}`}>
      <header class="report-cover">
        <${BrandMark} />
        <div class="report-id">
          <p class="eyebrow">${scopeSec ? `Informe · ${scopeSec.title}` : 'Valoració funcional · Human Performance'}</p>
          <h1 class="report-title">${U.fullName(p)}</h1>
          <p class="report-sub">${typeLabel} · ${U.fmtDateLong(a.date, false)}${a.professional ? ` · ${a.professional}` : ''}</p>
        </div>
        <dl class="report-facts">
          ${age != null && html`<div><dt>Edat</dt><dd>${age} anys</dd></div>`}
          ${service && html`<div><dt>Servei</dt><dd>${service.label}</dd></div>`}
          ${w && html`<div><dt>Pes</dt><dd>${U.fmt(w, 1)} kg</dd></div>`}
          ${(g.goal || p.goal) && html`<div class="wide"><dt>Objectiu</dt><dd>${g.goal || p.goal}</dd></div>`}
          ${wl && html`<div class="wide"><dt>Wellness el dia de la valoració</dt><dd>${wl.total != null ? `${wl.total}/25 · ` : ''}${WELLNESS
            .filter((q) => U.num((a.wellness || {})[q.k]) != null).map((q) => `${q.label} ${a.wellness[q.k]}`).join(' · ')}${notes && a.wellness.notes ? html`<div class="rnote">${a.wellness.notes}</div>` : ''}</dd></div>`}
        </dl>
      </header>

      ${scope === 'tot' && html`<section class="rsec">
        <h2 class="rsec-title">Resum</h2>
        <div class="rtiles">
          ${cmj && cmj.best != null && html`<${Stat} label="CMJ · millor salt" value=${U.fmt(cmj.best, 1)} unit="cm" sub=${cmj.relPower != null ? `${U.fmt(cmj.relPower, 1)} W/kg de potència` : `${U.plural(cmj.n, 'intent', 'intents')}`} />`}
          ${(ybt.d.comp != null || ybt.e.comp != null) && html`<${Stat} label="Y-Balance · composite" value=${`${U.fmt(ybt.d.comp, 0)} / ${U.fmt(ybt.e.comp, 0)}`} unit="%" sub="Dreta / esquerra" />`}
          ${wblt.length > 0 && html`<${Stat} label="Dorsiflexió de turmell" value=${`${U.fmt(wblt[0].d, 1)} / ${U.fmt(wblt[0].e, 1)}`} unit="cm" sub="Dreta / esquerra · referència ≥ 8 cm" tone=${alerts.some((x) => /turmell/.test(x.text)) ? 'warn' : ''} />`}
          ${hasPatterns && html`<div class="stat"><div class="stat-label">Patrons de moviment</div>
            <div class="rpc">${['0', '-', '--'].map((k) => html`<span><${ScoreDot} v=${k} size="sm" />${pc.counts[k]}</span>`)}${pc.counts.P ? html`<span><${ScoreDot} pain=${true} size="sm" />${pc.counts.P}</span>` : ''}</div>
            <div class="stat-sub">${pc.counts['0']} de ${pc.total} competents</div></div>`}
        </div>
        <div class="rcols">
          <div>
            <h3 class="h3">Punts d'atenció</h3>
            ${alerts.length ? html`<ul class="alerts">${alerts.map((x) => html`<li class=${`alert alert-${x.tone}`}><${Icon} name=${x.tone === 'bad' ? 'alert' : 'info'} size=${16} />${x.text}</li>`)}</ul>`
              : html`<p class="muted">Cap punt d'atenció destacat.</p>`}
          </div>
          <div>
            ${c.strengths && html`<h3 class="h3">Punts forts</h3><p class="prose">${c.strengths}</p>`}
            ${c.priorities && html`<h3 class="h3">Prioritats</h3><p class="prose">${c.priorities}</p>`}
          </div>
        </div>
      </section>`}

      ${scope !== 'tot' && !areaHasData(a, scope) && html`<section class="rsec"><p class="muted">Aquesta valoració no té dades de ${scopeSec.short.toLowerCase()}.</p></section>`}

      ${show('mobilitat') && (rom.length > 0 || wblt.length > 0 || clin.length > 0) && html`<section class="rsec">
        <h2 class="rsec-title">Mobilitat i anàlisi postural</h2>
        ${rom.length > 0 && html`<h3 class="h3">Goniometria digital <span class="muted">· Kinvent K-Move · graus</span></h3><${BiBars} rows=${rom} unit="°" />`}
        ${kneeExt && html`<p class="muted small">Extensió de genoll: dreta ${U.fmt(kneeExt.d, 0)}° · esquerra ${U.fmt(kneeExt.e, 0)}°.</p>`}
        ${wblt.length > 0 && html`<h3 class="h3">Flexió dorsal de turmell en càrrega <span class="muted">· knee-to-wall</span></h3>
          <${BiBars} rows=${wblt} unit="cm" decimals=${1} />
          <p class="muted small">Referència: menys de ${THRESHOLDS.wbltMin} cm o una diferència de ${THRESHOLDS.wbltDiff} cm entre turmells es considera limitació.</p>`}
        ${clin.length > 0 && html`<h3 class="h3">${clin.some(({ t }) => t.group === 'neuro') ? 'Neurodinàmia i anàlisi postural' : 'Anàlisi postural'}</h3>
          <div class="table-wrap"><table class="table rtable"><thead><tr><th>Test</th><th>Dreta</th><th>Esquerra</th></tr></thead>
          <tbody>${clin.map(({ t, x }) => html`<tr><td>${t.name}${notes && x.note && html`<div class="rnote">${x.note}</div>`}</td>
            ${t.kind === 'select' ? html`<td colspan="2">${x.v || '—'}</td>` : html`<td>${x.d || '—'}</td><td>${x.e || '—'}</td>`}</tr>`)}</tbody></table></div>
          <${ReportPhotos} a=${a} p=${p} tests=${clin.map(({ t }) => t.id)} />`}
      </section>`}

      ${show('forca') && (dyn.length > 0 || squeeze != null || sls.sd || sls.se || ybt.d.comp != null || ybt.e.comp != null) && html`<section class="rsec">
        <h2 class="rsec-title">Força i control</h2>
        ${dyn.length > 0 && html`<h3 class="h3">Dinamometria manual <span class="muted">· Kinvent K-Push · força isomètrica</span></h3>
          <${BiBars} rows=${dyn} unit="N" />
          <p class="muted small">${[squeeze != null && `Squeeze test d'adductors: ${U.fmt(squeeze, 0)} N${w ? ` (${U.fmt(squeeze / w, 1)} N/kg)` : ''}.`, (hq.d != null || hq.e != null) && `Ràtio isquiotibials/quàdriceps (curl 90/90 ÷ leg extension): D ${U.fmt(hq.d, 2)} · E ${U.fmt(hq.e, 2)}.`].filter(Boolean).join(' ')}</p>`}
        ${dyn.length === 0 && squeeze != null && html`<p>Squeeze test d'adductors: <strong>${U.fmt(squeeze, 0)} N</strong></p>`}
        ${(sls.sd || sls.se) && html`<h3 class="h3">Single Leg Squat</h3>
          <div class="rsls"><span>Dreta <${ScoreCell} s=${sls.sd} /></span><span>Esquerra <${ScoreCell} s=${sls.se} /></span>
          ${(sls.chips || []).length > 0 && html`<span class="muted">${sls.chips.join(' · ')}</span>`}</div>
          ${notes && sls.note && html`<p class="rnote">${sls.note}</p>`}`}
        ${(ybt.d.comp != null || ybt.e.comp != null) && html`<h3 class="h3">Y-Balance Test <span class="muted">· cm</span></h3>
          <div class="table-wrap"><table class="table rtable"><thead><tr><th></th><th class="num">Anterior</th><th class="num">Posteromedial</th><th class="num">Posterolateral</th><th class="num">Composite</th></tr></thead>
          <tbody>${[['d', 'Dreta'], ['e', 'Esquerra']].map(([s, lab]) => html`<tr><th scope="row"><span class=${`side-dot side-dot-${s}`}></span>${lab}</th>
            <td class="num">${U.fmt(ybt[s].ant, 1)}</td><td class="num">${U.fmt(ybt[s].pm, 1)}</td><td class="num">${U.fmt(ybt[s].pl, 1)}</td><td class="num"><strong>${ybt[s].comp != null ? `${U.fmt(ybt[s].comp, 1)} %` : '—'}</strong></td></tr>`)}
            ${ybt.antDiff != null && html`<tr class="rdiff"><th scope="row">Diferència</th><td class="num">${U.fmt(ybt.antDiff, 1)}</td><td class="num">${U.fmt(ybt.pmDiff, 1)}</td><td class="num">${U.fmt(ybt.plDiff, 1)}</td><td class="num">${U.fmt(ybt.compDiff, 1)}</td></tr>`}
          </tbody></table></div>`}
      </section>`}

      ${show('rendiment') && (Object.keys(jumps).length > 0 || enc.length > 0 || bike.peak != null || bike.mean != null) && html`<section class="rsec">
        <h2 class="rsec-title">Rendiment</h2>
        ${Object.keys(jumps).length > 0 && html`<h3 class="h3">Salts <span class="muted">· My Jump Lab</span></h3>
          <div class="jump-sum">${Object.entries(jumps).map(([type, sm]) => html`<div class="jump-card">
            <div class="jump-type">${type}</div>
            <div class="jump-best">${U.fmt(sm.best, 1)}<small> cm</small></div>
            <div class="jump-meta">Mitjana ${U.fmt(sm.mean, 1)} cm${sm.bestPower != null ? ` · ${U.fmt(sm.bestPower, 0)} W` : ''}${sm.relPower != null ? ` · ${U.fmt(sm.relPower, 1)} W/kg` : ''}${sm.bestRsi != null ? ` · RSI-mod ${U.fmt(sm.bestRsi, 2)}` : ''}</div>
          </div>`)}</div>
          ${Object.values(jumpAn).some((x) => x.lines.length > 1) && html`<ul class="rjump-analysis">${Object.values(jumpAn).flatMap((x) => x.lines.slice(1)).map((l) => html`<li>${l}</li>`)}</ul>`}`}
        ${enc.length > 0 && html`<h3 class="h3">Encoder <span class="muted">· velocitat d'execució</span></h3>
          <div class="table-wrap"><table class="table rtable"><thead><tr><th>Exercici</th><th class="num">Càrrega</th><th class="num">Velocitat mitjana</th><th class="num">Potència</th></tr></thead>
          <tbody>${enc.map((r) => html`<tr><td>${r.name}</td><td class="num">${U.num(r.load) != null ? `${U.fmt(U.num(r.load), 1)} kg` : '—'}</td>
            <td class="num">${U.num(r.vel) != null ? `${U.fmt(U.num(r.vel), 2)} m/s` : '—'}</td><td class="num">${U.num(r.power) != null ? `${U.fmt(U.num(r.power), 0)} W` : '—'}</td></tr>`)}</tbody></table></div>`}
        ${(bike.peak != null || bike.mean != null) && html`<h3 class="h3">Assault bike · 30 s all-out</h3>
          <div class="kv-row">
            ${bike.peak != null && html`<div class="kv"><span>Potència pic</span><strong>${U.fmt(bike.peak, 0)} W</strong>${bike.peakRel != null && html`<small>${U.fmt(bike.peakRel, 1)} W/kg</small>`}</div>`}
            ${bike.mean != null && html`<div class="kv"><span>Potència mitjana</span><strong>${U.fmt(bike.mean, 0)} W</strong>${bike.meanRel != null && html`<small>${U.fmt(bike.meanRel, 1)} W/kg</small>`}</div>`}
            ${bike.fatigue != null && html`<div class="kv"><span>Índex de fatiga</span><strong>${U.fmt(bike.fatigue, 1)} %</strong></div>`}
            ${bike.work != null && html`<div class="kv"><span>Treball total</span><strong>${U.fmt(bike.work, 1)} kJ</strong></div>`}
            ${bike.distKm != null && html`<div class="kv"><span>Distància</span><strong>${U.fmt(bike.distKm * 1000, 0)} m</strong>${bike.speedKmh != null && html`<small>${U.fmt(bike.speedKmh, 1)} km/h de mitjana</small>`}</div>`}
            ${bike.cal != null && html`<div class="kv"><span>Energia</span><strong>${U.fmt(bike.cal, 1)} kcal</strong>${bike.calMin != null && html`<small>${U.fmt(bike.calMin, 1)} kcal/min</small>`}</div>`}
            ${bike.rpm != null && html`<div class="kv"><span>Cadència mitjana</span><strong>${U.fmt(bike.rpm, 0)} RPM</strong></div>`}
          </div>
          ${bikeAn && bikeAn.more.length > 0 && html`<ul class="rjump-analysis">${bikeAn.more.map((l) => html`<li>${l}</li>`)}</ul>`}`}
      </section>`}

      ${show('patrons') && hasPatterns && html`<section class="rsec">
        <h2 class="rsec-title">Sessió 1 · Patrons bàsics de moviment</h2>
        <div class="table-wrap"><table class="table rtable rpatterns">
          <thead><tr><th>Patró</th><th>Esq.</th><th>Dta.</th><th>Puntuació</th><th>Compensacions observades</th><th>Decisió</th></tr></thead>
          <tbody>${PATTERNS.map((pt) => {
            const x = (a.patterns || {})[pt.id] || {};
            const s = Calc.patternScore(x, pt.uni);
            if (!s && !x.pain) return null;
            const secs = pt.seconds && (x.secD || x.secE) ? ` (${x.secE || '—'} s / ${x.secD || '—'} s)` : '';
            return html`<tr>
              <td><strong>${pt.name}</strong>${secs && html`<span class="muted">${secs}</span>`}${notes && x.note && html`<div class="rnote">${x.note}</div>`}</td>
              <td>${pt.uni ? html`<${ScoreDot} v=${x.se} size="sm" />` : html`<span class="muted">—</span>`}</td>
              <td>${pt.uni ? html`<${ScoreDot} v=${x.sd} size="sm" />` : html`<span class="muted">—</span>`}</td>
              <td><${ScoreCell} s=${s} pain=${x.pain} /></td>
              <td>${(x.chips || []).join(', ') || html`<span class="muted">—</span>`}</td>
              <td>${x.pain ? 'Es deriva al fisio.' : x.decision || (s ? Calc.scoreInfo(s).decision : '')}</td>
            </tr>`;
          })}</tbody>
          <tfoot><tr><td colspan="6"><span class="rpc">Resum · ${['0', '-', '--'].map((k) => html`<span><${ScoreDot} v=${k} size="xs" />${pc.counts[k]}</span>`)}<span><${ScoreDot} pain=${true} size="xs" />${pc.counts.P}</span></span></td></tr></tfoot>
        </table></div>
        <div class="rlegend">${SCORES.map((s) => html`<span><${ScoreDot} v=${s.v} size="xs" />${s.label}</span>`)}<span><${ScoreDot} pain=${true} size="xs" />Dolor o símptomes → fisio</span></div>
      </section>`}

      ${show('altres') && (a.free || []).some((r) => r.name) && html`<section class="rsec">
        <h2 class="rsec-title">Altres mesures</h2>
        <div class="table-wrap"><table class="table rtable"><thead><tr><th>Mesura</th><th>Resultat</th></tr></thead>
        <tbody>${a.free.filter((r) => r.name).map((r) => html`<tr><td>${r.name}</td><td>${[r.d !== '' && r.d != null && `D ${r.d}`, r.e !== '' && r.e != null && `E ${r.e}`, r.v !== '' && r.v != null && r.v].filter(Boolean).join(' · ')} ${r.unit || ''}</td></tr>`)}</tbody></table></div>
      </section>`}

      ${videos.length > 0 && html`<${ReportVideos} videos=${videos} a=${a} patient=${p} grouped=${scope === 'tot'} />`}

      ${(cmp.length > 0 || patternsCmp.length > 0) && html`<section class="rsec">
        <h2 class="rsec-title">Evolució des de la valoració anterior</h2>
        <p class="muted">${U.fmtDateLong(prev.date, false)} → ${U.fmtDateLong(a.date, false)}</p>
        ${cmp.length > 0 && html`<${CompareTable} rows=${cmp} />`}
        ${patternsCmp.length > 0 && html`<h3 class="h3">Patrons de moviment</h3>
          <div class="table-wrap"><table class="table rtable rpat-cmp"><thead><tr><th>Patró</th><th>${U.fmtDate(prev.date)}</th><th>${U.fmtDate(a.date)}</th></tr></thead>
          <tbody>${patternsCmp.map((r) => html`<tr><td>${r.pt.name}</td>
            <td><span class="rscore"><${ScoreDot} v=${r.old} pain=${r.oldP} size="sm" />${r.oldP ? 'Dolor' : Calc.scoreInfo(r.old) ? Calc.scoreInfo(r.old).label : ''}</span></td>
            <td><span class="rscore"><${ScoreDot} v=${r.cur} pain=${r.curP} size="sm" />${r.curP ? 'Dolor' : Calc.scoreInfo(r.cur) ? Calc.scoreInfo(r.cur).label : ''}</span></td></tr>`)}</tbody></table></div>`}
      </section>`}

      ${scope === 'tot' && (c.plan || a.nextRetest) && html`<section class="rsec rplan">
        <h2 class="rsec-title">Pla de treball</h2>
        ${c.plan && html`<p class="prose">${c.plan}</p>`}
        ${a.nextRetest && html`<p class="rnext"><${Icon} name="calendar" size=${17} />Propera valoració: <strong>${U.fmtMonthYear(a.nextRetest)}</strong></p>`}
      </section>`}

      <footer class="sheet-foot">
        <span>${Store.settings.centerName || 'EON Life'} · ${scopeSec ? `Informe de ${scopeSec.short.toLowerCase()}` : 'Valoració funcional'} · ${Store.settings.centerTagline || 'Human Performance'}</span>
      </footer>
    </article>
  </div>`;
}

// ── PDF de l'informe fet a l'app ──
// Amb Microsoft 365, es desa a «Informes › Valoracions» de la carpeta del client (substituint el d'abans de la mateixa
// valoració; l'informe complet també el fa sol 18-pdfsync.js) i queda enllaçat a la valoració i a l'Excel. Sense carpeta al
// núvol, es descarrega.
//   informevaloracioinicial_lauravidalserra_20260702_01.pdf · informeforca_lauravidalserra_20261001_01.pdf (només d'un apartat)
function reportPdfName(a, p, typeLabel, scopeSec) {
  return `${Names.stem(scopeSec ? `Informe ${scopeSec.short}` : `Informe ${typeLabel}`, p, a.date)}_01.pdf`;
}

function ReportPdfButton({ a, p, typeLabel, scopeSec }) {
  const center = Store.settings.centerName || 'EON Life';
  return html`<${PdfSaveButton} p=${p} name=${reportPdfName(a, p, typeLabel, scopeSec)} where="reportAssess"
    title=${`${scopeSec ? `Informe · ${scopeSec.title}` : typeLabel} · ${U.fullName(p)}`}
    footer=${`${center} · ${scopeSec ? scopeSec.short : typeLabel} · ${U.fullName(p)}`}
    onSaved=${(res) => Store.update('assessments', a.id, (x) => {
      x.files = [...(x.files || []).filter((f) => f.name !== res.name), { id: U.uid('F'), name: res.name, url: res.url, label: 'Informe per al pacient', date: U.today() }];
    })} />`;
}

// Botó del PDF d'un informe (el de la valoració, el de tests i el de sessions): fa el PDF de l'informe de la pantalla
// (.present .report o .sheet) i, amb Microsoft 365, el desa a la carpeta del pacient (where: 'reportAssess', 'reportTests'
// o 'reportSessions' = «Informes › …»), substituint el del mateix nom. Sense carpeta al núvol, es descarrega.
function PdfSaveButton({ p, name, title, footer, where = 'reportAssess', onSaved }) {
  const [busy, setBusy] = useState(null);   // progrés (0-1) mentre es fa
  const [saved, setSaved] = useState(null); // { name, url } de l'últim desat a la carpeta
  const cloud = Store.cloud() && !!(Store.backend && Store.backend.uploadFile);
  if (!cloud && !U.canDownload()) return null;
  const folder = (EXPORT_FOLDERS[where] || EXPORT_FOLDERS.reportAssess).join(' › ');
  const run = async () => {
    if (busy != null) return;
    const el = document.querySelector('#app .present .report, #app .present .sheet');
    if (!el) return;
    setBusy(0);
    setSaved(null);
    try {
      const bytes = await ReportPdf.render(el, { title, author: Store.settings.centerName || 'EON Life', footer, onProgress: setBusy });
      if (cloud) {
        const res = await uploadToClient(p, new File([bytes], name, { type: 'application/pdf' }), { name, replace: true, where });
        if (onSaved) onSaved(res);
        setSaved({ name: res.name, url: res.url });
        UI.toast(`PDF desat a la carpeta del pacient: ${res.name}`);
      } else {
        savedToast(await U.downloadBytes(name, bytes, 'application/pdf'), `PDF descarregat: ${name}`);
      }
    } catch (e) {
      UI.toast(`No s'ha pogut fer el PDF: ${(e && e.message) || e}`, 'bad');
    }
    setBusy(null);
  };
  const label = busy != null ? `Fent el PDF… ${Math.round(busy * 100)} %` : cloud ? 'Desa el PDF a la carpeta' : 'Descarrega el PDF';
  return html`<span class="inline">
    ${saved && saved.url && html`<a class="btn btn-ghost" href=${saved.url} target="_blank" rel="noopener" title=${saved.name}><${Icon} name="note" size=${16} /><span>Obre el PDF</span></a>`}
    <${Btn} variant="primary" icon=${cloud ? 'upload' : 'download'} disabled=${busy != null} onClick=${run}
      title=${cloud ? `Fa el PDF i el desa a «${folder}» de la carpeta de ${p.firstName || 'el pacient'} (${name})` : `Fa el PDF i el descarrega (${name})`}>${label}</${Btn}>
  </span>`;
}

// Informe en mode clar o fosc (fons granat): es tria a la barra i es desa a la fitxa del pacient, perquè depèn del pacient.
const reportThemeClass = (p) => ((p && p.reportTheme) === 'dark' ? 'report-dark' : 'report-light');
function ReportThemeSwitch({ p }) {
  if (!p || !p.id) return null;
  return html`<${Seg} class="report-theme" value=${p.reportTheme === 'dark' ? 'dark' : 'light'} allowEmpty=${false} ariaLabel="Disseny de l'informe"
    onValue=${(v) => Store.update('patients', p.id, (x) => { x.reportTheme = v; })}
    options=${[{ v: 'light', label: 'Clar', title: 'Fons blanc (com sempre)' }, { v: 'dark', label: 'Fosc', title: 'Fons granat EON Life' }]} />`;
}

// ── Vídeos a l'informe ──
// A la pantalla: miniatura, reproducció dins de l'informe (Microsoft 365) i codi QR per obrir-lo des del mòbil.
// Al PDF per al client no hi surten (styles.css): els vídeos es queden a la carpeta del client i a l'app.
function ReportVideos({ videos, a, patient, grouped }) {
  const [media, setMedia] = useState({});
  const [playing, setPlaying] = useState('');
  const key = videos.map((v) => v.url).join('|');
  useEffect(() => {
    let alive = true;
    const merge = (m) => { if (alive) setMedia((cur) => ({ ...cur, ...(m || {}) })); };
    if (Store.backend && Store.backend.mediaInfo && patient.folderId) {
      const urls = videos.map((v) => v.url);
      const metas = Object.fromEntries(urls.map((u) => [u, MediaLinks.meta(a, u)]).filter(([, m]) => m && m.id));
      Store.backend.mediaInfo(patient.folderId, urls, metas).then((m) => {
        merge(m);
        // Si algú ha canviat el nom d'una carpeta, l'enllaç del vídeo s'arregla a la valoració (vegeu MediaLinks).
        for (const [u, info] of Object.entries(m || {})) if (a && info && info.id) MediaLinks.relink('assessments', a.id, u, info);
      }).catch(() => {});
    }
    // Versió de prova: vídeos desats a la tauleta.
    Promise.all(videos.filter((v) => LocalFiles.is(v.url)).map(async (v) => {
      const f = await LocalFiles.get(v.url);
      const u = f && (await LocalFiles.objectUrl(v.url));
      return u ? [v.url, /^image\//.test(f.type) ? { thumb: u } : { play: u }] : null;
    })).then((pairs) => merge(Object.fromEntries(pairs.filter(Boolean)))).catch(() => {});
    return () => { alive = false; };
  }, [key]);
  const areaName = (id) => (id === 'tot' ? 'General' : (PROTOCOL.find((s) => s.id === id) || {}).short || '');
  return html`<section class="rsec rvideos">
    <h2 class="rsec-title">Vídeos</h2>
    <div class="rvid-grid">${videos.map((vd) => {
      const m = media[vd.url] || {};
      const local = LocalFiles.is(vd.url);
      const link = m.url || vd.url;
      const open = () => (m.play ? setPlaying(vd.url) : local ? LocalFiles.show(vd.url)
        : m.missing || m.error ? mediaProblem({ title: vd.label, info: m, patient, what: 'el vídeo' }) : window.open(link, '_blank', 'noopener'));
      return html`<figure class="rvid" key=${vd.url}>
        <div class="rvid-media">
          ${playing === vd.url && m.play ? html`<video src=${m.play} controls autoplay playsinline preload="metadata"></video>`
            : html`<button type="button" class="rvid-thumb" onClick=${open} aria-label=${`Mira el vídeo: ${vd.label}`}>
                ${m.thumb && html`<img src=${m.thumb} alt="" loading="lazy" />`}
                <span class="rvid-play"><${Icon} name="playfill" size=${22} /></span>
              </button>`}
        </div>
        <figcaption>
          <span class="rvid-text"><strong>${vd.label}</strong>${grouped && html`<span class="muted small">${areaName(vd.area)}</span>`}
            ${m.missing ? html`<span class="small bad-text">No es troba a la carpeta</span>`
              : html`<a class="link small no-print" href=${link} target="_blank" rel="noopener">${local ? 'Obre' : 'Obre a la carpeta'}</a>`}</span>
          ${!local && !m.missing && html`<${QrCode} text=${link} size=${76} />`}
        </figcaption>
      </figure>`;
    })}</div>
  </section>`;
}

// Codi QR en SVG (fons blanc sempre, perquè es llegeixi també en tema fosc i imprès).
function QrCode({ text, size = 80 }) {
  const d = useMemo(() => {
    if (typeof qrcode === 'undefined' || !text) return null;
    try {
      if (qrcode.stringToBytesFuncs && qrcode.stringToBytesFuncs['UTF-8']) qrcode.stringToBytes = qrcode.stringToBytesFuncs['UTF-8'];
      const q = qrcode(0, 'L');
      q.addData(String(text), 'Byte');
      q.make();
      const n = q.getModuleCount();
      let path = '';
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (q.isDark(r, c)) path += `M${c + 4},${r + 4}h1v1h-1z`;
      return { n: n + 8, path };
    } catch (e) {
      return null;
    }
  }, [text]);
  if (!d) return null;
  return html`<svg class="qr" width=${size} height=${size} viewBox=${`0 0 ${d.n} ${d.n}`} role="img" aria-label="Codi QR del vídeo" shape-rendering="crispEdges">
    <rect width=${d.n} height=${d.n} fill="#ffffff" /><path d=${d.path} fill="#1a1011" /></svg>`;
}
