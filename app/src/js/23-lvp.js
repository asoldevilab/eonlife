/* EON Life · valoració: perfil càrrega-velocitat (ADR Encoder lineal) i guia d'ús. */

// Guia pas a pas per fer el test amb l'encoder (surt amb el botó «Com fer-lo servir»).
const LVP_GUIDE = [
  { h: 'Per a què serveix', items: [
    'Mesurem la velocitat mitjana de la barra amb diverses càrregues. Com més pes, més lenta: la relació és una recta.',
    'Amb aquesta recta estimem la 1RM sense haver d\'arribar-hi (més segur, sobretot en readaptació, gent gran o poc entrenada), la càrrega que toca per a cada velocitat i, a cada re-test, si el perfil s\'ha desplaçat cap a càrregues més altes.',
  ] },
  { h: 'Abans de començar', items: [
    'Només amb el cribratge de salut superat i sense dolor. Un company al costat (spotter) a les càrregues pesades i a l\'squat i la banca.',
    'Escalfa: general i 2 sèries progressives de l\'exercici. Decideix la tècnica i mantén-la igual sempre (fondària, posició dels peus, agafada, pausa al pit a la banca…): el perfil és propi de cada exercici i equip (una Smith no és una barra lliure).',
    'Col·loca l\'encoder segons les instruccions del fabricant: el cable ha de quedar vertical, tens i sense tocar la barra ni els discs, sempre al mateix punt de la barra.',
    'Comprova que l\'encoder dona la velocitat mitjana de la fase concèntrica (no la de pic ni la propulsiva): és la que fan servir els valors de referència de la 1RM.',
  ] },
  { h: 'Les càrregues', items: [
    'Fes 4–6 càrregues creixents. La primera, lleugera (uns 1 m/s); després puja\'n 10–20 kg (o un 10 %) cada cop fins que la barra vagi cap a 0,5–0,6 m/s. No cal arribar a la fallada ni a l\'1RM.',
    '2 repeticions a les càrregues lleugeres i 1–2 a les pesades. Descans de 2 min a les lleugeres i 3–4 min a les pesades.',
    'Cada repetició a màxima intenció a la fase concèntrica (puja tan ràpid com pugui), baixada controlada. Si una repetició surt malament (la barra s\'inclina, es perd la tècnica), no la comptis.',
    'Apunta cada repetició com una fila (com fa l\'app de l\'ADR, que fa servir totes les repeticions, p. ex. 3 per càrrega) o una sola per càrrega, la velocitat mitjana de la més ràpida o la mitjana de les repeticions: tria un criteri i mantén-lo sempre. La recta es calcula amb totes les files.',
    'Versió ràpida (2 punts): una càrrega lleugera (~1 m/s) i una de pesada (~0,5 m/s). És orientativa: millor 4 o més punts.',
  ] },
  { h: 'Com s\'interpreta', items: [
    'La recta té una velocitat sense càrrega (V0) i un punt on la velocitat seria zero (L0). Com més a la dreta quedi la recta en un re-test, més fort és el pacient.',
    'L\'app calcula la recta igual que l\'app de l\'ADR (càrrega en funció de la velocitat): la pendent, V0, L0, R² i la 1RM han de quadrar amb els de la pantalla de l\'encoder, sempre que hi posis la mateixa velocitat mínima (a la prova d\'exemple, 0,17 m/s al press banca).',
    'La 1RM estimada és la càrrega on la recta arriba a la velocitat mínima de l\'exercici (squat 0,30 m/s, press banca ~0,17, pes mort ~0,15, hip thrust ~0,25). Són valors de la literatura: es poden canviar a cada exercici.',
    'R² de 0,95 o més, bon ajust. Per sota de 0,90, repeteix alguna càrrega i revisa la tècnica i l\'encoder.',
    'A cada re-test, mira la 1RM estimada i la càrrega a 0,50 m/s: surten comparades amb la valoració anterior.',
  ] },
  { h: 'Limitacions', items: [
    'És una estimació: va bé per fer seguiment i per triar càrregues, però no substitueix un test directe quan fa falta saber la 1RM exacta.',
    'Depèn de l\'exercici, de la tècnica, de l\'equip i del sexe (a l\'squat, les dones tenen una velocitat mínima més baixa). No comparis perfils entre exercicis ni entre equips diferents.',
    'Amb poc recorregut de càrregues o amb una càrrega pesada molt lluny de la 1RM, l\'estimació extrapola molt: l\'app t\'ho avisa.',
  ] },
];

function LvpGuideDialog({ onClose }) {
  return html`<${Dialog} title="Test càrrega-velocitat: com fer-lo servir" wide=${true} text=${true} onClose=${onClose} footer=${html`<${Btn} variant="primary" onClick=${onClose}>Entesos</${Btn}>`}>
    <div class="lvp-guide">
      <p class="muted">Pas a pas amb l'ADR Encoder lineal. Dura uns 15 minuts per exercici.</p>
      ${LVP_GUIDE.map((s) => html`<section><h3 class="h3">${s.h}</h3><ul>${s.items.map((i) => html`<li>${i}</li>`)}</ul></section>`)}
      <p class="muted small">Referències: González-Badillo i Sánchez-Medina (2010) · García-Ramos et al. (2018) · Ardigò et al. (2022). L'ADR Encoder s'ha validat com a transductor lineal de baix cost contra T-Force en press de banca.</p>
    </div>
  </${Dialog}>`;
}

function LvpBlock({ a, p, upd }) {
  const exs = (a.lvp && a.lvp.exercises) || [];
  const prev = previousAssessment(a);
  const res = Calc.lvpAnalysis(a, prev, true);
  const setEx = (id, fn) => upd((x) => { const e = ((x.lvp || {}).exercises || []).find((z) => z.id === id); if (e) fn(e); });
  const set = (id, k) => (v) => setEx(id, (e) => { e[k] = v; });
  const setRow = (id, rid, k) => (v) => setEx(id, (e) => { const r = e.rows.find((z) => z.id === rid); if (r) r[k] = v; });
  const add = (preset) => upd((x) => { x.lvp = x.lvp || { exercises: [] }; x.lvp.exercises = [...(x.lvp.exercises || []), LVP.newExercise(preset, p && p.sex)]; });
  const del = (id) => upd((x) => { x.lvp.exercises = x.lvp.exercises.filter((z) => z.id !== id); });
  const addRow = (id) => setEx(id, (e) => { e.rows = [...e.rows, LVP.newRow()]; });
  const delRow = (id, rid) => setEx(id, (e) => { e.rows = e.rows.filter((z) => z.id !== rid); });
  const setPreset = (id) => (v) => setEx(id, (e) => {
    e.preset = v;
    e.name = v === 'other' ? '' : LVP.preset(v).name;
    const m = LVP.defaultMvt(v, p && p.sex);
    e.mvt = m != null ? String(m).replace('.', ',') : '';
  });
  const guide = () => { let close = null; close = UI.open(() => html`<${LvpGuideDialog} onClose=${() => close()} />`); };
  return html`<div class="lvp">
    <div class="lvp-top">
      <p class="muted small grow">Apunta, per a cada càrrega, la velocitat mitjana que dona l'encoder. Amb 4–6 càrregues l'app dibuixa la recta i estima la 1RM.</p>
      <${Btn} size="sm" icon="info" onClick=${guide}>Com fer-lo servir</${Btn}>
    </div>
    ${exs.map((ex, i) => {
      const r = res[i] || {};
      const pr = LVP.preset(ex.preset);
      return html`<div class="lvp-ex" key=${ex.id}>
        <div class="lvp-ex-head">
          <${Select} value=${ex.preset || 'other'} onValue=${setPreset(ex.id)} options=${LVP.presets.map((o) => ({ v: o.id, label: o.name }))} ariaLabel="Exercici" />
          ${(ex.preset || 'other') === 'other' && html`<${TextInput} value=${ex.name} onValue=${set(ex.id, 'name')} placeholder="Nom de l'exercici" ariaLabel="Nom de l'exercici" />`}
          <${Field} label="Velocitat mínima (1RM)" class="lvp-mvt" hint=${pr.ref}><${NumInput} value=${ex.mvt} onValue=${set(ex.id, 'mvt')} unit="m/s" ariaLabel=${`${ex.name || pr.name} velocitat mínima`} /></${Field}>
          <${Btn} variant="ghost" icon="x" title="Treu l'exercici" onClick=${() => del(ex.id)} />
        </div>
        <div class="table-wrap"><table class="table lvp-table">
          <thead><tr><th>#</th><th>Càrrega <span class="muted">kg</span></th><th>Velocitat mitjana <span class="muted">m/s</span></th><th>Velocitat pic <span class="muted">m/s</span></th><th>Reps</th><th class="num">% 1RM</th><th class="num">Potència <span class="muted">W</span></th><th><span class="sr-only">Accions</span></th></tr></thead>
          <tbody>${ex.rows.map((row, k) => html`<tr key=${row.id}>
            <td class="muted">${k + 1}</td>
            <td><${NumInput} value=${row.load} onValue=${setRow(ex.id, row.id, 'load')} ariaLabel=${`${ex.name || pr.name} càrrega ${k + 1}`} /></td>
            <td><${NumInput} value=${row.mv} onValue=${setRow(ex.id, row.id, 'mv')} ariaLabel=${`${ex.name || pr.name} velocitat mitjana ${k + 1}`} /></td>
            <td><${NumInput} value=${row.pv} onValue=${setRow(ex.id, row.id, 'pv')} ariaLabel=${`${ex.name || pr.name} velocitat pic ${k + 1}`} /></td>
            <td><${NumInput} value=${row.reps} onValue=${setRow(ex.id, row.id, 'reps')} ariaLabel=${`${ex.name || pr.name} repeticions ${k + 1}`} /></td>
            <td class="num muted">${LvpRowPct(row, r)}</td>
            <td class="num muted">${LvpRowPower(row)}</td>
            <td><${Btn} variant="ghost" icon="x" title="Treu la càrrega" onClick=${() => delRow(ex.id, row.id)} /></td>
          </tr>`)}</tbody>
        </table></div>
        <div class="row-actions"><${Btn} size="sm" icon="plus" onClick=${() => addRow(ex.id)}>Afegeix càrrega</${Btn}></div>
        ${r.fit && html`<div class="lvp-result">
          <${LoadVelocityChart} cur=${r} prev=${r.prevEx} prevLabel=${r.cmp && r.cmp.date ? U.fmtDateShort(r.cmp.date) : 'Anterior'} ariaLabel=${`Perfil càrrega-velocitat de ${r.name || pr.name}`} />
          <${LvpStats} r=${r} />
          <${LvpZones} r=${r} />
          ${r.lines.filter((l) => /^Respecte/.test(l) || /^Càrrega a 0,50/.test(l)).length > 0 && html`<ul class="analysis-list">${r.lines.filter((l) => /^Respecte/.test(l) || /^Càrrega a 0,50/.test(l)).map((l) => html`<li>${l}</li>`)}</ul>`}
        </div>`}
        ${r.warns && r.warns.length > 0 && html`<ul class="analysis-warns">${r.warns.map((l) => html`<li><${Icon} name="alert" size=${14} /><span>${l}</span></li>`)}</ul>`}
      </div>`;
    })}
    <div class="row-actions lvp-add"><span class="muted small">Afegeix exercici:</span>
      ${LVP.presets.map((o) => html`<${Btn} size="sm" icon="plus" onClick=${() => add(o.id)}>${o.name}</${Btn}>`)}</div>
    ${Calc.lvpAnalysis(a, prev).length > 0 && !Calc.weight(a) && html`<p class="muted small">Afegeix el pes a les dades de la valoració per veure la 1RM en vegades el pes corporal.</p>`}
  </div>`;
}

// % de la 1RM i potència (kg × 9,8 × velocitat) d'una fila, com a l'app de l'ADR.
function LvpRowPct(row, r) {
  const l = U.num(row.load);
  return r && r.rm && l != null ? `${U.fmt((l / r.rm) * 100, 1)} %` : '';
}
function LvpRowPower(row) {
  const l = U.num(row.load), v = U.num(row.mv);
  return l != null && v != null ? U.fmt(l * 9.8 * v, 0) : '';
}

// Resum de la recta: 1RM estimada, V0, L0 i R², i les equacions (escrites com a l'app de l'ADR, per comparar-les).
function LvpStats({ r, eq }) {
  const f = r.fit;
  return html`<div class="lvp-stats">
    <div class="kv-row lvp-kv">
      <div class="kv"><span>1RM estimada</span><strong>${r.rm != null ? html`${U.fmt(r.rm, 1)}<small> kg</small>` : '—'}</strong>${r.rmRel != null && html`<small>${U.fmtFixed(r.rmRel, 2)} × pes corporal</small>`}</div>
      <div class="kv"><span>Velocitat sense càrrega (V0)</span><strong>${f.v0 != null ? U.fmtFixed(f.v0, 2) : '—'}<small> m/s</small></strong></div>
      <div class="kv"><span>Càrrega a velocitat zero (L0)</span><strong>${U.fmt(f.l0, 1)}<small> kg</small></strong></div>
      <div class="kv"><span>Ajust (R²)</span><strong>${f.r2 != null ? U.fmtFixed(f.r2, 2) : '—'}</strong><small>${U.plural(f.n, 'punt', 'punts')}</small></div>
    </div>
    ${eq !== false && html`<p class="muted small lvp-eq">${r.eq}${f.r2 != null ? ` · R² ${U.fmtFixed(f.r2, 2)}` : ''}${r.eqPct ? html`<br />${r.eqPct}` : ''}</p>`}
  </div>`;
}

// Càrrega estimada per a cada velocitat (segons la recta de la persona).
function LvpZones({ r, report }) {
  if (!r.table.length) return null;
  return html`<div class="table-wrap"><table class=${U.cls('table', report && 'rtable', 'lvp-zones')}>
    <thead><tr><th>Velocitat mitjana</th><th class="num">Càrrega estimada</th>${r.rm != null && html`<th class="num">% de la 1RM</th>`}</tr></thead>
    <tbody>${r.table.map((z) => html`<tr><td>${U.fmtFixed(z.v, 2)} m/s</td><td class="num">${U.fmt(z.load, 0)} kg</td>${r.rm != null && html`<td class="num">${z.pct != null ? `${U.fmt(z.pct, 0)} %` : '—'}</td>`}</tr>`)}</tbody>
  </table></div>`;
}
