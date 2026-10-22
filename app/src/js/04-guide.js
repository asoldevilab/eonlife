/* EON Life · ajudes per dissenyar la sessió: durades (descans i temps), progressió suggerida, 1RM del pacient,
   càrrega a partir d'un %, precaucions per lesió i volum setmanal per múscul. Només càlculs, sense pantalla. */

// Zones de lesió: paraules que les anomenen a la fitxa del pacient (sense accents ni majúscules) i com s'identifiquen
// els exercicis que les carreguen (per múscul o per nom).
const CAUTION_ZONES = [
  { key: 'genoll', label: 'genoll',
    say: /genoll|rotul|menisc|\blca\b|creuat|patel|tendo rotulia|salt del cavaller/,
    muscles: ['Quàdriceps', 'Isquiotibials'],
    names: /squat|sentadilla|gen[ou]flexio|zancada|lunge|split|bulgar|salt|jump|hop|skater|step|pujada|leg press|leg ext|extensio de genoll|nordic|box|sprint|correr|skipping/ },
  { key: 'espatlla', label: 'espatlla',
    say: /espatlla|manegot|rotador|acromi|clavicula|luxacio|supraespinos|hombro/,
    muscles: ['Deltoides', 'Manegot rotador', 'Pectoral', 'Trapezi', 'Escàpula'],
    names: /press|overhead|militar|snatch|arrencada|dominada|pull-?up|jalo|fons|dip|push-?up|flexio|elevacio|rem vertical/ },
  { key: 'lumbar', label: 'esquena / lumbar',
    say: /lumbar|esquena|hernia|discal|ciatica|lumbalgia|espondil|columna/,
    muscles: ['Lumbar'],
    names: /pes mort|deadlift|good morning|bon dia|hiperext|rem amb barra|remo con barra|swing|clean|snatch|arrencada|thruster|sentadilla|back squat/ },
  { key: 'maluc', label: 'maluc / engonal',
    say: /maluc|engonal|adductor|pubalgia|pubis|cadera|ingle|fai\b|pinçament/,
    muscles: ['Adductors', 'Flexors de maluc', 'GMed'],
    names: /copenhagen|sumo|lateral lunge|zancada lateral|cossack|split|aductor|abductor|90\/90|rotacio de maluc/ },
  { key: 'turmell', label: 'turmell / peu',
    say: /turmell|peu\b|aquil|fascitis|esquinc|tobillo|taló|talo/,
    muscles: ['Bessons i soli', 'Tibial anterior'],
    names: /salt|jump|hop|skipping|corda|sprint|correr|calf|bessons|taló|pujada de punta|box/ },
  { key: 'canell', label: 'canell / colze',
    say: /canell|colze|epicondil|tendinitis|codo|muñeca/,
    muscles: ['Avantbraç', 'Bíceps', 'Tríceps'],
    names: /push-?up|flexio|curl|triceps|press|fons|dip|dominada|pull-?up|rem|grip|prensio/ },
];

Object.assign(Calc, {
  // ── Durades ──
  // «2'», «90 s», «90"», «1:30», «2'30», «1-2'» → segons. Un número sol: ≥ 10 són segons, menys, minuts.
  secs(text) {
    const s = String(text == null ? '' : text).toLowerCase().replace(/,/g, '.').replace(/[”“″]/g, '"').replace(/[’‘′]/g, "'");
    if (!s.trim()) return null;
    let m = s.match(/(\d+)\s*[:']\s*(\d{1,2})\s*"?/);
    if (m) return Number(m[1]) * 60 + Number(m[2]);
    m = s.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(min|m\b|')/);
    if (m) return Math.round(Number(m[1]) * 60);
    m = s.match(/(\d+(?:\.\d+)?)(?:\s*[-–]\s*\d+(?:\.\d+)?)?\s*(seg|sec|s\b|")/);
    if (m) return Math.round(Number(m[1]));
    m = s.match(/^\s*(\d+(?:\.\d+)?)\s*$/);
    if (m) { const n = Number(m[1]); return n <= 0 ? null : n >= 10 ? Math.round(n) : Math.round(n * 60); }
    return null;
  },
  // El text indica un temps (30 s, 45", 2') i no repeticions.
  isTime(text) { return /\d\s*(min|seg|sec|s\b|"|'|”|’)/i.test(String(text || '')); },
  clock(n) {
    const t = Math.max(0, Math.round(n || 0));
    const h = Math.floor(t / 3600), m = Math.floor((t % 3600) / 60), s = t % 60;
    return h ? `${h}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}` : `${m}:${String(s).padStart(2, '0')}`;
  },

  // ── Progressió suggerida ──
  // Càrrega en kg d'un camp («60», «60 kg», «62,5»); null si no és un número net.
  loadKg(v) {
    const m = String(v == null ? '' : v).trim().match(/^(\d+(?:[.,]\d+)?)\s*(kg)?$/i);
    return m ? Number(m[1].replace(',', '.')) : null;
  },
  fmtKg(n) { return `${String(Math.round(n * 100) / 100).replace('.', ',')} kg`; },
  // Què fer amb la càrrega de la darrera vegada segons com va anar aquella sessió (RPE 1–10 i dolor 0–10).
  // Sense RPE ni dolor registrats no hi ha base per suggerir res.
  suggestLoad(prev, ctx = {}) {
    const base = Calc.loadKg(prev && prev.load);
    if (base == null || base <= 0) return null;
    const rpe = U.num(ctx.rpe), pain = U.num(ctx.pain);
    if (rpe == null && pain == null) return null;
    let pct = 0, why;
    if (pain != null && pain >= 4) { pct = -5; why = `dolor ${U.fmt(pain, 0)}/10 la darrera sessió`; }
    else if (rpe == null) return null;
    else if (rpe <= 6) { pct = 5; why = `RPE ${U.fmt(rpe, 0)}: anava folgat`; }
    else if (rpe < 8) { pct = 2.5; why = `RPE ${U.fmt(rpe, 0)}: marge per pujar`; }
    else if (rpe < 10) { pct = 0; why = `RPE ${U.fmt(rpe, 0)}: ja era exigent`; }
    else { pct = -2.5; why = 'RPE 10: va ser el màxim'; }
    let load = Math.round((base * (1 + pct / 100)) * 2) / 2;
    if (pct > 0 && load <= base) load = base + 0.5;
    return { load, base, delta: load - base, pct, why, text: `${Calc.fmtKg(load)} (${why})` };
  },

  // ── 1RM del pacient i % → kg ──
  // Estimació d'una sèrie (Epley, comptant les repeticions que sobraven): null si no hi ha càrrega o repeticions netes.
  e1rm(it) {
    const kg = Calc.loadKg(it && it.load), reps = U.num(String((it && it.reps) || '').match(/\d+/));
    if (kg == null || kg <= 0 || reps == null || reps < 1 || reps > 12) return null;
    const rir = String((it && it.intensity) || '').match(/RIR\s*(\d)/i);
    return kg * (1 + (reps + (rir ? Number(rir[1]) : 0)) / 30);
  },
  // 1RM d'un exercici: la del perfil càrrega-velocitat més recent d'aquest exercici o, si no n'hi ha, la millor estimada
  // amb les sessions fetes abans de la data. Retorna { rm, src, date } o null.
  oneRm(pid, name, asOf) {
    const nm = U.norm(name || '');
    if (!pid || !nm) return null;
    const end = asOf || '9999-99-99';
    const hit = {
      squat: /squat|sentadilla/, bench: /banca|bench/, deadlift: /pes mort|deadlift/, hipthrust: /hip ?thrust/,
    };
    const asses = U.sortBy(Store.byPatient('assessments', pid).filter((a) => a.date && a.date <= end && !Calc.assessScheduled(a)), (a) => a.date, -1);
    for (const a of asses) {
      for (const x of Calc.lvpAnalysis(a, null)) {
        if (!(x.rm > 0)) continue;
        const key = U.norm(x.name || '');
        const same = (hit[x.preset] && hit[x.preset].test(nm)) || (key && (nm.includes(key) || key.includes(nm)));
        if (same) return { rm: x.rm, src: 'lvp', date: a.date };
      }
    }
    let best = null;
    for (const s of Store.sessionsOf(pid).filter((x) => x.date && x.date < end).slice(-12)) {
      for (const b of s.blocks || []) for (const it of b.items || []) {
        if (U.norm(it.name || '') !== nm) continue;
        const e = Calc.e1rm(it);
        if (e && (!best || e > best.rm)) best = { rm: e, src: 'sessions', date: s.date };
      }
    }
    return best;
  },
  // «75 %» (o «75%») → número; null si el camp no és un percentatge.
  pctOf(v) {
    const m = String(v == null ? '' : v).trim().match(/^(\d+(?:[.,]\d+)?)\s*%$/);
    return m ? Number(m[1].replace(',', '.')) : null;
  },
  loadFromPct(pct, rm) { return rm > 0 && pct > 0 ? Math.round(((rm * pct) / 100) * 2) / 2 : null; },

  // ── Precaucions per lesió ──
  // Text de la fitxa on el pacient té lesions, cirurgies o patologies.
  cautionText(p) {
    return U.norm([p && p.injuryNote, p && p.surgeryNote, p && p.history, p && p.conditions].filter(Boolean).join(' · '));
  },
  // Avisos d'un exercici ({ name, gm, muscles }) per a un pacient: [{ zone, label, why }]. Són orientatius: només
  // senyalen que la zona anotada a la fitxa la carrega l'exercici.
  cautions(p, ex) {
    const txt = Calc.cautionText(p);
    if (!txt || !ex) return [];
    const nm = U.norm(ex.name || '');
    const ms = [ex.gm, ...(ex.muscles || [])].filter(Boolean);
    const out = [];
    for (const z of CAUTION_ZONES) {
      if (!z.say.test(txt)) continue;
      const byMuscle = ms.find((m) => z.muscles.includes(m));
      const byName = z.names.test(nm);
      if (byMuscle || byName) out.push({ zone: z.key, label: z.label, why: byMuscle ? `treballa ${byMuscle.toLowerCase()}` : 'carrega aquesta zona' });
    }
    return out;
  },

  // ── Volum setmanal per múscul ──
  // Sèries per múscul de les sessions del pacient a la setmana de la data (planificades i fetes), amb la sessió oberta
  // tal com és ara. Retorna { rows: [{ muscle, sets }], missing: [múscul sense feina] }.
  weekVolume(pid, date, current) {
    const wk = U.weekStart(date || U.today());
    const sessions = Store.sessionsOf(pid).filter((s) => U.weekStart(s.date) === wk && !(current && s.id === current.id));
    if (current) sessions.push(current);
    const by = {};
    for (const s of sessions) for (const b of s.blocks || []) for (const it of b.items || []) {
      if (!it.name) continue;
      const ex = it.exId ? Store.exercise(it.exId) : null;
      const sets = U.num(it.sets) || 1;
      const ms = [it.gm || (ex && ex.gm)].filter(Boolean);
      for (const m of ms.length ? ms : ['Sense múscul']) by[m] = (by[m] || 0) + sets;
    }
    const rows = Object.keys(by).map((muscle) => ({ muscle, sets: by[muscle] })).sort((a, b) => b.sets - a.sets);
    const main = ['Quàdriceps', 'Isquiotibials', 'GMax', 'Pectoral', 'Dorsal', 'Deltoides', 'Core'];
    return { rows, missing: main.filter((m) => !by[m]) };
  },

  // ── Material de la sala ──
  // Material que cal tenir a punt per a una o diverses sessions (sense «Terra», «Pes corporal» ni «Paret»), amb els
  // exercicis que el fan servir. Cada element: { name, exercises: [noms], sessions: [ids], n, checked } on checked vol dir
  // que totes les sessions que el fan servir el tenen marcat com a preparat (session.prep).
  sessionMaterial(sessions) {
    const trivial = /^(terra|pes corporal|paret|cap|-|—)$/;
    const order = (() => { try { return Store.materials().center; } catch (e) { return []; } })();
    const by = new Map();
    for (const s of [].concat(sessions || [])) {
      for (const b of s.blocks || []) for (const it of b.items || []) {
        if (!it.name) continue;
        const ex = it.exId ? Store.exercise(it.exId) : null;
        const m = String(it.material || (ex && ex.material) || '').trim();
        if (!m || trivial.test(U.norm(m))) continue;
        const x = by.get(m) || { name: m, exercises: [], sessions: new Set(), n: 0 };
        if (!x.exercises.includes(it.name)) x.exercises.push(it.name);
        x.sessions.add(s.id); x.n += 1;
        by.set(m, x);
      }
    }
    const pos = (m) => { const i = order.indexOf(m); return i < 0 ? 999 : i; };
    return [...by.values()].sort((a, b) => pos(a.name) - pos(b.name) || a.name.localeCompare(b.name, 'ca')).map((x) => ({
      name: x.name, exercises: x.exercises, sessions: [...x.sessions], n: x.n,
      checked: [...x.sessions].every((id) => { const s = [].concat(sessions).find((y) => y.id === id); return !!(s && s.prep && s.prep[x.name]); }),
    }));
  },

  // ── Durada estimada d'una sessió ──
  // Aproximació a partir dels exercicis: temps de treball de cada sèrie (repeticions × durada de la repetició, o el temps
  // escrit), els descansos que hi ha anotats (o un de típic segons el bloc), el canvi de material i les superseries
  // (les voltes × els exercicis seguits + el descans entre voltes). Només dóna un ordre de magnitud.
  REP_SECS: { mob: 4, act: 4, pot: 2, for: 4, acc: 3.5, cal: 4 },
  REST_DEFAULT: { mob: 15, act: 30, pot: 90, for: 120, acc: 60, cal: 0 },
  // Segons de treball d'una sèrie d'un exercici (amb 5 s de preparació).
  setWork(it, blockKey) {
    const reps = String((it && it.reps) || '').trim();
    const sides = /\/\s*(costat|cama|bra[cç]|m[aà])/i.test(reps) ? 2 : 1;
    let w;
    if (Calc.isTime(reps)) w = Calc.secs(reps) || 30;
    else {
      const m = reps.match(/(\d+)(?:\s*[-–]\s*(\d+))?/);
      const n = m ? (m[2] ? (Number(m[1]) + Number(m[2])) / 2 : Number(m[1])) : null;
      const tempo = String((it && it.tempo) || '').match(/[\dxX]/g);
      const per = tempo && tempo.length >= 2 ? tempo.reduce((a, c) => a + (/[xX]/.test(c) ? 1 : Number(c)), 0) : (Calc.REP_SECS[blockKey] || 3.5);
      w = n == null ? 30 : n * per;
    }
    return w * sides + 5;
  },
  restSecs(it, blockKey) {
    const r = Calc.secs(it && it.rest);
    return r != null ? r : (Calc.REST_DEFAULT[blockKey] != null ? Calc.REST_DEFAULT[blockKey] : 60);
  },
  // { total, work, rest (segons), minutes, blocks: [{ key, secs }] }. El darrer descans de la sessió no es compta.
  sessionDuration(s) {
    const blocks = [];
    let work = 0, rest = 0, last = 0;
    for (const b of (s && s.blocks) || []) {
      const items = (b.items || []).filter((i) => i.name);
      if (!items.length) continue;
      let bw = 0, br = 0;
      const plain = (list) => {
        for (const it of list) {
          const sets = Math.max(1, U.num(it.sets) || 1), r = Calc.restSecs(it, b.key);
          bw += sets * Calc.setWork(it, b.key) + 20; br += sets * r; last = r;
        }
      };
      const gs = Calc.groups(b);
      if (!gs) plain(items);
      else for (const x of gs) {
        const list = x.items.map((y) => y.it).filter((i) => i.name);
        if (!list.length) continue;
        if (Calc.isSuper(x.g)) {
          const rounds = Math.max(1, U.num(x.g.rounds) || 1), r = Calc.secs(x.g.rest) != null ? Calc.secs(x.g.rest) : (Calc.REST_DEFAULT[b.key] != null ? Calc.REST_DEFAULT[b.key] : 60);
          bw += rounds * list.reduce((a, it) => a + Calc.setWork(it, b.key), 0) + 20 * list.length; br += rounds * r; last = r;
        } else plain(list);
      }
      blocks.push({ key: b.key, secs: bw + br });
      work += bw; rest += br;
    }
    const total = Math.max(0, work + rest - last);
    return { total, work, rest: Math.max(0, rest - last), minutes: Math.round(total / 60), blocks };
  },
  // Franja respecte de l'hora ideal: 'short' (< 50 min), 'ideal' (50-65), 'long' (65-75) o 'over' (> 75).
  durationBand(minutes) {
    if (!(minutes > 0)) return null;
    if (minutes < 50) return { key: 'short', label: 'Curta' };
    if (minutes <= 65) return { key: 'ideal', label: 'Ideal' };
    if (minutes <= 75) return { key: 'long', label: 'Una mica llarga' };
    return { key: 'over', label: 'Massa llarga' };
  },

  // ── Conflictes d'horari ──
  // Minuts des de mitjanit d'una hora «HH:MM» (null si no n'hi ha).
  minutesOf(t) { const m = /^(\d{1,2}):(\d{2})/.exec(String(t || '')); return m ? Number(m[1]) * 60 + Number(m[2]) : null; },
  // Sessions que coincideixen en el temps (cada sessió compta 1 hora des de l'hora d'inici). Dos tipus d'avís:
  //  · 'prof': el mateix professional té dues sessions a la vegada;
  //  · 'material': professionals diferents fan servir el mateix material únic (opt.unique, un Set de noms).
  // opt: { from, to (AAAA-MM-DD), unique, profOf(pid) → professional del pacient, minutes (60) }.
  scheduleConflicts(sessions, opt = {}) {
    const dur = opt.minutes || 60;
    const unique = opt.unique || new Set();
    const prof = (s) => s.professional || (opt.profOf ? opt.profOf(s.patientId) : '') || '';
    const list = (sessions || []).filter((s) => s.status !== 'feta' && Calc.minutesOf(s.time) != null
      && (!opt.from || s.date >= opt.from) && (!opt.to || s.date <= opt.to));
    const byDate = {};
    for (const s of list) (byDate[s.date] = byDate[s.date] || []).push(s);
    const out = [];
    for (const date of Object.keys(byDate).sort()) {
      const day = U.sortBy(byDate[date], (s) => Calc.minutesOf(s.time));
      for (let i = 0; i < day.length; i++) for (let j = i + 1; j < day.length; j++) {
        const a = day[i], b = day[j];
        if (a.patientId === b.patientId) continue;
        const ta = Calc.minutesOf(a.time), tb = Calc.minutesOf(b.time);
        if (Math.abs(ta - tb) >= dur) continue;
        const pa = prof(a), pb = prof(b);
        if (pa && pa === pb) { out.push({ kind: 'prof', date, a, b, prof: pa }); continue; }
        const ma = new Set(Calc.sessionMaterial(a).map((m) => m.name).filter((m) => unique.has(m)));
        const mats = Calc.sessionMaterial(b).map((m) => m.name).filter((m) => ma.has(m));
        if (mats.length) out.push({ kind: 'material', date, a, b, mats, profs: [pa, pb] });
      }
    }
    return out;
  },
});
