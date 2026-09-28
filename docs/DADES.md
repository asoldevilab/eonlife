# Com es guarden les dades i com es personalitza

## Full de càlcul

| Pestanya | Una fila per… | Columnes llegibles |
|---|---|---|
| `Pacients` | client | Nom, cognoms, perfil, professional, estat, objectiu, antecedents, dates IQ i lesió, carpeta Drive… |
| `Valoracions` | valoració | Una columna per test i costat (`ROM RI maluc D (°)`, `Knee-to-wall E (cm)`, `Força quàdriceps D (N/kg)`, `YBT composite D (%)`, `CMJ millor altura (cm)`, `Squat (puntuació)`…), punts d'atenció i conclusions |
| `Sessions` | sessió | Data, setmana, nº, professional, objectiu, son/energia/dolor, RPE, minuts, **càrrega (UA)**, observacions, decisió i un resum de cada bloc |
| `Registre_exercicis` | exercici de cada sessió | Bloc, ordre (4.2), exercici, grup muscular, contracció, posició, lateralitat, material, sèries, reps, càrrega, intensitat, descans, fet |
| `Biblioteca` | exercici creat o modificat | Els exercicis de base viuen dins l'app; aquí només hi ha els nous o editats |
| `Plantilles` | plantilla creada o modificada | Igual que la biblioteca |
| `Configuracio` | — | Professionals, nom del centre i noms dels blocs |

Les sis primeres columnes de cada pestanya són tècniques:
`id`, `patient_id`, `updated_at`, `updated_by`, `deleted` i `data_json` (amagada, amb el registre
complet). **No les modifiqueu a mà.** Les columnes llegibles es poden filtrar, ordenar i fer-ne
gràfics o taules dinàmiques; si les editeu a mà, l'app les tornarà a escriure la propera vegada que
es desi aquell registre.

Quan s'elimina alguna cosa a l'app, la fila no s'esborra: es marca `deleted = TRUE` i es pot
recuperar.

## Canviar el protocol de valoració

Tot el protocol és a [`app/src/js/02-catalog.js`](../app/src/js/02-catalog.js):

- `PROTOCOL` — seccions, grups i tests (tipus: `bi` dreta/esquerra, `single`, `biSelect`,
  `select`, `scoreBi`, i els grups especials `ybt`, `jumps`, `encoder`, `bike`, `patterns`).
- `PATTERNS` — els 7 patrons de la Sessió 1 amb «Què observem», criteris de − i −−, execució i adaptació.
- `PROFILE_TESTS` — tests per perfil A/B/C.
- `THRESHOLDS` — llindars (asimetria 10 % / 15 %, knee-to-wall 8 cm / 4 cm, Y-Balance 4 cm, re-test 3 mesos).
- `BLOCKS` — els 6 blocs de la sessió i els focus suggerits.

La biblioteca inicial d'exercicis i plantilles és a [`app/src/js/03-library.js`](../app/src/js/03-library.js).

Després de qualsevol canvi: `npm run build` i `npm test`, i actualitzeu `Index.html` a Apps Script
(vegeu [INSTALLACIO.md](INSTALLACIO.md#actualitzar-laplicació-versions-noves)).

## Estructura del codi

```
app/
  build.mjs            genera l'app en un sol fitxer HTML
  src/index.html       plantilla
  src/styles.css       estils (colors EON, tema clar/fosc, impressió A4)
  src/js/
    01-util.js         dates, números en català, CSV
    02-catalog.js      protocol de valoració i blocs
    03-library.js      exercicis i plantilles de base
    04-calc.js         càlculs, punts d'atenció i columnes del full
    05-store.js        dades i desament (Google o navegador)
    06-demo.js         clients ficticis per provar
    1x-*.js            components, gràfics i navegació
    2x-*.js            pantalles
    99-app.js          arrencada
  test/                tests (node --test) i proves amb navegador (Playwright)
apps-script/
  Code.gs              servidor per a Google Apps Script
  Index.html           app generada (no editar a mà)
  appsscript.json      manifest
dist/eonlife.html      la mateixa app per obrir directament (mode prova)
```

## Proves

```bash
npm run build      # genera dist/eonlife.html i apps-script/Index.html
npm test           # càlculs, columnes del full i servidor Apps Script (simulat)
npm run test:e2e   # recorre totes les pantalles amb Chromium, en local i en mode Google
```
