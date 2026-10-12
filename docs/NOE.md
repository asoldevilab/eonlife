# NOE · l'assistent d'IA d'EON Life

NOE és un assistent d'intel·ligència artificial que viu dins l'app (botó **NOE** a baix a la dreta). L'equip hi parla en
català, com amb un company, i NOE:

- **ajuda a trobar coses**: «qui no ha entrenat els últims 14 dies?», «quins pacients tenen el re-test aviat?», «cerca
  exercicis de glutis amb goma», «on és la sessió en què vam fer hip thrust amb en…»;
- **explica com està un pacient**: resumeix la fitxa, l'última valoració (punts d'atenció, asimetries, patrons de
  moviment), com ha respost a les últimes sessions (RPE, dolor, wellness) i què caldria vigilar;
- **proposa sessions amb criteri científic i mèdic**: una sessió, un mes sencer, un pla de diverses setmanes, o canvis a
  una sessió que ja hi és (substituir, afegir o treure exercicis, canviar càrregues, l'objectiu o la data), sempre amb els
  exercicis i el material de la **biblioteca del centre** i amb el vocabulari de l'app (RIR, RPE, velocitat…);
- **recorda tenir en compte** lesions, limitacions, nivell, material, últimes valoracions i recuperació, i explica *per què*
  proposa el que proposa.

## Crear una sessió dictant-la («divendres tenim la Laura amb aquests exercicis»)

Pots escriure a NOE com ho diries a un company, **amb els exercicis tal com els dius** (en català, castellà o anglès):

> *Divendres tenim la Laura. Volem fer-li sentadilla goblet, remo con goma, plancha, puente de glúteos, dominadas i bici suave.*

NOE busca el pacient, converteix «divendres» en la **data exacta** (té el calendari dels propers 21 dies), **troba tots els
exercicis de la biblioteca d'un cop** (no els has de buscar ni dir-ne els identificadors: entén «sentadilla» = *squat*,
«plancha» = *planxa*, «puente de glúteos» = *pont de glutis*, «remo» = *rem*…), els **col·loca al seu bloc** (mobilitat, activació,
potència, força, accessoris, calma), **omple el que falti** (sèries, repeticions, intensitat, descans) segons l'objectiu i el nivell,
i et deixa una **targeta de proposta**. Tu la revises, i amb **Aplica** es crea la sessió planificada aquell dia (i amb **Desfés**
es treu).

- Si un nom és ambigu («plancha» pot ser frontal o lateral), NOE tria el més probable i **t'ho diu** («plancha → Planxa
  frontal»); a la targeta surt també com a avís, i li pots demanar que el canviï.
- Si un exercici **no existeix** a la biblioteca, es crea com a **exercici lliure** amb aquest nom i s'avisa.
- Només et pregunta si falta el pacient o el dia, o si un exercici important no s'assembla a res de la biblioteca.
- També val per canviar una sessió que ja hi és («a la sessió de divendres de PAC-1 canvia el goblet per un front squat») i per
  planificar un mes o un pla.

## Els canvis els fa la persona, no la IA

NOE **no pot desar res per si sola**. Quan proposa una cosa (una sessió, un mes, un pla, un canvi, una nota) surt una
**targeta de proposta** al xat, amb el detall (sessions, blocs, exercicis, avisos). Fins que no prems **Aplica**, no s'ha
creat ni canviat res. Després, des de la mateixa targeta, hi ha **Obre** (per anar a veure-ho) i **Desfés** (treu el que
s'ha creat o torna la sessió a com era). NOE no té cap eina per **esborrar** dades, ni per enviar missatges.

NOE sap què has decidit (aplicat, descartat, desfet) i ho té en compte a la conversa. També sap quina pantalla estàs
mirant («la fitxa de PAC-2»), de manera que pots dir «proposa-li una sessió de força» sense dir de qui.

## Posar-lo en marxa

Hi ha **dues maneres**. La B és la recomanada per al dia a dia del centre.

**A · Una clau a cada tauleta (el més ràpid per començar)**

1. **Configuració › NOE · assistent d'IA**.
2. Crea una clau de l'API a [console.anthropic.com](https://console.anthropic.com) (cal tenir saldo a l'API; és un pagament
   per ús, independent de la subscripció a Claude). Enganxa-la a *Clau de l'API* i prem **Desa**. **La clau es queda
   només en aquest aparell** (a l'emmagatzematge del navegador): no es desa al full de càlcul compartit, ni als
   informes, ni al repositori. A cada tauleta s'ha de posar una vegada.
3. Tria el **model** (per defecte *Claude Sonnet 5.5*, equilibrat; *Opus 5.5* és el més capaç i més car; *Haiku 5.5* és
   el més ràpid i econòmic) i el **raonament** (*Equilibrat* per defecte).
4. Marca la casella del **consentiment** (vegeu «Privacitat»).
5. **Prova la connexió**.

**B · Servidor del centre (la clau no surt mai d'allà)**

Un petit servidor propi (Cloudflare Worker, gratuït) guarda la clau; les tauletes només porten un **codi d'accés** que es pot
canviar o anul·lar, o s'identifiquen amb el **compte de Microsoft** del centre. Tens el codi i una guia pas a pas a
[`docs/noe-proxy/`](noe-proxy/README.md) (uns 15 minuts, sense instal·lar res). Quan el tens, poses l'adreça a
`app/m365.config.json` (`"noe": { "endpoint": "…" }`) i **totes les tauletes** ja la fan servir: només hi cal el codi i el
consentiment.

**Important**: NOE només funciona a la **versió publicada** de l'app (GitHub Pages / Microsoft 365), no a l'enllaç privat de
prova de Claude, que només té el mode demostració (aquell entorn no deixa parlar amb l'API).

Mentre no hi hagi clau ni servidor, hi ha el **Mode demostració**: respostes preparades, **sense IA ni cost**, que fan servir les
mateixes eines i targetes (entén «qui no ha entrenat…», «cerca…» i «planifica el mes de … per a …»). Serveix per veure com
funciona i per ensenyar-ho a l'equip.

### Com està fet (per a qui desenvolupa)

- El motor parla amb l'API de Missatges amb *streaming*, eines i memòria cau del prompt. Fa servir el **raonament adaptatiu** del
  model amb l'**esforç** triat (`output_config.effort`, *medium* per defecte) i un límit de resposta generós (16.000 tokens com a
  mínim, perquè el raonament compta dins el límit i una sessió o un mes llargs no es tallin).
- **El text del sistema es fixa a cada conversa** (inclòs el calendari dels propers dies): no canvia entre missatges, així la
  memòria cau del prompt funciona i els blocs de pensament dels torns anteriors continuen sent vàlids. En retallar una conversa
  molt llarga es treuen els blocs de pensament dels torns antics; i si l'API rebutgés un d'aquests blocs (un 400 que en parli),
  es treuen i es repeteix la petició una vegada.
- Les eines clau per crear sessions són `resoldre_exercicis` (llista de noms → exercicis de la biblioteca, amb confiança i
  alternatives; cerca difusa a `09-noe-search.js`) i `proposar_sessio`, que a més resol per nom els exercicis que no portin
  identificador.
- **Prova**: les proves fan servir un model simulat que llegeix el calendari i crida les eines com ho faria el real
  (`app/test/noe.test.mjs`). **La connexió amb l'API real només es pot comprovar amb una clau**: feu-ho amb *Prova la connexió*
  abans de fer-lo servir.

## Privacitat (dades de salut)

Les converses amb NOE s'envien a **Anthropic**, l'empresa que fa la IA Claude, perquè pugui respondre. Per limitar-ne
l'exposició:

- **Pseudonimització (activa per defecte)**: la IA veu els pacients com a **PAC-1, PAC-2…**. Mai hi arriben el **nom, el
  telèfon, el correu, el contacte d'emergència, la data de naixement (només l'edat), l'adreça de la carpeta ni fotos o
  vídeos**. Els noms que escrius al missatge es canvien pel codi abans d'enviar-lo, i els codis de la resposta es tornen a
  mostrar amb el nom (i com a enllaç). Dins els textos lliures (notes, antecedents) també es canvien els noms de pacients
  coneguts.
- Sí que hi arriba el que cal per fer bona feina: edat, sexe, pes i alçada, objectiu, esport, lesions i limitacions,
  antecedents, mesures de les valoracions, sessions i exercicis. **És informació de salut**: el centre ha de tenir cobert el
  tractament (contracte de tractament de dades amb el proveïdor, informació als pacients, base legal) abans d'activar-ho; per
  això NOE no s'activa fins que es marca el consentiment a Configuració. Aquesta guia no és assessorament legal.
- Les converses (i les propostes) es desen **només en aquest aparell**; es poden esborrar a *Esborra les converses*.
- Es pot desactivar la pseudonimització a Configuració, però no es recomana.

## Cost i límits

L'ús es paga per *tokens* a l'API. NOE fa servir la memòria cau del prompt (el coneixement de partida i les eines es
reutilitzen entre missatges, més barat), llegeix només les dades que necessita i talla els resultats molt llargs. A
*Configuració › NOE* es veu l'ús de la sessió. Si s'acaba el saldo, NOE ho diu en català («s'ha arribat al límit de
peticions o de crèdit»). Una conversa molt llarga s'escurça sola (es treuen els torns més antics).

## Què sap NOE

Un resum de criteris de **programació de la força i el condicionament** (sobrecàrrega progressiva, volum, RIR/RPE,
velocitat, potència i pliometria, descàrregues, escalfament, cardio, poblacions especials), de **readaptació per regions**
(genoll, LCA, isquiotibials, engonal, maluc, esquena, espatlla, turmell, postoperatori), de **seguretat** (banderes vermelles,
condicions a vigilar, límits de NOE) i de **com funciona aquesta app** (els 6 blocs de la sessió, els patrons puntuats amb
0 / − / −−, els llindars dels tests: asimetries, knee-to-wall, Y-Balance, re-test…). Està escrit a `app/src/js/09-noe-knowledge.js`
i es pot ampliar o corregir; s'hi basa en les recomanacions més esteses (ACSM, NSCA, literatura de readaptació) i **no substitueix
el criteri del professional ni un protocol mèdic**: NOE no diagnostica i, davant de signes d'alarma, recomana derivar.

A més, consulta en directe les dades de l'app amb les seves eines: llista i fitxa de pacients, valoracions, sessions, calendari
d'un mes, cerca global i la **biblioteca d'exercicis** (per bloc, grup muscular, material i nivell, amb les progressions de
cada família).

## Proves

Cap prova crida l'API real. Les proves fan servir un transport simulat (`Noe.state.transport`) i, per a la interfície, una
API de Microsoft/Anthropic simulada amb Playwright (`app/test/noe.test.mjs` i els passos «NOE» de `app/test/e2e.mjs`).
**La connexió amb l'API real només es pot comprovar amb una clau**: feu-ho amb *Prova la connexió* abans de fer-lo servir.
