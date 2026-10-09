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

## Els canvis els fa la persona, no la IA

NOE **no pot desar res per si sola**. Quan proposa una cosa (una sessió, un mes, un pla, un canvi, una nota) surt una
**targeta de proposta** al xat, amb el detall (sessions, blocs, exercicis, avisos). Fins que no prems **Aplica**, no s'ha
creat ni canviat res. Després, des de la mateixa targeta, hi ha **Obre** (per anar a veure-ho) i **Desfés** (treu el que
s'ha creat o torna la sessió a com era). NOE no té cap eina per **esborrar** dades, ni per enviar missatges.

NOE sap què has decidit (aplicat, descartat, desfet) i ho té en compte a la conversa. També sap quina pantalla estàs
mirant («la fitxa de PAC-2»), de manera que pots dir «proposa-li una sessió de força» sense dir de qui.

## Posar-lo en marxa

1. **Configuració › NOE · assistent d'IA**.
2. Crea una clau de l'API a [console.anthropic.com](https://console.anthropic.com) (cal tenir saldo a l'API; és un pagament
   per ús, independent de la subscripció a Claude). Enganxa-la a *Clau de l'API* i prem **Desa**. **La clau es queda
   només en aquest aparell** (a l'emmagatzematge del navegador): no es desa al full de càlcul compartit, ni als
   informes, ni al repositori. A cada tauleta s'ha de posar una vegada.
3. Tria el **model** (per defecte *Claude Sonnet 5.5*, equilibrat; *Opus 5.5* és el més capaç i més car; *Haiku 5.5* és
   el més ràpid i econòmic).
4. Marca la casella del **consentiment** (vegeu «Privacitat»).
5. **Prova la connexió**.

Mentre no hi hagi clau, hi ha el **Mode demostració**: respostes preparades, **sense IA ni cost**, que fan servir les
mateixes eines i targetes (entén «qui no ha entrenat…», «cerca…» i «planifica el mes de … per a …»). Serveix per veure com
funciona i per ensenyar-ho a l'equip; a l'enllaç privat de prova només hi ha aquest mode.

### Servidor intermediari (recomanat per a producció)

Posar la clau a cada tauleta és còmode però no és ideal: qui tingui accés al navegador d'aquella tauleta podria llegir-la. Per
a una instal·lació definitiva, el centre pot tenir **un petit servidor propi que guarda la clau** i que l'app crida en lloc
d'Anthropic: a *Opcions avançades › Servidor intermediari* s'escriu l'adreça i l'app deixa d'enviar-hi la clau. Exemple per a
un *Cloudflare Worker* (la clau va com a secret `ANTHROPIC_API_KEY`, i `ALLOWED_ORIGINS` és l'adreça de l'app, p. ex.
`https://asoldevilab.github.io`):

```js
export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const allowed = (env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim());
    const cors = {
      'Access-Control-Allow-Origin': allowed.includes(origin) ? origin : allowed[0],
      'Access-Control-Allow-Headers': 'content-type, anthropic-version, x-api-key',
      'Access-Control-Allow-Methods': 'POST, OPTIONS', Vary: 'Origin',
    };
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    if (request.method !== 'POST' || !allowed.includes(origin)) return new Response('Forbidden', { status: 403, headers: cors });
    const up = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'anthropic-version': '2023-06-01', 'x-api-key': env.ANTHROPIC_API_KEY },
      body: request.body,
    });
    return new Response(up.body, { status: up.status, headers: { ...cors, 'content-type': up.headers.get('content-type') || 'application/json' } });
  },
};
```

Aquest exemple comprova l'`Origin`, que **no és una autenticació forta** (només la fan servir els navegadors); per protegir-lo de
debò cal afegir-hi, per exemple, *Cloudflare Access* o la validació d'un token de Microsoft Entra, i posar-hi un límit de
peticions. El mateix es pot fer amb una *Azure Function*. L'app envia la petició tal com l'accepta l'API de Missatges
(`/v1/messages`, amb *streaming*).

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
