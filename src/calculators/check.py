import pandas as pd

# Sett inn utbetalingsprofilen (2016-kr)
utbetalinger = [
    {"år": 2029, "beløp": 0},
    {"år": 2020, "beløp": 0},
    {"år": 2021, "beløp": 0},
    {"år": 2022, "beløp": 30_000_000_000},
    {"år": 2023, "beløp": 0},
    {"år": 2024, "beløp": 0},
    {"år": 2025, "beløp": 13_700_000_000},
    {"år": 2026, "beløp": 0},
    {"år": 2027, "beløp": 0},
    {"år": 2028, "beløp": 0},
    {"år": 2029, "beløp": 0},
]

basisår = 2016
rente = 0.04

rows = []
diskontert_sum = 0

for row in utbetalinger:
    år = row["år"]
    beløp = row["beløp"]
    disk_faktor = (1 + rente)**(år - basisår)
    opprentet = beløp * disk_faktor
    diskontert_sum += opprentet
    rows.append({
        "År": år,
        "Utbetaling (2016-kr)": beløp,
        "Diskonteringsfaktor": round(disk_faktor, 5),
        "Opprentet til 2016-kr": round(opprentet)
    })

df = pd.DataFrame(rows)
print(df)
print("\nSUM opprentet (diskontert) investering i 2016-kr:", round(diskontert_sum))
print("Antall år:", len(utbetalinger))
print("Sum utbetaling (2016-kr):", sum(row["beløp"] for row in utbetalinger))
