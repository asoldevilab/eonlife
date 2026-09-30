/* EON Life · biblioteca d'exercicis i plantilles inicials.
   Inclou els exercicis de les plantilles EON (Hip Thrust, RDL, Split Squat, Sumo Squat, HE, Dead Bug,
   Bike + Foam…) i una base per a cada bloc. Tot es pot editar o ampliar des de "Biblioteca". */

const SEED_EXERCISES = (() => {
  const list = [];
  // ex(id, bloc, nom, categoria, material, dades addicionals)
  const ex = (id, block, name, cat, material, extra = {}) => list.push({
    id, block, name, cat, material, gm: '', cont: '', pos: '', lat: 'BL', sets: '', reps: '', load: '',
    intensity: '', rest: '', tempo: '', cues: '', video: '', seed: true, ...extra,
  });

  // 1 · Mobilitat
  ex('X-MOB-01', 'mob', 'Knee-to-wall · mobilitat de turmell', 'Turmell', 'Paret', { pos: 'Sa', lat: 'UL', sets: '2', reps: '10/costat', cues: 'El genoll avança sense aixecar el taló.' });
  ex('X-MOB-02', 'mob', '90/90 · rotació de maluc', 'Maluc', 'Terra', { pos: 'Sd', sets: '2', reps: '6/costat', cues: 'Controla la pelvis i la respiració.' });
  ex('X-MOB-03', 'mob', 'World\'s greatest stretch', 'Global', 'Terra', { pos: 'Bp', lat: 'UL', sets: '1', reps: '5/costat' });
  ex('X-MOB-04', 'mob', 'Cat-camel', 'Columna', 'Terra', { pos: 'Qd', sets: '1', reps: '8', cues: 'Moviment segment a segment.' });
  ex('X-MOB-05', 'mob', 'Open book toràcic', 'Columna toràcica', 'Terra', { pos: 'Dl', lat: 'UL', sets: '2', reps: '6/costat' });
  ex('X-MOB-06', 'mob', 'Rotació toràcica en quadrupèdia', 'Columna toràcica', 'Terra', { pos: 'Qd', lat: 'UL', sets: '2', reps: '8/costat' });
  ex('X-MOB-07', 'mob', 'Rockback en quadrupèdia', 'Maluc', 'Terra', { pos: 'Qd', sets: '2', reps: '10' });
  ex('X-MOB-08', 'mob', 'Estirament de flexors de maluc', 'Maluc', 'Terra', { pos: 'Sa', lat: 'UL', sets: '2', reps: '30 s/costat', cues: 'Retroversió pèlvica i glutis actius.' });
  ex('X-MOB-09', 'mob', 'Wall slides', 'Espatlla', 'Paret', { pos: 'Bp', sets: '2', reps: '10' });
  ex('X-MOB-10', 'mob', 'Pas d\'espatlles amb pica', 'Espatlla', 'Pica', { pos: 'Bp', sets: '2', reps: '10' });
  ex('X-MOB-11', 'mob', 'Cossack squat', 'Maluc', 'Pes corporal', { pos: 'Bp', lat: 'UL', sets: '2', reps: '5/costat' });
  ex('X-MOB-12', 'mob', 'Mobilitat de turmell amb goma', 'Turmell', 'Goma elàstica', { pos: 'Sa', lat: 'UL', sets: '2', reps: '10/costat' });
  ex('X-MOB-13', 'mob', 'Foam roller', 'Alliberament miofascial', 'Foam roller', { sets: '1', reps: '5\'' });
  ex('X-MOB-14', 'mob', 'Bike suau', 'Escalfament', 'Bike', { pos: 'Sd', sets: '1', reps: '10\'', intensity: 'Suau' });

  // 2 · Activació
  ex('X-ACT-01', 'act', 'Dead bug', 'Core · antiextensió', 'Fitball', { pos: 'Ds', gm: 'Core', sets: '2', reps: '8', cues: 'Costelles avall; pelvis neutra.' });
  ex('X-ACT-02', 'act', 'Pallof press isomètric', 'Core · antirotació', 'Politja', { pos: 'Bp', gm: 'Core', cont: 'ISO', lat: 'UL', sets: '2', reps: '20 s/costat', cues: 'Mantén l\'alineació.' });
  ex('X-ACT-03', 'act', 'Bird dog', 'Core', 'Terra', { pos: 'Qd', gm: 'Core', lat: 'UL', sets: '2', reps: '6/costat' });
  ex('X-ACT-04', 'act', 'Pont de glutis', 'Glutis', 'Terra', { pos: 'Ds', gm: 'GMax', cont: 'CON', sets: '2', reps: '10' });
  ex('X-ACT-05', 'act', 'Monster walk amb goma', 'Glutis', 'Goma elàstica', { pos: 'Bp', gm: 'GMed', sets: '2', reps: '10 passes' });
  ex('X-ACT-06', 'act', 'Clamshell', 'Glutis', 'Goma elàstica', { pos: 'Dl', gm: 'GMed', lat: 'UL', sets: '2', reps: '12/costat' });
  ex('X-ACT-07', 'act', 'Copenhagen curt', 'Adductors', 'Banc', { pos: 'Dl', gm: 'Adductors', cont: 'ISO', lat: 'UL', sets: '2', reps: '20 s/costat' });
  ex('X-ACT-08', 'act', 'Planxa frontal', 'Core', 'Terra', { pos: 'Dp', gm: 'Core', cont: 'ISO', sets: '2', reps: '30 s' });
  ex('X-ACT-09', 'act', 'Planxa lateral', 'Core', 'Terra', { pos: 'Dl', gm: 'Core', cont: 'ISO', lat: 'UL', sets: '2', reps: '20 s/costat' });
  ex('X-ACT-10', 'act', 'Push-up escapular', 'Escàpules', 'Pes corporal', { pos: 'Dp', gm: 'Escàpula', sets: '2', reps: '10' });
  ex('X-ACT-11', 'act', 'Rotació externa d\'espatlla amb goma', 'Espatlla', 'Goma elàstica', { pos: 'Bp', gm: 'Manegot rotador', lat: 'UL', sets: '2', reps: '12/costat' });
  ex('X-ACT-12', 'act', 'Spanish squat isomètric', 'Quàdriceps', 'Goma elàstica', { pos: 'Bp', gm: 'Quàdriceps', cont: 'ISO', sets: '3', reps: '30 s' });
  ex('X-ACT-13', 'act', 'McGill curl-up', 'Core', 'Terra', { pos: 'Ds', gm: 'Core', cont: 'ISO', sets: '2', reps: '5 × 10 s' });
  ex('X-ACT-14', 'act', 'Short foot', 'Peu i turmell', 'Terra', { pos: 'Sd', sets: '2', reps: '10' });

  // 3 · Potència
  ex('X-POT-01', 'pot', 'CMJ', 'Salt vertical', 'Pes corporal', { pos: 'Bp', sets: '3', reps: '3', intensity: 'Màxima intenció', rest: '90 s', cues: 'Màxima intenció; aterratge estable.' });
  ex('X-POT-02', 'pot', 'Box jump', 'Salt vertical', 'Caixa', { pos: 'Bp', sets: '3', reps: '3', intensity: 'Màxima intenció', rest: '90 s' });
  ex('X-POT-03', 'pot', 'Salt horitzontal', 'Salt horitzontal', 'Pes corporal', { pos: 'Bp', sets: '3', reps: '3', intensity: 'Màxima intenció', rest: '90 s' });
  ex('X-POT-04', 'pot', 'Pogo jumps', 'Pliometria reactiva', 'Pes corporal', { pos: 'Bp', sets: '3', reps: '10', cues: 'Contacte curt i rígid.' });
  ex('X-POT-05', 'pot', 'Drop jump', 'Pliometria reactiva', 'Caixa', { pos: 'Bp', sets: '3', reps: '3', cues: 'Temps de contacte mínim.' });
  ex('X-POT-06', 'pot', 'Med ball scoop throw', 'Llançament rotacional', 'Med ball', { pos: 'Bp', lat: 'UL', sets: '3', reps: '4/costat', intensity: 'Màxima intenció', cues: 'Màxima velocitat.' });
  ex('X-POT-07', 'pot', 'Med ball slam', 'Llançament', 'Med ball', { pos: 'Bp', sets: '3', reps: '5', intensity: 'Màxima intenció' });
  ex('X-POT-08', 'pot', 'Med ball chest pass', 'Llançament', 'Med ball', { pos: 'Bp', sets: '3', reps: '5', intensity: 'Màxima intenció' });
  ex('X-POT-09', 'pot', 'Kettlebell swing', 'Balístic', 'KB', { pos: 'Bp', gm: 'GMax', sets: '3', reps: '10' });
  ex('X-POT-10', 'pot', 'Jump squat amb barra hexagonal', 'Salt amb càrrega', 'Barra hexagonal', { pos: 'Bp', sets: '3', reps: '4', intensity: 'Màxima intenció' });
  ex('X-POT-11', 'pot', 'Skater jump', 'Salt lateral', 'Pes corporal', { pos: 'Bp', lat: 'UL', sets: '3', reps: '4/costat' });
  ex('X-POT-12', 'pot', 'Hang power clean', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '3' });

  // 4 · Força principal
  ex('X-FOR-01', 'for', 'Back squat', 'Dominant de genoll', 'Barra', { pos: 'Bp', gm: 'Quàdriceps', cont: 'CON', sets: '3', reps: '6', intensity: 'RIR 2', rest: '2\'' });
  ex('X-FOR-02', 'for', 'Front squat', 'Dominant de genoll', 'Barra', { pos: 'Bp', gm: 'Quàdriceps', sets: '3', reps: '6', intensity: 'RIR 2', rest: '2\'' });
  ex('X-FOR-03', 'for', 'Goblet squat', 'Dominant de genoll', 'KB', { pos: 'Bp', gm: 'Quàdriceps', sets: '3', reps: '8', intensity: 'RIR 2', cues: 'Control excèntric i posició.' });
  ex('X-FOR-04', 'for', 'Split squat búlgar', 'Dominant de genoll', 'Mancuernes', { pos: 'Bp', gm: 'Quàdriceps', lat: 'UL', sets: '3', reps: '8/cama', intensity: 'RIR 2', cues: 'Pelvis estable; el genoll segueix el peu.' });
  ex('X-FOR-05', 'for', 'Sumo squat', 'Dominant de genoll', 'KB', { pos: 'Bp', gm: 'Adductors', cont: 'CON', sets: '3', reps: '10' });
  ex('X-FOR-06', 'for', 'Step-up', 'Dominant de genoll', 'Caixa', { pos: 'Bp', gm: 'Quàdriceps', lat: 'UL', sets: '3', reps: '8/cama', intensity: 'RIR 2' });
  ex('X-FOR-07', 'for', 'Leg press', 'Dominant de genoll', 'Màquina', { pos: 'Sd', gm: 'Quàdriceps', sets: '3', reps: '10', intensity: 'RIR 2' });
  ex('X-FOR-08', 'for', 'Hip thrust', 'Dominant de maluc', 'Barra', { pos: 'Ds', gm: 'GMax', cont: 'CON', sets: '3', reps: '8', intensity: 'RIR 2', cues: 'Costelles avall; extensió de maluc, no lumbar.' });
  ex('X-FOR-09', 'for', 'RDL', 'Dominant de maluc', 'Barra', { pos: 'Bp', gm: 'Isquiotibials', cont: 'ECC', sets: '3', reps: '8', intensity: 'RIR 2', cues: 'Tíbia vertical; el moviment és de maluc.' });
  ex('X-FOR-10', 'for', 'Trap bar deadlift', 'Dominant de maluc', 'Barra hexagonal', { pos: 'Bp', gm: 'GMax', sets: '3', reps: '5', intensity: 'RIR 2', rest: '2\'', cues: 'Empeny el terra; tronc sòlid.' });
  ex('X-FOR-11', 'for', 'Pes mort convencional', 'Dominant de maluc', 'Barra', { pos: 'Bp', gm: 'GMax', sets: '3', reps: '5', intensity: 'RIR 2', rest: '2\'' });
  ex('X-FOR-12', 'for', 'Good morning', 'Dominant de maluc', 'Barra', { pos: 'Bp', gm: 'Isquiotibials', sets: '3', reps: '8', intensity: 'RIR 3' });
  ex('X-FOR-13', 'for', 'Press de banca', 'Empenta', 'Barra', { pos: 'Ds', gm: 'Pectoral', sets: '3', reps: '6', intensity: 'RIR 2', rest: '2\'' });
  ex('X-FOR-14', 'for', 'Press militar amb mancuernes', 'Empenta', 'Mancuernes', { pos: 'Bp', gm: 'Deltoides', sets: '3', reps: '8', intensity: 'RIR 2' });
  ex('X-FOR-15', 'for', 'Landmine press', 'Empenta', 'Landmine', { pos: 'Sa', gm: 'Deltoides', lat: 'UL', sets: '3', reps: '8/costat', intensity: 'RIR 2' });
  ex('X-FOR-16', 'for', 'Flexions', 'Empenta', 'Pes corporal', { pos: 'Dp', gm: 'Pectoral', sets: '3', reps: '10' });
  ex('X-FOR-17', 'for', 'Dominades', 'Tracció', 'Pes corporal', { pos: 'Bp', gm: 'Dorsal', sets: '3', reps: '6', intensity: 'RIR 2' });
  ex('X-FOR-18', 'for', 'Rem amb barra', 'Tracció', 'Barra', { pos: 'Bp', gm: 'Dorsal', sets: '3', reps: '8', intensity: 'RIR 2' });
  ex('X-FOR-19', 'for', 'Rem amb mancuerna', 'Tracció', 'Mancuernes', { pos: 'Bp', gm: 'Dorsal', lat: 'UL', sets: '3', reps: '10/costat', intensity: 'RIR 2' });
  ex('X-FOR-20', 'for', 'Jalón al pit', 'Tracció', 'Politja', { pos: 'Sd', gm: 'Dorsal', sets: '3', reps: '10', intensity: 'RIR 2' });
  ex('X-FOR-21', 'for', 'Rem invertit', 'Tracció', 'TRX', { pos: 'Bp', gm: 'Dorsal', sets: '3', reps: '10' });

  // 5 · Accessoris
  ex('X-ACC-01', 'acc', 'Split squat a la politja cònica', 'Politja cònica', 'Politja cònica', { pos: 'Bp', gm: 'Quàdriceps', cont: 'ECC', lat: 'UL', sets: '3', reps: '8/cama', cues: 'Frena l\'excèntrica.' });
  ex('X-ACC-02', 'acc', 'Rem unilateral a la politja cònica', 'Politja cònica', 'Politja cònica', { pos: 'Bp', gm: 'Dorsal', lat: 'UL', sets: '3', reps: '8/costat' });
  ex('X-ACC-03', 'acc', 'Lateral lunge a la politja cònica', 'Politja cònica', 'Politja cònica', { pos: 'Bp', gm: 'Adductors', cont: 'ECC', lat: 'UL', sets: '3', reps: '6/costat' });
  ex('X-ACC-04', 'acc', 'Leg press unilateral Keiser', 'Resistència pneumàtica', 'Resistència pneumàtica (Keiser)', { pos: 'Sd', gm: 'Quàdriceps', lat: 'UL', sets: '3', reps: '8/cama', intensity: 'Màxima intenció', cues: 'Concèntrica ràpida, excèntrica controlada.' });
  ex('X-ACC-05', 'acc', 'Extensió de genoll Keiser', 'Resistència pneumàtica', 'Resistència pneumàtica (Keiser)', { pos: 'Sd', gm: 'Quàdriceps', sets: '3', reps: '10' });
  ex('X-ACC-06', 'acc', 'Curl femoral Keiser', 'Resistència pneumàtica', 'Resistència pneumàtica (Keiser)', { pos: 'Dp', gm: 'Isquiotibials', sets: '3', reps: '10' });
  ex('X-ACC-07', 'acc', 'Press de pit Keiser', 'Resistència pneumàtica', 'Resistència pneumàtica (Keiser)', { pos: 'Sd', gm: 'Pectoral', sets: '3', reps: '10' });
  ex('X-ACC-08', 'acc', 'Face pull', 'Politges', 'Politja', { pos: 'Bp', gm: 'Escàpula', sets: '3', reps: '12' });
  ex('X-ACC-09', 'acc', 'Pallof press dinàmic', 'Politges', 'Politja', { pos: 'Bp', gm: 'Core', lat: 'UL', sets: '3', reps: '10/costat' });
  ex('X-ACC-10', 'acc', 'Woodchop a la politja', 'Politges', 'Politja', { pos: 'Bp', gm: 'Core', lat: 'UL', sets: '3', reps: '8/costat' });
  ex('X-ACC-11', 'acc', 'Rotació externa d\'espatlla a la politja', 'Politges', 'Politja', { pos: 'Bp', gm: 'Manegot rotador', lat: 'UL', sets: '3', reps: '12/costat' });
  ex('X-ACC-12', 'acc', 'Lateral step down', 'Unilateral', 'Caixa', { pos: 'Bp', gm: 'Quàdriceps', cont: 'ECC', lat: 'UL', sets: '3', reps: '8/cama' });
  ex('X-ACC-13', 'acc', 'RDL unipodal', 'Unilateral', 'KB', { pos: 'Bp', gm: 'Isquiotibials', lat: 'UL', sets: '3', reps: '8/cama' });
  ex('X-ACC-14', 'acc', 'Elevació de talons unipodal (HE)', 'Unilateral', 'KB', { pos: 'Bp', gm: 'Bessons i soli', lat: 'UL', sets: '3', reps: '12/cama' });
  ex('X-ACC-15', 'acc', 'Copenhagen llarg', 'Unilateral', 'Banc', { pos: 'Dl', gm: 'Adductors', cont: 'ISO', lat: 'UL', sets: '3', reps: '20 s/costat' });
  ex('X-ACC-16', 'acc', 'Nordic curl', 'Isquiotibials', 'Pes corporal', { pos: 'Ag', gm: 'Isquiotibials', cont: 'ECC', sets: '3', reps: '5' });
  ex('X-ACC-17', 'acc', 'Curl femoral amb fitball', 'Isquiotibials', 'Fitball', { pos: 'Ds', gm: 'Isquiotibials', sets: '3', reps: '10' });

  // 6 · Tornada a la calma
  ex('X-CAL-01', 'cal', 'Respiració 90/90', 'Respiració', 'Terra', { pos: 'Ds', sets: '1', reps: '2\'', cues: 'Exhalació llarga; baixa la freqüència respiratòria.' });
  ex('X-CAL-02', 'cal', 'Respiració de cocodril', 'Respiració', 'Terra', { pos: 'Dp', sets: '1', reps: '2\'', cues: 'Respiració diafragmàtica amb expansió lumbar.' });
  ex('X-CAL-03', 'cal', 'Respiració en caixa 4-4-4-4', 'Parasimpàtic', 'Terra', { pos: 'Sd', sets: '1', reps: '6 cicles' });
  ex('X-CAL-04', 'cal', 'Respiració 4-7-8', 'Parasimpàtic', 'Terra', { pos: 'Sd', sets: '1', reps: '4 cicles' });
  ex('X-CAL-05', 'cal', 'Sospir fisiològic', 'Parasimpàtic', 'Terra', { pos: 'Sd', sets: '1', reps: '5' });
  ex('X-CAL-06', 'cal', 'Cames a la paret amb respiració', 'Parasimpàtic', 'Paret', { pos: 'Ds', sets: '1', reps: '3\'' });
  ex('X-CAL-07', 'cal', 'Postura del nen amb respiració', 'Mobilitat suau', 'Terra', { pos: 'Ag', sets: '1', reps: '1\'' });
  ex('X-CAL-08', 'cal', 'Bike suau + foam roller', 'Recuperació', 'Bike', { pos: 'Sd', sets: '1', reps: '10\'', intensity: 'Suau' });
  ex('X-CAL-09', 'cal', 'Estiraments suaus globals', 'Mobilitat suau', 'Terra', { sets: '1', reps: '5\'' });

  return list;
})();

// Converteix un exercici de la biblioteca en una línia de sessió.
function itemFromExercise(ex, over = {}) {
  return {
    id: U.uid('I'),
    exId: ex ? ex.id : '',
    name: ex ? ex.name : '',
    gm: ex ? ex.gm || '' : '',
    cont: ex ? ex.cont || '' : '',
    pos: ex ? ex.pos || '' : '',
    lat: ex ? ex.lat || '' : '',
    material: ex ? ex.material || '' : '',
    sets: ex ? ex.sets || '' : '',
    reps: ex ? ex.reps || '' : '',
    load: ex ? ex.load || '' : '',
    intensity: ex ? ex.intensity || '' : '',
    rest: ex ? ex.rest || '' : '',
    tempo: ex ? ex.tempo || '' : '',
    note: '',
    done: false,
    ...over,
  };
}

const SEED_TEMPLATES = (() => {
  const byId = Object.fromEntries(SEED_EXERCISES.map((e) => [e.id, e]));
  const it = (exId, over = {}) => ({ ...itemFromExercise(byId[exId], over), id: `${exId}-t` });
  const block = (id, key, name, focus, items, desc = '') => ({ id, kind: 'block', block: key, name, focus, desc, items, seed: true });

  const mob = block('T-MOB-01', 'mob', 'Mobilitat · maluc i turmell', 'Maluc i turmell',
    [it('X-MOB-01'), it('X-MOB-02'), it('X-MOB-03')]);
  const act = block('T-ACT-01', 'act', 'Activació · core i glutis', 'Core',
    [it('X-ACT-01'), it('X-ACT-02'), it('X-ACT-05')]);
  const pot = block('T-POT-01', 'pot', 'Potència · salts i llançaments', 'Salts verticals',
    [it('X-POT-01'), it('X-POT-06')]);
  const forKnee = block('T-FOR-01', 'for', 'Força · dominant de genoll', 'Dominant de genoll', [
    it('X-FOR-01', { sets: '3', reps: '6', intensity: 'RIR 2' }),
    it('X-FOR-04', { sets: '3', reps: '6/cama', intensity: 'RIR 2' }),
    it('X-FOR-06', { sets: '3', reps: '6/cama', intensity: 'RIR 2' }),
    it('X-FOR-07', { sets: '3', reps: '8', intensity: 'RIR 2' }),
  ], '4 exercicis · 3 × 6 amb RIR 2');
  const forHip = block('T-FOR-02', 'for', 'Força · dominant de maluc', 'Dominant de maluc', [
    it('X-FOR-08', { sets: '3', reps: '8', intensity: 'RIR 2' }),
    it('X-FOR-09', { sets: '3', reps: '6', intensity: 'RIR 2' }),
    it('X-FOR-10', { sets: '3', reps: '5', intensity: 'RIR 2' }),
    it('X-FOR-12', { sets: '3', reps: '8', intensity: 'RIR 3' }),
  ]);
  const acc = block('T-ACC-01', 'acc', 'Accessoris · cònica i pneumàtica', 'Unilateral',
    [it('X-ACC-01'), it('X-ACC-04'), it('X-ACC-08'), it('X-ACC-14')]);
  const cal = block('T-CAL-01', 'cal', 'Tornada a la calma · parasimpàtic', 'Respiració',
    [it('X-CAL-01'), it('X-CAL-03'), it('X-CAL-06')]);

  const session = (id, name, goal, blocks) => ({ id, kind: 'session', name, goal, seed: true,
    blocks: blocks.map((b) => ({ key: b.block, focus: b.focus, note: '', items: b.items })) });

  return [
    mob, act, pot, forKnee, forHip, acc, cal,
    session('T-SES-01', 'Sessió tipus · tren inferior (genoll)', 'Força de tren inferior · dominant de genoll', [mob, act, pot, forKnee, acc, cal]),
    session('T-SES-02', 'Sessió tipus · tren inferior (maluc)', 'Força de tren inferior · dominant de maluc', [mob, act, pot, forHip, acc, cal]),
  ];
})();
