"""Byggepris calculator module."""

#! /usr/bin/env python3
import sys


def relative_price_increase(price_index, year1, year2):
    """Computes the relative price increase between two years."""
    if year1 in price_index and year2 in price_index:
        return 1 + ((price_index[year2] - price_index[year1]) / price_index[year1])
    else:
        return "Ugyldige årstall"


# Prisindeks fra SSB (avg) for Veganlegg

price_index = {
    2000: 39.9,
    2001: 41.1,
    2002: 42.0,
    2003: 43.4,
    2004: 45.0,
    2005: 46.8,
    2006: 48.7,
    2007: 51.8,
    2008: 56.0,
    2009: 56.6,
    2010: 58.5,
    2011: 61.8,
    2012: 63.5,
    2013: 65.4,
    2014: 67.0,
    2015: 68.2,
    2016: 69.3,
    2017: 71.8,
    2018: 74.9,
    2019: 76.5,
    2020: 77.3,
    2021: 82.7,
    2022: 94.4,
    2023: 97.1,
    2024: 99.5,
    2025: 102.6,
    2026: 106,  # not average yet, but a projection
}

year2 = int(sys.argv[1]) if len(sys.argv) > 1 else 2024
for year1, _ in price_index.items():
    increase = relative_price_increase(price_index, year1, year2)
    print(f"Relativ prisstigning fra {year1} til {year2}: {increase:.2f}")
