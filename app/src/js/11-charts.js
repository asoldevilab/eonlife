/* EON Life · gràfics (SVG i HTML, sense llibreries externes).
   Línies de 2 px, marcadors de 8 px amb anella del color de fons, barres amb l'extrem arrodonit,
   reixeta fina i etiquetes amb els colors de text (mai el color de la sèrie). */

function useWidth(fallback = 600) {
  const ref = useRef(null);
  const [w, setW] = useState(fallback);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const measure = () => { const x = Math.round(el.getBoundingClientRect().width); if (x > 0) setW(x); };
    measure();
    if (typeof ResizeObserver === 'undefined') return undefined;
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, w];
}

function niceTicks(min, max, count = 4) {
  if (min === max) { const d = Math.abs(min) * 0.1 || 1; min -= d; max += d; }
  const span = max - min;
  const step0 = span / count;
  const mag = 10 ** Math.floor(Math.log10(step0));
  const norm = step0 / mag;
  const step = (norm >= 5 ? 10 : norm >= 2 ? 5 : norm >= 1 ? 2 : 1) * mag;
  const start = Math.floor(min / step) * step;
  const end = Math.ceil(max / step) * step;
  const ticks = [];
  for (let v = start; v <= end + step / 2; v += step) ticks.push(Math.round(v * 1e6) / 1e6);
  return { ticks, lo: start, hi: end, step };
}

function Legend({ items }) {
  return html`<div class="legend">${items.map((it) => html`<span class="legend-item"><span class=${U.cls('legend-swatch', it.line && 'legend-line')} style=${`background:${it.color}`}></span>${it.label}</span>`)}</div>`;
}

// Evolució en el temps (una o dues sèries: p. ex. dreta i esquerra).
function LineChart({ series, unit = '', height = 220, decimals = 1, ariaLabel }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  const clean = series.map((s) => ({ ...s, points: s.points.filter((p) => p.y != null && Number.isFinite(p.y) && U.parse(p.x)) }))
    .filter((s) => s.points.length);
  const all = clean.flatMap((s) => s.points);
  if (!all.length) return html`<div class="chart" ref=${ref}><div class="chart-empty">Encara no hi ha dades per dibuixar aquest gràfic.</div></div>`;

  const H = height;
  const padL = 44, padR = 64, padT = 14, padB = 30;
  const times = [...new Set(all.map((p) => p.x))].sort();
  let t0 = U.parse(times[0]).getTime(), t1 = U.parse(times[times.length - 1]).getTime();
  if (t0 === t1) { t0 -= 86400000 * 20; t1 += 86400000 * 20; }
  const ys = all.map((p) => p.y);
  const { ticks, lo, hi } = niceTicks(Math.min(...ys), Math.max(...ys));
  const iw = Math.max(40, W - padL - padR), ih = H - padT - padB;
  const sx = (x) => padL + ((U.parse(x).getTime() - t0) / (t1 - t0)) * iw;
  const sy = (y) => padT + ih - ((y - lo) / (hi - lo || 1)) * ih;

  // Etiquetes de l'eix X: com a màxim 6, sempre la primera i l'última.
  const maxLabels = Math.max(2, Math.floor(iw / 90));
  const every = Math.ceil(times.length / maxLabels);
  const xLabels = times.filter((_, i) => (times.length - 1 - i) % every === 0);

  // Etiquetes finals només si no es trepitgen.
  const ends = clean.map((s) => { const p = s.points[s.points.length - 1]; return { s, p, y: sy(p.y) }; });
  const endsOk = ends.length < 2 || Math.abs(ends[0].y - ends[1].y) > 16;

  const onMove = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - r.left;
    let best = null, bd = Infinity;
    for (const t of times) { const d = Math.abs(sx(t) - x); if (d < bd) { bd = d; best = t; } }
    setHover(best);
  };

  const fmtY = (v) => U.fmt(v, decimals);
  const hx = hover ? sx(hover) : 0;
  return html`<div class="chart" ref=${ref}>
    ${clean.length > 1 && html`<${Legend} items=${clean.map((s) => ({ label: s.name, color: s.color, line: true }))} />`}
    <svg width=${W} height=${H} role="img" aria-label=${ariaLabel || 'Gràfic d\'evolució'} class="chart-svg">
      ${ticks.map((t) => html`<g><line x1=${padL} x2=${padL + iw} y1=${sy(t)} y2=${sy(t)} class="grid" />
        <text x=${padL - 8} y=${sy(t) + 4} text-anchor="end" class="axis">${fmtY(t)}</text></g>`)}
      ${xLabels.map((t) => html`<text x=${sx(t)} y=${H - 8} text-anchor="middle" class="axis">${U.fmtDateShort(t)}${times.length > 1 && U.parse(times[0]).getFullYear() !== U.parse(times[times.length - 1]).getFullYear() ? ` ${t.slice(2, 4)}` : ''}</text>`)}
      ${hover && html`<line x1=${hx} x2=${hx} y1=${padT} y2=${padT + ih} class="crosshair" />`}
      ${clean.map((s) => html`<g>
        <path d=${s.points.map((p, i) => `${i ? 'L' : 'M'}${sx(p.x).toFixed(1)},${sy(p.y).toFixed(1)}`).join('')} fill="none" stroke=${s.color} stroke-width="2" stroke-linejoin="round" stroke-linecap="round" />
        ${s.points.map((p) => html`<circle cx=${sx(p.x)} cy=${sy(p.y)} r=${hover === p.x ? 5.5 : 4} fill=${s.color} stroke="var(--surface)" stroke-width="2" />`)}
      </g>`)}
      ${endsOk && ends.map((e) => html`<text x=${sx(e.p.x) + 9} y=${e.y + 4} class="endlabel">${fmtY(e.p.y)}${unit ? ` ${unit}` : ''}</text>`)}
      <rect x=${padL - 10} y=${padT} width=${iw + 20} height=${ih} fill="transparent" onPointerMove=${onMove} onPointerLeave=${() => setHover(null)} />
    </svg>
    ${hover && html`<div class="tip" style=${`left:${Math.min(Math.max(hx, 70), W - 70)}px;top:${padT}px`}>
      <div class="tip-title">${U.fmtDate(hover)}</div>
      ${clean.map((s) => { const p = s.points.find((q) => q.x === hover); return p ? html`<div class="tip-row"><span class="legend-swatch legend-line" style=${`background:${s.color}`}></span>${s.name}<strong>${fmtY(p.y)} ${unit}</strong></div>` : null; })}
    </div>`}
  </div>`;
}

// Càrrega setmanal (RPE × minuts) en columnes.
function WeekBars({ weeks, height = 190, currentWeek }) {
  const [ref, W] = useWidth();
  const [hover, setHover] = useState(null);
  if (!weeks.length) return html`<div class="chart" ref=${ref}></div>`;
  const H = height, padL = 44, padR = 12, padT = 18, padB = 30;
  const max = Math.max(...weeks.map((w) => w.load), 0);
  const { ticks, hi } = niceTicks(0, max || 100, 3);
  const iw = Math.max(40, W - padL - padR), ih = H - padT - padB;
  const band = iw / weeks.length;
  const bw = Math.min(24, band * 0.62);
  const sy = (v) => padT + ih - (v / (hi || 1)) * ih;
  const maxIdx = weeks.reduce((bi, w, i) => (w.load > weeks[bi].load ? i : bi), 0);
  const labelEvery = Math.ceil(weeks.length / Math.max(2, Math.floor(iw / 56)));
  const bar = (x, y, w, h) => {
    const r = Math.min(4, h, w / 2);
    return `M${x},${y + h}V${y + r}Q${x},${y} ${x + r},${y}H${x + w - r}Q${x + w},${y} ${x + w},${y + r}V${y + h}Z`;
  };
  return html`<div class="chart" ref=${ref}>
    <svg width=${W} height=${H} role="img" aria-label="Càrrega setmanal de les sessions" class="chart-svg">
      ${ticks.map((t) => html`<g><line x1=${padL} x2=${padL + iw} y1=${sy(t)} y2=${sy(t)} class=${t === 0 ? 'baseline' : 'grid'} />
        <text x=${padL - 8} y=${sy(t) + 4} text-anchor="end" class="axis">${U.fmt(t, 0)}</text></g>`)}
      ${weeks.map((w, i) => {
        const cx = padL + band * i + band / 2;
        const y = sy(w.load), h = padT + ih - y;
        const isCur = w.start === currentWeek;
        const showLabel = w.load > 0 && (i === maxIdx || isCur);
        return html`<g onPointerEnter=${() => setHover(i)} onPointerLeave=${() => setHover(null)}>
          <rect x=${padL + band * i} y=${padT} width=${band} height=${ih} fill="transparent" />
          ${h > 0.5 && html`<path d=${bar(cx - bw / 2, y, bw, h)} class=${U.cls('bar', isCur && 'bar-current', hover === i && 'bar-hover')} />`}
          ${showLabel && html`<text x=${cx} y=${y - 6} text-anchor="middle" class="barlabel">${U.fmt(w.load, 0)}</text>`}
          ${(weeks.length - 1 - i) % labelEvery === 0 && html`<text x=${cx} y=${H - 9} text-anchor="middle" class="axis">${U.fmtDateShort(w.start)}</text>`}
        </g>`;
      })}
    </svg>
    ${hover != null && html`<div class="tip" style=${`left:${Math.min(Math.max(padL + band * hover + band / 2, 80), W - 80)}px;top:4px`}>
      <div class="tip-title">Setmana del ${U.fmtDate(weeks[hover].start)}</div>
      <div class="tip-row">Càrrega<strong>${U.fmt(weeks[hover].load, 0)} UA</strong></div>
      <div class="tip-row">Sessions fetes<strong>${weeks[hover].done}</strong></div>
      ${weeks[hover].rpe != null && html`<div class="tip-row">RPE mitjà<strong>${U.fmt(weeks[hover].rpe, 1)}</strong></div>`}
    </div>`}
  </div>`;
}

// Comparació dreta / esquerra per test (barres horitzontals amb valors directes).
function BiBars({ rows, unit, showAsym = true, decimals = 0 }) {
  const valid = rows.filter((r) => r.d != null || r.e != null);
  if (!valid.length) return html`<div class="chart-empty">Sense dades.</div>`;
  const max = Math.max(...valid.flatMap((r) => [r.d || 0, r.e || 0])) || 1;
  const pct = (v) => `${Math.max(0, (v / max) * 100)}%`;
  return html`<div class="bibars">
    <${Legend} items=${[{ label: 'Dreta', color: 'var(--side-d)' }, { label: 'Esquerra', color: 'var(--side-e)' }]} />
    ${valid.map((r) => {
      const as = r.diffOnly ? null : Calc.asym(r.d, r.e);
      const tone = as ? Calc.asymTone(as.pct) : '';
      return html`<div class="bibar">
        <div class="bibar-label">${r.label}${r.sub && html`<span class="bibar-sub">${r.sub}</span>`}</div>
        <div class="bibar-bars">
          ${['d', 'e'].map((s) => html`<div class="bibar-row" title=${`${s === 'd' ? 'Dreta' : 'Esquerra'}: ${U.fmt(r[s], decimals)} ${r.unit || unit}`}>
            <span class="bibar-side">${s.toUpperCase()}</span>
            <span class="bibar-track">${r[s] != null && html`<span class=${`bibar-fill bibar-${s}`} style=${`width:${pct(r[s])}`}></span>`}</span>
            <span class="bibar-val">${r[s] != null ? `${U.fmt(r[s], decimals)} ${r.unit || unit}` : '—'}</span>
          </div>`)}
        </div>
        ${showAsym && html`<div class="bibar-asym">${as ? html`<${Pill} tone=${tone}>${U.fmt(as.pct, 0)} %</${Pill}>` : r.diffOnly && r.d != null && r.e != null ? html`<${Pill} tone="neutral">${U.fmtSigned(r.d - r.e, 1)} ${r.unit || unit}</${Pill}>` : ''}</div>`}
      </div>`;
    })}
  </div>`;
}

// Fila de puntuacions dels 7 patrons.
function PatternStrip({ a }) {
  return html`<div class="pstrip">${PATTERNS.map((pt) => {
    const p = (a.patterns || {})[pt.id];
    const s = Calc.patternScore(p, pt.uni);
    return html`<div class="pstrip-item" title=${pt.name}>
      <${ScoreDot} v=${s} pain=${p && p.pain} size="sm" />
      <span class="pstrip-name">${pt.short || pt.name}</span>
    </div>`;
  })}</div>`;
}
