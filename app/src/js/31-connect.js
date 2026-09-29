/* EON Life · connexió amb Microsoft 365: codis de l'app, inici de sessió, carpeta compartida i preparació.
   Es mostra en lloc de l'app mentre falti algun pas (Store.errorCode: config · login · folder · setup · altres). */

const GUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

async function reconnect() {
  Store.ready = false;
  Store.error = null;
  Store.errorCode = '';
  Store.emit();
  await Store.init();
}

function ConnectScreen({ code, message }) {
  const cfg = M365.config();
  const user = MsAuth.user();
  const step = { config: 1, login: 1, folder: 2, setup: 3 }[code] || 0;
  const steps = ['Compte', 'Carpeta', 'Base de dades'];
  let body;
  if (code === 'config') body = html`<${ConnectConfig} cfg=${cfg} />`;
  else if (code === 'login') body = html`<${ConnectLogin} cfg=${cfg} message=${message} />`;
  else if (code === 'folder') body = html`<${ConnectFolder} cfg=${cfg} user=${user} />`;
  else if (code === 'setup') body = html`<${ConnectSetup} cfg=${cfg} message=${message} />`;
  else body = html`<${ConnectError} cfg=${cfg} message=${message} code=${code} />`;
  return html`<div class="connect">
    <div class="connect-card">
      <span class="logo-mark connect-logo" role="img" aria-label="EON Life"></span>
      ${step > 0 && html`<ol class="connect-steps" aria-label="Passos">
        ${steps.map((s, i) => html`<li class=${U.cls(i + 1 < step && 'done', i + 1 === step && 'on')} aria-current=${i + 1 === step ? 'step' : undefined}>
          <span class="connect-num">${i + 1 < step ? html`<${Icon} name="check" size=${13} />` : i + 1}</span>${s}</li>`)}
      </ol>`}
      ${body}
    </div>
    ${user && code !== 'login' && code !== 'config' && html`<p class="connect-foot muted">Has entrat com a <strong>${user.email || user.name}</strong>${' · '}<button type="button" class="link" onClick=${() => MsAuth.logout(cfg)}>Canvia de compte</button></p>`}
    <${ModalHost} />
  </div>`;
}

function ConnectNote({ tone = 'bad', children }) {
  return html`<p class=${U.cls('connect-note', `connect-note-${tone}`)} role=${tone === 'bad' ? 'alert' : undefined}>
    <${Icon} name=${tone === 'bad' ? 'alert' : 'info'} size=${16} /><span>${children}</span></p>`;
}

function useBusy() {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const run = async (fn) => {
    setBusy(true);
    setErr('');
    try { await fn(); } catch (e) { setErr(e.message || String(e)); setBusy(false); }
  };
  return { busy, err, run, setErr };
}

// Pas 0: els dos codis de Microsoft Entra (només si la versió publicada no els porta ja).
function ConnectConfig({ cfg }) {
  const [clientId, setClientId] = useState(cfg.clientId);
  const [tenantId, setTenantId] = useState(cfg.tenantId);
  const { busy, err, run, setErr } = useBusy();
  const save = () => {
    const c = clientId.trim(), t = tenantId.trim();
    if (!GUID_RE.test(c)) { setErr('L\'Id. de l\'aplicació ha de tenir el format 00000000-0000-0000-0000-000000000000.'); return; }
    if (!GUID_RE.test(t) && !/^[a-z0-9-]+(\.[a-z0-9-]+)+$/i.test(t)) { setErr('L\'Id. del directori ha de ser un codi com el de l\'aplicació (o el domini, p. ex. eonlife.onmicrosoft.com).'); return; }
    run(async () => { M365.save({ enabled: true, clientId: c, tenantId: t }); await reconnect(); });
  };
  return html`<h1 class="h2">Connecta l'app amb Microsoft 365</h1>
    <p>Aquests dos codis te'ls dona l'administrador de Microsoft 365 del centre. Són a <em>Microsoft Entra › Registres d'aplicacions › EON Life › Informació general</em>.</p>
    <form class="connect-form" onSubmit=${(e) => { e.preventDefault(); save(); }}>
      <${Field} label="Id. de l'aplicació (client)" id="cx-client">
        <${TextInput} id="cx-client" value=${clientId} onValue=${setClientId} placeholder="00000000-0000-0000-0000-000000000000" autoFocus=${true} disabled=${cfg.baked.clientId} />
      </${Field}>
      <${Field} label="Id. del directori (inquilí)" id="cx-tenant">
        <${TextInput} id="cx-tenant" value=${tenantId} onValue=${setTenantId} placeholder="00000000-0000-0000-0000-000000000000" disabled=${cfg.baked.tenantId} />
      </${Field}>
      ${err && html`<${ConnectNote}>${err}</${ConnectNote}>`}
      <${Btn} type="submit" variant="primary" iconRight="right" disabled=${busy}>${busy ? 'Connectant…' : 'Desa i continua'}</${Btn}>
    </form>
    <${RedirectInfo} />`;
}

// L'adreça que cal registrar a Entra com a URI de redirecció (SPA).
function RedirectInfo() {
  const uri = MsAuth.redirectUri();
  const copy = async () => {
    try { await navigator.clipboard.writeText(uri); UI.toast('Adreça copiada.'); } catch (e) { UI.toast('No s\'ha pogut copiar: selecciona-la i copia-la a mà.', 'bad'); }
  };
  return html`<div class="connect-uri">
    <span class="muted small">Adreça d'aquesta app (URI de redirecció de tipus SPA):</span>
    <span class="connect-uri-row"><code>${uri}</code><${Btn} variant="ghost" size="sm" icon="copy" title="Copia l'adreça" onClick=${copy} /></span>
  </div>`;
}

// Pas 1: inici de sessió.
function ConnectLogin({ cfg, message }) {
  const { busy, err, run } = useBusy();
  const problem = err || (message && !/^Cal iniciar la sessió/.test(message) ? message : '');
  return html`<h1 class="h2">Inicia la sessió</h1>
    <p>Entra amb el <strong>compte de Microsoft del centre</strong> (el mateix del correu de l'empresa). A cada tauleta només cal fer-ho un cop.</p>
    ${problem && html`<${ConnectNote}>${problem}</${ConnectNote}>`}
    <div class="connect-actions">
      <${Btn} variant="primary" icon="link" disabled=${busy} onClick=${() => run(() => MsAuth.begin(cfg))}>${busy ? 'Obrint Microsoft…' : 'Inicia la sessió amb Microsoft'}</${Btn}>
      ${!cfg.baked.clientId && html`<${Btn} variant="ghost" onClick=${() => { M365.save({ clientId: '', tenantId: '' }); reconnect(); }}>Canvia els codis de l'app</${Btn}>`}
    </div>
    ${problem && html`<${RedirectInfo} />`}`;
}

// Pas 2: carpeta compartida (enllaç de «Copia l'enllaç»).
function ConnectFolder({ cfg }) {
  const [url, setUrl] = useState(cfg.folderUrl || '');
  const { busy, err, run, setErr } = useBusy();
  const connect = () => {
    if (!/^https:\/\/\S+$/i.test(url.trim())) { setErr('Enganxa l\'enllaç complet de la carpeta (comença per https://).'); return; }
    run(async () => { await M365Backend.connectFolder(url); await reconnect(); });
  };
  return html`<h1 class="h2">Tria la carpeta compartida</h1>
    <p>És la carpeta de OneDrive o SharePoint on es desaran totes les dades i els vídeos. Obre-la al navegador, prem <strong>Copia l'enllaç</strong> (o copia l'adreça de la barra) i enganxa-la aquí.</p>
    <form class="connect-form" onSubmit=${(e) => { e.preventDefault(); connect(); }}>
      <${Field} label="Enllaç de la carpeta" id="cx-folder">
        <${TextInput} id="cx-folder" value=${url} onValue=${setUrl} placeholder="https://…sharepoint.com/…" autoFocus=${true} />
      </${Field}>
      ${err && html`<${ConnectNote}>${err}</${ConnectNote}>`}
      <${Btn} type="submit" variant="primary" icon="folder" disabled=${busy}>${busy ? 'Comprovant la carpeta…' : 'Connecta la carpeta'}</${Btn}>
    </form>
    <p class="muted small">Cal tenir permís d'<strong>edició</strong> a la carpeta.</p>`;
}

// Pas 3: primera vegada a la carpeta → es creen l'Excel i la carpeta de clients.
function ConnectSetup({ cfg }) {
  const { busy, err, run } = useBusy();
  const other = async () => { M365.forgetFolder(); await reconnect(); };
  return html`<h1 class="h2">Prepara la carpeta${cfg.folderName ? html` «${cfg.folderName}»` : ''}</h1>
    <p>És el primer cop que s'hi connecta l'app. Només cal fer-ho una vegada per a tot el centre. S'hi crearan:</p>
    <ul class="connect-list">
      <li><${Icon} name="table" size=${18} /><span><strong>EON Life · Base de dades</strong> (Excel): una pestanya per a clients, valoracions, sessions i registre d'exercicis. Cada test és una columna i cada valoració o sessió, una fila.</span></li>
      <li><${Icon} name="folder" size=${18} /><span><strong>EON Life · Clients</strong>: una carpeta per client amb <em>01 · Valoracions</em>, <em>02 · Vídeos</em> i <em>03 · Informes</em>.</span></li>
    </ul>
    ${err && html`<${ConnectNote}>${err}</${ConnectNote}>`}
    <div class="connect-actions">
      <${Btn} variant="primary" icon="check" disabled=${busy} onClick=${() => run(async () => { await M365Backend.setup(); await reconnect(); })}>${busy ? 'Preparant…' : 'Prepara la carpeta'}</${Btn}>
      ${!cfg.baked.folderUrl && html`<${Btn} variant="ghost" disabled=${busy} onClick=${other}>Tria una altra carpeta</${Btn}>`}
    </div>`;
}

// Qualsevol altre problema (connexió, permisos…).
function ConnectError({ cfg, message, code }) {
  const { busy, run } = useBusy();
  return html`<h1 class="h2">No s'han pogut carregar les dades</h1>
    <${ConnectNote}>${message || 'Error desconegut.'}</${ConnectNote}>
    <p class="muted">${code === 'network' ? 'Comprova la connexió a internet de la tauleta.' : 'Si el problema continua, comprova que tens permís d\'edició a la carpeta compartida.'}</p>
    <div class="connect-actions">
      <${Btn} variant="primary" icon="refresh" disabled=${busy} onClick=${() => run(reconnect)}>Torna-ho a provar</${Btn}>
      ${!cfg.baked.folderUrl && html`<${Btn} variant="ghost" onClick=${() => { M365.forgetFolder(); reconnect(); }}>Tria una altra carpeta</${Btn}>`}
    </div>`;
}
