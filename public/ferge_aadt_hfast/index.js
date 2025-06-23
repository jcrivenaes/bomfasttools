let ydata1 = [30, 40, 45, 50, 49, 60, 70, 91, 125];
let ydata2 = [30, 40, 45, 50, 89, null, 70, 91, 25];
let yeardata = [];
var index = 0;
for (i = 2000; i < 2035; i++) {
  yeardata[index++] = i;
}

jekt_hodn = [
  367,
  355,
  378,
  386,
  389,
  397,
  410,
  424,
  434,
  448,
  439,
  455,
  462,
  470,
  506,
  535,
  544,
  538,
  549,
  541,
  515,
  536,
  557,
  574,
  574,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

hal_vaage = [
  309,
  322,
  338,
  370,
  364,
  375,
  386,
  416,
  438,
  448,
  434,
  450,
  465,
  476,
  503,
  510,
  524,
  528,
  514,
  503,
  448,
  486,
  514,
  555,
  585,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

hal_sandv = [
  1460,
  1575,
  1659,
  1690,
  1712,
  1740,
  1848,
  2089,
  2289,
  2366,
  2406,
  2454,
  2513,
  2553,
  2649,
  2648,
  2656,
  2709,
  2745,
  2683,
  2541,
  2736,
  2976,
  3199,
  3385,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
  null,
];

var options = {
  chart: {
    type: "line",
    height: 500,
    fontSize: "18px",
  },
  title: {
    text: "Historisk trafikk fergene langs Hordfast",
    align: "left",
    style: {
      fontSize: "18px",
      color: "#333",
    },
  },
  subtitle: {
    text: "Gjelder kjøretøy tellinger utenom motorsykkel/moped. Kilde SVV rapporter + fergedatabanken",
    align: "left",
    style: {
      fontSize: "14px",
      color: "#666",
    },
  },
  series: [
    {
      name: "ÅDT Jektevik-Huglo-Hodnanes",
      data: jekt_hodn,
    },
    {
      name: "ÅDT Halhjem-Våge",
      data: hal_vaage,
    },
    {
      name: "ÅDT Halhjem-Sandvikvåg",
      data: hal_sandv,
    },
  ],
  yaxis: {
    labels: {
      style: {
        fontSize: "14px",
      },
    },
    min: 0,
    max: 6000,
  },
  xaxis: {
    categories: yeardata,
    labels: {
      style: {
        fontSize: "14px",
      },
    },
    tickAmount: 8,
    // max: 2050,
  },
  annotations: {
    xaxis: [
      {
        x: 2020,
        borderColor: "blue",
        label: {
          style: {
            color: "red",
            fontSize: "11px",
          },
          text: "Corona",
        },
      },
      {
        x: 2022,
        borderColor: "blue",
        label: {
          style: {
            color: "green",
            fontSize: "11px",
          },
          text: "Kraftig reduksjon fergepriser",
        },
      },
    ],
    points: [
      {
        x: 2033,
        y: 5700,
        marker: {
          size: 8,
          fillColor: "#ff0000",
          strokeColor: "#fff",
          radius: 2,
        },
        label: {
          borderColor: "#ff0000",
          offsetY: 0,
          style: {
            color: "#fff",
            background: "#ff0000",
          },
          text: "SVV prognose hvis Hordfast",
        },
      },
    ],
  },
};

var chart = new ApexCharts(document.querySelector("#chart"), options);

chart.render();
