import "./styles.css";
// import ApexCharts from "apexcharts";

var options = {
    series: [
        {
            name: "PRODUCT A",
            data: [44, 55, 41, 67, 22, 43],
        },
        {
            name: "PRODUCT B",
            data: [13, 23, 20, 8, 13, 27],
        },
        {
            name: "PRODUCT C",
            data: [11, 17, 15, 15, 21, 14],
        },
        {
            name: "PRODUCT D",
            data: [21, 7, 25, 13, 22, 8],
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
                },
            },
        },
    ],
    plotOptions: {
        bar: {
            horizontal: false,
        },
    },
    xaxis: {
        type: "string",
        categories: ["Mon", "Tues", "Wed", "Thurs", "Fri", "Sat"],
    },
    legend: {
        position: "right",
        offsetY: 40,
    },
    fill: {
        opacity: 1,
    },
};

var chart = new ApexCharts(document.getElementById("#columnchart"), options);
chart.render();
