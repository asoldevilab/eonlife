/* EON Life · informe previ de la doctora → dades del client.
   Es llegeix el text (enganxat, o d'un fitxer Word o de text) i es reparteix per apartats segons els títols
   habituals (en català o castellà): objectiu, motiu de consulta, antecedents, diagnòstic, intervenció, lesió
   i recomanacions. El que no té títol va a antecedents. */

const DoctorReport = (() => {
  // Títols reconeguts (sense accents i en minúscules).
  const SECTIONS = [
    { key: 'goal', re: /^(objectius?|objetivos?|metas?|objectiu del (pacient|client)|objetivo del (paciente|cliente)|objectius terapeutics|objetivos terapeuticos)$/ },
    { key: 'reason', re: /^(motiu|motivo|motiu de (la )?consulta|motivo de (la )?consulta|rao de (la )?consulta|consulta|demanda|derivacio|derivacion|motiu de derivacio|motivo de derivacion)$/ },
    { key: 'diagnosis', re: /^(diagnostics?|diagnosticos?|judici clinic|juicio clinico|jc|impressio diagnostica|impresion diagnostica)$/ },
    { key: 'history', re: /^(antecedents?( personals| medics| clinics| familiars)?|antecedentes?( personales| medicos| clinicos| familiares)?|ap|historial( clinic| clinico| medic| medico)?|historia clinica|anamnesis?|patologies|patologias|medicacio|medicacion|tractament actual|tratamiento actual|al.?lergies|alergias|habits|habitos|esport|deporte|activitat fisica|actividad fisica|exploracio|exploracion|proves complementaries|pruebas complementarias)$/ },
    { key: 'surgery', re: /^(intervencio( quirurgica)?|intervencion( quirurgica)?|intervencions|intervenciones|cirurgia|cirugia|cirurgies|cirugias|iq|operacio|operacion|data (de la )?intervencio|fecha (de la )?intervencion)$/ },
    { key: 'injury', re: /^(lesio|lesion|lesions|lesiones|data (de la )?lesio|fecha (de la )?lesion|lesio actual|lesion actual)$/ },
    // Capçalera de l'informe: no s'aprofita (ja tenim el nom i la data del client).
    { key: 'skip', re: /^(pacient|paciente|nom|nombre|cognoms|apellidos|data|fecha|data de naixement|fecha de nacimiento|edat|edad|dni|nif|nhc|cip|tis|historia|metge|metgessa|medico|medica|doctor|doctora|dr|dra|signatura|firma|col.?legiat|colegiado|centre|centro)$/ },
    { key: 'notes', re: /^(recomanacions|recomendaciones|pla|plan|pla terapeutic|plan terapeutico|tractament|tratamiento|indicacions|indicaciones|pautes|pautas|observacions|observaciones|conclusions?|conclusiones?|contraindicacions|contraindicaciones|precaucions|precauciones)$/ },
  ];
  const LABELS = {
    goal: 'Objectiu', reason: 'Motiu de consulta', history: 'Antecedents i historial',
    surgeryDate: 'Data de la intervenció (IQ)', surgeryNote: 'Intervenció', injuryDate: 'Data de la lesió', injuryNote: 'Lesió',
    notes: 'Notes internes (recomanacions de la doctora)',
  };

  const clean = (s) => s.replace(/\s+/g, ' ').trim();
  const sectionOf = (label) => {
    const n = U.norm(label).replace(/\s+/g, ' ').replace(/[.:\-–]+$/, '').trim();
    const found = SECTIONS.find((s) => s.re.test(n));
    return found ? found.key : null;
  };

  // "12/03/2024", "12-3-24", "2024-03-12" → "2024-03-12"
  function findDate(text) {
    let m = String(text).match(/\b(\d{4})-(\d{1,2})-(\d{1,2})\b/);
    if (m) return iso(+m[1], +m[2], +m[3]);
    m = String(text).match(/\b(\d{1,2})[/.\-](\d{1,2})[/.\-](\d{2,4})\b/);
    if (m) {
      let y = +m[3];
      if (y < 100) y += y > 50 ? 1900 : 2000;
      return iso(y, +m[2], +m[1]);
    }
    return '';
  }
  function iso(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    return `${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }
  const withoutDate = (t) => clean(String(t).replace(/\b\d{4}-\d{1,2}-\d{1,2}\b|\b\d{1,2}[/.\-]\d{1,2}[/.\-]\d{2,4}\b/g, '').replace(/^[\s,;:.\-–]+|[\s,;:\-–]+$/g, '').replace(/\(\s*\)/g, ''));

  function parse(text) {
    const buckets = {};
    let current = null;
    const push = (key, line) => {
      const v = line.trim();
      if (!v) return;
      (buckets[key] = buckets[key] || []).push(v);
    };
    for (const raw of String(text || '').replace(/\r\n?/g, '\n').split('\n')) {
      const line = raw.replace(/^\s*[-•*·▪●]\s*/, '').trim();
      if (!line) continue;
      // «Títol: text» o «Títol - text»
      const m = line.match(/^([A-Za-zÀ-ÿ·'’.\s]{2,45}?)\s*[:：]\s*(.*)$/) || line.match(/^([A-Za-zÀ-ÿ·'’.\s]{2,45}?)\s+[–-]\s+(.*)$/);
      const key = m ? sectionOf(m[1]) : null;
      if (key === 'skip') continue;
      if (key) {
        current = key;
        // Dins dels antecedents es manté el subtítol: «Al·lèrgies: no conegudes».
        const main = /^(antecedent|historial|historia clinica|anamnes|ap$)/.test(U.norm(m[1]).trim());
        push(key, key === 'history' && !main && m[2] ? `${m[1].trim()}: ${m[2]}` : m[2]);
        continue;
      }
      // Títol sol en una línia (sovint en majúscules)
      const alone = sectionOf(line);
      if (alone && line.length <= 45) { current = alone === 'skip' ? current : alone; continue; }
      // Abans del primer apartat, els títols en majúscules («INFORME MÈDIC») no són contingut.
      if (!current && line.length <= 60 && line === line.toUpperCase() && /[A-ZÀ-Ý]/.test(line)) continue;
      push(current || 'history', line);
    }
    const join = (k) => (buckets[k] || []).join('\n');
    const out = {};
    if (buckets.goal) out.goal = join('goal');
    if (buckets.reason) out.reason = join('reason');
    const hist = [buckets.diagnosis && `Diagnòstic: ${join('diagnosis')}`, buckets.history && join('history')].filter(Boolean);
    if (hist.length) out.history = hist.join('\n');
    for (const [k, date, note] of [['surgery', 'surgeryDate', 'surgeryNote'], ['injury', 'injuryDate', 'injuryNote']]) {
      if (!buckets[k]) continue;
      const t = join(k);
      const d = findDate(t);
      if (d) out[date] = d;
      const rest = withoutDate(t.split('\n').join(' · '));
      if (rest) out[note] = rest;
    }
    if (buckets.notes) out.notes = `Recomanacions de la doctora: ${join('notes')}`;
    return out;
  }

  // Text d'un fitxer .docx (Word): es descomprimeix word/document.xml amb l'API del navegador.
  async function docxText(buffer) {
    const b = new DataView(buffer);
    let eocd = -1;
    for (let i = buffer.byteLength - 22; i >= Math.max(0, buffer.byteLength - 66000); i--) {
      if (b.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
    }
    if (eocd < 0) throw new Error('El fitxer no és un document de Word (.docx).');
    const count = b.getUint16(eocd + 10, true);
    let p = b.getUint32(eocd + 16, true);
    const dec = new TextDecoder();
    for (let n = 0; n < count; n++) {
      const method = b.getUint16(p + 10, true);
      const size = b.getUint32(p + 20, true);
      const nameLen = b.getUint16(p + 28, true), extraLen = b.getUint16(p + 30, true), commentLen = b.getUint16(p + 32, true);
      const local = b.getUint32(p + 42, true);
      const name = dec.decode(new Uint8Array(buffer, p + 46, nameLen));
      p += 46 + nameLen + extraLen + commentLen;
      if (name !== 'word/document.xml') continue;
      const start = local + 30 + b.getUint16(local + 26, true) + b.getUint16(local + 28, true);
      const data = new Uint8Array(buffer, start, size);
      let xml;
      if (method === 0) xml = dec.decode(data);
      else if (method === 8 && typeof DecompressionStream !== 'undefined') {
        const stream = new Blob([data]).stream().pipeThrough(new DecompressionStream('deflate-raw'));
        xml = await new Response(stream).text();
      } else throw new Error('Aquest navegador no pot llegir el fitxer de Word. Copia\'n el text i enganxa\'l.');
      return xml
        .replace(/<w:tab\/>/g, '\t').replace(/<w:br\/>/g, '\n').replace(/<\/w:p>/g, '\n')
        .replace(/<[^>]+>/g, '')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
        .replace(/\n{3,}/g, '\n\n').trim();
    }
    throw new Error('No s\'ha trobat el text dins del document de Word.');
  }

  return { parse, docxText, findDate, LABELS };
})();
