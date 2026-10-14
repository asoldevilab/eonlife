/* EON Life · material de la sala: avís al capdamunt de la sessió (i a l'inici) amb tot el material que cal tenir a punt,
   per comprovar-ho d'un cop d'ull i col·locar-lo per la sala abans de començar. */

// Marca o desmarca un material com a preparat a totes les sessions donades que el fan servir.
function setMaterialReady(sessions, name, on) {
  for (const s of sessions) {
    Store.update('sessions', s.id, (x) => {
      const prep = { ...(x.prep || {}) };
      if (on) prep[name] = true; else delete prep[name];
      x.prep = prep;
    });
  }
}

// sessions: una o diverses; title: encapçalament; tone: 'today' ressalta l'avís (el dia de la sessió).
function MaterialPrep({ sessions, title = 'Material per a la sessió', tone, open: openProp, showWho }) {
  const list = [].concat(sessions || []);
  const items = Calc.sessionMaterial(list);
  if (!items.length) return null;
  const done = items.filter((m) => m.checked).length;
  const all = done === items.length;
  const byId = (m) => list.filter((s) => m.sessions.includes(s.id));
  const who = (s) => { const p = Store.get('patients', s.patientId); return p ? (p.firstName || U.fullName(p)) : ''; };
  const toggle = (m) => setMaterialReady(byId(m), m.name, !m.checked);
  const all2 = () => { for (const m of items) setMaterialReady(byId(m), m.name, !all); };
  return html`<details class=${U.cls('card matprep no-print', tone === 'today' && 'matprep-today', all && 'matprep-ok')} open=${openProp !== false}>
    <summary class="matprep-head">
      <span class="matprep-ic" aria-hidden="true"><${Icon} name=${all ? 'check' : 'dumbbell'} size=${18} /></span>
      <span class="matprep-title">${title}</span>
      <span class="matprep-count" aria-live="polite">${all ? 'Tot a punt' : `${done} / ${items.length} preparat`}</span>
    </summary>
    <p class="matprep-sum">${items.map((m) => m.name.replace(/ \(.*\)$/, '')).join(' · ')}</p>
    <ul class="matprep-list">${items.map((m) => html`<li>
      <label class=${U.cls('matprep-row', m.checked && 'on')}>
        <input type="checkbox" checked=${m.checked} onChange=${() => toggle(m)} aria-label=${`${m.name}: preparat`} />
        <span class="matprep-name">${m.name}</span>
        <span class="matprep-ex">${m.exercises.slice(0, 4).join(' · ')}${m.exercises.length > 4 ? ` · +${m.exercises.length - 4}` : ''}${showWho && m.sessions.length > 1 ? ` · ${m.sessions.length} sessions` : ''}</span>
      </label>
    </li>`)}</ul>
    <div class="matprep-foot"><${Btn} size="sm" variant=${all ? 'ghost' : 'primary'} icon=${all ? 'refresh' : 'check'} onClick=${all2}>${all ? 'Desmarca-ho tot' : 'Tot a punt'}</${Btn}></div>
  </details>`;
}

// Avís de l'inici amb el material de les sessions d'avui que encara no s'han fet.
function MaterialToday({ sessions }) {
  const pend = sessions.filter((s) => s.status !== 'feta');
  if (!pend.length || !Calc.sessionMaterial(pend).length) return null;
  return html`<${MaterialPrep} sessions=${pend} tone="today" title=${`Material d'avui · ${U.plural(pend.length, 'sessió', 'sessions')}`} showWho=${true} />`;
}
