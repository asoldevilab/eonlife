/* EON Life · Excel d'una sessió d'entrenament (feta o planificada).
   Tres fulls: «Sessió» (dades, wellness, tancament i resum dels blocs), «Exercicis» (els 6 blocs amb tota la
   prescripció, com a l'app) i «Encoder» (el registre per sèries de l'ADR, si n'hi ha). */

const ExcelSession = (() => {
  const NC = 6; // columnes del full «Sessió»
  const W_SESSION = [30, 16, 22, 22, 22, 22];
  const EX = [
    ['#', 6], ['Exercici', 34], ['Grup muscular', 14], ['Cont.', 6.5], ['Pos.', 6.5], ['Lat.', 6.5], ['Material', 18],
    ['Sèries', 7.5], ['Reps / temps', 11], ['Càrrega', 11], ['Intensitat', 11], ['Descans', 9], ['Tempo', 8.5],
    ['Encoder · ADR', 26], ['Última vegada', 24], ['Observacions', 30], ['Fet', 5.5], ['Vídeo client', 11], ['Demo', 8],
  ];

  // Última vegada que el client va fer cada exercici (només sessions fetes abans d'aquesta).
  function prevMap(sessions, s) {
    const out = {};
    const before = (sessions || []).filter((x) => x.id !== s.id && x.status === 'feta' && x.date <= s.date)
      .sort((a, b) => (a.date === b.date ? (U.num(a.number) || 0) - (U.num(b.number) || 0) : a.date < b.date ? -1 : 1)).reverse();
    for (const x of before) for (const b of x.blocks || []) for (const it of b.items || []) {
      if (it.name && !out[it.name]) out[it.name] = { ...it, date: x.date };
    }
    return out;
  }

  const namedItems = (b) => (b.items || []).filter((i) => i.name);

  function title(s, p) {
    return s.ghost ? `Sessió prevista S${s.planN} · ${U.fullName(p)}` : `Sessió ${s.number || ''} · ${U.fullName(p)}`.replace('  ', ' ');
  }

  function build({ patient: p, session: s, sessions = [], plan = null, settings, today = U.today() }) {
    const state = xlSessionState(s, today);
    const blocks = (s.blocks || []).filter((b) => namedItems(b).length || b.focus || b.method || (b.groups || []).length);
    const doc = XlsxDoc.create({ title: title(s, p), subject: 'Sessió d\'entrenament', creator: 'EON Life', company: (settings && settings.centerName) || 'EON Life' });
    const wsS = doc.sheet('Sessió', { grid: false, landscape: true, tab: XL_C.BRAND, zoom: 100 });
    const wsE = doc.sheet('Exercicis', { grid: false, landscape: true, tab: XL_BLOCK.for, zoom: 90, titles: [5, 5] });
    const hasVbt = blocks.some((b) => namedItems(b).some((it) => Calc.vbt(it)));
    const wsV = hasVbt ? doc.sheet('Encoder', { grid: false, landscape: true, tab: XL_BLOCK.pot, zoom: 100, titles: [5, 5] }) : null;

    const where = exercisesSheet(wsE, { p, s, blocks, settings, prev: prevMap(sessions, s), state });
    if (wsV) encoderSheet(wsV, { p, s, blocks, settings });
    summarySheet(wsS, { p, s, blocks, settings, plan, state, where, today, planTotal: plan ? (plan.sessions || []).length : 0 });
    return doc;
  }

  // ── Full «Sessió» ──
  function summarySheet(ws, { p, s, blocks, settings, plan, state, where, planTotal }) {
    ws.cols(W_SESSION);
    let r = xlTitle(ws, title(s, p), `${U.fmtDateLong(s.date)} · ${state.label}${s.professional ? ` · ${s.professional}` : ''}`, NC);

    r = xlSection(ws, r, 'Dades de la sessió', NC);
    const rowDate = r + 1;
    const rows = [
      ['Client', U.fullName(p)],
      ['Data', { date: s.date }, { style: { h: 'left' } }],
      ['Dia de la setmana', U.weekday(s.date)],
      [s.ghost ? 'Sessió del pla' : 'Nº de sessió', s.ghost ? `S${s.planN}` : U.num(s.number) ?? '', { style: { h: 'left' } }],
      ['Professional', xlStr(s.professional)],
      ['Pilar', xlStr(s.pillar)],
      ['Objectiu de la sessió', xlStr(s.goal)],
    ];
    r = xlKv(ws, r, rows, NC);
    // Estat: les «planificades» passen soles a «Sense tancar» quan s'obre el fitxer un dia després de la data.
    const rowState = r;
    ws.set(r, 1, 'Estat', XS.label);
    if (state.key === 'planificada' || state.key === 'sense') {
      ws.merge(r, 2, r, NC, { f: `IF(${xlRef(rowDate, 2)}<TODAY(),"Sense tancar","Planificada")`, v: state.key === 'sense' ? 'Sense tancar' : 'Planificada' }, [XS.text, { b: true, fill: state.fill }]);
      ws.cf(`${xlRef(r, 2)}:${xlRef(r, NC)}`, `$B$${r}="Sense tancar"`, { fill: XL_C.AMB });
      ws.cf(`${xlRef(r, 2)}:${xlRef(r, NC)}`, `$B$${r}="Planificada"`, { fill: XL_C.BRAND_L });
    } else ws.merge(r, 2, r, NC, state.label, [XS.text, { b: true, fill: state.fill }]);
    r++;
    const nEx = blocks.reduce((n, b) => n + namedItems(b).length, 0);
    const nDone = blocks.reduce((n, b) => n + namedItems(b).filter((i) => i.done).length, 0);
    const more = [];
    if (plan) more.push(['Pla d\'entrenament', `${plan.name} · S${s.planN} de ${planTotal}${(plan.sessions || []).find((x) => x.n === U.num(s.planN) && x.phase) ? ` · ${(plan.sessions.find((x) => x.n === U.num(s.planN))).phase}` : ''}`]);
    more.push(['Contingut', `${U.plural(nEx, 'exercici', 'exercicis')} en ${U.plural(blocks.length, 'bloc', 'blocs')}${s.status === 'feta' ? ` · ${nDone} marcats com a fets` : ''}`]);
    r = xlKv(ws, r, more, NC) + 1;

    // Wellness
    const wl = Calc.wellness(s.wellness);
    if (wl || state.key === 'feta') {
      r = xlSection(ws, r, 'Wellness · com arriba avui?', NC);
      r = xlHeader(ws, r, ['Pregunta', 'Resposta (1–5)', ['1 =', 2], ['5 =', 2]]);
      const first = r;
      for (const q of WELLNESS) {
        const v = U.num((s.wellness || {})[q.k]);
        ws.set(r, 1, q.label, [XS.label]);
        ws.set(r, 2, v, [XS.cell, { b: true, fmt: '0', fill: v == null ? null : v <= 2 ? XL_C.RED : v === 3 ? XL_C.AMB : XL_C.GRN }]);
        ws.merge(r, 3, r, 4, q.lo, [XS.text, { color: XL_C.MUTED }]);
        ws.merge(r, 5, r, 6, q.hi, [XS.text, { color: XL_C.MUTED }]);
        r++;
      }
      ws.set(r, 1, 'Total (màxim 25)', XS.label);
      ws.set(r, 2, { f: `IF(COUNT(${xlRef(first, 2)}:${xlRef(r - 1, 2)})=${WELLNESS.length},SUM(${xlRef(first, 2)}:${xlRef(r - 1, 2)}),"")`, v: wl && wl.total != null ? wl.total : '' }, [XS.cell, { b: true, fmt: '0', fill: XL_C.GREY }]);
      ws.merge(r, 3, r, NC, wl && wl.low.length ? `Respostes baixes (1 o 2): ${wl.low.join(', ')}` : '', [XS.text, { color: XL_C.MUTED }]);
      r++;
      r = xlKv(ws, r, [['Observacions', xlStr((s.wellness || {}).notes)]], NC) + 1;
    }

    // Tancament
    const f = s.feedback || {};
    const hasFb = ['rpe', 'duration', 'pain', 'notes', 'decision'].some((k) => xlStr(f[k]).trim() !== '');
    if (state.key === 'feta' || hasFb) {
      r = xlSection(ws, r, 'Tancament de la sessió', NC);
      const rpe = r, dur = r + 1;
      const pain = U.num(f.pain);
      r = xlKv(ws, r, [
        ['RPE global (0–10)', xlNum(f.rpe) ?? '—', { style: { h: 'left', b: true }, keep: true }],
        ['Durada (minuts)', xlNum(f.duration) ?? '—', { style: { h: 'left', b: true }, keep: true }],
        ['Càrrega de la sessió (UA = RPE × min)', { f: `IF(COUNT(${xlRef(rpe, 2)},${xlRef(dur, 2)})=2,${xlRef(rpe, 2)}*${xlRef(dur, 2)},"")`, v: Calc.sessionLoad(s) ?? '' }, { style: { h: 'left', b: true, fmt: '0' } }],
        ['Dolor en acabar (0–10)', pain, { style: { h: 'left', b: true, fill: pain == null ? null : pain >= 6 ? XL_C.RED : pain >= 3 ? XL_C.AMB : XL_C.GRN } }],
        ['Observacions', xlStr(f.notes)],
        ['Decisió per a la propera sessió', xlStr(f.decision)],
      ], NC) + 1;
    }

    // Blocs
    if (blocks.length) {
      r = xlSection(ws, r, 'Blocs de la sessió', NC);
      r = xlHeader(ws, r, ['Bloc', ['Focus', 2], 'Mètode', 'Exercicis', 'Fets']);
      for (const b of blocks) {
        const def = blockDef(b.key);
        const items = namedItems(b);
        const gs = Calc.groups(b);
        const method = [b.methodName, ...(gs || []).map((x) => x.g.methodName && `${x.label}: ${x.g.methodName}`)].filter(Boolean).join(' · ');
        ws.set(r, 1, `${def.num} · ${xlBlockName(b.key, settings)}`, [XS.cell, { b: true, color: 'FFFFFF', fill: XL_BLOCK[b.key], h: 'left', indent: 1 }]);
        ws.merge(r, 2, r, 3, xlStr(b.focus), XS.text);
        ws.set(r, 4, method, XS.text);
        ws.set(r, 5, items.length, [XS.cell, { fmt: '0' }, where[b.key] ? XS.link : null]);
        if (where[b.key]) ws.link(r, 5, xlGo('Exercicis', where[b.key], 1), 'Vés als exercicis del bloc');
        ws.set(r, 6, s.status === 'feta' || items.some((i) => i.done) ? items.filter((i) => i.done).length : null, [XS.cell, { fmt: '0' }]);
        r++;
      }
      r++;
    }

    // Vídeos del client
    const vids = [];
    for (const b of blocks) for (const it of namedItems(b)) if (it.video) vids.push({ b, it });
    if (vids.length) {
      r = xlSection(ws, r, 'Vídeos del client (gravats amb l\'app)', NC);
      r = xlHeader(ws, r, [['Exercici', 2], 'Bloc', ['Fitxer', 3]]);
      for (const { b, it } of vids) {
        ws.merge(r, 1, r, 2, it.name, XS.text);
        ws.set(r, 3, xlBlockName(b.key, settings), XS.text);
        ws.merge(r, 4, r, 6, xlIsWeb(it.video) ? 'Obre el vídeo' : 'Desat a la tauleta (versió de prova)', [XS.cell, xlIsWeb(it.video) ? XS.link : XS.muted]);
        if (xlIsWeb(it.video)) ws.link(r, 4, xlStr(it.video).trim(), 'Obre el vídeo');
        r++;
      }
    }
    return r;
  }

  // ── Full «Exercicis» ──
  function exercisesSheet(ws, { p, s, blocks, settings, prev, state }) {
    const n = EX.length;
    ws.cols(EX.map((x) => x[1]));
    let r = xlTitle(ws, `Exercicis · ${title(s, p)}`, `${U.fmtDateLong(s.date)} · ${state.label}`, n);
    ws.freeze(r + 1, 3);
    EX.forEach(([label], i) => ws.set(r, i + 1, label, i === 1 ? XS.headL : XS.head));
    ws.rowH(r, 28);
    r++;
    const where = {};
    if (!blocks.length) {
      ws.merge(r, 1, r, n, 'Aquesta sessió encara no té exercicis. Afegeix els blocs des de l\'app.', [XS.text, { i: true, color: XL_C.MUTED }]);
      return where;
    }
    for (const b of blocks) {
      const def = blockDef(b.key);
      where[b.key] = r;
      const gs = Calc.groups(b);
      ws.set(r, 1, def.num, [XS.cell, { b: true, sz: 12, color: 'FFFFFF', fill: XL_BLOCK[b.key] }]);
      ws.merge(r, 2, r, n, {
        rich: [[xlBlockName(b.key, settings), { b: true, sz: 11, color: XL_C.BRAND }],
          [b.focus ? `   —   ${b.focus}` : '', { color: XL_C.MUTED }],
          [b.methodName ? `   ·   Mètode: ${b.methodName}` : '', { i: true, color: XL_C.MUTED }]],
      }, { fill: XL_C.BRAND_L, border: 'thin', h: 'left', v: 'center', indent: 1, sz: 10 });
      ws.rowH(r, 20);
      r++;
      const rowItem = (it, idx) => {
        const vbt = Calc.vbt(it);
        const last = prev[it.name];
        const cells = [
          [`${def.num}.${idx + 1}`, [XS.cell, XS.muted]],
          [it.name, [XS.text, { b: true }]],
          [xlStr(it.gm), XS.cellW],
          [xlStr(it.cont), XS.cell], [xlStr(it.pos), XS.cell], [xlStr(it.lat), XS.cell],
          [xlStr(it.material), XS.text],
          [xlNumOrText(it.sets), XS.cell],
          [xlNumOrText(it.reps), XS.cellW],
          [xlNumOrText(it.load), XS.cellW],
          [xlStr(it.intensity), XS.cellW],
          [xlStr(it.rest), XS.cellW],
          [xlStr(it.tempo), XS.cell],
          [vbt && vbt.text ? vbt.text : '', [XS.text, { sz: 9 }]],
          [last ? `${U.fmtDateShort(last.date)}: ${Calc.presc(last) || '—'}` : '', [XS.text, { sz: 9, color: XL_C.MUTED }]],
          [xlStr(it.note), [XS.text, { sz: 9 }]],
          [it.done ? '✔' : '', [XS.cell, { b: true, color: '3D6B2E', fill: it.done ? XL_C.GRN : null }]],
        ];
        cells.forEach(([v, st], i) => ws.set(r, i + 1, v, st));
        xlLinkCell(ws, r, 18, it.video, it.video ? (xlIsWeb(it.video) ? 'Obre' : 'a la tauleta') : '', null);
        xlLinkCell(ws, r, 19, it.demo, it.demo ? 'Demo' : '', null);
        r++;
      };
      if (gs) {
        for (const x of gs) {
          ws.merge(r, 1, r, n, {
            rich: [[`${x.label}`, { b: true, color: XL_C.BRAND_M }], [x.g.methodName ? `   ·   Mètode: ${x.g.methodName}` : '', { i: true, color: XL_C.MUTED }]],
          }, { fill: XL_C.GREY, border: 'thin', h: 'left', indent: 2, sz: 10 });
          r++;
          const its = x.items.map((y) => y.it).filter((i) => i.name);
          if (!its.length) { ws.merge(r, 1, r, n, 'Encara no hi ha cap exercici en aquest bloc.', [XS.text, { i: true, color: XL_C.MUTED, indent: 2 }]); r++; }
          its.forEach((it) => rowItem(it, (b.items || []).filter((i) => i.name).indexOf(it)));
        }
      } else namedItems(b).forEach(rowItem);
    }
    r++;
    ws.merge(r, 1, r, n, xlLegend(), [XS.note, { wrap: true }]);
    return where;
  }

  // ── Full «Encoder» ──
  function encoderSheet(ws, { p, s, blocks, settings }) {
    const cols = [['Exercici', 30], ['Bloc', 16], ['Dispositiu', 14], ['Sèrie', 7], ['Càrrega (kg)', 11], ['Reps / salts', 10], ['V 1a rep (m/s)', 11], ['V última (m/s)', 11],
      ['Pèrdua de vel. (%)', 12], ['Pot. màx. (W)', 11], ['Alçada millor (cm)', 12], ['Alçada mitjana (cm)', 12], ['RSI', 8], ['T. contacte (ms)', 11]];
    ws.cols(cols.map((c) => c[1]));
    let r = xlTitle(ws, `Encoder i salts · ${title(s, p)}`, `${U.fmtDateLong(s.date)} · registre per sèries de l'ADR (velocitat) i de l'ADR Jumping`, cols.length);
    ws.freeze(r + 1, 2);
    cols.forEach(([label], i) => ws.set(r, i + 1, label, i === 0 ? XS.headL : XS.head));
    ws.rowH(r, 28);
    r++;
    const n = (v, fmt) => [xlNum(v), [XS.cell, fmt ? { fmt } : null]];
    for (const b of blocks) for (const it of namedItems(b)) {
      const sum = Calc.vbt(it);
      if (!sum) continue;
      const mode = sum.mode;
      const sets = ((it.vbt && it.vbt.sets) || []).filter((st) => Object.entries(st).some(([k, v]) => k !== 'id' && v !== '' && v != null));
      sets.forEach((st, i) => {
        const vl = Calc.vl(st);
        const row = [
          [it.name, [XS.text, { b: true }]], [xlBlockName(b.key, settings), XS.text], [mode === 'salts' ? 'ADR Jumping' : 'Encoder ADR', XS.cell], [i + 1, XS.cell],
          n(st.kg, '0.0'), n(st.reps, '0'), n(st.v1, '0.00'), n(st.vlast, '0.00'), [vl == null ? null : U.round(vl, 1), [XS.cell, { fmt: '0.0' }]], n(st.pmax, '0'),
          n(st.h, '0.0'), n(st.hmean, '0.0'), n(st.rsi, '0.00'), n(st.tc, '0'),
        ];
        row.forEach(([v, stl], k) => ws.set(r, k + 1, v, stl));
        r++;
      });
    }
    return r;
  }

  return { build, prevMap };
})();
