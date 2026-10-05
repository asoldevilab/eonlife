# Com es guarden les dades i com es personalitza

## Full de càlcul (Excel de Microsoft 365 o full de Google)

Les dues versions fan servir la mateixa estructura. A Microsoft 365 és l'Excel
«EON Life · Base de dades.xlsx» de la carpeta compartida, amb una **taula d'Excel** a cada pestanya
(`tPacients`, `tValoracions`…); a Google, el full de càlcul «EON Life · Base de dades».

| Pestanya | Una fila per… | Columnes llegibles |
|---|---|---|
| `Pacients` | client | Nom, cognoms, servei (valoració inicial / seguiment membership), professional, estat, objectiu, antecedents, dates IQ i lesió, carpeta del client, alçada, pes, dominància, nivell d'activitat, esport, professió, disponibilitat, condicions de salut, limitacions per entrenar, medicació, contacte d'emergència… |
| `Valoracions` | valoració | Una columna per test i costat (`ROM RI maluc D (°)`, `Knee-to-wall E (cm)`, `Força quàdriceps D (N/kg)`, `YBT composite D (%)`, `CMJ millor altura (cm)`, `Squat (puntuació)`…), punts d'atenció i conclusions |
| `Sessions` | sessió | Data, setmana, nº, professional, objectiu, pla i nº de sessió del pla, son/energia/dolor, RPE, minuts, **càrrega (UA)**, observacions, decisió i un resum de cada bloc (focus, mètode i exercicis) |
| `Registre_exercicis` | exercici de cada sessió | Bloc, subbloc (Bloc 1, Bloc 2…), ordre (4.2), exercici, grup muscular, contracció, posició, lateralitat, material, sèries, reps, càrrega, intensitat, descans, fet i, si s'ha fet servir, l'encoder ADR (V 1a rep, pèrdua de velocitat, potència) i ADR Jumping (altura del salt) |
| `Biblioteca` | exercici creat o modificat | Els exercicis de base viuen dins l'app; aquí només hi ha els nous o editats (amb la família de progressió i el nivell) |
| `Plantilles` | plantilla, mètode o pla d'entrenament creat o modificat | Nom, tipus (*Bloc*, *Sessió*, *Mètode* o *Pla*), bloc, exercicis, descripció i client (als plans) |
| `Configuracio` | — | Professionals, nom del centre i noms dels blocs |

Les sis primeres columnes de cada pestanya són tècniques:
`id`, `patient_id`, `updated_at`, `updated_by`, `deleted` i `data_json` (amagada, amb el registre
complet; a l'Excel, si un registre és molt llarg continua a `data_json_2`…`data_json_5`). **No les modifiqueu a mà.** Les columnes llegibles es poden filtrar, ordenar i fer-ne
gràfics o taules dinàmiques; si les editeu a mà, l'app les tornarà a escriure la propera vegada que
es desi aquell registre.

Quan s'elimina alguna cosa a l'app, la fila no s'esborra: es marca `deleted = TRUE` i es pot
recuperar.

## Canviar el protocol de valoració

Tot el protocol és a [`app/src/js/02-catalog.js`](../app/src/js/02-catalog.js):

- `PROTOCOL` — seccions, grups i tests (tipus: `bi` dreta/esquerra, `single`, `biSelect`,
  `select`, `scoreBi`, i els grups especials `ybt`, `jumps`, `encoder`, `bike`, `patterns`).
- `PATTERNS` — els 7 patrons de la Sessió 1 amb «Què observem», criteris de − i −−, execució i adaptació.
- `THRESHOLDS` — llindars (asimetria 10 % / 15 %, knee-to-wall 8 cm / 4 cm, Y-Balance 4 cm, re-test 3 mesos).
- `BLOCKS` — els 6 blocs de la sessió i els focus suggerits.

La biblioteca inicial d'exercicis i plantilles és a [`app/src/js/03-library.js`](../app/src/js/03-library.js).

Després de qualsevol canvi: `npm run build` i `npm test`. Amb Microsoft 365 i GitHub Pages, la versió nova es
publica sola en arribar a `main`; amb Google, actualitzeu `Index.html` a Apps Script
(vegeu [INSTALLACIO.md](INSTALLACIO.md#actualitzar-laplicació-versions-noves)).

## Els Excel que fa l'app (per client)

A banda de la base de dades, l'app genera sola uns Excel de **lectura** per a cada client (vegeu
[GUIA-US.md](GUIA-US.md#els-excel-del-client)). A Microsoft 365 es desen a la carpeta del client; a la versió local es
descarreguen.

| Fitxer | Carpeta | Contingut |
|---|---|---|
| `sessio_<nomcognoms>_<aaaammdd>_<NN>.xlsx` | `Sessions` | fulls *Sessió* (dades, wellness, tancament, blocs, vídeos), *Exercicis* i, si n'hi ha, *Encoder*; també per a les sessions planificades i les previstes als plans |
| `valoracioinicial_…`, `retest_…`, `controlmesures_…`, `valoracioalta_…` | `Valoracions` | *Resum*, *Comparació* (amb l'anterior), *Mobilitat*, *Força*, *Rendiment*, *Patrons* i *Altres mesures* |
| `visiogeneral_<nomcognoms>_01.xlsx` | `Sessions` | *Resum*, un calendari i un detall per cada mes («Octubre 2026», «Octubre 2026 · detall») i *Registre* |

Els Excel porten **fórmules** (càrrega = RPE × minuts, asimetries, N/kg, composite del Y-Balance, resums del registre,
dies des de la lesió…) amb el valor ja calculat, i el format condicional ressalta el dia d'avui. Es protegeixen
sense contrasenya perquè no es canviïn per error. Les dades **no es llegeixen mai** d'aquests fitxers: l'app és l'única
font; cada canvi els refà (només puja els que han canviat) i retira els que ja no toquen (una sessió eliminada o canviada
de dia). Només es toquen fitxers amb aquests noms.

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
    05-store.js        dades i desament (Microsoft 365, Google o navegador)
    06-demo.js         clients ficticis per provar
    07-dbcols.js       taules de la pantalla Base de dades
    08-xlsx.js         generador de fitxers .xlsx (plantilla de l'Excel de la base de dades)
    08-xlsxdoc.js      escriptor d'Excel amb estils (colors, combinades, fórmules, enllaços, format condicional)
    08-excel-common.js estils i peces comunes dels Excel que fa l'app
    09-m365.js         Microsoft 365: inici de sessió, Excel com a base de dades, carpetes i vídeos
    09-names.js        carpetes i noms dels fitxers de cada client (nomcognoms, aaaammdd, número de sèrie)
    09-excel-*.js      Excel de cada sessió, de cada valoració i de la visió general del client
    09-sync.js         pujada automàtica dels Excel a la carpeta del client (cua, reintents, estat)
    1x-*.js            components, gràfics i navegació
    2x-*.js, 3x-*.js   pantalles (31-connect.js: connexió amb Microsoft 365)
    99-app.js          arrencada
  m365.config.json     codis de l'app de Microsoft Entra i enllaç de la carpeta
  test/                tests (node --test) i proves amb navegador (Playwright)
apps-script/
  Code.gs              servidor per a Google Apps Script
  Index.html           app generada (no editar a mà)
  appsscript.json      manifest
dist/eonlife.html      la mateixa app per obrir directament (mode prova)
dist/m365/index.html   la versió per publicar al web amb Microsoft 365
.github/workflows/     publicació automàtica a GitHub Pages
```

## Proves

```bash
npm run build      # genera dist/eonlife.html, dist/m365/index.html i apps-script/Index.html
npm test           # càlculs, columnes del full, Apps Script, Microsoft 365 (simulat) i els Excel de cada client
npm run test:e2e   # recorre totes les pantalles amb Chromium: local, Google i Microsoft 365
```

Per generar la versió de prova per a un enllaç privat de claude.ai (sense botons d'imprimir ni de
descarregar, que aquell visor no permet): `node app/build.mjs --artifact sortida.html`.
