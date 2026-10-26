# Guia d'ús per a l'equip

L'app té tres peces que es fan servir cada dia:

1. **La fitxa del client** — dades, dates clau (IQ, lesió), sessions, seguiment mensual i valoracions.
2. **La valoració funcional** — el protocol EON a la tauleta, amb càlculs automàtics i informe per al client.
3. **La sessió de 6 blocs** — es prepara en pocs minuts i es presenta al client en pantalla abans de començar.

Tot es desa sol mentre escrius (a dalt a la dreta: *Desant…* › *Desat al núvol*).

---

## Base de dades

Menú **Base de dades**: totes les dades de tots els clients en taules, una per àrea (com les
pestanyes del full de càlcul):

**Clients · Valoracions · Mobilitat (K-Move) · Anàlisi postural · Dinamometria (K-Push) ·
Y-Balance · Salts (My Jump) · Assault bike · Patrons · Sessions · Registre d'exercicis**

- Cada fila és una mesura d'un client en una data. Toca-la per obrir-la i editar-la.
- Filtres per client i professional, cerca per nom, **Només l'última de cada client**, i ordenació
  tocant el títol de qualsevol columna.
- Les asimetries surten en verd, taronja o vermell (menys del 10 %, del 10 al 15 %, més del 15 %),
  i els valors fora de referència en vermell.
- **+ Afegeix…** (p. ex. *Afegeix dinamometria*): tries el client i la data i s'obre el formulari
  directament en aquell apartat. Si el client ja té una valoració aquell dia, les mesures s'hi
  afegeixen; si no, es crea un **Control de mesures** (no cal omplir la resta de tests).
- **Exporta a Excel** descarrega la taula que estàs veient.
- Amb Microsoft 365 o Google, les mateixes dades són a l'Excel o al full de càlcul del centre. És per consultar-lo,
  filtrar-lo o descarregar-lo; les dades s'omplen i es corregeixen sempre des de l'app (si es
  canvia una cel·la directament al full, l'app no la veu i es perd la pròxima vegada que es desi aquell registre).

També es pot començar des de **Nou test** (menú lateral i inici) o des de la fitxa de cada
pacient: botó **Nou test** de la capçalera (ja amb el pacient triat) o **Resum › Nou test › Mobilitat / Dinamometria /
Y-Balance / Salts / Patrons**.

## Pacients

- **Inici** mostra les sessions d'avui i dels propers 7 dies, els re-tests pendents
  (cada 3 mesos) i la llista de pacients amb filtres per estat, tipus de pacient i professional.
- **Nou pacient**: primer el **tipus de pacient**, després nom, cognoms i professional. Amb Microsoft 365 o Google es
  crea automàticament la carpeta del pacient (amb *Valoracions* i *Sessions*, i dins de cadascuna la carpeta dels seus vídeos).
- **Tipus de pacient**: *Membership EON* (té la membership amb nosaltres: paquet d'entrenaments, valoració inicial i
  seguiment continuat) o *Client* (compra bons d'entrenament solts, sense membership). Surt a la capçalera de la fitxa, al filtre de l'inici
  i a la columna *Servei* de l'Excel. Es canvia a la pestanya **Fitxa › Seguiment al centre**.
- **Professional de referència**: Ricardo Villamizar, Arnau o Oriol Pastor (fisioteràpia). La llista es canvia a **Configuració**.
- **Objectiu**: el primer quadre de la pestanya *Fitxa* i del *Resum*: el que el pacient vol aconseguir i el que es
  treballa. També surt a la capçalera i als informes.
- **Comentaris del professional**: el segon quadre de la pestanya *Fitxa*, per anar-hi escrivint mentre parles amb el
  pacient a la primera trobada. Només els veu l'equip a l'app (i a la base de dades): **no surten mai** a l'informe, al
  PDF ni a l'Excel de la carpeta del pacient (aquesta carpeta es pot compartir amb ell).
- **Dates clau**: data de la intervenció (IQ) i de la lesió. A la capçalera es veuen els dies i
  setmanes que han passat (com el full *DB* de l'Excel mensual).
- **Fitxa del client** (pestanya *Fitxa*), a més de les dades personals i el contacte d'emergència:
  - **Perfil físic i activitat**: alçada, pes, dominància (dreta/esquerra), nivell d'activitat, esport, professió
    i disponibilitat. El pes i l'alçada es posen sols a les valoracions noves, i si es canvien a la valoració més
    recent també s'actualitzen aquí.
  - **Salut, lesions i precaucions**: limitacions i precaucions per entrenar, condicions de salut, antecedents i
    lesions i medicació rellevant. Només el que cal per entrenar: la informació clínica completa és a Nubimed.
- **Resum**: a dalt de tot hi ha el **Perfil del client**: edat, alçada, pes, IMC, dominància i activitat; les
  limitacions per entrenar ben visibles (en groc); l'esport, la professió, la disponibilitat, la salut i les
  lesions, i les observacions.

### Informe previ de la doctora

A **Fitxa › Informe de la doctora**:

1. Enganxa el text de l'informe (o **Llegeix un Word** si és un fitxer *.docx*).
2. **Omple les dades del client**: l'app reparteix el text als camps de la fitxa i t'ensenya què va a cada lloc
   abans de desar-ho:
   - *Motiu de consulta / Motivo de consulta* › **Motiu de consulta**
   - *Objectiu / Objetivo* › **Objectiu**
   - *Antecedents, Diagnòstic, Medicació, Al·lèrgies…* › **Antecedents i historial**
   - *Intervenció quirúrgica* (amb data) › **Data de la intervenció (IQ)** i **Intervenció**
   - *Lesió* (amb data) › **Data de la lesió** i **Lesió**
   - *Recomanacions, Pla, Observacions…* › **Notes internes**
3. Desmarca el que no vulguis i **Desa a la fitxa**. Els textos s'afegeixen al que ja hi havia; les dates se
   substitueixen.

Amb Microsoft 365, **Desa el PDF a la carpeta** guarda l'informe original a *Valoracions* del client
(`informemedic_nomcognoms_aaaammdd_01.pdf`).
Funciona millor si l'informe té els títols (*Motiu de consulta:*, *Antecedents:*…) al començament de cada línia.

## Valoració funcional

Botó **Nova valoració** a la fitxa del client. A sota de les dades de la valoració hi ha el mateix **Wellness · com
arriba avui?** que a les sessions (5 preguntes de l'1 al 5 i observacions); surt també a la capçalera de l'informe.
Les seccions segueixen el document *Valoració funcional · Human Performance*:

| Secció | Què hi ha | Càlcul automàtic |
|---|---|---|
| Mobilitat | Goniometria Kinvent K-Move (rotacions de maluc i d'espatlla, flexió de genoll), knee-to-wall, anàlisi postural (Adams, Thomas, Windlass) | Asimetria D/E en %, alerta si knee-to-wall < 8 cm o diferència ≥ 4 cm |
| Força | Dinamometria Kinvent K-Push (leg extension, leg curl 90/90 i squeeze), Single Leg Squat, Y-Balance | Asimetria, N/kg, ràtio isquios/quàdriceps, composite del Y-Balance i diferència anterior ≥ 4 cm |
| Rendiment | CMJ (My Jump, amb importació del CSV), perfil càrrega-velocitat (ADR Encoder), Assault bike 30 s (amb la foto de la pantalla) | Millor salt, mitjana, potència (My Jump o Sayers), W/kg, RSI-mod, variabilitat; recta càrrega-velocitat, 1RM estimada i càrrega per velocitat; watts, treball, distància, energia, índex de fatiga i comparació amb l'anterior |
| Patrons (Sessió 1) | Squat, Lunge, Pes mort, RDL, Hip Thrust, Lateral Lunge, Copenhagen | Escala 0 / − / −− i P (dolor → fisio). Als unilaterals compta el pitjor costat. Decisió proposada segons la puntuació |
| Altres mesures | Qualsevol mesura nova | Es desa també al full |

Consells:

- Les **D** i **E** són dreta i esquerra. Els decimals es poden escriure amb coma.
- La icona de **nota** obre un camp d'observacions per a cada test; la de **vídeo** enllaça el
  vídeo de la carpeta del client. Amb Microsoft 365, **Grava o puja un vídeo** obre la càmera o la galeria
  de la tauleta i el desa directament a *Valoracions › Vídeos valoracions* de la carpeta del client.
- **Fotos i vídeos per costat**: alguns tests tenen, a sota, el seu espai per a fotos o vídeos en lloc de la
  icona de vídeo. A cada espai, **Fes la foto** / **Grava** obre la càmera i **Tria'n una** / **Tria'n un** agafa
  una foto o un vídeo que ja tingueu a la tauleta. Es desen sols: les fotos a *Valoracions* i els vídeos a
  *Valoracions › Vídeos valoracions* de la carpeta del client, amb un nom com
  `singlelegsquatdreta_lauravidalserra_20260702_01.mp4` (a la versió local, a la mateixa tauleta).
  - **Test de Thomas**: dues fotos, la de la dreta i la de l'esquerra.
  - **Test de flexió de tronc (Adams)**: una foto.
  - **Single Leg Squat**: dos vídeos, el de la dreta i el de l'esquerra.
  - **Y-Balance**: dos vídeos, un per cama, a sota de les 3 mesures de cada cama (anterior, posteromedial i
    posterolateral) i la longitud de la cama.
  - **Patrons unilaterals de la Sessió 1** (Lunge, Lateral Lunge i Copenhagen Plank): dos vídeos, el de la dreta
    i el de l'esquerra.

  Les fotos surten a l'informe (també al PDF i en paper), al costat de l'anàlisi postural, **retallades amb IA**: l'app
  troba la persona sencera a la foto i l'enquadra en vertical, amb una mica d'aire; si no la detecta bé, surt la foto
  sencera. La detecció es fa a la mateixa tauleta (cap foto surt de l'aparell) i es recorda, i la primera vegada
  baixa el detector (uns 14 MB). Els vídeos, i les seves captures, només surten a l'apartat de vídeos de la pantalla
  (al PDF per al client no hi surten), amb el costat al nom. A l'Excel hi ha l'enllaç de cada foto i de cada vídeo.

  **Si es canvia el nom d'una carpeta** (la del pacient, *EON Life · Clients*…) o es mou un fitxer, l'enllaç antic
  deixa de funcionar a SharePoint («Not Found»). L'app no en depèn: de cada foto i vídeo es desa també l'identificador,
  i el busca per identificador, pel nom del fitxer dins de la carpeta del pacient i, si cal, a tota la carpeta
  compartida. Quan el troba, arregla sol l'enllaç de la valoració (i de l'Excel, a la propera pujada). Les fotos fetes
  abans d'aquest canvi (octubre de 2026) es retroben pel nom i, en obrir-les, queden arreglades de la mateixa manera.
  Si una foto s'ha **esborrat**, a l'informe surt *No es troba a la carpeta* (no un requadre buit; al PDF no hi surt)
  i, en tocar-la, què fer: mirar la paperera de reciclatge de SharePoint (hi queda 93 dies), restaurar-la i tornar a
  obrir la pantalla, o tornar-la a fer. Millor no canviar el nom de les carpetes que fa l'app.
- **Informes i fitxers**: *Adjunta l'informe de Kinvent* puja el PDF desat a la tauleta a *Valoracions*
  de la carpeta del client (`informekinvent_…_01.pdf`) (amb Microsoft 365). Els valors de dreta i esquerra s'escriuen igualment als tests.
  A la **versió de prova** (sense Microsoft 365) també es tria el PDF o es grava el vídeo, però es queden només en
  aquella tauleta: no els veu cap altre aparell.
- **Llegeix el PDF** (a *Goniometria* i a *Dinamometria*): tria l'informe PDF de Kinvent Physio i l'app en llegeix
  els valors i omple els camps:
  - **K-Move** (angle màxim): rotació interna i externa de maluc i d'espatlla i flexió de genoll.
  - **K-Push** (força màxima): leg extension, leg curl 90/90 i adductors (squeeze).

  Des de l'octubre de 2026 el protocol ja no inclou la flexió d'espatlla sobre el cap, l'extensió de genoll, el leg
  curl 30/30, els rotadors de maluc, els rotadors externs d'espatlla, la neurodinàmia (Slump test i prone knee bending)
  ni l'encoder: no surten a les valoracions noves
  ni el lector del PDF els omple. Si una valoració d'abans en té dades, s'hi continuen veient (amb l'etiqueta
  *ja no es fa*).

  Com que l'informe de Kinvent són imatges, l'app el llegeix amb reconeixement de text (OCR) a la mateixa tauleta:
  el PDF no s'envia enlloc. La primera vegada es descarrega el lector (uns 6 MB, cal internet) i després ja queda
  guardat. Abans d'omplir res surt la llista de proves trobades:
  - Per a cada prova hi ha el camp de la valoració on va, que es pot canviar o deixar sense omplir.
  - Hi ha l'**Esquerra** (la «Izquierda» de l'informe) i la **Dreta** («Derecha»), que es poden corregir. A la
    valoració, la dreta (D) és la primera columna i l'esquerra (E), la segona.
  - La força es passa de kg a newtons (× 9,81).
  - Cada número es comprova amb l'asimetria de l'informe: «Quadra» si coincideix; si no, «Revisa». Si l'esquerra i la
    dreta no quadren, l'app torna a llegir els números amb un altre contrast abans de demanar que els reviseu.
  - Llegeix els dos tipus d'informe de Kinvent: amb la gràfica de l'evolució a la dreta (quan el client té més d'una
    sessió) i d'una sola sessió, on la «Derecha» és a la dreta de la pàgina.
  - Si una prova només té un valor (s'ha fet d'un sol costat), surt «Un costat»: trieu si és l'esquerra o la dreta.
  - Funciona també amb PDF de menys resolució (per exemple, els que es descarreguen des de la tauleta), encara que
    l'OCR llegeixi malament «Izquierda» o el % d'asimetria: l'app sap on són els valors de cada targeta.

  Amb *Adjunta també el PDF*, el PDF també queda desat a la valoració. Està provat amb l'informe en castellà, que és
  el que feu servir.
- **Importa CSV de My Jump** (a *Rendiment · Salts*): My Jump Lab exporta sempre **tots els atletes** del compte en un
  mateix fitxer; no cal que el netegeu. Puja'l tal com surt i l'app:
  - **Llegeix el nom** de cada fila i només n'agafa les del pacient (no importa l'ordre dels cognoms, els accents, les
    majúscules ni una errada d'una lletra: «Soler Ferrer, Aina» també és «Aina Ferrer Soler»). El diàleg diu a qui ha
    trobat i quantes files d'altres persones **no** importa; **les dades d'altres persones no es desen enlloc**.
    Si no troba el nom (a My Jump s'ha escrit diferent), podeu triar a mà quin nom del fitxer és el del pacient.
  - Ensenya els intents (marcats per defecte els del dia de la valoració, o els de l'última sessió que hi ha al
    fitxer) i **només importa els que deixeu marcats**. Tornar a pujar el mateix fitxer no duplica res («ja importat»).
  - Omple, per a cada intent, el tipus de salt, l'altura, el temps de vol, la velocitat, la força, la potència, el RSI-mod,
    i (a la fletxa *Més dades* de cada fila) el pes i la distància d'empenta de My Jump, el temps fins al despegament,
    el contacte, la càrrega, l'impuls, el DRI, el RSI i la rigidesa, la data i l'hora i el color d'*Estat de forma*.
    Els números amb punt de milers (`1.671,98`) es llegeixen bé; un `---` o un `0,00` d'una mesura que My Jump no ha
    pogut calcular queda en blanc (no es fa passar per una mesura).
  - **Anàlisi** sota la taula (també a l'informe del pacient i a l'Excel): millor salt i mitjana, temps de vol, velocitat
    d'enlairament (√(2·g·h)), potència (la de My Jump o, si no hi ha el pes de l'intent, la **pic estimada amb la fórmula
    de Sayers** — 60,7·altura(cm) + 45,3·pes(kg) − 2055 — amb el pes de la valoració), W/kg, RSI-mod, variabilitat entre
    intents (CV %) i la comparació amb la valoració anterior.
  - **Avisos** (només per a qui introdueix les dades, no surten a l'informe): distància d'empenta fora de 0,10–0,60 m,
    pes que My Jump no té, altura que no quadra amb el temps de vol i variabilitat alta entre intents.
- **Perfil càrrega-velocitat** (a *Rendiment*, amb l'**ADR Encoder** lineal): serveix per **estimar la 1RM sense arribar-hi**
  (més segur en readaptació, gent gran o poc entrenada) i per veure, a cada re-test, si el perfil s'ha desplaçat cap a
  càrregues més altes. El botó **Com fer-lo servir** obre la guia pas a pas (material, col·locació de l'encoder, càrregues,
  descansos, interpretació i limitacions).
  - **Afegiu l'exercici** amb els botons de sota (*Squat, Press banca, Pes mort, Hip thrust, Altre exercici*). Cada exercici
    porta la **velocitat mínima de la 1RM** de referència (squat 0,30 m/s en homes i 0,25 en dones, press banca 0,17,
    pes mort 0,15, hip thrust 0,25): són valors de la literatura, orientatius, i es poden canviar. «Altre exercici» no en
    porta: fa la recta però no estima la 1RM fins que en poseu una.
  - **Apunteu, per a cada càrrega**, els kg i la **velocitat mitjana** (de la fase concèntrica) que dona l'encoder; la
    velocitat de pic i les repeticions són opcionals. Amb **4–6 càrregues** (de ~1 m/s fins a ~0,5 m/s, sense arribar a la
    fallada) l'app dibuixa el gràfic amb la recta.
  - **Cada repetició és un punt**: com fa l'app de l'ADR, es poden apuntar totes les repeticions (p. ex. 3 per càrrega)
    com a files separades, o una sola per càrrega. A cada fila surten el **% de la 1RM** i la **potència** (kg × 9,8 ×
    velocitat), com a la pantalla de l'ADR.
  - **Els números quadren amb l'ADR**: la recta es calcula igual que l'app de l'encoder (càrrega en funció de la velocitat,
    p. ex. *càrrega = −49,47 × velocitat + 87,49*, R² 0,93), i es veu l'equació per comparar-la. Per tenir la mateixa 1RM,
    poseu la mateixa velocitat mínima que fa servir l'ADR (al press banca, 0,17 m/s).
  - **Càlculs**: recta per regressió de la càrrega sobre la velocitat, **V0** (velocitat sense càrrega), **L0** (càrrega
    a velocitat zero), **R²**, **1RM estimada** (càrrega a la velocitat mínima; també en vegades el pes corporal) i la
    **càrrega estimada per a cada velocitat** (1,00 · 0,80 · 0,60 · 0,50 · 0,40 · 0,30 m/s) amb el % de la 1RM. Al re-test
    surt la comparació amb la valoració anterior (1RM estimada i càrrega a 0,50 m/s) i la recta d'abans en gris.
  - **Avisos** (només per a qui introdueix les dades): una sola càrrega o només dues (orientatiu), ajust baix (R² < 0,90),
    velocitats de més d'1,1 m/s, cap càrrega pesada (l'estimació extrapola molt), càrrega per sobre de la 1RM estimada, o
    velocitat que no baixa quan puja la càrrega. No hi ha res de personal a l'informe del pacient: surten el gràfic, el
    resum i la taula.
  - **Fiabilitat**: és una estimació; va bé per fer seguiment i per triar càrregues, però no substitueix un test directe si
    cal la 1RM exacta. Depèn de l'exercici, la tècnica i l'equip (Smith o barra lliure): no compareu entre exercicis ni equips.
    Referències: González-Badillo i Sánchez-Medina (2010), García-Ramos et al. (2018) i Ardigò et al. (2022).
- **Dades de l'ADR directament a l'app** (encoder i ADR Jumping): l'app de l'ADR exporta els entrenaments a **CSV** (o Excel)
  i l'app els llegeix, com amb el PDF de Kinvent. A l'app de l'ADR, en acabar l'entrenament o el test, exporteu el fitxer
  (el botó per descarregar l'entrenament, o *Menú › Historial d'entrenaments › exportar a CSV*) i passeu-lo a la tauleta.
  Després, a EON:
  - **Valoració › Perfil càrrega-velocitat › Importa de l'ADR**: tria el fitxer. L'app **troba la persona pel nom** (si el
    fitxer porta tothom, només s'agafa el pacient), els **exercicis** (squat, press banca, pes mort i hip thrust els
    reconeix sols) i els dies; podeu triar el **dia**, la **velocitat** (mitjana, propulsiva o de pic) i si voleu **la
    repetició més ràpida de cada càrrega** (la recomanació de l'ADR) o **totes les repeticions**. Es veu la taula abans
    d'importar i, si l'exercici ja hi és, se substitueixen les seves càrregues.
  - **Valoració › Salts › Importa de l'ADR Jumping**: salts amb altura, temps de vol, contacte i RSI (els intents ja
    importats surten com *ja importat*).
  - **Sessió › registre de l'encoder d'un exercici › Importa de l'ADR**: les repeticions es converteixen en **sèries**
    (càrrega, reps, velocitat de la 1a i de l'última, **pèrdua de velocitat** i potència màxima). Si ja hi havia sèries
    escrites, les de l'ADR s'afegeixen a continuació.
  - **Columnes del fitxer**: l'app reconeix les columnes pel nom (català, castellà o anglès). Si alguna no és bona, trieu a
    mà quina columna és cada cosa; **se'n recorda** per als fitxers amb les mateixes capçaleres.
  - Només es desa el que marqueu: les dades d'altres persones del fitxer no es guarden enlloc.
- **Assault bike 30 s all-out** (a *Rendiment*): caselles per als **watts pic, mitjans i mínims**, i per a les dades de
  la pantalla de l'aparell: **temps, distància, calories, velocitat mitjana i RPM mitjanes**. Hi ha un interruptor de
  **unitats** (milles / km): si a la pantalla sota la distància hi diu MILES (i la velocitat va en M/HR), són milles.
  - **Omple amb una foto de la pantalla**: feu una foto de prop a la pantalla quan ensenya el resum de la prova (o trieu-la
    de la galeria). Marqueu amb el dit els **quatre cantons del vidre** (dalt-esquerra, dalt-dreta, baix-dreta,
    baix-esquerra; no cal que siguin exactes) i premeu *Llegeix la pantalla*. L'app «redreça» la imatge i llegeix els
    números dígit a dígit (la lectura passa a la mateixa tauleta; la foto no surt enlloc). Es fan unes quantes lectures
    movent una mica els cantons i es queda amb la que més es repeteix: cada casella diu **Llegit** o **Revisa-ho**.
  - **Compareu sempre amb la pantalla dreçada** que surt al costat i corregiu el que calgui: *no es desa res fins que
    premeu* **Aplica a la valoració**. Opcionalment, la foto es desa com a prova a la carpeta del pacient (a *Valoracions*).
  - La pantalla **no porta** els watts pic ni mínims: es posen a mà (si no hi són, no es calcula l'índex de fatiga).
  - **Càlculs** (a l'informe i a l'Excel): W/kg (pic i mitjana), la mitjana com a % del pic, **treball total** (kJ =
    watts mitjans × temps), J/kg, distància en metres i velocitat en km/h, ritme d'energia (kcal/min i kcal/kg), índex de
    fatiga i la comparació amb la valoració anterior. Els watts de la bicicleta d'aire no són comparables amb els d'un
    Wingate: serveixen per comparar el pacient amb ell mateix.
  - **Avisos**: temps que no és de 30 s, pic per sota de la mitjana, mínima per sobre de la mitjana, watts o RPM fora del
    rang, una distància que no quadra amb la velocitat mitjana i el temps, i que falta el pes per fer els W/kg.
  - Si no surt bé: si les lectures surten «Revisa-ho» repetidament, torneu a marcar els cantons (*Torna a marcar els
    cantons*) o feu la foto més de cara i sense reflexos.
- A **Conclusions i pla** hi ha els punts d'atenció calculats sols. Hi afegiu els punts forts,
  les prioritats, les decisions i la data del re-test (per defecte, 3 mesos després).
- Al final, **Esforç percebut de la valoració**: l'RPE de 1 a 10 (1 = molt suau, 10 = esforç màxim). Surt a l'Excel
  del client (detall de la valoració i evolució) i a la taula *Valoracions* de la base de dades.
- **Informe per apartat**: al costat del títol de cada apartat (Mobilitat, Força, Rendiment, Patrons) hi ha
  *Informe de …*: només aquell apartat, els seus vídeos i la comparació amb l'última vegada que es va mesurar.
  Quan es repeteix un apartat (per exemple, els patrons al cap d'un mes), es fa amb **Nou test** i el seu
  informe ja surt comparat amb l'anterior. A la barra de l'informe es pot canviar entre *Informe complet* i cada apartat.
- **PDF de l'informe a la carpeta del client**: a la barra de l'informe, **Desa el PDF a la carpeta** fa el PDF (A4,
  com quan s'imprimeix, sense vídeos i amb el número de pàgina) a la mateixa app, sense passar pel diàleg d'imprimir, i
  el desa a *Informes › Valoracions* de la carpeta del client amb el nom `informevaloracioinicial_lauravidalserra_20260702_01.pdf`
  (`informeretest_…`, o `informeforca_…` si és l'informe d'un sol apartat). Si es torna a desar el de la mateixa
  valoració, substitueix l'anterior (no en fa còpies). Queda enllaçat a la valoració (*Informes i fitxers*) i a l'Excel
  del client, i el botó *Obre el PDF* l'obre a SharePoint. Triga uns segons (el botó diu el percentatge). A la versió
  sense Microsoft 365, el mateix botó es diu **Descarrega el PDF**. *Imprimeix* continua servint per treure'l en paper (sense la data, el títol ni l'enllaç que el navegador posava a les cantonades). La **propera valoració** surt només amb el mes i l'any (p. ex. «Gener de 2027»).
- **Vídeos a l'informe**: a la pantalla, tots els vídeos enllaçats surten a l'informe, amb la miniatura (amb
  Microsoft 365 es reprodueixen allà mateix) i un codi QR per obrir-los des del mòbil. Al **PDF per al client** no
  hi surten (en paper només en quedaria una captura): els vídeos no s'esborren i es continuen veient a l'app i a la
  carpeta del client.
- **Informe**: presentació per ensenyar al client en pantalla. Amb el botó
  *Sense notes / Amb notes* es mostren o s'amaguen les observacions internes de cada test.
  Si hi ha una valoració anterior, surt la comparació de les mètriques clau.

## Sessions de 6 blocs

La metodologia té 6 blocs, sempre en aquest ordre:

1. **Mobilitat** 2. **Activació** 3. **Potència** 4. **Força principal** 5. **Accessoris** 6. **Tornada a la calma**

Cada sessió té només els blocs que necessita el client: no cal que hi siguin tots sis.

### Crear-ne una

**Nova sessió** a la fitxa del client (o toca un dia buit del *Seguiment mensual*) i tria:

- **Copia l'última sessió** — la manera més ràpida de progressar setmana a setmana.
- **Sessió en blanc** — sense cap bloc (és l'opció de sortida per a un client nou). A la sessió surten els botons
  **1 Mobilitat, 2 Activació…** per afegir només els blocs que calguin; es col·loquen sols en l'ordre de la
  metodologia. Mentre se'n puguin afegir més, al final de la sessió hi ha **Afegeix un bloc**.
- **A partir d'una plantilla** — p. ex. *Sessió tipus · tren inferior (genoll)*. Porta només els blocs que la
  plantilla té omplerts.

Per treure un bloc d'una sessió: menú del bloc (icona de capes) › **Treu el bloc de la sessió**. Copiant l'última
sessió o fent la del pla, també només hi passen els blocs que tenen alguna cosa.

### Omplir-la

- A cada bloc: **focus** (p. ex. *Dominant de genoll*) i els exercicis.
- **Afegeix exercici** obre les carpetes de la biblioteca:
  1. **Grup muscular**: *Tren superior* (pectoral, dorsal, deltoides, bíceps, tríceps, trapezi…), *Tren inferior*
     (quàdriceps, isquiotibials, glutis, adductors, bessons…), *Core* i *Cos sencer i altres*. Un exercici surt a la
     carpeta de cada múscul principal que treballa (el press de banca, a Pectoral i a Tríceps).
  2. **Exercici**: targetes amb la miniatura (el dibuix o la foto), el nivell (N1–N5) i els músculs.
  3. **Amb quin material?**: el material del centre amb què es pot fer (barra olímpica, mancuernes Technogym,
     kettlebell, kBox, Keiser, cònica, politja…).
  També hi ha la carpeta **Per material**: triant l'exercici des d'aquí ja queda posat el material. Hi ha els
  exercicis de l'app de Technogym: *Loop band Technogym* (50), *Kettlebell* (50), *Power Personal Technogym* (38)
  *Mobility ball Technogym* (9, al bloc de mobilitat) i *Mancuernes Technogym* (51, de les manuelles i les manuelles
  hexagonals). Són una proposta de nom i bloc: es poden editar a la biblioteca.
  A dalt hi ha el cercador (nom, múscul, material o el nom en anglès de l'app de Technogym) i *Tots els blocs*. A Força principal i Accessoris surten els
  exercicis de tots dos blocs. **Exercici en blanc** és per escriure'n un que no és a la biblioteca.
  S'omplen sols el material, la contracció (CON/ECC/ISO), la posició (Bp, Ds…), la lateralitat (BL/UL) i la
  prescripció per defecte. El material i el grup muscular es poden canviar als *Detalls* de l'exercici.
- **Unilateral**: el botó *Unilateral* de cada exercici (o *Fes-lo unilateral* al menú ⋮) el passa a un costat i després
  l'altre. La prescripció surt per braç, per cama o per costat segons el grup muscular (p. ex. jaló al pit 3 × 12/braç),
  a la sessió, a la fitxa del client i a l'Excel. Tornant-lo a tocar, torna a ser bilateral.
- Una línia per exercici: **sèries × reps/temps · càrrega · intensitat (RIR/RPE) · descans**.
  Exemple: 3 × 6 · 60 kg · RIR 2 · 2'.
- Sota de cada exercici surt **Anterior**: què va fer el client l'última vegada, per decidir la progressió.
- **Vídeo de demostració** (icona ▶ de cada exercici): l'enllaç del vídeo de YouTube on el professional fa
  l'exercici. Es veu allà mateix. Si marques *Desa'l a la biblioteca*, aquell exercici sortirà sempre amb el vídeo.
  A YouTube, pugeu-lo com a **No llistat** (no *Privat*: un vídeo privat només el pot veure qui l'ha pujat).
- **Grava el client** (icona de càmera de cada exercici): amb Microsoft 365, **Grava ara** obre la càmera de la
  tauleta i el vídeo es desa sol a *Sessions › Vídeos sessions d'entrenament* de la carpeta del client (amb un nom com
  `hipthrust_lauravidalserra_20261002_01.mp4`), enllaçat a l'exercici.
- **Encoder** (a *Potència* i *Força principal*): obre el registre per sèries.
  - **Encoder ADR**: càrrega, reps, velocitat de la 1a rep, velocitat de l'última rep, pèrdua de velocitat (%)
    i potència màxima. Si poses la 1a i l'última velocitat, la pèrdua de velocitat es calcula sola.
  - **ADR Jumping**: salts, altura millor, altura mitjana, RSI i temps de contacte.
  - Al botó surt el resum (p. ex. *V 1a rep 0,80 m/s · PV 20 % · 820 W*) i a l'Excel, a *Registre_exercicis*
    (velocitat de la 1a rep, pèrdua de velocitat, potència i altura del salt). La pròxima sessió es veu a *Anterior*.
  - A **Intensitat** hi ha també el caràcter de l'esforç (*CE 6(12)*), la pèrdua de velocitat objectiu (*PV 20 %*)
    i la velocitat objectiu (*V 0,75 m/s*).
- **Divideix en blocs** (a sota de cada bloc, p. ex. a *Força principal*): el bloc es parteix en **Bloc 1, Bloc 2,
  Bloc 3…**, cadascun amb els exercicis que vulguis (un de 2 exercicis i un altre de 5 o 6, per exemple).
  - Els exercicis que ja hi havia queden al Bloc 1. Cada bloc té el seu **Afegeix exercici al bloc N** i un camp
    d'**indicacions** (*Superset · 3 voltes · 2' entre voltes*).
  - Per canviar un exercici de bloc: menú **⋯** de l'exercici › *Mou al bloc N*, o *Mou amunt / avall* des del
    primer o l'últim exercici del bloc.
  - **Afegeix el bloc N** n'afegeix un altre; la **×** del bloc el treu. *Uneix els blocs en un de sol* (botó de
    plantilles del bloc) torna a deixar-ho tot junt.
  - Es veuen a **Presenta** i al PDF, es copien amb *Copia l'última sessió* i les plantilles, i a l'Excel
    (*Registre_exercicis*) hi ha la columna **Subbloc**.
- Botó de **plantilles** de cada bloc: insereix un bloc desat o desa el bloc actual com a plantilla.
- **Wellness · com arriba avui?** (a dalt de tot, abans dels blocs): cinc preguntes de l'1 al 5 — fatiga, qualitat
  del son, dolor muscular, nivell d'estrès i estat d'ànim — i les **observacions** de l'entrenador. El 5 és sempre el
  millor estat (1 = molt cansat, 5 = molt fresc; 1 = molt adolorit, 5 = gens…), i surt el total sobre 25. Les
  respostes d'1 o 2 es marquen. Es desa a l'Excel (una columna per pregunta, el total i les observacions) i a la
  taula *Sessions* de la base de dades.
- **Tancament**: RPE de la sessió (1–10) i minuts › la **càrrega** (RPE × minuts, UA) es calcula
  sola; dolor en acabar, observacions i decisió per a la propera sessió. **Marca com a feta**.

### Presentar-la al client

Botó **Presenta**: fitxa neta amb el logotip, l'objectiu d'avui, els 6 blocs i cada exercici ben
escrit, amb la seva miniatura (en moviment a la pantalla; al PDF, dos dibuixos: inici → final). Es pot posar a pantalla completa, en tema fosc, o **Imprimeix / PDF** (A4) per desar-la a
la carpeta del client.

**Vídeos de cada bloc**: els blocs que tenen vídeos de demostració porten el botó **▶ n vídeos**. En tocar-lo
(per exemple a *Mobilitat*) es veuen un darrere l'altre tots els vídeos d'aquell bloc, a pantalla gran, perquè
el client els vegi abans de començar. Amb les fletxes es passa al següent; també es pot tocar el ▶ d'un exercici
concret.

### Progressions: de l'exercici més bàsic al més avançat

Cada exercici de la biblioteca pot tenir una **família** (un patró: *Squat bilateral*, *Core · antiextensió*,
*Olímpics · cargolada*, *Canvi de direcció*, *Equilibri*, *Respiració parasimpàtica*…) i un **nivell** de l'1 (inicial)
al 5 (expert). Per exemple: *Squat a caixa → Goblet squat → Back squat → Front squat → Back squat amb pausa*.

- A la sessió, al costat de cada exercici surt **N3** amb les fletxes **▲ ▼**: ▲ el canvia pel nivell següent i
  ▼ per l'anterior (també al menú **⋯** de l'exercici: *Progressa* / *Regressa*). Es mantenen les sèries i les
  repeticions.
- **Biblioteca › Exercicis › Progressions** mostra totes les famílies amb els seus nivells. Per posar un exercici en
  una progressió: obre'l i tria'n la *Família* i el *Nivell*.
- La biblioteca inclou, a més dels exercicis d'abans, progressions d'olímpics (cargolada, arrencada, envia),
  canvi de direcció, salts unilaterals i reactius, core, equilibri i vestibular (estabilitat de la mirada) i
  respiració i relaxació, amb l'explicació de cada respiració a les *Consignes*.

### Mètodes (els vostres apunts)

**Biblioteca › Mètodes**: clúster, rest-pause, excèntric accentuat, isomètric, contrast (PAPE), superset,
VBT, caràcter de l'esforç, gomes i cadenes, Keiser, politja cònica, tempo, ondulant, complex francès, EMOM,
equilibri progressiu, RAMP i respiració parasimpàtica. Cadascun té *per a què serveix*, *com es fa* i un
*exemple*, i un camp d'**Apunts** i **Fonts** per anar-hi escrivint el que aprengueu (cursos, universitat,
articles). Se'n poden crear de nous.

A la sessió, cada bloc i cada subbloc té el desplegable **Mètode…**: en triar-lo surt com es fa i l'exemple, i al
**Presenta** el client veu el nom del mètode (p. ex. *Bloc 2 · Clúster*). Així no es fa sempre el mateix 3 × 10.

### Plantilles en blanc i superseries

- **Biblioteca › Plantilles › Nova plantilla › Plantilla de sessió en blanc**: comença sense cap bloc i hi afegeixes només
  els que vols (Mobilitat, Força principal…) amb els botons «Afegeix un bloc». Es poden treure amb el menú del bloc.
- **Afegeix exercici de la biblioteca** (a la sessió i a la plantilla, a la zona «Afegeix un bloc»): cerques o navegues per
  tota la biblioteca sense haver obert cap bloc abans. L'exercici va al bloc on està classificat i, si el bloc encara no hi
  és, es crea sol. Si el bloc ja està dividit en subblocs, va al darrer.
- Dins de qualsevol bloc, **Afegeix superserie** crea un subbloc de superserie: hi poses 2 o 3 exercicis que es fan
  seguits, una volta rere l'altra. A la capçalera hi tries les **voltes** i el **descans entre voltes**; els exercicis
  no tenen descans propi (les voltes són les seves sèries). També es pot convertir un subbloc qualsevol amb el botó
  **Superserie**. Es veu al full de la sessió i als Excel com *Bloc 2 · Superserie · 3 voltes · descans 90 s entre voltes*.

### Calendari: moure i eliminar sessions

- Al **Seguiment mensual**, arrossega una sessió (programada o feta) a un altre dia per moure-la. Amb el dit, mantén-la premuda
  un moment i després arrossega-la. Si és una sessió feta, l'app demana confirmació.
- **Selecciona** activa la selecció: toca les sessions que vulguis (o «Tot el mes») i fes servir **−1 dia**, **+1 dia**,
  **+1 setmana**, **Canvia la data…** (la primera va a la data triada i les altres es mouen igual) o **Elimina**. També pots
  arrossegar-ne una de seleccionada i es mouen totes les seleccionades.
- Al Seguiment mensual també hi surten les **valoracions** (inicial, re-test, control) en blau clar, amb ✓ si ja s'han fet; tocant-les s'obren.
- A l'**Inici** hi ha el **calendari de la setmana**: sessions (programades i fetes), valoracions i re-tests pendents de cada
  dia, amb fletxes per canviar de setmana i un filtre per professional (es recorda en aquella tauleta).
- A la fitxa del pacient (**Resum** i **Sessions**) hi ha la gràfica **RPE i EVA · últims 3 mesos**, amb les mitjanes i si
  pugen o baixen. Per triar unes altres dates i treure'n el PDF: **Informe complet**.

### Hora de la sessió i conflictes d'horari

- Cada sessió té una **Hora** (camp *Hora* de la sessió, de la sessió ràpida del calendari i de *Nova sessió*). A
  **Planifica el mes** es posa una hora per a cada dia de la setmana; per defecte, la de l'última sessió d'aquell dia.
- Al calendari mensual i al de la setmana de l'Inici l'hora surt petita davant de cada sessió, i les sessions d'un
  mateix dia s'ordenen per hora.
- Cada sessió compta **1 hora** des de l'hora d'inici. L'**Inici** mostra el quadre *Conflictes d'horari* (propers 14 dies)
  quan:
  - dos professionals diferents tenen sessions que se solapen i fan servir el mateix **material únic**, o
  - un mateix professional té dues sessions que se solapen.
  Clicant una sessió del quadre s'obre per canviar-ne l'hora o el material. El mateix avís surt a dalt de la sessió.
- Quin material és únic es marca a **Configuració › Material del centre** amb la casella de cada material
  (per defecte: barra olímpica, cònica isoinercial, Keiser, Skillmill, AlterG, màquines Technogym grans…). El material
  del qual en teniu diversos (mancuernes, gomes, kettlebells) no cal marcar-lo.
- Les sessions ja fetes i les que no tenen hora no compten.

### Durada estimada de la sessió

A dalt de cada sessió surt la **durada estimada** (p. ex. *≈ 58 min*) amb un color: **blau** si és curta (menys de 50 min),
**verd** si és ideal (50-65 min, cap a 1 h), **groc** si és una mica llarga (65-75 min) i **vermell** si és massa llarga (més de
75 min). Cada bloc també mostra el seu temps, i a les llistes de sessions hi ha una etiqueta petita amb el mateix color. Es
calcula sola amb els exercicis: repeticions × durada de la repetició (o el temps escrit, p. ex. *30 s/costat*), els descansos
de cada exercici (si no n'hi ha, un de típic segons el bloc), el canvi de material i les superseries (voltes × exercicis +
descans entre voltes). És una aproximació per saber si cal retocar la sessió; el treball i els descansos reals poden variar.

### Material de la sala

A dalt de tot de cada sessió planificada (i a l'**Inici**, per a totes les sessions d'avui) hi ha l'avís **Material per a avui**
(o *per a demà*, o *de la sessió* si és més lluny): la llista de tot el material que cal per a la sessió —barra, mancuernes,
fitball, politja cònica…— amb els exercicis que el fan servir. Es deixen fora *Terra*, *Pes corporal* i *Paret*. Toca cada
casella quan el material és a punt i el botó **Tot a punt** ho marca tot; el comptador (p. ex. *3 / 5 preparat*) avisa si falta
alguna cosa. Les marques es desen amb la sessió i, a l'Inici, valen per a totes les sessions que fan servir aquell material.
El material surt de la fitxa de cada exercici de la sessió, així que si en canvies el material, l'avís s'actualitza sol.

### Indicacions dels exercicis

Tots els exercicis de la biblioteca porten una **indicació d'execució** curta (camp *Consignes* de la fitxa de l'exercici): és
orientativa i es pot canviar o ampliar des de la biblioteca. Surt al catàleg exportat i a l'Excel de la biblioteca.

### Ajudes per dissenyar la sessió

- **Anterior i suggeriment.** Sota cada exercici surt què va fer el pacient l'última vegada (sèries, reps, càrrega). Si aquella
  sessió té RPE (o dolor), també surt un **Suggeriment** de càrrega: RPE ≤ 6 puja un 5 %, RPE 7 un 2,5 %, RPE 8-9 es manté,
  RPE 10 baixa un 2,5 % i un dolor ≥ 4 baixa un 5 %. Toca el suggeriment per aplicar-lo. Al menú del bloc o de la sessió hi ha
  **Aplica la càrrega suggerida** per fer-ho de cop. És una proposta: l'últim mot és del professional.
- **Càrrega en %.** A *Càrrega* escriu «75 %» i l'app calcula els kg amb la 1RM del pacient (la de la darrera valoració
  càrrega-velocitat o, si no n'hi ha, la millor estimada amb les seves sessions) i et deixa posar-los amb un toc.
- **Buscador.** En afegir un exercici surten primer les carpetes **Fets amb aquest pacient** (amb la data i la càrrega de
  l'última vegada) i **Triats fa poc**.
- **Precaucions.** Si a la fitxa hi ha una lesió, cirurgia o patologia (genoll, espatlla, lumbar, maluc/engonal, turmell, canell/
  colze) i l'exercici carrega aquella zona, surt un avís groc. És orientatiu: no bloqueja res.
- **Superseries i subblocs.** Cada subbloc es pot **desar com a plantilla** (icona de baixada) i inserir després des del menú
  de plantilles del bloc. La icona del llapis edita de cop sèries, reps, intensitat, descans i tempo de tots els exercicis del
  subbloc; el mateix, per a tot el bloc, des del seu menú.
- **Volum de la setmana.** Un desplegable amb les sèries per múscul de les sessions d'aquella setmana (amb la que estàs
  dissenyant) i els músculs principals que encara no s'han treballat.
- **Cronòmetre.** A la sessió, el botó **Cronòmetre** (a baix) obre el compte enrere de *Descans* o de *Treball* i un
  cronòmetre. Al marcar un exercici com a fet arrenca sol el seu descans (en una superserie, el descans entre voltes en acabar
  l'últim exercici); també hi ha un botó ⏱ a cada exercici amb el seu descans o amb el temps de treball (p. ex. 30 s). Té
  −15 / +15, pausa i atura; avisa amb so i vibració, no s'atura si canvies de pantalla i manté la pantalla encesa.
  Es pot desactivar l'arrencada automàtica i el so des del mateix panell.

### Professional de la sessió

Les sessions noves es fan a nom del professional que va triar l'última vegada **aquella tauleta** (no del
professional de referència del client). Si avui el client el porta un altre company, el canvia a dalt de la
sessió i la tauleta ho recorda per a la propera.

## FC i HRV a cada sessió

Dues dades a la fitxa de cada sessió, totes dues per al dia de l'entrenament (no es guarda res de la nit anterior):

- **Freqüència cardíaca de la sessió** (targeta «Freqüència cardíaca», abans del tancament): FC mitjana, màxima i mínima.
  1. A la tauleta Android obre l'app amb **Chrome**.
  2. Mulla els elèctrodes del strap (Polar H10) i posa'l al pit del pacient. Perquè la tauleta el trobi, no pot estar connectat a l'app Polar Beat ni al rellotge.
  3. **Connecta el strap** → tria'l a la llista → **Comença a enregistrar**.
  4. En acabar, **Atura i desa**: la mitjana es calcula amb tota la sessió i es desa a la sessió.
  5. L'enregistrament continua encara que canviïs de pantalla. Una tauleta només enregistra un strap alhora.

  Si el navegador no té Bluetooth (Safari a l'iPad), la FC es pot escriure a mà.
- **HRV en repòs en arribar** (opcional, dins del wellness, botó «Afegeix l'HRV en repòs en arribar»): per als casos en què interessa mesurar-la. El pacient, assegut o estirat, quiet i sense parlar; connecta el strap, tria 1, 2, 3 o 5 minuts i prem **Mesura l'HRV**. L'app descarta els primers 15 s, filtra els batecs erronis i desa l'RMSSD, la FC de repòs i el percentatge de batecs vàlids (si és baix, repeteix-la). També es pot escriure a mà. Es compara amb les mesures anteriors del mateix pacient (quan en té 7 o més).

Tot surt a l'Excel del client (registre de sessions), a la taula de **Sessions** de la Base de dades i a NOE, que ho fa servir com un senyal més, mai com un diagnòstic.

## Pla d'entrenament i progrés

Pestanya **Pla i progrés** de la fitxa del client.

### Crear un pla

**Crea un pla**: nom, objectiu, data d'inici, **dies de la setmana** (p. ex. dilluns i dijous), **nombre de
sessions** (fins a 40) i d'on surt la sessió 1 (l'última sessió, una plantilla o en blanc). Amb **Progressió dels
exercicis** l'app puja sola un nivell cada 2, 3, 4 o 6 sessions els exercicis que tenen progressió.

A l'editor del pla:

- La **graella de progressió** té una columna per sessió (S1, S2…) amb la data prevista i la fase, i una fila per
  exercici de cada bloc. En verd i amb ▲, els exercicis que pugen de nivell respecte a la sessió anterior.
- Tocant una sessió s'edita a sota amb els mateixos 6 blocs de sempre (subblocs, mètodes, ▲ ▼…), amb la seva
  **fase** (Adaptació, Força, Potència, Descàrrega…) i objectiu.
- Menú **⋯** de la sessió: *Copia a la següent i puja un nivell*, *Copia a la següent igual* o *Puja un nivell tots
  els exercicis*. Menú del pla: afegir o treure sessions al final.

### Fer la sessió del pla

- **Nova sessió** proposa *Del pla d'entrenament* amb la pròxima sessió (es pot triar una altra).
- Al **Seguiment mensual**, les sessions previstes del pla surten amb vora discontínua; tocant-ne una es prepara
  aquell dia.
- La sessió es fa i es tanca com sempre; a dalt hi diu *S5 del pla*.

### Progrés

**Mira el progrés** (o *Progrés* a la targeta del pla) obre una pantalla per ensenyar al client: tries una sessió
d'abans i una d'ara (per defecte la primera i l'última feta) i surt, bloc per bloc i exercici per exercici:

- l'exercici d'abans i el d'ara amb el **nivell** (p. ex. *Goblet squat N2 → Back squat N3: ▲ 1 nivell*),
- la **càrrega** (*+10 kg, +25 %*) i, si s'ha fet servir l'encoder, la **velocitat de la 1a repetició**
  (*+0,30 m/s*),
- l'**evolució** de cada exercici de potència i força en gràfics (càrrega i velocitat, sessió a sessió).

Es pot posar a pantalla completa o desar en PDF.

## Informes d'evolució i disseny clar o fosc

- **Informe de tests** (pestanya *Valoracions › Informe de tests*, o el menú **⋯** de la fitxa): tries el **rang de
  dates** (o *Tot*, *Últims 3 mesos*, *Últims 6 mesos*, *Aquest any*) i **els tests** que vols, agrupats per apartat
  (Mobilitat, Força, Rendiment, Patrons i General), amb *Tots* / *Cap* a cada apartat. Per a cada test surt el canvi del
  primer al darrer valor (▲ verd si ha millorat, ▼ vermell si ha empitjorat; el pes no té direcció), una **gràfica
  d'evolució** (dreta i esquerra si és bilateral) i la taula amb cada valoració i l'asimetria. Les gràfiques es poden
  treure amb la casella *Gràfiques d'evolució de cada test*. El PDF es diu `informeevoluciotests_nomcognoms_aaaammdd_01.pdf`
  i, amb Microsoft 365, es desa a *Informes › Tests* de la carpeta del pacient (el PDF «viu» que fa l'app sola es diu
  `informetests_nomcognoms_01.pdf`, sense data, i aquest té la data: no es trepitgen).
- **Informe d'evolució de les sessions** (pestanya *Sessions › Informe d'evolució*): l'**RPE**, el **dolor en acabar
  (EVA)** i el **wellness** que el pacient omple a cada sessió, en un rang de dates (per defecte, els últims 3 mesos).
  Resum amb les mitjanes i si pugen o baixen, la taula de **xifres del període** (sessions, mitjana, mínim, màxim, primera,
  última i tendència), una gràfica de cada dada amb el **valor escrit a cada punt**, opcionalment el wellness pregunta per
  pregunta i la càrrega (RPE × minuts), les mitjanes **per mesos i per setmanes** i la taula sessió a sessió. El PDF (`informeevoluciosessions_…`) es desa a *Informes › Sessions*.
- **Clar o fosc**: a la barra de qualsevol informe (el de la valoració, aquests dos, la fitxa de la sessió i el progrés) hi ha **Clar | Fosc**. El fosc fa
  servir els colors d'EON Life al revés: **fons granat** i text crema (dreta en rosa i esquerra en daurat). Es recorda
  per a cada pacient, i el PDF i el paper surten igual que a la pantalla.
- Els **comentaris del professional** no surten mai en cap d'aquests informes.

### PDF automàtics dels informes

Amb Microsoft 365, l'app fa **sola** els PDF dels informes de cada pacient i els deixa a la seva carpeta, dins **Informes**
(no cal prémer res):

| Carpeta | Què hi ha | Nom |
|---|---|---|
| *Informes › Valoracions* | un PDF per valoració amb dades (l'informe complet) | `informevaloracioinicial_lauravidalserra_20260702_01.pdf` |
| *Informes › Tests* | **un sol PDF «viu»** amb l'evolució dels tests clau, de la primera valoració a avui | `informetests_lauravidalserra_01.pdf` |
| *Informes › Sessions* | un PDF per **sessió feta** (la fitxa) i un PDF «viu» amb l'evolució de les sessions (RPE, dolor, wellness) | `sessio12_lauravidalserra_20261002_01.pdf` · `informeevoluciosessions_lauravidalserra_01.pdf` |
| *Informes › Arxiu* | els PDF d'una valoració o d'una sessió que s'ha esborrat | (el mateix nom) |

- **Es refan sols** quan algú canvia una valoració, una sessió o les dades del pacient i fa **un minut** que no hi toca (en
  acabar una sessió o en sortir de l'editor, al cap d'uns segons). **Només es refan els PDF que han canviat**, i el fitxer
  es **substitueix** (el nom és sempre el mateix: no se'n fan còpies), de manera que el que hi ha a SharePoint és sempre la
  versió final.
- Surten en el **disseny (clar o fosc) que té el pacient** a la barra de l'informe, igual que a la pantalla.
- Una **sessió només té PDF quan és *feta***. Si una valoració o una sessió s'esborra (o una sessió deixa de ser feta), el seu PDF
  **no s'esborra**: es mou a *Informes › Arxiu*. Mai es toca cap altre fitxer: els PDF que deseu a mà amb *Desa el PDF a la
  carpeta* (informes d'un sol apartat, un informe de tests amb data…) es queden on són.
- A la fitxa del pacient surt l'estat (*PDF dels informes al dia · fa 3 min*) amb **Fes-los ara**, i al menú **Excel** hi
  ha *Fes ara els PDF dels informes*, *Refés tots els PDF d'aquest pacient* i *Obre la carpeta «Informes»*.
- A **Configuració › PDF dels informes** hi ha l'**interruptor de pausa**, **Fes ara els PDF de tots els pacients** (només
  refà el que ha canviat) i **Refés-los tots**. En activar l'app no es fan PDF de tot l'històric per si sola: per als pacients
  que ja existeixen, premeu una vegada *Fes ara els PDF de tots els pacients*.
- Només es fan amb l'**app oberta i a la pantalla** (fer un PDF és feina de la tauleta: uns segons per informe) i amb
  connexió. Si no n'hi ha, queden pendents i es fan en tornar-hi.
- Les fotos de l'informe han d'estar a la carpeta del pacient; si no es troben, surt el requadre d'avís, com a la pantalla.

## Seguiment mensual

Pestanya **Seguiment mensual** de la fitxa del client (el mateix que l'Excel de control). També hi surten les
sessions previstes del pla d'entrenament.

- Calendari del mes amb cada sessió: número, objectiu i, a sota, l'**RPE** i el **dolor (EVA)** del final de la
  sessió, en dues etiquetes: **RPE** i **EVA** (l'EVA en verd, groc o vermell segons la intensitat), per veure d'un cop d'ull si pugen o baixen. Els diumenges sense sessió surten com a **OFF**.
- El **+** d'un dia buit dona dues opcions: **Programa la sessió sencera** (com sempre: del pla, copiant l'última,
  d'una plantilla o en blanc) o **Només l'objectiu**, per omplir el calendari ràpid: s'escriu l'objectiu (i el pilar,
  si vols), amb la **data** i l'**hora**, i surt al quadre del dia amb una vora daurada. Tocant-la es pot editar
  (també canviar-ne la data per moure-la, a més d'arrossegar-la), marcar com a **Feta** amb l'RPE,
  el dolor i la durada, o **Programa-la sencera** per afegir-hi els blocs i els exercicis. Colors: granat = feta,
  rosa = programada amb exercicis, blanc amb vora daurada = només l'objectiu, discontínua = prevista al pla.
- El mateix **+** també permet **Programa una valoració** (inicial, re-test, control o alta) amb el **dia**, l'**hora**
  i el **professional**: surt al calendari del pacient i al de la setmana de l'Inici amb una vora blava i el text
  «programada», i a l'Inici, a *Valoracions pendents*. Es pot arrossegar a un altre dia o tocar-la per canviar-la,
  treure-la o **Comença-la ara**. Mentre és programada no compta com a feta (ni per al resum, l'evolució, l'Excel o
  els informes); en començar-la (o en entrar-hi el primer resultat) passa a la data d'avui i s'omple com sempre. Si
  el dia que toca es prem **Valoració inicial** / **Nou re-test** a la fitxa, s'obre la programada.
- Pacient nou: al diàleg **Nou pacient** hi ha **Valoració inicial · dia / hora** (opcional). Si s'omple, el
  pacient es crea amb la valoració inicial ja programada al calendari, per avançar-ne la planificació.
- Columna **Setmana**: càrrega total, sessions fetes i RPE mitjà.
- **Progressió de càrregues**: taula exercici × sessió amb la càrrega i les sèries × reps de cada dia.
- **Planifica el mes**: crea d'una vegada les sessions d'un mes ja **planificades**. Tries el mes, els dies
  d'entrenament (p. ex. dilluns, dimecres i divendres) i, per a cada dia, d'on surt la sessió: **igual que l'última
  sessió d'aquell dia de la setmana**, una plantilla de sessió o en blanc. Pots fer que cada cop d'unes setmanes
  els exercicis que tenen progressió pugin un nivell. Salta els dies que ja tenen sessió. Després les obres i les
  ajustes una a una (o canvies la data a l'editor).
- **Copia la setmana** (a la columna *Setmana*): copia les sessions d'aquella setmana a les setmanes següents (fins
  a 12), també amb progressió, saltant els dies ocupats.

## L'Excel del client

L'app **fa sola un Excel per client** (`seguiment_lauravidalserra_01.xlsx`) a partir del que s'omple a l'app, amb el
format de l'Excel de control de l'equip (un full per mes amb les setmanes en columnes). Mai cal omplir-lo ni obrir-lo
per treballar. Pestanyes:

- **Resum**: sessions fetes i pendents, càrrega total, RPE i wellness mitjans, perfil, dates clau, plans, valoracions
  i càrrega setmanal.
- **Valoracions**: totes les valoracions l'una al costat de l'altra, amb el canvi entre les dues últimes.
- **Un full per mes** (`Oct26`, `Nov26`…): a dalt, el **calendari** de cada setmana (sessió i estat de cada dia,
  objectiu i focus dels blocs, RPE, temps, càrrega, wellness, dolor, observacions i total de la setmana); a sota,
  **cada sessió sencera** amb els exercicis de cada bloc (GM, contracció, posició, lateralitat, exercici, material,
  càrrega, sèries, repeticions, observacions), l'encoder sèrie a sèrie, els vídeos i el tancament. Verd = feta,
  beix = planificada, taronja = sense tancar, gris = prevista al pla o descans. Clicant la data d'un dia es va a la
  sessió.
- **Registre**: una fila per sessió per filtrar i ordenar.
- **Una pestanya per valoració** (`Val. inicial 02-07-26`, `Re-test 01-10-26`…) amb tot el detall, les fotos, els
  vídeos i els informes.

Amb **Microsoft 365** es puja sol a l'arrel de la carpeta del client uns segons després de l'últim canvi (i un cop al
dia es refà perquè *Sense tancar*, la propera sessió o el calendari siguin els d'avui); a la capçalera de la fitxa es
veu si és **al dia**. El menú **Excel** de la fitxa permet pujar-lo ara, obrir-lo, obrir les carpetes *Sessions* i
*Valoracions* (on van les fotos, els vídeos i els PDF) o descarregar-lo. A la **versió local** (sense núvol) es
descarrega des del menú **Excel** de la fitxa i des del menú de cada sessió i de cada valoració.

L'Excel és **només de lectura** (protegit sense contrasenya): les dades es corregeixen sempre a l'app i l'Excel es
refà sol. A **Configuració › Excel de cada client** es pot pausar la pujada o refer-los tots.

**Què fas a l'app i on surt a l'Excel** (no cal fer res més: tot es reflecteix sol)

| A l'app | A l'Excel del client |
|---|---|
| Crear o editar el client: dades, objectiu, motiu de consulta, antecedents, lesió o operació, esport, limitacions | **Resum**: perfil del client i dates clau (amb els dies que fa de la lesió o l'operació). El nom surt als títols i al nom del fitxer (si es canvia, el fitxer passa al nom nou) |
| Dissenyar una sessió (data, blocs, exercicis, prescripció, mètode, notes) o planificar-la | **Full del mes**: el dia al calendari i la sessió sencera a sota; i una fila al *Registre* (estat *Planificada*; passa a *Sense tancar* si la data ja ha passat) |
| *Planifica el mes* / *Copia la setmana* | Les sessions noves surten al full del mes |
| Pla d'entrenament amb progressió | *Resum* › Plans, i les sessions que encara no s'han fet surten al full del mes com a *Prevista al pla* |
| Wellness a l'inici de la sessió | Full del mes: el total al calendari i les 5 respostes a la sessió; al *Resum*, el wellness mitjà i el setmanal |
| Marcar els exercicis fets | ✔ davant de l'exercici; el dia es pinta de verd al calendari |
| Tancar la sessió (RPE, durada, dolor, decisió) | Calendari: RPE, temps, **càrrega (UA = RPE × minuts)**, dolor i observacions, i el total de la setmana; a sota, el tancament de la sessió |
| Encoder (ADR) i vídeo del client o de demostració | Una fila amb cada sèrie de l'encoder sota l'exercici; el nom de l'exercici obre el vídeo del client i *▶ demostració* el de demostració |
| Valoració inicial o re-test (tests, Kinvent, salts, patrons, conclusions) | **Valoracions** (evolució) i la **pestanya de la valoració** amb tot el detall |
| Fotos, vídeos, PDF de Kinvent i informe mèdic | A les carpetes *Valoracions* (i *Vídeos valoracions*) i *Sessions › Vídeos sessions d'entrenament*, amb l'enllaç des de l'Excel |
| Eliminar una sessió o canviar-la de dia | Desapareix del seu dia (o passa al dia i al mes nous) a l'Excel |

## Biblioteca

- **Exercicis** per bloc, **per grup muscular** (les mateixes carpetes de tren superior i inferior) o per
  **progressions**. A cada exercici: múscul principal, altres músculs implicats i el material amb què es pot fer.
- Més de 190 exercicis de base, amb els dels vostres Excel (Hip Thrust, RDL, Split Squat, Sumo Squat, HE,
  Dead Bug, Bike + Foam…) i els de les màquines del centre. Es poden editar, afegir-hi vídeo de demostració,
  consignes i prescripció per defecte.
- **Pulley Pro C2 Smart** (la politja cònica del centre; abans sortia com a «Politja cònica isoinercial», l'app canvia el
  nom sola a les dades ja desades). Cerqueu «Pulley Pro» a la biblioteca:
  - **Amb cinturó**: Accelerada i Accelerada de 2 passos (d'esquena a la politja), Frenada i Frenada de 2 passos
    (de cara a la politja), Sortida oberta (passa enrere i rotació cap a fora), Sortida tancada (passa enrere i rotació
    cap a dins), Squat amb cinturó, Split squat i Lateral lunge a la politja cònica, i Desplaçament lateral.
  - **Amb turmellera, de peu**: Kick back, Adducció i abducció, Patada d'isquios circular, Patada de quàdriceps
    circular, Patada alta d'isquios i Bessons i soli (Gem/Sol).
  - **Amb turmellera, estirat**: Kick back, Adducció i abducció, Patada d'isquios i Curl d'isquios.
  - **Més exercicis amb cinturó o arnès**: Pas creuat (crossover), Estocada frontal, Estocada enrere (reverse
    lunge), Squat búlgar, Pes mort romanès amb arnès i Pull-through.
  - **A la mà**: Rem a una mà i a dues mans dempeus, Press de pit a una mà, Curl de bíceps, Extensió de tríceps,
    Elevació lateral, Face pull i Rotació externa d'espatlla.
  - **Core**: Pallof press i Rotació de tronc (llenyataire).
  Cada un té la indicació, el múscul, el bloc i un dibuix en moviment fet a partir dels vídeos del centre, amb el
  con i la corda al cinturó, al turmell o a la mà.
- **kBox (Exxentric)**: cerqueu «kBox». Amb **armilla**: Squat, Split squat, Squat lateral, Squat búlgar i Elevació
  de talons. Amb **cinturó de maluc**: Squat (belt squat) i Split squat (sense càrrega a l'esquena ni als braços).
  Amb la **kBar**: Pes mort, Pes mort romanès, Rem inclinat, Rem alt (high pull), Encongiments, Curl de bíceps,
  Thruster, Front squat i Swing de maluc. Amb la **nansa**: Rem a una mà, Elevació lateral i Extensió de tríceps.
  Tots són de sobrecàrrega excèntrica: les 2 primeres repeticions engeguen el volant i la prescripció ho indica
  («6 + 2 d'arrencada»). El dibuix mostra la plataforma i la corja a l'armilla, al cinturó, a la barra o a la nansa.
- **Escala de coordinació** (bloc **Potència**, carpeta *Escala de coordinació*): coordinació i pliometria
  extensiva amb l'escala del centre, en quatre progressions de nivell 1 a 4. Peus ràpids: una passa i dues passes a
  cada forat, skipping. Lateral: dues passes a cada forat, icky shuffle, dins-dins-fora-fora. Salts: peus junts
  endavant, obrir i tancar (rayuela), dins i fora lateral, esquiador. A una cama: endavant i lateral. El dibuix
  mostra l'escala a terra; la prescripció per defecte és 3 × 2 passades amb 1' de descans.
- **Condicionament** (bloc **Accessoris**, carpeta *Condicionament*): Assault bike, SkiErg i Skillmill en format
  **Tabata** (8 × 20" a tope / 10" de descans, 4' en total) i Assault bike i SkiErg en **intervals**. També hi ha el
  mètode **Tabata** per posar-lo a un bloc o subbloc. Per al temps, el cronòmetre de la sessió: pestanya *Treball* 20 s.
- **Keiser · Michael Boyle** (cerca «Keiser»): els exercicis de la Keiser Functional Trainer que fa servir Boyle (MBSC).
  Core (bloc **Accessoris**, carpeta *Core · antirotació*): anti-rotation press (Pallof), **Push/Pull** (un braç empeny
  i l'altre estira; les espatlles no giren), i **chop** i **lift** amb mig genoll → de genolls → dret (famílies amb
  nivells, per progressar). A més: flexió de maluc estirat, split squat assistit (readaptació), rem a una mà amb mig genoll i press
  unilateral dempeus. També hi ha el **goblet squat amb cunya** (talons elevats), al bloc Força.
- **Potència del tren superior i salts** (bloc **Potència**): llançament de pilota medicinal estirat (sol i **reactiu
  amb company**: el company, dret al costat del cap, llança la pilota avall i el pacient la torna amunt com més
  ràpid millor), caiguda de genolls a flexió explosiva, salt vertical assistit amb goma i jump squat amb mancuernes.
- **Exercicis EON** (els que graveu vosaltres): a la biblioteca, vista **Exercicis EON**, hi ha una carpeta per
  bloc amb els exercicis numerats: 1.0, 1.1, 1.2… de mobilitat; 2.0, 2.1… d'activació, i així fins al 6. Amb
  **Afegeix el 1.4** es crea el següent, amb el codi, el bloc i el nom («1.4») ja posats: només cal enganxar
  l'enllaç de YouTube (el nom es pot canviar).
  A la sessió, **Afegeix exercici › Exercicis EON** és la primera carpeta, i el codi (p. ex. «1.3») també es pot
  escriure al cercador. Qualsevol exercici pot tenir codi EON (camp *Codi EON* de la fitxa de l'exercici).
- **Un exercici que no hi és** (per exemple un que heu gravat): cerqueu-lo i, si no surt, toqueu **Crea «…»**.
  S'obre la fitxa de l'exercici nou amb el nom ja escrit: trieu el bloc, el múscul i el material, i enganxeu
  l'enllaç de YouTube a **Vídeo de demostració**. La miniatura serà la imatge del vídeo. També es pot crear des
  d'«Afegeix exercici» a la sessió.
- **Els vostres exercicis** (*Biblioteca › Com afegir els vostres exercicis* ho explica també a l'app):
  1. **Biblioteca › Nou exercici**, o dins d'una sessió **Afegeix exercici ›** una carpeta **› Nou exercici en
     aquesta carpeta** (ja hi posa el múscul o el material de la carpeta).
  2. Nom, **bloc** (1 a 6), **múscul principal** (obligatori: és la carpeta on surt) i els altres músculs que treballa,
     i el **material** amb què es pot fer. A dalt del formulari, **On sortirà a «Afegeix exercici»** ensenya en directe
     les carpetes: *Tren inferior › Gluti major*, *Per material › Kettlebell*, *Els nostres exercicis › 4 · Força principal*…
  3. Vídeo de YouTube (en serà la miniatura) o, si no, un dibuix o una foto d'un entrenador.
  4. Opcional: família i nivell (botons ▲ ▼ de progressió), prescripció per defecte i consignes.

  Surten a la carpeta del seu múscul i del seu material, i a la carpeta **Els nostres exercicis** (per bloc). A la
  biblioteca, la casella **Només els nostres** els ensenya sols i porten l'etiqueta *Nostre*. Amb Microsoft 365 es desen
  a l'Excel del centre i els veu tot l'equip.
- **Plantilles** de bloc i de sessió. Qualsevol sessió es pot desar com a plantilla des del seu menú.

### Miniatures dels exercicis

Cada exercici té una miniatura: un **dibuix propi** de la postura (squat, pes mort, planxa, rem, salt…) amb el
material en el color del bloc (barra, mancuernes, kettlebell, goma als genolls, politja…). Es posa sol segons el nom
de l'exercici i, a la sessió, segons el material triat. Surt a «Afegeix exercici», a la biblioteca (vista
**Miniatures**, a la llista i a les progressions), a l'editor de la sessió i a la fitxa del client.

**En moviment**: el dibuix fa l'exercici: va de la posició inicial a la final i torna (uns 2,5 s, sense parar). Els
exercicis isomètrics (planxa, aguantar…) es queden quiets. Es pot aturar a **Configuració › Dibuixos dels exercicis ›
En moviment** (val per a aquell aparell); si la tauleta té activat «reduir el moviment», ja surten quiets.

**A la fitxa impresa (PDF)**: com que el paper no es mou, cada exercici surt amb **dos dibuixos, inici → final**, i el
nom a sota. Les fotos pròpies i les imatges de vídeo surten com sempre (una sola imatge).

Per canviar-la, obre l'exercici a la biblioteca:
- **Canvia el dibuix**: tria'n un altre d'entre tots els dibuixos.
- **Foto pròpia**: fes una foto amb la tauleta (o tria-la de la galeria). Es retalla en quadrat i es guarda petita
  amb l'exercici, i llavors és la miniatura a tot arreu. Ha de ser d'un entrenador fent l'exercici, mai d'un client.
- **Imatge del vídeo**: si l'exercici té un vídeo de demostració de YouTube (públic o «no llistat», no privat), la
  miniatura passa a ser sola la imatge del vídeo. Si no carrega (sense internet), surt el dibuix.
- **Treu la foto** torna al dibuix.

Els dibuixos són propis de l'app; no són imatges de Technogym ni de cap altra aplicació.

**Dibuixos en 3D (octubre de 2026)**: el maniquí té volum (cap, tronc en dos blocs, braços, mans, cames i peus) i es veu
des del **pla del moviment**: de costat (squat, bisagra, press…), **de cara** (elevacions laterals, estocada lateral,
planxa lateral, Copenhagen, dominades…), **en tres quarts** (rotacions: woodchop, Pallof, russian twist, quadrupèdia,
world's greatest stretch…) o **des de dalt** (planxa jack). Cada exercici té la seva postura inicial i final segons la
tècnica (p. ex. el **knee-to-wall es fa dempeus**, de cara a la paret, amb el taló a terra i el genoll tocant-la).
El material surt de **colors diferents del cos**, per distingir-lo ben bé:
- **blau acer**: barres, discos, mancuernes i kettlebells (la pica, més clara);
- **taronja**: gomes, loop bands i cables (amb la politja i la torre);
- **turquesa**: material tou (pilotes, fitball, foam roller, lliscadors);
- **gris/beix**: l'entorn (banc, caixa, paret, seient de màquina).
Més de 200 postures, amb banc, caixa, paret i màquines (premsa, extensió, curl, abductor, GHD, banc de lumbars…). En
mode fosc els colors s'aclareixen. Els dibuixos només es mouen mentre són a la pantalla (la llista de 400 exercicis no
carrega res de més).

Els ~400 dibuixos es van revisar un a un (octubre de 2026): fons de tríceps al banc, ab wheel, bicicleta, extensió de
maluc dempeus, superman, curl femoral amb lliscadors, kettlebell snatch, bisagra amb pica (la pica a l'esquena),
flexions amb les mans al banc i elevació de talons amb genolls flexionats. Si en veieu un que no s'entengui, digueu-ne
el nom (o feu-ne una captura): es corregeix el dibuix o, per a aquell exercici, **Canvia el dibuix**.

## NOE · l'assistent d'IA

El botó **NOE** (a baix a la dreta de qualsevol pantalla) obre el xat de l'assistent d'IA. Hi pots demanar, en català: *«qui no ha
entrenat els últims 14 dies?»*, *«com està la Laura?»*, *«proposa-li una sessió de força de tren inferior»*, *«planifica el
novembre per al Jordi»* o *«canvia el front squat d'aquesta sessió per una variant sense dolor de genoll»*. NOE llegeix les
dades de l'app, fa servir els exercicis i el material de la biblioteca i proposa tenint en compte lesions, valoracions i com
han respost a les últimes sessions.

- **Crea sessions dictant-les**: *«divendres tenim la Laura: volem sentadilla goblet, remo con goma, plancha, puente de glúteos,
  dominadas i bici suave»*. NOE troba el pacient, posa la **data exacta** del divendres, **busca tots els exercicis a la
  biblioteca d'un cop** (entén català, castellà i anglès: no cal que els busquis ni en sàpigues el nom exacte), els col·loca al seu
  bloc i omple sèries, repeticions i intensitat. Et deixa la targeta; si ha triat entre variants («plancha → Planxa frontal») t'ho
  diu. Només et pregunta si falta el pacient o el dia.
- **Els canvis són propostes**: surt una **targeta** amb el detall (sessions, blocs, exercicis, avisos). **No es crea ni es
  canvia res fins que prems *Aplica***; després hi ha **Obre** i **Desfés**. Pots descartar-la amb *Descarta*.
- Els pacients surten amb el seu nom a la pantalla, però **a la IA només arriben com a PAC-1, PAC-2… (sense nom, telèfon,
  correu ni data de naixement)**.
- NOE és una IA: **pot equivocar-se**. Revisa sempre el que proposa. No diagnostica ni substitueix el criteri del professional;
  davant de signes d'alarma recomana derivar.
- Cada aparell té **converses pròpies** (la icona del rellotge mostra les anteriors i *+* en comença una de nova).
- **Configuració › NOE**: clau de l'API (es queda en aquest aparell) **o** el **servidor del centre** (la clau no surt d'allà i
  les tauletes porten un codi d'accés; guia a `docs/noe-proxy/`), model, raonament, privacitat, consentiment, **Mode demostració**
  (sense IA ni cost) i **Prova la connexió**. NOE només funciona a la versió publicada de l'app, no a l'enllaç privat de prova.
  Més detalls (privacitat, cost) a `docs/NOE.md`.

## Teclat i accessibilitat

- **Esc** tanca només el que hi ha a sobre de tot (primer un diàleg o un menú, després el panell de NOE).
- Als diàlegs, **Tab** i **Maj+Tab** donen la volta pels seus botons i camps sense sortir-ne; en tancar-los, el cursor
  torna on era.
- El primer **Tab** de qualsevol pantalla és *Salta al contingut*. Les taules que es desplacen de costat al mòbil es poden
  moure amb les fletxes.
- Colors amb contrast suficient en mode clar i fosc, i títols i regions pensats per a lectors de pantalla.

## Actualitzacions de l'app

Cada cop que s'obre l'app (també des de la icona de la tauleta) i cada cop que torna a primer pla, mira si s'ha
publicat una versió nova. Si n'hi ha una i l'acabes d'obrir, s'actualitza sola; si ja hi estaves treballant, surt
l'avís **Hi ha una versió nova · Actualitza** (els canvis es desen abans de recarregar). A **Configuració › Versió de
l'app** es veu quina versió tens i hi ha el botó *Comprova si hi ha una versió nova*.

La versió local (`…/eonlife/demo/`) també es pot instal·lar a la tauleta: surt com una app a part, *EON Life demo*.
És la que es fa servir mentre l'app no està connectada al Microsoft 365 de la clínica: comença **sense clients de
prova** (els de les versions anteriors s'han esborrat sols; la biblioteca, les plantilles i la configuració es
queden) i les dades es guarden **només en aquell aparell**: el que s'afegeix a la tauleta no surt a l'ordinador.
Obriu-la sempre des de la icona i descarregueu sovint una còpia (**Configuració › Còpia de seguretat completa**; amb *Importa una còpia* es pot passar a un altre aparell). Si cal
ensenyar l'app amb clients ficticis, **Configuració › Carrega els clients de prova**.

## Configuració

- Professionals de l'equip (Ricardo Villamizar, Arnau, Oriol Pastor), nom del centre i noms dels blocs.
- **Material del centre**: barra olímpica, cònica isoinercial, Keiser, mancuernes Technogym, kettlebell, Skillmill,
  AlterG, leg extension, premsa, lower back bench, GHD, politja Technogym, Biostrength, abductor/adductor 700,
  Pulley Pro C2, kBox Lite, mobility ball, gomes, Flowin, bike, Skill Up, loop band i Power Personal. És el que surt
  primer en triar el material d'un exercici; se'n pot afegir o treure.
- Exportar a Excel (CSV): valoracions (una fila per valoració, una columna per test) i registre
  d'exercicis. Còpia de seguretat completa i importació.
- Amb Microsoft 365 o Google, enllaços directes a l'Excel (o full de càlcul) i a les carpetes dels clients. Amb Microsoft 365, també **Tanca la sessió** i **Canvia de carpeta**.
