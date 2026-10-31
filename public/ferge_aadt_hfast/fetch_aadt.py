#!/usr/bin/env python3
"""Henter ÅDT (kjøretøy, uten MC) for fergene langs Hordfast fra Ferjedatabanken.

Bruker det åpne søkeendepunktet til https://ferjedatabanken.no/statistikk
(det offisielle API-et på api.ferjedatabanken.no krever innlogging).
Databanken har data fra 2007, og data for en måned publiseres etter den 15. i
påfølgende måned.

Bruk:
    python fetch_aadt.py              # skriver aadt.json ved siden av scriptet

ÅDT = tellinger (konvensjonelle + nullutslipp kjøretøy, ikke MC/person/annet) i
kalenderåret / 365, slik tidligere innlagte tall er regnet.
"""
import argparse
import datetime as dt
import json
import os
import sys
import urllib.error
import urllib.request

URL = "https://ferjedatabanken.no/api/fdb-trafikkdata"
FIRST_YEAR = 2007
MAX_YEARS_PER_REQUEST = 3  # grense for oppløsning "År"
OUTFILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "aadt.json")

# FDBLineID (samme ID gjennom alle kontraktsperioder), se /api/fdb-samband
SERIES = {
    "jekt_hodn": 1033,  # Jektevik - Nordhuglo - Hodnanes
    "hal_vaage": 1021,  # Halhjem - Våge
    "hal_sandv": 1018,  # Halhjem - Sandvikvåg
}


def query(first_year, last_year):
    body = {
        "details": ["samband"],
        "regulativ": ["autopass", "riks", "eget"],
        "ticket_categories": ["konvensjonell", "nullutslipp"],
        "date_aggregation": "År",
        "fra_dato": f"{first_year}-01-01",
        "til_dato": f"{last_year}-12-31",
    }
    # text/plain slik nettsiden selv gjør det; application/json gir 500
    req = urllib.request.Request(
        URL,
        data=json.dumps(body).encode(),
        headers={"Content-Type": "text/plain;charset=UTF-8"},
    )
    try:
        with urllib.request.urlopen(req, timeout=120) as resp:
            return json.load(resp)["data"]
    except urllib.error.HTTPError as err:
        sys.exit(f"HTTP {err.code} for {first_year}-{last_year}: {err.read()[:300]!r}")


def last_complete_year(today):
    # desember publiseres etter den 15. i januar
    return today.year - 1 if today >= dt.date(today.year, 1, 17) else today.year - 2


def main():
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("-o", "--output", default=OUTFILE)
    args = ap.parse_args()

    ids = {line_id: key for key, line_id in SERIES.items()}
    result = {key: {} for key in SERIES}
    last_year = last_complete_year(dt.date.today())
    for start in range(FIRST_YEAR, last_year + 1, MAX_YEARS_PER_REQUEST):
        end = min(start + MAX_YEARS_PER_REQUEST - 1, last_year)
        for row in query(start, end):
            key = ids.get(row["FDBLineID"])
            if key:
                result[key][str(row["År"])] = round(row["Tellinger"] / 365)

    for key, values in result.items():
        if not values:
            sys.exit(f"Ingen data for {key} (FDBLineID {SERIES[key]})")

    previous = {}
    if os.path.exists(args.output):
        with open(args.output, encoding="utf-8") as f:
            previous = json.load(f).get("series", {})
    for key, values in result.items():
        for year, value in values.items():
            old = previous.get(key, {}).get(year)
            if old is not None and old != value:
                print(f"{key} {year}: {old} -> {value}")

    out = {
        "source": "Ferjedatabanken (ferjedatabanken.no), kjøretøy utenom MC",
        "generated": dt.datetime.now().isoformat(timespec="seconds"),
        "series": result,
    }
    with open(args.output, "w", encoding="utf-8") as f:
        json.dump(out, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print("Skrev", args.output)


if __name__ == "__main__":
    main()
