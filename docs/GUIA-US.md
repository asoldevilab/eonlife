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

**Clients · Valoracions · Mobilitat (K-Move) · Neurodinàmia i postural · Dinamometria (K-Push) ·
Y-Balance · Salts (My Jump) · Encoder i bike · Patrons · Tests per perfil · Sessions · Registre d'exercicis**

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

També es pot començar des de **Afegeix mesures** (menú lateral i inici) o des de la fitxa de cada
client: **Registrar mesures › Mobilitat / Dinamometria / Y-Balance / Salts / Patrons**.

## Clients

- **Inici** mostra les sessions d'avui i dels propers 7 dies, els re-tests pendents
  (cada 3 mesos) i la llista de clients amb filtres per estat, servei i professional.
- **Nou client**: nom, cognoms, servei i professional. Amb Microsoft 365 o Google es crea automàticament
  la carpeta del client (amb *01 · Valoracions*, *02 · Vídeos* i *03 · Informes*).
- **Servei**: *Valoració inicial* o *Seguiment membership*. Surt a la capçalera de la fitxa, al filtre de l'inici
  i a la columna *Servei* de l'Excel. Es canvia a la pestanya **Fitxa › Seguiment al centre**.
- **Professional de referència**: Richy, Arnau o Oriol Pastor (fisioteràpia). La llista es canvia a **Configuració**.
- **Bateria del perfil A · B · C** (de la plantilla EON), dins de la valoració:
  A = rendiment / esportistes · B = salut i condició física · C = autonomia (adults grans).
  Decideix quins tests complementaris surten a la valoració.
- **Dates clau**: data de la intervenció (IQ) i de la lesió. A la capçalera es veuen els dies i
  setmanes que han passat (com el full *DB* de l'Excel mensual).

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

Amb Microsoft 365, **Desa el PDF a la carpeta** guarda l'informe original a *03 · Informes* del client.
Funciona millor si l'informe té els títols (*Motiu de consulta:*, *Antecedents:*…) al començament de cada línia.

## Valoració funcional

Botó **Nova valoració** a la fitxa del client. Les seccions segueixen el document
*Valoració funcional · Human Performance*:

| Secció | Què hi ha | Càlcul automàtic |
|---|---|---|
| Mobilitat | Goniometria Kinvent K-Move (maluc, espatlla, genoll), knee-to-wall, neurodinàmia (Slump, PKB), anàlisi postural (Adams, Thomas, Windlass) | Asimetria D/E en %, alerta si knee-to-wall < 8 cm o diferència ≥ 4 cm |
| Força | Dinamometria Kinvent K-Push (leg extension, leg curl 90/90 i 30/30, squeeze, rotadors de maluc), Single Leg Squat, Y-Balance | Asimetria, N/kg, ràtio isquios/quàdriceps, composite del Y-Balance i diferència anterior ≥ 4 cm |
| Rendiment | CMJ (My Jump), encoder (squat, RDL, hip thrust), Assault bike 30 s (fase 2) | Millor salt, mitjana, W/kg, RSI-mod, índex de fatiga |
| Patrons (Sessió 1) | Squat, Lunge, Pes mort, RDL, Hip Thrust, Lateral Lunge, Copenhagen | Escala 0 / − / −− i P (dolor → fisio). Als unilaterals compta el pitjor costat. Decisió proposada segons la puntuació |
| Perfil | Tests A/B/C: 5-0-5, lateral step down, chair stand, TUG, 6MWT, 4 Stage Balance… | Alertes de risc de caiguda (TUG ≥ 12 s, no manté el tàndem) |
| Altres mesures | Qualsevol mesura nova | Es desa també al full |

Consells:

- Les **D** i **E** són dreta i esquerra. Els decimals es poden escriure amb coma.
- La icona de **nota** obre un camp d'observacions per a cada test; la de **vídeo** enllaça el
  vídeo de la carpeta del client. Amb Microsoft 365, **Grava o puja un vídeo** obre la càmera o la galeria
  de la tauleta i el desa directament a *02 · Vídeos* de la carpeta del client.
- **Informes i fitxers**: *Adjunta l'informe de Kinvent* puja el PDF desat a la tauleta a *01 · Valoracions*
  de la carpeta del client (amb Microsoft 365). Els valors de dreta i esquerra s'escriuen igualment als tests.
  A la **versió de prova** (sense Microsoft 365) també es tria el PDF o es grava el vídeo, però es queden només en
  aquella tauleta: no els veu cap altre aparell.
- **Importa CSV de My Jump**: exporta el CSV des de My Jump Lab i puja'l; l'app detecta les
  columnes (tipus de salt, altura, força, velocitat, potència, RSI-mod) i afegeix els intents.
- A **Conclusions i pla** hi ha els punts d'atenció calculats sols. Hi afegiu els punts forts,
  les prioritats, les decisions i la data del re-test (per defecte, 3 mesos després).
- **Informe per apartat**: al costat del títol de cada apartat (Mobilitat, Força, Rendiment, Patrons, Perfil) hi ha
  *Informe de …*: només aquell apartat, els seus vídeos i la comparació amb l'última vegada que es va mesurar.
  Quan es repeteix un apartat (per exemple, els patrons al cap d'un mes), es fa amb **Afegeix mesures** i el seu
  informe ja surt comparat amb l'anterior. A la barra de l'informe es pot canviar entre *Informe complet* i cada apartat.
- **Vídeos a l'informe**: tots els vídeos enllaçats surten a l'informe, amb la miniatura (amb Microsoft 365 es
  reprodueixen allà mateix) i un codi QR per obrir-los des del PDF o el paper.
- **Informe**: presentació per ensenyar al client en pantalla. Amb el botó
  *Sense notes / Amb notes* es mostren o s'amaguen les observacions internes de cada test.
  Si hi ha una valoració anterior, surt la comparació de les mètriques clau.

## Sessions de 6 blocs

Cada sessió té sempre els mateixos blocs, en aquest ordre:

1. **Mobilitat** 2. **Activació** 3. **Potència** 4. **Força principal** 5. **Accessoris** 6. **Tornada a la calma**

### Crear-ne una

**Nova sessió** a la fitxa del client (o toca un dia buit del *Seguiment mensual*) i tria:

- **Copia l'última sessió** — la manera més ràpida de progressar setmana a setmana.
- **A partir d'una plantilla** — p. ex. *Sessió tipus · tren inferior (genoll)*.
- **Sessió en blanc**.

### Omplir-la

- A cada bloc: **focus** (p. ex. *Dominant de genoll*) i els exercicis.
- **Afegeix exercici** obre les carpetes de la biblioteca:
  1. **Grup muscular**: *Tronc superior* (pectoral, dorsal, deltoides, bíceps, tríceps, trapezi…), *Tronc inferior*
     (quàdriceps, isquiotibials, glutis, adductors, bessons…), *Core* i *Cos sencer i altres*. Un exercici surt a la
     carpeta de cada múscul principal que treballa (el press de banca, a Pectoral i a Tríceps).
  2. **Exercici**: amb el nivell (N1–N5), els músculs i la prescripció per defecte.
  3. **Amb quin material?**: el material del centre amb què es pot fer (barra olímpica, mancuernes Technogym,
     kettlebell, kBox, Keiser, cònica, politja…).
  També hi ha la carpeta **Per material** (p. ex. *Loop band Technogym* amb els seus 50 exercicis): triant
  l'exercici des d'aquí ja queda posat el material.
  A dalt hi ha el cercador (nom, múscul, material o el nom en anglès de l'app de Technogym) i *Tots els blocs*. A Força principal i Accessoris surten els
  exercicis de tots dos blocs. **Exercici en blanc** és per escriure'n un que no és a la biblioteca.
  S'omplen sols el material, la contracció (CON/ECC/ISO), la posició (Bp, Ds…), la lateralitat (BL/UL) i la
  prescripció per defecte. El material i el grup muscular es poden canviar als *Detalls* de l'exercici.
- Una línia per exercici: **sèries × reps/temps · càrrega · intensitat (RIR/RPE) · descans**.
  Exemple: 3 × 6 · 60 kg · RIR 2 · 2'.
- Sota de cada exercici surt **Anterior**: què va fer el client l'última vegada, per decidir la progressió.
- **Vídeo de demostració** (icona ▶ de cada exercici): l'enllaç del vídeo de YouTube on el professional fa
  l'exercici. Es veu allà mateix. Si marques *Desa'l a la biblioteca*, aquell exercici sortirà sempre amb el vídeo.
  A YouTube, pugeu-lo com a **No llistat** (no *Privat*: un vídeo privat només el pot veure qui l'ha pujat).
- **Grava el client** (icona de càmera de cada exercici): amb Microsoft 365, **Grava ara** obre la càmera de la
  tauleta i el vídeo es desa sol a *02 · Vídeos* de la carpeta del client, enllaçat a l'exercici.
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
- **Com arriba avui?** son, energia i dolor abans de començar.
- **Tancament**: RPE de la sessió (0–10) i minuts › la **càrrega** (RPE × minuts, UA) es calcula
  sola; dolor en acabar, observacions i decisió per a la propera sessió. **Marca com a feta**.

### Presentar-la al client

Botó **Presenta**: fitxa neta amb el logotip, l'objectiu d'avui, els 6 blocs i cada exercici ben
escrit. Es pot posar a pantalla completa, en tema fosc, o **Imprimeix / PDF** (A4) per desar-la a
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

### Professional de la sessió

Les sessions noves es fan a nom del professional que va triar l'última vegada **aquella tauleta** (no del
professional de referència del client). Si avui el client el porta un altre company, el canvia a dalt de la
sessió i la tauleta ho recorda per a la propera.

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

## Seguiment mensual

Pestanya **Seguiment mensual** de la fitxa del client (el mateix que l'Excel de control). També hi surten les
sessions previstes del pla d'entrenament.

- Calendari del mes amb cada sessió: número, objectiu, RPE, minuts i càrrega. Els diumenges sense
  sessió surten com a **OFF**.
- Columna **Setmana**: càrrega total, sessions fetes i RPE mitjà.
- **Progressió de càrregues**: taula exercici × sessió amb la càrrega i les sèries × reps de cada dia.

## Biblioteca

- **Exercicis** per bloc, **per grup muscular** (les mateixes carpetes de tronc superior i inferior) o per
  **progressions**. A cada exercici: múscul principal, altres músculs implicats i el material amb què es pot fer.
- Més de 190 exercicis de base, amb els dels vostres Excel (Hip Thrust, RDL, Split Squat, Sumo Squat, HE,
  Dead Bug, Bike + Foam…) i els de les màquines del centre. Es poden editar, afegir-hi vídeo de demostració,
  consignes i prescripció per defecte.
- **Plantilles** de bloc i de sessió. Qualsevol sessió es pot desar com a plantilla des del seu menú.

## Configuració

- Professionals de l'equip (Richy, Arnau, Oriol Pastor), nom del centre i noms dels blocs.
- **Material del centre**: barra olímpica, cònica isoinercial, Keiser, mancuernes Technogym, kettlebell, Skillmill,
  AlterG, leg extension, premsa, lower back bench, GHD, politja Technogym, Biostrength, abductor/adductor 700,
  Pulley Pro C2, kBox Lite, mobility ball, gomes, Flowin, bike i Skill Up. És el que surt primer en triar el material
  d'un exercici; se'n pot afegir o treure.
- Exportar a Excel (CSV): valoracions (una fila per valoració, una columna per test) i registre
  d'exercicis. Còpia de seguretat completa i importació.
- Amb Microsoft 365 o Google, enllaços directes a l'Excel (o full de càlcul) i a les carpetes dels clients. Amb Microsoft 365, també **Tanca la sessió** i **Canvia de carpeta**.
