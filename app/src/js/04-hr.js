/* EON Life · freqüència cardíaca (FC) i variabilitat (HRV).
   · FC mitjana de la sessió, mesurada amb un strap Bluetooth (Polar H10…) o escrita a mà.
   · HRV de la nit prèvia (RMSSD en ms) i FC de repòs, del rellotge o anell del pacient (Oura, Whoop, HRV4Training…).
   Només càlculs, sense pantalla. */

const HRV_SOURCES = [
  { v: 'oura', label: 'Oura' },
  { v: 'whoop', label: 'Whoop' },
  { v: 'hrv4t', label: 'HRV4Training' },
  { v: 'polar', label: 'Polar' },
  { v: 'garmin', label: 'Garmin' },
  { v: 'apple', label: 'Apple Watch' },
  { v: 'altre', label: 'Altre' },
];

const HR = {
  sources: HRV_SOURCES,

  // Característica «Heart Rate Measurement» del Bluetooth (0x2A37): FC i, si n'hi ha, els intervals entre batecs (RR).
  // Bit 0 dels flags: la FC va en 16 bits; bit 3: hi ha energia gastada; bit 4: hi ha intervals RR (en 1/1024 s).
  parse(dv) {
    if (!dv || dv.byteLength < 2) return null;
    const flags = dv.getUint8(0);
    let i = 1, bpm;
    if (flags & 0x01) { bpm = dv.getUint16(i, true); i += 2; } else { bpm = dv.getUint8(i); i += 1; }
    if (flags & 0x08) i += 2;
    const rr = [];
    if (flags & 0x10) for (; i + 1 < dv.byteLength; i += 2) rr.push(Math.round((dv.getUint16(i, true) / 1024) * 1000));
    return { bpm, rr, contact: (flags & 0x04) ? !!(flags & 0x02) : null };
  },

  // Resum d'una sèrie de mostres [{t (ms), bpm}]: mitjana ponderada pel temps, màxim, mínim i durada.
  // Les lectures de 0 o fora de rang (el strap sense contacte) no compten; els salts de més de 5 s no s'allarguen.
  summarize(samples) {
    const ok = (samples || []).filter((x) => x && x.bpm >= 30 && x.bpm <= 230 && Number.isFinite(x.t)).sort((a, b) => a.t - b.t);
    if (!ok.length) return null;
    let sum = 0, span = 0;
    for (let i = 0; i < ok.length; i++) {
      const next = ok[i + 1];
      const dt = next ? Math.min(next.t - ok[i].t, 5000) : 1000;
      sum += ok[i].bpm * dt; span += dt;
    }
    const bpms = ok.map((x) => x.bpm);
    return {
      avg: Math.round(sum / span), max: Math.max(...bpms), min: Math.min(...bpms),
      minutes: Math.round(((ok[ok.length - 1].t - ok[0].t) / 60000) * 10) / 10, n: ok.length,
    };
  },

  // RMSSD (ms) d'una llista d'intervals RR (ms). Descarta els batecs erronis (fora de 300–2000 ms o que s'allunyen
  // més d'un 20 % de l'anterior) abans de calcular-lo.
  rmssd(rr) {
    const clean = [];
    for (const v of rr || []) {
      if (!(v >= 300 && v <= 2000)) continue;
      if (clean.length && Math.abs(v - clean[clean.length - 1]) > 0.2 * clean[clean.length - 1]) continue;
      clean.push(v);
    }
    if (clean.length < 10) return null;
    let s = 0;
    for (let i = 1; i < clean.length; i++) s += (clean[i] - clean[i - 1]) ** 2;
    return Math.round(Math.sqrt(s / (clean.length - 1)) * 10) / 10;
  },

  // Línia de base d'HRV d'un pacient: logaritme natural de l'RMSSD dels darrers 60 dies abans de la data, amb el rang
  // normal = mitjana ± 0,75 desviacions (com fa HRV4Training). Cal un mínim de 7 mesures.
  baseline(points, date) {
    const end = date || U.today();
    const from = U.addDays(end, -60);
    const ln = (points || []).filter((p) => p.date && p.date >= from && p.date < end && p.rmssd > 0).map((p) => Math.log(p.rmssd));
    if (ln.length < 7) return null;
    const mean = ln.reduce((a, b) => a + b, 0) / ln.length;
    const sd = Math.sqrt(ln.reduce((a, b) => a + (b - mean) ** 2, 0) / (ln.length - 1));
    return { n: ln.length, mean: Math.exp(mean), low: Math.exp(mean - 0.75 * sd), high: Math.exp(mean + 0.75 * sd) };
  },

  // Estat d'un valor respecte de la línia de base: 'low', 'high' o 'ok' (null si no hi ha base o valor).
  status(rmssd, base) {
    const v = U.num(rmssd);
    if (v == null || !base) return null;
    return v < base.low ? 'low' : v > base.high ? 'high' : 'ok';
  },

  // RMSSD de les sessions d'un pacient: [{date, rmssd}].
  points(sessions) {
    return (sessions || []).map((s) => ({ date: s.date, rmssd: U.num((s.wellness || {}).hrv) })).filter((p) => p.rmssd != null);
  },

  sourceLabel(v) { return (HRV_SOURCES.find((x) => x.v === v) || {}).label || ''; },
};
