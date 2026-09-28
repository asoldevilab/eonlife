/* EON Life · navegació entre pantalles (#/pantalla/paràmetres). */

const Router = {
  current: null,
  listeners: new Set(),
  // A l'enllaç privat la navegació es fa en memòria (sense tocar l'adreça del visor).
  memory: IS_ARTIFACT,
  parse(hash) {
    const h = String(hash || '').replace(/^#\/?/, '');
    const [name, ...params] = h.split('/').filter((x) => x !== '').map((x) => { try { return decodeURIComponent(x); } catch (e) { return x; } });
    return { name: name || 'inici', params };
  },
  init() {
    let hash = '';
    if (!this.memory) { try { hash = window.location.hash; } catch (e) { hash = ''; } }
    this.current = this.parse(hash);
    if (this.memory) return;
    window.addEventListener('hashchange', () => {
      const next = this.parse(window.location.hash);
      if (next.name === this.current.name && next.params.join('/') === this.current.params.join('/')) return;
      this.current = next;
      this.emit(true);
    });
  },
  go(name, ...params) {
    const clean = params.filter((p) => p != null && p !== '');
    this.current = { name, params: clean.map(String) };
    const hash = `#/${[name, ...clean].map((x) => encodeURIComponent(String(x))).join('/')}`;
    if (!this.memory) { try { if (window.location.hash !== hash) window.location.hash = hash; } catch (e) { /* entorn sense hash */ } }
    this.emit(true);
  },
  emit(scroll) {
    for (const fn of this.listeners) fn(this.current);
    if (scroll) { try { window.scrollTo(0, 0); } catch (e) { /* res */ } }
  },
  subscribe(fn) { this.listeners.add(fn); return () => this.listeners.delete(fn); },
};

function useRoute() {
  const [r, setR] = useState(Router.current);
  useEffect(() => Router.subscribe((x) => setR({ ...x })), []);
  return r;
}

const go = (...args) => Router.go(...args);
