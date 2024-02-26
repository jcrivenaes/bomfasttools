let ydata1 = [30, 40, 45, 50, 49, 60, 70, 91, 125];
let ydata2 = [30, 40, 45, 50, 89, null, 70, 91, 25];
let yeardata = [];
var index = 0;
for (i = 2000; i < 2035; i++) {
  yeardata[index++] = i;
}

bjfj = [
  1769,
  1897,
  1997,
  2060,
  2076,
  2115,
  2234,
  2505,
  2727,
  2814,
  2840,
  2904,
  2978,
  3029,
  3152,
  3158,
  3180,
  3237,
  3259,
  3186,
  2989, // 2020: korona
  3222,
  3490,
  3457,
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

bofj = [
  1860,
  2099,
  2188,
  2212,
  2321,
  2376,
  2588,
  3034,
  3307,
  3478,
  3564,
  3632,
  3733,
  3885,
  4157,
  4183,
  4125,
  4151,
  4176,
  4077,
  3826,
  4171,
  4563,
  4411,
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
  null,
];

var options = {
  chart: {
    type: "line",
    height: 500,
    fontSize: "18px",
  },
  title: {
    text: "Historisk trafikk over Bjørnafjorden og Boknafjorden",
    align: "left",
    style: {
      fontSize: "18px",
      color: "#333",
    },
  },
  subtitle: {
    text: "Gjelder kjøretøy utenom motorsykkel/moped. Kilde SVV fergedatabanken",
    align: "left",
    style: {
      fontSize: "14px",
      color: "#666",
    },
  },
  series: [
    {
      name: "ÅDT Bjørnafjorden",
      data: bjfj,
    },
    {
      name: "ÅDT Boknafjorden",
      data: bofj,
    },
  ],
  colors: ["#FF4560", "grey"],
  yaxis: {
    labels: {
      style: {
        fontSize: "18px",
      },
    },
    min: 1000,
    max: 7000,
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
          text: "Trafikk oppstart hvis Hordfast",
        },
      },
    ],
  },
};

var chart = new ApexCharts(document.querySelector("#chart"), options);

chart.render();

// var options = {
//   series: [
//     {
//       data: series.monthDataSeries1.prices,
//     },
//   ],
//   chart: {
//     height: 350,
//     type: "line",
//     id: "chart",
//   },
//   annotations: {
//     yaxis: [
//       {
//         y: 8200,
//         borderColor: "#00E396",
//         label: {
//           borderColor: "#00E396",
//           style: {
//             color: "#fff",
//             background: "#00E396",
//           },
//           text: "Support",
//         },
//       },
//       {
//         y: 8600,
//         y2: 9000,
//         borderColor: "#000",
//         fillColor: "#FEB019",
//         opacity: 0.2,
//         label: {
//           borderColor: "#333",
//           style: {
//             fontSize: "10px",
//             color: "#333",
//             background: "#FEB019",
//           },
//           text: "Y-axis range",
//         },
//       },
//     ],
//     xaxis: [
//       {
//         x: new Date("23 Nov 2017").getTime(),
//         strokeDashArray: 0,
//         borderColor: "#775DD0",
//         label: {
//           borderColor: "#775DD0",
//           style: {
//             color: "#fff",
//             background: "#775DD0",
//           },
//           text: "Anno Test",
//         },
//       },
//       {
//         x: new Date("26 Nov 2017").getTime(),
//         x2: new Date("28 Nov 2017").getTime(),
//         fillColor: "#B3F7CA",
//         opacity: 0.4,
//         label: {
//           borderColor: "#B3F7CA",
//           style: {
//             fontSize: "10px",
//             color: "#fff",
//             background: "#00E396",
//           },
//           offsetY: -10,
//           text: "X-axis range",
//         },
//       },
//     ],
//     points: [
//       {
//         x: new Date("01 Dec 2017").getTime(),
//         y: 8607.55,
//         marker: {
//           size: 8,
//           fillColor: "#fff",
//           strokeColor: "red",
//           radius: 2,
//           cssClass: "apexcharts-custom-class",
//         },
//         label: {
//           borderColor: "#FF4560",
//           offsetY: 0,
//           style: {
//             color: "#fff",
//             background: "#FF4560",
//           },

//           text: "Point Annotation",
//         },
//       },
//       {
//         x: new Date("08 Dec 2017").getTime(),
//         y: 9340.85,
//         marker: {
//           size: 0,
//         },
//         // image: {
//         //   path: "../../assets/images/ico-instagram.png",
//         // },
//       },
//     ],
//   },
//   dataLabels: {
//     enabled: false,
//   },
//   stroke: {
//     curve: "straight",
//   },
//   grid: {
//     padding: {
//       right: 30,
//       left: 20,
//     },
//   },
//   title: {
//     text: "Line with Annotations",
//     align: "left",
//   },
//   labels: series.monthDataSeries1.dates,
//   xaxis: {
//     type: "datetime",
//   },
// };

// var chart = new ApexCharts(document.querySelector("#chart"), options);
// chart.render();
