/* EON Life · NOE a la pantalla: el botó, el xat, les targetes de proposta i la configuració. */

const NOE_CHATS_KEY = 'eonlife:noe:chats';
const NOE_SUGGEST = [
  'Qui no ha entrenat els últims 14 dies?',
  'Quins pacients tenen el re-test aviat?',
  'Cerca exercicis de glutis amb goma',
];

// L'estat de NOE (la conversa oberta, si està ocupat…) viu fora dels components perquè no es perdi en canviar de pantalla.
const NoeUI = (() => {
  const listeners = new Set();
  let timer = null;
  const read = () => { try { const v = window.localStorage.getItem(NOE_CHATS_KEY); return v ? JSON.parse(v) : []; } catch (e) { return []; } };
  const S = { open: false, busy: false, error: '', draft: '', conv: null, chats: read(), showHistory: false };

  const emit = () => { if (timer) return; timer = setTimeout(() => { timer = null; for (const fn of listeners) fn(); }, 40); };
  const persist = () => {
    if (!S.conv) return;
    S.chats = [S.conv, ...S.chats.filter((c) => c.id !== S.conv.id)].slice(0, 12);
    // Si no hi cap, es deixen les converses més recents.
    for (let n = S.chats.length; n > 0; n--) {
      try { window.localStorage.setItem(NOE_CHATS_KEY, JSON.stringify(S.chats.slice(0, n))); return; } catch (e) { /* ple: se'n treu una */ }
    }
  };
  const ensure = () => { if (!S.conv) S.conv = S.chats[0] || Noe.newConversation(); if (!S.conv.log) S.conv.log = []; return S.conv; };

  // Què veu la persona ara, perquè NOE ho sàpiga («mira la fitxa de PAC-2»).
  function describeRoute(ps) {
    const r = Router.current || { name: 'inici', params: [] };
    const [a] = r.params;
    const pat = (id) => (id && Store.get('patients', id) ? ps.ref(id) : '');
    if (r.name === 'client' && pat(a)) return `La persona està mirant la fitxa del pacient ${pat(a)}.`;
    if (r.name === 'sessio' || r.name === 'fitxa') { const s = Store.get('sessions', a); if (s) return `La persona està mirant la sessió ${s.id} (${s.date}) del pacient ${pat(s.patientId)}.`; }
    if (r.name === 'valoracio' || r.name === 'informe') { const v = Store.get('assessments', a); if (v) return `La persona està mirant la valoració ${v.id} (${v.date}) del pacient ${pat(v.patientId)}.`; }
    if (r.name === 'informetests' || r.name === 'informesessions' || r.name === 'progres' || r.name === 'pla') { if (pat(a)) return `La persona està mirant un informe del pacient ${pat(a)}.`; }
    return '';
  }

  async function send(text) {
    const t = String(text || '').trim();
    if (!t || S.busy) return;
    const conv = ensure();
    S.busy = true; S.error = ''; S.draft = '';
    const log = conv.log;
    log.push({ t: 'user', text: t });
    let fresh = true;
    emit();
    try {
      await Noe.send(conv, t, {
        context: describeRoute,
        onRound: () => { fresh = true; },
        onText: (d) => { const last = log[log.length - 1]; if (fresh || !last || last.t !== 'text') { log.push({ t: 'text', text: d }); fresh = false; } else last.text += d; emit(); },
        onTool: (name, input) => { log.push({ t: 'tool', name, input, id: log.length }); fresh = true; emit(); },
        onToolResult: (name) => { const last = [...log].reverse().find((x) => x.t === 'tool' && x.name === name && !x.done); if (last) last.done = true; emit(); },
        onProposal: (p) => { log.push({ t: 'proposal', id: p.id }); fresh = true; emit(); },
      });
    } catch (e) {
      Noe.repair(conv);
      if (e && e.name === 'AbortError') S.error = 'Has aturat NOE.';
      else S.error = (e && e.code === 'setup') ? 'NOE encara no està configurat.' : (e && e.message) || 'NOE no ha pogut respondre.';
      // Si no s'ha arribat a fer res d'aquest missatge, es treu i torna al quadre perquè es pugui reenviar.
      const u = log.map((x) => x.t).lastIndexOf('user');
      if (u === log.length - 1 && !(e && e.name === 'AbortError')) { log.pop(); S.draft = t; }
      else {
        const lost = log.slice(u + 1).filter((x) => x.t === 'proposal').map((x) => x.id);
        if (lost.length) conv.notes = [...(conv.notes || []), `En una consulta que va fallar es van crear les propostes ${lost.join(', ')}: la persona les veu a la pantalla.`];
      }
    } finally {
      S.busy = false;
      persist();
      emit();
    }
  }

  return {
    S, send, persist, ensure, emit,
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    open(v = true) { S.open = v; if (v) ensure(); emit(); },
    stop() { Noe.cancel(); },
    newChat() { if (S.busy) return; persist(); S.conv = Noe.newConversation(); S.conv.log = []; S.error = ''; S.showHistory = false; emit(); },
    openChat(id) { if (S.busy) return; const c = S.chats.find((x) => x.id === id); if (c) { S.conv = c; if (!c.log) c.log = []; S.showHistory = false; S.error = ''; emit(); } },
    deleteChat(id) { S.chats = S.chats.filter((c) => c.id !== id); if (S.conv && S.conv.id === id) S.conv = null; try { window.localStorage.setItem(NOE_CHATS_KEY, JSON.stringify(S.chats)); } catch (e) { /* res */ } ensure(); emit(); },
    clearAll() { S.chats = []; S.conv = null; try { window.localStorage.removeItem(NOE_CHATS_KEY); } catch (e) { /* res */ } ensure(); emit(); },
    toggleHistory() { S.showHistory = !S.showHistory; emit(); },
  };
})();

function useNoe() {
  const [, set] = useState(0);
  useEffect(() => NoeUI.subscribe(() => set((n) => n + 1)), []);
  return NoeUI.S;
}

// ── Text amb format senzill (negreta, cursiva, llistes, enllaços [[pacient:PAC-1]]) ──
function noeInline(text, conv) {
  const out = [];
  // (sense lookbehind: iPad/Safari antics no el suporten i l'app sencera deixaria de carregar)
  const re = /\[\[(pacient|sessio|valoracio|exercici):([^\]]+)\]\]|\*\*([^*]+)\*\*|(^|\s)_([^_\n]+)_(?=\s|[.,;:!?)]|$)|`([^`]+)`/g;
  let last = 0, m, k = 0;
  const ps = NoePseudo.create(conv.ps);
  const dec = (s) => ps.decode(s);
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(dec(text.slice(last, m.index)));
    if (m[1]) out.push(noeLink(m[1], m[2].trim(), conv, ps, k++));
    else if (m[3]) out.push(html`<strong key=${k++}>${dec(m[3])}</strong>`);
    else if (m[5]) { if (m[4]) out.push(m[4]); out.push(html`<em key=${k++}>${dec(m[5])}</em>`); }
    else if (m[6]) out.push(html`<code key=${k++}>${dec(m[6])}</code>`);
    last = m.index + m[0].length;
  }
  if (last < text.length) out.push(dec(text.slice(last)));
  return out;
}

function noeLink(kind, id, conv, ps, key) {
  let label = id, onClick = null, tip = '';
  if (kind === 'pacient') {
    const pid = (conv.ps.map || {})[id.toUpperCase()] || id;
    const p = Store.get('patients', pid);
    label = p ? U.fullName(p) : id; if (p) onClick = () => go('client', p.id);
  } else if (kind === 'sessio') {
    const s = Store.get('sessions', id);
    label = s ? `Sessió ${s.number} · ${U.fmtDate(s.date)}` : id; if (s) onClick = () => go('sessio', s.id);
  } else if (kind === 'valoracio') {
    const a = Store.get('assessments', id);
    label = a ? `Valoració del ${U.fmtDate(a.date)}` : id; if (a) onClick = () => go('valoracio', a.id);
  } else {
    const e = Store.exercise(id);
    label = e ? e.name : id; if (e) { tip = 'Obre la biblioteca'; onClick = () => go('biblioteca'); }
  }
  return onClick ? html`<button type="button" key=${key} class="noe-chip noe-chip-${kind}" title=${tip} onClick=${() => { onClick(); if (window.matchMedia && window.matchMedia('(max-width: 720px)').matches) NoeUI.open(false); }}>${label}</button>`
    : html`<span key=${key} class="noe-chip noe-chip-off">${label}</span>`;
}

function NoeText({ text, conv }) {
  const blocks = String(text || '').trim().split(/\n{2,}/);
  return html`<div class="noe-text">${blocks.map((b, i) => {
    const lines = b.split('\n');
    if (lines.every((l) => /^\s*[-*•]\s+/.test(l))) return html`<ul key=${i}>${lines.map((l, j) => html`<li key=${j}>${noeInline(l.replace(/^\s*[-*•]\s+/, ''), conv)}</li>`)}</ul>`;
    if (lines.every((l) => /^\s*\d+[.)]\s+/.test(l))) return html`<ol key=${i}>${lines.map((l, j) => html`<li key=${j}>${noeInline(l.replace(/^\s*\d+[.)]\s+/, ''), conv)}</li>`)}</ol>`;
    const head = b.match(/^#{1,4}\s+(.*)$/);
    if (head && lines.length === 1) return html`<h4 key=${i} class="noe-h">${noeInline(head[1], conv)}</h4>`;
    return html`<p key=${i}>${lines.map((l, j) => html`${j > 0 && html`<br />`}${noeInline(l, conv)}`)}</p>`;
  })}</div>`;
}

// Diverses consultes seguides del mateix tipus (p. ex. 5 cerques d'exercicis) surten com una sola línia.
function noeGroup(log) {
  const out = [];
  for (const x of log) {
    const last = out[out.length - 1];
    if (x.t === 'tool' && last && last.t === 'tool' && last.name === x.name && !/^proposar_/.test(x.name) && last.input && x.input && x.name === 'buscar_exercicis') { last.n = (last.n || 1) + 1; last.done = last.done && x.done; last.input = { ...last.input, bloc: '' }; continue; }
    out.push(x.t === 'tool' ? { ...x, n: 1 } : x);
  }
  return out;
}

// «Mirant la fitxa de Laura…» mentre NOE consulta coses.
function noeToolLabel(t, conv) {
  const ps = NoePseudo.create(conv.ps);
  const who = (v) => (v ? ps.decode(String(v)) : 'un pacient');
  const i = t.input || {};
  switch (t.name) {
    case 'llista_pacients': return 'Consultant la llista de pacients';
    case 'cerca_global': return `Cercant «${ps.decode(String(i.text || ''))}» a l'app`;
    case 'fitxa_pacient': return `Mirant la fitxa de ${who(i.pacient)}`;
    case 'valoracions_pacient': return `Mirant les valoracions de ${who(i.pacient)}`;
    case 'sessions_pacient': return `Mirant les sessions de ${who(i.pacient)}`;
    case 'sessio': return 'Mirant una sessió';
    case 'calendari_pacient': return `Mirant el calendari de ${who(i.pacient)}${i.mes ? ` (${i.mes})` : ''}`;
    case 'buscar_exercicis': return `Cercant exercicis a la biblioteca${i.bloc ? ` (${blockName(i.bloc)})` : ''}`;
    case 'familia_exercici': return 'Mirant la progressió d\'un exercici';
    default: return /^proposar_/.test(t.name) ? 'Preparant una proposta' : t.name;
  }
}

// ── Targeta d'una proposta (aplicar, descartar, desfer) ──
const NOE_KIND = { sessio: ['calendar', 'Sessió'], mes: ['calendar', 'Planificació'], canvi: ['edit', 'Canvis'], pla: ['layers', 'Pla'], nota: ['note', 'Nota'] };

function NoeProposal({ conv, id }) {
  const [open, setOpen] = useState(false);
  const prop = (conv.proposals || {})[id];
  if (!prop) return null;
  const [icon, kindLabel] = NOE_KIND[prop.kind] || ['sparkles', 'Proposta'];
  const ps = NoePseudo.create(conv.ps);
  const p = Store.get('patients', prop.pid);
  const act = (fn, toastOk = true) => {
    const r = fn(conv, id);
    UI.toast(r.message, r.ok ? 'ok' : 'bad');
    NoeUI.persist(); NoeUI.emit();
    return r;
  };
  const sessionsList = (list) => list.map((s, i) => html`<div class=${U.cls('noe-sess', s.skip && 'skip')} key=${i}>
    <div class="noe-sess-h"><strong>${U.fmtDate(s.date)}</strong>${s.goal ? html` · ${s.goal}` : ''}${s.skip ? html` <span class="pill pill-warn">no es crearà (dia ocupat o repetit)</span>` : ''}</div>
    ${s.blocks.map((b) => html`<div class="noe-blk" key=${b.key}><span class=${`noe-blk-k blk-${b.key}`}>${blockName(b.key)}</span>${b.items.map((it) => `${it.name}${it.over && (it.over.sets || it.over.reps) ? ` ${it.over.sets || ''}×${it.over.reps || ''}` : ''}`).join(' · ')}</div>`)}
  </div>`);
  const details = open && html`<div class="noe-details">
    ${prop.data.sessions && sessionsList(prop.data.sessions)}
    ${prop.kind === 'canvi' && html`<ul class="noe-ops">${prop.data.ops.map((o, i) => html`<li key=${i}>${({ canviar_objectiu: `Objectiu → «${o.valor}»`, canviar_data: `Data → ${U.fmtDate(o.valor)}`, afegir: `Afegeix a ${blockName(o.key)}: ${o.spec && o.spec.name}`, treure: `Treu de ${blockName(o.key)}: ${o.label}`, substituir: `Canvia ${o.label} per ${o.spec && o.spec.name}`, prescripcio: `${o.label}: ${Object.entries(o.over).map(([k, v]) => `${({ sets: 'sèries', reps: 'reps', load: 'càrrega', intensity: 'intensitat', rest: 'descans', tempo: 'tempo', note: 'nota' })[k]} ${v}`).join(', ')}` })[o.a]}</li>`)}</ul>`}
    ${prop.kind === 'pla' && prop.data.sessions.map((s) => html`<div class="noe-sess" key=${s.n}><div class="noe-sess-h"><strong>S${s.n}</strong>${s.phase ? ` · ${s.phase}` : ''}${s.goal ? ` · ${s.goal}` : ''}</div>
      ${s.blocks.map((b) => html`<div class="noe-blk" key=${b.key}><span class=${`noe-blk-k blk-${b.key}`}>${blockName(b.key)}</span>${b.items.map((it) => it.name).join(' · ')}</div>`)}</div>`)}
    ${prop.kind === 'nota' && html`<p class="noe-note">${ps.decode(prop.data.text)}</p>`}
  </div>`;
  return html`<div class=${`noe-card noe-card-${prop.status}`} data-proposal=${id}>
    <div class="noe-card-h">
      <span class="noe-card-ic"><${Icon} name=${icon} size=${18} /></span>
      <div class="noe-card-t"><span class="noe-card-k">${kindLabel} · proposta${p ? ` per a ${U.fullName(p)}` : ''}</span><strong>${prop.title}</strong></div>
      ${prop.status !== 'pending' && html`<span class=${`pill pill-${prop.status === 'applied' ? 'ok' : 'neutral'}`}>${{ applied: 'Aplicada', discarded: 'Descartada', undone: 'Desfeta' }[prop.status]}</span>`}
    </div>
    ${prop.why && html`<p class="noe-why">${ps.decode(prop.why)}</p>`}
    ${prop.warnings && prop.warnings.length > 0 && html`<ul class="analysis-warns">${prop.warnings.slice(0, 6).map((w) => html`<li><${Icon} name="alert" size=${14} /><span>${w}</span></li>`)}</ul>`}
    ${details}
    <div class="noe-card-a">
      <button type="button" class="link" onClick=${() => setOpen(!open)} aria-expanded=${open}>${open ? 'Amaga el detall' : 'Mira-ho en detall'}</button>
      <span class="grow"></span>
      ${prop.status === 'pending' && html`<${Btn} variant="ghost" size="sm" onClick=${() => act(NoeActions.discard)}>Descarta</${Btn}>
        <${Btn} variant="primary" size="sm" icon="check" onClick=${() => act(NoeActions.apply)}>Aplica</${Btn}>`}
      ${prop.status === 'applied' && html`${prop.route && html`<${Btn} variant="secondary" size="sm" onClick=${() => { go(...prop.route); if (window.matchMedia && window.matchMedia('(max-width: 720px)').matches) NoeUI.open(false); }}>Obre</${Btn}>`}
        <${Btn} variant="ghost" size="sm" icon="refresh" onClick=${() => act(NoeActions.undo)}>Desfés</${Btn}>`}
    </div>
  </div>`;
}

// ── El panell ──
function NoePanel() {
  const S = useNoe();
  const bodyRef = useRef(null);
  const taRef = useRef(null);
  const conv = S.open ? NoeUI.ensure() : null;
  const mode = NoeConfig.mode();
  const route = useRoute(); // per refrescar les suggerències en canviar de pantalla
  useEffect(() => {
    const el = bodyRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [S.open, conv && conv.log.length, conv && conv.log[conv.log.length - 1] && conv.log[conv.log.length - 1].text, S.busy, S.error]);
  useEffect(() => {
    if (!S.open) return undefined;
    const esc = (e) => { if (e.key === 'Escape') NoeUI.open(false); };
    document.addEventListener('keydown', esc);
    if (taRef.current) taRef.current.focus();
    return () => document.removeEventListener('keydown', esc);
  }, [S.open]);
  // El missatge que no s'ha pogut enviar torna al quadre perquè es pugui reenviar.
  useEffect(() => {
    const ta = taRef.current;
    if (S.draft && ta && !S.busy) { ta.value = S.draft; S.draft = ''; ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`; ta.focus(); }
  }, [S.draft, S.busy, S.open]);
  if (!S.open) return null;

  const patient = route.name === 'client' ? Store.get('patients', route.params[0]) : null;
  const suggestions = patient
    ? [`Resumeix l'estat de ${U.fullName(patient)}`, `Proposa una sessió per a ${U.fullName(patient)}`, `Planifica el mes que ve per a ${U.fullName(patient)}`]
    : NOE_SUGGEST;
  const submit = () => { const ta = taRef.current; if (!ta) return; const v = ta.value; ta.value = ''; ta.style.height = ''; NoeUI.send(v); };
  const grow = (e) => { const ta = e.currentTarget; ta.style.height = 'auto'; ta.style.height = `${Math.min(ta.scrollHeight, 140)}px`; };
  const keys = (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing && window.matchMedia && window.matchMedia('(pointer: fine)').matches) { e.preventDefault(); submit(); } };

  const setupCard = (mode === 'setup' || mode === 'consent') && html`<div class="noe-setup">
    <p><strong>NOE encara no està connectat a la IA.</strong></p>
    <p class="muted small">${mode === 'consent' ? 'Falta acceptar com es tracten les dades a Configuració › NOE.' : 'Cal la clau de l\'API a Configuració › NOE (la posa una sola vegada una persona de l\'equip, i es queda en aquest aparell).'}</p>
    <div class="row-actions"><${Btn} variant="primary" icon="settings" onClick=${() => { NoeUI.open(false); go('configuracio'); }}>Configura NOE</${Btn}>
      <${Btn} icon="sparkles" onClick=${() => { NoeConfig.set({ demo: true }); NoeUI.emit(); }}>Prova la demostració</${Btn}></div>
  </div>`;

  return html`<aside class="noe-panel" role="dialog" aria-label="NOE, l'assistent d'IA" aria-modal="false">
    <header class="noe-head">
      <span class="noe-logo"><${Icon} name="sparkles" size=${18} /></span>
      <div class="noe-title"><strong>NOE</strong><span class="muted small">${mode === 'demo' ? 'Mode demostració (sense IA)' : mode === 'ai' ? 'Assistent d\'IA d\'EON Life' : 'Sense connectar'}</span></div>
      <${Btn} variant="ghost" icon="history" title="Converses anteriors" onClick=${() => NoeUI.toggleHistory()} />
      <${Btn} variant="ghost" icon="plus" title="Conversa nova" onClick=${() => NoeUI.newChat()} />
      <${Btn} variant="ghost" icon="x" title="Tanca" onClick=${() => NoeUI.open(false)} />
    </header>
    ${S.showHistory ? html`<div class="noe-history">
      <p class="muted small">Converses d'aquest aparell (no es comparteixen amb ningú).</p>
      ${S.chats.length ? S.chats.map((c) => html`<div class="noe-hist-row" key=${c.id}>
        <button type="button" class="noe-hist-open" onClick=${() => NoeUI.openChat(c.id)}><strong>${NoePseudo.create(c.ps).decode(c.title || 'Conversa sense títol')}</strong><span class="muted small">${agoText(c.createdAt)} · ${(c.log || []).filter((x) => x.t === 'user').length} missatges</span></button>
        <${Btn} variant="ghost" size="sm" icon="trash" title="Esborra aquesta conversa" onClick=${() => NoeUI.deleteChat(c.id)} /></div>`) : html`<p class="muted">Encara no n'hi ha cap.</p>`}
    </div>` : html`
    <div class="noe-body" ref=${bodyRef} aria-live="polite">
      ${setupCard}
      ${!conv.log.length && !setupCard && html`<div class="noe-empty">
        <p>Hola! Sóc <strong>NOE</strong>. Puc <strong>trobar</strong> pacients, sessions i exercicis, <strong>explicar-te com està</strong> un pacient i <strong>proposar sessions</strong> o planificar un mes. Els canvis te'ls deixo com a proposta: <strong>només passen quan prems «Aplica»</strong>.</p>
        <div class="noe-sugg">${suggestions.map((s) => html`<button type="button" key=${s} class="chip" onClick=${() => NoeUI.send(s)}>${s}</button>`)}</div>
      </div>`}
      ${noeGroup(conv.log).map((x, i) => {
        if (x.t === 'user') return html`<div class="noe-msg noe-user" key=${i}><div class="noe-bubble">${x.text}</div></div>`;
        if (x.t === 'text') return x.text.trim() ? html`<div class="noe-msg noe-asst" key=${i}><${NoeText} text=${x.text} conv=${conv} /></div>` : null;
        if (x.t === 'tool') return /^proposar_/.test(x.name) ? null : html`<div class=${U.cls('noe-tool', x.done && 'done')} key=${i}><${Icon} name=${x.done ? 'check' : 'refresh'} size=${13} />${noeToolLabel(x, conv)}${x.n > 1 ? ` · ${x.n} cerques` : ''}</div>`;
        if (x.t === 'proposal') return html`<${NoeProposal} key=${i} conv=${conv} id=${x.id} />`;
        return null;
      })}
      ${S.busy && html`<div class="noe-typing" role="status"><span></span><span></span><span></span><span class="sr-only">NOE està pensant…</span></div>`}
      ${S.error && html`<div class="noe-error" role="alert"><${Icon} name="alert" size=${16} /><span>${S.error}</span></div>`}
    </div>
    <footer class="noe-foot">
      <textarea ref=${taRef} class="input noe-input" rows="1" placeholder=${mode === 'ai' || mode === 'demo' ? 'Escriu a NOE…' : 'Configura NOE primer'} aria-label="Missatge per a NOE"
        disabled=${mode === 'setup' || mode === 'consent'} onInput=${grow} onKeyDown=${keys}></textarea>
      ${S.busy ? html`<${Btn} variant="secondary" icon="stop" title="Atura NOE" onClick=${() => NoeUI.stop()} />`
        : html`<${Btn} variant="primary" icon="send" title="Envia" disabled=${mode === 'setup' || mode === 'consent'} onClick=${submit} />`}
    </footer>
    <p class="noe-disc">NOE és una IA: pot equivocar-se. Revisa sempre el que proposa abans d'aplicar-ho. No diagnostica.</p>`}
  </aside>`;
}

function NoeLauncher() {
  const S = useNoe();
  return html`<${NoePanel} />
    ${!S.open && html`<button type="button" class="noe-fab" onClick=${() => NoeUI.open(true)} title="Obre NOE, l'assistent d'IA" aria-label="Obre NOE, l'assistent d'IA">
      <${Icon} name="sparkles" size=${20} /><span>NOE</span></button>`}`;
}

// ── Configuració › NOE ──
function NoeSettingsCard() {
  const [, force] = useState(0);
  const [key, setKey] = useState('');
  const [test, setTest] = useState(null);
  useEffect(() => NoeUI.subscribe(() => force((n) => n + 1)), []);
  const cfg = NoeConfig.get();
  const hasKey = !!NoeConfig.key();
  const mode = NoeConfig.mode();
  const set = (patch) => { NoeConfig.set(patch); NoeUI.emit(); force((n) => n + 1); };
  const pill = { ai: ['ok', 'IA connectada'], demo: ['warn', 'Mode demostració'], consent: ['warn', 'Falta acceptar'], setup: ['neutral', 'Sense connectar'] }[mode];
  const saveKey = () => { NoeConfig.setKey(key); setKey(''); force((n) => n + 1); UI.toast(key.trim() ? 'Clau desada en aquest aparell.' : 'Clau esborrada d\'aquest aparell.'); };
  const probe = async () => {
    setTest({ busy: true });
    try {
      const msg = await NoeApi.stream({ model: cfg.model, max_tokens: 20, messages: [{ role: 'user', content: 'Respon només amb la paraula: d\'acord' }] }, { cfg, key: NoeConfig.key() });
      setTest({ ok: true, text: (msg.content.find((c) => c.type === 'text') || {}).text || '' });
    } catch (e) { setTest({ error: (e && e.message) || 'Error' }); }
  };
  return html`<section class="card" id="noe-settings">
    <div class="card-head"><h2 class="h2">NOE · assistent d'IA</h2><${Pill} tone=${pill[0]} icon="sparkles">${pill[1]}</${Pill}></div>
    <p>NOE és un assistent d'intel·ligència artificial dins l'app (botó <strong>NOE</strong> a baix a la dreta). Ajuda a <strong>trobar</strong> pacients, sessions i exercicis, a entendre l'estat d'un pacient i a <strong>proposar sessions</strong> amb criteri científic (planificar un mes, canviar una sessió, crear un pla). Els canvis te'ls deixa com a proposta i <strong>només s'apliquen quan tu ho confirmes</strong> (i es poden desfer).</p>
    <label class="check"><input type="checkbox" checked=${cfg.demo} onChange=${(e) => set({ demo: e.currentTarget.checked })} /><span>Mode demostració (respostes preparades, sense IA ni clau)</span></label>
    <div class="form-grid mt">
      <${Field} label="Clau de l'API d'Anthropic" id="noe-key" hint=${hasKey ? 'Hi ha una clau desada en aquest aparell.' : 'Es crea a console.anthropic.com. Es queda només en aquest aparell (no es comparteix amb ningú ni es desa a les dades).'}>
        <div class="inline"><input id="noe-key" class="input" type="password" autocomplete="off" placeholder=${hasKey ? '••••••••••••' : 'sk-ant-…'} value=${key} onInput=${(e) => setKey(e.currentTarget.value)} />
          <${Btn} variant="secondary" disabled=${!key.trim()} onClick=${saveKey}>Desa</${Btn}>
          ${hasKey && html`<${Btn} variant="ghost" icon="trash" title="Esborra la clau d'aquest aparell" onClick=${() => { setKey(''); NoeConfig.setKey(''); force((n) => n + 1); }} />`}</div></${Field}>
      <${Field} label="Model" id="noe-model"><${Select} id="noe-model" value=${cfg.model} onValue=${(v) => set({ model: v })} options=${NOE_MODELS.map((m) => ({ v: m.v, label: m.label }))} /></${Field}>
    </div>
    <details class="noe-adv"><summary>Opcions avançades</summary>
      <${Field} label="Servidor intermediari (opcional)" id="noe-endpoint" hint="Si el centre té un servidor propi que guarda la clau (recomanat per a producció), escriu-hi l'adreça (https://…). Vegeu docs/NOE.md.">
        <${TextInput} id="noe-endpoint" value=${cfg.endpoint} placeholder="https://…" onValue=${(v) => set({ endpoint: v.trim() })} /></${Field}>
      <${Field} label="Longitud màxima de la resposta" id="noe-max"><${Select} id="noe-max" value=${String(cfg.maxTokens)} onValue=${(v) => set({ maxTokens: Number(v) })} options=${[{ v: '2048', label: 'Curta (2.000)' }, { v: '4096', label: 'Normal (4.000)' }, { v: '8192', label: 'Llarga (8.000)' }]} /></${Field}>
    </details>
    <label class="check mt"><input type="checkbox" checked=${cfg.privacy} onChange=${(e) => set({ privacy: e.currentTarget.checked })} /><span><strong>Privacitat:</strong> l'IA veu els pacients com a PAC-1, PAC-2… (sense nom, telèfon, correu ni data de naixement; només l'edat). Recomanat.</span></label>
    <label class="check mt"><input type="checkbox" checked=${cfg.consent} onChange=${(e) => set({ consent: e.currentTarget.checked })} /><span>Entenc que NOE envia a Anthropic (l'empresa de la IA Claude) el que li pregunto i les dades dels pacients que calguin per respondre (edat, objectiu, lesions, valoracions i sessions), i que el centre ha de tenir-ho cobert (contracte de tractament de dades i informació als pacients).</span></label>
    <div class="row-actions">
      <${Btn} icon="check" disabled=${mode === 'setup' || mode === 'consent' || mode === 'demo' || test && test.busy} onClick=${probe}>${test && test.busy ? 'Provant…' : 'Prova la connexió'}</${Btn}>
      <${Btn} variant="ghost" icon="trash" onClick=${async () => { if (await UI.confirm({ title: 'Esborrar les converses?', text: 'S\'esborren les converses de NOE d\'aquest aparell.', ok: 'Esborra', danger: true })) { NoeUI.clearAll(); UI.toast('Converses esborrades.'); } }}>Esborra les converses</${Btn}>
      <${Btn} variant="secondary" icon="sparkles" onClick=${() => NoeUI.open(true)}>Obre NOE</${Btn}>
    </div>
    ${test && test.ok && html`<p class="ok-text"><${Icon} name="check" size=${15} /> Connexió correcta${test.text ? ` (NOE respon: «${test.text.trim()}»)` : ''}.</p>`}
    ${test && test.error && html`<p class="warn-text"><${Icon} name="alert" size=${15} /> ${test.error}</p>`}
    <p class="muted small">Ús d'aquesta sessió: ${U.fmt(Noe.TOTAL.input + Noe.TOTAL.cache_read + Noe.TOTAL.cache_write, 0)} tokens d'entrada · ${U.fmt(Noe.TOTAL.output, 0)} de sortida.</p>
  </section>`;
}
