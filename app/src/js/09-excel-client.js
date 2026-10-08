/* EON Life · l'Excel del client: un sol fitxer per client (seguiment_<client>_01.xlsx, a la carpeta del client) que
   ajunta la idea de l'Excel de control de l'Oriol amb la de l'app. S'omple sol amb tot el que es fa a l'app.
   Pestanyes:
     · «Resum»: perfil, dates clau, plans, valoracions i càrrega setmanal;
     · «Valoracions»: totes les valoracions l'una al costat de l'altra, amb el canvi entre les dues últimes;
     · una per mes amb el format de l'Oriol («Oct26», «Nov26»…): el calendari i les sessions de cada setmana;
     · «Registre»: una fila per sessió, per filtrar i ordenar;
     · una per valoració amb tot el detall («Val. inicial 06-10-26», «Re-test 06-01-27»…). */

const ExcelClient = (() => {
  const names = (b) => (b.items || []).filter((i) => i.name);
  const usedBlocks = (s) => (s.blocks || []).filter((b) => names(b).length);
  const REG = 'Registre';
  const REG_FIRST = 6; // primera fila de dades del registre

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

  function build({ patient: p, items, plans, assessments, settings, today }) {
    const rows = items.map((s) => rowOf(s, today, settings));
    const months = monthsOf(items, today);
    const doc = XlsxDoc.create({ title: `Seguiment · ${U.fullName(p)}`, subject: 'Seguiment del pacient: sessions i valoracions', creator: 'EON Life', company: (settings && settings.centerName) || 'EON Life' });
    const wsRes = doc.sheet('Resum', { grid: false, landscape: true, tab: XL_C.BRAND, zoom: 100 });
    // Valoracions: l'evolució i, al final del llibre, el detall de cadascuna.
    const taken = new Set(['resum', 'valoracions', REG.toLowerCase(), ...months.map((m) => ExcelMonth.sheetName(m).toLowerCase())]);
    const aNames = {};
    for (const a of assessments) aNames[a.id] = ExcelAssessment.sheetName(a, taken);
    if (assessments.length) ExcelAssessment.evolutionSheet(doc, { p, list: assessments, names: aNames });
    // Un full per mes, amb el format de l'Oriol.
    const where = {}; // id de sessió → { sheet, r, c } (la sessió dins del full del seu mes)
    const monthSheets = months.map((m) => ({ m, ws: ExcelMonth.build(doc, { m, items, settings, today, plans, where }) }));
    const wsReg = doc.sheet(REG, { grid: false, landscape: true, tab: XL_C.MUTED, zoom: 100, titles: [5, 5] });
    const last = REG_FIRST + Math.max(rows.length, 1) - 1;
    const R = (col) => `'${REG}'!$${col}$${REG_FIRST}:$${col}$${last}`; // rang d'una columna del registre
    registerSheet(wsReg, { p, rows, plans, where });
    assessments.forEach((a, i) => ExcelAssessment.detailSheet(doc, { p, a, previous: assessments[i - 1] || null, name: aNames[a.id], settings }));
    summarySheet(wsRes, { p, rows, plans, assessments, settings, today, R, aNames, monthSheets });
    // S'obre pel mes actual.
    const cur = monthSheets.find((x) => x.m === U.monthKey(today));
    if (cur) doc.active = cur.ws.index;
    return doc;
  }

  // ── Registre: una fila per sessió ──
  function registerSheet(ws, { p, rows, plans, where }) {
    const cols = [['Data', 11], ['Setmana', 11], ['Mes', 9], ['Sessió', 10], ['Estat', 15], ['Objectiu', 36], ['Professional', 16], ['Pla', 24], ['S del pla', 8], ['RPE', 7], ['Durada (min)', 10], ['Càrrega (UA)', 11], ['Dolor (EVA)', 8], ['Wellness (/25)', 10], ['Exercicis', 9], ['Fets', 7], ['Detall', 11]];
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
      const at = where[s.id];
      if (at) { ws.set(r, 17, at.sheet, [XS.cell, XS.link]); ws.link(r, 17, xlGo(at.sheet, at.r, at.c), 'Vés a la sessió al full del mes'); } else ws.set(r, 17, '', XS.cell);
      r++;
    }
    // La taula es pot ordenar (a un full protegit, Excel només ordena cel·les desbloquejades); la resta del full queda protegida.
    ws.unlock(REG_FIRST, 1, r - 1, cols.length);
  }

  // ── Resum ──
  const RC = 7;
  function summarySheet(ws, { p, rows, plans, assessments, settings, today, R, aNames, monthSheets }) {
    ws.cols([30, 17, 17, 17, 17, 17, 17]);
    const service = (OPT.services.find((o) => o.v === p.service) || {}).label || '';
    let r = xlTitle(ws, `Seguiment · ${U.fullName(p)}`, [service, p.professional, p.startDate ? `pacient des del ${U.fmtDate(p.startDate)}` : ''].filter(Boolean).join(' · '), RC);

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

    r = xlSection(ws, r, 'Perfil del pacient', RC);
    const body = Calc.body(p, assessments);
    const age = U.age(p.birthDate);
    const level = (OPT.activityLevels.find((o) => o.v === p.activityLevel) || {}).label || '';
    r = xlKv(ws, r, [
      ['Objectiu', xlStr(p.goal)],
      ['Edat · alçada · pes', [age != null && `${age} anys`, body.height.v != null && `${U.fmt(body.height.v, 0)} cm`, body.weight.v != null && `${U.fmt(body.weight.v, 1)} kg`, body.bmi != null && `IMC ${U.fmt(body.bmi, 1)}`].filter(Boolean).join(' · ')],
      ['Limitacions i precaucions per entrenar', xlStr(p.limitations)],
      ['Motiu de consulta', xlStr(p.reason)],
      ['Antecedents i lesions', xlStr(p.history)],
      ['Condicions de salut', xlStr(p.conditions)],
      ['Medicació rellevant', xlStr(p.medication)],
      ['Esport o activitat', xlStr(p.sport)],
      ['Nivell d\'activitat', level],
      ['Professió', xlStr(p.occupation)],
      ['Disponibilitat', xlStr(p.availability)],
      ['Dominància', (OPT.dominance.find((o) => o.v === p.dominance) || {}).label || ''],
      // (els comentaris del professional no hi van: la carpeta es pot compartir amb el pacient)
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
      r = xlSection(ws, r, 'Valoracions (evolució a la pestanya «Valoracions»)', RC);
      r = xlHeader(ws, r, ['Tipus', 'Data', 'Professional', 'CMJ (cm)', 'Patrons competents', 'Punts d\'atenció', 'Detall']);
      for (const a of assessments) {
        const cmj = Calc.cmj(a), pc = Calc.patterns(a), al = Calc.alerts(a);
        ws.set(r, 1, (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració', [XS.text, { b: true }]);
        ws.set(r, 2, { date: a.date }, [XS.cell, { fmt: 'dd/mm/yyyy' }]);
        ws.set(r, 3, xlStr(a.professional), XS.text);
        ws.set(r, 4, cmj && cmj.best != null ? U.round(cmj.best, 1) : null, [XS.cell, { fmt: '0.0' }]);
        ws.set(r, 5, pc.scored ? `${pc.counts['0']} de ${pc.total}` : '', XS.cell);
        ws.set(r, 6, al.length, [XS.cell, { fmt: '0', fill: al.some((x) => x.tone === 'bad') ? XL_C.RED : al.length ? XL_C.AMB : XL_C.GRN }]);
        ws.set(r, 7, 'Vés-hi', [XS.cell, XS.link]);
        ws.link(r, 7, xlGo(aNames[a.id]), 'Vés al detall de la valoració');
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

    // Informes mèdics i altres documents del client (PDF a la carpeta «Valoracions»)
    const docs = (p.docs || []).filter((f) => f && f.url);
    if (docs.length) {
      r = xlSection(ws, r, 'Informes i documents del pacient (carpeta «Valoracions»)', RC);
      r = xlHeader(ws, r, [['Fitxer', 4], 'Data', ['Enllaç', 2]]);
      for (const f of docs) {
        ws.merge(r, 1, r, 4, xlStr(f.name), XS.text);
        ws.set(r, 5, f.date ? { date: f.date } : '', [XS.cell, { fmt: 'dd/mm/yyyy' }]);
        ws.merge(r, 6, r, 7, xlIsWeb(f.url) ? 'Obre' : 'Desat a la tauleta (versió de prova)', [XS.cell, xlIsWeb(f.url) ? XS.link : XS.muted]);
        if (xlIsWeb(f.url)) ws.link(r, 6, xlStr(f.url).trim(), 'Obre el fitxer');
        r++;
      }
      r++;
    }

    // Pestanyes
    r = xlSection(ws, r, 'Com es llegeix aquest fitxer', RC);
    const lastMonth = monthSheets.length ? monthSheets[monthSheets.length - 1].ws.name : 'Oct26';
    const guide = [
      ['Un full per mes', `«${lastMonth}» i els altres: a dalt, el calendari de cada setmana amb l'objectiu, l'RPE, el temps, la càrrega, el wellness i el dolor de cada dia; a sota, cada sessió sencera amb els exercicis de cada bloc (GM, contracció, posició, lateralitat, exercici, material, càrrega, sèries, repeticions i observacions). Verd = feta, beix = planificada, taronja = sense tancar, gris = prevista al pla o descans. Clica la data d'un dia per anar a la sessió.`],
      ['Valoracions', 'Totes les valoracions l\'una al costat de l\'altra, amb el canvi entre les dues últimes; i, al final del llibre, una pestanya per valoració amb tot el detall, les fotos, els vídeos i els informes.'],
      ['Registre', 'Una fila per sessió, per filtrar i ordenar (o fer taules dinàmiques).'],
      ['Fotos, vídeos i PDF', 'Són a les carpetes «Valoracions» i «Sessions» del pacient; des d\'aquí s\'obren amb els enllaços.'],
    ];
    r = xlKv(ws, r, guide, RC);
    return r;
  }

  return { build, rowOf, monthsOf };
})();
