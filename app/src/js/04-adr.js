/* EON Life · lector de les dades de l'ADR (ADR Encoder i ADR Jumping).
   L'app de l'ADR exporta els entrenaments a CSV (o a Excel). Aquí es llegeix el fitxer, es detecten les columnes pel nom
   (català, castellà o anglès), es separen les files per persona, exercici i dia, i es converteixen en:
     · punts càrrega-velocitat (perfil de la valoració),
     · sèries (càrrega, repeticions, velocitat de la 1a i de l'última rep, pèrdua de velocitat, potència) per a les sessions,
     · intents de salt (ADR Jumping).
   Si les columnes no es reconeixen bé, la persona les assigna a mà (mapatge) i l'app se'n recorda. */

// Camps que es busquen a la capçalera, per ordre (els més específics primer: «nom de l'exercici» és de l'exercici, no de la persona).
// match: trossos del nom de la columna (sense accents ni majúscules); re: expressió sobre el nom net (sense unitats entre parèntesis).
const ADR_COLUMNS = [
  { key: 'exercise', label: 'Exercici', match: ['ejercicio', 'exercise', 'exercici', 'movimiento', 'movement'] },
  { key: 'athlete', label: 'Persona', re: /^(nom|nombre|name|atleta|athlete|usuari|usuario|user|cliente|client|jugador|deportista|paciente|pacient)$/, match: ['atleta', 'athlete', 'nombre', 'name', 'usuario', 'user', 'cliente', 'jugador', 'deportista', 'paciente', 'pacient'],
    exclude: /ejercicio|exercise|exercici|workout|entrenamiento|entrenament|test|prueba|serie|set\b/ },
  { key: 'date', label: 'Data', re: /^(hora|dia|day)$/, match: ['fecha', 'date', 'data', 'timestamp'], exclude: /vuelo|flight/ },
  { key: 'set', label: 'Sèrie', re: /^(n[º°o.]? ?)?(serie|set|series)( ?(n[º°o.]?|num|number|#))?$/ },
  { key: 'rep', label: 'Repetició (número)', re: /^(n[º°o.]? ?)?(rep|repeticion|repeticio|repetition)( ?(n[º°o.]?|num|number|#))?$/ },
  { key: 'reps', label: 'Repeticions (total)', re: /^(reps|repeticiones|repeticions|repetitions|total reps|n[º°o.]? ?reps)$/ },
  { key: 'load', label: 'Càrrega (kg)', match: ['carga', 'peso', 'load', 'weight', 'masa', 'kg'], exclude: /corporal|body|bw|1rm|%|\/kg/ },
  { key: 'mv', label: 'Velocitat mitjana (m/s)', match: ['velocidad media', 'vel media', 'vel. media', 'velocitat mitjana', 'mean velocity', 'average velocity', 'avg velocity', 'mean vel', 'velocity mean', 'media velocidad', 'velocidad promedio'], re: /^(mv|vm|mcv)$/, exclude: /propuls|peak|pico|pic|max/ },
  { key: 'mpv', label: 'Velocitat mitjana propulsiva (m/s)', match: ['propuls', 'mpv'] },
  { key: 'pv', label: 'Velocitat de pic (m/s)', match: ['peak vel', 'velocidad pico', 'velocidad maxima', 'velocidad max', 'vel max', 'vel pico', 'peak velocity', 'max velocity', 'maximum velocity', 'velocitat maxima', 'velocitat pic', 'velocitat de pic'], re: /^(pv|vmax|vpeak)$/ },
  { key: 'velocity', label: 'Velocitat (m/s)', match: ['velocidad', 'velocity', 'velocitat', 'm/s'], exclude: /propuls|peak|pico|pic|max|loss|perdida|perdua|fatig/ },
  { key: 'vl', label: 'Pèrdua de velocitat (%)', match: ['perdida de velocidad', 'perdida velocidad', 'velocity loss', 'velocity drop', 'perdua', 'vel loss', 'fatiga', 'fatigue'], re: /^vl$/ },
  { key: 'ppeak', label: 'Potència màxima (W)', match: ['potencia pico', 'potencia max', 'peak power', 'max power', 'maximum power', 'pico de potencia', 'power peak', 'potencia de pico'] },
  { key: 'power', label: 'Potència (W)', match: ['potencia', 'power', 'watt'] },
  { key: 'rom', label: 'Recorregut (ROM)', re: /^rom$/, match: ['rango', 'recorrido', 'range of motion', 'recorregut'] },
  { key: 'height', label: 'Altura del salt (cm)', match: ['altura', 'height'], exclude: /tipo|type|nombre/ },
  { key: 'flight', label: 'Temps de vol (ms)', match: ['tiempo de vuelo', 'tiempo vuelo', 'flight time', 'flight', 'vuelo', 'temps de vol'] },
  { key: 'contact', label: 'Temps de contacte (ms)', match: ['tiempo de contacto', 'tiempo contacto', 'contact time', 'contacto', 'contact', 'gct', 'temps de contacte'] },
  { key: 'rsi', label: 'RSI', re: /^rsi([ -]?mod)?$/, match: ['indice de fuerza reactiva', 'reactive strength'] },
  { key: 'jtype', label: 'Tipus de salt', match: ['tipo de salto', 'tipo', 'type', 'salto', 'jump type', 'prueba', 'test'] },
];

// Exercicis que l'app coneix per al perfil càrrega-velocitat (vegeu LVP_PRESETS).
const ADR_PRESET_RE = [
  ['squat', /squat|sentadilla|esquat|cuclill/],
  ['bench', /bench|banca|press (de )?pecho|press pit|chest press/],
  ['deadlift', /dead ?lift|peso muerto|pes mort|\brdl\b|rumano/],
  ['hipthrust', /hip ?thrust|empuje de cadera|puente de gl|pont de gl/],
];

const ADR = {
  // Número d'una cel·la: accepta coma o punt decimal, milers amb punt, «0,85 m/s» i buit («---»).
  num(raw) {
    let s = String(raw == null ? '' : raw).trim().replace(/−/g, '-');
    if (!s || /^[-–—]+$/.test(s) || s.includes('∞')) return null;
    s = s.replace(/\s*(m\/s|cm\/s|kg|w|cm|ms|%|n)$/i, '').trim();
    if (/^-?\d{1,3}(\.\d{3})+(,\d+)?$/.test(s)) s = s.replace(/\./g, '');
    s = s.replace(',', '.');
    if (!/^-?\d*\.?\d+$/.test(s)) return null;
    const n = Number(s);
    return Number.isFinite(n) ? n : null;
  },
  round(n, d = 2) { return Math.round(n * 10 ** d) / 10 ** d; },
  str(n, d = 2) { return n == null ? '' : String(ADR.round(n, d)).replace('.', ','); },

  // Capçalera → { camp: índex de columna } (cada columna només serveix per a un camp).
  mapHeader(headers) {
    const norm = headers.map((x) => U.norm(x));
    const clean = norm.map((x) => x.replace(/[([].*?[)\]]/g, ' ').replace(/\s+/g, ' ').trim());
    const used = new Set();
    const map = {};
    for (const col of ADR_COLUMNS) {
      let found = -1;
      const ok = (i) => !used.has(i) && !(col.exclude && col.exclude.test(norm[i]));
      if (col.re) found = clean.findIndex((hd, i) => ok(i) && col.re.test(hd));
      if (found < 0 && col.match) for (const m of col.match) { found = norm.findIndex((hd, i) => ok(i) && hd.includes(m)); if (found >= 0) break; }
      if (found >= 0) { map[col.key] = found; used.add(found); }
    }
    // «Velocitat» sense més detall = la mitjana.
    if (map.mv == null && map.velocity != null) { map.mv = map.velocity; delete map.velocity; }
    return map;
  },
  // Una fila és la capçalera si hi ha una columna de velocitat (o de salt) i almenys una altra de coneguda.
  isHeader(map) {
    const vel = ['mv', 'mpv', 'pv', 'height', 'flight'].some((k) => map[k] != null);
    return vel && Object.keys(map).length >= 2;
  },

  // Fila → registre. kind: 'encoder' (hi ha velocitat) o 'jump' (hi ha altura o temps de vol).
  record(r, map, scale) {
    const cell = (k) => (map[k] != null ? r[map[k]] : '');
    const n = (k) => (map[k] != null ? ADR.num(r[map[k]]) : null);
    const f = (k) => (n(k) == null ? null : n(k) * (scale[k] || 1));
    const rec = {
      athlete: String(cell('athlete') || '').trim(), exercise: String(cell('exercise') || '').trim(), whenRaw: String(cell('date') || '').trim(),
      set: String(cell('set') || '').trim(), rep: n('rep'), reps: n('reps'), load: n('load'), mv: f('mv'), mpv: f('mpv'), pv: f('pv'), vl: n('vl'),
      power: n('power'), ppeak: n('ppeak'), rom: n('rom'), height: f('height'), flight: f('flight'), contact: f('contact'), rsi: n('rsi'),
      jtype: String(cell('jtype') || '').trim(),
    };
    const w = ADR.when(rec.whenRaw);
    rec.date = w.date; rec.time = w.time;
    rec.kind = rec.mv != null || rec.mpv != null || rec.pv != null ? 'encoder' : rec.height != null || rec.flight != null ? 'jump' : '';
    return rec;
  },
  // Data de la cel·la: text («6.10.2026 14:12») o número de sèrie d'Excel (46300,5).
  when(raw) {
    const s = String(raw || '').trim();
    if (/^\d{5}(\.\d+|,\d+)?$/.test(s)) {
      const serial = Number(s.replace(',', '.'));
      const d = new Date(Date.UTC(1899, 11, 30) + Math.round(serial * 86400000));
      const z = (x) => String(x).padStart(2, '0');
      return { date: `${d.getUTCFullYear()}-${z(d.getUTCMonth() + 1)}-${z(d.getUTCDate())}`, time: serial % 1 ? `${z(d.getUTCHours())}:${z(d.getUTCMinutes())}` : '' };
    }
    return myJumpWhen(s);
  },
  presetOf(name) {
    const x = U.norm(name);
    const hit = ADR_PRESET_RE.find(([, re]) => re.test(x));
    return hit ? hit[0] : 'other';
  },

  // Files (llista de llistes de text) → persones, exercicis, dies i registres. override: { camp: índex } per corregir el mapatge.
  parseRows(rows, patient, override) {
    if (!rows || rows.length < 2) return { error: 'El fitxer no té files de dades.', records: [], map: {}, headers: [], people: [], exercises: [], dates: [], match: null };
    let hi = -1, map = {};
    for (let i = 0; i < Math.min(rows.length, 40); i++) { const m = ADR.mapHeader(rows[i]); if (ADR.isHeader(m)) { hi = i; map = m; break; } }
    if (hi < 0) {
      // Sense capçalera reconeguda: la primera fila amb text i, a sota, números. Es mostra per assignar les columnes a mà.
      hi = Math.max(0, rows.findIndex((r, i) => i + 1 < rows.length && r.some((c) => c && ADR.num(c) == null) && rows[i + 1].some((c) => ADR.num(c) != null)));
      map = ADR.mapHeader(rows[hi]);
    }
    const headers = rows[hi];
    if (override) for (const [k, v] of Object.entries(override)) { if (v === '' || v == null || v < 0) delete map[k]; else map[k] = Number(v); }
    // Unitats: velocitats en cm/s (o altures en m, temps en s) es converteixen.
    const scale = {};
    const hn = headers.map((x) => U.norm(x));
    for (const k of ['mv', 'mpv', 'pv']) if (map[k] != null && /cm\/s|cm s/.test(hn[map[k]])) scale[k] = 0.01;
    const body = rows.slice(hi + 1);
    // Files de resum («Mitjana», «Total»…) a la primera columna o a la de sèrie o repetició: no són repeticions.
    const summary = /^(media|mitjana|average|avg|mean|total|promedio|resumen|resum|summary|max|min|desv|sd)\b/;
    const isSummary = (r) => [r[0], map.set != null ? r[map.set] : '', map.rep != null ? r[map.rep] : ''].some((c) => summary.test(U.norm(c)));
    let recs = body.filter((r) => !isSummary(r)).map((r) => ADR.record(r, map, scale));
    recs = recs.filter((x) => x.kind);
    if (!recs.length) return { error: 'No trobo cap fila amb velocitat (o salt) al fitxer. Assigna les columnes a mà.', records: [], map, headers, hi, people: [], exercises: [], dates: [], match: null };
    // Salts: l'altura en metres (0,35) → cm; el temps de vol en segons (0,52) → ms.
    const jumps = recs.filter((x) => x.kind === 'jump');
    if (jumps.length && Math.max(...jumps.map((x) => x.height || 0)) <= 1.5 && jumps.some((x) => x.height)) for (const x of jumps) if (x.height != null) x.height *= 100;
    if (jumps.length && Math.max(...jumps.map((x) => x.flight || 0)) <= 3 && jumps.some((x) => x.flight)) for (const x of jumps) if (x.flight != null) x.flight *= 1000;
    if (jumps.length && Math.max(...jumps.map((x) => x.contact || 0)) <= 3 && jumps.some((x) => x.contact)) for (const x of jumps) if (x.contact != null) x.contact *= 1000;
    const hasName = map.athlete != null && recs.some((x) => x.athlete);
    const count = (key) => { const m = new Map(); for (const x of recs) m.set(x[key], (m.get(x[key]) || 0) + 1); return m; };
    const people = hasName ? [...count('athlete').entries()].filter(([n]) => n).map(([name, n]) => ({ name, n, score: patient ? matchPersonName(name, patient) : 0 })).sort((p, q) => q.score - p.score || q.n - p.n) : [];
    const names = people.filter((p) => p.score >= 0.7).map((p) => p.name);
    const exercises = [...count('exercise').entries()].map(([name, n]) => ({ name, n, preset: ADR.presetOf(name) }));
    const dates = [...count('date').entries()].map(([date, n]) => ({ date, n })).sort((p, q) => (p.date < q.date ? 1 : -1));
    const vars = ['mv', 'mpv', 'pv'].filter((k) => recs.some((x) => x[k] != null));
    return { error: null, headers, hi, map, records: recs, hasName, people, match: patient && hasName ? { names } : null, exercises, dates, vars,
      hasEncoder: recs.some((x) => x.kind === 'encoder'), hasJumps: jumps.length > 0 };
  },
  parseText(text, patient, override) { return ADR.parseRows(ADR.csvRows(text), patient, override); },

  // ── Perfil càrrega-velocitat ──
  // mode «fast»: la repetició més ràpida de cada càrrega (com recomana l'ADR); «all»: totes les repeticions.
  points(recs, { variable = 'mv', mode = 'fast' } = {}) {
    const ok = recs.filter((x) => x.kind === 'encoder' && x.load != null && x.load > 0 && x[variable] != null && x[variable] > 0);
    let pts = ok;
    if (mode === 'fast') {
      const by = new Map();
      for (const x of ok) { const b = by.get(x.load); if (!b || x[variable] > b[variable]) by.set(x.load, x); }
      pts = [...by.values()];
    }
    return pts.sort((a, b) => a.load - b.load || b[variable] - a[variable])
      .map((x) => ({ load: x.load, v: x[variable], pv: variable !== 'pv' && x.pv != null ? x.pv : null, power: x.power != null ? x.power : null, date: x.date, src: ['ADR', x.date, x.time, x.set, x.rep, x.load, x[variable]].join('|') }));
  },

  // ── Sessions: sèries d'un exercici ──
  // Una sèrie nova quan canvia el número de sèrie, la càrrega, o torna a començar el número de repetició.
  sets(recs, { variable = 'mv' } = {}) {
    const enc = recs.filter((x) => x.kind === 'encoder' && x[variable] != null);
    const out = [];
    let cur = null, last = null;
    for (const x of enc) {
      const fresh = !cur || x.set !== last.set || x.load !== last.load || x.exercise !== last.exercise || x.date !== last.date || (x.rep != null && last.rep != null && x.rep <= last.rep);
      if (fresh) { cur = { exercise: x.exercise, date: x.date, set: x.set, load: x.load, reps: [], power: [], vl: null }; out.push(cur); }
      cur.reps.push(x[variable]);
      if (x.power != null || x.ppeak != null) cur.power.push(x.ppeak != null ? x.ppeak : x.power);
      if (x.vl != null) cur.vl = x.vl;
      last = x;
    }
    return out.map((s) => {
      const v1 = s.reps[0], vlast = s.reps[s.reps.length - 1];
      const vl = s.vl != null ? s.vl : s.reps.length > 1 && v1 ? ((v1 - vlast) / v1) * 100 : null;
      return { exercise: s.exercise, date: s.date, kg: s.load, reps: s.reps.length, v1, vlast: s.reps.length > 1 ? vlast : null, vl, pmax: s.power.length ? Math.max(...s.power) : null, best: Math.max(...s.reps) };
    });
  },
  // Sèrie → la fila del registre per sèries de la sessió (text, amb coma decimal).
  setRow(s) {
    return { kg: s.kg != null ? ADR.str(s.kg, 1) : '', reps: String(s.reps), v1: ADR.str(s.v1, 2), vlast: ADR.str(s.vlast, 2), vl: s.vl != null && s.reps > 1 ? ADR.str(s.vl, 0) : '', pmax: s.pmax != null ? ADR.str(s.pmax, 0) : '' };
  },

  // ── Sessions: salts d'un exercici en sèries (ADR Jumping): repeticions, millor altura, mitjana, RSI i contacte ──
  jumpSets(recs) {
    const jr = recs.filter((x) => x.kind === 'jump' && x.height != null);
    const groups = [];
    for (const x of jr) {
      let g = groups[groups.length - 1];
      if (!g || g.set !== x.set || g.exercise !== x.exercise || g.date !== x.date) { g = { set: x.set, exercise: x.exercise, date: x.date, list: [] }; groups.push(g); }
      g.list.push(x);
    }
    const mean = (a) => (a.length ? a.reduce((s, v) => s + v, 0) / a.length : null);
    return groups.map((g) => {
      const h = g.list.map((x) => x.height), tc = g.list.map((x) => x.contact).filter((v) => v != null), rsi = g.list.map((x) => x.rsi).filter((v) => v != null);
      return { exercise: g.exercise, date: g.date, set: g.set, reps: g.list.length, h: Math.max(...h), hmean: mean(h), rsi: rsi.length ? Math.max(...rsi) : null, tc: tc.length ? mean(tc) : null };
    });
  },
  jumpSetRow(s) { return { reps: String(s.reps), h: ADR.str(s.h, 1), hmean: s.reps > 1 ? ADR.str(s.hmean, 1) : '', rsi: ADR.str(s.rsi, 2), tc: s.tc != null ? ADR.str(s.tc, 0) : '' }; },

  // ── Valoració: intents de salt (com els de My Jump) ──
  jumps(recs) {
    return recs.filter((x) => x.kind === 'jump' && x.height != null).map((x) => ({
      id: U.uid('J'), type: normalizeJumpType(x.jtype || x.exercise), height: ADR.str(x.height, 1), flight: x.flight != null ? ADR.str(x.flight, 0) : '', contact: x.contact != null ? ADR.str(x.contact, 0) : '',
      rsi: x.rsi != null ? ADR.str(x.rsi, 2) : '', power: x.power != null ? ADR.str(x.power, 0) : '', velocity: '', force: '', rsimod: '',
      when: x.date ? `${x.date}${x.time ? `T${x.time}` : ''}` : '', note: 'Importat de l\'ADR Jumping',
      src: ['ADR', x.date, x.time, x.height, x.flight].join('|'), athlete: x.athlete,
    }));
  },

  // Mapatge corregit a mà: es recorda per a les pròximes importacions amb la mateixa capçalera.
  sig(headers) { return `eon.adrmap.${(headers || []).map((h) => U.norm(h)).join('|').slice(0, 160)}`; },
  remember(headers, override) { try { window.localStorage.setItem(ADR.sig(headers), JSON.stringify(override)); } catch (e) { /* sense desar */ } },
  recall(headers) { try { return JSON.parse(window.localStorage.getItem(ADR.sig(headers)) || 'null'); } catch (e) { return null; } },

  // Fitxer → files. CSV o text (separador i codificació automàtics) o Excel (.xlsx, primer full).
  async rowsOf(file) {
    const buf = new Uint8Array(await file.arrayBuffer());
    if (buf[0] === 0x50 && buf[1] === 0x4b) return ADR.xlsxRows(buf);
    let text = new TextDecoder('utf-8').decode(buf);
    if (text.includes(String.fromCharCode(0xfffd))) text = new TextDecoder('windows-1252').decode(buf);
    return ADR.csvRows(text);
  },
  // El separador que deixa les files amb el mateix nombre de columnes (una línia de títol amb comes no l'enganya).
  csvRows(text) {
    let best = null;
    for (const sep of [';', '\t', ',']) {
      const rows = U.parseCsv(text, sep);
      const sizes = new Map();
      for (const r of rows) sizes.set(r.length, (sizes.get(r.length) || 0) + 1);
      const [size, n] = [...sizes.entries()].sort((a, b) => b[1] - a[1] || b[0] - a[0])[0] || [0, 0];
      const score = size >= 2 ? n * size : 0;
      if (!best || score > best.score) best = { rows, score };
    }
    return best.rows;
  },
  // Lector mínim d'.xlsx: descomprimeix el ZIP i llegeix el primer full amb les cadenes compartides.
  async xlsxRows(buf) {
    const dv = new DataView(buf.buffer, buf.byteOffset, buf.byteLength);
    let end = buf.length - 22;
    while (end >= 0 && dv.getUint32(end, true) !== 0x06054b50) end--;
    if (end < 0) throw new Error('Fitxer d\'Excel no vàlid.');
    const count = dv.getUint16(end + 10, true);
    let p = dv.getUint32(end + 16, true);
    const files = {};
    for (let i = 0; i < count; i++) {
      const method = dv.getUint16(p + 10, true), csize = dv.getUint32(p + 20, true);
      const nl = dv.getUint16(p + 28, true), el = dv.getUint16(p + 30, true), cl = dv.getUint16(p + 32, true), off = dv.getUint32(p + 42, true);
      const name = new TextDecoder().decode(buf.subarray(p + 46, p + 46 + nl));
      const ln = dv.getUint16(off + 26, true), le = dv.getUint16(off + 28, true);
      files[name] = { method, raw: buf.subarray(off + 30 + ln + le, off + 30 + ln + le + csize) };
      p += 46 + nl + el + cl;
    }
    const read = async (name) => {
      const f = files[name];
      if (!f) return '';
      if (f.method === 0) return new TextDecoder().decode(f.raw);
      const stream = new Blob([f.raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
      return new TextDecoder().decode(await new Response(stream).arrayBuffer());
    };
    const unesc = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, '\'').replace(/&amp;/g, '&');
    const strings = [...(await read('xl/sharedStrings.xml')).matchAll(/<si>([\s\S]*?)<\/si>/g)].map((m) => unesc([...m[1].matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)].map((t) => t[1]).join('')));
    const sheetName = Object.keys(files).filter((n) => /^xl\/worksheets\/sheet\d+\.xml$/.test(n)).sort((a, b) => Number(a.match(/\d+/)) - Number(b.match(/\d+/)))[0];
    if (!sheetName) throw new Error('L\'Excel no té cap full.');
    const xml = await read(sheetName);
    const col = (ref) => ref.replace(/\d+/g, '').split('').reduce((x, ch) => x * 26 + ch.charCodeAt(0) - 64, 0) - 1;
    const rows = [];
    for (const rm of xml.matchAll(/<row[^>]*>([\s\S]*?)<\/row>/g)) {
      const row = [];
      for (const c of rm[1].matchAll(/<c r="([A-Z]+)\d+"([^>]*?)(?:\/>|>([\s\S]*?)<\/c>)/g)) {
        const t = (c[2].match(/ t="([^"]+)"/) || [])[1], inner = c[3] || '';
        const v = (inner.match(/<v>([\s\S]*?)<\/v>/) || [])[1];
        let val = '';
        if (t === 's' && v !== undefined) val = strings[Number(v)] || '';
        else if (t === 'inlineStr') val = unesc((inner.match(/<t[^>]*>([\s\S]*?)<\/t>/) || ['', ''])[1]);
        else if (v !== undefined) val = unesc(v);
        row[col(c[1])] = val;
      }
      for (let i = 0; i < row.length; i++) if (row[i] === undefined) row[i] = '';
      if (row.some((x) => String(x).trim() !== '')) rows.push(row);
    }
    return rows;
  },
};
