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

  const f = s.feedback || {};
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
      x.blocks = Store.templateBlocks(t, true);
      if (!x.goal) x.goal = t.goal || '';
    });
  };
  // Els blocs s'afegeixen a mà (no totes les sessions tenen els 6) i es col·loquen en l'ordre de la metodologia.
  const addBlock = (key) => {
    upd((x) => {
      x.blocks = [...(x.blocks || []).filter((b) => b.key !== key), Store.blankBlock(key)].sort((a, b) => blockDef(a.key).num - blockDef(b.key).num);
    });
    setTimeout(() => {
      const el = document.querySelector(`section.block.blk-${key}`);
      if (el && el.scrollIntoView) el.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 80);
  };
  const removeBlock = async (key) => {
    const b = (s.blocks || []).find((x) => x.key === key);
    const n = b ? (b.items || []).filter((i) => i.name).length : 0;
    if (n && !(await UI.confirm({ title: `Treure el bloc ${blockName(key)}?`, text: `Té ${U.plural(n, 'exercici', 'exercicis')}, que es trauran d'aquesta sessió.`, ok: 'Treu el bloc', danger: true }))) return;
    upd((x) => { x.blocks = (x.blocks || []).filter((y) => y.key !== key); });
  };
  const remove = async () => {
    if (!(await UI.confirm({ title: 'Eliminar la sessió?', text: `Sessió ${s.number} del ${U.fmtDate(s.date)}.`, ok: 'Elimina', danger: true }))) return;
    Store.remove('sessions', s.id);
    UI.toast('Sessió eliminada.');
    go('client', s.patientId, 'sessions');
  };
  const markDone = () => {
    upd((x) => {
      x.status = 'feta';
      for (const b of x.blocks || []) for (const it of b.items || []) if (it.name) it.done = true;
    });
    Sync.soon(s.patientId); // l'Excel de la sessió acabada es puja de seguida
  };
  const leave = () => { Sync.flush(s.patientId); go('client', s.patientId, 'sessions'); };

  return html`<div class="page page-edit">
    <div class="editbar">
      <${Btn} variant="ghost" icon="back" title="Torna a la fitxa del client" onClick=${leave} />
      <div class="editbar-title">
        <strong>Sessió ${s.number || ''}</strong>
        <span>${p ? U.fullName(p) : ''} · ${U.fmtDateLong(s.date)}</span>
      </div>
      ${s.planId && Store.get('templates', s.planId) && html`<button type="button" class="pill pill-neutral plan-pill" onClick=${() => go('pla', s.planId, s.planN)}
        title="Obre el pla d'entrenament"><${Icon} name="layers" size=${13} />S${s.planN} del pla</button>`}
      <${SaveStatus} />
      <${Seg} value=${s.status} onValue=${set('status')} allowEmpty=${false} size="sm" ariaLabel="Estat de la sessió"
        options=${[{ v: 'planificada', label: 'Planificada' }, { v: 'feta', label: 'Feta', tone: 'ok' }]} />
      <${Btn} variant="primary" icon="play" onClick=${() => go('fitxa', s.id)}>Presenta</${Btn}>
      <${Menu} items=${[
        { label: 'Duplica la sessió', icon: 'copy', onClick: duplicate },
        { label: 'Aplica una plantilla de sessió', icon: 'layers', onClick: applyTemplate },
        { label: 'Desa com a plantilla', icon: 'download', onClick: saveTemplate },
        { sep: true },
        ...(Sync.available() ? [{ label: 'Puja l\'Excel a la carpeta ara', icon: 'refresh', onClick: () => syncNow(s.patientId) }] : []),
        ...(U.canDownload() ? [{ label: 'Descarrega l\'Excel del client', icon: 'download', onClick: () => downloadExcel(s.patientId) }] : []),
        { sep: true },
        { label: 'Elimina la sessió', icon: 'trash', danger: true, onClick: remove },
      ]} />
    </div>

    <section class="card">
      <div class="form-grid form-grid-4">
        <${Field} label="Data" id="se-date"><${TextInput} id="se-date" type="date" value=${s.date} onValue=${set('date')} /></${Field}>
        <${Field} label="Nº de sessió" id="se-num"><${NumInput} id="se-num" value=${s.number} onValue=${set('number')} /></${Field}>
        <${Field} label="Professional" id="se-prof"><${ProfSelect} id="se-prof" value=${s.professional} onValue=${(v) => { set('professional')(v); deviceProfessional(v); }} /></${Field}>
        <${Field} label="Pilar" id="se-pillar"><${Select} id="se-pillar" value=${s.pillar} onValue=${set('pillar')} options=${OPT.pillars} placeholder="—" /></${Field}>
        <${Field} label="Objectiu de la sessió" id="se-goal" wide=${true}>
          <${TextInput} id="se-goal" value=${s.goal} onValue=${set('goal')} placeholder="p. ex. Força de tren inferior · dominant de genoll" />
        </${Field}>
      </div>
    </section>

    <${WellnessCard} id="se-wellness" value=${s.wellness} onSet=${(k, v) => setIn('wellness', k)(v)} />

    ${!(s.blocks || []).length && html`<${AddBlocks} blocks=${s.blocks} onAdd=${addBlock} />`}
    ${(s.blocks || []).map((b) => html`<${BlockCard} key=${b.key} block=${b} prev=${prev} patient=${p} date=${s.date}
      onChange=${(fn) => setBlock(b.key, fn)} onRemove=${() => removeBlock(b.key)} />`)}
    ${(s.blocks || []).length > 0 && html`<${AddBlocks} blocks=${s.blocks} onAdd=${addBlock} />`}

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

// Un bloc de la sessió (també es fa servir per editar plantilles). Es pot dividir en subblocs
// (Bloc 1, Bloc 2…), cadascun amb els seus exercicis: p. ex. a Força principal, un bloc de 2 i un de 5.
// Botons per afegir a la sessió els blocs que encara no hi són.
function AddBlocks({ blocks, onAdd }) {
  const missing = BLOCKS.filter((b) => !(blocks || []).some((x) => x.key === b.key));
  if (!missing.length) return null;
  const empty = !(blocks || []).length;
  return html`<section class=${U.cls('card addblocks', empty && 'addblocks-empty')} aria-label="Afegeix blocs a la sessió">
    ${empty ? html`<div><h2 class="h2">Blocs de la sessió</h2>
        <p class="muted">Afegeix només els blocs que necessiti aquest client. Es posen sols en l'ordre de la metodologia.</p></div>`
      : html`<span class="addblocks-label">Afegeix un bloc</span>`}
    <div class="addblocks-list">${missing.map((b) => html`<button type="button" class=${`addblock blk-${b.key}`} onClick=${() => onAdd(b.key)}>
      <span class="addblock-num">${b.num}</span><span class="addblock-name">${blockName(b.key)}</span><${Icon} name="plus" size=${15} /></button>`)}</div>
  </section>`;
}

function BlockCard({ block, onChange, prev, patient, date, templateMode, onRemove }) {
  const def = blockDef(block.key);
  const items = block.items || [];
  const groups = Calc.groups(block);
  const [focusId, setFocusId] = useState(null);
  const tpls = Store.templates().filter((t) => t.kind === 'block' && t.block === block.key);
  const gIndex = (b, it) => Math.max(0, (b.groups || []).findIndex((g) => g.id === it.g));
  const ungroup = (b) => { for (const it of b.items || []) delete it.g; delete b.groups; };

  // «Afegeix exercici» obre les carpetes: grup muscular → exercici → material (o un exercici en blanc).
  const add = (gid) => {
    const put = (it, focus) => {
      if (gid) it.g = gid;
      if (focus) setFocusId(it.id);
      onChange((b) => { b.items = [...(b.items || []), it]; Calc.sortByGroups(b); });
    };
    const n = gid && groups ? groups.findIndex((x) => x.g.id === gid) + 1 : 0;
    openExerciseBrowser({
      block: block.key,
      title: `Afegeix exercici · ${blockName(block.key)}${n ? ` · Bloc ${n}` : ''}`,
      onPick: (ex, mat) => {
        const it = itemFromExercise(ex, { material: mat || ex.material || '' });
        const last = prev ? prev[ex.name] : null;
        if (last && last.load) it.load = last.load;
        put(it, false);
        UI.toast(`${ex.name}${mat ? ` · ${mat}` : ''}`);
      },
      onBlank: () => put(itemFromExercise(null), true),
    });
  };
  const setItem = (iid) => (fn) => onChange((b) => { const it = b.items.find((x) => x.id === iid); if (it) fn(it); });
  // Amunt/avall dins del subbloc; des del primer o l'últim exercici, passa al subbloc del costat.
  const move = (i, dir) => onChange((b) => {
    const a = b.items[i], c = b.items[i + dir];
    if (!a) return;
    if ((b.groups || []).length && (!c || gIndex(b, c) !== gIndex(b, a))) {
      const k = gIndex(b, a) + dir;
      if (k >= 0 && k < b.groups.length) a.g = b.groups[k].id;
      return;
    }
    if (!c) return;
    const arr = [...b.items];
    [arr[i], arr[i + dir]] = [arr[i + dir], arr[i]];
    b.items = arr;
  });
  const toGroup = (iid, gid) => onChange((b) => {
    const it = b.items.find((x) => x.id === iid);
    if (!it) return;
    it.g = gid;
    b.items = [...b.items.filter((x) => x.id !== iid), it];
    Calc.sortByGroups(b);
  });
  const removeItem = (iid) => onChange((b) => { b.items = b.items.filter((x) => x.id !== iid); });
  const dupItem = (i) => onChange((b) => { const arr = [...b.items]; arr.splice(i + 1, 0, { ...U.clone(arr[i]), id: U.uid('I'), done: false }); b.items = arr; });
  // Divideix el bloc: els exercicis que hi ha queden al Bloc 1 i s'afegeix un Bloc 2 buit.
  const addGroup = () => onChange((b) => {
    if (!(b.groups && b.groups.length)) {
      const g1 = { id: U.uid('G'), name: '' };
      b.groups = [g1];
      for (const it of b.items || []) it.g = g1.id;
    }
    b.groups = [...b.groups, { id: U.uid('G'), name: '' }];
  });
  const setGroup = (gid, k) => (v) => onChange((b) => { const g = (b.groups || []).find((x) => x.id === gid); if (g) g[k] = v; });
  // Mètode (clúster, excèntric, contrast…) del bloc o d'un subbloc.
  const putMethod = (obj, t) => { if (t) { obj.method = t.id; obj.methodName = t.name; } else { delete obj.method; delete obj.methodName; } };
  const setMethod = (t) => onChange((b) => putMethod(b, t));
  const setGroupMethod = (gid, t) => onChange((b) => { const g = (b.groups || []).find((x) => x.id === gid); if (g) putMethod(g, t); });
  const removeGroup = async (x) => {
    const n = x.items.filter((y) => y.it.name).length;
    if (n && !(await UI.confirm({ title: `Treure el bloc ${x.n}?`, text: n === 1 ? 'També s\'eliminarà l\'exercici que hi ha.' : `També s'eliminaran els ${n} exercicis que hi ha.`, ok: 'Treu el bloc', danger: true }))) return;
    const ids = new Set(x.items.map((y) => y.it.id));
    onChange((b) => {
      b.items = (b.items || []).filter((it) => !ids.has(it.id));
      b.groups = (b.groups || []).filter((g) => g.id !== x.g.id);
      if (b.groups.length < 2) ungroup(b);
    });
  };
  const insertTemplate = (t) => onChange((b) => {
    const add = cloneItems(t.items, true);
    b.items = (b.items || []).filter((x) => x.name);
    if (t.groups && t.groups.length) {
      if (!(b.groups && b.groups.length) && b.items.length) {
        const g0 = { id: U.uid('G'), name: '' };
        b.groups = [g0];
        for (const it of b.items) it.g = g0.id;
      }
      b.groups = b.groups || [];
      const map = {};
      for (const g of t.groups) { map[g.id] = U.uid('G'); b.groups.push({ ...g, id: map[g.id] }); }
      for (const it of add) it.g = map[it.g] || map[t.groups[0].id];
    } else if (b.groups && b.groups.length) {
      for (const it of add) it.g = b.groups[b.groups.length - 1].id;
    }
    b.items = [...b.items, ...add];
    if (b.groups && b.groups.length < 2) ungroup(b);
    Calc.sortByGroups(b);
    if (!b.focus) b.focus = t.focus || '';
  });
  const saveTemplate = async () => {
    if (!items.some((x) => x.name)) { UI.toast('Afegeix algun exercici abans de desar la plantilla.', 'bad'); return; }
    const name = await UI.prompt({ title: 'Desa el bloc com a plantilla', label: 'Nom de la plantilla', value: `${blockName(block.key)}${block.focus ? ` · ${block.focus}` : ''}` });
    if (name) { Store.saveBlockTemplate(block, name); UI.toast('Plantilla desada.'); }
  };
  const clear = async () => {
    if (await UI.confirm({ title: `Buidar el bloc ${blockName(block.key)}?`, text: 'Es trauran tots els exercicis del bloc.', ok: 'Buida', danger: true })) onChange((b) => { b.items = []; delete b.groups; });
  };

  const row = (it, i, gi) => html`<${ItemRow} key=${it.id} it=${it} idx=${i} num=${`${def.num}.${i + 1}`}
    canUp=${i > 0 || (groups && gi > 0)} canDown=${i < items.length - 1 || (groups && gi < groups.length - 1)}
    groups=${groups && groups.filter((x, k) => k !== gi).map((x) => ({ id: x.g.id, label: `Mou al bloc ${x.n}` }))}
    onGroup=${(gid) => toGroup(it.id, gid)}
    block=${block.key} prevMap=${prev} autoFocus=${focusId === it.id} templateMode=${templateMode} patient=${patient} date=${date}
    onChange=${setItem(it.id)} onMove=${(dir) => move(i, dir)} onRemove=${() => removeItem(it.id)} onDuplicate=${() => dupItem(i)} />`;

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
      <${MethodSelect} block=${block.key} value=${block.method} onPick=${setMethod} ariaLabel=${`Mètode del bloc ${blockName(block.key)}`} />
      <${Menu} icon="layers" title="Plantilles del bloc" items=${[
        { header: tpls.length ? 'Insereix una plantilla' : 'Encara no hi ha plantilles' },
        ...tpls.map((t) => ({ label: t.name, icon: 'plus', onClick: () => insertTemplate(t) })),
        { sep: true },
        { label: 'Desa el bloc com a plantilla', icon: 'download', onClick: saveTemplate },
        groups ? { label: 'Uneix els blocs en un de sol', icon: 'layers', onClick: () => onChange(ungroup) } : null,
        items.length ? { label: 'Buida el bloc', icon: 'trash', danger: true, onClick: clear } : null,
        onRemove ? { label: 'Treu el bloc de la sessió', icon: 'x', danger: true, onClick: onRemove } : null,
      ]} />
    </header>
    ${block.method && html`<p class="method-hint"><strong>${block.methodName}</strong> · ${methodHint(block.method)}</p>`}
    ${items.length > 0 && html`<div class="items-head" aria-hidden="true">
      <span></span>
      <div class="item-line"><span class="ih ih-name">Exercici</span><div class="rx"><span class="ih rx-s">Sèries</span><span class="ih rx-r">Reps / temps</span>
        <span class="ih rx-l">Càrrega</span><span class="ih rx-i">Intensitat</span><span class="ih rx-d">Descans</span></div></div>
      <span></span>
    </div>`}
    ${groups
      ? groups.map((x, gi) => html`<div class="sgroup" key=${x.g.id} aria-label=${`Bloc ${x.n}`}>
          <div class="sgroup-head">
            <span class="sgroup-tag">Bloc ${x.n}</span>
            <input class="input sgroup-name" value=${x.g.name || ''} placeholder="Indicacions: p. ex. Superset · 3 voltes · 2' entre voltes"
              aria-label=${`Indicacions del bloc ${x.n}`} onInput=${(e) => setGroup(x.g.id, 'name')(e.currentTarget.value)} />
            <${MethodSelect} block=${block.key} value=${x.g.method} onPick=${(t) => setGroupMethod(x.g.id, t)} ariaLabel=${`Mètode del bloc ${x.n}`} />
            <button type="button" class="mini" title=${`Treu el bloc ${x.n}`} onClick=${() => removeGroup(x)}><${Icon} name="x" size=${15} /></button>
          </div>
          ${x.g.method && html`<p class="method-hint"><strong>${x.g.methodName}</strong> · ${methodHint(x.g.method)}</p>`}
          ${x.items.length > 0
            ? html`<div class="items">${x.items.map((y) => row(y.it, y.i, gi))}</div>`
            : html`<p class="muted small sgroup-empty">Encara no hi ha cap exercici en aquest bloc.</p>`}
          <div class="block-foot">
            <button type="button" class="add-item" onClick=${() => add(x.g.id)}><${Icon} name="plus" size=${16} />Afegeix exercici al bloc ${x.n}</button>
          </div>
        </div>`)
      : items.length > 0 && html`<div class="items">${items.map((it, i) => row(it, i, 0))}</div>`}
    <div class="block-foot">
      ${!groups && html`<button type="button" class="add-item" onClick=${() => add()}><${Icon} name="plus" size=${16} />Afegeix exercici</button>`}
      <button type="button" class="add-item add-group" onClick=${addGroup} title="Divideix aquest bloc en blocs més petits (Bloc 1, Bloc 2…), cadascun amb els seus exercicis">
        <${Icon} name="layers" size=${16} />${groups ? `Afegeix el bloc ${groups.length + 1}` : 'Divideix en blocs'}</button>
      ${!items.length && tpls.length > 0 && html`<span class="muted small">o insereix una plantilla:</span>
        ${tpls.slice(0, 3).map((t) => html`<button type="button" class="chip" onClick=${() => insertTemplate(t)}><${Icon} name="layers" size=${13} />${t.name.replace(`${blockName(block.key)} · `, '')}</button>`)}`}
    </div>
  </section>`;
}

function ItemRow({ it, num, canUp, canDown, groups, onGroup, block, prevMap, onChange, onMove, onRemove, onDuplicate, autoFocus, templateMode, patient, date }) {
  const [open, setOpen] = useState(false);
  const [vbtOpen, setVbtOpen] = useState(false);
  const vbtSum = Calc.vbt(it);
  // Registre de l'encoder: a Potència i Força principal (o a qualsevol exercici que ja en tingui).
  const vbtOn = !templateMode && (['pot', 'for'].includes(block) || !!vbtSum);
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
  const demo = it.demo || (ex && ex.video) || '';
  // Progressió: el mateix patró, un nivell més difícil (▲) o més fàcil (▼).
  const up = Store.stepLevel(ex, 1), down = Store.stepLevel(ex, -1);
  const swap = (nx) => {
    onChange((x) => progressItem(x, nx, prevMap));
    UI.toast(`${nx.name} · nivell ${nx.level}`);
  };

  return html`<div class=${U.cls('item', it.done && !templateMode && 'item-done')}>
    <div class="item-num">${num}${it.name && html`<${ExThumb} it=${it} block=${block} size=${46} class="item-thumb" />`}</div>
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
        ${ex && ex.family && html`<span class="lvl" title=${`${ex.family} · nivell ${ex.level} de ${Store.ladder(ex.family).length}`}>
          <button type="button" class="lvl-btn" disabled=${!down} title=${down ? `Regressa: ${down.name}` : 'Ja és el nivell més fàcil'} aria-label="Regressa un nivell" onClick=${() => down && swap(down)}><${Icon} name="down" size=${14} /></button>
          <span class="lvl-n">N${ex.level}</span>
          <button type="button" class="lvl-btn" disabled=${!up} title=${up ? `Progressa: ${up.name}` : 'Ja és el nivell més difícil'} aria-label="Progressa un nivell" onClick=${() => up && swap(up)}><${Icon} name="up" size=${14} /></button>
        </span>`}
        <button type="button" class=${U.cls('mini', demo && 'on')} title=${demo ? 'Vídeo de demostració: veure o canviar' : 'Afegeix el vídeo de demostració (YouTube)'}
          onClick=${() => openDemoDialog({ it, onSave: set('demo') })}><${Icon} name="playfill" size=${15} /></button>
        ${!templateMode && html`<${VideoButton} url=${it.video} title=${it.name || 'Exercici'} patient=${patient} date=${date} where="sessionVideos" onChange=${set('video')} />`}
        ${vbtOn && html`<button type="button" class=${U.cls('vbt-btn', (vbtOpen || vbtSum) && 'on')} aria-expanded=${vbtOpen} onClick=${() => setVbtOpen(!vbtOpen)}
          title="Registre per sèries de l'encoder ADR o de l'ADR Jumping"><${Icon} name="chart" size=${15} /><span>${vbtSum && vbtSum.text ? vbtSum.text : 'Encoder'}</span></button>`}
        <input class="input item-note" value=${it.note} placeholder="Observacions (consigna, variant, ajust…)" onInput=${(e) => set('note')(e.currentTarget.value)} aria-label="Observacions de l'exercici" />
      </div>
      ${prev && !templateMode && html`<div class="prev" title="Última vegada que el va fer">Anterior · ${U.fmtDateShort(prev.date)}: ${Calc.presc(prev) || '—'}${Calc.vbt(prev) && Calc.vbt(prev).text ? ` · ${Calc.vbt(prev).text}` : ''}</div>`}
      ${vbtOpen && vbtOn && html`<${VbtPanel} it=${it} onChange=${onChange} />`}
      ${open && html`<div class="item-details">
        <label class="rx-f"><span>Contracció</span><${Select} value=${it.cont} onValue=${set('cont')} options=${OPT.cont.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></label>
        <label class="rx-f"><span>Posició</span><${Select} value=${it.pos} onValue=${set('pos')} options=${OPT.pos.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></label>
        <label class="rx-f"><span>Lateralitat</span><${Select} value=${it.lat} onValue=${set('lat')} options=${OPT.lat.map((o) => ({ v: o.v, label: `${o.v} · ${o.label}` }))} placeholder="—" /></label>
        <label class="rx-f"><span>Material</span><${MaterialSelect} value=${it.material} exercise=${ex} onValue=${set('material')} /></label>
        <label class="rx-f"><span>Grup muscular</span><${MuscleSelect} value=${it.gm} onValue=${set('gm')} /></label>
        <label class="rx-f"><span>Tempo</span><input class="input" value=${it.tempo} placeholder="3-1-1-0" onInput=${(e) => set('tempo')(e.currentTarget.value)} /></label>
      </div>`}
    </div>
    <div class="item-side">
      ${!templateMode && html`<button type="button" class=${U.cls('donebtn', it.done && 'on')} aria-pressed=${!!it.done} title=${it.done ? 'Fet' : 'Marca com a fet'}
        onClick=${() => set('done')(!it.done)}><${Icon} name="check" size=${18} /></button>`}
      <${Menu} items=${[
        { label: 'Mou amunt', icon: 'up', disabled: !canUp, onClick: () => onMove(-1) },
        { label: 'Mou avall', icon: 'down', disabled: !canDown, onClick: () => onMove(1) },
        ...(groups || []).map((g) => ({ label: g.label, icon: 'layers', onClick: () => onGroup(g.id) })),
        up ? { label: `Progressa: ${up.name}`, icon: 'up', onClick: () => swap(up) } : null,
        down ? { label: `Regressa: ${down.name}`, icon: 'down', onClick: () => swap(down) } : null,
        { label: 'Duplica', icon: 'copy', onClick: onDuplicate },
        { label: 'Vídeo de demostració', icon: 'play', onClick: () => openDemoDialog({ it, onSave: set('demo') }) },
        !templateMode ? { label: 'Grava el client', icon: 'video', onClick: () => openVideoDialog({ url: it.video, title: it.name || 'Exercici', patient, date, where: 'sessionVideos', onChange: set('video') }) } : null,
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

// ── Registre per sèries: encoder ADR (velocitat) o ADR Jumping (salts) ──
const VBT_COLS = {
  encoder: [
    { k: 'kg', label: 'Càrrega', unit: 'kg' },
    { k: 'reps', label: 'Reps', unit: '' },
    { k: 'v1', label: 'V 1a rep', unit: 'm/s' },
    { k: 'vlast', label: 'V última', unit: 'm/s' },
    { k: 'vl', label: 'Pèrdua vel.', unit: '%', auto: true },
    { k: 'pmax', label: 'Pot. màx.', unit: 'W' },
  ],
  salts: [
    { k: 'reps', label: 'Salts', unit: '' },
    { k: 'h', label: 'Altura millor', unit: 'cm' },
    { k: 'hmean', label: 'Altura mitjana', unit: 'cm' },
    { k: 'rsi', label: 'RSI', unit: '' },
    { k: 'tc', label: 'T. contacte', unit: 'ms' },
  ],
};

function VbtPanel({ it, onChange }) {
  const v = it.vbt || {};
  const mode = v.mode || (/salt|jump|cmj|drop|bot|pogo|hop/i.test(it.name || '') ? 'salts' : 'encoder');
  const n = Math.min(12, Math.max(1, U.num(it.sets) || 1));
  const sets = v.sets && v.sets.length ? v.sets : Array.from({ length: n }, () => ({}));
  const cols = VBT_COLS[mode];
  const save = (fn) => onChange((x) => {
    const cur = x.vbt || {};
    const ss = cur.sets && cur.sets.length ? cur.sets.map((st) => ({ ...st })) : Array.from({ length: n }, () => ({}));
    x.vbt = { mode: cur.mode || mode, sets: ss };
    fn(x.vbt);
  });
  const setCell = (i, k, val) => save((t) => { t.sets[i] = { ...t.sets[i], [k]: val }; });
  const addSet = () => save((t) => { const last = t.sets[t.sets.length - 1] || {}; t.sets.push(t.mode === 'salts' ? {} : { kg: last.kg || '' }); });
  const delSet = (i) => save((t) => { t.sets.splice(i, 1); });
  const sum = Calc.vbt(it);
  return html`<div class="vbt">
    <div class="vbt-head">
      <${Seg} value=${mode} onValue=${(m) => save((t) => { t.mode = m; })} allowEmpty=${false} size="sm" ariaLabel="Dispositiu"
        options=${[{ v: 'encoder', label: 'Encoder ADR' }, { v: 'salts', label: 'ADR Jumping' }]} />
      ${sum && sum.text && html`<span class="vbt-sum">${sum.text}</span>`}
    </div>
    <div class="table-wrap"><table class="table vbt-table">
      <thead><tr><th>Sèrie</th>${cols.map((c) => html`<th class="num">${c.label}${c.unit && html` <span class="muted">${c.unit}</span>`}</th>`)}<th></th></tr></thead>
      <tbody>${sets.map((st, i) => html`<tr key=${i}>
        <th scope="row">${i + 1}</th>
        ${cols.map((c) => html`<td><input class="input input-num vbt-in" inputmode="decimal" value=${st[c.k] || ''} aria-label=${`${c.label} · sèrie ${i + 1}`}
          placeholder=${c.auto && !st.vl && Calc.vl(st) != null ? U.fmt(Calc.vl(st), 0) : ''} onInput=${(e) => setCell(i, c.k, e.currentTarget.value)} /></td>`)}
        <td>${sets.length > 1 && html`<button type="button" class="mini" title="Treu la sèrie" onClick=${() => delSet(i)}><${Icon} name="x" size=${14} /></button>`}</td>
      </tr>`)}</tbody>
    </table></div>
    <div class="vbt-foot">
      <button type="button" class="add-item" onClick=${addSet}><${Icon} name="plus" size=${15} />Sèrie</button>
      <span class="muted small">${mode === 'salts' ? 'Apunta el que et dona l\'ADR Jumping a cada sèrie.' : 'Apunta el que et dona l\'encoder a cada sèrie. Si poses la velocitat de la 1a i de l\'última rep, la pèrdua de velocitat es calcula sola.'}</span>
    </div>
  </div>`;
}
