# Metode

Dette dokumentet beskriver hvilke metodevalg som er tatt i analysen og
hvorfor. Det er ment som dokumentasjon for andre som vil reprodusere,
kritisere eller bygge videre på arbeidet.

## Datakilde

Hoveddata er hentet fra samferdselsminister Jon-Ivar Nygårds skriftlige
svar på spørsmål nr. 2158 fra stortingsrepresentant Liv Kari Eskeland,
datert 15. april 2026 (Dok 15:2158). Svaret inneholder en oversikt over
alle samferdselsprosjekter (vei, jernbane, kyst, lufthavn) med samlet
kostnadsramme over 1 mrd. kr som er enten ferdigstilt eller under bygging
i perioden 2014–2025.

Data er transkribert manuelt fra PDF til `data/prosjekter.csv`. Hvert tall
er kryssjekket mot kildedokumentet.

## Sentrale metodevalg

### 1. Hvilken kostnad er den "riktige"?

Svarbrevet inneholder fem ulike beløp per prosjekt:

- **Kostnadsramme**: Stortingets vedtatte øvre grense for prosjektet.
- **Sluttkostnad**: Faktisk forbruk for ferdige prosjekter.
- **Stat**: Statlig finansieringsandel.
- **Annen finansiering**: Bompenger, OPS-vederlag, eller annet.

Vi bruker primært **statlig finansiering** som måletall, fordi det er
denne kategorien som debatten om "fordeling av samferdselsmilliarder"
faktisk handler om. Bompenger betales av brukerne, ikke av "kassen".

For total prosjektstørrelse bruker vi **sluttkostnad** der den finnes,
ellers **kostnadsramme**.

### 2. Bane NOR-prosjekter er ikke fylt inn i Stat-kolonnen

I svarbrevet er Stat-kolonnen tom for alle Bane NOR-prosjekter. Det er
ikke fordi Bane NOR-prosjekter har ekstern finansiering — jernbane har
ingen bompenger. Det er en formaliedrevet utelatelse.

Vi fyller Stat-kolonnen for Bane NOR med full prosjektsum (sluttkostnad
eller kostnadsramme). Uten denne korreksjonen blir Vestlandets andel av
"statlige bevilgninger" misvisende høy, fordi all jernbane (overveiende
på Østlandet) faller utenfor totalsummen.

### 3. Inflasjonsjustering 2019 → 2026

Tre Bane NOR-prosjekter (Dobbeltspor Langset–Kleverud, Holm–Holmestrand–
Nykirke, Dobbeltspor Farriseidet–Porsgrunn) er oppgitt i 2019-kroner i
svarbrevet. De er multiplisert med faktoren **1,38** for å være
sammenlignbare med øvrige tall (2026-kroner).

Faktoren er en tilnærming basert på SSBs byggekostnadsindeks for veganlegg
(jernbane bruker en liknende sammensatt indeks):

| Periode | Vekst |
|---------|-------|
| 2019–2020 | ~3 % |
| 2020–2021 | ~7 % |
| 2021–2022 | ~14 % (materialprissjokk) |
| 2022–2023 | ~3 % |
| 2023–2024 | ~2,5 % |
| 2024–2025 | ~3 % |
| 2025–2026 | ~3 % |

Kumulativt: ca. 1,38. Den eksakte verdien for jernbane kan ligge mellom
1,32 og 1,42 avhengig av hvilken indeks som brukes. Sensitivitet i
fordelingsanalysen er liten (±0,5–1 prosentpoeng).

### 4. mva-håndtering

Statens vegvesen er en statsetat som ikke kan fradragsføre mva. Deres
kostnadsrammer rapporteres inkl. mva (25 %) — dette er KS2-standarden.

Bane NOR SF er et mva-registrert statsforetak som *kan* fradragsføre
inngående mva. Praksisen for kostnadsramme-rapportering til Stortinget
er ikke entydig dokumentert i offentlige kilder. Det er en åpen
mulighet at Bane NOR-tallene er eks. mva mens SVV-tallene er inkl. mva.

Vi viser begge scenarier:

- **Scenario A**: Alle tall behandles som inkl. mva (forutsetter KS2-
  standard for begge etater).
- **Scenario B**: Bane NOR-tall multipliseres med 1,25 for å være
  sammenlignbare med SVVs inkl.-mva-grunnlag.

Hovedkonklusjonene er robuste mot mva-tolkningen. Hvis Scenario B er
korrekt, blir Østlandets andel ~3 prosentpoeng større, ikke mindre.

### 5. Geografisk korreksjon

Departementet har klassifisert hvert prosjekt med en landsdel. Vi har
verifisert alle 100 prosjekter mot fylkes- og kommunetilhørighet.
97 er korrekt klassifisert. Tre har avvik:

| Prosjekt | Dokumentet | Korrekt | Beløp |
|----------|------------|---------|-------|
| E18 Langangen–Bamble | Sørlandet | Østlandet | 9 546 mill |
| E16 Smedalsosen–Maristova–Borlaug | Vestlandet/Østlandet | Vestlandet | 1 681 mill |
| E16 Varpe bru–Otrøsosen–Smedalsosen | Østlandet | Vestlandet/Østlandet | 2 779 mill |

Hovedeffekten er Langangen–Bamble (Bamble og Porsgrunn ligger i Telemark
fylke, ikke Agder). Dette flytter 9,5 mrd fra Sørlandet til Østlandet i
kategorien "Under bygging".

Vi presenterer både opprinnelig og korrigert klassifisering.

### 6. Hva inkluderes i "ferdig"?

Gillesvik (Initiativ Vest) inkluderer to lufthavnprosjekter (Mo i Rana
og Bodø) i kategorien "ferdige". Begge står som "Under bygging" i samme
dokument. Bodø står tidligst klar i 2029.

Vi følger departementets egen klassifisering: prosjekter er "ferdige"
bare hvis svarbrevet eksplisitt sier så.

### 7. Tidsperioder

Vi viser fire snitt:

1. **Ferdig 2014–2025** — full historisk periode (68 prosjekter).
2. **Ferdig 2021–2025** — siste fem år (23 prosjekter).
3. **Under bygging** — alle pågående prosjekter (32 prosjekter).
4. **Fremoverbilde** = (2) + (3) (55 prosjekter).

Fremoverbildet er det mest relevante for diskusjon om dagens NTP-
prioriteringer, fordi det viser hva som faktisk skjer nå og er vedtatt.

## Per-capita-normalisering

Vi beregner statlig finansiering per innbygger som ett av flere mulige
sammenligningsgrunnlag. Befolkningstall (SSB-tabell 06913, 2025):

| Landsdel | Befolkning |
|----------|------------|
| Østlandet | 2 870 000 |
| Vestlandet | 1 420 000 |
| Nord-Norge | 480 000 |
| Trøndelag | 480 000 |
| Sørlandet | 320 000 |

Per-capita er én av mange mulige normaliseringer. Andre relevante
målestokker:

- Per kvadratkilometer (favoriserer spredte landsdeler)
- Per kilometer eksisterende veinett
- Per personkilometer reist (måler reelt transportbehov)
- Per tonn-km godstransport
- Per BNP-bidrag

Ingen normalisering er "objektivt riktig". Hver målestokk innebærer en
underliggende verdivurdering av hva infrastruktur skal gjøre.

## Forbehold

Departementet selv presiserer i svarbrevet at "kostnadsrammene for de
enkelte prosjektene ikke er helt sammenlignbare, og vil avhenge av når
prosjektene hadde høyeste pådrag i aktivitet". Dette gjelder fordi
indeksregulering kun gjøres på restverdien, ikke hele prosjektet.

En kostnadsramme i "2026-kroner" består altså av:

- Påløpte kostnader i nominell kroneverdi for hvert avsluttede regnskapsår
- En indeksregulert restverdi oppjustert til 2026

For prosjekter med tyngdepunkt langt tilbake i tid betyr dette at en
betydelig del av summen er i eldre kroneverdi. Dette undervurderer reelt
ressursforbruk for eldre prosjekter relativt til nyere.

Vi har ikke korrigert for dette, fordi det ville kreve detaljert kunnskap
om årlig pådrag per prosjekt — som ikke er offentlig tilgjengelig.

## Hva vi *ikke* har gjort

- Vi har ikke regnet om alle tall til konsistente realverdier ut fra
  pådragsår.
- Vi har ikke beregnet samfunnsøkonomisk nytte (KS2-nytte) av prosjektene.
- Vi har ikke sammenlignet mot Initiativ Vests primærrapport "Ble
  Vestlandet lurt?", kun mot Gillesviks kronikk.
- Vi har ikke fordelt ERTMS (signalanlegg) etter geografi. Anlegget
  bygges over hele landet, men med tyngdepunkt på Østlandet.
- Vi har ikke inkludert fylkesveiprosjekter eller kollektivprosjekter
  (Bybanen, Fornebubanen, Bussveien, Metrobuss) — disse er ekskludert
  fra svarbrevet fordi fylkeskommunene er byggherre.

## Henvisninger

- Stortinget, Dok 15:2158, 15. april 2026.
- Initiativ Vest, "Ble Vestlandet lurt? Historien om Intercity og fergefri
  E39", 2026.
- Kjetil Gillesvik, "Er Vestlandet virkelig vinneren av samferdsels-
  milliardene?", mai 2026.
- SSB, byggekostnadsindeks for veganlegg, tabell 09197.
- SSB, folkemengde, tabell 06913.
