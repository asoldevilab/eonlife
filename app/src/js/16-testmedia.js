/* EON Life · fotos i vídeos per costat dels tests de la valoració.
   - Fotos: els tests que es documenten amb una foto i no amb vídeo (test de Thomas, dreta i esquerra; flexió de tronc).
   - Vídeos per costat: el single leg squat, amb un vídeo de la dreta i un de l'esquerra.
   Es fan amb la càmera de la tauleta o es trien de la galeria. Amb Microsoft 365 van a la carpeta del pacient (fotos a
   «Valoracions», vídeos a «Valoracions › Vídeos valoracions»); a la versió local, a la mateixa tauleta. Al registre hi queda l'enllaç. */

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

// Fotos i vídeos de la carpeta del pacient (Microsoft 365). L'enllaç d'un fitxer canvia si algú canvia el nom d'una
// carpeta per sobre seu (la del pacient, «EON Life · Clients»…) o el mou; per això, en pujar-lo, a la valoració es desa
// també el seu identificador i el nom (a.media = { enllaç → { id, name } }). Quan es mira, es busca per identificador o
// pel nom (09-m365.js, mediaInfo) i, si ara té un altre enllaç, la valoració s'arregla sola.
const MediaLinks = {
  meta(rec, url) { return (url && rec && rec.media && rec.media[url]) || null; },
  // Desa l'identificador d'un enllaç i, si el fitxer té un enllaç nou, el canvia a tot el registre.
  relink(kind, id, oldUrl, info) {
    if (!id || !oldUrl || !info || !info.id) return;
    const rec = Store.get(kind, id);
    if (!rec) return;
    const url = info.url || oldUrl;
    const m = MediaLinks.meta(rec, url);
    if (url === oldUrl && m && m.id === info.id) return;
    if (url !== oldUrl) {
      PhotoSrc.alias(oldUrl, url);
      const crop = PhotoCrop.known(oldUrl);
      if (crop !== undefined) PhotoCrop.remember(url, crop);
    }
    Store.update(kind, id, (x) => {
      if (url !== oldUrl) MediaLinks.swap(x, oldUrl, url);
      x.media = { ...(x.media || {}) };
      delete x.media[oldUrl];
      x.media[url] = { id: info.id, name: info.name || '' };
    });
  },
  swap(o, from, to) {
    for (const k of Object.keys(o)) {
      if (k === 'media') continue;
      if (o[k] === from) o[k] = to;
      else if (o[k] && typeof o[k] === 'object') MediaLinks.swap(o[k], from, to);
    }
  },
};

// Enllaç desat → imatge que es pot mostrar: la de la tauleta, la miniatura de la carpeta del pacient o l'enllaç mateix.
// info[enllaç]: { id, name, url (l'enllaç d'ara), play (la foto sencera, una hora) } o { missing: true } o { error }.
const PhotoSrc = {
  cache: {},
  info: {},
  wait: {},
  queue: new Map(),
  set(url, src, info) {
    if (url && src) this.cache[url] = src;
    if (url && info) this.info[url] = info;
  },
  alias(from, to) {
    if (this.cache[from]) this.cache[to] = this.cache[from];
    if (this.info[from]) this.info[to] = { ...this.info[from], url: to };
  },
  get(url, patient, meta) {
    if (!url) return Promise.resolve(null);
    if (this.cache[url]) return Promise.resolve(this.cache[url]);
    if (!this.wait[url]) {
      this.wait[url] = this.load(url, patient, meta).catch(() => null).then((src) => {
        if (src) this.cache[url] = src;
        delete this.wait[url]; // si no s'ha trobat, es torna a provar la propera vegada (potser l'han restaurat)
        return src;
      });
    }
    return this.wait[url];
  },
  async load(url, patient, meta) {
    if (LocalFiles.is(url)) return LocalFiles.objectUrl(url);
    if (isCloudFileUrl(url)) {
      const b = Store.backend;
      if (!(b && b.mediaInfo && patient && patient.folderId)) { this.info[url] = { url }; return null; }
      try {
        const info = await this.ask(patient.folderId, url, meta);
        this.info[url] = info || { missing: true };
        return (info && (info.thumb || info.play)) || null;
      } catch (e) {
        this.info[url] = { error: (e && e.message) || 'error de connexió' };
        return null;
      }
    }
    return /\.(jpe?g|png|webp|gif)(\?|$)/i.test(url) ? url : null;
  },
  // Les fotos d'una mateixa carpeta es demanen juntes (una sola volta per la carpeta).
  ask(folderId, url, meta) {
    return new Promise((resolve, reject) => {
      let q = this.queue.get(folderId);
      if (!q) {
        q = [];
        this.queue.set(folderId, q);
        setTimeout(async () => {
          this.queue.delete(folderId);
          const metas = Object.fromEntries(q.filter((x) => x.meta && x.meta.id).map((x) => [x.url, x.meta]));
          try {
            const res = await Store.backend.mediaInfo(folderId, q.map((x) => x.url), metas);
            for (const x of q) x.resolve(res[x.url] || null);
          } catch (e) {
            for (const x of q) x.reject(e);
          }
        }, 30);
      }
      q.push({ url, meta, resolve, reject });
    });
  },
};

// [imatge, info] d'una foto; onFound(info) quan s'ha trobat a la carpeta (per desar-ne l'identificador o l'enllaç nou).
function usePhoto(url, patient, meta, onFound) {
  const [, setTick] = useState(0);
  useEffect(() => {
    let alive = true;
    if (url) {
      PhotoSrc.get(url, patient, meta).then(() => {
        if (!alive) return;
        setTick((n) => n + 1);
        const info = PhotoSrc.info[url];
        if (onFound && info && info.id) onFound(info);
      });
    }
    return () => { alive = false; };
  }, [url]);
  return [(url && PhotoSrc.cache[url]) || null, (url && PhotoSrc.info[url]) || null];
}

// Una foto o un vídeo que no es pot obrir: s'explica per què, en lloc d'obrir un enllaç que dona «Not Found».
function mediaProblem({ title, info, patient, what = 'la foto' }) {
  let close = null;
  close = UI.open(() => html`<${Dialog} title=${title} onClose=${() => close()} footer=${html`
    ${patient && patient.folderUrl && html`<a class="btn btn-secondary" href=${patient.folderUrl} target="_blank" rel="noopener"><${Icon} name="folder" size=${16} /><span>Obre la carpeta del pacient</span></a>`}
    <span class="grow"></span>
    <${Btn} variant="primary" onClick=${() => close()}>D'acord</${Btn}>`}>
    ${info && info.missing ? html`
      <p>No trobo ${what} a la carpeta del pacient ni enlloc més de la carpeta compartida: potser s'ha esborrat.</p>
      <p class="muted">Mira la <strong>paperera de reciclatge</strong> de SharePoint (hi queda 93 dies). Si hi és, restaura-la i torna a obrir aquesta pantalla: l'app la trobarà sola. Si no, torna-la a fer des de la valoració.</p>
      ${info.name && html`<p class="muted small">Nom del fitxer: <code>${info.name}</code></p>`}`
    : html`
      <p>Ara no s'ha pogut carregar ${what}${info && info.error ? `: ${info.error}` : '.'}</p>
      <p class="muted">Comprova la connexió i que has entrat amb el compte del centre, i torna-ho a provar.</p>`}
  </${Dialog}>`, { onDismiss: () => close() });
}

// Foto en gran: a la versió local, amb el visor de fitxers de la tauleta; si no, la imatge (sencera) de la carpeta.
function openPhoto(url, src, title, info, patient) {
  if (LocalFiles.is(url)) { LocalFiles.show(url); return; }
  const live = (info && info.url) || url;
  if (!src) {
    if (info && (info.missing || info.error)) { mediaProblem({ title, info, patient }); return; }
    if (isCloudFileUrl(url) && !info) { UI.toast('Encara s\'està carregant la foto…'); return; }
    window.open(live, '_blank', 'noopener');
    return;
  }
  let close = null;
  close = UI.open(() => html`<${Dialog} title=${title} wide=${true} onClose=${() => close()} footer=${html`
    <a class="btn btn-secondary" href=${live} target="_blank" rel="noopener"><${Icon} name="folder" size=${16} /><span>Obre a la carpeta</span></a>`}>
    <img class="localfile-img" src=${(info && info.play) || src} alt=${title} />
  </${Dialog}>`, { onDismiss: () => close() });
}

// Nom de cada foto o vídeo: «Test de Thomas · dreta» (o només el nom del test, si n'hi ha un).
const mediaTitle = (t, list, m) => (list.length > 1 ? `${t.name} · ${m.label.toLowerCase()}` : t.name);

// Les fotos i els vídeos per costat d'un test, a sota de la seva fila.
function TestMedia({ t, a, p, setVal }) {
  const x = (a.values || {})[t.id] || {};
  // En pujar una foto o un vídeo, es desa també el seu identificador a la carpeta (a.media), per trobar-lo sempre.
  const setMedia = (k) => (v, meta) => {
    if (!(meta && meta.id) && !(x[k] && MediaLinks.meta(a, x[k]))) { setVal(t.id, k, v); return; }
    Store.update('assessments', a.id, (y) => {
      const old = ((y.values || {})[t.id] || {})[k];
      y.values = y.values || {};
      y.values[t.id] = { ...(y.values[t.id] || {}), [k]: v };
      y.media = { ...(y.media || {}) };
      if (old && old !== v) delete y.media[old];
      if (v && meta && meta.id) y.media[v] = { id: meta.id, name: meta.name || '' };
    });
  };
  const found = (url, info) => MediaLinks.relink('assessments', a.id, url, info);
  return html`<div class="tmedia">
    ${(t.photos || []).map((m) => html`<${PhotoSlot} key=${m.k} url=${x[m.k]} meta=${MediaLinks.meta(a, x[m.k])} label=${`Foto ${m.label.toLowerCase()}`.replace(/^Foto foto$/, 'Foto')}
      title=${mediaTitle(t, t.photos, m)} patient=${p} date=${a.date} onChange=${setMedia(m.k)} onFound=${found} />`)}
    ${(t.videos || []).map((m) => html`<${VideoSlot} key=${m.k} url=${x[m.k]} meta=${MediaLinks.meta(a, x[m.k])} label=${`Vídeo ${m.label.toLowerCase()}`}
      title=${mediaTitle(t, t.videos, m)} patient=${p} date=${a.date} onChange=${setMedia(m.k)} onFound=${found} />`)}
  </div>`;
}

// Un vídeo d'un costat: es grava amb la càmera o es tria de la galeria i es desa sol; «Enllaç» per triar-ne un de la
// carpeta del client o enganxar-ne l'enllaç.
function VideoSlot({ url, meta, label, title, patient, date, onChange, onFound }) {
  const recRef = useRef(null);
  const galRef = useRef(null);
  const [up, setUp] = useState(null);
  const [, info] = usePhoto(url, patient, meta, onFound && ((i) => onFound(url, i)));
  const can = canUploadFiles() && !!patient && !!patient.id;
  const has = U.isUrl(url);
  const save = async (file) => {
    for (const r of [recRef, galRef]) if (r.current) r.current.value = '';
    if (!file) return;
    setUp(0);
    try {
      const res = await uploadToClient(patient, file, { label: title, date, where: 'assessVideos', onProgress: (pct) => setUp(pct) });
      if (!res.url) throw new Error('No s\'ha pogut desar el vídeo.');
      PhotoSrc.set(res.url, null, { id: res.id, name: res.name, url: res.url });
      onChange(res.url, { id: res.id, name: res.name });
      UI.toast(filesOnDevice() ? 'Vídeo desat a la tauleta.' : `Vídeo desat a la carpeta de ${patient.firstName || 'el pacient'}.`);
    } catch (e) {
      UI.toast(e.message, 'bad');
    }
    setUp(null);
  };
  const play = () => {
    if (LocalFiles.is(url)) { LocalFiles.show(url); return; }
    if (info && (info.missing || info.error)) { mediaProblem({ title, info, patient, what: 'el vídeo' }); return; }
    window.open((info && info.url) || url, '_blank', 'noopener');
  };
  return html`<div class=${U.cls('tphoto tvideo', has && 'has')}>
    <button type="button" class="tphoto-img" disabled=${!has} onClick=${play} aria-label=${has ? `Mira el vídeo: ${title}` : `Sense vídeo: ${title}`}>
      <${Icon} name=${has ? 'playfill' : 'video'} size=${22} />
    </button>
    <div class="tphoto-body">
      <span class="tphoto-label">${label}</span>
      ${has && info && info.missing && html`<${MediaMissing} what="el vídeo" title=${title} info=${info} patient=${patient} />`}
      ${up != null ? html`<span class="muted small"><span class="spinner"></span> ${filesOnDevice() ? 'Desant el vídeo…' : `Pujant el vídeo… ${Math.round(up * 100)} %`}</span>`
        : html`<div class="tphoto-actions">
            ${can && html`<input type="file" accept="video/*" capture="environment" hidden ref=${recRef} data-kind="record" onChange=${(e) => save(e.currentTarget.files[0])} />
              <input type="file" accept="video/*" hidden ref=${galRef} data-kind="gallery" onChange=${(e) => save(e.currentTarget.files[0])} />
              <${Btn} size="sm" variant=${has ? 'ghost' : 'primary'} icon="video" title=${has ? 'Torna a gravar el vídeo' : 'Grava el vídeo amb la càmera'}
                onClick=${() => recRef.current && recRef.current.click()}>${has ? '' : 'Grava'}</${Btn}>
              <${Btn} size="sm" variant="ghost" icon="upload" title="Tria un vídeo de la galeria" onClick=${() => galRef.current && galRef.current.click()}>${has ? '' : 'Tria\'n un'}</${Btn}>`}
            <${Btn} size="sm" variant="ghost" icon="link" title="Enllaç al vídeo (carpeta del pacient, YouTube…)"
              onClick=${() => openVideoDialog({ url, onChange, title, patient, date, where: 'assessVideos' })}>${can ? '' : 'Enllaç'}</${Btn}>
          </div>`}
    </div>
  </div>`;
}

// Avís a la valoració: la foto (o el vídeo) ja no es troba a la carpeta.
function MediaMissing({ what = 'la foto', title, info, patient }) {
  return html`<button type="button" class="tmedia-missing" onClick=${() => mediaProblem({ title, info, patient, what })}>
    <${Icon} name="alert" size=${14} /><span>No es troba a la carpeta · què puc fer?</span></button>`;
}

function PhotoSlot({ url, meta, label, title, patient, date, onChange, onFound }) {
  const camRef = useRef(null);
  const galRef = useRef(null);
  const [busy, setBusy] = useState(false);
  const [src, info] = usePhoto(url, patient, meta, onFound && ((i) => onFound(url, i)));
  const can = canUploadFiles() && !!patient && !!patient.id;
  const save = async (file) => {
    for (const r of [camRef, galRef]) if (r.current) r.current.value = '';
    if (!file) return;
    setBusy(true);
    try {
      const photo = await preparePhoto(file);
      const res = await uploadToClient(patient, photo, { label: title, date, where: 'assess' });
      if (!res.url) throw new Error('No s\'ha pogut desar la foto.');
      PhotoSrc.set(res.url, URL.createObjectURL(photo), { id: res.id, name: res.name, url: res.url });
      onChange(res.url, { id: res.id, name: res.name });
      UI.toast(filesOnDevice() ? 'Foto desada a la tauleta.' : `Foto desada a la carpeta de ${patient.firstName || 'el pacient'}.`);
    } catch (e) {
      UI.toast(e.message, 'bad');
    }
    setBusy(false);
  };
  const remove = async () => {
    if (await UI.confirm({ title: 'Treure la foto?', text: 'Es treu de la valoració. Si és a la carpeta del pacient, el fitxer s\'hi queda.', ok: 'Treu-la', danger: true })) onChange('');
  };
  return html`<div class=${U.cls('tphoto', url && 'has')}>
    <button type="button" class="tphoto-img" disabled=${!url} onClick=${() => openPhoto(url, src, title, info, patient)}
      aria-label=${url ? `Mira la foto: ${title}` : `Sense foto: ${title}`}>
      ${url && src ? html`<img src=${src} alt="" />` : html`<${Icon} name=${url && info && info.missing ? 'alert' : 'camera'} size=${22} />`}
    </button>
    <div class="tphoto-body">
      <span class="tphoto-label">${label}</span>
      ${url && info && info.missing && html`<${MediaMissing} title=${title} info=${info} patient=${patient} />`}
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
  const found = (url, info) => MediaLinks.relink('assessments', a.id, url, info);
  return html`<div class="rphotos">${list.map((x) => html`<${ReportPhoto} key=${x.url} url=${x.url} meta=${MediaLinks.meta(a, x.url)} title=${x.title} patient=${p} onFound=${found} />`)}</div>`;
}

// La persona sencera enquadrada en vertical (PhotoCrop, amb IA); si no es detecta, la foto sencera.
function ReportPhoto({ url, meta, title, patient, onFound }) {
  const [src, info] = usePhoto(url, patient, meta, onFound && ((i) => onFound(url, i)));
  const [box, setBox] = useState(() => PhotoCrop.known(url) || null);
  useEffect(() => {
    let alive = true;
    if (src && PhotoCrop.known(url) === undefined) PhotoCrop.crop(url, src).then((b) => { if (alive) setBox(b); });
    return () => { alive = false; };
  }, [src, url]);
  const pct = (v) => `${Math.round(v * 100000) / 1000}%`;
  const lost = !src && info && (info.missing || info.error);
  // Al PDF per al client no hi surt el requadre d'una foto que no es troba; a la pantalla, sí, amb l'avís.
  return html`<figure class=${U.cls('rphoto', box && 'rphoto-cropped', lost && 'rphoto-lost no-print')}>
    <button type="button" class="rphoto-img" onClick=${() => openPhoto(url, src, title, info, patient)} aria-label=${`Mira la foto: ${title}`}>
      ${lost ? html`<span class="rphoto-lost-msg"><${Icon} name="alert" size=${22} /><span>${info.missing ? 'No es troba a la carpeta' : 'No s\'ha pogut carregar'}</span></span>`
        : !src ? html`<${Icon} name="camera" size=${22} />`
        : box ? html`<span class="rphoto-frame"><img src=${src} alt=${title} data-crop="1"
            style=${`width:${pct(1 / box.w)};left:${pct(-box.x / box.w)};top:${pct(-box.y / box.h)}`} /></span>`
        : html`<img src=${src} alt=${title} />`}
    </button>
    <figcaption>${title}</figcaption>
  </figure>`;
}
