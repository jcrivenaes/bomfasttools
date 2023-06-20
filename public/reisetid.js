let nettmeet_pretid = 0;
let fly_pretid = 15;
let buss_pretid = 15;
let bil_pretid = 5;

let nettmeet_term1 = 0;
let fly_term1 = 45;
let buss_term1 = 15;
let bil_term1 = 0;

let nettmeet_reise = 0;
let fly_reise = 35;
let buss_reise = 152;
let bil_reise = 136;

let nettmeet_term2 = 0;
let fly_term2 = 10;
let buss_term2 = 5;
let bil_term2 = 0;

let nettmeet_park = 0;
let fly_park = 0;
let buss_park = 0;
let bil_park = 10;

let nettmeet_dest = 5;
let fly_dest = 15;
let buss_dest = 15;
let bil_dest = 2;

var options = {
    title: {
        text: "Reisetid Bergen-Stavanger",
        align: "center",
        style: {
            fontSize: "34px",
        },
    },
    subtitle: {
        text: "Dagens fly er desidert mest effektivt. Reisetider for buss/bil er hvis Hordfast er bygget",
        align: "center",
        offsetY: 60,
        style: {
            fontSize: "14px",
        },
    },
    series: [
        {
            name: "REISE TIL TERMINAL / E39",
            data: [nettmeet_pretid, fly_pretid, buss_pretid, bil_pretid],
        },
        {
            name: "TERMINALTID FØR",
            data: [nettmeet_term1, fly_term1, buss_term1, bil_term1],
        },
        {
            name: "REELL REISETID",
            data: [nettmeet_reise, fly_reise, buss_reise, bil_reise],
        },
        {
            name: "TERMINALTID ETTER",
            data: [nettmeet_term2, fly_term2, buss_term2, bil_term2],
        },
        {
            name: "PARKERING (BIL)",
            data: [nettmeet_park, fly_park, buss_park, bil_park],
        },
        {
            name: "TIL DESTINASJON",
            data: [nettmeet_dest, fly_dest, buss_dest, bil_dest],
        },
    ],
    chart: {
        type: "bar",
        height: 350,
        stacked: true,
        toolbar: {
            show: true,
        },
        zoom: {
            enabled: true,
        },
    },
    responsive: [
        {
            breakpoint: 480,
            options: {
                legend: {
                    position: "bottom",
                    offsetX: -10,
                    offsetY: 0,
                    fontSize: "19px",
                },
            },
        },
    ],
    plotOptions: {
        bar: {
            horizontal: true,
            borderRadius: 10,
            columnWidth: "70%",
            barHeight: "70%",
            dataLabels: {
                enabled: true,
                total: {
                    enabled: true,
                    style: {
                        fontSize: "22px",
                        fontWeight: 900,
                    },
                },
            },
        },
    },
    xaxis: {
        categories: ["🖥️", "✈️", "🚌", "🚗"],
        fontSize: "22px",
        labels: {
            style: {
                fontSize: "15px",
                fontWeight: 900,
            },
        },
    },
    yaxis: {
        labels: {
            style: {
                fontSize: "28px",
                fontWeight: 900,
            },
        },
    },
    legend: {
        position: "right",
        offsetY: 40,
        fontSize: "14px",
        fontWeight: 900,
    },
    fill: {
        opacity: 1,
    },
};

var chart = new ApexCharts(document.querySelector("#grafica"), options);
chart.render();
