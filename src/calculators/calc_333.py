 # Parametre
aadt_ferge = 4332
aadt_ny_vei = 7106

verdsetting_tid = 200      # kr per time
innspart_tid = 1           # timer
fergebillett = 120         # kr per reise
bompenger = 450            # kr per reise
reise_tid_ferge = 2        # ekstra time før
reise_tid_vei = 1          # total tid ny vei
vektefaktor=1

antall_dager = 365

# Beregninger

# 1. Reisekostnad per reise (ferge)
kost_ferge = fergebillett + verdsetting_tid * reise_tid_ferge

# 2. Reisekostnad per reise (ny vei)
kost_ny_vei = bompenger + verdsetting_tid * reise_tid_vei

# 3. Antall reiser per år
ant_reiser_ferge = aadt_ferge * antall_dager
ant_reiser_vei = aadt_ny_vei * antall_dager

# 4. Total reisekostnad per år
total_ferge = kost_ferge * ant_reiser_ferge
total_vei = kost_ny_vei * ant_reiser_vei

# 5. Netto endring for eksisterende trafikk (4332 ÅDT)
delta_kost = kost_ny_vei - kost_ferge
eksisterende_trafikk = aadt_ferge * antall_dager * delta_kost

# 6. Generert trafikk (vekting x for 2774 ÅDT)
ny_trafikk = aadt_ny_vei - aadt_ferge
generert_trafikk = ny_trafikk * antall_dager * delta_kost * vektefaktor

# 7. Samlet netto endring per år
samlet_netto = eksisterende_trafikk + generert_trafikk

# Utskrift
print(f"Reisekostnad per reise (ferge): {kost_ferge:,.0f} kr")
print(f"Reisekostnad per reise (ny vei): {kost_ny_vei:,.0f} kr")
print(f"Total reisekostnad per år (ferge): {total_ferge:,.0f} kr")
print(f"Total reisekostnad per år (ny vei): {total_vei:,.0f} kr")
print(f"Netto endring i reisekostnad (eksisterende trafikk): {eksisterende_trafikk:,.0f} kr/år")
print(f"Netto endring i reisekostnad (generert trafikk, vektet 0.5): {generert_trafikk:,.0f} kr/år")
print(f"Samlet netto endring i reisekostnad per år: {samlet_netto:,.0f} kr")
