/* EON Life · retall de les fotos de l'informe (Adams, Thomas, Windlass…): es detecta la persona sencera amb IA
   (MediaPipe, detector d'objectes EfficientDet-Lite0, a vendor/mediapipe i publicat al costat de l'app a ai/) i
   s'enquadra en vertical (3:4), amb una mica d'aire al voltant. Si no es detecta bé, o si la versió no té la IA
   (fitxer local, Google), la foto surt sencera. El resultat es recorda en aquest aparell per no repetir-ho. */

const PhotoCrop = (() => {
  const RATIO = 3 / 4;                         // amplada / alçada del marc de la foto a l'informe
  const base = () => (typeof window !== 'undefined' && window.EON_AI) || '';
  const abs = (p) => new URL(p, document.baseURI).href;
  let loading = null;

  const available = () => !!base() && typeof WebAssembly !== 'undefined' && typeof createImageBitmap === 'function';

  // El detector es carrega un sol cop (uns 14 MB la primera vegada; després, de la memòria cau del navegador).
  function detector() {
    if (!loading) {
      loading = (async () => {
        const mod = await import(abs(`${base()}vision_bundle.mjs`));
        const fileset = { wasmLoaderPath: abs(`${base()}vision_wasm_internal.js`), wasmBinaryPath: abs(`${base()}vision_wasm_internal.wasm`) };
        return mod.ObjectDetector.createFromOptions(fileset, {
          baseOptions: { modelAssetPath: abs(`${base()}efficientdet_lite0.tflite`) },
          runningMode: 'IMAGE', scoreThreshold: 0.3, maxResults: 5, categoryAllowlist: ['person'],
        });
      })();
    }
    return loading;
  }

  // Marc 3:4 al voltant de la persona més clara. boxes: [{ x, y, w, h, score }] en píxels; W × H: mida de la foto.
  // Torna { x, y, w, h } en fraccions de la foto (0–1), o null si cal ensenyar-la sencera.
  function frame(boxes, W, H, ratio = RATIO) {
    if (!W || !H) return null;
    const ok = (boxes || []).filter((b) => b && b.w > 0 && b.h > 0 && (b.score == null || b.score >= 0.3) && b.h >= H * 0.25);
    if (!ok.length) return null;
    const best = ok.reduce((a, b) => ((b.w * b.h * (b.score || 1)) > (a.w * a.h * (a.score || 1)) ? b : a));
    // aire: als costats i a dalt, i una mica menys a sota (els peus a prop de la vora queden bé)
    let cw = best.w * 1.24, ch = best.h * 1.12;
    const cx = best.x + best.w / 2, cy = best.y + best.h / 2 - best.h * 0.01;
    if (cw / ch < ratio) cw = ch * ratio; else ch = cw / ratio;
    if (cw > W) { cw = W; ch = Math.min(H, cw / ratio); }
    if (ch > H) { ch = H; cw = Math.min(W, ch * ratio); }
    const x = Math.min(Math.max(cx - cw / 2, 0), W - cw);
    const y = Math.min(Math.max(cy - ch / 2, 0), H - ch);
    // gairebé tota la foto: millor sencera
    if ((cw * ch) / (W * H) > 0.9) return null;
    const r = (v) => Math.round(v * 10000) / 10000;
    return { x: r(x / W), y: r(y / H), w: r(cw / W), h: r(ch / H) };
  }

  const KEY = 'eonlife:crop:';
  const mem = new Map();
  const remember = (url, v) => { mem.set(url, v); try { localStorage.setItem(KEY + url.slice(0, 300), JSON.stringify(v)); } catch (e) { /* sense espai */ } };
  function known(url) {
    if (mem.has(url)) return mem.get(url);
    try { const s = localStorage.getItem(KEY + url.slice(0, 300)); if (s != null) { const v = JSON.parse(s); mem.set(url, v); return v; } } catch (e) { /* res */ }
    return undefined;
  }

  // url: la de la foto a la valoració (clau per recordar-ho); src: l'adreça que es pot llegir ara (blob o descàrrega).
  async function crop(url, src) {
    const k = known(url);
    if (k !== undefined) return k;
    if (!available() || !src) return null;
    try {
      const blob = await (await fetch(src)).blob();
      const bmp = await createImageBitmap(blob);
      const det = await detector();
      const res = det.detect(bmp);
      const boxes = (res.detections || []).map((d) => ({ x: d.boundingBox.originX, y: d.boundingBox.originY, w: d.boundingBox.width, h: d.boundingBox.height,
        score: d.categories && d.categories[0] ? d.categories[0].score : 1 }));
      const out = frame(boxes, bmp.width, bmp.height);
      if (bmp.close) bmp.close();
      remember(url, out);
      return out;
    } catch (e) {
      return null; // sense IA (o sense connexió la primera vegada): foto sencera, i es tornarà a provar un altre dia
    }
  }

  return { available, crop, frame, known, remember, RATIO };
})();
