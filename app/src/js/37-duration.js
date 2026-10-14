/* EON Life · durada estimada de la sessió: un text amb el temps aproximat (treball + descansos) i un color segons si
   s'allunya de l'hora ideal. */

function fmtMinutes(m) {
  if (!(m >= 0)) return '';
  if (m < 90) return `${m} min`;
  const h = Math.floor(m / 60), r = m % 60;
  return `${h} h${r ? ` ${r} min` : ''}`;
}

// Franja de durada d'una sessió: etiqueta, color i detall del càlcul.
function SessionTime({ s, compact }) {
  const d = Calc.sessionDuration(s);
  const band = Calc.durationBand(d.minutes);
  if (!band) return compact ? null : html`<p class="stime stime-empty no-print">Durada estimada: afegeix exercicis i la calcularé.</p>`;
  const detail = `Treball ≈ ${Math.round(d.work / 60)} min · descansos ≈ ${Math.round(d.rest / 60)} min. Estimació a partir de les repeticions, els descansos i el canvi de material.`;
  if (compact) return html`<span class=${`stime-chip stime-${band.key}`} title=${`${band.label}. ${detail}`}>≈ ${fmtMinutes(d.minutes)}</span>`;
  const pct = Math.min(100, Math.round((d.minutes / 90) * 100));
  return html`<div class=${`stime stime-${band.key} no-print`} role="status" title=${detail}>
    <${Icon} name="clock" size=${17} />
    <span class="stime-text">Durada estimada <strong>≈ ${fmtMinutes(d.minutes)}</strong></span>
    <span class="stime-band">${band.label}${band.key === 'ideal' ? ' · cap a 1 h' : band.key === 'short' ? ` · falten ≈ ${60 - d.minutes} min per a 1 h` : ` · ≈ ${d.minutes - 60} min de més`}</span>
    <span class="stime-bar" aria-hidden="true"><span style=${`width:${pct}%`}></span><i></i></span>
  </div>`;
}
