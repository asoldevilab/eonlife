/* EON Life · Excel gegant de visió general d'un client (a la carpeta «Sessions»).
   S'omple sol amb tot el que es fa a l'app: sessions fetes, planificades i previstes als plans.
   Fulls: «Resum» (perfil, dates clau, plans, valoracions i càrrega setmanal), dues pestanyes per mes
   («Octubre 2026» = calendari d'un cop d'ull, «Octubre 2026 · detall» = totes les sessions amb exercicis,
   setmanes en columnes com l'Excel de control de l'equip) i «Registre» (una fila per sessió, per filtrar). */

const ExcelOverview = (() => {
  const DAYS = ['Dilluns', 'Dimarts', 'Dimecres', 'Dijous', 'Divendres', 'Dissabte', 'Diumenge'];
  const dm = (iso) => `${String(iso).slice(8, 10)}/${String(iso).slice(5, 7)}`;
  const names = (b) => (b.items || []).filter((i) => i.name);
  const usedBlocks = (s) => (s.blocks || []).filter((b) => names(b).length);
  const REG = 'Registre';
  const REG_FIRST = 6; // primera fila de dades del registre

  // Línies d'una sessió al calendari (text enriquit).
  function dayRuns(s, state, { sz = 9, settings }) {
    const runs = [];
    const add = (t, st) => runs.push([t, { sz, ...(st || {}) }]);
    const label = s.ghost ? `S${s.planN} del pla` : `Sessió ${s.number || ''}`.trim();
    add(`${label} · ${state.key === 'feta' ? 'FETA ✔' : state.key === 'prevista' ? 'PREVISTA' : state.key === 'sense' ? 'SENSE TANCAR' : 'PLANIFICADA'}`, { b: true, color: XL_C.BRAND });
    if (s.goal) add(`\n${s.goal}`, { i: true, color: XL_C.MUTED });
    for (const b of usedBlocks(s)) {
      const list = names(b).map((it) => (['for', 'pot'].includes(b.key) && (it.sets || it.reps) ? `${it.name} ${it.sets && it.reps ? `${it.sets}×${it.reps}` : it.reps || it.sets}${Calc.load(it.load) ? ` ${Calc.load(it.load)}` : ''}` : it.name));
      add(`\n${xlBlockName(b.key, settings)}: `, { b: true, color: XL_BLOCK[b.key] });
      add(list.join(' · '));
    }
    if (state.key === 'feta') {
      const f = s.feedback || {}, load = Calc.sessionLoad(s), wl = Calc.wellness(s.wellness);
      const parts = [f.rpe !== '' && f.rpe != null ? `RPE ${f.rpe}` : '', f.duration ? `${f.duration} min` : '', load != null ? `${U.fmt(load, 0)} UA` : '', wl && wl.total != null ? `wellness ${wl.total}/25` : ''].filter(Boolean);
      if (parts.length) add(`\n${parts.join(' · ')}`, { b: true, color: '3D6B2E' });
    }
    return runs;
  }

  function monthsOf(items, today) {
    const set = new Set(items.map((s) => U.monthKey(s.date)).filter(Boolean));
    set.add(U.monthKey(today));
    return [...set].sort().slice(-24);
  }

  // Estat visible (les previstes dels plans a part) i dades normalitzades de cada sessió.
  function rowOf(s, today, settings) {
    const state = xlSessionState(s, today);
    const f = s.feedback || {};
    const wl = Calc.wellness(s.wellness);
    const its = (s.blocks || []).flatMap((b) => names(b));
    return {
      s, state, date: s.date, week: U.weekStart(s.date), month: U.monthKey(s.date),
      rpe: s.status === 'feta' ? xlNum(f.rpe) : null, dur: s.status === 'feta' ? xlNum(f.duration) : null,
      pain: s.status === 'feta' ? xlNum(f.pain) : null, wellness: wl && wl.total != null ? wl.total : null,
      n: its.length, done: its.filter((i) => i.done).length, ua: s.status === 'feta' ? Calc.sessionLoad(s) : null,
    };
  }

  function build({ patient: p, items, plans, assessments, settings, today, links = {} }) {
    const rows = items.map((s) => rowOf(s, today, settings));
    const months = monthsOf(items, today);
    const doc = XlsxDoc.create({ title: `Visió general · ${U.fullName(p)}`, subject: 'Visió general de les sessions', creator: 'EON Life', company: (settings && settings.centerName) || 'EON Life' });
    const wsRes = doc.sheet('Resum', { grid: false, landscape: true, tab: XL_C.BRAND, zoom: 100 });
    const pairs = months.map((m) => ({
      m,
      cal: doc.sheet(U.fmtMonth(m), { grid: false, landscape: true, tab: XL_C.BRAND_M, zoom: 80, freeze: [1, 2] }),
      det: doc.sheet(`${U.fmtMonth(m)} · detall`, { grid: false, landscape: true, tab: XL_BLOCK.for, zoom: 80 }),
    }));
    const wsReg = doc.sheet(REG, { grid: false, landscape: true, tab: XL_C.MUTED, zoom: 100, titles: [5, 5] });
    const last = REG_FIRST + Math.max(rows.length, 1) - 1;
    const R = (col) => `'${REG}'!$${col}$${REG_FIRST}:$${col}$${last}`; // rang d'una columna del registre

    registerSheet(wsReg, { p, rows, links, plans });
    const where = {}; // id de sessió → { sheet, row, col } al full de detall
    for (const x of pairs) detailSheet(x.det, { p, m: x.m, rows, settings, where, today });
    for (const x of pairs) calendarSheet(x.cal, { p, m: x.m, rows, settings, where, R, today, detName: x.det.name });
    summarySheet(wsRes, { p, rows, plans, assessments, settings, today, links, R, pairs });
    // S'obre pel mes actual (o el més proper).
    const cur = pairs.findIndex((x) => x.m === U.monthKey(today));
    if (cur >= 0) doc.active = pairs[cur].cal.index;
    return doc;
  }

  // ── Registre: una fila per sessió ──
  function registerSheet(ws, { p, rows, links, plans }) {
    const cols = [['Data', 11], ['Setmana', 11], ['Mes', 9], ['Sessió', 10], ['Estat', 15], ['Objectiu', 36], ['Professional', 16], ['Pla', 24], ['S del pla', 8], ['RPE', 7], ['Durada (min)', 10], ['Càrrega (UA)', 11], ['Dolor', 7], ['Wellness (/25)', 10], ['Exercicis', 9], ['Fets', 7], ['Fitxer', 14]];
    ws.cols(cols.map((c) => c[1]));
    let r = xlTitle(ws, `Registre de sessions · ${U.fullName(p)}`, 'Una fila per sessió: filtra i ordena com vulguis (les dades són les de l\'app).', cols.length);
    ws.freeze(r + 1, 3);
    cols.forEach(([label], i) => ws.set(r, i + 1, label, XS.head));
    ws.rowH(r, 28);
    r++;
    ws.autoFilter(`A${r - 1}:${xlCol(cols.length)}${r - 1 + Math.max(rows.length, 1)}`);
    if (!rows.length) { ws.merge(r, 1, r, cols.length, 'Encara no hi ha cap sessió. Crea-la des de l\'app.', [XS.text, { i: true, color: XL_C.MUTED }]); return; }
    for (const x of rows) {
      const s = x.s;
      const plan = s.planId ? ((plans || []).find((x) => x.id === s.planId) || {}).name || '' : '';
      ws.set(r, 1, { date: x.date }, [XS.cell, { fmt: 'dd/mm/yyyy' }]);
      ws.set(r, 2, { date: x.week }, [XS.cell, { fmt: 'dd/mm/yyyy', color: XL_C.MUTED }]);
      ws.set(r, 3, x.month, [XS.cell, { color: XL_C.MUTED }]);
      ws.set(r, 4, s.ghost ? `S${s.planN}` : U.num(s.number) ?? '', XS.cell);
      ws.set(r, 5, x.state.label, [XS.cell, { b: true, fill: x.state.fill }]);
      ws.set(r, 6, xlStr(s.goal), XS.text);
      ws.set(r, 7, xlStr(s.professional), XS.text);
      ws.set(r, 8, plan, XS.text);
      ws.set(r, 9, s.planN != null && s.planN !== '' ? U.num(s.planN) : '', XS.cell);
      ws.set(r, 10, x.rpe, [XS.cell, { fmt: '0.0' }]);
      ws.set(r, 11, x.dur, [XS.cell, { fmt: '0' }]);
      ws.set(r, 12, { f: `IF(COUNT(${xlRef(r, 10)},${xlRef(r, 11)})=2,${xlRef(r, 10)}*${xlRef(r, 11)},"")`, v: x.ua ?? '' }, [XS.cell, { fmt: '0', b: true }]);
      ws.set(r, 13, x.pain, [XS.cell, { fmt: '0', fill: x.pain == null ? null : x.pain >= 6 ? XL_C.RED : x.pain >= 3 ? XL_C.AMB : null }]);
      ws.set(r, 14, x.wellness, [XS.cell, { fmt: '0' }]);
      ws.set(r, 15, x.n, [XS.cell, { fmt: '0' }]);
      ws.set(r, 16, x.n ? x.done : null, [XS.cell, { fmt: '0' }]);
      const url = links[`S:${s.id}`];
      if (xlIsWeb(url)) { ws.set(r, 17, 'Obre', [XS.cell, XS.link]); ws.link(r, 17, url, 'Obre l\'Excel de la sessió'); } else ws.set(r, 17, '', XS.cell);
      r++;
    }
  }

  // ── Resum ──
  const RC = 7;
  function summarySheet(ws, { p, rows, plans, assessments, settings, today, links, R, pairs }) {
    ws.cols([30, 17, 17, 17, 17, 17, 17]);
    const service = (OPT.services.find((o) => o.v === p.service) || {}).label || '';
    let r = xlTitle(ws, `Visió general · ${U.fullName(p)}`, [service, p.professional, p.startDate ? `client des del ${U.fmtDate(p.startDate)}` : ''].filter(Boolean).join(' · '), RC);

    // Targetes (fórmules sobre el registre)
    const done = rows.filter((x) => x.state.key === 'feta');
    const pend = rows.filter((x) => x.state.key !== 'feta');
    const uas = done.map((x) => x.ua).filter((n) => n != null);
    const rpes = done.map((x) => x.rpe).filter((n) => n != null);
    const wls = done.map((x) => x.wellness).filter((n) => n != null);
    const lastDone = done.length ? done[done.length - 1].date : '';
    const nextPend = pend.find((x) => x.date >= today);
    const avg = (a) => (a.length ? a.reduce((s, n) => s + n, 0) / a.length : '');
    const tiles = [
      ['Sessions fetes', { f: `COUNTIF(${R('E')},"Feta")`, v: done.length }, '0'],
      ['Pendents', { f: `COUNTA(${R('E')})-COUNTIF(${R('E')},"Feta")`, v: pend.length }, '0'],
      ['Càrrega total (UA)', { f: `SUM(${R('L')})`, v: uas.reduce((s, n) => s + n, 0) }, '#,##0'],
      ['RPE mitjà', { f: `IFERROR(ROUND(AVERAGE(${R('J')}),1),"")`, v: avg(rpes) === '' ? '' : U.round(avg(rpes), 1) }, '0.0'],
      ['Wellness mitjà (/25)', { f: `IFERROR(ROUND(AVERAGE(${R('N')}),1),"")`, v: avg(wls) === '' ? '' : U.round(avg(wls), 1) }, '0.0'],
      ['Última sessió feta', lastDone ? { date: lastDone } : '—', 'dd/mm/yyyy'],
      ['Propera sessió', nextPend ? { date: nextPend.date } : '—', 'dd/mm/yyyy'],
    ];
    tiles.forEach(([label], i) => ws.set(r, 1 + i, label, [XS.label, { h: 'center', sz: 9, color: XL_C.MUTED }]));
    tiles.forEach(([, v, fmt], i) => ws.set(r + 1, 1 + i, v, { b: true, sz: fmt === 'dd/mm/yyyy' ? 13 : 18, color: XL_C.BRAND, h: 'center', v: 'center', border: 'thin', fmt }));
    ws.rowH(r + 1, 36);
    r += 3;

    r = xlSection(ws, r, 'Perfil del client', RC);
    const body = Calc.body(p, assessments);
    const age = U.age(p.birthDate);
    r = xlKv(ws, r, [
      ['Objectiu', xlStr(p.goal)],
      ['Edat · alçada · pes', [age != null && `${age} anys`, body.height.v != null && `${U.fmt(body.height.v, 0)} cm`, body.weight.v != null && `${U.fmt(body.weight.v, 1)} kg`, body.bmi != null && `IMC ${U.fmt(body.bmi, 1)}`].filter(Boolean).join(' · ')],
      ['Limitacions i precaucions per entrenar', xlStr(p.limitations)],
      ['Esport o activitat', xlStr(p.sport)],
      ['Disponibilitat', xlStr(p.availability)],
      ['Dominància', (OPT.dominance.find((o) => o.v === p.dominance) || {}).label || ''],
    ], RC) + 1;

    // Dates clau (dies des de la data, en viu)
    const keys = [['Intervenció (IQ)', p.surgeryDate, p.surgeryNote], ['Lesió', p.injuryDate, p.injuryNote], ['Alta al centre', p.startDate, '']].filter((k) => k[1]);
    const retest = Calc.retestDue(assessments);
    if (retest) keys.push(['Propera valoració (re-test)', retest.due, '']);
    if (keys.length) {
      r = xlSection(ws, r, 'Dates clau', RC);
      r = xlHeader(ws, r, ['Què', 'Data', 'Dies', 'Setmanes', ['Nota', 3]]);
      for (const [label, date, note] of keys) {
        const future = label.startsWith('Propera');
        const days = U.diffDays(date, today);
        ws.set(r, 1, label, XS.label);
        ws.set(r, 2, { date }, [XS.cell, { fmt: 'dd/mm/yyyy' }]);
        const dcell = xlRef(r, 2);
        const fd = future ? `${dcell}-TODAY()` : `TODAY()-${dcell}`;
        ws.set(r, 3, { f: fd, v: future ? -days : days }, [XS.cell, { fmt: '0', b: true }]);
        ws.set(r, 4, { f: `INT(${xlRef(r, 3)}/7)`, v: Math.floor((future ? -days : days) / 7) }, [XS.cell, { fmt: '0' }]);
        ws.merge(r, 5, r, 7, future ? 'dies que falten' : xlStr(note), [XS.text, { color: XL_C.MUTED }]);
        r++;
      }
      r++;
    }

    // Plans
    if (plans.length) {
      r = xlSection(ws, r, 'Plans d\'entrenament', RC);
      r = xlHeader(ws, r, ['Pla', ['Objectiu', 2], 'Inici', 'Dies', 'Sessions fetes', 'Pròxima prevista']);
      for (const plan of plans) {
        const realS = rows.filter((x) => !x.s.ghost && x.s.planId === plan.id);
        const fetes = realS.filter((x) => x.state.key === 'feta').length;
        const used = new Set(realS.map((x) => U.num(x.s.planN)));
        const nextN = (plan.sessions || []).map((x) => x.n).find((n) => !used.has(n)) || null;
        const dates = Calc.planDates(plan);
        ws.set(r, 1, plan.name, [XS.text, { b: true }]);
        ws.merge(r, 2, r, 3, xlStr(plan.goal), XS.text);
        ws.set(r, 4, { date: plan.start }, [XS.cell, { fmt: 'dd/mm/yyyy' }]);
        ws.set(r, 5, [1, 2, 3, 4, 5, 6, 0].filter((d) => (plan.days || []).includes(d)).map((d) => WEEKDAYS_SHORT[d]).join(' · '), XS.cell);
        ws.set(r, 6, `${fetes} de ${(plan.sessions || []).length}`, XS.cell);
        ws.set(r, 7, nextN && dates[nextN - 1] ? { date: dates[nextN - 1] } : '—', [XS.cell, { fmt: 'dd/mm/yyyy' }]);
        r++;
      }
      r++;
    }

    // Valoracions
    if (assessments.length) {
      r = xlSection(ws, r, 'Valoracions (a la carpeta «Valoracions»)', RC);
      r = xlHeader(ws, r, ['Tipus', 'Data', 'Professional', 'CMJ (cm)', 'Patrons competents', 'Punts d\'atenció', 'Excel']);
      for (const a of assessments) {
        const cmj = Calc.cmj(a), pc = Calc.patterns(a), al = Calc.alerts(a);
        ws.set(r, 1, (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració', [XS.text, { b: true }]);
        ws.set(r, 2, { date: a.date }, [XS.cell, { fmt: 'dd/mm/yyyy' }]);
        ws.set(r, 3, xlStr(a.professional), XS.text);
        ws.set(r, 4, cmj && cmj.best != null ? U.round(cmj.best, 1) : null, [XS.cell, { fmt: '0.0' }]);
        ws.set(r, 5, pc.scored ? `${pc.counts['0']} de ${pc.total}` : '', XS.cell);
        ws.set(r, 6, al.length, [XS.cell, { fmt: '0', fill: al.some((x) => x.tone === 'bad') ? XL_C.RED : al.length ? XL_C.AMB : XL_C.GRN }]);
        const url = links[`A:${a.id}`];
        if (xlIsWeb(url)) { ws.set(r, 7, 'Obre', [XS.cell, XS.link]); ws.link(r, 7, url, 'Obre l\'Excel de la valoració'); } else ws.set(r, 7, '', XS.cell);
        r++;
      }
      r++;
    }

    // Càrrega setmanal (fórmules sobre el registre)
    if (rows.length) {
      const thisWeek = U.weekStart(today);
      const firstWeek = U.weekStart(rows[0].date);
      const lastWeek = U.weekStart(rows[rows.length - 1].date);
      let from = firstWeek > U.addDays(thisWeek, -7 * 11) ? firstWeek : U.addDays(thisWeek, -7 * 11);
      const to = lastWeek;
      if (from > to) from = to;
      r = xlSection(ws, r, 'Càrrega setmanal (UA = RPE × minuts)', RC);
      r = xlHeader(ws, r, ['Setmana del', 'Sessions', 'Fetes', 'Càrrega (UA)', 'RPE mitjà', 'Wellness mitjà', 'Càrrega (barra)']);
      for (let wk = from, n = 0; wk <= to && n < 40; wk = U.addDays(wk, 7), n++) {
        const inWeek = rows.filter((x) => x.week === wk);
        const fetes = inWeek.filter((x) => x.state.key === 'feta');
        const ua = fetes.map((x) => x.ua).filter((v) => v != null).reduce((s, v) => s + v, 0);
        const rp = fetes.map((x) => x.rpe).filter((v) => v != null), wl = fetes.map((x) => x.wellness).filter((v) => v != null);
        const wc = xlRef(r, 1);
        ws.set(r, 1, { date: wk }, [XS.cell, { fmt: 'dd/mm/yyyy', b: wk === thisWeek, fill: wk === thisWeek ? XL_C.BRAND_L : null }]);
        ws.set(r, 2, { f: `COUNTIFS(${R('B')},${wc})`, v: inWeek.length }, [XS.cell, { fmt: '0' }]);
        ws.set(r, 3, { f: `COUNTIFS(${R('B')},${wc},${R('E')},"Feta")`, v: fetes.length }, [XS.cell, { fmt: '0' }]);
        ws.set(r, 4, { f: `SUMIFS(${R('L')},${R('B')},${wc})`, v: ua }, [XS.cell, { fmt: '0', b: true }]);
        ws.set(r, 5, { f: `IFERROR(ROUND(AVERAGEIFS(${R('J')},${R('B')},${wc}),1),"")`, v: rp.length ? U.round(rp.reduce((s, v) => s + v, 0) / rp.length, 1) : '' }, [XS.cell, { fmt: '0.0' }]);
        ws.set(r, 6, { f: `IFERROR(ROUND(AVERAGEIFS(${R('N')},${R('B')},${wc}),1),"")`, v: wl.length ? U.round(wl.reduce((s, v) => s + v, 0) / wl.length, 1) : '' }, [XS.cell, { fmt: '0.0' }]);
        ws.set(r, 7, { f: `REPT("█",ROUND(${xlRef(r, 4)}/50,0))`, v: '█'.repeat(Math.round(ua / 50)) }, [XS.cell, { h: 'left', color: XL_C.BRAND_M, sz: 9 }]);
        r++;
      }
      r++;
    }

    // Pestanyes
    r = xlSection(ws, r, 'Com es llegeix aquest fitxer', RC);
    const guide = [
      ['Calendari del mes', `Una pestanya per mes (p. ex. «${pairs.length ? U.fmtMonth(pairs[pairs.length - 1].m) : 'Octubre 2026'}»): cada dia amb la sessió d'un cop d'ull. Verd = feta, beix = planificada, taronja = sense tancar, gris = descans. Clica una sessió per anar al seu detall.`],
      ['Detall del mes', 'Pestanya «… · detall»: totes les sessions del mes amb cada exercici, la càrrega i el tancament, amb les setmanes en columnes (com l\'Excel de control).'],
      ['Registre', 'Una fila per sessió, per filtrar o fer taules dinàmiques.'],
      ['Sessions individuals', 'Cada sessió té el seu Excel a la mateixa carpeta (sessio_…); les valoracions són a la carpeta «Valoracions».'],
    ];
    r = xlKv(ws, r, guide, RC);
    return r;
  }

  // Alçada (en files) que ocupa una llista de sessions d'un dia al full de detall.
  function need(list) {
    if (!list.length) return 0;
    return list.reduce((n, x) => n + 2 + usedBlocks(x.s).reduce((m, b) => m + 1 + names(b).length + (Calc.groups(b) ? Calc.groups(b).length : 0), 0) + 2, 0) + (list.length - 1);
  }

  // ── Detall del mes: setmanes en columnes, dies de la setmana en files ──
  const DC = [['GM', 9], ['Cont', 6], ['Pos', 5], ['A', 5], ['Exercici', 31], ['Material', 17], ['Càrrega', 10], ['Int.', 11], ['S', 4.5], ['R', 10], ['Obs.', 24]];
  function monthWeeks(m) {
    const first = `${m}-01`;
    const last = U.addDays(U.addMonths(first, 1), -1);
    const start = U.weekStart(first);
    return { first, last, start, count: Math.ceil((U.diffDays(start, last) + 1) / 7) };
  }

  function detailSheet(ws, { p, m, rows, settings, where, today }) {
    const { start, count, first, last } = monthWeeks(m);
    const NCD = DC.length, WB = NCD + 1;
    for (let w = 0; w < count; w++) {
      DC.forEach(([, wd], j) => ws.col(w * WB + 1 + j, wd));
      ws.col(w * WB + WB, 2.5);
    }
    const total = count * WB - 1;
    let r = xlTitle(ws, `Detall del mes · ${U.fmtMonth(m)} · ${U.fullName(p)}`, 'Cada dia amb la sessió sencera (verd = feta, beix = planificada, taronja = sense tancar, gris = descans). Les setmanes van en columnes, de dilluns a diumenge en files.', total);
    // Capçaleres de setmana
    for (let w = 0; w < count; w++) {
      const a = U.addDays(start, w * 7);
      ws.merge(r, w * WB + 1, r, w * WB + NCD, `SETMANA ${w + 1} · del ${dm(a)} al ${dm(U.addDays(a, 6))}`, { b: true, sz: 12, color: 'FFFFFF', fill: XL_C.BRAND_M, h: 'center', v: 'center', border: 'thin' });
    }
    ws.rowH(r, 22);
    ws.freeze(r + 1, 1);
    r++;
    for (let d = 0; d < 7; d++) {
      const cells = [];
      for (let w = 0; w < count; w++) {
        const date = U.addDays(start, w * 7 + d);
        cells.push({ w, date, list: rows.filter((x) => x.date === date) });
      }
      const h = Math.max(...cells.map((c) => need(c.list)), 1);
      const top = r;
      for (const c of cells) {
        const c0 = c.w * WB + 1;
        const out = c.date < first || c.date > last;
        const label = `${DAYS[d].toUpperCase()} ${U.fmtDate(c.date)}`;
        if (!c.list.length) {
          ws.merge(top, c0, top + h - 1, c0 + NCD - 1, `${label} · OFF`, { b: true, sz: 10, color: XL_C.MUTED, fill: XL_C.OFF, h: 'center', v: h > 1 ? 'top' : 'center', border: 'thin' });
          continue;
        }
        let rr = top;
        c.list.forEach((x, k) => {
          if (k) rr++;
          rr = sessionBlock(ws, rr, c0, x, { label: k ? `${label} (2a sessió)` : label, settings, out, where, sheet: ws.name });
        });
      }
      r = top + h + (h > 0 ? 1 : 0);
    }
  }

  // Una sessió dins de la graella de detall (retorna la fila següent).
  function sessionBlock(ws, r, c0, x, { label, settings, out, where, sheet }) {
    const s = x.s, state = x.state, NCD = DC.length;
    where[s.id] = { sheet, row: r, col: c0 };
    ws.merge(r, c0, r, c0 + NCD - 1, `${label}  ·  ${s.ghost ? `S${s.planN} del pla` : `Sessió ${s.number || ''}`}  ·  ${state.label}${s.goal ? `  ·  ${s.goal}` : ''}${s.professional ? `  ·  ${s.professional}` : ''}`, { b: true, sz: 10, color: XL_C.BRAND, fill: state.fill, h: 'left', v: 'center', wrap: true, border: 'thin', indent: 1 });
    r++;
    DC.forEach(([name], j) => ws.set(r, c0 + j, name, [XS.head, { sz: 9, h: j === 4 ? 'left' : 'center' }]));
    r++;
    for (const b of usedBlocks(s)) {
      const def = blockDef(b.key);
      ws.merge(r, c0, r, c0 + NCD - 1, `${def.num} · ${xlBlockName(b.key, settings)}${b.focus ? `  —  ${b.focus}` : ''}${b.methodName ? `  ·  ${b.methodName}` : ''}`, { b: true, sz: 10, color: 'FFFFFF', fill: XL_BLOCK[b.key], h: 'left', v: 'center', border: 'thin', indent: 1 });
      r++;
      const gs = Calc.groups(b);
      const put = (it) => {
        const vals = [xlStr(it.gm), xlStr(it.cont), xlStr(it.pos), xlStr(it.lat), it.name, xlStr(it.material), xlNumOrText(it.load), xlStr(it.intensity), xlNumOrText(it.sets), xlNumOrText(it.reps), [xlStr(it.note), it.done && s.status === 'feta' ? '✔' : ''].filter(Boolean).join('  ')];
        vals.forEach((v, j) => ws.set(r, c0 + j, v, [{ sz: 9, border: 'thin', h: j === 4 || j === 5 || j === 10 ? 'left' : 'center', v: 'center', wrap: j === 0 || j === 4 || j === 5 || j === 7 || j === 10 }, it.done ? { fill: XL_C.GRN } : null]));
        r++;
      };
      if (gs) {
        for (const g of gs) {
          ws.merge(r, c0, r, c0 + NCD - 1, `${g.label}${g.g.methodName ? `  ·  ${g.g.methodName}` : ''}`, { i: true, b: true, sz: 9, color: XL_C.BRAND_M, fill: XL_C.GREY, h: 'left', v: 'center', border: 'thin', indent: 2 });
          r++;
          g.items.map((y) => y.it).filter((i) => i.name).forEach(put);
        }
      } else names(b).forEach(put);
    }
    // Tancament: RPE · T · càrrega · observacions · decisió · wellness
    const f = s.feedback || {}, wl = Calc.wellness(s.wellness);
    const lab = [['RPE', c0, c0], ['T (min)', c0 + 1, c0 + 1], ['Càrrega (UA)', c0 + 2, c0 + 3], ['Observacions', c0 + 4, c0 + 4], ['Decisió per a la propera sessió', c0 + 5, c0 + 7], ['Wellness (/25)', c0 + 8, c0 + 10]];
    for (const [t, a, b] of lab) ws.merge(r, a, r, b, t, { b: true, sz: 8, color: XL_C.MUTED, fill: XL_C.GREY, h: 'center', v: 'center', border: 'thin' });
    r++;
    const v = r;
    const done = s.status === 'feta';
    ws.set(v, c0, done ? xlNum(f.rpe) : null, { b: true, h: 'center', v: 'center', border: 'thin', sz: 10 });
    ws.set(v, c0 + 1, done ? xlNum(f.duration) : null, { b: true, h: 'center', v: 'center', border: 'thin', sz: 10 });
    ws.merge(v, c0 + 2, v, c0 + 3, { f: `IF(COUNT(${xlRef(v, c0)}:${xlRef(v, c0 + 1)})=2,${xlRef(v, c0)}*${xlRef(v, c0 + 1)},"")`, v: done ? Calc.sessionLoad(s) ?? '' : '' }, { b: true, h: 'center', v: 'center', border: 'thin', fill: XL_C.GREY, fmt: '0', sz: 10 });
    ws.set(v, c0 + 4, done ? xlStr(f.notes) : '', { sz: 9, border: 'thin', wrap: true, v: 'top', h: 'left' });
    ws.merge(v, c0 + 5, v, c0 + 7, done ? xlStr(f.decision) : '', { sz: 9, border: 'thin', wrap: true, v: 'top', h: 'left' });
    ws.merge(v, c0 + 8, v, c0 + 10, done && wl && wl.total != null ? wl.total : '', { b: true, h: 'center', v: 'center', border: 'thin', sz: 10 });
    ws.rowH(v, 30);
    return v + 1;
  }

  // ── Calendari del mes ──
  function calendarSheet(ws, { p, m, rows, settings, where, R, today, detName }) {
    const { start, count, first, last } = monthWeeks(m);
    ws.cols([14, 30, 30, 30, 30, 30, 30, 30, 17, 13, 12]);
    const NCC = 11;
    let r = xlTitle(ws, `Pla mensual · ${U.fmtMonth(m)} · ${U.fullName(p)}`, 'Calendari del mes d\'un cop d\'ull. Clica la data d\'un dia per anar al seu detall.', NCC);
    // Targetes del mes (fórmules sobre el registre)
    const inM = rows.filter((x) => x.date >= first && x.date <= last);
    const doneM = inM.filter((x) => x.state.key === 'feta');
    const range = `${R('A')},">="&DATE(${first.slice(0, 4)},${Number(first.slice(5, 7))},1),${R('A')},"<="&DATE(${last.slice(0, 4)},${Number(last.slice(5, 7))},${Number(last.slice(8, 10))})`;
    const uaM = doneM.map((x) => x.ua).filter((n) => n != null), rpM = doneM.map((x) => x.rpe).filter((n) => n != null);
    const tiles = [
      ['Sessions del mes', { f: `COUNTIFS(${range})`, v: inM.length }, '0'],
      ['Fetes', { f: `COUNTIFS(${range},${R('E')},"Feta")`, v: doneM.length }, '0'],
      ['Pendents', { f: `COUNTIFS(${range},${R('E')},"<>Feta")`, v: inM.length - doneM.length }, '0'],
      ['Càrrega feta (UA)', { f: `SUMIFS(${R('L')},${range},${R('E')},"Feta")`, v: uaM.reduce((s, n) => s + n, 0) }, '#,##0'],
      ['RPE mitjà', { f: `IFERROR(ROUND(AVERAGEIFS(${R('J')},${range},${R('E')},"Feta"),1),"")`, v: rpM.length ? U.round(rpM.reduce((s, n) => s + n, 0) / rpM.length, 1) : '' }, '0.0'],
    ];
    tiles.forEach(([label, v, fmt], i) => {
      const c = 2 + i * 2;
      ws.merge(r, c, r, c + 1, label, { b: true, sz: 9, color: XL_C.MUTED, fill: XL_C.GREY, h: 'center', v: 'center', border: 'thin' });
      ws.merge(r + 1, c, r + 1, c + 1, v, { b: true, sz: 18, color: XL_C.BRAND, h: 'center', v: 'center', border: 'thin', fmt });
    });
    ws.rowH(r + 1, 32);
    // Llegenda
    const leg = [['Feta', XL_C.GRN], ['Planificada', XL_C.BRAND_L], ['Sense tancar', XL_C.AMB], ['Prevista al pla', XL_C.PREV], ['Descans', XL_C.OFF]];
    leg.forEach(([t, col], i) => ws.merge(r + 2, 2 + i, r + 2, 2 + i, t, { b: true, sz: 9, fill: col, h: 'center', v: 'center', border: 'thin' }));
    ws.set(r + 2, 7, 'Avui', { b: true, sz: 9, fill: 'F6C65B', h: 'center', v: 'center', border: 'thin' });
    r += 4;
    // Capçalera de dies
    ws.set(r, 1, 'Setmana', XS.head);
    DAYS.forEach((d, i) => ws.set(r, 2 + i, d, XS.head));
    ws.merge(r, 9, r, 11, 'Resum de la setmana', XS.head);
    ws.rowH(r, 22);
    r++;
    for (let w = 0; w < count; w++) {
      const wk = U.addDays(start, w * 7);
      const hr = r, cr = r + 1; // fila de dates i fila de contingut
      ws.merge(hr, 1, cr, 1, `${w + 1}\n${dm(wk)} – ${dm(U.addDays(wk, 6))}`, { b: true, sz: 11, color: XL_C.BRAND, fill: XL_C.BRAND_L, h: 'center', v: 'center', wrap: true, border: 'thin' });
      for (let d = 0; d < 7; d++) {
        const date = U.addDays(wk, d);
        const out = date < first || date > last;
        const list = rows.filter((x) => x.date === date);
        const c = 2 + d;
        ws.set(hr, c, { date }, { b: true, sz: 10, color: out ? 'A39B95' : XL_C.BRAND, fill: XL_C.GREY, h: 'left', v: 'center', border: 'thin', fmt: 'dd/mm', indent: 1 });
        if (list.length && where[list[0].s.id]) {
          const wh = where[list[0].s.id];
          ws.link(hr, c, xlGo(detName, wh.row, wh.col), 'Vés al detall de la sessió');
        }
        if (!list.length) {
          ws.set(cr, c, 'OFF', { b: true, sz: 10, color: XL_C.MUTED, fill: XL_C.OFF, h: 'center', v: 'center', border: 'thin' });
          continue;
        }
        const runs = [];
        list.forEach((x, k) => { if (k) runs.push(['\n\n', { sz: 9 }]); runs.push(...dayRuns(x.s, x.state, { settings })); });
        const fill = list[0].state.fill;
        ws.set(cr, c, { rich: runs }, { sz: 9, fill, h: 'left', v: 'top', wrap: true, border: 'thin', color: out ? '8F8780' : undefined });
      }
      // Avui
      ws.cf(`B${hr}:H${hr}`, `B${hr}=TODAY()`, { fill: 'F6C65B', b: true });
      ws.cf(`B${cr}:H${cr}`, `B$${hr}=TODAY()`, { border: 'thin', bc: XL_C.BRAND });
      // Resum de la setmana (fórmules sobre el registre; el dilluns és la data de la cel·la B de la fila de dates)
      const wkc = `$B${hr}`;
      const inW = rows.filter((x) => x.week === wk), doneW = inW.filter((x) => x.state.key === 'feta');
      const uaW = doneW.map((x) => x.ua).filter((n) => n != null), rpW = doneW.map((x) => x.rpe).filter((n) => n != null);
      const wlW = doneW.map((x) => x.wellness).filter((n) => n != null);
      const mean = (a) => (a.length ? U.round(a.reduce((s, n) => s + n, 0) / a.length, 1) : '');
      ws.merge(hr, 9, hr, 11, { f: `COUNTIFS(${R('B')},${wkc},${R('E')},"Feta")&" fetes de "&COUNTIFS(${R('B')},${wkc})&" sessions"`, v: `${doneW.length} fetes de ${inW.length} sessions` }, { b: true, sz: 10, color: XL_C.BRAND, fill: XL_C.GREY, h: 'center', v: 'center', border: 'thin' });
      const sumUa = `SUMIFS(${R('L')},${R('B')},${wkc})`;
      ws.set(cr, 9, { f: `IF(${sumUa}=0,"",${sumUa})`, v: uaW.length ? uaW.reduce((s, n) => s + n, 0) : '' }, { b: true, sz: 12, color: XL_C.BRAND, h: 'center', v: 'top', border: 'thin', fill: XL_C.GREY, fmt: '0" UA"' });
      ws.set(cr, 10, { f: `IFERROR(ROUND(AVERAGEIFS(${R('J')},${R('B')},${wkc}),1),"")`, v: mean(rpW) }, { b: true, sz: 12, color: XL_C.BRAND, h: 'center', v: 'top', border: 'thin', fill: XL_C.GREY, fmt: '"RPE "0.0' });
      ws.set(cr, 11, { f: `IFERROR(ROUND(AVERAGEIFS(${R('N')},${R('B')},${wkc}),1),"")`, v: mean(wlW) }, { b: true, sz: 12, color: XL_C.BRAND, h: 'center', v: 'top', border: 'thin', fill: XL_C.GREY, fmt: '"Well. "0.0' });
      ws.rowH(hr, 20);
      r += 2;
    }
    return r;
  }

  return { build };
})();
