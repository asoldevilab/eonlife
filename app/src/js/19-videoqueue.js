/* EON Life · vídeos dels exercicis de la sessió: gravadora dins l'app i cua de pujada que no es perd.
   Abans el vídeo es pujava mentre la finestra era oberta: si es tancava, la tauleta s'apagava o tallava la
   connexió, el vídeo quedava a la galeria però no arribava a la carpeta del pacient. Ara:
   · el vídeo es desa primer a la tauleta (IndexedDB) i la finestra es tanca de seguida;
   · es puja en segon pla a «Sessions › Vídeos sessions d'entrenament» de la carpeta del pacient, amb el nom
     exercici_pacient_data_01 (uploadToClient), reintentant si falla, i també en tornar a obrir l'app;
   · quan acaba, l'enllaç queda a l'exercici de la sessió (it.video) i el vídeo s'esborra de la tauleta. */

const VideoQueue = (() => {
  const STORE = 'queue';
  const BACKOFF = [15e3, 60e3, 3 * 60e3, 10 * 60e3];
  let dbp = null;
  let busy = false;
  let timer = null;
  let lock = null;
  const live = {};              // clau (sessió/exercici) → { state: 'waiting' | 'uploading' | 'error', pct, error }
  const listeners = new Set();
  const emit = () => { for (const fn of listeners) fn(); };
  const keyOf = (t) => `${t.sessionId}/${t.itemId}`;

  const db = () => dbp || (dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open('eonlife-videos', 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE, { keyPath: 'id' });
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => { dbp = null; reject(r.error || new Error('No es poden desar vídeos en aquesta tauleta.')); };
  }));
  const run = async (mode, fn) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('No s\'ha pogut desar el vídeo a la tauleta.'));
    });
  };
  const all = () => run('readonly', (s) => s.getAll());

  // La pantalla no s'apaga mentre es puja (si la tauleta ho permet).
  const keepAwake = async (on) => {
    try {
      if (on && !lock && navigator.wakeLock) lock = await navigator.wakeLock.request('screen');
      if (!on && lock) { await lock.release(); lock = null; }
    } catch (e) { lock = null; }
  };

  const ready = () => typeof Store !== 'undefined' && Store.ready && !Store.error && canUploadFiles();

  // L'enllaç va a l'exercici de la sessió (encara que s'hagi mogut de bloc).
  function link(job, url) {
    const s = Store.get('sessions', job.sessionId);
    if (!s || !url) return false;
    let found = false;
    Store.update('sessions', job.sessionId, (x) => {
      for (const b of x.blocks || []) for (const it of b.items || []) if (it.id === job.itemId) { it.video = url; found = true; }
    });
    return found;
  }

  async function tick() {
    clearTimeout(timer);
    timer = null;
    if (busy) return;
    if (!ready()) { timer = setTimeout(tick, 5000); return; }
    let jobs;
    try { jobs = await all(); } catch (e) { return; }
    const now = Date.now();
    for (const j of jobs) if (!live[keyOf(j)]) live[keyOf(j)] = { state: j.error ? 'error' : 'waiting', pct: 0, error: j.error || '' };
    const job = jobs.filter((j) => (j.nextAt || 0) <= now).sort((a, b) => a.createdAt - b.createdAt)[0];
    if (!job) {
      const next = Math.min(...jobs.map((j) => j.nextAt || now));
      if (jobs.length) timer = setTimeout(tick, Math.max(2000, next - now));
      emit();
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.onLine === false) { timer = setTimeout(tick, 15000); return; }
    busy = true;
    const k = keyOf(job);
    live[k] = { state: 'uploading', pct: 0, error: '' };
    emit();
    keepAwake(true);
    try {
      const p = Store.get('patients', job.patientId);
      if (!p) throw new Error('No trobo el pacient d\'aquest vídeo.');
      const file = new File([job.blob], job.fileName || 'video', { type: job.type || (job.blob && job.blob.type) || 'video/mp4' });
      const res = await uploadToClient(p, file, { label: job.label, date: job.date, where: job.where || 'sessionVideos',
        onProgress: (pct) => { live[k] = { state: 'uploading', pct, error: '' }; emit(); } });
      link(job, res.url);
      await run('readwrite', (s) => s.delete(job.id));
      delete live[k];
      UI.toast(`Vídeo pujat a la carpeta de ${p.firstName || 'el pacient'}: ${res.name || job.label}.`);
    } catch (e) {
      const tries = (job.tries || 0) + 1;
      const msg = (e && e.message) || 'No s\'ha pogut pujar el vídeo.';
      try { await run('readwrite', (s) => s.put({ ...job, tries, error: msg, nextAt: Date.now() + BACKOFF[Math.min(tries, BACKOFF.length) - 1] })); } catch (e2) { /* es tornarà a provar */ }
      live[k] = { state: 'error', pct: 0, error: msg };
    }
    busy = false;
    let left = [];
    try { left = await all(); } catch (e) { /* res */ }
    if (!left.length) keepAwake(false);
    emit();
    timer = setTimeout(tick, left.length ? 300 : 60000);
  }

  return {
    available() { try { return typeof indexedDB !== 'undefined' && !!indexedDB; } catch (e) { return false; } },
    subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); },
    status(sessionId, itemId) { return live[`${sessionId}/${itemId}`] || null; },
    pending() { return Object.values(live).filter((x) => x.state !== 'error').length; },

    // Afegeix un vídeo a la cua. target = { sessionId, itemId }; patient, label (nom de l'exercici), date.
    async add(file, { target, patient, label, date, where = 'sessionVideos' }) {
      if (!file || !file.size) throw new Error('El vídeo és buit.');
      const job = {
        id: U.uid('V'), sessionId: target.sessionId, itemId: target.itemId, patientId: patient.id, label: label || 'Exercici',
        date: date || U.today(), where, blob: file, fileName: file.name || '', type: file.type || '', size: file.size,
        createdAt: Date.now(), tries: 0, nextAt: 0,
      };
      await run('readwrite', (s) => s.put(job));
      live[keyOf(job)] = { state: 'waiting', pct: 0, error: '' };
      emit();
      tick();
      return job.id;
    },

    // Torna a provar ara els que han fallat.
    retry() {
      all().then((jobs) => Promise.all(jobs.map((j) => run('readwrite', (s) => s.put({ ...j, nextAt: 0 }))))).then(() => tick()).catch(() => {});
    },

    start() {
      if (!this.available()) return;
      tick();
      window.addEventListener('online', () => this.retry());
      document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'visible') tick(); });
    },
  };
})();

// Estat de pujada d'un vídeo d'un exercici, per tornar a pintar el botó mentre puja.
function useVideoStatus(sessionId, itemId) {
  const [, setN] = useState(0);
  useEffect(() => VideoQueue.subscribe(() => setN((n) => n + 1)), []);
  return sessionId && itemId ? VideoQueue.status(sessionId, itemId) : null;
}

// ── Gravadora dins l'app ──
// Grava amb la càmera sense sortir de l'app (si se surt a l'app de càmera, Android a vegades tanca l'app i el vídeo es
// perd). Vídeo a 720p, sense so, en MP4 si la tauleta en sap fer (si no, WebM).
function videoRecorderType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  return ['video/mp4;codecs=avc1', 'video/mp4', 'video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((t) => { try { return MediaRecorder.isTypeSupported(t); } catch (e) { return false; } }) || '';
}
function canRecordInApp() {
  return typeof navigator !== 'undefined' && !!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia) && typeof MediaRecorder !== 'undefined';
}

function openVideoRecorder({ title, onFile }) {
  let close = null;
  close = UI.open(() => html`<${VideoRecorder} title=${title} onFile=${(f) => { close(); onFile(f); }} onClose=${() => close()} />`, { onDismiss: () => close() });
}

function VideoRecorder({ title, onFile, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const recRef = useRef(null);
  const chunks = useRef([]);
  const [facing, setFacing] = useState('environment');
  const [phase, setPhase] = useState('starting'); // starting · ready · recording · review · error
  const [err, setErr] = useState('');
  const [secs, setSecs] = useState(0);
  const [clip, setClip] = useState(null);       // { file, url }
  const type = videoRecorderType();

  const stopStream = () => { const st = streamRef.current; if (st) st.getTracks().forEach((t) => t.stop()); streamRef.current = null; };
  const startStream = async (face) => {
    stopStream();
    setPhase('starting');
    try {
      const st = await navigator.mediaDevices.getUserMedia({ audio: false,
        video: { facingMode: { ideal: face }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } } });
      streamRef.current = st;
      if (videoRef.current) { videoRef.current.srcObject = st; videoRef.current.play().catch(() => {}); }
      setPhase('ready');
    } catch (e) {
      setErr(e && e.name === 'NotAllowedError' ? 'La tauleta no deixa fer servir la càmera. Dona permís a la càmera per a aquesta app (icona del cadenat de la barra d\'adreces o Configuració de la tauleta).' : 'No s\'ha pogut obrir la càmera.');
      setPhase('error');
    }
  };
  useEffect(() => {
    startStream(facing);
    const unEsc = EscStack.push(() => onClose());
    return () => { unEsc(); try { if (recRef.current && recRef.current.state !== 'inactive') recRef.current.stop(); } catch (e) { /* res */ } stopStream(); };
  }, []);
  useEffect(() => {
    if (phase !== 'recording') return undefined;
    const t0 = Date.now();
    const iv = setInterval(() => setSecs(Math.floor((Date.now() - t0) / 1000)), 250);
    return () => clearInterval(iv);
  }, [phase]);
  useEffect(() => () => { if (clip) URL.revokeObjectURL(clip.url); }, [clip]);

  const record = () => {
    const st = streamRef.current;
    if (!st) return;
    chunks.current = [];
    let rec;
    try { rec = new MediaRecorder(st, { ...(type ? { mimeType: type } : {}), videoBitsPerSecond: 2500000 }); } catch (e) {
      try { rec = new MediaRecorder(st); } catch (e2) { setErr('Aquesta tauleta no pot gravar vídeo dins l\'app.'); setPhase('error'); return; }
    }
    rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.current.push(e.data); };
    rec.onstop = () => {
      const t = rec.mimeType || type || 'video/webm';
      const blob = new Blob(chunks.current, { type: t.split(';')[0] });
      const file = new File([blob], `video.${/mp4/.test(t) ? 'mp4' : 'webm'}`, { type: t.split(';')[0] });
      setClip({ file, url: URL.createObjectURL(blob) });
      setPhase('review');
      stopStream();
    };
    recRef.current = rec;
    rec.start(1000);
    setSecs(0);
    setPhase('recording');
  };
  const stop = () => { try { recRef.current && recRef.current.stop(); } catch (e) { /* res */ } };
  const again = () => { setClip(null); startStream(facing); };
  const flip = () => { const f = facing === 'environment' ? 'user' : 'environment'; setFacing(f); startStream(f); };
  const mmss = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`;

  return html`<div class="vrec" role="dialog" aria-modal="true" aria-label=${`Grava · ${title}`}>
    <header class="vrec-head">
      <div class="grow"><p class="eyebrow">Grava el pacient</p><h2 class="h2 vrec-title">${title}</h2></div>
      ${phase === 'recording' && html`<span class="vrec-time" aria-live="polite"><span class="vrec-dot"></span>${mmss}</span>`}
      <${Btn} variant="ghost" icon="x" title="Tanca" onClick=${onClose} disabled=${phase === 'recording'} />
    </header>
    <div class="vrec-stage">
      ${phase === 'review' && clip ? html`<video src=${clip.url} controls playsinline class="vrec-video"></video>`
        : html`<video ref=${videoRef} muted playsinline autoplay class=${U.cls('vrec-video', facing === 'user' && 'mirror')}></video>`}
      ${phase === 'starting' && html`<p class="vrec-msg">Obrint la càmera…</p>`}
      ${phase === 'error' && html`<p class="vrec-msg vrec-err">${err}</p>`}
    </div>
    <footer class="vrec-foot">
      ${phase === 'ready' && html`<${Btn} variant="ghost" icon="refresh" onClick=${flip}>Gira la càmera</${Btn}><span class="grow"></span>
        <button type="button" class="vrec-btn" onClick=${record} aria-label="Comença a gravar"><span></span></button><span class="grow"></span><span class="vrec-spacer"></span>`}
      ${phase === 'recording' && html`<span class="grow"></span><button type="button" class="vrec-btn on" onClick=${stop} aria-label="Atura la gravació"><span></span></button><span class="grow"></span>`}
      ${phase === 'review' && html`<${Btn} variant="ghost" icon="refresh" onClick=${again}>Torna a gravar</${Btn}><span class="grow"></span>
        <${Btn} variant="primary" icon="upload" onClick=${() => onFile(clip.file)}>Desa i puja a la carpeta</${Btn}>`}
      ${phase === 'error' && html`<span class="grow"></span><${Btn} onClick=${onClose}>Tanca</${Btn}>`}
    </footer>
  </div>`;
}
