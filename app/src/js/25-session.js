/* EON Life · editor de sessió: 6 blocs (Mobilitat · Activació · Potència · Força principal ·
   Accessoris · Tornada a la calma), pensat per omplir-se ràpid a la tauleta. */

function SessionEditor({ id }) {
  const s = Store.get('sessions', id);
  // Última vegada que el client va fer cada exercici (per progressar la càrrega).
  const prev = useMemo(() => {
    const m = {};
    if (!s) return m;
    const before = Store.sessionsOf(s.patientId).filter((x) => x.id !== s.id && x.date <= s.date).reverse();
    for (const x of before) for (const b of x.blocks || []) for (const it of b.items || []) {
      if (it.name && !m[it.name]) m[it.name] = { ...it, date: x.date };
    }
    return m;
  }, [s && s.patientId, s && s.date, id]);
  if (!s) return html`<div class="page"><${Empty} icon="calendar" title="No trobo aquesta sessió" text="Potser s'ha eliminat.">
    <${Btn} onClick=${() => go('inici')}>Torna a l'inici</${Btn}></${Empty}></div>`;
  const p = Store.get('patients', s.patientId);
  const upd = (fn) => Store.update('sessions', s.id, fn);
  const set = (k) => (v) => upd((x) => { x[k] = v; });
  const setIn = (obj, k) => (v) => upd((x) => { x[obj] = { ...(x[obj] || {}), [k]: v }; });
  const setBlock = (key, fn) => upd((x) => { const b = x.blocks.find((bb) => bb.key === key); if (b) fn(b); });

  const f = s.feedback || {}, r = s.readiness || {};
  const load = Calc.sessionLoad(s);

  const duplicate = async () => {
    const date = await askDate({ title: 'Duplica la sessió', label: 'Data de la nova sessió', value: U.addDays(s.date, 7) });
    if (!date) return;
    const copy = Store.duplicateSession(s.id, date);
    UI.toast(`Sessió ${copy.number} creada per al ${U.fmtDate(date)}.`);
    go('sessio', copy.id);
  };
  const saveTemplate = async () => {
    const name = await UI.prompt({ title: 'Desa com a plantilla de sessió', label: 'Nom de la plantilla', value: s.goal || `Sessió tipus ${s.number}` });
    if (name) { Store.saveSessionTemplate(s, name); UI.toast('Plantilla desada a la biblioteca.'); }
  };
  const applyTemplate = async () => {
    const t = await pickSessionTemplate();
    if (!t) return;
    const hasItems = Calc.itemCount(s) > 0;
    if (hasItems && !(await UI.confirm({ title: 'Substituir els blocs?', text: `Els exercicis actuals se substituiran pels de «${t.name}».`, ok: 'Substitueix' }))) return;
    upd((x) => {
      x.blocks = Store.emptyBlocks().map((b) => {
        const tb = (t.blocks || []).find((y) => y.key === b.key);
        return tb ? { ...b, focus: tb.focus || '', note: tb.note || '', items: cloneItems(tb.items, true) } : b;
      });
      if (!x.goal) x.goal = t.goal || '';
    });
  };
  const remove = async () => {
    if (!(await UI.confirm({ title: 'Eliminar la sessió?', text: `Sessió ${s.number} del ${U.fmtDate(s.date)}.`, ok: 'Elimina', danger: true }))) return;
    Store.remove('sessions', s.id);
    UI.toast('Sessió eliminada.');
    go('client', s.patientId, 'sessions');
  };
  const markDone = () => upd((x) => {
    x.status = 'feta';
    for (const b of x.blocks) for (const it of b.items) if (it.name) it.done = true;
  });

  return html`<div class="page page-edit">
    <div class="editbar">
      <${Btn} variant="ghost" icon="back" title="Torna a la fitxa del client" onClick=${() => go('client', s.patientId, 'sessions')} />
      <div class="editbar-title">
        <strong>Sessió ${s.number || ''}</strong>
        <span>${p ? U.fullName(p) : ''} · ${U.fmtDateLong(s.date)}</span>
      </div>
      <${SaveStatus} />
      <${Seg} value=${s.status} onValue=${set('status')} allowEmpty=${false} size="sm" ariaLabel="Estat de la sessió"
        options=${[{ v: 'planificada', label: 'Planificada' }, { v: 'feta', label: 'Feta', tone: 'ok' }]} />
      <${Btn} variant="primary" icon="play" onClick=${() => go('fitxa', s.id)}>Presenta</${Btn}>
      <${Menu} items=${[
        { label: 'Duplica la sessió', icon: 'copy', onClick: duplicate },
        { label: 'Aplica una plantilla de sessió', icon: 'layers', onClick: applyTemplate },
        { label: 'Desa com a plantilla', icon: 'download', onClick: saveTemplate },
        { sep: true },
        { label: 'Elimina la sessió', icon: 'trash', danger: true, onClick: remove },
      ]} />
    </div>

    <section class="card">
      <div class="form-grid form-grid-4">
        <${Field} label="Data" id="se-date"><${TextInput} id="se-date" type="date" value=${s.date} onValue=${set('date')} /></${Field}>
        <${Field} label="Nº de sessió" id="se-num"><${NumInput} id="se-num" value=${s.number} onValue=${set('number')} /></${Field}>
        <${Field} label="Professional" id="se-prof"><${TextInput} id="se-prof" value=${s.professional} onValue=${set('professional')} list="prof-list" /></${Field}>
        <${Field} label="Pilar" id="se-pillar"><${Select} id="se-pillar" value=${s.pillar} onValue=${set('pillar')} options=${OPT.pillars} placeholder="—" /></${Field}>
        <${Field} label="Objectiu de la sessió" id="se-goal" wide=${true}>
          <${TextInput} id="se-goal" value=${s.goal} onValue=${set('goal')} placeholder="p. ex. Força de tren inferior · dominant de genoll" />
        </${Field}>
      </div>
      <${ProfessionalsList} />
      <div class="readiness">
        <span class="readiness-title">Com arriba avui?</span>
        <div class="readiness-item"><span>Son</span><${Seg} size="sm" value=${r.sleep || ''} onValue=${setIn('readiness', 'sleep')} options=${['1', '2', '3', '4', '5']} ariaLabel="Son de l'1 al 5" /></div>
        <div class="readiness-item"><span>Energia</span><${Seg} size="sm" value=${r.energy || ''} onValue=${setIn('readiness', 'energy')} options=${['1', '2', '3', '4', '5']} ariaLabel="Energia de l'1 al 5" /></div>
        <div class="readiness-item"><span>Dolor</span><${Seg} size="sm" value=${r.pain || ''} onValue=${setIn('readiness', 'pain')} options=${['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']} ariaLabel="Dolor del 0 al 10" /></div>
      </div>
    </section>

    ${s.blocks.map((b) => html`<${BlockCard} key=${b.key} block=${b} prev=${prev} patient=${p}
      onChange=${(fn) => setBlock(b.key, fn)} />`)}

    <section class="card feedback">
      <div class="card-head"><h2 class="h2">Tancament de la sessió</h2>
        ${s.status !== 'feta' && html`<${Btn} variant="primary" icon="check" onClick=${markDone}>Marca com a feta</${Btn}>`}</div>
      <div class="fb-grid">
        <${Field} label="RPE global de la sessió (0–10)" id="fb-rpe" wide=${true}>
          <${Seg} value=${f.rpe || ''} onValue=${setIn('feedback', 'rpe')} options=${['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']} ariaLabel="RPE" class="seg-rpe" />
        </${Field}>
        <${Field} label="Durada" id="fb-min"><${NumInput} id="fb-min" value=${f.duration} onValue=${setIn('feedback', 'duration')} unit="min" /></${Field}>
        <${Field} label="Càrrega de la sessió"><div class="computed"><${Icon} name="flame" size=${16} />${load != null ? `${U.fmt(load, 0)} UA` : 'RPE × minuts'}</div></${Field}>
        <${Field} label="Dolor en acabar (0–10)" id="fb-pain" wide=${true}>
          <${Seg} value=${f.pain || ''} onValue=${setIn('feedback', 'pain')} options=${['0', '1', '2', '3', '4', '5', '6', '7', '8', '9', '10']} ariaLabel="Dolor en acabar" />
        </${Field}>
        <${Field} label="Observacions" id="fb-notes" wide=${true}>
          <${Area} id="fb-notes" value=${f.notes} onValue=${setIn('feedback', 'notes')} placeholder="Compensacions, dolor, asimetries, fatiga o ajustos realitzats" />
        </${Field}>
        <${Field} label="Decisió per a la propera sessió" id="fb-dec" wide=${true}>
          <${Area} id="fb-dec" value=${f.decision} onValue=${setIn('feedback', 'decision')} placeholder="p. ex. Pujar 2,5 kg al back squat si manté RIR 2" />
        </${Field}>
      </div>
    </section>
  </div>`;
}

// Un bloc de la sessió (també es fa servir per editar plantilles).
function BlockCard({ block, onChange, prev, patient, templateMode }) {
  const def = blockDef(block.key);
  const items = block.items || [];
  const [focusId, setFocusId] = useState(null);
  const tpls = Store.templates().filter((t) => t.kind === 'block' && t.block === block.key);

  const add = () => {
    const it = itemFromExercise(null);
    setFocusId(it.id);
    onChange((b) => { b.items = [...(b.items || []), it]; });
  };
  const setItem = (iid) => (fn) => onChange((b) => { const it = b.items.find((x) => x.id === iid); if (it) fn(it); });
  const move = (i, dir) => onChange((b) => {
    const j = i + dir;
    if (j < 0 || j >= b.items.length) return;
    const arr = [...b.items];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    b.items = arr;
  });
  const removeItem = (iid) => onChange((b) => { b.items = b.items.filter((x) => x.id !== iid); });
  const dupItem = (i) => onChange((b) => { const arr = [...b.items]; arr.splice(i + 1, 0, { ...U.clone(arr[i]), id: U.uid('I'), done: false }); b.items = arr; });
  const insertTemplate = (t) => onChange((b) => {
    b.items = [...(b.items || []).filter((x) => x.name), ...cloneItems(t.items, true)];
    if (!b.focus) b.focus = t.focus || '';
  });
  const saveTemplate = async () => {
    if (!items.some((x) => x.name)) { UI.toast('Afegeix algun exercici abans de desar la plantilla.', 'bad'); return; }
    const name = await UI.prompt({ title: 'Desa el bloc com a plantilla', label: 'Nom de la plantilla', value: `${blockName(block.key)}${block.focus ? ` · ${block.focus}` : ''}` });
    if (name) { Store.saveBlockTemplate(block, name); UI.toast('Plantilla desada.'); }
  };
  const clear = async () => {
    if (await UI.confirm({ title: `Buidar el bloc ${blockName(block.key)}?`, text: 'Es trauran tots els exercicis del bloc.', ok: 'Buida', danger: true })) onChange((b) => { b.items = []; });
  };

  return html`<section class=${`card block blk-${block.key}`} aria-label=${`Bloc ${def.num}: ${blockName(block.key)}`}>
    <header class="block-head">
      <span class="block-num">${def.num}</span>
      <div class="block-title">
        <h2 class="h2">${blockName(block.key)}</h2>
        <p class="block-desc">${blockDesc(block.key)}</p>
      </div>
      <div class="block-focus">
        <${TextInput} value=${block.focus} onValue=${(v) => onChange((b) => { b.focus = v; })} placeholder="Focus del bloc" list=${`focus-${block.key}`} ariaLabel=${`Focus del bloc ${blockName(block.key)}`} />
        <datalist id=${`focus-${block.key}`}>${def.focus.map((x) => html`<option value=${x}></option>`)}</datalist>
      </div>
      <${Menu} icon="layers" title="Plantilles del bloc" items=${[
        { header: tpls.length ? 'Insereix una plantilla' : 'Encara no hi ha plantilles' },
        ...tpls.map((t) => ({ label: t.name, icon: 'plus', onClick: () => insertTemplate(t) })),
        { sep: true },
        { label: 'Desa el bloc com a plantilla', icon: 'download', onClick: saveTemplate },
        items.length ? { label: 'Buida el bloc', icon: 'trash', danger: true, onClick: clear } : null,
      ]} />
    </header>
    ${items.length > 0 && html`<div class="items-head" aria-hidden="true">
      <span></span>
      <div class="item-line"><span class="ih ih-name">Exercici</span><div class="rx"><span class="ih rx-s">Sèries</span><span class="ih rx-r">Reps / temps</span>
        <span class="ih rx-l">Càrrega</span><span class="ih rx-i">Intensitat</span><span class="ih rx-d">Descans</span></div></div>
      <span></span>
    </div>`}
    ${items.length > 0 && html`<div class="items">
      ${items.map((it, i) => html`<${ItemRow} key=${it.id} it=${it} idx=${i} count=${items.length} num=${`${def.num}.${i + 1}`}
        block=${block.key} prevMap=${prev} autoFocus=${focusId === it.id} templateMode=${templateMode} patient=${patient}
        onChange=${setItem(it.id)} onMove=${(dir) => move(i, dir)} onRemove=${() => removeItem(it.id)} onDuplicate=${() => dupItem(i)} />`)}
    </div>`}
    <div class="block-foot">
      <button type="button" class="add-item" onClick=${add}><${Icon} name="plus" size=${16} />Afegeix exercici</button>
      ${!items.length && tpls.length > 0 && html`<span class="muted small">o insereix una plantilla:</span>
        ${tpls.slice(0, 3).map((t) => html`<button type="button" class="chip" onClick=${() => insertTemplate(t)}><${Icon} name="layers" size=${13} />${t.name.replace(`${blockName(block.key)} · `, '')}</button>`)}`}
    </div>
  </section>`;
}

function ItemRow({ it, idx, count, num, block, prevMap, onChange, onMove, onRemove, onDuplicate, autoFocus, templateMode, patient }) {
  const [open, setOpen] = useState(false);
  const prev = prevMap && it.name ? prevMap[it.name] : null;
  const set = (k) => (v) => onChange((x) => { x[k] = v; });
  const pick = (ex) => onChange((x) => {
    x.name = ex.name;
    x.exId = ex.id;
    for (const k of ['gm', 'cont', 'pos', 'lat', 'material']) x[k] = ex[k] || '';
    for (const k of ['sets', 'reps', 'intensity', 'rest', 'tempo']) if (!x[k]) x[k] = ex[k] || '';
    const last = prevMap ? prevMap[ex.name] : null;
    if (last && !x.load && last.load) x.load = last.load;
  });
  const tags = [
    it.cont && (OPT.cont.find((o) => o.v === it.cont) || {}).label,
    it.pos && (OPT.pos.find((o) => o.v === it.pos) || {}).label,
    it.lat && (OPT.lat.find((o) => o.v === it.lat) || {}).label,
    it.material, it.gm, it.tempo && `Tempo ${it.tempo}`,
  ].filter(Boolean);
  const ex = it.exId ? Store.exercise(it.exId) : null;
  const video = it.video || (ex && ex.video) || '';

  return html`<div class=${U.cls('item', it.done && !templateMode && 'item-done')}>
    <div class="item-num">${num}</div>
    <div class="item-body">
      <div class="item-line">
        <div class="item-name">
          <${ExercisePicker} value=${it.name} block=${block} onPick=${pick} onText=${set('name')} autoFocus=${autoFocus} />
        </div>
        <div class="rx">
          <label class="rx-f rx-s"><span class="rxl">Sèries</span><input class="input" inputmode="numeric" value=${it.sets} aria-label="Sèries" onInput=${(e) => set('sets')(e.currentTarget.value)} /></label>
          <label class="rx-f rx-r"><span class="rxl">Reps / temps</span><input class="input" value=${it.reps} aria-label="Repeticions o temps" onInput=${(e) => set('reps')(e.currentTarget.value)} /></label>
          <label class="rx-f rx-l"><span class="rxl">Càrrega</span><input class="input" value=${it.load} aria-label="Càrrega" placeholder=${prev && prev.load ? Calc.load(prev.load) : ''} onInput=${(e) => set('load')(e.currentTarget.value)} /></label>
          <label class="rx-f rx-i"><span class="rxl">Intensitat</span><input class="input" value=${it.intensity} aria-label="Intensitat" list="int-list" onInput=${(e) => set('intensity')(e.currentTarget.value)} /></label>
          <label class="rx-f rx-d"><span class="rxl">Descans</span><input class="input" value=${it.rest} aria-label="Descans" onInput=${(e) => set('rest')(e.currentTarget.value)} /></label>
        </div>
      </div>
      <div class="item-meta">
        <button type="button" class=${U.cls('tags', open && 'open')} onClick=${() => setOpen(!open)} aria-expanded=${open} title="Contracció, posició, lateralitat, material, grup muscular i tempo">
          ${tags.length ? tags.map((t) => html`<span class="tag">${t}</span>`) : html`<span class="tag tag-empty">Detalls</span>`}
          <${Icon} name=${open ? 'up' : 'down'} size=${14} />
        </button>
        ${video && html`<a class="mini on" href=${video} target="_blank" rel="noopener" title="Vídeo de l'exercici"><${Icon} name="video" size=${15} /></a>`}
        <input class="input item-note" value=${it.note} placeholder="Observacions (consigna, variant, ajust…)" onInput=${(e) => set('note')(e.currentTarget.value)} aria-label="Observacions de l'exercici" />
      </div>
      ${prev && !templateMode && html`<div class="prev" title="Última vegada que el va fer">Anterior · ${U.fmtDateShort(prev.date)}: ${Calc.presc(prev) || '—'}</div>`}
      ${open && html`<div class="item-details">
        <label class="rx-f"><span>Contracció</span><${Select} value=${it.cont} onValue=${set('cont')} options=${OPT.cont.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></label>
        <label class="rx-f"><span>Posició</span><${Select} value=${it.pos} onValue=${set('pos')} options=${OPT.pos.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></label>
        <label class="rx-f"><span>Lateralitat</span><${Select} value=${it.lat} onValue=${set('lat')} options=${OPT.lat.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></label>
        <label class="rx-f"><span>Material</span><input class="input" value=${it.material} list="mat-list" onInput=${(e) => set('material')(e.currentTarget.value)} /></label>
        <label class="rx-f"><span>Grup muscular</span><input class="input" value=${it.gm} list="gm-list" onInput=${(e) => set('gm')(e.currentTarget.value)} /></label>
        <label class="rx-f"><span>Tempo</span><input class="input" value=${it.tempo} placeholder="3-1-1-0" onInput=${(e) => set('tempo')(e.currentTarget.value)} /></label>
      </div>`}
    </div>
    <div class="item-side">
      ${!templateMode && html`<button type="button" class=${U.cls('donebtn', it.done && 'on')} aria-pressed=${!!it.done} title=${it.done ? 'Fet' : 'Marca com a fet'}
        onClick=${() => set('done')(!it.done)}><${Icon} name="check" size=${18} /></button>`}
      <${Menu} items=${[
        { label: 'Mou amunt', icon: 'up', disabled: idx === 0, onClick: () => onMove(-1) },
        { label: 'Mou avall', icon: 'down', disabled: idx === count - 1, onClick: () => onMove(1) },
        { label: 'Duplica', icon: 'copy', onClick: onDuplicate },
        { label: 'Vídeo de l\'exercici', icon: 'video', onClick: () => openVideoDialog({ url: it.video, title: it.name || 'Exercici', patient, onChange: set('video') }) },
        { sep: true },
        { label: 'Elimina', icon: 'trash', danger: true, onClick: onRemove },
      ]} />
    </div>
  </div>`;
}

// Llistes de suggeriments compartides (una sola vegada al document).
function SharedLists() {
  return html`<div hidden>
    <datalist id="int-list">${OPT.intensity.map((x) => html`<option value=${x}></option>`)}</datalist>
    <datalist id="mat-list">${OPT.material.map((x) => html`<option value=${x}></option>`)}</datalist>
    <datalist id="gm-list">${OPT.gm.map((x) => html`<option value=${x}></option>`)}</datalist>
  </div>`;
}

function askDate({ title, label, value }) {
  return new Promise((resolve) => {
    let close = null;
    let cur = value;
    const done = (v) => { close(); resolve(v); };
    close = UI.open(() => html`<${Dialog} title=${title} onClose=${() => done(null)} footer=${html`
      <${Btn} variant="ghost" onClick=${() => done(null)}>Cancel·la</${Btn}>
      <${Btn} variant="primary" onClick=${() => done(cur)}>D'acord</${Btn}>`}>
      <${Field} label=${label} id="ask-date"><${DateOnce} value=${value} onValue=${(v) => { cur = v; }} /></${Field}>
    </${Dialog}>`, { size: 'sm', onDismiss: () => done(null) });
  });
}

function DateOnce({ value, onValue }) {
  const [v, setV] = useState(value);
  return html`<${TextInput} id="ask-date" type="date" value=${v} onValue=${(x) => { setV(x); onValue(x); }} />`;
}

function pickSessionTemplate() {
  return new Promise((resolve) => {
    let close = null;
    const done = (v) => { close(); resolve(v); };
    const tpls = Store.templates().filter((t) => t.kind === 'session');
    close = UI.open(() => html`<${Dialog} title="Aplica una plantilla de sessió" onClose=${() => done(null)}>
      ${tpls.length ? html`<div class="choices">${tpls.map((t) => html`<button type="button" class="choice" onClick=${() => done(t)}>
        <span class="choice-body"><span class="choice-title">${t.name}</span>
        <span class="choice-text">${(t.blocks || []).map((b) => `${blockDef(b.key).num}. ${(b.items || []).length}`).join(' · ')} exercicis per bloc</span></span></button>`)}</div>`
        : html`<${Empty} icon="layers" title="No hi ha plantilles de sessió" text="Desa qualsevol sessió com a plantilla des del menú de la sessió." />`}
    </${Dialog}>`, { onDismiss: () => done(null) });
  });
}
