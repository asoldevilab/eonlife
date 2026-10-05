/* EON Life · catàleg: blocs de sessió, protocol de valoració funcional i opcions.
   El protocol reprodueix el document "Valoració funcional · Human Performance"
   (Mobilitat · Força · Rendiment · Sessió 1 de patrons). Per afegir o treure tests, edita PROTOCOL. */

// Els 6 blocs de cada sessió (l'ordre és l'ordre real de la sessió).
const BLOCKS = [
  { key: 'mob', num: 1, name: 'Mobilitat', desc: 'ROM útil, mobilitat específica i preparació articular.',
    focus: ['Maluc i turmell', 'Columna toràcica', 'Espatlla', 'Global'] },
  { key: 'act', num: 2, name: 'Activació', desc: 'Core, isomètrics, control motor i activació neuromuscular.',
    focus: ['Core', 'Glutis', 'Escàpules', 'Peu i turmell'] },
  { key: 'pot', num: 3, name: 'Potència', desc: 'Salts, llançaments i exercicis a màxima intenció.',
    focus: ['Salts verticals', 'Salts horitzontals', 'Llançaments', 'Pliometria reactiva'] },
  { key: 'for', num: 4, name: 'Força principal', desc: 'Patró principal del dia: dominant de genoll o de maluc, empenta o tracció.',
    focus: ['Dominant de genoll', 'Dominant de maluc', 'Empenta', 'Tracció', 'Cos sencer'] },
  { key: 'acc', num: 5, name: 'Accessoris', desc: 'Treball unilateral, politja cònica, resistència pneumàtica i politges.',
    focus: ['Unilateral', 'Politja cònica', 'Resistència pneumàtica', 'Politges'] },
  { key: 'cal', num: 6, name: 'Tornada a la calma', desc: 'Respiració i activació del sistema parasimpàtic.',
    focus: ['Respiració', 'Parasimpàtic', 'Mobilitat suau'] },
];
const BLOCK_KEYS = BLOCKS.map((b) => b.key);

const OPT = {
  cont: [
    { v: 'CON', label: 'Concèntrica' },
    { v: 'ECC', label: 'Excèntrica' },
    { v: 'ISO', label: 'Isomètrica' },
  ],
  pos: [
    { v: 'Bp', label: 'Bipedestació' },
    { v: 'Ds', label: 'Decúbit supí' },
    { v: 'Dp', label: 'Decúbit pron' },
    { v: 'Dl', label: 'Decúbit lateral' },
    { v: 'Sd', label: 'Sedestació' },
    { v: 'Qd', label: 'Quadrupèdia' },
    { v: 'Ag', label: 'Agenollat' },
    { v: 'Sa', label: 'Semiagenollat' },
  ],
  lat: [
    { v: 'BL', label: 'Bilateral' },
    { v: 'UL', label: 'Unilateral' },
  ],
  gm: ['GMax', 'GMed', 'Quàdriceps', 'Isquiotibials', 'Adductors', 'Abductors', 'Bessons i soli', 'Tibial anterior', 'Flexors de maluc',
    'Pectoral', 'Dorsal', 'Deltoides', 'Bíceps', 'Tríceps', 'Trapezi', 'Escàpula', 'Manegot rotador', 'Avantbraç',
    'Core', 'Oblics', 'Lumbar', 'Tren inferior', 'Tren superior', 'Global'],
  // Petit material i material general (a més del material del centre, que es configura a Configuració).
  material: ['Pes corporal', 'Banc', 'Caixa', 'Pica', 'Paret', 'Terra', 'Fitball', 'Med ball', 'Foam roller', 'TRX', 'Landmine',
    'Barra hexagonal', 'Cons', 'Tanques', 'Coixí d\'equilibri', 'Roda abdominal', 'Cinturó de llast', 'Pilota', 'Encoder', 'Assault bike'],
  intensity: ['RIR 3', 'RIR 2', 'RIR 1', 'RPE 6', 'RPE 7', 'RPE 8', 'RPE 9', 'CE 4(8)', 'CE 6(12)', 'CE 8(12)', 'PV 10 %', 'PV 20 %', 'PV 30 %',
    'V ≥ 1,0 m/s', 'V 0,75 m/s', 'V 0,5 m/s', 'Màxima intenció', 'Controlat', 'Suau'],
  // Nivell de progressió d'un exercici dins de la seva família (de més fàcil a més difícil).
  levels: [
    { v: '1', label: 'Nivell 1 · Inicial' },
    { v: '2', label: 'Nivell 2 · Bàsic' },
    { v: '3', label: 'Nivell 3 · Intermedi' },
    { v: '4', label: 'Nivell 4 · Avançat' },
    { v: '5', label: 'Nivell 5 · Expert' },
  ],
  pillars: ['Força i potència', 'Mobilitat', 'Control i agilitat', 'Capacitat cardiovascular', 'Força i autonomia', 'Equilibri i control'],
  // Servei que fa el client al centre.
  services: [
    { v: 'valoracio', label: 'Valoració inicial', desc: 'Només la valoració funcional i l\'informe' },
    { v: 'membership', label: 'Seguiment membership', desc: 'Entrenament i seguiment continuat al centre' },
  ],
  status: [
    { v: 'actiu', label: 'Actiu' },
    { v: 'pausa', label: 'En pausa' },
    { v: 'alta', label: 'Alta' },
  ],
  dominance: [
    { v: 'D', label: 'Dreta' },
    { v: 'E', label: 'Esquerra' },
    { v: 'A', label: 'Ambidextre' },
  ],
  activityLevels: [
    { v: 'sedentari', label: 'Sedentari' },
    { v: 'actiu', label: 'Actiu (1–2 dies/setmana)' },
    { v: 'molt', label: 'Molt actiu (3 o més dies)' },
    { v: 'amateur', label: 'Esportista amateur / competició' },
    { v: 'pro', label: 'Esportista professional' },
  ],
  sex: [
    { v: 'D', label: 'Dona' },
    { v: 'H', label: 'Home' },
    { v: 'X', label: 'Altre / no ho indica' },
  ],
  assessmentTypes: [
    { v: 'inicial', label: 'Valoració inicial', short: 'Inicial' },
    { v: 'retest', label: 'Re-test', short: 'Re-test' },
    { v: 'control', label: 'Control de mesures', short: 'Control' },
    { v: 'alta', label: 'Valoració d\'alta', short: 'Alta' },
  ],
  sessionStatus: [
    { v: 'planificada', label: 'Planificada' },
    { v: 'feta', label: 'Feta' },
  ],
  jumpTypes: ['CMJ', 'SJ', 'CMJ lliure', 'DJ', 'RSI 10-5', 'Salt horitzontal', 'CMJ unipodal D', 'CMJ unipodal E', 'Perfil F-V'],
  readiness: [
    { v: 'verd', label: 'Verd' },
    { v: 'groc', label: 'Groc' },
    { v: 'vermell', label: 'Vermell' },
  ],
};

// Llindars de referència (els de la documentació EON quan n'hi ha).
const THRESHOLDS = {
  asymWarn: 10,     // % d'asimetria: cal vigilar
  asymAlert: 15,    // % d'asimetria: punt d'atenció
  wbltMin: 8,       // cm · knee-to-wall < 8 cm = patològic (document EON)
  wbltDiff: 4,      // cm · diferència entre turmells ≥ 4 cm (document EON)
  ybtAntDiff: 4,    // cm · diferència anterior al Y-Balance (Plisky et al., 2006)
  retestMonths: 3,  // valoracions cada 3 mesos
};

// Escala de puntuació dels patrons (document "Sistema de puntuació").
const SCORES = [
  { v: '0', sym: '0', label: 'Competent', tone: 'ok',
    desc: 'No hi ha una limitació rellevant per progressar l\'exercici.',
    decision: 'Progressem l\'exercici i la càrrega.' },
  { v: '-', sym: '−', label: 'A millorar', tone: 'warn',
    desc: 'Compensació lleu o inconsistent, però pot executar el patró.',
    decision: 'Carreguem amb ajustos o una variant propera.' },
  { v: '--', sym: '−−', label: 'Limitació clara', tone: 'bad',
    desc: 'La compensació és repetida i condiciona la variant o la càrrega que prescriurem.',
    decision: 'Variant adaptada i treball específic abans de carregar.' },
];
const SCORE_RANK = { '0': 0, '-': 1, '--': 2 };
const PAIN_INFO = { sym: 'P', label: 'Dolor o símptomes',
  desc: 'Ho anotem separadament: no és simplement "pitjor tècnica". S\'atura el test i es deriva al fisio.' };

// Sessió 1 · Patrons bàsics de moviment (Movement Assessment).
const PATTERNS = [
  { id: 'squat', name: 'Squat', short: 'Squat', uni: false,
    observe: ['Talons a terra durant tot el recorregut.', 'Genolls alineats amb la punta dels peus, sense valg.',
      'Columna neutra, sense retroversió pèlvica al final (butt wink).', 'Tronc i tíbia aproximadament paral·lels.',
      'Profunditat mínima: cuixa paral·lela a terra, amb pes simètric.'],
    minor: 'Valg lleu, desplaçament lateral o profunditat limitada en alguna repetició.',
    major: 'Aixeca els talons, valg marcat o flexió lumbar clara en totes les repeticions.',
    exec: 'Pes corporal, goblet o barra lleugera · 5 reps · peus a l\'amplada d\'espatlles',
    adapt: 'Squat a caixa o cadira.',
    chips: ['Talons aixecats', 'Valg de genoll', 'Butt wink', 'Tronc inclinat', 'Desplaçament lateral', 'Profunditat limitada'] },
  { id: 'lunge', name: 'Lunge', short: 'Lunge', uni: true,
    observe: ['Genoll davanter alineat amb el peu.', 'Pelvis horitzontal i sense rotació.', 'Tronc vertical i estable.',
      'El genoll del darrere baixa amb control fins a prop del terra.', 'Manté l\'equilibri sense passos de correcció.'],
    minor: 'Oscil·lació lleu, petit valg o inclinació del tronc de manera inconsistent.',
    major: 'Perd l\'equilibri, valg marcat o caiguda de la pelvis de manera repetida.',
    exec: 'Gambada enrere o split squat · 3–5 reps per cama · pes corporal',
    adapt: 'Split squat estàtic amb suport.',
    chips: ['Valg de genoll', 'Caiguda de pelvis', 'Rotació de pelvis', 'Inclinació de tronc', 'Pèrdua d\'equilibri'] },
  { id: 'deadlift', name: 'Pes mort', short: 'Pes mort', uni: false,
    observe: ['Frontissa de maluc: els malucs van enrere (no és un squat).', 'Columna neutra de principi a final.',
      'Càrrega a prop del cos, sobre el mig del peu.', 'Malucs i espatlles pugen alhora.',
      'Bloqueig final amb glutis, sense hiperextensió lumbar.'],
    minor: 'Lleu arrodoniment toràcic o càrrega que s\'allunya del cos en alguna repetició.',
    major: 'Flexió lumbar clara, malucs que pugen abans que les espatlles o no fa la frontissa, de manera repetida.',
    exec: 'Barra, kettlebell o trap bar lleugera · 5 reps',
    adapt: 'Des d\'una caixa elevada.',
    chips: ['Flexió lumbar', 'Arrodoniment toràcic', 'Càrrega lluny del cos', 'Malucs pugen abans', 'Hiperextensió final', 'No fa frontissa'] },
  { id: 'rdl', name: 'Romanian Deadlift (RDL)', short: 'RDL', uni: false,
    observe: ['Genolls lleugerament flexionats i fixos durant tot el moviment.', 'Tíbia vertical: el moviment és de maluc, no de genoll.',
      'Columna neutra fins al final del recorregut.', 'Acaba quan tiben els isquiotibials, no quan es flexiona l\'esquena.',
      'Pes al mig del peu, sense caure endavant.'],
    minor: 'Flexiona massa els genolls o perd una mica la neutralitat al final, però completa el patró.',
    major: 'Baixa flexionant l\'esquena en lloc del maluc o perd l\'equilibri de manera repetida.',
    exec: 'Barra lleugera o kettlebells · 5 reps',
    adapt: 'Amb pal i menys recorregut.',
    chips: ['Massa flexió de genoll', 'Pèrdua de neutralitat', 'Flexió lumbar', 'Pes endavant'] },
  { id: 'hipthrust', name: 'Hip Thrust', short: 'Hip thrust', uni: false,
    observe: ['Escàpules recolzades al banc i mentó recollit.', 'A dalt: tíbia vertical i extensió completa de maluc.',
      'Costelles avall: l\'extensió és de maluc, no de la zona lumbar.', 'Genolls alineats amb els peus i pelvis nivellada.',
      'Pujada simètrica, sense rotació.'],
    minor: 'Extensió de maluc incompleta o lleu hiperextensió lumbar en alguna repetició.',
    major: 'Arqueja la zona lumbar per pujar, els genolls cauen cap endins o hi ha rotació clara, de manera repetida.',
    exec: 'Pes corporal o barra lleugera · 5 reps · escàpules al banc',
    adapt: 'Pont de glutis a terra.',
    chips: ['Extensió incompleta', 'Hiperextensió lumbar', 'Genolls cap endins', 'Rotació de pelvis'] },
  { id: 'laterallunge', name: 'Lateral Lunge', short: 'Lat. lunge', uni: true,
    observe: ['Frontissa de maluc a la cama que treballa.', 'Genoll alineat amb el peu i taló a terra.',
      'Cama contrària estesa, amb el peu recolzat.', 'Tronc neutre, sense rotació.', 'Tornada al centre controlada.'],
    minor: 'Recorregut limitat per mobilitat d\'adductors o valg lleu, però completa el patró.',
    major: 'Aixeca el taló, el genoll cau cap endins o no pot tornar al centre, de manera repetida.',
    exec: 'Pes corporal, mans a la cintura · 3–5 reps per costat',
    adapt: 'Amb suport (TRX) i menys amplada.',
    chips: ['Recorregut limitat', 'Valg de genoll', 'Taló aixecat', 'Rotació de tronc', 'No torna al centre'] },
  { id: 'copenhagen', name: 'Copenhagen Plank', short: 'Copenhagen', uni: true, seconds: true,
    observe: ['Colze sota l\'espatlla i cos alineat cap–maluc–peus.', 'Maluc amunt, sense caure ni rotar.',
      'Cama de sota separada del terra.', 'Sense dolor a l\'engonal i amb respiració controlada.',
      'Anotem els segons amb bona alineació (fins a 30 s) i comparem costats.'],
    minor: 'Perd l\'alineació abans del final o hi ha una diferència clara entre costats.',
    major: 'No pot adoptar la posició o no la manté uns segons. Dolor a l\'engonal: s\'atura i s\'anota P.',
    exec: 'Palanca curta (genoll al banc) o llarga (turmell al banc) · per costat',
    adapt: 'Peu de sota recolzat a terra.',
    note: 'Criteri pràctic: no hi ha punts de tall validats per a aquest test.',
    chips: ['Maluc cau', 'Rotació', 'Dolor a l\'engonal', 'Palanca curta', 'Palanca llarga'] },
];

// Com gravem i puntuem els patrons.
const RECORDING_RULES = [
  { t: 'Dues vistes', d: 'Frontal i lateral. Amb un sol mòbil, fem dues passades.' },
  { t: 'Enquadrament', d: 'Mòbil horitzontal, a l\'alçada del maluc i a 2–3 m, amb tot el cos a la imatge.' },
  { t: 'Condicions fixes', d: 'Mateix lloc, marques a terra i pantalons curts per veure bé els genolls.' },
  { t: 'Instrucció estandarditzada', d: 'La mateixa explicació i una demostració per a tothom, sense explicar què avaluem.' },
  { t: 'Cap consigna ni correcció', d: 'A la primera visita no corregim ni donem pistes: volem el seu patró espontani.' },
  { t: 'Puntuar en diferit', d: 'Sobre el vídeo a càmera lenta i, si es pot, sempre el mateix avaluador.' },
];

// Protocol de valoració funcional. Tipus de test:
//   bi (dreta/esquerra numèric) · single (un valor) · biSelect · select · scoreBi (0/−/−− per costat)
//   grups especials: ybt · jumps · encoder · bike · patterns · free
const PROTOCOL = [
  {
    id: 'mobilitat', title: 'Mobilitat i anàlisi postural', short: 'Mobilitat',
    groups: [
      { id: 'rom', title: 'Mobilitat amb goniometria digital', device: 'Kinvent · K-Move', kind: 'bi', unit: '°', colPrefix: 'ROM',
        info: 'Quantifiquem la mobilitat de maluc, genoll i espatlla per detectar asimetries o dèficits de mobilitat.',
        ref: 'Tak I, et al. Is lower hip range of motion a risk factor for groin pain in athletes? Br J Sports Med. 2017;51(22):1611-1621.',
        tests: [
          { id: 'rom_hip_ir', name: 'Rotació interna de maluc', short: 'RI maluc' },
          { id: 'rom_hip_er', name: 'Rotació externa de maluc', short: 'RE maluc' },
          { id: 'rom_sh_ir', name: 'Rotació interna d\'espatlla', short: 'RI espatlla' },
          { id: 'rom_sh_er', name: 'Rotació externa d\'espatlla', short: 'RE espatlla' },
          { id: 'rom_sh_flex', name: 'Flexió d\'espatlla sobre el cap', short: 'Flexió espatlla', optional: true },
          { id: 'rom_knee_flex', name: 'Flexió de genoll', short: 'Flexió genoll' },
          { id: 'rom_knee_ext', name: 'Extensió de genoll', short: 'Extensió genoll', diffOnly: true },
        ] },
      { id: 'wblt', title: 'Flexió dorsal de turmell en càrrega', device: 'Knee-to-wall', kind: 'bi', unit: 'cm',
        info: 'En càrrega, flexió de genoll i turmell sense aixecar el taló. Mesurem els cm que el genoll sobrepassa la punta del peu. Una diferència de 4 cm entre turmells o un valor inferior a 8 cm es considera patològic.',
        ref: 'Wahlstedt C, Rasmussen-Barr E. Anterior cruciate ligament injury and ankle dorsiflexion. Knee Surg Sports Traumatol Arthrosc. 2015;23(11):3202-3207.',
        tests: [{ id: 'wblt', name: 'Knee-to-wall', short: 'Knee-to-wall', rule: 'wblt', diffOnly: true }] },
      { id: 'neuro', title: 'Neurodinàmia', kind: 'biSelect', options: ['Negatiu', 'Positiu'],
        tests: [
          { id: 'slump', name: 'Slump test' },
          { id: 'pkb', name: 'Prone knee bending' },
        ] },
      { id: 'postural', title: 'Anàlisi postural',
        ref: 'Magee DJ. Orthopedic Physical Assessment (6a ed.). Saunders/Elsevier; 2014.',
        tests: [
          { id: 'adams', name: 'Test de flexió de tronc (Adams)', kind: 'select', options: ['Negatiu', 'Positiu'],
            info: 'Mobilitat global de la columna, flexibilitat de la cadena posterior i simetria de pelvis i reixa costal (escoliosi).' },
          { id: 'thomas', name: 'Test de Thomas', kind: 'biSelect',
            options: ['Negatiu', 'Positiu · psoes ilíac', 'Positiu · recte anterior', 'Positiu · TFL'],
            info: 'Positiu si la cuixa s\'enlaira de la taula (psoes) o si el genoll s\'estén involuntàriament (recte anterior).' },
          { id: 'windlass', name: 'Test de Windlass (peu)', kind: 'biSelect', options: ['Negatiu', 'Positiu'] },
        ] },
    ],
  },
  {
    id: 'forca', title: 'Força', short: 'Força',
    groups: [
      { id: 'dyn', title: 'Dinamometria manual', device: 'Kinvent · K-Push', kind: 'bi', unit: 'N', perKg: true, colPrefix: 'Força',
        info: 'Força isomètrica de quàdriceps, isquiotibials, adductors i rotadors de maluc. Valorem asimetries i dèficits de força.',
        tests: [
          { id: 'dyn_knee_ext', name: 'Leg extension · quàdriceps', short: 'Quàdriceps' },
          { id: 'dyn_curl_90', name: 'Leg curl 90/90', short: 'Curl 90/90' },
          { id: 'dyn_curl_30', name: 'Leg curl 30/30', short: 'Curl 30/30' },
          { id: 'dyn_squeeze', name: 'Squeeze test · adductors', short: 'Squeeze' },
          { id: 'dyn_hip_ir', name: 'Rotadors interns de maluc', short: 'RI maluc' },
          { id: 'dyn_hip_er', name: 'Rotadors externs de maluc', short: 'RE maluc' },
          { id: 'dyn_sh_er', name: 'Rotadors externs d\'espatlla', short: 'RE espatlla', optional: true },
        ] },
      { id: 'sls', title: 'Single Leg Squat', device: 'Vídeo',
        info: '3 squats unipodals per valorar valg de genoll (rotació interna del peu o poca flexió dorsal) i compensacions de maluc i core.',
        ref: 'Crossley KM, et al. Performance on the single-leg squat task indicates hip abductor muscle function. Am J Sports Med. 2011;39(4):866-873.',
        tests: [{ id: 'sls', name: 'Single leg squat', kind: 'scoreBi',
          chips: ['Valg de genoll', 'Caiguda de pelvis', 'Rotació de tronc', 'Pronació del peu', 'Poca flexió dorsal'] }] },
      { id: 'ybt', title: 'Y-Balance Test', kind: 'ybt', device: 'Vídeo',
        info: 'Estabilitat dinàmica, control neuromuscular i equilibri unipodal: màxima distància amb la cama contrària en direcció anterior, posteromedial i posterolateral.',
        ref: 'Gribble PA, et al. 2012 consensus statement of the International Ankle Consortium. Br J Sports Med. 2012;46(8):545-547.' },
    ],
  },
  {
    id: 'rendiment', title: 'Rendiment', short: 'Rendiment',
    groups: [
      { id: 'jumps', title: 'CMJ', device: 'My Jump Lab', kind: 'jumps',
        info: 'Salt amb contramoviment: potència mecànica, força explosiva i capacitat del cicle d\'estirament-escurçament de l\'extremitat inferior.',
        ref: 'Pérez-Castiglioni C, Buscà B, Aguilera-Castells J. J Strength Cond Res. 2022;36(12):3530-3542.' },
      { id: 'encoder', title: 'Encoder', device: 'Velocitat d\'execució', kind: 'encoder' },
      { id: 'bike', title: 'Assault bike · 30 s all-out', device: 'Fase 2', kind: 'bike',
        info: 'Adaptació del Wingate a bicicleta d\'aire: 30 s al màxim esforç. No el fem el primer dia. Només en clients entrenats, amb el cribratge de salut superat i sense contraindicacions. En adults grans o amb patologia, no el fem.',
        ref: 'Bar-Or O. The Wingate anaerobic test: an update on methodology, reliability and validity. Sports Med. 1987;4(6):381-394.' },
    ],
  },
  {
    id: 'patrons', title: 'Sessió 1 · Patrons bàsics de moviment', short: 'Patrons',
    groups: [{ id: 'patterns', kind: 'patterns',
      ref: 'McKeown I, et al. Int J Sports Phys Ther. 2014;9(7):862-873 · Bennett H, et al. Int J Sports Phys Ther. 2019;14(3):424-435.' }],
  },
  {
    id: 'altres', title: 'Altres mesures', short: 'Altres',
    groups: [{ id: 'free', kind: 'free' }],
  },
];

// Índex de tots els tests simples (per id) amb la seva unitat i grup.
const TEST_INDEX = (() => {
  const idx = {};
  for (const sec of PROTOCOL) {
    for (const g of sec.groups) {
      for (const t of g.tests || []) {
        const base = t.short || t.name;
        // "Força" + "Quàdriceps" → "Força quàdriceps" (les sigles com "RI" es mantenen).
        const tail = g.colPrefix && /^.\p{Ll}/u.test(base) ? base.charAt(0).toLowerCase() + base.slice(1) : base;
        const col = t.col || `${g.colPrefix ? g.colPrefix + ' ' : ''}${tail}`;
        idx[t.id] = { ...t, col, kind: t.kind || g.kind, unit: t.unit || g.unit || '', options: t.options || g.options, perKg: !!g.perKg, group: g.id, section: sec.id, groupTitle: g.title };
      }
    }
  }
  return idx;
})();

// Configuració per defecte (editable a Configuració).
// Equip del centre (es pot canviar a Configuració).
const CENTER_PROFESSIONALS = ['Richy', 'Arnau', 'Oriol Pastor (fisioteràpia)'];

// Material del centre (es pot canviar a Configuració).
const CENTER_MATERIALS = [
  'Barra olímpica (20-25 kg)', 'Politja cònica isoinercial', 'Keiser (pneumàtica)', 'Mancuernes Technogym', 'Kettlebell',
  'Pliometria', 'Skillmill', 'AlterG', 'Leg extension Technogym', 'Premsa Technogym', 'Lower back bench', 'Banc GHD',
  'Politja Technogym', 'Leg press Biostrength', 'Abductor/adductor 700 Technogym', 'Pulley Pro C2 Smart', 'kBox Lite Exxentric',
  'Mobility ball Technogym', 'Goma elàstica', 'Lliscadors Flowin', 'Bike Technogym', 'Skill Up', 'Loop band Technogym', 'Power Personal Technogym',
];

// Grups musculars en carpetes: tren superior, tren inferior, core i cos sencer.
const MUSCLE_ZONES = [
  { key: 'sup', label: 'Tren superior', muscles: ['Pectoral', 'Dorsal', 'Deltoides', 'Bíceps', 'Tríceps', 'Trapezi', 'Escàpula', 'Manegot rotador', 'Avantbraç', 'Tren superior'] },
  { key: 'inf', label: 'Tren inferior', muscles: ['Quàdriceps', 'Isquiotibials', 'GMax', 'GMed', 'Adductors', 'Abductors', 'Bessons i soli', 'Tibial anterior', 'Flexors de maluc', 'Tren inferior'] },
  { key: 'core', label: 'Core', muscles: ['Core', 'Oblics', 'Lumbar'] },
  { key: 'tot', label: 'Cos sencer i altres', muscles: ['Global'] },
];
const MUSCLE_LABELS = { GMax: 'Gluti major (GMax)', GMed: 'Gluti mitjà (GMed)', 'Tren superior': 'Tren superior (global)', 'Tren inferior': 'Tren inferior (global)' };
const muscleLabel = (m) => MUSCLE_LABELS[m] || m;
// Zona d'un múscul (sup, inf, core o tot).
function muscleZone(m) {
  const z = MUSCLE_ZONES.find((x) => x.muscles.includes(m));
  return z ? z.key : 'tot';
}

function defaultSettings() {
  return {
    id: 'settings',
    centerName: 'EON Life',
    centerTagline: 'Human Performance',
    professionals: [...CENTER_PROFESSIONALS],
    materials: [...CENTER_MATERIALS],
    blocks: BLOCKS.map((b) => ({ key: b.key, name: b.name, desc: b.desc })),
  };
}
