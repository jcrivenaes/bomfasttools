import pandas as pd

# Parametre
years = list(range(1, 41))

# Input
fergetakst = 150
bompengetakst = 400
bompengeperiode = 20
aad_ferge_start = 4000
aad_bom_start = 7500
aad_bom_post = 12000
vekst_ferge = 0.015
vekst_bom = 0.02
vekst_bom_post = 0.025
diskrente = 0.04


# År for sammenligning og åpning
sammenligningsår = 2022
åpningsår = 2030
byggetid = åpningsår - sammenligningsår

skattekostnadsfaktor = 0.2
år_kroneverdi = 2016

årlig_vedlikehold = 170_000_000
årlig_spart_ferge = 160_000_000

# Investering
byggekostnad_incl_mva = 53_000_000_000
bompengebidrag_incl_mva = 14_000_000_000
mva_sats = 0.25

# Beregning investering eks mva
byggekostnad_ex_mva = byggekostnad_incl_mva / (1 + mva_sats)
mva_byggekostnad = byggekostnad_incl_mva - byggekostnad_ex_mva

bompenge_ex_mva = bompengebidrag_incl_mva / (1 + mva_sats)
mva_bompenge = bompengebidrag_incl_mva - bompenge_ex_mva

# Netto statlig investering eks mva
netto_investering_stat = byggekostnad_ex_mva - bompenge_ex_mva

# Lister for output
results = []

for n in years:
    # ÅDT ferge
    aad_ferge = aad_ferge_start * (1 + vekst_ferge)**(n - 1)

    # ÅDT ny veg
    if n <= byggetid:
        aad_bom = 0
        bomtakst = 0
    elif n <= bompengeperiode + byggetid:
        aad_bom = aad_bom_start * (1 + vekst_bom)**(n - byggetid - 1)
        bomtakst = bompengetakst
    else:
        aad_bom = aad_bom_post * (1 + vekst_bom_post)**(n - (bompengeperiode + byggetid) - 1)
        bomtakst = 0

    # Trafikk
    trafikk_ferge = aad_ferge * 365
    trafikk_bom = aad_bom * 365

    if n <= byggetid:
        # Ingen trafikknytte eller kostnader i byggetid
        kost_ferge = 0
        kost_bom = 0
        diff_kost = 0
        nåverdi_diff = 0
        nytte_fritid = 0
        nytte_arbeid = 0
        nytte_tjeneste = 0
        sum_nytte = 0
        nåverdi_nytte = 0
        netto_nytte = 0
        skattekostnad = 0
        vedlikehold = 0
        spart_ferge = 0
        nåverdi_vedlikehold = 0
        nåverdi_spart_ferge = 0
        investering = 0
        nåverdi_investering = 0
        nåverdi_skattekostnad_investering = 0
    else:
        # Kostnader
        kost_ferge = trafikk_ferge * fergetakst
        kost_bom = trafikk_bom * bomtakst
        diff_kost = kost_ferge - kost_bom

        skattekostnad = kost_bom * skattekostnadsfaktor
        vedlikehold = årlig_vedlikehold
        spart_ferge = årlig_spart_ferge

        disk_factor = (1 + diskrente)**(n - sammenligningsår)

        nåverdi_diff = diff_kost / disk_factor
        nåverdi_vedlikehold = vedlikehold / disk_factor
        nåverdi_spart_ferge = spart_ferge / disk_factor

        # Tidsnytte per formål
        nytte_fritid = trafikk_bom * (130 * (15/60)) * 0.6
        nytte_arbeid = trafikk_bom * (220 * (15/60)) * 0.3
        nytte_tjeneste = trafikk_bom * (480 * (15/60)) * 0.1
        sum_nytte = nytte_fritid + nytte_arbeid + nytte_tjeneste
        nåverdi_nytte = sum_nytte / disk_factor

        netto_nytte = nåverdi_nytte + nåverdi_diff + nåverdi_spart_ferge - nåverdi_vedlikehold - skattekostnad / disk_factor

        investering = 0
        nåverdi_investering = 0
        nåverdi_skattekostnad_investering = 0

    # Investering føres i byggetidens sluttår
    if n == byggetid:
        disk_factor = (1 + diskrente)**(n - sammenligningsår)
        investering = netto_investering_stat
        nåverdi_investering = investering / disk_factor
        nåverdi_skattekostnad_investering = (investering * skattekostnadsfaktor) / disk_factor
        netto_nytte -= nåverdi_investering + nåverdi_skattekostnad_investering

    results.append({
        "År": n,
        "ÅDT Ferge": aad_ferge,
        "ÅDT Ny Veg": aad_bom,
        "Kostnad Ferge": kost_ferge,
        "Kostnad Bom": kost_bom,
        "Differanse Kost": diff_kost,
        "Nåverdi Kost Diff": nåverdi_diff,
        "Skattekostnad Drift": skattekostnad,
        "Nåverdi Skatt Drift": skattekostnad / ((1 + diskrente)**(n - sammenligningsår)) if n > byggetid else 0,
        "Vedlikehold": vedlikehold,
        "Nåverdi Vedlikehold": nåverdi_vedlikehold,
        "Sparte Fergedrift": spart_ferge,
        "Nåverdi Spart Fergedrift": nåverdi_spart_ferge,
        "Tidsnytte Fritid": nytte_fritid,
        "Tidsnytte Arbeid": nytte_arbeid,
        "Tidsnytte Tjeneste": nytte_tjeneste,
        "Sum Tidsnytte": sum_nytte,
        "Nåverdi Tidsnytte": nåverdi_nytte,
        "Investering eks mva": investering,
        "Nåverdi Investering": nåverdi_investering,
        "Nåverdi Skatt Investering": nåverdi_skattekostnad_investering,
        "Netto Nåverdi": netto_nytte
    })

# DataFrame
df = pd.DataFrame(results)

# Sammendrag
sammendrag = {
    "Sum Nåverdi Kost Diff": df["Nåverdi Kost Diff"].sum(),
    "Sum Nåverdi Tidsnytte": df["Nåverdi Tidsnytte"].sum(),
    "Sum Nåverdi Spart Fergedrift": df["Nåverdi Spart Fergedrift"].sum(),
    "Sum Nåverdi Vedlikehold": df["Nåverdi Vedlikehold"].sum(),
    "Sum Nåverdi Skatt Drift": df["Nåverdi Skatt Drift"].sum(),
    "Sum Nåverdi Investering": df["Nåverdi Investering"].sum(),
    "Sum Nåverdi Skatt Investering": df["Nåverdi Skatt Investering"].sum(),
    "Sum Netto Nåverdi": df["Netto Nåverdi"].sum(),
    "År for Kroneverdi": år_kroneverdi,
    "Investering eks mva": netto_investering_stat,
    "Bompengebidrag eks mva": bompenge_ex_mva,
    "Mva totalt": mva_byggekostnad
}
sammendrag_df = pd.DataFrame([sammendrag])

# Excel writer
# with pd.ExcelWriter("trafikkantnytte_utvidet.xlsx", engine="openpyxl") as writer:
#     df.to_excel(writer, sheet_name="Årstall", index=False)
#     sammendrag_df.to_excel(writer, sheet_name="Sammendrag", index=False)

# print("Excel-filen 'trafikkantnytte_utvidet.xlsx' er laget.")

# Oppsummering til terminalen
print("\n--- Oppsummering ---")
for key, value in sammendrag.items():
    print(f"{key}: {value:,.0f}" if isinstance(value, (int, float)) else f"{key}: {value}")
