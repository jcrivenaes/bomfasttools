const SSB_API = "https://data.ssb.no/api/v0/no/table/10482";

const grupper = {
  "ØSTLANDET (UTENOM OSLO)": [
    "Østfold",
    "Østfold (-2019)",
    "Innlandet",
    "Hedmark (-2019)",
    "Oppland (-2019)",
    "Buskerud",
    "Buskerud (-2019)",
    "Akershus",
    "Akershus (-2019)",
    "Viken (2020-2023)",
    "Viken",
    "Vestfold",
    "Telemark",
    "Vestfold (-2019)",
    "Telemark (-2019)",
    "Vestfold og Telemark (2020-2023)",
  ],
  OSLO: ["Oslo", "Oslo - Oslove"],
  VESTNORGE: [
    "Rogaland",
    "Rogaland (-2019)",
    "Vestland",
    "Hordaland (-2019)",
    "Sogn og Fjordane (-2019)",
    "Møre og Romsdal",
  ],
  AGDER: [
    "Vest-Agder",
    "Vest-Agder (-2019)",
    "Aust-Agder",
    "Aust-Agder (-2019)",
    "Agder",
  ],
  NORD: [
    "Troms og Finnmark",
    "Troms - Romsa - Tromssa",
    "Finnmark - Finnmárku - Finmarkku",
    "Troms og Finnmark - Romsa ja Finnmárku (2020-2023)",
    "Troms - Romsa (-2019)",
    "Finnmark - Finnmárku (-2019)",
    "Nordland",
    "Nordland - Nordlánnda",
    "Svalbard",
    "Jan Mayen",
  ],
  MIDT: [
    "Trøndelag",
    "Trøndelag - Trööndelage",
    "Sør-Trøndelag (-2017)",
    "Nord-Trøndelag (-2017)",
  ],
};

const removeList = [
  "Hele landet",
  "Reeksport av varer produsert i utlandet",
  "Norske varer med opprinnelse fra flere fylker",
  "Uoppgitt fylke",
];

// Build reverse lookup: region name → group name
const regionMap = {};
for (const [group, members] of Object.entries(grupper)) {
  for (const m of members) regionMap[m] = group;
}

const COLORS = [
  "#667eea",
  "#e05c5c",
  "#43c97b",
  "#f0a500",
  "#00b4d8",
  "#9b5de5",
];

async function main() {
  try {
    const payload = {
      query: [
        { code: "Region", selection: { filter: "top", values: ["999"] } },
        { code: "Tid", selection: { filter: "top", values: ["17"] } },
      ],
      response: { format: "json-stat2" },
    };

    const res = await fetch(SSB_API, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);

    const js2 = await res.json();
    const { absolute, relative } = processData(js2);

    renderChart("chart1", absolute, {
      yFormatter: (v) =>
        v.toLocaleString("nb-NO", { maximumFractionDigits: 0 }),
      yTitle: "Verdi (1000 NOK)",
    });

    renderChart("chart2", relative, {
      yFormatter: (v) =>
        v.toLocaleString("nb-NO", {
          minimumFractionDigits: 1,
          maximumFractionDigits: 1,
        }) + " %",
      yTitle: "Andel (%)",
      markers: true,
    });
  } catch (err) {
    showError(err.message);
  }
}

function processData(js2) {
  const id = js2.id;
  const sizes = js2.size;
  const values = js2.value;

  // Compute strides (row-major / C order)
  const strides = new Array(id.length).fill(1);
  for (let d = id.length - 2; d >= 0; d--)
    strides[d] = strides[d + 1] * sizes[d + 1];

  const regionDim = id.indexOf("Region");
  const tidDim = id.indexOf("Tid");

  const regionCat = js2.dimension.Region.category;
  const tidCat = js2.dimension.Tid.category;

  // Build index → code arrays for Region and Tid
  const regionByIdx = Object.entries(regionCat.index)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code);
  const tidByIdx = Object.entries(tidCat.index)
    .sort((a, b) => a[1] - b[1])
    .map(([code]) => code);

  const grouped = {};

  for (let flat = 0; flat < values.length; flat++) {
    const val = values[flat];
    if (val === null) continue;

    // Decompose flat index into per-dimension positions
    let rem = flat;
    const pos = id.map((_, d) => {
      const p = Math.floor(rem / strides[d]);
      rem %= strides[d];
      return p;
    });

    const label = regionCat.label[regionByIdx[pos[regionDim]]];
    const year = parseInt(tidByIdx[pos[tidDim]]);

    if (removeList.includes(label)) continue;

    const group = regionMap[label] ?? label;

    if (!grouped[group]) grouped[group] = {};
    if (!grouped[group][year]) grouped[group][year] = 0;
    grouped[group][year] += val;
  }

  // Collect sorted unique years
  const yearsSet = new Set();
  for (const yrs of Object.values(grouped))
    for (const y of Object.keys(yrs)) yearsSet.add(parseInt(y));
  const years = [...yearsSet].sort((a, b) => a - b);

  // Total per year for relative share
  const totals = {};
  for (const yrs of Object.values(grouped))
    for (const [y, v] of Object.entries(yrs)) totals[y] = (totals[y] ?? 0) + v;

  const absSeries = [];
  const relSeries = [];

  for (const [group, yrs] of Object.entries(grouped)) {
    absSeries.push({ name: group, data: years.map((y) => yrs[y] ?? null) });
    relSeries.push({
      name: group,
      data: years.map((y) =>
        yrs[y] != null && totals[y]
          ? +((yrs[y] / totals[y]) * 100).toFixed(4)
          : null
      ),
    });
  }

  return {
    absolute: { series: absSeries, years },
    relative: { series: relSeries, years },
  };
}

function renderChart(
  containerId,
  { series, years },
  { yFormatter, yTitle, markers = false }
) {
  const options = {
    series,
    chart: {
      type: "line",
      height: 480,
      toolbar: {
        show: true,
        tools: { download: true, zoom: true, pan: true, reset: true },
      },
      animations: { enabled: true, speed: 700 },
    },
    colors: COLORS,
    stroke: { curve: "smooth", width: 4 },
    markers: markers ? { size: 4, hover: { size: 6 } } : { size: 0 },
    xaxis: {
      categories: years.map(String),
      title: { text: "År" },
    },
    yaxis: {
      title: { text: yTitle },
      labels: { formatter: yFormatter },
    },
    tooltip: {
      shared: true,
      y: { formatter: yFormatter },
    },
    legend: { position: "bottom" },
    grid: { borderColor: "#e8e8e8", strokeDashArray: 4 },
    responsive: [{ breakpoint: 680, options: { chart: { height: 300 } } }],
  };

  const el = document.getElementById(containerId);
  el.innerHTML = "";
  new ApexCharts(el, options).render();
}

function showError(msg) {
  const html = `<div class="error">Feil: ${msg}</div>`;
  document.getElementById("chart1").innerHTML = html;
  document.getElementById("chart2").innerHTML = html;
}

main();
