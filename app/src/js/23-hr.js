/* EON Life · enregistrador de FC amb un strap Bluetooth (Polar H10 i qualsevol de pit que parli «Heart Rate»).
   Funciona amb Chrome o Edge (Android, ordinador). Safari de l'iPad no deixa connectar Bluetooth des d'una pàgina web.
   L'enregistrament és únic per a la tauleta i continua encara que canviïs de pantalla; es desa a la sessió en aturar-lo. */

const HrLive = (() => {
  const st = { device: null, server: null, char: null, running: false, connected: false, bpm: null, contact: null,
    samples: [], sessionId: null, startedAt: null, error: '', name: '', busy: false, measuring: null, rr: [] };
  const subs = new Set();
  const emit = () => subs.forEach((f) => f({ ...st, samples: st.samples.length }));

  const supported = () => typeof navigator !== 'undefined' && !!navigator.bluetooth && (typeof window === 'undefined' || window.isSecureContext !== false);

  const onValue = (ev) => {
    const m = HR.parse(ev.target.value);
    if (!m) return;
    st.bpm = m.bpm; st.contact = m.contact;
    if (st.running && m.bpm > 0) st.samples.push({ t: Date.now(), bpm: m.bpm });
    if (st.measuring) { for (const v of m.rr) st.rr.push(v); st.measuring.beats = st.rr.length; }
    emit();
  };
  const onDrop = () => { st.connected = false; st.bpm = null; emit(); if (st.running) reconnect(); };

  async function attach() {
    st.server = await st.device.gatt.connect();
    const svc = await st.server.getPrimaryService('heart_rate');
    st.char = await svc.getCharacteristic('heart_rate_measurement');
    st.char.addEventListener('characteristicvaluechanged', onValue);
    await st.char.startNotifications();
    st.connected = true; st.error = '';
  }
  async function reconnect() {
    for (let i = 0; i < 5 && st.running && !st.connected && st.device; i++) {
      try { await attach(); emit(); return; } catch { await new Promise((r) => setTimeout(r, 2000 * (i + 1))); }
    }
    if (!st.connected) { st.error = 'S\'ha perdut la connexió amb el strap. Torna a connectar-lo: el que s\'ha enregistrat fins ara es conserva.'; emit(); }
  }

  const friendly = (e) => {
    const n = e && e.name, m = String((e && e.message) || e);
    if (n === 'NotFoundError' || /cancel/i.test(m)) return 'No s\'ha triat cap strap. Mulla els elèctrodes del strap, posa\'l-te al pit i torna-ho a provar.';
    if (n === 'SecurityError') return 'El navegador no deixa fer servir el Bluetooth des d\'aquesta pàgina.';
    if (/GATT|disconnected|Unsupported device/i.test(m)) return 'No s\'ha pogut connectar. Comprova que el strap no està connectat a una altra app (Polar Beat, el rellotge…) i que té bateria.';
    return `No s'ha pogut connectar el strap: ${m}`;
  };

  return {
    supported,
    subscribe(f) { subs.add(f); f({ ...st, samples: st.samples.length }); return () => subs.delete(f); },
    get state() { return { ...st, samples: st.samples.length }; },
    async connect() {
      if (!supported()) { st.error = 'Aquest navegador no té Bluetooth web. Fes servir Chrome a la tauleta Android.'; emit(); return false; }
      st.busy = true; st.error = ''; emit();
      try {
        if (!st.device) {
          st.device = await navigator.bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
          st.name = st.device.name || 'Strap';
          st.device.addEventListener('gattserverdisconnected', onDrop);
        }
        await attach();
        return true;
      } catch (e) { st.error = friendly(e); return false; } finally { st.busy = false; emit(); }
    },
    start(sessionId) {
      st.samples = []; st.sessionId = sessionId; st.startedAt = Date.now(); st.running = true; st.error = ''; emit();
    },
    // Atura l'enregistrament i torna el resum (o null si no hi ha lectures vàlides). El strap es manté connectat.
    stop() {
      st.running = false;
      const sum = HR.summarize(st.samples);
      const id = st.sessionId;
      st.samples = []; emit();
      return sum ? { ...sum, sessionId: id } : null;
    },
    // Mesura d'HRV en repòs: guarda els intervals RR durant `sec` segons i en torna l'anàlisi a onDone(res | null).
    measure(sec, onDone) {
      if (!st.connected || st.measuring) return false;
      st.rr = []; st.measuring = { t0: Date.now(), sec, beats: 0 }; st.error = ''; emit();
      const tick = setInterval(() => {
        if (!st.measuring) { clearInterval(tick); return; }
        if (!st.connected || Date.now() - st.measuring.t0 >= sec * 1000) {
          clearInterval(tick);
          const res = st.connected || st.rr.length ? HR.analyze(st.rr) : null;
          st.measuring = null; st.rr = [];
          if (!res) st.error = 'No hi ha prou batecs vàlids. Comprova que el strap fa bon contacte (elèctrodes mullats) i repeteix la mesura.';
          emit();
          if (onDone) onDone(res ? { ...res, sec } : null);
        }
      }, 500);
      return true;
    },
    cancelMeasure() { st.measuring = null; st.rr = []; emit(); },
    disconnect() {
      st.running = false; st.measuring = null;
      try { if (st.char) st.char.removeEventListener('characteristicvaluechanged', onValue); } catch {}
      try { if (st.device && st.device.gatt && st.device.gatt.connected) st.device.gatt.disconnect(); } catch {}
      st.device = st.server = st.char = null; st.connected = false; st.bpm = null; st.name = ''; emit();
    },
    // Per als tests: simula lectures sense Bluetooth.
    _rr(list) { for (const v of list) st.rr.push(v); if (st.measuring) st.measuring.beats = st.rr.length; emit(); },
    _push(bpm, t) { st.bpm = bpm; if (st.running) st.samples.push({ t: t ?? Date.now(), bpm }); emit(); },
  };
})();

// Targeta «Freqüència cardíaca» de la sessió: strap en directe + FC mitjana, màxima i mínima a mà.
function HeartRateCard({ session, onSet }) {
  const [live, setLive] = useState(HrLive.state);
  const [tick, setTick] = useState(0);
  useEffect(() => HrLive.subscribe(setLive), []);
  useEffect(() => {
    if (!live.running) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [live.running]);
  const f = session.feedback || {};
  const mine = live.running && live.sessionId === session.id;
  const elsewhere = live.running && live.sessionId !== session.id;
  const secs = live.startedAt && live.running ? Math.floor((Date.now() - live.startedAt) / 1000) : 0;
  void tick;
  const stop = () => {
    const r = HrLive.stop();
    if (!r) { UI.toast('No hi ha hagut lectures vàlides del strap.'); return; }
    Store.update('sessions', r.sessionId, (x) => {
      x.feedback = { ...(x.feedback || {}), hrAvg: String(r.avg), hrMax: String(r.max), hrMin: String(r.min), hrMinutes: String(r.minutes), hrSource: 'strap' };
    });
    UI.toast(`FC mitjana desada: ${r.avg} bpm (màx. ${r.max}).`);
  };
  const clear = () => { for (const k of ['hrAvg', 'hrMax', 'hrMin', 'hrMinutes', 'hrSource']) onSet(k, ''); };

  return html`<section class="card hr-card" id="se-hr">
    <div class="card-head"><h2 class="h2"><${Icon} name="heart" size=${18} /> Freqüència cardíaca</h2>
      ${f.hrAvg && html`<${Pill} tone="neutral">${f.hrAvg} bpm de mitjana</${Pill}>`}</div>
    ${HrLive.supported()
      ? html`<div class="hr-live">
          <div class="hr-bpm" aria-live="off"><span class=${U.cls('hr-num', !live.connected && 'off')}>${live.connected && live.bpm ? live.bpm : '—'}</span><span class="muted small">bpm${live.name ? ` · ${live.name}` : ''}</span></div>
          <div class="hr-actions">
            ${!live.connected && html`<${Btn} icon="plus" onClick=${() => HrLive.connect()} disabled=${live.busy}>${live.busy ? 'Connectant…' : 'Connecta el strap'}</${Btn}>`}
            ${live.connected && !live.running && html`<${Btn} variant="primary" icon="play" onClick=${() => HrLive.start(session.id)}>Comença a enregistrar</${Btn}>`}
            ${mine && html`<${Btn} variant="primary" icon="check" onClick=${stop}>Atura i desa (${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')})</${Btn}>`}
            ${live.connected && !live.running && html`<${Btn} variant="ghost" onClick=${() => HrLive.disconnect()}>Desconnecta</${Btn}>`}
          </div>
        </div>
        ${elsewhere && html`<p class="hint warn">Hi ha un enregistrament en marxa d'una altra sessió. Atura'l des d'allà abans de començar-ne un de nou.</p>`}
        ${live.error && html`<p class="hint warn" role="alert">${live.error}</p>`}`
      : html`<p class="muted small">Aquest navegador no pot connectar-se al strap. A la tauleta Android fes servir Chrome; mentrestant pots escriure la FC a mà.</p>`}
    <div class="hr-fields">
      <${Field} label="FC mitjana" id="hr-avg"><${NumInput} id="hr-avg" value=${f.hrAvg} onValue=${(v) => { onSet('hrAvg', v); onSet('hrSource', v ? (f.hrSource === 'strap' ? 'strap' : 'manual') : ''); }} unit="bpm" /></${Field}>
      <${Field} label="FC màxima" id="hr-max"><${NumInput} id="hr-max" value=${f.hrMax} onValue=${(v) => onSet('hrMax', v)} unit="bpm" /></${Field}>
      <${Field} label="FC mínima" id="hr-min"><${NumInput} id="hr-min" value=${f.hrMin} onValue=${(v) => onSet('hrMin', v)} unit="bpm" /></${Field}>
      ${f.hrAvg && html`<div class="hr-clear"><${Btn} variant="ghost" onClick=${clear}>Esborra la FC</${Btn}></div>`}
    </div>
    <p class="muted small">Posa el strap al pit amb els elèctrodes mullats. Prem «Atura i desa» en acabar: la mitjana es calcula amb tota la sessió.${f.hrSource === 'strap' && f.hrMinutes ? ` Enregistrat amb el strap (${U.num(f.hrMinutes) < 1 ? 'menys d\'1 min' : `${f.hrMinutes} min`}).` : ''}</p>
  </section>`;
}

// HRV en repòs en arribar a l'entrenament (opcional, dins del wellness): amb el strap (1–5 min, quiet i respirant normal)
// o escrit a mà. Es guarda l'RMSSD (ms), la FC de repòs i com s'ha mesurat.
function HrvArrival({ w, onSet, id, base }) {
  const has = U.num(w.hrvA) != null;
  const [open, setOpen] = useState(has);
  const [dur, setDur] = useState(120);
  const [live, setLive] = useState(HrLive.state);
  const [, setTick] = useState(0);
  useEffect(() => HrLive.subscribe(setLive), []);
  useEffect(() => {
    if (!live.measuring) return undefined;
    const t = setInterval(() => setTick((n) => n + 1), 500);
    return () => clearInterval(t);
  }, [!!live.measuring]);
  const status = HR.status(w.hrvA, base);
  const left = live.measuring ? Math.max(0, Math.ceil((live.measuring.sec * 1000 - (Date.now() - live.measuring.t0)) / 1000)) : 0;
  const run = () => HrLive.measure(dur, (res) => {
    if (!res) return;
    onSet('hrvA', String(res.rmssd)); onSet('hrvAhr', String(res.hr)); onSet('hrvAsrc', 'strap');
    onSet('hrvAdur', String(res.sec)); onSet('hrvAq', String(res.quality));
    UI.toast(`HRV en repòs: ${res.rmssd} ms (FC ${res.hr} bpm).`);
  });
  const clear = () => { for (const k of ['hrvA', 'hrvAhr', 'hrvAsrc', 'hrvAdur', 'hrvAq']) onSet(k, ''); };
  const p = id || 'wl';
  if (!open) return html`<div class="hrva-add"><${Btn} variant="ghost" icon="heart" onClick=${() => setOpen(true)}>Afegeix l'HRV en repòs en arribar (opcional)</${Btn}></div>`;
  return html`<div class="hrva" id=${`${p}-hrva`}>
    <div class="hrva-head"><strong>HRV en repòs en arribar</strong> <span class="muted small">opcional · segons el cas</span>
      ${!has && !live.measuring && html`<${Btn} variant="ghost" size="sm" onClick=${() => setOpen(false)}>Amaga</${Btn}>`}</div>
    <p class="muted small">El pacient assegut o estirat, quiet, sense parlar i respirant amb normalitat. Es descarten els primers 15 s mentre s'estabilitza.</p>
    <div class="hrva-grid">
      <${Field} label="HRV (RMSSD)" id=${`${p}-hrva-v`}><${NumInput} id=${`${p}-hrva-v`} value=${w.hrvA} onValue=${(v) => { onSet('hrvA', v); if (w.hrvAsrc !== 'strap') onSet('hrvAsrc', v ? 'manual' : ''); }} unit="ms" /></${Field}>
      <${Field} label="FC en repòs" id=${`${p}-hrva-h`}><${NumInput} id=${`${p}-hrva-h`} value=${w.hrvAhr} onValue=${(v) => onSet('hrvAhr', v)} unit="bpm" /></${Field}>
      ${status && html`<div class="hrv-status"><${Pill} tone=${status === 'ok' ? 'ok' : status === 'low' ? 'bad' : 'neutral'}>${status === 'low' ? 'HRV baixa' : status === 'high' ? 'HRV alta' : 'HRV normal'}</${Pill}>
        <span class="muted small">Normal en arribar: ${U.fmt(base.low, 0)}–${U.fmt(base.high, 0)} ms (${base.n} mesures)</span></div>`}
    </div>
    ${HrLive.supported() && html`<div class="hrva-measure">
      ${!live.connected && html`<${Btn} icon="plus" onClick=${() => HrLive.connect()} disabled=${live.busy}>${live.busy ? 'Connectant…' : 'Connecta el strap'}</${Btn}>`}
      ${live.connected && !live.measuring && html`<${Select} id=${`${p}-hrva-d`} value=${String(dur)} onValue=${(v) => setDur(Number(v))} ariaLabel="Durada de la mesura"
        options=${[{ v: '60', label: '1 minut' }, { v: '120', label: '2 minuts' }, { v: '180', label: '3 minuts' }, { v: '300', label: '5 minuts' }]} />
        <${Btn} variant="primary" icon="heart" onClick=${run}>Mesura l'HRV</${Btn}>`}
      ${live.measuring && html`<span class="hrva-run"><span class="hr-num">${left}</span><span class="muted small"> s · ${live.bpm || '—'} bpm · ${live.measuring.beats} batecs</span></span>
        <${Btn} variant="ghost" onClick=${() => HrLive.cancelMeasure()}>Cancel·la</${Btn}>`}
    </div>`}
    ${live.error && !live.measuring && html`<p class="hint warn" role="alert">${live.error}</p>`}
    ${w.hrvAsrc === 'strap' && html`<p class="muted small">Mesurat amb el strap durant ${Math.round((U.num(w.hrvAdur) || 0) / 60 * 10) / 10} min · ${w.hrvAq || '—'} % de batecs vàlids${U.num(w.hrvAq) != null && U.num(w.hrvAq) < 85 ? ' (qualitat baixa: repeteix-la si pots)' : ''}.</p>`}
    ${has && html`<div class="hr-clear"><${Btn} variant="ghost" onClick=${clear}>Esborra l'HRV en repòs</${Btn}></div>`}
  </div>`;
}
