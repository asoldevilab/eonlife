/* EON Life · «Llegeix el PDF» de Kinvent a la valoració.
   L'informe de Kinvent Physio són imatges: es llegeixen amb Tesseract (OCR) a la mateixa tauleta, sense enviar-les
   enlloc. El lector es descarrega la primera vegada (uns 6 MB) i després queda guardat al navegador. Abans d'omplir
   res, es mostren els valors trobats per revisar-los. */

const KinventOcr = {
  lib: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/tesseract.min.js',
  paths: {
    workerPath: 'https://cdn.jsdelivr.net/npm/tesseract.js@5.1.1/dist/worker.min.js',
    corePath: 'https://cdn.jsdelivr.net/npm/tesseract.js-core@5.1.1',
    langPath: 'https://cdn.jsdelivr.net/npm/@tesseract.js-data/spa/4.0.0_best_int',
  },
  loading: null,

  load() {
    if (window.Tesseract) return Promise.resolve(window.Tesseract);
    if (!this.loading) {
      this.loading = new Promise((ok, ko) => {
        const s = document.createElement('script');
        s.src = this.lib;
        s.async = true;
        s.onload = () => (window.Tesseract ? ok(window.Tesseract) : ko(new Error('net')));
        s.onerror = () => { this.loading = null; ko(new Error('net')); };
        document.head.appendChild(s);
      });
    }
    return this.loading;
  },

  canvas(w, h) {
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(w));
    c.height = Math.max(1, Math.round(h));
    const cx = c.getContext('2d', { willReadFrequently: true });
    cx.fillStyle = '#fff';
    cx.fillRect(0, 0, c.width, c.height);
    return { c, cx };
  },

  // Blanc i negre: el color (els números taronja i blaus) passa a negre i el fons, a blanc.
  binarize({ c, cx }, thr) {
    const im = cx.getImageData(0, 0, c.width, c.height);
    const d = im.data;
    for (let i = 0; i < d.length; i += 4) {
      const v = Math.min(d[i], d[i + 1], d[i + 2]) < thr ? 0 : 255;
      d[i] = v; d[i + 1] = v; d[i + 2] = v; d[i + 3] = 255;
    }
    cx.putImageData(im, 0, 0);
    return c;
  },

  // PDF (o foto de l'informe) → targetes amb els valors llegits i corregits.
  async read(file, onStep) {
    onStep('Carregant el lector de text…');
    const T = await this.load();
    const bytes = new Uint8Array(await file.arrayBuffer());
    const isPdf = bytes[0] === 0x25 && bytes[1] === 0x50 && bytes[2] === 0x44 && bytes[3] === 0x46;
    const images = isPdf ? KinventPdf.jpegs(bytes).map((b) => new Blob([b], { type: 'image/jpeg' })) : [file];
    if (!images.length) throw new Error('Aquest PDF no té el format de l\'informe de Kinvent.');
    onStep('Preparant el lector (la primera vegada es descarrega i pot trigar una mica)…');
    const page = await T.createWorker('spa', 1, this.paths);
    const num = await T.createWorker('spa', 1, this.paths);
    await num.setParameters({ tessedit_pageseg_mode: '7', tessedit_char_whitelist: '0123456789.,' });
    const found = [];
    try {
      for (let p = 0; p < images.length; p++) {
        onStep(`Llegint la pàgina ${p + 1} de ${images.length}…`);
        const bmp = await createImageBitmap(images[p]);
        if (bmp.width < 600) continue;
        // Només la part esquerra de la pàgina (els valors); la dreta són les gràfiques, amb números que confondrien.
        const sw = bmp.width * 0.6, k = 1400 / sw;
        const pg = this.canvas(1400, bmp.height * k);
        pg.cx.drawImage(bmp, 0, 0, sw, bmp.height, 0, 0, pg.c.width, pg.c.height);
        const { data } = await page.recognize(this.binarize(pg, 160), {}, { blocks: true });
        const lines = [];
        for (const b of data.blocks || []) for (const pa of b.paragraphs || []) for (const l of pa.lines || []) {
          lines.push({ text: l.text, bbox: l.bbox, words: (l.words || []).map((w) => ({ text: w.text, bbox: w.bbox })) });
        }
        for (const card of KinventPdf.cards(lines)) {
          const raw = {};
          for (const side of ['left', 'right']) {
            if (!card[side]) continue;
            const r = KinventPdf.valueBox(card[side]);
            const W = (r.x1 - r.x0) * 2, H = (r.y1 - r.y0) * 2;
            const v = this.canvas(W + 60, H + 60);
            v.cx.imageSmoothingQuality = 'high';
            v.cx.drawImage(bmp, r.x0 / k, r.y0 / k, (r.x1 - r.x0) / k, (r.y1 - r.y0) / k, 30, 30, W, H);
            raw[side] = String((await num.recognize(this.binarize(v, 200))).data.text || '').trim();
          }
          found.push({ ...card, page: p + 1, rawE: raw.left || '', rawD: raw.right || '' });
        }
        if (bmp.close) bmp.close();
      }
    } finally {
      await page.terminate();
      await num.terminate();
    }
    return found.map((c) => ({ ...c, ...KinventPdf.fixPair(c.rawE, c.rawD, c.asym, c.measure), target: KinventPdf.target(c.title, c.measure) }));
  },
};

// Proves de la valoració on pot anar cada mesura de Kinvent.
const kinventTargets = (measure) => Object.values(TEST_INDEX).filter((t) => t.group === (measure === 'force' ? 'dyn' : 'rom'));
const kvNum = (v, dec) => (v == null ? '' : String(dec ? Math.round(v * 10) / 10 : v).replace('.', ','));

function KinventReadButton({ a, p, upd }) {
  const ref = useRef(null);
  const pick = (file) => {
    if (ref.current) ref.current.value = '';
    if (!file) return;
    let close = null;
    close = UI.open(() => html`<${KinventImport} file=${file} a=${a} p=${p} upd=${upd} onClose=${() => close()} />`);
  };
  return html`<span class="attach">
    <input type="file" accept=".pdf,application/pdf,image/*" hidden ref=${ref} onChange=${(e) => pick(e.currentTarget.files[0])} aria-label="Informe de Kinvent per llegir" />
    <${Btn} variant="ghost" size="sm" icon="scan" title="Llegeix els valors de l'informe PDF de Kinvent i omple la valoració"
      onClick=${() => ref.current && ref.current.click()}>Llegeix el PDF</${Btn}>
  </span>`;
}

function KinventImport({ file, a, p, upd, onClose }) {
  const [step, setStep] = useState('Carregant el lector de text…');
  const [rows, setRows] = useState(null);
  const [err, setErr] = useState('');
  const [attach, setAttach] = useState(canUploadFiles());
  const [busy, setBusy] = useState(false);
  useEffect(() => {
    let alive = true;
    KinventOcr.read(file, (s) => alive && setStep(s)).then((list) => {
      if (!alive) return;
      setRows(list.map((c, i) => {
        const force = c.measure === 'force';
        return { id: i, title: c.title, measure: c.measure, page: c.page, target: c.target, on: !!c.target, ok: c.ok, fixed: c.fixed, asym: c.asym,
          kgE: force ? c.e : null, kgD: force ? c.d : null,
          e: kvNum(force ? KinventPdf.toN(c.e) : c.e, !force), d: kvNum(force ? KinventPdf.toN(c.d) : c.d, !force) };
      }));
    }).catch((e) => {
      if (alive) setErr(e.message === 'net' ? 'No s\'ha pogut carregar el lector de text. La primera vegada cal connexió a internet.' : `No s'ha pogut llegir l'informe: ${e.message}`);
    });
    return () => { alive = false; };
  }, []);
  const setRow = (id, k) => (v) => setRows(rows.map((r) => (r.id === id ? { ...r, [k]: v, ...(k === 'target' ? { on: !!v } : {}) } : r)));
  const chosen = (rows || []).filter((r) => r.on && r.target);

  const apply = async () => {
    setBusy(true);
    upd((x) => {
      x.values = x.values || {};
      for (const r of chosen) {
        const t = TEST_INDEX[r.target];
        const cur = { ...(x.values[r.target] || {}) };
        if (t.kind === 'single') {
          const best = Math.max(U.num(r.e) ?? 0, U.num(r.d) ?? 0);
          if (best) cur.v = kvNum(best, false);
          const side = r.kgE != null ? `E ${kvNum(r.kgE, true)} kg · D ${kvNum(r.kgD, true)} kg` : `E ${r.e} · D ${r.d}`;
          cur.note = [cur.note, `Kinvent: ${side}`].filter(Boolean).join(' · ');
        } else {
          if (r.e !== '') cur.e = r.e;
          if (r.d !== '') cur.d = r.d;
        }
        x.values[r.target] = cur;
      }
    });
    if (attach) {
      try {
        const label = 'Informe Kinvent';
        const res = await uploadToClient(p, file, { label, date: a.date, subfolder: M365_NAMES.reports });
        upd((x) => { x.files = [...(x.files || []), { id: U.uid('F'), date: U.today(), name: res.name, url: res.url, label }]; });
      } catch (e) {
        UI.toast(`Valors omplerts, però el PDF no s'ha pogut adjuntar: ${e.message}`, 'bad');
      }
    }
    UI.toast(`${U.plural(chosen.length, 'prova omplerta', 'proves omplertes')} amb l'informe de Kinvent.`);
    onClose();
  };

  const current = (id) => {
    const x = (a.values || {})[id];
    if (!x) return '';
    const t = TEST_INDEX[id];
    return t.kind === 'single' ? (x.v ? `ara ${x.v}` : '') : x.d || x.e ? `ara D ${x.d || '—'} · E ${x.e || '—'}` : '';
  };

  return html`<${Dialog} wide=${true} title="Valors de l'informe de Kinvent" onClose=${onClose} footer=${rows ? html`
    ${canUploadFiles() && html`<label class="check"><input type="checkbox" checked=${attach} onChange=${(e) => setAttach(e.currentTarget.checked)} /> Adjunta també el PDF a la valoració</label>`}
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    <${Btn} variant="primary" icon="check" disabled=${!chosen.length || busy} onClick=${apply}>Omple ${U.plural(chosen.length, 'prova', 'proves')}</${Btn}>`
    : html`<span class="grow"></span><${Btn} variant="ghost" onClick=${onClose}>${err ? 'Tanca' : 'Cancel·la'}</${Btn}>`}>
    ${err ? html`<p class="kvi-err">${err}</p>`
      : !rows ? html`<div class="kvi-busy" role="status"><span class="spinner"></span><span>${step}</span></div>`
      : !rows.length ? html`<p class="muted">No he trobat cap prova a l'informe. Comprova que sigui l'informe PDF de Kinvent Physio.</p>`
      : html`<p class="muted small">Revisa els valors abans d'omplir: la força es passa de kg a newtons. Els números es comproven amb l'asimetria de l'informe;
          si alguna cosa no quadra, surt «Revisa» i el pots corregir aquí.</p>
        <div class="kvi-rows">${rows.map((r) => {
          const t = r.target && TEST_INDEX[r.target];
          const unit = r.measure === 'force' ? 'N' : '°';
          return html`<div class=${U.cls('kvi-row', !r.on && 'off')}>
            <label class="kvi-on"><input type="checkbox" checked=${r.on} disabled=${!r.target} onChange=${(e) => setRow(r.id, 'on')(e.currentTarget.checked)} aria-label=${`Omple ${r.title}`} /></label>
            <div class="kvi-title"><strong>${r.title}</strong>
              <span class="muted small">${r.measure === 'force' ? 'Força màxima' : 'Angle màxim'} · pàg. ${r.page}${r.asym != null ? ` · asimetria ${kvNum(r.asym, true)} %` : ''}</span></div>
            <div class="kvi-target">
              <${Select} value=${r.target} onValue=${setRow(r.id, 'target')} ariaLabel=${`Camp per a ${r.title}`} placeholder="No l'omplis"
                options=${kinventTargets(r.measure).map((x) => ({ v: x.id, label: x.name }))} />
              ${r.target && current(r.target) && html`<span class="muted small">${current(r.target)} (es substitueix)</span>`}
            </div>
            <div class="kvi-vals">
              <label class="kvi-val"><span class="side-k" title="Esquerra">E</span><${NumInput} value=${r.e} onValue=${setRow(r.id, 'e')} unit=${unit} ariaLabel=${`${r.title} esquerra`} /></label>
              <label class="kvi-val"><span class="side-k" title="Dreta">D</span><${NumInput} value=${r.d} onValue=${setRow(r.id, 'd')} unit=${unit} ariaLabel=${`${r.title} dreta`} /></label>
              ${r.kgE != null && html`<span class="muted small kvi-kg">${kvNum(r.kgE, true)} kg · ${kvNum(r.kgD, true)} kg</span>`}
              ${t && t.kind === 'single' && html`<span class="muted small kvi-kg">${t.name}: s'hi posa el valor més alt i E i D, a la nota.</span>`}
            </div>
            <div class="kvi-state">${r.ok ? html`<${Pill} tone="ok" title="Els valors quadren amb l'asimetria de l'informe">${r.fixed ? 'Corregit' : 'Quadra'}</${Pill}>`
              : html`<${Pill} tone="warn" title="Els valors llegits no quadren amb l'asimetria: revisa'ls amb el PDF">Revisa</${Pill}>`}</div>
          </div>`;
        })}</div>`}
  </${Dialog}>`;
}
