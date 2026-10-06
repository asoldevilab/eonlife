/* EON Life · les valoracions dins de l'Excel del client.
   · «Valoracions»: totes les valoracions (inicial, re-tests…) l'una al costat de l'altra, prova per prova (dreta i esquerra),
     amb el canvi entre les dues últimes en verd (millora) o vermell (empitjora).
   · Una pestanya per valoració («Val. inicial 06-10-26», «Re-test 06-01-27»…) amb tot el detall: dades, wellness, punts
     d'atenció, conclusions i cada apartat del protocol (mobilitat, força, rendiment, patrons i altres mesures) amb les
     fotos, els vídeos i els informes enllaçats. Només hi surt el que s'ha mesurat. */

const ExcelAssessment = (() => {
  const SYM = { '0': '0', '-': '−', '--': '−−' };
  const SCORE_FILL = { '0': XL_C.GRN, '-': XL_C.AMB, '--': XL_C.RED };
  const typeOf = (a) => OPT.assessmentTypes.find((t) => t.v === a.type) || {};
  const typeLabel = (a) => typeOf(a).label || 'Valoració';
  const hasVal = (v) => v !== '' && v != null && v !== false && !(Array.isArray(v) && !v.length);
  const anything = (x) => !!x && Object.values(x).some(hasVal);
  const measured = (x) => !!x && Object.entries(x).some(([k, v]) => !MEDIA_KEYS.includes(k) && hasVal(v));
  const decimals = (unit) => (unit === 'N' || unit === '°' ? '0' : '0.0');
  const SEC_COLOR = { mobilitat: XL_BLOCK.mob, forca: XL_BLOCK.for, rendiment: XL_BLOCK.pot, patrons: XL_BLOCK.acc, altres: XL_C.MUTED };
  const AREA = { mobilitat: 'Mobilitat', forca: 'Força', rendiment: 'Rendiment', patrons: 'Patrons', altres: 'Altres', tot: 'General' };

  // Nom de la pestanya d'una valoració: «Val. inicial 06-10-26», «Re-test 06-01-27»…
  function sheetName(a, taken) {
    const d = String(a.date || '');
    const base = `${a.type === 'inicial' ? 'Val. inicial' : typeOf(a).short || 'Valoració'} ${d.slice(8, 10)}-${d.slice(5, 7)}-${d.slice(2, 4)}`;
    let name = base, n = 2;
    while (taken.has(name.toLowerCase())) name = `${base} (${n++})`;
    taken.add(name.toLowerCase());
    return name;
  }

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

  // ════════════════ Pestanya de detall d'una valoració ════════════════
  const NC = 11;
  const WIDTHS = [34, 12, 12, 11, 22, 12, 11, 12, 11, 11, 34];

  // Franja de color d'un apartat del protocol.
  function band(ws, r, text, color, sub) {
    ws.merge(r, 1, r, NC, { rich: [[text, { b: true, sz: 12, color: 'FFFFFF' }], [sub ? `   ${sub}` : '', { sz: 10, i: true, color: 'FFFFFF' }]] }, { fill: color, h: 'left', v: 'center', indent: 1 });
    ws.rowH(r, 24);
    return r + 1;
  }

  function mediaTable(ws, r, items) {
    r = xlHeader(ws, r, [['Fitxer', NC - 3], 'Tipus', ['Enllaç', 2]]);
    for (const m of items) {
      ws.merge(r, 1, r, NC - 3, m.label, XS.text);
      ws.set(r, NC - 2, m.kind, XS.cell);
      ws.merge(r, NC - 1, r, NC, xlIsWeb(m.url) ? 'Obre' : 'Desat a la tauleta (versió de prova)', [XS.cell, xlIsWeb(m.url) ? XS.link : XS.muted]);
      if (xlIsWeb(m.url)) ws.link(r, NC - 1, m.url, 'Obre el fitxer');
      r++;
    }
    return r;
  }

  function detailSheet(doc, { p, a, previous = null, name, settings }) {
    const ws = doc.sheet(name, { grid: false, landscape: true, tab: XL_C.BRAND_L, zoom: 90 });
    ws.cols(WIDTHS);
    const ref = { weight: null, files: media(a), name };
    let r = xlTitle(ws, `${typeLabel(a)} · ${U.fullName(p)}`, `${U.fmtDateLong(a.date)}${a.professional ? ` · ${a.professional}` : ''}`, NC);
    r = summary(ws, r, { p, a, previous, ref, settings });
    const skipped = [];
    for (const sec of PROTOCOL) {
      const before = r;
      r = section(ws, r, { a, sec, ref });
      if (r === before) skipped.push(sec.short);
    }
    if (skipped.length) {
      ws.merge(r, 1, r, NC, `Sense dades en aquesta valoració: ${skipped.join(', ')}.`, [XS.note, { wrap: true }]);
      r += 2;
    }
    const gen = ref.files.filter((m) => m.area === 'tot');
    if (gen.length) {
      r = xlSection(ws, r, 'Informes i vídeo general (a la carpeta «Valoracions»)', NC);
      r = mediaTable(ws, r, gen) + 1;
    }
    return ws;
  }

  function summary(ws, r, { p, a, previous, ref }) {
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
    ref.weight = `${xlSheetRef(ref.name, weightRow, 2).replace(/!([A-Z]+)(\d+)$/, '!$$$1$$$2')}`;
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
    r = xlSection(ws, r, 'Indicadors clau', NC);
    r = xlKv(ws, r, key, NC) + 1;

    // Wellness
    const wl = Calc.wellness(a.wellness);
    if (wl) {
      r = xlSection(ws, r, 'Wellness · com arriba avui?', NC);
      r = xlHeader(ws, r, ['Pregunta', 'Resposta (1–5)', ['1 =', 4], ['5 =', NC - 6]]);
      const first = r;
      for (const q of WELLNESS) {
        const v = U.num((a.wellness || {})[q.k]);
        ws.set(r, 1, q.label, XS.label);
        ws.set(r, 2, v, [XS.cell, { b: true, fmt: '0', fill: v == null ? null : v <= 2 ? XL_C.RED : v === 3 ? XL_C.AMB : XL_C.GRN }]);
        ws.merge(r, 3, r, 6, q.lo, [XS.text, { color: XL_C.MUTED }]);
        ws.merge(r, 7, r, NC, q.hi, [XS.text, { color: XL_C.MUTED }]);
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
      r = xlHeader(ws, r, ['Àrea', 'Nivell', ['Descripció', NC - 2]]);
      for (const al of alerts) {
        ws.set(r, 1, AREA[al.section] || al.section, XS.text);
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
      ws.merge(r, 1, r, NC, `Evolució respecte a la valoració anterior (${U.fmtDate(previous.date)}) i les altres: pestanya «Valoracions».`, [XS.text, { u: true, color: XL_C.LINK }]);
      ws.link(r, 1, xlGo('Valoracions'), 'Vés a l\'evolució de les valoracions');
      r += 2;
    }
    return r;
  }

  // Un apartat del protocol (només si s'hi ha mesurat alguna cosa). Retorna la fila següent, o la mateixa si no hi ha res.
  function section(ws, r, { a, sec, ref }) {
    const start = r;
    let body = r + 1;
    const items = ref.files.filter((m) => m.area === sec.id);
    if (sec.id === 'patrons') body = patterns(ws, body, { a });
    else if (sec.id === 'altres') body = free(ws, body, { a });
    else if (sec.id === 'rendiment') body = performance(ws, body, { a, ref });
    else {
      for (const g of sec.groups) {
        const before = body;
        body = groupBlock(ws, body, { a, g, ref });
        if (body !== before) body++;
      }
    }
    if (body === start + 1 && !items.length) return start; // res a mostrar
    band(ws, start, sec.title, SEC_COLOR[sec.id], sec.id === 'patrons' ? '0 = competent · − = a millorar · −− = limitació clara · P = dolor' : sec.id !== 'rendiment' && sec.id !== 'altres' ? 'D = dreta · E = esquerra' : '');
    r = body;
    if (items.length) { r = xlSection(ws, r, 'Fotos i vídeos d\'aquest apartat', NC); r = mediaTable(ws, r, items); }
    return r + 1;
  }

  // Un grup de tests (una taula per cada tipus de prova consecutiu). Retorna la fila següent, o la mateixa si no hi ha res.
  function groupBlock(ws, r, { a, g, ref }) {
    const v = a.values || {};
    const tests = (g.tests || []).map((t0) => TEST_INDEX[t0.id]);
    const title = `${g.title || ''}${g.device ? `  ·  ${g.device}` : ''}`;
    if (g.kind === 'ybt') return ybtBlock(ws, r, { a, title });
    if (['encoder', 'jumps', 'bike', 'patterns', 'free'].includes(g.kind)) return r;
    const shown = tests.filter((t) => measured(v[t.id]) || (anything(v[t.id]) && !t.optional));
    if (!shown.length) return r;
    r = xlSection(ws, r, title, NC);
    const runs = [];
    for (const t of shown) {
      const last = runs[runs.length - 1];
      if (last && last.kind === t.kind) last.tests.push(t); else runs.push({ kind: t.kind, tests: [t] });
    }
    runs.forEach((run, i) => {
      if (i) r++;
      r = runTable(ws, r, { a, g, run, ref, v });
    });
    return r;
  }

  function runTable(ws, r, { a, g, run, ref, v }) {
    const shown = run.tests;
    if (run.kind === 'bi') {
      const perKg = shown.some((t) => t.perKg);
      r = xlHeader(ws, r, ['Prova', 'Dreta (D)', 'Esquerra (E)', 'Unitat', shown.every((t) => t.diffOnly) ? 'Diferència' : 'Asimetria / dif.', ...(perKg ? ['Dreta (N/kg)', 'Esquerra (N/kg)', ['Observacions', NC - 7]] : [['Observacions', NC - 5]])]);
      for (const t of shown) {
        const x = v[t.id] || {};
        const d = xlNum(x.d), e = xlNum(x.e);
        const fmt = decimals(t.unit);
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
          ws.merge(r, 8, r, NC, xlStr(x.note), XS.text);
        } else ws.merge(r, 6, r, NC, xlStr(x.note), XS.text);
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
          ws.merge(r, 4, r, NC, '', XS.text);
          r++;
        }
      }
    } else if (run.kind === 'biSelect') {
      r = xlHeader(ws, r, ['Prova', 'Dreta (D)', 'Esquerra (E)', ['Observacions', NC - 3]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        const pos = (s) => /^Positiu/.test(xlStr(s));
        ws.set(r, 1, t.name, XS.text);
        ws.set(r, 2, xlStr(x.d), [XS.cellW, pos(x.d) ? { fill: XL_C.AMB, b: true } : null]);
        ws.set(r, 3, xlStr(x.e), [XS.cellW, pos(x.e) ? { fill: XL_C.AMB, b: true } : null]);
        ws.merge(r, 4, r, NC, xlStr(x.note), XS.text);
        r++;
      }
    } else if (run.kind === 'select') {
      r = xlHeader(ws, r, ['Prova', ['Resultat', 2], ['Observacions', NC - 3]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        ws.set(r, 1, t.name, XS.text);
        ws.merge(r, 2, r, 3, xlStr(x.v), [XS.cellW, /^Positiu/.test(xlStr(x.v)) ? { fill: XL_C.AMB, b: true } : null]);
        ws.merge(r, 4, r, NC, xlStr(x.note), XS.text);
        r++;
      }
    } else if (run.kind === 'scoreBi') {
      r = xlHeader(ws, r, ['Prova', 'Dreta (D)', 'Esquerra (E)', 'Dolor', ['Compensacions observades', 2], ['Observacions', NC - 6]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        ws.set(r, 1, t.name, XS.text);
        for (const [col, key] of [[2, 'sd'], [3, 'se']]) ws.set(r, col, SYM[x[key]] || '', [XS.cell, { b: true, sz: 12, fill: SCORE_FILL[x[key]] }]);
        ws.set(r, 4, x.pain ? 'P' : '', [XS.cell, { b: true, fill: x.pain ? XL_C.RED : null }]);
        ws.merge(r, 5, r, 6, (x.chips || []).join(', '), XS.text);
        ws.merge(r, 7, r, NC, xlStr(x.note), XS.text);
        r++;
      }
      ws.merge(r, 1, r, NC, '0 = competent · − = a millorar · −− = limitació clara · P = dolor o símptomes (s\'atura el test i es deriva al fisio).', [XS.note, { wrap: true }]);
      r++;
    } else if (run.kind === 'single') {
      r = xlHeader(ws, r, ['Prova', 'Valor', 'Unitat', ['Observacions', NC - 3]]);
      for (const t of shown) {
        const x = v[t.id] || {};
        ws.set(r, 1, t.name, XS.text);
        ws.set(r, 2, xlNum(x.v), [XS.cell, { b: true }]);
        ws.set(r, 3, t.unit, XS.cell);
        ws.merge(r, 4, r, NC, xlStr(x.note), XS.text);
        r++;
      }
    }
    return r;
  }

  function ybtBlock(ws, r, { a, title }) {
    const y = Calc.ybt(a), raw = a.ybt || {};
    const has = ['d', 'e'].some((s) => ['ant', 'pm', 'pl', 'len'].some((k) => xlStr((raw[s] || {})[k]).trim()));
    if (!has) return r;
    r = xlSection(ws, r, `${title}  ·  1 intent per direcció i cama`, NC);
    r = xlHeader(ws, r, ['Direcció', 'Dreta (cm)', 'Esquerra (cm)', 'Diferència (cm)', ['Observacions', NC - 4]]);
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
      ws.merge(r, 5, r, NC, k === 'ant' ? `Diferència ≥ ${THRESHOLDS.ybtAntDiff} cm a l'anterior = punt d'atenció.` : '', [XS.text, { color: XL_C.MUTED }]);
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
    ws.merge(r, 5, r, NC, 'Composite = (anterior + posteromedial + posterolateral) ÷ (3 × longitud de la cama) × 100.', [XS.text, { color: XL_C.MUTED }]);
    r++;
    if (xlStr(raw.note).trim()) r = xlKv(ws, r, [['Observacions', xlStr(raw.note)]], NC);
    return r;
  }

  // ── Rendiment: salts, encoder i bike ──
  function performance(ws, r, { a, ref }) {
    const attempts = ((a.jumps && a.jumps.attempts) || []).filter((x) => U.num(x.height) != null || U.num(x.power) != null);
    if (attempts.length) {
      r = xlSection(ws, r, 'Salts  ·  My Jump Lab', NC);
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
      if (extra.length) r = xlKv(ws, r, extra, NC);
      r++;
    }
    const enc = ((a.encoder && a.encoder.rows) || []).filter((x) => x.name && (xlNum(x.load) != null || xlNum(x.vel) != null || xlNum(x.power) != null));
    if (enc.length) {
      r = xlSection(ws, r, 'Encoder  ·  velocitat d\'execució', NC);
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
      r = xlSection(ws, r, 'Assault bike  ·  30 s all-out', NC);
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
    return r;
  }

  // ── Patrons de moviment ──
  function patterns(ws, r, { a }) {
    if (!PATTERNS.some((pt) => anything((a.patterns || {})[pt.id]))) return r;
    r = xlHeader(ws, r, ['Patró', 'Dreta', 'Esquerra', 'Pitjor', 'Compensacions', 'Segons (D · E)', 'Dolor', ['Decisió proposada', 2], ['Observacions', NC - 9]]);
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
      // La decisió escrita pel professional; si no n'hi ha, la que es proposa segons la puntuació.
      ws.merge(r, 8, r, 9, xlStr(x.decision).trim() || (x.pain ? 'Dolor: s\'atura el test i es deriva al fisio.' : info ? info.decision : ''), XS.text);
      ws.merge(r, 10, r, NC, xlStr(x.note), XS.text);
      r++;
    }
    r++;
    ws.merge(r, 1, r, NC, `${SCORES.map((s) => `${s.sym} = ${s.label.toLowerCase()}`).join(' · ')} · P = ${PAIN_INFO.label.toLowerCase()}`, [XS.note, { wrap: true }]);
    return r + 1;
  }

  function free(ws, r, { a }) {
    const list = (a.free || []).filter((y) => y.name);
    if (!list.length) return r;
    r = xlHeader(ws, r, ['Mesura', 'Dreta (D)', 'Esquerra (E)', 'Valor únic', 'Unitat']);
    for (const x of list) {
      ws.set(r, 1, x.name, XS.text);
      ws.set(r, 2, xlNumOrText(x.d), XS.cell);
      ws.set(r, 3, xlNumOrText(x.e), XS.cell);
      ws.set(r, 4, xlNumOrText(x.v), XS.cell);
      ws.set(r, 5, xlStr(x.unit), XS.cell);
      r++;
    }
    return r;
  }

  // ════════════════ «Valoracions»: l'evolució, una valoració al costat de l'altra ════════════════
  // Cada fila: { label, unit, get(a) → { d, e } | { v } | { t } | { sd, se } (puntuacions), dir: 1 més és millor, -1 menys és millor, 0 neutre, fmt }
  function evolutionRows(list) {
    const any = (get) => list.some((a) => { const x = get(a); return x && Object.values(x).some((y) => y != null && y !== ''); });
    const sections = [];
    const sec = (title, color, rows) => { const kept = rows.filter((x) => any(x.get)); if (kept.length) sections.push({ title, color, rows: kept }); };
    // Dades generals
    sec('Dades i estat del dia', XL_C.BRAND_M, [
      { label: 'Professional', get: (a) => ({ t: xlStr(a.professional) || null }) },
      { label: 'Pes', unit: 'kg', fmt: '0.0', dir: 0, get: (a) => ({ v: Calc.weight(a) }) },
      { label: 'Alçada', unit: 'cm', fmt: '0', dir: 0, get: (a) => ({ v: xlNum((a.general || {}).height) }) },
      { label: 'IMC', unit: 'kg/m²', fmt: '0.0', dir: 0, get: (a) => ({ v: Calc.bmi(xlNum((a.general || {}).weight), xlNum((a.general || {}).height)) }) },
      { label: 'Wellness (total)', unit: '/25', fmt: '0', dir: 1, get: (a) => { const w = Calc.wellness(a.wellness); return { v: w && w.total != null ? w.total : null }; } },
      { label: 'Punts d\'atenció', unit: '', fmt: '0', dir: -1, get: (a) => ({ v: Calc.alerts(a).length }) },
    ]);
    for (const s of PROTOCOL) {
      const rows = [];
      for (const g of s.groups) {
        if (g.kind === 'ybt') {
          for (const [label, k] of [['Y-Balance · anterior', 'ant'], ['Y-Balance · posteromedial', 'pm'], ['Y-Balance · posterolateral', 'pl'], ['Y-Balance · longitud de la cama', 'len']]) {
            rows.push({ label, unit: 'cm', fmt: '0', dir: k === 'len' ? 0 : 1, get: (a) => ({ d: xlNum(((a.ybt || {}).d || {})[k]), e: xlNum(((a.ybt || {}).e || {})[k]) }) });
          }
          rows.push({ label: 'Y-Balance · composite', unit: '%', fmt: '0.0', dir: 1, bold: true, get: (a) => { const y = Calc.ybt(a); return { d: y.d.comp, e: y.e.comp }; } });
          continue;
        }
        if (g.kind === 'jumps') {
          const types = [...new Set(list.flatMap((a) => Object.keys(Calc.jumps(a) || {})))];
          for (const type of types) {
            rows.push({ label: `${type} · millor altura`, unit: 'cm', fmt: '0.0', dir: 1, bold: true, get: (a) => { const j = (Calc.jumps(a) || {})[type]; return { v: j ? j.best : null }; } });
            rows.push({ label: `${type} · potència relativa`, unit: 'W/kg', fmt: '0.0', dir: 1, get: (a) => { const j = (Calc.jumps(a) || {})[type]; return { v: j ? j.relPower : null }; } });
          }
          continue;
        }
        if (g.kind === 'encoder') {
          const exs = [...new Set(list.flatMap((a) => ((a.encoder && a.encoder.rows) || []).map((x) => xlStr(x.name).trim()).filter(Boolean)))];
          for (const name of exs) {
            const pick = (a) => ((a.encoder && a.encoder.rows) || []).find((x) => xlStr(x.name).trim() === name) || {};
            // La velocitat només es pot comparar a la mateixa càrrega: es mostra el canvi, però sense color.
            rows.push({ label: `Encoder · ${name} · velocitat`, unit: 'm/s', fmt: '0.00', dir: 0, get: (a) => ({ v: xlNum(pick(a).vel) }) });
            rows.push({ label: `Encoder · ${name} · càrrega`, unit: 'kg', fmt: '0.0', dir: 0, get: (a) => ({ v: xlNum(pick(a).load) }) });
          }
          continue;
        }
        if (g.kind === 'bike') {
          rows.push({ label: 'Assault bike · potència pic', unit: 'W', fmt: '0', dir: 1, get: (a) => ({ v: Calc.bike(a).peak }) });
          rows.push({ label: 'Assault bike · potència mitjana', unit: 'W', fmt: '0', dir: 1, get: (a) => ({ v: Calc.bike(a).mean != null ? Calc.bike(a).mean : xlNum((a.bike || {}).mean) }) });
          rows.push({ label: 'Assault bike · índex de fatiga', unit: '%', fmt: '0.0', dir: -1, get: (a) => ({ v: Calc.bike(a).fatigue }) });
          continue;
        }
        if (g.kind === 'patterns') {
          for (const pt of PATTERNS) {
            rows.push({ label: pt.name, score: true, get: (a) => { const x = (a.patterns || {})[pt.id] || {}; return pt.uni ? { sd: x.sd || null, se: x.se || null, pain: !!x.pain } : { s: x.score || null, pain: !!x.pain }; } });
          }
          continue;
        }
        if (g.kind === 'free') {
          const names = [...new Set(list.flatMap((a) => (a.free || []).map((x) => xlStr(x.name).trim()).filter(Boolean)))];
          for (const name of names) {
            const pick = (a) => (a.free || []).find((x) => xlStr(x.name).trim() === name) || {};
            rows.push({ label: name, unit: xlStr((list.map(pick).find((x) => x.unit) || {}).unit), dir: 0, get: (a) => { const x = pick(a); return xlStr(x.v).trim() ? { v: xlNumOrText(x.v) } : { d: xlNumOrText(x.d), e: xlNumOrText(x.e) }; } });
          }
          continue;
        }
        for (const t0 of g.tests || []) {
          const t = TEST_INDEX[t0.id];
          const x = (a) => ((a.values || {})[t.id] || {});
          if (t.kind === 'bi') {
            rows.push({ label: t.name, unit: t.unit, fmt: decimals(t.unit), dir: t.lowerBetter ? -1 : t.diffOnly && t.rule !== 'wblt' ? 0 : 1, get: (a) => ({ d: xlNum(x(a).d), e: xlNum(x(a).e) }) });
            if (t.perKg) rows.push({ label: `${t.name} (relativa)`, unit: 'N/kg', fmt: '0.0', dir: 1, get: (a) => ({ d: Calc.perKg(x(a).d, Calc.weight(a)), e: Calc.perKg(x(a).e, Calc.weight(a)) }) });
          } else if (t.kind === 'single') rows.push({ label: t.name, unit: t.unit, fmt: decimals(t.unit), dir: t.lowerBetter ? -1 : 1, get: (a) => ({ v: xlNum(x(a).v) }) });
          else if (t.kind === 'select') rows.push({ label: t.name, get: (a) => ({ t: xlStr(x(a).v) || null }) });
          else if (t.kind === 'biSelect') rows.push({ label: t.name, get: (a) => ({ td: xlStr(x(a).d) || null, te: xlStr(x(a).e) || null }) });
          else if (t.kind === 'scoreBi') rows.push({ label: t.name, score: true, get: (a) => ({ sd: x(a).sd || null, se: x(a).se || null, pain: !!x(a).pain }) });
        }
        if (g.id === 'dyn') rows.push({ label: 'Ràtio isquiotibials / quàdriceps', unit: '', fmt: '0.00', dir: 1, get: (a) => { const hq = Calc.hq(a); return { d: hq.d, e: hq.e }; } });
      }
      sec(s.title, SEC_COLOR[s.id], rows);
    }
    sec('Conclusions', XL_C.BRAND_M, [
      { label: 'Punts forts', text: true, get: (a) => ({ t: xlStr((a.conclusions || {}).strengths).trim() || null }) },
      { label: 'Prioritats', text: true, get: (a) => ({ t: xlStr((a.conclusions || {}).priorities).trim() || null }) },
      { label: 'Decisions per al pla', text: true, get: (a) => ({ t: xlStr((a.conclusions || {}).plan).trim() || null }) },
    ]);
    return sections;
  }

  function evolutionSheet(doc, { p, list, names }) {
    const ws = doc.sheet('Valoracions', { grid: false, landscape: true, tab: XL_C.BRAND, zoom: 90 });
    const n = list.length;
    const cmp = n >= 2;
    const first = 3;                                   // primera columna de valoracions
    const last = first + 2 * n - 1;
    const NCv = last + (cmp ? 2 : 0);
    ws.col(1, 38); ws.col(2, 8);
    for (let c = first; c <= NCv; c++) ws.col(c, 10);
    let r = xlTitle(ws, `Valoracions · ${U.fullName(p)}`, `${U.plural(n, 'valoració', 'valoracions')}, de la més antiga a la més nova · D = dreta, E = esquerra${cmp ? ' · el canvi és entre les dues últimes (verd = millora, vermell = empitjora)' : ''}`, NCv);
    // Capçalera de dues files
    const hd = (r1, c1, r2, c2, text, extra) => ws.merge(r1, c1, r2, c2, text, [XS.head, extra]);
    hd(r, 1, r + 1, 1, 'Prova', { h: 'left', indent: 1 });
    hd(r, 2, r + 1, 2, 'Unitat');
    list.forEach((a, i) => {
      const c = first + 2 * i;
      hd(r, c, r, c + 1, `${typeOf(a).short || 'Valoració'} · ${U.fmtDate(a.date)}`, { u: !!names[a.id] });
      if (names[a.id]) ws.link(r, c, xlGo(names[a.id]), 'Vés al detall d\'aquesta valoració');
      hd(r + 1, c, r + 1, c, 'D'); hd(r + 1, c + 1, r + 1, c + 1, 'E');
    });
    if (cmp) { hd(r, last + 1, r, last + 2, 'Canvi'); hd(r + 1, last + 1, r + 1, last + 1, 'D'); hd(r + 1, last + 2, r + 1, last + 2, 'E'); }
    ws.rowH(r, 30);
    r += 2;
    ws.freeze(r, 3);
    if (!n) return ws;
    for (const s of evolutionRows(list)) {
      ws.merge(r, 1, r, NCv, s.title, { b: true, sz: 11, color: 'FFFFFF', fill: s.color, h: 'left', v: 'center', indent: 1 });
      ws.rowH(r, 20);
      r++;
      for (const row of s.rows) {
        ws.set(r, 1, row.label, [XS.text, row.bold ? { b: true } : null]);
        ws.set(r, 2, row.unit || '', [XS.cell, XS.muted]);
        const vals = list.map((a) => row.get(a) || {});
        vals.forEach((x, i) => {
          const c = first + 2 * i;
          const num = (v) => [v == null || v === '' ? null : v, [XS.cell, row.fmt && typeof v === 'number' ? { fmt: row.fmt } : null, i === n - 1 ? { b: true } : null]];
          if (row.score) {
            const one = (k) => [SYM[k] || '', [XS.cell, { b: true, sz: 11, fill: SCORE_FILL[k] }]];
            if ('s' in x) ws.merge(r, c, r, c + 1, `${SYM[x.s] || ''}${x.pain ? ' P' : ''}`, [XS.cell, { b: true, sz: 11, fill: x.pain ? XL_C.RED : SCORE_FILL[x.s] }]);
            else {
              ws.set(r, c, ...one(x.sd)); ws.set(r, c + 1, ...one(x.se));
              if (x.pain) ws.set(r, c + 1, `${SYM[x.se] || ''} P`, [XS.cell, { b: true, sz: 11, fill: XL_C.RED }]);
            }
          } else if (row.text || 't' in x) ws.merge(r, c, r, c + 1, x.t || '', [XS.text, { sz: 9 }]);
          else if ('td' in x) {
            const pos = (s) => /^Positiu/.test(xlStr(s));
            ws.set(r, c, x.td || '', [XS.cellW, { sz: 9 }, pos(x.td) ? { fill: XL_C.AMB, b: true } : null]);
            ws.set(r, c + 1, x.te || '', [XS.cellW, { sz: 9 }, pos(x.te) ? { fill: XL_C.AMB, b: true } : null]);
          } else if ('v' in x) ws.merge(r, c, r, c + 1, ...num(x.v));
          else { ws.set(r, c, ...num(x.d)); ws.set(r, c + 1, ...num(x.e)); }
        });
        if (cmp) {
          const a = vals[n - 1], b = vals[n - 2];
          const delta = (k, col, span) => {
            const x = a[k], y = b[k];
            if (row.score || row.text || typeof x !== 'number' || typeof y !== 'number') { if (span) ws.merge(r, col, r, col + 1, '', XS.cell); else ws.set(r, col, '', XS.cell); return; }
            const dlt = x - y;
            const better = !row.dir || Math.abs(dlt) < 1e-9 ? null : row.dir > 0 ? dlt > 0 : dlt < 0;
            const fmtd = row.fmt || '0.0';
            // El canvi es calcula a l'Excel amb les dues columnes.
            const ca = first + 2 * (n - 1) + (k === 'e' ? 1 : 0), cb = first + 2 * (n - 2) + (k === 'e' ? 1 : 0);
            const f = k === 'v' ? `IF(COUNT(${xlRef(r, ca)},${xlRef(r, cb)})=2,${xlRef(r, ca)}-${xlRef(r, cb)},"")` : `IF(COUNT(${xlRef(r, ca)},${xlRef(r, cb)})=2,${xlRef(r, ca)}-${xlRef(r, cb)},"")`;
            const st = [XS.cell, { fmt: `+${fmtd};-${fmtd};${fmtd}`, b: better != null, fill: better === true ? XL_C.GRN : better === false ? XL_C.RED : null }];
            if (span) ws.merge(r, col, r, col + 1, { f, v: dlt }, st); else ws.set(r, col, { f, v: dlt }, st);
          };
          if ('v' in a || 'v' in b) delta('v', last + 1, true);
          else { delta('d', last + 1); delta('e', last + 2); }
        }
        r++;
      }
    }
    r++;
    ws.merge(r, 1, r, NCv, `Verd = millora · vermell = empitjora, segons la prova (en algunes, com el temps o la fatiga, un valor més baix és millor). El pes, l'alçada i la velocitat de l'encoder (depèn de la càrrega) no es valoren. Patrons: ${SCORES.map((x) => `${x.sym} = ${x.label.toLowerCase()}`).join(' · ')} · P = dolor. Clica la data d'una valoració per veure'n tot el detall.`, [XS.note, { wrap: true }]);
    ws.rowH(r, 30);
    return ws;
  }

  return { detailSheet, evolutionSheet, evolutionRows, media, sheetName, typeLabel };
})();
