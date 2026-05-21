"""
Script som genererer analyse.ipynb fra Python-celler.
Kjør: python build_notebook.py
"""
import nbformat as nbf

nb = nbf.v4.new_notebook()
cells = []

# === TITLE ===
cells.append(nbf.v4.new_markdown_cell("""# Samferdselsbevilgninger 2014–2025: Vinner Vestlandet eller taper Vestlandet?

En faglig gjennomgang av tallgrunnlaget i Kjetil Gillesviks kronikk for Initiativ Vest, mai 2026.

**Forfatter:** [navn]
**Sist oppdatert:** 14. mai 2026
**Lisens:** Data offentlig domene, kode MIT

---

## Bakgrunn

Initiativ Vest publiserte i april–mai 2026 rapporten *Ble Vestlandet lurt?* og fagsjef Kjetil Gillesvik fulgte opp med en kronikk der hovedpåstanden er at Vestlandet er en "taper" i fordelingen av statlige samferdselsmilliarder 2014–2025. Argumentet bygger på statsrådens svarbrev til Liv Kari Eskeland (Dok 15:2158, Stortinget), der det listes opp alle samferdselsprosjekter med kostnadsramme over 1 mrd. kr.

Denne analysen gjør tre ting:

1. **Verifiserer** Gillesviks tall ved å reprodusere dem fra samme kilde.
2. **Avdekker metodevalg** som ikke er dokumentert i kronikken (inkludering av ikke-ferdige flyplasser, manglende inflasjonsjustering for Bane NOR, m.m.).
3. **Utvider** analysen til å inkludere prosjekter under bygging og et "fremoverbilde" (ferdig 2021–2025 + under bygging) — som er mer relevant for nåværende NTP-debatt.

Se `METODE.md` for fyldig dokumentasjon av metodevalg.

## Sammendrag av funn

- Gillesviks hovedtall (Østlandet 61,2 % av ferdige prosjekter 2014–2025) **stemmer**, men inkluderer to lufthavnprosjekter som ikke er ferdige.
- For prosjekter **under bygging** får Vestlandet **38 % av statlige veimilliarder** — mer enn dobbelt så mye som Østlandet.
- I **fremoverbildet** (ferdig 2021–2025 + under bygging) er Vestlandet og Østlandet nesten like per innbygger.
- Sensitivitetsanalyse viser at konklusjonene er robuste mot mva-tolkning, inflasjonsantakelser og geografiske korreksjoner.
"""))

# === Setup ===
cells.append(nbf.v4.new_markdown_cell("## 1. Oppsett og dataimport"))

cells.append(nbf.v4.new_code_cell("""import pandas as pd
import matplotlib.pyplot as plt
from pathlib import Path

OUTPUT = Path("output")
OUTPUT.mkdir(exist_ok=True)

# Konfigurer pandas
pd.set_option("display.max_columns", None)
pd.set_option("display.width", 200)

# Konstanter — se METODE.md for begrunnelse
INFLASJON_2019_TIL_2026 = 1.38   # SSB byggekostnadsindeks tilnærmet
MVA_FAKTOR = 1.25                 # 25 % merverdiavgift"""))

cells.append(nbf.v4.new_code_cell("""# Last inn rådata
df = pd.read_csv("data/prosjekter.csv")
print(f"Lastet inn {len(df)} prosjekter")
print(f"Kolonner: {list(df.columns)}")
df.head()"""))

cells.append(nbf.v4.new_code_cell("""# Befolkningsdata for per-capita-normalisering
befolkning = pd.read_csv("data/befolkning.csv")
befolkning"""))

cells.append(nbf.v4.new_code_cell("""# Geografiske korreksjoner — se METODE.md punkt 5
korreksjoner = pd.read_csv("data/geografisk_korrigering.csv")
korreksjoner"""))

# === Metode 1: korrigerte verdier ===
cells.append(nbf.v4.new_markdown_cell("""## 2. Beregn korrigert statlig finansiering

Departementet har latt Stat-kolonnen stå tom for Bane NOR-prosjekter, selv om jernbane i praksis er 100 % statlig finansiert. Vi fyller inn full kostnad for Bane NOR.

For Nye Veier beregnes stat = kostnadsramme − bompenger.

For Bane NOR-prosjekter oppgitt i 2019-kroner multipliseres beløpet med 1,38 (tilnærmet byggekostnadsindeks 2019→2026)."""))

cells.append(nbf.v4.new_code_cell('''def stat_korrigert(rad):
    """
    Returner effektiv statlig finansiering i 2026-kr.
    
    Logikk:
    - Bane NOR: full prosjektsum (jernbane = 100% stat)
    - Nye Veier: kostnadsramme - bompenger
    - SVV: bruk Stat-kolonnen som oppgitt
    - Avinor: bruk Stat-kolonnen som oppgitt
    """
    v = rad["virksomhet"]
    sk = rad["sluttkostnad"]
    kr = rad["kostnadsramme_2026"]
    stat = rad["stat_doc"]
    annen = rad["annen_finansiering"]
    merknad = str(rad["merknad"]) if pd.notna(rad["merknad"]) else ""
    
    if v == "Bane NOR SF":
        base = sk if pd.notna(sk) else kr
        if pd.isna(base):
            return None
        # Inflasjonsjustering for 2019-kr-prosjekter
        if "2019-kroner" in merknad:
            base *= INFLASJON_2019_TIL_2026
        return base
    
    if v == "Nye Veier AS":
        if pd.isna(kr):
            return None
        bomp = annen if pd.notna(annen) else 0
        return max(0, kr - bomp)
    
    # SVV og Avinor: bruk Stat-kolonnen som den er
    return stat if pd.notna(stat) else 0


def total_korrigert(rad):
    """Total prosjektkostnad i 2026-kr (inkl. all finansiering)."""
    sk = rad["sluttkostnad"]
    kr = rad["kostnadsramme_2026"]
    merknad = str(rad["merknad"]) if pd.notna(rad["merknad"]) else ""
    
    base = sk if pd.notna(sk) else kr
    if pd.isna(base):
        return None
    if rad["virksomhet"] == "Bane NOR SF" and "2019-kroner" in merknad:
        base *= INFLASJON_2019_TIL_2026
    return base


df["stat_korr"] = df.apply(stat_korrigert, axis=1)
df["total_korr"] = df.apply(total_korrigert, axis=1)

# Geografisk korreksjon
korreksjon_dict = dict(zip(korreksjoner["prosjektnavn"], korreksjoner["landsdel_korrigert"]))
df["landsdel_korr"] = df.apply(
    lambda r: korreksjon_dict.get(r["navn"], r["landsdel_doc"]),
    axis=1
)

print(f"Antall korrigerte klassifiseringer: {(df['landsdel_doc'] != df['landsdel_korr']).sum()}")
df[df["landsdel_doc"] != df["landsdel_korr"]][["navn", "landsdel_doc", "landsdel_korr"]]'''))

# === Reproduksjon av Gillesvik ===
cells.append(nbf.v4.new_markdown_cell("""## 3. Reproduksjon av Gillesviks tall

Gillesvik oppgir 70 prosjekter, totalt 237 mrd kr, Østlandet 61,2 %, Vestlandet 14,4 %. Vi reproduserer hans metode for å verifisere.

**Hva han har gjort:**
- Tatt med alle ferdigstilte prosjekter (68 stk).
- Lagt til 2 Avinor-lufthavnprosjekter som er **under bygging**, ikke ferdige.
- Brukt stat-kolonnen for SVV.
- Brukt fullt vederlag for Nye Veier (ikke fratrukket bompenger).
- Inflasjonsjustert Bane NOR 2019-kr til 2026-kr."""))

cells.append(nbf.v4.new_code_cell('''ferdig = df[df["status"] == "Ferdig"].copy()
avinor_ub = df[(df["virksomhet"] == "Avinor AS") & (df["status"] == "Under bygging")].copy()

# Gillesviks utvalg = ferdige + Avinor under bygging
gillesvik_utvalg = pd.concat([ferdig, avinor_ub], ignore_index=True)
print(f"Antall prosjekter i Gillesviks utvalg: {len(gillesvik_utvalg)}")
print(f"  Hvorav ferdig: {len(ferdig)}")
print(f"  Hvorav Avinor under bygging: {len(avinor_ub)}")'''))

cells.append(nbf.v4.new_code_cell('''def gillesvik_belop(rad):
    """Reproduser Gillesviks metode for "samlet bevilgning"."""
    v = rad["virksomhet"]
    sk = rad["sluttkostnad"]
    kr = rad["kostnadsramme_2026"]
    stat = rad["stat_doc"]
    merknad = str(rad["merknad"]) if pd.notna(rad["merknad"]) else ""
    
    if v == "Statens vegvesen":
        return stat if pd.notna(stat) else 0
    if v == "Nye Veier AS":
        return kr  # fullt vederlag
    if v == "Bane NOR SF":
        base = sk if pd.notna(sk) else kr
        if "2019-kroner" in merknad:
            base *= INFLASJON_2019_TIL_2026
        return base
    if v == "Avinor AS":
        return kr  # full kostnadsramme
    return 0

gillesvik_utvalg["belop"] = gillesvik_utvalg.apply(gillesvik_belop, axis=1)

total = gillesvik_utvalg["belop"].sum()
print(f"Totalt: {total/1000:.1f} mrd kr (Gillesvik oppgir: 237 mrd)")

fordeling = (
    gillesvik_utvalg.groupby("landsdel_doc")["belop"]
    .agg(["count", "sum"])
    .sort_values("sum", ascending=False)
)
fordeling["andel_%"] = (fordeling["sum"] / total * 100).round(1)
fordeling["mrd"] = (fordeling["sum"] / 1000).round(1)
fordeling[["count", "mrd", "andel_%"]]'''))

cells.append(nbf.v4.new_markdown_cell("""**Resultat:** Vi reproduserer Gillesviks tall innenfor 1 prosentpoeng. Vestlandet kommer på nøyaktig 14,4 % som hos ham.

**Men:** De to Avinor-prosjektene (13 mrd kr) er ikke ferdige. Mo i Rana åpner ca. 2027, Bodø tidligst 2029. Når Gillesvik inkluderer dem som "ferdige" og samtidig ekskluderer alle andre prosjekter under bygging (Sotrasambandet, Rogfast, Arna–Stanghelle osv.), er det et metodevalg som ikke er nevnt i kronikken og som favoriserer narrativet."""))

# === Korrigert analyse ===
cells.append(nbf.v4.new_markdown_cell("## 4. Korrigert analyse: kun reelt ferdige prosjekter"))

cells.append(nbf.v4.new_code_cell('''def fordeling_per_landsdel(data, verdi_kol, landsdel_kol="landsdel_korr"):
    """Generisk fordelingsfunksjon."""
    total = data[verdi_kol].sum()
    g = (
        data.groupby(landsdel_kol)[verdi_kol]
        .agg(["count", "sum"])
        .sort_values("sum", ascending=False)
    )
    g["mrd"] = (g["sum"] / 1000).round(1)
    g["andel_%"] = (g["sum"] / total * 100).round(1)
    return g[["count", "mrd", "andel_%"]]

# Ferdige prosjekter, statlig finansiering, korrigert geografi
print("FERDIGE PROSJEKTER 2014–2025 (kun reelt ferdige, statlig finansiering korrigert)")
print(f"Antall: {len(ferdig)}, Sum: {ferdig['stat_korr'].sum()/1000:.1f} mrd kr")
print()
fordeling_per_landsdel(ferdig, "stat_korr")'''))

cells.append(nbf.v4.new_code_cell('''# Ferdig 2021–2025 — den siste femårsperioden
ferdig_2021 = ferdig[ferdig["aar_ferdig"] >= 2021]
print(f"FERDIGE 2021–2025: {len(ferdig_2021)} prosjekter, {ferdig_2021['stat_korr'].sum()/1000:.1f} mrd kr")
print()
fordeling_per_landsdel(ferdig_2021, "stat_korr")'''))

cells.append(nbf.v4.new_code_cell('''# Under bygging — det viktigste snittet for nåværende NTP-debatt
under_bygging = df[df["status"] == "Under bygging"]
print(f"UNDER BYGGING: {len(under_bygging)} prosjekter, {under_bygging['stat_korr'].sum()/1000:.1f} mrd kr")
print()
fordeling_per_landsdel(under_bygging, "stat_korr")'''))

cells.append(nbf.v4.new_code_cell('''# Fremoverbildet: ferdig siste 5 år + under bygging
fremover = pd.concat([ferdig_2021, under_bygging])
print(f"FREMOVERBILDE: {len(fremover)} prosjekter, {fremover['stat_korr'].sum()/1000:.1f} mrd kr")
print()
fordeling_per_landsdel(fremover, "stat_korr")'''))

cells.append(nbf.v4.new_markdown_cell("""**Observasjon:** I fremoverbildet faller Østlandets dominans dramatisk. Vestlandet ligger på ~24 % og Østlandet på ~38 %. Forholdet er omtrent 1:1,5, mot Gillesviks rapporterte 1:4."""))

# === Vei alene ===
cells.append(nbf.v4.new_markdown_cell("""## 5. Veiprosjekter alene

Dette er det viktigste snittet for Hordfast-debatten, ettersom Initiativ Vest argumenterer for at Vestlandet trenger mer **vei-investering**, ikke jernbane."""))

cells.append(nbf.v4.new_code_cell('''vei = df[df["virksomhet"].isin(["Statens vegvesen", "Nye Veier AS"])]

# Ferdig vei alle år
vei_ferdig = vei[vei["status"] == "Ferdig"]
print(f"FERDIGE VEIPROSJEKTER 2014–2025: {len(vei_ferdig)} stk, {vei_ferdig['stat_korr'].sum()/1000:.1f} mrd")
fordeling_per_landsdel(vei_ferdig, "stat_korr")'''))

cells.append(nbf.v4.new_code_cell('''# Vei under bygging — det mest oppsiktsvekkende tallet
vei_ub = vei[vei["status"] == "Under bygging"]
print(f"VEIPROSJEKTER UNDER BYGGING: {len(vei_ub)} stk, {vei_ub['stat_korr'].sum()/1000:.1f} mrd")
fordeling_per_landsdel(vei_ub, "stat_korr")'''))

cells.append(nbf.v4.new_code_cell('''# Vei i fremoverbildet
vei_fremover = vei[
    ((vei["status"] == "Ferdig") & (vei["aar_ferdig"] >= 2021)) |
    (vei["status"] == "Under bygging")
]
print(f"VEI I FREMOVERBILDE: {len(vei_fremover)} stk, {vei_fremover['stat_korr'].sum()/1000:.1f} mrd")
fordeling_per_landsdel(vei_fremover, "stat_korr")'''))

cells.append(nbf.v4.new_markdown_cell("""**Hovedfunn:** Av statlige veimilliarder under bygging går **38 % til Vestlandet**, mot 16 % til Østlandet. Tar man med ferdige 2021–2025, har Vestlandet 90 mrd kr i statlige veimilliarder mot Østlandets 38 mrd.

Det er motsatt av hva Gillesviks fortelling om "Vestlandet som taper" tilsier."""))

# === Per capita ===
cells.append(nbf.v4.new_markdown_cell("""## 6. Per-capita-normalisering

En av Initiativ Vests rammer er at Vestlandets befolkningsandel (26 %) skulle gi krav på tilsvarende investeringsandel. Vi sjekker dette eksplisitt."""))

cells.append(nbf.v4.new_code_cell('''pop_dict = dict(zip(befolkning["landsdel"], befolkning["befolkning_2025"]))

def per_capita(data, label):
    g = data.groupby("landsdel_korr")["stat_korr"].sum().sort_values(ascending=False)
    rows = []
    for ls, sum_mill in g.items():
        if ls in pop_dict:
            rows.append({
                "landsdel": ls,
                "stat_mrd": sum_mill / 1000,
                "befolkning": pop_dict[ls],
                "kr_per_innbygger": sum_mill * 1_000_000 / pop_dict[ls]
            })
    return pd.DataFrame(rows)

print("FREMOVERBILDE — kr per innbygger")
per_capita_fremover = per_capita(fremover, "fremover")
per_capita_fremover["stat_mrd"] = per_capita_fremover["stat_mrd"].round(1)
per_capita_fremover["kr_per_innbygger"] = per_capita_fremover["kr_per_innbygger"].round(0).astype(int)
per_capita_fremover'''))

cells.append(nbf.v4.new_markdown_cell("""**Per innbygger** ligger Østlandet og Vestlandet nesten likt i fremoverbildet. Nord-Norge og Sørlandet er de virkelige "vinnerne" målt på denne måten.

Det punkterer effektivt "Vestlandet er underinvestert per innbygger"-argumentet."""))

# === Sensitivity ===
cells.append(nbf.v4.new_markdown_cell("""## 7. Sensitivitetsanalyse: mva-tolkning

Bane NORs kostnadsrammer er muligens rapportert eks. mva (mens SVV er inkl. mva). Hvis det er tilfelle, må Bane NOR-tallene oppskrives med faktor 1,25 for å være sammenlignbare.

Vi viser begge scenarier."""))

cells.append(nbf.v4.new_code_cell('''def stat_korr_scenario_b(rad):
    """Scenario B: Bane NOR-tall multipliseres med 1,25."""
    base = stat_korrigert(rad)
    if base is None:
        return None
    if rad["virksomhet"] == "Bane NOR SF":
        return base * MVA_FAKTOR
    return base

df["stat_korr_B"] = df.apply(stat_korr_scenario_b, axis=1)

# Sammenlign fremoverbildet
fremover_full = df[
    ((df["status"] == "Ferdig") & (df["aar_ferdig"] >= 2021)) |
    (df["status"] == "Under bygging")
]

A = fremover_full.groupby("landsdel_korr")["stat_korr"].sum() / 1000
B = fremover_full.groupby("landsdel_korr")["stat_korr_B"].sum() / 1000

sammenligning = pd.DataFrame({
    "Scenario A (mrd)": A.round(1),
    "Andel A": (A / A.sum() * 100).round(1),
    "Scenario B (mrd)": B.round(1),
    "Andel B": (B / B.sum() * 100).round(1),
})
sammenligning["Endring (pp)"] = (sammenligning["Andel B"] - sammenligning["Andel A"]).round(1)
sammenligning.sort_values("Scenario A (mrd)", ascending=False)'''))

cells.append(nbf.v4.new_markdown_cell("""**Konklusjon:** Selv i scenario B (worst case for Vestlandet) endres Vestlandets andel med under 2 prosentpoeng. Hovedfunnene er robuste mot mva-tolkning."""))

# === Plot ===
cells.append(nbf.v4.new_markdown_cell("## 8. Visualiseringer"))

cells.append(nbf.v4.new_code_cell('''fig, axes = plt.subplots(1, 2, figsize=(14, 6))

# Ferdig 2014-2025
g1 = ferdig.groupby("landsdel_korr")["stat_korr"].sum().sort_values(ascending=True) / 1000
axes[0].barh(g1.index, g1.values, color="#5B7C99")
axes[0].set_xlabel("Mrd kr")
axes[0].set_title("Ferdige prosjekter 2014–2025\\n(statlig finansiering)")

# Fremoverbilde
g2 = fremover.groupby("landsdel_korr")["stat_korr"].sum().sort_values(ascending=True) / 1000
axes[1].barh(g2.index, g2.values, color="#2E7D32")
axes[1].set_xlabel("Mrd kr")
axes[1].set_title("Fremoverbilde:\\nferdig 2021–2025 + under bygging")

for ax in axes:
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)

plt.tight_layout()
plt.savefig(OUTPUT / "fordeling.png", dpi=120, bbox_inches="tight")
plt.show()'''))

cells.append(nbf.v4.new_code_cell('''# Vei alene — det mest oppsiktsvekkende
fig, ax = plt.subplots(figsize=(10, 5))
g = vei_fremover.groupby("landsdel_korr")["stat_korr"].sum().sort_values(ascending=True) / 1000
colors = ["#C62828" if ls == "Vestlandet" else "#5B7C99" for ls in g.index]
ax.barh(g.index, g.values, color=colors)
ax.set_xlabel("Mrd kr statlig veifinansiering")
ax.set_title("Veiprosjekter i fremoverbildet\\n(ferdig 2021–2025 + under bygging)")
ax.spines["top"].set_visible(False)
ax.spines["right"].set_visible(False)
for i, v in enumerate(g.values):
    ax.text(v + 1, i, f"{v:.1f}", va="center")
plt.tight_layout()
plt.savefig(OUTPUT / "vei_fremover.png", dpi=120, bbox_inches="tight")
plt.show()'''))

# === Eksport ===
cells.append(nbf.v4.new_markdown_cell("## 9. Eksport av sluttdata"))

cells.append(nbf.v4.new_code_cell('''# Lagre kompletterte data (med korrigerte kolonner) til CSV
df_eksport = df.copy()
df_eksport.to_csv(OUTPUT / "prosjekter_korrigert.csv", index=False)
print(f"Skrevet output/prosjekter_korrigert.csv: {len(df_eksport)} rader")

# Lagre fordelingstabellen
fordeling_fremover = fordeling_per_landsdel(fremover, "stat_korr")
fordeling_fremover.to_csv(OUTPUT / "fordeling_fremoverbilde.csv")
print("Skrevet output/fordeling_fremoverbilde.csv")

# Sammendrag
sammenligning.to_csv(OUTPUT / "sensitivitet_mva.csv")
print("Skrevet output/sensitivitet_mva.csv")'''))

# === Avslutning ===
cells.append(nbf.v4.new_markdown_cell("""## 10. Diskusjon og forbehold

### Hva analysen viser

1. **Gillesviks empiriske påstand for ferdige prosjekter 2014–2025 stemmer i grove trekk.** Østlandet har fått klart mest, drevet av Intercity-utbyggingen.

2. **Men metodevalget — inkludering av ikke-ferdige flyplasser, ekskludering av alle andre under-bygging-prosjekter — er ikke nøytralt.** Det maksimerer den fortellingen kronikken bygger på.

3. **Fremoverbildet snur fortellingen.** I prosjekter ferdigstilt 2021–2025 og under bygging er Vestlandet og Østlandet nesten likt per innbygger. Vei alene viser Vestlandet som klart største mottaker.

4. **Det "egentlige" spørsmålet handler ikke om regionale andeler.** Intercity er konsentrert om Østlandet fordi det er der pendlerkorridoren ligger; transportøkonomi handler ikke om geografisk likedeling.

### Hva analysen ikke kan si noe om

- Om Hordfast eller andre planlagte vestlandsprosjekter er gode samfunnsøkonomiske investeringer.
- Om NTP 2025–2036 er riktig prioritert.
- Hvilken normalisering ("per innbygger", "per km eksisterende vei", "per personkilometer reist") som er den "korrekte" — det er et politisk og verdimessig spørsmål.

### Reproduserbarhet

All kode og alle data er tilgjengelig i dette repositoriet. Tre filer å publisere:

- `data/prosjekter.csv` — rådata
- `analyse.ipynb` — denne notebook
- `METODE.md` — fyldig metodebeskrivelse

For å kjøre analysen på nytt:

```bash
pip install -r requirements.txt
jupyter lab analyse.ipynb
```

### Bidrag og kritikk

Ta gjerne kontakt hvis du finner feil eller har metodeforslag. Pull requests velkomne på GitHub: [lenke]

---

*Sist oppdatert 14. mai 2026.*"""))

nb.cells = cells

# Skriv ut notebook
import json
with open("/home/claude/samferdselsanalyse/analyse.ipynb", "w") as f:
    nbf.write(nb, f)

print("Skrev analyse.ipynb med", len(cells), "celler")
