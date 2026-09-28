/* EON Life · informe de la valoració per ensenyar al client (pantalla) i desar en PDF. */

function AssessmentReport({ id }) {
  const a = Store.get('assessments', id);
  const [notes, setNotes] = useState(false);
  if (!a) return html`<div class="page"><${Empty} icon="clipboard" title="No trobo aquesta valoració" /></div>`;
  const p = Store.get('patients', a.patientId) || {};
  const all = Store.assessmentsOf(a.patientId);
  const idx = all.findIndex((x) => x.id === a.id);
  const prev = idx > 0 ? all[idx - 1] : null;
  const v = a.values || {};
  const g = a.general || {}, c = a.conclusions || {};
  const w = Calc.weight(a);
  const alerts = Calc.alerts(a);
  const cmj = Calc.cmj(a);
  const jumps = Calc.jumps(a);
  const ybt = Calc.ybt(a);
  const pc = Calc.patterns(a);
  const bike = Calc.bike(a);
  const hq = Calc.hq(a);
  const typeLabel = (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració';
  const profile = OPT.profiles.find((o) => o.v === p.profile);
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
  const dyn = biRows(['dyn_knee_ext', 'dyn_curl_90', 'dyn_curl_30', 'dyn_hip_ir', 'dyn_hip_er', 'dyn_sh_er'], true);
  const squeeze = U.num((v.dyn_squeeze || {}).v);
  const clin = ['slump', 'pkb', 'adams', 'thomas', 'windlass'].map((tid) => ({ t: TEST_INDEX[tid], x: v[tid] || {} }))
    .filter(({ x }) => x.d || x.e || x.v);
  const sls = v.sls || {};
  const profTests = PROFILE_TESTS.filter((t) => {
    const x = v[t.id] || {};
    return x.d || x.e || x.v || x.sd || x.se;
  });
  const enc = ((a.encoder && a.encoder.rows) || []).filter((r) => r.name && (U.num(r.load) != null || U.num(r.vel) != null));
  const cmp = prev ? Calc.compare(a, prev, true) : [];
  const hasPatterns = pc.scored > 0 || pc.counts.P > 0;

  const ScoreCell = ({ s, pain }) => html`<span class="rscore"><${ScoreDot} v=${s} pain=${pain} size="sm" />${s ? Calc.scoreInfo(s).label : ''}</span>`;

  return html`<div class="present">
    <${PresentBar} title=${`${typeLabel} · ${U.fullName(p)}`} onClose=${() => go('valoracio', a.id)}>
      <${Btn} variant="ghost" icon=${notes ? 'eye' : 'eyeoff'} onClick=${() => setNotes(!notes)} title="Mostra o amaga les observacions de cada test">${notes ? 'Amb notes' : 'Sense notes'}</${Btn}>
    </${PresentBar}>
    <article class="report">
      <header class="report-cover">
        <${BrandMark} />
        <div class="report-id">
          <p class="eyebrow">Valoració funcional · Human Performance</p>
          <h1 class="report-title">${U.fullName(p)}</h1>
          <p class="report-sub">${typeLabel} · ${U.fmtDateLong(a.date, false)}${a.professional ? ` · ${a.professional}` : ''}</p>
        </div>
        <dl class="report-facts">
          ${age != null && html`<div><dt>Edat</dt><dd>${age} anys</dd></div>`}
          ${profile && html`<div><dt>Perfil</dt><dd>${profile.label}</dd></div>`}
          ${w && html`<div><dt>Pes</dt><dd>${U.fmt(w, 1)} kg</dd></div>`}
          ${(g.goal || p.goal) && html`<div class="wide"><dt>Objectiu</dt><dd>${g.goal || p.goal}</dd></div>`}
        </dl>
      </header>

      <section class="rsec">
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
      </section>

      ${(rom.length > 0 || wblt.length > 0 || clin.length > 0) && html`<section class="rsec">
        <h2 class="rsec-title">Mobilitat i anàlisi postural</h2>
        ${rom.length > 0 && html`<h3 class="h3">Goniometria digital <span class="muted">· Kinvent K-Move · graus</span></h3><${BiBars} rows=${rom} unit="°" />`}
        ${kneeExt && html`<p class="muted small">Extensió de genoll: dreta ${U.fmt(kneeExt.d, 0)}° · esquerra ${U.fmt(kneeExt.e, 0)}°.</p>`}
        ${wblt.length > 0 && html`<h3 class="h3">Flexió dorsal de turmell en càrrega <span class="muted">· knee-to-wall</span></h3>
          <${BiBars} rows=${wblt} unit="cm" decimals=${1} />
          <p class="muted small">Referència: menys de ${THRESHOLDS.wbltMin} cm o una diferència de ${THRESHOLDS.wbltDiff} cm entre turmells es considera limitació.</p>`}
        ${clin.length > 0 && html`<h3 class="h3">Neurodinàmia i anàlisi postural</h3>
          <div class="table-wrap"><table class="table rtable"><thead><tr><th>Test</th><th>Dreta</th><th>Esquerra</th></tr></thead>
          <tbody>${clin.map(({ t, x }) => html`<tr><td>${t.name}${notes && x.note && html`<div class="rnote">${x.note}</div>`}</td>
            ${t.kind === 'select' ? html`<td colspan="2">${x.v || '—'}</td>` : html`<td>${x.d || '—'}</td><td>${x.e || '—'}</td>`}</tr>`)}</tbody></table></div>`}
      </section>`}

      ${(dyn.length > 0 || squeeze != null || sls.sd || sls.se || ybt.d.comp != null || ybt.e.comp != null) && html`<section class="rsec">
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

      ${(Object.keys(jumps).length > 0 || enc.length > 0 || bike.peak != null) && html`<section class="rsec">
        <h2 class="rsec-title">Rendiment</h2>
        ${Object.keys(jumps).length > 0 && html`<h3 class="h3">Salts <span class="muted">· My Jump Lab</span></h3>
          <div class="jump-sum">${Object.entries(jumps).map(([type, sm]) => html`<div class="jump-card">
            <div class="jump-type">${type}</div>
            <div class="jump-best">${U.fmt(sm.best, 1)}<small> cm</small></div>
            <div class="jump-meta">Mitjana ${U.fmt(sm.mean, 1)} cm${sm.bestPower != null ? ` · ${U.fmt(sm.bestPower, 0)} W` : ''}${sm.relPower != null ? ` · ${U.fmt(sm.relPower, 1)} W/kg` : ''}${sm.bestRsi != null ? ` · RSI-mod ${U.fmt(sm.bestRsi, 2)}` : ''}</div>
          </div>`)}</div>`}
        ${enc.length > 0 && html`<h3 class="h3">Encoder <span class="muted">· velocitat d'execució</span></h3>
          <div class="table-wrap"><table class="table rtable"><thead><tr><th>Exercici</th><th class="num">Càrrega</th><th class="num">Velocitat mitjana</th><th class="num">Potència</th></tr></thead>
          <tbody>${enc.map((r) => html`<tr><td>${r.name}</td><td class="num">${U.num(r.load) != null ? `${U.fmt(U.num(r.load), 1)} kg` : '—'}</td>
            <td class="num">${U.num(r.vel) != null ? `${U.fmt(U.num(r.vel), 2)} m/s` : '—'}</td><td class="num">${U.num(r.power) != null ? `${U.fmt(U.num(r.power), 0)} W` : '—'}</td></tr>`)}</tbody></table></div>`}
        ${bike.peak != null && html`<h3 class="h3">Assault bike · 30 s all-out</h3>
          <div class="kv-row">
            <div class="kv"><span>Potència pic</span><strong>${U.fmt(bike.peak, 0)} W</strong>${bike.peakRel != null && html`<small>${U.fmt(bike.peakRel, 1)} W/kg</small>`}</div>
            <div class="kv"><span>Potència mitjana</span><strong>${U.fmt(bike.mean, 0)} W</strong>${bike.meanRel != null && html`<small>${U.fmt(bike.meanRel, 1)} W/kg</small>`}</div>
            <div class="kv"><span>Índex de fatiga</span><strong>${bike.fatigue != null ? `${U.fmt(bike.fatigue, 1)} %` : '—'}</strong></div>
          </div>`}
      </section>`}

      ${hasPatterns && html`<section class="rsec">
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

      ${profTests.length > 0 && html`<section class="rsec">
        <h2 class="rsec-title">Tests complementaris</h2>
        <div class="table-wrap"><table class="table rtable"><thead><tr><th>Test</th><th>Resultat</th></tr></thead>
        <tbody>${profTests.map((t) => {
          const x = v[t.id] || {};
          const val = t.kind === 'bi' ? `D ${U.fmt(U.num(x.d), 1)} · E ${U.fmt(U.num(x.e), 1)} ${t.unit}`
            : t.kind === 'single' ? `${U.fmt(U.num(x.v), 1)} ${t.unit}`
            : t.kind === 'scoreBi' ? html`D <${ScoreDot} v=${x.sd} size="xs" /> · E <${ScoreDot} v=${x.se} size="xs" />`
            : x.v;
          return html`<tr><td>${t.name}</td><td>${val}${notes && x.note && html`<div class="rnote">${x.note}</div>`}</td></tr>`;
        })}</tbody></table></div>
      </section>`}

      ${(a.free || []).some((r) => r.name) && html`<section class="rsec">
        <h2 class="rsec-title">Altres mesures</h2>
        <div class="table-wrap"><table class="table rtable"><thead><tr><th>Mesura</th><th>Resultat</th></tr></thead>
        <tbody>${a.free.filter((r) => r.name).map((r) => html`<tr><td>${r.name}</td><td>${[r.d !== '' && r.d != null && `D ${r.d}`, r.e !== '' && r.e != null && `E ${r.e}`, r.v !== '' && r.v != null && r.v].filter(Boolean).join(' · ')} ${r.unit || ''}</td></tr>`)}</tbody></table></div>
      </section>`}

      ${cmp.length > 0 && html`<section class="rsec">
        <h2 class="rsec-title">Evolució des de la valoració anterior</h2>
        <p class="muted">${U.fmtDateLong(prev.date, false)} → ${U.fmtDateLong(a.date, false)}</p>
        <${CompareTable} rows=${cmp} />
      </section>`}

      ${(c.plan || a.nextRetest) && html`<section class="rsec rplan">
        <h2 class="rsec-title">Pla de treball</h2>
        ${c.plan && html`<p class="prose">${c.plan}</p>`}
        ${a.nextRetest && html`<p class="rnext"><${Icon} name="calendar" size=${17} />Propera valoració: <strong>${U.fmtDateLong(a.nextRetest, false)}</strong></p>`}
      </section>`}

      <footer class="sheet-foot">
        <span>${Store.settings.centerName || 'EON Life'} · Valoració funcional · ${Store.settings.centerTagline || 'Human Performance'}</span>
        <span>${U.fmtDate(a.date)}</span>
      </footer>
    </article>
  </div>`;
}
