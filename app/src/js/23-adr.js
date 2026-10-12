/* EON Life · «Importa de l'ADR»: el CSV (o l'Excel) que exporta l'app de l'ADR entra a la valoració (perfil càrrega-velocitat,
   salts) o a la sessió (sèries d'un exercici). Es llegeix a la mateixa tauleta; només es desa el que es marca. */

// Camps que es poden assignar a mà a una columna del fitxer.
const ADR_MAP_FIELDS = {
  enc: ['athlete', 'exercise', 'date', 'set', 'rep', 'load', 'mv', 'mpv', 'pv', 'vl', 'power'],
  jump: ['athlete', 'jtype', 'date', 'set', 'height', 'flight', 'contact', 'rsi', 'power'],
};
const ADR_VAR_LABELS = { mv: 'Velocitat mitjana', mpv: 'Velocitat mitjana propulsiva', pv: 'Velocitat de pic' };

// Botó que tria el fitxer de l'ADR (CSV o Excel), el llegeix i obre el diàleg. opts: { mode, patient, date, itemName, existing, onApply }
function AdrImportButton({ mode, patient, date, itemName, existing, onApply, label = 'Importa de l\'ADR', size = 'sm', title }) {
  const ref = useRef(null);
  const open = async (file) => {
    if (ref.current) ref.current.value = '';
    if (!file) return;
    try {
      const rows = await ADR.rowsOf(file);
      let close = null;
      close = UI.open(() => html`<${AdrImportDialog} rows=${rows} fileName=${file.name} mode=${mode} patient=${patient} date=${date} itemName=${itemName} existing=${existing}
        onClose=${() => close()} onApply=${(v) => { close(); onApply(v); }} />`);
    } catch (e) {
      UI.toast(`No s'ha pogut llegir el fitxer: ${e.message}`, 'bad');
    }
  };
  return html`<span class="adr-import">
    <input type="file" accept=".csv,.txt,.xlsx,text/csv,text/plain,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" hidden ref=${ref} data-kind="adr" onChange=${(e) => open(e.currentTarget.files[0])} />
    <${Btn} size=${size} icon="upload" onClick=${() => ref.current && ref.current.click()} title=${title || 'Llegeix el fitxer (CSV o Excel) que exporta l\'app de l\'ADR'}>${label}</${Btn}>
  </span>`;
}

function AdrImportDialog({ rows, fileName, mode, patient, date, itemName, existing, onApply, onClose }) {
  const first = ADR.parseRows(rows, patient);
  const [override, setOverride] = useState(() => ADR.recall(first.headers));
  const [person, setPerson] = useState(null);
  const [day, setDay] = useState(null);
  const [variable, setVariable] = useState(null);
  const [ptsMode, setPtsMode] = useState('fast');
  const [cfg, setCfg] = useState({});
  const [exName, setExName] = useState(null);
  const [off, setOff] = useState({});
  const res = ADR.parseRows(rows, patient, override);
  const need = mode === 'jumps' ? 'jump' : 'enc';
  const person0 = person != null ? person : '';
  const names = person0 ? [person0] : res.match ? res.match.names : [];
  const hasName = !res.error && res.hasName;
  const dayVal = day != null ? day : (res.dates || []).some((d) => d.date === date) ? date : '';
  const recs = (res.records || []).filter((x) => (!hasName || names.includes(x.athlete)) && (!dayVal || x.date === dayVal));
  const vars = res.vars || [];
  const vr = variable || (vars.includes('mv') ? 'mv' : vars[0] || 'mv');
  const fmtDay = (d) => (d ? U.fmtDate(d) : 'sense data');
  const person_ = [patient && patient.firstName, patient && patient.lastName].filter(Boolean).join(' ');

  const setMap = (k) => (v) => {
    const next = { ...(override || {}), [k]: v === '' ? '' : Number(v) };
    setOverride(next);
    ADR.remember(res.headers, next);
  };

  // ── Què s'importarà, segons el mode ──
  let items = [], body = null, canApply = false, applyLabel = 'Importa';
  if (!res.error && mode === 'lvp') {
    const exs = [...new Set(recs.filter((x) => x.kind === 'encoder').map((x) => x.exercise))];
    const known = new Set((existing || []).map((n) => U.norm(n)));
    const conf = (name) => cfg[name] || { on: undefined, preset: ADR.presetOf(name), name: '' };
    const list = exs.map((name) => {
      const c = conf(name);
      const pts = ADR.points(recs.filter((x) => x.exercise === name), { variable: vr, mode: ptsMode });
      const preset = c.preset;
      const nm = preset === 'other' ? (c.name || name || 'Exercici') : LVP.preset(preset).name;
      return { name, c, pts, preset, nm, on: c.on === undefined ? pts.length >= 2 : c.on };
    });
    const setC = (name, patch) => setCfg({ ...cfg, [name]: { ...conf(name), ...patch } });
    items = list.filter((x) => x.on && x.pts.length).map((x) => ({ preset: x.preset, name: x.nm, rows: x.pts.map((q) => ({ id: U.uid('R'), load: ADR.str(q.load, 1), mv: ADR.str(q.v, 3), pv: q.pv != null ? ADR.str(q.pv, 2) : '', reps: '' })) }));
    canApply = items.length > 0;
    applyLabel = items.length ? `Importa ${U.plural(items.length, 'exercici', 'exercicis')}` : 'Importa';
    body = html`<div>
      <div class="adr-opts">
        ${vars.length > 1 && html`<label class="adr-opt"><span class="field-label">Velocitat</span>
          <${Select} value=${vr} onValue=${setVariable} options=${vars.map((k) => ({ v: k, label: ADR_VAR_LABELS[k] }))} ariaLabel="Velocitat a importar" /></label>`}
        <div class="adr-opt"><span class="field-label">Repeticions</span>
          <${Seg} value=${ptsMode} onValue=${setPtsMode} allowEmpty=${false} size="sm" ariaLabel="Repeticions a importar"
            options=${[{ v: 'fast', label: 'La més ràpida de cada càrrega' }, { v: 'all', label: 'Totes' }]} /></div>
      </div>
      ${vr !== 'mv' && html`<p class="muted small">Les velocitats mínimes de la 1RM de l'app són de la velocitat mitjana: si tries ${ADR_VAR_LABELS[vr].toLowerCase()}, revisa la velocitat mínima de l'exercici.</p>`}
      ${exs.length === 0 && html`<p class="muted">No hi ha cap repetició amb càrrega i velocitat per a aquesta persona i aquest dia.</p>`}
      ${list.map((x) => html`<div class=${U.cls('adr-ex', !x.on && 'off')} key=${x.name}>
        <div class="adr-ex-head">
          <label class="adr-check"><input type="checkbox" checked=${x.on} onChange=${(e) => setC(x.name, { on: e.currentTarget.checked })} aria-label=${`Importa ${x.name || 'l\'exercici'}`} /><strong>${x.name || '(exercici sense nom)'}</strong></label>
          <span class="muted small">${U.plural(x.pts.length, 'punt', 'punts')}</span>
          <span class="grow"></span>
          <${Select} value=${x.preset} onValue=${(v) => setC(x.name, { preset: v })} options=${LVP.presets.map((o) => ({ v: o.id, label: o.name }))} ariaLabel=${`Exercici de l'app per a ${x.name}`} />
          ${x.preset === 'other' && html`<${TextInput} value=${x.c.name || x.name} onValue=${(v) => setC(x.name, { name: v })} placeholder="Nom de l'exercici" ariaLabel="Nom de l'exercici" />`}
        </div>
        ${x.on && known.has(U.norm(x.nm)) && html`<p class="muted small">Ja hi ha «${x.nm}» a la valoració: se substituiran les seves càrregues.</p>`}
        ${x.on && x.pts.length < 3 && html`<p class="muted small">Amb menys de 3 càrregues la recta és orientativa.</p>`}
        ${x.on && x.pts.length > 0 && html`<div class="table-wrap"><table class="table adr-table">
          <thead><tr><th class="num">Càrrega <span class="muted">kg</span></th><th class="num">${ADR_VAR_LABELS[vr]} <span class="muted">m/s</span></th><th class="num">Potència <span class="muted">W</span></th></tr></thead>
          <tbody>${x.pts.map((q) => html`<tr><td class="num">${U.fmt(q.load, 1)}</td><td class="num">${U.fmtFixed(q.v, 2)}</td><td class="num">${q.power != null ? U.fmt(q.power, 0) : '—'}</td></tr>`)}</tbody>
        </table></div>`}
      </div>`)}
    </div>`;
  } else if (!res.error && mode === 'sets') {
    const encSets = res.hasEncoder;
    const exs = [...new Set(recs.filter((x) => (encSets ? x.kind === 'encoder' : x.kind === 'jump')).map((x) => x.exercise))];
    const want = U.norm(itemName || '');
    const auto = exs.find((n) => want && (U.norm(n).includes(want) || want.includes(U.norm(n)))) || exs[0] || '';
    const exVal = exName != null && exs.includes(exName) ? exName : auto;
    const mine = recs.filter((x) => x.exercise === exVal);
    const sets = encSets && mine.some((x) => x.kind === 'encoder') ? ADR.sets(mine, { variable: vr }) : ADR.jumpSets(mine);
    const isJump = !(encSets && mine.some((x) => x.kind === 'encoder'));
    const chosen = sets.filter((_, i) => !off[i]);
    items = chosen.map((s) => (isJump ? ADR.jumpSetRow(s) : ADR.setRow(s)));
    items.jump = isJump;
    canApply = items.length > 0;
    applyLabel = items.length ? `Importa ${U.plural(items.length, 'sèrie', 'sèries')}` : 'Importa';
    body = html`<div>
      <div class="adr-opts">
        ${exs.length > 1 && html`<label class="adr-opt"><span class="field-label">Exercici del fitxer</span>
          <${Select} value=${exVal} onValue=${(v) => { setExName(v); setOff({}); }} options=${exs.map((n) => ({ v: n, label: n || '(sense nom)' }))} ariaLabel="Exercici del fitxer" /></label>`}
        ${!isJump && vars.length > 1 && html`<label class="adr-opt"><span class="field-label">Velocitat</span>
          <${Select} value=${vr} onValue=${setVariable} options=${vars.map((k) => ({ v: k, label: ADR_VAR_LABELS[k] }))} ariaLabel="Velocitat a importar" /></label>`}
      </div>
      ${sets.length === 0 && html`<p class="muted">No hi ha sèries per a aquesta persona, aquest dia i aquest exercici.</p>`}
      ${sets.length > 0 && html`<div class="table-wrap"><table class="table adr-table">
        <thead><tr><th><span class="sr-only">Importa</span></th><th>Sèrie</th>${isJump
          ? html`<th class="num">Salts</th><th class="num">Millor <span class="muted">cm</span></th><th class="num">Mitjana <span class="muted">cm</span></th><th class="num">RSI</th>`
          : html`<th class="num">Càrrega <span class="muted">kg</span></th><th class="num">Reps</th><th class="num">V 1a <span class="muted">m/s</span></th><th class="num">V última <span class="muted">m/s</span></th><th class="num">Pèrdua</th><th class="num">Pot. màx. <span class="muted">W</span></th>`}</tr></thead>
        <tbody>${sets.map((s, i) => html`<tr key=${i} class=${off[i] ? 'muted' : ''}>
          <td><input type="checkbox" checked=${!off[i]} onChange=${(e) => setOff({ ...off, [i]: !e.currentTarget.checked })} aria-label=${`Importa la sèrie ${i + 1}`} /></td>
          <td>${i + 1}</td>
          ${isJump
            ? html`<td class="num">${s.reps}</td><td class="num">${U.fmt(s.h, 1)}</td><td class="num">${s.reps > 1 ? U.fmt(s.hmean, 1) : '—'}</td><td class="num">${s.rsi != null ? U.fmtFixed(s.rsi, 2) : '—'}</td>`
            : html`<td class="num">${s.kg != null ? U.fmt(s.kg, 1) : '—'}</td><td class="num">${s.reps}</td><td class="num">${U.fmtFixed(s.v1, 2)}</td><td class="num">${s.vlast != null ? U.fmtFixed(s.vlast, 2) : '—'}</td><td class="num">${s.vl != null && s.reps > 1 ? `${U.fmt(s.vl, 0)} %` : '—'}</td><td class="num">${s.pmax != null ? U.fmt(s.pmax, 0) : '—'}</td>`}
        </tr>`)}</tbody>
      </table></div>`}
    </div>`;
  } else if (!res.error && mode === 'jumps') {
    const known = new Set((existing || []).filter(Boolean));
    const all = ADR.jumps(recs);
    const isOn = (x) => (off[x.id] === undefined ? !known.has(x.src) : !off[x.id]);
    const chosen = all.filter(isOn);
    items = chosen;
    canApply = items.length > 0;
    applyLabel = items.length ? `Importa ${U.plural(items.length, 'intent', 'intents')}` : 'Importa';
    const fmtWhen = (w) => (w ? `${U.fmtDate(w.slice(0, 10))}${w.length > 10 ? ` · ${w.slice(11)}` : ''}` : '—');
    body = html`<div>
      ${all.length === 0 && html`<p class="muted">No hi ha salts per a aquesta persona i aquest dia.</p>`}
      ${all.length > 0 && html`<div class="table-wrap"><table class="table adr-table">
        <thead><tr><th><span class="sr-only">Importa</span></th><th>Data</th><th>Prova</th><th class="num">Altura <span class="muted">cm</span></th><th class="num">Vol <span class="muted">ms</span></th><th class="num">Contacte <span class="muted">ms</span></th><th class="num">RSI</th></tr></thead>
        <tbody>${all.map((x) => html`<tr class=${known.has(x.src) ? 'muted' : ''}>
          <td><input type="checkbox" checked=${isOn(x)} onChange=${(e) => setOff({ ...off, [x.id]: !e.currentTarget.checked })} aria-label=${`Importa el salt del ${fmtWhen(x.when)}`} /></td>
          <td>${fmtWhen(x.when)}${known.has(x.src) ? ' · ja importat' : ''}</td><td>${x.type}</td><td class="num">${x.height}</td><td class="num">${x.flight || '—'}</td><td class="num">${x.contact || '—'}</td><td class="num">${x.rsi || '—'}</td></tr>`)}</tbody>
      </table></div>`}
    </div>`;
  }

  // Mapatge de columnes (sempre es pot revisar; s'obre sol si no s'ha entès el fitxer).
  const cols = (res.headers || []).map((h, i) => ({ v: String(i), label: `${String.fromCharCode(65 + (i % 26))} · ${String(h).trim() || '(buida)'}` }));
  const labelOf = (k) => (ADR_COLUMNS.find((c) => c.key === k) || {}).label || k;
  const mapping = html`<details class="adr-map" open=${!!res.error || !(res.records || []).length}>
    <summary>Columnes del fitxer</summary>
    <p class="muted small">L'app reconeix les columnes pel nom. Si alguna no és bona, tria quina columna correspon a cada camp (se'n recordarà per al pròxim fitxer igual).</p>
    <div class="adr-map-grid">${ADR_MAP_FIELDS[need].map((k) => html`<label class="adr-map-row"><span>${labelOf(k)}</span>
      <${Select} value=${res.map && res.map[k] != null ? String(res.map[k]) : ''} onValue=${setMap(k)} placeholder="— cap —" options=${cols} ariaLabel=${labelOf(k)} /></label>`)}</div>
  </details>`;

  const wrongKind = !res.error && ((mode === 'jumps' && !res.hasJumps) || ((mode === 'lvp' || (mode === 'sets' && !res.hasJumps)) && !res.hasEncoder));
  return html`<${Dialog} title=${mode === 'jumps' ? 'Importa salts de l\'ADR Jumping' : mode === 'sets' ? 'Importa sèries de l\'ADR' : 'Importa de l\'ADR Encoder'} wide=${true} onClose=${onClose} footer=${html`
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" disabled=${!canApply} onClick=${() => onApply(items)}>${applyLabel}</${Btn}>`}>
    <p class="muted small">Fitxer: ${fileName}${!res.error ? ` · ${U.plural(res.records.length, 'fila', 'files')} amb dades` : ''}</p>
    ${res.error && html`<p class="adr-error"><${Icon} name="alert" size=${15} /> ${res.error}</p>`}
    ${wrongKind && html`<p class="adr-error"><${Icon} name="alert" size=${15} /> ${mode === 'jumps' ? 'Aquest fitxer no té salts (altura o temps de vol).' : 'Aquest fitxer no té velocitats de l\'encoder.'} Revisa les columnes de sota o tria un altre fitxer.</p>`}
    ${hasName && html`<div class="adr-person">
      ${names.length > 0
        ? html`<p>He trobat <strong>${names.join(' · ')}</strong> al fitxer${res.people.length > names.length ? ` i no n'importo les altres ${U.plural(res.people.length - names.length, 'persona', 'persones')}` : ''}.
          ${res.people.length > names.length && html` <button type="button" class="link" onClick=${() => setPerson('?')}>No és ell? Tria un altre nom</button>`}</p>`
        : html`<p>No he trobat el nom de <strong>${person_}</strong> al fitxer. Tria quina persona és (les dades dels altres no es desen enlloc):</p>`}
      ${(names.length === 0 || person === '?') && html`<${Select} value=${person && person !== '?' ? person : ''} onValue=${(v) => setPerson(v)} placeholder="Tria el nom del fitxer…" options=${res.people.map((x) => x.name)} ariaLabel="Nom al fitxer de l'ADR" />`}
    </div>`}
    ${hasName && names.length === 0 && person0 === '' ? null : html`
      ${(res.dates || []).length > 1 || (res.dates || []).some((d) => !d.date) ? html`<label class="adr-opt adr-day"><span class="field-label">Dia</span>
        <${Select} value=${dayVal} onValue=${(v) => { setDay(v); setOff({}); setCfg({}); }} options=${[{ v: '', label: 'Tots els dies' }, ...res.dates.filter((d) => d.date).map((d) => ({ v: d.date, label: `${fmtDay(d.date)} · ${U.plural(d.n, 'fila', 'files')}` }))]} ariaLabel="Dia" /></label>` : null}
      ${body}`}
    ${mapping}
    <p class="muted small">Del fitxer només es desa el que marquis. Les dades d'altres persones no es guarden enlloc.</p>
  </${Dialog}>`;
}
