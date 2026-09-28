/* EON Life · components d'interfície reutilitzables. */

// ── Icones (traç 1,8 px, 24 × 24) ──
const ICONS = {
  home: html`<path d="M3 10.5 12 3l9 7.5"/><path d="M5 9.5V20h5v-6h4v6h5V9.5"/>`,
  users: html`<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20c.8-3.6 3.4-5.5 6.5-5.5s5.7 1.9 6.5 5.5"/><path d="M16 4.8a3.3 3.3 0 0 1 0 6.4"/><path d="M18 14.6c1.8.7 3 2.5 3.5 5.4"/>`,
  book: html`<path d="M4 4.5A1.5 1.5 0 0 1 5.5 3H20v15H5.5A1.5 1.5 0 0 0 4 19.5z"/><path d="M4 19.5A1.5 1.5 0 0 0 5.5 21H20"/><path d="M8 7h8M8 10.5h6"/>`,
  settings: html`<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 0 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 0 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 0 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 0 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>`,
  plus: html`<path d="M12 5v14M5 12h14"/>`,
  minus: html`<path d="M5 12h14"/>`,
  search: html`<circle cx="11" cy="11" r="6.5"/><path d="m20 20-4.2-4.2"/>`,
  right: html`<path d="m9 5 7 7-7 7"/>`,
  left: html`<path d="m15 5-7 7 7 7"/>`,
  down: html`<path d="m5 9 7 7 7-7"/>`,
  up: html`<path d="m5 15 7-7 7 7"/>`,
  back: html`<path d="M19 12H5"/><path d="m11 18-6-6 6-6"/>`,
  play: html`<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m10 8.5 4.5 2.5-4.5 2.5z"/><path d="M8 21h8"/>`,
  print: html`<path d="M7 9V3h10v6"/><rect x="3" y="9" width="18" height="8" rx="2"/><path d="M7 14h10v7H7z"/>`,
  copy: html`<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a1 1 0 0 0-1-1H5a1 1 0 0 0-1 1v10a1 1 0 0 0 1 1h3"/>`,
  trash: html`<path d="M4 7h16"/><path d="M10 11v6M14 11v6"/><path d="M6 7l1 13h10l1-13"/><path d="M9 7V4h6v3"/>`,
  edit: html`<path d="M4 20h4L19 9a2.8 2.8 0 0 0-4-4L4 16z"/><path d="m13.5 6.5 4 4"/>`,
  check: html`<path d="m5 12.5 4.5 4.5L19 7.5"/>`,
  x: html`<path d="M6 6l12 12M18 6 6 18"/>`,
  folder: html`<path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/>`,
  video: html`<rect x="3" y="6" width="13" height="12" rx="2"/><path d="m16 10 5-3v10l-5-3"/>`,
  link: html`<path d="M10 14a4.5 4.5 0 0 0 6.4 0l3-3a4.5 4.5 0 0 0-6.4-6.4l-1 1"/><path d="M14 10a4.5 4.5 0 0 0-6.4 0l-3 3a4.5 4.5 0 0 0 6.4 6.4l1-1"/>`,
  calendar: html`<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>`,
  chart: html`<path d="M4 20V4"/><path d="M4 20h16"/><path d="m7 15 4-5 3 3 5-6"/>`,
  alert: html`<path d="M12 4 2.5 20h19z"/><path d="M12 10v4.5M12 17.5v.1"/>`,
  info: html`<circle cx="12" cy="12" r="9"/><path d="M12 11v5.5M12 7.8v.1"/>`,
  cloud: html`<path d="M7 18a4.5 4.5 0 0 1-.6-9A6 6 0 0 1 18 8.5a4.5 4.5 0 0 1-.5 9.5z"/><path d="m9.5 13 2 2 3.5-3.5"/>`,
  device: html`<rect x="5" y="3" width="14" height="18" rx="2"/><path d="M11 18h2"/>`,
  more: html`<circle cx="5" cy="12" r="1.3"/><circle cx="12" cy="12" r="1.3"/><circle cx="19" cy="12" r="1.3"/>`,
  clipboard: html`<rect x="5" y="4" width="14" height="17" rx="2"/><path d="M9 4V3h6v1"/><path d="M9 10h6M9 14h6M9 18h3"/>`,
  dumbbell: html`<path d="M6.5 7v10M17.5 7v10M3.5 9.5v5M20.5 9.5v5M6.5 12h11"/>`,
  clock: html`<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>`,
  layers: html`<path d="m12 3 9 5-9 5-9-5z"/><path d="m3 13 9 5 9-5"/>`,
  upload: html`<path d="M12 16V4"/><path d="m7 9 5-5 5 5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>`,
  download: html`<path d="M12 4v12"/><path d="m7 11 5 5 5-5"/><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3"/>`,
  eye: html`<path d="M2.5 12S6 5.5 12 5.5 21.5 12 21.5 12 18 18.5 12 18.5 2.5 12 2.5 12z"/><circle cx="12" cy="12" r="3"/>`,
  eyeoff: html`<path d="M3 3l18 18"/><path d="M10.6 5.6A9.8 9.8 0 0 1 12 5.5c6 0 9.5 6.5 9.5 6.5a17 17 0 0 1-3 3.8M6.3 7.3A16.6 16.6 0 0 0 2.5 12S6 18.5 12 18.5a9.3 9.3 0 0 0 4.4-1.1"/><path d="M9.9 9.9a3 3 0 0 0 4.2 4.2"/>`,
  moon: html`<path d="M20 14.5A8 8 0 0 1 9.5 4a8 8 0 1 0 10.5 10.5z"/>`,
  sun: html`<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>`,
  expand: html`<path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5"/>`,
  menu: html`<path d="M4 7h16M4 12h16M4 17h16"/>`,
  note: html`<path d="M5 4h14v11l-5 5H5z"/><path d="M14 20v-5h5"/><path d="M8.5 9h7M8.5 12.5h4"/>`,
  flame: html`<path d="M12 21c-3.9 0-6.5-2.6-6.5-6 0-3.2 2.2-5 3.5-7.5.6 1.7 1.6 2.6 2.6 3 .3-3.1 1.6-5.6 4-7.5.2 3 1.9 4.5 3 6.5.8 1.4 1.4 2.9 1.4 4.5 0 3.9-3 7-8 7z"/>`,
  target: html`<circle cx="12" cy="12" r="8.5"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>`,
  refresh: html`<path d="M20 11a8 8 0 0 0-14.3-4.6L4 8"/><path d="M4 4v4h4"/><path d="M4 13a8 8 0 0 0 14.3 4.6L20 16"/><path d="M20 20v-4h-4"/>`,
  table: html`<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M3 9.5h18M3 15h18M9 4v16"/>`,
  database: html`<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6"/><path d="M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>`,
};

function Icon({ name, size = 18, class: c }) {
  return html`<svg class=${U.cls('ic', c)} width=${size} height=${size} viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${ICONS[name] || null}</svg>`;
}

function Btn({ variant = 'secondary', size, icon, iconRight, onClick, disabled, title, type = 'button', class: c, children, href, target, id }) {
  const cls = U.cls('btn', `btn-${variant}`, size && `btn-${size}`, !children && 'btn-icon', c);
  const inner = html`${icon && html`<${Icon} name=${icon} />`}${children && html`<span>${children}</span>`}${iconRight && html`<${Icon} name=${iconRight} />`}`;
  if (href) return html`<a class=${cls} href=${href} target=${target || '_blank'} rel="noopener" title=${title} id=${id}>${inner}</a>`;
  return html`<button type=${type} class=${cls} onClick=${onClick} disabled=${disabled} title=${title} aria-label=${!children ? title : undefined} id=${id}>${inner}</button>`;
}

function Pill({ tone = 'neutral', children, icon, title, class: c }) {
  return html`<span class=${U.cls('pill', `pill-${tone}`, c)} title=${title}>${icon && html`<${Icon} name=${icon} size=${13} />`}${children}</span>`;
}

// Puntuació de patrons (0 · − · −− · P) amb els colors del document EON.
function ScoreDot({ v, pain, size = 'md', title }) {
  if (pain) return html`<span class=${U.cls('score', 'score-p', `score-${size}`)} title=${title || PAIN_INFO.label}>P</span>`;
  const s = Calc.scoreInfo(v);
  if (!s) return html`<span class=${U.cls('score', 'score-empty', `score-${size}`)} title=${title || 'Sense puntuar'}>·</span>`;
  return html`<span class=${U.cls('score', `score-${s.tone}`, `score-${size}`)} title=${title || s.label}>${s.sym}</span>`;
}

let fieldSeq = 0;
function useId(prefix = 'f') {
  const r = useRef(null);
  if (!r.current) r.current = `${prefix}-${++fieldSeq}`;
  return r.current;
}

function Field({ label, hint, children, class: c, id, wide }) {
  return html`<div class=${U.cls('field', wide && 'field-wide', c)}>
    ${label && html`<label class="field-label" for=${id}>${label}</label>`}
    ${children}
    ${hint && html`<div class="field-hint">${hint}</div>`}
  </div>`;
}

function TextInput({ value, onValue, placeholder, id, type = 'text', class: c, list, autoFocus, onKeyDown, onBlur, inputmode, ariaLabel, disabled }) {
  const ref = useRef(null);
  useEffect(() => { if (autoFocus && ref.current) ref.current.focus(); }, []);
  return html`<input ref=${ref} id=${id} type=${type} class=${U.cls('input', c)} value=${value ?? ''} placeholder=${placeholder}
    list=${list} inputmode=${inputmode} aria-label=${ariaLabel} disabled=${disabled}
    onInput=${(e) => onValue && onValue(e.currentTarget.value)} onKeyDown=${onKeyDown} onBlur=${onBlur} />`;
}

// Entrada numèrica que accepta coma decimal; mostra la unitat dins del camp.
function NumInput({ value, onValue, unit, placeholder, id, class: c, ariaLabel, wide }) {
  return html`<span class=${U.cls('numin', wide && 'numin-wide', c)}>
    <input id=${id} type="text" inputmode="decimal" autocomplete="off" class="input input-num" value=${value ?? ''}
      placeholder=${placeholder ?? ''} aria-label=${ariaLabel}
      onInput=${(e) => onValue(e.currentTarget.value.replace(/[^0-9.,\-]/g, ''))} />
    ${unit && html`<span class="numin-unit">${unit}</span>`}
  </span>`;
}

function Area({ value, onValue, placeholder, id, rows = 2, class: c, ariaLabel }) {
  const ref = useRef(null);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.max(el.scrollHeight, rows * 22 + 18)}px`;
  }, [value]);
  return html`<textarea ref=${ref} id=${id} class=${U.cls('input', 'area', c)} rows=${rows} value=${value ?? ''} placeholder=${placeholder} aria-label=${ariaLabel}
    onInput=${(e) => onValue(e.currentTarget.value)}></textarea>`;
}

function Select({ value, onValue, options, id, placeholder, class: c, ariaLabel }) {
  const opts = options.map((o) => (typeof o === 'string' ? { v: o, label: o } : o));
  const known = opts.some((o) => o.v === (value ?? ''));
  return html`<select id=${id} class=${U.cls('input', 'select', c)} value=${value ?? ''} aria-label=${ariaLabel} onChange=${(e) => onValue(e.currentTarget.value)}>
    ${placeholder != null && html`<option value="">${placeholder}</option>`}
    ${!known && value && html`<option value=${value}>${value}</option>`}
    ${opts.map((o) => html`<option value=${o.v}>${o.label}</option>`)}
  </select>`;
}

// Botons segmentats (un sol valor). Tornar a tocar l'opció activa la desmarca.
function Seg({ value, onValue, options, size, ariaLabel, class: c, allowEmpty = true }) {
  const opts = options.map((o) => (typeof o === 'string' ? { v: o, label: o } : o));
  return html`<div class=${U.cls('seg', size && `seg-${size}`, c)} role="radiogroup" aria-label=${ariaLabel}>
    ${opts.map((o) => html`<button type="button" role="radio" aria-checked=${value === o.v}
      class=${U.cls('seg-btn', value === o.v && 'on', o.tone && `seg-${o.tone}`)} title=${o.title}
      onClick=${() => onValue(allowEmpty && value === o.v ? '' : o.v)}>${o.label}</button>`)}
  </div>`;
}

function Chip({ on, onClick, children, title }) {
  return html`<button type="button" class=${U.cls('chip', on && 'on')} aria-pressed=${!!on} title=${title} onClick=${onClick}>${on && html`<${Icon} name="check" size=${13} />`}${children}</button>`;
}

function Tabs({ tabs, active, onChange }) {
  return html`<div class="tabs" role="tablist">
    ${tabs.map((t) => html`<button type="button" role="tab" aria-selected=${active === t.id} class=${U.cls('tab', active === t.id && 'on')} onClick=${() => onChange(t.id)}>
      ${t.label}${t.count != null && html`<span class="tab-count">${t.count}</span>`}
    </button>`)}
  </div>`;
}

function Stat({ label, value, unit, sub, tone, icon }) {
  return html`<div class=${U.cls('stat', tone && `stat-${tone}`)}>
    <div class="stat-label">${icon && html`<${Icon} name=${icon} size=${15} />`}${label}</div>
    <div class="stat-value">${value}${unit && html`<span class="stat-unit">${unit}</span>`}</div>
    ${sub && html`<div class="stat-sub">${sub}</div>`}
  </div>`;
}

function Empty({ icon = 'info', title, text, children }) {
  return html`<div class="empty">
    <div class="empty-icon"><${Icon} name=${icon} size=${22} /></div>
    <div class="empty-title">${title}</div>
    ${text && html`<p class="empty-text">${text}</p>`}
    ${children && html`<div class="empty-actions">${children}</div>`}
  </div>`;
}

function Avatar({ p, size = 'md' }) {
  return html`<span class=${U.cls('avatar', `avatar-${size}`)} aria-hidden="true">${U.initials(p || {})}</span>`;
}

function BlockTag({ k, small }) {
  const b = blockDef(k);
  return html`<span class=${U.cls('blocktag', `blk-${k}`, small && 'blocktag-sm')}><span class="blocktag-num">${b.num}</span>${blockName(k)}</span>`;
}

// Menú desplegable simple.
function Menu({ items, icon = 'more', label, title = 'Més opcions', align = 'right', variant = 'ghost' }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    const esc = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('pointerdown', close);
    document.addEventListener('keydown', esc);
    return () => { document.removeEventListener('pointerdown', close); document.removeEventListener('keydown', esc); };
  }, [open]);
  return html`<div class="menu" ref=${ref}>
    <${Btn} variant=${variant} icon=${icon} title=${title} onClick=${() => setOpen(!open)}>${label}</${Btn}>
    ${open && html`<div class=${U.cls('menu-list', `menu-${align}`)} role="menu">
      ${items.filter(Boolean).map((it) => it.sep ? html`<div class="menu-sep"></div>` : it.header ? html`<div class="menu-header">${it.header}</div>` : html`<button type="button" role="menuitem" class=${U.cls('menu-item', it.danger && 'danger')} disabled=${it.disabled}
        onClick=${() => { setOpen(false); it.onClick(); }}>${it.icon && html`<${Icon} name=${it.icon} size=${16} />`}<span>${it.label}</span></button>`)}
    </div>`}
  </div>`;
}

// ── Diàlegs i avisos (sense alert/confirm del navegador) ──
const UIState = {
  modals: [],
  toasts: [],
  listeners: new Set(),
  emit() { for (const fn of this.listeners) fn(); },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};

const UI = {
  open(render, opts = {}) {
    const m = { id: U.uid('M'), render, ...opts };
    UIState.modals = [...UIState.modals, m];
    UIState.emit();
    return () => UI.close(m.id);
  },
  close(id) {
    UIState.modals = id ? UIState.modals.filter((m) => m.id !== id) : UIState.modals.slice(0, -1);
    UIState.emit();
  },
  confirm({ title, text, ok = 'D\'acord', cancel = 'Cancel·la', danger = false }) {
    return new Promise((resolve) => {
      let close = null;
      const done = (v) => { close(); resolve(v); };
      close = UI.open(() => html`<${Dialog} title=${title} onClose=${() => done(false)} footer=${html`
        <${Btn} variant="ghost" onClick=${() => done(false)}>${cancel}</${Btn}>
        <${Btn} variant=${danger ? 'danger' : 'primary'} onClick=${() => done(true)}>${ok}</${Btn}>`}>
        ${text && html`<p class="dialog-text">${text}</p>`}
      </${Dialog}>`, { size: 'sm', onDismiss: () => done(false) });
    });
  },
  prompt({ title, label, value = '', ok = 'Desa', placeholder }) {
    return new Promise((resolve) => {
      let close = null;
      let current = value;
      const done = (v) => { close(); resolve(v); };
      close = UI.open(() => html`<${Dialog} title=${title} onClose=${() => done(null)} footer=${html`
        <${Btn} variant="ghost" onClick=${() => done(null)}>Cancel·la</${Btn}>
        <${Btn} variant="primary" onClick=${() => done(current.trim() || null)}>${ok}</${Btn}>`}>
        <form onSubmit=${(e) => { e.preventDefault(); done(current.trim() || null); }}>
          <${Field} label=${label} id="prompt-input">
            <${PromptInput} value=${value} placeholder=${placeholder} onValue=${(v) => { current = v; }} />
          </${Field}>
        </form>
      </${Dialog}>`, { size: 'sm', onDismiss: () => done(null) });
    });
  },
  toast(text, tone = 'ok') {
    const t = { id: U.uid('N'), text, tone };
    UIState.toasts = [...UIState.toasts, t];
    UIState.emit();
    setTimeout(() => { UIState.toasts = UIState.toasts.filter((x) => x.id !== t.id); UIState.emit(); }, 3200);
  },
};

function PromptInput({ value, onValue, placeholder }) {
  const [v, setV] = useState(value);
  return html`<${TextInput} id="prompt-input" value=${v} placeholder=${placeholder} autoFocus=${true} onValue=${(x) => { setV(x); onValue(x); }} />`;
}

function Dialog({ title, children, footer, onClose, wide }) {
  useEffect(() => {
    const esc = (e) => { if (e.key === 'Escape') onClose && onClose(); };
    document.addEventListener('keydown', esc);
    return () => document.removeEventListener('keydown', esc);
  }, []);
  return html`<div class=${U.cls('dialog', wide && 'dialog-wide')} role="dialog" aria-modal="true" aria-label=${title}>
    <div class="dialog-head">
      <h2 class="dialog-title">${title}</h2>
      ${onClose && html`<${Btn} variant="ghost" icon="x" title="Tanca" onClick=${onClose} />`}
    </div>
    <div class="dialog-body">${children}</div>
    ${footer && html`<div class="dialog-foot">${footer}</div>`}
  </div>`;
}

function ModalHost() {
  const [, set] = useState(0);
  useEffect(() => UIState.subscribe(() => set((n) => n + 1)), []);
  return html`${UIState.modals.map((m, i) => html`<div class=${U.cls('overlay', i < UIState.modals.length - 1 && 'overlay-under')} key=${m.id}
      onPointerDown=${(e) => { if (e.target === e.currentTarget && m.dismissable !== false) { if (m.onDismiss) m.onDismiss(); else UI.close(m.id); } }}>
      ${m.render()}
    </div>`)}
    <div class="toasts" aria-live="polite">${UIState.toasts.map((t) => html`<div class=${U.cls('toast', `toast-${t.tone}`)} key=${t.id}>
      <${Icon} name=${t.tone === 'bad' ? 'alert' : 'check'} size=${16} />${t.text}</div>`)}</div>`;
}

// Selector d'exercicis de la biblioteca (amb text lliure).
function ExercisePicker({ value, block, onPick, onText, placeholder = 'Exercici…', autoFocus, id }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState(null);
  const [hi, setHi] = useState(0);
  const [nav, setNav] = useState(false);
  const ref = useRef(null);
  const inputRef = useRef(null);
  useEffect(() => { if (autoFocus && inputRef.current) inputRef.current.focus(); }, []);
  useEffect(() => {
    if (!open) return undefined;
    const close = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setQ(null); } };
    document.addEventListener('pointerdown', close);
    return () => document.removeEventListener('pointerdown', close);
  }, [open]);

  const text = q ?? value ?? '';
  const results = useMemo(() => {
    if (!open) return [];
    const nq = U.norm(q ?? '');
    const all = Store.exercises();
    const match = (e) => !nq || U.norm(`${e.name} ${e.cat} ${e.material} ${e.gm}`).includes(nq);
    const mine = all.filter((e) => e.block === block && match(e));
    const others = nq ? all.filter((e) => e.block !== block && match(e)) : [];
    return [...mine, ...others].slice(0, 40);
  }, [open, q, block, Store.version]);

  const pick = (ex) => { setOpen(false); setQ(null); onPick(ex); };
  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setOpen(true); setNav(true); setHi(Math.min(hi + (nav ? 1 : 0), results.length - 1)); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setNav(true); setHi(Math.max(hi - 1, 0)); }
    else if (e.key === 'Enter') {
      // Enter tria l'opció marcada només si s'hi ha arribat amb les fletxes o si el nom coincideix exactament.
      const exact = results.find((x) => U.norm(x.name) === U.norm(q || ''));
      const choice = nav ? results[hi] : exact;
      e.preventDefault();
      if (open && choice) pick(choice);
      else { setOpen(false); setQ(null); }
    } else if (e.key === 'Escape') { setOpen(false); setQ(null); }
  };

  let lastBlock = null;
  return html`<div class="picker" ref=${ref}>
    <input ref=${inputRef} id=${id} class="input picker-input" value=${text} placeholder=${placeholder} autocomplete="off"
      role="combobox" aria-expanded=${open} aria-label="Exercici"
      onFocus=${() => setOpen(true)}
      onInput=${(e) => { const v = e.currentTarget.value; setQ(v); setHi(0); setNav(false); setOpen(true); onText(v); }}
      onKeyDown=${onKey} />
    ${open && results.length > 0 && html`<div class="picker-list" role="listbox">
      ${results.map((ex, i) => {
        const head = ex.block !== lastBlock ? html`<div class="picker-group"><${BlockTag} k=${ex.block} small=${true} /></div>` : null;
        lastBlock = ex.block;
        return html`${head}<button type="button" role="option" aria-selected=${nav && i === hi} class=${U.cls('picker-opt', nav && i === hi && 'hi')}
          onPointerDown=${(e) => e.preventDefault()} onClick=${() => pick(ex)}>
          <span class="picker-name">${ex.name}</span>
          <span class="picker-meta">${[ex.cat, ex.material, Calc.presc(ex)].filter(Boolean).join(' · ')}</span>
        </button>`;
      })}
    </div>`}
  </div>`;
}

// Estat de desament visible a totes les pantalles d'edició.
function SaveStatus() {
  const pending = Store.pending();
  if (Store.saveError) return html`<span class="save save-error" title=${Store.saveError}><${Icon} name="alert" size=${15} />No s'ha pogut desar · reintentant</span>`;
  if (pending) return html`<span class="save save-busy"><span class="spinner"></span>Desant…</span>`;
  return html`<span class="save save-ok"><${Icon} name=${Store.meta.mode === 'google' ? 'cloud' : 'check'} size=${15} />${Store.meta.mode === 'google' ? 'Desat al núvol' : 'Desat'}</span>`;
}

// Enllaç de vídeo d'un test o exercici (Drive, YouTube…).
function VideoButton({ url, onChange, title = 'Vídeo', patient }) {
  const has = U.isUrl(url);
  return html`<button type="button" class=${U.cls('mini', has && 'on')} title=${has ? `${title}: obrir o canviar l'enllaç` : `${title}: afegir enllaç`}
    onClick=${() => openVideoDialog({ url, onChange, title, patient })}><${Icon} name="video" size=${16} /></button>`;
}

function openVideoDialog({ url, onChange, title, patient }) {
  let close = null;
  close = UI.open(() => html`<${VideoDialog} url=${url} title=${title} patient=${patient}
    onSave=${(v) => { onChange(v); close(); }} onClose=${() => close()} />`);
}

function VideoDialog({ url, title, patient, onSave, onClose }) {
  const [v, setV] = useState(url || '');
  const [files, setFiles] = useState(null);
  const [loading, setLoading] = useState(false);
  const folderId = patient && patient.folderId;
  const loadFiles = async () => {
    if (!folderId) return;
    setLoading(true);
    try { setFiles(await Store.backend.listFiles(folderId)); } catch (e) { UI.toast(e.message, 'bad'); }
    setLoading(false);
  };
  useEffect(() => { if (Store.meta.mode === 'google' && folderId) loadFiles(); }, []);
  const videos = (files || []).filter((f) => /video|image/.test(f.mimeType || '') || /\.(mov|mp4|m4v|avi|webm)$/i.test(f.name));
  return html`<${Dialog} title=${`Vídeo · ${title}`} onClose=${onClose} footer=${html`
    ${url && html`<${Btn} variant="ghost" icon="trash" onClick=${() => onSave('')}>Treu l'enllaç</${Btn}>`}
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" onClick=${() => onSave(v.trim())}>Desa</${Btn}>`}>
    <${Field} label="Enllaç al vídeo" id="video-url" hint="Enganxa l'enllaç del fitxer de la carpeta del client (Google Drive).">
      <${TextInput} id="video-url" value=${v} onValue=${setV} placeholder="https://drive.google.com/…" autoFocus=${true} />
    </${Field}>
    ${U.isUrl(v) && html`<p><a class="link" href=${v} target="_blank" rel="noopener"><${Icon} name="video" size=${15} /> Obre el vídeo</a></p>`}
    ${patient && patient.folderUrl && html`<p><a class="link" href=${patient.folderUrl} target="_blank" rel="noopener"><${Icon} name="folder" size=${15} /> Obre la carpeta de ${patient.firstName}</a></p>`}
    ${Store.meta.mode === 'google' && folderId && html`<div class="filepick">
      <div class="filepick-head"><strong>Vídeos de la carpeta</strong><${Btn} variant="ghost" size="sm" icon="refresh" onClick=${loadFiles}>Actualitza</${Btn}></div>
      ${loading && html`<p class="muted">Carregant…</p>`}
      ${!loading && files && !videos.length && html`<p class="muted">No hi ha vídeos a la carpeta.</p>`}
      ${videos.map((f) => html`<button type="button" class=${U.cls('filepick-item', v === f.url && 'on')} onClick=${() => setV(f.url)}>
        <${Icon} name="video" size=${15} /><span>${f.name}</span><span class="muted">${f.folder || ''}</span></button>`)}
    </div>`}
  </${Dialog}>`;
}

// Nota desplegable per a tests i exercicis.
function NoteButton({ value, open, onToggle }) {
  return html`<button type="button" class=${U.cls('mini', (value || open) && 'on')} title=${value ? 'Veure o editar la nota' : 'Afegir una nota'} onClick=${onToggle}><${Icon} name="note" size=${16} /></button>`;
}

// Impressió amb detecció d'entorns on no està disponible (previsualitzacions incrustades).
function printPage() {
  let fired = false;
  const mark = () => { fired = true; };
  window.addEventListener('beforeprint', mark, { once: true });
  try { window.print(); } catch (e) { /* no disponible */ }
  setTimeout(() => {
    window.removeEventListener('beforeprint', mark);
    if (!fired) UI.toast('La impressió no està disponible en aquesta vista. Obre l\'app completa per desar el PDF.', 'bad');
  }, 1200);
}
