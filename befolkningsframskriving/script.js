// Henter regionale befolkningsframskrivinger fra SSB Statistikkbanken (tabell 14746)
// og plotter fremskrevet folkemengde for egendefinerte grupper av kommuner/fylker.

const TABLE_ID = "14746";
const API_URL = `https://data.ssb.no/api/v0/no/table/${TABLE_ID}`;

// Hovedalternativet (MMMM) - vises alltid med dobbel linjetykkelse i grafen.
const MAIN_ALT_CODE = "Personer";

// Registrert (historisk) folkemengde, brukt til å fylle aksen bakover fra 2000
// siden framskrivingstabellen kun starter i 2026. Bruker PxWebApi v2 med
// kodelistene "Kommuner 2024, sammenslåtte tidsserier" (agg_KommSummer) og
// "Fylker 2024, sammenslåtte tidsserier" (agg_KommFylker), slik at kommuner/
// fylker som har byttet grenser får en sammenhengende tidsserie i stedet for
// 0/null før siste grenseendring.
const HIST_TABLE_ID = "07459";
const HIST_API_URL = `https://data.ssb.no/api/pxwebapi/v2/tables/${HIST_TABLE_ID}/data`;
const HIST_CONTENTS_CODE = "Personer1";
const HIST_REGION_CODELIST = { fylke: "agg_KommFylker", kommune: "agg_KommSummer" };

// Tidsakse 2000-2050, samme spenn som SSBs egne befolkningsframskrivings-grafer.
const AXIS_START_YEAR = 2000;
const AXIS_END_YEAR = 2050;

// Landsdeler brukt av "Legg til landsdeler"-snarveien. Matches mot fylkenavn
// hentet fra SSB (så ingen fylkeskoder er hardkodet).
const LANDSDELER = {
    Østlandet: [
        "Østfold",
        "Akershus",
        "Oslo",
        "Innlandet",
        "Buskerud",
        "Vestfold",
        "Telemark",
    ],
    Agder: ["Agder"],
    Vestlandet: ["Rogaland", "Vestland", "Møre og Romsdal"],
    Trøndelag: ["Trøndelag"],
    "Nord-Norge": ["Nordland", "Troms", "Finnmark"],
};

let regionMeta = []; // { code, text, level }
let altMeta = []; // { code, text }
let ageMeta = []; // { code, text } - code er "000".."104" eller "105+"
let years = []; // ["2026", ..., "2050"]

let groups = []; // { id, name, codes: string[] }
const selectedCodes = new Set();
let chartInstance = null;

// Standard norske aldersgrupper. "67 år og eldre" følger den vanlige
// pensjonsalder-grensen; SSB bruker selv 0-19/20-66/67+ i forsørgerbrøken,
// så grensene kan justeres i UI-et.
let ageGroups = [
    { key: "barn_ungdom", label: "Barn og ungdom", min: 0, max: 19, enabled: false },
    { key: "voksne_yrke", label: "Voksne i yrke", min: 20, max: 66, enabled: false },
    { key: "eldre", label: "67 år og eldre", min: 67, max: 105, enabled: false },
];

const COLORS = [
    "#667eea",
    "#e05c5c",
    "#43c97b",
    "#f0a500",
    "#00b4d8",
    "#9b5de5",
    "#ef476f",
    "#06d6a0",
];

function primaryName(text) {
    return text.split(" - ")[0].trim();
}

// Navnene (kommuner/fylker) som inngår i en gruppe, i den rekkefølgen de ble valgt.
function regionNamesForGroup(group) {
    return group.codes
        .map((code) => regionMeta.find((r) => r.code === code))
        .filter(Boolean)
        .map((r) => primaryName(r.text));
}

// Forkorter en navneliste til en lesbar streng, f.eks «Halden, Moss + 5 til».
function summarizeNames(names, maxShown = 6) {
    if (names.length <= maxShown) return names.join(", ");
    return `${names.slice(0, maxShown).join(", ")} + ${names.length - maxShown} til`;
}

// Tomt felt = ingen grense (Apex velger selv). Ellers brukes tallet i feltet.
function parsedAxisValue(input) {
    const raw = input.value.trim();
    if (raw === "") return undefined;
    const num = Number(raw);
    return Number.isFinite(num) ? num : undefined;
}

function updateYAxisFromInputs() {
    if (!chartInstance) return;
    chartInstance.updateOptions({
        yaxis: {
            min: parsedAxisValue(document.getElementById("yAxisMin")),
            max: parsedAxisValue(document.getElementById("yAxisMax")),
        },
    });
}

// Tømmer Y-akse-feltene slik at neste rendering beregner nye default-verdier.
function resetYAxisInputs() {
    document.getElementById("yAxisMin").value = "";
    document.getElementById("yAxisMax").value = "";
}

const SELF_CONTAINED_FONT_FAMILY = "Helvetica, Arial, sans-serif";

// Bryter en tekststreng til flere linjer slik at hver linje er innenfor maxWidth piksler.
function wrapTextToWidth(text, maxWidth, font) {
    if (!text) return [];
    const canvas =
        wrapTextToWidth._canvas ??
        (wrapTextToWidth._canvas = document.createElement("canvas"));
    const ctx = canvas.getContext("2d");
    ctx.font = font;
    const words = text.split(" ");
    const lines = [];
    let current = "";
    for (const word of words) {
        const candidate = current ? `${current} ${word}` : word;
        if (current && ctx.measureText(candidate).width > maxWidth) {
            lines.push(current);
            current = word;
        } else {
            current = candidate;
        }
    }
    if (current) lines.push(current);
    return lines;
}

function drawCenteredSvgLines(svg, lines, startY, lineHeight) {
    const ns = "http://www.w3.org/2000/svg";
    lines.forEach((line, i) => {
        const el = document.createElementNS(ns, "text");
        el.setAttribute("class", "self-contained-text");
        el.setAttribute("x", "50%");
        el.setAttribute("y", String(startY + i * lineHeight));
        el.setAttribute("text-anchor", "middle");
        el.setAttribute("font-size", String(line.size));
        el.setAttribute("font-family", SELF_CONTAINED_FONT_FAMILY);
        el.setAttribute("fill", line.color);
        el.textContent = line.text;
        svg.appendChild(el);
    });
}

// Fjerner tidligere kjøringers ekstra tekst, slik at funksjonen kan kjøres flere
// ganger (f.eks. når Y-aksen justeres) uten å hope seg opp.
function resetSelfContainedAnnotations(svg) {
    svg.querySelectorAll(".self-contained-text").forEach((el) => el.remove());
}

// Regner ut hvor mye plass (og hvilke ferdig-brutte linjer) som trengs for
// region- og fotnote-teksten, gitt bredden grafen faktisk får. Må gjøres FØR
// ApexCharts opprettes, slik at plassen kan reserveres via chart.height +
// grid.padding.top — bruker vi grid.padding.bottom i stedet havner gapet før
// legend-en (ikke etter), og en etterhåndsflytting av selve SVG-en gjør at
// legend (som er et eget HTML-lag) og aksetekstene havner oppå hverandre.
function computeSelfContainedLayout(containerWidth, regionsText, footerText) {
    const maxTextWidth = Math.max(containerWidth - 40, 200);
    const topLineHeight = 17;
    const bottomLineHeight = 14;
    const regionLines = wrapTextToWidth(
        regionsText,
        maxTextWidth,
        `13px ${SELF_CONTAINED_FONT_FAMILY}`,
    );
    const footerLines = wrapTextToWidth(
        footerText,
        maxTextWidth,
        `11px ${SELF_CONTAINED_FONT_FAMILY}`,
    );
    const regionBlockHeight =
        regionLines.length > 0 ? regionLines.length * topLineHeight + 8 : 0;
    const footerBlockHeight =
        footerLines.length > 0 ? footerLines.length * bottomLineHeight + 10 : 0;
    return {
        regionLines,
        footerLines,
        topLineHeight,
        bottomLineHeight,
        regionBlockHeight,
        footerBlockHeight,
        topGap: regionBlockHeight + footerBlockHeight,
    };
}

// Gjør grafen "self-contained": tegner hvilke kommuner/fylker gruppen(e) inneholder
// og en fotnote (aldersfilter, framskrivingsalternativ, kilde, tidspunkt og
// bomfast.info) rett under tittelen — i plassen som allerede er reservert via
// grid.padding.top — slik at alt blir med når grafen lastes ned som bilde.
function addSelfContainedAnnotations(chartContext, layout) {
    const svg = chartContext.el.querySelector("svg");
    if (!svg || layout.topGap === 0) return;

    resetSelfContainedAnnotations(svg);

    const titleEl = svg.querySelector(".apexcharts-title-text");
    let titleBottom = 0;
    try {
        if (titleEl) {
            const box = titleEl.getBBox();
            titleBottom = box.y + box.height;
        }
    } catch {
        titleBottom = 0;
    }

    let y = titleBottom;
    if (layout.regionLines.length > 0) {
        drawCenteredSvgLines(
            svg,
            layout.regionLines.map((text) => ({ text, size: 13, color: "#555" })),
            y + layout.topLineHeight,
            layout.topLineHeight,
        );
        y += layout.regionBlockHeight;
    }
    if (layout.footerLines.length > 0) {
        drawCenteredSvgLines(
            svg,
            layout.footerLines.map((text) => ({ text, size: 11, color: "#888" })),
            y + layout.bottomLineHeight,
            layout.bottomLineHeight,
        );
    }
}

function rangeYears(start, end) {
    const result = [];
    for (let y = start; y <= end; y++) result.push(String(y));
    return result;
}

function levelOf(code) {
    if (code === "0") return "land";
    return code.length === 2 ? "fylke" : "kommune";
}

function ageNumber(code) {
    return code === "105+" ? 105 : Number(code);
}

// Finner hvilken (aktiverte) aldersgruppe en gitt SSB-alderskode hører til, eller null.
function classifyAge(code) {
    const n = ageNumber(code);
    return ageGroups.find((g) => g.enabled && n >= g.min && n <= g.max) ?? null;
}

async function fetchJson(url, options) {
    const res = await fetch(url, options);
    if (!res.ok) throw new Error(`SSB API svarte med HTTP ${res.status}`);
    return res.json();
}

async function init() {
    try {
        const meta = await fetchJson(API_URL);
        const regionVar = meta.variables.find((v) => v.code === "Region");
        const altVar = meta.variables.find((v) => v.code === "ContentsCode");
        const tidVar = meta.variables.find((v) => v.code === "Tid");
        const alderVar = meta.variables.find((v) => v.code === "Alder");

        regionMeta = regionVar.values.map((code, i) => ({
            code,
            text: regionVar.valueTexts[i],
            level: levelOf(code),
        }));
        altMeta = altVar.values.map((code, i) => ({
            code,
            text: altVar.valueTexts[i],
        }));
        ageMeta = alderVar.values.map((code, i) => ({
            code,
            text: alderVar.valueTexts[i],
        }));
        years = tidVar.values;

        renderRegionList(regionMeta);
        renderAltList();
        renderAgeGroupList();
        bindEvents();
    } catch (err) {
        document.getElementById("regionList").innerHTML =
            `<div class="error">Klarte ikke å hente regionliste: ${escapeHtml(err.message)}</div>`;
        document.getElementById("altList").innerHTML = "";
        document.getElementById("ageGroupList").innerHTML = "";
    }
}

function escapeHtml(str) {
    const div = document.createElement("div");
    div.textContent = str;
    return div.innerHTML;
}

function renderRegionList(list) {
    const container = document.getElementById("regionList");
    container.innerHTML = "";

    if (list.length === 0) {
        container.innerHTML = '<p class="hint">Ingen treff.</p>';
        return;
    }

    const frag = document.createDocumentFragment();
    list.forEach((r) => {
        const row = document.createElement("div");
        row.className = "region-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = r.code;
        checkbox.id = `region-${r.code}`;
        checkbox.checked = selectedCodes.has(r.code);
        checkbox.addEventListener("change", () => {
            if (checkbox.checked) selectedCodes.add(r.code);
            else selectedCodes.delete(r.code);
        });

        const badge = document.createElement("span");
        badge.className = `badge ${r.level}`;
        badge.textContent = r.level;

        const label = document.createElement("label");
        label.setAttribute("for", checkbox.id);
        label.textContent = r.text;

        row.append(checkbox, badge, label);
        frag.appendChild(row);
    });
    container.appendChild(frag);
}

function renderAltList() {
    const container = document.getElementById("altList");
    container.innerHTML = "";

    const frag = document.createDocumentFragment();
    altMeta.forEach((a) => {
        const row = document.createElement("div");
        row.className = "alt-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.value = a.code;
        checkbox.id = `alt-${a.code}`;
        checkbox.checked = a.code === MAIN_ALT_CODE; // Hovedalternativet (MMMM) er default
        checkbox.addEventListener("change", resetYAxisInputs);

        const label = document.createElement("label");
        label.setAttribute("for", checkbox.id);
        label.textContent = a.text;

        row.append(checkbox, label);
        frag.appendChild(row);
    });
    container.appendChild(frag);
}

function selectedAlternatives() {
    return altMeta
        .map((a) => a.code)
        .filter((code) => document.getElementById(`alt-${code}`)?.checked);
}

function ageGroupModeEnabled() {
    return ageGroups.some((g) => g.enabled);
}

function renderAgeGroupList() {
    const container = document.getElementById("ageGroupList");
    container.innerHTML = "";

    ageGroups.forEach((g) => {
        const row = document.createElement("div");
        row.className = "age-group-row";

        const checkbox = document.createElement("input");
        checkbox.type = "checkbox";
        checkbox.id = `agegroup-${g.key}`;
        checkbox.checked = g.enabled;
        checkbox.addEventListener("change", () => {
            g.enabled = checkbox.checked;
            resetYAxisInputs();
        });

        const label = document.createElement("label");
        label.setAttribute("for", checkbox.id);
        label.textContent = g.label;

        const minInput = document.createElement("input");
        minInput.type = "number";
        minInput.min = "0";
        minInput.max = "105";
        minInput.value = String(g.min);
        minInput.className = "age-input";
        minInput.addEventListener("change", () => {
            g.min = Math.max(0, Math.min(105, Number(minInput.value) || 0));
            resetYAxisInputs();
        });

        const dash = document.createElement("span");
        dash.textContent = "–";

        const maxInput = document.createElement("input");
        maxInput.type = "number";
        maxInput.min = "0";
        maxInput.max = "105";
        maxInput.value = String(g.max);
        maxInput.className = "age-input";
        maxInput.addEventListener("change", () => {
            g.max = Math.max(0, Math.min(105, Number(maxInput.value) || 105));
            resetYAxisInputs();
        });

        const yearsLabel = document.createElement("span");
        yearsLabel.className = "hint";
        yearsLabel.textContent = "år";

        row.append(checkbox, label, minInput, dash, maxInput, yearsLabel);
        container.appendChild(row);
    });
}

function renderGroups() {
    const container = document.getElementById("groupList");
    container.innerHTML = "";
    resetYAxisInputs();

    if (groups.length === 0) {
        container.innerHTML = '<p class="hint">Ingen grupper lagt til ennå.</p>';
        return;
    }

    groups.forEach((g) => {
        const wrapper = document.createElement("div");
        wrapper.className = "chip-wrapper";

        const chip = document.createElement("div");
        chip.className = "chip";

        const name = document.createElement("span");
        name.className = "chip-name";
        name.textContent = g.name;

        const count = document.createElement("span");
        count.className = "chip-count";
        count.textContent = `(${g.codes.length})`;

        const removeBtn = document.createElement("button");
        removeBtn.className = "remove-chip";
        removeBtn.textContent = "×";
        removeBtn.title = "Fjern gruppe";
        removeBtn.addEventListener("click", () => {
            groups = groups.filter((x) => x.id !== g.id);
            renderGroups();
        });

        chip.append(name, count, removeBtn);

        const names = regionNamesForGroup(g);
        const members = document.createElement("p");
        members.className = "chip-members";
        members.textContent = summarizeNames(names);
        members.title = names.join(", ");

        wrapper.append(chip, members);
        container.appendChild(wrapper);
    });
}

function addGroupFromSelection() {
    const nameInput = document.getElementById("groupName");
    const name = nameInput.value.trim();
    const codes = [...selectedCodes];

    if (codes.length === 0) {
        alert("Velg minst én kommune eller ett fylke først.");
        return;
    }
    if (!name) {
        alert("Skriv inn et navn på gruppen.");
        return;
    }

    groups.push({ id: crypto.randomUUID(), name, codes });
    selectedCodes.clear();
    nameInput.value = "";
    renderRegionList(filteredRegions());
    renderGroups();
}

function addLandsdelPresets() {
    const fylker = regionMeta.filter((r) => r.level === "fylke");
    Object.entries(LANDSDELER).forEach(([landsdel, names]) => {
        const codes = fylker
            .filter((f) => names.includes(primaryName(f.text)))
            .map((f) => f.code);
        if (codes.length > 0 && !groups.some((g) => g.name === landsdel)) {
            groups.push({ id: crypto.randomUUID(), name: landsdel, codes });
        }
    });
    renderGroups();
}

function filteredRegions() {
    const query = document.getElementById("search").value.trim().toLowerCase();
    if (!query) return regionMeta;
    return regionMeta.filter((r) => r.text.toLowerCase().includes(query));
}

function bindEvents() {
    document.getElementById("search").addEventListener("input", () => {
        renderRegionList(filteredRegions());
    });
    document
        .getElementById("addGroupBtn")
        .addEventListener("click", addGroupFromSelection);
    document.getElementById("clearSelectionBtn").addEventListener("click", () => {
        selectedCodes.clear();
        renderRegionList(filteredRegions());
    });
    document
        .getElementById("presetLandsdelerBtn")
        .addEventListener("click", addLandsdelPresets);
    document.getElementById("renderBtn").addEventListener("click", renderChart);
    document
        .getElementById("yAxisMin")
        .addEventListener("input", updateYAxisFromInputs);
    document
        .getElementById("yAxisMax")
        .addEventListener("input", updateYAxisFromInputs);
}

// Summerer verdier fra et json-stat2 svar over region- (og evt. alder-) dimensjonen,
// gruppert på (aldersgruppe, alternativ, år). Uten alderCodes er svaret allerede
// summert over alder av SSB (eliminert dimensjon), og alt havner i bucket "total".
function aggregateGroupData(js2, hasAlder) {
    const id = js2.id;
    const sizes = js2.size;
    const values = js2.value;

    const strides = new Array(id.length).fill(1);
    for (let d = id.length - 2; d >= 0; d--) strides[d] = strides[d + 1] * sizes[d + 1];

    const altDim = id.indexOf("ContentsCode");
    const tidDim = id.indexOf("Tid");
    const alderDim = hasAlder ? id.indexOf("Alder") : -1;

    const altCat = js2.dimension.ContentsCode.category;
    const tidCat = js2.dimension.Tid.category;
    const altByIdx = Object.entries(altCat.index)
        .sort((a, b) => a[1] - b[1])
        .map(([c]) => c);
    const tidByIdx = Object.entries(tidCat.index)
        .sort((a, b) => a[1] - b[1])
        .map(([c]) => c);
    const alderByIdx = hasAlder
        ? Object.entries(js2.dimension.Alder.category.index)
              .sort((a, b) => a[1] - b[1])
              .map(([c]) => c)
        : null;

    const result = {};
    for (let flat = 0; flat < values.length; flat++) {
        const val = values[flat];
        if (val === null || val === undefined) continue;

        let rem = flat;
        const pos = id.map((_, d) => {
            const p = Math.floor(rem / strides[d]);
            rem %= strides[d];
            return p;
        });

        let bucketKey = "total";
        if (hasAlder) {
            const bucket = classifyAge(alderByIdx[pos[alderDim]]);
            if (!bucket) continue;
            bucketKey = bucket.key;
        }

        const altCode = altByIdx[pos[altDim]];
        const year = tidByIdx[pos[tidDim]];

        result[bucketKey] ??= {};
        result[bucketKey][altCode] ??= {};
        result[bucketKey][altCode][year] =
            (result[bucketKey][altCode][year] ?? 0) + val;
    }
    return result;
}

async function fetchGroupData(group, altCodes, ageCodes) {
    const query = [
        { code: "Region", selection: { filter: "item", values: group.codes } },
    ];
    if (ageCodes)
        query.push({ code: "Alder", selection: { filter: "item", values: ageCodes } });
    query.push({
        code: "ContentsCode",
        selection: { filter: "item", values: altCodes },
    });
    query.push({ code: "Tid", selection: { filter: "item", values: years } });

    const js2 = await fetchJson(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query, response: { format: "json-stat2" } }),
    });

    return aggregateGroupData(js2, !!ageCodes);
}

// Summerer registrert folkemengde over region- (og evt. alder-) dimensjonen,
// gruppert på (aldersgruppe, år). Kommuner/fylker som ikke fantes i et gitt
// år kommer som 0/null fra SSB og behandles som «ingen data».
function aggregateHistoricalData(js2, hasAlder) {
    const id = js2.id;
    const sizes = js2.size;
    const values = js2.value;

    const strides = new Array(id.length).fill(1);
    for (let d = id.length - 2; d >= 0; d--) strides[d] = strides[d + 1] * sizes[d + 1];

    const tidDim = id.indexOf("Tid");
    const alderDim = hasAlder ? id.indexOf("Alder") : -1;
    const tidCat = js2.dimension.Tid.category;
    const tidByIdx = Object.entries(tidCat.index)
        .sort((a, b) => a[1] - b[1])
        .map(([c]) => c);
    const alderByIdx = hasAlder
        ? Object.entries(js2.dimension.Alder.category.index)
              .sort((a, b) => a[1] - b[1])
              .map(([c]) => c)
        : null;

    const result = {};
    for (let flat = 0; flat < values.length; flat++) {
        const val = values[flat];
        if (!val) continue;

        let rem = flat;
        const pos = id.map((_, d) => {
            const p = Math.floor(rem / strides[d]);
            rem %= strides[d];
            return p;
        });

        let bucketKey = "total";
        if (hasAlder) {
            const bucket = classifyAge(alderByIdx[pos[alderDim]]);
            if (!bucket) continue;
            bucketKey = bucket.key;
        }

        const year = tidByIdx[pos[tidDim]];
        result[bucketKey] ??= {};
        result[bucketKey][year] = (result[bucketKey][year] ?? 0) + val;
    }
    return result;
}

// Prefikser en region-kode slik SSBs sammenslåtte-tidsserie-kodelister forventer
// ("K-3101", "F-31"). "Hele landet" (kode "0") har ingen slik kodeliste.
function prefixedHistRegionCode(code, level) {
    if (level === "fylke") return `F-${code}`;
    if (level === "kommune") return `K-${code}`;
    return code;
}

async function fetchHistoricalDataForLevel(codes, level, histYears, ageCodes) {
    if (codes.length === 0) return {};

    const params = new URLSearchParams();
    params.set("lang", "no");
    params.set(
        "valueCodes[Region]",
        codes.map((code) => prefixedHistRegionCode(code, level)).join(","),
    );
    if (HIST_REGION_CODELIST[level])
        params.set("codelist[Region]", HIST_REGION_CODELIST[level]);
    if (ageCodes) params.set("valueCodes[Alder]", ageCodes.join(","));
    params.set("valueCodes[ContentsCode]", HIST_CONTENTS_CODE);
    params.set("valueCodes[Tid]", histYears.join(","));
    params.set("outputFormat", "json-stat2");

    const js2 = await fetchJson(`${HIST_API_URL}?${params.toString()}`);
    return aggregateHistoricalData(js2, !!ageCodes);
}

function mergeHistoricalBuckets(target, source) {
    for (const [bucketKey, yearMap] of Object.entries(source)) {
        target[bucketKey] ??= {};
        for (const [year, val] of Object.entries(yearMap)) {
            target[bucketKey][year] = (target[bucketKey][year] ?? 0) + val;
        }
    }
    return target;
}

async function fetchGroupHistoricalData(group, histYears, ageCodes) {
    if (histYears.length === 0) return {};

    const codesByLevel = { land: [], fylke: [], kommune: [] };
    for (const code of group.codes) codesByLevel[levelOf(code)].push(code);

    const results = await Promise.all(
        Object.entries(codesByLevel).map(([level, codes]) =>
            fetchHistoricalDataForLevel(codes, level, histYears, ageCodes),
        ),
    );

    return results.reduce(mergeHistoricalBuckets, {});
}

function showChartMessage(html) {
    document.getElementById("chartCaption").textContent = "";
    if (chartInstance) {
        chartInstance.destroy();
        chartInstance = null;
    }
    document.getElementById("chart").innerHTML = html;
}

async function renderChart() {
    const altCodes = selectedAlternatives();
    const ageMode = ageGroupModeEnabled();
    const activeAgeGroups = ageGroups.filter((g) => g.enabled);

    if (groups.length === 0) {
        showChartMessage(
            '<p class="hint">Legg til minst én gruppe med kommuner/fylker først.</p>',
        );
        return;
    }
    if (altCodes.length === 0) {
        showChartMessage('<p class="hint">Velg minst ett framskrivingsalternativ.</p>');
        return;
    }
    if (ageMode && activeAgeGroups.length === 0) {
        showChartMessage(
            '<p class="hint">Velg minst én aldersgruppe, eller slå av aldersinndelingen.</p>',
        );
        return;
    }

    showChartMessage(
        '<div class="loading"><div class="spinner"></div><p>Henter data fra SSB…</p></div>',
    );

    try {
        const histYears = rangeYears(AXIS_START_YEAR, Number(years[0]) - 1);
        const axisYears = rangeYears(AXIS_START_YEAR, AXIS_END_YEAR);
        const ageCodes = ageMode
            ? ageMeta.map((a) => a.code).filter((code) => classifyAge(code))
            : null;
        const bucketKeys = ageMode ? activeAgeGroups.map((g) => g.key) : ["total"];

        const [perGroupProj, perGroupHist] = await Promise.all([
            Promise.all(groups.map((g) => fetchGroupData(g, altCodes, ageCodes))),
            Promise.all(
                groups.map((g) => fetchGroupHistoricalData(g, histYears, ageCodes)),
            ),
        ]);

        const series = [];
        const strokeWidths = [];
        const seriesColors = [];
        let colorIndex = 0;
        groups.forEach((group, gi) => {
            const projData = perGroupProj[gi];
            const histData = perGroupHist[gi];
            bucketKeys.forEach((bucketKey) => {
                const bucketLabel = ageMode
                    ? activeAgeGroups.find((g) => g.key === bucketKey)?.label
                    : null;
                altCodes.forEach((altCode) => {
                    const altText =
                        altMeta.find((a) => a.code === altCode)?.text ?? altCode;
                    const values = axisYears.map((y) =>
                        years.includes(y)
                            ? (projData[bucketKey]?.[altCode]?.[y] ?? null)
                            : (histData[bucketKey]?.[y] ?? null),
                    );
                    const parts = [];
                    if (groups.length > 1) parts.push(group.name);
                    if (bucketLabel) parts.push(bucketLabel);
                    parts.push(altText);
                    const name =
                        parts.length > 0
                            ? parts.join(" – ")
                            : (bucketLabel ?? group.name);
                    series.push({ name, data: values });
                    strokeWidths.push(altCode === MAIN_ALT_CODE ? 6 : 3);
                    // Kun første gruppes MMMM er svart – ellers blir alle gruppers
                    // MMMM-linjer svarte og umulige å skille fra hverandre.
                    if (gi === 0 && altCode === MAIN_ALT_CODE) {
                        seriesColors.push("#000000");
                    } else {
                        seriesColors.push(COLORS[colorIndex % COLORS.length]);
                        colorIndex++;
                    }
                });
            });
        });

        const chartTitle =
            groups.length === 1
                ? groups[0].name
                : `Befolkningsframskriving – ${groups.map((g) => g.name).join(", ")}`;
        const ageDescription = ageMode
            ? `Aldersgrupper: ${activeAgeGroups.map((g) => `${g.label} (${g.min}–${g.max} år)`).join(", ")}`
            : "Alle aldre";
        const groupsCaption =
            groups.length === 1
                ? regionNamesForGroup(groups[0]).join(", ")
                : groups
                      .map((g) => `${g.name}: ${regionNamesForGroup(g).join(", ")}`)
                      .join("   •   ");
        document.getElementById("chartCaption").textContent =
            `${groupsCaption}\n${ageDescription}`;

        const altLegend = altCodes
            .map((code) => altMeta.find((a) => a.code === code)?.text ?? code)
            .join(", ");
        const generatedAt = new Date().toLocaleString("nb-NO", {
            dateStyle: "short",
            timeStyle: "short",
        });
        const footerText =
            `${ageDescription}  •  Framskrivingsalternativ: ${altLegend}  •  ` +
            `Kilde: SSB tabell ${TABLE_ID} (framskriving), ${HIST_TABLE_ID} (historikk)  •  ` +
            `Generert ${generatedAt}  •  bomfast.info`;

        const minInput = document.getElementById("yAxisMin");
        const maxInput = document.getElementById("yAxisMax");
        const dataValues = series.flatMap((s) => s.data).filter((v) => v != null);
        const dataMax = dataValues.length > 0 ? Math.max(...dataValues) : 0;
        if (minInput.value.trim() === "") minInput.value = "0";
        if (maxInput.value.trim() === "")
            maxInput.value = String(Math.ceil(dataMax / 1000) * 1000);

        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        document.getElementById("chart").innerHTML = "";
        const lastHistYear = histYears[histYears.length - 1];
        const containerWidth = document.getElementById("chart").clientWidth || 800;
        const selfContainedLayout = computeSelfContainedLayout(
            containerWidth,
            groupsCaption,
            footerText,
        );
        const baseChartHeight = 700;
        const baseMobileHeight = 480;
        chartInstance = new ApexCharts(document.getElementById("chart"), {
            series,
            chart: {
                type: "line",
                height: baseChartHeight + selfContainedLayout.topGap,
                toolbar: {
                    show: true,
                    tools: { download: true, zoom: true, pan: true, reset: true },
                },
                animations: { enabled: true, speed: 700 },
                events: {
                    mounted: (chartContext) =>
                        addSelfContainedAnnotations(chartContext, selfContainedLayout),
                    updated: (chartContext) =>
                        addSelfContainedAnnotations(chartContext, selfContainedLayout),
                },
            },
            title: {
                text: chartTitle,
                align: "center",
                style: { fontSize: "16px", fontWeight: 600 },
            },
            colors: seriesColors,
            stroke: { curve: "straight", width: strokeWidths },
            markers: { size: 0 },
            xaxis: {
                categories: axisYears,
                title: { text: "År", style: { fontSize: "16px" } },
                tickAmount: 10,
                labels: { rotate: -45, style: { fontSize: "14px" } },
            },
            yaxis: {
                title: { text: "Folketall", style: { fontSize: "16px" } },
                min: parsedAxisValue(minInput),
                max: parsedAxisValue(maxInput),
                labels: {
                    style: { fontSize: "14px" },
                    formatter: (v) =>
                        v == null
                            ? ""
                            : v.toLocaleString("nb-NO", { maximumFractionDigits: 0 }),
                },
            },
            tooltip: {
                shared: true,
                y: {
                    formatter: (v) =>
                        v == null
                            ? "Ingen data"
                            : v.toLocaleString("nb-NO", { maximumFractionDigits: 0 }),
                },
            },
            legend: { position: "bottom" },
            grid: {
                borderColor: "#e8e8e8",
                strokeDashArray: 4,
                padding: { top: selfContainedLayout.topGap },
            },
            annotations: {
                xaxis: lastHistYear
                    ? [
                          {
                              x: AXIS_START_YEAR.toString(),
                              x2: lastHistYear,
                              fillColor: "#8fc9a0",
                              opacity: 0.45,
                          },
                      ]
                    : [],
            },
            responsive: [
                {
                    breakpoint: 680,
                    options: {
                        chart: {
                            height: baseMobileHeight + selfContainedLayout.topGap,
                        },
                    },
                },
            ],
        });
        chartInstance.render();
    } catch (err) {
        showChartMessage(
            `<div class="error">Feil ved henting av data: ${escapeHtml(err.message)}</div>`,
        );
    }
}

init();
