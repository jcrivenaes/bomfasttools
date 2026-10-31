const FIRST_YEAR = 2000;
const LAST_YEAR = 2034;
const yeardata = [];
for (let y = FIRST_YEAR; y <= LAST_YEAR; y++) {
    yeardata.push(y);
}

// Manuelt innlagte ÅDT (før Ferjedatabanken har data, den starter i 2007).
// Fra 2007 hentes tallene fra aadt.json, som lages av fetch_aadt.py.
const MANUAL = {
    jekt_hodn: {
        2000: 367,
        2001: 355,
        2002: 378,
        2003: 386,
        2004: 389,
        2005: 397,
        2006: 410,
    },
    hal_vaage: {
        2000: 309,
        2001: 322,
        2002: 338,
        2003: 370,
        2004: 364,
        2005: 375,
        2006: 386,
    },
    hal_sandv: {
        2000: 1460,
        2001: 1575,
        2002: 1659,
        2003: 1690,
        2004: 1712,
        2005: 1740,
        2006: 1848,
    },
};

const SERIES = [
    { key: "jekt_hodn", name: "ÅDT Jektevik-Huglo-Hodnanes" },
    { key: "hal_vaage", name: "ÅDT Halhjem-Våge" },
    { key: "hal_sandv", name: "ÅDT Halhjem-Sandvikvåg" },
];

// Info-tekster om hendelser som påvirker trafikken (korona, endringer i billettpriser osv.).
// Legg til nye linjer her. offsetY brukes hvis to tekster havner oppå hverandre.
const EVENTS = [
    { year: 2020, text: "Corona", color: "red" },
    { year: 2022, text: "Kraftig reduksjon fergepriser", color: "green" },
];

function seriesData(key, apiSeries) {
    const values = { ...MANUAL[key], ...(apiSeries[key] || {}) };
    return yeardata.map((year) => (year in values ? values[year] : null));
}

function buildOptions(apiSeries) {
    return {
        chart: {
            type: "line",
            height: 500,
            fontSize: "18px",
        },
        title: {
            text: "Historisk trafikk fergene Os - Tysnes - Stord",
            align: "left",
            style: {
                fontSize: "18px",
                color: "#333",
            },
        },
        subtitle: {
            text: "Gjelder kjøretøytellinger utenom motorsykkel/moped. 2000-2006: SVV rapporter. Fra 2007: Ferjedatabanken",
            align: "left",
            style: {
                fontSize: "14px",
                color: "#666",
            },
        },
        series: SERIES.map(({ key, name }) => ({
            name,
            data: seriesData(key, apiSeries),
        })),
        yaxis: {
            labels: {
                style: {
                    fontSize: "14px",
                },
            },
            min: 0,
            max: 4000,
        },
        xaxis: {
            categories: yeardata,
            labels: {
                style: {
                    fontSize: "14px",
                },
            },
            tickAmount: 8,
        },
        annotations: {
            xaxis: EVENTS.map((e) => ({
                x: e.year,
                borderColor: "blue",
                label: {
                    offsetY: e.offsetY || 0,
                    style: {
                        color: e.color || "red",
                        fontSize: "11px",
                    },
                    text: e.text,
                },
            })),
        },
    };
}

async function loadApiSeries() {
    const response = await fetch("aadt.json");
    if (!response.ok) {
        throw new Error(`aadt.json: HTTP ${response.status}`);
    }
    return (await response.json()).series;
}

loadApiSeries()
    .catch((err) => {
        console.error(
            "Kunne ikke laste ÅDT fra Ferjedatabanken, viser kun manuelle tall",
            err,
        );
        return {};
    })
    .then((apiSeries) => {
        new ApexCharts(
            document.querySelector("#chart"),
            buildOptions(apiSeries),
        ).render();
    });
