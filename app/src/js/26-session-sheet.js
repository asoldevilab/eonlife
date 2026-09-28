/* EON Life · fitxa de sessió per ensenyar al client (pantalla) i per imprimir o desar en PDF. */

function PresentBar({ onClose, children, title }) {
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
    <${Btn} variant="ghost" icon=${dark ? 'sun' : 'moon'} title=${dark ? 'Tema clar' : 'Tema fosc'} onClick=${toggleTheme} />
    <${Btn} variant="ghost" icon="expand" title="Pantalla completa" onClick=${full} />
    <${Btn} variant="primary" icon="print" onClick=${printPage}>Imprimeix / PDF</${Btn}>
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
  const span = (key) => (['mob', 'act', 'pot'].includes(key) ? 6 / warm : ['acc', 'cal'].includes(key) ? 6 / fin : 6);
  return html`<div class="present">
    <${PresentBar} title=${`Sessió ${s.number} · ${U.fullName(p)}`} onClose=${() => go('sessio', s.id)}>
      <${Btn} variant="ghost" icon="edit" onClick=${() => go('sessio', s.id)}>Edita</${Btn}>
    </${PresentBar}>
    <article class="sheet">
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
          return html`<section class=${U.cls('sblock', `blk-${b.key}`, b.key === 'for' && 'sblock-main')} style=${`--span:${span(b.key)}`}>
            <header class="sblock-head">
              <span class="sblock-num">${def.num}</span>
              <div><h2 class="sblock-name">${blockName(b.key)}</h2>${b.focus && html`<p class="sblock-focus">${b.focus}</p>`}</div>
            </header>
            <ol class="sx">
              ${b.items.filter((i) => i.name).map((it, i) => {
                const tags = [it.lat === 'UL' ? 'Unilateral' : '', it.cont ? (OPT.cont.find((o) => o.v === it.cont) || {}).label : '', it.material && !/^(Terra|Pes corporal)$/.test(it.material) ? it.material : ''].filter(Boolean);
                return html`<li class="sx-item">
                  <span class="sx-n">${def.num}.${i + 1}</span>
                  <div class="sx-body">
                    <div class="sx-line"><span class="sx-name">${it.name}</span><span class="sx-rx">${Calc.presc(it)}</span></div>
                    ${(tags.length > 0 || it.note) && html`<div class="sx-meta">${tags.map((t) => html`<span class="tag">${t}</span>`)}${it.note && html`<span class="sx-note">${it.note}</span>`}</div>`}
                  </div>
                </li>`;
              })}
            </ol>
          </section>`;
        })}
      </div>` : html`<${Empty} icon="dumbbell" title="Aquesta sessió encara no té exercicis" text="Omple els blocs a l'editor de la sessió." />`}

      <footer class="sheet-foot">
        <span>${Store.settings.centerName || 'EON Life'} · ${Store.settings.centerTagline || 'Human Performance'}</span>
        <span>${U.plural(total, 'exercici', 'exercicis')} · ${U.fmtDate(s.date)}</span>
      </footer>
    </article>
  </div>`;
}
