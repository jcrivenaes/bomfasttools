# Samferdselsanalyse 2014–2025

Faglig gjennomgang av samferdselsbevilgninger fordelt på landsdeler, basert
på samferdselsministerens svar til stortingsrepresentant Liv Kari Eskeland
(Dok 15:2158, 15. april 2026).

Bakgrunnen er Kjetil Gillesviks kronikk for Initiativ Vest (mai 2026), som
hevder at Vestlandet er en "taper" i fordelingen av statlige samferdsels-
milliarder. Denne analysen undersøker tallgrunnlaget hans, korrigerer for
metodevalg som han ikke har dokumentert, og gjør en mer omfattende
fordelingsanalyse — inkludert prosjekter under bygging og fremoverbilde.

## Reproduserbarhet

Hele analysen er reproduserbar fra dette repositoriet alene:

```bash
python -m venv venv
source venv/bin/activate
pip install -r requirements.txt
jupyter lab analyse.ipynb
```

Eller direkte fra kommandolinjen:

```bash
python -c "import nbformat; from nbconvert.preprocessors import ExecutePreprocessor; \
  nb = nbformat.read('analyse.ipynb', as_version=4); \
  ExecutePreprocessor(timeout=600).preprocess(nb); \
  nbformat.write(nb, 'analyse.ipynb')"
```

Genererte filer skrives til `output/`.

## Filer

| Fil | Beskrivelse |
|-----|-------------|
| `data/prosjekter.csv` | Rådata transkribert fra svarbrevet. En rad per prosjekt. |
| `data/befolkning.csv` | Befolkning per landsdel (SSB-tabell 06913, 2025). |
| `analyse.ipynb` | Hoved-notebook med all kode og analyse. |
| `METODE.md` | Forklaring av metodevalg og forbehold. |
| `output/` | Genererte tabeller og figurer (lages av notebook). |

## Lisens

Data: offentlig domene (statsrådens svar er offentlig informasjon).
Kode: MIT.

## Begrensninger

Se METODE.md for en fyldig beskrivelse av forbehold. De viktigste er:

1. Kostnadsrammer er ikke fullt sammenlignbare mellom prosjekter — de er
   indeksregulert på ulike tidspunkter med ulik metode.
2. mva-håndtering er ikke entydig dokumentert for Bane NOR. Vi viser begge
   scenarier.
3. Befolkningsbasert normalisering er én av flere mulige normaliseringer.
   En grundigere analyse bør sammenligne flere (areal, ÅDT, BNP, m.fl.).

Kontakt: [navn/e-post]
