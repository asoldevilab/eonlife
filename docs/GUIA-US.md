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

També es pot començar des de **Afegeix mesures** (menú lateral i inici) o des de la fitxa de cada
client: **Registrar mesures › Mobilitat / Dinamometria / Y-Balance / Salts / Patrons**.

## Clients

- **Inici** mostra les sessions d'avui i dels propers 7 dies, els re-tests pendents
  (cada 3 mesos) i la llista de clients amb filtres per estat, perfil i professional.
- **Nou client**: nom, cognoms, perfil i professional. A Google es crea automàticament la
  carpeta de Drive del client.
- **Perfil A · B · C** (de la plantilla EON):
  A = rendiment / esportistes · B = salut i condició física · C = autonomia (adults grans).
  El perfil decideix quins tests complementaris surten a la valoració.
- **Dates clau**: data de la intervenció (IQ) i de la lesió. A la capçalera es veuen els dies i
  setmanes que han passat (com el full *DB* de l'Excel mensual).

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
  vídeo de la carpeta del client.
- **Importa CSV de My Jump**: exporta el CSV des de My Jump Lab i puja'l; l'app detecta les
  columnes (tipus de salt, altura, força, velocitat, potència, RSI-mod) i afegeix els intents.
- A **Conclusions i pla** hi ha els punts d'atenció calculats sols. Hi afegiu els punts forts,
  les prioritats, les decisions i la data del re-test (per defecte, 3 mesos després).
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
- **Afegeix exercici** › escriu i tria de la biblioteca: s'omplen sols el material, la
  contracció (CON/ECC/ISO), la posició (Bp, Ds…), la lateralitat (BL/UL) i la prescripció per defecte.
- Una línia per exercici: **sèries × reps/temps · càrrega · intensitat (RIR/RPE) · descans**.
  Exemple: 3 × 6 · 60 kg · RIR 2 · 2'.
- Sota de cada exercici surt **Anterior**: què va fer el client l'última vegada, per decidir la progressió.
- Botó de **plantilles** de cada bloc: insereix un bloc desat o desa el bloc actual com a plantilla.
- **Com arriba avui?** son, energia i dolor abans de començar.
- **Tancament**: RPE de la sessió (0–10) i minuts › la **càrrega** (RPE × minuts, UA) es calcula
  sola; dolor en acabar, observacions i decisió per a la propera sessió. **Marca com a feta**.

### Presentar-la al client

Botó **Presenta**: fitxa neta amb el logotip, l'objectiu d'avui, els 6 blocs i cada exercici ben
escrit. Es pot posar a pantalla completa, en tema fosc, o **Imprimeix / PDF** (A4) per desar-la a
la carpeta del client.

## Seguiment mensual

Pestanya **Seguiment mensual** de la fitxa del client (el mateix que l'Excel de control):

- Calendari del mes amb cada sessió: número, objectiu, RPE, minuts i càrrega. Els diumenges sense
  sessió surten com a **OFF**.
- Columna **Setmana**: càrrega total, sessions fetes i RPE mitjà.
- **Progressió de càrregues**: taula exercici × sessió amb la càrrega i les sèries × reps de cada dia.

## Biblioteca

- **Exercicis** per bloc (més de 80 de base, amb els dels vostres Excel: Hip Thrust, RDL, Split
  Squat, Sumo Squat, HE, Dead Bug, Bike + Foam…). Es poden editar, afegir-hi vídeo de demostració,
  consignes i prescripció per defecte.
- **Plantilles** de bloc i de sessió. Qualsevol sessió es pot desar com a plantilla des del seu menú.

## Configuració

- Professionals de l'equip, nom del centre i noms dels blocs.
- Exportar a Excel (CSV): valoracions (una fila per valoració, una columna per test) i registre
  d'exercicis. Còpia de seguretat completa i importació.
- Amb Google, enllaços directes al full de càlcul i a la carpeta de clients.
