/* EON Life · versió nova de l'app.
   La tauleta guarda la pàgina una estona i, oberta des de la icona, pot ensenyar la versió d'abans. En obrir l'app
   (i cada cop que torna a primer pla) es mira version.json: si hi ha una versió nova, en obrir-la s'actualitza sola
   i, si ja s'hi està treballant, surt l'avís «Actualitza». */

const AppUpdate = {
  latest: null,
  lastCheck: 0,
  listeners: new Set(),
  key: 'eonlife:update',

  enabled() {
    try { return !!window.EON_UPDATE && !IS_ARTIFACT && /^https?:$/.test(window.location.protocol); } catch (e) { return false; }
  },
  emit() { for (const fn of this.listeners) fn(); },

  async check(force) {
    if (!this.enabled()) return null;
    if (!force && Date.now() - this.lastCheck < 120000) return this.latest;
    this.lastCheck = Date.now();
    try {
      const r = await fetch(`version.json?t=${Date.now()}`, { cache: 'no-store' });
      if (!r.ok) return null;
      const v = await r.json();
      this.latest = v && v.build && v.build !== window.EON_BUILD ? String(v.build) : null;
    } catch (e) {
      return null;
    }
    this.emit();
    return this.latest;
  },

  // Es carrega l'adreça amb ?v=… perquè ni la tauleta ni el servidor tornin la còpia antiga.
  apply() {
    const target = this.latest || String(Date.now());
    try { window.sessionStorage.setItem(this.key, target); } catch (e) { /* res */ }
    Store.flushAll();
    const goNew = () => window.location.replace(`${window.location.pathname}?v=${encodeURIComponent(target)}${window.location.hash}`);
    if (Store.pending()) setTimeout(goNew, 1500); else goNew();
  },

  async start() {
    if (!this.enabled()) return;
    const t0 = Date.now();
    let tried = '';
    try { tried = window.sessionStorage.getItem(this.key) || ''; } catch (e) { /* res */ }
    if (tried && tried === window.EON_BUILD) { try { window.sessionStorage.removeItem(this.key); } catch (e) { /* res */ } }
    const v = await this.check(true);
    if (!v) return;
    if (tried === v) {
      // Ja s'ha provat i el servidor encara dona la versió anterior (s'està publicant).
      UI.toast('La versió nova encara s\'està publicant. Torna-ho a provar d\'aquí a uns minuts.');
      return;
    }
    // Acabada d'obrir i sense res pendent de desar: s'actualitza sola (mai enmig de l'inici de sessió de Microsoft).
    const signingIn = /[?&](code|state|error)=/.test(window.location.search);
    if (Date.now() - t0 < 5000 && !Store.pending() && !signingIn) this.apply();
  },
};

function UpdateBanner() {
  const [, setN] = useState(0);
  const [hidden, setHidden] = useState('');
  useEffect(() => {
    const fn = () => setN((n) => n + 1);
    AppUpdate.listeners.add(fn);
    return () => AppUpdate.listeners.delete(fn);
  }, []);
  if (!AppUpdate.latest || hidden === AppUpdate.latest) return null;
  return html`<div class="updbar no-print" role="status">
    <${Icon} name="refresh" size=${17} />
    <span>Hi ha una versió nova de l'app.</span>
    <${Btn} variant="primary" size="sm" onClick=${() => AppUpdate.apply()}>Actualitza</${Btn}>
    <${Btn} variant="ghost" size="sm" icon="x" title="Més tard" onClick=${() => setHidden(AppUpdate.latest)} />
  </div>`;
}
