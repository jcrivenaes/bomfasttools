const MRD = 1000000000.0;
const MLL = 1000000.0

function main() {

    let totallengde = 0.0
    let totalsum = 0.0

    let veglengde = parseFloat(document.vcalc.veglengde.value.replace(",", ".")) || 0;
    let vegpris = parseFloat(document.vcalc.vegpris.value.replace(",", ".")) || 0;
    let vegsprekk = parseFloat(document.vcalc.vegsprekk.value.replace(",", ".")) || 0;
    vegsprekk = 1.0 + (vegsprekk / 100.0);

    let vegsum = (veglengde * vegpris * vegsprekk) / MRD;
    document.vcalc.vegsum.value = vegsum.toFixed(3);
    totallengde += veglengde;
    totalsum += vegsum

    // ==============================

    let kryssantall = parseInt(document.vcalc.kryssantall.value) || 0;
    let krysslengde = parseFloat(document.vcalc.krysslengde.value.replace(",", ".")) || 0;
    let krysspris = parseFloat(document.vcalc.krysspris.value.replace(",", ".")) || 0;
    krysspris *= MLL;
    let krysssprekk = parseFloat(document.vcalc.krysssprekk.value.replace(",", ".")) || 0;
    krysssprekk = 1.0 + (krysssprekk / 100.0);
    totallengde += krysslengde * kryssantall;

    let krysssum = (kryssantall * krysspris * krysssprekk) / MRD;
    document.vcalc.krysssum.value = krysssum.toFixed(3);
    totalsum += krysssum || 0;

    // ==============================

    let sidelengde = parseFloat(document.vcalc.sidelengde.value.replace(",", ".")) || 0;
    let sidepris = parseFloat(document.vcalc.sidepris.value.replace(",", ".")) || 0;
    let sidesprekk = parseFloat(document.vcalc.sidesprekk.value.replace(",", ".")) || 0;
    sidesprekk = 1.0 + (sidesprekk / 100.0);

    let sidesum = (sidelengde * sidepris * sidesprekk) / MRD;
    document.vcalc.sidesum.value = sidesum.toFixed(3);
    document.vcalc.sidemult.value = (sidepris / vegpris).toFixed(3);
    // ikke inkluder sideveier i lengde
    totalsum += sidesum;

    // ==============================

    let tunnlengde = parseFloat(document.vcalc.tunnlengde.value.replace(",", ".")) || 0;
    let tunnpris = parseFloat(document.vcalc.tunnpris.value.replace(",", ".")) || 0;
    let tunnsprekk = parseFloat(document.vcalc.tunnsprekk.value.replace(",", ".")) || 0;
    tunnsprekk = 1.0 + (tunnsprekk / 100.0);

    let tunnsum = (tunnlengde * tunnpris * tunnsprekk) / MRD;
    document.vcalc.tunnsum.value = tunnsum.toFixed(3);
    document.vcalc.tunnmult.value = (tunnpris / vegpris).toFixed(3);
    totallengde += tunnlengde;
    totalsum += tunnsum

    // ==============================

    let utunnlengde = parseFloat(document.vcalc.utunnlengde.value.replace(",", ".")) || 0;
    let utunnpris = parseFloat(document.vcalc.utunnpris.value.replace(",", ".")) || 0;
    let utunnsprekk = parseFloat(document.vcalc.utunnsprekk.value.replace(",", ".")) || 0;
    utunnsprekk = 1.0 + (utunnsprekk / 100.0);

    let utunnsum = (utunnlengde * utunnpris * utunnsprekk) / MRD;
    document.vcalc.utunnsum.value = utunnsum.toFixed(3);
    document.vcalc.utunnmult.value = (utunnpris / vegpris).toFixed(3);
    totallengde += utunnlengde;
    totalsum += utunnsum

    // ==============================

    let mbrolengde = parseFloat(document.vcalc.mbrolengde.value.replace(",", ".")) || 0;
    let mbropris = parseFloat(document.vcalc.mbropris.value.replace(",", ".")) || 0;
    let mbrosprekk = parseFloat(document.vcalc.mbrosprekk.value.replace(",", ".")) || 0;
    mbrosprekk = 1.0 + (mbrosprekk / 100.0);

    let mbrosum = (mbrolengde * mbropris * mbrosprekk) / MRD;
    document.vcalc.mbrosum.value = mbrosum.toFixed(3);
    document.vcalc.mbromult.value = (mbropris / vegpris).toFixed(3);
    totallengde += mbrolengde;
    totalsum += mbrosum

    // ==============================

    let abrobredde = parseFloat(document.vcalc.abrobredde.value.replace(",", ".")) || 0;
    let abrolengde = parseFloat(document.vcalc.abrolengde.value.replace(",", ".")) || 0;
    let abropris = parseFloat(document.vcalc.abropris.value.replace(",", ".")) || 0;
    let abrosprekk = parseFloat(document.vcalc.abrosprekk.value.replace(",", ".")) || 0;
    abrosprekk = 1.0 + (abrosprekk / 100.0);

    let abrosum = (abrobredde * abrolengde * abropris * abrosprekk) / MRD;
    document.vcalc.abrosum.value = abrosum.toFixed(3);
    document.vcalc.abromult.value = ((abropris * abrobredde) / vegpris).toFixed(3);
    totallengde += abrolengde;
    totalsum += abrosum

    // ==============================

    let bro1bredde = parseFloat(document.vcalc.bro1bredde.value.replace(",", ".")) || 0;
    let bro1lengde = parseFloat(document.vcalc.bro1lengde.value.replace(",", ".")) || 0;
    let bro1pris = parseFloat(document.vcalc.bro1pris.value.replace(",", ".")) || 0;
    let bro1sprekk = parseFloat(document.vcalc.bro1sprekk.value.replace(",", ".")) || 0;
    bro1sprekk = 1.0 + (bro1sprekk / 100.0);

    let bro1sum = (bro1bredde * bro1lengde * bro1pris * bro1sprekk) / MRD;
    document.vcalc.bro1sum.value = bro1sum.toFixed(3);
    document.vcalc.bro1mult.value = ((bro1pris * bro1bredde) / vegpris).toFixed(3);
    totallengde += bro1lengde;
    totalsum += bro1sum

    // ==============================

    let bro2bredde = parseFloat(document.vcalc.bro2bredde.value.replace(",", ".")) || 0;
    let bro2lengde = parseFloat(document.vcalc.bro2lengde.value.replace(",", ".")) || 0;
    let bro2pris = parseFloat(document.vcalc.bro2pris.value.replace(",", ".")) || 0;
    let bro2sprekk = parseFloat(document.vcalc.bro2sprekk.value.replace(",", ".")) || 0;
    bro2sprekk = 1.0 + (bro2sprekk / 100.0);

    let bro2sum = (bro2bredde * bro2lengde * bro2pris * bro2sprekk) / MRD;
    document.vcalc.bro2sum.value = bro2sum.toFixed(3);
    document.vcalc.bro2mult.value = ((bro2pris * bro2bredde) / vegpris).toFixed(3);
    totallengde += bro2lengde;
    totalsum += bro2sum

    // ==============================

    let annet = parseFloat(document.vcalc.annetpris.value.replace(",", ".")) || 0;

    let annetsum = annet;
    document.vcalc.annetsum.value = annetsum.toFixed(3);
    totalsum += annetsum

    // ==============================

    gjsnitt = (totalsum * MRD) / totallengde;

    document.result.sumkm.value = (totallengde / 1000.0).toFixed(2);
    document.result.sumpris.value = totalsum.toFixed(3);
    document.result.gjsnitt.value = gjsnitt.toFixed(0);

}




function resetcase() {
    document.vcalc.veglengde.value = null;
    document.vcalc.vegpris.value = null;
    document.vcalc.vegsprekk.value = null;
    document.vcalc.vegsum.value = null;

    document.vcalc.kryssantall.value = null;
    document.vcalc.krysslengde.value = null;
    document.vcalc.krysspris.value = null;
    document.vcalc.krysssprekk.value = null;
    document.vcalc.krysssum.value = null;

    document.vcalc.sidelengde.value = null;
    document.vcalc.sidepris.value = null;
    document.vcalc.sidesprekk.value = null;
    document.vcalc.sidemult.value = null;
    document.vcalc.sidesum.value = null;

    document.vcalc.tunnlengde.value = null;
    document.vcalc.tunnpris.value = null;
    document.vcalc.tunnsprekk.value = null;
    document.vcalc.tunnmult.value = null;
    document.vcalc.tunnsum.value = null;

    document.vcalc.utunnlengde.value = null;
    document.vcalc.utunnpris.value = null;
    document.vcalc.utunnsprekk.value = null;
    document.vcalc.utunnmult.value = null;
    document.vcalc.utunnsum.value = null;


    document.vcalc.mbrolengde.value = null;
    document.vcalc.mbropris.value = null;
    document.vcalc.mbrosprekk.value = null;
    document.vcalc.mbromult.value = null;
    document.vcalc.mbrosum.value = null;

    document.vcalc.abrobredde.value = null;
    document.vcalc.abrolengde.value = null;
    document.vcalc.abropris.value = null;
    document.vcalc.abrosprekk.value = null;
    document.vcalc.abromult.value = null;
    document.vcalc.abrosum.value = null;

    document.vcalc.bro1bredde.value = null;
    document.vcalc.bro1lengde.value = null;
    document.vcalc.bro1pris.value = null;
    document.vcalc.bro1sprekk.value = null;
    document.vcalc.bro1mult.value = null;
    document.vcalc.bro1sum.value = null;

    document.vcalc.bro2bredde.value = null;
    document.vcalc.bro2lengde.value = null;
    document.vcalc.bro2pris.value = null;
    document.vcalc.bro2sprekk.value = null;
    document.vcalc.bro2mult.value = null;
    document.vcalc.bro2sum.value = null;

    document.vcalc.annetpris.value = null;
    document.vcalc.annetsum.value = null;

    document.descr.status.value = null;
    document.descr.beskriv.value = null;

    document.result.sumkm.value = null;
    document.result.sumpris.value = null;
    document.result.gjsnitt.value = null;



}

function arendal_tvedestrand() {
    resetcase();
    document.vcalc.veglengde.value = 18500;
    document.vcalc.vegpris.value = 132000;
    document.vcalc.vegsprekk.value = 0;

    document.vcalc.kryssantall.value = 2;
    document.vcalc.krysslengde.value = 400;
    document.vcalc.krysspris.value = 300;
    document.vcalc.krysssprekk.value = 0;

    document.vcalc.sidelengde.value = 14000;
    document.vcalc.sidepris.value = 30000;
    document.vcalc.sidesprekk.value = 0;

    document.vcalc.tunnlengde.value = 1977;
    document.vcalc.tunnpris.value = 500000;
    document.vcalc.tunnsprekk.value = 0;

    document.vcalc.utunnlengde.value = 0;
    document.vcalc.utunnpris.value = 0;
    document.vcalc.utunnsprekk.value = 0;


    document.vcalc.mbrolengde.value = 200;
    document.vcalc.mbropris.value = 700000;
    document.vcalc.mbrosprekk.value = 0;

    document.vcalc.abrobredde.value = 25;
    document.vcalc.abrolengde.value = 600;
    document.vcalc.abropris.value = 70000;
    document.vcalc.abrosprekk.value = 0;

    document.vcalc.bro1bredde.value = 0;
    document.vcalc.bro1lengde.value = 0;
    document.vcalc.bro1pris.value = 0;
    document.vcalc.bro1sprekk.value = 0;

    document.vcalc.bro2bredde.value = 0;
    document.vcalc.bro2lengde.value = 0;
    document.vcalc.bro2pris.value = 0;
    document.vcalc.bro2sprekk.value = 0;

    document.vcalc.annetpris.value = 0;

    document.descr.status.value = "Ferdig 2019";
    document.descr.beskriv.value = "4 felt, 110 km/t";
}

function hordfast1() {
    resetcase();
    document.vcalc.veglengde.value = 26000;
    document.vcalc.vegpris.value = 101000;
    document.vcalc.vegsprekk.value = 0;

    document.vcalc.kryssantall.value = 5;
    document.vcalc.krysslengde.value = 400;
    document.vcalc.krysspris.value = 350;
    document.vcalc.krysssprekk.value = 0;

    document.vcalc.sidelengde.value = 0;
    document.vcalc.sidepris.value = 0;
    document.vcalc.sidesprekk.value = 0;

    document.vcalc.tunnlengde.value = 10100;
    document.vcalc.tunnpris.value = 440000;
    document.vcalc.tunnsprekk.value = 0;

    document.vcalc.utunnlengde.value = 7600;
    document.vcalc.utunnpris.value = 700000;
    document.vcalc.utunnsprekk.value = 0;


    document.vcalc.mbrolengde.value = 500;
    document.vcalc.mbropris.value = 700000;
    document.vcalc.mbrosprekk.value = 0;

    document.vcalc.abrobredde.value = 25;
    document.vcalc.abrolengde.value = 1280;
    document.vcalc.abropris.value = 60000;
    document.vcalc.abrosprekk.value = 0;

    document.vcalc.bro1bredde.value = 31;
    document.vcalc.bro1lengde.value = 5500;
    document.vcalc.bro1pris.value = 100000;
    document.vcalc.bro1sprekk.value = 0;

    document.vcalc.bro2bredde.value = 25;
    document.vcalc.bro2lengde.value = 1780;
    document.vcalc.bro2pris.value = 113000;
    document.vcalc.bro2sprekk.value = 0;

    document.vcalc.annetpris.value = 0;

    document.descr.status.value = "Før reg.plan";
    document.descr.beskriv.value = "4 felt (smal?). Estimert pris fra SVV vår 2021";
}

function hordfast2() {
    resetcase();
    document.vcalc.veglengde.value = 26000;
    document.vcalc.vegpris.value = 180000;
    document.vcalc.vegsprekk.value = 0;

    document.vcalc.kryssantall.value = 5;
    document.vcalc.krysslengde.value = 400;
    document.vcalc.krysspris.value = 450;
    document.vcalc.krysssprekk.value = 0;

    document.vcalc.sidelengde.value = 4000;
    document.vcalc.sidepris.value = 40000;
    document.vcalc.sidesprekk.value = 0;

    document.vcalc.tunnlengde.value = 10100;
    document.vcalc.tunnpris.value = 700000;
    document.vcalc.tunnsprekk.value = 0;

    document.vcalc.utunnlengde.value = 7600;
    document.vcalc.utunnpris.value = 1000000;
    document.vcalc.utunnsprekk.value = 0;


    document.vcalc.mbrolengde.value = 500;
    document.vcalc.mbropris.value = 1100000;
    document.vcalc.mbrosprekk.value = 0;

    document.vcalc.abrobredde.value = 25;
    document.vcalc.abrolengde.value = 1280;
    document.vcalc.abropris.value = 130000;
    document.vcalc.abrosprekk.value = 0;

    document.vcalc.bro1bredde.value = 31;
    document.vcalc.bro1lengde.value = 5500;
    document.vcalc.bro1pris.value = 150000;
    document.vcalc.bro1sprekk.value = 0;

    document.vcalc.bro2bredde.value = 25;
    document.vcalc.bro2lengde.value = 1780;
    document.vcalc.bro2pris.value = 140000;
    document.vcalc.bro2sprekk.value = 0;

    document.vcalc.annetpris.value = 2;

    document.descr.status.value = "Før reg.plan";
    document.descr.beskriv.value = "Realistisk pris basert på sml med en rekke prosjekter";
}
function heiane_aadland() {
    resetcase();
    document.vcalc.veglengde.value = 5800;
    document.vcalc.vegpris.value = 161000;
    document.vcalc.vegsprekk.value = 0;

    document.vcalc.kryssantall.value = 2;
    document.vcalc.krysslengde.value = 300;
    document.vcalc.krysspris.value = 400;
    document.vcalc.krysssprekk.value = 0;

    document.vcalc.sidelengde.value = 0;
    document.vcalc.sidepris.value = 0;
    document.vcalc.sidesprekk.value = 0;

    document.vcalc.tunnlengde.value = 1500;
    document.vcalc.tunnpris.value = 630000;
    document.vcalc.tunnsprekk.value = 0;

    document.vcalc.utunnlengde.value = 0;
    document.vcalc.utunnpris.value = 0;
    document.vcalc.utunnsprekk.value = 0;


    document.vcalc.mbrolengde.value = 30;
    document.vcalc.mbropris.value = 1000000;
    document.vcalc.mbrosprekk.value = 0;

    document.vcalc.abrobredde.value = 0;
    document.vcalc.abrolengde.value = 0;
    document.vcalc.abropris.value = 0;
    document.vcalc.abrosprekk.value = 0;

    document.vcalc.bro1bredde.value = 0;
    document.vcalc.bro1lengde.value = 0;
    document.vcalc.bro1pris.value = 0;
    document.vcalc.bro1sprekk.value = 0;

    document.vcalc.bro2bredde.value = 0;
    document.vcalc.bro2lengde.value = 0;
    document.vcalc.bro2pris.value = 0;
    document.vcalc.bro2sprekk.value = 0;

    document.vcalc.annetpris.value = 0;

    document.descr.status.value = "Før reg.plan";
    document.descr.beskriv.value = "Fremdeles tidlig fase. Ikke nevnt i NTP 2021!";
}

function arna_klauvaneset() {
    resetcase();
    document.vcalc.veglengde.value = 5720;
    document.vcalc.vegpris.value = 215000;
    document.vcalc.vegsprekk.value = 0;

    document.vcalc.kryssantall.value = 3;
    document.vcalc.krysslengde.value = 300;
    document.vcalc.krysspris.value = 300;
    document.vcalc.krysssprekk.value = 0;

    document.vcalc.sidelengde.value = 0;
    document.vcalc.sidepris.value = 0;
    document.vcalc.sidesprekk.value = 0;

    document.vcalc.tunnlengde.value = 10290;
    document.vcalc.tunnpris.value = 890000;
    document.vcalc.tunnsprekk.value = 0;

    document.vcalc.utunnlengde.value = 0;
    document.vcalc.utunnpris.value = 0;
    document.vcalc.utunnsprekk.value = 0;

    document.vcalc.mbrolengde.value = 40;
    document.vcalc.mbropris.value = 1200000;
    document.vcalc.mbrosprekk.value = 0;

    document.vcalc.abrobredde.value = 0;
    document.vcalc.abrolengde.value = 0;
    document.vcalc.abropris.value = 0;
    document.vcalc.abrosprekk.value = 0;

    document.vcalc.bro1bredde.value = 0;
    document.vcalc.bro1lengde.value = 0;
    document.vcalc.bro1pris.value = 0;
    document.vcalc.bro1sprekk.value = 0;

    document.vcalc.bro2bredde.value = 0;
    document.vcalc.bro2lengde.value = 0;
    document.vcalc.bro2pris.value = 0;
    document.vcalc.bro2sprekk.value = 0;

    document.vcalc.annetpris.value = 0;

    document.descr.status.value = "Før reg.plan";
    document.descr.beskriv.value = "Forsøkt å matche plandok.";
}
