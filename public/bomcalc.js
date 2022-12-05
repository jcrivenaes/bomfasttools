/*jshint esversion: 6 */

const MAXTRIES = 1000;
const MAXYEARS = 200;
const MRD = 1000000000.0;
const MLL = 1000000.0;

let input_byggeoppstart = 2020;
let input_byggetid = 7;
let input_styringsramme = 10;
let input_kostnadsramme = 12;
let input_basisaar = 2018;
let input_bompengelaan = 4;
let input_laaneprofil = 0; // velger mot noen definerte låneprofiler
let input_forhaandsinnkrevet = 0;
let input_nedbetalingstid = 15;
let input_laanerente1 = 5.5;
let input_laanerente2 = 6.5;
let input_laanerente_endring = 10;
let input_prisstigning = 2;
let input_aadt_oppstart = 2030;
let input_bomselskap = 15;
let input_tungandel = 15;
let input_tungmult = 3;
let input_rabattbil_andel = 80;
let input_rabattbil_pris = 80; // som % av lettbil
let input_offisielt = "vedtak";
let ainput_aarlig_laan = [];

// resultater som globale
let result_styringsramme_ved_oppstart = 0.0;
let result_bompengelaan_oppstart = 0.0;
let result_bomselskap_aapning = 0.0; // bomselskapet skal betjene lån og drifte fra denne datoen
let result_kumulativt_laan = 0.0;
let result_kumulativt_laan_disk = 0.0;
let result_initiell_avg_bomsats = 0.0;
let result_sluttaar = 2099;
let result_aar_til_aapning = 2099;
let result_aar_til_bomfritt = 2099;
let result_diverse_aar = "";
let result_diskontert = 99.99;
let result_lettbil = 99.99;
let result_rabattbil = 99.99;
let result_tungbil = 99.99;
let aresult_0101 = [];
let aresult_3112 = [];
let aresult_bomtakst = [];
let aresult_bominntekt = [];
let aresult_restlaan = [];
let aresult_tilbomselskap = [];
let aresult_tilbomselskap_sum = 0.0;
let result_renter_aarlig_sum = 0.0;
let result_renter_u_bygging_disk = 0.0;
let aresult_rentefot = [];
let aresult_rente_aarlig = [];
let aresult_aadt = [];

// de neste er her for låneopptak i byggeperioden
let abygge_aar = [];
let abygge_laanopptak = [];
let abygge_kumulativt_laan = [];
let abygge_kumulativt_laan_proj = [];
let abygge_rentefot = [];

function pris_ved_aar(innpris, aar) {
    // beregn pris som følgende av prisstigning etter et antall aar
    let nypris = innpris * Math.pow(1.0 + input_prisstigning, aar);
    return nypris;
}

function parse_input() {
    // les input fra HTML, og la tall være i kroner, mens prosent er i fraksjon
    input_byggeoppstart = parseInt(document.calc.byggeoppstart.value);
    input_byggetid = parseInt(document.calc.byggetid.value);
    input_styringsramme =
        parseFloat(document.calc.styringsramme.value.replace(",", ".")) * MRD;
    input_kostnadsramme =
        parseFloat(document.calc.kostnadsramme.value.replace(",", ".")) * MRD;
    input_basisaar = parseInt(document.calc.basisaar.value);
    input_bompengelaan =
        parseFloat(document.calc.bompengelaan.value.replace(",", ".")) * MRD;
    input_laaneprofil = parseInt(document.calc.laaneprofil.value);
    input_forhaandsinnkrevet =
        parseFloat(document.calc.forhaandsinnkrevet.value.replace(",", ".")) * MRD;
    input_nedbetalingstid = parseInt(document.calc.nedbetalingstid.value);
    input_laanerente1 =
        parseFloat(document.calc.laanerente1.value.replace(",", ".")) / 100.0;
    input_laanerente2 =
        parseFloat(document.calc.laanerente2.value.replace(",", ".")) / 100.0;
    input_laanerente_endring = parseInt(document.calc.laanerente_endring.value);
    input_prisstigning =
        parseFloat(document.calc.prisstigning.value.replace(",", ".")) / 100.0;
    input_aadt_oppstart = parseInt(document.calc.aadt_oppstart.value);
    input_trafikkvekst =
        parseFloat(document.calc.trafikkvekst.value.replace(",", ".")) / 100.0;
    input_bomselskap =
        parseFloat(document.calc.bomselskap.value.replace(",", ".")) * MLL;
    input_tungandel =
        parseFloat(document.calc.tungandel.value.replace(",", ".")) / 100.0;
    input_tungmult = parseFloat(document.calc.tungmult.value.replace(",", "."));
    input_rabattbil_andel = parseFloat(
        document.calc.rabattbil_andel.value.replace(",", ".") / 100.0
    );
    input_rabattbil_pris = parseFloat(
        document.calc.rabattbil_pris.value.replace(",", ".") / 100.0
    );
    input_offisielt = document.calc.offisielt.value;
}

function oppstartsverdier() {
    // beregn initielle vektorer etc
    // basisaar: 01/01
    // opptak lån skjer 01/01
    // nedbetaling skjer 31/12
    // status gjeld er 31/12

    result_sluttaar = input_byggeoppstart + input_byggetid + input_nedbetalingstid - 1;
    result_aar_til_aapning = input_byggeoppstart + input_byggetid - input_basisaar;
    result_aar_til_bomfritt = result_sluttaar - input_basisaar + 1;

    console.log("Result sluttår:", result_sluttaar);
    console.log("Antall år til åpning:", result_aar_til_aapning);
    console.log("Antall år til bomfritt:", result_aar_til_bomfritt);

    for (let i = 0; i < result_aar_til_bomfritt; i++) {
        aresult_0101[i] = i;
        aresult_3112[i] = i + 1;
        // console.log(
        //     "Index, 01/01, 31/12",
        //     i,
        //     aresult_0101[i],
        //     aresult_3112[i]
        // );
    }

    result_styringsramme_ved_oppstart = pris_ved_aar(
        input_styringsramme,
        input_byggeoppstart - input_basisaar
    );

    result_bompengelaan_oppstart = pris_ved_aar(
        input_bompengelaan,
        input_byggeoppstart - input_basisaar
    );

    result_bomselskap_aapning = pris_ved_aar(
        input_bomselskap,
        input_byggeoppstart + input_byggetid - input_basisaar
    );

    //==================================================================================
    // info om år, akkumulert lån, etc
    //==================================================================================

    aapning = input_byggeoppstart + input_byggetid;
    result_diverse_aar =
        input_basisaar.toString() +
        "/" +
        input_byggeoppstart.toString() +
        "/" +
        aapning.toString() +
        "/" +
        result_sluttaar.toString();
}
function iterate_toll_value() {
    // iterer verdier
    if (input_laaneprofil == 4) {
        get_aarlig_profile(input_byggetid);
        console.log("Låneprofil", ainput_aarlig_laan);
    }

    let cumloan = 0.0;
    if (input_laaneprofil == 0) {
        input_prisstigning = 0.0; // as test!
        cumloan = compute_sumloan0();
    } else if (input_laaneprofil == 1) {
        cumloan = compute_sumloan1();
    } else if (input_laaneprofil == 2) {
        cumloan = compute_sumloan2();
    } else if (input_laaneprofil == 3) {
        cumloan = compute_sumloan3();
    } else if (input_laaneprofil == 4) {
        cumloan = compute_sumloan1(); // yes, 1
    }

    console.log("Kumulativt bompengelån ved åpning:", cumloan);
    result_kumulativt_laan = cumloan;

    // rough estimate of toll as start value...
    let toll =
        ((1.0 + input_laanerente1) * result_kumulativt_laan +
            input_bomselskap * input_nedbetalingstid) /
        (input_nedbetalingstid * 365 * input_aadt_oppstart);

    console.log("Initiell bompengesats:", toll);
    let finalyear = yearly_streams(toll);

    console.log("Initial finalyear:", finalyear);
    if (finalyear != -1 && finalyear <= input_nedbetalingstid) {
        toll = toll / 2.0;
    }
    console.log("Initiell bompengesats (2):", toll);

    let tollincrement = 1;
    if (toll > 100) tollincrement = 5;
    if (toll > 300) tollincrement = 10;

    let previoustoll = toll;

    for (var i = 0; i < MAXTRIES; i++) {
        finalyear = yearly_streams(toll);

        console.log("Final year vs target:", finalyear, input_nedbetalingstid);

        if (finalyear == 1 || finalyear > input_nedbetalingstid) {
            previoustoll = toll;
            toll = toll + tollincrement;
        } else if (finalyear == -1) {
            previoustoll = toll;
            toll = toll + tollincrement;
        } else if (finalyear < input_nedbetalingstid) {
            toll = toll - tollincrement / 2.0;
        } else {
            break;
        }
    }
    previoustoll = toll * 0.95;
    console.log("ROUGH TOLL VALUE IS", toll);
    console.log("ITERATE USING", previoustoll);

    // fine tune to 50 or 10 øre
    tollincrement = 0.5;
    if (toll < 50) {
        tollincrement = 0.1;
    }
    toll = previoustoll;
    for (let i = 0; i < MAXTRIES; i++) {
        // console.log("Fine tune, toll = ", toll)
        finalyear = yearly_streams(toll);
        console.log(finalyear);

        if (finalyear == 1 || finalyear > input_nedbetalingstid) {
            toll = toll + tollincrement;
        } else if (finalyear == -1) {
            toll = toll + tollincrement;
        } else if (finalyear < input_nedbetalingstid) {
            toll = toll - tollincrement;
        } else {
            break;
        }
    }

    // run once more with mode=1 to make tables
    finalyear = yearly_streams(toll, (mode = 1));

    console.log("Proposed toll is ", toll);
    result_initiell_avg_bomsats = toll;
}

function get_aarlig_profile(yrs) {
    if (document.bomaarlig.aar1.value != null) {
        ainput_aarlig_laan[0] = parseFloat(document.bomaarlig.aar1.value) * MRD;
    }
    if (document.bomaarlig.aar2.value != null) {
        ainput_aarlig_laan[1] = parseFloat(document.bomaarlig.aar2.value) * MRD;
    }
    if (document.bomaarlig.aar3.value != null) {
        ainput_aarlig_laan[2] = parseFloat(document.bomaarlig.aar3.value) * MRD;
    }
    if (document.bomaarlig.aar4.value != null) {
        ainput_aarlig_laan[3] = parseFloat(document.bomaarlig.aar4.value) * MRD;
    }
    if (document.bomaarlig.aar5.value != null) {
        ainput_aarlig_laan[4] = parseFloat(document.bomaarlig.aar5.value) * MRD;
    }
    if (document.bomaarlig.aar6.value != null) {
        ainput_aarlig_laan[5] = parseFloat(document.bomaarlig.aar6.value) * MRD;
    }
    if (document.bomaarlig.aar7.value != null) {
        ainput_aarlig_laan[6] = parseFloat(document.bomaarlig.aar7.value) * MRD;
    }
    if (document.bomaarlig.aar8.value != null) {
        ainput_aarlig_laan[7] = parseFloat(document.bomaarlig.aar8.value) * MRD;
    }
    if (document.bomaarlig.aar9.value != null) {
        ainput_aarlig_laan[8] = parseFloat(document.bomaarlig.aar9.value) * MRD;
    }
    if (document.bomaarlig.aar10.value != null) {
        ainput_aarlig_laan[9] = parseFloat(document.bomaarlig.aar10.value) * MRD;
    }
    if (document.bomaarlig.aar11.value != null) {
        ainput_aarlig_laan[10] = parseFloat(document.bomaarlig.aar11.value) * MRD;
    }
    if (document.bomaarlig.aar12.value != null) {
        ainput_aarlig_laan[11] = parseFloat(document.bomaarlig.aar12.value) * MRD;
    }
    if (document.bomaarlig.aar13.value != null) {
        ainput_aarlig_laan[12] = parseFloat(document.bomaarlig.aar13.value) * MRD;
    }
    if (document.bomaarlig.aar14.value != null) {
        ainput_aarlig_laan[13] = parseFloat(document.bomaarlig.aar14.value) * MRD;
    }

    console.log(ainput_aarlig_laan);
}

function compute_sumloan0() {
    // låneprofil 0: lån tas opp i like rater per år. Dette er Minkens formel
    // For eks 10 MRD ved 5.5% rente over byggetid 5 år:
    // result = (10 / 5) * (1.055^4 + 1.055^3 + ... + 1.055^0) = 11.1622 MRD
    // Ingen prisstigning her. For referanse!

    let cum = 0.0;

    let rente = input_laanerente1;
    for (let year = 0; year < input_byggetid; year++) {
        if (year >= input_laanerente_endring) {
            rente = input_laanerente2;
        }
        cum = cum + Math.pow(1.0 + rente, year);
    }
    let result = (cum * input_bompengelaan) / input_byggetid;

    return result;
}

function compute_sumloan1() {
    // låneprofil 1: lån tas opp i like rater per år eller som vektor!.
    // Prisstigning er med her!

    let cum = 0.0;
    let cum_projected = 0.0;

    let rente = input_laanerente1;
    let aarlig_sum = input_bompengelaan / input_byggetid;
    let dyear = input_byggeoppstart - input_basisaar;
    for (let year = 0; year < input_byggetid; year++) {
        if (year >= input_laanerente_endring) {
            rente = input_laanerente2;
        }

        if (input_laaneprofil == 4) {
            aarlig_sum = ainput_aarlig_laan[year];
        }

        let reell_sum = aarlig_sum * Math.pow(1 + input_prisstigning, year + dyear);

        console.log(
            "Låneopptak (mill) i år",
            year + input_byggeoppstart,
            "er",
            (reell_sum / MLL).toFixed(4)
        );
        cum = (cum + reell_sum) * (1.0 + rente);

        let part = reell_sum * Math.pow(1.0 + rente, input_byggetid - year);
        cum_projected += part;

        abygge_aar[year] = input_byggeoppstart + year;
        abygge_laanopptak[year] = reell_sum;
        abygge_kumulativt_laan[year] = cum;
        abygge_kumulativt_laan_proj[year] = part; // vil bli feil dersom rente endres!
        abygge_rentefot[year] = rente;
    }

    return cum;
}

function compute_sumloan2() {
    // Her er bomselskap tidlig og forholdet mellom stat og bomselskap må beregnes
    // Etter bomselskap er ferdig å låne så går det noe tid mens stat låner, så
    // det blir rentes renter... Pessimistisk scenario

    let cum = 0.0;
    let cum_projected = 0.0;

    let rente = input_laanerente1;

    let aarlig_total_sum = input_styringsramme / input_byggetid;
    let dyear = input_byggeoppstart - input_basisaar;
    let laane_andel = input_bompengelaan;

    for (let year = 0; year < input_byggetid; year++) {
        if (year >= input_laanerente_endring) {
            rente = input_laanerente2;
        }

        let aarlig_sum = 0.0;
        if (aarlig_total_sum < laane_andel) {
            aarlig_sum = aarlig_total_sum;
            laane_andel = laane_andel - aarlig_sum;
        } else if (aarlig_total_sum > laane_andel && laane_andel > 0.0) {
            aarlig_sum = laane_andel;
            laane_andel = 0.0;
        } else if (laane_andel == 0.0) {
            aarlig_sum = 0.0;
        } else {
            console.error("Unexpected!");
        }

        let reell_sum = aarlig_sum * Math.pow(1 + input_prisstigning, year + dyear);

        console.log(
            "Låneopptak (mill) i år",
            year + input_byggeoppstart,
            "er",
            (reell_sum / MLL).toFixed(4)
        );
        cum = (cum + reell_sum) * (1.0 + rente);

        let part = reell_sum * Math.pow(1.0 + rente, input_byggetid - year);
        cum_projected += part;

        abygge_aar[year] = input_byggeoppstart + year;
        abygge_laanopptak[year] = reell_sum;
        abygge_kumulativt_laan[year] = cum;
        abygge_kumulativt_laan_proj[year] = part; // vil bli feil dersom rente endres!
        abygge_rentefot[year] = rente;
    }

    return cum;
}

function compute_sumloan3() {
    // Her er bomselskap seint og forholdet mellom stat og bomselskap må beregnes
    // Optimistisk scenario

    let cum = 0.0;
    let cum_projected = 0.0;

    let rente = input_laanerente1;

    let aarlig_total_sum = input_styringsramme / input_byggetid;
    let dyear = input_byggeoppstart - input_basisaar;
    let stat_andel = input_styringsramme - input_bompengelaan;
    let laane_andel = 0.0;
    let aarlig_sum = 0.0;
    console.log("Stat_andel vs aarlig_total_sum", stat_andel, aarlig_total_sum);

    for (let year = 0; year < input_byggetid; year++) {
        if (year >= input_laanerente_endring) {
            rente = input_laanerente2;
        }

        if (aarlig_total_sum < stat_andel) {
            aarlig_sum = 0.0;
            stat_andel = stat_andel - aarlig_total_sum;
        } else if (aarlig_total_sum > stat_andel && stat_andel > 0.0) {
            aarlig_sum = aarlig_total_sum - stat_andel;
            stat_andel = 0.0;
        } else if (stat_andel == 0.0) {
            aarlig_sum = aarlig_total_sum;
        } else {
            console.error("Unexpected!");
        }

        let reell_sum = aarlig_sum * Math.pow(1 + input_prisstigning, year + dyear);

        console.log(
            "Låneopptak (mill) i år",
            year + input_byggeoppstart,
            "er",
            (reell_sum / MLL).toFixed(4)
        );
        cum = (cum + reell_sum) * (1.0 + rente);

        let part = reell_sum * Math.pow(1.0 + rente, input_byggetid - year);
        cum_projected += part;

        abygge_aar[year] = input_byggeoppstart + year;
        abygge_laanopptak[year] = reell_sum;
        abygge_kumulativt_laan[year] = cum;
        abygge_kumulativt_laan_proj[year] = part; // vil bli feil dersom rente endres!
        abygge_rentefot[year] = rente;
    }

    return cum;
}

function yearly_streams(toll, mode = 0) {
    let cumincome = [];
    let cumrest = [];

    let rest = result_kumulativt_laan;
    let previousrest = rest;

    // both toll and bomselskap will increase with moneygrowth factor
    let xtoll = toll;
    let xbomselskap = result_bomselskap_aapning;
    let xbomselskap_sum = 0.0;
    let xrenter_sum = 0.0;
    let rente = input_laanerente1;
    let aar_renteendring = input_laanerente_endring - input_byggetid;

    for (let year = 0; year <= MAXYEARS; year++) {
        if (year >= aar_renteendring) {
            rente = input_laanerente2;
        }

        xtoll = toll * Math.pow(1.0 + input_prisstigning, year);
        xbomselskap =
            result_bomselskap_aapning * Math.pow(1.0 + input_prisstigning, year);
        xbomselskap_sum += xbomselskap;

        let income = 0;
        let trafikk = input_aadt_oppstart;
        trafikk = input_aadt_oppstart * Math.pow(1 + input_trafikkvekst, year); // year - 1 ?
        income = 365 * trafikk * xtoll - xbomselskap;

        let rest_urente = rest - income;
        rest = (rest - income) * (1.0 + rente);
        let renteutgift = rest - rest_urente;
        xrenter_sum += renteutgift;

        if (mode == 1) {
            aresult_bomtakst[year] = xtoll;
            aresult_bominntekt[year] = income;
            aresult_restlaan[year] = rest;
            aresult_tilbomselskap[year] = xbomselskap;
            aresult_rentefot[year] = rente;
            aresult_rente_aarlig[year] = renteutgift;
            aresult_aadt[year] = trafikk;
            aresult_tilbomselskap_sum = xbomselskap_sum;
            result_renter_aarlig_sum = xrenter_sum;
        }

        if (previousrest > 0.0 && rest <= 0.0) {
            return year;
        }
        previousrest = rest;
    }

    return -1;
}

function diverse_beregninger() {
    let proposed_toll = result_initiell_avg_bomsats;

    let deltaaar = input_byggetid + (input_byggeoppstart - input_basisaar);
    console.log("Deltaår:", deltaaar);
    result_diskontert = proposed_toll / Math.pow(1.0 + input_prisstigning, deltaaar);

    // diskontert kumulativt lån:
    result_kumulativt_laan_disk =
        result_kumulativt_laan / Math.pow(1.0 + input_prisstigning, deltaaar);

    // herav renter ved åpning, diskontert til basisår
    result_renter_u_bygging_disk = result_kumulativt_laan_disk - input_bompengelaan;

    // så renter under bompengeperioden, nominelt og diskontert til basisår
    kum_renter = renter_diskontert();
    document.result.result_rentekostnad_drift.value = (kum_renter[0] / MRD).toFixed(3);
    document.result.result_rentekostnad_drift_disk.value = (
        kum_renter[1] / MRD
    ).toFixed(3);

    // så bomselskap under bompengeperioden, diskontert til basisår
    let akkumulert_bomselskap_disk = input_bomselskap * input_nedbetalingstid;
    document.result.result_bomselskap_drift_disk.value = (
        akkumulert_bomselskap_disk / MRD
    ).toFixed(3);

    let sum_inkl_disk =
        input_forhaandsinnkrevet +
        result_renter_u_bygging_disk +
        kum_renter[1] +
        akkumulert_bomselskap_disk;

    document.result.result_kumulativt_laan_all_disk.value = (
        sum_inkl_disk / MRD
    ).toFixed(3);

    // reell diskontert av prosjektet er da
    let kostnad_reell = input_styringsramme + sum_inkl_disk;
    document.result.result_sann_kostnad.value = (kostnad_reell / MRD).toFixed(3);
}

function renter_diskontert() {
    // finner sum av renter etter åpning, diskontert til basisår

    let sumrente_disk = 0.0;
    let sumrente = 0.0;
    for (let i = 0; i <= input_nedbetalingstid; i++) {
        rente = aresult_rente_aarlig[i];
        if (rente > 0.0) {
            sumrente += rente;
            diffaar = input_byggeoppstart + input_byggetid + i - input_basisaar;
            rente = rente / Math.pow(1.0 + input_prisstigning, diffaar);
            sumrente_disk += rente;
        }
    }
    return [sumrente, sumrente_disk];
}

function bycar_type(toll) {
    let v = input_rabattbil_andel;
    let e = input_rabattbil_pris;
    let u = input_tungandel;
    let t = input_tungmult;

    // person car vs heavy
    let x = toll / (1 - u - v + u * v + v * e - v * e * u + u * t);

    console.log("Person vs Tungbil", x, x * t);

    if (x > toll && t > 1) {
        x = NaN;
        document.getElementById("umulig").innerHTML =
            "Umulig regnestykke, juster rabattbil andel og/eller rabatt%!";
    } else {
        document.getElementById("umulig").innerHTML = "";
    }

    result_lettbil = x;
    result_lettbilrabatt = x * e;
    result_tungbil = x * t;
}

function html_resultater() {
    // collect all html results

    document.result.styringsramme_oppstart.value = (
        result_styringsramme_ved_oppstart / MRD
    ).toFixed(1);

    document.result.bompengelaan_oppstart.value = (
        result_bompengelaan_oppstart / MRD
    ).toFixed(1);

    document.result.diverse_aar.value = result_diverse_aar;

    proposed_toll = result_initiell_avg_bomsats;

    var fixed = 1;
    if (proposed_toll < 50) {
        fixed = 2;
    }
    document.resultbom.proposed.value = proposed_toll.toFixed(fixed);
    document.resultbom.proposed_end.value =
        aresult_bomtakst[input_nedbetalingstid - 1].toFixed(fixed);

    document.resultbom.proposed_start_disk.value = result_diskontert.toFixed(fixed);
    document.result.result_kumulativt_laan.value = (
        result_kumulativt_laan / MRD
    ).toFixed(3);
    document.result.result_kumulativt_laan_disk.value = (
        result_kumulativt_laan_disk / MRD
    ).toFixed(3);

    document.result.result_rentekostnad_bygging_disk.value = (
        result_renter_u_bygging_disk / MRD
    ).toFixed(3);

    document.resultbom.proposed_lettbil.value = result_lettbil.toFixed(1);
    document.resultbom.proposed_rabattbil.value = result_lettbilrabatt.toFixed(1);
    document.resultbom.proposed_tung.value = result_tungbil.toFixed(1);
}

function main() {
    parse_input();

    oppstartsverdier();

    //==================================================================================
    // iterer frem til gjennomsnitt sats
    //==================================================================================

    iterate_toll_value();

    diverse_beregninger();

    bycar_type(result_diskontert);

    reset_tabell();

    html_resultater();

    for (let i = 0; i < input_byggetid; i++) {
        let aar = abygge_aar[i];
        let rente = (abygge_rentefot[i] * 100.0).toFixed(1);
        let opptaklaan = (abygge_laanopptak[i] / MRD).toFixed(4);
        let cumlaan = (abygge_kumulativt_laan[i] / MRD).toFixed(4);
        let cumlaan_proj = (abygge_kumulativt_laan_proj[i] / MRD).toFixed(4);
        bygge_tabell(aar, rente, opptaklaan, cumlaan);
    }

    for (let i = 0; i <= input_nedbetalingstid; i++) {
        let xrente = (aresult_rentefot[i] * 100.0).toFixed(1);
        let sats = aresult_bomtakst[i].toFixed(2);
        let innt = (aresult_bominntekt[i] / MLL).toFixed(4);
        let tilbom = (aresult_tilbomselskap[i] / MLL).toFixed(4);
        let rest = (aresult_restlaan[i] / MLL).toFixed(4);
        let aar = i + input_byggeoppstart + input_byggetid;
        let trafikk = Math.round(aresult_aadt[i]);
        let renter_aar = (aresult_rente_aarlig[i] / MLL).toFixed(4);
        result_tabell(xrente, aar, sats, trafikk, tilbom, innt, rest, renter_aar);
    }
}

function avg_value(arr) {
    let nlen = arr.length;
    let sum = 0.0;
    for (let i = 0; i < nlen; i++) {
        sum += arr[i];
    }
    return sum / nlen;
}

function reset_tabell() {
    let table = document.getElementById("restabell");
    var rowCount = table.rows.length;
    for (var x = rowCount - 1; x > 0; x--) {
        table.deleteRow(x);
    }

    let btable = document.getElementById("byggtabell");
    rowCount = btable.rows.length;
    for (x = rowCount - 1; x > 0; x--) {
        btable.deleteRow(x);
    }
}

function result_tabell(rente, aar, sats, trafikk, tilbom, innt, rest, rent) {
    let table = document.getElementById("restabell");

    var row = table.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    var cell5 = row.insertCell(4);
    var cell6 = row.insertCell(5);
    var cell7 = row.insertCell(6);
    var cell8 = row.insertCell(7);
    cell1.innerHTML = aar;
    cell2.innerHTML = rente;
    cell3.innerHTML = sats;
    cell4.innerHTML = trafikk;
    cell5.innerHTML = tilbom;
    cell6.innerHTML = innt;
    cell7.innerHTML = rest;
    cell8.innerHTML = rent;
}

function bygge_tabell(aar, a, b, c) {
    let table = document.getElementById("byggtabell");

    var row = table.insertRow(-1);
    var cell1 = row.insertCell(0);
    var cell2 = row.insertCell(1);
    var cell3 = row.insertCell(2);
    var cell4 = row.insertCell(3);
    cell1.innerHTML = aar;
    cell2.innerHTML = a;
    cell3.innerHTML = b;
    cell4.innerHTML = c;
}

function resetcase() {
    document.calc.byggeoppstart.value = null;
    document.calc.byggetid.value = null;
    document.calc.styringsramme.value = null;
    document.calc.kostnadsramme.value = null;
    document.calc.basisaar.value = null;
    document.calc.bompengelaan.value = null;
    document.calc.laaneprofil.value = 1;
    document.calc.forhaandsinnkrevet.value = null;
    document.calc.nedbetalingstid.value = null;
    document.calc.laanerente1.value = null;
    document.calc.laanerente2.value = null;
    document.calc.laanerente_endring.value = null;
    document.calc.prisstigning.value = null;
    document.calc.aadt_oppstart.value = null;
    document.calc.trafikkvekst.value = null;
    document.calc.bomselskap.value = null;
    document.calc.tungandel.value = null;
    document.calc.tungmult.value = null;
    document.calc.rabattbil_andel.value = null;
    document.calc.rabattbil_pris.value = null;
    document.calc.offisielt.value = "";

    document.bomaarlig.aar1.value = null;
    document.bomaarlig.aar2.value = null;
    document.bomaarlig.aar3.value = null;
    document.bomaarlig.aar4.value = null;
    document.bomaarlig.aar5.value = null;
    document.bomaarlig.aar6.value = null;
    document.bomaarlig.aar7.value = null;
    document.bomaarlig.aar8.value = null;
    document.bomaarlig.aar9.value = null;
    document.bomaarlig.aar10.value = null;
    document.bomaarlig.aar11.value = null;
    document.bomaarlig.aar12.value = null;
    document.bomaarlig.aar13.value = null;
    document.bomaarlig.aar14.value = null;

    document.resultbom.proposed.value = null;
    document.resultbom.proposed_start_disk.value = null;
    document.resultbom.proposed_end.value = null;
    document.resultbom.proposed_lettbil.value = null;
    document.resultbom.proposed_rabattbil.value = null;
    document.resultbom.proposed_tung.value = null;
    document.result.result_kumulativt_laan.value = null;
    document.result.result_kumulativt_laan_disk.value = null;
    document.result.result_kumulativt_laan_all_disk.value = null;
    document.result.result_sann_kostnad.value = null;

    reset_tabell();
}

function testcase() {
    resetcase();
    document.calc.byggeoppstart.value = 2016;
    document.calc.byggetid.value = 5;
    document.calc.styringsramme.value = 10;
    document.calc.kostnadsramme.value = 12;
    document.calc.basisaar.value = 2013;
    document.calc.bompengelaan.value = 5;
    document.calc.laaneprofil.value = 1;
    document.calc.forhaandsinnkrevet.value = 0.0;
    document.calc.nedbetalingstid.value = 15;
    document.calc.laanerente1.value = 5;
    document.calc.laanerente2.value = 6;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 0;
    document.calc.aadt_oppstart.value = 20000;
    document.calc.trafikkvekst.value = 1;
    document.calc.bomselskap.value = 5;
    document.calc.tungandel.value = 15;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 70;
    document.calc.rabattbil_pris.value = 80;
    document.calc.offisielt.value = "68";
}

function minkencase() {
    resetcase();
    document.calc.byggeoppstart.value = 2010;
    document.calc.byggetid.value = 5;
    document.calc.styringsramme.value = 13;
    document.calc.kostnadsramme.value = 13;
    document.calc.basisaar.value = 2010;
    document.calc.bompengelaan.value = 11;
    document.calc.laaneprofil.value = 1;
    document.calc.forhaandsinnkrevet.value = 0.0;
    document.calc.nedbetalingstid.value = 16;
    document.calc.laanerente1.value = 4;
    document.calc.laanerente2.value = 4;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 0;
    document.calc.aadt_oppstart.value = 40000;
    document.calc.trafikkvekst.value = 1.7;
    document.calc.bomselskap.value = 5;
    document.calc.tungandel.value = 15;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 100;
    document.calc.rabattbil_pris.value = 100;
    document.calc.offisielt.value = "60 i snitt (46 lettbil, 138 tungbil)";
}

function rogfast1() {
    resetcase();

    document.calc.byggeoppstart.value = 2018;
    document.calc.byggetid.value = 7;
    document.calc.styringsramme.value = 16.4;
    document.calc.kostnadsramme.value = 18.4;
    document.calc.basisaar.value = 2017;
    document.calc.bompengelaan.value = 12.01;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 1.2;
    document.calc.nedbetalingstid.value = 20;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 2.5;
    document.calc.aadt_oppstart.value = 5950;
    document.calc.trafikkvekst.value = 1.5;
    document.calc.bomselskap.value = 12;
    document.calc.tungandel.value = 12;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 16;
    document.calc.rabattbil_pris.value = 50;
    document.calc.offisielt.value = "374 (2017) kr, St.prop. 101 S 2017";

    document.bomaarlig.aar1.value = 3.49; // 2018 (0.39 + 10.3 - 1.2 forhånd)
    document.bomaarlig.aar2.value = 4.0;
    document.bomaarlig.aar3.value = 2.0;
    document.bomaarlig.aar4.value = 0.0;
    document.bomaarlig.aar5.value = 0.0;
    document.bomaarlig.aar6.value = 0.0;
    document.bomaarlig.aar7.value = 2.52;
    document.bomaarlig.aar8.value = 0.0;
    document.bomaarlig.aar9.value = 0.0;
    document.bomaarlig.aar10.value = 0.0;
    document.bomaarlig.aar11.value = 0.0;
    document.bomaarlig.aar12.value = 0.0;
    document.bomaarlig.aar13.value = 0.0;
    document.bomaarlig.aar14.value = 0.0;
}

function rogfast2() {
    resetcase();

    document.calc.byggeoppstart.value = 2021;
    document.calc.byggetid.value = 10;
    document.calc.styringsramme.value = 20.6;
    document.calc.kostnadsramme.value = 24.8;
    document.calc.basisaar.value = 2020;
    document.calc.bompengelaan.value = 10.66;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 1.7;
    document.calc.nedbetalingstid.value = 20;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 8;
    document.calc.prisstigning.value = 2;
    document.calc.aadt_oppstart.value = 5980;
    document.calc.trafikkvekst.value = 1.3;
    document.calc.bomselskap.value = 6;
    document.calc.tungandel.value = 12;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 16;
    document.calc.rabattbil_pris.value = 50;
    document.calc.offisielt.value = "409 (2020) kr, St.prop. 54 S 2020";

    document.bomaarlig.aar1.value = 0.0;
    document.bomaarlig.aar2.value = 8.323; // 2022
    document.bomaarlig.aar3.value = 0.0;
    document.bomaarlig.aar4.value = 0.0;
    document.bomaarlig.aar5.value = 0.0;
    document.bomaarlig.aar6.value = 0.0;
    document.bomaarlig.aar7.value = 0.0;
    document.bomaarlig.aar8.value = 2.334; // 2028  Sum 10.657 MRD
    document.bomaarlig.aar9.value = 0.0;
    document.bomaarlig.aar10.value = 0.0;
    document.bomaarlig.aar11.value = 0.0;
    document.bomaarlig.aar12.value = 0.0;
    document.bomaarlig.aar13.value = 0.0;
    document.bomaarlig.aar14.value = 0.0;
}

// https://www.regjeringen.no/contentassets/7cb4217acb094720905ba6c438cd3ab7/svv-vedlegg-1-leveranse-til-sd-endelig.pdf
function hordfast1() {
    resetcase();
    document.calc.byggetid.value = 7;
    document.calc.byggeoppstart.value = 2027;
    document.calc.styringsramme.value = 38.5;
    document.calc.kostnadsramme.value = 44.0;
    document.calc.basisaar.value = 2021;
    document.calc.bompengelaan.value = 14.4;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 20;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 2;
    document.calc.aadt_oppstart.value = 5700;
    document.calc.trafikkvekst.value = 1.5;
    document.calc.bomselskap.value = 15;
    document.calc.tungandel.value = 13;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 70;
    document.calc.rabattbil_pris.value = 80;
    document.calc.offisielt.value = "362 pr bil med avtale, BA 2020";

    document.bomaarlig.aar1.value = 7.4; // 2026
    document.bomaarlig.aar2.value = 6.0;
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar4.value = 1.0; //
    document.bomaarlig.aar5.value = 0.0; //
    document.bomaarlig.aar6.value = 0.0; //
    document.bomaarlig.aar7.value = 0.0; //
    document.bomaarlig.aar8.value = 0.0;
    document.bomaarlig.aar9.value = 0.0;
    document.bomaarlig.aar10.value = 0.0;
    document.bomaarlig.aar11.value = 0.0;
    document.bomaarlig.aar12.value = 0.0;
    document.bomaarlig.aar13.value = 0.0;
    document.bomaarlig.aar14.value = 0.0;
}

// Mer realistisk
function hordfast2() {
    resetcase();
    document.calc.byggetid.value = 10;
    document.calc.byggeoppstart.value = 2029;
    document.calc.styringsramme.value = 41.0;
    document.calc.kostnadsramme.value = 48.0;
    document.calc.basisaar.value = 2021;
    document.calc.bompengelaan.value = 14.4;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 25;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 2;
    document.calc.aadt_oppstart.value = 4000;
    document.calc.trafikkvekst.value = 0.5;
    document.calc.bomselskap.value = 20;
    document.calc.tungandel.value = 13;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 70;
    document.calc.rabattbil_pris.value = 90;
    document.calc.offisielt.value = "Mer realistisk?";

    document.bomaarlig.aar1.value = 7.4; // 2026
    document.bomaarlig.aar2.value = 6.0;
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar4.value = 1.0; //
    document.bomaarlig.aar5.value = 0.0; //
    document.bomaarlig.aar6.value = 0.0; //
    document.bomaarlig.aar7.value = 0.0; //
    document.bomaarlig.aar8.value = 0.0; //
    document.bomaarlig.aar9.value = 0.0; //
    document.bomaarlig.aar10.value = 0.0; //
    document.bomaarlig.aar11.value = 0.0; //
    document.bomaarlig.aar12.value = 0.0; //
    document.bomaarlig.aar13.value = 0.0; //
    document.bomaarlig.aar14.value = 0.0; //
}

// https://www.regjeringen.no/contentassets/72a5e7fc2d5048a0a4268aa2714301f5/no/pdfs/prp201020110103000dddpdfs.pdf
function grime_vesleelva() {
    resetcase();
    document.calc.byggetid.value = 2;
    document.calc.byggeoppstart.value = 2011;
    document.calc.styringsramme.value = 0.193;
    document.calc.kostnadsramme.value = 0.193;
    document.calc.basisaar.value = 2011;
    document.calc.bompengelaan.value = 0.101;
    document.calc.laaneprofil.value = 2;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 15;
    document.calc.laanerente1.value = 8;
    document.calc.laanerente2.value = 8;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 2.5;
    document.calc.aadt_oppstart.value = 1500;
    document.calc.trafikkvekst.value = 1.1;
    document.calc.bomselskap.value = 3;
    document.calc.tungandel.value = 15;
    document.calc.tungmult.value = 2;
    document.calc.rabattbil_andel.value = 70;
    document.calc.rabattbil_pris.value = 80;
    document.calc.offisielt.value = "24.5 kr ved åpning, St.prop. 103 S 2010";
    reset_tabell();
}

function kilden_presterodbakken() {
    resetcase();
    document.calc.byggetid.value = 2;
    document.calc.byggeoppstart.value = 2018;
    document.calc.styringsramme.value = 0.226;
    document.calc.kostnadsramme.value = 0.226;
    document.calc.basisaar.value = 2017;
    document.calc.bompengelaan.value = 0.194;
    document.calc.laaneprofil.value = 2;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 4;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 5.5;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 2.5;
    document.calc.aadt_oppstart.value = 10800;
    document.calc.trafikkvekst.value = 1.7;
    document.calc.bomselskap.value = 3;
    document.calc.tungandel.value = 7;
    document.calc.tungmult.value = 2;
    document.calc.rabattbil_andel.value = 0;
    document.calc.rabattbil_pris.value = 90;

    document.calc.offisielt.value = "13.5 kr, St.prop. 103 S";
}

function foenhus_bagn() {
    resetcase();
    document.calc.byggetid.value = 3;
    document.calc.byggeoppstart.value = 2012;
    document.calc.styringsramme.value = 0.42;
    document.calc.kostnadsramme.value = 0.44;
    document.calc.basisaar.value = 2012;
    document.calc.bompengelaan.value = 0.22;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 15;
    document.calc.laanerente1.value = 6.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 10;
    document.calc.prisstigning.value = 2.5;
    document.calc.aadt_oppstart.value = 2200;
    document.calc.trafikkvekst.value = 1.0;
    document.calc.bomselskap.value = 3;
    document.calc.tungandel.value = 13;
    document.calc.tungmult.value = 2;
    document.calc.rabattbil_andel.value = 80;
    document.calc.rabattbil_pris.value = 90;
    document.calc.offisielt.value = "30 kr, St.prop. 101 (2011)";

    document.bomaarlig.aar1.value = 0.19; // 2012
    document.bomaarlig.aar2.value = 0.03;
    document.bomaarlig.aar3.value = 0.0; //
}
