# DataFrame oppsummering
import pandas as pd

# Inputverdier
anlegg_incl_mva = 43_700_000_000
anlegg_inlc_mva_smlaar = 51_647_236_000  # or None
mva_sats = 0.22
årlig_drift_vedlikehold = -200_000_000
årlig_overforing = +150_000_000
skatteinntekter = +4_673_492_000
trafikantnytte = +46_152_192_000
endring_ulykker = -1_004_339_000
stoy_luft = +411_770_000
skattefaktor = 1.2
diskrente = 0.04
år_kroneverdi = 2016
byggetid = 5
byggetid_start = 2025
driftsperiode = 40
sml_aar = 2030

år_kpi_vekst = sml_aar - år_kroneverdi

if anlegg_inlc_mva_smlaar:
    kpi_vekst = (anlegg_inlc_mva_smlaar / anlegg_incl_mva) ** (1/år_kpi_vekst) - 1
else:
    # Hvis ingen sammenligningsverdi, bruk en antatt KPI-vekst
    kpi_vekst = 0.0122

print(f"KPI-vekst fra {år_kroneverdi} til {sml_aar}: {kpi_vekst:.2%} over {år_kpi_vekst} år")

anlegg_inkl_mva_aar_kpi = anlegg_incl_mva * (1 + kpi_vekst) ** år_kpi_vekst
print(f"Anleggskostnad inkl mva KPI-justert (2023-kr): {anlegg_inkl_mva_aar_kpi:,.0f}")

# Trekker ut mva
anlegg_ex_mva_aar_init = anlegg_incl_mva / (1 + mva_sats)

# KPI-oppjustering investering
anlegg_ex_mva_kpi = anlegg_ex_mva_aar_init * (1 + kpi_vekst) ** år_kpi_vekst

# Årlig investering fordelt på byggetid
årlig_investering = anlegg_ex_mva_kpi / byggetid

# Lag tabell over investering pr år
inv_rows = []
nv_sum = 0

for i in range(byggetid):
    år = byggetid_start + i
    disk_n = (1 + diskrente) ** (år - sml_aar)
    nv = -årlig_investering / disk_n
    nv_sum += nv
    inv_rows.append({
        "År": år,
        "Årlig investering (2023-kr)": -årlig_investering,
        "Diskonteringsfaktor": disk_n,
        "Nåverdi (2023-kr)": nv
    })

df_investering = pd.DataFrame(inv_rows)

# Nåverdier drift/vedlikehold og overføringer
nv_drift = 0
nv_overforing = 0
for i in range(driftsperiode):
    år = byggetid_start + byggetid + i
    disk_n = (1 + diskrente) ** (år - sml_aar)
    nv_drift += (årlig_drift_vedlikehold * (1 + kpi_vekst) ** år_kpi_vekst) / disk_n
    nv_overforing += (årlig_overforing * (1 + kpi_vekst) ** år_kpi_vekst) / disk_n

# KPI-oppjustering og diskontering skatteinntekter og trafikantnytte (antar i åpningsåret)
år_skatte_tiltak = byggetid_start + byggetid
disk_factor_skatte = (1 + diskrente) ** (år_skatte_tiltak - sml_aar)
skatteinntekter_kpi = skatteinntekter * (1 + kpi_vekst) ** år_kpi_vekst / disk_factor_skatte
trafikantnytte_kpi = trafikantnytte * (1 + kpi_vekst) ** år_kpi_vekst / disk_factor_skatte

# Sum kostnader eks skatteinntekter
sum_kost = nv_sum + nv_drift + nv_overforing + endring_ulykker + stoy_luft

# Skattekostnad
skattekostnad = (sum_kost - skatteinntekter_kpi) * (skattefaktor - 1)

# Netto uten trafikantnytte
netto_uten_trafikant = sum_kost + skatteinntekter_kpi + skattekostnad

# NNB
nnb = netto_uten_trafikant + trafikantnytte_kpi

# Budsjettkroner
budsjettkroner = nv_sum + nv_drift + skattekostnad

# Netto nytte pr budsjettkrone
if budsjettkroner != 0:
    netto_nytte_per_budsjettkrone = nnb / abs(budsjettkroner)
else:
    netto_nytte_per_budsjettkrone = None

# DataFrame oppsummering
data = {
    "Komponent": [
        "Anleggskostnad inkl mva",
        "Anleggskostnad eks mva (2016-kr)",
        "Anleggskostnad eks mva KPI-justert (2023-kr)",
        "Diskontert investering (2023-kr, fordelt over byggetid)",
        "Nåverdi drift/vedlikehold",
        "Nåverdi overføringer",
        "Endring i ulykker (diskontert)",
        "Støy og luftforurensing (diskontert)",
        "Skatteinntekter KPI-justert og diskontert",
        "Skattekostnad",
        "Netto uten trafikantnytte",
        "Trafikantnytte KPI-justert og diskontert",
        "NNB (Netto Nytte-Beløp)",
        "Budsjettkroner",
        "Netto nytte pr budsjettkrone"
    ],
    "Beløp (kr)": [
        anlegg_incl_mva,
        anlegg_ex_mva_aar_init,
        anlegg_ex_mva_kpi,
        nv_sum,
        nv_drift,
        nv_overforing,
        endring_ulykker,
        stoy_luft,
        skatteinntekter_kpi,
        skattekostnad,
        netto_uten_trafikant,
        trafikantnytte_kpi,
        nnb,
        budsjettkroner,
        netto_nytte_per_budsjettkrone
    ]
}
df_summary = pd.DataFrame(data)

# Excel output
with pd.ExcelWriter("kostnadsoppsummering_2023_fordelt.xlsx", engine="openpyxl") as writer:
    df_summary.to_excel(writer, sheet_name="Oppsummering", index=False)
    df_investering.to_excel(writer, sheet_name="Investering per år", index=False)

# Terminal output
pd.options.display.float_format = '{:,.0f}'.format
print("Oppsummering:\n", df_summary)
print("\nInvestering per år:\n", df_investering)
