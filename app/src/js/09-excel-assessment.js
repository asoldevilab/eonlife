/* EON Life · Excel d'una valoració (inicial, re-test, control o alta).
   Fulls: «Resum» (dades, wellness, punts d'atenció, conclusions i fitxers), «Comparació» (amb l'anterior, si n'hi ha),
   «Mobilitat», «Força», «Rendiment», «Patrons» i «Altres mesures». Només surt el que s'ha mesurat. */

const ExcelAssessment = (() => {
  const SYM = { '0': '0', '-': '−', '--': '−−' };
  const SCORE_FILL = { '0': XL_C.GRN, '-': XL_C.AMB, '--': XL_C.RED };
  const typeLabel = (a) => (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració';
  const hasVal = (v) => v !== '' && v != null && v !== false && !(Array.isArray(v) && !v.length);
  const anything = (x) => !!x && Object.values(x).some(hasVal);
  const measured = (x) => !!x && Object.entries(x).some(([k, v]) => !MEDIA_KEYS.includes(k) && hasVal(v));
  const decimals = (unit) => (unit === 'N' || unit === '°' ? '0' : '0.0');

  // Fotos, vídeos i informes de la valoració: [{ area, label, kind, url }]
  function media(a) {
    const out = [];
    const add = (area, label, kind, url) => { if (xlStr(url).trim()) out.push({ area, label, kind, url: xlStr(url).trim() }); };
    const v = a.values || {};
    add('tot', 'Vídeo general de la valoració', 'Vídeo', (a.general || {}).video);
    for (const sec of PROTOCOL) {
      for (const g of sec.groups) {
        for (const t0 of g.tests || []) {
          const t = TEST_INDEX[t0.id], x = v[t.id] || {};
          add(sec.id, t.name, 'Vídeo', x.video);
          for (const m of t.videos || []) add(sec.id, `${t.name} · ${m.label.toLowerCase()}`, 'Vídeo', x[m.k]);
          for (const m of t.photos || []) add(sec.id, t.photos.length > 1 ? `${t.name} · ${m.label.toLowerCase()}` : t.name, 'Foto', x[m.k]);
        }
        if (g.kind === 'ybt') {
          add(sec.id, 'Y-Balance Test', 'Vídeo', (a.ybt || {}).video);
          for (const m of YBT_VIDEOS) add(sec.id, `Y-Balance Test · ${m.label.toLowerCase()}`, 'Vídeo', (a.ybt || {})[m.k]);
        }
        if (g.kind === 'jumps') add(sec.id, 'Salts · CMJ', 'Vídeo', (a.jumps || {}).video);
        if (g.kind === 'patterns') {
          for (const pt of PATTERNS) {
            const x = (a.patterns || {})[pt.id] || {};
            add(sec.id, pt.name, 'Vídeo', x.video);
            for (const m of pt.videos || []) add(sec.id, `${pt.name} · ${m.label.toLowerCase()}`, 'Vídeo', x[m.k]);
          }
        }
      }
    }
    for (const f of a.files || []) add('tot', f.name || f.label || 'Informe', f.label && /kinvent/i.test(f.label) ? 'Informe Kinvent' : 'Document', f.url);
    return out;
  }

  function mediaTable(ws, r, items, ncols) {
    r = xlHeader(ws, r, [['Fitxer', Math.max(1, ncols - 3)], 'Tipus', ['Enllaç', 2]]);
    for (const m of items) {
      ws.merge(r, 1, r, ncols - 3, m.label, XS.text);
      ws.set(r, ncols - 2, m.kind, XS.cell);
      ws.merge(r, ncols - 1, r, ncols, xlIsWeb(m.url) ? 'Obre' : 'Desat a la tauleta (versió de prova)', [XS.cell, xlIsWeb(m.url) ? XS.link : XS.muted]);
      if (xlIsWeb(m.url)) ws.link(r, ncols - 1, m.url, 'Obre el fitxer');
      r++;
    }
    return r;
  }

  function build({ patient: p, assessment: a, previous = null, settings, today = U.today() }) {
    const doc = XlsxDoc.create({ title: `${typeLabel(a)} · ${U.fullName(p)}`, subject: 'Valoració funcional', creator: 'EON Life', company: (settings && settings.centerName) || 'EON Life' });
    const ref = { weight: null, files: media(a) };
    const wsR = doc.sheet('Resum', { grid: false, landscape: true, tab: XL_C.BRAND });
    const wsC = previous ? doc.sheet('Comparació', { grid: false, landscape: true, tab: XL_C.BRAND_M }) : null;
    const sheets = {};
    for (const sec of PROTOCOL) {
      if (sec.id === 'patrons') sheets[sec.id] = doc.sheet('Patrons', { grid: false, landscape: true, tab: XL_BLOCK.for, freeze: [6, 2] });
      else if (sec.id === 'altres') { if ((a.free || []).some((x) => x.name)) sheets[sec.id] = doc.sheet('Altres mesures', { grid: false, landscape: true, tab: XL_C.MUTED }); }
      else sheets[sec.id] = doc.sheet(sec.short === 'Força' ? 'Força' : sec.short, { grid: false, landscape: true, tab: { mobilitat: XL_BLOCK.mob, forca: XL_BLOCK.for, rendiment: XL_BLOCK.pot }[sec.id], freeze: [6, 2] });
    }
    summarySheet(wsR, { p, a, previous, settings, ref, today });
    if (wsC) compareSheet(wsC, { p, a, previous });
    for (const sec of PROTOCOL) if (sheets[sec.id]) sectionSheet(sheets[sec.id], { p, a, sec, ref, settings });
    return doc;
  }

  // ── Resum ──
  const NC = 6;
  function summarySheet(ws, { p, a, previous, settings, ref }) {
    ws.cols([34, 18, 22, 22, 22, 30]);
    let r = xlTitle(ws, `${typeLabel(a)} · ${U.fullName(p)}`, `${U.fmtDateLong(a.date)}${a.professional ? ` · ${a.professional}` : ''}`, NC);
    const g = a.general || {};
    r = xlSection(ws, r, 'Dades de la valoració', NC);
    const age = U.age(p.birthDate, a.date);
    const at = {};
    r = xlKv(ws, r, [
      ['Client', U.fullName(p)],
      ['Data', { date: a.date }, { style: { h: 'left' } }],
      ['Tipus', typeLabel(a)],
      ['Professional', xlStr(a.professional)],
      ['Pes (kg)', xlNum(g.weight) ?? '—', { style: { h: 'left', b: true, fmt: '0.0' }, keep: true, id: 'weight' }],
      ['Alçada (cm)', xlNum(g.height) ?? '—', { style: { h: 'left', b: true, fmt: '0' }, keep: true, id: 'height' }],
    ], NC, at);
    const weightRow = at.weight, heightRow = at.height;
    ref.weight = `'Resum'!$B$${weightRow}`;
    const w = xlNum(g.weight), h = xlNum(g.height);
    r = xlKv(ws, r, [
      ['IMC (kg/m²)', { f: `IF(AND(ISNUMBER(${xlRef(weightRow, 2)}),ISNUMBER(${xlRef(heightRow, 2)})),${xlRef(weightRow, 2)}/(${xlRef(heightRow, 2)}/100)^2,"")`, v: Calc.bmi(w, h) ?? '' }, { style: { h: 'left', fmt: '0.0' } }],
      ['Edat en aquesta data', age != null ? `${age} anys` : ''],
      ['Motiu / objectiu', xlStr(g.goal)],
      ['Propera valoració (re-test)', a.nextRetest ? { date: a.nextRetest } : '', { style: { h: 'left' } }],
    ], NC) + 1;

    // Indicadors clau
    const cmj = Calc.cmj(a), y = Calc.ybt(a), pc = Calc.patterns(a);
    const key = [];
    if (cmj && cmj.best != null) key.push(['CMJ · millor altura', `${U.fmt(cmj.best)} cm`]);
    if (cmj && cmj.relPower != null) key.push(['CMJ · potència relativa', `${U.fmt(cmj.relPower)} W/kg`]);
    if (y.d.comp != null || y.e.comp != null) key.push(['Y-Balance · composite', `D ${y.d.comp != null ? `${U.fmt(y.d.comp)} %` : '—'}  ·  E ${y.e.comp != null ? `${U.fmt(y.e.comp)} %` : '—'}`]);
    if (pc.scored) key.push(['Patrons de moviment', `${pc.counts['0']} competents · ${pc.counts['-']} a millorar · ${pc.counts['--']} amb limitació clara${pc.counts.P ? ` · ${pc.counts.P} amb dolor` : ''} (de ${pc.total})`]);
    const alerts = Calc.alerts(a);
    key.push(['Punts d\'atenció', alerts.length ? `${alerts.length} (${alerts.filter((x) => x.tone === 'bad').length} importants)` : 'Cap']);
    if (key.length) { r = xlSection(ws, r, 'Indicadors clau', NC); r = xlKv(ws, r, key, NC) + 1; }

    // Wellness
    const wl = Calc.wellness(a.wellness);
    if (wl) {
      r = xlSection(ws, r, 'Wellness · com arriba avui?', NC);
      r = xlHeader(ws, r, ['Pregunta', 'Resposta (1–5)', ['1 =', 2], ['5 =', 2]]);
      const first = r;
      for (const q of WELLNESS) {
        const v = U.num((a.wellness || {})[q.k]);
        ws.set(r, 1, q.label, XS.label);
        ws.set(r, 2, v, [XS.cell, { b: true, fmt: '0', fill: v == null ? null : v <= 2 ? XL_C.RED : v === 3 ? XL_C.AMB : XL_C.GRN }]);
        ws.merge(r, 3, r, 4, q.lo, [XS.text, { color: XL_C.MUTED }]);
        ws.merge(r, 5, r, 6, q.hi, [XS.text, { color: XL_C.MUTED }]);
        r++;
      }
      ws.set(r, 1, 'Total (màxim 25)', XS.label);
      ws.set(r, 2, { f: `IF(COUNT(${xlRef(first, 2)}:${xlRef(r - 1, 2)})=${WELLNESS.length},SUM(${xlRef(first, 2)}:${xlRef(r - 1, 2)}),"")`, v: wl.total != null ? wl.total : '' }, [XS.cell, { b: true, fmt: '0', fill: XL_C.GREY }]);
      ws.merge(r, 3, r, NC, wl.low.length ? `Respostes baixes (1 o 2): ${wl.low.join(', ')}` : '', [XS.text, { color: XL_C.MUTED }]);
      r++;
      r = xlKv(ws, r, [['Observacions', xlStr((a.wellness || {}).notes)]], NC) + 1;
    }

    // Punts d'atenció
    r = xlSection(ws, r, 'Punts d\'atenció', NC);
    if (alerts.length) {
      r = xlHeader(ws, r, ['Àrea', 'Nivell', ['Descripció', 4]]);
      const area = { mobilitat: 'Mobilitat', forca: 'Força', rendiment: 'Rendiment', patrons: 'Patrons', altres: 'Altres' };
      for (const al of alerts) {
        ws.set(r, 1, area[al.section] || al.section, XS.text);
        ws.set(r, 2, al.tone === 'bad' ? 'Important' : 'A vigilar', [XS.cell, { b: true, fill: al.tone === 'bad' ? XL_C.RED : XL_C.AMB }]);
        ws.merge(r, 3, r, NC, al.text, XS.text);
        r++;
      }
    } else {
      ws.merge(r, 1, r, NC, 'Cap punt d\'atenció amb les dades d\'aquesta valoració.', [XS.text, { i: true, color: XL_C.MUTED }]);
      r++;
    }
    r++;

    // Conclusions
    const c = a.conclusions || {};
    if (['strengths', 'priorities', 'plan'].some((k) => xlStr(c[k]).trim())) {
      r = xlSection(ws, r, 'Conclusions i pla', NC);
      r = xlKv(ws, r, [['Punts forts', xlStr(c.strengths)], ['Prioritats', xlStr(c.priorities)], ['Decisions per al pla d\'entrenament', xlStr(c.plan)]], NC) + 1;
    }

    if (previous) {
      ws.merge(r, 1, r, NC, `Comparació amb la valoració anterior (${U.fmtDate(previous.date)}): vegeu el full «Comparació».`, [XS.text, { u: true, color: XL_C.LINK }]);
      ws.link(r, 1, xlGo('Comparació'), 'Vés a la comparació');
      r += 2;
    }

    // Fitxers
    if (ref.files.length) {
      r = xlSection(ws, r, 'Fotos, vídeos i informes (a les carpetes del client)', NC);
      r = mediaTable(ws, r, ref.files, NC);
    }
    return r;
  }

  // ── Comparació amb l'anterior ──
  function compareSheet(ws, { p, a, previous }) {
    ws.cols([46, 18, 18, 14, 12, 14]);
    let r = xlTitle(ws, `Comparació · ${U.fullName(p)}`, `${typeLabel(previous)} del ${U.fmtDate(previous.date)}  →  ${typeLabel(a)} del ${U.fmtDate(a.date)}`, 6);
    ws.freeze(r + 1, 2);
    r = xlHeader(ws, r, ['Test', `Anterior · ${U.fmtDate(previous.date)}`, `Actual · ${U.fmtDate(a.date)}`, 'Canvi', 'Canvi %', 'Evolució']);
    const rows = Calc.compare(a, previous, false);
    if (!rows.length) {
      ws.merge(r, 1, r, 6, 'No hi ha cap test mesurat a les dues valoracions.', [XS.text, { i: true, color: XL_C.MUTED }]);
      return r;
    }
    for (const x of rows) {
      const fmt = decimals(x.unit);
      ws.set(r, 1, `${x.label}${x.unit ? ` (${x.unit})` : ''}`, XS.text);
      ws.set(r, 2, x.prev, [XS.cell, { fmt }]);
      ws.set(r, 3, x.cur, [XS.cell, { fmt, b: true }]);
      const fill = x.better === true ? XL_C.GRN : x.better === false ? XL_C.RED : null;
      ws.set(r, 4, { f: `${xlRef(r, 3)}-${xlRef(r, 2)}`, v: x.delta }, [XS.cell, { fmt: `+${fmt};-${fmt};${fmt}`, fill }]);
      ws.set(r, 5, { f: `IF(${xlRef(r, 2)}=0,"",(${xlRef(r, 3)}-${xlRef(r, 2)})/ABS(${xlRef(r, 2)}))`, v: x.prev === 0 ? '' : x.delta / Math.abs(x.prev) }, [XS.cell, { fmt: '+0%;-0%;0%', fill }]);
      ws.set(r, 6, x.better === true ? '▲ Millora' : x.better === false ? '▼ Empitjora' : Math.abs(x.delta) < 1e-9 ? '• Igual' : '• Canvi', [XS.cell, { fill, b: x.better != null }]);
      r++;
    }
    r++;
    ws.merge(r, 1, r, 6, 'Verd = millora · vermell = empitjora (segons el test: en algunes proves un valor més baix és millor). El pes corporal no es valora com a millora ni empitjorament.', [XS.note, { wrap: true }]);
    return r;
  }

  // ── Seccions del protocol ──
  const SIDE_COLS = { w: [36, 14, 14, 11, 16, 13, 13, 52] }; // Prova · D · E · Unitat · Asimetria · N/kg D · N/kg E · Observacions

  function sectionSheet(ws, { p, a, sec, ref, settings }) {
    if (sec.id === 'patrons') return patternsSheet(ws, { p, a, sec });
    if (sec.id === 'altres') return freeSheet(ws, { p, a });
    if (sec.id === 'rendiment') return performanceSheet(ws, { p, a, sec, ref });
    ws.cols(SIDE_COLS.w);
    const NCOLS = 8;
    let r = xlTitle(ws, `${sec.title} · ${U.fullName(p)}`, `${typeLabel(a)} del ${U.fmtDate(a.date)}  ·  D = dreta, E = esquerra`, NCOLS);
    ws.freeze(r + 1, 2);
    const items = ref.files.filter((m) => m.area === sec.id);
    let any = false;
    for (const g of sec.groups) {
      const before = r;
      r = groupBlock(ws, r, { a, g, ref, NCOLS });
      if (r !== before) { any = true; r++; }
    }
    if (!any) { ws.merge(r, 1, r, NCOLS, 'Aquest apartat no s\'ha mesurat en aquesta valoració.', [XS.text, { i: true, color: XL_C.MUTED }]); r += 2; }
    if (items.length) { r = xlSection(ws, r, 'Fotos i vídeos d\'aquest apartat', NCOLS); mediaTable(ws, r, items, NCOLS); }
    return r;
  }

  // Un grup de tests (una taula per cada tipus de prova consecutiu). Retorna la fila següent, o la mateixa si no hi ha res a mostrar.
  function groupBlock(ws, r, { a, g, ref, NCOLS }) {
    const v = a.values || {};
    const tests = (g.tests || []).map((t0) => TEST_INDEX[t0.id]);
    const title = g.title || '';
    const sub = g.device ? `  ·  ${g.device}` : '';
    if (g.kind === 'ybt') return ybtBlock(ws, r, { a, g, title: title + sub, NCOLS });
    if (['encoder', 'jumps', 'bike', 'patterns', 'free'].includes(g.kind)) return r;
    const shown = tests.filter((t) => measured(v[t.id]) || (anything(v[t.id]) && !t.optional));
    if (!shown.length) return r;
    r = xlSection(ws, r, title + sub, NCOLS);
    // Tests seguits del mateix tipus (numèric per costats, positiu/negatiu, puntuació…) comparteixen taula.
    const runs = [];
    for (const t of shown) {
      const last = runs[runs.length - 1];
      if (last && last.kind === t.kind) last.tests.push(t); else runs.push({ kind: t.kind, tests: [t] });
    }
    runs.forEach((run, i) => {
      if (i) r++;
      r = runTable(ws, r, { a, g, run, ref, NCOLS, v });
    });
    return r;
  }

  function runTable(ws, r, { a, g, run, ref, NCOLS, v }) {
    const shown = run.tests;
    if (run.kind === 'bi') {
      const perKg = shown.some((t) => t.perKg);
      r = xlHeader(ws, r, ['Prova', 'Dreta (D)', 'Esquerra (E)', 'Unitat', shown.every((t) => t.diffOnly) ? 'Diferència' : 'Asimetria / dif.', ...(perKg ? ['Dreta (N/kg)', 'Esquerra (N/kg)', 'Observacions'] : [['Observacions', 3]])]);
      for (const t of shown) {
        const x = v[t.id] || {};
        const d = xlNum(x.d), e = xlNum(x.e);
        const fmt = t.unit === 'N' || t.unit === '°' ? '0' : '0.0';
        ws.set(r, 1, t.name, XS.text);
        const wb = t.rule === 'wblt';
        ws.set(r, 2, d, [XS.cell, { fmt }, wb && d != null && d < THRESHOLDS.wbltMin ? { fill: XL_C.RED } : null]);
        ws.set(r, 3, e, [XS.cell, { fmt }, wb && e != null && e < THRESHOLDS.wbltMin ? { fill: XL_C.RED } : null]);
        ws.set(r, 4, t.unit, XS.cell);
        const dr = xlRef(r, 2), er = xlRef(r, 3);
        if (t.diffOnly) {
          const diff = d != null && e != null ? d - e : '';
          const bad = wb && d != null && e != null && Math.abs(d - e) >= THRESHOLDS.wbltDiff;
          ws.set(r, 5, { f: `IF(COUNT(${dr},${er})=2,${dr}-${er},"")`, v: diff }, [XS.cell, { fmt: '+0.0;-0.0;0.0', b: bad, fill: bad ? XL_C.RED : null }]);
        } else {
          const as = Calc.asym(x.d, x.e);
          ws.set(r, 5, { f: `IF(COUNT(${dr},${er})=2,IF(MAX(ABS(${dr}),ABS(${er}))=0,0,ABS(${dr}-${er})/MAX(ABS(${dr}),ABS(${er}))),"")`, v: as ? as.pct / 100 : '' }, [XS.cell, { fmt: '0%', b: true, fill: xlAsymFill(as && as.pct) }]);
        }
        if (perKg) {
          const wref = ref.weight;
          const kg = (cell, val) => ({ f: `IF(AND(ISNUMBER(${cell}),ISNUMBER(${wref}),${wref}>0),${cell}/${wref},"")`, v: Calc.perKg(val, Calc.weight(a)) ?? '' });
          ws.set(r, 6, kg(dr, x.d), [XS.cell, { fmt: '0.0' }]);
          ws.set(r, 7, kg(er, x.e), [XS.cell, { fmt: '0.0' }]);
          ws.set(r, 8, xlStr(x.note), XS.text);
        } else ws.merge(r, 6, r, 8, xlStr(x.note), XS.text);
        r++;
      }
      // Ràtio isquiotibials / quàdriceps (curl 90/90 ÷ leg extension)
      if (g.id === 'dyn') {
        const hq = Calc.hq(a);
        const q = shown.findIndex((t) => t.id === 'dyn_knee_ext'), h = shown.findIndex((t) => t.id === 'dyn_curl_90');
        if ((hq.d != null || hq.e != null) && q >= 0 && h >= 0) {
          const base = r - shown.length;
          ws.set(r, 1, 'Ràtio isquiotibials / quàdriceps (curl 90/90 ÷ leg extension)', XS.label);
          const f = (col, val) => ({ f: `IF(AND(ISNUMBER(${xlRef(base + q, col)}),ISNUMBER(${xlRef(base + h, col)}),${xlRef(base + q, col)}>0),${xlRef(base + h, col)}/${xlRef(base + q, col)},"")`, v: val ?? '' });
          ws.set(r, 2, f(2, hq.d), [XS.cell, { fmt: '0.00', b: true }]);
          ws.set(r, 3, f(3, hq.e), [XS.cell, { fmt: '0.00', b: true }]);
          ws.merge(r, 4, r, 8, '', XS.text);
          r++;
        }
      }
    } else if (run.kind === 'biSelect') {
      r = xlHeader(ws, r, ['Prova', 'Dreta (D)', 'Esquerra (E)', ['Observacions', 5]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        const pos = (s) => /^Positiu/.test(xlStr(s));
        ws.set(r, 1, t.name, XS.text);
        ws.set(r, 2, xlStr(x.d), [XS.cellW, pos(x.d) ? { fill: XL_C.AMB, b: true } : null]);
        ws.set(r, 3, xlStr(x.e), [XS.cellW, pos(x.e) ? { fill: XL_C.AMB, b: true } : null]);
        ws.merge(r, 4, r, 8, xlStr(x.note), XS.text);
        r++;
      }
    } else if (run.kind === 'select') {
      r = xlHeader(ws, r, ['Prova', ['Resultat', 2], ['Observacions', 5]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        ws.set(r, 1, t.name, XS.text);
        ws.merge(r, 2, r, 3, xlStr(x.v), [XS.cellW, /^Positiu/.test(xlStr(x.v)) ? { fill: XL_C.AMB, b: true } : null]);
        ws.merge(r, 4, r, 8, xlStr(x.note), XS.text);
        r++;
      }
    } else if (run.kind === 'scoreBi') {
      r = xlHeader(ws, r, ['Prova', 'Dreta (D)', 'Esquerra (E)', 'Dolor', ['Compensacions observades', 2], ['Observacions', 2]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        ws.set(r, 1, t.name, XS.text);
        for (const [col, key] of [[2, 'sd'], [3, 'se']]) ws.set(r, col, SYM[x[key]] || '', [XS.cell, { b: true, sz: 12, fill: SCORE_FILL[x[key]] }]);
        ws.set(r, 4, x.pain ? 'P' : '', [XS.cell, { b: true, fill: x.pain ? XL_C.RED : null }]);
        ws.merge(r, 5, r, 6, (x.chips || []).join(', '), XS.text);
        ws.merge(r, 7, r, 8, xlStr(x.note), XS.text);
        r++;
      }
      ws.merge(r, 1, r, NCOLS, '0 = competent · − = a millorar · −− = limitació clara · P = dolor o símptomes (s\'atura el test i es deriva al fisio).', [XS.note, { wrap: true }]);
      r++;
    } else if (run.kind === 'single') {
      r = xlHeader(ws, r, ['Prova', 'Valor', 'Unitat', ['Observacions', 5]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        ws.set(r, 1, t.name, XS.text);
        ws.set(r, 2, xlNum(x.v), [XS.cell, { b: true }]);
        ws.set(r, 3, t.unit, XS.cell);
        ws.merge(r, 4, r, 8, xlStr(x.note), XS.text);
        r++;
      }
    }
    return r;
  }

  function ybtBlock(ws, r, { a, g, title, NCOLS }) {
    const y = Calc.ybt(a), raw = a.ybt || {};
    const has = ['d', 'e'].some((s) => ['ant', 'pm', 'pl', 'len'].some((k) => xlStr((raw[s] || {})[k]).trim()));
    if (!has) return r;
    r = xlSection(ws, r, `${title}  ·  1 intent per direcció i cama`, NCOLS);
    r = xlHeader(ws, r, ['Direcció', 'Dreta (cm)', 'Esquerra (cm)', 'Diferència (cm)', ['Observacions', 4]]);
    const first = r;
    const rowsDef = [['Anterior', 'ant'], ['Posteromedial', 'pm'], ['Posterolateral', 'pl'], ['Longitud de la cama', 'len']];
    for (const [label, k] of rowsDef) {
      const dv = xlNum((raw.d || {})[k]), ev = xlNum((raw.e || {})[k]);
      ws.set(r, 1, label, XS.text);
      ws.set(r, 2, dv, [XS.cell, { fmt: '0' }]);
      ws.set(r, 3, ev, [XS.cell, { fmt: '0' }]);
      const df = dv != null && ev != null ? Math.abs(dv - ev) : '';
      const bad = k === 'ant' && df !== '' && df >= THRESHOLDS.ybtAntDiff;
      ws.set(r, 4, { f: `IF(COUNT(${xlRef(r, 2)},${xlRef(r, 3)})=2,ABS(${xlRef(r, 2)}-${xlRef(r, 3)}),"")`, v: df }, [XS.cell, { fmt: '0.0', fill: bad ? XL_C.RED : null, b: bad }]);
      ws.merge(r, 5, r, 8, k === 'ant' ? `Diferència ≥ ${THRESHOLDS.ybtAntDiff} cm a l'anterior = punt d'atenció.` : '', [XS.text, { color: XL_C.MUTED }]);
      r++;
    }
    const comp = (col, val) => {
      const [ant, pm, pl, len] = [0, 1, 2, 3].map((i) => xlRef(first + i, col));
      return { f: `IF(AND(COUNT(${ant},${pm},${pl},${len})=4,${len}>0),(${ant}+${pm}+${pl})/(3*${len})*100,"")`, v: val ?? '' };
    };
    ws.set(r, 1, 'Composite (%)', XS.label);
    ws.set(r, 2, comp(2, y.d.comp), [XS.cell, { fmt: '0.0', b: true, fill: XL_C.GREY }]);
    ws.set(r, 3, comp(3, y.e.comp), [XS.cell, { fmt: '0.0', b: true, fill: XL_C.GREY }]);
    ws.set(r, 4, { f: `IF(COUNT(${xlRef(r, 2)},${xlRef(r, 3)})=2,ABS(${xlRef(r, 2)}-${xlRef(r, 3)}),"")`, v: y.compDiff ?? '' }, [XS.cell, { fmt: '0.0', fill: XL_C.GREY }]);
    ws.merge(r, 5, r, 8, 'Composite = (anterior + posteromedial + posterolateral) ÷ (3 × longitud de la cama) × 100.', [XS.text, { color: XL_C.MUTED }]);
    r++;
    if (xlStr(raw.note).trim()) { r = xlKv(ws, r, [['Observacions', xlStr(raw.note)]], NCOLS); }
    return r;
  }

  // ── Rendiment: salts, encoder i bike ──
  function performanceSheet(ws, { p, a, sec, ref }) {
    const cols = [26, 16, 12, 13, 12, 13, 10, 11, 10, 11, 40];
    const NCOLS = cols.length;
    ws.cols(cols);
    let r = xlTitle(ws, `${sec.title} · ${U.fullName(p)}`, `${typeLabel(a)} del ${U.fmtDate(a.date)}`, NCOLS);
    ws.freeze(r + 1, 2);
    let any = false;
    const attempts = ((a.jumps && a.jumps.attempts) || []).filter((x) => U.num(x.height) != null || U.num(x.power) != null);
    if (attempts.length) {
      any = true;
      r = xlSection(ws, r, 'Salts  ·  My Jump Lab', NCOLS);
      r = xlHeader(ws, r, ['Intent', 'Tipus', 'Altura (cm)', 'Potència (W)', 'Força (N)', 'Velocitat (m/s)', 'RSI-mod', 'Càrrega (kg)', 'Vol (ms)', 'Contacte (ms)', 'Nota']);
      attempts.forEach((x, i) => {
        ws.set(r, 1, `Intent ${i + 1}`, XS.text);
        ws.set(r, 2, xlStr(x.type || 'CMJ'), XS.cell);
        [['height', '0.0'], ['power', '0'], ['force', '0'], ['velocity', '0.00'], ['rsimod', '0.00'], ['load', '0.0'], ['flight', '0'], ['contact', '0']].forEach(([k, fmt], j) => ws.set(r, 3 + j, xlNum(x[k]), [XS.cell, { fmt }]));
        ws.set(r, 11, xlStr(x.note), XS.text);
        r++;
      });
      r++;
      const js = Calc.jumps(a);
      r = xlHeader(ws, r, ['Resum per tipus de prova', 'Intents', 'Millor altura (cm)', 'Altura mitjana (cm)', 'Millor potència (W)', 'Potència relativa (W/kg)', 'Millor força (N)', 'Millor velocitat (m/s)', 'Millor RSI-mod', ['', 2]]);
      for (const [type, s] of Object.entries(js)) {
        ws.set(r, 1, type, [XS.label]);
        ws.set(r, 2, s.n, XS.cell);
        [[s.best, '0.0'], [s.mean, '0.0'], [s.bestPower, '0'], [s.relPower, '0.0'], [s.bestForce, '0'], [s.bestVel, '0.00'], [s.bestRsi, '0.00']].forEach(([val, fmt], j) => ws.set(r, 3 + j, val == null ? null : val, [XS.cell, { fmt, b: j === 0 }]));
        ws.merge(r, 10, r, 11, '', XS.text);
        r++;
      }
      const extra = [];
      if (xlStr((a.jumps || {}).readiness)) extra.push(['Estat de forma (My Jump)', (OPT.readiness.find((o) => o.v === a.jumps.readiness) || {}).label || a.jumps.readiness]);
      if (xlStr((a.jumps || {}).note)) extra.push(['Observacions dels salts', xlStr(a.jumps.note)]);
      if (extra.length) r = xlKv(ws, r, extra, NCOLS);
      r++;
    }
    const enc = ((a.encoder && a.encoder.rows) || []).filter((x) => x.name && (xlNum(x.load) != null || xlNum(x.vel) != null || xlNum(x.power) != null));
    if (enc.length) {
      any = true;
      r = xlSection(ws, r, 'Encoder  ·  velocitat d\'execució', NCOLS);
      r = xlHeader(ws, r, ['Exercici', 'Càrrega (kg)', 'Velocitat mitjana (m/s)', 'Potència (W)']);
      for (const x of enc) {
        ws.set(r, 1, x.name, XS.text);
        ws.set(r, 2, xlNum(x.load), [XS.cell, { fmt: '0.0' }]);
        ws.set(r, 3, xlNum(x.vel), [XS.cell, { fmt: '0.00' }]);
        ws.set(r, 4, xlNum(x.power), [XS.cell, { fmt: '0' }]);
        r++;
      }
      r++;
    }
    const b = Calc.bike(a);
    if (b.peak != null) {
      any = true;
      r = xlSection(ws, r, 'Assault bike  ·  30 s all-out', NCOLS);
      r = xlHeader(ws, r, ['Mesura', 'Valor', 'Unitat']);
      const w = ref.weight;
      const rows = [['Potència pic', xlNum(a.bike.peak), 'W', '0'], ['Potència mitjana', xlNum(a.bike.mean), 'W', '0'], ['Potència mínima', xlNum(a.bike.min), 'W', '0']];
      const first = r;
      for (const [l, val, u, fmt] of rows) { ws.set(r, 1, l, XS.text); ws.set(r, 2, val, [XS.cell, { fmt }]); ws.set(r, 3, u, XS.cell); r++; }
      const rel = (cell, val) => ({ f: `IF(AND(ISNUMBER(${cell}),ISNUMBER(${w}),${w}>0),${cell}/${w},"")`, v: val ?? '' });
      ws.set(r, 1, 'Pic relatiu', XS.text); ws.set(r, 2, rel(xlRef(first, 2), b.peakRel), [XS.cell, { fmt: '0.0' }]); ws.set(r, 3, 'W/kg', XS.cell); r++;
      ws.set(r, 1, 'Mitjana relativa', XS.text); ws.set(r, 2, rel(xlRef(first + 1, 2), b.meanRel), [XS.cell, { fmt: '0.0' }]); ws.set(r, 3, 'W/kg', XS.cell); r++;
      ws.set(r, 1, 'Índex de fatiga', XS.text);
      ws.set(r, 2, { f: `IF(AND(ISNUMBER(${xlRef(first, 2)}),ISNUMBER(${xlRef(first + 2, 2)}),${xlRef(first, 2)}>0),(${xlRef(first, 2)}-${xlRef(first + 2, 2)})/${xlRef(first, 2)}*100,"")`, v: b.fatigue == null ? '' : b.fatigue }, [XS.cell, { fmt: '0.0' }]);
      ws.set(r, 3, '%', XS.cell); r++;
      r++;
    }
    if (!any) { ws.merge(r, 1, r, NCOLS, 'Aquest apartat no s\'ha mesurat en aquesta valoració.', [XS.text, { i: true, color: XL_C.MUTED }]); r += 2; }
    const items = ref.files.filter((m) => m.area === sec.id);
    if (items.length) { r = xlSection(ws, r, 'Fotos i vídeos d\'aquest apartat', NCOLS); mediaTable(ws, r, items, NCOLS); }
    return r;
  }

  // ── Patrons de moviment ──
  function patternsSheet(ws, { p, a, sec }) {
    const cols = [28, 11, 13, 12, 34, 12, 8, 44, 40];
    const NCOLS = cols.length;
    ws.cols(cols);
    let r = xlTitle(ws, `${sec.title} · ${U.fullName(p)}`, `${typeLabel(a)} del ${U.fmtDate(a.date)}  ·  0 = competent · − = a millorar · −− = limitació clara · P = dolor`, NCOLS);
    ws.freeze(r + 1, 2);
    const any = PATTERNS.some((pt) => anything((a.patterns || {})[pt.id]));
    if (!any) {
      ws.merge(r, 1, r, NCOLS, 'Els patrons de moviment no s\'han valorat en aquesta valoració.', [XS.text, { i: true, color: XL_C.MUTED }]);
      return r;
    }
    r = xlHeader(ws, r, ['Patró', 'Dreta', 'Esquerra', 'Pitjor', 'Compensacions', 'Segons (D · E)', 'Dolor', 'Decisió proposada', 'Observacions']);
    for (const pt of PATTERNS) {
      const x = (a.patterns || {})[pt.id] || {};
      if (!anything(x)) continue;
      const worst = Calc.patternScore(x, pt.uni);
      ws.set(r, 1, pt.name, [XS.text, { b: true }]);
      if (pt.uni) {
        ws.set(r, 2, SYM[x.sd] || '', [XS.cell, { b: true, sz: 12, fill: SCORE_FILL[x.sd] }]);
        ws.set(r, 3, SYM[x.se] || '', [XS.cell, { b: true, sz: 12, fill: SCORE_FILL[x.se] }]);
      } else ws.merge(r, 2, r, 3, SYM[x.score] || '', [XS.cell, { b: true, sz: 12, fill: SCORE_FILL[x.score] }]);
      ws.set(r, 4, SYM[worst] || '', [XS.cell, { b: true, sz: 12, fill: SCORE_FILL[worst] }]);
      ws.set(r, 5, (x.chips || []).join(', '), XS.text);
      ws.set(r, 6, pt.seconds ? [xlStr(x.secD) && `${xlStr(x.secD)} s`, xlStr(x.secE) && `${xlStr(x.secE)} s`].filter(Boolean).join(' · ') : '', XS.cell);
      ws.set(r, 7, x.pain ? 'P' : '', [XS.cell, { b: true, fill: x.pain ? XL_C.RED : null }]);
      const info = Calc.scoreInfo(worst);
      ws.set(r, 8, x.pain ? 'Dolor: s\'atura el test i es deriva al fisio.' : info ? info.decision : '', XS.text);
      ws.set(r, 9, xlStr(x.note), XS.text);
      r++;
    }
    r++;
    r = xlSection(ws, r, 'Escala de puntuació', NCOLS);
    for (const s of SCORES) {
      ws.set(r, 1, `${s.sym} · ${s.label}`, [XS.cell, { b: true, fill: SCORE_FILL[s.v], h: 'left' }]);
      ws.merge(r, 2, r, NCOLS, `${s.desc}  Decisió: ${s.decision}`, XS.text);
      r++;
    }
    ws.set(r, 1, `P · ${PAIN_INFO.label}`, [XS.cell, { b: true, fill: XL_C.RED, h: 'left' }]);
    ws.merge(r, 2, r, NCOLS, PAIN_INFO.desc, XS.text);
    r += 2;
    const items = media(a).filter((m) => m.area === sec.id);
    if (items.length) { r = xlSection(ws, r, 'Vídeos dels patrons', NCOLS); mediaTable(ws, r, items, NCOLS); }
    return r;
  }

  function freeSheet(ws, { p, a }) {
    ws.cols([36, 14, 14, 14, 12]);
    let r = xlTitle(ws, `Altres mesures · ${U.fullName(p)}`, `${typeLabel(a)} del ${U.fmtDate(a.date)}`, 5);
    r = xlHeader(ws, r, ['Mesura', 'Dreta (D)', 'Esquerra (E)', 'Valor únic', 'Unitat']);
    for (const x of (a.free || []).filter((y) => y.name)) {
      ws.set(r, 1, x.name, XS.text);
      ws.set(r, 2, xlNumOrText(x.d), XS.cell);
      ws.set(r, 3, xlNumOrText(x.e), XS.cell);
      ws.set(r, 4, xlNumOrText(x.v), XS.cell);
      ws.set(r, 5, xlStr(x.unit), XS.cell);
      r++;
    }
    return r;
  }

  return { build, media };
})();
