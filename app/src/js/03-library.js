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

  // ── Exercicis afegits per completar les progressions (de més fàcil a més difícil) ──
  // 1 · Mobilitat
  ex('X-MOB-15', 'mob', 'Dorsiflexió en estocada amb càrrega', 'Turmell', 'KB', { pos: 'Sa', lat: 'UL', sets: '2', reps: '8/costat', cues: 'La KB sobre el genoll; el genoll avança i el taló no s\'aixeca.' });
  ex('X-MOB-16', 'mob', 'Squat profund amb pausa', 'Turmell', 'Pes corporal', { pos: 'Bp', sets: '2', reps: '5 × 10 s', cues: 'Talons a terra, tronc llarg i respiració tranquil·la a baix.' });
  ex('X-MOB-17', 'mob', '90/90 amb lift-off', 'Maluc', 'Terra', { pos: 'Sd', lat: 'UL', sets: '2', reps: '5/costat', cues: 'Aixeca el peu de darrere sense inclinar el tronc.' });
  ex('X-MOB-18', 'mob', 'Cossack squat amb contrapès', 'Maluc', 'KB', { pos: 'Bp', lat: 'UL', sets: '2', reps: '5/costat' });
  ex('X-MOB-19', 'mob', 'Couch stretch', 'Maluc', 'Paret', { pos: 'Sa', lat: 'UL', sets: '2', reps: '45 s/costat', cues: 'Retroversió pèlvica i glutis actius; no arquegis la lumbar.' });
  ex('X-MOB-20', 'mob', 'Rotació toràcica en mig genoll amb pica', 'Columna toràcica', 'Pica', { pos: 'Sa', lat: 'UL', sets: '2', reps: '8/costat' });
  ex('X-MOB-21', 'mob', 'Wall slide amb lift-off', 'Espatlla', 'Paret', { pos: 'Bp', sets: '2', reps: '8', cues: 'A dalt, separa les mans de la paret sense arquejar l\'esquena.' });

  // 2 · Activació
  ex('X-ACT-15', 'act', 'Dead bug amb goma (pullover)', 'Core · antiextensió', 'Goma elàstica', { pos: 'Ds', gm: 'Core', lat: 'UL', sets: '2', reps: '8/costat', cues: 'Tensa la goma amb els braços i allarga la cama sense moure la pelvis.' });
  ex('X-ACT-16', 'act', 'Body saw amb lliscadors', 'Core · antiextensió', 'Lliscadors', { pos: 'Dp', gm: 'Core', sets: '2', reps: '8' });
  ex('X-ACT-17', 'act', 'Ab wheel rollout', 'Core · antiextensió', 'Roda abdominal', { pos: 'Ag', gm: 'Core', cont: 'ECC', sets: '2', reps: '6', cues: 'Avança només fins on puguis mantenir la pelvis neutra.' });
  ex('X-ACT-18', 'act', 'Planxa lateral de genolls', 'Core', 'Terra', { pos: 'Dl', gm: 'Core', cont: 'ISO', lat: 'UL', sets: '2', reps: '20 s/costat' });
  ex('X-ACT-19', 'act', 'Planxa lateral amb abducció de cama', 'Core', 'Terra', { pos: 'Dl', gm: 'GMed', lat: 'UL', sets: '2', reps: '8/costat' });
  ex('X-ACT-20', 'act', 'Suitcase carry', 'Core', 'KB', { pos: 'Bp', gm: 'Core', lat: 'UL', sets: '2', reps: '20 m/costat', cues: 'Camina recte, sense inclinar-te cap a la càrrega.' });
  ex('X-ACT-21', 'act', 'Pont de glutis unipodal', 'Glutis', 'Terra', { pos: 'Ds', gm: 'GMax', lat: 'UL', sets: '2', reps: '8/costat' });
  ex('X-ACT-22', 'act', 'Hip airplane', 'Glutis', 'Pes corporal', { pos: 'Bp', gm: 'GMed', lat: 'UL', sets: '2', reps: '5/costat', cues: 'Rota la pelvis sobre el maluc de suport amb control.' });
  ex('X-ACT-23', 'act', 'Squeeze isomètric amb pilota', 'Adductors', 'Pilota', { pos: 'Ds', gm: 'Adductors', cont: 'ISO', sets: '3', reps: '10 s' });
  ex('X-ACT-24', 'act', 'Y-T-W en banc inclinat', 'Escàpules', 'Mancuernes', { pos: 'Dp', gm: 'Escàpula', sets: '2', reps: '6 de cada' });

  // 3 · Potència
  ex('X-POT-13', 'pot', 'Snap down (aterratge)', 'Salt vertical', 'Pes corporal', { pos: 'Bp', sets: '3', reps: '5', cues: 'Aprèn a aterrar: genolls alineats, maluc enrere i sense soroll.' });
  ex('X-POT-14', 'pot', 'CMJ unipodal', 'Salt vertical', 'Pes corporal', { pos: 'Bp', lat: 'UL', sets: '3', reps: '3/cama', intensity: 'Màxima intenció', rest: '90 s' });
  ex('X-POT-15', 'pot', 'Salts sobre tanques baixes', 'Pliometria reactiva', 'Tanques', { pos: 'Bp', sets: '3', reps: '5', cues: 'Contacte curt; rebota com una pilota.' });
  ex('X-POT-16', 'pot', 'Drop jump unipodal', 'Pliometria reactiva', 'Caixa', { pos: 'Bp', lat: 'UL', sets: '3', reps: '3/cama' });
  ex('X-POT-17', 'pot', 'Salt horitzontal amb aterratge unipodal', 'Salt horitzontal', 'Pes corporal', { pos: 'Bp', lat: 'UL', sets: '3', reps: '3/cama', cues: 'Aguanta 2 s l\'aterratge sense que el genoll entri.' });
  ex('X-POT-18', 'pot', 'Bounds (salts unipodals encadenats)', 'Salt horitzontal', 'Pes corporal', { pos: 'Bp', lat: 'UL', sets: '3', reps: '5/cama' });
  ex('X-POT-19', 'pot', 'Desplaçament lateral amb aturada', 'Canvi de direcció', 'Cons', { pos: 'Bp', lat: 'UL', sets: '3', reps: '4/costat', cues: 'Frena en dos temps; el peu de fora empeny el terra.' });
  ex('X-POT-20', 'pot', 'Canvi de direcció a 45° preplanificat', 'Canvi de direcció', 'Cons', { pos: 'Bp', lat: 'UL', sets: '3', reps: '4/costat' });
  ex('X-POT-21', 'pot', '5-0-5 (canvi de direcció de 180°)', 'Canvi de direcció', 'Cons', { pos: 'Bp', lat: 'UL', sets: '3', reps: '3/costat', intensity: 'Màxima intenció', rest: '2\'' });
  ex('X-POT-22', 'pot', 'Canvi de direcció reactiu (a senyal)', 'Canvi de direcció', 'Cons', { pos: 'Bp', sets: '3', reps: '4', cues: 'Surt cap on indiqui el senyal (llum, so o mà).' });
  ex('X-POT-23', 'pot', 'Canvi de direcció reactiu en mirall (1 contra 1)', 'Canvi de direcció', 'Cons', { pos: 'Bp', sets: '3', reps: '4 × 8 s' });
  ex('X-POT-24', 'pot', 'Llançament rotacional amb pas (shot put)', 'Llançament rotacional', 'Med ball', { pos: 'Bp', lat: 'UL', sets: '3', reps: '4/costat', intensity: 'Màxima intenció' });
  ex('X-POT-25', 'pot', 'Jump shrug', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '4', cues: 'Extensió triple explosiva i encongiment d\'espatlles; braços relaxats.' });
  ex('X-POT-26', 'pot', 'Hang high pull', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '3', cues: 'Colzes amunt i per fora després de l\'extensió.' });
  ex('X-POT-27', 'pot', 'Power clean des de terra', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '4', reps: '2', rest: '2\'' });
  ex('X-POT-28', 'pot', 'Cargolada completa (clean)', 'Olímpic', 'Barra', { pos: 'Bp', sets: '4', reps: '2', rest: '2\'' });
  ex('X-POT-29', 'pot', 'Overhead squat amb pica', 'Derivat olímpic', 'Pica', { pos: 'Bp', sets: '2', reps: '6', cues: 'Braços bloquejats i pica sobre el centre del peu.' });
  ex('X-POT-30', 'pot', 'Snatch high pull des de penjat', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '3' });
  ex('X-POT-31', 'pot', 'Hang power snatch', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '3' });
  ex('X-POT-32', 'pot', 'Power snatch', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '4', reps: '2', rest: '2\'' });
  ex('X-POT-33', 'pot', 'Arrencada completa (snatch)', 'Olímpic', 'Barra', { pos: 'Bp', sets: '4', reps: '2', rest: '2\'' });
  ex('X-POT-34', 'pot', 'Push press', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '4', cues: 'Impuls de cames curt i ràpid; la barra puja en línia recta.' });
  ex('X-POT-35', 'pot', 'Push jerk', 'Derivat olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '3' });
  ex('X-POT-36', 'pot', 'Split jerk', 'Olímpic', 'Barra', { pos: 'Bp', sets: '3', reps: '2' });
  ex('X-POT-37', 'pot', 'Kettlebell swing a una mà', 'Balístic', 'KB', { pos: 'Bp', gm: 'GMax', lat: 'UL', sets: '3', reps: '8/costat' });
  ex('X-POT-38', 'pot', 'Kettlebell snatch', 'Balístic', 'KB', { pos: 'Bp', lat: 'UL', sets: '3', reps: '5/costat' });

  // 4 · Força principal
  ex('X-FOR-22', 'for', 'Squat a caixa amb pes corporal', 'Dominant de genoll', 'Caixa', { pos: 'Bp', gm: 'Quàdriceps', sets: '3', reps: '10', cues: 'Seu i aixeca\'t sense deixar-te caure; pes al mig del peu.' });
  ex('X-FOR-23', 'for', 'Back squat amb pausa', 'Dominant de genoll', 'Barra', { pos: 'Bp', gm: 'Quàdriceps', sets: '4', reps: '3', intensity: 'RIR 2', rest: '2\'30"', tempo: '3-2-X-0', cues: 'Pausa de 2 s a baix sense perdre tensió.' });
  ex('X-FOR-24', 'for', 'Split squat amb pes corporal', 'Dominant de genoll', 'Pes corporal', { pos: 'Bp', gm: 'Quàdriceps', lat: 'UL', sets: '3', reps: '10/cama' });
  ex('X-FOR-25', 'for', 'Estocada enrere amb barra', 'Dominant de genoll', 'Barra', { pos: 'Bp', gm: 'Quàdriceps', lat: 'UL', sets: '3', reps: '6/cama', intensity: 'RIR 2' });
  ex('X-FOR-26', 'for', 'Squat unipodal a caixa (pistol)', 'Dominant de genoll', 'Caixa', { pos: 'Bp', gm: 'Quàdriceps', lat: 'UL', sets: '3', reps: '5/cama' });
  ex('X-FOR-27', 'for', 'Bisagra de maluc amb pica', 'Dominant de maluc', 'Pica', { pos: 'Bp', gm: 'Isquiotibials', sets: '2', reps: '10', cues: 'La pica toca cap, dors i sacre tota l\'estona.' });
  ex('X-FOR-28', 'for', 'Pes mort amb KB', 'Dominant de maluc', 'KB', { pos: 'Bp', gm: 'GMax', sets: '3', reps: '10', intensity: 'RIR 3' });
  ex('X-FOR-29', 'for', 'Hip thrust amb pes corporal', 'Dominant de maluc', 'Banc', { pos: 'Ds', gm: 'GMax', sets: '3', reps: '12' });
  ex('X-FOR-30', 'for', 'Hip thrust unipodal amb càrrega', 'Dominant de maluc', 'Mancuernes', { pos: 'Ds', gm: 'GMax', lat: 'UL', sets: '3', reps: '8/cama', intensity: 'RIR 2' });
  ex('X-FOR-31', 'for', 'Flexions inclinades (mans elevades)', 'Empenta', 'Banc', { pos: 'Dp', gm: 'Pectoral', sets: '3', reps: '10' });
  ex('X-FOR-32', 'for', 'Press de banca amb mancuernes', 'Empenta', 'Mancuernes', { pos: 'Ds', gm: 'Pectoral', sets: '3', reps: '8', intensity: 'RIR 2' });
  ex('X-FOR-33', 'for', 'Press de banca amb pausa', 'Empenta', 'Barra', { pos: 'Ds', gm: 'Pectoral', sets: '4', reps: '3', intensity: 'RIR 2', rest: '2\'30"', cues: 'Pausa d\'1-2 s amb la barra al pit.' });
  ex('X-FOR-34', 'for', 'Press militar amb barra', 'Empenta', 'Barra', { pos: 'Bp', gm: 'Deltoides', sets: '3', reps: '6', intensity: 'RIR 2' });
  ex('X-FOR-35', 'for', 'Rem Pendlay', 'Tracció', 'Barra', { pos: 'Bp', gm: 'Dorsal', sets: '4', reps: '5', intensity: 'RIR 2' });
  ex('X-FOR-36', 'for', 'Dominades assistides amb goma', 'Tracció', 'Goma elàstica', { pos: 'Bp', gm: 'Dorsal', sets: '3', reps: '6' });
  ex('X-FOR-37', 'for', 'Dominades amb llast', 'Tracció', 'Cinturó de llast', { pos: 'Bp', gm: 'Dorsal', sets: '4', reps: '4', intensity: 'RIR 2' });

  // 5 · Accessoris
  ex('X-ACC-18', 'acc', 'Pallof press en unipodal', 'Politges', 'Politja', { pos: 'Bp', gm: 'Core', lat: 'UL', sets: '3', reps: '8/costat' });
  ex('X-ACC-19', 'acc', 'Copenhagen llarg dinàmic', 'Unilateral', 'Banc', { pos: 'Dl', gm: 'Adductors', lat: 'UL', sets: '3', reps: '6/costat' });
  ex('X-ACC-20', 'acc', 'Equilibri unipodal ulls oberts', 'Vestibular i equilibri', 'Terra', { pos: 'Bp', lat: 'UL', sets: '3', reps: '30 s/cama', cues: 'Peu actiu (short foot) i pelvis alineada.' });
  ex('X-ACC-21', 'acc', 'Equilibri unipodal ulls tancats', 'Vestibular i equilibri', 'Terra', { pos: 'Bp', lat: 'UL', sets: '3', reps: '20 s/cama', cues: 'Sense la vista, l\'equilibri depèn del sistema vestibular i dels peus.' });
  ex('X-ACC-22', 'acc', 'Equilibri unipodal sobre superfície inestable', 'Vestibular i equilibri', 'Coixí d\'equilibri', { pos: 'Bp', lat: 'UL', sets: '3', reps: '30 s/cama' });
  ex('X-ACC-23', 'acc', 'Equilibri unipodal amb girs de cap', 'Vestibular i equilibri', 'Terra', { pos: 'Bp', lat: 'UL', sets: '3', reps: '20 s/cama', cues: 'Gira el cap a dreta i esquerra mantenint l\'equilibri: estimula el sistema vestibular.' });
  ex('X-ACC-24', 'acc', 'Equilibri unipodal amb pertorbacions i doble tasca', 'Vestibular i equilibri', 'Med ball', { pos: 'Bp', lat: 'UL', sets: '3', reps: '30 s/cama', cues: 'Rep i llança la pilota o aguanta empentes mentre fa una tasca mental (comptar enrere).' });
  ex('X-ACC-25', 'acc', 'Estabilització de la mirada (VOR ×1) asseguda', 'Vestibular i equilibri', 'Paret', { pos: 'Sd', sets: '3', reps: '30 s', cues: 'Mira fix una lletra a la paret i mou el cap a dreta i esquerra sense perdre-la. Si et mareja, fes-ho més lent.' });
  ex('X-ACC-26', 'acc', 'Estabilització de la mirada (VOR ×1) de peu', 'Vestibular i equilibri', 'Paret', { pos: 'Bp', sets: '3', reps: '30 s' });
  ex('X-ACC-27', 'acc', 'Estabilització de la mirada caminant', 'Vestibular i equilibri', 'Terra', { pos: 'Bp', sets: '3', reps: '10 m', cues: 'Camina girant el cap a banda i banda sense perdre la línia recta.' });
  ex('X-ACC-28', 'acc', 'Estabilització de la mirada en tàndem', 'Vestibular i equilibri', 'Terra', { pos: 'Bp', sets: '3', reps: '30 s' });
  ex('X-ACC-29', 'acc', 'Nordic curl assistit amb goma', 'Isquiotibials', 'Goma elàstica', { pos: 'Ag', gm: 'Isquiotibials', cont: 'ECC', sets: '3', reps: '5' });
  ex('X-ACC-30', 'acc', 'Elevació de talons bipodal', 'Unilateral', 'Pes corporal', { pos: 'Bp', gm: 'Bessons i soli', sets: '3', reps: '15' });
  ex('X-ACC-31', 'acc', 'Elevació de talons amb genoll flexionat (soli)', 'Unilateral', 'KB', { pos: 'Bp', gm: 'Bessons i soli', lat: 'UL', sets: '3', reps: '12/cama' });

  // 6 · Tornada a la calma
  ex('X-CAL-10', 'cal', 'Respiració diafragmàtica en decúbit supí', 'Respiració', 'Terra', { pos: 'Ds', sets: '1', reps: '2\'', cues: 'Una mà al pit i l\'altra a l\'abdomen: inspira pel nas i que només pugi la de l\'abdomen. És la base per aprendre a respirar amb el diafragma.' });
  ex('X-CAL-11', 'cal', 'Respiració 360° asseguda amb goma', 'Respiració', 'Goma elàstica', { pos: 'Sd', sets: '1', reps: '2\'', cues: 'Goma al voltant de les costelles baixes: en inspirar, expandeix-la cap als costats i l\'esquena.' });
  ex('X-CAL-12', 'cal', 'Exhalació allargada 4-6', 'Parasimpàtic', 'Terra', { pos: 'Sd', sets: '1', reps: '3\'', cues: 'Inspira 4 s i exhala 6 s. Allargar l\'exhalació activa el sistema parasimpàtic (nervi vague) i baixa les pulsacions.' });
  ex('X-CAL-13', 'cal', 'Respiració coherent (5,5 respiracions per minut)', 'Parasimpàtic', 'Terra', { pos: 'Sd', sets: '1', reps: '5\'', cues: 'Inspira 5,5 s i exhala 5,5 s, sense pauses. És el ritme que fa pujar més la variabilitat de la freqüència cardíaca (VFC).' });
  ex('X-CAL-14', 'cal', 'Relaxació muscular progressiva (Jacobson)', 'Relaxació', 'Terra', { pos: 'Ds', sets: '1', reps: '5\'', cues: 'Tensa 5 s i deixa anar 10 s cada grup muscular, dels peus al cap.' });
  ex('X-CAL-15', 'cal', 'Body scan guiat', 'Relaxació', 'Terra', { pos: 'Ds', sets: '1', reps: '5\'', cues: 'Recorre el cos amb l\'atenció, de peus a cap, notant-ne les sensacions sense canviar res.' });

  // ── Famílies de progressió: [família, nivell 1-5] (1 = inicial … 5 = expert) ──
  const ladders = {
    'Mobilitat de turmell': ['X-MOB-01', 'X-MOB-12', 'X-MOB-15', 'X-MOB-16'],
    'Mobilitat de maluc': ['X-MOB-07', 'X-MOB-02', 'X-MOB-17', 'X-MOB-11', 'X-MOB-18'],
    'Flexors de maluc': ['X-MOB-08', 'X-MOB-19', 'X-MOB-03'],
    'Mobilitat toràcica': ['X-MOB-04', 'X-MOB-05', 'X-MOB-06', 'X-MOB-20'],
    'Mobilitat d\'espatlla': ['X-MOB-09', 'X-MOB-10', 'X-MOB-21'],
    'Core · antiextensió': ['X-ACT-01', 'X-ACT-15', 'X-ACT-08', 'X-ACT-16', 'X-ACT-17'],
    'Core · antirotació': ['X-ACT-03', 'X-ACT-02', 'X-ACC-09', 'X-ACC-10', 'X-ACC-18'],
    'Core · antiflexió lateral': ['X-ACT-18', 'X-ACT-09', 'X-ACT-19', 'X-ACT-20'],
    'Glutis': ['X-ACT-04', 'X-ACT-06', 'X-ACT-05', 'X-ACT-21', 'X-ACT-22'],
    'Adductors': ['X-ACT-23', 'X-ACT-07', 'X-ACC-15', 'X-ACC-19'],
    'Escàpula i espatlla': ['X-ACT-10', 'X-ACT-11', 'X-ACT-24'],
    'Salt vertical': ['X-POT-13', 'X-POT-01', 'X-POT-02', 'X-POT-10', 'X-POT-14'],
    'Pliometria reactiva': ['X-POT-04', 'X-POT-15', 'X-POT-05', 'X-POT-16'],
    'Salt horitzontal i unilateral': ['X-POT-03', 'X-POT-17', 'X-POT-11', 'X-POT-18'],
    'Canvi de direcció': ['X-POT-19', 'X-POT-20', 'X-POT-21', 'X-POT-22', 'X-POT-23'],
    'Llançaments': ['X-POT-08', 'X-POT-07', 'X-POT-06', 'X-POT-24'],
    'Olímpics · cargolada': ['X-POT-25', 'X-POT-26', 'X-POT-12', 'X-POT-27', 'X-POT-28'],
    'Olímpics · arrencada': ['X-POT-29', 'X-POT-30', 'X-POT-31', 'X-POT-32', 'X-POT-33'],
    'Olímpics · envia': ['X-POT-34', 'X-POT-35', 'X-POT-36'],
    'Balístic de maluc': ['X-POT-09', 'X-POT-37', 'X-POT-38'],
    'Squat bilateral': ['X-FOR-22', 'X-FOR-03', 'X-FOR-01', 'X-FOR-02', 'X-FOR-23'],
    'Squat unilateral': ['X-FOR-24', 'X-FOR-06', 'X-FOR-04', 'X-FOR-25', 'X-FOR-26'],
    'Bisagra de maluc': ['X-FOR-27', 'X-FOR-28', 'X-FOR-09', 'X-FOR-10', 'X-FOR-11'],
    'Extensió de maluc': ['X-FOR-29', 'X-FOR-08', 'X-FOR-30'],
    'Empenta horitzontal': ['X-FOR-31', 'X-FOR-16', 'X-FOR-32', 'X-FOR-13', 'X-FOR-33'],
    'Empenta vertical': ['X-FOR-15', 'X-FOR-14', 'X-FOR-34'],
    'Tracció horitzontal': ['X-FOR-21', 'X-FOR-19', 'X-FOR-18', 'X-FOR-35'],
    'Tracció vertical': ['X-FOR-20', 'X-FOR-36', 'X-FOR-17', 'X-FOR-37'],
    'Equilibri': ['X-ACC-20', 'X-ACC-21', 'X-ACC-22', 'X-ACC-23', 'X-ACC-24'],
    'Vestibular · estabilitat de la mirada': ['X-ACC-25', 'X-ACC-26', 'X-ACC-27', 'X-ACC-28'],
    'Isquiotibials': ['X-ACC-17', 'X-ACC-06', 'X-ACC-29', 'X-ACC-16'],
    'Turmell i panxell': ['X-ACC-30', 'X-ACC-14', 'X-ACC-31'],
    'Respiració diafragmàtica': ['X-CAL-10', 'X-CAL-02', 'X-CAL-01', 'X-CAL-11'],
    'Respiració parasimpàtica': ['X-CAL-05', 'X-CAL-12', 'X-CAL-03', 'X-CAL-04', 'X-CAL-13'],
    'Relaxació': ['X-CAL-07', 'X-CAL-06', 'X-CAL-14', 'X-CAL-15'],
  };
  const byId = Object.fromEntries(list.map((e) => [e.id, e]));
  for (const [family, ids] of Object.entries(ladders)) {
    ids.forEach((id, i) => { if (byId[id]) Object.assign(byId[id], { family, level: String(i + 1) }); });
  }
  // ── Exercicis amb el material del centre i de tren superior per grup muscular ──
  const add = (id, block, name, cat, material, extra) => { ex(id, block, name, cat, material, extra); byId[id] = list[list.length - 1]; };
  const B = 'Barra olímpica (20-25 kg)', M = 'Mancuernes Technogym', K = 'Kettlebell', KS = 'Keiser (pneumàtica)', CO = 'Politja cònica isoinercial',
    PT = 'Politja Technogym', KX = 'kBox Lite Exxentric', G = 'Goma elàstica', F = 'Lliscadors Flowin', PC = 'Pes corporal';
  add('X-ACC-32', 'acc', 'Curl de bíceps amb mancuernes', 'Tren superior', M, { pos: 'Bp', gm: 'Bíceps', sets: '3', reps: '10', intensity: 'RIR 2', materials: [M, B, PT, KS, G] });
  add('X-ACC-33', 'acc', 'Curl martell', 'Tren superior', M, { pos: 'Bp', gm: 'Bíceps', muscles: ['Avantbraç'], sets: '3', reps: '10', intensity: 'RIR 2', materials: [M, PT, G] });
  add('X-ACC-34', 'acc', 'Curl de bíceps a la politja', 'Tren superior', PT, { pos: 'Bp', gm: 'Bíceps', sets: '3', reps: '12', materials: [PT, KS, G] });
  add('X-ACC-35', 'acc', 'Extensió de tríceps a la politja', 'Tren superior', PT, { pos: 'Bp', gm: 'Tríceps', sets: '3', reps: '12', materials: [PT, KS, G] });
  add('X-ACC-36', 'acc', 'Extensió de tríceps per sobre del cap', 'Tren superior', PT, { pos: 'Bp', gm: 'Tríceps', sets: '3', reps: '12', materials: [PT, M, G] });
  add('X-ACC-37', 'acc', 'Press francès amb mancuernes', 'Tren superior', M, { pos: 'Ds', gm: 'Tríceps', sets: '3', reps: '10', intensity: 'RIR 2', materials: [M, B] });
  add('X-ACC-38', 'acc', 'Fons de tríceps al banc', 'Tren superior', 'Banc', { pos: 'Sd', gm: 'Tríceps', muscles: ['Pectoral'], sets: '3', reps: '10', materials: ['Banc', PC] });
  add('X-ACC-39', 'acc', 'Elevacions laterals', 'Tren superior', M, { pos: 'Bp', gm: 'Deltoides', sets: '3', reps: '12', materials: [M, PT, KS, G] });
  add('X-ACC-40', 'acc', 'Elevacions frontals', 'Tren superior', M, { pos: 'Bp', gm: 'Deltoides', sets: '3', reps: '12', materials: [M, PT, G] });
  add('X-ACC-41', 'acc', 'Ocells (deltoides posterior)', 'Tren superior', M, { pos: 'Bp', gm: 'Deltoides', muscles: ['Escàpula'], sets: '3', reps: '12', materials: [M, PT, G] });
  add('X-ACC-42', 'acc', 'Obertures amb mancuernes', 'Tren superior', M, { pos: 'Ds', gm: 'Pectoral', sets: '3', reps: '12', materials: [M, PT] });
  add('X-ACC-43', 'acc', 'Creuament a la politja', 'Tren superior', PT, { pos: 'Bp', gm: 'Pectoral', sets: '3', reps: '12', materials: [PT, KS, G] });
  add('X-ACC-44', 'acc', 'Pullover a la politja', 'Tren superior', PT, { pos: 'Bp', gm: 'Dorsal', sets: '3', reps: '12', materials: [PT, M, G] });
  add('X-ACC-45', 'acc', 'Encongiments d\'espatlles', 'Tren superior', M, { pos: 'Bp', gm: 'Trapezi', sets: '3', reps: '12', materials: [M, B, K] });
  add('X-ACC-46', 'acc', 'Leg extension', 'Tren inferior', 'Leg extension Technogym', { pos: 'Sd', gm: 'Quàdriceps', sets: '3', reps: '10', intensity: 'RIR 2', materials: ['Leg extension Technogym', KS, G] });
  add('X-ACC-47', 'acc', 'Adductor a la màquina', 'Tren inferior', 'Abductor/adductor 700 Technogym', { pos: 'Sd', gm: 'Adductors', sets: '3', reps: '12', materials: ['Abductor/adductor 700 Technogym', PT, G] });
  add('X-ACC-48', 'acc', 'Abductor a la màquina', 'Tren inferior', 'Abductor/adductor 700 Technogym', { pos: 'Sd', gm: 'Abductors', muscles: ['GMed'], sets: '3', reps: '12', materials: ['Abductor/adductor 700 Technogym', PT, G] });
  add('X-ACC-49', 'acc', 'Elevació de talons a la premsa', 'Tren inferior', 'Premsa Technogym', { pos: 'Sd', gm: 'Bessons i soli', sets: '3', reps: '15', materials: ['Premsa Technogym', 'Leg press Biostrength', M] });
  add('X-ACC-50', 'acc', 'Curl femoral amb lliscadors Flowin', 'Isquiotibials', F, { pos: 'Ds', gm: 'Isquiotibials', muscles: ['GMax'], cont: 'ECC', sets: '3', reps: '8', materials: [F, 'Fitball'] });
  add('X-FOR-38', 'for', 'Leg press Biostrength', 'Dominant de genoll', 'Leg press Biostrength', { pos: 'Sd', gm: 'Quàdriceps', muscles: ['GMax'], sets: '3', reps: '8', intensity: 'RIR 2', materials: ['Leg press Biostrength', 'Premsa Technogym', KS] });
  add('X-FOR-39', 'for', 'Squat a la kBox', 'Dominant de genoll', KX, { pos: 'Bp', gm: 'Quàdriceps', muscles: ['GMax'], cont: 'ECC', sets: '4', reps: '8', intensity: 'Màxima intenció', cues: 'Concèntrica tan ràpida com puguis; frena l\'excèntrica al final.', materials: [KX] });
  add('X-FOR-40', 'for', 'RDL a la kBox', 'Dominant de maluc', KX, { pos: 'Bp', gm: 'Isquiotibials', muscles: ['GMax'], cont: 'ECC', sets: '4', reps: '8', materials: [KX] });
  add('X-FOR-41', 'for', 'Glute-ham raise (GHD)', 'Dominant de maluc', 'Banc GHD', { pos: 'Ag', gm: 'Isquiotibials', muscles: ['GMax'], sets: '3', reps: '6', materials: ['Banc GHD'] });
  add('X-FOR-42', 'for', 'Hiperextensió de maluc al lower back bench', 'Dominant de maluc', 'Lower back bench', { pos: 'Dp', gm: 'GMax', muscles: ['Isquiotibials', 'Lumbar'], sets: '3', reps: '12', materials: ['Lower back bench', 'Banc GHD'] });
  add('X-FOR-43', 'for', 'Press de banca tancat', 'Empenta', B, { pos: 'Ds', gm: 'Tríceps', muscles: ['Pectoral'], sets: '3', reps: '8', intensity: 'RIR 2', materials: [B, M] });
  add('X-FOR-44', 'for', 'Rem assegut a la politja', 'Tracció', PT, { pos: 'Sd', gm: 'Dorsal', muscles: ['Bíceps', 'Escàpula'], sets: '3', reps: '10', intensity: 'RIR 2', materials: [PT, CO, KS, G] });
  add('X-ACT-25', 'act', 'GHD sit-up', 'Core', 'Banc GHD', { pos: 'Sd', gm: 'Core', sets: '2', reps: '10', materials: ['Banc GHD'] });
  add('X-MOB-22', 'mob', 'Carrera a l\'AlterG amb descàrrega', 'Escalfament', 'AlterG', { pos: 'Bp', sets: '1', reps: '10\'', intensity: '70 % del pes', cues: 'Pes corporal reduït per córrer sense dolor; es puja el percentatge setmana a setmana.' });
  add('X-MOB-23', 'mob', 'Alliberament amb mobility ball', 'Alliberament miofascial', 'Mobility ball Technogym', { sets: '1', reps: '2\'/zona' });
  add('X-POT-39', 'pot', 'Empenta de trineu al Skillmill', 'Acceleració', 'Skillmill', { pos: 'Bp', gm: 'Tren inferior', sets: '4', reps: '15 m', intensity: 'Màxima intenció', rest: '2\'' });
  add('X-POT-40', 'pot', 'Sprint al Skillmill', 'Acceleració', 'Skillmill', { pos: 'Bp', gm: 'Tren inferior', sets: '4', reps: '8 s', intensity: 'Màxima intenció', rest: '2\'' });

  // ── Loop band Technogym (els 50 exercicis de l'app de Technogym; «tg» és el nom que hi surt) ──
  const LB = 'Loop band Technogym';
  const lb = (n, block, name, tg, gm, extra = {}) => add(`X-LB-${String(n).padStart(2, '0')}`, block, name, 'Loop band', LB,
    { tg, gm, pos: 'Bp', sets: '2', reps: '12', materials: [LB, G], ...extra });
  lb(1, 'pot', 'Salts endavant amb rotació', 'Rotating forward jumps', 'Tren inferior', { sets: '3', reps: '6', intensity: 'Màxima intenció' });
  lb(2, 'act', 'Abducció de maluc en mig squat', 'Hips abduction - half squat', 'GMed', { muscles: ['Quàdriceps'] });
  lb(3, 'act', 'Pont de glutis amb loop band', 'Glute bridge', 'GMax', { muscles: ['GMed'], pos: 'Ds' });
  lb(4, 'act', 'Extensió de maluc dempeus', 'Hip extension', 'GMax', { lat: 'UL', reps: '10/costat' });
  lb(5, 'act', 'Passes laterals en mig squat · banda als turmells', 'Lateral half squat walks - band at ankles', 'GMed', { reps: '10 passes/costat' });
  lb(6, 'act', 'Passes laterals en mig squat · banda als genolls', 'Lateral half squat walks - band at knees', 'GMed', { reps: '10 passes/costat' });
  lb(7, 'act', 'Abducció de maluc dempeus · banda als turmells', 'Hip abduction - band at ankles', 'GMed', { lat: 'UL', reps: '12/costat' });
  lb(8, 'act', 'Squat amb loop band', 'Squat', 'Quàdriceps', { muscles: ['GMax', 'GMed'] });
  lb(9, 'act', 'Passes laterals en squat · banda als turmells', 'Lateral squat walks - band at ankles', 'GMed', { muscles: ['Quàdriceps'], reps: '10 passes/costat' });
  lb(10, 'act', 'Clamshell amb loop band', 'Clam shells', 'GMed', { pos: 'Dl', lat: 'UL', reps: '12/costat' });
  lb(11, 'act', 'Passes laterals en planxa', 'Lateral plank walks', 'Core', { muscles: ['Deltoides', 'GMed'], pos: 'Dp', reps: '6 passes/costat' });
  lb(12, 'pot', 'Desplaçament lateral ràpid (shuffle)', 'Lateral shuffle', 'GMed', { muscles: ['Quàdriceps'], sets: '3', reps: '4 × 5 m', intensity: 'Màxima intenció' });
  lb(13, 'act', 'Monster walk · banda als turmells', 'Monster walks - band at ankles', 'GMed', { muscles: ['GMax'], reps: '10 passes' });
  lb(14, 'act', 'Abducció de maluc dempeus · banda als genolls', 'Hip abduction - band at knees', 'GMed', { lat: 'UL', reps: '12/costat' });
  lb(15, 'act', 'Skipping · banda als genolls', 'High knees - band at knees', 'Flexors de maluc', { muscles: ['Core'], reps: '20 s' });
  lb(16, 'act', 'Flexió amb passes laterals de mans', 'Push up with lateral hand walk - alternated', 'Pectoral', { muscles: ['Tríceps', 'Core'], pos: 'Dp', reps: '6' });
  lb(17, 'act', 'Passes laterals amb rotació de tronc · banda als genolls', 'Lateral walks with trunk rotation - band at knees', 'GMed', { muscles: ['Oblics'], reps: '10 passes/costat' });
  lb(18, 'act', 'Abducció de maluc estirat de costat · banda als turmells', 'Hip abduction lying on side - band at ankles', 'GMed', { pos: 'Dl', lat: 'UL', reps: '12/costat' });
  lb(19, 'act', 'Flexió de maluc alterna · banda als peus', 'Alternating hip flexion - band at feet', 'Flexors de maluc', { muscles: ['Core'], reps: '10/costat' });
  lb(20, 'act', 'Abducció de maluc estirat de costat · banda als genolls', 'Hip abduction lying on side - band at knees', 'GMed', { pos: 'Dl', lat: 'UL', reps: '12/costat' });
  lb(21, 'act', 'Monster walk · banda als genolls', 'Monster walks - band at knees', 'GMed', { muscles: ['GMax'], reps: '10 passes' });
  lb(22, 'act', 'Abducció de maluc recolzat al colze · banda als turmells', 'Hip abduction lying on elbow - band at ankles', 'GMed', { muscles: ['Oblics'], pos: 'Dl', lat: 'UL', reps: '10/costat' });
  lb(23, 'act', 'Crunch amb genolls elevats · banda als genolls', 'Crunch with knees raised - band at knees', 'Core', { pos: 'Ds' });
  lb(24, 'act', 'Squat sumo amb loop band', 'Sumo squat', 'Quàdriceps', { muscles: ['Adductors', 'GMax'] });
  lb(25, 'act', 'Abducció de maluc en planxa lateral · banda als turmells', 'Hip abduction in side plank - band at ankles', 'GMed', { muscles: ['Oblics'], pos: 'Dl', lat: 'UL', reps: '8/costat' });
  lb(26, 'act', 'Abducció de maluc alterna en planxa de braços estirats · banda als genolls', 'Alternating hip abduction in straight arm plank - band at knees', 'Core', { muscles: ['GMed'], pos: 'Dp', reps: '8/costat' });
  lb(27, 'act', 'Abducció de maluc i curl de cama estirat de costat · banda als turmells', 'Hip abduction and leg curl - on side - band at ankles', 'GMed', { muscles: ['Isquiotibials'], pos: 'Dl', lat: 'UL', reps: '10/costat' });
  lb(28, 'act', 'Crunch bicicleta amb loop band', 'Bicycle crunch', 'Core', { muscles: ['Oblics'], pos: 'Ds', reps: '10/costat' });
  lb(29, 'act', 'Abducció de braços en posició de barca', 'Arm abduction - boat pose', 'Core', { muscles: ['Deltoides'], pos: 'Sd' });
  lb(30, 'act', 'Planxa jack de braços estirats', 'Straight arm plank jack', 'Core', { muscles: ['GMed'], pos: 'Dp', reps: '20 s' });
  lb(31, 'act', 'Abducció de maluc en quadrupèdia · banda als genolls', 'Quadruped hip abduction - band at knees', 'GMed', { pos: 'Qd', lat: 'UL', reps: '12/costat' });
  lb(32, 'act', 'Flexió de maluc alterna amb braços estirats', 'Alternating hip flexion - straight arms', 'Flexors de maluc', { muscles: ['Core'], reps: '10/costat' });
  lb(33, 'act', 'Abducció de maluc en posició de superman', 'Hip abduction - superman position', 'GMed', { muscles: ['GMax', 'Lumbar'], pos: 'Dp' });
  lb(34, 'act', 'Flexió de maluc alterna en planxa invertida', 'Hip flexion alternated - reverse plank', 'Flexors de maluc', { muscles: ['Core', 'GMax'], pos: 'Sd', reps: '8/costat' });
  lb(35, 'act', 'Crunch amb genolls elevats · banda als turmells', 'Crunch with knees raised - band at ankles', 'Core', { pos: 'Ds' });
  lb(36, 'act', 'Crunch amb cames estirades elevades · banda als turmells', 'Crunch with raised straight legs - band at ankles', 'Core', { pos: 'Ds' });
  lb(37, 'act', 'Flexions de maluc alternes en planxa · banda als peus', 'Alternate hip flexions in plank - band at feet', 'Core', { muscles: ['Flexors de maluc'], pos: 'Dp', reps: '8/costat' });
  lb(38, 'act', 'Mountain climbers amb loop band', 'Mountain climbers', 'Core', { muscles: ['Flexors de maluc'], pos: 'Dp', reps: '20 s' });
  lb(39, 'act', 'Kickback en quadrupèdia', 'Quadruped kickback', 'GMax', { pos: 'Qd', lat: 'UL', reps: '12/costat' });
  lb(40, 'act', 'Abducció i flexió de maluc en planxa lateral · banda als turmells', 'Hip abduction and flexion in side plank - band at ankles', 'GMed', { muscles: ['Oblics', 'Flexors de maluc'], pos: 'Dl', lat: 'UL', reps: '8/costat' });
  lb(41, 'act', 'Flutter kicks en posició de barca', 'Flutter kicks - boat pose', 'Core', { muscles: ['Flexors de maluc'], pos: 'Sd', reps: '20 s' });
  lb(42, 'act', 'Passes laterals en quadrupèdia', 'Lateral steps - quadruped', 'Core', { muscles: ['GMed'], pos: 'Qd', reps: '6 passes/costat' });
  lb(43, 'act', 'Crunch amb recollida de genolls · banda als turmells', 'Crunch with knee tuck - band at ankles', 'Core', { pos: 'Sd' });
  lb(44, 'act', 'Planxa de braços estirats · banda als turmells', 'Straight arm plank - band at ankles', 'Core', { pos: 'Dp', cont: 'ISO', reps: '30 s' });
  lb(45, 'act', 'Pas enrere altern i squat', 'Alternating back step and squat', 'Quàdriceps', { muscles: ['GMax'], reps: '8/costat' });
  lb(46, 'act', 'Pas enrere altern i squat · banda als genolls', 'Alternating back step and squat - band at knees', 'Quàdriceps', { muscles: ['GMax', 'GMed'], reps: '8/costat' });
  lb(47, 'acc', 'Extensió de tríceps amb loop band', 'Triceps extension', 'Tríceps', { lat: 'UL', reps: '12/costat' });
  lb(48, 'act', 'Abducció de maluc alterna en quadrupèdia · banda als genolls', 'Quadruped alternating hip abduction - band at knees', 'GMed', { muscles: ['Core'], pos: 'Qd', reps: '10/costat' });
  lb(49, 'act', 'Flexió de maluc en planxa invertida', 'Hip flexion - reverse plank', 'Flexors de maluc', { muscles: ['Core', 'GMax'], pos: 'Sd', reps: '8/costat' });
  lb(50, 'act', 'Kickback altern en quadrupèdia', 'Quadruped alternating kickback', 'GMax', { muscles: ['Core'], pos: 'Qd', reps: '10/costat' });
  const lbLadders = {
    'Loop band · abducció de maluc de costat': [10, 20, 18, 25, 40],
    'Loop band · passes laterals': [6, 5, 9, 13, 12],
    'Loop band · core en planxa': [44, 37, 38, 30, 26],
    'Loop band · crunch': [23, 35, 43, 28, 36],
  };
  for (const [family, ns] of Object.entries(lbLadders)) {
    ns.forEach((n, i) => Object.assign(byId[`X-LB-${String(n).padStart(2, '0')}`], { family, level: String(i + 1) }));
  }

  // ── Kettlebell Technogym (50 exercicis de l'app de Technogym) ──
  const KBT = 'Kettlebell';
  const tgEx = (prefix, n, block, name, tg, gm, cat, material, materials, extra = {}) => add(`X-${prefix}-${String(n).padStart(2, '0')}`, block, name, cat, material,
    { tg, gm, pos: 'Bp', sets: '2', reps: '12', materials, ...extra });
  tgEx('KB', 1, "act", "Russian twist amb cames elevades amb KB", "Russian twist - legs up", "Oblics", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core"], pos: "Sd", reps: "10/costat" });
  tgEx('KB', 2, "pot", "Swing rus amb kettlebell", "Russian swing", "GMax", 'Kettlebell', KBT, [KBT, M], { muscles: ["Isquiotibials", "Core"], sets: "3", reps: "12" });
  tgEx('KB', 3, "for", "Pes mort amb kettlebell", "Deadlift", "GMax", 'Kettlebell', KBT, [KBT, M], { muscles: ["Isquiotibials", "Quàdriceps"], sets: "3", reps: "10", intensity: "RIR 2" });
  tgEx('KB', 4, "for", "Front squat amb kettlebells", "Front squat", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax", "Core"], sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('KB', 5, "act", "Crunch amb pullover i cames elevades amb KB", "Pullover crunch - legs up", "Core", 'Kettlebell', KBT, [KBT, M], { muscles: ["Dorsal"], pos: "Ds", reps: "10" });
  tgEx('KB', 6, "act", "Planxa lateral amb arrencada amb KB", "Side plank snatch", "Oblics", 'Kettlebell', KBT, [KBT, M], { muscles: ["Deltoides"], pos: "Dl", lat: "UL", reps: "6/costat" });
  tgEx('KB', 7, "for", "Renegade row amb kettlebells", "Renegade row", "Dorsal", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core"], pos: "Dp", sets: "3", reps: "6/costat" });
  tgEx('KB', 8, "act", "Crunch amb kettlebell", "Crunch", "Core", 'Kettlebell', KBT, [KBT, M], { pos: "Ds", reps: "12" });
  tgEx('KB', 9, "acc", "Rem vertical amb kettlebell", "Upright row", "Deltoides", 'Kettlebell', KBT, [KBT, M], { muscles: ["Trapezi"], sets: "3", reps: "10" });
  tgEx('KB', 10, "for", "Press per sobre del cap a una mà amb KB", "Overhead press - single arm", "Deltoides", 'Kettlebell', KBT, [KBT, M], { muscles: ["Tríceps"], lat: "UL", sets: "3", reps: "8/costat", intensity: "RIR 2" });
  tgEx('KB', 11, "act", "Halo amb kettlebell", "Halo", "Deltoides", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core"], reps: "6/costat" });
  tgEx('KB', 12, "for", "Pes mort amb cames rígides amb KB", "Stiff leg deadlift", "Isquiotibials", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax", "Lumbar"], sets: "3", reps: "10" });
  tgEx('KB', 13, "acc", "Farmer carry amb kettlebells", "Farmer carry", "Core", 'Kettlebell', KBT, [KBT, M], { muscles: ["Trapezi", "Avantbraç"], sets: "3", reps: "20 m" });
  tgEx('KB', 14, "for", "Rem inclinat a una mà amb KB", "Single arm row - bent over", "Dorsal", 'Kettlebell', KBT, [KBT, M], { muscles: ["Bíceps"], lat: "UL", sets: "3", reps: "10/costat", intensity: "RIR 2" });
  tgEx('KB', 15, "acc", "Pes mort a una cama amb la KB al mateix costat", "Single leg deadlift - kettlebell on the same side", "Isquiotibials", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], lat: "UL", sets: "3", reps: "8/cama" });
  tgEx('KB', 16, "for", "Rem inclinat altern amb KB", "Row alternated - bent over", "Dorsal", 'Kettlebell', KBT, [KBT, M], { muscles: ["Bíceps"], sets: "3", reps: "8/costat" });
  tgEx('KB', 17, "acc", "Ocells amb kettlebells", "Reverse fly", "Deltoides", 'Kettlebell', KBT, [KBT, M], { muscles: ["Escàpula"], sets: "3", reps: "12" });
  tgEx('KB', 18, "pot", "Swing a una mà alternant", "Single arm swing - alternating", "GMax", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core"], sets: "3", reps: "10" });
  tgEx('KB', 19, "for", "Estocada lateral alterna amb KB", "Lateral lunge - alternating", "Adductors", 'Kettlebell', KBT, [KBT, M], { muscles: ["Quàdriceps", "GMax"], sets: "3", reps: "8/costat" });
  tgEx('KB', 20, "acc", "Curl martell amb kettlebells", "Hammer curl", "Bíceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["Avantbraç"], sets: "3", reps: "10" });
  tgEx('KB', 21, "for", "Estocada endavant alterna amb KB", "Forward lunge - alternating", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], sets: "3", reps: "8/cama" });
  tgEx('KB', 22, "for", "Estocada endavant amb KB per sobre del cap", "Single arm overhead forward lunge", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax", "Deltoides", "Core"], lat: "UL", sets: "3", reps: "6/cama" });
  tgEx('KB', 23, "act", "Figura de 8 amb kettlebell", "Figure 8", "Core", 'Kettlebell', KBT, [KBT, M], { muscles: ["Oblics"], reps: "10" });
  tgEx('KB', 24, "for", "Press de pit estirat amb genolls flexionats amb KB", "Chest press - hook lying position", "Pectoral", 'Kettlebell', KBT, [KBT, M], { muscles: ["Tríceps"], pos: "Ds", sets: "3", reps: "10" });
  tgEx('KB', 25, "pot", "Swing a una mà amb KB", "Swing - single arm", "GMax", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core"], lat: "UL", sets: "3", reps: "10/costat" });
  tgEx('KB', 26, "for", "Squat amb kettlebell", "Squat", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], sets: "3", reps: "10" });
  tgEx('KB', 27, "acc", "Pes mort romanès a una cama amb KB", "Romanian deadlift - single leg", "Isquiotibials", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], lat: "UL", sets: "3", reps: "8/cama" });
  tgEx('KB', 28, "act", "Windmill amb kettlebell", "Windmill", "Oblics", 'Kettlebell', KBT, [KBT, M], { muscles: ["Deltoides", "Isquiotibials"], lat: "UL", reps: "5/costat" });
  tgEx('KB', 29, "for", "Estocada enrere amb KB per sobre del cap", "Single arm overhead reverse lunge", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax", "Core"], lat: "UL", sets: "3", reps: "6/cama" });
  tgEx('KB', 30, "for", "Flexions sobre kettlebells", "Push-up", "Pectoral", 'Kettlebell', KBT, [KBT, M], { muscles: ["Tríceps"], pos: "Dp", sets: "3", reps: "10" });
  tgEx('KB', 31, "for", "Pistol squat altern amb KB", "Pistol squat - alternating", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], sets: "3", reps: "5/cama" });
  tgEx('KB', 32, "act", "Planxa de braços estirats sobre kettlebells", "Plank - straight arms", "Core", 'Kettlebell', KBT, [KBT, M], { pos: "Dp", cont: "ISO", sets: "3", reps: "30 s" });
  tgEx('KB', 33, "for", "Flexió i renegade row amb KB", "Push up and renegade row", "Pectoral", 'Kettlebell', KBT, [KBT, M], { muscles: ["Dorsal", "Core"], pos: "Dp", sets: "3", reps: "6" });
  tgEx('KB', 34, "pot", "Arrencada penjada a una mà amb KB", "Hang snatch - single arm", "Global", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax", "Deltoides"], lat: "UL", sets: "3", reps: "5/costat" });
  tgEx('KB', 35, "for", "Squat amb i sense kettlebell", "Squat - with and without weight", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], sets: "3", reps: "10" });
  tgEx('KB', 36, "acc", "Extensió de tríceps a una mà amb KB", "Single arm triceps extension", "Tríceps", 'Kettlebell', KBT, [KBT, M], { lat: "UL", sets: "3", reps: "10/costat" });
  tgEx('KB', 37, "pot", "Cargolada amb dues kettlebells", "Double kettlebell clean", "Global", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax"], sets: "4", reps: "5" });
  tgEx('KB', 38, "act", "Windmill amb el pes avall", "Windmill - weight low", "Oblics", 'Kettlebell', KBT, [KBT, M], { muscles: ["Isquiotibials"], lat: "UL", reps: "5/costat" });
  tgEx('KB', 39, "acc", "Turkish get-up", "Turkish get-up", "Core", 'Kettlebell', KBT, [KBT, M], { muscles: ["Deltoides", "GMax"], lat: "UL", sets: "2", reps: "3/costat" });
  tgEx('KB', 40, "pot", "Cargolada i press a una mà amb KB", "Clean and overhead press - single arm", "Global", 'Kettlebell', KBT, [KBT, M], { muscles: ["Deltoides"], lat: "UL", sets: "3", reps: "5/costat" });
  tgEx('KB', 41, "pot", "Push press a una mà amb KB", "Push press - single arm", "Deltoides", 'Kettlebell', KBT, [KBT, M], { muscles: ["Quàdriceps"], lat: "UL", sets: "3", reps: "5/costat" });
  tgEx('KB', 42, "for", "Estocades endavant alternes en front rack amb KB", "Forward lunges alternated - front rack", "Quàdriceps", 'Kettlebell', KBT, [KBT, M], { muscles: ["GMax", "Core"], sets: "3", reps: "8/cama" });
  tgEx('KB', 43, "pot", "Cargolada i envia a una mà amb KB", "Clean and jerk - single arm", "Global", 'Kettlebell', KBT, [KBT, M], { lat: "UL", sets: "3", reps: "4/costat" });
  tgEx('KB', 44, "for", "Press de pit a una mà estirat amb KB", "Single arm chest press - supine", "Pectoral", 'Kettlebell', KBT, [KBT, M], { muscles: ["Tríceps", "Core"], pos: "Ds", lat: "UL", sets: "3", reps: "8/costat" });
  tgEx('KB', 45, "pot", "Arrencada creuada amb KB", "Cross body snatch", "Global", 'Kettlebell', KBT, [KBT, M], { muscles: ["Oblics"], lat: "UL", sets: "3", reps: "5/costat" });
  tgEx('KB', 46, "pot", "Swing per sobre del cap amb pas lateral", "Overhead swing with side step", "GMax", 'Kettlebell', KBT, [KBT, M], { muscles: ["Deltoides"], sets: "3", reps: "10" });
  tgEx('KB', 47, "act", "Planxa lateral de braç estirat amb KB", "Side plank - straight arms", "Oblics", 'Kettlebell', KBT, [KBT, M], { muscles: ["Deltoides"], pos: "Dl", lat: "UL", reps: "20 s/costat" });
  tgEx('KB', 48, "pot", "Swing per sobre del cap amb elevació d'una cama", "Overhead swing with single leg lift", "GMax", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core"], sets: "3", reps: "8" });
  tgEx('KB', 49, "acc", "Sots press amb KB", "Sots press", "Deltoides", 'Kettlebell', KBT, [KBT, M], { muscles: ["Quàdriceps", "Core"], sets: "3", reps: "6" });
  tgEx('KB', 50, "acc", "Carry amb la KB cap per avall a una mà", "Bottom up carry - single arm", "Manegot rotador", 'Kettlebell', KBT, [KBT, M], { muscles: ["Core", "Avantbraç"], lat: "UL", sets: "3", reps: "20 m/costat" });
  // ── Mobility ball Technogym (9 exercicis) ──
  const MBT = 'Mobility ball Technogym';
  tgEx('MB', 1, 'mob', "Alliberament miofascial del dorsal · rodar", "Self myofascial release - lats roll", "Dorsal", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Dl" });
  tgEx('MB', 2, 'mob', "Alliberament miofascial de la planta del peu · rodar", "Self myofascial release - plantar roll", "Tren inferior", 'Alliberament miofascial', MBT, [MBT], { sets: "1", reps: "1'/costat", pos: "Bp" });
  tgEx('MB', 3, 'mob', "Alliberament miofascial del dorsal · cercles", "Self myofascial release - lats circles", "Dorsal", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Dl" });
  tgEx('MB', 4, 'mob', "Alliberament miofascial dels bessons · cercles", "Self myofascial release - calf circles", "Bessons i soli", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Sd" });
  tgEx('MB', 5, 'mob', "Alliberament miofascial dels glutis · cercles", "Self myofascial release - glutes circles", "GMax", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Sd" });
  tgEx('MB', 6, 'mob', "Alliberament miofascial de la cintilla iliotibial · rodar", "Self myofascial release - ilio-tibial roll", "Abductors", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Dl" });
  tgEx('MB', 7, 'mob', "Alliberament miofascial de l'espatlla · rodar", "Self myofascial release - shoulder roll", "Deltoides", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Dl" });
  tgEx('MB', 8, 'mob', "Alliberament miofascial de l'espatlla · cercles", "Self myofascial release - shoulder circles", "Deltoides", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Dl" });
  tgEx('MB', 9, 'mob', "Alliberament miofascial del quàdriceps · cercles", "Self myofascial release - quadriceps circles", "Quàdriceps", 'Alliberament miofascial', MBT, [MBT, 'Foam roller'], { sets: "1", reps: "1'/costat", pos: "Dp" });
  // ── Power Personal Technogym (38 exercicis) ──
  const PPT = 'Power Personal Technogym';
  tgEx('PP', 1, "for", "Squat amb banda", "Forward squat - band", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "3", reps: "10" });
  tgEx('PP', 2, "for", "Estocades multidireccionals", "Lunges - Multidirectional", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax", "Adductors"], sets: "3", reps: "6/cama" });
  tgEx('PP', 3, "act", "Crunch tocant les puntes dels peus", "Crunch - Toe touch", "Core", 'Power Personal', PPT, [PPT], { pos: "Ds", reps: "12" });
  tgEx('PP', 4, "pot", "Salt endavant amb banda", "Forward jump - band", "Tren inferior", 'Power Personal', PPT, [PPT], { sets: "3", reps: "5", intensity: "Màxima intenció" });
  tgEx('PP', 5, "act", "Pont de glutis amb els peus a la banda", "Glute bridge - feet in band", "GMax", 'Power Personal', PPT, [PPT], { muscles: ["Isquiotibials"], pos: "Ds", reps: "12" });
  tgEx('PP', 6, "acc", "Ocells al Power Personal", "Reverse fly", "Deltoides", 'Power Personal', PPT, [PPT], { muscles: ["Escàpula"], sets: "3", reps: "12" });
  tgEx('PP', 7, "act", "Pont de glutis amb cames estirades i peus a la banda", "Glute bridge - straight legs - feet in band", "Isquiotibials", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], pos: "Ds", reps: "10" });
  tgEx('PP', 8, "for", "Press de banca amb presa estreta", "Bench press - narrow grip", "Tríceps", 'Power Personal', PPT, [PPT], { muscles: ["Pectoral"], pos: "Ds", sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 9, "for", "Squat amb soft loops", "Forward squat - soft loops", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "3", reps: "10" });
  tgEx('PP', 10, "for", "Rem inclinat al Power Personal", "Row - bent over", "Dorsal", 'Power Personal', PPT, [PPT], { muscles: ["Bíceps"], sets: "3", reps: "10" });
  tgEx('PP', 11, "for", "Estocada enrere amb nanses", "Reverse lunge with handles", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "3", reps: "8/cama" });
  tgEx('PP', 12, "for", "Flexions amb soft loops", "Push-up - soft loops", "Pectoral", 'Power Personal', PPT, [PPT], { muscles: ["Tríceps", "Core"], pos: "Dp", sets: "3", reps: "10" });
  tgEx('PP', 13, "acc", "Curl i press", "Curl and press", "Bíceps", 'Power Personal', PPT, [PPT], { muscles: ["Deltoides"], sets: "3", reps: "10" });
  tgEx('PP', 14, "acc", "Curl martell altern al Power Personal", "Hammer curl - alternate", "Bíceps", 'Power Personal', PPT, [PPT], { muscles: ["Avantbraç"], sets: "3", reps: "10/costat" });
  tgEx('PP', 15, "acc", "Obertures al Power Personal", "Fly", "Pectoral", 'Power Personal', PPT, [PPT], { sets: "3", reps: "12" });
  tgEx('PP', 16, "act", "Crunch invers en planxa amb els peus a la banda", "Reverse crunch - plank position - feet in band", "Core", 'Power Personal', PPT, [PPT], { muscles: ["Flexors de maluc"], pos: "Dp", reps: "10" });
  tgEx('PP', 17, "acc", "Curl de bíceps en banc inclinat", "Arm curl - incline", "Bíceps", 'Power Personal', PPT, [PPT], { pos: "Sd", sets: "3", reps: "10" });
  tgEx('PP', 18, "for", "Estocada endavant alterna al Power Personal", "Forward lunge - alternate", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "3", reps: "8/cama" });
  tgEx('PP', 19, "act", "Flexió i crunch invers amb els peus a la banda", "Push-up and reverse crunch - feet in band", "Pectoral", 'Power Personal', PPT, [PPT], { muscles: ["Core"], pos: "Dp", reps: "8" });
  tgEx('PP', 20, "for", "Rem inclinat amb barra al Power Personal", "Row - bent over", "Dorsal", 'Power Personal', PPT, [PPT], { muscles: ["Bíceps", "Lumbar"], sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 21, "for", "Squat búlgar amb el peu de darrere a la banda", "Squat - rear foot in band", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], lat: "UL", sets: "3", reps: "8/cama" });
  tgEx('PP', 22, "pot", "Cargolada al Power Personal", "Clean", "Global", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "4", reps: "3" });
  tgEx('PP', 23, "pot", "Salt a una cama amb el peu de darrere a la banda", "Single leg jump - rear foot in band", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], lat: "UL", sets: "3", reps: "5/cama", intensity: "Màxima intenció" });
  tgEx('PP', 24, "for", "Press de banca pla al Power Personal", "Press on flat bench", "Pectoral", 'Power Personal', PPT, [PPT], { muscles: ["Tríceps", "Deltoides"], pos: "Ds", sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 25, "for", "Press Arnold dempeus", "Arnold press - standing", "Deltoides", 'Power Personal', PPT, [PPT], { muscles: ["Tríceps"], sets: "3", reps: "10" });
  tgEx('PP', 26, "for", "Estocada enrere alterna al Power Personal", "Backward lunge - alternate", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "3", reps: "8/cama" });
  tgEx('PP', 27, "acc", "Rem vertical al Power Personal", "Upright row", "Deltoides", 'Power Personal', PPT, [PPT], { muscles: ["Trapezi"], sets: "3", reps: "10" });
  tgEx('PP', 28, "for", "Press inclinat al Power Personal", "Incline press", "Pectoral", 'Power Personal', PPT, [PPT], { muscles: ["Deltoides", "Tríceps"], sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 29, "for", "Press militar assegut al Power Personal", "Overhead press - seated on bench", "Deltoides", 'Power Personal', PPT, [PPT], { muscles: ["Tríceps"], pos: "Sd", sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 30, "for", "Estocada lateral alterna al Power Personal", "Lateral lunge - alternate", "Adductors", 'Power Personal', PPT, [PPT], { muscles: ["Quàdriceps", "GMax"], sets: "3", reps: "6/costat" });
  tgEx('PP', 31, "for", "Pes mort elevat al Power Personal", "Deadlift - elevated", "GMax", 'Power Personal', PPT, [PPT], { muscles: ["Isquiotibials", "Quàdriceps"], sets: "3", reps: "6", intensity: "RIR 2" });
  tgEx('PP', 32, "for", "Front squat al Power Personal", "Front squat", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax", "Core"], sets: "3", reps: "6", intensity: "RIR 2" });
  tgEx('PP', 33, "for", "Squat al Power Personal", "Squat", "Quàdriceps", 'Power Personal', PPT, [PPT], { muscles: ["GMax"], sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 34, "acc", "Kickback de tríceps al Power Personal", "Triceps kick back", "Tríceps", 'Power Personal', PPT, [PPT], { sets: "3", reps: "12" });
  tgEx('PP', 35, "act", "Sit-up al Power Personal", "Sit up", "Core", 'Power Personal', PPT, [PPT], { pos: "Ds", reps: "12" });
  tgEx('PP', 36, "for", "Pes mort romanès al Power Personal", "Romanian deadlift", "Isquiotibials", 'Power Personal', PPT, [PPT], { muscles: ["GMax", "Lumbar"], sets: "3", reps: "8", intensity: "RIR 2" });
  tgEx('PP', 37, "acc", "Elevacions laterals assegut al Power Personal", "Lateral raise - seated", "Deltoides", 'Power Personal', PPT, [PPT], { pos: "Sd", sets: "3", reps: "12" });
  tgEx('PP', 38, "for", "Dominades amb presa ampla al Power Personal", "Wide grip chin-up", "Dorsal", 'Power Personal', PPT, [PPT], { muscles: ["Bíceps"], sets: "3", reps: "6", intensity: "RIR 2" });

  // ── Mancuernes Technogym (51 exercicis de l'app de Technogym: «Dumbbells» i, del 48 al 51, «Hexagon dumbbells») ──
  const db = (n, block, name, tg, gm, extra = {}) => tgEx('DB', n, block, name, tg, gm, 'Mancuernes', M, [M, KBT], extra);
  db(1, 'acc', "Elevacions laterals amb mancuernes", "Lateral raises", 'Deltoides', { sets: '3', reps: '12' });
  db(2, 'for', "Press d'espatlles assegut amb mancuernes", "Overhead press - seated on bench", 'Deltoides', { muscles: ['Tríceps'], pos: 'Sd', sets: '3', reps: '10', intensity: 'RIR 2' });
  db(3, 'for', "Press inclinat amb mancuernes", "Chest press - incline bench", 'Pectoral', { muscles: ['Deltoides', 'Tríceps'], pos: 'Ds', sets: '3', reps: '10', intensity: 'RIR 2' });
  db(4, 'for', "Press de pit en banc pla amb mancuernes", "Chest press - flat bench", 'Pectoral', { muscles: ['Tríceps', 'Deltoides'], pos: 'Ds', sets: '3', reps: '10', intensity: 'RIR 2' });
  db(5, 'for', "Rem a una mà amb mancuerna", "Single arm row", 'Dorsal', { muscles: ['Bíceps', 'Escàpula'], sets: '3', reps: '10/costat', lat: 'UL' });
  db(6, 'acc', "Curl alterne amb rotació amb mancuernes", "Twisting arm curl - alternated", 'Bíceps', { muscles: ['Avantbraç'], reps: '10/braç' });
  db(7, 'acc', "Curl amb rotació amb mancuernes", "Arm curl - twisting", 'Bíceps', { muscles: ['Avantbraç'] });
  db(8, 'for', "Estocada endavant alterna amb mancuernes", "Forward lunge - alternated", 'Quàdriceps', { muscles: ['GMax'], sets: '3', reps: '8/cama', lat: 'UL' });
  db(9, 'for', "Goblet squat amb mancuerna", "Goblet squat", 'Quàdriceps', { muscles: ['GMax', 'Core'], sets: '3', reps: '10' });
  db(10, 'for', "Squat sumo amb mancuernes", "Sumo squat", 'Quàdriceps', { muscles: ['Adductors', 'GMax'], sets: '3', reps: '10' });
  db(11, 'acc', "Press francès estirat amb mancuernes", "French press - supine", 'Tríceps', { pos: 'Ds' });
  db(12, 'acc', "Curl martell amb mancuernes", "Hammer curl", 'Bíceps', { muscles: ['Avantbraç'] });
  db(13, 'for', "Estocada enrere alterna amb mancuernes", "Backward lunge - alternated", 'Quàdriceps', { muscles: ['GMax'], sets: '3', reps: '8/cama', lat: 'UL' });
  db(14, 'acc', "Obertures en banc pla amb mancuernes", "Chest fly - flat bench", 'Pectoral', { muscles: ['Deltoides'], pos: 'Ds' });
  db(15, 'for', "Pes mort amb cames rígides amb mancuernes", "Stiff leg deadlift", 'Isquiotibials', { muscles: ['GMax', 'Lumbar'], sets: '3', reps: '10', intensity: 'RIR 2' });
  db(16, 'acc', "Obertures en banc inclinat amb mancuernes", "Chest fly - incline bench", 'Pectoral', { muscles: ['Deltoides'], pos: 'Ds' });
  db(17, 'acc', "Curl assegut amb mancuernes", "Arm curl - seated", 'Bíceps', { pos: 'Sd' });
  db(18, 'acc', "Elevacions frontals amb mancuernes", "Front raise", 'Deltoides', { muscles: ['Pectoral'] });
  db(19, 'acc', "Elevacions frontals alternes amb mancuernes", "Front raise - alternated", 'Deltoides', { muscles: ['Pectoral'], reps: '10/braç' });
  db(20, 'for', "Press per sobre del cap amb mancuernes", "Overhead press", 'Deltoides', { muscles: ['Tríceps', 'Core'], sets: '3', reps: '10', intensity: 'RIR 2' });
  db(21, 'for', "Squat búlgar amb mancuernes", "Bulgarian split squat", 'Quàdriceps', { muscles: ['GMax'], sets: '3', reps: '8/cama', lat: 'UL' });
  db(22, 'acc', "Elevacions laterals assegut amb mancuernes", "Lateral raise - seated", 'Deltoides', { pos: 'Sd' });
  db(23, 'for', "Rem inclinat amb mancuernes", "Bent over row", 'Dorsal', { muscles: ['Bíceps', 'Escàpula'], sets: '3', reps: '10', intensity: 'RIR 2' });
  db(24, 'acc', "Pullover estirat amb mancuerna", "Pull over - supine", 'Dorsal', { muscles: ['Pectoral', 'Tríceps'], pos: 'Ds' });
  db(25, 'acc', "Ocells en banc inclinat amb mancuernes", "Reverse fly - incline bench", 'Deltoides', { muscles: ['Escàpula', 'Trapezi'], pos: 'Dp' });
  db(26, 'act', "Sit-up amb mancuerna per sobre del cap", "Overhead sit up", 'Core', { muscles: ['Flexors de maluc'], pos: 'Ds', reps: '10' });
  db(27, 'acc', "Kickback de tríceps a una mà amb mancuerna", "Triceps kick back - single arm", 'Tríceps', { reps: '12/braç', lat: 'UL' });
  db(28, 'act', "Flexió lateral del tronc amb mancuerna", "Side bend", 'Oblics', { muscles: ['Core'], reps: '12/costat' });
  db(29, 'acc', "Ocells inclinat amb mancuernes", "Reverse fly - bent over", 'Deltoides', { muscles: ['Escàpula', 'Trapezi'] });
  db(30, 'for', "Squat sumo amb una mancuerna", "Sumo squat - single dumbbell", 'Quàdriceps', { muscles: ['Adductors', 'GMax'], sets: '3', reps: '10' });
  db(31, 'for', "Pes mort amb mancuernes", "Deadlift", 'GMax', { muscles: ['Isquiotibials', 'Quàdriceps'], sets: '3', reps: '10', intensity: 'RIR 2' });
  db(32, 'acc', "Ocells assegut amb mancuernes", "Reverse fly - seated", 'Deltoides', { muscles: ['Escàpula', 'Trapezi'], pos: 'Sd' });
  db(33, 'for', "Press Arnold amb mancuernes", "Arnold press", 'Deltoides', { muscles: ['Tríceps'], sets: '3', reps: '10', intensity: 'RIR 2' });
  db(34, 'acc', "Encongiments amb mancuernes", "Shrug", 'Trapezi', { sets: '3', reps: '12' });
  db(35, 'acc', "Curl alterne assegut amb mancuernes", "Alternated arm curl - seated", 'Bíceps', { pos: 'Sd', reps: '10/braç' });
  db(36, 'for', "Squat amb mancuernes", "Squat", 'Quàdriceps', { muscles: ['GMax'], sets: '3', reps: '10' });
  db(37, 'acc', "Extensió de tríceps per sobre del cap a una mà amb mancuerna", "Overhead arm extension - single arm", 'Tríceps', { reps: '12/braç', lat: 'UL' });
  db(38, 'acc', "Curl concentrat amb mancuerna", "Concentration curl", 'Bíceps', { pos: 'Sd', reps: '10/braç', lat: 'UL' });
  db(39, 'acc', "Kickback de tríceps amb mancuernes", "Triceps kick back", 'Tríceps', {});
  db(40, 'acc', "Curl martell i press per sobre del cap amb mancuernes", "Hammer curl to overhead press", 'Bíceps', { muscles: ['Deltoides', 'Tríceps'] });
  db(41, 'for', "Pes mort amb una mancuerna", "Deadlift - single dumbbell", 'GMax', { muscles: ['Isquiotibials'], sets: '3', reps: '10' });
  db(42, 'acc', "Curl martell recíproc amb mancuernes", "Hammer curl - reciprocal", 'Bíceps', { muscles: ['Avantbraç'], reps: '10/braç' });
  db(43, 'acc', "Curl recíproc amb mancuernes", "Arm curl - reciprocal", 'Bíceps', { reps: '10/braç' });
  db(44, 'acc', "Rem vertical amb mancuernes", "Upright row", 'Deltoides', { muscles: ['Trapezi'] });
  db(45, 'pot', "Thruster amb mancuernes", "Thruster", 'Quàdriceps', { muscles: ['Deltoides', 'GMax'], sets: '3', reps: '8' });
  db(46, 'acc', "Scaption amb mancuernes", "Scaption", 'Deltoides', { muscles: ['Escàpula', 'Manegot rotador'] });
  db(47, 'acc', "Elevació de talons amb mancuernes", "Calf raise", 'Bessons i soli', { sets: '3', reps: '15' });
  db(48, 'acc', "Extensió de tríceps per sobre del cap a dues mans amb mancuerna", "Arm extension overhead - two arms", 'Tríceps', {});
  db(49, 'acc', "Kickback de tríceps simultani amb mancuernes", "Triceps kick back - two arms", 'Tríceps', {});
  db(50, 'for', "Front squat amb una mancuerna", "Front squat - one dumbbell", 'Quàdriceps', { muscles: ['Core', 'GMax'], sets: '3', reps: '10' });
  db(51, 'for', "Estocada endavant amb mancuernes", "Forward lunge", 'Quàdriceps', { muscles: ['GMax'], sets: '3', reps: '8/cama', lat: 'UL' });

  // Material del centre als exercicis d'abans.
  const rename = { 'Barra': B, 'Mancuernes': M, 'KB': K, 'Politja': PT, 'Politja cònica': CO, 'Resistència pneumàtica (Keiser)': KS, 'Bike': 'Bike Technogym', 'Lliscadors': F };
  for (const e of list) if (rename[e.material]) e.material = rename[e.material];
  byId['X-FOR-07'].material = 'Premsa Technogym';
  for (const e of list) if (e.block === 'pot' && e.material === PC && /salt|jump|cmj|pogo|bound|snap|skater/i.test(`${e.name} ${e.cat}`)) e.material = 'Pliometria';

  // Músculs implicats (a més del principal) als exercicis de força.
  const muscles = {
    'X-FOR-01': ['GMax', 'Adductors'], 'X-FOR-02': ['GMax'], 'X-FOR-03': ['GMax'], 'X-FOR-04': ['GMax', 'Adductors'], 'X-FOR-05': ['Quàdriceps', 'GMax'],
    'X-FOR-06': ['GMax'], 'X-FOR-07': ['GMax'], 'X-FOR-08': ['Isquiotibials'], 'X-FOR-09': ['GMax', 'Lumbar'], 'X-FOR-10': ['Quàdriceps', 'Isquiotibials'],
    'X-FOR-11': ['Isquiotibials', 'Lumbar'], 'X-FOR-12': ['GMax', 'Lumbar'], 'X-FOR-13': ['Tríceps', 'Deltoides'], 'X-FOR-14': ['Tríceps'],
    'X-FOR-15': ['Tríceps', 'Pectoral'], 'X-FOR-16': ['Tríceps', 'Deltoides'], 'X-FOR-17': ['Bíceps'], 'X-FOR-18': ['Bíceps', 'Escàpula'],
    'X-FOR-19': ['Bíceps'], 'X-FOR-20': ['Bíceps'], 'X-FOR-21': ['Bíceps', 'Escàpula'], 'X-FOR-22': ['GMax'], 'X-FOR-23': ['GMax', 'Adductors'],
    'X-FOR-24': ['GMax'], 'X-FOR-25': ['GMax'], 'X-FOR-26': ['GMax'], 'X-FOR-28': ['Isquiotibials'], 'X-FOR-29': ['Isquiotibials'],
    'X-FOR-30': ['Isquiotibials'], 'X-FOR-31': ['Tríceps'], 'X-FOR-32': ['Tríceps', 'Deltoides'], 'X-FOR-33': ['Tríceps', 'Deltoides'],
    'X-FOR-34': ['Tríceps', 'Trapezi'], 'X-FOR-35': ['Bíceps', 'Escàpula'], 'X-FOR-36': ['Bíceps'], 'X-FOR-37': ['Bíceps'],
    'X-ACC-13': ['GMax'], 'X-ACC-04': ['GMax'], 'X-ACC-07': ['Tríceps'], 'X-ACC-02': ['Bíceps'],
  };
  for (const [id, m] of Object.entries(muscles)) if (byId[id] && !byId[id].muscles) byId[id].muscles = m;
  for (const e of list) if (!e.gm && /^Olímpics|^Balístic/.test(e.family || '')) e.gm = 'Global';

  // Materials amb què es pot fer cada exercici (el primer és el de per defecte).
  const byFamily = {
    'Squat bilateral': [B, M, K, KX, KS, G], 'Squat unilateral': [M, K, B, CO, KS, F, PC], 'Bisagra de maluc': [B, M, K, KX, PT, G],
    'Extensió de maluc': [B, M, G, KS], 'Empenta horitzontal': [B, M, PT, KS, G, PC], 'Empenta vertical': [B, M, K, KS, PT, G],
    'Tracció horitzontal': [B, M, PT, CO, KS, G], 'Tracció vertical': [PT, G, PC], 'Olímpics · cargolada': [B, M, K],
    'Olímpics · arrencada': [B, M, K], 'Olímpics · envia': [B, M, K], 'Balístic de maluc': [K, M], 'Salt vertical': ['Pliometria', KS, M, KX],
    'Pliometria reactiva': ['Pliometria'], 'Salt horitzontal i unilateral': ['Pliometria'], 'Llançaments': ['Med ball', KS],
    'Core · antiextensió': [F, 'Roda abdominal', G, 'Fitball'], 'Core · antirotació': [PT, KS, G, CO], 'Core · antiflexió lateral': [K, M, PT],
    'Glutis': [G, PC, PT], 'Adductors': ['Abductor/adductor 700 Technogym', PT, G, F, 'Banc'], 'Isquiotibials': [KS, F, 'Banc GHD', 'Fitball', PC],
    'Turmell i panxell': [M, K, 'Premsa Technogym', PC],
  };
  const byExercise = {
    'X-FOR-07': ['Premsa Technogym', 'Leg press Biostrength', KS], 'X-FOR-05': [K, M, B, KX], 'X-FOR-12': [B, G],
    'X-ACC-01': [CO, KX], 'X-ACC-02': [CO, PT, KS], 'X-ACC-03': [CO, F, PT], 'X-ACC-04': [KS, 'Premsa Technogym', 'Leg press Biostrength'],
    'X-ACC-05': [KS, 'Leg extension Technogym'], 'X-ACC-07': [KS, PT], 'X-ACC-08': [PT, G, KS], 'X-ACC-11': [PT, G, KS], 'X-ACC-13': [K, M, PT, CO],
    'X-MOB-14': ['Bike Technogym', 'AlterG', 'Skillmill'], 'X-CAL-08': ['Bike Technogym'],
  };
  for (const e of list) {
    const alt = e.materials || byExercise[e.id] || byFamily[e.family] || [];
    e.materials = [...new Set([e.material, ...alt].filter(Boolean))];
  }

  // Explicació de les respiracions que no en tenien.
  const cues = {
    'X-CAL-03': 'Inspira 4 s, aguanta 4 s, exhala 4 s i aguanta 4 s. Calma i concentració.',
    'X-CAL-04': 'Inspira 4 s pel nas, aguanta 7 s i exhala 8 s per la boca. Molt relaxant: ideal per acabar.',
    'X-CAL-05': 'Dues inspiracions pel nas (la segona curta) i una exhalació llarga per la boca. La manera més ràpida de baixar pulsacions.',
  };
  for (const [id, c] of Object.entries(cues)) if (byId[id] && !byId[id].cues) byId[id].cues = c;

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

  // Mètodes d'entrenament: què són, com es prescriuen i un exemple. Cada centre hi afegeix els seus apunts.
  const m = (id, name, blocks, aim, how, example) => ({ id, kind: 'method', name, blocks, aim, how, example, notes: '', source: '', seed: true });
  const methods = [
    m('M-01', 'Tradicional (sèries fixes)', ['for', 'acc'], 'Base de força i aprenentatge tècnic.', 'Mateixa càrrega i repeticions a totes les sèries, amb descans complet.', '3 × 6 · RIR 2 · 2\''),
    m('M-02', 'Piràmide ascendent', ['for'], 'Acostar-se a càrregues altes amb escalfament progressiu.', 'A cada sèrie puja la càrrega i baixa les repeticions.', '10 · 8 · 6 · 4 (RIR 3 → 1)'),
    m('M-03', 'Clúster', ['for', 'pot'], 'Més velocitat i qualitat amb càrregues altes, amb menys fatiga.', 'Divideix la sèrie en blocs curts amb 15-30 s de pausa entre ells.', '4 × (2+2+2) · 20" entre blocs · 3\' entre sèries'),
    m('M-04', 'Rest-pause', ['for', 'acc'], 'Molt volum efectiu en poc temps (hipertròfia).', 'Sèrie fins a RIR 0-1, 15-20 s de pausa i unes quantes repeticions més, 2-3 vegades.', '1 × 8 + 3 + 2 · 20"'),
    m('M-05', 'Excèntric accentuat', ['for', 'acc'], 'Força excèntrica, hipertròfia i adaptació del tendó.', 'Baixada lenta (3-5 s) o excèntrica amb més càrrega que la concèntrica (puja amb dues, baixa amb una; politja cònica).', '4 × 5 · tempo 4-0-1-0'),
    m('M-06', 'Isomètric', ['for', 'act', 'acc'], 'Força en un angle concret, analgèsia i tendó.', 'Aguantar la posició (yielding) o empènyer contra un objecte que no es mou (overcoming).', '4 × 30 s Spanish squat · 5 × 5 s màxim contra el rack'),
    m('M-07', 'Contrast (PAPE)', ['for', 'pot'], 'Potència: aprofitar la potenciació d\'un exercici pesat.', 'Exercici pesat seguit d\'un d\'explosiu del mateix patró, amb 1-4\' entre ells.', 'Back squat 3 × 3 RIR 2 + CMJ × 3'),
    m('M-08', 'Superset agonista-antagonista', ['for', 'acc'], 'Més feina en menys temps sense perdre rendiment.', 'Dos exercicis de músculs oposats seguits; el descans és en acabar tots dos.', 'Press de banca + Rem amb barra · 3 voltes · 2\''),
    m('M-09', 'Triset o circuit', ['acc', 'act'], 'Densitat i capacitat de treball.', 'Tres o més exercicis seguits, per voltes.', '3 voltes · 40" entre exercicis'),
    m('M-10', 'Basat en la velocitat (VBT)', ['for', 'pot'], 'Autoregular la càrrega amb l\'encoder.', 'Tria la càrrega per la velocitat objectiu i atura la sèrie quan la pèrdua de velocitat arriba al límit.', 'Squat a 0,75 m/s · PV 20 % · 4 sèries'),
    m('M-11', 'Caràcter de l\'esforç (CE)', ['for'], 'Controlar quant a prop del fallo es treballa.', 'Repeticions fetes de les possibles: CE 6(12) vol dir 6 repeticions amb una càrrega que en permetria 12.', '3 × CE 6(12)'),
    m('M-12', 'Resistència variable (gomes o cadenes)', ['for'], 'Accelerar tot el recorregut i sobrecarregar el final.', 'Gomes o cadenes perquè la resistència augmenti on el moviment és més fort.', 'Press de banca 70 % + gomes · 5 × 3'),
    m('M-13', 'Resistència pneumàtica (Keiser)', ['for', 'pot', 'acc'], 'Potència a velocitats altes sense inèrcia ni impacte.', 'La resistència d\'aire permet moure ràpid tot el recorregut; ideal per a potència i per a gent gran.', 'Leg press 3 × 6 · màxima intenció'),
    m('M-14', 'Inercial (politja cònica)', ['acc', 'for'], 'Sobrecàrrega excèntrica.', 'L\'energia de la concèntrica torna a l\'excèntrica: frenar-la és la feina.', '4 × 8 · frena l\'excèntrica'),
    m('M-15', 'Tempo', ['for', 'acc'], 'Control i temps sota tensió.', 'Es controla la durada de cada fase: excèntrica - pausa - concèntrica - pausa.', '3 × 6 · 3-1-X-0'),
    m('M-16', '1 i 1/4', ['for', 'acc'], 'Més temps a la part difícil del recorregut.', 'Una repetició completa més un quart de recorregut a la part més difícil.', '3 × 6'),
    m('M-17', 'Ondulant (DUP)', ['for'], 'Variar l\'estímul dins de la setmana.', 'Canvia el volum i la intensitat d\'una sessió a l\'altra: força, hipertròfia, potència.', 'Dl 5 × 3 · Dj 3 × 10 · Ds 6 × 2 explosiu'),
    m('M-18', 'Complex francès', ['pot'], 'Potència: del pesat a l\'explosiu.', 'Pesat → pliometria → càrrega lleugera explosiva → pliometria assistida.', 'Squat 85 % × 3 + CMJ × 5 + jump squat 20 % × 5 + salts assistits × 5'),
    m('M-19', 'EMOM', ['pot', 'acc'], 'Qualitat amb descans fix.', 'Cada minut, al principi, unes poques repeticions; descans la resta del minut.', 'EMOM 8\' · 3 salts'),
    m('M-20', 'Equilibri progressiu', ['acc'], 'Control postural i sistema vestibular.', 'De base estable a inestable, d\'ulls oberts a tancats, i afegint girs de cap i doble tasca.', '3 × 30 s/cama'),
    m('M-21', 'Escalfament RAMP', ['mob', 'act'], 'Preparar el cos de general a específic.', 'Raise (pujar temperatura), Activate (activar), Mobilise (mobilitzar), Potentiate (potenciar).', '8-12\' abans de la força'),
    m('M-22', 'Respiració parasimpàtica', ['cal'], 'Baixar pulsacions i començar la recuperació.', 'Exhalació més llarga que la inspiració, 3-5 minuts asseguts o estirats.', '4-6 · 3\''),
  ];

  return [
    mob, act, pot, forKnee, forHip, acc, cal, ...methods,
    session('T-SES-01', 'Sessió tipus · tren inferior (genoll)', 'Força de tren inferior · dominant de genoll', [mob, act, pot, forKnee, acc, cal]),
    session('T-SES-02', 'Sessió tipus · tren inferior (maluc)', 'Força de tren inferior · dominant de maluc', [mob, act, pot, forHip, acc, cal]),
  ];
})();
