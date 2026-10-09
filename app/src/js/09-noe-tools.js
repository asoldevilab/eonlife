/* EON Life · NOE: les eines que pot fer servir (llegir l'app) i les propostes de canvi.
   · Eines de lectura: cerca, llista i fitxa de pacients, valoracions, sessions, calendari i biblioteca d'exercicis.
     Els pacients surten amb un codi (PAC-1…) i sense nom, telèfon, correu ni data de naixement (només l'edat).
   · Eines «proposar_…»: NO canvien res. Deixen una proposta (NoeActions) que la persona veu com una targeta i decideix si
     l'aplica; el que es crea es pot desfer. L'IA no té cap eina per esborrar dades. */

const NoeTools = (() => {
  const BLOCK_ALIAS = {};
  for (const b of BLOCKS) {
    BLOCK_ALIAS[b.key] = b.key;
    BLOCK_ALIAS[U.norm(b.name)] = b.key;
    BLOCK_ALIAS[String(b.num)] = b.key;
  }
  Object.assign(BLOCK_ALIAS, { mobilitat: 'mob', activacio: 'act', potencia: 'pot', forca: 'for', 'forca principal': 'for', accessoris: 'acc', calma: 'cal', 'tornada a la calma': 'cal' });
  const blockKey = (v) => BLOCK_ALIAS[U.norm(v)] || null;

  const str = (v) => (v == null ? '' : String(v).trim());
  const short = (s, n = 160) => { const t = str(s).replace(/\s+/g, ' '); return t.length > n ? `${t.slice(0, n - 1)}…` : t; };
  const isDate = (s) => /^\d{4}-\d{2}-\d{2}$/.test(str(s)) && !Number.isNaN(Date.parse(str(s)));
  const compact = (o) => { for (const k of Object.keys(o)) if (o[k] === '' || o[k] == null || (Array.isArray(o[k]) && !o[k].length)) delete o[k]; return o; };
  const sexName = (v) => (OPT.sex.find((o) => o.v === v) || {}).label || '';

  // ── Definicions (l'esquema que veu l'IA) ──
  const P = { type: 'string', description: 'Codi del pacient (PAC-1…). Fes servir el que et surt a les eines.' };
  const blocsSchema = {
    type: 'array', description: 'Blocs de la sessió. Només els que toquen (no cal omplir els 6).',
    items: {
      type: 'object', properties: {
        bloc: { type: 'string', enum: BLOCKS.map((b) => b.key), description: BLOCKS.map((b) => `${b.key} = ${b.name}`).join(' · ') },
        focus: { type: 'string', description: 'Enfocament del bloc (p. ex. "Dominant de genoll").' },
        nota: { type: 'string' },
        exercicis: {
          type: 'array', items: {
            type: 'object', properties: {
              exercici_id: { type: 'string', description: 'Identificador de la biblioteca (el de «buscar_exercicis»).' },
              nom: { type: 'string', description: 'Només si l\'exercici no és a la biblioteca.' },
              series: { type: 'string' }, repeticions: { type: 'string', description: 'p. ex. "8", "8/costat", "30 s"' },
              carrega: { type: 'string', description: 'kg o descripció (p. ex. "16", "goma mitjana")' },
              intensitat: { type: 'string', description: 'p. ex. "RIR 2", "RPE 7", "Màxima intenció"' },
              descans: { type: 'string' }, tempo: { type: 'string' }, nota: { type: 'string', description: 'Indicació curta per al pacient o el professional.' },
            },
          },
        },
      }, required: ['bloc', 'exercicis'],
    },
  };
  const sessioSchema = {
    type: 'object', properties: {
      data: { type: 'string', description: 'AAAA-MM-DD' }, objectiu: { type: 'string', description: 'Objectiu de la sessió (curt).' },
      pilar: { type: 'string', enum: OPT.pillars }, blocs: blocsSchema,
    }, required: ['data', 'blocs'],
  };

  const DEFS = [
    { name: 'llista_pacients', description: 'Llista els pacients amb un resum (edat, servei, estat, objectiu, última sessió feta, propera sessió planificada). Serveix per saber qui és qui, qui no ha entrenat últimament o qui toca re-test.',
      input_schema: { type: 'object', properties: {
        estat: { type: 'string', enum: OPT.status.map((s) => s.v) }, servei: { type: 'string', enum: OPT.services.map((s) => s.v) },
        professional: { type: 'string' }, sense_sessio_dies: { type: 'integer', description: 'Només els que fa més de N dies que no tenen cap sessió feta.' },
        retest_pendent: { type: 'boolean', description: 'Només els que tenen el re-test vençut o d\'aquí a un mes.' },
        limit: { type: 'integer', description: 'Màxim de files (per defecte 30).' },
      } } },
    { name: 'cerca_global', description: 'Cerca per text a tota l\'app: pacients (per objectiu, lesió, esport…), sessions (per objectiu o exercici) i exercicis de la biblioteca. Torna identificadors per obrir-los.',
      input_schema: { type: 'object', properties: { text: { type: 'string' }, tipus: { type: 'string', enum: ['tot', 'pacients', 'sessions', 'exercicis'] } }, required: ['text'] } },
    { name: 'fitxa_pacient', description: 'Fitxa completa d\'un pacient: edat, pes, esport, nivell, objectiu, lesions i limitacions, antecedents, últimes sessions (RPE, dolor, wellness) i punts d\'atenció de l\'última valoració.',
      input_schema: { type: 'object', properties: { pacient: P }, required: ['pacient'] } },
    { name: 'valoracions_pacient', description: 'Valoracions d\'un pacient (les últimes N): mesures dels tests, asimetries, salts, Y-Balance, patrons de moviment puntuats, conclusions i el canvi respecte de l\'anterior.',
      input_schema: { type: 'object', properties: { pacient: P, ultimes: { type: 'integer', description: '1 a 3 (per defecte 1).' } }, required: ['pacient'] } },
    { name: 'sessions_pacient', description: 'Sessions d\'un pacient (data, estat, objectiu, RPE, dolor). Amb detall=true també els exercicis de cada bloc.',
      input_schema: { type: 'object', properties: { pacient: P, des: { type: 'string', description: 'AAAA-MM-DD' }, fins: { type: 'string', description: 'AAAA-MM-DD' },
        estat: { type: 'string', enum: OPT.sessionStatus.map((s) => s.v) }, detall: { type: 'boolean' }, limit: { type: 'integer' } }, required: ['pacient'] } },
    { name: 'sessio', description: 'Una sessió sencera: blocs, exercicis amb la seva prescripció, estat, RPE, dolor i wellness.',
      input_schema: { type: 'object', properties: { sessio: { type: 'string', description: 'Identificador de la sessió (S-…).' } }, required: ['sessio'] } },
    { name: 'calendari_pacient', description: 'Calendari d\'un mes d\'un pacient: les sessions que ja hi ha, els dies d\'entrenament habituals i els dies lliures. Mira-ho abans de planificar.',
      input_schema: { type: 'object', properties: { pacient: P, mes: { type: 'string', description: 'AAAA-MM' } }, required: ['pacient', 'mes'] } },
    { name: 'buscar_exercicis', description: 'Cerca exercicis de la biblioteca del centre per text, bloc, grup muscular, material o nivell. Fes-la servir SEMPRE abans de proposar una sessió: els exercicis han de ser d\'aquí.',
      input_schema: { type: 'object', properties: { text: { type: 'string' }, bloc: { type: 'string', enum: BLOCKS.map((b) => b.key) }, grup_muscular: { type: 'string' },
        material: { type: 'string' }, nivell: { type: 'string', enum: OPT.levels.map((l) => l.v) }, familia: { type: 'string' }, limit: { type: 'integer', description: 'Màxim (per defecte 25).' } } } },
    { name: 'familia_exercici', description: 'La progressió d\'un exercici: la seva família ordenada del nivell més fàcil al més difícil (per pujar o baixar de nivell).',
      input_schema: { type: 'object', properties: { exercici_id: { type: 'string' }, familia: { type: 'string' } } } },
    { name: 'proposar_sessio', description: 'PROPOSA una sessió nova (planificada) per a un pacient. No es crea fins que la persona la confirma a la targeta.',
      input_schema: { type: 'object', properties: { pacient: P, ...sessioSchema.properties, motiu: { type: 'string', description: 'Per què la proposes així (1–2 frases).' } }, required: ['pacient', 'data', 'blocs'] } },
    { name: 'proposar_planificacio_mes', description: 'PROPOSA les sessions d\'un mes sencer per a un pacient (cada una amb la seva data i els seus blocs). No es crea res fins que la persona ho confirma. Els dies que ja tenen sessió es salten.',
      input_schema: { type: 'object', properties: { pacient: P, mes: { type: 'string', description: 'AAAA-MM' }, sessions: { type: 'array', items: sessioSchema }, motiu: { type: 'string' } }, required: ['pacient', 'sessions'] } },
    { name: 'proposar_canvi_sessio', description: 'PROPOSA canvis en una sessió que encara no és feta: afegir, treure o substituir exercicis, canviar-ne la prescripció, l\'objectiu o la data.',
      input_schema: { type: 'object', properties: { sessio: { type: 'string' }, motiu: { type: 'string' }, canvis: { type: 'array', items: { type: 'object', properties: {
        accio: { type: 'string', enum: ['afegir', 'treure', 'substituir', 'prescripcio', 'canviar_objectiu', 'canviar_data'] },
        bloc: { type: 'string', enum: BLOCKS.map((b) => b.key) },
        exercici: { type: 'string', description: 'Per treure, substituir o canviar la prescripció: l\'identificador de la línia (el que torna «sessio») o el nom.' },
        nou: { type: 'object', description: 'Per afegir o substituir: l\'exercici nou (exercici_id o nom, series, repeticions…).' },
        camps: { type: 'object', description: 'Per prescripcio: series, repeticions, carrega, intensitat, descans, tempo, nota.' },
        valor: { type: 'string', description: 'Per canviar_objectiu o canviar_data.' },
      }, required: ['accio'] } } }, required: ['sessio', 'canvis'] } },
    { name: 'proposar_pla', description: 'PROPOSA un pla d\'entrenament de diverses setmanes (S1…SN) per a un pacient, amb progressió.',
      input_schema: { type: 'object', properties: { pacient: P, nom: { type: 'string' }, objectiu: { type: 'string' }, inici: { type: 'string', description: 'AAAA-MM-DD' },
        dies: { type: 'array', items: { type: 'integer' }, description: 'Dies de la setmana (0 = diumenge … 6 = dissabte).' },
        sessions: { type: 'array', items: { type: 'object', properties: { n: { type: 'integer' }, fase: { type: 'string' }, objectiu: { type: 'string' }, blocs: blocsSchema }, required: ['blocs'] } },
        motiu: { type: 'string' } }, required: ['pacient', 'nom', 'sessions'] } },
    { name: 'proposar_nota', description: 'PROPOSA afegir una nota als comentaris interns del professional d\'un pacient (només visible a l\'equip).',
      input_schema: { type: 'object', properties: { pacient: P, text: { type: 'string' } }, required: ['pacient', 'text'] } },
  ];

  // ── Ajudes de lectura ──
  const enc = (ctx, t) => (ctx.privacy ? ctx.ps.encode(str(t)) : str(t));
  const pat = (ctx, arg) => { const r = ctx.ps.resolve(arg); return r.error ? { err: r } : { pid: r.pid, p: Store.get('patients', r.pid) }; };
  const feedbackOf = (s) => { const f = s.feedback || {}; return compact({ rpe: U.num(f.rpe), eva: U.num(f.pain), durada_min: U.num(f.duration), wellness: (Calc.wellness(s.wellness) || {}).total }); };

  function itemOut(it) {
    return compact({ id: it.id, exercici_id: it.exId, nom: it.name, series: it.sets, repeticions: it.reps, carrega: Calc.load(it.load), intensitat: it.intensity, descans: it.rest, tempo: it.tempo, material: it.material, nota: short(it.note, 120), fet: it.done ? true : '' });
  }
  function sessionOut(s, ctx, detail = true) {
    const used = Store.usedBlocks(s.blocks || []);
    const o = { id: s.id, data: s.date, numero: s.number, estat: s.status, objectiu: enc(ctx, s.goal), pilar: s.pillar, professional: s.professional, ...feedbackOf(s) };
    if (detail) o.blocs = used.map((b) => compact({ bloc: b.key, nom: blockName(b.key), focus: b.focus, nota: short(b.note, 120), exercicis: (b.items || []).filter((i) => i.name).map(itemOut) }));
    else o.exercicis = Calc.itemCount(s);
    return compact(o);
  }
  const exOut = (e) => compact({ id: e.id, nom: e.name, bloc: e.block, categoria: e.cat, material: e.material, materials: (e.materials || []).slice(0, 5), grup: e.gm, lateralitat: e.lat, posicio: e.pos, familia: e.family, nivell: e.level,
    series: e.sets, repeticions: e.reps, intensitat: e.intensity, indicacions: short(e.cues, 110) });

  const RUN = {
    llista_pacients(i, ctx) {
      const today = U.today();
      let list = Store.patients();
      if (i.estat) list = list.filter((p) => (p.status || 'actiu') === i.estat);
      if (i.servei) list = list.filter((p) => p.service === i.servei);
      if (i.professional) list = list.filter((p) => U.norm(p.professional) === U.norm(i.professional));
      const rows = list.map((p) => {
        const sess = Store.sessionsOf(p.id), done = sess.filter((s) => s.status === 'feta');
        const last = done[done.length - 1], next = sess.find((s) => s.status !== 'feta' && s.date >= today);
        const as = Store.assessmentsOf(p.id), la = as[as.length - 1];
        return { p, row: compact({ pacient: ctx.ps.ref(p.id), edat: U.age(p.birthDate), sexe: sexName(p.sex), servei: p.service, estat: p.status || 'actiu', professional: p.professional,
          objectiu: enc(ctx, short(p.goal, 140)), darrera_sessio_feta: last ? last.date : '', dies_sense_sessio: last ? U.diffDays(last.date, today) : '', sessions_fetes_30d: done.filter((s) => s.date >= U.addDays(today, -30)).length,
          propera_sessio: next ? next.date : '', valoracions: as.length, retest: la ? la.nextRetest || '' : '' }) };
      });
      let out = rows;
      if (i.sense_sessio_dies != null) out = out.filter((r) => r.row.dies_sense_sessio === undefined || r.row.dies_sense_sessio > i.sense_sessio_dies);
      if (i.retest_pendent) out = out.filter((r) => r.row.retest && r.row.retest <= U.addDays(today, 30));
      const limit = Math.max(1, Math.min(60, i.limit || 30));
      return { total: out.length, pacients: out.slice(0, limit).map((r) => r.row), ...(out.length > limit ? { nota: `Només es mostren els primers ${limit}.` } : {}) };
    },

    cerca_global(i, ctx) {
      const q = U.norm(i.text);
      if (!q) return { error: 'Falta el text a cercar.' };
      const kind = i.tipus || 'tot';
      const has = (...fs) => fs.some((f) => U.norm(f).includes(q));
      const out = {};
      if (kind === 'tot' || kind === 'pacients') {
        out.pacients = Store.patients().filter((p) => has(p.goal, p.reason, p.history, p.limitations, p.conditions, p.sport, p.injuryNote, p.surgeryNote, p.occupation)).slice(0, 12)
          .map((p) => compact({ pacient: ctx.ps.ref(p.id), edat: U.age(p.birthDate), objectiu: enc(ctx, short(p.goal, 100)), lesio: enc(ctx, short(p.injuryNote || p.limitations, 100)) }));
      }
      if (kind === 'tot' || kind === 'sessions') {
        out.sessions = Store.all('sessions').filter((s) => has(s.goal, ...(s.blocks || []).flatMap((b) => (b.items || []).map((x) => x.name)))).sort((a, b) => (a.date < b.date ? 1 : -1)).slice(0, 12)
          .map((s) => compact({ id: s.id, pacient: ctx.ps.ref(s.patientId), data: s.date, estat: s.status, objectiu: enc(ctx, short(s.goal, 90)) }));
      }
      if (kind === 'tot' || kind === 'exercicis') out.exercicis = Store.exercises().filter((e) => has(e.name, e.cat, e.gm, e.family)).slice(0, 15).map(exOut);
      return out;
    },

    fitxa_pacient(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      const p = r.p, today = U.today();
      const sess = Store.sessionsOf(p.id), done = sess.filter((s) => s.status === 'feta');
      const as = Store.assessmentsOf(p.id), la = as[as.length - 1];
      const recent = done.slice(-5);
      const avg = (k) => { const v = recent.map((s) => U.num((s.feedback || {})[k])).filter((n) => n != null); return v.length ? Math.round((v.reduce((a, b) => a + b, 0) / v.length) * 10) / 10 : ''; };
      const wl = recent.map((s) => (Calc.wellness(s.wellness) || {}).total).filter((n) => n != null);
      return compact({
        pacient: ctx.ps.ref(p.id), edat: U.age(p.birthDate), sexe: sexName(p.sex), alcada_cm: U.num(p.height), pes_kg: U.num(p.weight),
        esport: enc(ctx, p.sport), professio: enc(ctx, p.occupation), nivell_activitat: (OPT.activityLevels.find((o) => o.v === p.activityLevel) || {}).label, dominancia: (OPT.dominance.find((o) => o.v === p.dominance) || {}).label,
        servei: p.service, estat: p.status || 'actiu', professional: p.professional, inici: p.startDate, disponibilitat: enc(ctx, p.availability),
        objectiu: enc(ctx, p.goal), motiu_consulta: enc(ctx, short(p.reason, 400)), antecedents: enc(ctx, short(p.history, 600)), limitacions: enc(ctx, short(p.limitations, 400)),
        condicions_salut: enc(ctx, short(p.conditions, 300)), medicacio: enc(ctx, short(p.medication, 200)),
        lesio: p.injuryDate || p.injuryNote ? compact({ data: p.injuryDate, nota: enc(ctx, short(p.injuryNote, 300)) }) : '',
        cirurgia: p.surgeryDate || p.surgeryNote ? compact({ data: p.surgeryDate, nota: enc(ctx, short(p.surgeryNote, 300)) }) : '',
        notes_internes: enc(ctx, short(p.notes, 500)),
        sessions: { total: sess.length, fetes: done.length, planificades: sess.filter((s) => s.status !== 'feta' && s.date >= today).length, darrera_feta: done.length ? done[done.length - 1].date : '' },
        ultimes_sessions: { rpe_mitja: avg('rpe'), eva_mitjana: avg('pain'), wellness_mitja: wl.length ? Math.round((wl.reduce((a, b) => a + b, 0) / wl.length) * 10) / 10 : '' },
        valoracions: as.length, ultima_valoracio: la ? { id: la.id, data: la.date, tipus: la.type, propera: la.nextRetest || '' } : '',
        punts_d_atencio: la ? Calc.alerts(la).slice(0, 12).map((x) => x.text) : [],
      });
    },

    valoracions_pacient(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      const n = Math.max(1, Math.min(3, i.ultimes || 1));
      const all = Store.assessmentsOf(r.pid);
      if (!all.length) return { pacient: ctx.ps.ref(r.pid), valoracions: [], nota: 'Aquest pacient encara no té cap valoració.' };
      const out = all.slice(-n).reverse().map((a) => {
        const idx = all.indexOf(a), prev = idx > 0 ? all[idx - 1] : null;
        const metrics = Calc.metrics().map((m) => { const v = m.get(a); if (v == null) return null; if (m.bi) return v.d == null && v.e == null ? null : { id: m.id, nom: m.label, unitat: m.unit, d: v.d, e: v.e }; return { id: m.id, nom: m.label, unitat: m.unit, valor: v }; }).filter(Boolean);
        const jumps = Calc.jumps(a);
        const ybt = Calc.ybt(a);
        const patterns = PATTERNS.map((pt) => { const x = (a.patterns || {})[pt.id] || {}; const s = Calc.patternScore(x, pt.uni); return s || x.pain ? compact({ patro: pt.name, puntuacio: s, dolor: x.pain ? true : '', nota: short(enc(ctx, x.note), 100) }) : null; }).filter(Boolean);
        const bike = Calc.bike(a);
        return compact({
          id: a.id, data: a.date, tipus: a.type, professional: a.professional, pes_kg: Calc.weight(a),
          punts_d_atencio: Calc.alerts(a).slice(0, 15).map((x) => x.text),
          mesures: metrics.slice(0, 45),
          salts: Object.fromEntries(Object.entries(jumps).map(([t, s]) => [t, compact({ millor_cm: s.best, mitjana_cm: s.mean, potencia_w: s.bestPower, w_kg: s.relPower })])),
          y_balance: ybt.d.comp != null || ybt.e.comp != null ? compact({ composite_d: ybt.d.comp, composite_e: ybt.e.comp, dif_anterior_cm: ybt.antDiff }) : '',
          patrons: patterns,
          assault_bike: bike.any ? compact({ pic_w: bike.peak, mitjana_w: bike.mean, w_kg_mitjana: bike.meanRel, fatiga_pct: bike.fatigue }) : '',
          conclusions: compact({ forts: enc(ctx, short((a.conclusions || {}).strengths, 300)), prioritats: enc(ctx, short((a.conclusions || {}).priorities, 300)), pla: enc(ctx, short((a.conclusions || {}).plan, 300)) }),
          canvis_respecte_anterior: prev ? Calc.compare(a, prev, true).slice(0, 14).map((c) => compact({ nom: c.label, anterior: c.prev, actual: c.cur, canvi: c.delta, millora: c.better === true ? true : c.better === false ? false : '' })) : '',
        });
      });
      return { pacient: ctx.ps.ref(r.pid), valoracions: out };
    },

    sessions_pacient(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      let list = Store.sessionsOf(r.pid);
      if (i.des) list = list.filter((s) => s.date >= i.des);
      if (i.fins) list = list.filter((s) => s.date <= i.fins);
      if (i.estat) list = list.filter((s) => s.status === i.estat);
      const limit = Math.max(1, Math.min(i.detall ? 12 : 40, i.limit || (i.detall ? 6 : 20)));
      const total = list.length;
      list = list.slice(-limit);
      return { pacient: ctx.ps.ref(r.pid), total, sessions: list.map((s) => sessionOut(s, ctx, !!i.detall)) };
    },

    sessio(i, ctx) {
      const s = Store.get('sessions', str(i.sessio));
      if (!s) return { error: `No trobo la sessió ${i.sessio}.` };
      return { pacient: ctx.ps.ref(s.patientId), ...sessionOut(s, ctx, true) };
    },

    calendari_pacient(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      if (!/^\d{4}-\d{2}$/.test(str(i.mes))) return { error: 'El mes ha de ser AAAA-MM.' };
      const sess = Store.sessionsOf(r.pid);
      const month = sess.filter((s) => s.date.startsWith(i.mes));
      const taken = new Set(month.map((s) => s.date));
      const wd = {};
      for (const s of sess.slice(-12)) { const d = U.parse(s.date).getDay(); wd[d] = (wd[d] || 0) + 1; }
      const usual = Object.entries(wd).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([d]) => Number(d)).sort((a, b) => ((a + 6) % 7) - ((b + 6) % 7));
      const first = `${i.mes}-01`, last = U.addDays(U.addMonths(first, 1), -1);
      const days = [];
      for (let d = first; d <= last; d = U.addDays(d, 1)) days.push(d);
      return { pacient: ctx.ps.ref(r.pid), mes: i.mes, dies_del_mes: days.length, sessions_del_mes: month.map((s) => compact({ id: s.id, data: s.date, dia: WEEKDAYS[U.parse(s.date).getDay()], estat: s.status, objectiu: enc(ctx, short(s.goal, 80)) })),
        dies_habituals_d_entrenament: usual.map((d) => ({ dia_setmana: d, nom: WEEKDAYS[d] })), dies_ocupats: [...taken].sort(), nota: 'dia_setmana: 0 = diumenge … 6 = dissabte.' };
    },

    buscar_exercicis(i) {
      const q = U.norm(i.text), g = U.norm(i.grup_muscular), m = U.norm(i.material), f = U.norm(i.familia);
      const bk = i.bloc ? blockKey(i.bloc) : null;
      let list = Store.exercises();
      if (bk) list = list.filter((e) => e.block === bk);
      if (q) list = list.filter((e) => [e.name, e.cat, e.gm, e.family, ...(e.muscles || [])].some((x) => U.norm(x).includes(q)));
      if (g) list = list.filter((e) => [e.gm, e.cat, ...(e.muscles || [])].some((x) => U.norm(x).includes(g)));
      if (m) list = list.filter((e) => [e.material, ...(e.materials || [])].some((x) => U.norm(x).includes(m)));
      if (f) list = list.filter((e) => U.norm(e.family).includes(f));
      if (i.nivell) list = list.filter((e) => String(e.level) === String(i.nivell));
      const limit = Math.max(1, Math.min(40, i.limit || 25));
      return { total: list.length, exercicis: list.slice(0, limit).map(exOut), ...(list.length > limit ? { nota: 'Hi ha més resultats: afegeix filtres (bloc, material, nivell).' } : {}) };
    },

    familia_exercici(i) {
      const ex = i.exercici_id ? Store.exercise(str(i.exercici_id)) : null;
      const fam = ex ? ex.family : str(i.familia);
      if (!fam) return { error: 'Aquest exercici no té família de progressió.' };
      const ladder = Store.ladder(fam);
      return { familia: fam, nivells: ladder.map((e) => compact({ nivell: e.level, id: e.id, nom: e.name, material: e.material, actual: ex && ex.id === e.id ? true : '' })) };
    },
  };

  // ── Propostes ──
  // Un exercici de la proposta → { exId, name, over } (la línia de sessió es fa en aplicar-la, amb identificadors nous).
  function resolveEx(e, warns) {
    if (!e || typeof e !== 'object') return null;
    let ex = e.exercici_id ? Store.exercise(str(e.exercici_id)) : null;
    const name = str(e.nom);
    if (!ex && name) {
      const n = U.norm(name);
      const all = Store.exercises();
      ex = all.find((x) => U.norm(x.name) === n) || (all.filter((x) => U.norm(x.name).includes(n) || n.includes(U.norm(x.name))).length === 1 ? all.find((x) => U.norm(x.name).includes(n) || n.includes(U.norm(x.name))) : null) || null;
    }
    const over = {};
    for (const [k, v] of [['sets', e.series], ['reps', e.repeticions], ['load', e.carrega], ['intensity', e.intensitat], ['rest', e.descans], ['tempo', e.tempo], ['note', e.nota]]) if (str(v)) over[k] = str(v);
    if (ex) return { exId: ex.id, name: ex.name, over };
    if (!name) { warns.push('Un exercici no tenia ni identificador ni nom: s\'ha ignorat.'); return null; }
    warns.push(`«${name}» no és a la biblioteca: es crearà com a exercici lliure.`);
    return { exId: '', name, over };
  }

  function normBlocks(blocs, warns) {
    const out = [];
    for (const b of Array.isArray(blocs) ? blocs : []) {
      const key = blockKey(b && b.bloc);
      if (!key) { warns.push(`Bloc desconegut «${b && b.bloc}»: s'ha ignorat.`); continue; }
      const items = (b.exercicis || []).map((e) => resolveEx(e, warns)).filter(Boolean);
      if (!items.length) continue;
      out.push({ key, focus: str(b.focus), note: str(b.nota), items });
    }
    // En l'ordre de la sessió (1 Mobilitat … 6 Calma)
    return out.sort((a, b) => BLOCK_KEYS.indexOf(a.key) - BLOCK_KEYS.indexOf(b.key));
  }

  const buildItem = (spec) => itemFromExercise(spec.exId ? Store.exercise(spec.exId) : null, { ...(spec.exId ? {} : { name: spec.name }), ...spec.over });
  const buildBlocks = (blocks) => blocks.map((b) => ({ key: b.key, focus: b.focus || '', note: b.note || '', items: b.items.map(buildItem) }));

  function normSession(s, warns, pid, { month } = {}) {
    const date = str(s && s.data);
    if (!isDate(date)) { warns.push(`Data no vàlida «${date}»: s'ha ignorat aquesta sessió.`); return null; }
    if (month && !date.startsWith(month)) warns.push(`${date} no és del mes ${month}.`);
    if (date < U.addDays(U.today(), -14)) warns.push(`${date} és una data passada.`);
    if (date > U.addDays(U.today(), 400)) warns.push(`${date} és molt lluny.`);
    const blocks = normBlocks(s.blocs, warns);
    if (!blocks.length) { warns.push(`La sessió del ${date} no té cap exercici vàlid: s'ha ignorada.`); return null; }
    const pillar = OPT.pillars.includes(s.pilar) ? s.pilar : '';
    const busy = Store.sessionsOf(pid).filter((x) => x.date === date);
    return { date, goal: str(s.objectiu), pillar, blocks, busy: busy.length ? busy.map((x) => x.id) : [] };
  }

  function addProposal(ctx, p) {
    const conv = ctx.conv;
    conv.proposals = conv.proposals || {};
    const id = `PR-${Object.keys(conv.proposals).length + 1}`;
    const prop = { id, status: 'pending', createdAt: Date.now(), warnings: [], ...p };
    conv.proposals[id] = prop;
    if (ctx.hooks && ctx.hooks.onProposal) ctx.hooks.onProposal(prop);
    return prop;
  }
  const reply = (prop, extra = {}) => ({ proposta: prop.id, estat: 'pendent_de_confirmar', avisos: prop.warnings, ...extra,
    nota: 'La proposta s\'ha mostrat a la persona com una targeta. NO s\'ha aplicat: depèn de si la confirma. Resumeix-la en poques línies i espera.' });

  Object.assign(RUN, {
    proposar_sessio(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      const warns = [];
      const s = normSession(i, warns, r.pid);
      if (!s) return { error: warns.join(' ') || 'La sessió no és vàlida.' };
      if (s.busy.length) warns.push(`Ja hi ha una sessió aquell dia (${s.date}); es crearà una altra.`);
      const prop = addProposal(ctx, { kind: 'sessio', pid: r.pid, ref: ctx.ps.ref(r.pid), title: `Sessió del ${U.fmtDate(s.date)}`, why: str(i.motiu), warnings: warns, data: { sessions: [s] } });
      return reply(prop);
    },

    proposar_planificacio_mes(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      const month = /^\d{4}-\d{2}$/.test(str(i.mes)) ? str(i.mes) : '';
      const warns = [];
      const sessions = (Array.isArray(i.sessions) ? i.sessions : []).slice(0, 40).map((s) => normSession(s, warns, r.pid, { month })).filter(Boolean);
      if (!sessions.length) return { error: warns.join(' ') || 'No hi ha cap sessió vàlida a la proposta.' };
      const seen = new Set();
      for (const s of sessions) {
        if (seen.has(s.date)) { s.skip = true; warns.push(`${s.date} està repetida a la proposta: només es crearà una vegada.`); }
        seen.add(s.date);
        if (s.busy.length) { s.skip = true; warns.push(`${s.date} ja té sessió: no es crearà.`); }
      }
      const n = sessions.filter((s) => !s.skip).length;
      const prop = addProposal(ctx, { kind: 'mes', pid: r.pid, ref: ctx.ps.ref(r.pid), title: `${month ? `Planificació ${U.ofMonth(month)}` : 'Planificació'} · ${U.plural(n, 'sessió', 'sessions')}`, why: str(i.motiu), warnings: warns, data: { sessions, month } });
      return reply(prop, { sessions_a_crear: n });
    },

    proposar_canvi_sessio(i, ctx) {
      const s = Store.get('sessions', str(i.sessio));
      if (!s) return { error: `No trobo la sessió ${i.sessio}.` };
      if (s.status === 'feta') return { error: 'Aquesta sessió ja és feta: no es pot canviar. Proposa una sessió nova.' };
      const warns = [];
      const ops = [];
      for (const c of Array.isArray(i.canvis) ? i.canvis : []) {
        const a = str(c.accio);
        if (a === 'canviar_objectiu') ops.push({ a, valor: str(c.valor) });
        else if (a === 'canviar_data') { if (isDate(c.valor)) ops.push({ a, valor: str(c.valor) }); else warns.push(`Data no vàlida «${c.valor}».`); }
        else if (a === 'afegir' || a === 'substituir' || a === 'treure' || a === 'prescripcio') {
          const key = blockKey(c.bloc);
          const op = { a, key };
          if (a !== 'afegir') {
            const ref = str(c.exercici), n = U.norm(ref);
            const found = (s.blocks || []).flatMap((b) => (b.items || []).map((it) => ({ b, it }))).find((x) => x.it.id === ref || (U.norm(x.it.name) === n && (!key || x.b.key === key)));
            if (!found) { warns.push(`No trobo l'exercici «${ref}» a la sessió.`); continue; }
            op.itemId = found.it.id; op.key = found.b.key; op.label = found.it.name;
          }
          if (a === 'afegir' || a === 'substituir') {
            const spec = resolveEx(c.nou, warns);
            if (!spec) continue;
            if (a === 'afegir' && !key) { warns.push('Falta el bloc on afegir l\'exercici.'); continue; }
            op.spec = spec;
          }
          if (a === 'prescripcio') {
            const f = c.camps || {};
            const over = {};
            for (const [k, v] of [['sets', f.series], ['reps', f.repeticions], ['load', f.carrega], ['intensity', f.intensitat], ['rest', f.descans], ['tempo', f.tempo], ['note', f.nota]]) if (v != null) over[k] = str(v);
            if (!Object.keys(over).length) { warns.push('Un canvi de prescripció no deia què canviar.'); continue; }
            op.over = over;
          }
          ops.push(op);
        } else warns.push(`Acció desconeguda «${a}».`);
      }
      if (!ops.length) return { error: warns.join(' ') || 'No hi ha cap canvi vàlid.' };
      const prop = addProposal(ctx, { kind: 'canvi', pid: s.patientId, ref: ctx.ps.ref(s.patientId), sid: s.id, title: `Canvis a la sessió del ${U.fmtDate(s.date)}`, why: str(i.motiu), warnings: warns, data: { ops } });
      return reply(prop);
    },

    proposar_pla(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      const warns = [];
      const sessions = (Array.isArray(i.sessions) ? i.sessions : []).slice(0, 40).map((s, k) => {
        const blocks = normBlocks(s.blocs, warns);
        return blocks.length ? { n: U.num(s.n) || k + 1, phase: str(s.fase), goal: str(s.objectiu), blocks } : null;
      }).filter(Boolean);
      if (!sessions.length) return { error: warns.join(' ') || 'El pla no té cap sessió vàlida.' };
      const days = (Array.isArray(i.dies) ? i.dies : [1, 4]).map(Number).filter((d) => d >= 0 && d <= 6);
      const prop = addProposal(ctx, { kind: 'pla', pid: r.pid, ref: ctx.ps.ref(r.pid), title: `Pla «${short(i.nom, 50)}» · ${U.plural(sessions.length, 'sessió', 'sessions')}`, why: str(i.motiu), warnings: warns,
        data: { name: str(i.nom), goal: str(i.objectiu), start: isDate(i.inici) ? str(i.inici) : U.today(), days: days.length ? days : [1, 4], sessions } });
      return reply(prop);
    },

    proposar_nota(i, ctx) {
      const r = pat(ctx, i.pacient);
      if (r.err) return r.err;
      const text = str(i.text);
      if (!text) return { error: 'La nota és buida.' };
      const prop = addProposal(ctx, { kind: 'nota', pid: r.pid, ref: ctx.ps.ref(r.pid), title: 'Nota als comentaris del pacient', why: '', warnings: [], data: { text: short(text, 1200) } });
      return reply(prop);
    },
  });

  return {
    definitions: () => DEFS.map((d) => ({ ...d })),
    async run(name, input, ctx) {
      const fn = RUN[name];
      if (!fn) return { error: `L'eina «${name}» no existeix.` };
      return fn(input || {}, ctx);
    },
    buildItem, buildBlocks, blockKey, RUN,
  };
})();

// ── Aplicar, descartar i desfer propostes (només la persona, des de la targeta) ──
const NoeActions = (() => {
  const note = (conv, text) => { conv.notes = conv.notes || []; conv.notes.push(text); };
  const pname = (prop) => { const p = Store.get('patients', prop.pid); return p ? U.fullName(p) : 'el pacient'; };

  function apply(conv, id) {
    const prop = (conv.proposals || {})[id];
    if (!prop) return { ok: false, message: 'No trobo aquesta proposta.' };
    if (prop.status === 'applied') return { ok: false, message: 'Aquesta proposta ja s\'ha aplicat.' };
    if (prop.status !== 'pending') return { ok: false, message: 'Aquesta proposta ja no es pot aplicar.' };
    const p = Store.get('patients', prop.pid);
    if (!p) return { ok: false, message: 'El pacient ja no existeix.' };
    const ids = [];
    const undo = {};
    let msg = '', route = null;
    if (prop.kind === 'sessio' || prop.kind === 'mes') {
      for (const s of prop.data.sessions) {
        if (s.skip) continue;
        const made = Store.addPlanned(prop.pid, { date: s.date, blocks: NoeTools.buildBlocks(s.blocks), goal: s.goal, pillar: s.pillar });
        ids.push(made.id);
      }
      undo.sessions = ids;
      msg = ids.length === 1 ? `Sessió creada per a ${pname(prop)}.` : `${U.plural(ids.length, 'sessió creada', 'sessions creades')} per a ${pname(prop)}.`;
      route = prop.kind === 'mes' && prop.data.month ? ['client', prop.pid, 'mes'] : ids.length === 1 ? ['sessio', ids[0]] : ['client', prop.pid, 'sessions'];
      if (prop.kind === 'mes' && prop.data.month && typeof MonthNav !== 'undefined') MonthNav.show(prop.pid, prop.data.month);
    } else if (prop.kind === 'canvi') {
      const cur = Store.get('sessions', prop.sid);
      if (!cur) return { ok: false, message: 'La sessió ja no existeix.' };
      if (cur.status === 'feta') return { ok: false, message: 'La sessió ja s\'ha fet: no es pot canviar.' };
      undo.before = U.clone(cur);
      let done = 0;
      Store.update('sessions', prop.sid, (x) => {
        for (const op of prop.data.ops) {
          if (op.a === 'canviar_objectiu') { x.goal = op.valor; done++; continue; }
          if (op.a === 'canviar_data') { x.date = op.valor; done++; continue; }
          let blk = (x.blocks || []).find((b) => b.key === op.key);
          if (op.a === 'afegir') {
            if (!blk) { blk = { key: op.key, focus: '', note: '', items: [] }; x.blocks = [...(x.blocks || []), blk].sort((a, b) => BLOCK_KEYS.indexOf(a.key) - BLOCK_KEYS.indexOf(b.key)); }
            blk.items = [...(blk.items || []), NoeTools.buildItem(op.spec)];
            done++;
            continue;
          }
          const k = blk ? (blk.items || []).findIndex((it) => it.id === op.itemId) : -1;
          if (k < 0) continue;
          if (op.a === 'treure') blk.items.splice(k, 1);
          else if (op.a === 'substituir') blk.items[k] = NoeTools.buildItem(op.spec);
          else if (op.a === 'prescripcio') Object.assign(blk.items[k], op.over);
          done++;
        }
      });
      msg = `${U.plural(done, 'canvi aplicat', 'canvis aplicats')} a la sessió del ${U.fmtDate(prop.data.ops.find((o) => o.a === 'canviar_data') ? prop.data.ops.find((o) => o.a === 'canviar_data').valor : cur.date)}.`;
      route = ['sessio', prop.sid];
    } else if (prop.kind === 'pla') {
      const d = prop.data;
      const plan = { id: U.uid('PL'), kind: 'plan', patientId: prop.pid, name: d.name || `Pla de ${d.sessions.length} sessions`, goal: d.goal, start: d.start, days: d.days,
        sessions: d.sessions.map((s) => ({ id: U.uid('PS'), n: s.n, phase: s.phase, goal: s.goal, blocks: BLOCKS.map((b) => {
          const sb = s.blocks.find((x) => x.key === b.key);
          return sb ? { key: b.key, focus: sb.focus || '', note: sb.note || '', items: sb.items.map(NoeTools.buildItem) } : Store.blankBlock(b.key);
        }) })), createdAt: new Date().toISOString() };
      Store.put('templates', plan, { immediate: true });
      undo.plan = plan.id;
      msg = `Pla creat per a ${pname(prop)}.`;
      route = ['client', prop.pid, 'pla'];
    } else if (prop.kind === 'nota') {
      undo.notes = p.notes || '';
      const line = `[NOE · ${U.fmtDate(U.today())}] ${prop.data.text}`;
      Store.update('patients', prop.pid, (x) => { x.notes = x.notes ? `${x.notes}\n${line}` : line; });
      msg = `Nota afegida als comentaris de ${pname(prop)}.`;
      route = ['client', prop.pid, 'fitxa'];
    }
    prop.status = 'applied';
    prop.undo = undo;
    prop.result = msg;
    prop.route = route;
    note(conv, `La persona ha APLICAT la proposta ${id} («${prop.title}»).`);
    return { ok: true, message: msg, route };
  }

  function discard(conv, id) {
    const prop = (conv.proposals || {})[id];
    if (!prop || prop.status !== 'pending') return { ok: false, message: 'Aquesta proposta ja no es pot descartar.' };
    prop.status = 'discarded';
    note(conv, `La persona ha DESCARTAT la proposta ${id} («${prop.title}»).`);
    return { ok: true, message: 'Proposta descartada.' };
  }

  function undo(conv, id) {
    const prop = (conv.proposals || {})[id];
    if (!prop || prop.status !== 'applied') return { ok: false, message: 'No es pot desfer.' };
    const u = prop.undo || {};
    if (u.sessions) for (const sid of u.sessions) { const s = Store.get('sessions', sid); if (s && s.status !== 'feta') Store.remove('sessions', sid); }
    if (u.before) Store.put('sessions', u.before, { immediate: true });
    if (u.plan) Store.remove('templates', u.plan);
    if (u.notes != null && prop.kind === 'nota') Store.update('patients', prop.pid, (x) => { x.notes = u.notes; });
    prop.status = 'undone';
    note(conv, `La persona ha DESFET la proposta ${id} («${prop.title}»).`);
    return { ok: true, message: 'Canvis desfets.' };
  }

  return { apply, discard, undo };
})();
