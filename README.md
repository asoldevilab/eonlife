# EON Life · Human Performance

Aplicació per al seguiment dels clients del centre: **valoració funcional**, **sessions de 6 blocs**
i **seguiment mensual**, amb les dades al **full de càlcul de Google** del centre i els vídeos i
informes a la **carpeta de Drive** de cada client.

Substitueix l'Excel mensual per client, la plantilla de sessió, la plantilla de My Jump i el
«EON Human Performance System v1», mantenint-ne l'estructura:

| Abans (Excel / PDF) | Ara a l'app |
|---|---|
| Valoració funcional (PDF) i `02_FICHA_VALORACION` | Formulari de tauleta amb el protocol EON i càlculs automàtics · **informe per ensenyar al client** |
| Plantilla My Jump | Intents de salt, resum automàtic i importació del CSV de My Jump Lab |
| Ficha de sesión / `12_FICHA_SESION` | Sessió de **6 blocs**: Mobilitat · Activació · Potència · Força principal · Accessoris · Tornada a la calma · **fitxa per al client** en pantalla o PDF |
| Excel mensual (Obj, RPE, T, Càrrega, Obs) | **Seguiment mensual**: calendari, càrrega RPE × minuts, resum setmanal i progressió de càrregues |
| Full *DB* (dates IQ i lesió) | Dates clau a la fitxa del client amb dies i setmanes |
| Taules centrals amb `PATIENT_ID` | Un full de càlcul central, una fila per registre i una columna per test |

## Provar-la ara mateix

Obre [`dist/eonlife.html`](dist/eonlife.html) amb Chrome o Safari (descarrega'l i fes-hi doble clic).
S'obre en **mode de prova** amb quatre clients ficticis; les dades es guarden només en aquell
navegador.

## Posar-la en marxa per a tot l'equip

Segueix [docs/INSTALLACIO.md](docs/INSTALLACIO.md): un full de càlcul de Google, copiar dos fitxers
a Apps Script i publicar-la com a aplicació web. No cal cap servidor ni cap subscripció.

## Documentació

- [Instal·lació a Google](docs/INSTALLACIO.md)
- [Guia d'ús per a l'equip](docs/GUIA-US.md)
- [Dades, personalització i estructura del codi](docs/DADES.md)
