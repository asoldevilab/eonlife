/* EON Life · estructura de l'app i arrencada. */

function Sidebar({ route, open, onClose }) {
  const item = (name, icon, label, active) => html`<button type="button" class=${U.cls('nav-item', active && 'on')} onClick=${() => { onClose(); go(name); }}>
    <${Icon} name=${icon} size=${19} /><span>${label}</span></button>`;
  const r = route.name;
  const clientRoutes = ['inici', 'client', 'sessio'];
  return html`<aside class=${U.cls('sidebar', open && 'open')}>
    <div class="sidebar-brand">
      <span class="logo-mark" role="img" aria-label=${Store.settings.centerName || 'EON Life'}></span>
      <span class="sidebar-sub">${Store.settings.centerTagline || 'Human Performance'}</span>
    </div>
    <nav class="nav">
      ${item('inici', 'home', 'Inici i clients', clientRoutes.includes(r))}
      ${item('dades', 'database', 'Base de dades', r === 'dades' || r === 'valoracio')}
      ${item('biblioteca', 'book', 'Biblioteca', r === 'biblioteca' || r === 'plantilla')}
      ${item('configuracio', 'settings', 'Configuració', r === 'configuracio')}
    </nav>
    <div class="nav-actions">
      <button type="button" class="nav-new" onClick=${() => { onClose(); openNewPatient(); }}><${Icon} name="plus" size=${18} />Nou client</button>
      <button type="button" class="nav-new" onClick=${() => { onClose(); openAddMeasurement('dades'); }}><${Icon} name="clipboard" size=${18} />Afegeix mesures</button>
    </div>
    <div class="sidebar-foot">
      <span class="sidebar-mode"><${Icon} name=${Store.cloud() ? 'cloud' : 'device'} size=${16} />${{ google: 'Google Sheets', m365: 'Microsoft 365 · Excel' }[Store.meta.mode] || 'Mode local'}</span>
      ${Store.meta.user && html`<span class="sidebar-user">${Store.meta.user}</span>`}
      ${Store.cloud() && html`<button type="button" class="sidebar-refresh" onClick=${reloadData} title="Torna a carregar les dades del full (canvis d'altres professionals)"><${Icon} name="refresh" size=${14} />Actualitza les dades</button>`}
    </div>
  </aside>`;
}

// Torna a llegir el full de càlcul (per veure els canvis fets des d'altres tauletes).
async function reloadData() {
  if (Store.pending()) { UI.toast('Espera un moment: encara s\'estan desant canvis.', 'bad'); return; }
  Store.ready = false;
  Store.emit();
  await Store.init();
  UI.toast('Dades actualitzades.');
}

function Topbar({ onMenu }) {
  return html`<header class="topbar">
    <${Btn} variant="ghost" icon="menu" title="Menú" onClick=${onMenu} />
    <button type="button" class="topbar-brand" onClick=${() => go('inici')}><span class="logo-mark" role="img" aria-label="EON Life"></span></button>
    <${SaveStatus} />
  </header>`;
}

function renderRoute(r) {
  const [a, b] = r.params;
  switch (r.name) {
    case 'client': return html`<${PatientView} id=${a} tab=${b || 'resum'} />`;
    case 'valoracio': return html`<${AssessmentEditor} id=${a} focus=${b} />`;
    case 'dades': return html`<${DatabaseView} table=${a || 'valoracions'} pid=${b || ''} />`;
    case 'informe': return html`<${AssessmentReport} id=${a} />`;
    case 'sessio': return html`<${SessionEditor} id=${a} />`;
    case 'fitxa': return html`<${SessionSheet} id=${a} />`;
    case 'biblioteca': return html`<${LibraryView} tab=${a || 'exercicis'} />`;
    case 'plantilla': return html`<${TemplateEditor} id=${a} />`;
    case 'configuracio': return html`<${SettingsView} />`;
    default: return html`<${HomeView} />`;
  }
}

function App() {
  const [, setV] = useState(0);
  const [menu, setMenu] = useState(false);
  const route = useRoute();
  useEffect(() => {
    const off = Store.subscribe((v) => setV(v));
    setV(Store.version); // per si les dades ja s'han carregat abans de subscriure's
    return off;
  }, []);
  useEffect(() => {
    // Amb Microsoft 365 els canvis pendents ja queden guardats a la tauleta: no cal avisar en sortir.
    const warn = (e) => { if (Store.pending() && !(Store.backend && Store.backend.outbox)) { e.preventDefault(); e.returnValue = ''; } };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);

  if (Store.error && Store.backend && Store.backend.mode === 'm365') return html`<${ConnectScreen} code=${Store.errorCode} message=${Store.error} />`;
  if (Store.error) {
    return html`<div class="boot boot-error">
      <span class="logo-mark boot-logo" aria-hidden="true"></span>
      <h1 class="h2">No s'han pogut carregar les dades</h1>
      <p>${Store.error}</p>
      <p class="muted">Comprova la connexió o que el full de càlcul estigui compartit amb el teu compte de Google.</p>
      <${Btn} variant="primary" icon="refresh" onClick=${() => { Store.error = null; Store.init(); }}>Torna-ho a provar</${Btn}>
    </div>`;
  }
  if (!Store.ready) return html`<div class="boot"><span class="logo-mark boot-logo" aria-hidden="true"></span><p>Carregant…</p></div>`;

  const present = route.name === 'fitxa' || route.name === 'informe';
  return html`<div class=${U.cls('shell', present && 'shell-present')}>
    ${!present && html`<${Sidebar} route=${route} open=${menu} onClose=${() => setMenu(false)} />`}
    ${!present && menu && html`<div class="scrim" onClick=${() => setMenu(false)}></div>`}
    <div class="main">
      ${!present && html`<${Topbar} onMenu=${() => setMenu(true)} />`}
      ${renderRoute(route)}
    </div>
    <${SharedLists} />
    <${ModalHost} />
  </div>`;
}

(function start() {
  Router.init();
  render(html`<${App} />`, document.getElementById('app'));
  Store.init();
  // Desa els canvis pendents si l'app passa a segon pla (tauleta).
  document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') Store.flushAll(); });
  window.addEventListener('pagehide', () => Store.flushAll());
}());
