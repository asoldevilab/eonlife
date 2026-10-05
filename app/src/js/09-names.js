/* EON Life · carpetes i noms dels fitxers de cada client.
   Carpeta del client: «Cognoms, Nom · P-xxxx», amb dues branques:
     Valoracions/                         valoració inicial, re-tests, PDF de Kinvent, informe mèdic i fotos
       Vídeos valoracions/                vídeos dels tests i dels patrons de moviment
     Sessions/                            un Excel per sessió i l'Excel gegant de visió general
       Vídeos sessions d'entrenament/     vídeos dels exercicis de les sessions
   Noms: tot en minúscules, sense accents ni espais, amb la data com a AAAAMMDD i un número de sèrie (_01, _02…):
     valoracioinicial_lauravidalserra_20260702_01.xlsx · sessio_lauravidalserra_20261002_01.xlsx
     singlelegsquatdreta_lauravidalserra_20260702_01.mp4 · hipthrust_lauravidalserra_20261002_01.mp4 */

const EXPORT_FOLDERS = {
  assess: ['Valoracions'],
  assessVideos: ['Valoracions', 'Vídeos valoracions'],
  sessions: ['Sessions'],
  sessionVideos: ['Sessions', 'Vídeos sessions d\'entrenament'],
};

const Names = (() => {
  // Paraules petites que no cal posar al nom d'un exercici o d'un test («Test de flexió de tronc» → testflexiotronc).
  const STOP = new Set(['de', 'del', 'd', 'la', 'el', 'l', 'les', 'els', 'en', 'amb', 'i', 'a', 'al', 'per', 'un', 'una']);

  const plain = (s) => String(s || '')
    .replace(/l[·.]l/gi, 'll')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .replace(/ß/g, 'ss').replace(/æ/gi, 'ae').replace(/œ/gi, 'oe').replace(/ø/gi, 'o')
    .toLowerCase();

  // «Laura Vidal-Serra» → lauravidalserra (cap paraula s'omet)
  function slug(s, max = 48) {
    return plain(s).replace(/[^a-z0-9]+/g, '').slice(0, max);
  }

  // Nom d'un exercici o d'un test: sense paraules petites («Elevació de malucs amb barra» → elevaciomalucsbarra).
  function label(s, max = 40) {
    const words = plain(s).split(/[^a-z0-9]+/).filter(Boolean);
    const kept = words.filter((w) => !STOP.has(w));
    return (kept.length ? kept : words).join('').slice(0, max) || 'fitxer';
  }

  // Nom i cognoms enganxats, tal com els vol el centre: lauravidalserra.
  function client(p) {
    return slug(`${(p && p.firstName) || ''}${(p && p.lastName) || ''}`) || 'client';
  }

  // AAAA-MM-DD → AAAAMMDD
  function stamp(iso) {
    const m = String(iso || '').match(/^(\d{4})-(\d{2})-(\d{2})/);
    return m ? `${m[1]}${m[2]}${m[3]}` : 'sensedata';
  }

  const serial = (n) => String(Math.max(1, n)).padStart(2, '0');
  const escRe = (s) => String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

  // Tronc d'un nom (sense número de sèrie ni extensió): etiqueta_client_data
  function stem(what, p, date) {
    return `${label(what)}_${client(p)}_${stamp(date)}`;
  }

  // Següent número de sèrie lliure d'un tronc entre els noms que ja hi ha a la carpeta.
  function nextSerial(existing, st, ext) {
    const re = new RegExp(`^${escRe(st)}_(\\d{2,})${escRe(ext)}$`, 'i');
    let max = 0;
    for (const n of existing || []) { const m = String(n).match(re); if (m) max = Math.max(max, Number(m[1])); }
    return max + 1;
  }

  // Nom complet d'un fitxer pujat: etiqueta_client_data_NN.ext
  function file(what, p, date, ext, existing) {
    const st = stem(what, p, date);
    return `${st}_${serial(nextSerial(existing, st, ext))}${ext}`;
  }

  // ── Excel generats ──
  const ASSESS_KIND = { inicial: 'valoracioinicial', retest: 'retest', control: 'controlmesures', alta: 'valoracioalta' };
  const sessionFile = (p, date, n) => `sessio_${client(p)}_${stamp(date)}_${serial(n)}.xlsx`;
  const assessmentFile = (p, type, date, n) => `${ASSESS_KIND[type] || 'valoracio'}_${client(p)}_${stamp(date)}_${serial(n)}.xlsx`;
  const overviewFile = (p) => `visiogeneral_${client(p)}_01.xlsx`;
  // Els Excel que fa l'app tenen aquests noms; qualsevol altre fitxer de la carpeta no es toca mai.
  const OWN = {
    sessions: /^(sessio_[a-z0-9]+_\d{8}_\d{2}|visiogeneral_[a-z0-9]+_\d{2})\.xlsx$/,
    assess: /^(valoracioinicial|retest|controlmesures|valoracioalta|valoracio)_[a-z0-9]+_\d{8}_\d{2}\.xlsx$/,
  };

  // Etiqueta d'un fitxer segons l'extensió i el tipus (per classificar-lo a Valoracions o a Sessions).
  const ext = (name) => ((String(name || '').match(/\.[a-z0-9]{2,5}$/i) || [''])[0]).toLowerCase();

  return { slug, label, client, stamp, serial, stem, nextSerial, file, sessionFile, assessmentFile, overviewFile, OWN, ASSESS_KIND, ext };
})();
