/* EON Life · pestanya d'un mes a l'Excel del client, amb el format de l'Excel de control de l'Oriol («Oct26», «Nov26»…).
   Les setmanes (de dilluns a diumenge) van l'una al costat de l'altra, 15 columnes cadascuna:
     · a dalt, el calendari de la setmana i les dades de cada dia: objectiu, RPE, temps, càrrega (RPE × min), wellness,
       dolor i observacions; i el total de la setmana;
     · a sota, cada sessió de la setmana sencera: dia, professional i setmana, i els exercicis de cada bloc amb les
       columnes de l'Oriol (GM · Cont · Pos · A · Exercici · Material · + · S · R · Obs) i els colors dels blocs de l'app.
   Les sessions fetes, planificades, sense tancar i previstes al pla es distingeixen pel color. */

const ExcelMonth = (() => {
  const MON = ['Gen', 'Feb', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Oct', 'Nov', 'Des'];
  const W = 15;                                                   // columnes de cada setmana
  const WIDTHS = [6.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 8.5, 9.5, 9.5, 9, 6.5, 8.5, 22];
  const HEAD_FILL = 'E7E6E6';                                     // el gris de la capçalera de l'Oriol
  const LINE = XL_C.BRAND;
  const R = { date: 1, label: 2, state: 3, info: 4, obj: 5, rpe: 6, t: 7, load: 8, well: 9, pain: 10, obs: 11, week: 12, first: 14 };
  const names = (b) => (b.items || []).filter((i) => i.name);
  const usedBlocks = (s) => (s.blocks || []).filter((b) => names(b).length);
  const sheetName = (m) => `${MON[Number(m.slice(5, 7)) - 1]}${m.slice(2, 4)}`; // 2026-10 → Oct26
  const shortLabel = (s) => (s.ghost ? `S${s.planN} del pla` : `Sessió ${s.number || ''}`.trim());
  const stateText = (st) => ({ feta: 'Feta ✔', planificada: 'Planificada', sense: 'Sense tancar', prevista: 'Prevista al pla' })[st.key];
  const done = (s) => s.status === 'feta' && !s.ghost;

  // Setmanes (dilluns) que toquen el mes.
  function weeksOf(m) {
    const first = `${m}-01`;
    const last = U.addDays(U.addMonths(first, 1), -1);
    const weeks = [];
    for (let wk = U.weekStart(first); wk <= last; wk = U.addDays(wk, 7)) weeks.push(wk);
    return { first, last, weeks };
  }

  // Files que ocupa una sessió a la seva casella.
  function rowsOf(s) {
    let n = 2;                                                    // «SESSIÓ» + dia/professional/setmana
    if (s.goal || s.planId || s.pillar) n++;
    if (Calc.wellness(s.wellness) || xlStr((s.wellness || {}).notes).trim()) n++;
    n++;                                                          // capçalera de la taula
    const bl = usedBlocks(s);
    if (!bl.length) n++;
    for (const b of bl) n += 1 + names(b).length + names(b).filter((it) => Calc.vbt(it)).length + (Calc.groups(b) ? Calc.groups(b).length : 0);
    if (closing(s)) n++;
    return n;
  }

  function closing(s) {
    const f = s.feedback || {};
    if (s.ghost) return '';
    const load = Calc.sessionLoad(s);
    const parts = [];
    // (també d'una sessió que encara no s'ha marcat com a feta: el que s'ha apuntat a l'app hi ha de sortir)
    const nums = [f.rpe !== '' && f.rpe != null && `RPE ${f.rpe}`, f.duration && `${f.duration} min`, load != null && `${U.fmt(load, 0)} UA`, U.num(f.pain) != null && `dolor ${f.pain}/10`].filter(Boolean);
    if (nums.length) parts.push(nums.join(' · '));
    if (xlStr(f.notes).trim()) parts.push(`Notes: ${xlStr(f.notes).trim()}`);
    if (xlStr(f.decision).trim()) parts.push(`Propera sessió: ${xlStr(f.decision).trim()}`);
    return parts.join('   —   ');
  }

  function wellnessText(s) {
    const w = s.wellness || {};
    const wl = Calc.wellness(w);
    const parts = WELLNESS.map((q) => (U.num(w[q.k]) != null ? `${q.label} ${U.num(w[q.k])}` : '')).filter(Boolean);
    if (wl && wl.total != null) parts.push(`total ${wl.total}/25`);
    if (xlStr(w.notes).trim()) parts.push(xlStr(w.notes).trim());
    return parts.join(' · ');
  }

  // Observacions d'un exercici: intensitat, descans, tempo, resum de l'encoder i la nota.
  function obsOf(it) {
    const vbt = Calc.vbt(it);
    return [xlStr(it.intensity).trim(), it.rest && `desc. ${xlStr(it.rest).trim()}`, it.tempo && `tempo ${xlStr(it.tempo).trim()}`, vbt && vbt.text, xlStr(it.note).trim()].filter(Boolean).join(' · ');
  }

  // where: s'hi apunta on queda cada sessió del mes ({ sheet, r, c }), per enllaçar-la des d'altres fulls.
  function build(doc, { m, items, settings, today, plans = [], where = {} }) {
    const name = sheetName(m);
    const ws = doc.sheet(name, { grid: false, landscape: true, tab: XL_C.BRAND_M, zoom: 85, fit: false, footer: `EON Life · ${U.fmtMonth(m)}` });
    const { first, last, weeks } = weeksOf(m);
    const st = (s) => xlSessionState(s, today);
    // Sessions de cada setmana (per data; les de dies d'un altre mes també hi surten, com al calendari de l'Oriol).
    const perWeek = weeks.map((wk) => items.filter((s) => s.date >= wk && s.date <= U.addDays(wk, 6)));
    const slots = Math.max(0, ...perWeek.map((l) => l.length));
    const slotH = [];
    for (let k = 0; k < slots; k++) slotH.push(Math.max(...perWeek.map((l) => (l[k] ? rowsOf(l[k]) : 0))) + 1);
    const slotRow = [R.first];
    for (let k = 1; k < slots; k++) slotRow.push(slotRow[k - 1] + slotH[k - 1]);

    weeks.forEach((wk, w) => {
      const c0 = 1 + w * W;
      WIDTHS.forEach((wd, j) => ws.col(c0 + j, wd));
      ws.pageBreakBefore(c0); // en imprimir, cada setmana a la seva pàgina
      top(ws, { c0, wk, w, list: perWeek[w], first, last, st, name, slotRow, settings });
      perWeek[w].forEach((s, k) => {
        slot(ws, { c0, r: slotRow[k], s, state: st(s), wk, settings, plans });
        if (s.date >= first && s.date <= last) where[s.id] = { sheet: name, r: slotRow[k], c: c0 };
      });
    });
    // Alçades de la part de dalt
    ws.rowH(R.date, 20); ws.rowH(R.label, 17); ws.rowH(R.state, 15); ws.rowH(R.info, 15); ws.rowH(R.obj, 48); ws.rowH(R.obs, 24); ws.rowH(R.week, 16);
    return ws;
  }

  // ── Calendari de la setmana i dades de cada dia ──
  function top(ws, { c0, wk, w, list, first, last, st, name, slotRow, settings }) {
    const lab = (r, text, sz = 8) => ws.set(r, c0, text, { sz, h: 'right', v: 'center', color: XL_C.MUTED });
    ws.set(R.date, c0, `S${w + 1}`, { b: true, sz: 9, h: 'center', v: 'center', color: XL_C.BRAND });
    lab(R.obj, 'Obj', 9); lab(R.rpe, 'RPE'); lab(R.t, 'T (min)'); lab(R.load, 'Càrrega'); lab(R.well, 'Well.'); lab(R.pain, 'Dolor'); lab(R.obs, 'Obs');
    ws.set(R.week, c0, 'Setm.', { sz: 8, h: 'right', v: 'center', b: true, color: XL_C.BRAND });
    const loadCells = [];
    for (let d = 0; d < 7; d++) {
      const date = U.addDays(wk, d);
      const c = c0 + 1 + 2 * d;
      const out = date < first || date > last;
      const sunday = d === 6;
      const day = list.filter((s) => s.date === date);
      const s = day[0] || null;
      const state = s ? st(s) : null;
      const off = !s && sunday;
      const box = { border: 'thin', bc: 'BFBFBF' };
      ws.merge(R.date, c, R.date, c + 1, { date }, [box, { b: true, sz: 10, h: 'center', v: 'center', fmt: 'd-mmm', fill: out ? 'F2F2F2' : HEAD_FILL, color: out ? '8C8C8C' : null }]);
      if (s) ws.link(R.date, c, xlGo(name, slotRow[list.indexOf(s)], c0), 'Vés a la sessió');
      const extra = day.length > 1 ? ` (+${day.length - 1})` : '';
      ws.merge(R.label, c, R.label, c + 1, s ? `${shortLabel(s)}${extra}` : '', [box, { b: true, sz: 9, h: 'center', v: 'center', fill: s ? state.fill : off ? HEAD_FILL : null, color: XL_C.BRAND }]);
      ws.merge(R.state, c, R.state, c + 1, s ? stateText(state) : off ? 'OFF' : '', [box, { sz: 9, h: 'center', v: 'center', fill: s ? state.fill : off ? HEAD_FILL : null, color: s && state.key === 'feta' ? '3D6B2E' : null }]);
      const f = (s && s.feedback) || {};
      const info = s ? (done(s) ? [f.rpe !== '' && f.rpe != null && `RPE ${f.rpe}`, f.duration && `${f.duration}'`].filter(Boolean).join(' · ') : xlStr(s.professional)) : '';
      ws.merge(R.info, c, R.info, c + 1, info, [box, { sz: 8, h: 'center', v: 'center', color: XL_C.MUTED, fill: off ? HEAD_FILL : null }]);
      // Objectiu i focus dels blocs
      const runs = [];
      if (s) {
        if (s.goal) runs.push([s.goal, { b: true, sz: 8 }]);
        for (const b of usedBlocks(s)) if (b.focus) runs.push([`${runs.length ? '\n' : ''}${xlBlockName(b.key, settings)}: `, { b: true, sz: 8, color: XL_BLOCK[b.key] }], [b.focus, { sz: 8 }]);
      }
      ws.merge(R.obj, c, R.obj, c + 1, runs.length ? { rich: runs } : '', { sz: 8, h: 'left', v: 'top', wrap: true });
      // RPE, temps, càrrega, wellness i dolor (només de les sessions fetes)
      const wl = s && done(s) ? Calc.wellness(s.wellness) : null;
      const pain = s && done(s) ? xlNum(f.pain) : null;
      ws.merge(R.rpe, c, R.rpe, c + 1, s && done(s) ? xlNum(f.rpe) : null, { sz: 9, h: 'center', v: 'center' });
      ws.merge(R.t, c, R.t, c + 1, s && done(s) ? xlNum(f.duration) : null, { sz: 9, h: 'center', v: 'center', fmt: '0' });
      const rr = xlRef(R.rpe, c), tr = xlRef(R.t, c);
      const load = s && done(s) ? Calc.sessionLoad(s) : null;
      ws.merge(R.load, c, R.load, c + 1, { f: `IF(COUNT(${rr},${tr})=2,${rr}*${tr},"")`, v: load ?? '' }, { sz: 9, h: 'center', v: 'center', fmt: '0', b: true });
      loadCells.push(xlRef(R.load, c));
      ws.merge(R.well, c, R.well, c + 1, wl && wl.total != null ? wl.total : null, { sz: 9, h: 'center', v: 'center', fmt: '0', fill: !wl ? null : wl.tone === 'bad' ? XL_C.RED : wl.tone === 'warn' ? XL_C.AMB : null });
      ws.merge(R.pain, c, R.pain, c + 1, pain, { sz: 9, h: 'center', v: 'center', fmt: '0', fill: pain == null ? null : pain >= 6 ? XL_C.RED : pain >= 3 ? XL_C.AMB : null });
      const obs = s && !s.ghost ? [xlStr(f.notes).trim(), xlStr(f.decision).trim() && `→ ${xlStr(f.decision).trim()}`].filter(Boolean).join(' ') : '';
      ws.merge(R.obs, c, R.obs, c + 1, obs, { sz: 8, h: 'left', v: 'top', wrap: true, bb: 'medium', bc: LINE });
    }
    ws.set(R.obs, c0, 'Obs', { sz: 8, h: 'right', v: 'center', color: XL_C.MUTED, bb: 'thin', bc: LINE });
    // Total de la setmana
    const fetes = list.filter(done);
    const loads = fetes.map((s) => Calc.sessionLoad(s)).filter((v) => v != null);
    const rpes = fetes.map((s) => xlNum((s.feedback || {}).rpe)).filter((v) => v != null);
    ws.merge(R.week, c0 + 1, R.week, c0 + 4, { f: `SUM(${loadCells.join(',')})`, v: loads.reduce((a, b) => a + b, 0) }, { b: true, sz: 9, h: 'center', v: 'center', fmt: '0 "UA"', fill: XL_C.GREY, border: 'thin', bc: 'BFBFBF' });
    const txt = list.length
      ? [`${U.plural(list.length, 'sessió', 'sessions')}`, `${fetes.length} ${fetes.length === 1 ? 'feta' : 'fetes'}`, rpes.length ? `RPE mitjà ${U.fmt(rpes.reduce((a, b) => a + b, 0) / rpes.length, 1)}` : ''].filter(Boolean).join(' · ')
      : 'Cap sessió aquesta setmana';
    ws.merge(R.week, c0 + 5, R.week, c0 + W - 1, `${U.fmtDateShort(wk)} – ${U.fmtDateShort(U.addDays(wk, 6))}  ·  ${txt}`, { sz: 8, h: 'left', v: 'center', color: XL_C.MUTED, indent: 1 });
  }

  // ── Una sessió sencera, amb les columnes de l'Oriol ──
  function slot(ws, { c0, r, s, state, wk, settings, plans }) {
    const C = (j) => c0 + j;
    const end = C(W - 1);
    const box = { bc: LINE };
    ws.merge(r, C(0), r, end, s.ghost ? `SESSIÓ PREVISTA · ${shortLabel(s).toUpperCase()}` : `SESSIÓ ${s.number || ''} · ${stateText(state).toUpperCase()}`, [box, { b: true, sz: 10, h: 'center', v: 'center', fill: state.fill, color: XL_C.BRAND, border: 'medium' }]);
    ws.rowH(r, 18);
    r++;
    const small = { sz: 9, h: 'center', v: 'center', color: XL_C.MUTED };
    ws.set(r, C(0), 'DIA', { ...small, h: 'right' });
    ws.merge(r, C(1), r, C(2), { date: s.date }, { sz: 10, b: true, h: 'center', v: 'center', fmt: 'dd/mm/yyyy' });
    ws.merge(r, C(3), r, C(4), U.weekday(s.date), small);
    ws.merge(r, C(5), r, C(6), 'PROFESSIONAL', small);
    ws.merge(r, C(7), r, C(10), xlStr(s.professional).toUpperCase(), { sz: 10, b: true, h: 'center', v: 'center' });
    ws.merge(r, C(11), r, C(12), 'SETMANA', small);
    ws.merge(r, C(13), r, C(14), { date: wk }, { sz: 10, h: 'center', v: 'center', fmt: 'dd/mm/yyyy' });
    r++;
    if (s.goal || s.planId || s.pillar) {
      const plan = s.planId ? plans.find((x) => x.id === s.planId) : null;
      const runs = [];
      if (s.goal) runs.push([s.goal, { b: true, sz: 9 }]);
      if (s.pillar) runs.push([`${runs.length ? '   ·   ' : ''}Pilar: ${s.pillar}`, { sz: 9, color: XL_C.MUTED }]);
      if (plan) runs.push([`${runs.length ? '   ·   ' : ''}${plan.name} · S${s.planN} de ${(plan.sessions || []).length}`, { sz: 9, i: true, color: XL_C.MUTED }]);
      ws.set(r, C(0), 'OBJ.', { ...small, h: 'right', b: true });
      ws.merge(r, C(1), r, end, { rich: runs }, { sz: 9, h: 'left', v: 'center', wrap: true, indent: 1 });
      r++;
    }
    const wtxt = wellnessText(s);
    if (wtxt) {
      ws.set(r, C(0), 'WELL.', { ...small, h: 'right', b: true });
      ws.merge(r, C(1), r, end, wtxt, { sz: 8, h: 'left', v: 'center', wrap: true, indent: 1, color: XL_C.MUTED });
      r++;
    }
    // Capçalera de la taula
    const head = { b: true, sz: 9, h: 'center', v: 'center', wrap: true, bt: 'thin', bb: 'thin', bc: LINE };
    ws.merge(r, C(0), r, C(1), 'GM', head);
    ws.set(r, C(2), 'Cont', head); ws.set(r, C(3), 'Pos', head); ws.set(r, C(4), 'A', head);
    ws.merge(r, C(5), r, C(8), 'Exercici', head);
    ws.merge(r, C(9), r, C(10), 'Material', head);
    ws.set(r, C(11), '+', head); ws.set(r, C(12), 'S', head); ws.set(r, C(13), 'R', head); ws.set(r, C(14), 'Obs', head);
    ws.rowH(r, 20);
    r++;
    const bl = usedBlocks(s);
    if (!bl.length) {
      ws.merge(r, C(0), r, end, 'Aquesta sessió encara no té exercicis.', { sz: 9, i: true, h: 'center', v: 'center', color: XL_C.MUTED });
      r++;
    }
    const cell = { sz: 9, h: 'center', v: 'center', wrap: true, bb: 'thin', bc: 'E3DDD6' };
    const itemRow = (it) => {
      ws.merge(r, C(0), r, C(1), xlStr(it.gm), cell);
      ws.set(r, C(2), xlStr(it.cont), cell); ws.set(r, C(3), xlStr(it.pos), cell); ws.set(r, C(4), xlStr(it.lat), cell);
      // El nom de l'exercici obre el vídeo del client (o, si no n'hi ha, el de demostració); si hi ha tots dos, la
      // demostració s'obre des de les observacions.
      const vid = xlIsWeb(it.video) ? xlStr(it.video).trim() : '';
      const demo = xlIsWeb(it.demo) ? xlStr(it.demo).trim() : '';
      const url = vid || demo;
      const nameRuns = [];
      if (it.done) nameRuns.push(['✔ ', { b: true, color: '3D6B2E', sz: 9 }]);
      nameRuns.push([it.name, { b: true, sz: 9, ...(url ? { color: XL_C.LINK, u: true } : {}) }]);
      ws.merge(r, C(5), r, C(8), { rich: nameRuns }, cell);
      if (url) ws.link(r, C(5), url, vid ? 'Vídeo del client' : 'Vídeo de demostració');
      ws.merge(r, C(9), r, C(10), xlStr(it.material), cell);
      ws.set(r, C(11), Calc.load(it.load) || xlStr(it.load), cell);
      ws.set(r, C(12), xlNumOrText(it.sets), cell);
      ws.set(r, C(13), xlNumOrText(it.reps), cell);
      const obs = obsOf(it);
      if (vid && demo) {
        ws.set(r, C(14), { rich: [...(obs ? [[`${obs} · `, { sz: 8 }]] : []), ['▶ demostració', { sz: 8, color: XL_C.LINK, u: true }]] }, [cell, { sz: 8, h: 'left' }]);
        ws.link(r, C(14), demo, 'Vídeo de demostració');
      } else ws.set(r, C(14), obs, [cell, { sz: 8, h: 'left' }]);
      r++;
      // Encoder o salts: cada sèrie, en una fila a sota de l'exercici.
      const vbt = Calc.vbt(it);
      if (vbt) {
        ws.merge(r, C(2), r, end, `${vbt.mode === 'salts' ? 'Salts' : 'Encoder'} · ${vbt.detail}`, { sz: 8, i: true, h: 'left', v: 'center', wrap: true, indent: 1, color: XL_C.MUTED, bb: 'thin', bc: 'E3DDD6' });
        r++;
      }
    };
    for (const b of bl) {
      const def = blockDef(b.key);
      const runs = [[`${def.num} · ${xlBlockName(b.key, settings).toUpperCase()}`, { b: true, sz: 9, color: 'FFFFFF' }]];
      if (b.focus) runs.push([`   ${b.focus}`, { sz: 9, color: 'FFFFFF' }]);
      if (b.methodName) runs.push([`   ·   ${b.methodName}`, { sz: 9, i: true, color: 'FFFFFF' }]);
      ws.merge(r, C(0), r, end, { rich: runs }, { fill: XL_BLOCK[b.key], h: 'left', v: 'center', indent: 1, sz: 9 });
      r++;
      const gs = Calc.groups(b);
      if (gs) {
        for (const x of gs) {
          ws.merge(r, C(0), r, end, { rich: [[x.label, { b: true, sz: 9, color: XL_C.BRAND_M }], [x.g.methodName ? `   ·   ${x.g.methodName}` : '', { sz: 9, i: true, color: XL_C.MUTED }]] }, { fill: XL_C.GREY, h: 'left', v: 'center', indent: 2, sz: 9 });
          r++;
          x.items.map((y) => y.it).filter((i) => i.name).forEach(itemRow);
        }
      } else names(b).forEach(itemRow);
    }
    const cl = closing(s);
    if (cl) {
      ws.merge(r, C(0), r, end, { rich: [['TANCAMENT   ', { b: true, sz: 9, color: XL_C.BRAND }], [cl, { sz: 9 }]] }, { h: 'left', v: 'center', wrap: true, indent: 1, fill: done(s) ? XL_C.GRN : XL_C.GREY, bt: 'thin', bb: 'medium', bc: LINE });
      r++;
    }
    return r;
  }

  return { build, sheetName, weeksOf, rowsOf };
})();
