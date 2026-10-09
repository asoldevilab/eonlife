/* EON Life · NOE, l'assistent d'IA: el motor.
   · Configuració (la clau de l'API es queda només en aquest aparell; mai es desa a les dades compartides).
   · Pseudonimització: l'IA veu els pacients com a PAC-1, PAC-2… (mai amb el nom, el telèfon o el correu).
   · Client de l'API de Claude (Messages) amb streaming (SSE), eines i memòria cau del prompt.
   · El bucle: la persona escriu → NOE respon i/o demana eines (llegir dades, proposar canvis) → es repeteix fins que acaba.
   Els canvis a l'app mai els fa la IA directament: vegeu 09-noe-tools.js (propostes que la persona confirma). */

const NOE_KEYS = { key: 'eonlife:noe:key', cfg: 'eonlife:noe:cfg' };
const NOE_ENDPOINT = 'https://api.anthropic.com/v1/messages';
const NOE_VERSION = '2023-06-01';
const NOE_MODELS = [
  { v: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 · equilibrat (recomanat)' },
  { v: 'claude-opus-5-5', label: 'Claude Opus 5.5 · el més capaç (més lent i car)' },
  { v: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 · ràpid i econòmic' },
  { v: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
];

const NoeConfig = (() => {
  const DEFAULTS = { model: 'claude-sonnet-5-5', endpoint: '', maxTokens: 4096, privacy: true, consent: false, demo: false };
  const store = () => { try { return window.localStorage; } catch (e) { return null; } };
  const read = (k, fb) => { try { const v = store() && store().getItem(k); return v ? JSON.parse(v) : fb; } catch (e) { return fb; } };
  const write = (k, v) => { try { if (store()) store().setItem(k, JSON.stringify(v)); } catch (e) { /* sense emmagatzematge */ } };
  return {
    get() { return { ...DEFAULTS, ...read(NOE_KEYS.cfg, {}) }; },
    set(patch) { write(NOE_KEYS.cfg, { ...this.get(), ...patch }); },
    // La clau es desa a part (només en aquest aparell).
    key() { try { return (store() && store().getItem(NOE_KEYS.key)) || ''; } catch (e) { return ''; } },
    setKey(k) { try { if (!store()) return; if (k) store().setItem(NOE_KEYS.key, String(k).trim()); else store().removeItem(NOE_KEYS.key); } catch (e) { /* res */ } },
    // Es pot parlar amb NOE? Amb IA (clau o servidor intermediari) o en mode demostració.
    mode() {
      const c = this.get();
      if (c.demo) return 'demo';
      if (this.key() || c.endpoint) return c.consent ? 'ai' : 'consent';
      return 'setup';
    },
    DEFAULTS,
  };
})();

// ── Pseudonimització ──
// L'IA no veu mai els noms dels pacients: a les eines i als textos es fan servir els codis PAC-1, PAC-2… (estables dins
// d'una conversa). Els noms que la persona escrigui al missatge es canvien pel codi abans d'enviar-lo, i els codis que
// l'IA escrigui es tornen a mostrar amb el nom.
const NoePseudo = (() => {
  const words = (s) => String(s || '').match(/[\p{L}\p{M}\p{N}]+(?:['’·-][\p{L}\p{M}\p{N}]+)*/gu) || [];
  const ntok = (w) => U.norm(w);

  function create(state) {
    const st = state || { map: {}, rev: {}, n: 0 };
    const api = {
      state: st,
      // Codi d'un pacient (se li dona un el primer cop).
      ref(pid) {
        if (!pid) return '';
        if (!st.rev[pid]) { st.n++; st.rev[pid] = `PAC-${st.n}`; st.map[`PAC-${st.n}`] = pid; }
        return st.rev[pid];
      },
      // Id d'un pacient a partir del codi (PAC-3), de l'id o d'un nom (el més semblant; candidats si hi ha dubte).
      resolve(arg) {
        const a = String(arg == null ? '' : arg).trim();
        if (!a) return { error: 'Falta indicar el pacient.' };
        const code = a.toUpperCase().match(/^PAC-(\d+)$/);
        if (code) { const pid = st.map[`PAC-${code[1]}`]; return pid && Store.get('patients', pid) ? { pid } : { error: `No conec cap pacient amb el codi ${a.toUpperCase()}. Fes servir «llista_pacients» o «cerca_global».` }; }
        if (Store.get('patients', a)) return { pid: a };
        const n = U.norm(a);
        const hits = Store.all('patients').map((p) => ({ p, s: matchPersonName(a, p) })).filter((x) => x.s >= 0.7).sort((x, y) => y.s - x.s);
        if (hits.length === 1 || (hits.length > 1 && hits[0].s > hits[1].s + 0.15)) return { pid: hits[0].p.id };
        if (hits.length) return { error: 'Hi ha diversos pacients que hi coincideixen; digues quin.', candidats: hits.slice(0, 5).map((x) => ({ pacient: api.ref(x.p.id), edat: U.age(x.p.birthDate) })) };
        return { error: `No trobo cap pacient que es digui «${n}».` };
      },
      // Text → text amb els noms canviats pels codis.
      encode(text) {
        const src = String(text == null ? '' : text);
        const idx = index();
        if (!idx.list.length) return src;
        const ws = [];
        for (const m of src.matchAll(/[\p{L}\p{M}\p{N}]+(?:['’·-][\p{L}\p{M}\p{N}]+)*/gu)) ws.push({ t: ntok(m[0]), a: m.index, b: m.index + m[0].length });
        let out = '', last = 0;
        for (let i = 0; i < ws.length;) {
          let hit = null;
          for (const e of idx.list) {            // les més llargues primer
            if (i + e.toks.length > ws.length) continue;
            if (e.toks.every((t, k) => ws[i + k].t === t)) { hit = e; break; }
          }
          if (!hit) { i++; continue; }
          const end = ws[i + hit.toks.length - 1].b;
          out += src.slice(last, ws[i].a) + api.ref(hit.pid);
          last = end;
          i += hit.toks.length;
        }
        return out + src.slice(last);
      },
      // Text amb codis → text amb noms (els [[pacient:PAC-3]] els deixa per a l'enllaç).
      decode(text) {
        return String(text == null ? '' : text).replace(/(\[\[pacient:)?\bPAC-(\d+)\b/gi, (m, pre, n) => {
          if (pre) return m;
          const pid = st.map[`PAC-${n}`];
          const p = pid && Store.get('patients', pid);
          return p ? U.fullName(p) : m;
        });
      },
    };
    return api;
  }

  // Noms a detectar: el complet (nom cognoms o cognoms nom), i només el cognom o només el nom quan no es repeteixen.
  function index() {
    const patients = Store.all('patients');
    const entries = [];
    const count = {};
    const bump = (t) => { count[t] = (count[t] || 0) + 1; };
    const parts = patients.map((p) => ({ p, f: words(p.firstName).map(ntok), l: words(p.lastName).map(ntok) }));
    for (const x of parts) for (const t of new Set([...x.f, ...x.l])) bump(t);
    for (const { p, f, l } of parts) {
      if (f.length && l.length) { entries.push({ toks: [...f, ...l], pid: p.id }); entries.push({ toks: [...l, ...f], pid: p.id }); }
      // Un sol cognom o un sol nom, només si no el comparteix ningú més (i no és una paraula massa curta).
      for (const t of l) if (t.length >= 4 && count[t] === 1) entries.push({ toks: [t], pid: p.id });
      if (f.length === 1 && f[0].length >= 3 && count[f[0]] === 1) entries.push({ toks: [f[0]], pid: p.id });
      if (l.length > 1 && f.length) entries.push({ toks: [...f, l[0]], pid: p.id });
    }
    entries.sort((a, b) => b.toks.length - a.toks.length);
    return { list: entries };
  }

  return { create };
})();

// ── Client de l'API (streaming) ──
const NoeApi = (() => {
  // Errors de l'API → missatge clar en català.
  function friendly(status, payload, raw) {
    const msg = (payload && payload.error && payload.error.message) || '';
    if (status === 401) return 'La clau de l\'API no és vàlida o ha caducat. Revisa-la a Configuració › NOE.';
    if (status === 403) return `No es permet aquesta petició (${msg || 'permisos'}). Revisa la clau i el pla de l'API.`;
    if (status === 404) return `No trobo el model «${(payload && payload.error && payload.error.message || '').replace(/^model:\s*/i, '')}». Tria'n un altre a Configuració › NOE.`;
    if (status === 413) return 'La conversa s\'ha fet massa llarga. Comença una conversa nova.';
    if (status === 429) return 'S\'ha arribat al límit de peticions o de crèdit de l\'API. Espera una mica i torna-ho a provar.';
    if (status === 529 || status >= 500) return 'El servei d\'IA està saturat o no respon ara mateix. Torna-ho a provar d\'aquí a un moment.';
    if (status === 400) return `La petició no és vàlida: ${msg || raw || 'error'}${/credit/i.test(msg) ? '. Sembla que s\'ha acabat el saldo de l\'API.' : ''}`;
    return msg || `Error ${status} de l'API.`;
  }

  // Un missatge de l'assistent muntat a partir dels esdeveniments SSE.
  function builder() {
    const b = { content: [], stop_reason: null, usage: {}, model: '', _json: {} };
    b.apply = (ev) => {
      switch (ev.type) {
        case 'message_start': {
          const m = ev.message || {};
          b.model = m.model || b.model;
          b.usage = { ...b.usage, ...(m.usage || {}) };
          break;
        }
        case 'content_block_start': {
          const cb = ev.content_block || {};
          b.content[ev.index] = cb.type === 'tool_use' ? { type: 'tool_use', id: cb.id, name: cb.name, input: {} } : cb.type === 'text' ? { type: 'text', text: cb.text || '' } : { ...cb };
          b._json[ev.index] = '';
          break;
        }
        case 'content_block_delta': {
          const d = ev.delta || {}, blk = b.content[ev.index];
          if (!blk) break;
          if (d.type === 'text_delta') { blk.text += d.text || ''; return { text: d.text || '' }; }
          if (d.type === 'input_json_delta') b._json[ev.index] += d.partial_json || '';
          else if (d.type === 'thinking_delta') blk.thinking = (blk.thinking || '') + (d.thinking || '');
          else if (d.type === 'signature_delta') blk.signature = (blk.signature || '') + (d.signature || '');
          break;
        }
        case 'content_block_stop': {
          const blk = b.content[ev.index];
          if (blk && blk.type === 'tool_use') {
            const raw = b._json[ev.index];
            try { blk.input = raw ? JSON.parse(raw) : {}; } catch (e) { blk.input = {}; blk.badJson = raw; }
            return { tool: blk };
          }
          break;
        }
        case 'message_delta': {
          const d = ev.delta || {};
          if (d.stop_reason) b.stop_reason = d.stop_reason;
          b.usage = { ...b.usage, ...(ev.usage || {}) };
          break;
        }
        case 'error': {
          const e = ev.error || {};
          const err = new Error(friendly(e.type === 'overloaded_error' ? 529 : e.type === 'rate_limit_error' ? 429 : e.type === 'authentication_error' ? 401 : 500, { error: e }));
          err.code = 'api';
          throw err;
        }
        default: break;
      }
      return null;
    };
    b.result = () => ({ role: 'assistant', content: b.content.filter(Boolean).map((c) => { const { badJson, ...rest } = c; return rest; }), stop_reason: b.stop_reason, usage: b.usage, model: b.model });
    return b;
  }

  // Trossos de text SSE → esdeveniments { type, … }. Guarda el que queda a mig fer entre trossos.
  function sseParser() {
    let buf = '';
    return (chunk) => {
      buf += chunk.replace(/\r\n/g, '\n');
      const out = [];
      let i;
      while ((i = buf.indexOf('\n\n')) >= 0) {
        const block = buf.slice(0, i);
        buf = buf.slice(i + 2);
        const data = block.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).replace(/^ /, '')).join('\n');
        if (!data || data === '[DONE]') continue;
        try { out.push(JSON.parse(data)); } catch (e) { /* línia no vàlida: s'ignora */ }
      }
      return out;
    };
  }

  // Fa una petició i va cridant onText / onTool mentre arriba. Retorna el missatge de l'assistent.
  async function stream(body, { cfg, key, signal, onText, onTool, fetchImpl } = {}) {
    const f = fetchImpl || (typeof fetch === 'function' ? fetch.bind(globalThis) : null);
    if (!f) throw Object.assign(new Error('Aquest navegador no pot parlar amb l\'IA.'), { code: 'api' });
    const direct = !cfg.endpoint;
    const headers = { 'content-type': 'application/json', 'anthropic-version': NOE_VERSION };
    if (key) headers['x-api-key'] = key;
    if (direct) headers['anthropic-dangerous-direct-browser-access'] = 'true';
    let res;
    try {
      res = await f(cfg.endpoint || NOE_ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ ...body, stream: true }), signal });
    } catch (e) {
      if (e && e.name === 'AbortError') throw e;
      throw Object.assign(new Error('No hi ha connexió amb el servei d\'IA. Comprova internet i torna-ho a provar.'), { code: 'network' });
    }
    if (!res.ok) {
      let payload = null, raw = '';
      try { raw = await res.text(); payload = JSON.parse(raw); } catch (e) { /* sense cos JSON */ }
      throw Object.assign(new Error(friendly(res.status, payload, raw && raw.slice(0, 200))), { code: 'api', status: res.status });
    }
    const b = builder();
    const handle = (ev) => {
      const r = b.apply(ev);
      if (r && r.text && onText) onText(r.text);
      if (r && r.tool && onTool) onTool(r.tool);
    };
    const ctype = (res.headers && res.headers.get && res.headers.get('content-type')) || '';
    if (!res.body || !res.body.getReader || /application\/json/.test(ctype)) {
      // Sense streaming: la resposta sencera d'un cop.
      const full = await res.json();
      (full.content || []).forEach((c, index) => {
        if (c.type === 'text') { handle({ type: 'content_block_start', index, content_block: { type: 'text', text: '' } }); handle({ type: 'content_block_delta', index, delta: { type: 'text_delta', text: c.text } }); handle({ type: 'content_block_stop', index }); }
        else if (c.type === 'tool_use') { handle({ type: 'content_block_start', index, content_block: { type: 'tool_use', id: c.id, name: c.name } }); handle({ type: 'content_block_delta', index, delta: { type: 'input_json_delta', partial_json: JSON.stringify(c.input || {}) } }); handle({ type: 'content_block_stop', index }); }
      });
      b.stop_reason = full.stop_reason || null;
      b.usage = full.usage || {};
      b.model = full.model || '';
      return b.result();
    }
    const reader = res.body.getReader();
    const dec = new TextDecoder();
    const parse = sseParser();
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        for (const ev of parse(dec.decode(value, { stream: true }))) handle(ev);
      }
      for (const ev of parse('\n\n')) handle(ev);
    } catch (e) {
      if (e && (e.name === 'AbortError' || e.code === 'api')) throw e;
      throw Object.assign(new Error('S\'ha tallat la connexió mentre NOE responia. Torna-ho a provar.'), { code: 'network' });
    }
    return b.result();
  }

  return { stream, builder, sseParser, friendly };
})();

// ── El bucle de NOE ──
const Noe = (() => {
  const MAX_ROUNDS = 10;          // com a molt, tantes voltes de «demana eines → rep resultats» per missatge
  const MAX_TOOL_CHARS = 14000;   // el resultat d'una eina que es passa a l'IA
  const BUDGET_CHARS = 220000;    // mida màxima de la conversa que s'envia (es treuen els torns més antics)
  const TOTAL = { input: 0, output: 0, cache_read: 0, cache_write: 0 };

  const state = { abort: null, transport: null }; // transport: per als tests i la demostració (substitueix la xarxa)

  const newConversation = () => ({ id: U.uid('N'), title: '', createdAt: Date.now(), messages: [], ps: { map: {}, rev: {}, n: 0 }, notes: [], usage: { input: 0, output: 0 } });

  // Torns: cada missatge de la persona (que no sigui un resultat d'eina) obre un torn.
  const isTurnStart = (m) => m.role === 'user' && (typeof m.content === 'string' || !(m.content || []).some((c) => c.type === 'tool_result'));
  const size = (msgs) => JSON.stringify(msgs).length;
  function trim(messages) {
    let msgs = messages;
    while (size(msgs) > BUDGET_CHARS) {
      const starts = msgs.map((m, i) => (isTurnStart(m) ? i : -1)).filter((i) => i >= 0);
      if (starts.length <= 1) break;                 // no es pot treure res més sense perdre el torn actual
      msgs = msgs.slice(starts[1]);
    }
    return msgs;
  }

  const cap = (text) => (text.length > MAX_TOOL_CHARS ? `${text.slice(0, MAX_TOOL_CHARS)}\n… (resultat tallat: demana'n menys o filtra més)` : text);

  function request(conv, cfg, system) {
    const tools = NoeTools.definitions();
    if (tools.length) tools[tools.length - 1] = { ...tools[tools.length - 1], cache_control: { type: 'ephemeral' } };
    return {
      model: cfg.model, max_tokens: Number(cfg.maxTokens) || 4096,
      system: [{ type: 'text', text: system, cache_control: { type: 'ephemeral' } }],
      tools, messages: trim(conv.messages),
    };
  }

  // Envia un missatge de la persona i deixa que NOE respongui (i demani eines) fins que acabi.
  // hooks: onText(delta), onTool(name, input), onToolResult(name, result), onRound(), onProposal(p)
  async function send(conv, text, hooks = {}) {
    const cfg = NoeConfig.get();
    const mode = NoeConfig.mode();
    if (mode === 'setup') throw Object.assign(new Error('NOE encara no està configurat: posa la clau de l\'API a Configuració › NOE.'), { code: 'setup' });
    if (mode === 'consent') throw Object.assign(new Error('Abans de fer servir NOE cal acceptar com es tracten les dades (Configuració › NOE).'), { code: 'consent' });
    const ps = NoePseudo.create(conv.ps);
    const ctx = { conv, ps, privacy: cfg.privacy !== false, hooks };
    const encode = (t) => (cfg.privacy !== false ? ps.encode(t) : t);
    // Notes del sistema (p. ex. «la persona ha aplicat la proposta X») i el context de la pantalla.
    const prefix = [...(conv.notes || []).splice(0), hooks.context ? hooks.context(ps) : ''].filter(Boolean).map((n) => `[Nota de l'app: ${n}]`).join('\n');
    conv.messages.push({ role: 'user', content: `${prefix ? `${prefix}\n` : ''}${encode(text)}` });
    if (!conv.title) conv.title = String(text).slice(0, 60);
    const system = NoeKnowledge.system({
      now: `${U.fmtDateLong(U.today())} (${U.today()})`, user: typeof deviceProfessional === 'function' ? deviceProfessional() : '',
      materials: Store.materials().center, professionals: Store.professionals(), thresholds: THRESHOLDS,
      extra: cfg.privacy !== false ? '' : 'Nota: la privacitat està desactivada; les dades poden incloure noms.',
    });
    const abort = new AbortController();
    state.abort = abort;
    try {
      for (let round = 0; round < MAX_ROUNDS; round++) {
        if (hooks.onRound) hooks.onRound(round);
        const body = request(conv, cfg, system);
        const run = state.transport || (mode === 'demo' ? NoeDemo.transport : (b, o) => NoeApi.stream(b, { cfg, key: NoeConfig.key(), ...o }));
        let streamed = '';
        const seen = new Set();
        const msg = await run(body, { signal: abort.signal, onText: (d) => { streamed += d; if (hooks.onText) hooks.onText(d); },
          onTool: (t) => { seen.add(t.id || t.name); if (hooks.onTool) hooks.onTool(t.name, t.input); } });
        // Un transport que no fa streaming (la demostració, els tests) torna el missatge sencer: es reparteix igualment als ganxos.
        for (const c of msg.content) {
          if (c.type === 'text' && c.text && !streamed && hooks.onText) hooks.onText(c.text);
          if (c.type === 'tool_use' && !seen.has(c.id) && !seen.has(c.name) && hooks.onTool) hooks.onTool(c.name, c.input);
        }
        conv.messages.push({ role: 'assistant', content: msg.content });
        const u = msg.usage || {};
        conv.usage.input += (u.input_tokens || 0) + (u.cache_read_input_tokens || 0) + (u.cache_creation_input_tokens || 0);
        conv.usage.output += u.output_tokens || 0;
        TOTAL.input += u.input_tokens || 0; TOTAL.output += u.output_tokens || 0;
        TOTAL.cache_read += u.cache_read_input_tokens || 0; TOTAL.cache_write += u.cache_creation_input_tokens || 0;
        const uses = msg.content.filter((c) => c.type === 'tool_use');
        if (msg.stop_reason !== 'tool_use' || !uses.length) {
          if (msg.stop_reason === 'max_tokens' && hooks.onText) hooks.onText('\n\n_(La resposta s\'ha tallat per longitud: demana-me que continuï.)_');
          if (msg.stop_reason === 'refusal' && hooks.onText) hooks.onText('\n\n_(No puc ajudar amb això.)_');
          return msg;
        }
        const results = [];
        for (const tu of uses) {
          let out;
          try {
            out = tu.badJson != null ? { error: 'Els paràmetres de l\'eina no s\'han pogut llegir; torna-ho a provar amb menys dades.' } : await NoeTools.run(tu.name, tu.input || {}, ctx);
          } catch (e) {
            out = { error: `L'eina ha fallat: ${(e && e.message) || e}` };
          }
          const isErr = !!(out && out.error && Object.keys(out).length <= 2);
          if (hooks.onToolResult) hooks.onToolResult(tu.name, out);
          results.push({ type: 'tool_result', tool_use_id: tu.id, content: cap(typeof out === 'string' ? out : JSON.stringify(out)), ...(isErr ? { is_error: true } : {}) });
        }
        conv.messages.push({ role: 'user', content: results });
      }
      if (hooks.onText) hooks.onText('\n\n_(He fet moltes consultes seguides i m\'aturo aquí. Digue\'m com vols continuar.)_');
      return null;
    } finally {
      state.abort = null;
    }
  }

  // Si la darrera volta va quedar a mig fer (error o cancel·lació), es treu perquè la conversa continuï neta.
  function repair(conv) {
    const m = conv.messages;
    while (m.length) {
      const last = m[m.length - 1];
      const dangling = last.role === 'assistant' && (last.content || []).some((c) => c.type === 'tool_use');
      const orphanResult = last.role === 'user' && Array.isArray(last.content) && last.content.some((c) => c.type === 'tool_result');
      if (dangling || orphanResult) m.pop(); else break;
    }
    // Un missatge de la persona sense resposta tampoc deixa una conversa vàlida: es treu.
    if (m.length && m[m.length - 1].role === 'user') m.pop();
  }

  return { send, repair, newConversation, cancel() { if (state.abort) state.abort.abort(); }, state, TOTAL, trim, MAX_ROUNDS };
})();
