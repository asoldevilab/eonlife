# Posar-la en marxa amb Microsoft 365

Aquesta és la versió per a un centre que treballa amb **Microsoft 365** (correu, OneDrive, SharePoint o Teams).
L'app és la mateixa, però les dades es desen a la **carpeta compartida** de l'empresa:

```
📁 Carpeta compartida (la que us dona informàtica)
├── 📊 EON Life · Base de dades.xlsx      ← totes les dades, com un Excel
└── 📁 EON Life · Clients
    ├── 📁 Puig, Laura · P-…
    │   ├── 📊 seguiment_laurapuig_01.xlsx  ← l'Excel del client: un full per mes amb les sessions i les valoracions
    │   ├── 📁 Valoracions                ← PDF de Kinvent, informe mèdic i fotos
    │   │   └── 📁 Vídeos valoracions     ← els vídeos dels tests
    │   └── 📁 Sessions
    │       └── 📁 Vídeos sessions d'entrenament
    └── 📁 …
```

Els noms dels fitxers són sempre en minúscules, sense accents ni espais, amb la data com a *any-mes-dia* i un número
de sèrie (`_01`, `_02`…) per si n'hi ha més d'un el mateix dia:

| Què | Exemple |
|---|---|
| Excel del client (sessions i valoracions) | `seguiment_lauravidalserra_01.xlsx` |
| Vídeo d'un exercici | `hipthrust_lauravidalserra_20261002_01.mp4` |
| Vídeo o foto d'un test | `singlelegsquatdreta_lauravidalserra_20260702_01.mp4` · `testthomasdreta_lauravidalserra_20260702_01.jpg` |
| Informe de Kinvent / informe mèdic | `informekinvent_lauravidalserra_20260702_01.pdf` · `informemedic_lauravidalserra_20260702_01.pdf` |

**L'Excel** té una pestanya per a cada tipus de dada: *Pacients*, *Valoracions*, *Sessions*,
*Registre_exercicis*, *Biblioteca*, *Plantilles* i *Configuracio*. Cada valoració o sessió és una fila i cada test,
una columna: dinamometria (K-Push), mobilitat (K-Move), Y-Balance, salts (My Jump), patrons…
S'omple sol mentre l'equip treballa amb l'app a la tauleta.

Tothom qui tingui accés a la carpeta pot obrir l'Excel per mirar-lo, filtrar-lo o descarregar-lo.
Les dades, però, **s'omplen i es corregeixen sempre des de l'app**: si es canvia una cel·la directament a
l'Excel, l'app no la llegeix i es perd la pròxima vegada que es desi aquell registre.

## L'Excel de cada client (es fa sol)

A més de la base de dades, l'app **fa i manté sola un Excel per client** (`seguiment_<nomcognoms>_01.xlsx`, a
l'arrel de la carpeta del client), amb el format de l'Excel de control que feia servir l'equip (un full per mes amb
les setmanes en columnes) i els colors de l'app. No cal obrir-lo ni omplir-lo: tot es registra a l'app i l'Excel es
refà quan hi ha canvis. Pestanyes:

- **Resum**: sessions fetes i pendents, càrrega total, RPE i wellness mitjans, perfil del client, dates clau (amb els
  dies que fa de la lesió o l'operació), plans, valoracions (amb l'enllaç al detall) i càrrega setmanal.
- **Valoracions**: totes les valoracions l'una al costat de l'altra (dreta i esquerra) i el **canvi entre les dues
  últimes** (millora en verd, empitjora en vermell).
- **Un full per mes** (`Oct26`, `Nov26`…): a dalt, el **calendari** de cada setmana amb la sessió de cada dia i el seu
  estat, l'objectiu i el focus de cada bloc, l'RPE, el temps, la **càrrega (RPE × minuts)**, el wellness, el dolor, les
  observacions i el total de la setmana; a sota, **cada sessió sencera** (dia, professional, objectiu, wellness i els
  exercicis de cada bloc amb GM · contracció · posició · lateralitat · exercici · material · càrrega · sèries ·
  repeticions · observacions, l'encoder sèrie a sèrie, els enllaços als vídeos i el tancament). Hi surten les sessions
  fetes, les **planificades**, les que han quedat **sense tancar** i les **previstes al pla**, cadascuna amb el seu color.
- **Registre**: una fila per sessió, per filtrar i ordenar (amb l'enllaç a la sessió dins del seu mes).
- **Una pestanya per valoració** (`Val. inicial 02-07-26`, `Re-test 01-10-26`…): resum amb els indicadors i els punts
  d'atenció, conclusions, i tots els tests (mobilitat, força, Y-Balance, salts, encoder, bicicleta, patrons de
  moviment i altres mesures) amb els enllaços a les fotos, els vídeos i el PDF de Kinvent.

L'Excel es puja sol a la carpeta uns segons després de l'últim canvi (i en acabar una sessió); a la fitxa del client,
sota el nom, es veu si és **al dia** o pendent, amb el botó *Puja'l ara* i el menú **Excel** (obre l'Excel o les
carpetes, o descarrega'l). A més, **un cop al dia** (en obrir l'app o si es deixa oberta de nit) es refà l'Excel dels
clients que han entrenat o tenen sessions previstes en els últims 45 dies, perquè *Sense tancar*, la propera sessió o el
calendari del mes siguin sempre els d'avui encara que ningú hagi tocat res. Cada pujada **substitueix** el fitxer
anterior (sense còpies repetides). La primera vegada que s'obre aquesta versió, l'app refà l'Excel de **tots** els
clients i retira els que feia abans (un per sessió i un per valoració a *Sessions* i *Valoracions*, i la visió general),
que queden a la paperera de reciclatge de OneDrive/SharePoint. L'app **no toca mai cap altre fitxer** de la carpeta: només els Excel amb aquests noms. A
*Configuració › Excel de cada client* es pot **pausar** la pujada automàtica o tornar-los a fer tots. Els fulls estan
protegits contra escriptura (sense contrasenya) perquè ningú els canviï per error: al *Registre* es pot filtrar i ordenar
sense treure res; si es vol escriure en un altre lloc, cal treure la protecció, però els canvis es perdrien la pròxima
vegada que l'app refaci el fitxer.

### Planificar sessions per endavant

A *Seguiment mensual* de cada client, **Planifica el mes** crea d'una vegada les sessions d'un mes (per exemple,
dilluns, dimecres i divendres), cadascuna partint de l'última sessió d'aquell dia de la setmana, d'una plantilla o en
blanc, i amb la progressió d'exercicis que es triï. **Copia la setmana** a les setmanes següents repeteix una setmana
dissenyada. Les sessions queden planificades, es poden ajustar una a una i surten al full del mes de l'Excel del client.

---

## El que cal (una sola vegada)

| Qui | Què | Temps |
|---|---|---|
| Informàtica | 1. Crear la carpeta compartida i donar-hi accés d'**edició** a l'equip | 5 min |
| Informàtica | 2. Registrar l'app a **Microsoft Entra** i passar-vos dos codis | 10 min |
| Vosaltres o informàtica | 3. Publicar la pàgina de l'app (una adreça web) | 10 min |
| El primer professional | 4. Obrir l'app, entrar i prémer **Prepara la carpeta** | 2 min |

### 1. La carpeta compartida

- Millor en un **lloc de SharePoint o un canal de Teams** del centre que a l'OneDrive personal d'algú: així les
  dades són de l'empresa encara que algú marxi.
- Cada professional que faci servir l'app necessita permís d'**edició** a la carpeta.
- Copieu-ne l'enllaç: obriu la carpeta al navegador › **Copia l'enllaç** (o l'adreça de la barra).

### 2. Registrar l'app a Microsoft Entra (ho fa l'administrador de Microsoft 365)

1. Entreu a [entra.microsoft.com](https://entra.microsoft.com) amb un compte d'administrador.
2. **Identitat › Aplicacions › Registres d'aplicacions › Registre nou**
   *(Identity › Applications › App registrations › New registration)*:
   - **Nom**: `EON Life`
   - **Tipus de compte**: *Només els comptes d'aquest directori organitzatiu (un sol inquilí)*
   - **URI de redirecció**: plataforma **Aplicació d'una sola pàgina (SPA)** i l'adreça on es publicarà l'app
     (pas 3), per exemple `https://asoldevilab.github.io/eonlife/` — exactament igual, amb la barra final.
3. **Permisos de l'API › Afegeix un permís › Microsoft Graph › Permisos delegats**:
   `Files.ReadWrite.All`, `User.Read`, `offline_access`, `openid`, `profile`.
   Després, **Concedeix el consentiment de l'administrador** per al directori.
4. A **Informació general** hi ha els dos codis que necessiteu:
   - **Id. de l'aplicació (client)**
   - **Id. del directori (inquilí)**

> **Per què aquests permisos.** L'app només actua en nom de la persona que ha entrat i només pot tocar les
> carpetes on aquesta persona ja té permís. *Files.ReadWrite.All* és el permís de Microsoft per treballar amb
> fitxers compartits (l'Excel i les carpetes dels clients). No hi ha cap servidor intermedi: la tauleta parla
> directament amb Microsoft 365.

### 3. Publicar la pàgina de l'app

L'app és un sol fitxer web: [`dist/m365/index.html`](../dist/m365/index.html). No conté cap dada (les dades són
a la vostra carpeta), així que es pot publicar en qualsevol allotjament web amb `https://`:

- **GitHub Pages (gratuït, ja preparat en aquest projecte).** Quan aquests canvis siguin a la branca `main`:
  *Settings › Pages › Build and deployment › Source: GitHub Actions*. Cada canvi a `main` es publica sol a
  `https://asoldevilab.github.io/eonlife/`.
- **Azure Static Web Apps** o el servidor web de l'empresa: pugeu-hi el fitxer `dist/m365/index.html`.

L'adreça final ha de ser la mateixa que s'ha posat com a URI de redirecció al pas 2.

**Els codis.** Hi ha dues maneres de posar-los:

- **Recomanada:** escriure'ls a [`app/m365.config.json`](../app/m365.config.json) i tornar a generar l'app
  (`node app/build.mjs`). Si hi poseu també l'enllaç de la carpeta (`folderUrl`), ningú no l'haurà d'enganxar.
  ```json
  { "clientId": "Id. de l'aplicació", "tenantId": "Id. del directori", "folderUrl": "https://…sharepoint.com/…" }
  ```
- **Sense tocar res:** si el fitxer no porta codis, l'app els demana el primer cop a cada tauleta.

### 4. Primer ús

1. Obriu l'adreça de l'app a la tauleta.
2. **Inicia la sessió amb Microsoft** amb el compte del centre.
3. Si cal, enganxeu l'enllaç de la carpeta compartida.
4. El primer cop per a tot el centre: **Prepara la carpeta**. Es creen l'Excel i la carpeta *EON Life · Clients*.
5. Instal·leu l'app a la tauleta perquè surti com una icona més i s'obri a pantalla completa:
   a Android (també Xiaomi), amb **Chrome** › *menú ⋮ › Instal·la l'aplicació* (o *Afegeix a la pantalla d'inici*);
   a l'iPad, amb Safari › *Compartir › Afegeix a la pantalla d'inici*.

A partir d'aquí, cada tauleta recorda la sessió. Per seguretat, Microsoft demana tornar a entrar més o menys un
cop al dia (normalment és un sol clic). Els canvis que no s'han pogut desar es guarden a la tauleta i s'envien en
tornar a entrar.

---

## Donar accés

- **L'equip**: cadascú entra a l'app amb el seu compte de Microsoft. Només cal que tingui permís d'edició a la
  carpeta compartida. A l'Excel, les columnes `updated_by` i `updated_at` diuen qui ha fet cada canvi i quan.
- **Qui només ha de mirar les dades**: n'hi ha prou de compartir-li l'Excel com a lector (*Persones de
  l'organització amb l'enllaç* o *Persones concretes*).
- **Els clients no entren a l'app.** Per compartir-los els vídeos i els informes, a SharePoint/OneDrive compartiu
  només **la seva carpeta** (*EON Life · Clients › el seu nom*) amb el seu correu, en mode lectura.
  Perquè es pugui compartir amb correus de fora de l'empresa, informàtica ha de tenir activat l'ús compartit
  extern en aquell lloc de SharePoint.

## Vídeos des de la tauleta

A cada test de la valoració hi ha el botó de **vídeo**:

- **Grava ara** obre la càmera de la tauleta. En acabar de gravar, el vídeo es puja sol a *Valoracions › Vídeos
  valoracions* de la carpeta del client (amb el nom `test_client_data_01.mp4`) i queda enllaçat al test. No cal
  fer res més.
- **Tria de la galeria** fa el mateix amb un vídeo que ja és a la tauleta.

També es poden pujar amb l'app de OneDrive i triar-los després de la llista *Vídeos de la carpeta*.

A les **sessions**, cada exercici té el mateix botó (*Grava el client*): el vídeo va a *Sessions › Vídeos sessions
d'entrenament* (amb el nom `exercici_client_data_01.mp4`) i queda
enllaçat a l'exercici. Els **vídeos de demostració** del professional són enllaços de YouTube (**No llistat**) i es
desen a la biblioteca; no ocupen espai a la carpeta.
A l'**informe**, els vídeos surten amb la miniatura (es reprodueixen dins de l'informe) i, en paper o PDF, amb un
codi QR per obrir-los amb el mòbil.

## Informes de Kinvent (PDF)

L'app de Kinvent exporta l'informe en PDF i només l'ofereix a les apps de la tauleta que obren PDF.

- **Amb l'app d'EON Life:** a Kinvent, *Compartir › Files by Google* (desa el PDF a la tauleta). Després, a la
  valoració del client, **Informes i fitxers › Adjunta l'informe de Kinvent** (o *Adjunta el PDF* a les targetes
  de K-Push i K-Move). El PDF es desa sol a *Valoracions* de la carpeta del client (`informekinvent_…_01.pdf`) i queda
  enllaçat a la valoració, a l'Excel de la valoració i a la base de dades (columna *Informes adjunts*).
- **Directament a OneDrive:** instal·leu l'app **Microsoft OneDrive** a la tauleta i entreu amb el compte del centre.
  A partir d'aquí, OneDrive surt a la llista de *Compartir* de Kinvent.

Els números de Kinvent (dreta, esquerra) s'escriuen a la valoració, a Mobilitat (K-Move) i Força (K-Push):
l'app calcula l'asimetria i els N/kg i els posa a les columnes de l'Excel. Un PDF no omple les columnes sol.

## Informe de la doctora

A la fitxa del client, **Informe de la doctora › Desa el PDF a la carpeta** puja l'informe original a
*Valoracions* (`informemedic_…_01.pdf`). El text (enganxat o d'un Word) omple l'objectiu, el motiu de consulta, els antecedents i les
dates de la intervenció i la lesió. Si la política del centre és que la informació clínica només sigui a Nubimed,
copieu-hi només el que calgui per a l'entrenament.

## Problemes freqüents

| Què diu l'app | Què fer |
|---|---|
| «L'adreça d'aquesta app no està registrada a Microsoft Entra» | L'URI de redirecció del pas 2 no coincideix amb l'adreça de l'app (compte amb la barra final). L'app mostra l'adreça exacta per copiar-la. |
| «L'app està registrada com a Web i ha de ser SPA» | A Entra › Autenticació, esborreu la plataforma *Web* i afegiu l'adreça com a *Aplicació d'una sola pàgina*. |
| «Cal que l'administrador aprovi els permisos» | Pas 2.3: *Concedeix el consentiment de l'administrador*. |
| «No tens permís per escriure a la carpeta compartida» | Doneu permís d'edició a aquest professional. |
| «Sense connexió · es desarà en tornar» | Els canvis es guarden a la tauleta i s'envien sols quan torna la connexió. |
| «Sessió caducada · torna a entrar» | Premeu-ho i torneu a entrar: no es perd res. |
| «L'Excel està bloquejat» | Algú el té obert en una versió antiga d'Excel que no permet l'edició simultània. L'app ho torna a provar sola. |
| «No s'ha pogut fer l'Excel: revisa les dades d'aquest client» | Alguna dada del client (d'una sessió o d'una valoració) no es pot posar a l'Excel; a la carpeta es queda l'Excel anterior. Cal revisar-ne els camps o avisar-nos. |
| «Excel sense pujar: …» | Normalment és la xarxa o la sessió de Microsoft: es torna a provar sola (20 s, 1 min, 2 min, 5 min). *Puja'l ara* ho força. |
| Un company no veu el que acabo d'afegir | Les dades es carreguen en obrir l'app. Que premi **Actualitza les dades** al menú lateral. |

## Dades i privacitat

- Les dades de salut són de categoria especial (RGPD). Amb un compte de **Microsoft 365 Empresa**, les dades queden
  al vostre inquilí, amb l'acord de tractament de dades de Microsoft.
- La pàgina de l'app no conté cap dada: les dades només circulen entre la tauleta i Microsoft 365.
- Recolliu el **consentiment informat** del client per a la valoració, els vídeos i el seguiment.
- Compartiu amb cada client només la seva carpeta i en mode lectura.
- A **Configuració › Tanca la sessió** es tanca la sessió de Microsoft en aquella tauleta.
