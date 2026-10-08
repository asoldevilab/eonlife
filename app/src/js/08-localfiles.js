/* EON Life · fitxers desats a la tauleta (versió de prova, sense Microsoft 365).
   Sense Microsoft 365 no hi ha carpeta del pacient: el PDF de Kinvent, l'informe de la doctora i els vídeos que
   es graven o es trien es guarden al navegador d'aquell aparell (IndexedDB) i s'obren des de l'app.
   Al registre hi queda un enllaç «eonlocal:…». No arriben a cap altre aparell. */

const LocalFiles = (() => {
  const PREFIX = 'eonlocal:';
  const STORE = 'files';
  let dbp = null;
  const urls = {};
  const db = () => dbp || (dbp = new Promise((resolve, reject) => {
    const r = indexedDB.open('eonlife-fitxers', 1);
    r.onupgradeneeded = () => r.result.createObjectStore(STORE);
    r.onsuccess = () => resolve(r.result);
    r.onerror = () => { dbp = null; reject(r.error || new Error('No es poden desar fitxers en aquest navegador.')); };
  }));
  const run = async (mode, fn) => {
    const d = await db();
    return new Promise((resolve, reject) => {
      const t = d.transaction(STORE, mode);
      const req = fn(t.objectStore(STORE));
      t.oncomplete = () => resolve(req && req.result);
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error || new Error('No s\'ha pogut desar el fitxer.'));
    });
  };

  return {
    available() {
      try { return typeof indexedDB !== 'undefined' && !!indexedDB; } catch (e) { return false; }
    },
    is(url) { return String(url || '').startsWith(PREFIX); },

    // Número de sèrie dels noms dels fitxers desats a la tauleta (etiqueta_client_data_01, _02…).
    serial(stem) {
      const key = 'eonlife:serials';
      let map = {};
      try { map = JSON.parse(window.localStorage.getItem(key) || '{}') || {}; } catch (e) { map = {}; }
      map[stem] = (map[stem] || 0) + 1;
      try { window.localStorage.setItem(key, JSON.stringify(map)); } catch (e) { /* sense emmagatzematge */ }
      return map[stem];
    },

    async put(file, name) {
      const id = U.uid('F');
      try {
        await run('readwrite', (st) => st.put({ blob: file, name, type: file.type || '', size: file.size, date: new Date().toISOString() }, id));
      } catch (e) {
        if (e && /quota/i.test(`${e.name} ${e.message}`)) throw new Error('No hi ha prou espai a la tauleta per desar aquest fitxer.');
        throw new Error('Aquest navegador no deixa desar fitxers. Amb Microsoft 365 es desen a la carpeta del pacient.');
      }
      // Que el navegador no esborri els fitxers quan li falti espai (si ho permet).
      try { if (navigator.storage && navigator.storage.persist) navigator.storage.persist().catch(() => {}); } catch (e) { /* res */ }
      return { url: PREFIX + id, name };
    },

    async get(url) {
      if (!this.is(url)) return null;
      try { return (await run('readonly', (st) => st.get(String(url).slice(PREFIX.length)))) || null; } catch (e) { return null; }
    },

    async objectUrl(url) {
      if (urls[url]) return urls[url];
      const f = await this.get(url);
      if (!f) return null;
      urls[url] = URL.createObjectURL(f.blob);
      return urls[url];
    },

    // Obre el fitxer: vídeos i fotos dins de l'app; la resta (PDF…), amb el visor de la tauleta.
    async show(url) {
      const f = await this.get(url);
      if (!f) { UI.toast('Aquest fitxer només és a la tauleta on es va desar.', 'bad'); return; }
      const src = await this.objectUrl(url);
      const kind = /^video\//.test(f.type) ? 'video' : /^image\//.test(f.type) ? 'image' : 'file';
      const size = f.size >= 1048576 ? `${U.fmt(f.size / 1048576, 1)} MB` : `${Math.max(1, Math.round(f.size / 1024))} KB`;
      const title = kind === 'video' ? 'Vídeo' : kind === 'image' ? 'Foto' : 'Fitxer';
      let close = null;
      close = UI.open(() => html`<${Dialog} title=${title} wide=${kind !== 'file'} onClose=${() => close()} footer=${html`
        <a class="btn btn-secondary" href=${src} download=${f.name} onClick=${(e) => {
          if (!U.viewer) return; // al visor de claude.ai el fitxer s'ofereix a través seu
          e.preventDefault();
          U.saveFile(f.name, f.blob, f.type).then((st) => { if (st === 'failed') UI.toast('Aquest tipus de fitxer no es pot descarregar des d\'aquí.', 'bad'); });
        }}><${Icon} name="download" size=${16} /><span>Desa'l</span></a>
        ${kind === 'file' && html`<a class="btn btn-primary" href=${src} target="_blank" rel="noopener"><${Icon} name="note" size=${16} /><span>Obre</span></a>`}`}>
        ${kind === 'video' ? html`<div class="embed"><video src=${src} controls autoplay playsinline></video></div>`
          : kind === 'image' ? html`<img class="localfile-img" src=${src} alt=${f.name} />` : null}
        <p class="localfile-name"><strong>${f.name}</strong> <span class="muted">· ${size}</span></p>
        <p class="muted small">Desat només en aquesta tauleta (versió de prova). Amb Microsoft 365 es desa a la carpeta del pacient i el veu tot l'equip.</p>
      </${Dialog}>`, { onDismiss: () => close() });
    },
  };
})();

// Els enllaços «eonlocal:…» (a la llista de fitxers, als vídeos…) s'obren amb el visor de l'app.
if (typeof document !== 'undefined') {
  document.addEventListener('click', (e) => {
    const a = e.target && e.target.closest && e.target.closest('a[href^="eonlocal:"]');
    if (!a) return;
    e.preventDefault();
    LocalFiles.show(a.getAttribute('href'));
  }, true);
}
