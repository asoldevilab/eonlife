/* EON Life · càlculs automàtics (asimetries, Y-Balance, salts, patrons, càrrega de sessió)
   i conversió dels registres a columnes llegibles per al full de càlcul. */

const T = THRESHOLDS;
const SIDE = { d: 'Dreta', e: 'Esquerra' };

const Calc = {
  // Asimetria entre costats: |D − E| / max(D, E) × 100
  asym(d, e) {
    const a = U.num(d), b = U.num(e);
    if (a == null || b == null) return null;
    const max = Math.max(Math.abs(a), Math.abs(b));
    if (max === 0) return { pct: 0, diff: 0 };
    return { pct: (Math.abs(a - b) / max) * 100, diff: a - b };
  },

  asymTone(pct) {
    if (pct == null) return '';
    if (pct >= T.asymAlert) return 'bad';
    if (pct >= T.asymWarn) return 'warn';
    return 'ok';
  },

  perKg(v, weight) {
    const a = U.num(v), w = U.num(weight);
    return a != null && w ? a / w : null;
  },

  weight(a) { return U.num(a && a.general && a.general.weight); },

  // Un test té algun resultat (les notes, les fotos i els vídeos no compten).
  testHasData(x) { return !!x && Object.entries(x).some(([k, v]) => !MEDIA_KEYS.includes(k) && v !== '' && v != null && v !== false && !(typeof v === 'number' && Number.isNaN(v))); },
  // Tests i grups que ja no es fan (retired al catàleg): només surten a les valoracions que ja en tenen dades.
  testOn(a, t) { return !t.retired || Calc.testHasData(((a && a.values) || {})[t.id]); },
  // Un grup es dona per retirat si ho està ell o si ho estan tots els seus tests (p. ex. la neurodinàmia).
  groupOn(a, g) {
    const tests = g.tests || [];
    if (!g.retired && !(tests.length && tests.every((t) => t.retired))) return true;
    if (g.kind === 'encoder') return ((a && a.encoder && a.encoder.rows) || []).some((r) => r && (String(r.name || '').trim() || U.num(r.load) != null || U.num(r.vel) != null || U.num(r.power) != null));
    return tests.some((t) => Calc.testHasData(((a && a.values) || {})[t.id]));
  },
  // Codi dels exercicis EON (gravats pel centre): «1.3» = bloc 1 (mobilitat), número 3.
  codeKey(code) {
    const m = String(code || '').trim().match(/^(\d+)\.(\d+)$/);
    return m ? [Number(m[1]), Number(m[2])] : null;
  },
  byCode(a, b) {
    const x = Calc.codeKey(a.code) || [99, 999], y = Calc.codeKey(b.code) || [99, 999];
    return x[0] - y[0] || x[1] - y[1] || String(a.name || '').localeCompare(String(b.name || ''), 'ca');
  },
  // Següent número lliure d'un bloc: després del més alt (si no n'hi ha cap, el .0).
  nextCode(list, num) {
    const used = (list || []).map((e) => Calc.codeKey(e.code)).filter((k) => k && k[0] === num).map((k) => k[1]);
    return `${num}.${used.length ? Math.max(...used) + 1 : 0}`;
  },
  bmi(weight, height) {
    const w = U.num(weight), h = U.num(height);
    return w && h ? w / ((h / 100) ** 2) : null;
  },
  // Pes i alçada del client: els de la fitxa i, si no n'hi ha, els de l'última valoració que en tingui.
  body(p, assessments) {
    const withG = (k) => [...(assessments || [])].reverse().find((a) => U.num(a.general && a.general[k]) != null);
    const pick = (k) => {
      if (U.num(p && p[k]) != null) return { v: U.num(p[k]), date: null };
      const a = withG(k);
      return a ? { v: U.num(a.general[k]), date: a.date } : { v: null, date: null };
    };
    const weight = pick('weight'), height = pick('height');
    return { weight, height, bmi: Calc.bmi(weight.v, height.v) };
  },

  // Y-Balance: composite = (ANT + PM + PL) / (3 × longitud de cama) × 100
  ybt(a) {
    const y = (a && a.ybt) || {};
    const side = (s) => {
      const x = y[s] || {};
      const ant = U.num(x.ant), pm = U.num(x.pm), pl = U.num(x.pl), len = U.num(x.len);
      const comp = ant != null && pm != null && pl != null && len ? ((ant + pm + pl) / (3 * len)) * 100 : null;
      return { ant, pm, pl, len, comp };
    };
    const d = side('d'), e = side('e');
    const diff = (k) => (d[k] != null && e[k] != null ? Math.abs(d[k] - e[k]) : null);
    return { d, e, antDiff: diff('ant'), pmDiff: diff('pm'), plDiff: diff('pl'), compDiff: diff('comp') };
  },

  // Ràtio isquiotibials / quàdriceps (leg curl 90/90 ÷ leg extension) per costat.
  hq(a) {
    const v = (a && a.values) || {};
    const q = v.dyn_knee_ext || {}, hs = v.dyn_curl_90 || {};
    const r = (s) => {
      const qq = U.num(q[s]), hh = U.num(hs[s]);
      return qq && hh != null ? hh / qq : null;
    };
    return { d: r('d'), e: r('e') };
  },

  // Resum dels salts (My Jump) per tipus de prova.
  jumps(a) {
    const list = ((a && a.jumps && a.jumps.attempts) || []).filter((x) => U.num(x.height) != null || U.num(x.power) != null);
    const w = Calc.weight(a);
    const byType = {};
    for (const x of list) {
      const t = x.type || 'CMJ';
      (byType[t] = byType[t] || []).push(x);
    }
    const out = {};
    for (const [type, rows] of Object.entries(byType)) {
      const col = (k) => rows.map((r) => U.num(r[k])).filter((n) => n != null);
      const max = (k) => { const c = col(k); return c.length ? Math.max(...c) : null; };
      const mean = (k) => { const c = col(k); return c.length ? c.reduce((s, n) => s + n, 0) / c.length : null; };
      const bestPower = max('power');
      out[type] = {
        n: rows.length,
        best: max('height'), mean: mean('height'),
        bestPower, meanPower: mean('power'), relPower: bestPower != null && w ? bestPower / w : null,
        bestForce: max('force'), meanForce: mean('force'),
        bestVel: max('velocity'), meanVel: mean('velocity'),
        bestRsi: max('rsimod'),
      };
    }
    return out;
  },

  cmj(a) { return Calc.jumps(a).CMJ || null; },

  bike(a) {
    const b = (a && a.bike) || {};
    const w = Calc.weight(a);
    const peak = U.num(b.peak), mean = U.num(b.mean), min = U.num(b.min);
    return {
      peak, mean, min,
      peakRel: peak != null && w ? peak / w : null,
      meanRel: mean != null && w ? mean / w : null,
      fatigue: peak && min != null ? ((peak - min) / peak) * 100 : null,
    };
  },

  // Puntuació d'un patró: als unilaterals ens quedem amb el pitjor costat.
  patternScore(p, uni) {
    if (!p) return '';
    if (!uni) return p.score || '';
    const sd = p.sd || '', se = p.se || '';
    if (!sd && !se) return '';
    if (!sd) return se;
    if (!se) return sd;
    return SCORE_RANK[sd] >= SCORE_RANK[se] ? sd : se;
  },

  patterns(a) {
    const counts = { '0': 0, '-': 0, '--': 0, P: 0 };
    let scored = 0;
    for (const pt of PATTERNS) {
      const p = (a && a.patterns && a.patterns[pt.id]) || null;
      const s = Calc.patternScore(p, pt.uni);
      if (s) { counts[s]++; scored++; }
      if (p && p.pain) counts.P++;
    }
    return { counts, scored, total: PATTERNS.length };
  },

  scoreInfo(v) { return SCORES.find((s) => s.v === v) || null; },

  // " (dreta: a millorar · esquerra: competent)" quan els costats no coincideixen.
  sidesDetail(p) {
    if (!p || !p.sd || !p.se || p.sd === p.se) return '';
    const label = (v) => String((Calc.scoreInfo(v) || { label: v }).label).toLowerCase();
    return ` (dreta: ${label(p.sd)} · esquerra: ${label(p.se)})`;
  },

  // Punts d'atenció automàtics de la valoració.
  alerts(a) {
    const out = [];
    if (!a) return out;
    const v = a.values || {};
    const add = (tone, section, text) => out.push({ tone, section, text });

    for (const t of Object.values(TEST_INDEX)) {
      const x = v[t.id];
      if (!x) continue;
      if (t.kind === 'bi') {
        const d = U.num(x.d), e = U.num(x.e);
        if (t.rule === 'wblt') {
          for (const s of ['d', 'e']) {
            const val = U.num(x[s]);
            if (val != null && val < T.wbltMin) add('bad', t.section, `Dorsiflexió de turmell limitada (${SIDE[s].toLowerCase()}): ${U.fmt(val)} cm, per sota de ${T.wbltMin} cm.`);
          }
          if (d != null && e != null && Math.abs(d - e) >= T.wbltDiff) add('bad', t.section, `Diferència de ${U.fmt(Math.abs(d - e))} cm entre turmells al knee-to-wall (≥ ${T.wbltDiff} cm).`);
          continue;
        }
        if (t.diffOnly) continue;
        const as = Calc.asym(d, e);
        if (as && as.pct >= T.asymWarn) {
          add(as.pct >= T.asymAlert ? 'bad' : 'warn', t.section,
            `${t.name}: ${U.fmt(as.pct, 0)} % d'asimetria (D ${U.fmt(d)} · E ${U.fmt(e)} ${t.unit}).`);
        }
      } else if (t.kind === 'biSelect' || t.kind === 'select') {
        const pos = (val) => val && /^Positiu/.test(val);
        if (t.kind === 'select' && pos(x.v)) add('warn', t.section, `${t.name}: ${x.v.toLowerCase()}.`);
        if (t.kind === 'biSelect') {
          const sides = ['d', 'e'].filter((s) => pos(x[s]));
          if (sides.length) add('warn', t.section, `${t.name} positiu (${sides.map((s) => SIDE[s].toLowerCase()).join(' i ')}).`);
        }
      } else if (t.kind === 'scoreBi') {
        const s = Calc.patternScore(x, true);
        if (s === '--') add('bad', t.section, `${t.name}: limitació clara${Calc.sidesDetail(x)}.`);
        else if (s === '-') add('warn', t.section, `${t.name}: a millorar${Calc.sidesDetail(x)}.`);
        if (x.pain) add('bad', t.section, `${t.name}: dolor o símptomes (P) · derivar al fisio.`);
      }
    }

    const y = Calc.ybt(a);
    if (y.antDiff != null && y.antDiff >= T.ybtAntDiff) add('bad', 'forca', `Y-Balance: diferència de ${U.fmt(y.antDiff)} cm en la direcció anterior (≥ ${T.ybtAntDiff} cm).`);

    for (const pt of PATTERNS) {
      const p = a.patterns && a.patterns[pt.id];
      if (!p) continue;
      const s = Calc.patternScore(p, pt.uni);
      const detail = pt.uni ? Calc.sidesDetail(p) : '';
      if (s === '--') add('bad', 'patrons', `${pt.name}: limitació clara${detail}.`);
      else if (s === '-') add('warn', 'patrons', `${pt.name}: a millorar${detail}.`);
      if (p.pain) add('bad', 'patrons', `${pt.name}: dolor o símptomes (P) · derivar al fisio.`);
    }

    const rank = { bad: 0, warn: 1, info: 2 };
    return out.sort((x, z) => rank[x.tone] - rank[z.tone]);
  },

  // Mètriques per seguir l'evolució entre valoracions.
  metrics() {
    const list = [
      { id: 'cmj', label: 'CMJ · millor altura', unit: 'cm', get: (a) => { const c = Calc.cmj(a); return c ? c.best : null; } },
      { id: 'cmjPow', label: 'CMJ · potència relativa', unit: 'W/kg', get: (a) => { const c = Calc.cmj(a); return c ? c.relPower : null; } },
      { id: 'ybt', label: 'Y-Balance · composite', unit: '%', bi: true, get: (a) => { const y = Calc.ybt(a); return { d: y.d.comp, e: y.e.comp }; } },
      { id: 'patterns', label: 'Patrons competents', unit: `de ${PATTERNS.length}`, get: (a) => { const p = Calc.patterns(a); return p.scored ? p.counts['0'] : null; } },
      { id: 'weight', label: 'Pes corporal', unit: 'kg', neutral: true, get: (a) => Calc.weight(a) },
    ];
    for (const t of Object.values(TEST_INDEX)) {
      if (t.kind === 'bi') {
        list.push({ id: t.id, label: t.name, unit: t.unit, bi: true, lowerBetter: !!t.lowerBetter,
          get: (a) => { const x = (a.values || {})[t.id] || {}; return { d: U.num(x.d), e: U.num(x.e) }; } });
        if (t.perKg) list.push({ id: `${t.id}_kg`, label: `${t.name} (relativa)`, unit: 'N/kg', bi: true,
          get: (a) => { const x = (a.values || {})[t.id] || {}; return { d: Calc.perKg(x.d, Calc.weight(a)), e: Calc.perKg(x.e, Calc.weight(a)) }; } });
      } else if (t.kind === 'single') {
        list.push({ id: t.id, label: t.name, unit: t.unit, lowerBetter: !!t.lowerBetter,
          get: (a) => U.num(((a.values || {})[t.id] || {}).v) });
      }
    }
    return list;
  },

  // Wellness: total sobre 25 quan hi ha les 5 respostes, mitjana i respostes baixes (1 o 2).
  wellness(w) {
    const x = w || {};
    const vals = WELLNESS.map((q) => U.num(x[q.k]));
    const given = vals.filter((v) => v != null);
    if (!given.length) return null;
    const avg = given.reduce((s, v) => s + v, 0) / given.length;
    return {
      total: given.length === WELLNESS.length ? given.reduce((s, v) => s + v, 0) : null,
      avg, n: given.length,
      low: WELLNESS.filter((q, i) => vals[i] != null && vals[i] <= 2).map((q) => q.label),
      tone: avg < 2.5 ? 'bad' : avg < 3.5 ? 'warn' : 'ok',
    };
  },

  // Comparació amb la valoració anterior (només mètriques amb valor a totes dues).
  // Mètriques clau per a l'informe del client.
  KEY_METRICS: ['cmj', 'cmjPow', 'ybt', 'wblt', 'dyn_knee_ext_kg', 'dyn_curl_90_kg', 'dyn_squeeze_kg', 'patterns', 'weight',
    'rom_hip_ir', 'rom_hip_er'],

  compare(cur, prev, onlyKey = false) {
    if (!cur || !prev) return [];
    const rows = [];
    const list = onlyKey ? Calc.KEY_METRICS.map((id) => Calc.metrics().find((m) => m.id === id)).filter(Boolean) : Calc.metrics();
    for (const m of list) {
      const a = m.get(cur), b = m.get(prev);
      const push = (label, x, y) => {
        if (x == null || y == null) return;
        const delta = x - y;
        const better = m.neutral || Math.abs(delta) < 1e-9 ? null : (m.lowerBetter ? delta < 0 : delta > 0);
        rows.push({ id: m.id, label, unit: m.unit, prev: y, cur: x, delta, better });
      };
      if (m.bi) {
        push(`${m.label} · D`, a && a.d, b && b.d);
        push(`${m.label} · E`, a && a.e, b && b.e);
      } else push(m.label, a, b);
    }
    return rows;
  },

  // Apartat del protocol al qual pertany una mètrica (per als informes d'un sol apartat).
  area(metricId) {
    if (metricId === 'cmj' || metricId === 'cmjPow') return 'rendiment';
    if (metricId === 'ybt') return 'forca';
    if (metricId === 'patterns') return 'patrons';
    if (metricId === 'weight') return 'tot';
    const t = TEST_INDEX[String(metricId).replace(/_kg$/, '')];
    return (t && t.section) || 'altres';
  },

  // Vídeos enllaçats a una valoració, amb l'apartat on s'han gravat.
  videos(a) {
    const out = [];
    const v = a.values || {};
    const add = (area, label, url) => { if (U.isUrl(url)) out.push({ area, label, url: String(url).trim() }); };
    add('tot', 'Vídeo general', (a.general || {}).video);
    for (const sec of PROTOCOL) {
      for (const g of sec.groups) {
        for (const t0 of g.tests || []) {
          const t = TEST_INDEX[t0.id], x = v[t.id] || {};
          add(sec.id, t.name, x.video);
          for (const m of t.videos || []) add(sec.id, `${t.name} · ${m.label.toLowerCase()}`, x[m.k]);
        }
        if (g.kind === 'ybt') {
          add(sec.id, 'Y-Balance Test', (a.ybt || {}).video);
          for (const m of YBT_VIDEOS) add(sec.id, `Y-Balance Test · ${m.label.toLowerCase()}`, (a.ybt || {})[m.k]);
        }
        if (g.kind === 'jumps') add(sec.id, 'Salts · CMJ', (a.jumps || {}).video);
        if (g.kind === 'patterns') {
          for (const pt of PATTERNS) {
            const x = (a.patterns || {})[pt.id] || {};
            add(sec.id, pt.name, x.video);
            for (const m of pt.videos || []) add(sec.id, `${pt.name} · ${m.label.toLowerCase()}`, x[m.k]);
          }
        }
      }
    }
    return out;
  },

  // ── Encoder (ADR) i plataforma de salts (ADR Jumping): registre per sèries d'un exercici ──
  // Pèrdua de velocitat: la que dona l'encoder o, si no, (1a rep − última) / 1a rep.
  vl(set) {
    const v = U.num(set.vl);
    if (v != null) return v;
    const a = U.num(set.v1), b = U.num(set.vlast);
    return a && b != null ? ((a - b) / a) * 100 : null;
  },
  vbt(it) {
    const x = it && it.vbt;
    const sets = ((x && x.sets) || []).filter((st) => Object.entries(st).some(([k, v]) => k !== 'id' && v !== '' && v != null));
    if (!sets.length) return null;
    const nums = (k) => sets.map((st) => U.num(st[k])).filter((v) => v != null);
    const max = (k) => (nums(k).length ? Math.max(...nums(k)) : null);
    const mean = (arr) => (arr.length ? arr.reduce((s, v) => s + v, 0) / arr.length : null);
    const vls = sets.map((st) => Calc.vl(st)).filter((v) => v != null);
    const mode = x.mode === 'salts' ? 'salts' : 'encoder';
    const out = { mode, sets: sets.length, load: max('kg'), v1: max('v1'), vl: mean(vls), pmax: max('pmax'), h: max('h'), hmean: mean(nums('hmean')), rsi: max('rsi') };
    out.text = mode === 'salts'
      ? [out.h != null && `Salt millor ${U.fmt(out.h, 1)} cm`, out.hmean != null && `mitjana ${U.fmt(out.hmean, 1)} cm`, out.rsi != null && `RSI ${U.fmtFixed(out.rsi, 2)}`].filter(Boolean).join(' · ')
      : [out.v1 != null && `V 1a rep ${U.fmtFixed(out.v1, 2)} m/s`, out.vl != null && `PV ${U.fmt(out.vl, 0)} %`, out.pmax != null && `${U.fmt(out.pmax, 0)} W`].filter(Boolean).join(' · ');
    out.detail = sets.map((st, i) => (mode === 'salts'
      ? `S${i + 1}: ${[st.reps && `${st.reps} salts`, st.h && `${st.h} cm`, st.rsi && `RSI ${st.rsi}`].filter(Boolean).join(' ')}`
      : `S${i + 1}: ${[st.kg && `${st.kg} kg`, st.reps && `×${st.reps}`, (st.v1 || st.vlast) && `${st.v1 || '—'}→${st.vlast || '—'} m/s`, Calc.vl(st) != null && `PV ${U.fmt(Calc.vl(st), 0)} %`, st.pmax && `${st.pmax} W`].filter(Boolean).join(' ')}`)).join(' | ');
    return out;
  },

  // ── Sessions ──
  presc(it) {
    if (!it) return '';
    const s = String(it.sets || '').trim(), r = String(it.reps || '').trim();
    const parts = [];
    if (s && r) parts.push(`${s} × ${r}`);
    else if (r) parts.push(r);
    else if (s) parts.push(`${s} ${s === '1' ? 'sèrie' : 'sèries'}`);
    const load = Calc.load(it.load);
    if (load) parts.push(load);
    if (it.intensity) parts.push(String(it.intensity).trim());
    if (it.rest) parts.push(`desc. ${String(it.rest).trim()}`);
    if (it.tempo) parts.push(`tempo ${String(it.tempo).trim()}`);
    return parts.join(' · ');
  },

  // "60" → "60 kg"; qualsevol altre text es manté tal qual ("30-30 kg", "goma verda").
  load(v) {
    const s = String(v || '').trim();
    if (!s || /^0+([.,]0+)?$/.test(s)) return ''; // 0 = pes corporal: no cal escriure-ho
    return /^\d+([.,]\d+)?$/.test(s) ? `${s.replace('.', ',')} kg` : s;
  },

  sessionLoad(s) {
    const f = (s && s.feedback) || {};
    const rpe = U.num(f.rpe), min = U.num(f.duration);
    return rpe != null && min != null ? rpe * min : null;
  },

  itemCount(s) {
    return ((s && s.blocks) || []).reduce((n, b) => n + (b.items || []).filter((i) => i.name).length, 0);
  },

  // Quilos d'un exercici: els de l'encoder si n'hi ha; si no, l'últim número de la càrrega («2 × 16 kg» → 16).
  kg(it) {
    const v = Calc.vbt(it);
    if (v && v.load != null) return v.load;
    const m = String((it && it.load) || '').replace(/,/g, '.').match(/\d+(\.\d+)?/g);
    return m ? Number(m[m.length - 1]) || null : null;
  },

  // Progrés entre dues sessions: cada exercici de la sessió nova amb el de la sessió antiga que li correspon
  // (el mateix exercici; si no, el de la mateixa família de progressió; si no, el de la mateixa posició del bloc).
  progress(from, to, exercise = () => null) {
    const named = (s, key) => ((((s && s.blocks) || []).find((b) => b.key === key) || {}).items || []).filter((i) => i.name);
    const fam = (it) => { const e = it && it.exId ? exercise(it.exId) : null; return e && e.family ? U.norm(e.family) : ''; };
    const lvl = (it) => { const e = it && it.exId ? exercise(it.exId) : null; return e ? U.num(e.level) : null; };
    const sum = { rows: 0, levelUp: 0, loadUp: 0, speedUp: 0 };
    const blocks = [];
    for (const def of BLOCKS) {
      const a = named(from, def.key), b = named(to, def.key);
      if (!b.length) continue;
      const used = new Set();
      const rows = b.map((it, i) => {
        const pick = (fn) => a.find((x, k) => !used.has(k) && fn(x, k));
        let match = 'name';
        let prev = pick((x) => U.norm(x.name) === U.norm(it.name));
        if (!prev && fam(it)) { prev = pick((x) => fam(x) === fam(it)); match = 'family'; }
        if (!prev) { prev = pick((x, k) => k === i); match = 'pos'; }
        if (!prev) match = null;
        else used.add(a.indexOf(prev));
        const d = (x, y) => (x != null && y != null ? Math.round((y - x) * 1000) / 1000 : null);
        const level = { a: lvl(prev), b: lvl(it) };
        level.diff = match === 'family' || match === 'name' ? d(level.a, level.b) : null;
        const same = match === 'name';
        const kg = { a: same ? Calc.kg(prev) : null, b: Calc.kg(it) };
        kg.diff = d(kg.a, kg.b);
        kg.pct = kg.diff != null && kg.a ? Math.round((kg.diff / kg.a) * 100) : null;
        const va = same ? Calc.vbt(prev) : null, vb = Calc.vbt(it);
        const v1 = { a: va && va.v1, b: vb && vb.v1, la: va && va.load, lb: vb && vb.load };
        v1.diff = d(v1.a, v1.b);
        sum.rows++;
        if (level.diff > 0) sum.levelUp++;
        if (kg.diff > 0) sum.loadUp++;
        if (v1.diff > 0) sum.speedUp++;
        return { before: prev || null, now: it, match, level, kg, v1 };
      });
      blocks.push({ key: def.key, rows });
    }
    return { blocks, summary: sum };
  },

  // Data prevista de la sessió n d'un pla: a partir de la data d'inici, els dies de la setmana triats.
  planDate(plan, n) { return Calc.planDates(plan, n)[n - 1] || ''; },
  planDates(plan, count) {
    const days = (plan && plan.days && plan.days.length ? plan.days : [1, 4]).map(Number);
    const total = count || ((plan && plan.sessions) || []).length;
    const out = [];
    let d = (plan && U.parse(plan.start) && plan.start) || U.today(); // sense data d'inici (o amb una de malmesa) es compta des d'avui
    for (let i = 0; i < 800 && out.length < total; i++, d = U.addDays(d, 1)) if (days.includes(U.parse(d).getDay())) out.push(d);
    return out;
  },

  // Subblocs d'un bloc de la sessió (p. ex. Força principal › Bloc 1, Bloc 2…).
  // Retorna null si el bloc no està dividit; si ho està, cada subbloc amb els seus exercicis
  // ({ it, i } amb i = posició a block.items). Un exercici sense subbloc va al primer.
  groups(b) {
    const gs = (b && b.groups) || [];
    if (!gs.length) return null;
    const out = gs.map((g, n) => ({ g, n: n + 1, label: Calc.groupLabel(g, n), items: [] }));
    (b.items || []).forEach((it, i) => { (out.find((x) => x.g.id === it.g) || out[0]).items.push({ it, i }); });
    return out;
  },
  groupLabel(g, n) { return `Bloc ${n + 1}${g && g.name ? ` · ${g.name}` : ''}`; },
  // Ordena els exercicis segons l'ordre dels subblocs (manté l'ordre dins de cada subbloc).
  sortByGroups(b) {
    const gs = b.groups || [];
    if (!gs.length) return;
    const pos = (it) => { const k = gs.findIndex((g) => g.id === it.g); return k < 0 ? 0 : k; };
    b.items = (b.items || []).map((it, i) => ({ it, i })).sort((x, y) => pos(x.it) - pos(y.it) || x.i - y.i).map((x) => x.it);
  },

  // Resum setmanal (dilluns a diumenge) de sessions fetes.
  weeks(sessions, fromWeek, count) {
    const out = [];
    for (let i = 0; i < count; i++) {
      const start = U.addDays(fromWeek, i * 7);
      const end = U.addDays(start, 6);
      const list = sessions.filter((s) => s.date >= start && s.date <= end);
      const done = list.filter((s) => s.status === 'feta');
      const loads = done.map(Calc.sessionLoad).filter((n) => n != null);
      const rpes = done.map((s) => U.num(s.feedback && s.feedback.rpe)).filter((n) => n != null);
      out.push({
        start, end, sessions: list.length, done: done.length,
        load: loads.length ? loads.reduce((a, b) => a + b, 0) : 0,
        rpe: rpes.length ? rpes.reduce((a, b) => a + b, 0) / rpes.length : null,
      });
    }
    return out;
  },

  retestDue(assessments) {
    const last = U.sortBy(assessments, 'date', -1)[0];
    if (!last) return null;
    const due = last.nextRetest || U.addMonths(last.date, T.retestMonths);
    return { last, due, days: U.diffDays(U.today(), due) };
  },
};

// ── Columnes llegibles per al full de càlcul ──
const Flat = {
  patient(p) {
    return {
      'Nom': p.firstName || '', 'Cognoms': p.lastName || '',
      'Data naixement': p.birthDate || '', 'Edat': U.age(p.birthDate) ?? '',
      'Sexe': (OPT.sex.find((o) => o.v === p.sex) || {}).label || '',
      'Servei': (OPT.services.find((o) => o.v === p.service) || {}).label || '',
      'Professional': p.professional || '',
      'Estat': (OPT.status.find((o) => o.v === p.status) || {}).label || '',
      'Data alta': p.startDate || '', 'Email': p.email || '', 'Telèfon': p.phone || '',
      'Objectiu': p.goal || '', 'Motiu de consulta': p.reason || '', 'Antecedents': p.history || '',
      'Data IQ': p.surgeryDate || '', 'IQ': p.surgeryNote || '',
      'Data lesió': p.injuryDate || '', 'Lesió': p.injuryNote || '',
      'Carpeta del pacient': p.folderUrl || '', 'Comentaris del professional': p.notes || '',
      'Alçada (cm)': U.num(p.height) ?? '', 'Pes (kg)': U.num(p.weight) ?? '',
      'Dominància': (OPT.dominance.find((o) => o.v === p.dominance) || {}).label || '',
      'Nivell d\'activitat': (OPT.activityLevels.find((o) => o.v === p.activityLevel) || {}).label || '',
      'Esport o activitat': p.sport || '', 'Professió': p.occupation || '', 'Disponibilitat': p.availability || '',
      'Condicions de salut': p.conditions || '', 'Limitacions per entrenar': p.limitations || '', 'Medicació': p.medication || '',
      'Contacte d\'emergència': p.emergency || '',
    };
  },

  strict: false,

  assessment(a, p) {
    const out = {};
    // "o" avisa (en mode estricte, als tests) si dues columnes tenen el mateix nom.
    const o = new Proxy(out, {
      set(target, key, value) {
        if (Flat.strict && Object.prototype.hasOwnProperty.call(target, key)) throw new Error(`Columna duplicada: ${String(key)}`);
        target[key] = value;
        return true;
      },
    });
    const v = a.values || {};
    const n = (x) => (x == null ? '' : U.round(x, 2));
    o['Pacient'] = U.fullName(p);
    o['Data'] = a.date || '';
    o['Tipus'] = (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || '';
    o['Professional'] = a.professional || '';
    o['Pes (kg)'] = n(U.num(a.general && a.general.weight));
    o['Alçada (cm)'] = n(U.num(a.general && a.general.height));
    o['Motiu / objectiu'] = (a.general && a.general.goal) || '';
    Object.assign(o, Flat.wellness(a.wellness));
    o['Informes adjunts'] = (a.files || []).map((f) => `${f.name}${f.url ? ` (${f.url})` : ''}`).join('\n');
    const w = Calc.weight(a);

    for (const sec of PROTOCOL) {
      for (const g of sec.groups) {
        for (const t0 of g.tests || []) {
          const t = TEST_INDEX[t0.id];
          if (!Calc.testOn(a, t)) continue; // un test que ja no es fa només té columnes si aquesta valoració en té dades
          const x = v[t.id] || {};
          const label = t.col;
          if (t.kind === 'bi') {
            o[`${label} D (${t.unit})`] = n(U.num(x.d));
            o[`${label} E (${t.unit})`] = n(U.num(x.e));
            if (t.diffOnly) {
              const dd = U.num(x.d), ee = U.num(x.e);
              o[`${label} diferència (${t.unit})`] = dd != null && ee != null ? n(dd - ee) : '';
            } else {
              const as = Calc.asym(x.d, x.e);
              o[`${label} asimetria (%)`] = as ? n(as.pct) : '';
            }
            if (t.perKg) {
              o[`${label} D (N/kg)`] = n(Calc.perKg(x.d, w));
              o[`${label} E (N/kg)`] = n(Calc.perKg(x.e, w));
            }
          } else if (t.kind === 'single') o[`${label} (${t.unit})`] = n(U.num(x.v));
          else if (t.kind === 'select') o[label] = x.v || '';
          else if (t.kind === 'biSelect') { o[`${label} D`] = x.d || ''; o[`${label} E`] = x.e || ''; }
          else if (t.kind === 'scoreBi') {
            o[`${label} D`] = Flat.sym(x.sd); o[`${label} E`] = Flat.sym(x.se);
            o[`${label} (pitjor)`] = Flat.sym(Calc.patternScore(x, true));
            o[`${label} P`] = x.pain ? 'P' : '';
          }
          // Enllaços a les fotos i als vídeos de cada costat (carpeta del client).
          const side = (m) => (m.k.endsWith('D') ? ' D' : m.k.endsWith('E') ? ' E' : '');
          for (const m of t.photos || []) o[`${label} foto${side(m)}`] = x[m.k] || '';
          for (const m of t.videos || []) o[`${label} vídeo${side(m)}`] = x[m.k] || '';
        }
        if (g.kind === 'ybt') {
          const y = Calc.ybt(a);
          for (const s of ['d', 'e']) {
            const S = s.toUpperCase();
            o[`YBT anterior ${S} (cm)`] = n(y[s].ant);
            o[`YBT posteromedial ${S} (cm)`] = n(y[s].pm);
            o[`YBT posterolateral ${S} (cm)`] = n(y[s].pl);
            o[`YBT longitud cama ${S} (cm)`] = n(y[s].len);
            o[`YBT composite ${S} (%)`] = n(y[s].comp);
          }
          o['YBT diferència anterior (cm)'] = n(y.antDiff);
          o['YBT vídeo D'] = (a.ybt || {}).videoD || '';
          o['YBT vídeo E'] = (a.ybt || {}).videoE || '';
        }
        if (g.kind === 'jumps') {
          const j = Calc.jumps(a);
          const c = j.CMJ || {};
          o['CMJ millor altura (cm)'] = n(c.best);
          o['CMJ altura mitjana (cm)'] = n(c.mean);
          o['CMJ millor potència (W)'] = n(c.bestPower);
          o['CMJ potència relativa (W/kg)'] = n(c.relPower);
          o['CMJ millor força (N)'] = n(c.bestForce);
          o['CMJ millor velocitat (m/s)'] = n(c.bestVel);
          o['CMJ millor RSI-mod'] = n(c.bestRsi);
          o['CMJ intents'] = c.n || '';
          for (const [type, s] of Object.entries(j)) {
            if (type === 'CMJ') continue;
            o[`${type} millor altura (cm)`] = n(s.best);
          }
          o['Estat de forma (My Jump)'] = (a.jumps && a.jumps.readiness) || '';
        }
        if (g.kind === 'encoder') {
          for (const r of (a.encoder && a.encoder.rows) || []) {
            if (!r.name) continue;
            o[`Encoder ${r.name} càrrega (kg)`] = n(U.num(r.load));
            o[`Encoder ${r.name} velocitat (m/s)`] = n(U.num(r.vel));
            o[`Encoder ${r.name} potència (W)`] = n(U.num(r.power));
          }
        }
        if (g.kind === 'bike') {
          const b = Calc.bike(a);
          o['Bike pic (W)'] = n(b.peak); o['Bike pic (W/kg)'] = n(b.peakRel);
          o['Bike mitjana (W)'] = n(b.mean); o['Bike mitjana (W/kg)'] = n(b.meanRel);
          o['Bike índex de fatiga (%)'] = n(b.fatigue);
        }
        if (g.kind === 'patterns') {
          for (const pt of PATTERNS) {
            const p = (a.patterns || {})[pt.id] || {};
            if (pt.uni) { o[`${pt.name} D`] = Flat.sym(p.sd); o[`${pt.name} E`] = Flat.sym(p.se); }
            o[`${pt.name} (puntuació)`] = Flat.sym(Calc.patternScore(p, pt.uni));
            if (pt.seconds) { o[`${pt.name} D (s)`] = n(U.num(p.secD)); o[`${pt.name} E (s)`] = n(U.num(p.secE)); }
            o[`${pt.name} P`] = p.pain ? 'P' : '';
            o[`${pt.name} compensacions`] = (p.chips || []).join(', ');
            for (const m of pt.videos || []) o[`${pt.name} vídeo ${m.k.slice(-1)}`] = p[m.k] || '';
          }
          const pc = Calc.patterns(a).counts;
          o['Patrons 0'] = pc['0']; o['Patrons −'] = pc['-']; o['Patrons −−'] = pc['--']; o['Patrons P'] = pc.P;
        }
        if (g.kind === 'free') {
          for (const r of a.free || []) {
            if (!r.name) continue;
            const unit = r.unit ? ` (${r.unit})` : '';
            if (r.d !== '' && r.d != null) o[`${r.name} D${unit}`] = r.d;
            if (r.e !== '' && r.e != null) o[`${r.name} E${unit}`] = r.e;
            if (r.v !== '' && r.v != null) o[`${r.name}${unit}`] = r.v;
          }
        }
      }
    }
    const c = a.conclusions || {};
    o['Punts forts'] = c.strengths || '';
    o['Prioritats'] = c.priorities || '';
    o['Decisions per al pla'] = c.plan || '';
    o['RPE de la valoració (1-10)'] = n(U.num(a.rpe));
    o['Punts d\'atenció'] = Calc.alerts(a).map((x) => x.text).join(' | ');
    o['Propera valoració'] = a.nextRetest || '';
    // Els números com a text ("12,5") passen a número perquè el full pugui calcular.
    for (const k of Object.keys(out)) if (typeof out[k] === 'string' && /^-?\d+([.,]\d+)?$/.test(out[k])) out[k] = U.num(out[k]);
    return out;
  },

  sym(v) { const s = Calc.scoreInfo(v); return s ? s.sym : ''; },

  // Columnes del wellness (sessions i valoracions).
  wellness(w) {
    const x = w || {}, c = Calc.wellness(x);
    const o = {};
    for (const q of WELLNESS) o[`${q.label} (1-5)`] = U.num(x[q.k]) ?? '';
    o['Wellness total (/25)'] = c && c.total != null ? c.total : '';
    o['Wellness observacions'] = x.notes || '';
    return o;
  },

  session(s, p, settings) {
    const f = s.feedback || {};
    const o = {
      'Pacient': U.fullName(p), 'Data': s.date || '', 'Setmana': U.weekStart(s.date),
      'Nº sessió': U.num(s.number) ?? '', 'Professional': s.professional || '',
      'Estat': (OPT.sessionStatus.find((x) => x.v === s.status) || {}).label || '',
      'Objectiu': s.goal || '', 'Pilar': s.pillar || '',
      'Pla': s.planId && typeof Store !== 'undefined' && Store.get ? ((Store.get('templates', s.planId) || {}).name || '') : '',
      'Sessió del pla': U.num(s.planN) ?? '',
      ...Flat.wellness(s.wellness),
      'RPE': U.num(f.rpe) ?? '', 'Durada (min)': U.num(f.duration) ?? '', 'Càrrega (UA)': Calc.sessionLoad(s) ?? '',
      'Dolor post (0-10)': U.num(f.pain) ?? '', 'Observacions': f.notes || '', 'Decisió propera sessió': f.decision || '',
    };
    const list = (items) => items.filter((i) => i.name).map((i) => `${i.name} ${Calc.presc(i)}`.trim()).join(' | ');
    for (const b of s.blocks || []) {
      const name = blockName(b.key, settings);
      const gs = Calc.groups(b);
      o[`${name} · focus`] = b.focus || '';
      o[`${name} · mètode`] = [b.methodName, ...(gs || []).map((x) => x.g.methodName && `${x.label}: ${x.g.methodName}`)].filter(Boolean).join(' · ');
      o[`${name} · exercicis`] = gs
        ? gs.map((x) => ({ x, t: list(x.items.map((y) => y.it)) })).filter((y) => y.t).map((y) => `${y.x.label}: ${y.t}`).join(' ‖ ')
        : list(b.items || []);
    }
    return o;
  },

  sessionLog(s, p, settings) {
    const rows = [];
    for (const b of s.blocks || []) {
      const gs = Calc.groups(b);
      const grp = (it) => (gs ? gs.find((y) => y.items.some((z) => z.it === it)) : null);
      const sub = (it) => { const x = grp(it); return x ? x.label : ''; };
      const meth = (it) => { const x = grp(it); return (x && x.g.methodName) || b.methodName || ''; };
      (b.items || []).filter((i) => i.name).forEach((it, idx) => {
        rows.push({
          'Pacient': U.fullName(p), 'Data': s.date || '', 'Nº sessió': U.num(s.number) ?? '', 'Professional': s.professional || '',
          'Bloc': blockName(b.key, settings), 'Subbloc': sub(it), 'Mètode': meth(it), 'Ordre': `${blockNum(b.key)}.${idx + 1}`, 'Exercici': it.name,
          'Grup muscular': it.gm || '', 'Zona corporal': it.gm ? (MUSCLE_ZONES.find((z) => z.key === muscleZone(it.gm)) || {}).label || '' : '', 'Contracció': it.cont || '', 'Posició': it.pos || '', 'Lateralitat': it.lat || '',
          'Material': it.material || '', 'Sèries': U.num(it.sets) ?? it.sets ?? '', 'Reps / temps': it.reps || '',
          'Càrrega': it.load || '', 'Intensitat': it.intensity || '', 'Descans': it.rest || '', 'Tempo': it.tempo || '',
          'Fet': it.done ? 'Sí' : '', 'Observacions': it.note || '',
          ...vbtCols(it),
        });
      });
    }
    return rows;
  },

  exercise(e) {
    return {
      'Codi EON': e.code || '', 'Nom': e.name || '', 'Nom Technogym': e.tg || '', 'Bloc': blockName(e.block), 'Categoria': e.cat || '', 'Família de progressió': e.family || '', 'Nivell': U.num(e.level) ?? '', 'Material': e.material || '',
      'Grup muscular': e.gm || '', 'Altres músculs': (e.muscles || []).join(', '), 'Materials possibles': (e.materials || []).join(', '), 'Contracció': e.cont || '', 'Posició': e.pos || '', 'Lateralitat': e.lat || '',
      'Sèries': e.sets || '', 'Reps / temps': e.reps || '', 'Intensitat': e.intensity || '', 'Descans': e.rest || '',
      'Consignes': e.cues || '', 'Vídeo': e.video || '',
    };
  },

  template(t) {
    const items = t.kind === 'session'
      ? (t.blocks || []).map((b) => `${blockName(b.key)}: ${(b.items || []).map((i) => i.name).join(', ')}`).join(' | ')
      : (t.items || []).map((i) => i.name).join(', ');
    if (t.kind === 'method') {
      return { 'Nom': t.name || '', 'Tipus': 'Mètode', 'Bloc': (t.blocks || []).map((k) => blockName(k)).join(', '), 'Exercicis': t.example || '',
        'Descripció': [t.aim, t.how, t.notes].filter(Boolean).join(' · '), 'Pacient': '' };
    }
    if (t.kind === 'plan') {
      const p = t.patientId && typeof Store !== 'undefined' && Store.get ? Store.get('patients', t.patientId) : null;
      return { 'Nom': t.name || '', 'Tipus': 'Pla', 'Bloc': '', 'Exercicis': `${(t.sessions || []).length} sessions`,
        'Descripció': [t.goal, t.start && `Inici ${t.start}`].filter(Boolean).join(' · '), 'Pacient': p ? U.fullName(p) : '' };
    }
    return { 'Nom': t.name || '', 'Tipus': t.kind === 'session' ? 'Sessió' : 'Bloc', 'Bloc': t.kind === 'block' ? blockName(t.block) : '', 'Exercicis': items,
      'Descripció': t.desc || t.goal || '', 'Pacient': '' };
  },
};

// Columnes de l'encoder al registre d'exercicis (sempre les mateixes, encara que estiguin buides).
function vbtCols(it) {
  const v = Calc.vbt(it) || {};
  const n = (x, d) => (x == null ? '' : U.round(x, d));
  return {
    'Encoder · V 1a rep millor (m/s)': n(v.v1, 2), 'Encoder · pèrdua de velocitat (%)': n(v.vl, 1), 'Encoder · potència màx. (W)': n(v.pmax, 0),
    'Salts · altura millor (cm)': n(v.h, 1), 'Encoder / salts · detall': v.detail || '',
  };
}

function blockDef(key) { return BLOCKS.find((b) => b.key === key) || BLOCKS[0]; }
function blockNum(key) { return blockDef(key).num; }
function blockName(key, settings) {
  const st = settings || (typeof Store !== 'undefined' ? Store.settings : null);
  const custom = st && st.blocks && st.blocks.find((b) => b.key === key);
  return (custom && custom.name) || blockDef(key).name;
}
function blockDesc(key, settings) {
  const st = settings || (typeof Store !== 'undefined' ? Store.settings : null);
  const custom = st && st.blocks && st.blocks.find((b) => b.key === key);
  return (custom && custom.desc) || blockDef(key).desc;
}

// ── Importació de CSV de My Jump Lab ──
// El CSV pot variar segons la versió i l'idioma de l'app: detectem les columnes pel nom.
const MYJUMP_COLUMNS = [
  { key: 'rsimod', label: 'RSI-mod', match: ['rsi mod', 'rsi-mod', 'rsimod', 'reactive strength index modified'] },
  { key: 'type', label: 'Tipus de prova', match: ['tipo de prueba', 'tipo de salto', 'tipo', 'test type', 'jump type', 'tipus', 'test', 'type'] },
  { key: 'date', label: 'Data / hora', match: ['fecha', 'date', 'data'] },
  { key: 'load', label: 'Càrrega (kg)', match: ['carga', 'load'] },
  { key: 'height', label: 'Altura (cm)', match: ['altura salto', 'altura del salto', 'jump height', 'height', 'altura'], exclude: /cajon|box|caida|drop/ },
  { key: 'force', label: 'Força (N)', match: ['fuerza', 'force'], exclude: /indice|index|reactiv|rsi/ },
  { key: 'velocity', label: 'Velocitat (m/s)', match: ['velocidad', 'velocity'] },
  { key: 'power', label: 'Potència (W)', match: ['potencia', 'power'] },
  { key: 'flight', label: 'Temps de vol (ms)', match: ['tiempo vuelo', 'tiempo de vuelo', 'flight time', 'flight'] },
  { key: 'contact', label: 'Temps de contacte (ms)', match: ['tiempo contacto', 'tiempo de contacto', 'contact time', 'contact'] },
];

function mapMyJumpHeader(headers) {
  const norm = headers.map((x) => U.norm(x));
  const used = new Set();
  const map = {};
  for (const col of MYJUMP_COLUMNS) {
    let found = -1;
    for (const m of col.match) {
      found = norm.findIndex((hd, i) => !used.has(i) && hd.includes(m) && !(col.exclude && col.exclude.test(hd)));
      if (found >= 0) break;
    }
    if (found >= 0) { map[col.key] = found; used.add(found); }
  }
  return map;
}

function normalizeJumpType(s) {
  const x = U.norm(s).replace(/\s+/g, ' ');
  if (!x) return 'CMJ';
  if (/unilat|unipodal|single|asimetr/.test(x)) return String(s).trim();
  if (x.includes('cmjfree') || x.includes('cmj free') || x.includes('libre') || x.includes('lliure')) return 'CMJ lliure';
  if (x === 'cmj' || x.startsWith('cmj ') || x.startsWith('countermovement')) return 'CMJ';
  if (x === 'sj' || x.startsWith('squat jump')) return 'SJ';
  if (x === 'dj' || x.includes('drop')) return 'DJ';
  if (x.includes('10-5') || x.includes('10/5')) return 'RSI 10-5';
  if (x.includes('horizontal')) return 'Salt horitzontal';
  if (x.includes('fuerza-velocidad') || x.includes('force-velocity') || x.includes('f-v')) return 'Perfil F-V';
  return String(s).trim();
}

function parseMyJumpCsv(text) {
  const rows = U.parseCsv(text);
  if (rows.length < 2) return { error: 'El fitxer no té files de dades.', attempts: [], map: {} };
  // La capçalera és la primera fila que conté una columna d'altura o potència.
  let hi = rows.findIndex((r) => { const m = mapMyJumpHeader(r); return m.height != null || m.power != null; });
  if (hi < 0) return { error: 'No trobo les columnes d\'altura o potència. Revisa que sigui l\'exportació CSV de My Jump Lab.', attempts: [], map: {} };
  const headers = rows[hi];
  const map = mapMyJumpHeader(headers);
  const clean = (val) => {
    const s = String(val == null ? '' : val).trim();
    if (!s || s === '---' || s.includes('∞')) return '';
    return s;
  };
  const attempts = rows.slice(hi + 1).map((r) => {
    const g = (k) => (map[k] != null ? clean(r[map[k]]) : '');
    return {
      id: U.uid('J'), type: normalizeJumpType(g('type')), load: g('load'), height: g('height'), rsimod: g('rsimod'),
      force: g('force'), velocity: g('velocity'), power: g('power'), flight: g('flight'), contact: g('contact'),
      note: g('date') ? `Importat · ${g('date')}` : 'Importat de My Jump',
    };
  }).filter((x) => x.height !== '' || x.power !== '');
  return { headers, map, attempts, error: attempts.length ? null : 'No hi ha cap intent amb altura o potència.' };
}
