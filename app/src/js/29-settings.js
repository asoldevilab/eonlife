/* EON Life · configuració: centre, professionals, noms dels blocs i dades (còpies i exportació a Excel). */

function SettingsView() {
  const st = Store.settings;
  const [newProf, setNewProf] = useState('');
  const fileRef = useRef(null);
  const set = (k) => (v) => Store.saveSettings({ [k]: v });
  const setBlock = (key, k) => (v) => Store.saveSettings({ blocks: st.blocks.map((b) => (b.key === key ? { ...b, [k]: v } : b)) });
  const addProf = () => {
    const name = newProf.trim();
    if (!name) return;
    if (!(st.professionals || []).includes(name)) Store.saveSettings({ professionals: [...(st.professionals || []), name] });
    setNewProf('');
  };
  const delProf = (name) => Store.saveSettings({ professionals: (st.professionals || []).filter((x) => x !== name) });
  const [newMat, setNewMat] = useState('');
  const mats = Store.materials().center;
  const addMat = () => {
    const name = newMat.trim();
    if (!name) return;
    if (!mats.includes(name)) Store.saveSettings({ materials: [...mats, name] });
    setNewMat('');
  };
  const delMat = (name) => Store.saveSettings({ materials: mats.filter((x) => x !== name) });

  const exportJson = () => {
    const ok = U.download(`eonlife-copia-${U.today()}.json`, Store.exportAll(), 'application/json');
    UI.toast(ok ? 'Còpia descarregada.' : 'No s\'ha pogut descarregar en aquesta vista.', ok ? 'ok' : 'bad');
  };
  const importJson = async (file) => {
    if (!file) return;
    try {
      const text = await U.readFile(file);
      if (!(await UI.confirm({ title: 'Importar la còpia de seguretat?', text: 'Els registres amb el mateix identificador se substituiran. La resta es mantenen.', ok: 'Importa' }))) return;
      const n = Store.importAll(text);
      UI.toast(`${n} registres importats.`);
    } catch (e) {
      UI.toast(e.message, 'bad');
    } finally {
      if (fileRef.current) fileRef.current.value = '';
    }
  };
  const exportAssessments = () => {
    const rows = Store.all('assessments').map((a) => Flat.assessment(a, Store.get('patients', a.patientId)));
    if (!rows.length) { UI.toast('No hi ha valoracions per exportar.', 'bad'); return; }
    const headers = [...new Set(rows.flatMap((r) => Object.keys(r)))];
    U.download(`eonlife-valoracions-${U.today()}.csv`, U.toCsv(U.sortBy(rows, 'Data'), headers), 'text/csv');
  };
  const exportSessions = () => {
    const rows = [];
    for (const s of U.sortBy(Store.all('sessions'), 'date')) rows.push(...Flat.sessionLog(s, Store.get('patients', s.patientId)));
    if (!rows.length) { UI.toast('No hi ha sessions per exportar.', 'bad'); return; }
    U.download(`eonlife-registre-exercicis-${U.today()}.csv`, U.toCsv(rows, Object.keys(rows[0])), 'text/csv');
  };
  const resetLocal = async (withDemo) => {
    const ok = await UI.confirm({
      title: withDemo ? 'Tornar a carregar els clients de prova?' : 'Començar amb l\'app buida?',
      text: withDemo ? 'Se substituiran totes les dades d\'aquest navegador pels clients ficticis.' : 'S\'esborraran totes les dades d\'aquest navegador (clients de prova inclosos). Si tens dades reals, descarrega abans una còpia.',
      ok: withDemo ? 'Carrega la demo' : 'Esborra-ho tot', danger: !withDemo,
    });
    if (!ok) return;
    LocalBackend.reset(withDemo);
    Store.ready = false;
    Store.data = { patients: {}, assessments: {}, sessions: {}, exercises: {}, templates: {} };
    await Store.init();
    go('inici');
    UI.toast(withDemo ? 'Dades de prova carregades.' : 'App buida i a punt.');
  };

  const google = Store.meta.mode === 'google';
  const m365 = Store.meta.mode === 'm365';
  const cloud = google || m365;
  return html`<div class="page">
    <header class="page-head"><div><p class="eyebrow">${st.centerName}</p><h1 class="h1">Configuració</h1></div><${SaveStatus} /></header>

    <section class="card">
      <div class="card-head"><h2 class="h2">On es guarden les dades</h2>
        <${Pill} tone=${cloud ? 'ok' : 'warn'} icon=${cloud ? 'cloud' : 'device'}>${google ? 'Google Sheets · núvol del centre' : m365 ? 'Microsoft 365 · carpeta del centre' : 'Només en aquest navegador'}</${Pill}></div>
      ${m365 ? html`<${M365DataCard} />` : google ? html`<p>Totes les dades es desen automàticament al full de càlcul del centre (una pestanya per a clients, valoracions, sessions i el registre d'exercicis). Els vídeos i els PDF van a la carpeta de Drive de cada client.</p>
        ${Store.meta.user && html`<p class="muted">Connectat com a <strong>${Store.meta.user}</strong>.</p>`}
        <div class="row-actions">
          ${Store.meta.spreadsheetUrl && html`<${Btn} icon="clipboard" href=${Store.meta.spreadsheetUrl}>Obre el full de càlcul</${Btn}>`}
          ${Store.meta.rootFolderUrl && html`<${Btn} icon="folder" href=${Store.meta.rootFolderUrl}>Carpeta de clients</${Btn}>`}
        </div>`
        : html`<p>Estàs fent servir l'app en <strong>mode local</strong>: les dades només es guarden en aquest navegador i no les veu ningú més. Per treballar tot l'equip amb les mateixes dades, cal publicar l'app per al centre amb Microsoft 365 (guia <em>docs/INSTALLACIO-M365.md</em>) o amb Google (<em>docs/INSTALLACIO.md</em>).</p>
          ${!LocalBackend.persistent && html`<p class="warn-text"><${Icon} name="alert" size=${15} /> Aquest navegador no permet guardar dades: si tanques la pàgina es perdran els canvis. Descarrega una còpia abans de sortir.</p>`}
          <div class="row-actions">
            <${Btn} icon="refresh" onClick=${() => resetLocal(true)}>Carrega els clients de prova</${Btn}>
            <${Btn} variant="danger" icon="trash" onClick=${() => resetLocal(false)}>Comença amb l'app buida</${Btn}>
          </div>`}
    </section>

    ${IS_ARTIFACT ? html`<section class="card">
      <div class="card-head"><h2 class="h2">Exportar i còpies de seguretat</h2></div>
      <p class="muted">En aquest enllaç de prova no es poden descarregar fitxers ni imprimir. A la versió instal·lada a Google, les dades ja són al full de càlcul i els informes es desen en PDF.</p>
    </section>` : html`<section class="card">
      <div class="card-head"><h2 class="h2">Exportar i còpies de seguretat</h2></div>
      <p class="muted">Els CSV s'obren directament amb Excel (separador punt i coma).</p>
      <div class="row-actions">
        <${Btn} icon="download" onClick=${exportAssessments}>Valoracions a Excel (CSV)</${Btn}>
        <${Btn} icon="download" onClick=${exportSessions}>Registre d'exercicis a Excel (CSV)</${Btn}>
        <${Btn} icon="download" onClick=${exportJson}>Còpia de seguretat completa</${Btn}>
        <input type="file" accept=".json,application/json" hidden ref=${fileRef} onChange=${(e) => importJson(e.currentTarget.files[0])} />
        <${Btn} icon="upload" onClick=${() => fileRef.current && fileRef.current.click()}>Importa una còpia</${Btn}>
      </div>
    </section>`}

    <section class="card">
      <div class="card-head"><h2 class="h2">Centre</h2></div>
      <div class="form-grid">
        <${Field} label="Nom del centre" id="st-name"><${TextInput} id="st-name" value=${st.centerName} onValue=${set('centerName')} /></${Field}>
        <${Field} label="Subtítol als informes" id="st-tag"><${TextInput} id="st-tag" value=${st.centerTagline} onValue=${set('centerTagline')} /></${Field}>
      </div>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Professionals</h2></div>
      <div class="proflist">
        ${(st.professionals || []).map((name) => html`<span class="profchip">${name}<button type="button" title=${`Treu ${name}`} onClick=${() => delProf(name)}><${Icon} name="x" size=${14} /></button></span>`)}
        ${!(st.professionals || []).length && html`<span class="muted">Afegeix l'equip per triar-lo ràpidament a les sessions i valoracions.</span>`}
      </div>
      <form class="inline mt" onSubmit=${(e) => { e.preventDefault(); addProf(); }}>
        <${TextInput} value=${newProf} onValue=${setNewProf} placeholder="Nom i cognom" ariaLabel="Nou professional" />
        <${Btn} type="submit" icon="plus">Afegeix</${Btn}>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Material del centre</h2><span class="muted">Surt primer en triar el material d'un exercici</span></div>
      <div class="proflist">
        ${mats.map((name) => html`<span class="profchip">${name}<button type="button" title=${`Treu ${name}`} onClick=${() => delMat(name)}><${Icon} name="x" size=${14} /></button></span>`)}
      </div>
      <form class="inline mt" onSubmit=${(e) => { e.preventDefault(); addMat(); }}>
        <${TextInput} value=${newMat} onValue=${setNewMat} placeholder="p. ex. Trineu" ariaLabel="Material nou" />
        <${Btn} type="submit" icon="plus">Afegeix</${Btn}>
      </form>
    </section>

    <section class="card">
      <div class="card-head"><h2 class="h2">Blocs de la sessió</h2><span class="muted">L'ordre és fix; pots canviar-ne el nom i la descripció</span></div>
      <div class="blocks-cfg">${st.blocks.map((b) => html`<div class=${`blockcfg blk-${b.key}`}>
        <span class="block-num">${blockDef(b.key).num}</span>
        <${TextInput} value=${b.name} onValue=${setBlock(b.key, 'name')} ariaLabel=${`Nom del bloc ${blockDef(b.key).num}`} />
        <${TextInput} value=${b.desc} onValue=${setBlock(b.key, 'desc')} ariaLabel=${`Descripció del bloc ${blockDef(b.key).num}`} class="blockcfg-desc" />
      </div>`)}</div>
    </section>

    <p class="muted small center">EON Life · Human Performance · versió ${window.EON_BUILD || 'dev'}</p>
  </div>`;
}

// Microsoft 365: on són les dades, amb qui s'ha entrat i accessos directes.
function M365DataCard() {
  const m = Store.meta;
  const logout = async () => {
    const pending = Object.keys(Outbox.all()).length;
    const ok = await UI.confirm({
      title: 'Tancar la sessió de Microsoft?',
      text: pending ? `Hi ha ${U.plural(pending, 'canvi', 'canvis')} pendent${pending > 1 ? 's' : ''} de desar. Es guarden en aquesta tauleta i s'enviaran quan algú hi torni a entrar.` : 'Per tornar a fer servir l\'app en aquesta tauleta caldrà tornar a entrar amb el compte del centre.',
      ok: 'Tanca la sessió',
    });
    if (ok) MsAuth.logout(M365.config());
  };
  const changeFolder = async () => {
    const ok = await UI.confirm({
      title: 'Canviar de carpeta?',
      text: 'L\'app deixarà de fer servir aquesta carpeta en aquesta tauleta. Les dades no s\'esborren: continuen a l\'Excel de la carpeta actual.',
      ok: 'Tria una altra carpeta',
    });
    if (!ok) return;
    M365.forgetFolder();
    Store.ready = false;
    await Store.init();
    go('inici');
  };
  return html`<p>Totes les dades es desen automàticament a l'Excel <strong>«EON Life · Base de dades»</strong>${m.dataFolderName ? html` de la carpeta <strong>«${m.dataFolderName}»</strong>` : ''}: una pestanya per a clients, valoracions, sessions i el registre d'exercicis, amb una fila per registre i una columna per test. Els vídeos i els PDF van a la carpeta de cada client, dins de «EON Life · Clients».</p>
    <p class="muted">Tothom qui tingui accés a la carpeta pot obrir l'Excel per consultar-lo, filtrar-lo o descarregar-lo. Les dades, però, s'omplen i es corregeixen sempre des de l'app.</p>
    ${m.user && html`<p class="muted">Connectat com a <strong>${m.userName ? `${m.userName} · ` : ''}${m.user}</strong>.</p>`}
    <div class="row-actions">
      ${m.spreadsheetUrl && html`<${Btn} icon="table" href=${m.spreadsheetUrl}>Obre l'Excel</${Btn}>`}
      ${m.rootFolderUrl && html`<${Btn} icon="folder" href=${m.rootFolderUrl}>Carpetes dels clients</${Btn}>`}
      ${m.dataFolderUrl && html`<${Btn} icon="folder" href=${m.dataFolderUrl}>Carpeta compartida</${Btn}>`}
    </div>
    <div class="row-actions">
      <${Btn} variant="ghost" icon="refresh" onClick=${changeFolder}>Canvia de carpeta</${Btn}>
      <${Btn} variant="ghost" icon="x" onClick=${logout}>Tanca la sessió</${Btn}>
    </div>`;
}
