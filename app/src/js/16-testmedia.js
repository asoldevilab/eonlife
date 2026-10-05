/* EON Life · fotos i vídeos per costat dels tests de la valoració.
   - Fotos: els tests que es documenten amb una foto i no amb vídeo (test de Thomas, dreta i esquerra; flexió de tronc).
   - Vídeos per costat: el single leg squat, amb un vídeo de la dreta i un de l'esquerra.
   Es fan amb la càmera de la tauleta o es trien de la galeria. Amb Microsoft 365 van a la carpeta del client (fotos a
   «01 · Valoracions», vídeos a «02 · Vídeos»); a la versió local, a la mateixa tauleta. Al registre hi queda l'enllaç. */

// Foto més lleugera abans de desar-la: costat llarg de 1600 px en JPEG. L'<img> ja la gira segons l'EXIF de la càmera.
async function preparePhoto(file, max = 1600) {
  if (!/^image\//.test(file.type || '')) return file;
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('img')); i.src = url; });
    const w = img.naturalWidth, h = img.naturalHeight;
    if (!w || !h) return file;
    const k = Math.min(1, max / Math.max(w, h));
    if (k === 1 && /jpe?g/.test(file.type) && file.size < 1500000) return file;
    const cv = document.createElement('canvas');
    cv.width = Math.round(w * k);
    cv.height = Math.round(h * k);
    const cx = cv.getContext('2d');
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, cv.width, cv.height);
    cx.drawImage(img, 0, 0, cv.width, cv.height);
    const blob = await new Promise((ok) => cv.toBlob(ok, 'image/jpeg', 0.85));
    return blob ? new File([blob], `${String(file.name || 'foto').replace(/\.[^.]+$/, '')}.jpg`, { type: 'image/jpeg' }) : file;
  } catch (e) {
    return file;
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Enllaç desat → imatge que es pot mostrar: la de la tauleta, la miniatura de la carpeta del client o l'enllaç mateix.
const PhotoSrc = {
  cache: {},
  set(url, src) { if (url && src) this.cache[url] = src; },
  async get(url, patient) {
    if (!url) return null;
    if (this.cache[url]) return this.cache[url];
    let src = null;
    if (LocalFiles.is(url)) src = await LocalFiles.objectUrl(url);
    else if (Store.backend && Store.backend.mediaInfo && patient && patient.folderId) {
      try {
        const info = (await Store.backend.mediaInfo(patient.folderId, [url]))[url];
        src = (info && (info.thumb || info.play)) || null;
      } catch (e) { src = null; }
    } else if (/\.(jpe?g|png|webp|gif)(\?|$)/i.test(url)) src = url;
    if (src) this.cache[url] = src;
    return src;
  },
};

function usePhotoSrc(url, patient) {
  const [src, setSrc] = useState(PhotoSrc.cache[url] || null);
  useEffect(() => {
    let alive = true;
    setSrc(PhotoSrc.cache[url] || null);
    if (url) PhotoSrc.get(url, patient).then((s) => { if (alive) setSrc(s); }).catch(() => {});
    return () => { alive = false; };
  }, [url]);
  return src;
}

// Foto en gran: a la versió local, amb el visor de fitxers de la tauleta; si no, la imatge o l'enllaç a la carpeta.
function openPhoto(url, src, title) {
  if (LocalFiles.is(url)) { LocalFiles.show(url); return; }
  if (!src) { window.open(url, '_blank', 'noopener'); return; }
  let close = null;
  close = UI.open(() => html`<${Dialog} title=${title} wide=${true} onClose=${() => close()} footer=${html`
    <a class="btn btn-secondary" href=${url} target="_blank" rel="noopener"><${Icon} name="folder" size=${16} /><span>Obre a la carpeta</span></a>`}>
    <img class="localfile-img" src=${src} alt=${title} />
  </${Dialog}>`, { onDismiss: () => close() });
}

// Nom de cada foto o vídeo: «Test de Thomas · dreta» (o només el nom del test, si n'hi ha un).
const mediaTitle = (t, list, m) => (list.length > 1 ? `${t.name} · ${m.label.toLowerCase()}` : t.name);

// Les fotos i els vídeos per costat d'un test, a sota de la seva fila.
function TestMedia({ t, a, p, setVal }) {
  const x = (a.values || {})[t.id] || {};
  return html`<div class="tmedia">
    ${(t.photos || []).map((m) => html`<${PhotoSlot} key=${m.k} url=${x[m.k]} label=${`Foto ${m.label.toLowerCase()}`.replace(/^Foto foto$/, 'Foto')}
      title=${mediaTitle(t, t.photos, m)} patient=${p} date=${a.date} onChange=${(v) => setVal(t.id, m.k, v)} />`)}
    ${(t.videos || []).map((m) => html`<${VideoSlot} key=${m.k} url=${x[m.k]} label=${`Vídeo ${m.label.toLowerCase()}`}
      title=${mediaTitle(t, t.videos, m)} patient=${p} date=${a.date} onChange=${(v) => setVal(t.id, m.k, v)} />`)}
  </div>`;
}

// Un vídeo d'un costat: es grava amb la càmera o es tria de la galeria i es desa sol; «Enllaç» per triar-ne un de la
// carpeta del client o enganxar-ne l'enllaç.
function VideoSlot({ url, label, title, patient, date, onChange }) {
  const recRef = useRef(null);
  const galRef = useRef(null);
  const [up, setUp] = useState(null);
  const can = canUploadFiles() && !!patient && !!patient.id;
  const has = U.isUrl(url);
  const save = async (file) => {
    for (const r of [recRef, galRef]) if (r.current) r.current.value = '';
    if (!file) return;
    setUp(0);
    try {
      const res = await uploadToClient(patient, file, { label: title, date, onProgress: (pct) => setUp(pct) });
      if (!res.url) throw new Error('No s\'ha pogut desar el vídeo.');
      onChange(res.url);
      UI.toast(filesOnDevice() ? 'Vídeo desat a la tauleta.' : `Vídeo desat a la carpeta de ${patient.firstName || 'el client'}.`);
    } catch (e) {
      UI.toast(e.message, 'bad');
    }
    setUp(null);
  };
  const play = () => (LocalFiles.is(url) ? LocalFiles.show(url) : window.open(url, '_blank', 'noopener'));
  return html`<div class=${U.cls('tphoto tvideo', has && 'has')}>
    <button type="button" class="tphoto-img" disabled=${!has} onClick=${play} aria-label=${has ? `Mira el vídeo: ${title}` : `Sense vídeo: ${title}`}>
      <${Icon} name=${has ? 'playfill' : 'video'} size=${22} />
    </button>
    <div class="tphoto-body">
      <span class="tphoto-label">${label}</span>
      ${up != null ? html`<span class="muted small"><span class="spinner"></span> ${filesOnDevice() ? 'Desant el vídeo…' : `Pujant el vídeo… ${Math.round(up * 100)} %`}</span>`
        : html`<div class="tphoto-actions">
            ${can && html`<input type="file" accept="video/*" capture="environment" hidden ref=${recRef} data-kind="record" onChange=${(e) => save(e.currentTarget.files[0])} />
              <input type="file" accept="video/*" hidden ref=${galRef} data-kind="gallery" onChange=${(e) => save(e.currentTarget.files[0])} />
              <${Btn} size="sm" variant=${has ? 'ghost' : 'primary'} icon="video" title=${has ? 'Torna a gravar el vídeo' : 'Grava el vídeo amb la càmera'}
                onClick=${() => recRef.current && recRef.current.click()}>${has ? '' : 'Grava'}</${Btn}>
              <${Btn} size="sm" variant="ghost" icon="upload" title="Tria un vídeo de la galeria" onClick=${() => galRef.current && galRef.current.click()}>${has ? '' : 'Tria\'n un'}</${Btn}>`}
            <${Btn} size="sm" variant="ghost" icon="link" title="Enllaç al vídeo (carpeta del client, YouTube…)"
              onClick=${() => openVideoDialog({ url, onChange, title, patient })}>${can ? '' : 'Enllaç'}</${Btn}>
          </div>`}
    </div>
  </div>`;
}

function PhotoSlot({ url, label, title, patient, date, onChange }) {
  const camRef = useRef(null);
  const galRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const src = usePhotoSrc(url, patient);
  const can = canUploadFiles() && !!patient && !!patient.id;
  const save = async (file) => {
    for (const r of [camRef, galRef]) if (r.current) r.current.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const photo = await preparePhoto(file);
      const res = await uploadToClient(patient, photo, { label: title, date, subfolder: M365_NAMES.reports });
      if (!res.url) throw new Error('No s\'ha pogut desar la foto.');
      PhotoSrc.set(res.url, URL.createObjectURL(photo));
      onChange(res.url);
      UI.toast(filesOnDevice() ? 'Foto desada a la tauleta.' : `Foto desada a la carpeta de ${patient.firstName || 'el client'}.`);
    } catch (e) {
      UI.toast(e.message, 'bad');
    }
    setBusy(false);
  };
  const remove = async () => {
    if (await UI.confirm({ title: 'Treure la foto?', text: 'Es treu de la valoració. Si és a la carpeta del client, el fitxer s\'hi queda.', ok: 'Treu-la', danger: true })) onChange('');
  };
  return html`<div class=${U.cls('tphoto', url && 'has')}>
    <button type="button" class="tphoto-img" disabled=${!url} onClick=${() => openPhoto(url, src, title)}
      aria-label=${url ? `Mira la foto: ${title}` : `Sense foto: ${title}`}>
      ${url && src ? html`<img src=${src} alt="" />` : html`<${Icon} name="camera" size=${22} />`}
    </button>
    <div class="tphoto-body">
      <span class="tphoto-label">${label}</span>
      ${busy ? html`<span class="muted small"><span class="spinner"></span> Desant la foto…</span>`
        : can ? html`<div class="tphoto-actions">
            <input type="file" accept="image/*" capture="environment" hidden ref=${camRef} data-kind="camera" onChange=${(e) => save(e.currentTarget.files[0])} />
            <input type="file" accept="image/*" hidden ref=${galRef} data-kind="gallery" onChange=${(e) => save(e.currentTarget.files[0])} />
            <${Btn} size="sm" variant=${url ? 'ghost' : 'primary'} icon="camera" title=${url ? 'Torna a fer la foto' : 'Fes la foto amb la càmera'}
              onClick=${() => camRef.current && camRef.current.click()}>${url ? '' : 'Fes la foto'}</${Btn}>
            <${Btn} size="sm" variant="ghost" icon="upload" title="Tria una foto de la galeria" onClick=${() => galRef.current && galRef.current.click()}>${url ? '' : 'Tria\'n una'}</${Btn}>
            ${url && html`<${Btn} size="sm" variant="ghost" icon="trash" title="Treu la foto" onClick=${remove} />`}
          </div>`
        : html`<span class="muted small">${url ? 'Foto desada.' : 'En aquesta versió no es poden desar fotos.'}</span>`}
    </div>
  </div>`;
}

// Fotos dels tests a l'informe (i al PDF), amb el nom del test i el costat.
function ReportPhotos({ a, p, tests }) {
  const v = a.values || {};
  const list = [];
  for (const tid of tests) {
    const t = TEST_INDEX[tid];
    for (const ph of (t && t.photos) || []) {
      const url = (v[tid] || {})[ph.k];
      if (url) list.push({ url, title: mediaTitle(t, t.photos, ph) });
    }
  }
  if (!list.length) return null;
  return html`<div class="rphotos">${list.map((x) => html`<${ReportPhoto} key=${x.url} url=${x.url} title=${x.title} patient=${p} />`)}</div>`;
}

function ReportPhoto({ url, title, patient }) {
  const src = usePhotoSrc(url, patient);
  return html`<figure class="rphoto">
    <button type="button" class="rphoto-img" onClick=${() => openPhoto(url, src, title)} aria-label=${`Mira la foto: ${title}`}>
      ${src ? html`<img src=${src} alt=${title} />` : html`<${Icon} name="camera" size=${22} />`}
    </button>
    <figcaption>${title}</figcaption>
  </figure>`;
}
