"""Byggepris calculator module."""
#! /usr/bin/env python3

def relative_price_increase(price_index, year1, year2):
    """Beregner multiplikator mellom to aar."""
    if year1 in price_index and year2 in price_index:
        return 1 + ((price_index[year2] - price_index[year1]) / price_index[year1])
    else:
        return "Ugyldige årstall"

# Prisindeks fra SSB (Q4 tall) for Veganlegg
price_index = {
    2000: 92.7,
    2001: 94.3,
    2002: 96.9,
    2003: 99.7,
    2004: 104.4,
    2005: 108.3,
    2006: 113.3,
    2007: 122.2,
    2008: 128.3,
    2009: 129.9,
    2010: 135.1,
    2011: 142.4,
    2012: 145.8,
    2013: 149.5,
    2014: 153,
    2015: 156.4,
    2016: 159.8,
    2017: 165.7,
    2018: 172.6,
    2019: 174.7,
    2020: 176.4,
    2021: 195.7,
    2022: 219.8,
    2023: 224.3,
    2024: 228
}

year2 = 2024
for year1, _ in price_index.items():
    increase = relative_price_increase(price_index, year1, year2)
    print(f"Relativ prisstigning fra {year1} til {year2}: {increase:.2f}")
