/* EON Life · biblioteca: exercicis per bloc i plantilles (de bloc i de sessió). */

function LibraryView({ tab = 'exercicis' }) {
  return html`<div class="page">
    <header class="page-head">
      <div><p class="eyebrow">Metodologia EON · 6 blocs</p><h1 class="h1">Biblioteca</h1></div>
      <div class="page-actions">
        ${tab === 'exercicis' ? html`<${Btn} variant="primary" icon="plus" onClick=${() => openExercise(null)}>Nou exercici</${Btn}>`
          : html`<${Menu} variant="primary" icon="plus" label="Nova plantilla" title="Nova plantilla" items=${[
            { label: 'Plantilla de sessió (6 blocs)', icon: 'layers', onClick: () => newTemplate('session') },
            { sep: true },
            ...BLOCKS.map((b) => ({ label: `Plantilla de ${blockName(b.key).toLowerCase()}`, icon: 'plus', onClick: () => newTemplate('block', b.key) })),
          ]} />`}
      </div>
    </header>
    <${Tabs} active=${tab} onChange=${(t) => go('biblioteca', t)} tabs=${[
      { id: 'exercicis', label: 'Exercicis', count: Store.exercises().length },
      { id: 'plantilles', label: 'Plantilles', count: Store.templates().length },
    ]} />
    ${tab === 'exercicis' ? html`<${ExerciseList} />` : html`<${TemplateList} />`}
  </div>`;
}

function ExerciseList() {
  const [q, setQ] = useState('');
  const [blk, setBlk] = useState('');
  const nq = U.norm(q);
  const all = Store.exercises().filter((e) => (!blk || e.block === blk) && (!nq || U.norm(`${e.name} ${e.cat} ${e.material} ${e.gm}`).includes(nq)));
  return html`<section class="card">
    <div class="filters">
      <label class="search"><${Icon} name="search" size=${17} />
        <input class="input" type="search" placeholder="Cerca exercicis…" value=${q} onInput=${(e) => setQ(e.currentTarget.value)} aria-label="Cerca exercicis" /></label>
      <${Seg} value=${blk} onValue=${setBlk} ariaLabel="Bloc" options=${[{ v: '', label: 'Tots' }, ...BLOCKS.map((b) => ({ v: b.key, label: `${b.num}. ${blockName(b.key)}` }))]} allowEmpty=${false} class="seg-wrap" />
    </div>
    ${BLOCKS.filter((b) => all.some((e) => e.block === b.key)).map((b) => html`<div class="libgroup">
      <div class="libgroup-head"><${BlockTag} k=${b.key} /><span class="muted">${U.plural(all.filter((e) => e.block === b.key).length, 'exercici', 'exercicis')}</span></div>
      <div class="exlist">${all.filter((e) => e.block === b.key).map((e) => html`<button type="button" class="exrow" onClick=${() => openExercise(e)}>
        <span class="exrow-name">${e.name}${e.video && html` <${Icon} name="video" size=${14} />`}</span>
        <span class="exrow-meta">${[e.cat, e.material, e.gm].filter(Boolean).join(' · ')}</span>
        <span class="exrow-rx">${Calc.presc(e)}</span>
      </button>`)}</div>
    </div>`)}
    ${!all.length && html`<${Empty} icon="search" title="Cap exercici coincideix" text="Prova amb una altra paraula o crea'n un de nou." />`}
  </section>`;
}

function openExercise(ex) {
  let close = null;
  close = UI.open(() => html`<${ExerciseDialog} ex=${ex} onClose=${() => close()} />`);
}

function ExerciseDialog({ ex, onClose }) {
  const [f, setF] = useState(ex ? { ...ex } : { id: U.uid('X'), block: 'for', name: '', cat: '', material: '', gm: '', cont: '', pos: '', lat: 'BL', sets: '', reps: '', load: '', intensity: '', rest: '', tempo: '', cues: '', video: '' });
  const set = (k) => (v) => setF({ ...f, [k]: v });
  const save = () => {
    if (!f.name.trim()) { UI.toast('Escriu el nom de l\'exercici.', 'bad'); return; }
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
    <div class="form-grid">
      <${Field} label="Nom" id="ex-name" wide=${true}><${TextInput} id="ex-name" value=${f.name} onValue=${set('name')} autoFocus=${!ex} /></${Field}>
      <${Field} label="Bloc" id="ex-block" wide=${true}><${Seg} value=${f.block} onValue=${set('block')} allowEmpty=${false} ariaLabel="Bloc" class="seg-wrap" options=${BLOCKS.map((b) => ({ v: b.key, label: `${b.num}. ${blockName(b.key)}` }))} /></${Field}>
      <${Field} label="Categoria / patró" id="ex-cat"><${TextInput} id="ex-cat" value=${f.cat} onValue=${set('cat')} list=${`focus-${f.block}`} placeholder="p. ex. Dominant de genoll" /></${Field}>
      <${Field} label="Material" id="ex-mat"><${TextInput} id="ex-mat" value=${f.material} onValue=${set('material')} list="mat-list" /></${Field}>
      <${Field} label="Grup muscular" id="ex-gm"><${TextInput} id="ex-gm" value=${f.gm} onValue=${set('gm')} list="gm-list" /></${Field}>
      <${Field} label="Contracció" id="ex-cont"><${Select} id="ex-cont" value=${f.cont} onValue=${set('cont')} options=${OPT.cont.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></${Field}>
      <${Field} label="Posició" id="ex-pos"><${Select} id="ex-pos" value=${f.pos} onValue=${set('pos')} options=${OPT.pos.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></${Field}>
      <${Field} label="Lateralitat" id="ex-lat"><${Select} id="ex-lat" value=${f.lat} onValue=${set('lat')} options=${OPT.lat.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></${Field}>
    </div>
    <h3 class="h3 mt">Prescripció per defecte</h3>
    <div class="form-grid form-grid-4">
      <${Field} label="Sèries" id="ex-sets"><${TextInput} id="ex-sets" value=${f.sets} onValue=${set('sets')} /></${Field}>
      <${Field} label="Reps / temps" id="ex-reps"><${TextInput} id="ex-reps" value=${f.reps} onValue=${set('reps')} /></${Field}>
      <${Field} label="Intensitat" id="ex-int"><${TextInput} id="ex-int" value=${f.intensity} onValue=${set('intensity')} list="int-list" /></${Field}>
      <${Field} label="Descans" id="ex-rest"><${TextInput} id="ex-rest" value=${f.rest} onValue=${set('rest')} /></${Field}>
    </div>
    <div class="form-grid mt">
      <${Field} label="Consignes" id="ex-cues" wide=${true}><${Area} id="ex-cues" value=${f.cues} onValue=${set('cues')} placeholder="Què ha de sentir o controlar el client" /></${Field}>
      <${Field} label="Vídeo de demostració" id="ex-video" wide=${true}><${TextInput} id="ex-video" value=${f.video} onValue=${set('video')} placeholder="https://…" /></${Field}>
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
      <div class="editbar-title"><strong>${t.kind === 'session' ? 'Plantilla de sessió' : `Plantilla · ${blockName(t.block)}`}</strong><span>${t.name}</span></div>
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
