/* EON Life · triar exercicis per carpetes: grup muscular (tronc superior, tronc inferior, core…) → múscul →
   exercici → material del centre amb què es fa. També els desplegables de múscul i de material. */

// Músculs d'un exercici: el principal i els altres implicats.
function exerciseMuscles(e) {
  return [...new Set([e && e.gm, ...((e && e.muscles) || [])].filter(Boolean))];
}

// Carpetes d'una llista d'exercicis: zona → subcarpeta (múscul o, a «Cos sencer i altres», categoria) → exercicis.
// Un exercici surt a la carpeta de cada múscul que treballa.
function exerciseFolders(list) {
  const zones = MUSCLE_ZONES.map((z) => ({ ...z, folders: {}, ids: new Set() }));
  const put = (z, name, e) => { (z.folders[name] = z.folders[name] || []).push(e); z.ids.add(e.id); };
  for (const e of list) {
    const ms = exerciseMuscles(e);
    let placed = false;
    for (const z of zones) {
      if (z.key === 'tot') continue;
      for (const m of ms) if (z.muscles.includes(m)) { put(z, m, e); placed = true; }
    }
    if (!placed) put(zones.find((z) => z.key === 'tot'), ms.find((m) => muscleZone(m) === 'tot' && m !== 'Global') || e.cat || 'Altres', e);
  }
  for (const z of zones) {
    const order = (name) => { const i = z.muscles.indexOf(name); return i < 0 ? 99 : i; };
    z.list = Object.keys(z.folders).sort((a, b) => order(a) - order(b) || a.localeCompare(b, 'ca'))
      .map((name) => ({ name, label: muscleLabel(name), items: U.sortBy(z.folders[name], (e) => `${e.family || 'ZZ'}#${String(U.num(e.level) ?? 9)}#${e.name}`) }));
    z.count = z.ids.size;
  }
  return zones.filter((z) => z.count);
}

function openExerciseBrowser({ block, title, onPick, onBlank }) {
  let close = null;
  close = UI.open(() => html`<${ExerciseBrowser} block=${block} title=${title}
    onPick=${(e, mat) => { close(); onPick(e, mat); }} onBlank=${() => { close(); onBlank(); }} onClose=${() => close()} />`,
  { onDismiss: () => close() });
}

function ExerciseBrowser({ block, title, onPick, onBlank, onClose }) {
  const [all, setAll] = useState(false);
  const [q, setQ] = useState('');
  const [zone, setZone] = useState(null);
  const [folder, setFolder] = useState(null);
  const [ex, setEx] = useState(null);
  // A Força principal i Accessoris es veuen els exercicis de tots dos blocs (són els de força).
  const scope = all ? null : ['for', 'acc'].includes(block) ? ['for', 'acc'] : [block];
  const pool = Store.exercises().filter((e) => !scope || scope.includes(e.block));
  const zones = exerciseFolders(pool);
  const z = zone && zones.find((x) => x.key === zone);
  const f = z && folder && z.list.find((x) => x.name === folder);
  const nq = U.norm(q.trim());
  const found = nq ? Store.exercises().filter((e) => (!scope || scope.includes(e.block) || nq.length > 2)
    && U.norm(`${e.name} ${e.cat} ${e.family || ''} ${e.material} ${(e.materials || []).join(' ')} ${exerciseMuscles(e).map(muscleLabel).join(' ')}`).includes(nq)).slice(0, 60) : null;
  const choose = (e) => ((e.materials || []).length > 1 ? setEx(e) : onPick(e, e.material || ''));
  const crumb = [
    { label: 'Grups musculars', go: () => { setZone(null); setFolder(null); setEx(null); } },
    z && { label: z.label, go: () => { setFolder(null); setEx(null); } },
    f && { label: f.label, go: () => setEx(null) },
    ex && { label: ex.name },
  ].filter(Boolean);
  const back = () => (ex ? setEx(null) : folder ? setFolder(null) : setZone(null));
  const row = (e) => html`<button type="button" class="xb-ex" onClick=${() => choose(e)}>
    <span class="xb-ex-name">${e.name}${e.level && html` <span class="lvl-chip">N${e.level}</span>`}</span>
    <span class="xb-ex-meta">${[exerciseMuscles(e).map(muscleLabel).join(' · '), Calc.presc(e)].filter(Boolean).join(' — ')}</span>
    <span class="xb-ex-mat">${(e.materials || []).length > 1 ? `${e.materials.length} materials` : e.material || ''}</span>
  </button>`;

  return html`<${Dialog} wide=${true} title=${title || `Afegeix exercici · ${blockName(block)}`} onClose=${onClose} footer=${html`
    <${Btn} variant="ghost" icon="edit" onClick=${onBlank}>Exercici en blanc (l'escric jo)</${Btn}>
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>`}>
    <div class="xb-top">
      <label class="search"><${Icon} name="search" size=${17} />
        <input class="input" type="search" placeholder="Cerca per nom, múscul o material…" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Cerca exercicis" /></label>
      <label class="check"><input type="checkbox" checked=${all} onChange=${(e) => { setAll(e.currentTarget.checked); setZone(null); setFolder(null); }} /> Tots els blocs</label>
    </div>
    ${found && !ex ? html`<div class="xb-list">${found.length ? found.map(row) : html`<p class="muted">Cap exercici coincideix. Pots afegir-lo en blanc i escriure'l.</p>`}</div>`
      : html`<nav class="xb-crumbs" aria-label="Carpetes">
          ${(zone || ex) && html`<button type="button" class="link xb-back" onClick=${back}><${Icon} name="back" size=${15} />Enrere</button>`}
          ${found ? html`<strong>${ex.name}</strong>` : crumb.map((c, i) => html`${i > 0 && html`<span class="xb-sep">›</span>`}${c.go && i < crumb.length - 1 ? html`<button type="button" class="link" onClick=${c.go}>${c.label}</button>` : html`<strong>${c.label}</strong>`}`)}
        </nav>
        ${ex ? html`<div class="xb-mat">
            <p class="muted">${[exerciseMuscles(ex).map(muscleLabel).join(' · '), Calc.presc(ex)].filter(Boolean).join(' — ')}</p>
            <h3 class="h3">Amb quin material?</h3>
            <div class="xb-folders">${ex.materials.map((m, i) => html`<button type="button" class="xb-folder xb-matbtn" onClick=${() => onPick(ex, m)}>
              <${Icon} name="dumbbell" size=${18} /><span class="xb-folder-name">${m}</span>${i === 0 && html`<span class="xb-folder-n">per defecte</span>`}</button>`)}</div>
          </div>`
        : f ? html`<div class="xb-list">${f.items.map(row)}</div>`
        : z ? html`<div class="xb-folders">${z.list.map((x) => html`<button type="button" class="xb-folder" onClick=${() => setFolder(x.name)}>
            <${Icon} name="folder" size=${18} /><span class="xb-folder-name">${x.label}</span><span class="xb-folder-n">${x.items.length}</span></button>`)}</div>`
        : html`<div class="xb-zones">${zones.map((x) => html`<button type="button" class=${`xb-zone xb-${x.key}`} onClick=${() => setZone(x.key)}>
            <${Icon} name="folder" size=${22} />
            <span class="xb-zone-name">${x.label}</span>
            <span class="xb-zone-sub">${x.list.slice(0, 6).map((y) => y.label).join(' · ')}${x.list.length > 6 ? '…' : ''}</span>
            <span class="xb-folder-n">${U.plural(x.count, 'exercici', 'exercicis')}</span></button>`)}</div>`}`}
  </${Dialog}>`;
}

// Desplegable de múscul principal, agrupat per zona.
function MuscleSelect({ id, value, onValue, ariaLabel = 'Grup muscular' }) {
  const known = MUSCLE_ZONES.some((z) => z.muscles.includes(value));
  return html`<select id=${id} class="input select" value=${value || ''} aria-label=${ariaLabel} onChange=${(e) => onValue(e.currentTarget.value)}>
    <option value="">—</option>
    ${value && !known && html`<option value=${value}>${value}</option>`}
    ${MUSCLE_ZONES.map((z) => html`<optgroup label=${z.label}>${z.muscles.map((m) => html`<option value=${m}>${muscleLabel(m)}</option>`)}</optgroup>`)}
  </select>`;
}

// Desplegable de material: primer els de l'exercici, després el material del centre i el petit material.
// «Un altre…» permet escriure'n un de nou (i afegir-lo al material del centre).
function MaterialSelect({ id, value, onValue, exercise, ariaLabel = 'Material' }) {
  const { center, other } = Store.materials();
  const mine = ((exercise && exercise.materials) || []).filter(Boolean);
  const all = [...mine, ...center, ...other];
  const onChange = async (e) => {
    const v = e.currentTarget.value;
    if (v !== '__altre') { onValue(v); return; }
    e.currentTarget.value = value || '';
    const name = await UI.prompt({ title: 'Un altre material', label: 'Nom del material', placeholder: 'p. ex. Trineu' });
    if (!name || !name.trim()) return;
    const n = name.trim();
    if (!center.includes(n) && !other.includes(n)) Store.saveSettings({ materials: [...center, n] });
    onValue(n);
  };
  return html`<select id=${id} class="input select" value=${value || ''} aria-label=${ariaLabel} onChange=${onChange}>
    <option value="">—</option>
    ${value && !all.includes(value) && html`<option value=${value}>${value}</option>`}
    ${mine.length > 0 && html`<optgroup label="Per a aquest exercici">${mine.map((m) => html`<option value=${m}>${m}</option>`)}</optgroup>`}
    <optgroup label="Material del centre">${center.filter((m) => !mine.includes(m)).map((m) => html`<option value=${m}>${m}</option>`)}</optgroup>
    <optgroup label="Petit material">${other.filter((m) => !mine.includes(m)).map((m) => html`<option value=${m}>${m}</option>`)}</optgroup>
    <option value="__altre">Un altre…</option>
  </select>`;
}
