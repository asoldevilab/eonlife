# EON Life · Human Performance

Aplicació per al seguiment dels clients del centre: **valoració funcional**, **sessions de 6 blocs**
i **seguiment mensual**, amb totes les dades en un **Excel de la carpeta compartida de Microsoft 365**
(o al full de càlcul de Google) i els vídeos i informes a la **carpeta de cada client**.

Substitueix l'Excel mensual per client, la plantilla de sessió, la plantilla de My Jump i el
«EON Human Performance System v1», mantenint-ne l'estructura:

| Abans (Excel / PDF) | Ara a l'app |
|---|---|
| Valoració funcional (PDF) i `02_FICHA_VALORACION` | Formulari de tauleta amb el protocol EON i càlculs automàtics · **informe per ensenyar al client** |
| Plantilla My Jump | Intents de salt, resum automàtic i importació del CSV de My Jump Lab |
| Ficha de sesión / `12_FICHA_SESION` | Sessió de **6 blocs**: Mobilitat · Activació · Potència · Força principal · Accessoris · Tornada a la calma · **fitxa per al client** en pantalla o PDF |
| Excel mensual (Obj, RPE, T, Càrrega, Obs) | **Seguiment mensual**: calendari, càrrega RPE × minuts, resum setmanal i progressió de càrregues, i **Planifica el mes** per dissenyar sessions futures |
| L'Excel de control de cada client (un full per mes) i els de sessions i valoracions | **Excel del client automàtic**: l'app en fa un per client (`seguiment_…_01.xlsx`) amb el resum, un full per mes amb el calendari i les sessions senceres, el registre i les valoracions, i amb Microsoft 365 el deixa a la carpeta del client |
| Full *DB* (dates IQ i lesió) | Dates clau a la fitxa del client amb dies i setmanes |
| Taules centrals amb `PATIENT_ID` (Kinvent ROM, dinamometria, Y-Balance, My Jump…) | **Base de dades** dins de l'app, amb una taula per àrea i botó «+ Afegeix», i el mateix a un full de càlcul central (una fila per registre, una columna per test) |

## Provar-la ara mateix

Obre [`dist/eonlife.html`](dist/eonlife.html) amb Chrome o Safari (descarrega'l i fes-hi doble clic).
S'obre en **mode de prova** amb quatre clients ficticis; les dades es guarden només en aquell
navegador.

## Posar-la en marxa per a tot l'equip

- **Microsoft 365** (OneDrive, SharePoint o Teams): [docs/INSTALLACIO-M365.md](docs/INSTALLACIO-M365.md).
  Una carpeta compartida, registrar l'app a Microsoft Entra i publicar una pàgina web. Cada professional entra
  amb el seu compte de l'empresa; les dades van a l'Excel «EON Life · Base de dades» de la carpeta i els vídeos,
  a la carpeta de cada client (es poden gravar i pujar directament des de la tauleta).
- **Google**: [docs/INSTALLACIO.md](docs/INSTALLACIO.md). Un full de càlcul de Google, copiar dos fitxers a
  Apps Script i publicar-la com a aplicació web.

No cal cap servidor ni cap subscripció nova.

## Documentació

- [Instal·lació amb Microsoft 365](docs/INSTALLACIO-M365.md)
- [Instal·lació a Google](docs/INSTALLACIO.md)
- [Guia d'ús per a l'equip](docs/GUIA-US.md)
- [Dades, personalització i estructura del codi](docs/DADES.md)
