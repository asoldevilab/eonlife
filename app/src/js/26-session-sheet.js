/* EON Life · fitxa de sessió per ensenyar al client (pantalla) i per imprimir o desar en PDF. */

// actions: botons que van al final (p. ex. «Desa el PDF a la carpeta» a l'informe); aleshores imprimir passa a ser secundari.
function PresentBar({ onClose, children, title, actions, noTheme }) {
  const [dark, setDark] = useState(document.documentElement.getAttribute('data-theme') === 'dark');
  const toggleTheme = () => {
    const next = dark ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    setDark(!dark);
  };
  const full = () => {
    const el = document.documentElement;
    try {
      if (document.fullscreenElement) document.exitFullscreen();
      else if (el.requestFullscreen) el.requestFullscreen().catch(() => UI.toast('La pantalla completa no està disponible aquí.', 'bad'));
    } catch (e) { UI.toast('La pantalla completa no està disponible aquí.', 'bad'); }
  };
  return html`<div class="presentbar no-print">
    <${Btn} variant="ghost" icon="back" onClick=${onClose}>Torna</${Btn}>
    <span class="presentbar-title">${title}</span>
    ${children}
    ${!noTheme && html`<${Btn} variant="ghost" icon=${dark ? 'sun' : 'moon'} title=${dark ? 'Tema clar' : 'Tema fosc'} onClick=${toggleTheme} />`}
    <${Btn} variant="ghost" icon="expand" title="Pantalla completa" onClick=${full} />
    ${!IS_ARTIFACT && (actions ? html`<${Btn} variant="ghost" icon="print" onClick=${printPage} title="Imprimeix en paper">Imprimeix</${Btn}>`
      : html`<${Btn} variant="primary" icon="print" onClick=${printPage}>Imprimeix / PDF</${Btn}>`)}
    ${actions}
  </div>`;
}

function BrandMark({ small }) {
  return html`<div class=${U.cls('brandmark', small && 'brandmark-sm')}>
    <span class="logo-mark" role="img" aria-label=${Store.settings.centerName || 'EON Life'}></span>
    <span class="brandmark-sub">${Store.settings.centerTagline || 'Human Performance'}</span>
  </div>`;
}

function SessionSheet({ id }) {
  const s = Store.get('sessions', id);
  if (!s) return html`<div class="page"><${Empty} icon="calendar" title="No trobo aquesta sessió" /></div>`;
  const p = Store.get('patients', s.patientId) || {};
  const blocks = (s.blocks || []).filter((b) => (b.items || []).some((i) => i.name));
  const total = Calc.itemCount(s);
  // Escalfament (1-3) en una fila, força principal a tota l'amplada i tancament (5-6) en una altra fila.
  const warm = blocks.filter((b) => ['mob', 'act', 'pot'].includes(b.key)).length;
  const fin = blocks.filter((b) => ['acc', 'cal'].includes(b.key)).length;
  // Si els blocs no van en l'ordre de la metodologia (p. ex. activació enmig), cadascun a tota l'amplada i en l'ordre triat.
  const custom = blocks.some((b, i) => i > 0 && blockDef(b.key).num < blockDef(blocks[i - 1].key).num);
  const span = (key) => (custom ? 6 : ['mob', 'act', 'pot'].includes(key) ? 6 / warm : ['acc', 'cal'].includes(key) ? 6 / fin : 6);
  const theme = reportThemeClass(p);
  return html`<div class=${`present ${theme}`}>
    <${PresentBar} title=${`Sessió ${s.number} · ${U.fullName(p)}`} onClose=${() => go('sessio', s.id)} noTheme=${true}
      actions=${html`<${PdfSaveButton} p=${p} name=${PdfSet.sessionName(s, p)} where="reportSessions" title=${`Sessió ${s.number} · ${U.fullName(p)}`}
        footer=${`${Store.settings.centerName || 'EON Life'} · Sessió ${s.number} · ${U.fullName(p)}`} />`}>
      <${ReportThemeSwitch} p=${p} />
      <${Btn} variant="ghost" icon="edit" onClick=${() => go('sessio', s.id)}>Edita</${Btn}>
    </${PresentBar}>
    <article class=${`sheet ${theme}`}>
      <header class="sheet-head">
        <${BrandMark} />
        <div class="sheet-id">
          <p class="eyebrow">${U.fmtDateLong(s.date)}</p>
          <h1 class="sheet-title">Sessió ${s.number}</h1>
          <p class="sheet-client">${U.fullName(p)}${s.professional ? html` <span class="muted">· amb ${s.professional}</span>` : ''}</p>
        </div>
      </header>
      ${s.goal && html`<p class="sheet-goal"><span class="eyebrow">Objectiu d'avui</span>${s.goal}</p>`}

      <ol class="sheet-flow" aria-label="Estructura de la sessió">
        ${BLOCKS.map((b) => {
          const blk = (s.blocks || []).find((x) => x.key === b.key);
          const n = blk ? (blk.items || []).filter((i) => i.name).length : 0;
          return html`<li class=${U.cls(`flow blk-${b.key}`, !n && 'flow-empty')}>
            <span class="flow-num">${b.num}</span>
            <span class="flow-name">${blockName(b.key)}</span>
            <span class="flow-n">${n ? U.plural(n, 'exercici', 'exercicis') : '—'}</span>
          </li>`;
        })}
      </ol>

      ${blocks.length ? html`<div class="sheet-blocks">
        ${blocks.map((b) => {
          const def = blockDef(b.key);
          const nVideos = b.items.filter((i) => i.name && demoOf(i)).length;
          const named = b.items.filter((i) => i.name);
          const gs = Calc.groups(b);
          const gOf = (it) => (gs ? gs.find((x) => x.items.some((y) => y.it === it)) : null);
          return html`<section class=${U.cls('sblock', `blk-${b.key}`, b.key === 'for' && 'sblock-main')} style=${`--span:${span(b.key)}`}>
            <header class="sblock-head">
              <span class="sblock-num">${def.num}</span>
              <div class="grow"><h2 class="sblock-name">${blockName(b.key)}</h2>${(b.focus || b.methodName) && html`<p class="sblock-focus">${[b.focus, b.methodName].filter(Boolean).join(' · ')}</p>`}</div>
              ${nVideos > 0 && html`<button type="button" class="sblock-videos no-print" onClick=${() => openBlockVideos(b, 0)}
                aria-label=${`Mira els vídeos del bloc ${blockName(b.key)}`}><${Icon} name="playfill" size=${15} />${U.plural(nVideos, 'vídeo', 'vídeos')}</button>`}
            </header>
            <ol class="sx">
              ${named.map((it, i) => {
                const g = gOf(it);
                const head = g && (i === 0 || gOf(named[i - 1]) !== g);
                const tags = [it.lat === 'UL' ? 'Unilateral' : '', it.cont ? (OPT.cont.find((o) => o.v === it.cont) || {}).label : '', it.material && !/^(Terra|Pes corporal)$/.test(it.material) ? it.material : ''].filter(Boolean);
                const withVideo = b.items.filter((x) => x.name && demoOf(x));
                return html`${head && html`<li class="sx-group"><span class="sx-group-tag">Bloc ${g.n}</span>${Calc.isSuper(g.g) && html`<span class="sx-super">${Calc.superInfo(g.g)}</span>`}${g.g.methodName && html`<span class="sx-method">${g.g.methodName}</span>`}${g.g.name && html`<span class="sx-group-name">${g.g.name}</span>`}</li>`}<li class="sx-item">
                  <span class="sx-n">${def.num}.${i + 1}</span>
                  <${ExThumb} it=${it} block=${b.key} size=${52} class="sx-thumb" seq=${true} />
                  <div class="sx-body">
                    <div class="sx-line"><span class="sx-name">${it.name}${demoOf(it) && html` <button type="button" class="sx-play no-print" title="Mira el vídeo" onClick=${() => openBlockVideos(b, withVideo.indexOf(it))}><${Icon} name="playfill" size=${12} /></button>`}</span><span class="sx-rx">${Calc.presc(it)}</span></div>
                    ${(tags.length > 0 || it.note) && html`<div class="sx-meta">${tags.map((t) => html`<span class="tag">${t}</span>`)}${it.note && html`<span class="sx-note">${it.note}</span>`}</div>`}
                  </div>
                </li>`;
              })}
            </ol>
          </section>`;
        })}
      </div>` : html`<${Empty} icon="dumbbell" title="Aquesta sessió encara no té exercicis" text="Omple els blocs a l'editor de la sessió." />`}

      <${SessionClose} s=${s} blocks=${blocks} />

      <footer class="sheet-foot">
        <span>${Store.settings.centerName || 'EON Life'} · ${Store.settings.centerTagline || 'Human Performance'}</span>
        <span>${U.plural(total, 'exercici', 'exercicis')} · ${U.fmtDate(s.date)}</span>
      </footer>
    </article>
  </div>`;
}

// Tancament d'una sessió feta (al final de la fitxa i del PDF): wellness en arribar, RPE, dolor (EVA), càrrega i
// totes les observacions, les generals i les de cada exercici.
function SessionClose({ s, blocks }) {
  if (s.status !== 'feta') return null;
  const f = s.feedback || {}, w = s.wellness || {};
  const wl = Calc.wellness(w);
  const rpe = U.num(f.rpe), pain = U.num(f.pain), min = U.num(f.duration), load = Calc.sessionLoad(s), hr = U.num(f.hrAvg);
  const exNotes = [];
  for (const b of blocks) b.items.filter((i) => i.name).forEach((it, i) => { if (it.note) exNotes.push({ n: `${blockDef(b.key).num}.${i + 1}`, name: it.name, note: it.note }); });
  const notes = [['Com arriba', w.notes], ['Observacions de la sessió', f.notes], ['Per a la propera sessió', f.decision]].filter(([, t]) => t);
  if (!wl && rpe == null && pain == null && !notes.length && !exNotes.length) return null;
  return html`<section class="ssum" aria-label="Com ha anat la sessió">
    <h2 class="ssum-title">Com ha anat la sessió</h2>
    <div class="ssum-tiles">
      ${wl && html`<${Stat} label="Wellness en arribar" value=${wl.total != null ? wl.total : U.fmt(wl.avg, 1)} unit=${wl.total != null ? '/25' : '/5 de mitjana'}
        tone=${wl.tone === 'bad' ? 'warn' : ''} sub=${wl.low.length ? `Baix: ${wl.low.join(', ').toLowerCase()}` : wl.total != null ? '5 preguntes de l\'1 al 5' : `${wl.n} de 5 respostes`} />`}
      ${rpe != null && html`<${Stat} label="RPE de la sessió" value=${U.fmt(rpe, 0)} unit="/10" sub=${rpeWord(rpe)} />`}
      ${pain != null && html`<${Stat} label="Dolor en acabar (EVA)" value=${U.fmt(pain, 0)} unit="/10" tone=${pain >= 5 ? 'warn' : ''} sub=${pain === 0 ? 'Sense dolor' : pain <= 3 ? 'Lleu' : pain <= 6 ? 'Moderat' : 'Intens'} />`}
      ${load != null && html`<${Stat} label="Càrrega" value=${U.fmt(load, 0)} unit="UA" sub=${`RPE × ${U.fmt(min, 0)} min`} />`}
      ${load == null && min != null && html`<${Stat} label="Durada" value=${U.fmt(min, 0)} unit="min" />`}
      ${hr != null && html`<${Stat} label="FC mitjana" value=${U.fmt(hr, 0)} unit="bpm" sub=${U.num(f.hrMax) != null ? `Màxima ${U.fmt(U.num(f.hrMax), 0)} bpm` : ''} />`}
    </div>
    ${wl && html`<ul class="ssum-wl">${WELLNESS.map((q) => {
      const v = U.num(w[q.k]);
      return html`<li class=${U.cls(v != null && v <= 2 && 'low')}><span>${q.label}</span><strong>${v == null ? '—' : v}</strong></li>`;
    })}</ul>`}
    ${(notes.length > 0 || exNotes.length > 0) && html`<div class="ssum-notes">
      ${notes.map(([label, t]) => html`<div class="ssum-note"><h3 class="eyebrow">${label}</h3><p>${t}</p></div>`)}
      ${exNotes.length > 0 && html`<div class="ssum-note"><h3 class="eyebrow">Observacions dels exercicis</h3>
        <ul class="ssum-ex">${exNotes.map((x) => html`<li><span class="sx-n">${x.n}</span><span><strong>${x.name}</strong> · ${x.note}</span></li>`)}</ul></div>`}
    </div>`}
  </section>`;
}

const rpeWord = (v) => (v <= 2 ? 'Molt suau' : v <= 4 ? 'Moderat' : v <= 6 ? 'Dur' : v <= 8 ? 'Molt dur' : 'Esforç màxim');

// Vídeo de demostració d'un exercici: el de la sessió o, si no n'hi ha, el de la biblioteca.
function demoOf(it) {
  if (it.demo) return it.demo;
  const ex = it.exId ? Store.exercise(it.exId) : null;
  return (ex && ex.video) || '';
}

// Vídeos d'un bloc a pantalla gran, un darrere l'altre, per ensenyar-los al client abans de començar.
function openBlockVideos(block, start = 0) {
  let close = null;
  close = UI.open(() => html`<${BlockVideos} block=${block} start=${Math.max(0, start)} onClose=${() => close()} />`, { onDismiss: () => close() });
}

function BlockVideos({ block, start, onClose }) {
  const def = blockDef(block.key);
  const list = block.items.filter((i) => i.name).map((it, i) => ({ it, n: `${def.num}.${i + 1}`, url: demoOf(it) })).filter((x) => x.url);
  const [k, setK] = useState(Math.min(start, list.length - 1));
  useEffect(() => {
    const key = (e) => {
      if (e.key === 'ArrowRight') setK((x) => Math.min(list.length - 1, x + 1));
      else if (e.key === 'ArrowLeft') setK((x) => Math.max(0, x - 1));
    };
    document.addEventListener('keydown', key);
    const unEsc = EscStack.push(() => onClose());
    return () => { document.removeEventListener('keydown', key); unEsc(); };
  }, []);
  const cur = list[k];
  if (!cur) return null;
  return html`<div class=${`bv blk-${block.key}`} role="dialog" aria-modal="true" aria-label=${`Vídeos del bloc ${blockName(block.key)}`}>
    <header class="bv-head">
      <span class="sblock-num">${def.num}</span>
      <div class="grow"><h2 class="sblock-name">${blockName(block.key)}</h2>${block.focus && html`<p class="sblock-focus">${block.focus}</p>`}</div>
      <span class="muted">${k + 1} / ${list.length}</span>
      <${Btn} variant="ghost" icon="x" title="Tanca" onClick=${onClose} />
    </header>
    <div class="bv-video" key=${cur.url}><${VideoEmbed} url=${cur.url} title=${cur.it.name} /></div>
    <div class="bv-info">
      <span class="sx-n">${cur.n}</span>
      <div class="grow"><strong class="bv-name">${cur.it.name}</strong>${cur.it.note && html`<p class="bv-note">${cur.it.note}</p>`}</div>
      <span class="sx-rx">${Calc.presc(cur.it)}</span>
    </div>
    ${list.length > 1 && html`<nav class="bv-nav">
      <${Btn} icon="left" disabled=${k === 0} onClick=${() => setK(k - 1)}>Anterior</${Btn}>
      <div class="bv-dots">${list.map((x, i) => html`<button type="button" class=${U.cls('bv-dot', i === k && 'on')} aria-label=${x.it.name} title=${x.it.name} onClick=${() => setK(i)}></button>`)}</div>
      <${Btn} iconRight="right" disabled=${k === list.length - 1} onClick=${() => setK(k + 1)}>Següent</${Btn}>
    </nav>`}
  </div>`;
}
