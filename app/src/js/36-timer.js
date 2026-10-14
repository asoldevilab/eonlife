/* EON Life · cronòmetre en directe per a la sessió: compte enrere de descans o de treball i cronòmetre.
   Va per sota de tot (no s'atura en canviar de pantalla), avisa amb so i vibració i manté la pantalla encesa. */

const Timer = (() => {
  const KEY = 'eon.timer';
  const prefs = { auto: true, sound: true };
  try { Object.assign(prefs, JSON.parse(window.localStorage.getItem(KEY) || '{}')); } catch (e) { /* sense emmagatzematge */ }
  const st = { kind: null, label: '', total: 0, endsAt: 0, left: 0, paused: false, from: 0, base: 0, done: false, open: false };
  const subs = new Set();
  let tick = null, audio = null, lock = null, lastBeep = -1;

  const emit = () => { for (const f of subs) f(); };
  const savePrefs = () => { try { window.localStorage.setItem(KEY, JSON.stringify(prefs)); } catch (e) { /* res */ } };
  const now = () => Date.now();
  const counting = () => st.kind === 'rest' || st.kind === 'work';

  const ctx = () => {
    try {
      if (!audio) { const A = window.AudioContext || window.webkitAudioContext; if (A) audio = new A(); }
      if (audio && audio.state === 'suspended') audio.resume();
    } catch (e) { audio = null; }
    return audio;
  };
  const beep = (n = 1, hz = 880, ms = 160) => {
    if (!prefs.sound) return;
    const a = ctx();
    if (!a) return;
    for (let i = 0; i < n; i++) {
      try {
        const o = a.createOscillator(), g = a.createGain(), t = a.currentTime + i * (ms + 90) / 1000;
        o.frequency.value = hz; o.type = 'sine';
        g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.35, t + 0.01); g.gain.exponentialRampToValueAtTime(0.0001, t + ms / 1000);
        o.connect(g); g.connect(a.destination); o.start(t); o.stop(t + ms / 1000 + 0.02);
      } catch (e) { /* sense àudio */ }
    }
  };
  const buzz = (p) => { try { if (navigator.vibrate) navigator.vibrate(p); } catch (e) { /* res */ } };
  const keepAwake = async (on) => {
    try {
      if (on && !lock && navigator.wakeLock) { lock = await navigator.wakeLock.request('screen'); lock.addEventListener('release', () => { lock = null; }); }
      if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  };

  const remaining = () => (st.paused ? st.left : Math.max(0, Math.ceil((st.endsAt - now()) / 1000)));
  const elapsed = () => Math.floor(((st.paused ? st.base : st.base + (now() - st.from))) / 1000);

  const title = (() => { let orig = null; return (txt) => {
    try { if (orig === null) orig = document.title; document.title = txt == null ? orig : `${txt} · ${orig}`; if (txt == null) orig = null; } catch (e) { /* res */ }
  }; })();

  const loop = () => {
    if (tick) return;
    tick = setInterval(() => {
      if (!st.kind) return;
      if (counting() && !st.paused && !st.done) {
        const left = remaining();
        if (left <= 3 && left > 0 && left !== lastBeep) { lastBeep = left; beep(1, 660, 90); }
        if (left <= 0) { st.done = true; beep(3, 988, 220); buzz([300, 120, 300, 120, 500]); title('✔ Temps!'); }
        else title(Calc.clock(left));
      } else if (st.kind === 'watch' && !st.paused) title(Calc.clock(elapsed()));
      emit();
    }, 250);
  };

  const api = {
    st, prefs, subs, remaining, elapsed,
    start(sec, label, kind = 'rest') {
      const s = Math.round(sec);
      if (!(s > 0)) return;
      ctx();
      Object.assign(st, { kind, label: label || (kind === 'work' ? 'Treball' : 'Descans'), total: s, endsAt: now() + s * 1000, left: s, paused: false, done: false });
      lastBeep = -1;
      keepAwake(true); loop(); emit();
    },
    watch(label) {
      ctx();
      Object.assign(st, { kind: 'watch', label: label || 'Cronòmetre', total: 0, from: now(), base: 0, paused: false, done: false });
      keepAwake(true); loop(); emit();
    },
    // Descans automàtic en marcar un exercici com a fet (si l'opció és activa i hi ha un temps).
    auto(sec, label) { if (prefs.auto && sec > 0) api.start(sec, label, 'rest'); },
    pause() {
      if (!st.kind || st.done) return;
      if (st.paused) {
        if (counting()) st.endsAt = now() + st.left * 1000; else st.from = now();
        st.paused = false;
      } else {
        if (counting()) st.left = remaining(); else st.base += now() - st.from;
        st.paused = true;
      }
      emit();
    },
    add(sec) {
      if (!counting()) return;
      if (st.done) { api.start(Math.max(5, sec), st.label, st.kind); return; }
      if (st.paused) st.left = Math.max(1, st.left + sec); else st.endsAt = Math.max(now() + 1000, st.endsAt + sec * 1000);
      st.total = Math.max(st.total, remaining());
      emit();
    },
    stop() { Object.assign(st, { kind: null, done: false, paused: false }); keepAwake(false); title(null); emit(); },
    setOpen(v) { st.open = !!v; emit(); },
    setPref(k, v) { prefs[k] = v; savePrefs(); if (k === 'sound' && v) beep(1, 660, 90); emit(); },
  };
  return api;
})();

const TIMER_PRESETS = {
  rest: [30, 45, 60, 90, 120, 180],
  work: [15, 20, 30, 40, 45, 60],
};

function TimerDock({ route }) {
  const [, force] = useState(0);
  const [tab, setTab] = useState('rest');
  const [custom, setCustom] = useState('');
  useEffect(() => { const f = () => force((n) => n + 1); Timer.subs.add(f); return () => Timer.subs.delete(f); }, []);
  const st = Timer.st, running = !!st.kind;
  const onSession = route && route.name === 'sessio';
  if (!running && !st.open && !onSession) return null;

  const left = running && (st.kind === 'watch' ? Timer.elapsed() : Timer.remaining());
  const pct = running && st.kind !== 'watch' && st.total ? Math.max(0, Math.min(100, (left / st.total) * 100)) : 0;
  const startCustom = () => {
    const secs = Calc.secs(custom);
    if (!secs) { UI.toast('Escriu un temps, p. ex. 90 s, 1:30 o 2\'.', 'bad'); return; }
    Timer.start(secs, tab === 'work' ? 'Treball' : 'Descans', tab);
    setCustom('');
    Timer.setOpen(false);
  };
  const preset = (s) => { Timer.start(s, tab === 'work' ? 'Treball' : 'Descans', tab); Timer.setOpen(false); };
  const label = (s) => (s < 60 ? `${s} s` : s % 60 ? `${Math.floor(s / 60)}'${s % 60}"` : `${s / 60}'`);

  return html`<div class=${U.cls('tm-dock', running && 'tm-run', st.done && 'tm-done', st.kind === 'work' && 'tm-work', st.open && 'tm-open')} role="region" aria-label="Cronòmetre">
    ${st.open && html`<div class="tm-panel">
      <div class="tm-tabs" role="tablist">
        ${[['rest', 'Descans'], ['work', 'Treball'], ['watch', 'Cronòmetre']].map(([k, t]) => html`<button type="button" role="tab" aria-selected=${tab === k}
          class=${U.cls('tm-tab', tab === k && 'on')} onClick=${() => setTab(k)}>${t}</button>`)}
        <span class="grow"></span>
        <button type="button" class="mini" title="Tanca" aria-label="Tanca el panell" onClick=${() => Timer.setOpen(false)}><${Icon} name="x" size=${15} /></button>
      </div>
      ${tab === 'watch'
        ? html`<p class="muted small">Compta cap amunt: per mesurar el temps d'una sèrie o d'un exercici.</p>
            <${Btn} variant="primary" icon="play" onClick=${() => { Timer.watch(); Timer.setOpen(false); }}>Inicia el cronòmetre</${Btn}>`
        : html`<div class="tm-presets">${TIMER_PRESETS[tab].map((s) => html`<button type="button" class="chip" onClick=${() => preset(s)}>${label(s)}</button>`)}</div>
            <div class="tm-custom">
              <input class="input" value=${custom} placeholder="Altre temps: 75 s, 1:30…" aria-label="Temps personalitzat" inputmode="text"
                onInput=${(e) => setCustom(e.currentTarget.value)} onKeyDown=${(e) => { if (e.key === 'Enter') startCustom(); }} />
              <${Btn} variant="primary" icon="play" onClick=${startCustom}>Inicia</${Btn}>
            </div>`}
      <div class="tm-prefs">
        <label class="check"><input type="checkbox" checked=${Timer.prefs.auto} onChange=${(e) => Timer.setPref('auto', e.currentTarget.checked)} /> Descans automàtic en marcar un exercici com a fet</label>
        <label class="check"><input type="checkbox" checked=${Timer.prefs.sound} onChange=${(e) => Timer.setPref('sound', e.currentTarget.checked)} /> So i vibració</label>
      </div>
    </div>`}
    ${running
      ? html`<div class="tm-bar" role="timer" aria-live="off">
          <button type="button" class="tm-openbtn" onClick=${() => Timer.setOpen(!st.open)} title="Canvia o inicia un altre temps"><${Icon} name="clock" size=${18} /></button>
          <div class="tm-main">
            <span class="tm-time" aria-label=${`${st.label}: ${Calc.clock(left)}`}>${st.done ? '0:00' : Calc.clock(left)}</span>
            <span class="tm-label">${st.done ? `${st.label} acabat` : st.label}${st.paused ? ' · en pausa' : ''}</span>
          </div>
          ${st.kind !== 'watch' && html`<div class="tm-prog" aria-hidden="true"><span style=${`width:${pct}%`}></span></div>`}
          <div class="tm-btns">
            ${st.kind !== 'watch' && html`<button type="button" class="tm-b" onClick=${() => Timer.add(-15)} aria-label="Treu 15 segons" disabled=${st.done}>−15</button>
              <button type="button" class="tm-b" onClick=${() => Timer.add(st.done ? 30 : 15)} aria-label=${st.done ? 'Afegeix 30 segons' : 'Afegeix 15 segons'}>+${st.done ? 30 : 15}</button>`}
            ${!st.done && html`<button type="button" class="tm-b tm-b-ic" onClick=${() => Timer.pause()} aria-label=${st.paused ? 'Reprèn' : 'Pausa'}>${st.paused ? html`<${Icon} name="play" size=${16} />` : html`<span aria-hidden="true">❚❚</span>`}</button>`}
            <button type="button" class="tm-b tm-b-ic" onClick=${() => Timer.stop()} aria-label="Atura i tanca"><${Icon} name="x" size=${16} /></button>
          </div>
        </div>`
      : !st.open && html`<button type="button" class="tm-pill" onClick=${() => Timer.setOpen(true)}><${Icon} name="clock" size=${17} />Cronòmetre</button>`}
  </div>`;
}

// Botó petit d'un exercici per posar en marxa un temps (descans o treball).
function TimerButton({ secs, label, kind = 'rest', title }) {
  if (!(secs > 0)) return null;
  return html`<button type="button" class=${U.cls('tbtn', kind === 'work' && 'tbtn-work')} title=${title || `Inicia ${kind === 'work' ? 'el temps de treball' : 'el descans'}`}
    onClick=${() => Timer.start(secs, label, kind)}><${Icon} name="clock" size=${14} />${Calc.clock(secs)}</button>`;
}
