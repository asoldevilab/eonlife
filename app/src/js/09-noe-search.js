/* EON Life · NOE: cerca difusa d'exercicis de la biblioteca.
   La gent escriu els exercicis com els diu («sentadilla goblet», «plancha», «remo con goma», «puente de glúteos»); la biblioteca
   els té en català i, de vegades, en anglès («Goblet squat», «Planxa frontal», «Pont de glutis»). Aquí es normalitzen les
   paraules (sense accents, en singular, amb sinònims de castellà i anglès), es puntuen les coincidències amb el nom i, una mica
   menys, amb la categoria, la família, els músculs i el material, i es diu si la coincidència és clara o dubtosa. */

const NoeSearch = (() => {
  // Paraula canònica ← variants (castellà, anglès, formes alternatives). S'aplica als dos costats: a la cerca i a la biblioteca.
  const GROUPS = {
    squat: ['sentadilla', 'sentadillas', 'esquat', 'esquats', 'cuclillas', 'squats'],
    planxa: ['plancha', 'planchas', 'plank', 'planks', 'planxes'],
    pont: ['puente', 'puentes', 'bridge', 'bridges', 'ponts'],
    glutis: ['gluteo', 'gluteos', 'glute', 'glutes', 'gluti', 'gluteal'],
    rem: ['remo', 'remada', 'remadas', 'remades', 'row', 'rows', 'rowing', 'remos'],
    estocada: ['zancada', 'zancadas', 'lunge', 'lunges', 'afondament', 'afondaments', 'estocades'],
    flexio: ['flexion', 'flexiones', 'flexions', 'pushup', 'pushups', 'push up', 'push ups', 'lagartija', 'lagartijas'],
    dominada: ['dominadas', 'dominades', 'pullup', 'pullups', 'pull up', 'pull ups', 'chinup', 'chinups', 'chin up', 'chin ups', 'barra fija'],
    pes: ['peso', 'pesos'],
    mort: ['muerto', 'deadlift', 'deadlifts'],
    rdl: ['rumano', 'romanian', 'rumana', 'rumanes'],
    mancuerna: ['mancuernas', 'mancuernes', 'dumbbell', 'dumbbells', 'pesa', 'pesas', 'halteres', 'haltera'],
    goma: ['gomas', 'banda', 'bandas', 'band', 'bands', 'elastico', 'elasticos', 'elastica', 'elastiques', 'elastic', 'liga', 'ligas', 'tubing', 'miniband', 'loop'],
    banca: ['bench'],
    pit: ['pecho', 'pectoral', 'chest'],
    espatlla: ['hombro', 'hombros', 'shoulder', 'shoulders', 'espatlles', 'deltoides'],
    genoll: ['rodilla', 'rodillas', 'knee', 'knees', 'genolls'],
    maluc: ['cadera', 'caderas', 'hip', 'hips', 'malucs'],
    turmell: ['tobillo', 'tobillos', 'ankle', 'ankles', 'turmells'],
    cama: ['pierna', 'piernas', 'leg', 'legs', 'cames'],
    brac: ['brazo', 'brazos', 'arm', 'arms', 'bracos'],
    esquena: ['espalda', 'back'],
    pantorrilla: ['gemelo', 'gemelos', 'bessons', 'calf', 'calves', 'soleo', 'soli'],
    talo: ['talon', 'talones', 'heel', 'heels', 'talons'],
    salt: ['salto', 'saltos', 'jump', 'jumps', 'salts', 'saltar'],
    abdominal: ['abdominales', 'abdominals', 'abs', 'crunch', 'crunches'],
    militar: ['overhead', 'ohp'],
    unipodal: ['unilateral', 'unilaterals', 'unipodales', 'unipodals', 'single', 'monopodal'],
    kettlebell: ['kb', 'kettlebells', 'pesa rusa', 'rusa'],
    politja: ['polea', 'poleas', 'cable', 'cables', 'politges'],
    corporal: ['corporales', 'bodyweight', 'peso corporal'],
    estirat: ['tumbado', 'tumbada', 'acostado', 'supino', 'supine', 'estirada', 'lying'],
    assegut: ['sentado', 'sentada', 'seated', 'sitting', 'assegut'],
    dempeus: ['de pie', 'standing', 'de peu'],
    tracio: ['traccion', 'pull', 'tirar'],
    empenta: ['empuje', 'push'],
    isometric: ['isometrico', 'isometrica', 'isometrics', 'isometricos', 'isometric'],
    excentric: ['excentrico', 'eccentric', 'excentrica'],
    cinta: ['treadmill', 'cinta de correr'],
    bicicleta: ['bike', 'bici', 'cicle', 'ciclisme'],
    escalfament: ['calentamiento', 'warmup', 'warm up', 'warm-up'],
    estirament: ['estiramiento', 'stretch', 'stretching', 'estiraments', 'estiramientos'],
    mobilitat: ['movilidad', 'mobility'],
    equilibri: ['equilibrio', 'balance'],
    abduccio: ['abduccion', 'abduction', 'abduccions'],
    adduccio: ['aduccion', 'adduction', 'adductors', 'aductores'],
    rotacio: ['rotacion', 'rotation', 'rotacions'],
    elevacio: ['elevacion', 'elevation', 'raise', 'raises', 'elevacions', 'elevaciones'],
    extensio: ['extension', 'extensions', 'extensiones'],
    curl: ['curls', 'flexion de codo', 'curl'],
    femoral: ['isquios', 'isquiotibials', 'isquiotibiales', 'hamstring', 'hamstrings', 'isquiosurals'],
    quadriceps: ['cuadriceps', 'quads', 'quad', 'quadricep'],
    biceps: ['bicep'],
    triceps: ['tricep'],
    tronc: ['core', 'tronco', 'lumbar'],
    cos: ['body'],
    caixa: ['cajon', 'box', 'step'],
    barra: ['barbell', 'bar'],
    hexagonal: ['trap bar', 'hexbar', 'hex'],
    carregues: ['carry', 'carries', 'acarreo', 'maletin', 'farmer', 'farmers', 'cargues'],
    enrere: ['atras', 'detras', 'hacia atras', 'backward', 'backwards', 'reverse', 'inversa', 'invers'],
    endavant: ['adelante', 'delante', 'hacia adelante', 'forward', 'forwards', 'frontal'],
    suau: ['suave', 'soft', 'light', 'lleuger', 'ligero'],
    lliscadors: ['sliders', 'deslizadores', 'flowin', 'slider'],
  };
  const SYN = {};
  for (const [canon, variants] of Object.entries(GROUPS)) { SYN[canon] = canon; for (const v of variants) SYN[v.replace(/\s+/g, ' ')] = canon; }
  // Paraules de farciment: no compten (preposicions, articles, «amb», «de»…).
  const STOP = new Set(['amb', 'de', 'del', 'dels', 'la', 'el', 'les', 'els', 'l', 'a', 'al', 'als', 'en', 'i', 'per', 'sobre', 'con', 'sin', 'sense', 'los', 'las', 'y', 'un', 'una', 'uns', 'unes', 'the', 'with', 'and', 'on', 'of', 'd', 'o', 'u', 'se', 'que', 'del', 'para', 'tipus', 'tipo', 'exercici', 'ejercicio', 'exercise', 'hacia', 'hasta', 'des', 'desde', 'cap', 'to']);

  const rawTokens = (text) => U.norm(String(text || '')).replace(/[^a-z0-9ñç]+/g, ' ').trim().split(/\s+/).filter(Boolean);
  // Paraula → forma canònica: sinònim directe, o amb el plural tret.
  function canon(w) {
    if (SYN[w]) return SYN[w];
    if (w.length > 3 && w.endsWith('s') && SYN[w.slice(0, -1)]) return SYN[w.slice(0, -1)];
    if (w.length > 4 && w.endsWith('es') && SYN[w.slice(0, -2)]) return SYN[w.slice(0, -2)];
    return w.length > 3 && w.endsWith('s') ? w.slice(0, -1) : w;
  }
  // Text → paraules canòniques (amb les frases de sinònims de dues paraules, com «peso muerto» → pes mort).
  function tokens(text) {
    // Dites que són un exercici concret («peso muerto rumano» és el RDL).
    const clean = U.norm(String(text || '')).replace(/\b(pes|peso)\s+(mort|muerto)\s+(rumano|rumana|romanes|romanian|rdl)\b/g, 'rdl').replace(/\bromanian\s+dead\s*lift\b/g, 'rdl');
    const ws = rawTokens(clean);
    const out = [];
    for (let i = 0; i < ws.length; i++) {
      const two = i + 1 < ws.length ? `${ws[i]} ${ws[i + 1]}` : '';
      if (two && SYN[two]) { out.push(SYN[two]); i++; continue; }
      if (ws[i] === 'peso' && ws[i + 1] === 'muerto') { out.push('pes', 'mort'); i++; continue; }
      if (STOP.has(ws[i]) || (ws[i].length === 1 && !/\d/.test(ws[i]))) continue;
      out.push(...String(canon(ws[i])).split(' '));
    }
    return out;
  }
  // Dues paraules «són la mateixa» si són iguals o comparteixen gairebé tot el principi (plurals i petites variacions).
  function same(a, b) {
    if (a === b) return true;
    const n = Math.min(a.length, b.length);
    if (n < 4) return false;
    let k = 0;
    while (k < n && a[k] === b[k]) k++;
    return k >= Math.max(4, n - 1) && Math.abs(a.length - b.length) <= 2;
  }

  // Índex de la biblioteca: paraules del nom (pes alt) i de la resta de camps (pes baix), i la freqüència de cada paraula.
  function build(list) {
    const df = {};
    const docs = list.map((e) => {
      const name = [...new Set(tokens(e.name))];
      const rest = [...new Set(tokens([e.cat, e.gm, e.family, e.material, ...(e.materials || []), ...(e.muscles || [])].filter(Boolean).join(' ')))].filter((t) => !name.includes(t));
      for (const t of new Set([...name, ...rest])) df[t] = (df[t] || 0) + 1;
      return { e, name, rest };
    });
    return { docs, df, n: Math.max(1, list.length) };
  }
  const idf = (ix, t) => Math.log(1 + ix.n / (1 + (ix.df[t] || 0)));

  // Puntuació 0–1 d'un exercici per a una cerca: quina part de les paraules de la cerca (ponderades per raresa) hi surten.
  function score(ix, q, d, bloc) {
    if (!q.length) return 0;
    let got = 0, total = 0;
    for (const t of q) {
      const w = idf(ix, t);
      total += w;
      if (d.name.some((x) => same(x, t))) got += w;
      else if (d.rest.some((x) => same(x, t))) got += w * 0.45;
    }
    const cover = got / (total || 1);
    // Entre dos exercicis que cobreixen igual la cerca, guanya el nom més curt (el més directe).
    const nameW = d.name.reduce((s, t) => s + idf(ix, t), 0) || 1;
    const hit = d.name.filter((x) => q.some((t) => same(x, t))).reduce((s, t) => s + idf(ix, t), 0);
    let s = cover * (0.92 + 0.08 * (hit / nameW));
    if (bloc && d.e.block === bloc) s += 0.04;
    return Math.min(1, s);
  }

  // Cerca: els millors exercicis per a un text (opcionalment dins d'un bloc).
  function search(list, text, { bloc, limit = 8 } = {}) {
    const q = tokens(text);
    if (!q.length) return [];
    const ix = build(list);
    const exact = U.norm(String(text || '')).replace(/[^a-z0-9ñç]+/g, ' ').trim();
    const rank = (x) => Math.round((x.s + (x.exact ? 0.2 : 0)) / 0.04);
    // Puntuacions gairebé iguals (dins d'un esglaó de 0,04) es desempaten amb l'ordre de la biblioteca: hi van primer els exercicis
    // «de base» (la planxa és la frontal, el pont de glutis és el de dues cames).
    return ix.docs.map((d, i) => ({ e: d.e, s: score(ix, q, d, bloc), i, exact: U.norm(d.e.name).replace(/[^a-z0-9ñç]+/g, ' ').trim() === exact }))
      .filter((x) => x.s >= 0.3).sort((a, b) => rank(b) - rank(a) || a.i - b.i).slice(0, limit);
  }

  // Un nom escrit per una persona → l'exercici de la biblioteca (o dubtes). conf: alta (clara), mitjana (probable), baixa o cap.
  function resolve(list, text, { bloc } = {}) {
    const found = search(list, text, { bloc, limit: 4 });
    if (!found.length) return { best: null, conf: 'cap', alts: [] };
    const [a, b] = found;
    const gap = b ? a.s - b.s : 1;
    const exact = U.norm(a.e.name) === U.norm(text);
    // alta: clara; mitjana: la millor, tot i que hi ha variants (s'avisa); baixa: dubtosa; cap: no hi ha res semblant.
    const conf = exact || (a.s >= 0.85 && gap >= 0.08) || (a.s >= 0.7 && gap >= 0.2) ? 'alta' : a.s >= 0.6 ? 'mitjana' : a.s >= 0.45 ? 'baixa' : 'cap';
    return { best: a.e, score: a.s, conf, alts: found.slice(1, 4).map((x) => x.e) };
  }

  return { tokens, search, resolve, canon };
})();
