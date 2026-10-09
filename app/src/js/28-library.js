/* EON Life · biblioteca: exercicis per bloc i plantilles (de bloc i de sessió). */

function LibraryView({ tab = 'exercicis' }) {
  return html`<div class="page">
    <header class="page-head">
      <div><p class="eyebrow">Metodologia EON · 6 blocs</p><h1 class="h1">Biblioteca</h1></div>
      <div class="page-actions">
        ${tab === 'exercicis' ? html`<${Btn} variant="primary" icon="plus" onClick=${() => openExercise(null)}>Nou exercici</${Btn}>`
          : tab === 'metodes' ? html`<${Btn} variant="primary" icon="plus" onClick=${() => openMethod(null)}>Nou mètode</${Btn}>`
          : html`<${Menu} variant="primary" icon="plus" label="Nova plantilla" title="Nova plantilla" items=${[
            { label: 'Plantilla de sessió (6 blocs)', icon: 'layers', onClick: () => newTemplate('session') },
            { sep: true },
            ...BLOCKS.map((b) => ({ label: `Plantilla de ${blockName(b.key).toLowerCase()}`, icon: 'plus', onClick: () => newTemplate('block', b.key) })),
          ]} />`}
      </div>
    </header>
    <${Tabs} active=${tab} onChange=${(t) => go('biblioteca', t)} tabs=${[
      { id: 'exercicis', label: 'Exercicis', count: Store.exercises().length },
      { id: 'plantilles', label: 'Plantilles', count: Store.templates().filter((t) => t.kind === 'block' || t.kind === 'session').length },
      { id: 'metodes', label: 'Mètodes', count: Store.methods().length },
    ]} />
    ${tab === 'exercicis' ? html`<${ExerciseList} />` : tab === 'metodes' ? html`<${MethodList} />` : html`<${TemplateList} />`}
  </div>`;
}

function ExerciseList() {
  const [q, setQ] = useState('');
  const [blk, setBlk] = useState('');
  const [view, setView] = useState('llista');
  const nq = U.norm(q);
  const [own, setOwn] = useState(false);
  const all = Store.exercises().filter((e) => (!own || isOwnExercise(e)) && (!blk || e.block === blk) && (!nq || U.norm(`${e.code || ''} ${e.name} ${e.tg || ''} ${e.cat} ${e.family || ''} ${e.material} ${(e.materials || []).join(' ')} ${e.gm}`).includes(nq)));
  return html`<section class="card">
    <details class="libhelp">
      <summary><${Icon} name="info" size=${16} />Com afegir els vostres exercicis</summary>
      <ol>
        <li><strong>Biblioteca › Nou exercici</strong> (o, dins d'una sessió, <em>Afegeix exercici</em> › una carpeta › <em>Nou exercici en aquesta carpeta</em>).</li>
        <li>Nom, <strong>bloc</strong> (1 a 6), <strong>múscul principal</strong> (i els altres que treballa) i el <strong>material</strong> amb què es pot fer. Al formulari veuràs en directe a quines carpetes sortirà.</li>
        <li>Si en teniu vídeo, enganxeu l'enllaç de YouTube: en serà la miniatura. Si no, tria un dibuix o puja una foto d'un entrenador.</li>
        <li>Opcional: família i nivell (per als botons ▲ ▼ de progressió) i la prescripció per defecte.</li>
      </ol>
      <p class="muted small">Surt a <em>Afegeix exercici</em> a la carpeta del seu múscul, a la del material, i a <strong>Els nostres exercicis</strong> (per bloc). Aquí, la casella <em>Només els nostres</em> us els ensenya sols. Amb Microsoft 365 es desen a l'Excel del centre i els veu tot l'equip.</p>
    </details>
    <div class="filters">
      <label class="search"><${Icon} name="search" size=${17} />
        <input class="input" type="search" placeholder="Cerca exercicis…" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Cerca exercicis" /></label>
      <label class="check"><input type="checkbox" checked=${own} onChange=${(e) => setOwn(e.currentTarget.checked)} /> Només els nostres (${Store.exercises().filter(isOwnExercise).length})</label>
      <${Seg} value=${blk} onValue=${setBlk} ariaLabel="Bloc" options=${[{ v: '', label: 'Tots' }, ...BLOCKS.map((b) => ({ v: b.key, label: `${b.num}. ${blockName(b.key)}` }))]} allowEmpty=${false} class="seg-wrap" />
      <${Seg} value=${view} onValue=${setView} ariaLabel="Vista" allowEmpty=${false}
        options=${[{ v: 'eon', label: 'Exercicis EON', title: 'Els vostres exercicis gravats, per blocs: 1.0, 1.1, 1.2…' }, { v: 'llista', label: 'Llista' }, { v: 'graella', label: 'Miniatures', title: 'Tots els exercicis amb el dibuix o la foto' }, { v: 'musculs', label: 'Per grup muscular', title: 'Tren superior, tren inferior i core, múscul per múscul' },
          { v: 'progressions', label: 'Progressions', title: 'Cada patró de més fàcil (nivell 1) a més difícil (nivell 5)' }]} />
    </div>
    ${view === 'eon' ? html`<${EonList} all=${all} blk=${blk} q=${nq} />`
      : view === 'progressions' ? html`<${ProgressionList} all=${all} />`
      : view === 'musculs' ? html`<${MuscleFolders} all=${all} />`
      : BLOCKS.filter((b) => all.some((e) => e.block === b.key)).map((b) => html`<div class="libgroup">
      <div class="libgroup-head"><${BlockTag} k=${b.key} /><span class="muted">${U.plural(all.filter((e) => e.block === b.key).length, 'exercici', 'exercicis')}</span></div>
      ${view === 'graella' ? html`<div class="xb-grid xb-grid-lib">${all.filter((e) => e.block === b.key).map((e) => html`<${ExCard} e=${e} onClick=${() => openExercise(e)} sub=${e.material || ''} />`)}</div>`
      : html`<div class="exlist">${all.filter((e) => e.block === b.key).map((e) => html`<button type="button" class="exrow" onClick=${() => openExercise(e)}>
        <${ExThumb} ex=${e} size=${44} />
        <span class="exrow-name"><${CodeChip} e=${e} />${e.name}${e.level && html` <span class="lvl-chip">N${e.level}</span>`}${isOwnExercise(e) && html` <span class="own-chip">Nostre</span>`}${e.video && html` <${Icon} name="video" size=${14} />`}</span>
        <span class="exrow-meta">${[e.family || e.cat, e.material, e.gm].filter(Boolean).join(' · ')}</span>
        <span class="exrow-rx">${Calc.presc(e)}</span>
      </button>`)}</div>`}
    </div>`)}
    ${!all.length && view !== 'eon' && html`<${Empty} icon="search" title="Cap exercici coincideix" text="Si no és a la biblioteca, crea'l: hi pots posar el vídeo de YouTube i en serà la miniatura.">
      <${Btn} variant="primary" icon="plus" onClick=${() => openExercise(null, { name: q.trim(), block: blk || 'for' })}>${q.trim() ? `Crea «${q.trim()}»` : 'Nou exercici'}</${Btn}>
    </${Empty}>`}
  </section>`;
}

// Exercicis EON: els gravats pel centre, una carpeta per bloc amb els números 1.0, 1.1, 1.2… i el botó per afegir el següent.
function EonList({ all, blk, q }) {
  const coded = Store.exercises().filter((e) => Calc.codeKey(e.code));
  const shown = new Set(all.map((e) => e.id));
  return html`<div class="stack">
    <p class="muted small">Cada bloc té els seus números: 1.0, 1.1, 1.2… de mobilitat; 2.0, 2.1… d'activació, i així fins al 6 (tornada a la calma).
      Enganxeu l'enllaç del vídeo de YouTube (públic o «no llistat») a cada exercici: en serà la miniatura i es podrà veure a la sessió.</p>
    ${BLOCKS.filter((b) => !blk || b.key === blk).map((b) => {
      const items = coded.filter((e) => e.block === b.key && shown.has(e.id)).sort(Calc.byCode);
      const next = Calc.nextCode(coded, b.num);
      if (q && !items.length) return null;
      return html`<div class="libgroup eon-group">
        <div class="libgroup-head"><${BlockTag} k=${b.key} /><span class="muted">${U.plural(items.length, 'exercici', 'exercicis')}</span>
          <span class="grow"></span>
          <${Btn} size="sm" icon="plus" onClick=${() => openExercise(null, { block: b.key, code: next, name: next, cat: 'Exercicis EON', materials: [] })}>Afegeix el ${next}</${Btn}></div>
        ${items.length ? html`<div class="xb-grid xb-grid-lib">${items.map((e) => html`<${ExCard} e=${e} onClick=${() => openExercise(e)} sub=${e.video ? 'Amb vídeo' : 'Sense vídeo'} />`)}</div>`
          : html`<p class="muted small">Encara no n'hi ha cap. El primer serà el ${next}.</p>`}
      </div>`;
    })}
  </div>`;
}

// Carpetes per grup muscular: tren superior, tren inferior, core i cos sencer; dins, cada múscul.
function MuscleFolders({ all }) {
  return html`<div class="stack">${[...exerciseFolders(all), materialFolders(all)].map((z) => html`<div class="libgroup">
    <div class="libgroup-head"><strong>${z.label}</strong><span class="muted">${U.plural(z.count, 'exercici', 'exercicis')}</span></div>
    ${z.list.map((f) => html`<details class="mfolder">
      <summary><${Icon} name="folder" size=${16} /><span class="mfolder-name">${f.label}</span><span class="muted">${f.items.length}</span></summary>
      <div class="exlist">${f.items.map((e) => html`<button type="button" class="exrow" onClick=${() => openExercise(e)}>
        <${ExThumb} ex=${e} size=${44} />
        <span class="exrow-name"><${CodeChip} e=${e} />${e.name}${e.level && html` <span class="lvl-chip">N${e.level}</span>`}</span>
        <span class="exrow-meta">${[blockName(e.block), (e.materials || [e.material]).filter(Boolean).join(' · ')].filter(Boolean).join(' — ')}</span>
        <span class="exrow-rx">${Calc.presc(e)}</span>
      </button>`)}</div>
    </details>`)}
  </div>`)}</div>`;
}

// Progressions: cada família (patró) amb els exercicis del nivell 1 (inicial) al 5 (expert).
// A la sessió, ▲ i ▼ canvien l'exercici pel del nivell següent o anterior.
function ProgressionList({ all }) {
  const ids = new Set(all.map((e) => e.id));
  const fams = Store.families();
  const blockOf = (list) => { const k = {}; for (const e of list) k[e.block] = (k[e.block] || 0) + 1; return Object.keys(k).sort((a, b) => k[b] - k[a])[0]; };
  const rows = Object.entries(fams)
    .map(([name, list]) => ({ name, block: blockOf(list), list: Store.ladder(name) }))
    .filter((r) => r.list.some((e) => ids.has(e.id)));
  const loose = all.filter((e) => !e.family);
  return html`<div class="stack">
    <p class="muted small">Cada patró va del nivell 1 (inicial) al 5 (expert). A la sessió, els botons ▲ ▼ de cada exercici el canvien pel nivell següent o l'anterior. Per afegir un exercici a una progressió, obre'l i tria'n la família i el nivell.</p>
    ${BLOCKS.filter((b) => rows.some((r) => r.block === b.key)).map((b) => html`<div class="libgroup">
      <div class="libgroup-head"><${BlockTag} k=${b.key} /><span class="muted">${U.plural(rows.filter((r) => r.block === b.key).length, 'progressió', 'progressions')}</span></div>
      ${rows.filter((r) => r.block === b.key).map((r) => html`<div class="ladder">
        <div class="ladder-name">${r.name}</div>
        <ol class="ladder-steps">${r.list.map((e) => html`<li><button type="button" class=${U.cls('ladder-step', `lv-${e.level}`)} onClick=${() => openExercise(e)}>
          <${ExThumb} ex=${e} size=${34} /><span class="ladder-n">N${e.level || '?'}</span><span class="ladder-ex">${e.name}</span></button></li>`)}</ol>
      </div>`)}
    </div>`)}
    ${loose.length > 0 && html`<p class="muted small">${U.plural(loose.length, 'exercici encara no té', 'exercicis encara no tenen')} família de progressió.</p>`}
  </div>`;
}

// ex: exercici de la biblioteca (o null per a un de nou); init: dades de sortida d'un exercici nou (p. ex. el nom cercat).
function openExercise(ex, init) {
  let close = null;
  close = UI.open(() => html`<${ExerciseDialog} ex=${ex} init=${init} onClose=${() => close()} />`);
}

function ExerciseDialog({ ex, init, onClose }) {
  const [f, setF] = useState(ex ? { ...ex } : { id: U.uid('X'), block: 'for', name: '', cat: '', family: '', level: '', material: '', gm: '', cont: '', pos: '', lat: 'BL', sets: '', reps: '', load: '', intensity: '', rest: '', tempo: '', cues: '', video: '', ...(init || {}) });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const save = () => {
    if (!f.name.trim()) { UI.toast('Escriu el nom de l\'exercici.', 'bad'); return; }
    if (!f.gm && !(f.muscles || []).length && !Calc.codeKey(f.code)) { UI.toast('Tria el múscul principal: és la carpeta on sortirà l\'exercici.', 'bad'); return; }
    const rec = { ...f, name: f.name.trim() };
    delete rec.seed;
    Store.put('exercises', rec, { immediate: true });
    UI.toast(ex ? 'Exercici actualitzat.' : 'Exercici afegit a la biblioteca.');
    onClose();
  };
  const remove = async () => {
    if (!(await UI.confirm({ title: `Treure «${ex.name}» de la biblioteca?`, text: 'Les sessions que ja el tenen no canvien.', ok: 'Treu', danger: true }))) return;
    Store.remove('exercises', ex.id);
    onClose();
  };
  return html`<${Dialog} wide=${true} title=${ex ? 'Exercici' : 'Nou exercici'} onClose=${onClose} footer=${html`
    ${ex && html`<${Btn} variant="ghost" icon="trash" onClick=${remove}>Treu de la biblioteca</${Btn}>`}
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="check" onClick=${save}>Desa</${Btn}>`}>
    <${ThumbEditor} f=${f} setF=${setF} />
    <div class="explaces" aria-live="polite"><${Icon} name="folder" size=${16} /><div><strong>On sortirà a «Afegeix exercici»</strong>
      ${f.gm || (f.muscles || []).length || f.material ? html`<ul>${exercisePlaces({ ...f, id: f.id }).map((x) => html`<li>${x}</li>`)}</ul>`
        : html`<p class="muted small">Tria el bloc, el múscul principal i el material: aquí veuràs a quines carpetes surt.</p>`}</div></div>
    <div class="form-grid">
      <${Field} label="Nom" id="ex-name" wide=${true}><${TextInput} id="ex-name" value=${f.name} onValue=${set('name')} autoFocus=${!ex} /></${Field}>
      <${Field} label="Nom a l'app de Technogym" id="ex-tg" wide=${true}><${TextInput} id="ex-tg" value=${f.tg} onValue=${set('tg')} placeholder="Si és d'un material Technogym, el nom que hi surt (per trobar-lo ràpid)" /></${Field}>
      <${Field} label="Vídeo de demostració" id="ex-video" wide=${true} hint="Enllaç de YouTube (públic o «no llistat») o d'un vídeo. La miniatura serà la imatge del vídeo.">
        <${TextInput} id="ex-video" value=${f.video} onValue=${set('video')} placeholder="https://youtu.be/…" /></${Field}>
      <${Field} label="Codi EON" id="ex-code" hint="Per als exercicis gravats pel centre: bloc i número (1.3 = mobilitat, número 3). Deixeu-ho buit per a la resta.">
        <${TextInput} id="ex-code" value=${f.code} placeholder="p. ex. 1.3" onValue=${(v) => {
          const k = Calc.codeKey(v);
          const b = k && BLOCKS.find((x) => x.num === k[0]);
          setF({ ...f, code: v.trim(), ...(b ? { block: b.key } : {}) });
        }} /></${Field}>
      <${Field} label="Bloc" id="ex-block" wide=${true}><${Seg} value=${f.block} onValue=${set('block')} allowEmpty=${false} ariaLabel="Bloc" class="seg-wrap" options=${BLOCKS.map((b) => ({ v: b.key, label: `${b.num}. ${blockName(b.key)}` }))} /></${Field}>
      <${Field} label="Categoria / patró" id="ex-cat"><${TextInput} id="ex-cat" value=${f.cat} onValue=${set('cat')} list=${`focus-${f.block}`} placeholder="p. ex. Dominant de genoll" /></${Field}>
      <${Field} label="Material per defecte" id="ex-mat"><${MaterialSelect} id="ex-mat" value=${f.material} exercise=${f} onValue=${(v) => setF({ ...f, material: v, materials: [...new Set([v, ...(f.materials || [])].filter(Boolean))] })} /></${Field}>
      <${Field} label="Múscul principal" id="ex-gm"><${MuscleSelect} id="ex-gm" value=${f.gm} onValue=${set('gm')} /></${Field}>
      <${Field} label="Contracció" id="ex-cont"><${Select} id="ex-cont" value=${f.cont} onValue=${set('cont')} options=${OPT.cont.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></${Field}>
      <${Field} label="Posició" id="ex-pos"><${Select} id="ex-pos" value=${f.pos} onValue=${set('pos')} options=${OPT.pos.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></${Field}>
      <${Field} label="Lateralitat" id="ex-lat"><${Select} id="ex-lat" value=${f.lat} onValue=${set('lat')} options=${OPT.lat.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></${Field}>
    </div>
    <h3 class="h3 mt">Altres músculs implicats</h3>
    <div class="chips">${MUSCLE_ZONES.flatMap((z) => z.muscles).filter((m) => m !== f.gm).map((m) => html`<${Chip} on=${(f.muscles || []).includes(m)}
      onClick=${() => setF({ ...f, muscles: (f.muscles || []).includes(m) ? f.muscles.filter((x) => x !== m) : [...(f.muscles || []), m] })}>${muscleLabel(m)}</${Chip}>`)}</div>
    <h3 class="h3 mt">Material amb què es pot fer</h3>
    <p class="muted small">Surt quan tries l'exercici a la sessió («Amb quin material?»).</p>
    <div class="chips">${[...new Set([...Store.materials().center, ...(f.materials || [])])].map((m) => html`<${Chip} on=${(f.materials || []).includes(m)}
      onClick=${() => setF({ ...f, materials: (f.materials || []).includes(m) ? f.materials.filter((x) => x !== m) : [...(f.materials || []), m] })}>${m}</${Chip}>`)}</div>
    <h3 class="h3 mt">Progressió</h3>
    <div class="form-grid">
      <${Field} label="Família (patró)" id="ex-family" hint="Exercicis del mateix patró, de més fàcil a més difícil (p. ex. Core · antiextensió)">
        <${TextInput} id="ex-family" value=${f.family} onValue=${set('family')} list="family-list" placeholder="p. ex. Squat bilateral" /></${Field}>
      <${Field} label="Nivell" id="ex-level"><${Seg} value=${f.level || ''} onValue=${set('level')} ariaLabel="Nivell"
        options=${OPT.levels.map((o) => ({ v: o.v, label: `N${o.v}`, title: o.label }))} /></${Field}>
    </div>
    ${f.family && html`<p class="muted small">${Store.ladder(f.family).filter((e) => e.id !== f.id).map((e) => `N${e.level} ${e.name}`).join(' → ') || 'Encara no hi ha cap altre exercici en aquesta família.'}</p>`}
    <datalist id="family-list">${Object.keys(Store.families()).sort().map((x) => html`<option value=${x}></option>`)}</datalist>
    <h3 class="h3 mt">Prescripció per defecte</h3>
    <div class="form-grid form-grid-4">
      <${Field} label="Sèries" id="ex-sets"><${TextInput} id="ex-sets" value=${f.sets} onValue=${set('sets')} /></${Field}>
      <${Field} label="Reps / temps" id="ex-reps"><${TextInput} id="ex-reps" value=${f.reps} onValue=${set('reps')} /></${Field}>
      <${Field} label="Intensitat" id="ex-int"><${TextInput} id="ex-int" value=${f.intensity} onValue=${set('intensity')} list="int-list" /></${Field}>
      <${Field} label="Descans" id="ex-rest"><${TextInput} id="ex-rest" value=${f.rest} onValue=${set('rest')} /></${Field}>
    </div>
    <div class="form-grid mt">
      <${Field} label="Consignes" id="ex-cues" wide=${true}><${Area} id="ex-cues" value=${f.cues} onValue=${set('cues')} placeholder="Què ha de sentir o controlar el pacient" /></${Field}>
    </div>
    ${BLOCKS.map((b) => html`<datalist id=${`focus-${b.key}`}>${b.focus.map((x) => html`<option value=${x}></option>`)}</datalist>`)}
  </${Dialog}>`;
}

function TemplateList() {
  const all = Store.templates();
  const sessions = all.filter((t) => t.kind === 'session');
  const blocks = all.filter((t) => t.kind === 'block');
  return html`<div class="stack">
    <section class="card">
      <div class="card-head"><h2 class="h2">Plantilles de sessió</h2><span class="muted">Els 6 blocs d'una sessió tipus</span></div>
      ${sessions.length ? html`<div class="tlist">${sessions.map((t) => html`<button type="button" class="trow-tpl" onClick=${() => go('plantilla', t.id)}>
        <span class="tpl-name">${t.name}</span>
        <span class="tpl-dots">${BLOCKS.map((b) => {
          const n = ((t.blocks || []).find((x) => x.key === b.key) || { items: [] }).items.length;
          return html`<span class=${U.cls('dot', `blk-${b.key}`, n && 'on')} title=${`${blockName(b.key)}: ${n}`}></span>`;
        })}</span>
        <span class="muted">${t.goal || ''}</span>
      </button>`)}</div>` : html`<p class="muted">Encara no n'hi ha. Des de qualsevol sessió: menú › Desa com a plantilla.</p>`}
    </section>
    ${BLOCKS.map((b) => {
      const list = blocks.filter((t) => t.block === b.key);
      return html`<section class="card">
        <div class="card-head"><${BlockTag} k=${b.key} /><span class="muted">${U.plural(list.length, 'plantilla', 'plantilles')}</span></div>
        ${list.length ? html`<div class="tlist">${list.map((t) => html`<button type="button" class="trow-tpl" onClick=${() => go('plantilla', t.id)}>
          <span class="tpl-name">${t.name}</span>
          <span class="muted">${(t.items || []).map((i) => i.name).join(' · ')}</span>
        </button>`)}</div>` : html`<p class="muted">Sense plantilles d'aquest bloc.</p>`}
      </section>`;
    })}
  </div>`;
}

function newTemplate(kind, block) {
  const t = kind === 'session'
    ? { id: U.uid('T'), kind: 'session', name: 'Nova sessió tipus', goal: '', blocks: Store.emptyBlocks() }
    : { id: U.uid('T'), kind: 'block', block, name: `${blockName(block)} · nova`, focus: '', desc: '', items: [] };
  Store.put('templates', t, { immediate: true });
  go('plantilla', t.id);
}

function TemplateEditor({ id }) {
  const t = Store.get('templates', id);
  if (!t) return html`<div class="page"><${Empty} icon="layers" title="No trobo aquesta plantilla"><${Btn} onClick=${() => go('biblioteca', 'plantilles')}>Torna a la biblioteca</${Btn}></${Empty}></div>`;
  const upd = (fn) => Store.update('templates', t.id, fn);
  const set = (k) => (v) => upd((x) => { x[k] = v; });
  const remove = async () => {
    if (!(await UI.confirm({ title: `Eliminar «${t.name}»?`, text: 'Les sessions creades amb aquesta plantilla no canvien.', ok: 'Elimina', danger: true }))) return;
    Store.remove('templates', t.id);
    go('biblioteca', 'plantilles');
  };
  const blocks = t.kind === 'session' ? cloneBlocksKeep(t.blocks) : null;
  return html`<div class="page page-edit">
    <div class="editbar">
      <${Btn} variant="ghost" icon="back" title="Torna a la biblioteca" onClick=${() => go('biblioteca', 'plantilles')} />
      <div class="editbar-title"><strong role="heading" aria-level="1">${t.kind === 'session' ? 'Plantilla de sessió' : `Plantilla · ${blockName(t.block)}`}</strong><span>${t.name}</span></div>
      <${SaveStatus} />
      <${Menu} items=${[{ label: 'Elimina la plantilla', icon: 'trash', danger: true, onClick: remove }]} />
    </div>
    <section class="card">
      <div class="form-grid">
        <${Field} label="Nom de la plantilla" id="tp-name" wide=${true}><${TextInput} id="tp-name" value=${t.name} onValue=${set('name')} /></${Field}>
        ${t.kind === 'session'
          ? html`<${Field} label="Objectiu de la sessió" id="tp-goal" wide=${true}><${TextInput} id="tp-goal" value=${t.goal} onValue=${set('goal')} /></${Field}>`
          : html`<${Field} label="Descripció" id="tp-desc" wide=${true}><${TextInput} id="tp-desc" value=${t.desc} onValue=${set('desc')} placeholder="p. ex. 4 exercicis · 3 × 6 amb RIR 2" /></${Field}>`}
      </div>
    </section>
    ${t.kind === 'session'
      ? blocks.map((b) => html`<${BlockCard} key=${b.key} block=${b} templateMode=${true}
          onChange=${(fn) => upd((x) => { x.blocks = cloneBlocksKeep(x.blocks); const bb = x.blocks.find((y) => y.key === b.key); fn(bb); })} />`)
      : html`<${BlockCard} block=${{ key: t.block, focus: t.focus, groups: t.groups, items: t.items || [] }} templateMode=${true}
          onChange=${(fn) => upd((x) => {
            const bb = { key: x.block, focus: x.focus, groups: x.groups, items: x.items || [] };
            fn(bb);
            x.focus = bb.focus; x.items = bb.items;
            if (bb.groups && bb.groups.length) x.groups = bb.groups; else delete x.groups;
          })} />`}
  </div>`;
}

// Assegura els 6 blocs en ordre sense canviar els identificadors dels exercicis.
function cloneBlocksKeep(blocks) {
  const byKey = Object.fromEntries((blocks || []).map((b) => [b.key, b]));
  return BLOCKS.map((b) => byKey[b.key] || { key: b.key, focus: '', note: '', items: [] });
}

// ── Mètodes d'entrenament: els apunts del centre (què és, com es fa, exemple i fonts) ──
function MethodList() {
  const all = Store.methods();
  const [q, setQ] = useState('');
  const nq = U.norm(q);
  const list = all.filter((t) => !nq || U.norm(`${t.name} ${t.aim} ${t.how} ${t.notes} ${t.source}`).includes(nq));
  const inBlock = (k) => list.filter((t) => (t.blocks || [])[0] === k || (!(t.blocks || []).length && k === 'for'));
  return html`<section class="card">
    <div class="filters">
      <label class="search"><${Icon} name="search" size=${17} />
        <input class="input" type="search" placeholder="Cerca mètodes i apunts…" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Cerca mètodes" /></label>
    </div>
    <p class="muted small">Els mètodes per no fer sempre el mateix: a cada bloc o subbloc de la sessió es pot triar el mètode i surt a la fitxa del pacient. Obre'n un per afegir-hi els vostres apunts (cursos, universitat, articles).</p>
    ${BLOCKS.filter((b) => inBlock(b.key).length).map((b) => html`<div class="libgroup">
      <div class="libgroup-head"><${BlockTag} k=${b.key} /><span class="muted">${U.plural(inBlock(b.key).length, 'mètode', 'mètodes')}</span></div>
      <div class="methods">${inBlock(b.key).map((t) => html`<button type="button" class="method" onClick=${() => openMethod(t)}>
        <span class="method-name">${t.name}${t.notes && html` <${Icon} name="note" size=${14} />`}</span>
        <span class="method-aim">${t.aim}</span>
        ${t.example && html`<span class="method-ex">${t.example}</span>`}
      </button>`)}</div>
    </div>`)}
    ${!list.length && html`<${Empty} icon="search" title="Cap mètode coincideix" text="Prova amb una altra paraula o crea'n un de nou." />`}
  </section>`;
}

function openMethod(t) {
  let close = null;
  close = UI.open(() => html`<${MethodDialog} t=${t} onClose=${() => close()} />`);
}

function MethodDialog({ t, onClose }) {
  const [f, setF] = useState(t ? { ...t, blocks: [...(t.blocks || [])] } : { id: U.uid('M'), kind: 'method', name: '', blocks: ['for'], aim: '', how: '', example: '', notes: '', source: '' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const toggle = (k) => setF({ ...f, blocks: f.blocks.includes(k) ? f.blocks.filter((x) => x !== k) : [...f.blocks, k] });
  const save = () => {
    if (!f.name.trim()) { UI.toast('Escriu el nom del mètode.', 'bad'); return; }
    const rec = { ...f, name: f.name.trim() };
    delete rec.seed;
    Store.put('templates', rec, { immediate: true });
    UI.toast(t ? 'Mètode desat.' : 'Mètode afegit.');
    onClose();
  };
  const remove = async () => {
    if (!(await UI.confirm({ title: `Treure «${t.name}»?`, text: 'Les sessions que el fan servir el mantenen.', ok: 'Treu', danger: true }))) return;
    Store.remove('templates', t.id);
    onClose();
  };
  return html`<${Dialog} wide=${true} title=${t ? 'Mètode' : 'Nou mètode'} onClose=${onClose} footer=${html`
    ${t && html`<${Btn} variant="ghost" icon="trash" onClick=${remove}>Treu</${Btn}>`}
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="check" onClick=${save}>Desa</${Btn}>`}>
    <div class="form-grid">
      <${Field} label="Nom" id="me-name" wide=${true}><${TextInput} id="me-name" value=${f.name} onValue=${set('name')} autoFocus=${!t} placeholder="p. ex. Clúster" /></${Field}>
      <${Field} label="Blocs on es fa servir" wide=${true}><div class="chips">${BLOCKS.map((b) => html`<${Chip} on=${f.blocks.includes(b.key)} onClick=${() => toggle(b.key)}>${b.num}. ${blockName(b.key)}</${Chip}>`)}</div></${Field}>
      <${Field} label="Per a què serveix" id="me-aim" wide=${true}><${TextInput} id="me-aim" value=${f.aim} onValue=${set('aim')} /></${Field}>
      <${Field} label="Com es fa" id="me-how" wide=${true}><${Area} id="me-how" value=${f.how} onValue=${set('how')} /></${Field}>
      <${Field} label="Exemple de prescripció" id="me-ex" wide=${true}><${TextInput} id="me-ex" value=${f.example} onValue=${set('example')} placeholder=${'p. ex. 4 × (2+2+2) · 20" entre blocs'} /></${Field}>
      <${Field} label="Apunts" id="me-notes" wide=${true} hint="El que heu après als cursos, a la universitat o als articles: quan fer-lo servir, progressions, errors habituals…">
        <${Area} id="me-notes" value=${f.notes} onValue=${set('notes')} rows=${6} /></${Field}>
      <${Field} label="Fonts" id="me-src" wide=${true}><${TextInput} id="me-src" value=${f.source} onValue=${set('source')} placeholder="Curs, llibre, article…" /></${Field}>
    </div>
  </${Dialog}>`;
}

// Desplegable de mètode per a un bloc o un subbloc de la sessió.
function MethodSelect({ block, value, onPick, ariaLabel }) {
  const list = Store.methods(block);
  return html`<${Select} class="method-select" value=${value || ''} ariaLabel=${ariaLabel || 'Mètode'} placeholder="Mètode…"
    options=${list.map((t) => ({ v: t.id, label: t.name }))}
    onValue=${(id) => { const t = list.find((x) => x.id === id); onPick(t || null); }} />`;
}

function methodHint(id) {
  const t = id ? Store.get('templates', id) : null;
  return t ? [t.how, t.example && `Exemple: ${t.example}`].filter(Boolean).join(' · ') : '';
}
