# Instal·lació a Google (full de càlcul + Drive)

Temps aproximat: 20 minuts. Només cal fer-ho una vegada, amb el compte de Google del centre
(el que serà propietari de les dades).

Quan acabis tindràs:

- **Un full de càlcul** «EON Life · Base de dades» amb una pestanya per a clients, valoracions,
  sessions, registre d'exercicis, biblioteca i plantilles. S'omple sol des de l'app: cada test és una
  columna, cada valoració i cada sessió una fila. El fisio i la metgessa el poden consultar, filtrar
  i descarregar com un Excel. Les dades, però, s'omplen i es corregeixen sempre des de l'app
  (vegeu *Problemes freqüents*).
- **Una carpeta de Drive** «EON Life · Clients» amb una subcarpeta per client
  (`01 · Valoracions`, `02 · Vídeos`, `03 · Informes`) on van els vídeos i els PDF.
- **L'aplicació web** (un enllaç) que obriu a la tauleta, a l'ordinador o al mòbil.

---

## 1. Crear el full de càlcul

1. Entra a [drive.google.com](https://drive.google.com) amb el compte del centre.
2. Crea una carpeta nova, per exemple **EON Life**.
3. Dins de la carpeta: **Nou › Full de càlcul de Google**. Posa-li de nom **EON Life · Base de dades**.

## 2. Afegir el codi de l'aplicació

1. Al full de càlcul: menú **Extensions › Apps Script**. S'obre l'editor en una pestanya nova.
2. Canvia el nom del projecte (a dalt a l'esquerra) per **EON Life**.
3. **Code.gs**: esborra el que hi ha i enganxa-hi tot el contingut del fitxer
   [`apps-script/Code.gs`](../apps-script/Code.gs) d'aquest projecte.
4. **Index.html**: al costat de «Fitxers», prem **+ › HTML** i anomena'l exactament `Index`
   (l'editor hi afegeix `.html`). Esborra'n el contingut i enganxa-hi tot el fitxer
   [`apps-script/Index.html`](../apps-script/Index.html).
   > És un fitxer llarg (≈ 370 KB). Obre'l amb el botó «Raw» de GitHub, selecciona-ho tot i copia-ho.
5. **Configuració del projecte** (icona de la roda dentada) › activa
   **«Mostra el fitxer de manifest "appsscript.json" a l'editor»**. Torna a l'editor, obre
   `appsscript.json` i substitueix-ne el contingut pel de
   [`apps-script/appsscript.json`](../apps-script/appsscript.json).
6. Desa (icona del disquet o `Ctrl/Cmd + S`).

## 3. Preparar el full (una sola vegada)

1. A la barra de l'editor, al desplegable de funcions, tria **setup** i prem **▶ Executa**.
2. Google demanarà permisos: **Revisa els permisos › tria el compte del centre**.
   - Si surt «Google no ha verificat aquesta aplicació», prem **Opcions avançades › Ves a EON Life (no segur)**.
     És normal: l'aplicació és vostra i no està publicada a Google.
   - Permisos que demana i per què:
     *full de càlcul* (desar les dades), *Drive* (crear les carpetes dels clients i llistar-ne els vídeos),
     *adreça de correu* (saber qui ha fet cada canvi).
3. Quan acabi, torna al full de càlcul: hi veuràs les pestanyes noves i, a Drive, la carpeta
   **EON Life · Clients** al costat del full.

## 4. Publicar l'aplicació

1. A l'editor d'Apps Script: **Implementa › Nova implementació**.
2. A «Selecciona el tipus», tria **Aplicació web**.
3. Omple:
   - **Descripció**: `EON Life v1`
   - **Executa com a**: **L'usuari que accedeix a l'aplicació web**
     *(en anglès: Execute as › User accessing the web app)*
   - **Qui hi té accés**: **Qualsevol usuari amb un compte de Google**
     *(Who has access › Anyone with Google account)*, o el vostre domini si teniu Google Workspace.
4. **Implementa** i copia l'**URL de l'aplicació web** (acaba en `/exec`).

> Per què «l'usuari que accedeix»: cada professional entra amb el seu compte de Google i només
> pot veure les dades si el full de càlcul està compartit amb ell. Així el control d'accés és el
> de Drive de sempre, i al full queda registrat qui ha modificat cada fila.

## 5. Donar accés a l'equip

1. Comparteix el **full de càlcul** amb cada professional com a **Editor**.
2. Comparteix la carpeta **EON Life · Clients** amb el mateix equip com a **Editor**
   (perquè puguin crear carpetes de clients i pujar-hi vídeos).
3. Envia'ls l'URL de l'aplicació. El primer cop que l'obrin, Google els demanarà permisos
   (igual que al pas 3).

Els **clients no han d'entrar a l'app**. Per compartir-los els vídeos i els informes, a Drive
comparteix només **la seva carpeta** amb el seu correu, com a **Lector**.

## 6. Tauleta: l'app com una icona més

- **iPad (Safari)**: obre l'URL › botó Compartir › **Afegeix a la pantalla d'inici**.
- **Android (Chrome)**: obre l'URL › menú ⋮ › **Afegeix a la pantalla d'inici**.

Per gravar vídeos: grava amb la càmera de la tauleta i puja'ls amb l'app de **Google Drive** a la
carpeta `02 · Vídeos` del client. A l'app, al botó de vídeo de cada test, apareixen els vídeos
de la carpeta per enllaçar-los.

---

## Actualitzar l'aplicació (versions noves)

1. Substitueix el contingut de `Code.gs` i `Index.html` pels nous.
2. **Implementa › Gestiona les implementacions** › icona del llapis › **Versió: Nova versió** › **Implementa**.
   L'URL no canvia.

## Problemes freqüents

| Què passa | Què fer |
|---|---|
| «No s'han pogut carregar les dades» | El full no està compartit amb aquest compte, o no s'ha executat `setup`. |
| «Falta preparar el full de càlcul» | Executa `setup` des de l'editor (pas 3). |
| No es crea la carpeta del client | La carpeta «EON Life · Clients» no està compartida com a Editor amb aquest professional. |
| Dues persones editen la mateixa sessió | Es queda l'últim canvi desat. Al menú lateral hi ha **Actualitza les dades** per veure els canvis dels altres. |
| Vull veure qui ha canviat una fila | Columnes `updated_by` i `updated_at` de cada pestanya. |
| He corregit una cel·la directament al full i a l'app no surt | L'app no llegeix les columnes del full, només el que s'hi ha desat des de l'app, i quan es torna a desar aquell registre la fila sencera es sobreescriu. Corregiu-ho des de l'app (fitxa del client o **Base de dades**). |
| Un company no veu el que acabo d'afegir | Les dades es carreguen en obrir l'app. Que premi **Actualitza les dades** al menú lateral. |

## Dades i privacitat

Les dades de salut dels clients són dades de categoria especial (RGPD). Recomanacions:

- Feu servir un compte de **Google Workspace** del centre (amb l'acord de tractament de dades de
  Google acceptat) en lloc d'un compte personal.
- Recolliu el **consentiment informat** del client per a la valoració, els vídeos i el seguiment.
- Compartiu amb el client només la seva carpeta i en mode lectura.
- Res no es guarda en servidors externs: tot queda al Drive del centre.
