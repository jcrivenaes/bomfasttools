let nettmeet_pretid = 5;
let fly_pretid = 15;
let buss_pretid = 15;

var options = {
    title: {
        text: "Reisetid Bergen-Stavanger",
        align: "center",
        style: {
            fontSize: "44px",
        },
    },
    series: [
        {
            name: "REISE TIL TERMINAL",
            data: [nettmeet_pretid, fly_pretid, buss_pretid],
        },
        {
            name: "TERMINALTID FØR",
            data: [0, 45, 15],
        },
        {
            name: "REELL REISETID",
            data: [0, 35, 120],
        },
        {
            name: "TERMINALTID ETTER",
            data: [0, 15, 5],
        },
        {
            name: "TIL DESTINASJON",
            data: [0, 15, 15],
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
            dataLabels: {
                style: {
                    fontSize: "22px",
                    fontWeight: "bold",
                },
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
        categories: ["🖥️", "✈️", "🚌"],
        fontSize: "22px",
        labels: {
            style: {
                fontSize: "16px",
                fontWeight: 900,
            },
        },
    },
    yaxis: {
        labels: {
            style: {
                fontSize: "33px",
                fontWeight: 900,
            },
        },
    },
    legend: {
        position: "right",
        offsetY: 40,
    },
    fill: {
        opacity: 1,
    },
};

var chart = new ApexCharts(document.querySelector("#grafica"), options);
chart.render();
