# Servidor intermediari de NOE (recomanat per a producció)

Per defecte, NOE necessita una **clau de l'API d'Anthropic a cada tauleta**. Funciona, però qui tingui accés al navegador
d'una tauleta podria llegir-la. Aquest petit servidor (un *Cloudflare Worker*, gratuït per a aquest ús) **guarda la clau
una sola vegada** i les tauletes només porten un **codi d'accés del centre** que es pot canviar o anul·lar en qualsevol
moment sense tocar la clau. A més:

- només deixa passar peticions que vinguin de l'app (`ALLOWED_ORIGINS`) i amb un codi vàlid o amb el compte de Microsoft
  del centre;
- només accepta els models que tu triïs i limita la longitud de cada resposta (cost);
- no desa mai el contingut de les converses (només el model i el resultat de cada petició).

## Posar-lo en marxa (uns 15 minuts, sense instal·lar res)

1. Crea un compte gratuït a [cloudflare.com](https://dash.cloudflare.com/sign-up) i entra a **Workers & Pages › Create ›
   Create Worker**. Posa-hi un nom (p. ex. `eonlife-noe`) i prem **Deploy**.
2. Prem **Edit code**, esborra el que hi ha, enganxa-hi **tot el contingut de [`worker.js`](worker.js)** i prem **Deploy**.
3. Ves a **Settings › Variables and Secrets** i afegeix:

   | Nom | Tipus | Valor |
   |---|---|---|
   | `ANTHROPIC_API_KEY` | Secret | la clau de l'API (`sk-ant-…`, de [console.anthropic.com](https://console.anthropic.com)) |
   | `ALLOWED_ORIGINS` | Text | l'adreça de l'app: `https://asoldevilab.github.io` |
   | `ACCESS_CODES` | Secret | un o diversos codis d'accés separats per comes (p. ex. `tauleta-recepcio-7f3k9x2m,tauleta-sala-q8w2n5pz`: llargs i diferents) |
   | `ENTRA_TENANT_ID` | Text (opcional) | l'Id. del directori de Microsoft (el de `app/m365.config.json`) |
   | `ENTRA_CLIENT_ID` | Text (opcional) | l'Id. de l'aplicació d'Entra (el de `app/m365.config.json`) |
   | `ALLOWED_EMAILS` | Text (opcional) | qui hi pot accedir amb Microsoft: correus o dominis (`@eonlife.cat`); buit = tothom del directori |
   | `ALLOWED_MODELS` | Text (opcional) | models permesos (per defecte, Sonnet 5.5, Opus 5.5, Haiku 5.5 i Fable 5.1) |
   | `MAX_TOKENS_CAP` | Text (opcional) | màxim de longitud per resposta (per defecte 64000) |

   Cal **`ACCESS_CODES`** o bé **`ENTRA_TENANT_ID` + `ENTRA_CLIENT_ID`**: sense cap dels dos, el servidor no deixa passar res.
4. Copia l'adreça del Worker (**`https://eonlife-noe.EL-TEU-NOM.workers.dev`**). L'adreça per a l'app és aquesta + `/v1/messages`.
5. Posa-la a l'app, de dues maneres:
   - **A totes les tauletes alhora** (recomanat): a `app/m365.config.json` canvia `"noe": { "endpoint": "" }` per
     `"noe": { "endpoint": "https://eonlife-noe.EL-TEU-NOM.workers.dev/v1/messages" }` i publica l'app. Les tauletes ja no
     necessiten cap clau: només hi han de posar el codi d'accés (pas 6) i acceptar el consentiment.
   - **A una tauleta**: *Configuració › NOE › Opcions avançades › Servidor intermediari*.
6. A cada tauleta: *Configuració › NOE › Codi d'accés del centre* (un dels de `ACCESS_CODES`), marca el consentiment i prem
   **Prova la connexió**. Amb el compte de Microsoft (versió Microsoft 365 de l'app) i `ENTRA_*` configurats, la tauleta ja
   s'identifica sola amb l'inici de sessió i **no cal codi**.

## Control del cost i de l'ús

- A [console.anthropic.com › Limits](https://console.anthropic.com) posa un **límit de despesa mensual** a l'API: és el
  tall definitiu si algú en fes un mal ús.
- A Cloudflare (**Security › WAF › Rate limiting rules**) pots limitar les peticions per adreça (p. ex. 30 per minut).
- **Per anul·lar una tauleta o una persona**: treu-ne el codi de `ACCESS_CODES` (i desa). Les altres no es veuen afectades.
  **Per canviar la clau d'Anthropic**: actualitza el secret `ANTHROPIC_API_KEY`; ni les tauletes ni l'app ho noten.
- A **Workers › Logs** només hi surt *qui* (codi o correu), el *model* i l'*estat* de cada petició. No hi surt cap contingut.

## Privacitat

Les peticions passen pel Worker (Cloudflare actua com a encarregat del trànsit) i arriben a Anthropic. Les dades que surten de
l'app ja van **pseudonimitzades** (PAC-1…, sense noms ni dades de contacte; vegeu `docs/NOE.md`). Recorda tenir-ho reflectit al
registre d'activitats de tractament i als contractes amb els encarregats. Aquesta guia no és assessorament legal.

## Per a qui desenvolupa

`worker.js` és un mòdul ES (`export default { fetch }`) sense dependències; es pot desplegar també amb `wrangler deploy`
(vegeu `wrangler.toml`). Les proves són a `app/test/noe-proxy.test.mjs` (`npm test`): comproven l'origen, els codis, la
signatura i la caducitat del token d'Entra, els models, els límits i el reenviament.
