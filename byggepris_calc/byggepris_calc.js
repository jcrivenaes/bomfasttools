/* cspell:disable */

(function (root, factory) {
    if (typeof module === "object" && module.exports) {
        module.exports = factory();
    } else {
        root.ByggeprisCalculator = factory();
    }
})(typeof self !== "undefined" ? self : this, function () {
    "use strict";

    function relativePriceIncrease(priceIndex, year1, year2) {
        var first = priceIndex[year1];
        var second = priceIndex[year2];

        if (!Number.isFinite(first) || !Number.isFinite(second) || first === 0) {
            throw new RangeError("Ugyldige årstall");
        }
        return second / first;
    }

    function calculate(year1, year2, priceIndex) {
        var index = priceIndex;
        if (!index) {
            throw new Error("Hent indeksverdier fra SSB først");
        }
        var multiplier = relativePriceIncrease(index, year1, year2);

        return {
            multiplier: multiplier,
            percentage: (multiplier - 1) * 100,
            indexFrom: index[year1],
            indexTo: index[year2],
        };
    }

    function getJsonStatValue(data, dimensionId, categoryId) {
        var dimension = data.dimension && data.dimension[dimensionId];
        var category = dimension && dimension.category;
        var index = category && category.index;
        var position =
            index &&
            (Array.isArray(index) ? index.indexOf(categoryId) : index[categoryId]);

        if (position === undefined || position < 0) {
            throw new Error("Fant ikke tidsverdien " + categoryId + " i SSB-svaret");
        }

        return position;
    }

    function orderedCategoryIds(index) {
        if (Array.isArray(index)) {
            return index.slice();
        }

        return Object.keys(index).sort(function (a, b) {
            return index[a] - index[b];
        });
    }

    function parseSsbJsonStat(data, yearDimension) {
        var index = data.dimension[yearDimension].category.index;
        var orderedYears = orderedCategoryIds(index);
        var values = {};

        orderedYears.forEach(function (year) {
            var position = getJsonStatValue(data, yearDimension, year);
            var value = Array.isArray(data.value) ? data.value[position] : data.value;

            if (value !== null && Number.isFinite(Number(value))) {
                values[year] = Number(value);
            }
        });
        return values;
    }

    async function fetchFromSsb(options) {
        var settings = options || {};
        var tableId = settings.tableId;
        var query = settings.query;
        var fetchImpl = settings.fetchImpl || (typeof fetch === "function" && fetch);

        if (!tableId || !query || !fetchImpl) {
            throw new Error("SSB krever tableId, query og fetch");
        }

        var response = await fetchImpl(
            "https://data.ssb.no/api/v0/no/table/" + encodeURIComponent(tableId),
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    query: query,
                    response: { format: "json-stat2" },
                }),
            },
        );

        if (!response.ok) {
            throw new Error("SSB svarte med HTTP " + response.status);
        }

        return parseSsbJsonStat(await response.json(), settings.yearDimension || "Tid");
    }

    async function fetchSsbMetadata(tableId, fetchImpl) {
        var response = await fetchImpl(
            "https://data.ssb.no/api/v0/no/table/" + encodeURIComponent(tableId),
        );
        if (!response.ok) {
            throw new Error("SSB metadata svarte med HTTP " + response.status);
        }
        return response.json();
    }

    function extrapolate(year, priceIndex) {
        var knownYears = Object.keys(priceIndex)
            .map(Number)
            .sort(function (a, b) {
                return a - b;
            });
        if (knownYears.length < 2) {
            throw new Error("SSB har ikke nok verdier til ekstrapolering");
        }

        var lowerYears = knownYears.filter(function (knownYear) {
            return knownYear < year;
        });
        var upperYears = knownYears.filter(function (knownYear) {
            return knownYear > year;
        });
        var firstYear;
        var secondYear;

        if (lowerYears.length >= 2) {
            firstYear = lowerYears[lowerYears.length - 2];
            secondYear = lowerYears[lowerYears.length - 1];
        } else if (upperYears.length >= 2) {
            firstYear = upperYears[0];
            secondYear = upperYears[1];
        } else {
            throw new Error(
                "SSB har ikke nok naboverdier til ekstrapolering av " + year,
            );
        }

        var annualChange =
            (priceIndex[secondYear] - priceIndex[firstYear]) / (secondYear - firstYear);
        return priceIndex[secondYear] + annualChange * (year - secondYear);
    }

    async function fetchSsbIndex(options) {
        var settings = options || {};
        var selectedYears = (settings.years || []).map(String);
        var periodSuffix = settings.periodSuffix;
        var tableId = settings.tableId;
        var fetchImpl = settings.fetchImpl || (typeof fetch === "function" && fetch);

        if (!fetchImpl || !tableId || !periodSuffix) {
            throw new Error("SSB krever tabell, periode og fetch");
        }

        var metadata = await fetchSsbMetadata(tableId, fetchImpl);
        var timeVariable = metadata.variables.filter(function (variable) {
            return variable.code === "Tid";
        })[0];
        var availablePeriods = timeVariable.values.filter(function (period) {
            return period.slice(-periodSuffix.length) === periodSuffix;
        });
        var periodIndex = await fetchFromSsb({
            tableId: tableId,
            yearDimension: "Tid",
            fetchImpl: fetchImpl,
            query: settings.query(availablePeriods),
        });
        var annualIndex = {};
        var priceIndex = {};

        Object.keys(periodIndex).forEach(function (period) {
            if (periodIndex[period] !== undefined) {
                annualIndex[period.slice(0, 4)] = periodIndex[period];
            }
        });
        selectedYears.forEach(function (year) {
            var value = periodIndex[year + periodSuffix];
            priceIndex[year] =
                value === undefined ? extrapolate(Number(year), annualIndex) : value;
        });
        Object.defineProperty(priceIndex, "extrapolatedYears", {
            value: selectedYears.filter(function (year) {
                return periodIndex[year + periodSuffix] === undefined;
            }),
            enumerable: false,
        });
        return priceIndex;
    }

    async function fetchSsbRoadConstructionIndex(years, options) {
        var settings = options || {};
        var selectedYears = (years || []).map(String);
        var quarter = settings.quarter || "K4";
        return fetchSsbIndex({
            years: selectedYears,
            periodSuffix: quarter,
            tableId: settings.tableId || "08662",
            fetchImpl: settings.fetchImpl,
            query: function (availablePeriods) {
                return (
                    settings.query || [
                        {
                            code: "Veganlegg",
                            selection: { filter: "item", values: ["00"] },
                        },
                        {
                            code: "ContentsCode",
                            selection: { filter: "item", values: ["ByggIndex"] },
                        },
                        {
                            code: "Tid",
                            selection: { filter: "item", values: availablePeriods },
                        },
                    ]
                );
            },
        });
    }

    async function fetchSsbKpiIndex(years, options) {
        var settings = options || {};
        var quarterMonths = { K1: "03", K2: "06", K3: "09", K4: "12" };
        var quarter = settings.quarter || "K4";
        var month = quarterMonths[quarter];

        return fetchSsbIndex({
            years: years,
            periodSuffix: "M" + month,
            tableId: settings.tableId || "03013",
            fetchImpl: settings.fetchImpl,
            query: function (availablePeriods) {
                return [
                    {
                        code: "Konsumgrp",
                        selection: { filter: "item", values: ["TOTAL"] },
                    },
                    {
                        code: "ContentsCode",
                        selection: { filter: "item", values: ["KpiIndMnd"] },
                    },
                    {
                        code: "Tid",
                        selection: { filter: "item", values: availablePeriods },
                    },
                ];
            },
        });
    }

    return {
        calculate: calculate,
        fetchFromSsb: fetchFromSsb,
        fetchSsbKpiIndex: fetchSsbKpiIndex,
        fetchSsbRoadConstructionIndex: fetchSsbRoadConstructionIndex,
        parseSsbJsonStat: parseSsbJsonStat,
        relativePriceIncrease: relativePriceIncrease,
    };
});
