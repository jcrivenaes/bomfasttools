/*jshint esversion: 6 */

const MAXTRIES = 100;
const MAXYEARS = 100;
const MRD = 1000000000.0;
const MLL = 1000000.0;

let input_byggstart = 2020;
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
let input_innskuddsrente = 2.5;
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
let result_initiell_avg_bomsats_min = 0.0;
let result_initiell_avg_bomsats_max = 0.0;
let result_sluttaar = 2099;
let result_aapningsaar = 2099;
let result_aar_til_aapning = 2099;
let result_aar_til_bomfritt = 2099;
let result_diverse_aar = "";
let result_diskontert = 99.99;
let result_max_diskontert = 99.99;
let result_min_diskontert = 99.99;
let result_lettbil = 99.99;
let result_rabattbil = 99.99;
let result_tungbil = 99.99;
let result_kum_renter_disk = 0.0;
let aresult_0101 = [];
let aresult_3112 = [];
let aresult_year = [];
let aresult_bomtakst = [];
let aresult_bominntekt = [];
let aresult_restlaan = [];
let aresult_tilbomselskap = [];
let aresult_tilbomselskap_disk = [];
let result_tilbomselskap_sum_disk = 0.0;
let result_kum_kapitalkostn_disk = 0.0;
let result_kum_bominntekter_disk = 0.0;
let result_renter_aarlig_sum = 0.0;
let result_renter_u_bygging_disk = 0.0;

// for alle a* vektorer er index 0 lik basisår
let aresult_rentefot = [];
let aresult_rente_aarlig = []; // for hele perioden, index 0 er basisår
let aresult_rente_aarlig_disk = []; // for hele perioden, index 0 er basisår
let aresult_bominntekter_aarlig_disk = [];
let aresult_aadt = [];

// de neste er her for låneopptak i byggeperioden
let abygge_aar = [];
let abygge_laanopptak = [];
let abygge_kumulativt_laan = [];
let abygge_kumulativt_laan_proj = [];

//######################################################################################
// MAIN
//######################################################################################

function main() {
    les_inngangsdata();

    oppstartsverdier();

    beregn_laan();

    finn_gjennomsnitt_bomsats();

    diverse_beregninger();

    bycar_type(result_initiell_avg_bomsats);

    reset_tabell();

    html_resultater();
}

//######################################################################################
// Funksjoner
//######################################################################################

function les_inngangsdata() {
    // les input fra HTML, og la tall være i kroner, mens prosent er i fraksjon
    input_byggstart = parseInt(document.calc.byggeoppstart.value);
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
    input_innskuddsrente =
        parseFloat(document.calc.innskuddsrente.value.replace(",", ".")) / 100.0;
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

    result_sluttaar =
        input_basisaar +
        (input_byggstart - input_basisaar) +
        input_byggetid +
        input_nedbetalingstid -
        1;
    result_aar_til_aapning = input_byggstart + input_byggetid - input_basisaar;
    result_aar_til_bomfritt = result_sluttaar - input_basisaar + 1; // første år uten bom
    result_aapningsaar = input_basisaar + result_aar_til_aapning;

    console.log("Result åpningsår:", result_aapningsaar);
    console.log("Result sluttår:", result_sluttaar);
    console.log("Antall år til åpning:", result_aar_til_aapning);
    console.log("Antall år til bomfritt:", result_aar_til_bomfritt);

    for (let i = 0; i < MAXYEARS; i++) {
        aresult_0101[i] = i;
        aresult_3112[i] = i + 1;
        aresult_year[i] = i + input_basisaar;
    }

    for (let i = 0; i <= result_aar_til_bomfritt + 10; i++) {
        aresult_rentefot[i] = input_laanerente1;
        yr = aresult_year[i];
        if (yr >= input_laanerente_endring) {
            aresult_rentefot[i] = input_laanerente2;
        }
        //console.log("Rentefot for år ", yr, "er", aresult_rentefot[i]);

        // initialiser
        aresult_rente_aarlig[i] = 0.0;
        aresult_rente_aarlig_disk[i] = 0.0;
        aresult_bominntekter_aarlig_disk[i] = 0.0;
        abygge_laanopptak[i] = 0.0;
        abygge_kumulativt_laan[i] = 0.0;
        aresult_restlaan[i] = 0.0;
        aresult_tilbomselskap[i] = 0.0;
        aresult_tilbomselskap_disk[i] = 0.0;
    }

    result_styringsramme_ved_oppstart = _verdi_ved_aar(
        input_styringsramme,
        input_byggstart - input_basisaar,
        input_prisstigning
    );

    result_bompengelaan_oppstart = _verdi_ved_aar(
        input_bompengelaan,
        input_byggstart - input_basisaar,
        input_prisstigning
    );

    result_bomselskap_aapning = _verdi_ved_aar(
        input_bomselskap,
        input_byggstart + input_byggetid - input_basisaar,
        input_prisstigning
    );

    //==================================================================================
    // info om år, akkumulert lån, etc
    //==================================================================================

    aapning = input_byggstart + input_byggetid;
    result_diverse_aar =
        input_basisaar.toString() +
        "/" +
        input_byggstart.toString() +
        "/" +
        aapning.toString() +
        "/" +
        result_sluttaar.toString();
}

function beregn_laan() {
    // iterer verdier
    if (input_laaneprofil == 4) {
        get_aarlig_profile(input_byggetid);
        console.log("Låneprofil, diskonterte verdier", ainput_aarlig_laan);
    }

    let cumloan = 0.0;
    cumloan = compute_sumloan();

    // dersom forhåndslån som skal det trekkes fra, etter justering pga innskuddrente
    let forhaandsinnkrevet = 0.0;
    if (input_forhaandsinnkrevet > 0) {
        forhaandsinnkrevet = _verdi_ved_aar(
            input_forhaandsinnkrevet,
            result_aar_til_aapning,
            input_innskuddsrente
        );
        //console.log("Forhåndsinnkrevet, verdi ved oppstart: ", forhaandsinnkrevet);
        //console.log("År til åpning: ", result_aar_til_aapning);
    }

    console.log("Kumulativt bompengelån ved åpning:", cumloan);
    result_kumulativt_laan = cumloan - forhaandsinnkrevet;
    result_kumulativt_laan_disk =
        result_kumulativt_laan /
        Math.pow(1 + input_prisstigning, result_aar_til_aapning);
    console.log(
        "Netto kumulativt bompengelån ved åpning, fratrekk forhåndinnkrevet:",
        result_kumulativt_laan
    );
}

function finn_gjennomsnitt_bomsats() {
    // iterer verdier for bompenger til laan er nedbetalt på gitt tid

    // rough estimate of toll as start value...
    let toll =
        ((1.0 + input_laanerente1) * result_kumulativt_laan +
            input_bomselskap * input_nedbetalingstid) /
        (input_nedbetalingstid * 365 * input_aadt_oppstart);

    console.log("Initiell bompengesats (1):", toll);
    let finalyear = yearly_streams(toll);

    console.log("Initial finalyear:", finalyear);
    // if (finalyear != -1 && finalyear <= input_nedbetalingstid) {
    //     toll = toll / 2.0;
    // }
    // console.log("Initiell bompengesats (2):", toll);

    let tollincrement = 1;
    if (toll > 100) tollincrement = 5;
    if (toll > 300) tollincrement = 10;

    let previoustoll = toll;

    for (var i = 0; i < MAXTRIES; i++) {
        finalyear = yearly_streams(toll);

        //console.log("Retry: Final year vs target:", finalyear, input_nedbetalingstid);

        if (finalyear == 1 || finalyear > input_nedbetalingstid) {
            previoustoll = toll;
            toll = toll + tollincrement;
        } else if (finalyear == -999) {
            previoustoll = toll;
            toll = toll + tollincrement;
        } else if (finalyear < input_nedbetalingstid) {
            toll = toll - tollincrement / 2.0;
        } else {
            break;
        }
    }
    let approxtoll = toll;
    console.log("Omtrentlig bomsats er: ", approxtoll);
    console.log("Iterer og fintuner, bruker: ", toll);

    // fine tune to 50 or 10 øre, minimum
    tollincrement = 0.1;
    if (toll < 50) {
        tollincrement = 0.1;
    }
    toll = approxtoll;
    previoustoll = approxtoll;
    console.log("Iterer og fintuner for minimum: ");
    for (let i = 0; i < MAXTRIES; i++) {
        //console.log("Fine tune minimum, toll = ", toll);
        finalyear = yearly_streams(toll);
        console.log(finalyear);

        if (finalyear == input_nedbetalingstid) {
            previoustoll = toll;
            toll = toll - tollincrement;
        } else {
            break;
        }
    }
    let minimumtoll = previoustoll;
    console.log("Minimum toll:", minimumtoll);

    // maximum toll
    toll = approxtoll;
    previoustoll = approxtoll;
    console.log("Iterer og fintuner for maximum: ");
    for (let i = 0; i < MAXTRIES; i++) {
        //console.log("Fine tune maximum, toll = ", toll);
        finalyear = yearly_streams(toll);
        console.log(finalyear);

        if (finalyear == input_nedbetalingstid) {
            previoustoll = toll;
            toll = toll + tollincrement;
        } else {
            break;
        }
    }
    let maximumtoll = previoustoll;
    console.log("Maximum toll:", maximumtoll);

    toll = 0.5 * (minimumtoll + maximumtoll);
    console.log("Endelig gjennomsnitt bomsats: ", toll);

    // DEBUG!
    // toll = 409;

    // run once more with mode=1 to make tables
    finalyear = yearly_streams(toll, (mode = 1));

    result_initiell_avg_bomsats = toll;
    result_initiell_avg_bomsats_min = minimumtoll;
    result_initiell_avg_bomsats_max = maximumtoll;
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

    // sjekk om sum i input tilsvarer totaalt beløp:
    let sumlaan = 0.0;
    for (let i = 0; i < 14; i++) {
        sumlaan += ainput_aarlig_laan[i];
    }
    if (sumlaan != input_bompengelaan) {
        console.log("SUM av LÅN PROFIL per år stemmer ikke med oppgitt verdi!");
        console.log(sumlaan / MRD);
        console.log(input_bompengelaan / MRD);
        document.getElementById("errormsg").innerHTML =
            "Sum av bompengelån er inkonsistent!";
    }
}

function compute_sumloan() {
    // generisk: lån tas opp i like rater per år eller som vektor!.
    // Prisstigning er med her!
    // Lån tas opp 1/1, mens gjeld beregnes 31/12

    let cum = 0.0;
    let cum_projected = 0.0;

    let rente = input_laanerente1;
    let aarlig_sum = input_bompengelaan / input_byggetid;

    let dyear = input_byggstart - input_basisaar;
    let i = 0;

    // denne loopen går fra byggestart, ikke basisår
    for (let year = input_byggstart; year < input_byggstart + input_byggetid; year++) {
        rente = aresult_rentefot[dyear + i];

        if (input_laaneprofil == 4) {
            aarlig_sum = ainput_aarlig_laan[i];
        }

        let reell_sum = aarlig_sum * Math.pow(1 + input_prisstigning, dyear + i);

        // cumulativ på slutten av året
        cum = (cum + reell_sum) * (1.0 + rente);

        // herav renter
        let rentesum = cum - cum / (1 + rente);

        aresult_rente_aarlig[dyear + i] = rentesum;
        aresult_rente_aarlig_disk[dyear + i] =
            rentesum / Math.pow(1 + input_prisstigning, dyear + i + 1);

        abygge_laanopptak[dyear + i] = reell_sum;
        abygge_kumulativt_laan[dyear + i] = cum;
        // console.log(
        //     "Reelt låneopptak i år",
        //     year,
        //     "pga prisstigning",
        //     "er",
        //     (reell_sum / MLL).toFixed(4),
        //     "og gjeld i slutt av år er",
        //     (cum / MLL).toFixed(2),
        //     "renter (nominelt / diskontert) er",
        //     (aresult_rente_aarlig[dyear + i] / MLL).toFixed(4),
        //     "/",
        //     (aresult_rente_aarlig_disk[dyear + i] / MLL).toFixed(4)
        // );

        i++;
    }

    return cum;
}

function yearly_streams(toll, mode = 0) {
    // dette er årlige strømmer etter basisår

    let rest = result_kumulativt_laan; // kumulativt lån ved åpning!
    let previousrest = rest;

    // both toll and bomselskap will increase with moneygrowth factor
    let xtoll = toll;
    let xbomselskap = result_bomselskap_aapning;

    let dyear = result_aar_til_aapning; // for diskonterte verdier vs basisår

    for (let i = 0; i <= MAXYEARS; i++) {
        let delta = i - dyear;
        let true_year = aresult_year[i];

        xtoll = toll * Math.pow(1.0 + input_prisstigning, i);
        xbomselskap = input_bomselskap * Math.pow(1.0 + input_prisstigning, i);

        let rente = input_laanerente1;
        if (true_year >= input_laanerente_endring) {
            rente = input_laanerente2;
        }

        let income = 0;
        let trafikk = 0;
        let renteutgift_etter_oppstart = 0;
        if (delta < 0) {
            income = 0;
            trafikk = 0;
            renteutgift_etter_oppstart = 0;
        } else {
            trafikk = input_aadt_oppstart * Math.pow(1 + input_trafikkvekst, delta);
            income = 365 * trafikk * xtoll - xbomselskap;
            renteutgift_etter_oppstart = rest * rente;
        }

        rest = rest + renteutgift_etter_oppstart - income;

        if (mode == 1 && delta >= 0) {
            aresult_bomtakst[i] = xtoll;
            aresult_bominntekt[i] = income;
            aresult_restlaan[i] = rest;
            aresult_tilbomselskap[i] = xbomselskap;
            aresult_tilbomselskap_disk[i] =
                xbomselskap / Math.pow(1 + input_prisstigning, i + 1);
            aresult_rente_aarlig[i] = renteutgift_etter_oppstart;
            aresult_rente_aarlig_disk[i] =
                renteutgift_etter_oppstart / Math.pow(1 + input_prisstigning, i + 1);
            aresult_bominntekter_aarlig_disk[i] =
                income / Math.pow(1 + input_prisstigning, i + 1);

            aresult_aadt[i] = trafikk;
        }

        if (previousrest > 0.0 && rest <= 0.0) {
            return delta;
        }
        // if (delta >= 0) {
        //     console.log("----------------------------------------------------------");
        //     console.log(
        //         "PrevioisRest:",
        //         previousrest,
        //         "Rest:",
        //         rest,
        //         "Renteutgift etter oppstart:",
        //         renteutgift_etter_oppstart,
        //         "Rentefot:",
        //         rente
        //     );
        //     console.log(
        //         "TRUE_YEAR er",
        //         true_year,
        //         "DELTA er",
        //         delta,
        //         "ÅDT",
        //         trafikk,
        //         "Bomselskap",
        //         xbomselskap,
        //         "Inntekt er",
        //         income
        //     );
        //     console.log(
        //         "TRUE_YEAR er",
        //         true_year,
        //         "DELTA er",
        //         delta,
        //         "inntekt",
        //         income,
        //         "Initiell sats",
        //         toll,
        //         "År sats",
        //         xtoll,
        //         "Rest er",
        //         rest
        //     );
        // }
        previousrest = rest;
    }

    return -999;
}

function diverse_beregninger() {
    // endel andre sum beregninger
    sum_renter_disk = 0.0;
    sum_renter_bygging_disk = 0.0;
    sum_bomselskap_disk = 0.0;
    sum_bominntekter_disk = 0.0;
    for (let i = 0; i < result_aar_til_bomfritt; i++) {
        yr = aresult_year[i];
        // console.log(
        //     yr,
        //     "Renter:",
        //     aresult_rente_aarlig[i],
        //     "Renter, disk:",
        //     aresult_rente_aarlig_disk[i],
        //     "Til bomselskap",
        //     aresult_tilbomselskap[i],
        //     "Til bomselskap disk",
        //     aresult_tilbomselskap_disk[i]
        // );
        sum_renter_disk += aresult_rente_aarlig_disk[i];
        sum_bomselskap_disk += aresult_tilbomselskap_disk[i];
        sum_bominntekter_disk += aresult_bominntekter_aarlig_disk[i];
        if (i < result_aar_til_aapning) {
            sum_renter_bygging_disk += aresult_rente_aarlig_disk[i];
        }
    }
    result_tilbomselskap_sum_disk = sum_bomselskap_disk;
    result_kum_kapitalkostn_disk =
        sum_bominntekter_disk + sum_bomselskap_disk - input_bompengelaan;
    result_kum_renter_disk = result_kum_kapitalkostn_disk - sum_bomselskap_disk; // rentekostnad "kun"
    result_kum_bominntekter_disk = sum_bominntekter_disk + sum_bomselskap_disk;
    result_kum_bominntekter_disk_all =
        result_kum_bominntekter_disk + input_forhaandsinnkrevet;
    result_sann_kostnad =
        input_styringsramme + result_kum_kapitalkostn_disk + input_forhaandsinnkrevet;
}

function renter_diskontert() {
    // finner sum av renter etter åpning, diskontert til basisår

    let sumrente_disk = 0.0;
    let sumrente = 0.0;
    for (let i = 0; i <= input_nedbetalingstid; i++) {
        rente = aresult_rente_aarlig[i];
        if (rente > 0.0) {
            sumrente += rente;
            diffaar = input_byggstart + input_byggetid + i - input_basisaar;
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

function _getyearindex(year) {
    for (let i = 0; i < MAXYEARS; i++) {
        if (aresult_year[i] == year) {
            return i;
        }
    }
    return -999;
}

function html_resultater() {
    // collect all html results

    var fixed = 1;
    if (result_initiell_avg_bomsats < 50) {
        fixed = 2;
    }

    console.log("Fixed er:", fixed);
    console.log("Proposed toll:", result_initiell_avg_bomsats);

    //==================================================================================
    // "resultbom"
    //==================================================================================

    document.resultbom.proposed_start_disk.value =
        result_initiell_avg_bomsats.toFixed(fixed);
    let range =
        result_initiell_avg_bomsats_min.toFixed(fixed) +
        " - " +
        result_initiell_avg_bomsats_max.toFixed(fixed);
    document.resultbom.proposed_disk_minmax.value = range;

    iaapnaar = _getyearindex(result_aapningsaar);
    isluttnaar = _getyearindex(result_sluttaar);
    document.resultbom.proposed_aapning.value = aresult_bomtakst[iaapnaar].toFixed(1);
    document.resultbom.proposed_slutt.value = aresult_bomtakst[isluttnaar].toFixed(1);

    document.resultbom.proposed_lettbil.value = result_lettbil.toFixed(1);
    document.resultbom.proposed_rabattbil.value = result_lettbilrabatt.toFixed(1);
    document.resultbom.proposed_tung.value = result_tungbil.toFixed(1);

    //==================================================================================
    // "result"
    //==================================================================================

    document.result.diverse_aar.value = result_diverse_aar;

    document.result.result_kumulativt_laan.value = (
        result_kumulativt_laan / MRD
    ).toFixed(3);
    document.result.result_kumulativt_laan_disk.value = (
        result_kumulativt_laan_disk / MRD
    ).toFixed(3);

    document.result.result_tilbomselskap_sum_disk.value = (
        result_tilbomselskap_sum_disk / MRD
    ).toFixed(3);

    document.result.result_kum_renter_disk.value = (
        result_kum_renter_disk / MRD
    ).toFixed(3);

    document.result.result_kum_kapitalkostn_disk.value = (
        result_kum_kapitalkostn_disk / MRD
    ).toFixed(3);

    document.result.result_kum_bominntekter_disk.value = (
        result_kum_bominntekter_disk / MRD
    ).toFixed(3);

    document.result.result_kum_bominntekter_disk_all.value = (
        result_kum_bominntekter_disk_all / MRD
    ).toFixed(3);

    document.result.result_sann_kostnad.value = (result_sann_kostnad / MRD).toFixed(3);

    //==================================================================================
    // dynamiske tabeller
    //==================================================================================

    for (let i = 0; i < result_aar_til_aapning; i++) {
        year = aresult_year[i];
        if (year < input_byggstart) {
            continue;
        }
        if (year >= input_byggstart + input_byggetid) {
            break;
        }
        let rente = (aresult_rentefot[i] * 100.0).toFixed(1);
        let opptaklaan = (abygge_laanopptak[i] / MRD).toFixed(4);
        let cumlaan = (abygge_kumulativt_laan[i] / MRD).toFixed(4);
        let cumlaan_proj = 999; // (abygge_kumulativt_laan_proj[i] / MRD).toFixed(4);
        bygge_tabell(year, rente, opptaklaan, cumlaan);
    }

    for (let i = 0; i <= result_sluttaar; i++) {
        year = aresult_year[i];
        if (year < input_basisaar + result_aar_til_aapning) {
            continue;
        }
        if (year > result_sluttaar) {
            break;
        }
        let xrente = (aresult_rentefot[i] * 100.0).toFixed(1);
        let sats = aresult_bomtakst[i].toFixed(2);
        let innt = (aresult_bominntekt[i] / MLL).toFixed(4);
        let tilbom = (aresult_tilbomselskap[i] / MLL).toFixed(4);
        let rest = (aresult_restlaan[i] / MLL).toFixed(4);
        let trafikk = Math.round(aresult_aadt[i]);
        let renter_aar = (aresult_rente_aarlig[i] / MLL).toFixed(4);
        result_tabell(xrente, year, sats, trafikk, tilbom, innt, rest, renter_aar);
    }
}

//######################################################################################
// Enkle hjelpefunksjoner
//######################################################################################

function _verdi_ved_aar(innpris, aar, rente) {
    // hjelpefunksjon: beregn pris som følgende av prisstigning etter et antall aar
    let nypris = innpris * Math.pow(1.0 + rente, aar);
    return nypris;
}

function _avg_value(arr) {
    // gjennomsnittsverdi av array (ikke i bruk?)
    let nlen = arr.length;
    let sum = 0.0;
    for (let i = 0; i < nlen; i++) {
        sum += arr[i];
    }
    return sum / nlen;
}

//######################################################################################
// Reset og populering Tabeller
//######################################################################################

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
    document.calc.innskuddsrente.value = null;
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

    document.resultbom.proposed_start_disk.value = null;
    document.resultbom.proposed_disk_minmax.value = null;
    document.resultbom.proposed_aapning.value = null;
    document.resultbom.proposed_slutt.value = null;
    document.resultbom.proposed_lettbil.value = null;
    document.resultbom.proposed_rabattbil.value = null;
    document.resultbom.proposed_tung.value = null;

    document.result.diverse_aar.value = null;
    document.result.result_kumulativt_laan.value = null;
    document.result.result_kumulativt_laan_disk.value = null;
    document.result.result_kum_renter_disk.value = null;
    document.result.result_tilbomselskap_sum_disk.value = null;
    document.result.result_kum_kapitalkostn_disk.value = null;
    document.result.result_sann_kostnad.value = null;

    document.getElementById("errormsg").innerHTML = null;

    reset_tabell();
}

//######################################################################################
// Forhåndsinnfylte case
//######################################################################################

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
    document.calc.laanerente_endring.value = 2030;
    document.calc.prisstigning.value = 0;
    document.calc.innskuddsrente.value = 0;
    document.calc.aadt_oppstart.value = 20000;
    document.calc.trafikkvekst.value = 1;
    document.calc.bomselskap.value = 5;
    document.calc.tungandel.value = 15;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 70;
    document.calc.rabattbil_pris.value = 80;
    document.calc.offisielt.value = "~78";
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
    document.calc.nedbetalingstid.value = 15;
    document.calc.laanerente1.value = 4;
    document.calc.laanerente2.value = 4;
    document.calc.laanerente_endring.value = 2020;
    document.calc.innskuddsrente.value = 1;
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
    document.calc.laanerente_endring.value = 2028;
    document.calc.prisstigning.value = 2.5;
    document.calc.innskuddsrente.value = 2.5;
    document.calc.aadt_oppstart.value = 5950;
    document.calc.trafikkvekst.value = 1.5;
    document.calc.bomselskap.value = 12;
    document.calc.tungandel.value = 15;
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
    document.calc.bompengelaan.value = 10.657;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 1.703;
    document.calc.nedbetalingstid.value = 19;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 2031;
    document.calc.prisstigning.value = 2;
    document.calc.innskuddsrente.value = 2.5;
    document.calc.aadt_oppstart.value = 5980;
    document.calc.trafikkvekst.value = 0.91;
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
function hordfast0() {
    resetcase();
    document.calc.byggetid.value = 5;
    document.calc.byggeoppstart.value = 2023;
    document.calc.styringsramme.value = 38.5;
    document.calc.kostnadsramme.value = 44.0;
    document.calc.basisaar.value = 2021;
    document.calc.bompengelaan.value = 14.4;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 20;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 2037;
    document.calc.prisstigning.value = 2;
    document.calc.innskuddsrente.value = 2.5;
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
    document.calc.laanerente_endring.value = 2037;
    document.calc.prisstigning.value = 2;
    document.calc.innskuddsrente.value = 2.5;
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
    document.calc.laanerente_endring.value = 2031;
    document.calc.prisstigning.value = 2;
    document.calc.innskuddsrente.value = 2.5;
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

// 2015 doc
function hordfast3() {
    resetcase();
    document.calc.byggetid.value = 5;
    document.calc.byggeoppstart.value = 2017;
    document.calc.styringsramme.value = 25.0;
    document.calc.kostnadsramme.value = 29.0;
    document.calc.basisaar.value = 2015;
    document.calc.bompengelaan.value = 10.9;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 20;
    document.calc.laanerente1.value = 6.5;
    document.calc.laanerente2.value = 6.5;
    document.calc.laanerente_endring.value = 2025;
    document.calc.prisstigning.value = 2.5;
    document.calc.innskuddsrente.value = 2.5;
    document.calc.aadt_oppstart.value = 5300;
    document.calc.trafikkvekst.value = 1.5;
    document.calc.bomselskap.value = 20;
    document.calc.tungandel.value = 10;
    document.calc.tungmult.value = 3;
    document.calc.rabattbil_andel.value = 70;
    document.calc.rabattbil_pris.value = 90;
    document.calc.offisielt.value = "489 kr (tilbakeregnet; 407/1222)";

    document.bomaarlig.aar1.value = 10.9; // 2026
    document.bomaarlig.aar2.value = 0.0;
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar4.value = 0.0; //
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
    document.calc.laanerente_endring.value = 2040;
    document.calc.prisstigning.value = 2.5;
    document.calc.innskuddsrente.value = 2.5;
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
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 4;
    document.calc.laanerente1.value = 5.5;
    document.calc.laanerente2.value = 5.5;
    document.calc.laanerente_endring.value = 2040;
    document.calc.prisstigning.value = 2.5;
    document.calc.innskuddsrente.value = 2.5;
    document.calc.aadt_oppstart.value = 10800;
    document.calc.trafikkvekst.value = 1.7;
    document.calc.bomselskap.value = 3;
    document.calc.tungandel.value = 7;
    document.calc.tungmult.value = 2;
    document.calc.rabattbil_andel.value = 0;
    document.calc.rabattbil_pris.value = 90;

    document.calc.offisielt.value = "13.5 kr, St.prop. 103 S";

    document.bomaarlig.aar1.value = 0.194;
    document.bomaarlig.aar2.value = 0.0;
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar4.value = 0.0; //
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
    document.calc.laanerente_endring.value = 2040;
    document.calc.prisstigning.value = 2.5;
    document.calc.innskuddsrente.value = 2.5;
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
    document.bomaarlig.aar4.value = 0.0; //
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

function kjerringsundet() {
    resetcase();
    document.calc.byggetid.value = 9;
    document.calc.byggeoppstart.value = 2024;
    document.calc.styringsramme.value = 3.3;
    document.calc.kostnadsramme.value = 3.8;
    document.calc.basisaar.value = 2022;
    document.calc.bompengelaan.value = 0.45;
    document.calc.laaneprofil.value = 4;
    document.calc.forhaandsinnkrevet.value = 0;
    document.calc.nedbetalingstid.value = 20;
    document.calc.laanerente1.value = 6.5;
    document.calc.laanerente2.value = 5.5;
    document.calc.laanerente_endring.value = 2034;
    document.calc.prisstigning.value = 2.0;
    document.calc.innskuddsrente.value = 2.0;
    document.calc.aadt_oppstart.value = 1300;
    document.calc.trafikkvekst.value = 1.0;
    document.calc.bomselskap.value = 2;
    document.calc.tungandel.value = 10;
    document.calc.tungmult.value = 2;
    document.calc.rabattbil_andel.value = 0;
    document.calc.rabattbil_pris.value = 100;
    document.calc.offisielt.value = "70-80 kr, gjennomsnitt";

    document.bomaarlig.aar1.value = 0.0; //
    document.bomaarlig.aar2.value = 0.0;
    document.bomaarlig.aar3.value = 0.0; //
    document.bomaarlig.aar4.value = 0.0; //
    document.bomaarlig.aar5.value = 0.1; //
    document.bomaarlig.aar6.value = 0.1; //
    document.bomaarlig.aar7.value = 0.1; //
    document.bomaarlig.aar8.value = 0.1; //
    document.bomaarlig.aar9.value = 0.05; //
    document.bomaarlig.aar10.value = 0.0; //
    document.bomaarlig.aar11.value = 0.0; //
    document.bomaarlig.aar12.value = 0.0; //
    document.bomaarlig.aar13.value = 0.0; //
    document.bomaarlig.aar14.value = 0.0; //
}
