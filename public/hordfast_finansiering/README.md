# Hordfast-kalkulator: kontroll av Deloittes finansielle analyse

Interaktiv kalkulator som gjenskaper Deloittes finansielle modell for Hordfast og lar leseren endre premissene. Laget som vedlegg til notatet «Deloittes Hordfast-analyse: kontrollberegning og vurdering» (november 2026).

**Kilde:** Deloitte Valuation & Modelling, «Hordfast. Finansiell analyse – Endelig rapport», 12.08.2026, oppdragsgiver Stavanger2Bergen AS. Rapporten er frigitt for distribusjon (e-post fra S2B til Norges Miljøvernforbund 30.10.2026).

## Filer

| Fil | Innhold |
|---|---|
| `index.html` | Siden. Laster Chart.js 4.4.1 fra cdnjs og fonter fra Google Fonts. |
| `style.css` | Utseende, med fargetokens for lyst og mørkt tema. |
| `model.js` | Regnemodellen `hfModel(p)`. Ren funksjon uten DOM, kan kjøres i Node. Konstantene fra Deloitte ligger i `HF_CONST` (også `hfModel.CONST`), som `xlsx_export.js` leser. |
| `script.js` | Scenarioknapper, kontroller, nøkkeltall, regnskapstabell, grafer, CSV-eksport (`downloadCsv`) og xlsx-eksport (`downloadXlsx`). |
| `xlsx_export.js` | `hfXlsxBuild(p)`: bygger xlsx med levende formler (ingen bibliotek; egen OOXML og zip). Formlene gjenskaper `model.js`. |
| `test_xlsx.js` | Lar LibreOffice regne ut xlsx-formlene og sammenligner med `model.js` for egne testscenarioer og alle scenarioknappene i `script.js`. Kjør `node test_xlsx.js` etter endringer i `model.js` eller `xlsx_export.js`. Sjekker også at lagrede verdier stemmer med utregningen, celle for celle, og at varselet om årsrader virker. Hopper over testen uten `soffice`, men feiler når miljøvariabelen `CI` er satt. |
| `test_model.js` | Regresjonstest. Kjør `node test_model.js` etter hver endring i `model.js`. |

## Viktigst for den som endrer koden

1. **Modellen er kalibrert mot Deloitte.** Basisscenariet gir 27,7 mrd kr (rapporten: 27,673) og +20 % investering gir 14,6 (rapporten s. 17: 14,533). Første år med overskudd er 2058 og akkumulert pluss 2086. `test_model.js` sjekker dette. En endring som bryter testen, må være bevisst og begrunnet.
2. **Avvik fra Deloitte er bevisste og ligger i kontrollene, ikke i basis.** Deloitte-scenariet skal alltid gjenskape rapporten, også der vi mener rapporten tar feil (for eksempel prisåret, se under).
3. **To ulike resultatmål brukes.** Ikke bland dem:
   - *Udiskontert netto* (Deloittes metode): sparte ferje- og kaiutgifter minus renter, avdrag og D&V, summert i faste 2025-kr over 75 driftsår. Bompengene betjener et eget bompengelån og er ikke med.
   - *Nåverdi før finansiering*: investeringsutbetalinger ekskl. mva i byggeårene, D&V og netto bompenger mot sparte ferjeutgifter, diskontert til 2025. Dette er ikke en diskontering av det udiskonterte tallet, og ikke en full samfunnsøkonomisk analyse.
4. **Språk og formatering:** Norsk bokmål. Tall vises med `nb-NO` (komma som desimaltegn, «−» som minustegn). Beløp i modellen er mill. kr; nøkkeltall vises i mrd kr.

## Modellen (`model.js`)

Alle forutsetninger er hentet fra Deloitte s. 6–13 med mindre annet står.

**Tid og priser**
- Byggestart 2029. Byggetid `build` år (Deloitte: 6). Byggeprofilen 5/15/20/25/20/15 % strekkes over valgt byggetid som en kumulativ S-kurve.
- Driftsperiode 75 år fra åpning (Deloitte: 2035–2109).
- KPI 3,2 / 2,4 / 2,3 / 1,9 % for 2026–2029, deretter 2,0 % (s. 8).
- Investering 52 257 mill. kr × 1,016 × 1,033 = 2025-kr inkl. mva. Deloitte indekserer fra 2024 og utelater 2023-leddet (2,1 %). Dette er gjenskapt med vilje; se «Kjente feil i Deloitte». Avkrysning «Rettet prisår» (`fixPrice`) legger til 2023-leddet.

**Finansiering**
- Mva-kompensasjon 20 % av investeringen (s. 9).
- Byggelån med renter lagt til hovedstolen; årets trekk får halvt års rente. Gir 58 146 mill. kr ved åpning (s. 9).
- Bompengelån 12 345 mill. kr (s. 12). Skaleres med trafikk og takstpåslag når `tollMode = 'exante'`.
- Langsiktig lån = byggelån − bompengelån (45 801 mill. kr), serielån over 45 år (s. 11).
- Rente 4,9 % til 2035, lineært ned til 4,0 % i 2045 (s. 11). `ratePP` legger til prosentpoeng.
- Renter beregnes av gjennomsnittlig saldo per år. Det treffer Deloitte best; andre konvensjoner gir avvik på om lag 0,1 mrd.

**Ferjeutgifter**
- Deloittes 897 mill. kr (2025-kr) fordeles etter BT-tall per samband (netto 2026): Halhjem–Sandvikvåg 642,2 (stat), Halhjem–Våge 82 og Jektevik–Hodnanes 52 (fylke, til sammen 134), Austevoll-sambandene 186 minus 70 for nytt samband til Gjøvåg (netto 116, fylke). Fordelingen er en modellantakelse; Deloitte oppgir ingen fordeling.
- `basis: 'bt'` bruker BT-tallene direkte i stedet for å skalere til 897.
- Vekst 2,5 % per år (Deloitte, regelen for ferjeavløysingsmidlar) eller `fidx: 'kpi'` for konstant kjøpekraft.
- Sparte kaiutgifter 4 mill. kr/år (s. 13).

**Drift og vedlikehold**
- Deloitte: 44,39 mill. kr/år i 20 år, deretter +50 % (s. 13). `dvStep` styrer påslaget.
- Annet nivå settes flatt med `dv`. 197 mill. kr/år er annualisert fra SVV/COWIs fagrapport (tabell 5-3: 2 899 mill. kr nåverdi, 2023-kr, 2032–2071, 4 %).

**Bompenger (s. 12)**
- 7 500 lette + 850 tunge ÅDT (SVVs tall minus 20/10 % for bom), vekst 0,7 / 1,4 % per år.
- Takst 148 / 728 kr (2026-kr) = veid snitt av rabattert pris (80 %) og fullpris (20 %) på Halhjem–Sandvikvåg pluss 40 %. `premium` endrer påslaget.
- Innkreving 0,6 kr per passering, 0,8 mill. kr/år i drift, 20 mill. kr i investering året før åpning. 20 års innkreving.
- `traffic` skalerer ÅDT. `tollMode: 'expost'` holder bompengelånet fast og lar staten dekke avviket i inntektene.

**Diskontering**
- `dr: 'R109'`: 4 % i år 1–40, 3 % i år 41–75, 2 % deretter, regnet fra 2025. Ellers flat realrente.
- Internrenten finnes ved halvering på nåverdi før finansiering, mellom −5 % og 20 %. Nettostrømmen kan ha flere løsninger, så regnearket bruker samme halvering (arket «Internrente») og ikke `IRR()`. Uten fortegnsskifte mellom grensene gir modellen `null`, og siden og regnearket viser «Ikke funnet». Det betyr ikke nødvendigvis at renten er under −5 %.

**Endrer du regnemodellen, må xlsx-formlene og de lagrede verdiene i `xlsx_export.js` endres tilsvarende.** Ellers gir regnearket andre tall enn siden. Endrer du bare en konstant, gjør du det i `HF_CONST`, så følger regnearket med. `test_xlsx.js` fanger avviket.

## Parametre til `hfModel(p)`

| Parameter | Verdier | Deloitte |
|---|---|---|
| `basis` | `'deloitte'` / `'bt'` | `'deloitte'` |
| `county` | `'all'` (fylkessamband spart) / `'none'` (kun staten) | `'all'` |
| `austevoll` | `true` / `false` | `true` |
| `huglo` | mill. kr/år som må videreføres (trekkes fra fylkesdelen) | 0 |
| `fidx` | prosent per år eller `'kpi'` | 2,5 |
| `dv`, `dvStep` | mill. kr/år, påslag 50 % etter 20 år | 44,39, `true` |
| `build` | byggetid i år (6–12) | 6 |
| `invPct` | endring i investering, % | 0 |
| `fixPrice` | `true` tar med 2023-indeksen (+2,1 %) i investeringen | `false` |
| `ratePP` | tillegg i lånerente, prosentpoeng | 0 |
| `traffic` | faktor mot 8 350 ÅDT | 1 |
| `premium` | takstpåslag over ferjepris, % | 40 |
| `tollMode` | `'exante'` / `'expost'` | `'exante'` |
| `dr` | `'R109'` eller realrente som desimaltall | `'R109'` |
| `hsOverride` | eget nettotall for Halhjem–Sandvikvåg (2025-kr), kun med `basis: 'bt'` | – |

Returnerer blant annet `undisc`, `npvSel`, `npvR109`, `irr`, `firstPosYear`, `cumPosYear`, `minCum`, `bb` (byggelån), `L` (langsiktig lån), `tollLoan` og `rows` (år for år).

## Scenarioknapper (`script.js`)

| Knapp | Endringer fra Deloitte |
|---|---|
| Deloitte | Ingen |
| Uten Austevoll | `austevoll: false` |
| Kun staten | i tillegg `county: 'none'` |
| Kombinert | i tillegg `fidx: 'kpi'`, D&V 197 flatt |
| Høy D&V | som Kombinert, men D&V 600 |

Glidebryteren for D&V bruker 45 og 195 som skjulte markører for 44,39 og 197; se `params()`.

## Kjente feil i Deloitte (gjenskapt i basis, ikke rettet)

- **Prisår:** 52 257 mill. kr er 2022-kr i fagrapporten, men Deloitte indekserer fra 2024. Med 2023-leddet blir nominell investering om lag 65 290 mill. kr i stedet for 63 968.
- **Første år med overskudd:** Teksten s. 5 sier 2054; grafen og rekonstruksjonen gir 2058.

## Bevisste forenklinger

- Reinvesteringer og D&V regnes som jevne årlige beløp.
- Trafikk påvirker bare bompengene, ikke D&V eller ferjebesparelsen (som i Deloitte).
- Investering i et nytt Austevoll-samband (Sweco 2022: 374 mill. 2021-kr inkl. mva for kaier og tilførselsveger) er ikke med i noe scenario.
- Ingen samfunnsøkonomiske nyttevirkninger.

## Mulige videre forbedringer

- Glidebryter for investering i Austevoll-sambandet.
- Komponentbasert D&V (bru, flytebru, tunnel under sjø, veg) i stedet for ett tall.
