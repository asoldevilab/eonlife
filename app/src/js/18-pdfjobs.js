/* EON Life · els informes en PDF d'un pacient: quins n'hi ha d'haver, amb quin nom, i com es fan sense cap pantalla.
   (18-pdfsync.js els fa i els deixa a la carpeta del pacient.)
   Dins la carpeta del pacient hi ha «Informes», amb tres subcarpetes:
     Valoracions/  un PDF per valoració amb dades (l'informe complet, en el disseny que té el pacient: clar o fosc)
                   informevaloracioinicial_lauravidalserra_20260702_01.pdf
     Tests/        un sol PDF «viu» per pacient amb l'evolució dels tests, que es refà quan hi ha resultats nous
                   informetests_lauravidalserra_01.pdf
     Sessions/     un PDF per sessió feta (la fitxa) i un PDF «viu» amb l'evolució de les sessions
                   sessio12_lauravidalserra_20261002_01.pdf · informeevoluciosessions_lauravidalserra_01.pdf
   El nom és sempre el mateix per al mateix informe: en canviar-lo es substitueix el PDF, no se'n fan còpies. */

const PDF_FORMAT = 1; // forma dels PDF: si canvia, el pròxim cop que es toqui un pacient es refan tots els seus PDF

const PdfSet = (() => {
  // Resum estable d'unes dades: el mateix contingut dona el mateix resum, sigui quin sigui l'ordre de les claus.
  function stable(v) {
    if (Array.isArray(v)) return `[${v.map(stable).join(',')}]`;
    if (v && typeof v === 'object') return `{${Object.keys(v).sort().filter((k) => v[k] !== undefined).map((k) => `${JSON.stringify(k)}:${stable(v[k])}`).join(',')}}`;
    return JSON.stringify(v === undefined ? null : v);
  }
  function digest(v) {
    const s = stable(v);
    let h1 = 0x811c9dc5, h2 = 0x9e3779b1 ^ s.length;
    for (let i = 0; i < s.length; i++) {
      const c = s.charCodeAt(i);
      h1 = Math.imul(h1 ^ c, 16777619) >>> 0;
      h2 = (Math.imul(h2 ^ c, 2246822519) + (h2 >>> 15)) >>> 0;
    }
    return `${h1.toString(36)}${h2.toString(36)}`;
  }

  // Els enllaços als fitxers (files) i els identificadors de les fotos (media) no surten a l'informe: no el fan canviar.
  const clean = (r) => { if (!r) return null; const { files, media, ...rest } = r; return rest; };
  const person = (p) => ({ firstName: p.firstName, lastName: p.lastName, birthDate: p.birthDate, sex: p.sex, service: p.service, goal: p.goal,
    professional: p.professional, reportTheme: p.reportTheme === 'dark' ? 'dark' : 'light' });
  const brand = () => ({ c: Store.settings.centerName || '', t: Store.settings.centerTagline || '' });

  const typeLabelOf = (a) => (OPT.assessmentTypes.find((t) => t.v === a.type) || {}).label || 'Valoració';
  const assessName = (a, p) => reportPdfName(a, p, typeLabelOf(a), null);
  const testsName = (p) => `informetests_${Names.client(p)}_01.pdf`;
  const sessionName = (s, p) => `${Names.stem(`Sessió ${s.number}`, p, s.date)}_01.pdf`;
  const evolName = (p) => `informeevoluciosessions_${Names.client(p)}_01.pdf`;

  const hasData = (a) => PROTOCOL.some((s) => areaHasData(a, s.id));
  const isDone = (s) => s.status === 'feta' && Calc.itemCount(s) > 0;

  // Els PDF que ha de tenir un pacient ara: { patient, items: [{ key, kind, folder, name, hash, title, footer, view }], dropped }.
  // dropped: noms dels PDF de valoracions i sessions que s'han esborrat (van a «Arxiu» si són a la carpeta).
  function plan(pid) {
    const p = Store.get('patients', pid);
    if (!p) return null;
    const center = Store.settings.centerName || 'EON Life';
    const base = { p: person(p), b: brand(), f: PDF_FORMAT };
    const items = [];
    const dropped = [];
    const assessments = Store.assessmentsOf(pid);
    assessments.forEach((a, i) => {
      if (!hasData(a)) return;
      const label = typeLabelOf(a);
      items.push({ key: `A:${a.id}`, kind: 'assessment', folder: 'reportAssess', name: assessName(a, p), what: `${label} del ${U.fmtDate(a.date)}`,
        hash: digest({ ...base, a: clean(a), prev: clean(assessments[i - 1]) }),
        title: `${label} · ${U.fullName(p)}`, footer: `${center} · ${label} · ${U.fullName(p)}`,
        view: () => html`<${AssessmentReport} id=${a.id} />` });
    });
    for (const a of Object.values(Store.data.assessments)) if (a.deleted && a.patientId === pid) dropped.push({ folder: 'reportAssess', name: assessName(a, p) });
    // Evolució dels tests: un sol PDF «viu» (tots els tests clau, de la primera valoració a avui).
    if (assessments.length && Evol.tests(assessments, { from: assessments[0].date, to: U.today() }).length) {
      items.push({ key: 'T', kind: 'tests', folder: 'reportTests', name: testsName(p), what: 'Evolució dels tests',
        hash: digest({ ...base, all: assessments.map(clean) }),
        title: `Informe de tests · ${U.fullName(p)}`, footer: `${center} · Informe de tests · ${U.fullName(p)}`,
        view: () => html`<${TestsReport} pid=${pid} />` });
    }
    // Sessions fetes: la fitxa de cada una i, si tenen RPE, dolor o wellness, el PDF d'evolució.
    const sessions = Store.sessionsOf(pid);
    for (const s of sessions) {
      if (!isDone(s)) continue;
      items.push({ key: `S:${s.id}`, kind: 'session', folder: 'reportSessions', name: sessionName(s, p), what: `Sessió ${s.number} del ${U.fmtDate(s.date)}`,
        hash: digest({ ...base, s: clean(s) }),
        title: `Sessió ${s.number} · ${U.fullName(p)}`, footer: `${center} · Sessió ${s.number} · ${U.fullName(p)}`,
        view: () => html`<${SessionSheet} id=${s.id} />` });
    }
    for (const s of Object.values(Store.data.sessions)) if (s.deleted && s.patientId === pid) dropped.push({ folder: 'reportSessions', name: sessionName(s, p) });
    if (sessions.length) {
      const today = U.today();
      const first = sessions[0].date;
      const ev = Evol.sessions(sessions, { from: U.addMonths(today, -3) > first ? U.addMonths(today, -3) : first, to: today });
      if (ev.rows.length) {
        items.push({ key: 'E', kind: 'evolution', folder: 'reportSessions', name: evolName(p), what: 'Evolució de les sessions',
          hash: digest({ ...base, rows: ev.rows }),
          title: `Evolució de les sessions · ${U.fullName(p)}`, footer: `${center} · Evolució de les sessions · ${U.fullName(p)}`,
          view: () => html`<${SessionsReport} pid=${pid} />` });
      }
    }
    return { patient: p, items, dropped };
  }

  // ── Fer un PDF sense pantalla ──
  // L'informe es dibuixa dins d'un contenidor fora de la vista (amb els mateixos components que es veuen a l'app),
  // s'espera que carreguin les fotos i es converteix en PDF (ReportPdf, 17-reportpdf.js).
  const sleep = (ms) => new Promise((ok) => setTimeout(ok, ms));
  const READY_MAX = 40000;

  async function settled(box) {
    const t0 = Date.now();
    let last = -1, still = 0;
    while (Date.now() - t0 < READY_MAX) {
      await sleep(250);
      const busy = Object.keys(PhotoSrc.wait).length > 0 || PhotoCrop.busy() > 0 || [...box.querySelectorAll('img')].some((i) => !i.complete);
      const size = box.innerHTML.length;
      if (!busy && size === last) { if (++still >= 3) return; } else still = 0;
      last = size;
    }
  }

  const can = () => typeof htmlToImage !== 'undefined' && typeof ReportPdf !== 'undefined';

  async function make(item) {
    if (!can()) throw new Error('Aquesta versió no pot fer PDF.');
    const box = document.createElement('div');
    box.className = 'pdf-offscreen';
    box.setAttribute('aria-hidden', 'true');
    box.style.cssText = 'position:fixed;left:-30000px;top:0;width:1000px;pointer-events:none;';
    document.body.appendChild(box);
    try {
      render(item.view(), box);
      await settled(box);
      const el = box.querySelector('article.report, article.sheet');
      if (!el) throw new Error(`No s'ha pogut dibuixar «${item.what}».`);
      return await ReportPdf.render(el, { title: item.title, author: Store.settings.centerName || 'EON Life', footer: item.footer });
    } finally {
      render(null, box);
      box.remove();
    }
  }

  return { plan, make, digest, can, assessName, testsName, sessionName, evolName };
})();
