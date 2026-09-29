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
    return ` (dreta: ${Calc.scoreInfo(p.sd).label.toLowerCase()} · esquerra: ${Calc.scoreInfo(p.se).label.toLowerCase()})`;
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
        if (t.id === 'stage4' && x.v && !/Etapa [34]/.test(x.v)) add('bad', t.section, '4 Stage Balance: no manté el tàndem 10 s (risc de caiguda, criteri STEADI).');
      } else if (t.kind === 'scoreBi') {
        const s = Calc.patternScore(x, true);
        if (s === '--') add('bad', t.section, `${t.name}: limitació clara${Calc.sidesDetail(x)}.`);
        else if (s === '-') add('warn', t.section, `${t.name}: a millorar${Calc.sidesDetail(x)}.`);
        if (x.pain) add('bad', t.section, `${t.name}: dolor o símptomes (P) · derivar al fisio.`);
      } else if (t.kind === 'single') {
        if (t.id === 'tug' && U.num(x.v) != null && U.num(x.v) >= 12) add('bad', t.section, `Timed Up and Go de ${U.fmt(U.num(x.v))} s (≥ 12 s: risc de caiguda, criteri STEADI).`);
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

  // Comparació amb la valoració anterior (només mètriques amb valor a totes dues).
  // Mètriques clau per a l'informe del client.
  KEY_METRICS: ['cmj', 'cmjPow', 'ybt', 'wblt', 'dyn_knee_ext_kg', 'dyn_curl_90_kg', 'dyn_squeeze', 'dyn_hip_ir_kg', 'dyn_hip_er_kg', 'patterns', 'weight',
    'rom_hip_ir', 'rom_hip_er', 'chair30', 'tug', 'walk6', 'cod505'],

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
      'Perfil': p.profile || '', 'Professional': p.professional || '',
      'Estat': (OPT.status.find((o) => o.v === p.status) || {}).label || '',
      'Data alta': p.startDate || '', 'Email': p.email || '', 'Telèfon': p.phone || '',
      'Objectiu': p.goal || '', 'Motiu de consulta': p.reason || '', 'Antecedents': p.history || '',
      'Data IQ': p.surgeryDate || '', 'IQ': p.surgeryNote || '',
      'Data lesió': p.injuryDate || '', 'Lesió': p.injuryNote || '',
      'Carpeta del client': p.folderUrl || '', 'Notes': p.notes || '',
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
    o['Client'] = U.fullName(p);
    o['Data'] = a.date || '';
    o['Tipus'] = (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || '';
    o['Professional'] = a.professional || '';
    o['Pes (kg)'] = n(U.num(a.general && a.general.weight));
    o['Alçada (cm)'] = n(U.num(a.general && a.general.height));
    o['Motiu / objectiu'] = (a.general && a.general.goal) || '';
    const w = Calc.weight(a);

    for (const sec of PROTOCOL) {
      for (const g of sec.groups) {
        for (const t0 of g.tests || []) {
          const t = TEST_INDEX[t0.id];
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
          }
          const pc = Calc.patterns(a).counts;
          o['Patrons 0'] = pc['0']; o['Patrons −'] = pc['-']; o['Patrons −−'] = pc['--']; o['Patrons P'] = pc.P;
        }
        if (g.kind === 'profile') {
          for (const t of PROFILE_TESTS) {
            const x = v[t.id] || {};
            if (t.kind === 'bi') { o[`${t.name} D (${t.unit})`] = n(U.num(x.d)); o[`${t.name} E (${t.unit})`] = n(U.num(x.e)); }
            else if (t.kind === 'single') o[`${t.name} (${t.unit})`] = n(U.num(x.v));
            else if (t.kind === 'select' || t.kind === 'text') o[t.name] = x.v || '';
            else if (t.kind === 'scoreBi') { o[`${t.name} D`] = Flat.sym(x.sd); o[`${t.name} E`] = Flat.sym(x.se); }
          }
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
    o['Punts d\'atenció'] = Calc.alerts(a).map((x) => x.text).join(' | ');
    o['Propera valoració'] = a.nextRetest || '';
    // Els números com a text ("12,5") passen a número perquè el full pugui calcular.
    for (const k of Object.keys(out)) if (typeof out[k] === 'string' && /^-?\d+([.,]\d+)?$/.test(out[k])) out[k] = U.num(out[k]);
    return out;
  },

  sym(v) { const s = Calc.scoreInfo(v); return s ? s.sym : ''; },

  session(s, p, settings) {
    const f = s.feedback || {}, r = s.readiness || {};
    const o = {
      'Client': U.fullName(p), 'Data': s.date || '', 'Setmana': U.weekStart(s.date),
      'Nº sessió': U.num(s.number) ?? '', 'Professional': s.professional || '',
      'Estat': (OPT.sessionStatus.find((x) => x.v === s.status) || {}).label || '',
      'Objectiu': s.goal || '', 'Pilar': s.pillar || '',
      'Son (1-5)': U.num(r.sleep) ?? '', 'Energia (1-5)': U.num(r.energy) ?? '', 'Dolor previ (0-10)': U.num(r.pain) ?? '',
      'RPE': U.num(f.rpe) ?? '', 'Durada (min)': U.num(f.duration) ?? '', 'Càrrega (UA)': Calc.sessionLoad(s) ?? '',
      'Dolor post (0-10)': U.num(f.pain) ?? '', 'Observacions': f.notes || '', 'Decisió propera sessió': f.decision || '',
    };
    for (const b of s.blocks || []) {
      const name = blockName(b.key, settings);
      o[`${name} · focus`] = b.focus || '';
      o[`${name} · exercicis`] = (b.items || []).filter((i) => i.name).map((i) => `${i.name} ${Calc.presc(i)}`.trim()).join(' | ');
    }
    return o;
  },

  sessionLog(s, p, settings) {
    const rows = [];
    for (const b of s.blocks || []) {
      (b.items || []).filter((i) => i.name).forEach((it, idx) => {
        rows.push({
          'Client': U.fullName(p), 'Data': s.date || '', 'Nº sessió': U.num(s.number) ?? '', 'Professional': s.professional || '',
          'Bloc': blockName(b.key, settings), 'Ordre': `${blockNum(b.key)}.${idx + 1}`, 'Exercici': it.name,
          'Grup muscular': it.gm || '', 'Contracció': it.cont || '', 'Posició': it.pos || '', 'Lateralitat': it.lat || '',
          'Material': it.material || '', 'Sèries': U.num(it.sets) ?? it.sets ?? '', 'Reps / temps': it.reps || '',
          'Càrrega': it.load || '', 'Intensitat': it.intensity || '', 'Descans': it.rest || '', 'Tempo': it.tempo || '',
          'Fet': it.done ? 'Sí' : '', 'Observacions': it.note || '',
        });
      });
    }
    return rows;
  },

  exercise(e) {
    return {
      'Nom': e.name || '', 'Bloc': blockName(e.block), 'Categoria': e.cat || '', 'Material': e.material || '',
      'Grup muscular': e.gm || '', 'Contracció': e.cont || '', 'Posició': e.pos || '', 'Lateralitat': e.lat || '',
      'Sèries': e.sets || '', 'Reps / temps': e.reps || '', 'Intensitat': e.intensity || '', 'Descans': e.rest || '',
      'Consignes': e.cues || '', 'Vídeo': e.video || '',
    };
  },

  template(t) {
    const items = t.kind === 'session'
      ? (t.blocks || []).map((b) => `${blockName(b.key)}: ${(b.items || []).map((i) => i.name).join(', ')}`).join(' | ')
      : (t.items || []).map((i) => i.name).join(', ');
    return { 'Nom': t.name || '', 'Tipus': t.kind === 'session' ? 'Sessió' : 'Bloc', 'Bloc': t.kind === 'block' ? blockName(t.block) : '', 'Exercicis': items };
  },
};

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
