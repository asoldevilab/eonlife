/* EON Life · NOE en mode demostració: respostes preparades, SENSE intel·ligència artificial.
   Serveix per veure com treballa NOE (cerca, propostes amb targeta, aplicar i desfer) abans de tenir la clau de l'API, i per
   provar l'app sense cridar mai el servei real. Té el mateix «transport» que la IA de veritat (Noe.state.transport), així que
   fa servir les mateixes eines. Només entén unes quantes demanes (cercar, qui no ha vingut, proposar una sessió, planificar
   un mes); la IA real entén qualsevol cosa. */

const NoeDemo = (() => {
  const MONTHS = ['gener', 'febrer', 'marc', 'abril', 'maig', 'juny', 'juliol', 'agost', 'setembre', 'octubre', 'novembre', 'desembre'];
  const DAYS = [[1, 'dilluns'], [2, 'dimarts'], [3, 'dimecres'], [4, 'dijous'], [5, 'divendres'], [6, 'dissabte'], [0, 'diumenge']];
  const NOTE = '_Mode demostració: respostes preparades, no és la IA real._\n\n';
  const usage = { input_tokens: 0, output_tokens: 0 };

  const say = (text) => ({ role: 'assistant', content: [{ type: 'text', text }], stop_reason: 'end_turn', usage });
  const call = (calls) => ({ role: 'assistant', stop_reason: 'tool_use', usage,
    content: calls.map((c, i) => ({ type: 'tool_use', id: `demo_${Date.now().toString(36)}_${i}`, name: c[0], input: c[1] })) });

  const lastText = (msgs) => {
    for (let i = msgs.length - 1; i >= 0; i--) {
      const m = msgs[i];
      if (m.role === 'user' && (typeof m.content === 'string' || !m.content.some((c) => c.type === 'tool_result'))) return typeof m.content === 'string' ? m.content : m.content.map((c) => c.text || '').join(' ');
    }
    return '';
  };
  // Les tool_result de la darrera volta, amb el nom de l'eina que els va demanar.
  const lastResults = (msgs) => {
    const res = msgs[msgs.length - 1];
    const asst = msgs[msgs.length - 2];
    if (!res || !asst || !Array.isArray(res.content)) return null;
    const uses = (asst.content || []).filter((c) => c.type === 'tool_use');
    return res.content.filter((c) => c.type === 'tool_result').map((r) => {
      const use = uses.find((u) => u.id === r.tool_use_id) || {};
      let data = null;
      try { data = JSON.parse(r.content); } catch (e) { /* res */ }
      return { name: use.name, input: use.input || {}, data, raw: r.content };
    });
  };

  const monthOf = (text) => {
    const t = U.norm(text);
    const y = U.today().slice(0, 4);
    const cur = U.monthKey(U.today());
    for (let i = 0; i < 12; i++) if (t.includes(MONTHS[i])) { const k = `${y}-${String(i + 1).padStart(2, '0')}`; return k < cur ? `${Number(y) + 1}-${String(i + 1).padStart(2, '0')}` : k; }
    if (/aquest mes|mes actual/.test(t)) return cur;
    return U.monthKey(U.addMonths(`${cur}-01`, 1));
  };

  function planFrom(results, text) {
    const cal = results.find((r) => r.name === 'calendari_pacient');
    const pacient = cal.input.pacient;
    const month = cal.input.mes;
    // Si la demanda diu els dies («dimarts i divendres»), els fa servir; si no, els habituals del pacient.
    const named = DAYS.filter((d) => new RegExp(`\\b${d[1]}`).test(U.norm(text))).map((d) => d[0]);
    const days = ((cal.data && cal.data.dies_habituals_d_entrenament) || []).map((d) => d.dia_setmana);
    const use = named.length ? named : days.length ? days : [1, 4];
    const taken = new Set((cal.data && cal.data.dies_ocupats) || []);
    const by = {};
    for (const r of results) if (r.name === 'buscar_exercicis' && r.data) by[r.input.bloc] = r.data.exercicis || [];
    const pick = (block, k, n = 1) => { const l = by[block] || []; if (!l.length) return []; return Array.from({ length: n }, (_, j) => l[(k + j) % l.length]); };
    const first = `${month}-01`, last = U.addDays(U.addMonths(first, 1), -1);
    const sessions = [];
    let k = 0, weekIdx = 0, prevWeek = '';
    for (let d = first; d <= last; d = U.addDays(d, 1)) {
      if (!use.includes(U.parse(d).getDay()) || taken.has(d)) continue;
      const wk = U.weekStart(d);
      if (wk !== prevWeek) { weekIdx++; prevWeek = wk; }
      const deload = weekIdx % 4 === 0;
      const rx = (e, o = {}) => ({ exercici_id: e.id, series: deload ? '2' : o.series || e.series || '3', repeticions: o.repeticions || e.repeticions || '8', ...(o.rir ? { intensitat: weekIdx === 1 ? 'RIR 3' : 'RIR 2' } : {}) });
      const blocs = [];
      const add = (bloc, list, o) => { if (list.length) blocs.push({ bloc, exercicis: list.map((e) => rx(e, o)) }); };
      add('mob', pick('mob', k, 2), { series: '2' });
      add('act', pick('act', k, 2), { series: '2' });
      add('for', pick('for', k * 2, 2), { series: '3', repeticions: '6-8', rir: true });
      add('acc', pick('acc', k, 2), { series: '2', repeticions: '10', rir: true });
      add('cal', pick('cal', k, 1), { series: '1' });
      sessions.push({ data: d, objectiu: `Setmana ${weekIdx}${deload ? ' · descàrrega' : ''} · força general`, pilar: 'Força i potència', blocs });
      k++;
    }
    return { pacient, mes: month, sessions, motiu: 'Progressió suau en quatre setmanes (RIR 3 → 2) amb una descàrrega de volum la quarta, i una rotació dels exercicis de la biblioteca perquè no siguin sempre els mateixos. (Proposta de demostració.)' };
  }

  async function transport(body) {
    const msgs = body.messages;
    const res = lastResults(msgs);
    const text = lastText(msgs);
    const t = U.norm(text);
    const code = (text.match(/PAC-\d+/i) || [])[0];

    if (res && res.length) {
      const names = res.map((r) => r.name);
      const prop = res.find((r) => /^proposar_/.test(r.name));
      if (prop) {
        if (prop.data && prop.data.error) return say(`${NOTE}No he pogut preparar la proposta: ${prop.data.error}`);
        return say(`${NOTE}T'he deixat la proposta a la targeta d'aquí dalt. Revisa-la i, si t'agrada, prem **Aplica**. ${prop.data.avisos && prop.data.avisos.length ? `\n\nAvisos: ${prop.data.avisos.join(' ')}` : ''}`);
      }
      if (names.includes('calendari_pacient')) {
        const cal = res.find((r) => r.name === 'calendari_pacient');
        if (cal.data && cal.data.error) return say(`${NOTE}${cal.data.error}`);
        return call(['mob', 'act', 'for', 'acc', 'cal'].map((b) => ['buscar_exercicis', { bloc: b, limit: 8 }]));
      }
      if (names.every((n) => n === 'buscar_exercicis') && names.length === 5) {
        // Les cerques de la planificació del mes: cal recuperar el calendari de la volta anterior.
        const cal = [...msgs].reverse().map((m) => (Array.isArray(m.content) ? m.content : [])).flat().find((c) => c.type === 'tool_use' && c.name === 'calendari_pacient');
        const calRes = [...msgs].flatMap((m) => (Array.isArray(m.content) ? m.content : [])).find((c) => c.type === 'tool_result' && cal && c.tool_use_id === cal.id);
        let data = null; try { data = JSON.parse(calRes.content); } catch (e) { /* res */ }
        const plan = planFrom([{ name: 'calendari_pacient', input: cal.input, data }, ...res], text);
        if (!plan.sessions.length) return say(`${NOTE}Aquest mes no hi ha cap dia lliure per planificar.`);
        return call([['proposar_planificacio_mes', plan]]);
      }
      if (names.includes('llista_pacients')) {
        const d = res[0].data || {};
        const rows = (d.pacients || []).slice(0, 12);
        if (!rows.length) return say(`${NOTE}Tots els pacients han entrenat fa poc.`);
        return say(`${NOTE}Aquests pacients fa temps que no tenen cap sessió feta:\n\n${rows.map((r) => `- [[pacient:${r.pacient}]] · ${r.darrera_sessio_feta ? `última sessió el ${U.fmtDate(r.darrera_sessio_feta)} (fa ${r.dies_sense_sessio} dies)` : 'cap sessió feta'}`).join('\n')}`);
      }
      if (names.includes('cerca_global')) {
        const d = res[0].data || {};
        const parts = [];
        if ((d.pacients || []).length) parts.push(`**Pacients**\n${d.pacients.map((p) => `- [[pacient:${p.pacient}]] ${p.objectiu || ''}`).join('\n')}`);
        if ((d.sessions || []).length) parts.push(`**Sessions**\n${d.sessions.map((s) => `- [[sessio:${s.id}]] ${U.fmtDate(s.data)} ${s.objectiu || ''}`).join('\n')}`);
        if ((d.exercicis || []).length) parts.push(`**Exercicis**\n${d.exercicis.slice(0, 8).map((e) => `- [[exercici:${e.id}]] ${e.nom}`).join('\n')}`);
        return say(`${NOTE}${parts.join('\n\n') || 'No he trobat res amb aquest text.'}`);
      }
      return say(`${NOTE}Fet.`);
    }

    // Primera volta d'una demanda
    if (/(qui|quins).*(no ha|no han|sense).*(entren|sessi|vingut)|fa temps/.test(t)) return call([['llista_pacients', { estat: 'actiu', sense_sessio_dies: 14 }]]);
    if (code && /(planifica|programa|calendari|mes)/.test(t)) return call([['calendari_pacient', { pacient: code, mes: monthOf(text) }]]);
    if (code && /(sessio|entrenament|proposa)/.test(t)) {
      const mes = monthOf('aquest mes');
      return call([['calendari_pacient', { pacient: code, mes }]]);
    }
    const q = text.match(/(?:busca|cerca|troba|on és|on es)\s+(.+)/i);
    if (q) return call([['cerca_global', { text: q[1].replace(/[?.!]+$/, '').trim() }]]);
    return say(`${NOTE}Hola! Sóc NOE. En mode demostració només entenc unes quantes coses:\n\n- «**Qui no ha entrenat** fa temps?»\n- «**Cerca** sentadilla» (pacients, sessions o exercicis)\n- «**Planifica el mes de novembre** per a PAC-1» (o escriu el nom del pacient)\n\nAmb la clau de l'API, entenc qualsevol cosa.`);
  }

  return { transport };
})();
