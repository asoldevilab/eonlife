/* EON Life · Assault Bike: omplir les caselles amb una foto de la pantalla de l'aparell.
   Es fa una foto a la pantalla (o es tria de la galeria), es marquen els quatre cantons del vidre i l'app llegeix els números
   (LcdReader, 16-lcd.js). Res no surt de la tauleta per llegir-la. Els valors surten a unes caselles per comprovar-los i
   corregir-los abans d'aplicar-los a la valoració: mai es desa res sense que la persona ho hagi vist. */

// Foto → imatge en gris (Uint8Array) a una mida còmoda (costat llarg 2400 px com a màxim). L'<img> ja gira la foto segons l'EXIF.
async function bikePhotoGray(file, max = 2400) {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise((ok, ko) => { const i = new Image(); i.onload = () => ok(i); i.onerror = () => ko(new Error('img')); i.src = url; });
    const w0 = img.naturalWidth, h0 = img.naturalHeight;
    if (!w0 || !h0) throw new Error('img');
    const k = Math.min(1, max / Math.max(w0, h0));
    const w = Math.round(w0 * k), h = Math.round(h0 * k);
    const cv = document.createElement('canvas');
    cv.width = w; cv.height = h;
    const cx = cv.getContext('2d', { willReadFrequently: true });
    cx.drawImage(img, 0, 0, w, h);
    const px = cx.getImageData(0, 0, w, h).data;
    const gray = new Uint8Array(w * h);
    for (let i = 0, j = 0; i < gray.length; i++, j += 4) gray[i] = (px[j] * 299 + px[j + 1] * 587 + px[j + 2] * 114) / 1000;
    return { w, h, gray };
  } finally {
    URL.revokeObjectURL(url);
  }
}

// Cantons de partida: un rectangle vertical (la pantalla és alta i estreta) al mig de la foto. L'ordre és dalt-esq., dalt-dta.,
// baix-dta., baix-esq.
function bikeDefaultQuad(w, h) {
  const ratio = LcdReader.W / LcdReader.H;
  let qh = h * 0.6, qw = qh * ratio;
  if (qw > w * 0.7) { qw = w * 0.7; qh = qw / ratio; }
  const x0 = (w - qw) / 2, y0 = (h - qh) / 2;
  return [[x0, y0], [x0 + qw, y0], [x0 + qw, y0 + qh], [x0, y0 + qh]];
}

// Caselles de la pantalla → camps de la valoració (a.bike).
const BIKE_SCREEN = [
  { k: 'time', field: 'time', label: 'Temps', unit: 's', dec: 0 },
  { k: 'dist', field: 'dist', label: 'Distància', unit: '', dec: 2 },
  { k: 'cal', field: 'cal', label: 'Calories', unit: 'kcal', dec: 1 },
  { k: 'watts', field: 'mean', label: 'Watts mitjans', unit: 'W', dec: 0 },
  { k: 'speed', field: 'speed', label: 'Velocitat mitjana', unit: '', dec: 1 },
  { k: 'rpm', field: 'rpm', label: 'RPM mitjanes', unit: 'RPM', dec: 0 },
];
const bikeStr = (n) => (n == null ? '' : String(n).replace('.', ','));

function BikePhotoDialog({ file, a, unit: unit0, canSave, onApply, onClose }) {
  const [img, setImg] = useState(null);
  const [url, setUrl] = useState('');
  const [quad, setQuad] = useState(null);
  const [step, setStep] = useState('quad'); // quad → reading → result
  const [pct, setPct] = useState(0);
  const [res, setRes] = useState(null);
  const [vals, setVals] = useState({});
  const [unit, setUnit] = useState(unit0 === 'km' ? 'km' : 'mi');
  const [save, setSave] = useState(true);
  const [err, setErr] = useState('');
  const svgRef = useRef(null);
  const prevRef = useRef(null);
  const drag = useRef(null);

  useEffect(() => {
    let alive = true;
    const u = URL.createObjectURL(file);
    setUrl(u);
    bikePhotoGray(file).then((g) => {
      if (!alive) return;
      setImg(g);
      setQuad(bikeDefaultQuad(g.w, g.h));
    }).catch(() => { if (alive) setErr('No s\'ha pogut obrir la foto. Prova amb una altra.'); });
    return () => { alive = false; URL.revokeObjectURL(u); };
  }, [file]);

  // ── Arrossegar els cantons ──
  // El cantó no salta al dit: es manté la distància que hi havia en tocar-lo, així el dit no tapa on s'està posant.
  const pos = (e) => {
    const r = svgRef.current.getBoundingClientRect();
    return [((e.clientX - r.left) / r.width) * img.w, ((e.clientY - r.top) / r.height) * img.h];
  };
  const down = (i) => (e) => {
    e.preventDefault();
    const [x, y] = pos(e);
    drag.current = { i, dx: quad[i][0] - x, dy: quad[i][1] - y };
    try { svgRef.current.setPointerCapture(e.pointerId); } catch (x2) { /* res */ }
  };
  const move = (e) => {
    const d = drag.current;
    if (!d) return;
    const [x, y] = pos(e);
    const nx = Math.max(0, Math.min(img.w, x + d.dx)), ny = Math.max(0, Math.min(img.h, y + d.dy));
    setQuad((q) => q.map((p, j) => (j === d.i ? [nx, ny] : p)));
  };
  const up = () => { drag.current = null; };

  // ── Llegir ──
  const read = async () => {
    setStep('reading'); setPct(0); setErr('');
    try {
      const r = await LcdReader.readVoting(img.gray, img.w, img.h, quad, { onProgress: setPct });
      if (!r.trials) throw new Error('Els cantons no formen una pantalla. Torna a marcar-los.');
      setRes(r);
      const v = {};
      for (const s of BIKE_SCREEN) v[s.k] = r[s.k].value != null ? bikeStr(Number(r[s.k].value.toFixed(s.dec))) : '';
      setVals(v);
      setStep('result');
    } catch (e) {
      setErr(e.message || 'No s\'ha pogut llegir la pantalla.');
      setStep('quad');
    }
  };

  // La pantalla «dreçada» perquè es vegi què ha llegit l'app.
  useEffect(() => {
    if (step !== 'result' || !prevRef.current || !img) return;
    const flat = LcdReader.warp(img.gray, img.w, img.h, quad);
    if (!flat) return;
    const cv = prevRef.current;
    cv.width = LcdReader.W; cv.height = LcdReader.H;
    const cx = cv.getContext('2d');
    const data = cx.createImageData(LcdReader.W, LcdReader.H);
    for (let i = 0, j = 0; i < flat.length; i++, j += 4) { data.data[j] = data.data[j + 1] = data.data[j + 2] = flat[i]; data.data[j + 3] = 255; }
    cx.putImageData(data, 0, 0);
  }, [step, res]);

  const mapped = () => {
    const out = { unit };
    for (const s of BIKE_SCREEN) out[s.field] = vals[s.k] || '';
    return out;
  };
  const check = step === 'result' ? Calc.bikeAnalysis({ ...a, bike: { ...(a.bike || {}), ...mapped() } }, null) : null;
  const badge = (k) => {
    const r = res && res[k];
    if (!r || r.value == null) return html`<span class="lcd-badge lcd-bad">No s'ha llegit</span>`;
    return r.conf >= 0.7 ? html`<span class="lcd-badge lcd-ok">Llegit</span>` : html`<span class="lcd-badge lcd-warn">Revisa-ho</span>`;
  };
  const unitName = unit === 'km' ? 'km' : 'milles', speedUnit = unit === 'km' ? 'km/h' : 'mi/h';
  const corner = ['dalt a l\'esquerra', 'dalt a la dreta', 'baix a la dreta', 'baix a l\'esquerra'];
  const r0 = img ? Math.max(img.w, img.h) * 0.012 : 10;

  return html`<${Dialog} title="Llegeix la pantalla de l'Assault Bike" wide=${true} onClose=${onClose} footer=${html`
    ${step === 'result' && canSave && html`<label class="check"><input type="checkbox" checked=${save} onChange=${(e) => setSave(e.currentTarget.checked)} /> Desa la foto a la carpeta del pacient</label>`}
    <span class="grow"></span>
    <${Btn} variant="ghost" onClick=${onClose}>Cancel·la</${Btn}>
    ${step === 'quad' && html`<${Btn} variant="primary" icon="check" disabled=${!img} onClick=${read}>Llegeix la pantalla</${Btn}>`}
    ${step === 'result' && html`<${Btn} variant="primary" icon="check" onClick=${() => onApply({ ...mapped(), file: save && canSave ? file : null })}>Aplica a la valoració</${Btn}>`}`}>
    ${err && html`<p class="lcd-err" role="alert">${err}</p>`}
    ${step === 'quad' && html`<div>
      <p>Marca els <strong>quatre cantons de la pantalla</strong> de l'aparell (el vidre, no la caixa): ${corner.map((c, i) => html`<span class="lcd-n">${i + 1}</span> ${c}${i < 3 ? ', ' : '.'} `)}
        Arrossega els punts; no cal que siguin exactes.</p>
      ${!img && !err && html`<div class="kvi-busy" role="status"><span class="spinner"></span><span>Obrint la foto…</span></div>`}
      ${img && html`<div class="lcd-stage">
        <img src=${url} alt="Foto de la pantalla de l'Assault Bike" draggable="false" />
        <svg ref=${svgRef} class="lcd-quad" viewBox=${`0 0 ${img.w} ${img.h}`} preserveAspectRatio="none" onPointerMove=${move} onPointerUp=${up} onPointerCancel=${up}>
          <polygon points=${quad.map((p) => p.join(',')).join(' ')} class="lcd-poly" />
          ${quad.map((p, i) => html`<g key=${i} class="lcd-handle" onPointerDown=${down(i)} data-corner=${i}>
            <circle cx=${p[0]} cy=${p[1]} r=${r0 * 3} class="lcd-hit" />
            <circle cx=${p[0]} cy=${p[1]} r=${r0} class="lcd-dot" />
            <text x=${p[0]} y=${p[1] + r0 * 0.45} font-size=${r0 * 1.3} text-anchor="middle" class="lcd-num">${i + 1}</text>
          </g>`)}
        </svg>
      </div>`}
      <p class="muted small">Fes la foto de prop, amb la pantalla plena i el més de cara possible, quan l'aparell ensenya el resum de la prova (temps, distància, calories, watts, velocitat i RPM).</p>
    </div>`}
    ${step === 'reading' && html`<div class="kvi-busy" role="status"><span class="spinner"></span><span>Llegint la pantalla… ${Math.round(pct * 100)} %</span></div>`}
    ${step === 'result' && html`<div class="lcd-result">
      <div class="lcd-flat"><canvas ref=${prevRef} aria-label="Pantalla dreçada" /><span class="muted small">Pantalla dreçada</span></div>
      <div class="lcd-fields">
        <p class="muted small">Això és el que he llegit. <strong>Compara-ho amb la pantalla</strong> i corregeix el que calgui: no es desa res fins que premis «Aplica».</p>
        <div class="form-grid form-grid-4">${BIKE_SCREEN.map((s) => html`<${Field} label=${html`${s.label}${s.k === 'dist' ? ` (${unitName})` : s.k === 'speed' ? ` (${speedUnit})` : ''} ${badge(s.k)}`}>
          <${NumInput} value=${vals[s.k]} onValue=${(v) => setVals({ ...vals, [s.k]: v })} unit=${s.k === 'dist' || s.k === 'speed' ? '' : s.unit} ariaLabel=${s.label} />
        </${Field}>`)}</div>
        <div class="inline"><span class="field-label">Unitats de la pantalla</span>
          <${Seg} value=${unit} onValue=${setUnit} allowEmpty=${false} size="sm" ariaLabel="Unitats de la pantalla" options=${[{ v: 'mi', label: 'Milles' }, { v: 'km', label: 'Km' }]} />
          <span class="muted small">Si a sota de la distància hi diu MILES (i la velocitat M/HR), són milles.</span></div>
        ${check && check.warns.length > 0 && html`<ul class="analysis-warns">${check.warns.map((l) => html`<li><${Icon} name="alert" size=${14} /><span>${l}</span></li>`)}</ul>`}
        <p><button type="button" class="link" onClick=${() => { setStep('quad'); setErr(''); }}>Torna a marcar els cantons</button></p>
      </div>
    </div>`}
  </${Dialog}>`;
}
