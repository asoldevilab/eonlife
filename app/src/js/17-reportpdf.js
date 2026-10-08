/* EON Life · PDF de l'informe fet a la mateixa app, sense el diàleg d'imprimir (per desar-lo sol a la carpeta del client).
   L'informe de la pantalla es copia en un contenidor fora de la vista amb l'amplada d'un A4 i les regles d'impressió de
   styles.css (els blocs @media print, aplicats sota .pdf-mode); es parteix en pàgines sense tallar files, targetes, fotos
   ni títols; cada pàgina es converteix en una imatge (html-to-image, a vendor/) i les imatges fan el PDF (08-pdf.js). */

const ReportPdf = (() => {
  // A4 a 96 px per polzada (210 × 297 mm) i els marges de 12 mm de l'@page de styles.css.
  const PAGE = { w: 794, h: 1123, m: 45 };
  const CONTENT_W = PAGE.w - 2 * PAGE.m;
  const FOOT = 22;                                     // espai del peu de pàgina, dins del marge inferior
  const CONTENT_H = PAGE.h - 2 * PAGE.m - FOOT;

  // Les regles de @media print de la pàgina, però per a .pdf-mode (PrintScope, a 08-pdf.js).
  function printCss() {
    const out = [];
    const walk = (rules, inPrint) => {
      for (const r of rules) {
        if (r.type === 4 /* @media */) {
          const m = r.media ? r.media.mediaText : r.conditionText;
          const isPrint = /\bprint\b/.test(m) && !/\bscreen\b/.test(m);
          if (isPrint || inPrint) walk(r.cssRules, true);
        } else if (inPrint && r.type === 1 /* regla */) {
          out.push(`${PrintScope.scope(r.selectorText)} { ${r.style.cssText} }`);
        }
      }
    };
    for (const sheet of document.styleSheets) {
      let rules;
      try { rules = sheet.cssRules; } catch (e) { continue; } // fulls d'un altre domini (les fonts)
      if (rules) walk(rules, false);
    }
    return out.join('\n');
  }

  // Les fotos de la carpeta del client es baixen abans (si no, la imatge quedaria buida al PDF).
  async function localImages(root) {
    const urls = [];
    await Promise.all([...root.querySelectorAll('img')].map(async (img) => {
      const src = img.getAttribute('src') || '';
      if (!/^https?:/i.test(src)) return;
      try {
        const res = await fetch(src, { mode: 'cors', credentials: 'omit' });
        if (!res.ok) throw new Error(String(res.status));
        const u = URL.createObjectURL(await res.blob());
        urls.push(u);
        img.setAttribute('src', u);
      } catch (e) { img.removeAttribute('src'); img.setAttribute('data-pdf-missing', '1'); }
    }));
    await Promise.all([...root.querySelectorAll('img')].map((img) => (img.complete ? null : new Promise((ok) => { img.onload = ok; img.onerror = ok; }))));
    return urls;
  }

  // On es pot tallar: mai pel mig d'una fila, una targeta, una foto, un paràgraf o just després d'un títol.
  const ATOMIC = 'tr, img, svg, figure, canvas, li, h1, h2, h3, h4, p, dt, dd, .stat, .bibar, .alert, .jump-card, .rcols > div, .rtiles > *, .report-facts > div, .rphoto, .pill, .rscore';
  const HEADING = 'h2, h3, h4, .h3, .rsec-title, .eyebrow, .rlegend, .legend';
  function breaks(root) {
    const top0 = root.getBoundingClientRect().top;
    const spans = [];
    let total = 0;                                                   // on acaba el contingut (sense marges ni vores buides al final)
    for (const el of root.querySelectorAll('*')) {
      const r = el.getBoundingClientRect();
      if (!r.height) continue;
      const a = r.top - top0, b = r.bottom - top0;
      if (!el.children.length || el.matches('img, svg, tr, .stat, .alert')) total = Math.max(total, Math.ceil(b));
      if (b - a > CONTENT_H * 0.9) continue;                         // més alt que una pàgina: s'ha de poder tallar per dins
      const cs = getComputedStyle(el);
      if (el.matches(ATOMIC) || !el.children.length || cs.breakInside === 'avoid') spans.push([a, b]);
      if (el.matches(HEADING) || cs.breakAfter === 'avoid') {
        const next = el.nextElementSibling;
        if (next) { const nr = next.getBoundingClientRect(); spans.push([a, Math.min(nr.bottom, nr.top + 70) - top0]); }
      }
    }
    const out = [0];
    let start = 0;
    while (start + CONTENT_H < total) {
      let y = start + CONTENT_H;
      for (let moved = true; moved;) {
        moved = false;
        for (const [a, b] of spans) if (a > start + 1 && a < y - 0.5 && b > y + 0.5) { y = a; moved = true; }
      }
      if (y - start < CONTENT_H * 0.3) y = start + CONTENT_H;          // cap lloc bo: es talla igualment
      y = Math.floor(y);
      out.push(y);
      start = y;
    }
    if (total - start > 4 || out.length === 1) out.push(total); else out[out.length - 1] = total;
    return out;
  }

  // Les fonts de l'app (Google Fonts) dins del PDF: només els jocs llatins, baixats un cop i guardats per a la propera vegada.
  // Sense connexió, el PDF es fa igualment amb les fonts del sistema.
  let fontCache = null;
  const dataUrl = (blob) => new Promise((ok, ko) => { const r = new FileReader(); r.onload = () => ok(r.result); r.onerror = ko; r.readAsDataURL(blob); });
  async function fontCss() {
    if (fontCache != null) return fontCache;
    const link = [...document.querySelectorAll('link[rel="stylesheet"]')].find((l) => /fonts\.googleapis\.com/.test(l.href));
    if (!link) return (fontCache = '');
    try {
      const css = await (await fetch(link.href)).text();
      const out = [];
      for (const m of css.matchAll(/\/\*\s*([\w-]+)\s*\*\/\s*(@font-face\s*\{[^}]*\})/g)) {
        if (m[1] !== 'latin' && m[1] !== 'latin-ext') continue;
        const u = (m[2].match(/url\(\s*['"]?([^'")]+)['"]?\s*\)/) || [])[1];
        if (!u) continue;
        const res = await fetch(u);
        if (!res.ok) throw new Error(String(res.status));
        out.push(m[2].replace(/url\([^)]*\)/, `url(${await dataUrl(await res.blob())})`));
      }
      fontCache = out.join('\n');
      return fontCache;
    } catch (e) { return ''; }
  }

  const toBytes = (canvas, quality) => new Promise((ok, ko) => canvas.toBlob((b) => (b ? b.arrayBuffer().then((x) => ok(new Uint8Array(x)), ko) : ko(new Error('No s\'ha pogut fer la imatge de la pàgina.'))), 'image/jpeg', quality));

  // source: l'element de l'informe a la pantalla. Retorna els bytes del PDF.
  async function render(source, { title = '', author = '', footer = '', scale = 2, quality = 0.9, onProgress } = {}) {
    if (typeof htmlToImage === 'undefined') throw new Error('Aquesta versió no pot fer el PDF.');
    // Informe en mode fosc (fons granat): les pàgines senceres, marges inclosos, del mateix color.
    const theme = source.classList.contains('report-dark') ? 'report-dark' : 'report-light';
    const pageBg = theme === 'report-dark' ? '#421215' : '#FFFFFF';
    const style = document.createElement('style');
    style.textContent = `${printCss()}
      /* l'escenari no es veu (1 px i retallat), però el que hi ha a dins es dibuixa a la mida real; html-to-image en fa la
         imatge (una pàgina posada fora de la pantalla amb left negatiu sortiria en blanc) */
      .pdf-stage { position: fixed; left: 0; top: 0; width: 1px; height: 1px; overflow: hidden; pointer-events: none; z-index: -1; }
      .pdf-host, .pdf-page { position: relative; background: ${pageBg}; color: var(--ink); font-family: var(--font-ui); }
      .pdf-host { width: ${CONTENT_W}px; }
      .pdf-page { width: ${PAGE.w}px; height: ${PAGE.h}px; padding: ${PAGE.m}px; box-sizing: border-box; overflow: hidden; }
      .pdf-view { position: relative; width: ${CONTENT_W}px; overflow: hidden; }
      .pdf-foot { position: absolute; left: ${PAGE.m}px; right: ${PAGE.m}px; bottom: ${PAGE.m - 6}px; display: flex; justify-content: space-between; gap: 12px;
        font-size: 7.5pt; color: var(--ink-3); border-top: 1px solid var(--line); padding-top: 5px; }
      /* (els colors del mode de l'informe són a l'article; el peu de pàgina, fora, els porta aquí) */
      .pdf-page.report-dark .pdf-foot { color: #C9ABA5; border-top-color: #6A3539; }
      /* el marge de cada pàgina el fa .pdf-page (en imprimir el fa l'informe mateix) */
      .pdf-mode .report, .pdf-mode .sheet { padding: 0 !important; }
      /* el peu de l'informe ja hi és a cada pàgina */
      .pdf-mode .report > .sheet-foot { display: none; }
      /* sempre la disposició de tauleta, encara que es faci des d'un mòbil */
      .pdf-mode .bibar { grid-template-columns: minmax(150px, 1fr) minmax(0, 2.3fr) 70px; }
      .pdf-mode .bibar-bars { grid-column: auto; grid-row: auto; }`;
    document.head.appendChild(style);
    const stage = document.createElement('div');
    stage.className = 'pdf-stage';
    stage.setAttribute('aria-hidden', 'true');
    const host = document.createElement('div');
    host.className = 'pdf-mode pdf-host';
    const doc = source.cloneNode(true);
    host.appendChild(doc);
    stage.appendChild(host);
    document.body.appendChild(stage);
    let urls = [];
    try {
      // Fora el que no surt al paper (vídeos, botons, apartats amagats per imprimir): menys feina i res que no es pugui dibuixar.
      for (const el of [...doc.querySelectorAll('video, iframe, audio')]) el.remove();
      for (const el of [...doc.querySelectorAll('*')]) if (el.isConnected && getComputedStyle(el).display === 'none') el.remove();
      urls = await localImages(doc);
      if (document.fonts && document.fonts.ready) await document.fonts.ready;
      const cuts = breaks(doc);
      const n = cuts.length - 1;
      const opts = { pixelRatio: scale, backgroundColor: pageBg, width: PAGE.w, height: PAGE.h, cacheBust: false,
        imagePlaceholder: 'data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7' };
      opts.fontEmbedCSS = await fontCss(); // (així html-to-image no va a llegir els fulls d'estil d'un altre domini)
      const pages = [];
      for (let i = 0; i < n; i++) {
        if (onProgress) onProgress(i / n);
        const page = document.createElement('div');
        page.className = `pdf-mode pdf-page ${theme}`;
        const view = document.createElement('div');
        view.className = 'pdf-view';
        view.style.height = `${cuts[i + 1] - cuts[i]}px`;
        const part = doc.cloneNode(true);
        part.style.transform = `translateY(${-cuts[i]}px)`;
        view.appendChild(part);
        page.appendChild(view);
        const foot = document.createElement('div');
        foot.className = 'pdf-foot';
        const left = document.createElement('span');
        left.textContent = footer;
        const right = document.createElement('span');
        right.textContent = `Pàgina ${i + 1} de ${n}`;
        foot.append(left, right);
        page.appendChild(foot);
        stage.appendChild(page);
        try {
          let canvas;
          try { canvas = await htmlToImage.toCanvas(page, opts); } catch (e) {
            throw new Error(e && e.message ? e.message : `no s'ha pogut dibuixar la pàgina ${i + 1}`);
          }
          pages.push({ jpeg: await toBytes(canvas, quality), w: canvas.width, h: canvas.height });
        } finally { page.remove(); }
      }
      if (onProgress) onProgress(1);
      return PdfWriter.build(pages, { title, author });
    } finally {
      stage.remove();
      style.remove();
      for (const u of urls) URL.revokeObjectURL(u);
    }
  }

  return { render, printCss, breaks, PAGE };
})();
