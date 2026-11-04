# CLAUDE.md

Repo for bomfast.info: kalkulatorer og verktøy for bompenger, fergetrafikk, befolkningsframskriving m.m. Språk i brukergrensesnitt og dokumentasjon er norsk bokmål. Språk i kode som javascript og python er engelsk.

## Struktur

- `public/` – statiske nettsider/kalkulatorer (HTML, CSS, JS) som publiseres på bomfast.info. Hver kalkulator ligger enten som enkeltfiler eller i egen undermappe (f.eks. `byggepris_calc/`, `naaverdi_calc/`, `hordfast_finansiering/`).
- `src/calculators/`, `src/e39tools/` – Python-kode (bompenger, trafikantnytte m.m.).
- `tests/`, `test_toll_calculation.py` – tester for Python-delen.
- `notebooks/`, `examples/`, `xlsx/` – analyser, eksempler og regneark.

## Delprosjekter

### Hordfast-kalkulator (`public/hordfast_finansiering/`)

Les [public/hordfast_finansiering/README.md](public/hordfast_finansiering/README.md) før du endrer noe der. Den beskriver modell, parametre, scenarioer og kjente feil i Deloittes rapport. Kort oppsummert:

- `model.js` er en ren funksjon `hfModel(p)` kalibrert mot Deloitte. Kjør `node test_model.js` (fra mappen) etter hver endring; testen må passere, eller endringen må være bevisst og begrunnet.
- `xlsx_export.js` gjenskaper modellen som regnearkformler. Endres `model.js`, må den endres tilsvarende; kjør `node test_xlsx.js` (krever LibreOffice) for å sammenligne.
- Deloitte-scenariet skal alltid gjenskape rapporten. Avvik hører hjemme i kontrollene (scenarioknapper/parametre), ikke i basis.
- Ikke bland *udiskontert netto* og *nåverdi før finansiering*.
- Tall vises med `nb-NO`; beløp i modellen er mill. kr, nøkkeltall vises i mrd kr.


## Konvensjoner

- Norsk bokmål i tekst, kommentarer og commit-meldinger følger gjeldende stil i repoet (korte, norske meldinger).
- Statiske sider skal fungere uten byggesteg; eksterne biblioteker (f.eks. Chart.js) lastes fra CDN med fast versjon.
- `cspell.json` ignorerer alle stier; ikke bruk tid på stavekontroll-konfigurasjon.
